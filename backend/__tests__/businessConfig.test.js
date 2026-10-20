const test = require('node:test');
const assert = require('node:assert');
const { validate, load, absolute, hostPattern, business } = require('../config/business');
const { checkPost } = require('../services/autopilot/safety');
const { TOPICS, LAUNCH, LO } = require('../services/autopilot/topics');
const { SLOTS } = require('../services/autopilot/engine');

test('the real settings file is valid and feeds the code', () => {
  assert.strictEqual(TOPICS.length, business.topics.length);
  assert.strictEqual(LAUNCH.length, 16);
  assert.ok(LAUNCH.every((l) => !l.idea.includes('{{RULES}}') && l.idea.includes(business.rules)));
  assert.ok(LAUNCH.every((l) => l.link.startsWith(business.siteUrl)));
  assert.strictEqual(LO, `${business.siteUrl}/for-loan-officers`);
  assert.deepStrictEqual(SLOTS, business.schedule.slots);
});

test('a settings file with a missing part is refused', () => {
  const copy = JSON.parse(JSON.stringify(business));
  delete copy.prices;
  assert.throws(() => validate(copy), /missing: prices/);
});

test('a topic that uses an unlisted fact is refused', () => {
  const copy = JSON.parse(JSON.stringify(business));
  copy.launch[0].facts = ['made-up'];
  assert.throws(() => validate(copy), /not listed/);
});

test('a duplicate topic key is refused', () => {
  const copy = JSON.parse(JSON.stringify(business));
  copy.topics[1].key = copy.topics[0].key;
  assert.throws(() => validate(copy), /used twice/);
});

test('another customer can use their own file: their site and prices drive the checks', () => {
  const other = JSON.parse(JSON.stringify(business));
  other.siteUrl = 'https://example-roofing.test';
  other.prices.allowed = ['$25'];
  assert.ok(hostPattern(other).test('https://example-roofing.test/pricing'));
  assert.ok(!hostPattern(other).test('https://homelistingai.com/x'));
  assert.strictEqual(absolute(other, '/a'), 'https://example-roofing.test/a');
});

test('prices from the file are the only money amounts a post may mention', () => {
  const body = 'Plain words about helping a loan officer start one agent relationship this week with a free page. ';
  const good = { title: 'Start', facebook: `${body}${body} Only $79 a month. ${business.siteUrl}/lo-signup`, linkedin: `${body}${body} Only $79 a month. ${business.siteUrl}/lo-signup`, instagram: `${body}`, videoScript: body };
  const bad = { ...good, facebook: `${body}${body} Only $19 a month. ${business.siteUrl}`, linkedin: `${body}${body}Visit https://other.test/x` };
  assert.ok(!checkPost(good).some((p) => p.includes('money amount')));
  assert.ok(checkPost(bad).some((p) => p.includes('money amount (')));
  assert.ok(checkPost(bad).some((p) => p.includes('links outside the site')));
});

test('load reads a file named by path', () => {
  const path = require('path');
  assert.strictEqual(load(path.join(__dirname, '../config/business.json')).name, business.name);
});
