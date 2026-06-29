# Listing Price-Drop SMS Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let buyers who scan a listing's QR code opt in by phone, then let the agent text those subscribers (one-tap approval) when the price drops, plus send open-house / manual blasts — all via Textbelt with STOP-based opt-out.

**Architecture:** Business logic lives in a new dependency-injected service (`backend/services/listingAlertService.js`) that is unit-tested with `node:test` and a fake Supabase (mirrors the existing `loLeadScraperService` pattern). Thin Express endpoints in `backend/server.cjs` call the service. Price-drop detection hooks the existing `PUT /api/properties/:id`. STOP handling extends the existing `processInboundSmsMessage` Textbelt inbound path (the reply webhook is already wired in `smsService.js`). Frontend adds a public opt-in card to `PublicListingPage` and an approval/blast panel to the agent listing-detail page.

**Tech Stack:** Node + Express 5 (`server.cjs`), Supabase (`supabaseAdmin`), Textbelt via `backend/services/smsService.js`, React 18 + TS + Vite, `node:test` for backend tests.

**Decisions (from spec `docs/superpowers/specs/2026-06-28-listing-price-drop-sms-alerts-design.md`):** phone-only; triggers = price drop (auto-detected) + manual blast (with a one-tap "Open house" template — auto open-house detection deferred since no open-house scheduling feature is confirmed); one-tap agent approval; Textbelt; consent at opt-in + STOP suppression.

---

## File Structure

**Create:**
- `listing-price-alerts-migration.sql` (repo root) — 3 tables, run manually in Supabase.
- `backend/services/listingAlertService.js` — pure helpers + DI orchestration.
- `backend/services/__tests__/listingAlertService.test.js` — node:test.
- `src/services/listingAlerts.ts` — frontend API calls (public subscribe + authed agent calls).
- `src/components/listing/ListingAlertOptIn.tsx` — public opt-in card.
- `src/components/dashboard-command/ListingAlertPanel.tsx` — agent approval + manual blast panel.

**Modify:**
- `backend/server.cjs` — add 6 endpoints; hook price-drop detection in `PUT /api/properties/:id` (~line 34822); extend STOP branch in `processInboundSmsMessage` (~line 17690); export `listingAlertService` deps where `sendSms` is wired (~line 1462).
- `src/pages/PublicListingPage.tsx` — render `<ListingAlertOptIn>`.
- `src/components/dashboard-command/ListingPerformancePage.tsx` — render `<ListingAlertPanel>`.

---

## Task 1: Database migration

**Files:**
- Create: `listing-price-alerts-migration.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- listing-price-alerts-migration.sql
-- Run manually in the Supabase SQL editor. Idempotent.

create table if not exists listing_alert_subscribers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,                 -- properties.id (rich table), NOT legacy listings
  agent_id uuid,                            -- resolved owner profile id (agents.id)
  phone text not null,                      -- E.164
  visitor_id text,
  status text not null default 'active',    -- 'active' | 'unsubscribed'
  consent_text text,
  consent_at timestamptz default now(),
  created_at timestamptz default now(),
  last_alerted_at timestamptz
);
create unique index if not exists listing_alert_subscribers_listing_phone_idx
  on listing_alert_subscribers (listing_id, phone);

create table if not exists sms_suppression (
  phone text primary key,                   -- global opt-out, checked before every send
  reason text default 'stop_reply',
  created_at timestamptz default now()
);

create table if not exists listing_alert_pending (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  agent_id uuid,
  type text not null,                       -- 'price' | 'manual'
  payload jsonb not null default '{}'::jsonb,
  recipient_count integer default 0,
  status text not null default 'pending',   -- 'pending' | 'sent' | 'dismissed'
  created_at timestamptz default now(),
  sent_at timestamptz
);
create index if not exists listing_alert_pending_listing_idx
  on listing_alert_pending (listing_id, status);
```

- [ ] **Step 2: Commit**

```bash
git add listing-price-alerts-migration.sql
git commit -m "feat(alerts): migration for listing price-drop SMS alerts"
```

> The user runs this SQL in Supabase manually (see Task 10). No automated DB step.

---

## Task 2: Service pure helpers (TDD)

**Files:**
- Create: `backend/services/listingAlertService.js`
- Test: `backend/services/__tests__/listingAlertService.test.js`

- [ ] **Step 1: Write failing tests for the pure helpers**

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test backend/services/__tests__/listingAlertService.test.js`
Expected: FAIL — `Cannot find module '../listingAlertService'`.

- [ ] **Step 3: Implement the pure helpers**

```js
// backend/services/listingAlertService.js
'use strict';

const STOP_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);

function normalizeAlertPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

function isStopKeyword(text) {
  if (!text) return false;
  return STOP_KEYWORDS.has(String(text).trim().toUpperCase());
}

function formatPrice(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '';
  return `$${Math.round(num).toLocaleString('en-US')}`;
}

function detectPriceDrop(oldPrice, newPrice) {
  const o = Number(oldPrice);
  const n = Number(newPrice);
  if (!Number.isFinite(o) || !Number.isFinite(n)) return false;
  if (o <= 0 || n <= 0) return false;
  return n < o;
}

function buildPriceDropMessage({ address, oldPrice, newPrice }) {
  const where = address || 'a home you saved';
  return `Price drop on ${where} — now ${formatPrice(newPrice)} (was ${formatPrice(oldPrice)}). Reply for details. Reply STOP to opt out.`;
}

module.exports = {
  normalizeAlertPhone,
  isStopKeyword,
  formatPrice,
  detectPriceDrop,
  buildPriceDropMessage,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test backend/services/__tests__/listingAlertService.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/services/listingAlertService.js backend/services/__tests__/listingAlertService.test.js
git commit -m "feat(alerts): pure helpers for listing alert service (TDD)"
```

---

## Task 3: Service orchestration (TDD)

**Files:**
- Modify: `backend/services/listingAlertService.js`
- Test: `backend/services/__tests__/listingAlertService.test.js`

DI deps shape: `{ supabase, sendSms, logger }`. `supabase` is the `supabaseAdmin` client; `sendSms(to, message, mediaUrls, userId)` matches the real signature.

- [ ] **Step 1: Add the fake-Supabase helper + failing orchestration tests**

Append to `backend/services/__tests__/listingAlertService.test.js`:

```js
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
    q.then = undefined;
    q.upsert = async (vals) => {
      const incoming = Array.isArray(vals) ? vals : [vals];
      incoming.forEach((v) => {
        const existing = rows.find((r) => r.listing_id === v.listing_id && r.phone === v.phone);
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
    // resolve active subscriber list for a listing (used by sendAlert/createPendingAlert)
    q.list = () => rows.filter((row) => q._filters.every(([c, v]) => row[c] === v));
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
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test backend/services/__tests__/listingAlertService.test.js`
Expected: FAIL — `subscribeToListing is not a function` (orchestration not implemented yet).

- [ ] **Step 3: Implement orchestration**

In `backend/services/listingAlertService.js`, add these functions and export them. They use only `select/eq/maybeSingle/upsert/insert/update` so the real Supabase client and the fake both work. Active-subscriber reads use `select().eq('listing_id', id).eq('status','active')` and then filter in JS via a small helper that works against both clients.

```js
// --- helpers that read a filtered list compatibly with the real + fake client ---
async function fetchRows(supabase, table, filters) {
  let q = supabase.from(table).select('*');
  Object.entries(filters).forEach(([c, v]) => { q = q.eq(c, v); });
  const { data, error } = await q;            // real client resolves the builder
  if (error) throw error;
  return data || [];
}

async function subscribeToListing(deps, { listingId, agentId, phone, visitorId, consentText }) {
  const { supabase, logger } = deps;
  const normalized = normalizeAlertPhone(phone);
  if (!listingId || !normalized) return { ok: false, reason: 'invalid_input' };
  try {
    await supabase.from('listing_alert_subscribers').upsert({
      listing_id: listingId,
      agent_id: agentId || null,
      phone: normalized,
      visitor_id: visitorId || null,
      status: 'active',
      consent_text: consentText || null,
      consent_at: new Date().toISOString(),
    });
    return { ok: true, phone: normalized };
  } catch (err) {
    logger?.error?.('subscribeToListing failed', err);
    return { ok: false, reason: 'db_error' };
  }
}

async function createPendingAlert(deps, { listingId, agentId, type, payload }) {
  const { supabase } = deps;
  const subs = await fetchRows(supabase, 'listing_alert_subscribers', { listing_id: listingId, status: 'active' });
  const { data } = await supabase.from('listing_alert_pending').insert({
    listing_id: listingId,
    agent_id: agentId || null,
    type,
    payload: payload || {},
    recipient_count: subs.length,
    status: 'pending',
    created_at: new Date().toISOString(),
  }).select('*').single();
  return { pendingId: data?.id || null, recipientCount: subs.length };
}

async function sendAlert(deps, { pendingId }) {
  const { supabase, sendSms, logger } = deps;
  const { data: pending } = await supabase.from('listing_alert_pending')
    .select('*').eq('id', pendingId).maybeSingle();
  if (!pending || pending.status !== 'pending') return { sent: 0, skipped: 0, reason: 'not_pending' };

  const message = pending.payload?.message
    || buildPriceDropMessage(pending.payload || {});
  const subs = await fetchRows(supabase, 'listing_alert_subscribers', { listing_id: pending.listing_id, status: 'active' });
  const suppressed = new Set(
    (await fetchRows(supabase, 'sms_suppression', {})).map((r) => r.phone)
  );

  let sent = 0; let skipped = 0;
  for (const sub of subs) {
    if (suppressed.has(sub.phone)) { skipped += 1; continue; }
    try {
      const ok = await sendSms(sub.phone, message, [], pending.agent_id || null);
      if (ok) {
        sent += 1;
        await supabase.from('listing_alert_subscribers')
          .update({ last_alerted_at: new Date().toISOString() }).eq('id', sub.id);
      } else { skipped += 1; }
    } catch (err) { logger?.error?.('sendAlert send failed', err); skipped += 1; }
  }

  await supabase.from('listing_alert_pending')
    .update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', pendingId);
  return { sent, skipped };
}

async function suppressPhone(deps, { phone, reason }) {
  const { supabase } = deps;
  const normalized = normalizeAlertPhone(phone) || phone;
  await supabase.from('sms_suppression').upsert({
    phone: normalized, reason: reason || 'stop_reply', created_at: new Date().toISOString(),
  });
  await supabase.from('listing_alert_subscribers')
    .update({ status: 'unsubscribed' }).eq('phone', normalized);
  return { ok: true, phone: normalized };
}
```

Update the `module.exports` block to also export: `subscribeToListing, createPendingAlert, sendAlert, suppressPhone`.

> Note: the fake client's `select('*').eq(...)` returns the query object; `fetchRows` awaits it. Add a `then` resolver to the fake so `await q` yields `{ data: q.list(), error: null }`. In the fake `from()`, set `q.then = (resolve) => resolve({ data: q.list(), error: null });` (replace the `q.then = undefined` line).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test backend/services/__tests__/listingAlertService.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add backend/services/listingAlertService.js backend/services/__tests__/listingAlertService.test.js
git commit -m "feat(alerts): subscribe/pending/send/suppress orchestration (TDD)"
```

---

## Task 4: Backend endpoints

**Files:**
- Modify: `backend/server.cjs`

Place the public subscribe endpoint near the other `/api/public/listings/...` routes (~line 19498). Place the authed endpoints near other `requireAuth` dashboard routes. Add the require at the top alongside other service requires (near line 260).

- [ ] **Step 1: Require the service**

Near line 260 (where `smsService` is required), add:

```js
const listingAlertService = require('./services/listingAlertService');
const alertDeps = () => ({ supabase: supabaseAdmin, sendSms, logger: console });
```

- [ ] **Step 2: Public subscribe endpoint**

Add near line 19498 (mirrors the listing-resolution in `/api/public/listings/:publicSlug/session`):

```js
app.post('/api/public/listing-alerts/subscribe', async (req, res) => {
  try {
    const { listing_id: listingIdOrSlug, phone, visitor_id: visitorId, consent_text: consentText } = req.body || {};
    if (!listingIdOrSlug || !phone) return res.status(400).json({ error: 'missing_fields' });

    let listingRow = await resolvePublicListingRowBySlug(String(listingIdOrSlug));
    if (!listingRow) {
      const { data } = await supabaseAdmin.from('properties').select('*').eq('id', listingIdOrSlug).maybeSingle();
      if (data && isListingPublished(data)) listingRow = data;
    }
    if (!listingRow?.id) return res.status(404).json({ error: 'not_found' });

    const ownerIdRaw = listingRow.agent_id || listingRow.user_id || null;
    let agentId = null;
    if (ownerIdRaw) {
      const { data: ownerAgent } = await supabaseAdmin.from('agents').select('id')
        .or(`id.eq.${ownerIdRaw},auth_user_id.eq.${ownerIdRaw}`).limit(1).maybeSingle();
      agentId = ownerAgent?.id || null;
    }

    const out = await listingAlertService.subscribeToListing(alertDeps(), {
      listingId: listingRow.id, agentId, phone, visitorId,
      consentText: consentText || 'Buyer agreed to receive SMS alerts about this property.',
    });
    if (!out.ok) return res.status(400).json({ error: out.reason || 'subscribe_failed' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('listing-alerts subscribe error:', err);
    return res.status(500).json({ error: 'subscribe_failed' });
  }
});
```

- [ ] **Step 3: Authed agent endpoints**

Add near other `requireAuth` routes. Ownership is enforced by matching the listing's `agent_id`/`user_id` to the requester's auth id (same pattern as `PUT /api/properties/:id`).

```js
// helper: does the requester own this listing?
async function requesterOwnsListing(listingId, authUserId) {
  const { data } = await supabaseAdmin.from('properties').select('id')
    .eq('id', listingId).or(`agent_id.eq.${authUserId},user_id.eq.${authUserId}`).maybeSingle();
  return Boolean(data?.id);
}

// Pending approval cards for all of the requester's listings
app.get('/api/listing-alerts/pending', requireAuth, async (req, res) => {
  try {
    const authUserId = req.authUserId;
    const { data: props } = await supabaseAdmin.from('properties').select('id')
      .or(`agent_id.eq.${authUserId},user_id.eq.${authUserId}`);
    const ids = (props || []).map((p) => p.id);
    if (ids.length === 0) return res.json({ pending: [] });
    const { data: pending } = await supabaseAdmin.from('listing_alert_pending')
      .select('*').in('listing_id', ids).eq('status', 'pending').order('created_at', { ascending: false });
    return res.json({ pending: pending || [] });
  } catch (err) {
    console.error('listing-alerts pending error:', err);
    return res.status(500).json({ error: 'pending_failed' });
  }
});

// Subscriber count for one listing
app.get('/api/listing-alerts/subscribers', requireAuth, async (req, res) => {
  const listingId = String(req.query.listing_id || '');
  if (!listingId) return res.status(400).json({ error: 'missing_listing_id' });
  if (!(await requesterOwnsListing(listingId, req.authUserId))) return res.status(403).json({ error: 'listing_access_denied' });
  const { data } = await supabaseAdmin.from('listing_alert_subscribers')
    .select('id').eq('listing_id', listingId).eq('status', 'active');
  return res.json({ count: (data || []).length });
});

// Approve + send a pending alert
app.post('/api/listing-alerts/:id/send', requireAuth, async (req, res) => {
  const { data: pending } = await supabaseAdmin.from('listing_alert_pending').select('*').eq('id', req.params.id).maybeSingle();
  if (!pending) return res.status(404).json({ error: 'not_found' });
  if (!(await requesterOwnsListing(pending.listing_id, req.authUserId))) return res.status(403).json({ error: 'listing_access_denied' });
  res.json({ ok: true, queued: pending.recipient_count }); // respond immediately
  listingAlertService.sendAlert(alertDeps(), { pendingId: pending.id })
    .catch((err) => console.error('sendAlert bg error:', err));   // background send (avoids timeout)
});

// Dismiss a pending alert
app.post('/api/listing-alerts/:id/dismiss', requireAuth, async (req, res) => {
  const { data: pending } = await supabaseAdmin.from('listing_alert_pending').select('*').eq('id', req.params.id).maybeSingle();
  if (!pending) return res.status(404).json({ error: 'not_found' });
  if (!(await requesterOwnsListing(pending.listing_id, req.authUserId))) return res.status(403).json({ error: 'listing_access_denied' });
  await supabaseAdmin.from('listing_alert_pending').update({ status: 'dismissed' }).eq('id', pending.id);
  return res.json({ ok: true });
});

// Manual blast (covers open-house template too — frontend prefills the message)
app.post('/api/listing-alerts/manual', requireAuth, async (req, res) => {
  const { listing_id: listingId, message } = req.body || {};
  if (!listingId || !message) return res.status(400).json({ error: 'missing_fields' });
  if (!(await requesterOwnsListing(listingId, req.authUserId))) return res.status(403).json({ error: 'listing_access_denied' });
  const body = `${String(message).trim()} Reply STOP to opt out.`;
  const { pendingId, recipientCount } = await listingAlertService.createPendingAlert(alertDeps(), {
    listingId, agentId: req.authUserId, type: 'manual', payload: { message: body },
  });
  res.json({ ok: true, queued: recipientCount });
  listingAlertService.sendAlert(alertDeps(), { pendingId }).catch((err) => console.error('manual sendAlert bg error:', err));
});
```

- [ ] **Step 3b: Verify the server still boots**

Run: `node -e "require('./backend/server.cjs')" ` is not safe (starts listener). Instead lint the file: `node --check backend/server.cjs`
Expected: no output (syntax OK).

- [ ] **Step 4: Commit**

```bash
git add backend/server.cjs
git commit -m "feat(alerts): backend endpoints for subscribe/pending/send/dismiss/manual"
```

---

## Task 5: Price-drop detection hook

**Files:**
- Modify: `backend/server.cjs` — `PUT /api/properties/:id` (~line 34822)

- [ ] **Step 1: Capture old price in the ownership lookup**

Change the ownership select (line ~34854) from `.select('id')` to include price:

```js
const { data: ownedProperty, error: ownedPropertyError } = await supabaseAdmin
  .from('properties')
  .select('id, price, title, address')
  .eq('id', id)
  .or(`agent_id.eq.${agentId},user_id.eq.${agentId}`)
  .maybeSingle()
```

- [ ] **Step 2: After a successful update, create a pending price alert on a drop**

Immediately after `await logPropertyAudit(agentId, 'update_property_success', ...)` (line ~34894) and before the `return res.json({ property: data })`, add:

```js
// Price-drop alert: if the price dropped, queue a pending alert for the agent to approve.
try {
  if (listingAlertService.detectPriceDrop(ownedProperty.price, data.price)) {
    const address = data.address || data.title || ownedProperty.address || ownedProperty.title || 'a home you saved';
    const message = listingAlertService.buildPriceDropMessage({
      address, oldPrice: ownedProperty.price, newPrice: data.price,
    });
    await listingAlertService.createPendingAlert(alertDeps(), {
      listingId: data.id, agentId,
      type: 'price',
      payload: { address, oldPrice: ownedProperty.price, newPrice: data.price, message },
    });
  }
} catch (alertErr) {
  console.error(`[${requestId}] price-drop alert queue failed:`, alertErr);  // never block the update
}
```

- [ ] **Step 3: Verify syntax**

Run: `node --check backend/server.cjs`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/server.cjs
git commit -m "feat(alerts): queue price-drop alert on property price decrease"
```

---

## Task 6: STOP suppression hook

**Files:**
- Modify: `backend/server.cjs` — STOP branch in `processInboundSmsMessage` (~line 17690)

- [ ] **Step 1: Add suppression to the existing STOP branch**

The current STOP branch (lines ~17690-17696) only flips `leads.status`. Add a call to the alert service so listing-alert subscribers honor STOP too:

```js
  if (stopKeywords.includes(String(textBody).trim().toUpperCase())) {
    await supabaseAdmin
      .from('leads')
      .update({ status: 'unsubscribed', last_contact_at: nowIso() })
      .eq('phone', normalizedFromPhone);
    // Honor STOP for listing price-drop alert subscribers too (global suppression).
    await listingAlertService.suppressPhone(alertDeps(), { phone: normalizedFromPhone, reason: 'stop_reply' })
      .catch((err) => console.error('alert suppressPhone failed:', err));
    return { processed: true, unsubscribed: true };
  }
```

- [ ] **Step 2: Verify syntax**

Run: `node --check backend/server.cjs`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add backend/server.cjs
git commit -m "feat(alerts): honor SMS STOP for listing-alert subscribers"
```

---

## Task 7: Frontend API service

**Files:**
- Create: `src/services/listingAlerts.ts`

- [ ] **Step 1: Write the service**

```ts
// src/services/listingAlerts.ts
import { buildApiUrl } from '../lib/api';
import { authHeaders } from './dashboard/utils';

// Public: buyer opts in from the listing page (no auth).
export async function subscribeToListingAlerts(listingId: string, phone: string, visitorId?: string) {
  const res = await fetch(buildApiUrl('/api/public/listing-alerts/subscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listing_id: listingId,
      phone,
      visitor_id: visitorId || null,
      consent_text: 'I agree to receive text alerts about this property. Msg & data rates may apply. Reply STOP to opt out.',
    }),
  });
  if (!res.ok) throw new Error('subscribe_failed');
  return res.json() as Promise<{ ok: boolean }>;
}

export interface PendingAlert {
  id: string;
  listing_id: string;
  type: 'price' | 'manual';
  payload: { address?: string; oldPrice?: number; newPrice?: number; message?: string };
  recipient_count: number;
  created_at: string;
}

export async function getPendingAlerts(agentId: string | null): Promise<PendingAlert[]> {
  const res = await fetch(buildApiUrl('/api/listing-alerts/pending'), { headers: await authHeaders(agentId) });
  if (!res.ok) return [];
  const data = await res.json();
  return data.pending || [];
}

export async function getSubscriberCount(agentId: string | null, listingId: string): Promise<number> {
  const res = await fetch(buildApiUrl(`/api/listing-alerts/subscribers?listing_id=${encodeURIComponent(listingId)}`), {
    headers: await authHeaders(agentId),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count || 0;
}

export async function sendAlert(agentId: string | null, id: string) {
  const res = await fetch(buildApiUrl(`/api/listing-alerts/${encodeURIComponent(id)}/send`), {
    method: 'POST', headers: await authHeaders(agentId),
  });
  if (!res.ok) throw new Error('send_failed');
  return res.json();
}

export async function dismissAlert(agentId: string | null, id: string) {
  const res = await fetch(buildApiUrl(`/api/listing-alerts/${encodeURIComponent(id)}/dismiss`), {
    method: 'POST', headers: await authHeaders(agentId),
  });
  if (!res.ok) throw new Error('dismiss_failed');
  return res.json();
}

export async function sendManualBlast(agentId: string | null, listingId: string, message: string) {
  const headers = { ...(await authHeaders(agentId)), 'Content-Type': 'application/json' };
  const res = await fetch(buildApiUrl('/api/listing-alerts/manual'), {
    method: 'POST', headers, body: JSON.stringify({ listing_id: listingId, message }),
  });
  if (!res.ok) throw new Error('manual_failed');
  return res.json() as Promise<{ ok: boolean; queued: number }>;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `src/services/listingAlerts.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/listingAlerts.ts
git commit -m "feat(alerts): frontend API service for listing alerts"
```

---

## Task 8: Public opt-in card

**Files:**
- Create: `src/components/listing/ListingAlertOptIn.tsx`
- Modify: `src/pages/PublicListingPage.tsx`

- [ ] **Step 1: Build the opt-in card**

```tsx
// src/components/listing/ListingAlertOptIn.tsx
import React, { useState } from 'react';
import { subscribeToListingAlerts } from '../../services/listingAlerts';

interface Props { listingId: string; visitorId?: string; }

const ListingAlertOptIn: React.FC<Props> = ({ listingId, visitorId }) => {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) { setState('error'); return; }
    setState('sending');
    try {
      await subscribeToListingAlerts(listingId, phone, visitorId);
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-center text-cyan-200">
        ✅ You're set — we'll text you the moment the price changes on this home.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-cyan-500/30 bg-[#0f1b2e] p-4">
      <div className="text-sm font-semibold text-cyan-300">🔔 Get price-drop alerts</div>
      <p className="mt-1 text-xs text-slate-400">Get a text the second the price changes or an open house is set.</p>
      <input
        type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
        placeholder="(555) 555-1234"
        className="mt-3 w-full rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
      />
      <button
        type="submit" disabled={state === 'sending'}
        className="mt-2 w-full rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {state === 'sending' ? 'Saving…' : 'Text me alerts'}
      </button>
      {state === 'error' && <p className="mt-2 text-xs text-rose-400">Please enter a valid phone number.</p>}
      <p className="mt-2 text-[10px] leading-tight text-slate-500">
        By tapping, you agree to get texts about this home. Msg &amp; data rates may apply. Reply STOP to opt out.
      </p>
    </form>
  );
};

export default ListingAlertOptIn;
```

- [ ] **Step 2: Render it in PublicListingPage**

In `src/pages/PublicListingPage.tsx`, import the component and the visitor id. Add the import near the other component imports:

```tsx
import ListingAlertOptIn from '../components/listing/ListingAlertOptIn';
```

The page already computes a `visitorId` and stores it under `VISITOR_STORAGE_KEY`. Read it for render (near the top of the component body, with other `useState`/derived values):

```tsx
const alertVisitorId = typeof window !== 'undefined' ? (localStorage.getItem(VISITOR_STORAGE_KEY) || undefined) : undefined;
```

Then render the card inside the main content column, just above the chatbot / contact section (place it where the listing's primary CTA area renders). Use the loaded property id:

```tsx
{property?.id && <ListingAlertOptIn listingId={property.id} visitorId={alertVisitorId} />}
```

> If the property state variable is named differently (e.g. `listing` or `loadedProperty`), use that name — match the existing variable holding the fetched property in this file.

- [ ] **Step 3: Verify in the browser**

Use the preview workflow: start the dev server (preview_start), open a public listing route (e.g. `/listing/<id>`), confirm the "Get price-drop alerts" card renders, type a number, submit, and confirm the success state. Check preview_console_logs for errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/listing/ListingAlertOptIn.tsx src/pages/PublicListingPage.tsx
git commit -m "feat(alerts): public opt-in card on listing page"
```

---

## Task 9: Agent approval + manual blast panel

**Files:**
- Create: `src/components/dashboard-command/ListingAlertPanel.tsx`
- Modify: `src/components/dashboard-command/ListingPerformancePage.tsx`

- [ ] **Step 1: Build the panel**

```tsx
// src/components/dashboard-command/ListingAlertPanel.tsx
import React, { useEffect, useState } from 'react';
import {
  getPendingAlerts, getSubscriberCount, sendAlert, dismissAlert, sendManualBlast, PendingAlert,
} from '../../services/listingAlerts';

interface Props { listingId: string; agentId: string | null; }

const ListingAlertPanel: React.FC<Props> = ({ listingId, agentId }) => {
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState<PendingAlert[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const refresh = async () => {
    setCount(await getSubscriberCount(agentId, listingId));
    const all = await getPendingAlerts(agentId);
    setPending(all.filter((p) => p.listing_id === listingId));
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [listingId, agentId]);

  const approve = async (id: string) => {
    setBusy(true);
    try { await sendAlert(agentId, id); setNote('Alert sent ✓'); await refresh(); }
    finally { setBusy(false); }
  };
  const dismiss = async (id: string) => { setBusy(true); try { await dismissAlert(agentId, id); await refresh(); } finally { setBusy(false); } };
  const blast = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try { const r = await sendManualBlast(agentId, listingId, message.trim()); setNote(`Sending to ${r.queued} subscribers…`); setMessage(''); await refresh(); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">🔔 Price-Drop Alerts</h3>
        <span className="text-xs text-slate-400">{count} watching this home</span>
      </div>

      {pending.map((p) => (
        <div key={p.id} className="mt-3 rounded-xl bg-slate-800/70 p-3">
          <p className="text-xs text-slate-300">{p.payload.message || 'Pending alert'}</p>
          <p className="mt-1 text-[11px] text-slate-500">{p.recipient_count} people will get this text.</p>
          <div className="mt-2 flex gap-2">
            <button disabled={busy} onClick={() => approve(p.id)} className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Send alert</button>
            <button disabled={busy} onClick={() => dismiss(p.id)} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-60">Dismiss</button>
          </div>
        </div>
      ))}

      <div className="mt-4 border-t border-slate-700 pt-3">
        <div className="mb-2 flex gap-2">
          <button onClick={() => setMessage('Open house this weekend! Come see this home in person.')} className="rounded-lg bg-slate-700 px-2 py-1 text-[11px] text-slate-200">🏠 Open house template</button>
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
          placeholder="Send a custom text to everyone watching…"
          className="w-full rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500" />
        <button disabled={busy || !message.trim()} onClick={blast}
          className="mt-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          Send to {count} subscribers
        </button>
      </div>

      {note && <p className="mt-2 text-xs text-emerald-400">{note}</p>}
    </div>
  );
};

export default ListingAlertPanel;
```

- [ ] **Step 2: Render it in ListingPerformancePage**

In `src/components/dashboard-command/ListingPerformancePage.tsx`, import the panel and render it where listing-management cards appear. Use the page's existing `listingId` (from `useParams`) and the current agent id (match how this page already gets the agent/user id — search the file for an existing `agentId`/`userId`/`user?.id` reference and reuse it).

```tsx
import ListingAlertPanel from './ListingAlertPanel';
// …in the JSX, alongside other cards:
{listingId && <ListingAlertPanel listingId={listingId} agentId={agentId ?? null} />}
```

- [ ] **Step 3: Verify in the browser**

preview workflow: open `/dashboard/listings/:listingId` for a listing you own (logged in as the agent test account from memory), confirm the panel renders with a subscriber count, type a manual message, send, and confirm the "Sending to N subscribers" note. Check preview_console_logs and preview_network for the `/api/listing-alerts/*` calls returning 200.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard-command/ListingAlertPanel.tsx src/components/dashboard-command/ListingPerformancePage.tsx
git commit -m "feat(alerts): agent approval + manual blast panel on listing detail"
```

---

## Task 10: Env, manual steps, end-to-end verification

**Files:**
- Modify: `CLAUDE.md` (Current State Snapshot + pending manual steps)

- [ ] **Step 1: Document required env + manual steps**

Add to `CLAUDE.md` under "Pending manual steps":
- Run `listing-price-alerts-migration.sql` in the Supabase SQL editor.
- Set `TEXTBELT_REPLY_WEBHOOK_URL` on Render to the backend base URL (e.g. `https://home-listing-ai-backend.onrender.com`) so Textbelt reply→STOP works. (`smsService.buildReplyWebhookUrl()` appends `/api/webhooks/textbelt/inbound`.)
- In Textbelt, confirm the API key plan supports `replyWebhookUrl`.

- [ ] **Step 2: Run the full backend test suite**

Run: `npm run test:backend`
Expected: PASS, including the new `listingAlertService.test.js`.

- [ ] **Step 3: Run the frontend test + typecheck**

Run: `npx tsc --noEmit` then `npm test`
Expected: no new type errors; Jest suite stays green.

- [ ] **Step 4: Manual end-to-end (after migration is run)**
  1. Open a published listing's public page → submit a phone in the opt-in card → expect success state.
  2. As the owning agent, lower that listing's price in the editor → open the listing detail → expect a pending "price drop" card with recipient count.
  3. Tap **Send alert** → the test phone receives the text.
  4. Reply **STOP** → confirm a row appears in `sms_suppression` and the subscriber flips to `unsubscribed`; a second send does not text that number.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(alerts): env + manual steps for listing price-drop SMS alerts"
```

---

## Self-Review Notes

- **Spec coverage:** opt-in card (Task 8) ✓; phone-only (Task 2/7/8) ✓; price-drop trigger (Task 5) ✓; open-house + manual blast (Task 4 `/manual` + Task 9 template) ✓; one-tap approval (Task 4 `/send` + Task 9) ✓; Textbelt + reply-webhook STOP (Task 6 + existing `smsService`) ✓; 3 tables (Task 1) ✓; consent capture (Task 4 subscribe + Task 8 copy) ✓; warm-lead capture via existing visitor_id (Task 4/8) ✓. Status-change trigger explicitly deferred per spec.
- **Open-house auto-detection** is intentionally implemented as a manual-blast template (not auto-detected) because no open-house scheduling feature is confirmed in the codebase — this avoids depending on something that may not exist; auto-detection can be added later by calling `createPendingAlert(..., type:'price')`-style from wherever scheduling lands.
- **Type/name consistency:** service exports (`subscribeToListing`, `createPendingAlert`, `sendAlert`, `suppressPhone`, `detectPriceDrop`, `buildPriceDropMessage`) are used with the exact same names in Tasks 4–6; frontend `PendingAlert` shape matches the `listing_alert_pending` columns.
- **Risk:** the fake-Supabase in tests is a simplified chainable; if the real client's `.in(...)`/`.or(...)` calls are added to service code later, extend the fake accordingly. Current service code only uses `select/eq/maybeSingle/upsert/insert/update`, all covered.
