const test = require('node:test');
const assert = require('node:assert/strict');
const { rateLeadIntent, rateByRules } = require('../leadIntentRater');

const silent = { warn: () => {} };
const client = (impl, configured = true) => ({ isConfigured: () => configured, evaluate: impl });

test('rules: just looking is Cold', () => {
  assert.equal(rateByRules({ purchase_timeline: 'Just looking' }).level, 'Cold');
});

test('rules: ASAP is Hot', () => {
  assert.equal(rateByRules({ purchase_timeline: 'ASAP', credit_range: '740+' }).level, 'Hot');
});

test('rules: 1–3 months is Hot', () => {
  assert.equal(rateByRules({ purchase_timeline: '1–3 months' }).level, 'Hot');
});

test('rules: buying soon with weak credit is Warm, not Hot', () => {
  const out = rateByRules({ purchase_timeline: 'ASAP', credit_range: 'Under 620' });
  assert.equal(out.level, 'Warm');
  assert.match(out.reason, /credit/i);
});

test('rules: already pre-approved beats a mid timeline', () => {
  assert.equal(rateByRules({ purchase_timeline: '3–6 months', currently_preapproved: true }).level, 'Hot');
});

test('rules: pre-approved but just looking stays Cold', () => {
  assert.equal(rateByRules({ purchase_timeline: 'Just looking', currently_preapproved: true }).level, 'Cold');
});

test('rules: 3–6 months is Warm', () => {
  assert.equal(rateByRules({ purchase_timeline: '3–6 months' }).level, 'Warm');
});

test('rules: no answers at all is Warm, never Hot', () => {
  assert.equal(rateByRules({}).level, 'Warm');
});

test('jev choice is used when confident', async () => {
  const out = await rateLeadIntent(
    { purchase_timeline: 'Just looking' },
    { typesafeClient: client(async () => ({ intent: { choice: 'Hot', confidence: 0.9 } })), log: silent }
  );
  assert.equal(out.level, 'Hot');
  assert.equal(out.source, 'jev');
});

test('jev probabilities are used when no explicit choice', async () => {
  const out = await rateLeadIntent(
    { purchase_timeline: 'ASAP' },
    { typesafeClient: client(async () => ({ intent: { probabilities: { Hot: 0.2, Warm: 0.7, Cold: 0.1 } } })), log: silent }
  );
  assert.equal(out.level, 'Warm');
  assert.equal(out.source, 'jev');
});

test('low confidence falls back to the rules', async () => {
  const out = await rateLeadIntent(
    { purchase_timeline: 'ASAP' },
    { typesafeClient: client(async () => ({ intent: { choice: 'Cold', confidence: 0.1 } })), log: silent }
  );
  assert.equal(out.level, 'Hot');
  assert.equal(out.source, 'rules_low_confidence');
});

test('an unknown choice falls back to the rules', async () => {
  const out = await rateLeadIntent(
    { purchase_timeline: 'Just looking' },
    { typesafeClient: client(async () => ({ intent: { choice: 'Lukewarm' } })), log: silent }
  );
  assert.equal(out.level, 'Cold');
  assert.equal(out.source, 'rules_unknown_choice');
});

test('an API error falls back to the rules, never throws', async () => {
  const out = await rateLeadIntent(
    { purchase_timeline: 'ASAP' },
    { typesafeClient: client(async () => { throw new Error('boom'); }), log: silent }
  );
  assert.equal(out.level, 'Hot');
  assert.equal(out.source, 'rules_error');
});

test('no API key falls back to the rules without calling out', async () => {
  let called = false;
  const out = await rateLeadIntent(
    { purchase_timeline: '3–6 months' },
    { typesafeClient: client(async () => { called = true; return {}; }, false), log: silent }
  );
  assert.equal(out.level, 'Warm');
  assert.equal(out.source, 'rules_unconfigured');
  assert.equal(called, false);
});

test('no client at all still rates the lead', async () => {
  const out = await rateLeadIntent({ purchase_timeline: 'ASAP' }, { log: silent });
  assert.equal(out.level, 'Hot');
  assert.equal(out.source, 'rules_unconfigured');
});
