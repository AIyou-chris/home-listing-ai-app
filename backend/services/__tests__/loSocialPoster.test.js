'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.MARKETING_TOKEN_ENCRYPTION_KEY = process.env.MARKETING_TOKEN_ENCRYPTION_KEY || 'a'.repeat(64);
const { createLoSocialPoster } = require('../loSocialPoster');
const { createSpendGuard } = require('../spendGuard');
const { ReconnectError } = require('../../marketing-engine/services/socialPublish');

const LO = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function memDb(seed = {}) {
  const tables = { lo_social_posts: [], lo_social_connections: [], ...seed };
  let n = 0;
  const from = (name) => {
    let op = 'select'; let payload; const f = []; let single = false; let max = Infinity;
    const api = {
      select() { return api; }, insert(p) { op = 'insert'; payload = p; return api; }, update(p) { op = 'update'; payload = p; return api; },
      eq(k, v) { f.push((r) => r[k] === v); return api; }, neq(k, v) { f.push((r) => r[k] !== v); return api; },
      lte(k, v) { f.push((r) => r[k] <= v); return api; }, order() { return api; }, limit(x) { max = x; return api; },
      maybeSingle() { single = true; return api; },
      then(resolve) {
        const rows = tables[name]; const hit = rows.filter((r) => f.every((g) => g(r))).slice(0, max);
        if (op === 'insert') { (Array.isArray(payload) ? payload : [payload]).forEach((p) => rows.push({ id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, results: {}, ...p })); return resolve({ data: null, error: null }); }
        if (op === 'update') { hit.forEach((r) => Object.assign(r, payload)); return resolve({ data: single ? hit[0] || null : hit, error: null }); }
        return resolve({ data: single ? hit[0] || null : hit, error: null });
      }
    };
    return api;
  };
  return { tables, from };
}
const conn = (owner, platform, status = 'connected') => ({ owner_id: owner, platform, status, access_token_encrypted: 'x', refresh_token_encrypted: null, external_account_id: 'acct' });
const setup = (extra = {}) => {
  const db = memDb({ lo_social_connections: [conn(LO, 'facebook'), conn(LO, 'linkedin'), conn(LO, 'instagram'), conn(OTHER, 'facebook')] });
  const calls = [];
  const publish = async (channel, args) => { calls.push({ channel, args }); return { url: `https://x/${channel}` }; };
  const guard = createSpendGuard({ limits: { lo_social_posts_day: 6, lo_social_drafts_month: 30, lo_social_images_month: 2 } });
  const poster = createLoSocialPoster({ db, guard, publish, decrypt: (v) => v, encrypt: (v) => v, imageHostOk: (u) => u.startsWith('https://img.test/'), ...extra });
  return { db, calls, poster, guard };
};

test('a draft posts nothing until the LO approves, and the sweep ignores drafts', async () => {
  const { calls, poster } = setup();
  await poster.addDrafts(LO, ['Hello buyers'], { topic: 'buy' });
  await poster.sweep();
  assert.equal(calls.length, 0);
  assert.equal((await poster.list(LO))[0].status, 'draft');
});

test('approve posts to exactly the chosen accounts, once', async () => {
  const { calls, poster } = setup();
  const [draft] = await poster.addDrafts(LO, ['Hello buyers']);
  const posts = await poster.approve(LO, draft.id, { channels: ['facebook', 'linkedin'] });
  assert.deepEqual(calls.map((c) => c.channel).sort(), ['facebook', 'linkedin']);
  assert.equal(posts[0].status, 'published');
  await assert.rejects(() => poster.approve(LO, draft.id, { channels: ['facebook'] }), /already approved/);
  assert.equal(calls.length, 2);
});

test('a scheduled post waits for its time, then the sweep sends it', async () => {
  let clock = new Date('2026-01-01T10:00:00Z');
  const { calls, poster } = setup({ now: () => clock });
  const [draft] = await poster.addDrafts(LO, ['Later']);
  await poster.approve(LO, draft.id, { channels: ['facebook'], at: '2026-01-01T12:00:00Z' });
  await poster.sweep();
  assert.equal(calls.length, 0);
  clock = new Date('2026-01-01T12:05:00Z');
  await poster.sweep();
  assert.equal(calls.length, 1);
});

test('one LO cannot approve another LO\'s draft, and YouTube is not a text-post channel', async () => {
  const { poster } = setup();
  const [theirs] = await poster.addDrafts(OTHER, ['Theirs']);
  await assert.rejects(() => poster.approve(LO, theirs.id, { channels: ['facebook'] }), /not found/i);
  const [mine] = await poster.addDrafts(LO, ['Mine']);
  await assert.rejects(() => poster.approve(LO, mine.id, { channels: ['youtube'] }), /at least one/);
});

test('approving needs a connected account and Instagram needs a picture from our storage', async () => {
  const { poster, db } = setup();
  const [d] = await poster.addDrafts(LO, ['Hi']);
  await assert.rejects(() => poster.approve(LO, d.id, { channels: ['instagram'] }), /picture/);
  await assert.rejects(() => poster.approve(LO, d.id, { channels: ['instagram'], imageUrl: 'https://evil.test/a.png' }), /My pictures/);
  db.tables.lo_social_connections.find((c) => c.owner_id === LO && c.platform === 'linkedin').status = 'needs_reconnect';
  await assert.rejects(() => poster.approve(LO, d.id, { channels: ['linkedin'] }), /Connect linkedin/);
});

test('daily post cap stops extra posts without posting them, and a retry skips what already went out', async () => {
  const { poster, calls, guard } = setup();
  guard.limits.lo_social_posts_day = 1;
  const [d] = await poster.addDrafts(LO, ['Cap']);
  const posts = await poster.approve(LO, d.id, { channels: ['facebook', 'linkedin'] });
  assert.equal(posts[0].status, 'failed');
  assert.equal(calls.length, 1);
  assert.match(posts[0].results.linkedin.error, /limit/);
  guard.reset();
  const again = await poster.approve(LO, d.id, { channels: ['facebook', 'linkedin'] });
  assert.equal(again[0].status, 'published');
  assert.equal(calls.length, 2, 'facebook is not sent twice');
});

test('picture posts count against the monthly picture cap', async () => {
  const { poster } = setup();
  for (const n of [1, 2]) {
    const [d] = (await poster.addDrafts(LO, [`p${n}`])).filter((p) => p.text === `p${n}`);
    await poster.approve(LO, d.id, { channels: ['facebook'], imageUrl: `https://img.test/${n}.png` });
  }
  const [d3] = (await poster.addDrafts(LO, ['p3'])).filter((p) => p.text === 'p3');
  await assert.rejects(() => poster.approve(LO, d3.id, { channels: ['facebook'], imageUrl: 'https://img.test/3.png' }), /picture posts/);
});

test('an expired login marks the account needs_reconnect', async () => {
  const { poster, db } = setup({ publish: async () => { throw new ReconnectError('token expired'); } });
  const [d] = await poster.addDrafts(LO, ['Hi']);
  const posts = await poster.approve(LO, d.id, { channels: ['facebook'] });
  assert.equal(posts[0].status, 'failed');
  assert.equal(db.tables.lo_social_connections.find((c) => c.owner_id === LO && c.platform === 'facebook').status, 'needs_reconnect');
});
