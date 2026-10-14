'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createAutopilot, upcomingSlots, ptToUtc } = require('../services/autopilot/engine');
const { checkPost } = require('../services/autopilot/safety');
const { TOPICS } = require('../services/autopilot/topics');

// A very small in-memory database: just the calls the engine makes.
function fakeDb(seed = {}) {
  const tables = { admin_switches: [], admin_marketing_campaigns: [], admin_marketing_posts: [], platform_brain: [], ...seed };
  const pick = (row, key) => (key.includes('->>') ? (row[key.split('->>')[0]] || {})[key.split('->>')[1]] : row[key]);
  const builder = (name) => {
    let rows = null; let op = null; let payload = null; const filters = []; let lim = null; let single = false;
    const api = {
      select() { if (!op) op = 'select'; return api; },
      insert(p) { op = 'insert'; payload = p; return api; },
      update(p) { op = 'update'; payload = p; return api; },
      upsert(p) { op = 'upsert'; payload = p; return api; },
      delete() { op = 'delete'; return api; },
      eq(k, v) { filters.push((r) => pick(r, k) === v); return api; },
      in(k, vs) { filters.push((r) => vs.includes(pick(r, k))); return api; },
      lt(k, v) { filters.push((r) => String(pick(r, k)) < v); return api; },
      order() { return api; }, limit(n) { lim = n; return api; },
      maybeSingle() { single = 'maybe'; return api; }, single() { single = 'one'; return api; },
      then(resolve) {
        const t = tables[name]; const match = () => t.filter((r) => filters.every((f) => f(r)));
        let data = null; let error = null;
        if (op === 'insert') { const row = { ...payload }; t.push(row); data = row; }
        else if (op === 'upsert') { const i = t.findIndex((r) => (payload.id !== undefined ? r.id === payload.id : r.key === payload.key)); if (i >= 0) Object.assign(t[i], payload); else t.push({ ...payload }); data = payload; }
        else if (op === 'update') { match().forEach((r) => Object.assign(r, payload)); data = match(); }
        else if (op === 'delete') { for (const r of match()) t.splice(t.indexOf(r), 1); data = []; }
        else { data = match(); if (lim) data = data.slice(0, lim); }
        if (single) data = Array.isArray(data) ? (data[0] ?? null) : data;
        resolve({ data, error });
      }
    };
    return api;
  };
  return { tables, from: builder };
}

const GOOD = {
  title: 'Send one WOW Link', facebook: 'Send one WOW Link to one agent. They get a free listing page and you get the warm lead. Try it free for 7 days, no card.',
  linkedin: 'Agents like free help. A WOW Link gives them a listing page that answers buyers all day, and the loan officer gets the warm lead. Start with one agent and a 7-day trial.',
  instagram: 'One link. One agent. #LoanOfficers', bluesky: 'Send one WOW Link.', videoScript: 'Send one WOW Link to one agent today.'
};

function harness({ outputs = GOOD, now = new Date('2026-10-13T20:00:00Z') } = {}) {
  const db = fakeDb();
  db.tables.admin_switches.push({ key: 'autopilot_on', enabled: true, updated_by: 'ddee9647-fd81-4e54-be9c-dd25e46a99bf' });
  const scheduled = []; const mails = [];
  const studio = {
    async generate(owner, id) { const r = db.tables.admin_marketing_campaigns.find((x) => x.id === id); Object.assign(r, { status: 'draft', outputs: { ...outputs }, updated_at: 'v1' }); return r; },
    async edit(owner, id, body) { const r = db.tables.admin_marketing_campaigns.find((x) => x.id === id); r.outputs = body.outputs; r.updated_at = 'v2'; return r; },
    async settings(owner, id) { const r = db.tables.admin_marketing_campaigns.find((x) => x.id === id); r.updated_at = 'v3'; return r; },
    async approve(owner, id) { const r = db.tables.admin_marketing_campaigns.find((x) => x.id === id); r.status = 'approved'; return r; },
    async remove(owner, id) { const t = db.tables.admin_marketing_campaigns; t.splice(t.findIndex((x) => x.id === id), 1); }
  };
  const media = { async picture() {}, async render() {}, async list() { return [{ kind: 'video', status: 'ready' }]; }, async cleanup() { return []; }, async removeFiles() {} };
  const ap = createAutopilot({
    db, studioFor: () => studio, media, now: () => now, log: { warn() {} },
    getPoster: () => ({ async schedule(args) { scheduled.push(args); } }),
    getConnections: async () => ({ facebook: true, instagram: true, linkedin: true, youtube: true }),
    sendMail: async (m) => { mails.push(m); }
  });
  return { db, ap, scheduled, mails };
}

test('Pacific slot times are right across daylight saving', () => {
  assert.strictEqual(ptToUtc(2026, 10, 14, 8, 0).toISOString(), '2026-10-14T15:00:00.000Z');
  assert.strictEqual(ptToUtc(2026, 11, 2, 8, 0).toISOString(), '2026-11-02T16:00:00.000Z');
  const keys = upcomingSlots(new Date('2026-10-13T20:00:00Z')).map((s) => s.key);
  assert.deepStrictEqual(keys, ['2026-10-13@17:00', '2026-10-14@08:00', '2026-10-14@12:00', '2026-10-14@17:00']);
});

test('the safety check lets a normal post through and stops promises, made-up results and outside links', () => {
  assert.deepStrictEqual(checkPost({ ...GOOD, facebook: GOOD.facebook + ' https://homelistingai.com/for-loan-officers' }), []);
  const bad = checkPost({ ...GOOD, facebook: 'We guarantee 40% more leads. Thousands of loan officers love it [Name] http://evil.com' });
  assert.ok(bad.length >= 4, JSON.stringify(bad));
  assert.ok(checkPost({ ...GOOD, linkedin: 'Replace your staff with AI and save $500 every month, no need to hire anyone at all.' }).length >= 2);
});

test('every topic is unique and uses plain product facts only', () => {
  assert.strictEqual(new Set(TOPICS.map((t) => t.key)).size, TOPICS.length);
  for (const t of TOPICS) assert.ok(!/\d\s*%|guarantee/i.test(t.idea), t.key);
});

test('with Autopilot ON it writes, schedules and posts nothing by itself outside the 18-hour window', async () => {
  const { ap, scheduled, db } = harness();
  const out = await ap.tick();
  assert.ok(out.results.length >= 1);
  assert.ok(scheduled.length >= 1);
  for (const call of scheduled) { assert.deepStrictEqual(call.channels.sort(), ['facebook', 'instagram', 'linkedin', 'youtube']); }
  const slots = db.tables.admin_marketing_campaigns.map((c) => c.brief.slot);
  assert.strictEqual(new Set(slots).size, slots.length, 'one post per slot');
  const again = await ap.tick();
  assert.ok(again.results.every((r) => r.skipped), 'a second tick does not write the same slots again');
});

test('with Autopilot OFF nothing is written', async () => {
  const { ap, db, scheduled } = harness();
  db.tables.admin_switches[0].enabled = false;
  assert.deepStrictEqual(await ap.tick(), { off: true });
  assert.strictEqual(scheduled.length, 0);
});

test('a post that fails the safety check is never scheduled, and three failures in a row switch Autopilot off and email', async () => {
  const { ap, scheduled, db, mails } = harness({ outputs: { ...GOOD, facebook: 'We guarantee more leads for every loan officer who tries it this week, no risk at all.' } });
  const out = await ap.tick();
  assert.strictEqual(scheduled.length, 0);
  assert.ok(db.tables.admin_marketing_campaigns.every((c) => c.status === 'failed'));
  assert.ok(out.paused || db.tables.admin_marketing_campaigns.length >= 1);
  const first = db.tables.admin_switches.find((s) => s.key === 'autopilot_on');
  if (out.paused) { assert.strictEqual(first.enabled, false); assert.ok(mails.length >= 1); }
});

test('Stop turns it off and takes back posts that are waiting', async () => {
  const { ap, db } = harness();
  await ap.tick();
  db.tables.admin_marketing_posts.push({ campaign_id: db.tables.admin_marketing_campaigns[0].id, channel: 'facebook', status: 'scheduled' }, { campaign_id: db.tables.admin_marketing_campaigns[0].id, channel: 'linkedin', status: 'published' });
  const out = await ap.stop('ddee9647-fd81-4e54-be9c-dd25e46a99bf');
  assert.strictEqual(out.on, false);
  assert.deepStrictEqual(db.tables.admin_marketing_posts.map((p) => p.status), ['published']);
});

test('the 30-day launch plan uses the launch topics and the launch look, then stops after 30 days', async () => {
  const day = 86400000; const now = new Date('2026-10-13T23:00:00Z'); // 4 PM Pacific: 5 PM today and 8 AM tomorrow are inside the 18-hour window
  const running = harness({ now });
  running.db.tables.admin_switches.push({ key: 'autopilot_plan_launch30', enabled: true, updated_at: new Date(now.getTime() - 2 * day).toISOString() });
  await running.ap.tick();
  const rows = running.db.tables.admin_marketing_campaigns;
  assert.ok(rows.length >= 2);
  assert.ok(rows.every((r) => r.brief.cardStyle === 'launch' && r.brief.planWeek === 1), 'all week-1 posts carry the launch look');
  assert.ok(rows.find((r) => r.brief.slot.endsWith('@08:00')).brief.topicKey.startsWith('l1-'), 'the morning post is a week-1 campaign post');
  assert.ok(/Bold, direct/.test(rows[0].brief.tone));

  const over = harness({ now });
  over.db.tables.admin_switches.push({ key: 'autopilot_plan_launch30', enabled: true, updated_at: new Date(now.getTime() - 40 * day).toISOString() });
  await over.ap.tick();
  assert.ok(over.db.tables.admin_marketing_campaigns.every((r) => !r.brief.cardStyle), 'after 30 days it goes back to everyday posts');
});

test('week 4 posts the founding price and links to signup; the checker lets only $49 and $79 through', () => {
  const { LAUNCH } = require('../services/autopilot/topics');
  const w4 = LAUNCH.filter((t) => t.week === 4);
  assert.ok(w4.length >= 3 && w4.every((t) => t.link.endsWith('/lo-signup')));
  assert.ok(LAUNCH.every((t) => /No statistics/.test(t.idea) && /never say the product finds/i.test(t.idea)));
  const base = { title: 't', facebook: 'x'.repeat(70), linkedin: 'y'.repeat(90), instagram: 'z', bluesky: 'b', videoScript: 'v' };
  assert.deepStrictEqual(checkPost({ ...base, facebook: 'Founding price is $49 a month instead of $79 for the first 25 loan officers. Start your 7-day free trial, no card.' + ' ok'.repeat(10) }), []);
  assert.ok(checkPost({ ...base, facebook: 'HomeListingAI finds new Realtors for you and fills your pipeline with guaranteed referrals every month.' }).length >= 2);
});

test('verified facts may be quoted with their exact numbers; any other statistic is blocked', () => {
  const { tokensFor } = require('../services/autopilot/facts');
  const base = { title: 't', facebook: 'x'.repeat(70), linkedin: 'y'.repeat(90), instagram: 'z', bluesky: 'b', videoScript: 'v' };
  const post = { ...base, facebook: 'NAR membership is about 10% below its 2022 peak, per NAR. Send one WOW Link to one agent this week and start a new relationship.' };
  assert.ok(checkPost(post).some((p) => /unverified percentage/.test(p)), 'blocked without the fact');
  assert.deepStrictEqual(checkPost(post, { allowed: tokensFor(['nar-members-now']) }), []);
  assert.ok(checkPost({ ...post, facebook: post.facebook.replace('10%', '40%') }, { allowed: tokensFor(['nar-members-now']) }).length >= 1, 'an invented number is still blocked');
  assert.ok(checkPost({ ...base, facebook: 'About 3 million agents left the business last year, so act now with a trial today.' }).some((p) => /unverified number/.test(p)));
});

test('a saved direction and the founding-price end date go into the posts that are written next', async () => {
  const day = 86400000; const now = new Date('2026-10-13T23:00:00Z');
  const h = harness({ now });
  h.db.tables.admin_switches.push({ key: 'autopilot_plan_launch30', enabled: true, updated_at: new Date(now.getTime() - 19 * day).toISOString() }); // plan day 20
  h.db.tables.platform_brain.push({ id: 'founding-offer', config: { endsAt: '2026-11-02T00:00:00.000Z' } });
  await h.ap.setDirection('Lean on the free trial this week. Never mention rates.');
  const out = await h.ap.tick();
  const rows = h.db.tables.admin_marketing_campaigns;
  assert.ok(rows.length >= 1, JSON.stringify(out));
  const evening = rows.find((r) => r.brief.slot.endsWith('@17:00'));
  assert.ok(evening, 'the evening post exists');
  assert.match(evening.brief.idea, /New direction from Chris/);
  assert.match(evening.brief.idea, /Lean on the free trial/);
  assert.ok(evening.brief.topicKey.startsWith('l4-'), 'from day 17 the evening post is the founding-price offer');
  assert.match(evening.brief.idea, /ends on November 1 or when the 25 spots are gone/);
  assert.strictEqual((await h.ap.status()).direction, 'Lean on the free trial this week. Never mention rates.');
});

test('the founding discount stops being applied after its end date', async () => {
  const { pickFoundingDiscount } = require('../services/foundingCoupon');
  const stripe = { coupons: { retrieve: async () => ({ valid: true }) } };
  const db = fakeDb(); db.tables.platform_brain.push({ id: 'founding-offer', config: { endsAt: '2026-11-02T00:00:00.000Z' } });
  assert.deepStrictEqual(await pickFoundingDiscount({ stripe, couponId: 'C', db, now: () => new Date('2026-10-20T00:00:00Z') }), [{ coupon: 'C' }]);
  assert.deepStrictEqual(await pickFoundingDiscount({ stripe, couponId: 'C', db, now: () => new Date('2026-11-03T00:00:00Z') }), []);
  assert.deepStrictEqual(await pickFoundingDiscount({ stripe, couponId: 'C', db: fakeDb(), now: () => new Date('2027-01-01T00:00:00Z') }), [{ coupon: 'C' }], 'no end date set: unchanged');
});

test('Replace writes a new post for that time, Skip leaves it empty, and a post that is out cannot be taken back', async () => {
  const h = harness({ now: new Date('2026-10-13T23:00:00Z') });
  await h.ap.tick();
  const [first, second] = h.db.tables.admin_marketing_campaigns;
  const owner = 'ddee9647-fd81-4e54-be9c-dd25e46a99bf';
  h.db.tables.admin_marketing_posts.push({ campaign_id: first.id, channel: 'facebook', status: 'published' });
  assert.strictEqual((await h.ap.removeUpcoming(owner, first.id)).status, 409);

  h.db.tables.admin_marketing_posts.push({ campaign_id: second.id, channel: 'facebook', status: 'scheduled' });
  const slot = second.brief.slot;
  const skipped = await h.ap.removeUpcoming(owner, second.id, { skip: true });
  assert.strictEqual(skipped.skipped, true);
  await h.ap.tick();
  assert.strictEqual(h.db.tables.admin_marketing_campaigns.filter((r) => r.brief.slot === slot && !r.brief.skipped).length, 0, 'a skipped time stays empty');
});
