const test = require('node:test');
const assert = require('node:assert/strict');
const { pickFoundingDiscount } = require('../foundingCoupon');

const stripeWith = (coupon) => ({ coupons: { retrieve: async () => { if (coupon instanceof Error) throw coupon; return coupon; } } });

test('a valid coupon is applied', async () => {
  assert.deepEqual(await pickFoundingDiscount({ stripe: stripeWith({ valid: true }), couponId: 'FOUNDING49' }), [{ coupon: 'FOUNDING49' }]);
});
test('a used-up coupon gives no discount (the 26th signup pays full price)', async () => {
  assert.deepEqual(await pickFoundingDiscount({ stripe: stripeWith({ valid: false }), couponId: 'FOUNDING49' }), []);
});
test('no env var, no stripe, or a Stripe error never breaks checkout', async () => {
  assert.deepEqual(await pickFoundingDiscount({ stripe: stripeWith({ valid: true }), couponId: '' }), []);
  assert.deepEqual(await pickFoundingDiscount({ stripe: null, couponId: 'X' }), []);
  assert.deepEqual(await pickFoundingDiscount({ stripe: stripeWith(new Error('boom')), couponId: 'X' }), []);
});
