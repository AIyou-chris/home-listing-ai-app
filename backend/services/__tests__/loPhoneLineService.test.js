'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoPhoneLineService, phoneLineConfig, isEnabledFor, cleanAreaCode, normalizePhone } = require('../loPhoneLineService');
const { createMockTelnyxClient } = require('../telnyxClient');

// Tiny in-memory stand-in for the lo_phone_lines table, including the
// "one live line per LO" unique index.
function fakeSupabase() {
  const rows = [];
  let id = 0;
  const LIVE = ['searching', 'ordering', 'configuring', 'active', 'failed'];
  function query() {
    const filters = [];
    let op = 'select';
    let payload = null;
    const q = {
      select() { return q; },
      eq(col, val) { filters.push((r) => r[col] === val); return q; },
      in(col, vals) { filters.push((r) => vals.includes(r[col])); return q; },
      insert(row) { op = 'insert'; payload = row; return q; },
      update(patch) { op = 'update'; payload = patch; return q; },
      async maybeSingle() {
        if (op === 'insert') {
          if (rows.some((r) => r.lo_agent_id === payload.lo_agent_id && LIVE.includes(r.status))) {
            return { data: null, error: { code: '23505' } };
          }
          const row = { id: `line-${++id}`, ...payload };
          rows.push(row);
          return { data: row, error: null };
        }
        const hits = rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'update') {
          hits.forEach((r) => Object.assign(r, payload));
          return { data: hits[0] || null, error: null };
        }
        return { data: hits[0] || null, error: null };
      },
    };
    return q;
  }
  return { from: () => query(), rows };
}

function countingMock() {
  const mock = createMockTelnyxClient();
  let orders = 0;
  return {
    ...mock,
    get orders() { return orders; },
    async orderNumber(args) { orders += 1; return mock.orderNumber(args); },
  };
}

test('config: mock unless live flag AND key; beta list gates visibility', () => {
  assert.equal(phoneLineConfig({}).mock, true);
  assert.equal(phoneLineConfig({ TELNYX_LIVE_PROVISIONING: 'true' }).mock, true);
  assert.equal(phoneLineConfig({ TELNYX_LIVE_PROVISIONING: 'true', TELNYX_API_KEY: 'k' }).mock, false);
  assert.equal(isEnabledFor('lo1', {}), false);
  assert.equal(isEnabledFor('lo1', { PHONE_BETA_LO_IDS: 'lo2, lo1' }), true);
  assert.equal(isEnabledFor('lo9', { TELNYX_PHONE_ENABLED: 'on' }), true);
});

test('area codes and phone numbers are cleaned', () => {
  assert.equal(cleanAreaCode('(509)'), '509');
  assert.equal(cleanAreaCode('109'), '');
  assert.equal(cleanAreaCode('50'), '');
  assert.equal(normalizePhone('509-555-0100'), '+15095550100');
  assert.equal(normalizePhone('+1 (509) 555-0100'), '+15095550100');
});

test('preview holds a real-priced number and buys nothing', async () => {
  const telnyx = countingMock();
  const svc = createLoPhoneLineService({ supabase: fakeSupabase(), telnyx });
  const r = await svc.previewNumber('lo1', '509');
  assert.equal(r.ok, true);
  assert.equal(r.line.reserved_number, '+15095550100');
  assert.equal(r.line.reserved_monthly_cost, '1.00');
  assert.equal(telnyx.orders, 0);
});

test('bad area code is refused before touching Telnyx', async () => {
  const svc = createLoPhoneLineService({ supabase: fakeSupabase(), telnyx: countingMock() });
  const r = await svc.previewNumber('lo1', '12');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'bad_area_code');
});

test('buy orders exactly once, even when clicked twice', async () => {
  const telnyx = countingMock();
  const svc = createLoPhoneLineService({ supabase: fakeSupabase(), telnyx });
  await svc.previewNumber('lo1', '509');
  const [a, b] = await Promise.all([svc.buyNumber('lo1'), svc.buyNumber('lo1')]);
  assert.ok(a.ok || b.ok);
  const again = await svc.buyNumber('lo1');
  assert.equal(again.ok, true);
  assert.equal(again.line.status, 'active');
  assert.equal(again.line.phone_number, '+15095550100');
  assert.ok(telnyx.orders <= 1, `ordered ${telnyx.orders} times`);
});

test('an LO who owns a number is never offered a second one', async () => {
  const telnyx = countingMock();
  const svc = createLoPhoneLineService({ supabase: fakeSupabase(), telnyx });
  await svc.previewNumber('lo1', '509');
  await svc.buyNumber('lo1');
  const r = await svc.previewNumber('lo1', '206');
  assert.equal(r.line.phone_number, '+15095550100');
  assert.equal(telnyx.orders, 1);
});

test('buy without a hold asks for an area code', async () => {
  const svc = createLoPhoneLineService({ supabase: fakeSupabase(), telnyx: countingMock() });
  const r = await svc.buyNumber('lo1');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no_line');
});

test('failed order is recorded in words and not retried', async () => {
  const telnyx = countingMock();
  telnyx.orderNumber = async () => ({ ok: false, status: 422, error: 'Number no longer available.' });
  const svc = createLoPhoneLineService({ supabase: fakeSupabase(), telnyx });
  await svc.previewNumber('lo1', '509');
  const r = await svc.buyNumber('lo1');
  assert.equal(r.ok, false);
  assert.equal(r.line.status, 'failed');
  assert.equal(svc.publicView(r.line).error, 'Number no longer available.');
});

test('public view hides secrets', async () => {
  const svc = createLoPhoneLineService({ supabase: fakeSupabase(), telnyx: countingMock() });
  const { line } = await svc.previewNumber('lo1', '509');
  const view = svc.publicView(line);
  assert.equal(view.reservedNumber, '+15095550100');
  assert.ok(!('tool_token' in view));
  assert.ok(!('telnyx_reservation_id' in view));
});
