'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { scrubVoice, findVoiceViolations } = require('../services/brandVoice');

test('removes banned words, extra exclamation marks, Attention openers and placeholders', () => {
  const raw = 'Attention loan officers! The WOW Link is a powerful game-changer. Ready to elevate your work! Unlock more!\n\nBest,\n[Your Name]';
  const out = scrubVoice(raw);
  assert.deepStrictEqual(findVoiceViolations(out), []);
  assert.ok(!out.includes('['));
  assert.match(out, /Best,\nChris/);
});

test('leaves clean text alone', () => {
  assert.strictEqual(scrubVoice('Send one WOW Link today.'), 'Send one WOW Link today.');
});

test('transform verbs keep their ending', () => {
  assert.strictEqual(scrubVoice('It transforms the page and transformed the lead.'), 'It changes the page and changed the lead.');
});

test('keeps a capital letter at the start of a swapped word', () => {
  assert.strictEqual(scrubVoice('Unlock Warm Leads with WOW Links'), 'Open up Warm Leads with WOW Links');
});
