'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { pickScene } = require('../services/autopilot/scenePick');
const { validate, business } = require('../config/business');

const video = { scenes: { 'buyer-chat': {}, 'ai-phone': {}, 'wow-link': {} }, autoScene: { enabled: true, fallback: 'wow-link', rules: [{ pattern: 'phone|call', scene: 'ai-phone' }, { pattern: 'buyer|chat', scene: 'buyer-chat' }] } };

test('a topic that names a scene keeps it; otherwise its words pick one; otherwise the fallback', () => {
  assert.strictEqual(pickScene({ key: 'x', explainer: 'buyer-chat', idea: 'phone' }, video), 'buyer-chat');
  assert.strictEqual(pickScene({ key: 'x', idea: 'Answer every call after hours' }, video), 'ai-phone');
  assert.strictEqual(pickScene({ key: 'x', pillar: 'warm-leads', idea: 'A buyer asks a question' }, video), 'buyer-chat');
  assert.strictEqual(pickScene({ key: 'x', idea: 'Something else' }, video), 'wow-link');
});

test('with auto-scene off only named scenes are used, and a scene that does not exist is never returned', () => {
  assert.strictEqual(pickScene({ key: 'x', idea: 'call' }, { ...video, autoScene: { ...video.autoScene, enabled: false } }), null);
  assert.strictEqual(pickScene({ key: 'x', explainer: 'nope', idea: 'zzz' }, { ...video, autoScene: { enabled: false } }), null);
});

test('the settings file refuses an auto-scene that points at a scene that does not exist', () => {
  const good = JSON.parse(JSON.stringify(business));
  assert.doesNotThrow(() => validate(good));
  good.video.autoScene.fallback = 'nope';
  assert.throws(() => validate(good), /autoScene\.fallback/);
  const bad = JSON.parse(JSON.stringify(business)); bad.video.autoScene.rules.push({ pattern: 'x', scene: 'ghost' });
  assert.throws(() => validate(bad), /ghost/);
});
