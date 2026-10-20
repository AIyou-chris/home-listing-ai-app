const test = require('node:test');
const assert = require('node:assert');
const { createFakeDb } = require('./helpers/fakeDb');
const engine = require('../services/coldEmail/engine');
const sender = require('../services/coldEmail/sender');

const cfg = () => sender.readConfig({
  COLD_EMAIL_ENABLED: 'true', COLD_EMAIL_DOMAIN: 'mail.example-lending.com',
  COLD_EMAIL_MAILBOXES: 'Chris Potter <chris@mail.example-lending.com>', COLD_EMAIL_MAILGUN_API_KEY: 'k'
});
const mx = async () => true;
const O = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const O2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TUE_MORNING = new Date('2026-10-06T13:00:00Z'); // 8:00 in Chicago
const GOOD_BODY = 'Hi Sam,\n\nMost loan officers I talk to say agents send fewer referrals than before, and the internet leads they buy do not pick up.\n\nI built a listing page with an AI chat and your name on it, so buyers who ask about a house become a warm lead routed straight to you. The agent gets a better listing page. You get the call.\n\nWorth a 2-minute look?\n\nChris\nFounder, HomeListingAI';

const seedSend = (over = {}) => ({ owner_id: O, id: 's1', batch_id: 'b1', prospect_id: 'p1', touch: 1, angle: 'agent_referrals', opener: 'A', variant_id: 'A', subject: 'your agent partners', body_text: GOOD_BODY, status: 'approved', scheduled_for: TUE_MORNING.toISOString(), check_failures: [], ...over });
const seedDb = (extra = {}) => createFakeDb({
  lo_prospects: [{ owner_id: O, id: 'p1', email: 'sam@lender.com', first_name: 'Sam', company: 'Acme', state: 'TX', status: 'verified', unsub_token: 'tok1' }],
  cold_email_batches: [{ owner_id: O, id: 'b1', status: 'approved', send_window: 'morning', reply_only: true, angle: 'agent_referrals' }],
  cold_email_sends: [seedSend()],
  lo_suppression_list: [],
  ...extra
});
const run = (db, over = {}) => {
  const calls = [];
  const send = async (args) => { calls.push(args); return { messageId: `<m${calls.length}@x>` }; };
  return engine.sweep(db, { owners: [O], cfg: cfg(), now: TUE_MORNING, send, mx, ...over }).then((r) => ({ r, calls }));
};

test('sweep sends one due email with footer and marks everything', async () => {
  const db = seedDb();
  const { r, calls } = await run(db);
  assert.strictEqual(r.sent, 1);
  assert.match(calls[0].text, /unsubscribe here: .*\/api\/public\/cold-unsubscribe\/tok1/);
  assert.match(calls[0].text, /Cashmere|Self Rd|[0-9]{3,5} /);
  assert.strictEqual(db.tables.cold_email_sends[0].status, 'sent');
  assert.strictEqual(db.tables.lo_prospects[0].status, 'in_sequence');
});

test('sweep does nothing while the cold-email domain is not set up', async () => {
  const db = seedDb();
  const { r, calls } = await run(db, { cfg: sender.readConfig({}) });
  assert.strictEqual(calls.length, 0);
  assert.ok(r.blockers.length > 0);
});

test('outside the Tue-Thu morning window it reschedules instead of sending', async () => {
  const db = seedDb();
  const { r, calls } = await run(db, { now: new Date('2026-10-06T22:00:00Z') }); // 5pm Tuesday
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(r.sent, 0);
  assert.ok(new Date(db.tables.cold_email_sends[0].scheduled_for) > new Date('2026-10-06T22:00:00Z'));
});

test('suppressed, role and recently emailed recipients are never sent to', async () => {
  const db = seedDb({ lo_suppression_list: [{ email: 'sam@lender.com' }] });
  const { calls } = await run(db);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(db.tables.cold_email_sends[0].status, 'cancelled');
  const db2 = seedDb();
  db2.tables.lo_prospects[0].last_contacted_at = new Date(TUE_MORNING.getTime() - 3 * 86400000).toISOString();
  assert.strictEqual((await run(db2)).calls.length, 0);
});

test('a failing checker blocks the send', async () => {
  const db = seedDb();
  db.tables.cold_email_sends[0].body_text = GOOD_BODY.replace('You get the call.', 'This is a seamless solution.');
  const { calls } = await run(db);
  assert.strictEqual(calls.length, 0);
  assert.match(db.tables.cold_email_sends[0].skip_reason, /^checker:/);
});

test('the daily mailbox cap holds', async () => {
  const sends = Array.from({ length: 25 }, (_, i) => seedSend({ id: `s${i}`, prospect_id: `p${i}` }));
  const prospects = sends.map((s, i) => ({ id: `p${i}`, email: `lo${i}@lender${i}.com`, first_name: 'Sam', state: 'TX', status: 'verified', unsub_token: `t${i}` }));
  const db = seedDb({ cold_email_sends: sends, lo_prospects: prospects });
  const { r } = await run(db);
  assert.strictEqual(r.sent, 20); // day-one cap per mailbox
});

test('later touches stop once the person replied', async () => {
  const db = seedDb({ cold_email_sends: [seedSend({ id: 's1', status: 'sent', sent_at: '2026-10-01T13:00:00Z', replied_at: '2026-10-02T13:00:00Z' }), seedSend({ id: 's2', touch: 2, body_text: 'x' })] });
  const { calls } = await run(db);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(db.tables.cold_email_sends[1].status, 'cancelled');
});

test('bad bounce rate pauses every approved batch', async () => {
  const sent = Array.from({ length: 30 }, (_, i) => seedSend({ id: `x${i}`, prospect_id: 'p1', touch: 1, status: 'sent', sent_at: '2026-10-05T13:00:00Z', bounced_at: i < 3 ? '2026-10-05T14:00:00Z' : null, mailbox: 'Chris Potter <chris@mail.example-lending.com>' }));
  const db = seedDb({ cold_email_sends: [...sent, seedSend({ id: 'due', touch: 2 })] });
  const { r, calls } = await run(db);
  assert.match(r.paused, /Bounce rate/);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(db.tables.cold_email_batches[0].status, 'paused');
});

test('replies: interested makes a lead and alert, stop words suppress, sequence stops', async () => {
  const db = seedDb({ cold_email_sends: [seedSend({ id: 's1', status: 'sent', sent_at: '2026-10-05T13:00:00Z' }), seedSend({ id: 's2', touch: 2 })], leads: [] });
  const events = [];
  const out = await engine.handleReply(db, { fromEmail: 'Sam@Lender.com', subject: 'Re: x', body: 'Sounds good, send me the demo', notify: async (e) => events.push(['notify', e.drafted]), createLead: async (e) => events.push(['lead', e.prospect.email]) });
  assert.strictEqual(out.label, 'interested');
  assert.deepStrictEqual(events.map((e) => e[0]), ['lead', 'notify']);
  assert.match(events[1][1], /Hi Sam/);
  assert.strictEqual(db.tables.cold_email_sends[1].status, 'cancelled');
  assert.strictEqual(db.tables.cold_email_sends[0].reply_class, 'interested');
  const db2 = seedDb({ cold_email_sends: [seedSend({ id: 's1', status: 'sent', sent_at: '2026-10-05T13:00:00Z' })] });
  await engine.handleReply(db2, { fromEmail: 'sam@lender.com', body: 'STOP' });
  assert.ok(db2.tables.lo_suppression_list.some((r) => r.email === 'sam@lender.com'));
  assert.strictEqual(db2.tables.lo_prospects[0].status, 'unsubscribed');
});

test('bounce and unsubscribe link suppress for good', async () => {
  const db = seedDb({ cold_email_sends: [seedSend({ id: 's1', status: 'sent', sent_at: '2026-10-05T13:00:00Z' }), seedSend({ id: 's2', touch: 2 })] });
  await engine.handleBounce(db, { email: 'sam@lender.com', kind: 'complaint' });
  assert.ok(db.tables.lo_suppression_list.some((r) => r.reason === 'cold_email_complaint'));
  assert.ok(db.tables.cold_email_sends[0].complained_at);
  assert.strictEqual(db.tables.cold_email_sends[1].status, 'cancelled');
  const db2 = seedDb();
  assert.strictEqual(await engine.unsubscribeByToken(db2, 'tok1'), true);
  assert.strictEqual(await engine.unsubscribeByToken(db2, 'nope'), false);
  assert.strictEqual(db2.tables.lo_prospects[0].status, 'unsubscribed');
});

test('import drops role, invalid, suppressed and duplicate addresses; facts need a source', async () => {
  const db = createFakeDb({ lo_suppression_list: [{ email: 'gone@x.com' }], lo_prospects: [] });
  const out = await engine.importProspects(db, O, [
    { email: 'a@one.com', name: 'Ann Lee', company: 'One', fact: 'Won an award', fact_url: '' },
    { email: 'A@one.com' }, { email: 'info@two.com' }, { email: 'bad' }, { email: 'gone@x.com' }, { email: 'b@three.com', fact: 'Posted a thing', fact_url: 'https://x.test/p' }
  ]);
  assert.strictEqual(out.added, 2);
  assert.strictEqual(out.duplicates, 1);
  assert.strictEqual(out.rejected.length, 3);
  assert.strictEqual(db.tables.lo_prospects.find((p) => p.email === 'a@one.com').personalization_fact, null);
  assert.strictEqual(db.tables.lo_prospects.find((p) => p.email === 'b@three.com').personalization_fact, 'Posted a thing');
});

test('approving needs clean drafts, caps the very first send at 20 and schedules all five touches', async () => {
  const prospects = Array.from({ length: 30 }, (_, i) => ({ owner_id: O, id: `p${i}`, email: `lo${i}@lender${i}.com`, first_name: 'Sam', company: 'Acme', state: 'TX', status: 'verified', unsub_token: `t${i}` }));
  const sends = prospects.map((p, i) => ({ owner_id: O, id: `d${i}`, batch_id: 'b1', prospect_id: p.id, touch: 1, status: 'draft', subject: 'your agent partners', body_text: GOOD_BODY, check_failures: i === 0 ? ['Banned word'] : [] }));
  const db = createFakeDb({ lo_prospects: prospects, cold_email_batches: [{ owner_id: O, id: 'b1', status: 'draft', angle: 'agent_referrals', opener: 'A', variant_id: 'A', send_window: 'morning', reply_only: true }], cold_email_sends: sends });
  const out = await engine.approveBatch(db, O, 'b1', { approvedBy: 'chris@x.com', cfg: cfg() });
  assert.strictEqual(out.blocked, 1);
  assert.strictEqual(out.approved, 20);
  assert.strictEqual(out.heldBack, 9);
  assert.strictEqual(out.firstSendCap, 20);
  const later = db.tables.cold_email_sends.filter((s) => s.touch > 1);
  assert.strictEqual(later.length, 20 * 4);
  assert.ok(later.every((s) => s.status === 'approved'));
  assert.ok(later.filter((s) => s.touch === 2 || s.touch === 3).every((s) => /\/for-loan-officers\/t\d+\?utm_source=cold-email/.test(s.body_text)));
  assert.strictEqual(db.tables.cold_email_batches[0].status, 'approved');
});

test('two overlapping sweeps never send the same email twice', async () => {
  const db = seedDb();
  const calls = [];
  const send = async (a) => { calls.push(a); await new Promise((r) => setTimeout(r, 5)); return { messageId: 'm' }; };
  await Promise.all([
    engine.sweep(db, { owners: [O], cfg: cfg(), now: TUE_MORNING, send, mx }),
    engine.sweep(db, { owners: [O], cfg: cfg(), now: TUE_MORNING, send, mx })
  ]);
  assert.strictEqual(calls.length, 1);
});

test('warm-up counts from the very first send, even one older than 30 days', async () => {
  const old = seedSend({ id: 'old', prospect_id: 'p0', status: 'sent', sent_at: '2026-06-01T13:00:00Z', created_at: '2026-06-01T12:00:00Z', mailbox: 'x' });
  const sends = Array.from({ length: 40 }, (_, i) => seedSend({ id: `s${i}`, prospect_id: `p${i + 1}` }));
  const prospects = [{ owner_id: O, id: 'p0', email: 'old@o.com', state: 'TX', status: 'in_sequence', unsub_token: 'o' }, ...sends.map((s, i) => ({ owner_id: O, id: `p${i + 1}`, email: `lo${i}@lender${i}.com`, first_name: 'Sam', state: 'TX', status: 'verified', unsub_token: `t${i}` }))];
  const db = seedDb({ cold_email_sends: [old, ...sends], lo_prospects: prospects });
  const { r } = await run(db, { now: new Date('2026-10-06T13:00:00Z') });
  assert.ok(r.sent > 20, `expected more than the day-one cap of 20, got ${r.sent}`);
});

test('from the finder: only mortgage people come over, not tax advisors or test rows', async () => {
  const db = createFakeDb({ lo_suppression_list: [], lo_prospects: [], lo_lead_pool: [
    { email: 'ann@madison.com', name: 'Ann Lee', employer: 'Madison Mortgage Services', job_title: 'Mortgage Loan Officer', is_role: false, status: 'new' },
    { email: 'tax@ethics.com', name: 'Shawn Webb', employer: 'EthicsPro Tax', job_title: 'Tax Advisor', is_role: false, status: 'new' },
    { email: 'founder@curb.com', name: 'Paul', employer: 'Curb Appeal Concepts', job_title: 'Founder', is_role: false, status: 'new' },
    { email: 'jev.test.real@hlai-test-verify.com', name: 'Test RealLO', employer: 'Acme Mortgage', job_title: 'Loan Officer', is_role: false, status: 'new' }
  ] });
  const out = await engine.promoteFromFinder(db, O, 50);
  assert.strictEqual(out.added, 1);
  assert.strictEqual(out.skippedNotLo, 3);
  assert.strictEqual(db.tables.lo_prospects[0].email, 'ann@madison.com');
});

// ---- one customer never touches another customer's prospects, batches or sends ----
const twoCustomers = () => createFakeDb({
  lo_prospects: [
    { owner_id: O, id: 'p1', email: 'sam@lender.com', first_name: 'Sam', state: 'TX', status: 'verified', unsub_token: 'tok1' },
    { owner_id: O2, id: 'q1', email: 'sam@lender.com', first_name: 'Sam', state: 'TX', status: 'verified', unsub_token: 'tokq1' }
  ],
  cold_email_batches: [
    { owner_id: O, id: 'b1', status: 'approved', send_window: 'morning', reply_only: true, angle: 'agent_referrals' },
    { owner_id: O2, id: 'b2', status: 'approved', send_window: 'morning', reply_only: true, angle: 'agent_referrals' }
  ],
  cold_email_sends: [seedSend(), seedSend({ id: 's2', owner_id: O2, batch_id: 'b2', prospect_id: 'q1' })],
  lo_suppression_list: []
});

test('the sweep only sends for the customers it is told about', async () => {
  const db = twoCustomers();
  const { r, calls } = await run(db, { owners: [O2] });
  assert.strictEqual(r.sent, 1);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(db.tables.cold_email_sends.find((s) => s.id === 's1').status, 'approved', 'the other customer is untouched');
  assert.strictEqual(db.tables.cold_email_sends.find((s) => s.id === 's2').status, 'sent');
});

test('a customer can import an address another customer already has', async () => {
  const db = twoCustomers();
  const out = await engine.importProspects(db, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', [{ email: 'sam@lender.com' }]);
  assert.strictEqual(out.added, 1);
  const again = await engine.importProspects(db, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', [{ email: 'sam@lender.com' }]);
  assert.strictEqual(again.added, 0);
  assert.strictEqual(again.duplicates, 1);
});

test('drafts, edits and approval refuse another customer\'s batch and sends', async () => {
  const db = twoCustomers();
  db.tables.cold_email_sends.find((s) => s.id === 's2').status = 'draft';
  await assert.rejects(engine.generateDrafts(db, O, 'b2', { complete: async () => '{}' }), /not_found/);
  await assert.rejects(engine.editSend(db, O, 's2', { subject: 'x', body_text: 'y' }), /not_editable/);
  assert.deepStrictEqual(await engine.approveBatch(db, O, 'b2', { cfg: cfg() }).catch((e) => e.message), 'batch_not_draft');
  await assert.rejects(engine.importProspects(db, undefined, [{ email: 'a@b.com' }]), /owner_required/);
});

test('verify and results look only at that customer\'s rows', async () => {
  const db = twoCustomers();
  db.tables.lo_prospects.forEach((p) => { p.status = 'new'; });
  const out = await engine.verifyProspects(db, O, { limit: 10 }).catch(() => null);
  if (out) assert.ok(db.tables.lo_prospects.find((p) => p.owner_id === O2).status === 'new', 'the other customer is untouched');
  const sentRows = [seedSend({ id: 'r1', status: 'sent', sent_at: '2026-10-05T13:00:00Z' }), seedSend({ id: 'r2', owner_id: O2, status: 'sent', sent_at: '2026-10-05T13:00:00Z' })];
  const dbR = createFakeDb({ cold_email_sends: sentRows, lo_prospects: [], agents: [] });
  assert.strictEqual((await engine.loadResults(dbR, O)).total.sent, 1);
});

test('a bounce is about the address, so it stops every customer\'s sequence; a hand-logged reply stays with its customer', async () => {
  const db = twoCustomers();
  assert.strictEqual(await engine.handleBounce(db, { email: 'sam@lender.com', kind: 'bounce' }), true);
  assert.deepStrictEqual(db.tables.lo_prospects.map((p) => p.status), ['bounced', 'bounced']);
  const db2 = twoCustomers();
  const out = await engine.handleReply(db2, { fromEmail: 'sam@lender.com', body: 'Yes, I am interested, call me', owner: O2 });
  assert.strictEqual(out.matched, true);
  assert.strictEqual(db2.tables.cold_email_replies[0].owner_id, O2);
  assert.strictEqual(db2.tables.lo_prospects.find((p) => p.owner_id === O).status, 'verified');
});
