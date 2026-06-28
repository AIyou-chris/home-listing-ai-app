// backend/services/__tests__/listingAlertService.test.js
const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeAlertPhone,
  isStopKeyword,
  formatPrice,
  detectPriceDrop,
  buildPriceDropMessage,
} = require('../listingAlertService');

test('normalizeAlertPhone formats 10-digit US numbers to E.164', () => {
  assert.strictEqual(normalizeAlertPhone('(555) 123-4567'), '+15551234567');
  assert.strictEqual(normalizeAlertPhone('5551234567'), '+15551234567');
  assert.strictEqual(normalizeAlertPhone('15551234567'), '+15551234567');
});

test('normalizeAlertPhone returns null for junk', () => {
  assert.strictEqual(normalizeAlertPhone(''), null);
  assert.strictEqual(normalizeAlertPhone('123'), null);
  assert.strictEqual(normalizeAlertPhone(null), null);
});

test('isStopKeyword matches STOP variants case-insensitively', () => {
  ['STOP', 'stop', ' Unsubscribe ', 'CANCEL', 'quit', 'END'].forEach((w) =>
    assert.strictEqual(isStopKeyword(w), true, w));
  assert.strictEqual(isStopKeyword('hello'), false);
  assert.strictEqual(isStopKeyword(''), false);
});

test('formatPrice renders USD with commas, no cents', () => {
  assert.strictEqual(formatPrice(625000), '$625,000');
  assert.strictEqual(formatPrice('625000'), '$625,000');
});

test('detectPriceDrop is true only when new < old (both valid numbers)', () => {
  assert.strictEqual(detectPriceDrop(700000, 625000), true);
  assert.strictEqual(detectPriceDrop(625000, 700000), false);
  assert.strictEqual(detectPriceDrop(625000, 625000), false);
  assert.strictEqual(detectPriceDrop(null, 625000), false);
  assert.strictEqual(detectPriceDrop(700000, 0), false);
});

test('buildPriceDropMessage includes address and both prices, ends with STOP notice', () => {
  const msg = buildPriceDropMessage({ address: '123 Main St', oldPrice: 700000, newPrice: 625000 });
  assert.match(msg, /123 Main St/);
  assert.match(msg, /\$625,000/);
  assert.match(msg, /STOP/i);
});
