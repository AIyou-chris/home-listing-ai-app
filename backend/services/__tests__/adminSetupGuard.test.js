'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { checkAdminSetupToken } = require('../adminSetupGuard');

test('setup is off when no token is configured, even if the caller sends one', () => {
  assert.deepEqual(checkAdminSetupToken({ configuredToken: '', providedToken: '' }), { allowed: false, reason: 'setup_disabled' });
  assert.deepEqual(checkAdminSetupToken({ configuredToken: undefined, providedToken: 'anything' }), { allowed: false, reason: 'setup_disabled' });
});

test('a missing or wrong token is refused', () => {
  assert.equal(checkAdminSetupToken({ configuredToken: 's3cret', providedToken: undefined }).allowed, false);
  assert.equal(checkAdminSetupToken({ configuredToken: 's3cret', providedToken: '' }).allowed, false);
  assert.equal(checkAdminSetupToken({ configuredToken: 's3cret', providedToken: 'S3cret' }).reason, 'invalid_setup_token');
});

test('only the exact token is allowed', () => {
  assert.deepEqual(checkAdminSetupToken({ configuredToken: 's3cret', providedToken: 's3cret' }), { allowed: true });
});
