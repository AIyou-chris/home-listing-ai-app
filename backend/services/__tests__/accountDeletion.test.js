'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { deleteAccountData, OWNED, LO_OWNED, BY_LISTING, BY_LEAD, BY_CONVERSATION } = require('../accountDeletion');

// A tiny fake of the supabase client that records what was asked, in order.
function fakeSupabase({ properties = [], leads = [], conversations = [], phoneLines = [], failOn = null, missing = [] } = {}) {
  const calls = [];
  const rowsFor = (table) => ({ properties, leads, ai_conversations: conversations, lo_phone_lines: phoneLines }[table] || []);
  const client = {
    calls,
    from(table) {
      const state = { table, op: null, payload: null };
      const builder = {
        select(cols) { state.op = 'select'; state.cols = cols; return builder; },
        delete() { state.op = 'delete'; return builder; },
        update(payload) { state.op = 'update'; state.payload = payload; return builder; },
        limit() { return builder; },
        in(col, values) {
          state.col = col; state.values = values;
          calls.push({ ...state });
          return builder;
        },
        then(resolve) {
          const last = calls[calls.length - 1] || {};
          if (missing.includes(state.table)) return resolve({ data: null, error: { code: '42P01', message: 'relation does not exist' } });
          if (failOn && failOn === state.table + '.' + state.col && state.op === 'delete') return resolve({ data: null, error: { code: '23503', message: 'fk violation' } });
          if (state.op === 'select') {
            const rows = rowsFor(state.table).filter((r) => (state.values || []).includes(r[state.col]));
            return resolve({ data: rows.map((r) => ({ ...r })), error: null });
          }
          return resolve({ data: null, error: null, count: 1 });
        },
      };
      return builder;
    },
  };
  return client;
}

const quiet = { info() {}, warn() {}, error() {} };

test('refuses to run with no ids (it must never become "delete everything")', async () => {
  await assert.rejects(() => deleteAccountData({ supabase: fakeSupabase(), ids: [], log: quiet }), /needs_ids/);
  await assert.rejects(() => deleteAccountData({ supabase: fakeSupabase(), ids: [null, '', undefined], log: quiet }), /needs_ids/);
});

test('children are removed before parents, and the account row goes last', async () => {
  const sb = fakeSupabase({
    properties: [{ id: 'P1', agent_id: 'A' }],
    leads: [{ id: 'L1', agent_id: 'A' }],
    conversations: [{ id: 'C1', user_id: 'A' }],
  });
  const r = await deleteAccountData({ supabase: sb, ids: ['A', 'AU'], log: quiet });
  assert.strictEqual(r.ok, true);
  const order = sb.calls.filter((c) => c.op === 'delete').map((c) => `${c.table}.${c.col}`);
  const idx = (k) => order.indexOf(k);
  assert.ok(idx('ai_conversation_messages.conversation_id') < idx('ai_conversations.id'));
  assert.ok(idx('lead_events.lead_id') < idx('leads.id'));
  assert.ok(idx('listing_events.listing_id') < idx('properties.id'));
  assert.ok(idx('properties.id') < idx('agents.id'));
  assert.ok(order.indexOf('agents.id') === order.length - 2 && order[order.length - 1] === 'agents.auth_user_id');
  assert.deepStrictEqual(r.counts, { listings: 1, leads: 1, conversations: 1 });
});

test('only ever deletes by the person own ids or ids of their own listings, leads and conversations', async () => {
  const sb = fakeSupabase({ properties: [{ id: 'P1', agent_id: 'A' }, { id: 'P-OTHER', agent_id: 'SOMEONE_ELSE' }], leads: [{ id: 'L1', agent_id: 'A' }] });
  await deleteAccountData({ supabase: sb, ids: ['A'], log: quiet });
  for (const c of sb.calls.filter((x) => x.op === 'delete' || x.op === 'update')) {
    for (const v of c.values) assert.ok(['A', 'P1', 'L1'].includes(v), `unexpected id ${v} in ${c.table}.${c.col}`);
  }
  assert.ok(!JSON.stringify(sb.calls).includes('P-OTHER'));
});

test('someone else data is unlinked, not deleted (a loan officer leaving does not delete an agent lead)', async () => {
  const sb = fakeSupabase();
  await deleteAccountData({ supabase: sb, ids: ['LO'], log: quiet });
  const upd = sb.calls.filter((c) => c.op === 'update').map((c) => `${c.table}.${c.col}`);
  assert.ok(upd.includes('leads.lo_agent_id'));
  assert.ok(upd.includes('agent_invites.claimed_agent_id'));
  assert.ok(!sb.calls.some((c) => c.op === 'delete' && c.table === 'leads' && c.col === 'lo_agent_id'));
});

test('a missing table or column is skipped; other problems are reported', async () => {
  const sb = fakeSupabase({ missing: ['contacts'], failOn: 'ai_cards.user_id' });
  const r = await deleteAccountData({ supabase: sb, ids: ['A'], log: quiet });
  assert.strictEqual(r.ok, true); // account row still deleted
  assert.ok(r.errors.some((e) => e.step === 'ai_cards.user_id'));
  assert.ok(!r.errors.some((e) => /contacts/.test(e.step)));
});

test('if the account row cannot be deleted the result says so (so the login is kept for a retry)', async () => {
  const sb = fakeSupabase({ failOn: 'agents.id' });
  const r = await deleteAccountData({ supabase: sb, ids: ['A'], log: quiet });
  assert.strictEqual(r.ok, false);
});

test('phone numbers are reported, never released', async () => {
  const sb = fakeSupabase({ phoneLines: [{ lo_agent_id: 'LO', phone_number: '+17542438686', status: 'active' }] });
  const r = await deleteAccountData({ supabase: sb, ids: ['LO'], log: quiet });
  assert.deepStrictEqual(r.phoneNumbers, ['+17542438686']);
});

test('lists have no table twice with the same column (typo guard) and cover the big ones', () => {
  const key = (l) => l.map(([t, c]) => `${t}.${c}`);
  for (const list of [OWNED, LO_OWNED, BY_LISTING, BY_LEAD, BY_CONVERSATION]) assert.strictEqual(new Set(key(list)).size, list.length);
  assert.ok(key(BY_CONVERSATION).includes('ai_conversation_messages.conversation_id'));
  assert.ok(key(LO_OWNED).includes('lo_phone_lines.lo_agent_id'));
  assert.ok(key(LO_OWNED).includes('lo_agent_invoices.lo_agent_id'));
  assert.ok(key(OWNED).includes('notifications.user_id'));
});
