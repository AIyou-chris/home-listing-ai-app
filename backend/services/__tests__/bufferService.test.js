// backend/services/__tests__/bufferService.test.js
const test = require('node:test');
const assert = require('node:assert');
const { createBufferService, gqlString } = require('../bufferService');

// Minimal fetch stub: records the last request and returns a canned JSON body.
function stubFetch(body, { ok = true, status = 200 } = {}) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts, parsedBody: JSON.parse(opts.body) });
    return { ok, status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

test('gqlString safely escapes quotes and newlines into a GraphQL string literal', () => {
  assert.strictEqual(gqlString('hi'), '"hi"');
  assert.strictEqual(gqlString('a "b"\nc'), '"a \\"b\\"\\nc"');
  assert.strictEqual(gqlString(null), '""');
});

test('isConfigured reflects presence of a token', () => {
  assert.strictEqual(createBufferService({ token: '' }).isConfigured(), false);
  assert.strictEqual(createBufferService({ token: 'x' }).isConfigured(), true);
});

test('graphql sends Bearer auth to the Buffer endpoint and returns data', async () => {
  const fetch = stubFetch({ data: { account: { id: '1', email: 'a@b.com', organizations: [] } } });
  const svc = createBufferService({ token: 'tok', orgId: 'org', fetch });
  const account = await svc.getAccount();
  assert.strictEqual(account.email, 'a@b.com');
  const call = fetch.calls[0];
  assert.strictEqual(call.url, 'https://api.buffer.com');
  assert.strictEqual(call.opts.headers.Authorization, 'Bearer tok');
});

test('graphql throws when the API returns errors', async () => {
  const fetch = stubFetch({ errors: [{ message: 'nope' }] });
  const svc = createBufferService({ token: 'tok', orgId: 'org', fetch });
  await assert.rejects(() => svc.getAccount(), /nope/);
});

test('listChannels requires an org id', async () => {
  const svc = createBufferService({ token: 'tok', orgId: '', fetch: stubFetch({ data: {} }) });
  await assert.rejects(() => svc.listChannels(), /buffer_org_missing/);
});

test('listChannels returns the channels array', async () => {
  const fetch = stubFetch({ data: { channels: [{ id: 'c1', service: 'linkedin' }] } });
  const svc = createBufferService({ token: 'tok', orgId: 'org', fetch });
  const channels = await svc.listChannels();
  assert.strictEqual(channels[0].service, 'linkedin');
});

test('createPost requires a channel and text', async () => {
  const svc = createBufferService({ token: 'tok', fetch: stubFetch({ data: {} }) });
  await assert.rejects(() => svc.createPost({ text: 'hi' }), /buffer_channel_missing/);
  await assert.rejects(() => svc.createPost({ channelId: 'c1', text: '' }), /buffer_text_required/);
});

test('createPost uses addToQueue with no dueAt, sends empty assets, returns the post', async () => {
  const fetch = stubFetch({ data: { createPost: { __typename: 'PostActionSuccess', post: { id: 'p1', dueAt: null } } } });
  const svc = createBufferService({ token: 'tok', fetch });
  const post = await svc.createPost({ channelId: 'c1', text: 'hello world' });
  assert.strictEqual(post.id, 'p1');
  const sentQuery = fetch.calls[0].parsedBody.query;
  assert.match(sentQuery, /mode: addToQueue/);
  assert.match(sentQuery, /"hello world"/);
  assert.match(sentQuery, /assets: \[\]/); // required field, empty for text-only
  assert.doesNotMatch(sentQuery, /dueAt:/);
});

test('createPost attaches image assets when imageUrls are given', async () => {
  const fetch = stubFetch({ data: { createPost: { __typename: 'PostActionSuccess', post: { id: 'pi' } } } });
  const svc = createBufferService({ token: 'tok', fetch });
  await svc.createPost({ channelId: 'c1', text: 'pic', imageUrls: ['https://x.com/cat.png'] });
  const sentQuery = fetch.calls[0].parsedBody.query;
  assert.match(sentQuery, /assets: \[\{ image: \{ url: "https:\/\/x\.com\/cat\.png" \} \}\]/);
});

test('createPost adds facebook type metadata for facebook channels', async () => {
  const fetch = stubFetch({ data: { createPost: { __typename: 'PostActionSuccess', post: { id: 'pf' } } } });
  const svc = createBufferService({ token: 'tok', fetch });
  await svc.createPost({ channelId: 'c1', text: 'fb post', service: 'facebook' });
  assert.match(fetch.calls[0].parsedBody.query, /metadata: \{ facebook: \{ type: post \} \}/);
});

test('createPost adds instagram metadata and requires an image', async () => {
  const fetch = stubFetch({ data: { createPost: { __typename: 'PostActionSuccess', post: { id: 'pg' } } } });
  const svc = createBufferService({ token: 'tok', fetch });
  await assert.rejects(
    () => svc.createPost({ channelId: 'c1', text: 'ig post', service: 'instagram' }),
    /Instagram needs an image/
  );
  await svc.createPost({ channelId: 'c1', text: 'ig post', service: 'instagram', imageUrls: ['https://x.com/a.png'] });
  assert.match(fetch.calls[0].parsedBody.query, /metadata: \{ instagram: \{ type: post, shouldShareToFeed: true \} \}/);
});

test('createPost adds no metadata for linkedin', async () => {
  const fetch = stubFetch({ data: { createPost: { __typename: 'PostActionSuccess', post: { id: 'pl' } } } });
  const svc = createBufferService({ token: 'tok', fetch });
  await svc.createPost({ channelId: 'c1', text: 'li post', service: 'linkedin' });
  assert.doesNotMatch(fetch.calls[0].parsedBody.query, /metadata:/);
});

test('createPost honors an explicit shareNow mode', async () => {
  const fetch = stubFetch({ data: { createPost: { __typename: 'PostActionSuccess', post: { id: 'pn' } } } });
  const svc = createBufferService({ token: 'tok', fetch });
  await svc.createPost({ channelId: 'c1', text: 'now', mode: 'shareNow' });
  assert.match(fetch.calls[0].parsedBody.query, /mode: shareNow/);
});

test('createPost switches to customScheduled when dueAt is given', async () => {
  const fetch = stubFetch({ data: { createPost: { __typename: 'PostActionSuccess', post: { id: 'p2', dueAt: '2026-07-02T15:00:00.000Z' } } } });
  const svc = createBufferService({ token: 'tok', fetch });
  await svc.createPost({ channelId: 'c1', text: 'later', dueAt: '2026-07-02T15:00:00.000Z' });
  const sentQuery = fetch.calls[0].parsedBody.query;
  assert.match(sentQuery, /mode: customScheduled/);
  assert.match(sentQuery, /dueAt: "2026-07-02T15:00:00.000Z"/);
});

test('createPost surfaces a MutationError from Buffer', async () => {
  const fetch = stubFetch({ data: { createPost: { __typename: 'MutationError', message: 'channel disconnected' } } });
  const svc = createBufferService({ token: 'tok', fetch });
  await assert.rejects(() => svc.createPost({ channelId: 'c1', text: 'hi' }), /channel disconnected/);
});

test('defaultChannelId is used when channelId is omitted', async () => {
  const fetch = stubFetch({ data: { createPost: { __typename: 'PostActionSuccess', post: { id: 'p3' } } } });
  const svc = createBufferService({ token: 'tok', defaultChannelId: 'default-chan', fetch });
  await svc.createPost({ text: 'hi' });
  assert.match(fetch.calls[0].parsedBody.query, /channelId: "default-chan"/);
});
