const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCheckoutConfig } = require('../paymentService');

const base = { finalPriceId: 'price_x', slug: 'abc', email: 'a@b.com', sUrl: 'https://x/s', cUrl: 'https://x/c' };

test('with a coupon, allow_promotion_codes is absent (Stripe rejects having both)', () => {
  const c = buildCheckoutConfig({ ...base, discounts: [{ coupon: 'FOUNDING49' }] });
  assert.deepEqual(c.discounts, [{ coupon: 'FOUNDING49' }]);
  assert.equal('allow_promotion_codes' in c, false);
});
test('without a coupon, the promo-code box is on', () => {
  const c = buildCheckoutConfig({ ...base, discounts: [] });
  assert.equal(c.allow_promotion_codes, true);
  assert.equal('discounts' in c, false);
});
test('trial days are only sent when positive, and the account id travels in metadata', () => {
  assert.equal('trial_period_days' in buildCheckoutConfig({ ...base, trialPeriodDays: 0 }).subscription_data, false);
  const c = buildCheckoutConfig({ ...base, trialPeriodDays: 6, agentId: 'u1', planId: 'lo_lite' });
  assert.equal(c.subscription_data.trial_period_days, 6);
  assert.equal(c.metadata.agent_id, 'u1');
});
