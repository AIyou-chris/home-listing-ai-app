'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPublicBookingLimiter, validatePublicBookingFields } = require('../publicBookingGuard');

test('one IP can book 5 times an hour, then is blocked', () => {
  let t = 0;
  const limiter = createPublicBookingLimiter({ now: () => t });
  for (let i = 0; i < 5; i += 1) {
    assert.equal(limiter.check({ ip: '1.1.1.1', listingId: 'L1', email: `a${i}@x.com` }).allowed, true);
  }
  assert.equal(limiter.check({ ip: '1.1.1.1', listingId: 'L1', email: 'new@x.com' }).allowed, false);
  t += 61 * 60 * 1000;
  assert.equal(limiter.check({ ip: '1.1.1.1', listingId: 'L1', email: 'later@x.com' }).allowed, true);
});

test('the same email address cannot be mailed more than twice a day from different IPs', () => {
  const limiter = createPublicBookingLimiter({ now: () => 0 });
  assert.equal(limiter.check({ ip: '1.1.1.1', listingId: 'L1', email: 'victim@x.com' }).allowed, true);
  assert.equal(limiter.check({ ip: '2.2.2.2', listingId: 'L1', email: 'Victim@x.com' }).allowed, true);
  assert.equal(limiter.check({ ip: '3.3.3.3', listingId: 'L1', email: 'victim@x.com' }).allowed, false);
});

test('a listing has a daily cap across all visitors', () => {
  const limiter = createPublicBookingLimiter({ now: () => 0, limits: { perIpPerHour: 100, perEmailPerDay: 100, perListingPerDay: 3 } });
  for (let i = 0; i < 3; i += 1) assert.equal(limiter.check({ ip: `9.9.9.${i}`, listingId: 'L1', email: null }).allowed, true);
  assert.equal(limiter.check({ ip: '9.9.9.9', listingId: 'L1', email: null }).allowed, false);
  assert.equal(limiter.check({ ip: '9.9.9.9', listingId: 'L2', email: null }).allowed, true);
});

test('a blocked request does not use up the other limits', () => {
  const limiter = createPublicBookingLimiter({ now: () => 0, limits: { perIpPerHour: 1, perEmailPerDay: 5, perListingPerDay: 5 } });
  assert.equal(limiter.check({ ip: '1.1.1.1', listingId: 'L1', email: 'a@x.com' }).allowed, true);
  assert.equal(limiter.check({ ip: '1.1.1.1', listingId: 'L1', email: 'b@x.com' }).allowed, false);
  assert.equal(limiter.check({ ip: '2.2.2.2', listingId: 'L1', email: 'b@x.com' }).allowed, true);
});

test('field checks reject oversized text and bad emails', () => {
  assert.equal(validatePublicBookingFields({ name: 'Maya', email: 'maya@example.com', notes: 'Friday?' }), null);
  assert.equal(validatePublicBookingFields({ name: 'x'.repeat(81) }), 'name_too_long');
  assert.equal(validatePublicBookingFields({ notes: 'x'.repeat(501) }), 'notes_too_long');
  assert.equal(validatePublicBookingFields({ email: 'not-an-email' }), 'invalid_email');
  assert.equal(validatePublicBookingFields({ email: 'a@b.com<script>' }), 'invalid_email');
  assert.equal(validatePublicBookingFields({}), null);
});
