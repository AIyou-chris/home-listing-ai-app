'use strict';

// Which loan-officer plan does a Stripe price mean?
// 1. The three price ids from Render settings (STRIPE_LO_LITE_PRICE_ID, STRIPE_LO_PRICE_ID, STRIPE_LO_PRO_PRICE_ID).
// 2. If those are missing or do not match (a mistyped setting would lock out every paying customer), the monthly
//    amount decides: $79 = lo_lite, $149 = lo, $299 = lo_pro. Only used for customers that our own checkout created.

const AMOUNT_TO_TIER = { 7900: 'lo_lite', 14900: 'lo', 29900: 'lo_pro' };

function tierForPrice(price, ids = {}) {
  if (!price) return null;
  if (ids.pro && price.id === ids.pro) return 'lo_pro';
  if (ids.lo && price.id === ids.lo) return 'lo';
  if (ids.lite && price.id === ids.lite) return 'lo_lite';
  const monthly = !price.recurring || price.recurring.interval === 'month';
  if (monthly && AMOUNT_TO_TIER[Number(price.unit_amount)]) return AMOUNT_TO_TIER[Number(price.unit_amount)];
  return null;
}

// Search Stripe for a subscription our checkout made for this loan officer. `stripe` is the Stripe client.
async function findStripeCustomerForLo(stripe, { ids = [], slug = null } = {}) {
  const clauses = [
    ...ids.filter(Boolean).map((id) => `metadata['agent_id']:'${String(id).replace(/'/g, '')}'`),
    ...(slug ? [`metadata['slug']:'${String(slug).replace(/'/g, '')}'`] : []),
  ];
  if (!stripe || clauses.length === 0) return null;
  const result = await stripe.subscriptions.search({ query: clauses.join(' OR '), limit: 10 });
  const live = (result.data || []).find((s) => ['active', 'trialing', 'past_due'].includes(s.status));
  const customer = live?.customer;
  return typeof customer === 'string' ? customer : (customer?.id || null);
}

module.exports = { tierForPrice, findStripeCustomerForLo, AMOUNT_TO_TIER };
