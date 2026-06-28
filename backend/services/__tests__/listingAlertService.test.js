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

const {
  subscribeToListing,
  createPendingAlert,
  sendAlert,
  suppressPhone,
} = require('../listingAlertService');

// Minimal chainable fake of the Supabase client used by the service.
function makeFakeSupabase(seed = {}) {
  const db = {
    listing_alert_subscribers: [...(seed.subscribers || [])],
    sms_suppression: [...(seed.suppression || [])],
    listing_alert_pending: [...(seed.pending || [])],
  };
  let idc = 1;
  function from(table) {
    const rows = db[table];
    const q = { _filters: [], _table: table };
    q.select = () => q;
    q.eq = (col, val) => { q._filters.push([col, val]); return q; };
    q.maybeSingle = async () => {
      const r = rows.find((row) => q._filters.every(([c, v]) => row[c] === v));
      return { data: r || null, error: null };
    };
    q.then = (resolve) => resolve({ data: rows.filter((row) => q._filters.every(([c, v]) => row[c] === v)), error: null });
    q.upsert = async (vals) => {
      const incoming = Array.isArray(vals) ? vals : [vals];
      incoming.forEach((v) => {
        const key = v.phone && v.listing_id ? null : v.phone;
        const existing = v.listing_id
          ? rows.find((r) => r.listing_id === v.listing_id && r.phone === v.phone)
          : rows.find((r) => r.phone === v.phone);
        if (existing) Object.assign(existing, v);
        else rows.push({ id: `id-${idc++}`, ...v });
      });
      return { data: incoming, error: null };
    };
    q.insert = (vals) => {
      const row = { id: `id-${idc++}`, ...vals };
      rows.push(row);
      return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
    };
    q.update = (vals) => ({
      eq: (col, val) => {
        rows.filter((r) => r[col] === val).forEach((r) => Object.assign(r, vals));
        return Promise.resolve({ data: null, error: null });
      },
    });
    return q;
  }
  return { from, _db: db };
}

const deps = (supabase) => ({ supabase, sendSms: async () => ({ id: 'tb1' }), logger: { error() {}, log() {} } });

test('subscribeToListing upserts an active subscriber with consent', async () => {
  const sb = makeFakeSupabase();
  const out = await subscribeToListing(deps(sb), {
    listingId: 'L1', agentId: 'A1', phone: '(555) 123-4567', visitorId: 'v1',
    consentText: 'I agree',
  });
  assert.strictEqual(out.ok, true);
  const row = sb._db.listing_alert_subscribers[0];
  assert.strictEqual(row.phone, '+15551234567');
  assert.strictEqual(row.status, 'active');
  assert.strictEqual(row.listing_id, 'L1');
  assert.strictEqual(row.consent_text, 'I agree');
});

test('subscribeToListing rejects an invalid phone', async () => {
  const sb = makeFakeSupabase();
  const out = await subscribeToListing(deps(sb), { listingId: 'L1', phone: '123' });
  assert.strictEqual(out.ok, false);
  assert.strictEqual(sb._db.listing_alert_subscribers.length, 0);
});

test('createPendingAlert counts active subscribers and stores a pending row', async () => {
  const sb = makeFakeSupabase({ subscribers: [
    { id: 's1', listing_id: 'L1', phone: '+15550000001', status: 'active' },
    { id: 's2', listing_id: 'L1', phone: '+15550000002', status: 'unsubscribed' },
    { id: 's3', listing_id: 'L1', phone: '+15550000003', status: 'active' },
  ] });
  const out = await createPendingAlert(deps(sb), {
    listingId: 'L1', agentId: 'A1', type: 'price',
    payload: { address: '123 Main St', oldPrice: 700000, newPrice: 625000 },
  });
  assert.strictEqual(out.recipientCount, 2);
  assert.strictEqual(sb._db.listing_alert_pending[0].status, 'pending');
  assert.strictEqual(sb._db.listing_alert_pending[0].type, 'price');
});

test('sendAlert texts active, non-suppressed subscribers and marks pending sent', async () => {
  const sb = makeFakeSupabase({
    subscribers: [
      { id: 's1', listing_id: 'L1', phone: '+15550000001', status: 'active' },
      { id: 's2', listing_id: 'L1', phone: '+15550000002', status: 'active' },
    ],
    suppression: [{ phone: '+15550000002' }],
    pending: [{ id: 'p1', listing_id: 'L1', type: 'price', status: 'pending',
      payload: { message: 'Price drop! Reply STOP to opt out.' } }],
  });
  const sent = [];
  const d = { supabase: sb, sendSms: async (to) => { sent.push(to); return { id: 'x' }; }, logger: { error() {} } };
  const out = await sendAlert(d, { pendingId: 'p1' });
  assert.deepStrictEqual(sent, ['+15550000001']);   // suppressed one skipped
  assert.strictEqual(out.sent, 1);
  assert.strictEqual(out.skipped, 1);
  assert.strictEqual(sb._db.listing_alert_pending[0].status, 'sent');
});

test('suppressPhone adds to suppression and unsubscribes matching subscribers', async () => {
  const sb = makeFakeSupabase({ subscribers: [
    { id: 's1', listing_id: 'L1', phone: '+15550000009', status: 'active' },
  ] });
  await suppressPhone(deps(sb), { phone: '5550000009', reason: 'stop_reply' });
  assert.strictEqual(sb._db.sms_suppression[0].phone, '+15550000009');
  assert.strictEqual(sb._db.listing_alert_subscribers[0].status, 'unsubscribed');
});
