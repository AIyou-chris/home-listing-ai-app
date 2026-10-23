'use strict';
// The founding price (the Stripe coupon in FOUNDING_COUPON_ID) can have a real end date. Autopilot's 30-day launch
// sets it when it starts; after that moment the discount stops being applied at checkout. Stripe still enforces the 25.
// The date lives in platform_brain row "founding-offer" (config.endsAt). No row means no end date (the old behavior).
const ID = 'founding-offer';

async function offerEndsAt(db) {
  try {
    const { data } = await db.from('platform_brain').select('config').eq('id', ID).maybeSingle();
    const t = Date.parse(data?.config?.endsAt);
    return Number.isFinite(t) ? new Date(t) : null;
  } catch { return null; }
}

async function setOfferEndsAt(db, endsAt) {
  const { error } = await db.from('platform_brain').upsert({ id: ID, config: { endsAt: endsAt ? new Date(endsAt).toISOString() : null }, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}

module.exports = { offerEndsAt, setOfferEndsAt, ID };
