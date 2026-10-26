'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReelScript, splitCues, cueTimings, slideDurations, wrapLines } = require('../listingReelService');
const { findVoiceViolations } = require('../brandVoice');

const listing = { address: '12 Oak Lane', bedrooms: 3, bathrooms: 2, price: 450000 };

test('script uses only real facts and passes the brand voice check', () => {
  const s = buildReelScript({ listing });
  assert.match(s, /12 Oak Lane/);
  assert.match(s, /3 bedrooms, 2 baths/);
  assert.match(s, /\$450,000/);
  assert.deepEqual(findVoiceViolations(s), []);
  assert.doesNotMatch(s, /rate|approved|guarantee|%/i);
});

test('script leaves out facts it does not have', () => {
  const s = buildReelScript({ listing: { address: '', bedrooms: 0, bathrooms: 0, price: 0 } });
  assert.doesNotMatch(s, /bedroom|\$|Listed at/);
  assert.match(s, /Take a look at this home/);
});

test('cue timings cover the voice with no gaps and no overlap', () => {
  const cues = splitCues(buildReelScript({ listing }));
  const t = cueTimings(cues, 18);
  assert.equal(t.length, cues.length);
  for (let i = 1; i < t.length; i++) assert.ok(Math.abs(t[i].start - t[i - 1].end) < 1e-9);
  assert.ok(t[0].start >= 0 && t.at(-1).end <= 18);
});

test('slide durations line up with the voice plus the end card', () => {
  const { photoDur, total } = slideDurations(18, 3);
  assert.ok(total >= 18 + 2);
  assert.ok(photoDur >= 2);
});

test('wrapLines never drops text', () => {
  const text = 'Supercalifragilisticexpialidocious house with a very long word';
  assert.equal(wrapLines(text, 10).join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
});

// ---- the AI writes the spoken script, held to the home's own facts ----
const { writeReelScript } = require('../listingReelService');
const GOOD = 'Stop scrolling. This 3 bedroom, 2 bath home at 12 Oak Lane is listed at $450,000. Tap the link to see every photo and ask the AI anything about this home.';
const ai = (...scripts) => { let i = 0; return { calls: () => i, chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify({ script: scripts[Math.min(i++, scripts.length - 1)] }) } }] }) } } }; };

test('an AI script that uses only the home\'s facts is used', async () => {
  assert.equal(await writeReelScript({ listing, openai: ai(GOOD) }), GOOD);
});

test('invented numbers, neighborhood, schools, rates, who the home is for, or no call to tap the link are all refused', async () => {
  const bad = [
    GOOD.replace('3 bedroom', '4 bedroom'),
    GOOD.replace('$450,000', '$399,000'),
    `${GOOD} Great schools nearby.`,
    `${GOOD} Rates are low today.`,
    `${GOOD} Perfect for a growing family.`,
    'Stop scrolling. This 3 bedroom, 2 bath home at 12 Oak Lane is listed at $450,000. Come and see it soon, it will not last, you will love it.',
    'Too short.'
  ];
  for (const script of bad) assert.equal(await writeReelScript({ listing, openai: ai(script), tries: 1 }), null, script);
});

test('it tries twice, and with no AI or an AI that fails the built-in script is used instead', async () => {
  const twice = ai(`${GOOD} Great schools nearby.`, GOOD);
  assert.equal(await writeReelScript({ listing, openai: twice }), GOOD);
  assert.equal(twice.calls(), 2);
  assert.equal(await writeReelScript({ listing, openai: null }), null);
  assert.equal(await writeReelScript({ listing: {}, openai: ai(GOOD) }), null);
  assert.equal(await writeReelScript({ listing, openai: { chat: { completions: { create: async () => { throw new Error('down'); } } } } }), null);
});
