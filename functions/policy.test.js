const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_PRICE, validPurchase, isOwner } = require('./policy');
const session = { mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'jpy', amount_total: 300, client_reference_id: 'uid1', metadata: { firebaseUid: 'uid1', product: '9board-mobile' } };
const lines = { data: [{ quantity: 1, amount_total: 300, price: { id: DEFAULT_PRICE } }], has_more: false };
test('only a paid, matching one-time mobile purchase qualifies', () => {
  assert.equal(validPurchase(session, lines, DEFAULT_PRICE), true);
  for (const change of [{ payment_status: 'unpaid' }, { mode: 'subscription' }, { status: 'open' }, { amount_total: 0 }, { currency: 'usd' }, { client_reference_id: 'attacker' }, { metadata: {} }]) {
    assert.equal(validPurchase({ ...session, ...change }, lines, DEFAULT_PRICE), false);
  }
  for (const change of [{ has_more: true }, { data: [] }, { data: [...lines.data, ...lines.data] }, { data: [{ ...lines.data[0], quantity: 2 }] }, { data: [{ ...lines.data[0], price: { id: 'other' } }] }]) {
    assert.equal(validPurchase(session, { ...lines, ...change }, DEFAULT_PRICE), false);
  }
});
test('owner exemption uses only an exact server configured UID', () => {
  assert.equal(isOwner('owner', 'owner'), true);
  assert.equal(isOwner('owner', ''), false);
  assert.equal(isOwner('visitor', 'owner'), false);
});
