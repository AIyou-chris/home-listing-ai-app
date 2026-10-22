const test = require('node:test');
const assert = require('node:assert');
const { createSpendGuard, spendToday } = require('../spendGuard');

test('spendToday shows what was used against each daily stop', () => {
  const g = createSpendGuard();
  g.openai('/v1/chat/completions');
  g.openai('/v1/images/generations');
  g.emailSend();
  const rows = Object.fromEntries(spendToday(g).map((r) => [r.key, r]));
  assert.equal(rows.ai.used, 21);
  assert.equal(rows.pictures.used, 1);
  assert.equal(rows.email.used, 1);
  assert.equal(rows.sms.used, 0);
  assert.ok(rows.sms.limit > 0);
});
