const test = require('node:test');
const assert = require('node:assert');
const { statCount, sumMailgunStats } = require('../services/mailgunStatTotals');

test('failed with nested objects stays a number', () => {
  const day = { accepted: { total: 5 }, delivered: { total: 4 }, failed: { temporary: { espblock: 1 }, permanent: { bounce: 1, total: 1 } } };
  const t = sumMailgunStats([day, day]);
  assert.strictEqual(t.failed, 4);
  assert.strictEqual(t.accepted, 10);
});

test('plain numbers and missing values', () => {
  assert.strictEqual(statCount(3), 3);
  assert.strictEqual(statCount(undefined), 0);
  assert.strictEqual(sumMailgunStats([{ opened: 2 }, {}]).opened, 2);
});
