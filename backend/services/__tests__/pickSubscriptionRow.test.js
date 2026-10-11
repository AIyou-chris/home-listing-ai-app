const test = require('node:test');
const assert = require('node:assert/strict');
const { pickSubscriptionRow } = require('../billingEngine');

test('no rows gives null', () => {
  assert.equal(pickSubscriptionRow([]), null);
  assert.equal(pickSubscriptionRow(null), null);
});
test('the row tied to a real Stripe subscription wins, even if older', () => {
  const real = { id: 'a', stripe_subscription_id: 'sub_1', updated_at: '2026-10-11T21:22:00Z', cancel_at_period_end: true };
  const blank = { id: 'b', stripe_subscription_id: null, updated_at: '2026-10-11T21:30:00Z', cancel_at_period_end: false };
  assert.equal(pickSubscriptionRow([blank, real]).id, 'a');
});
test('with no Stripe link on either, the newest wins', () => {
  const older = { id: 'a', updated_at: '2026-10-01T00:00:00Z' };
  const newer = { id: 'b', updated_at: '2026-10-02T00:00:00Z' };
  assert.equal(pickSubscriptionRow([older, newer]).id, 'b');
});
