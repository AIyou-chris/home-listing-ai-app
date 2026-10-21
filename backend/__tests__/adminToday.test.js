const test = require('node:test');
const assert = require('node:assert');
const { buildToday } = require('../services/adminToday');

// Tiny fake database: each table returns its rows, or an error when the table is listed in `broken`.
function fakeDb(tables, broken = []) {
  return {
    from(name) {
      let rows = null;
      const q = { select: () => q, eq: (k, v) => { rows = (rows || tables[name] || []).filter((r) => r[k] === undefined || r[k] === v); return q; }, gte: () => q, order: () => q, in: () => q, limit: () => q,
        then: (ok) => ok(broken.includes(name) ? { data: null, error: new Error('down') } : { data: rows || tables[name] || [], error: null }) };
      return q;
    }
  };
}
const now = Date.parse('2026-10-20T12:00:00Z');
const base = {
  admin_marketing_campaigns: [
    { id: 'c1', status: 'approved', outputs: { title: 'Open house tips' }, brief: {} },
    { id: 'c2', status: 'draft', outputs: { title: 'Rates' }, brief: {} }
  ],
  admin_marketing_posts: [
    { id: 'p1', campaign_id: 'c1', channel: 'linkedin', status: 'published', posted_at: '2026-10-19T10:00:00Z', url: 'https://x.test/1' },
    { id: 'p2', campaign_id: 'c1', channel: 'facebook', status: 'failed' },
    { id: 'p3', campaign_id: 'other-owner', owner_id: 'someone-else', channel: 'linkedin', status: 'published', posted_at: '2026-10-19T11:00:00Z' }
  ],
  house_social_connections: [{ platform: 'instagram', status: 'needs_reconnect', owner_id: 'me' }, { platform: 'youtube', status: 'needs_reconnect', owner_id: 'someone-else' }],
  cold_email_sends: [{ sent_at: '2026-10-18T00:00:00Z' }, { sent_at: '2026-10-18T00:00:00Z', replied_at: '2026-10-19T00:00:00Z', reply_class: 'positive' }]
};

test('sorts posts, drafts, failures and reconnects into the right boxes', async () => {
  const t = await buildToday({ db: fakeDb(base), owner: 'me', now });
  assert.strictEqual(t.wentOut.postCount, 1);            // other owner's post is not counted
  assert.strictEqual(t.wentOut.posts[0].channel, 'LinkedIn');
  assert.strictEqual(t.wentOut.emailsSent, 2);
  const kinds = t.needsMe.items.map((i) => i.kind).sort();
  assert.deepStrictEqual(kinds, ['approve', 'failed-post', 'reconnect', 'replies']);
  assert.strictEqual(t.needsMe.items.filter((i) => i.kind === 'reconnect').length, 1, 'only my own connections');
});

test('says not available instead of showing zero when a table cannot be read', async () => {
  const t = await buildToday({ db: fakeDb(base, ['admin_marketing_posts', 'cold_email_sends']), owner: 'me', now });
  assert.strictEqual(t.wentOut.available, false);
  assert.strictEqual(t.wentOut.emailsSent, null);
  assert.strictEqual(t.needsMe.available, false);
  assert.ok(t.notes.some((n) => n.startsWith('Posts')));
});

test('tells the owner when the video maker is not working, and stays quiet when it is', async () => {
  const bad = await buildToday({ db: fakeDb(base), owner: 'me', now, videoCheck: async () => ({ ok: false, error: 'FFmpeg is not installed on this server.' }) });
  assert.ok(bad.needsMe.items.some((i) => i.kind === 'video-maker' && /FFmpeg is not installed/.test(i.text)));
  const good = await buildToday({ db: fakeDb(base), owner: 'me', now, videoCheck: async () => ({ ok: true }) });
  assert.ok(!good.needsMe.items.some((i) => i.kind === 'video-maker'));
  const broken = await buildToday({ db: fakeDb(base), owner: 'me', now, videoCheck: async () => { throw new Error('x'); } });
  assert.ok(!broken.needsMe.items.some((i) => i.kind === 'video-maker'), 'a failed check does not invent a problem');
});
