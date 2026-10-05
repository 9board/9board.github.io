'use strict';
const DEFAULT_PRICE = 'price_1UNAmf7o8soUSFOdilOYF1nd';
function validPurchase(session, lines, priceId) {
  return session.mode === 'payment' && session.payment_status === 'paid' &&
    session.status === 'complete' && session.currency === 'jpy' && session.amount_total === 300 &&
    session.metadata?.product === '9board-mobile' &&
    typeof session.client_reference_id === 'string' && session.client_reference_id.length > 0 &&
    session.client_reference_id === session.metadata?.firebaseUid &&
    lines.data.length === 1 && !lines.has_more && lines.data[0].quantity === 1 &&
    lines.data[0].price?.id === priceId && lines.data[0].amount_total === 300;
}
function isOwner(uid, configuredUid) { return !!configuredUid && uid === configuredUid; }
module.exports = { DEFAULT_PRICE, validPurchase, isOwner };
