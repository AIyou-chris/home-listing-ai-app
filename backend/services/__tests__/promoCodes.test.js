'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isFreeAccessCode } = require('../promoCodes');

test('no free-access codes exist unless the environment sets them', () => {
  assert.equal(isFreeAccessCode('LIFETIME', {}), false);
  assert.equal(isFreeAccessCode('FRIENDS30', {}), false);
  assert.equal(isFreeAccessCode('', {}), false);
  assert.equal(isFreeAccessCode(undefined, { FREE_ACCESS_PROMO_CODES: 'ABC' }), false);
});

test('codes from the environment work, ignoring case and spaces', () => {
  const env = { FREE_ACCESS_PROMO_CODES: ' friends-xyz , Comp2026 ' };
  assert.equal(isFreeAccessCode('FRIENDS-XYZ', env), true);
  assert.equal(isFreeAccessCode('comp2026', env), true);
  assert.equal(isFreeAccessCode('LIFETIME', env), false);
});
