'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAssignedLoId } = require('../loAssignmentGuard');

// Tiny fake of the supabase query builder over an in-memory assignments table.
const fakeSupabase = (rows) => ({
  from() {
    const filters = {};
    const q = {
      select() { return q; },
      eq(col, val) { filters[col] = val; return q; },
      limit() { return q; },
      then(resolve) {
        const data = rows.filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
        return Promise.resolve({ data }).then(resolve);
      }
    };
    return q;
  }
});

const rows = [{ listing_id: 'L1', lo_agent_id: 'LO-A', branding_enabled: true }];

test('valid listing/LO pair is accepted', async () => {
  assert.equal(await resolveAssignedLoId({ supabase: fakeSupabase(rows), listingId: 'L1', requestedLoId: 'LO-A' }), 'LO-A');
});

test('forged LO for a real listing is rejected', async () => {
  assert.equal(await resolveAssignedLoId({ supabase: fakeSupabase(rows), listingId: 'L1', requestedLoId: 'LO-EVIL' }), null);
});

test('no LO supplied resolves the assigned LO server-side', async () => {
  assert.equal(await resolveAssignedLoId({ supabase: fakeSupabase(rows), listingId: 'L1' }), 'LO-A');
});

test('unassigned listing returns null', async () => {
  assert.equal(await resolveAssignedLoId({ supabase: fakeSupabase(rows), listingId: 'L2' }), null);
});

test('branding disabled assignment is ignored', async () => {
  const off = [{ listing_id: 'L1', lo_agent_id: 'LO-A', branding_enabled: false }];
  assert.equal(await resolveAssignedLoId({ supabase: fakeSupabase(off), listingId: 'L1', requestedLoId: 'LO-A' }), null);
});
