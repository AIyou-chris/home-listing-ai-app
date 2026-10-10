'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { tierForPrice, findStripeCustomerForLo } = require('../loPlanTier');

test('the three price ids from settings win', () => {
  const ids = { lite: 'p_lite', lo: 'p_lo', pro: 'p_pro' };
  assert.strictEqual(tierForPrice({ id: 'p_pro', unit_amount: 1 }, ids), 'lo_pro');
  assert.strictEqual(tierForPrice({ id: 'p_lo', unit_amount: 1 }, ids), 'lo');
  assert.strictEqual(tierForPrice({ id: 'p_lite', unit_amount: 1 }, ids), 'lo_lite');
});

test('if the settings are missing or wrong, the monthly amount still maps to the right plan', () => {
  const month = { interval: 'month' };
  assert.strictEqual(tierForPrice({ id: 'x', unit_amount: 7900, recurring: month }, {}), 'lo_lite');
  assert.strictEqual(tierForPrice({ id: 'x', unit_amount: 14900, recurring: month }, { lo: 'WRONG' }), 'lo');
  assert.strictEqual(tierForPrice({ id: 'x', unit_amount: 29900, recurring: month }, undefined), 'lo_pro');
  assert.strictEqual(tierForPrice({ id: 'x', unit_amount: 4900, recurring: month }, {}), null);
  assert.strictEqual(tierForPrice({ id: 'x', unit_amount: 7900, recurring: { interval: 'year' } }, {}), null);
  assert.strictEqual(tierForPrice(null, {}), null);
});

test('finds the paying customer from the subscription metadata', async () => {
  let asked = '';
  const stripe = { subscriptions: { search: async ({ query }) => { asked = query; return { data: [{ status: 'canceled', customer: 'cus_old' }, { status: 'active', customer: 'cus_live' }] }; } } };
  assert.strictEqual(await findStripeCustomerForLo(stripe, { ids: ['A', 'B'], slug: 'chris' }), 'cus_live');
  assert.match(asked, /metadata\['agent_id'\]:'A' OR metadata\['agent_id'\]:'B' OR metadata\['slug'\]:'chris'/);
  assert.strictEqual(await findStripeCustomerForLo({ subscriptions: { search: async () => ({ data: [{ status: 'canceled', customer: 'c' }] }) } }, { ids: ['A'] }), null);
  assert.strictEqual(await findStripeCustomerForLo(stripe, {}), null);
});
