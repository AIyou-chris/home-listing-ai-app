# LO Lead Finder — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and prove the LO-lead scraping engine — a Google Custom Search–driven service that finds loan-officer emails from brokerage team pages, dedupes them, respects a suppression list, and stores them in a new `lo_lead_pool`, triggerable from an admin "Run now" button.

**Architecture:** Purely additive and isolated. One idempotent SQL migration (3 new tables), one new backend service (`loLeadScraperService.js`) built as a dependency-injected factory so it is unit-testable, and two admin-only endpoints in `server.cjs`. No existing table, route, or product flow is touched. If the scraper failed entirely, the app would be unaffected.

**Tech Stack:** Node.js (CommonJS), Express 5, `cheerio` (already a backend dep), native `fetch` + `AbortSignal.timeout` (already used in `server.cjs`), Supabase admin client, Google Custom Search JSON API. Tests use Node's built-in `node:test` + `node:assert` runner (no new deps; independent of the frontend jest suite).

**Spec:** `docs/superpowers/specs/2026-06-19-lo-lead-finder-design.md`

---

## File Structure

- **Create** `lo-lead-pool-migration.sql` (repo root) — `lo_lead_pool`, `lo_suppression_list`, `lo_scraper_state` tables. User runs manually in Supabase SQL editor (project convention).
- **Create** `backend/services/loLeadScraperService.js` — the engine. Exports a factory `createLoLeadScraperService(deps)` and a pure helper `extractContacts(html, pageUrl)`.
- **Create** `backend/services/__tests__/loLeadScraperService.test.js` — `node:test` unit tests.
- **Modify** `backend/server.cjs` — require the service near the other service requires; add `POST /api/admin/lo-leads/run` and `GET /api/admin/lo-leads` (both `verifyAdmin`).
- **Modify** `package.json` — add `test:backend` script.

---

## Task 1: Database migration (3 additive tables)

**Files:**
- Create: `lo-lead-pool-migration.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- LO Lead Finder — scraped lead pool + suppression + scraper state
-- Idempotent: safe to run multiple times. Purely additive — touches no existing table.

create table if not exists public.lo_lead_pool (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,          -- dedup key; no email = no row
  name        text,
  employer    text,
  city        text,
  source_url  text,
  is_role     boolean not null default false, -- true for info@/admin@/etc (manual-send only)
  status      text not null default 'new',    -- new | sent | skipped
  found_at    timestamptz not null default now(),
  sent_at     timestamptz
);

create index if not exists lo_lead_pool_status_idx   on public.lo_lead_pool (status);
create index if not exists lo_lead_pool_found_at_idx  on public.lo_lead_pool (found_at desc);

create table if not exists public.lo_suppression_list (
  email     text primary key,                 -- lowercased
  reason    text,                             -- unsubscribe | bounce | manual
  added_at  timestamptz not null default now()
);

-- Single-row state for city rotation (id is always the literal 'singleton')
create table if not exists public.lo_scraper_state (
  id          text primary key default 'singleton',
  city_index  integer not null default 0,
  updated_at  timestamptz not null default now()
);

insert into public.lo_scraper_state (id, city_index)
  values ('singleton', 0)
  on conflict (id) do nothing;
```

- [ ] **Step 2: Verify it parses (sanity, no DB needed)**

Run: `grep -c "create table if not exists" lo-lead-pool-migration.sql`
Expected: `3`

- [ ] **Step 3: Commit**

```bash
git add lo-lead-pool-migration.sql
git commit -m "feat(lo-leads): add lo_lead_pool + suppression + scraper_state migration"
```

> **NOTE for the human (not the agent):** This migration must be run manually in the Supabase SQL editor before the endpoints will work. The agent cannot run it.

---

## Task 2: `extractContacts` — the email extractor (highest-risk logic, TDD)

This pure function takes raw page HTML + the page URL and returns clean, deduped contacts. It is the single most important piece — everything downstream depends on its quality.

**Files:**
- Create: `backend/services/loLeadScraperService.js`
- Test: `backend/services/__tests__/loLeadScraperService.test.js`

- [ ] **Step 1: Confirm Node version supports `node:test` and `fetch`**

Run: `node --version`
Expected: `v18.x` or higher (project already uses native `fetch`; `node:test` is stable in v20). If lower, stop and tell the human.

- [ ] **Step 2: Write the failing test**

Create `backend/services/__tests__/loLeadScraperService.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { extractContacts } = require('../loLeadScraperService');

test('extracts a real email and lowercases it', () => {
  const html = `<html><head><title>Acme Mortgage — Our Team</title></head>
    <body><p>Contact John at John.Smith@AcmeMortgage.com</p></body></html>`;
  const out = extractContacts(html, 'https://acmemortgage.com/team');
  const emails = out.map(c => c.email);
  assert.ok(emails.includes('john.smith@acmemortgage.com'));
  assert.strictEqual(out[0].employer, 'Acme Mortgage — Our Team');
});

test('returns empty array when no email present', () => {
  const html = `<html><body><p>Call us at 555-1234</p></body></html>`;
  assert.deepStrictEqual(extractContacts(html, 'https://x.com'), []);
});

test('dedupes the same email appearing twice', () => {
  const html = `<body>a@b.com and again a@b.com</body>`;
  const out = extractContacts(html, 'https://b.com');
  assert.strictEqual(out.length, 1);
});

test('drops junk: noreply, image filenames, example/placeholder domains', () => {
  const html = `<body>
    noreply@brokerage.com
    logo@2x.png
    hero@2x.jpg
    someone@example.com
    you@yourdomain.com
    real.lo@brokerage.com
  </body>`;
  const emails = extractContacts(html, 'https://brokerage.com').map(c => c.email);
  assert.deepStrictEqual(emails, ['real.lo@brokerage.com']);
});

test('flags role addresses with is_role = true', () => {
  const html = `<body>info@brokerage.com jane.lo@brokerage.com</body>`;
  const out = extractContacts(html, 'https://brokerage.com');
  const info = out.find(c => c.email === 'info@brokerage.com');
  const jane = out.find(c => c.email === 'jane.lo@brokerage.com');
  assert.strictEqual(info.is_role, true);
  assert.strictEqual(jane.is_role, false);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test backend/services/__tests__/loLeadScraperService.test.js`
Expected: FAIL — `Cannot find module '../loLeadScraperService'` (file doesn't exist yet).

- [ ] **Step 4: Write the minimal implementation**

Create `backend/services/loLeadScraperService.js`:

```js
'use strict';

const cheerio = require('cheerio');

// Local-parts that are role/catch-all addresses — captured but flagged for manual-only send.
const ROLE_LOCALPARTS = new Set([
  'info', 'admin', 'support', 'sales', 'contact', 'office', 'hello',
  'team', 'help', 'careers', 'jobs', 'marketing', 'noreply', 'no-reply'
]);

// Hard junk — never store these at all.
const JUNK_LOCALPARTS = new Set(['noreply', 'no-reply', 'donotreply', 'do-not-reply']);
const JUNK_DOMAINS = [
  'example.com', 'example.org', 'yourdomain.com', 'domain.com', 'email.com',
  'sentry.io', 'wixpress.com', 'godaddy.com', 'sentry-next.wixpress.com'
];
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function isJunk(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return true;
  if (JUNK_LOCALPARTS.has(local)) return true;
  if (JUNK_DOMAINS.includes(domain)) return true;
  if (IMAGE_EXT.test(email)) return true;          // logo@2x.png etc.
  if (/@\dx$/.test(email)) return true;            // retina sprite tokens
  if (domain.length < 4 || !domain.includes('.')) return true;
  return false;
}

/**
 * Pure: HTML + page URL -> array of { email, is_role, employer }.
 * Deduped, lowercased, junk removed. employer is best-effort from <title>.
 */
function extractContacts(html, pageUrl) {
  let employer = null;
  try {
    const $ = cheerio.load(html);
    employer = ($('title').first().text() || '').trim() || null;
  } catch (_) { /* malformed html — fall through with null employer */ }

  const seen = new Set();
  const out = [];
  const matches = String(html).match(EMAIL_RE) || [];
  for (const raw of matches) {
    const email = raw.toLowerCase();
    if (seen.has(email)) continue;
    if (isJunk(email)) continue;
    seen.add(email);
    const local = email.split('@')[0];
    out.push({ email, is_role: ROLE_LOCALPARTS.has(local), employer });
  }
  return out;
}

module.exports = { extractContacts };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test backend/services/__tests__/loLeadScraperService.test.js`
Expected: PASS — all 5 tests green.

- [ ] **Step 6: Add the backend test script and commit**

In `package.json`, add to the `"scripts"` block (after the existing `"test"` line):

```json
"test:backend": "node --test backend/services/__tests__/",
```

```bash
git add backend/services/loLeadScraperService.js backend/services/__tests__/loLeadScraperService.test.js package.json
git commit -m "feat(lo-leads): add extractContacts email extractor + node:test suite"
```

---

## Task 3: `createLoLeadScraperService` — search → fetch → store orchestration (TDD)

A dependency-injected factory so it is fully testable with fake `fetch` and fake Supabase. It runs Google CSE queries (capped), fetches each result page, extracts contacts, skips dupes + suppressed emails, and inserts the rest.

**Files:**
- Modify: `backend/services/loLeadScraperService.js`
- Test: `backend/services/__tests__/loLeadScraperService.test.js`

- [ ] **Step 1: Write the failing test (append to the existing test file)**

```js
// ---- runLoLeadScrape orchestration ----

function makeFakeSupabase({ existingEmails = [], suppressed = [] } = {}) {
  const inserted = [];
  const api = {
    inserted,
    from(table) {
      return {
        _table: table,
        select() { return this; },
        eq() { return this; },
        in(_col, vals) {
          // return existing/suppressed matches for dedup checks
          const pool = table === 'lo_suppression_list' ? suppressed : existingEmails;
          const data = vals.filter(v => pool.includes(v)).map(email => ({ email }));
          return Promise.resolve({ data, error: null });
        },
        async insert(rows) {
          inserted.push(...(Array.isArray(rows) ? rows : [rows]));
          return { error: null };
        },
        async upsert() { return { error: null }; },
        maybeSingle() { return Promise.resolve({ data: { city_index: 0 }, error: null }); },
        single() { return Promise.resolve({ data: { city_index: 0 }, error: null }); },
      };
    }
  };
  return api;
}

test('runLoLeadScrape respects maxSearches cap', async () => {
  let searchCalls = 0;
  const fakeFetch = async (url) => {
    if (url.includes('googleapis.com')) {
      searchCalls++;
      return { ok: true, json: async () => ({ items: [] }) };
    }
    return { ok: true, text: async () => '' };
  };
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: makeFakeSupabase(),
    fetchImpl: fakeFetch,
    env: { GOOGLE_CSE_API_KEY: 'k', GOOGLE_CSE_ID: 'id' },
    cities: ['Dallas TX', 'Houston TX'],
    queryTemplates: ['loan officers in {city}'],
  });
  const result = await svc.runLoLeadScrape({ maxSearches: 1 });
  assert.strictEqual(searchCalls, 1);
  assert.strictEqual(result.searchesUsed, 1);
});

test('runLoLeadScrape stores extracted emails, skipping dupes and suppressed', async () => {
  const fakeFetch = async (url) => {
    if (url.includes('googleapis.com')) {
      return { ok: true, json: async () => ({ items: [{ link: 'https://acme.com/team' }] }) };
    }
    return {
      ok: true,
      text: async () => `<body>new.lo@acme.com dupe@acme.com bad@acme.com</body>`,
    };
  };
  const supa = makeFakeSupabase({ existingEmails: ['dupe@acme.com'], suppressed: ['bad@acme.com'] });
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: supa,
    fetchImpl: fakeFetch,
    env: { GOOGLE_CSE_API_KEY: 'k', GOOGLE_CSE_ID: 'id' },
    cities: ['Dallas TX'],
    queryTemplates: ['loan officers in {city}'],
  });
  const result = await svc.runLoLeadScrape({ maxSearches: 1 });
  const storedEmails = supa.inserted.map(r => r.email);
  assert.deepStrictEqual(storedEmails, ['new.lo@acme.com']);
  assert.strictEqual(result.leadsAdded, 1);
});

test('runLoLeadScrape no-ops gracefully when Google keys are missing', async () => {
  const svc = require('../loLeadScraperService').createLoLeadScraperService({
    supabaseAdmin: makeFakeSupabase(),
    fetchImpl: async () => { throw new Error('should not be called'); },
    env: {},
    cities: ['Dallas TX'],
    queryTemplates: ['loan officers in {city}'],
  });
  const result = await svc.runLoLeadScrape({ maxSearches: 5 });
  assert.strictEqual(result.skipped, 'missing_google_keys');
  assert.strictEqual(result.leadsAdded, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test backend/services/__tests__/loLeadScraperService.test.js`
Expected: FAIL — `createLoLeadScraperService is not a function`.

- [ ] **Step 3: Write the implementation (append to `loLeadScraperService.js`, before `module.exports`)**

```js
const DEFAULT_CITIES = [
  'Dallas TX', 'Houston TX', 'Atlanta GA', 'Phoenix AZ', 'Los Angeles CA',
  'Miami FL', 'Washington DC', 'Chicago IL', 'New York NY', 'Denver CO'
];

const DEFAULT_QUERY_TEMPLATES = [
  'mortgage loan officers {city} "our team"',
  '"loan officer" {city} email',
  '{city} mortgage company loan officer staff',
  'loan officers in {city}'
];

function createLoLeadScraperService(deps) {
  const {
    supabaseAdmin,
    fetchImpl = fetch,
    env = process.env,
    cities = DEFAULT_CITIES,
    queryTemplates = DEFAULT_QUERY_TEMPLATES,
  } = deps || {};

  async function googleSearch(query) {
    const key = env.GOOGLE_CSE_API_KEY;
    const cx = env.GOOGLE_CSE_ID;
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}`
      + `&cx=${encodeURIComponent(cx)}&num=10&q=${encodeURIComponent(query)}`;
    const res = await fetchImpl(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(i => i.link).filter(Boolean);
  }

  async function fetchPage(pageUrl) {
    try {
      const res = await fetchImpl(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomeListingAI/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return '';
      return await res.text();
    } catch (_) {
      return ''; // skip unreachable/slow pages, keep the run alive
    }
  }

  // Return the subset of `emails` that already exist in `table`'s `email` column.
  async function existingIn(table, emails) {
    if (!emails.length) return new Set();
    const { data, error } = await supabaseAdmin.from(table).select('email').in('email', emails);
    if (error || !data) return new Set();
    return new Set(data.map(r => r.email));
  }

  async function runLoLeadScrape({ maxSearches = 100 } = {}) {
    if (!env.GOOGLE_CSE_API_KEY || !env.GOOGLE_CSE_ID) {
      console.warn('[LO Lead Finder] Missing GOOGLE_CSE_API_KEY / GOOGLE_CSE_ID — skipping run.');
      return { skipped: 'missing_google_keys', searchesUsed: 0, pagesScanned: 0, leadsAdded: 0, dupesSkipped: 0 };
    }

    let searchesUsed = 0, pagesScanned = 0, leadsAdded = 0, dupesSkipped = 0;

    outer:
    for (const city of cities) {
      for (const tpl of queryTemplates) {
        if (searchesUsed >= maxSearches) break outer;
        searchesUsed++;
        const query = tpl.replace('{city}', city);
        let links = [];
        try { links = await googleSearch(query); }
        catch (e) { console.warn('[LO Lead Finder] search failed:', e?.message); continue; }

        for (const link of links) {
          const html = await fetchPage(link);
          if (!html) continue;
          pagesScanned++;
          const contacts = extractContacts(html, link);
          if (!contacts.length) continue;

          const emails = contacts.map(c => c.email);
          const [already, suppressed] = await Promise.all([
            existingIn('lo_lead_pool', emails),
            existingIn('lo_suppression_list', emails),
          ]);

          const fresh = contacts.filter(c => {
            if (already.has(c.email) || suppressed.has(c.email)) { dupesSkipped++; return false; }
            return true;
          });
          if (!fresh.length) continue;

          const rows = fresh.map(c => ({
            email: c.email, employer: c.employer, is_role: c.is_role,
            city, source_url: link, status: 'new',
          }));
          const { error } = await supabaseAdmin.from('lo_lead_pool').insert(rows);
          if (!error) leadsAdded += rows.length;
        }
      }
    }
    return { searchesUsed, pagesScanned, leadsAdded, dupesSkipped };
  }

  return { runLoLeadScrape };
}
```

- [ ] **Step 4: Update the exports line**

Change the bottom of `loLeadScraperService.js` from:

```js
module.exports = { extractContacts };
```

to:

```js
module.exports = { extractContacts, createLoLeadScraperService, DEFAULT_CITIES, DEFAULT_QUERY_TEMPLATES };
```

- [ ] **Step 5: Run the full backend test suite to verify it passes**

Run: `npm run test:backend`
Expected: PASS — all 8 tests green (5 from Task 2 + 3 here).

- [ ] **Step 6: Commit**

```bash
git add backend/services/loLeadScraperService.js backend/services/__tests__/loLeadScraperService.test.js
git commit -m "feat(lo-leads): add createLoLeadScraperService (search/fetch/store, capped, dedup, suppression)"
```

---

## Task 4: Admin endpoints — `Run now` + list pool

Wire the service into the Express monolith with two admin-gated routes.

**Files:**
- Modify: `backend/server.cjs`

- [ ] **Step 1: Require the service**

In `backend/server.cjs`, add near the other service requires (right after line 250, the `createAgentOnboardingService` require):

```js
const { createLoLeadScraperService } = require('./services/loLeadScraperService');
const loLeadScraperService = createLoLeadScraperService({ supabaseAdmin, env: process.env });
```

> Note: `supabaseAdmin` is already defined and null-guarded earlier in `server.cjs`. The factory only calls it inside `runLoLeadScrape`, so construction here is safe even if creds are absent.

- [ ] **Step 2: Add the two endpoints**

Add immediately after the existing `GET /api/admin/lo-outreach/invites` handler (ends around line 31768):

```js
// ── POST /api/admin/lo-leads/run — manual scraper trigger (admin) ──────────────
app.post('/api/admin/lo-leads/run', verifyAdmin, async (req, res) => {
  try {
    const max = Number(req.body?.maxSearches);
    const maxSearches = Number.isFinite(max) && max > 0
      ? Math.min(max, Number(process.env.LO_SCRAPER_MAX_SEARCHES || 100))
      : Number(process.env.LO_SCRAPER_MAX_SEARCHES || 100);
    const result = await loLeadScraperService.runLoLeadScrape({ maxSearches });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[LO Lead Finder] Run failed:', err);
    res.status(500).json({ error: 'scrape_failed' });
  }
});

// ── GET /api/admin/lo-leads — list the scraped pool (admin) ────────────────────
app.get('/api/admin/lo-leads', verifyAdmin, async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    let q = supabaseAdmin
      .from('lo_lead_pool')
      .select('id, email, name, employer, city, source_url, is_role, status, found_at, sent_at')
      .order('found_at', { ascending: false })
      .limit(500);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, leads: data || [] });
  } catch (err) {
    console.error('[LO Lead Finder] List failed:', err);
    res.status(500).json({ error: 'list_failed' });
  }
});
```

- [ ] **Step 3: Verify the server still boots (syntax check)**

Run: `node --check backend/server.cjs`
Expected: no output (exit 0) — file is syntactically valid.

- [ ] **Step 4: Verify the frontend jest suite is still green (nothing got disturbed)**

Run: `npm test`
Expected: PASS — 53/53, unchanged.

- [ ] **Step 5: Commit**

```bash
git add backend/server.cjs
git commit -m "feat(lo-leads): admin endpoints — POST /api/admin/lo-leads/run + GET /api/admin/lo-leads"
```

---

## Task 5: Config + live smoke test (human-assisted)

Phase 1 ends with a real run on the free tier so we can judge email quality before building Phase 2 UI.

- [ ] **Step 1: Document the required env vars**

These go in Render (backend service) env — the human adds them. Confirm names match what the code reads:
- `GOOGLE_CSE_API_KEY` — Google Custom Search API key
- `GOOGLE_CSE_ID` — Programmable Search Engine ID (configured to "Search the entire web")
- `LO_SCRAPER_MAX_SEARCHES` — set to `100` (free tier)

- [ ] **Step 2: One-time Google setup (hand to the human, one step at a time)**

1. Create a Google Cloud project at console.cloud.google.com.
2. Enable "Custom Search API" (APIs & Services → Library).
3. Create an API key (APIs & Services → Credentials) → that is `GOOGLE_CSE_API_KEY`.
4. Create a Programmable Search Engine at programmablesearchengine.google.com, set it to search the entire web → copy the "Search engine ID" → that is `GOOGLE_CSE_ID`.
5. Paste both + `LO_SCRAPER_MAX_SEARCHES=100` into Render backend env. Save (service redeploys).

- [ ] **Step 3: Run the migration**

Human pastes `lo-lead-pool-migration.sql` into the Supabase SQL editor and runs it.

- [ ] **Step 4: Trigger a real run (small cap to protect the free quota)**

After redeploy, call the endpoint (admin auth required — use an admin session token):

```bash
curl -X POST https://home-listing-ai-backend.onrender.com/api/admin/lo-leads/run \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"maxSearches": 5}'
```

Expected: JSON like `{ "success": true, "searchesUsed": 5, "pagesScanned": N, "leadsAdded": M, "dupesSkipped": K }`.

- [ ] **Step 5: Inspect real email quality (the Phase 1 decision gate)**

```bash
curl https://home-listing-ai-backend.onrender.com/api/admin/lo-leads \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Eyeball the `leads`: are they real, individual LO emails (good) or mostly `info@`/junk (means we bolt on Apollo enrichment in Phase 2)? **This is the go/no-go for how Phase 2 is built.**

- [ ] **Step 6: Commit any doc notes**

If you captured the yield results, append them to the spec under a "Phase 1 results" note and commit.

```bash
git add docs/superpowers/specs/2026-06-19-lo-lead-finder-design.md
git commit -m "docs(lo-leads): record Phase 1 email-yield results"
```

---

## Phase 2 (not in this plan — built only after Task 5's decision gate)

Full admin review panel (`AdminLoLeadFinderPanel.tsx`), bulk-send into the LO Acquisition Link, per-row skip, unsubscribe endpoint + CAN-SPAM footer verification, daily worker cron, city rotation persistence via `lo_scraper_state`, all 10 cities. A separate plan will cover it.

---

## Self-Review Notes

- **Spec coverage:** Phase 1 sections of the spec — `lo_lead_pool` (Task 1), `lo_suppression_list` (Task 1), `lo_scraper_state` (Task 1), `extractContacts` (Task 2), `createLoLeadScraperService` with cap/dedup/suppression/no-op guard (Task 3), admin run + list endpoints (Task 4), env + smoke test (Task 5), team-page query templates (Task 3 `DEFAULT_QUERY_TEMPLATES`). Phase 2 items (UI, cron, bulk send, unsubscribe wiring) are explicitly deferred and listed above — matches spec section 0.
- **Type consistency:** `extractContacts` returns `{ email, is_role, employer }`; Task 3 reads exactly those keys; insert rows use column names matching the Task 1 migration (`email`, `employer`, `is_role`, `city`, `source_url`, `status`). `runLoLeadScrape` returns `{ searchesUsed, pagesScanned, leadsAdded, dupesSkipped }` (plus `skipped` on no-op) — consumed unchanged by the Task 4 endpoint.
- **No placeholders:** every code step is complete and runnable.
