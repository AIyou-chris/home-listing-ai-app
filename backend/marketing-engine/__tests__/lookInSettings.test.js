'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { validate, business } = require('../config/business');

test('the picture look comes from the settings file, not from the code', () => {
  const brand = require('../services/marketingImages/brand.cjs');
  const scene = require('../services/marketingImages/launchScene.cjs');
  assert.deepStrictEqual(brand.PALETTE, business.look.palette);
  assert.strictEqual(brand.DIRECTOR, business.look.director);
  assert.strictEqual(scene.LOOK, business.look.launchLook);
  assert.deepStrictEqual(scene.FALLBACK, business.look.fallbackScenes);
});

test('a settings file without a look, or with an empty one, is refused with a plain message', () => {
  const good = JSON.parse(JSON.stringify(business));
  assert.doesNotThrow(() => validate(good));
  const noLook = { ...good }; delete noLook.look;
  assert.throws(() => validate(noLook), /look/);
  assert.throws(() => validate({ ...good, look: { ...good.look, fallbackScenes: [] } }), /fallbackScenes/);
  assert.throws(() => validate({ ...good, look: { ...good.look, director: '' } }), /look\.director/);
});

test('picture code holds no business name: a copy only edits business.json', () => {
  const dir = path.join(__dirname, '..', 'services', 'marketingImages');
  const allowed = new Set(['direction.cjs']); // keeps the brand KEY ('homelistingai') as an internal id only
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.cjs') && !allowed.has(x))) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/HomeListingAI|loan officer|mortgage/i.test(text.replace(/homelistingai/g, 'brandkey').replace(/\/\/[^\n]*/g, '').replace(/\[[^\]]*'(?:blog|social|landing|paid_ad)'[^\]]*\]/g, '')), `${f} still has business words`);
  }
});

test('the video writer code holds no business words: scene wording, abilities and variety are in business.json', () => {
  for (const f of ['explainerScenes.js', 'explainerSceneWriter.js', 'explainerMemory.js', 'explainerWordsKey.js', 'autopilot/scenePick.js']) {
    const text = fs.readFileSync(path.join(__dirname, '..', 'services', f), 'utf8').replace(/\/\/[^\n]*/g, '');
    assert.ok(!/HomeListingAI|loan officer|mortgage|WOW Link|realtor|homelistingai/i.test(text), `${f} still has business words`);
  }
});
