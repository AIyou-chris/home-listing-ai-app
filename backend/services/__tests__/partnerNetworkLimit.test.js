'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { canPublishUnderPartners } = require('../partnerNetworkLimit');

test('not a partner agent: the normal plan check decides', () => {
  assert.strictEqual(canPublishUnderPartners([]), null);
  assert.strictEqual(canPublishUnderPartners(undefined), null);
});

test('a partner agent can publish while the loan officer has room', () => {
  assert.deepStrictEqual(canPublishUnderPartners([{ limit: 20, used: 3 }]), { allowed: true });
  assert.deepStrictEqual(canPublishUnderPartners([{ limit: 5, used: 4 }]), { allowed: true });
});

test('blocked with a plain message when the loan officer is full', () => {
  const r = canPublishUnderPartners([{ limit: 5, used: 5 }]);
  assert.strictEqual(r.allowed, false);
  assert.match(r.message, /loan officer/i);
  assert.strictEqual(r.limit, 5);
});

test('with two loan officers, one with room is enough', () => {
  assert.strictEqual(canPublishUnderPartners([{ limit: 5, used: 5 }, { limit: 20, used: 1 }]).allowed, true);
  assert.strictEqual(canPublishUnderPartners([{ limit: 5, used: 5 }, { limit: 20, used: 20 }]).allowed, false);
});
