const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const policy = require('./policy');
function harness() {
  const documents = new Map();
  let failWrite = false;
  let checkouts = 0;
  const session = { id: 'cs_1', mode: 'payment', status: 'complete', payment_status: 'paid', amount_total: 300, currency: 'jpy', client_reference_id: 'buyer', metadata: { firebaseUid: 'buyer', product: '9board-mobile' } };
  const stripe = { prices: { retrieve: async () => ({ active: true, type: 'one_time', currency: 'jpy', unit_amount: 300 }) },
    webhooks: { constructEvent: (raw, sig) => { if (sig !== 'valid' || raw !== 'raw') throw Error('signature'); return { id: 'evt_1', type: 'checkout.session.completed', data: { object: session } }; } },
    checkout: { sessions: { retrieve: async () => session, listLineItems: async () => ({ data: [{ quantity: 1, amount_total: 300, price: { id: policy.DEFAULT_PRICE } }], has_more: false }), create: async () => { checkouts++; return { status: 'open', url: 'https://checkout.stripe.com/test' }; } } }
  };
  const ref = path => ({ path, get: async () => ({ exists: documents.has(path), data: () => documents.get(path) }) });
  const db = { collection: name => ({ doc: (id = 'attempt1') => ref(name + '/' + id) }), runTransaction: async fn => {
    const writes = [];
    const result = await fn({ get: r => r.get(), set: (r, data) => writes.push([r.path, data]), create: (r, data) => writes.push([r.path, data]) });
    if (failWrite) throw Error('unavailable');
    writes.forEach(([path, data]) => documents.set(path, data)); return result;
  } };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(__dirname + '/index.js', 'utf8'), { exports, console: { error() {} }, require: name => {
    if (name === './policy') return policy;
    if (name === 'stripe') return function () { return stripe; };
    if (name === 'firebase-functions/v2/https') return { onRequest: (opts, fn) => fn };
    if (name === 'firebase-functions/params') return { defineSecret: name => ({ value: () => name === 'MOBILE_OWNER_UID' ? 'owner' : 'secret' }), defineString: (name, opts) => ({ value: () => opts.default }) };
    if (name === 'firebase-admin/app') return { initializeApp() {} };
    if (name === 'firebase-admin/firestore') return { getFirestore: () => db, FieldValue: { serverTimestamp: () => 'timestamp' } };
    if (name === 'firebase-admin/auth') return { getAuth: () => ({ verifyIdToken: async token => { if (!['owner', 'buyer'].includes(token)) throw Error('token'); return { uid: token }; }, getUser: async uid => ({ uid }) }) };
    throw Error(name);
  } });
  async function call(name, token = 'buyer', signature = 'valid') {
    const req = { method: 'POST', rawBody: 'raw', body: { uid: 'owner', purchased: true }, get: name => name === 'authorization' ? 'Bearer ' + token : signature };
    const res = { code: 200, set() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, send(value) { this.body = value; return this; }, sendStatus(code) { this.code = code; return this; } };
    await exports[name](req, res); return res;
  }
  return { call, documents, session, setFail: value => { failWrite = value; }, getCheckouts: () => checkouts };
}
test('authentication and server entitlement control access; body cannot grant owner access', async () => {
  const h = harness();
  assert.equal((await h.call('mobileAccess', 'invalid')).code, 401);
  assert.equal((await h.call('mobileAccess')).body.access, false);
  assert.equal((await h.call('mobileAccess', 'owner')).body.access, true);
  assert.equal((await h.call('mobileCheckout', 'owner')).body.access, true);
  assert.equal(h.getCheckouts(), 0);
});
test('signature rejection and unpaid sessions never grant access; duplicate webhook is idempotent', async () => {
  const h = harness();
  assert.equal((await h.call('mobileStripeWebhook', 'buyer', 'invalid')).code, 400);
  assert.equal(h.documents.size, 0);
  h.session.payment_status = 'unpaid';
  await h.call('mobileStripeWebhook'); assert.equal(h.documents.size, 0);
  h.session.payment_status = 'paid';
  await h.call('mobileStripeWebhook');
  assert.equal((await h.call('mobileAccess')).body.access, true);
  await h.call('mobileStripeWebhook'); assert.equal(h.documents.size, 2);
  assert.equal((await h.call('mobileCheckout')).body.access, true);
  assert.equal(h.getCheckouts(), 0);
});
test('failed Firestore transaction requests Stripe retry and does not leave partial entitlement', async () => {
  const h = harness(); h.setFail(true);
  assert.equal((await h.call('mobileStripeWebhook')).code, 500);
  assert.equal(h.documents.size, 0);
  h.setFail(false);
  assert.equal((await h.call('mobileStripeWebhook')).code, 200);
  assert.equal((await h.call('mobileAccess')).body.access, true);
});
