'use strict';

// Founding price: the first 25 loan officers pay $49 instead of $79 for as long as they stay subscribed.
// The discount itself is a Stripe coupon (duration "forever", max redemptions 25) whose id is in the Render
// env var FOUNDING_COUPON_ID. Stripe counts the redemptions, so the 26th checkout simply gets no discount.
// Nothing here can fail a checkout: any problem means "no discount".

const pickFoundingDiscount = async ({ stripe, couponId, db = null, now = () => new Date() }) => {
  const id = String(couponId || '').trim();
  if (!stripe || !id) return [];
  try {
    // A real end date, when one was set (see foundingOffer.js): after it, no discount.
    if (db) { const endsAt = await require('./foundingOffer').offerEndsAt(db); if (endsAt && now().getTime() > endsAt.getTime()) return []; }
    const coupon = await stripe.coupons.retrieve(id);
    if (!coupon || coupon.valid !== true) return [];
    return [{ coupon: id }];
  } catch (_e) {
    return [];
  }
};

module.exports = { pickFoundingDiscount };
