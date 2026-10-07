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
