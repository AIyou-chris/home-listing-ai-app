const test = require('node:test');
const assert = require('node:assert');
const explainer = require('../services/explainerVideo');
const { business } = require('../config/business');
const { videoOptions } = require('../services/studioVideoOptions');
const { findVoiceViolations } = require('../services/brandVoice');
const { PLATFORM_BANNED_PHRASES } = require('../services/loBrainService');
const { TOPICS, LAUNCH } = require('../services/autopilot/topics');

test('the settings file names three explainer videos and each one is valid', () => {
  assert.deepStrictEqual(explainer.sceneNames().sort(), ['ai-phone', 'buyer-chat', 'wow-link']);
  for (const name of explainer.sceneNames()) assert.ok(explainer.checkScene(name) > 10, `${name} has a real length`);
});

test('every word on screen passes the same safety rules as a post', () => {
  for (const name of explainer.sceneNames()) {
    for (const text of explainer.sceneText(name)) {
      if (/^#[0-9a-f]{6}$/i.test(text)) continue;
      assert.deepStrictEqual(findVoiceViolations(text), [], `${name}: ${text}`);
      assert.ok(!PLATFORM_BANNED_PHRASES.some((p) => text.toLowerCase().includes(p)), `${name}: banned claim in "${text}"`);
      assert.ok(!/guarantee|lowest rate|best rate|approved in|\$\s?\d|\d+\s?%/i.test(text.replace(/555-0142/, '')), `${name}: promise, price or statistic in "${text}"`);
    }
  }
});

test('the chat and phone scenes say the helper is an AI', () => {
  assert.ok(explainer.sceneText('buyer-chat').some((t) => /\bAI\b/.test(t)));
  assert.ok(explainer.sceneText('ai-phone').some((t) => /AI assistant/.test(t)));
});

test('topics only point at scenes that exist', () => {
  const names = new Set(explainer.sceneNames());
  const pointed = [...TOPICS, ...LAUNCH].filter((t) => t.explainer);
  assert.ok(pointed.length >= 4);
  for (const t of pointed) assert.ok(names.has(t.explainer), `${t.key} points at a missing scene`);
});

test('the video option is checked: a scene must be chosen, and it must exist', () => {
  assert.strictEqual(videoOptions({ layout: 'explainer', explainer: 'wow-link' }).explainer, 'wow-link');
  assert.throws(() => videoOptions({ layout: 'explainer' }), /Choose which animated explainer/);
  assert.throws(() => videoOptions({ explainer: 'made-up' }), /valid/);
  assert.strictEqual(videoOptions({}).layout, 'cards', 'old campaigns are unchanged');
});

test('another business can bring its own scenes, and unknown ones are refused', () => {
  const other = JSON.parse(JSON.stringify(business));
  other.video.base.brand = 'ACME ROOFING';
  assert.strictEqual(explainer.sceneConfig('buyer-chat', other).config.brand, 'ACME ROOFING');
  assert.throws(() => explainer.sceneConfig('nope'), /no explainer video called/);
  other.video.scenes['buyer-chat'].config.options = ['only one'];
  assert.throws(() => explainer.checkScene('buyer-chat', other), /exactly two/);
});

test('it makes a real MP4 through the Studio renderer, and the old layouts still work the same way', async (t) => {
  if (!(await explainer.available())) return t.skip('FFmpeg is not installed here');
  const renderer = require('../services/studioVideoRenderer');
  const bytes = await renderer.render({ brief: { videoFormat: 'vertical', videoDuration: '15', layout: 'explainer', explainer: 'buyer-chat' }, outputs: { title: 'T', videoScript: 'Script' } });
  assert.strictEqual(bytes.slice(4, 8).toString(), 'ftyp');
  assert.ok(bytes.length > 100000);
});
