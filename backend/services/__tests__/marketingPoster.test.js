'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMarketingPoster, tagLinks, PostError } = require('../marketingPoster');
const { ReconnectError } = require('../socialPublish');

// A tiny in-memory stand-in for the tables the poster touches.
function fakeDb(seed) {
  const tables = { admin_marketing_campaigns: [], admin_marketing_posts: [], house_social_connections: [], admin_marketing_media: [], ...seed };
  const builder = (name) => {
    let rows = tables[name]; let op = 'select'; let patch = null; const filters = []; let single = false; let limit = Infinity; let order = null;
    const match = (r) => filters.every((f) => f(r));
    const api = {
      select() { return api; },
      eq(k, v) { filters.push((r) => r[k] === v); return api; },
      in(k, vs) { filters.push((r) => vs.includes(r[k])); return api; },
      lte(k, v) { filters.push((r) => new Date(r[k]) <= new Date(v)); return api; },
      order(k) { order = k; return api; },
      limit(n) { limit = n; return api; },
      update(p) { op = 'update'; patch = p; return api; },
      delete() { op = 'delete'; return api; },
      upsert(p) { op = 'upsert'; patch = p; return api; },
      maybeSingle() { single = true; return api; },
      then(resolve) {
        let out;
        if (op === 'select') {
          let found = rows.filter(match); if (order) found = [...found].sort((a, b) => String(a[order]).localeCompare(String(b[order])));
          found = found.slice(0, limit); out = { data: single ? found[0] || null : found, error: null };
        } else if (op === 'update') {
          const hit = rows.filter(match); hit.forEach((r) => Object.assign(r, patch)); out = { data: single ? hit[0] || null : hit, error: null };
        } else if (op === 'delete') { tables[name] = rows = rows.filter((r) => !match(r)); out = { data: null, error: null };
        } else {
          for (const p of [].concat(patch)) {
            const i = rows.findIndex((r) => r.campaign_id === p.campaign_id && r.channel === p.channel);
            if (i >= 0) Object.assign(rows[i], p); else rows.push({ id: `p${rows.length + 1}`, ...p });
          }
          out = { data: null, error: null };
        }
        return Promise.resolve(out).then(resolve);
      }
    };
    return api;
  };
  return { tables, from: builder, storage: { from: () => ({ createSignedUrl: async (path) => ({ data: { signedUrl: `https://signed/${path}` } }) }) } };
}

const NOW = new Date('2026-10-10T12:00:00Z');
const campaign = (over = {}) => ({ id: 'c1c1c1c1-0000-0000-0000-000000000000', status: 'approved', brief: {}, outputs: { title: 'T', linkedin: 'Read https://homelistingai.com/blog/x.', facebook: 'FB text', instagram: 'IG text' }, ...over });
const conn = (platform, over = {}) => ({ platform, status: 'connected', access_token_encrypted: 'enc', refresh_token_encrypted: null, ...over });
const make = (seed, publish) => {
  const db = fakeDb(seed);
  return { db, poster: createMarketingPoster({ db, publish, now: () => NOW, decrypt: (v) => `dec-${v}`, encrypt: (v) => `enc-${v}` }) };
};

test('links to our site get tracking tags, other links do not, and punctuation survives', () => {
  const out = tagLinks('See https://homelistingai.com/blog/x. And https://example.com/a and https://homelistingai.com/l/a?b=1.', { source: 'linkedin', campaign: 'c1c1c1c1' });
  assert.match(out, /blog\/x\?utm_source=linkedin&utm_medium=social&utm_campaign=c1c1c1c1\. And/);
  assert.match(out, /example\.com\/a and/);
  assert.match(out, /l\/a\?b=1&utm_source=linkedin/);
  assert.equal(tagLinks('https://homelistingai.com/x?utm_source=mine', { source: 'a', campaign: 'b' }), 'https://homelistingai.com/x?utm_source=mine');
});

test('only an approved campaign can be scheduled', async () => {
  const { poster } = make({ admin_marketing_campaigns: [campaign({ status: 'draft' })], house_social_connections: [conn('linkedin')] });
  await assert.rejects(poster.schedule({ campaignId: campaign().id, channels: ['linkedin'] }), /Approve the campaign first/);
});

test('an account that is not connected is refused and named', async () => {
  const { poster } = make({ admin_marketing_campaigns: [campaign()] });
  await assert.rejects(poster.schedule({ campaignId: campaign().id, channels: ['linkedin'] }), (e) => e instanceof PostError && e.needsConnection === 'linkedin');
});

test('post now sends the tagged text, marks it published and keeps the link', async () => {
  let seen;
  const { db, poster } = make({ admin_marketing_campaigns: [campaign()], house_social_connections: [conn('linkedin')] }, async (channel, args) => { seen = { channel, args }; return { url: 'https://li/post/1' }; });
  await poster.schedule({ campaignId: campaign().id, channels: ['linkedin'] });
  const posts = await poster.postNow(campaign().id, 'linkedin');
  assert.equal(seen.channel, 'linkedin');
  assert.match(seen.args.payload.caption, /utm_source=linkedin/);
  assert.equal(seen.args.connection.accessToken, 'dec-enc');
  assert.equal(posts[0].status, 'published');
  assert.equal(posts[0].url, 'https://li/post/1');
  await assert.rejects(poster.run(db.tables.admin_marketing_posts[0].id), /already been posted/);
});

test('a failed post waits for a person and says why', async () => {
  const { poster } = make({ admin_marketing_campaigns: [campaign()], house_social_connections: [conn('facebook')] }, async () => { throw new Error('Page is restricted'); });
  await poster.schedule({ campaignId: campaign().id, channels: ['facebook'] });
  const posts = await poster.postNow(campaign().id, 'facebook');
  assert.equal(posts[0].status, 'failed');
  assert.match(posts[0].error, /Page is restricted/);
  const swept = await poster.sweep();
  assert.equal(swept.due, 0); // never retried by itself
});

test('a rejected token marks the account for reconnecting', async () => {
  const { db, poster } = make({ admin_marketing_campaigns: [campaign()], house_social_connections: [conn('linkedin')] }, async () => { throw new ReconnectError('bad token'); });
  await poster.schedule({ campaignId: campaign().id, channels: ['linkedin'] });
  const posts = await poster.postNow(campaign().id, 'linkedin');
  assert.match(posts[0].error, /reconnected/);
  assert.equal(db.tables.house_social_connections[0].status, 'needs_reconnect');
});

test('the sweep posts only what is due and approval can be pulled back', async () => {
  const calls = [];
  const { db, poster } = make({ admin_marketing_campaigns: [campaign()], house_social_connections: [conn('linkedin'), conn('facebook')] }, async (channel) => { calls.push(channel); return { url: 'u' }; });
  await poster.schedule({ campaignId: campaign().id, channels: ['linkedin'], at: '2026-10-10T11:00:00Z' });
  await poster.schedule({ campaignId: campaign().id, channels: ['facebook'], at: '2026-10-20T11:00:00Z' });
  assert.equal((await poster.sweep()).posted, 1);
  assert.deepEqual(calls, ['linkedin']);
  db.tables.admin_marketing_campaigns[0].status = 'draft';
  db.tables.admin_marketing_posts.find((p) => p.channel === 'facebook').scheduled_for = '2026-10-10T11:30:00Z';
  await poster.sweep();
  assert.deepEqual(calls, ['linkedin']); // approval removed, so nothing went out
  assert.match(db.tables.admin_marketing_posts.find((p) => p.channel === 'facebook').error, /no longer approved/);
});

test('YouTube gets the video, Instagram prefers the video, and the picture goes to Facebook', async () => {
  const seen = {};
  const media = [{ campaign_id: campaign().id, kind: 'image', path: 'a.png', status: 'ready' }, { campaign_id: campaign().id, kind: 'video', path: 'b.mp4', status: 'ready' }];
  const { poster } = make({ admin_marketing_campaigns: [campaign()], admin_marketing_media: media, house_social_connections: [conn('youtube'), conn('instagram'), conn('facebook')] }, async (channel, args) => { seen[channel] = args; return { url: 'u' }; });
  await poster.schedule({ campaignId: campaign().id, channels: ['youtube', 'instagram', 'facebook'] });
  for (const c of ['youtube', 'instagram', 'facebook']) await poster.postNow(campaign().id, c);
  assert.equal(seen.youtube.payload.videoUrl, 'https://signed/b.mp4');
  assert.equal(seen.instagram.payload.videoUrl, 'https://signed/b.mp4');
  assert.equal(seen.facebook.imageUrl, 'https://signed/a.png');
});

test('LinkedIn pictures: ask for an address, send the picture, attach it to the post', async () => {
  const { postLinkedIn } = require('../socialPublish');
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', body: opts.body });
    if (String(url) === 'https://img/pic.png') return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
    if (String(url).includes('registerUpload')) return { ok: true, headers: { get: () => null }, json: async () => ({ value: { asset: 'urn:li:digitalmediaAsset:A1', uploadMechanism: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: 'https://upload.li/put' } } } }) };
    if (String(url) === 'https://upload.li/put') return { ok: true, headers: { get: () => null }, json: async () => ({}) };
    return { ok: true, headers: { get: () => 'urn:li:share:9' }, json: async () => ({ id: 'urn:li:share:9' }) };
  };
  const out = await postLinkedIn({ connection: { accessToken: 't', external_account_id: 'abc' }, payload: { caption: 'Hello' }, imageUrl: 'https://img/pic.png', fetchImpl });
  assert.match(out.url, /urn:li:share:9/);
  assert.deepEqual(calls.map((c) => c.method), ['GET', 'POST', 'PUT', 'POST']);
  const share = JSON.parse(calls[3].body).specificContent['com.linkedin.ugc.ShareContent'];
  assert.equal(share.shareMediaCategory, 'IMAGE');
  assert.equal(share.media[0].media, 'urn:li:digitalmediaAsset:A1');
  // no picture: a plain text post, as before
  calls.length = 0;
  await postLinkedIn({ connection: { accessToken: 't', external_account_id: 'abc' }, payload: { caption: 'Hello' }, imageUrl: '', fetchImpl });
  assert.equal(JSON.parse(calls[0].body).specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory, 'NONE');
});
