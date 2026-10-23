'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.MARKETING_TOKEN_ENCRYPTION_KEY = process.env.MARKETING_TOKEN_ENCRYPTION_KEY || 'a'.repeat(64);
const { createHouseSocialStore } = require('../services/houseSocialStore');

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// Small in-memory tables with eq filters, update/insert/delete/select.
function memDb() {
  const tables = { house_social_connections: [], house_social_oauth_states: [] };
  const from = (name) => {
    let op = 'select'; let payload; const filters = []; let single = false;
    const api = {
      select() { return api; }, insert(p) { op = 'insert'; payload = p; return api; }, update(p) { op = 'update'; payload = p; return api; }, delete() { op = 'delete'; return api; },
      eq(k, v) { filters.push((r) => r[k] === v); return api; }, lt() { return api; }, gt() { return api; }, maybeSingle() { single = true; return api; },
      then(resolve) {
        const rows = tables[name]; const hit = rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'insert') { rows.push({ ...payload }); return resolve({ data: null, error: null }); }
        if (op === 'update') { hit.forEach((r) => Object.assign(r, payload)); return resolve({ data: hit, error: null }); }
        if (op === 'delete') { hit.forEach((r) => rows.splice(rows.indexOf(r), 1)); return resolve({ data: single ? hit[0] || null : hit, error: null }); }
        return resolve({ data: single ? hit[0] || null : hit, error: null });
      }
    };
    return api;
  };
  return { tables, from };
}
const account = (label) => ({ accountLabel: label, externalAccountId: label, accessToken: `tok-${label}`, metadata: {} });

test('each customer has their own connection per platform, and removing one leaves the other', async () => {
  const db = memDb();
  const store = createHouseSocialStore({ supabaseAdmin: db });
  await store.saveConnection(A, 'linkedin', { account: account('A page'), tokens: {}, connectedBy: A });
  await store.saveConnection(B, 'linkedin', { account: account('B page'), tokens: {}, connectedBy: B });
  await store.saveConnection(A, 'linkedin', { account: account('A page again'), tokens: {}, connectedBy: A });
  assert.equal(db.tables.house_social_connections.length, 2, 'saving again updates, it does not add');
  assert.deepEqual((await store.list(A)).map((c) => c.account_label), ['A page again']);
  assert.deepEqual((await store.list(B)).map((c) => c.account_label), ['B page']);
  assert.deepEqual(await store.list(undefined), []);
  await store.remove(A, 'linkedin');
  assert.equal((await store.list(A)).length, 0);
  assert.equal((await store.list(B)).length, 1);
  await assert.rejects(store.saveConnection(undefined, 'linkedin', { account: account('x'), tokens: {} }), /needs an owner/);
});

test('the connect link remembers who started it, so the callback saves to the right customer', async () => {
  const db = memDb();
  const store = createHouseSocialStore({ supabaseAdmin: db });
  const state = await store.rememberState(B, 'facebook', 'verifier');
  assert.equal(db.tables.house_social_oauth_states[0].owner_id, B);
  const attempt = await store.claimState(state, 'facebook');
  assert.equal(attempt.owner_id, B);
});
