'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanGroup, buildPostPrompt, createFbGroupWriter } = require('../fbGroupService');

test('a group needs a name and a real Facebook group link', () => {
  assert.ok(cleanGroup({ name: '' }).error);
  assert.ok(cleanGroup({ name: 'x', facebookUrl: 'https://example.com/groups/1' }).error);
  assert.equal(cleanGroup({ name: 'Loan Officers', facebookUrl: 'https://facebook.com/groups/lo' }).value.name, 'Loan Officers');
});

test('"not checked" stays unknown, never turns into yes or no', () => {
  assert.equal(cleanGroup({ name: 'x', linksAllowed: '' }).value.links_allowed, null);
  assert.equal(cleanGroup({ name: 'x', linksAllowed: 'yes' }).value.links_allowed, true);
  assert.equal(cleanGroup({ name: 'x', linksAllowed: 'no' }).value.links_allowed, false);
});

test('the prompt bans links unless the group says they are allowed', () => {
  assert.match(buildPostPrompt({ group: { name: 'g', links_allowed: null, promotion_days: [] }, link: 'https://x.com' }), /Treat links as banned/);
  assert.match(buildPostPrompt({ group: { name: 'g', links_allowed: false, promotion_days: [] }, link: 'https://x.com' }), /BANS links/);
  assert.match(buildPostPrompt({ group: { name: 'g', links_allowed: true, promotion_days: [] }, link: 'https://x.com' }), /Links are allowed/);
});

test('links are stripped from every version when links are not allowed', async () => {
  const fake = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({
    valueFirst: 'Try this tip. See https://homelistingai.com/for-loan-officers today', noLink: 'Just a tip', promotional: 'Visit homelistingai.com now' }) } }] }) });
  const w = createFbGroupWriter({ openaiApiKey: 'k', fetchImpl: fake });
  const out = await w.write({ group: { name: 'g', links_allowed: null, promotion_days: [] }, link: 'x' });
  for (const v of Object.values(out)) assert.doesNotMatch(v.text, /https?:|\.com/);
  const allowed = await w.write({ group: { name: 'g', links_allowed: true, promotion_days: [] }, link: 'x' });
  assert.match(allowed.valueFirst.text, /https:\/\/homelistingai\.com/);
});

test('banned brand-voice words are flagged', async () => {
  const fake = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ valueFirst: 'Unlock the power of leads', noLink: 'ok', promotional: 'ok' }) } }] }) });
  const out = await createFbGroupWriter({ openaiApiKey: 'k', fetchImpl: fake }).write({ group: { name: 'g', links_allowed: true, promotion_days: [] } });
  assert.ok(out.valueFirst.voiceIssues.length > 0);
});
