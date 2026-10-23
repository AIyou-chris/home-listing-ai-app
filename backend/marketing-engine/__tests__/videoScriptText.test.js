'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spokenScript } = require('../services/videoScriptText');

test('drops filming directions and speaker labels, keeps the words', () => {
  const raw = "[Opening shot: Bold text on screen]  \nYOUR REFERRALS ARE DISAPPEARING.\n\n[Cut to a confident speaker]  \nVoiceover: You can take control.\n(Show HomeListingAI in action)";
  const out = spokenScript(raw);
  assert.ok(!out.includes('['));
  assert.ok(!/opening shot|cut to|show homelistingai/i.test(out));
  assert.match(out, /YOUR REFERRALS ARE DISAPPEARING/);
  assert.match(out, /You can take control/);
});

test('leaves a plain script alone', () => {
  assert.strictEqual(spokenScript('Send one WOW Link today.'), 'Send one WOW Link today.');
});
