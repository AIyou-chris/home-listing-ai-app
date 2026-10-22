const test = require('node:test');
const assert = require('node:assert');
const { normalizeEvent, summarize } = require('../routes/siteAnalyticsRoutes');

test('keeps the path only: no query, no hash, referrer cut to its host', () => {
  const r = normalizeEvent({ type: 'view', path: '/blog/x?email=a@b.com#top', vid: 'abc-123', ref: 'https://www.google.com/search?q=secret' }, 'Mozilla/5.0 (iPhone)');
  assert.equal(r.path, '/blog/x');
  assert.equal(r.referrer_host, 'google.com');
  assert.equal(r.device, 'phone');
});

test('rejects bots, bad types and non-paths', () => {
  assert.equal(normalizeEvent({ type: 'view', path: '/' }, 'Googlebot/2.1'), null);
  assert.equal(normalizeEvent({ type: 'hack', path: '/' }, 'Mozilla'), null);
  assert.equal(normalizeEvent({ type: 'view', path: 'http://evil' }, 'Mozilla'), null);
});

test('only clicks keep a label', () => {
  assert.equal(normalizeEvent({ type: 'view', path: '/', label: 'x' }, 'Mozilla').label, null);
  assert.equal(normalizeEvent({ type: 'click', path: '/', label: 'Start free' }, 'Mozilla').label, 'Start free');
});

test('summarize counts visitors, views, clicks and fills empty days', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  const rows = [
    { created_at: '2026-10-22T01:00:00Z', type: 'view', path: '/', visitor_id: 'a', device: 'phone' },
    { created_at: '2026-10-22T02:00:00Z', type: 'view', path: '/blog', visitor_id: 'a', device: 'phone', referrer_host: 'google.com' },
    { created_at: '2026-10-21T02:00:00Z', type: 'view', path: '/', visitor_id: 'b', device: 'computer' },
    { created_at: '2026-10-22T03:00:00Z', type: 'click', path: '/', label: 'Start free', visitor_id: 'a' }
  ];
  const s = summarize(rows, 3, now);
  assert.equal(s.visitors, 2); assert.equal(s.views, 3); assert.equal(s.clicks, 1);
  assert.equal(s.clickRate, 33.3);
  assert.deepEqual(s.daily.map((d) => d.views), [0, 1, 2]);
  assert.equal(s.topClicks[0].label, 'Start free');
  assert.equal(s.topReferrers[0].host, 'google.com');
});
