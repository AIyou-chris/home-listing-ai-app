'use strict';

// Founding price: the first 25 loan officers pay $49 instead of $79 for as long as they stay subscribed.
// The discount itself is a Stripe coupon (duration "forever", max redemptions 25) whose id is in the Render
// env var FOUNDING_COUPON_ID. Stripe counts the redemptions, so the 26th checkout simply gets no discount.
// Nothing here can fail a checkout: any problem means "no discount".

const pickFoundingDiscount = async ({ stripe, couponId }) => {
  const id = String(couponId || '').trim();
  if (!stripe || !id) return [];
  try {
    const coupon = await stripe.coupons.retrieve(id);
    if (!coupon || coupon.valid !== true) return [];
    return [{ coupon: id }];
  } catch (_e) {
    return [];
  }
};

module.exports = { pickFoundingDiscount };
