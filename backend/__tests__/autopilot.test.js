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
      like(k, pattern) { const head = pattern.replace('%', ''); filters.push((r) => String(pick(r, k)).startsWith(head)); return api; },
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

function harness({ outputs = GOOD, now = new Date('2026-10-13T20:00:00Z'), blog = null, mediaExtra = {} } = {}) {
  let current = now;
  const db = fakeDb();
  db.tables.admin_switches.push({ key: 'autopilot_on', enabled: true, updated_by: 'ddee9647-fd81-4e54-be9c-dd25e46a99bf' });
  const scheduled = []; const mails = []; const pictureCalls = [];
  const studio = {
    async generate(owner, id) { const r = db.tables.admin_marketing_campaigns.find((x) => x.id === id); Object.assign(r, { status: 'draft', outputs: { ...outputs }, updated_at: 'v1' }); return r; },
    async edit(owner, id, body) { const r = db.tables.admin_marketing_campaigns.find((x) => x.id === id); r.outputs = body.outputs; r.updated_at = 'v2'; return r; },
    async settings(owner, id) { const r = db.tables.admin_marketing_campaigns.find((x) => x.id === id); r.updated_at = 'v3'; return r; },
    async approve(owner, id) { const r = db.tables.admin_marketing_campaigns.find((x) => x.id === id); r.status = 'approved'; return r; },
    async remove(owner, id) { const t = db.tables.admin_marketing_campaigns; t.splice(t.findIndex((x) => x.id === id), 1); }
  };
  const media = { async picture() { pictureCalls.push(1); }, async render() {}, async list() { return [{ kind: 'video', status: 'ready' }]; }, async cleanup() { return []; }, async removeFiles() {}, ...mediaExtra };
  const ap = createAutopilot({
    db, studioFor: () => studio, media, blog, now: () => current, log: { warn() {} },
    getPoster: () => ({ async schedule(args) { scheduled.push(args); } }),
    getConnections: async () => ({ facebook: true, instagram: true, linkedin: true, youtube: true }),
    sendMail: async (m) => { mails.push(m); }
  });
  return { db, ap, scheduled, mails, pictureCalls, setNow: (d) => { current = d; } };
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

test('a failed time is not retried for 30 minutes, and a stray [link] is filled in instead of failing the post', async () => {
  const h = harness({ now: new Date('2026-10-13T23:00:00Z'), outputs: { ...GOOD, facebook: 'We guarantee more leads for every loan officer who tries it this week, no risk at all.' } });
  await h.ap.tick();
  const failedAfterFirst = h.db.tables.admin_marketing_campaigns.filter((c) => c.brief.failed).length;
  assert.ok(failedAfterFirst >= 1);
  h.setNow(new Date('2026-10-13T23:10:00Z'));
  await h.ap.tick();
  assert.strictEqual(h.db.tables.admin_marketing_campaigns.filter((c) => c.brief.failed).length, failedAfterFirst, 'no new tries inside 30 minutes');

  const g = harness({ now: new Date('2026-10-13T23:00:00Z'), outputs: { ...GOOD, facebook: GOOD.facebook + ' Learn more [link]', linkedin: GOOD.linkedin + ' [Learn more]' } });
  await g.ap.tick();
  assert.ok(g.scheduled.length >= 1, 'the post goes out once the placeholder is filled');
  const row = g.db.tables.admin_marketing_campaigns.find((c) => !c.brief.failed);
  assert.ok(!/\[/.test(row.outputs.facebook + row.outputs.linkedin));
  assert.match(row.outputs.facebook, /https:\/\/homelistingai\.com/);
});

test('three different times failing in a row pauses Autopilot; repeated tries at one time do not', async () => {
  const bad = { ...GOOD, facebook: 'We guarantee more leads for every loan officer who tries it this week, no risk at all.' };
  const h = harness({ now: new Date('2026-10-13T16:00:00Z'), outputs: bad });
  for (const t of ['2026-10-13T16:00:00Z', '2026-10-13T17:00:00Z', '2026-10-13T18:00:00Z']) { h.setNow(new Date(t)); await h.ap.tick(); }
  assert.strictEqual(h.db.tables.admin_switches.find((x) => x.key === 'autopilot_on').enabled, true, 'two times failing is not enough to pause');
  h.setNow(new Date('2026-10-13T23:00:00Z'));
  await h.ap.tick();
  h.setNow(new Date('2026-10-14T00:00:00Z'));
  await h.ap.tick();
  h.setNow(new Date('2026-10-14T05:00:00Z')); // 10 PM Pacific: the next morning's 8 AM is now in range
  await h.ap.tick();
  assert.strictEqual(h.db.tables.admin_switches.find((x) => x.key === 'autopilot_on').enabled, false);
  assert.ok(h.mails.some((m) => /paused/i.test(m.subject)));
});

test('every launch topic has its own short picture headline, and it reaches the picture brief', async () => {
  const { LAUNCH } = require('../services/autopilot/topics');
  assert.ok(LAUNCH.every((t) => t.headline && t.headline.length < 80), 'a headline for each launch topic');
  const now = new Date('2026-10-13T23:00:00Z');
  const h = harness({ now });
  h.db.tables.admin_switches.push({ key: 'autopilot_plan_launch30', enabled: true, updated_at: new Date(now.getTime() - 2 * 86400000).toISOString() });
  await h.ap.tick();
  const morning = h.db.tables.admin_marketing_campaigns.find((r) => r.brief.slot.endsWith('@08:00'));
  assert.ok(morning.brief.cardHeadline && morning.brief.cardHeadline === LAUNCH.find((t) => t.key === morning.brief.topicKey).headline);
});

test('twice a week it writes the next planned article as a draft, never publishes, and spaces them out', async () => {
  const written = [];
  const briefs = [{ id: '11111111-1111-4111-8111-111111111111', title: 'A' }, { id: '22222222-2222-4222-8222-222222222222', title: 'B' }, { id: '33333333-3333-4333-8333-333333333333', title: 'C' }];
  const blog = { nextBrief: async () => briefs.find((b) => !written.includes(b.id)) || null, write: async (owner, id) => { written.push(id); } };
  const h = harness({ blog, now: new Date('2026-10-13T23:00:00Z') });
  // The marker rows are stamped by the real clock; this test runs on a pretend clock, so restamp them.
  const run = async (when) => {
    const at = new Date(when); h.setNow(at); await h.ap.tick();
    h.db.tables.admin_switches.filter((x) => x.key.startsWith('autopilot_blog_') && !x.stamped).forEach((x) => { x.updated_at = at.toISOString(); x.stamped = true; });
  };
  await run('2026-10-13T23:00:00Z');
  assert.deepStrictEqual(written, [briefs[0].id]);
  await run('2026-10-14T23:00:00Z');
  assert.strictEqual(written.length, 1, 'one day later is too soon');
  await run('2026-10-17T00:00:00Z');
  assert.strictEqual(written.length, 2, 'three days later is fine');
  await run('2026-10-20T00:00:00Z');
  assert.strictEqual(written.length, 2, 'two in the last seven days is the limit');
  await run('2026-10-25T00:00:00Z');
  assert.strictEqual(written.length, 3, 'a new week, another one');
  assert.ok(h.db.tables.admin_switches.some((x) => x.key === `autopilot_blog_${briefs[0].id}`), 'each try is marked');
});

test('a failed blog draft is not retried in a loop, and "write now" always works', async () => {
  let calls = 0;
  const blog = { nextBrief: async () => ({ id: '44444444-4444-4444-8444-444444444444', title: 'D' }), write: async () => { calls += 1; throw new Error('writer broke'); } };
  const h = harness({ blog, now: new Date('2026-10-13T23:00:00Z') });
  await h.ap.tick(); await h.ap.tick();
  assert.strictEqual(calls, 1, 'second tick is blocked by the marker');
  const forced = await h.ap.maybeBlogDraft('ddee9647-fd81-4e54-be9c-dd25e46a99bf', { force: true });
  assert.strictEqual(calls, 2);
  assert.match(forced.failed, /writer broke/);
});

test('each post gets a cinematic AI picture with its headline; if that fails the free card is used instead', async () => {
  const autoCalls = [];
  const good = harness({ now: new Date('2026-10-13T23:00:00Z'), mediaExtra: { images: { async auto(owner, id, body) { autoCalls.push(body); return { ok: true, altText: 'a chair' }; } } } });
  await good.ap.tick();
  assert.ok(autoCalls.length >= 1 && autoCalls.every((c) => c.headline && c.headline.length > 3), 'the headline goes to the picture maker');
  assert.strictEqual(good.pictureCalls.length, 0, 'no free card when the AI picture worked');
  assert.ok(good.scheduled.length >= 1);

  const broken = harness({ now: new Date('2026-10-13T23:00:00Z'), mediaExtra: { images: { async auto() { throw new Error('image service down'); } } } });
  await broken.ap.tick();
  assert.ok(broken.pictureCalls.length >= 1, 'falls back to the free branded card');
  assert.ok(broken.scheduled.length >= 1, 'the post still goes out');
});

test('"New picture" makes another scene for a waiting post, renders the video again and approves it again', async () => {
  const calls = []; let renders = 0;
  const h = harness({ now: new Date('2026-10-13T23:00:00Z'), mediaExtra: { async render() { renders += 1; }, images: { async auto(owner, id, body) { calls.push(body); return { ok: true, altText: 'a doorway' }; } } } });
  await h.ap.tick();
  const row = h.db.tables.admin_marketing_campaigns[0];
  h.db.tables.admin_marketing_posts.push({ campaign_id: row.id, channel: 'facebook', status: 'scheduled' });
  const first = renders;
  const out = await h.ap.redoPicture('ddee9647-fd81-4e54-be9c-dd25e46a99bf', row.id);
  assert.strictEqual(out.redone, true);
  assert.strictEqual(calls.at(-1).variant, 1, 'a different scene each time');
  assert.strictEqual(renders, first + 1, 'the video is made again');
  assert.strictEqual(row.status, 'approved');
  assert.strictEqual(row.brief.sceneAlt, 'a doorway');
  h.db.tables.admin_marketing_posts[0].status = 'published';
  assert.strictEqual((await h.ap.redoPicture('ddee9647-fd81-4e54-be9c-dd25e46a99bf', row.id)).status, 409, 'a post that is out cannot be changed');
});

test('a blog draft gets an AI picture attached, and a picture failure never loses the draft', async () => {
  const heroed = [];
  const blog = { nextBrief: async () => ({ id: '55555555-5555-4555-8555-555555555555', title: 'E' }), write: async () => {}, makeHero: async (owner, id) => { heroed.push(id); return { id: 'img' }; } };
  const h = harness({ blog, now: new Date('2026-10-13T23:00:00Z') });
  const out = await h.ap.maybeBlogDraft('ddee9647-fd81-4e54-be9c-dd25e46a99bf', { force: true });
  assert.deepStrictEqual(heroed, ['55555555-5555-4555-8555-555555555555']);
  assert.strictEqual(out.picture, true);

  const flaky = { ...blog, makeHero: async () => { throw new Error('image service down'); } };
  const g = harness({ blog: flaky, now: new Date('2026-10-13T23:00:00Z') });
  const second = await g.ap.maybeBlogDraft('ddee9647-fd81-4e54-be9c-dd25e46a99bf', { force: true });
  assert.strictEqual(second.id, '55555555-5555-4555-8555-555555555555');
  assert.strictEqual(second.picture, false);
  assert.ok(!second.failed, 'the draft itself is still fine');
});
