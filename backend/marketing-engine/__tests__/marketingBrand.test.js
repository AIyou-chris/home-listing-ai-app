'use strict';
const test = require('node:test');
const assert = require('node:assert');
const brand = require('../services/marketingImages/brand.cjs');
const { checkPost } = require('../services/autopilot/safety');
const { LAUNCH } = require('../services/autopilot/topics');

test('playbook palette and models come from one place', () => {
  assert.equal(brand.PALETTE.red, '#ED1C24');
  assert.deepEqual(brand.imageModels({}), { draft: 'gpt-image-1-mini', final: 'gpt-image-1' });
  assert.equal(brand.imageModels({ IMAGE_MODEL_FINAL: 'x' }).final, 'x');
  assert.ok(brand.estimateCents('gpt-image-1', 'blog') > brand.estimateCents('gpt-image-1-mini', 'square'));
  assert.equal(brand.promptHash('a', 'b'), brand.promptHash('a', 'b'));
  assert.notEqual(brand.promptHash('a', 'b'), brand.promptHash('a', 'c'));
});
test('no launch headline says all Realtors are quitting', () => {
  for (const t of LAUNCH) assert.doesNotMatch(t.headline, /realtors are quitting/i);
});
test('safety blocks the mass-exit claim', () => {
  const bad = checkPost({ linkedin: 'Most Realtors are leaving the business and your referrals are gone. See what to do next with HomeListingAI for loan officers today.' }, { allowed: [] });
  assert.ok(JSON.stringify(bad).match(/all or most/));
});

test('when the account refuses the final picture model, the draft model makes the picture instead', async () => {
  const { generateImage, imageModels } = require('../services/marketingImages/brand.cjs');
  const { draft, final } = imageModels({});
  const calls = [];
  const refusing = { images: { async generate(p) { calls.push(p.model); if (p.model === final) { const e = new Error("400 The model 'x' does not exist."); e.status = 400; throw e; } return { data: [{ b64_json: 'ok' }] }; } } };
  const out = await generateImage(refusing, { model: final, prompt: 'p' }, {}, {});
  assert.deepStrictEqual(calls, [final, draft]);
  assert.strictEqual(out.data[0].b64_json, 'ok');
  const broken = { images: { async generate() { const e = new Error('500 server'); e.status = 500; throw e; } } };
  await assert.rejects(() => generateImage(broken, { model: final, prompt: 'p' }, {}, {}), /500/);
});
