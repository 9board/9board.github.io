'use strict';
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const Stripe = require('stripe');
const { DEFAULT_PRICE, validPurchase, isOwner } = require('./policy');
initializeApp();
const db = getFirestore();
const key = defineSecret('STRIPE_SECRET_KEY');
const webhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const ownerUid = defineSecret('MOBILE_OWNER_UID');
const price = defineString('MOBILE_PRICE_ID', { default: DEFAULT_PRICE });
const region = 'asia-northeast1';
const origin = 'https://9board.jp';
const mobileUrl = `${origin}/Billiards_layout_mobile/`;
const entitlement = uid => db.collection('mobileEntitlements').doc(uid);

function api(options, handler) {
  return onRequest({ region, invoker: 'public', cors: [origin], ...options }, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
    let user;
    try {
      const token = /^Bearer (.+)$/.exec(req.get('authorization') || '')?.[1];
      if (!token) throw new Error('missing token');
      user = await getAuth().verifyIdToken(token, true);
    } catch { return res.status(401).json({ error: 'ログインし直してください。' }); }
    try { await handler(req, res, user); }
    catch (error) {
      console.error('Mobile payment request failed', error.code || error.type || 'internal');
      res.status(503).json({ error: '購入情報を確認できませんでした。時間をおいて再試行してください。' });
    }
  });
}
async function hasAccess(uid) {
  if (isOwner(uid, ownerUid.value().trim())) return true;
  return (await entitlement(uid).get()).data()?.purchased === true;
}
exports.mobileAccess = api({ secrets: [ownerUid] }, async (req, res, user) => {
  res.json({ access: await hasAccess(user.uid) });
});
exports.mobileCheckout = api({ secrets: [key, ownerUid] }, async (req, res, user) => {
  if (await hasAccess(user.uid)) return res.json({ access: true });
  const stripe = new Stripe(key.value());
  const selectedPrice = await stripe.prices.retrieve(price.value());
  if (!selectedPrice.active || selectedPrice.type !== 'one_time' || selectedPrice.currency !== 'jpy' || selectedPrice.unit_amount !== 300) throw new Error('invalid price');
  // A durable per-UID attempt and Stripe idempotency key reuse one Checkout across tabs/retries.
  const ref = db.collection('mobileCheckoutAttempts').doc(user.uid);
  const attempt = await db.runTransaction(async tx => {
    const old = (await tx.get(ref)).data();
    if (old && old.expiresAt > Date.now() + 60000) return old;
    const next = { id: db.collection('unused').doc().id, expiresAt: Date.now() + 3600000 };
    tx.set(ref, next);
    return next;
  });
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', payment_method_types: ['card'],
    line_items: [{ price: price.value(), quantity: 1 }],
    client_reference_id: user.uid,
    metadata: { firebaseUid: user.uid, product: '9board-mobile' },
    success_url: `${mobileUrl}?payment=success`, cancel_url: `${mobileUrl}?payment=cancelled`,
    expires_at: Math.floor(attempt.expiresAt / 1000)
  }, { idempotencyKey: `mobile-${user.uid}-${attempt.id}` });
  if (session.status === 'complete') return res.json({ pending: true });
  if (session.status !== 'open' || !session.url) throw new Error('checkout unavailable');
  res.json({ url: session.url });
});
exports.mobileStripeWebhook = onRequest({ region, invoker: 'public', secrets: [key, webhookSecret] }, async (req, res) => {
  if (req.method !== 'POST') return res.sendStatus(405);
  const stripe = new Stripe(key.value());
  let event;
  try { event = stripe.webhooks.constructEvent(req.rawBody, req.get('stripe-signature'), webhookSecret.value()); }
  catch { return res.status(400).send('Invalid signature'); }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return res.sendStatus(200);
  try {
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
    const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
    if (!validPurchase(session, lines, price.value())) return res.status(200).send('Not an eligible purchase');
    const uid = session.client_reference_id;
    await getAuth().getUser(uid);
    const receipt = db.collection('mobilePaymentReceipts').doc(session.id);
    await db.runTransaction(async tx => {
      if ((await tx.get(receipt)).exists) return;
      tx.set(entitlement(uid), { purchased: true, purchasedAt: FieldValue.serverTimestamp(), priceId: price.value(), checkoutSessionId: session.id }, { merge: true });
      tx.create(receipt, { uid, eventId: event.id, amount: 300, currency: 'jpy', verifiedAt: FieldValue.serverTimestamp() });
    });
    return res.sendStatus(200);
  } catch (error) {
    if (error.code === 'auth/user-not-found') return res.status(200).send('Account removed');
    console.error('Mobile webhook failed', error.code || error.type || 'internal');
    return res.status(500).send('Retry later');
  }
});
