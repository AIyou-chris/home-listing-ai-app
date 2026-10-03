'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { checkoutTrialDays } = require('../checkoutTrial');

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-10-10T12:00:00Z');

test('a brand-new signup gets the full 7 days', () => {
  assert.equal(checkoutTrialDays({ createdAt: new Date(now - 60 * 1000).toISOString(), now }), 7);
});

test('someone on day 3 only gets the days they have left', () => {
  assert.equal(checkoutTrialDays({ createdAt: new Date(now - 3 * DAY).toISOString(), now }), 4);
});

test('an expired trial gets no second free week', () => {
  assert.equal(checkoutTrialDays({ createdAt: new Date(now - 8 * DAY).toISOString(), now }), 0);
  assert.equal(checkoutTrialDays({ createdAt: new Date(now - 7 * DAY).toISOString(), now }), 0);
});

test('pay-now codes never get a trial', () => {
  assert.equal(checkoutTrialDays({ createdAt: new Date(now).toISOString(), now, payNow: true }), 0);
});

test('an unknown signup date falls back to the standard trial', () => {
  assert.equal(checkoutTrialDays({ createdAt: null, now }), 7);
});
