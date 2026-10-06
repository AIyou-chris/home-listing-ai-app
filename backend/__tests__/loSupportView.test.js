const test = require('node:test');
const assert = require('node:assert');
const { buildSupportReport, planLabel, trialDaysLeft } = require('../services/loSupportView');

const NOW = new Date('2026-10-10T12:00:00Z').getTime();
const base = { first_name: 'Ana', nmls_number: '123', payment_status: 'awaiting_payment', created_at: '2026-10-08T12:00:00Z', last_seen_at: '2026-10-09T12:00:00Z' };
const brain = { knowledge_base: 'We lend.', company_name: 'Acme', company_nmls: '999', licensed_states: ['WA'] };
const full = { agent: base, brain, phoneLine: { status: 'active' }, listingCount: 2, invites: [{ claimed_at: '2026-10-09T00:00:00Z', view_count: 3 }], leadCount: 4, now: NOW };

test('a fully set up account has nothing wrong', () => {
  const r = buildSupportReport(full);
  assert.deepStrictEqual(r.problems, []);
  assert.ok(r.checklist.every((c) => c.ok));
  assert.strictEqual(r.plan, 'Free trial (no card)');
  assert.strictEqual(r.trialDaysLeft, 5);
});

test('a brand new empty account lists the real problems in plain words', () => {
  const r = buildSupportReport({ agent: { payment_status: 'awaiting_payment', created_at: '2026-10-10T00:00:00Z' }, brain: null, phoneLine: null, listingCount: 0, invites: [], leadCount: 0, now: NOW });
  const text = r.problems.join(' | ');
  assert.match(text, /No NMLS number or name/);
  assert.match(text, /AI Brain is empty/);
  assert.match(text, /No listing is assigned/);
  assert.match(text, /not sent a single WOW Link/);
  assert.match(text, /no record of them logging in/);
});

test('trial ended with no card is called out', () => {
  const r = buildSupportReport({ ...full, agent: { ...base, created_at: '2026-10-01T00:00:00Z' } });
  assert.match(r.problems[0], /Free trial ended/);
  assert.strictEqual(trialDaysLeft({ ...base, created_at: '2026-10-01T00:00:00Z' }, NOW) <= 0, true);
});

test('invites opened but never claimed, and unclaimed unopened ones, read differently', () => {
  const opened = buildSupportReport({ ...full, invites: [{ view_count: 2 }] });
  assert.ok(opened.problems.some((p) => /none claimed an account/.test(p)));
  const unopened = buildSupportReport({ ...full, invites: [{ view_count: 0 }] });
  assert.ok(unopened.problems.some((p) => /no agent has opened one/.test(p)));
});

test('late payment, canceled, phone error and long silence are reported', () => {
  const r = buildSupportReport({ ...full, agent: { ...base, payment_status: 'active', subscription_status: 'past_due', last_seen_at: '2026-09-01T00:00:00Z' }, phoneLine: { status: 'error', provisioning_error: 'order failed' } });
  const text = r.problems.join(' | ');
  assert.match(text, /Payment is late/);
  assert.match(text, /order failed/);
  assert.match(text, /over 2 weeks/);
  assert.strictEqual(planLabel({ subscription_status: 'canceled' }), 'Canceled');
  assert.strictEqual(planLabel({ payment_status: 'comp' }), 'Comped (free LO Pro)');
});

test('a claimed invite counts as opened even when its view counter is zero', () => {
  const r = buildSupportReport({ ...full, invites: [{ claimed_at: '2026-10-09T00:00:00Z', view_count: 0 }] });
  assert.ok(!r.problems.some((p) => /no agent has opened/.test(p)));
  assert.strictEqual(r.stats.invitesViewed, 1);
});
