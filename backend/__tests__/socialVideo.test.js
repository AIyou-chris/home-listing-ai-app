'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { postFacebook, postLinkedIn } = require('../marketing-engine/services/socialPublish');

const json = (body, ok = true, status = 200) => ({ ok, status, headers: { get: () => 'video/mp4' }, json: async () => body, arrayBuffer: async () => new ArrayBuffer(8) });

test('Facebook posts the video when one is ready', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => { calls.push(url); return json({ id: 'v1' }); };
  const out = await postFacebook({ connection: { external_account_id: 'p1', accessToken: 't' }, payload: { caption: 'hi', videoStatus: 'ready', videoUrl: 'https://x/v.mp4' }, imageUrl: 'https://x/i.jpg', env: { META_GRAPH_VERSION: 'v20.0' }, fetchImpl });
  assert.ok(calls[0].endsWith('/p1/videos'));
  assert.equal(out.url, 'https://www.facebook.com/v1');
});
test('Facebook falls back to the picture when the video is refused', async () => {
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return url.endsWith('/videos') ? json({ error: { message: 'bad video' } }, false, 400) : json({ post_id: 'ph1' }); };
  const out = await postFacebook({ connection: { external_account_id: 'p1', accessToken: 't' }, payload: { caption: 'hi', videoStatus: 'ready', videoUrl: 'https://x/v.mp4' }, imageUrl: 'https://x/i.jpg', env: { META_GRAPH_VERSION: 'v20.0' }, fetchImpl });
  assert.ok(calls[1].endsWith('/photos'));
  assert.equal(out.url, 'https://www.facebook.com/ph1');
});
test('Facebook without a video still posts the picture', async () => {
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return json({ post_id: 'ph2' }); };
  await postFacebook({ connection: { external_account_id: 'p1', accessToken: 't' }, payload: { caption: 'hi' }, imageUrl: 'https://x/i.jpg', env: { META_GRAPH_VERSION: 'v20.0' }, fetchImpl });
  assert.ok(calls[0].endsWith('/photos'));
});
test('LinkedIn posts a VIDEO share and falls back to the picture if the upload fails', async () => {
  let shared = null; let failVideo = false;
  const fetchImpl = async (url, opts = {}) => {
    if (url.includes('registerUpload')) {
      const recipe = JSON.parse(opts.body).registerUploadRequest.recipes[0];
      if (failVideo && recipe.includes('video')) return json({ message: 'no' }, false, 500);
      return json({ value: { asset: `urn:li:digitalmediaAsset:${recipe.includes('video') ? 'V' : 'I'}`, uploadMechanism: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: 'https://up/x' } } } });
    }
    if (url === 'https://up/x') return json({});
    if (url.includes('ugcPosts')) { shared = JSON.parse(opts.body).specificContent['com.linkedin.ugc.ShareContent']; return { ...json({ id: 'urn:li:share:1' }), headers: { get: () => '' } }; }
    return json({});
  };
  const args = { connection: { external_account_id: 'u1', accessToken: 't' }, payload: { caption: 'hi', videoStatus: 'ready', videoUrl: 'https://x/v.mp4' }, imageUrl: 'https://x/i.jpg', fetchImpl };
  await postLinkedIn(args);
  assert.equal(shared.shareMediaCategory, 'VIDEO');
  failVideo = true;
  await postLinkedIn(args);
  assert.equal(shared.shareMediaCategory, 'IMAGE');
});
