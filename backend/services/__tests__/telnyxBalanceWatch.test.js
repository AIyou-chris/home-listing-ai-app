const test = require('node:test');
const assert = require('node:assert/strict');
const { createTelnyxBalanceWatch } = require('../telnyxBalanceWatch');

const fetchWith = (balance) => async () => ({ ok: true, json: async () => ({ data: { balance: String(balance) } }) });

test('a healthy balance sends nothing', async () => {
  const sent = [];
  const check = createTelnyxBalanceWatch({ fetchImpl: fetchWith(80), apiKey: 'k', threshold: 20, sendEmail: async (m) => sent.push(m) });
  assert.deepEqual(await check(), { ok: true, balance: 80 });
  assert.equal(sent.length, 0);
});
test('a low balance emails the owner once a day', async () => {
  const sent = [];
  const check = createTelnyxBalanceWatch({ fetchImpl: fetchWith(7.5), apiKey: 'k', threshold: 20, sendEmail: async (m) => sent.push(m), ownerEmail: 'o@x.com' });
  assert.equal((await check()).alerted, true);
  assert.equal((await check()).alerted, false);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /\$7\.50/);
});
test('no key or a Telnyx error never throws', async () => {
  assert.deepEqual(await createTelnyxBalanceWatch({ apiKey: '' })(), { skipped: 'not_configured' });
  const bad = createTelnyxBalanceWatch({ fetchImpl: async () => ({ ok: false, status: 401 }), apiKey: 'k' });
  assert.deepEqual(await bad(), { skipped: 'telnyx_401' });
});
