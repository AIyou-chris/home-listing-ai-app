# LO Lead Finder — Design Spec

**Date:** 2026-06-19
**Status:** Approved (pending user spec review)
**Goal:** Automatically find prospective loan officers (with email) and feed them into the existing LO Acquisition Link outreach funnel — cheap/free and hands-off.

---

## 1. Purpose

Recruit loan officers as customers. The scraper finds real LOs + their email by running Google searches per city, then parks the leads in a pool the admin reviews and sends the existing **LO Acquisition Link** to.

**This is a growth/admin tool, not a product feature.** It does not serve the three product Golden Rules (those measure customer-facing value); it fills the *business's* LO-acquisition funnel. It IS held to Golden Rule #4 (Compliant by Default) — see CAN-SPAM handling below.

**Isolation guarantee:** everything here is purely additive — one new table, admin-only endpoints, one worker job, one admin panel. It touches no existing table, no product code path, no LO/agent/buyer flow. If the scraper failed entirely, the app would be unaffected.

## 0. Build in two phases (ship thin first)

- **Phase 1 — Prove the engine.** Scraper service + `lo_lead_pool` table + suppression list + a manual "Run now" admin trigger. Run free against Dallas + Houston, inspect real email quality. Decide go/no-go on enrichment BEFORE building the full UI.
- **Phase 2 — Wrap it.** Full admin review panel, bulk-send into the Acquisition Link, daily cron, all 10 cities.

This spec covers the full design; the implementation plan sequences Phase 1 first.

---

## 2. Why Google Custom Search API (not raw scraping)

- Scraping `google.com`, LinkedIn, Zillow, etc. violates ToS, triggers anti-bot blocking, and breaks constantly — the opposite of "auto."
- **Google Custom Search JSON API** is the official, legal door: free 100 searches/day, then $5 per 1,000 (cap 10,000/day).
- Billing is **per search query, not per lead** — leads with no email cost nothing extra.
- NMLS Consumer Access was considered and rejected: it has no email data.

---

## 3. Flow

```
Daily cron (Render worker)
  → for each city in rotation (capped at LO_SCRAPER_MAX_SEARCHES)
    → Google Custom Search API: team-page-targeted queries (see 3.7)
        e.g. mortgage loan officers {city} "our team"
             "loan officer" {city} email
    → for each result URL
      → fetch page HTML (reuse existing extract-url fetch logic)
      → extract ALL emails + name/employer via pattern match
      → for each email: if has email AND not in pool AND not in suppression list
          → insert as 'new'
  → Admin opens "Lead Finder" panel
    → reviews pooled leads
    → selects + clicks "Send Acquisition Link"
    → reuses existing POST /api/admin/lo-outreach/invite (the funnel that already exists)
      (acquisition email already includes/【to be verified】 must include unsubscribe + address)
    → lead marked 'sent'
```

**Why team-page queries:** brokerage "Meet Our Team" / staff-directory pages list multiple LOs with direct emails in structured HTML — far higher email yield and quality than generic result pages. Same API, same cost. Generic `loan officers in {city}` stays as a fallback query template.

**Email-only by design:** a result with no extractable email is discarded and never stored.

**Dedup:** `email` column is `unique`; re-finding the same LO is a no-op.

---

## 4. Components

### 4.1 New table `lo_lead_pool`
Idempotent migration `lo-lead-pool-migration.sql` in repo root (user runs in Supabase SQL editor).

| column      | type        | notes |
|-------------|-------------|-------|
| id          | uuid PK     | gen_random_uuid() |
| email       | text UNIQUE NOT NULL | the dedup key; no email = no row |
| name        | text        | nullable |
| employer    | text        | nullable (brokerage/lender) |
| city        | text        | which search produced it |
| source_url  | text        | page the email came from |
| status      | text NOT NULL default 'new' | new \| sent \| skipped |
| found_at    | timestamptz NOT NULL default now() |
| sent_at     | timestamptz | set when acquisition link sent |

Indexes: `email` (unique), `status`, `found_at desc`.

### 4.1b New table `lo_suppression_list` (CAN-SPAM)
Same migration file. Anyone who unsubscribes or hard-bounces lands here and is never re-scraped or re-emailed.

| column      | type        | notes |
|-------------|-------------|-------|
| email       | text PK     | the suppressed address (lowercased) |
| reason      | text        | unsubscribe \| bounce \| manual |
| added_at    | timestamptz NOT NULL default now() |

- Scraper checks it before insert (suppressed email → skip).
- Sender checks it before send (belt + suspenders).
- An unsubscribe link in the acquisition email resolves to a public endpoint that inserts here. **Phase 1 stubs the table + checks; the unsubscribe endpoint/footer wiring is finalized in Phase 2 alongside send.**

### 3.7 Query templates (tunable constant)
Ordered list of query templates, `{city}` interpolated. Defaults:
1. `mortgage loan officers {city} "our team"`
2. `"loan officer" {city} email`
3. `{city} mortgage company loan officer staff`
4. `loan officers in {city}` (fallback)

### 4.2 Scraper service — `backend/services/loLeadScraperService.js`
- `runLoLeadScrape({ maxSearches })` — main entry. Iterates city rotation, calls Google API, fetches pages, extracts, inserts. Returns `{ searchesUsed, pagesScanned, leadsAdded, dupesSkipped }`.
- `extractContacts(html, pageUrl)` — pulls email(s) + best-guess name/employer from a page. Email regex with junk filtering (drops `noreply@`, image/asset emails, obvious placeholders).
- City rotation persisted so each day continues where the last left off (avoid re-scraping same city daily). Stored in a tiny `lo_scraper_state` row or a Supabase key — decided in implementation; default to a `lo_scraper_state` single-row table.
- Guards: no-op with a logged warning if Google keys missing (consistent with existing Supabase null-guard pattern). Hard stop at `maxSearches`.

### 4.3 Worker cron
- Registered in the worker (`schedulerService.js` or worker entry) to fire once/day.
- Calls `runLoLeadScrape({ maxSearches: LO_SCRAPER_MAX_SEARCHES })`.
- `LO_SCRAPER_MAX_SEARCHES` env var, **default 100** (free tier). Raising it post-billing is the entire "upgrade."

### 4.4 Admin endpoints (`backend/server.cjs`, `verifyAdmin`)
- `GET  /api/admin/lo-leads` — list pool (filter by status, paginated).
- `POST /api/admin/lo-leads/:id/send` — send acquisition link to one lead → internally reuses existing invite logic → mark `sent`.
- `POST /api/admin/lo-leads/send-bulk` — send to an array of ids.
- `POST /api/admin/lo-leads/:id/skip` — mark `skipped` (hide junk).
- `POST /api/admin/lo-leads/run` — manual "run now" trigger (same as cron, for testing).

### 4.5 Admin UI — `src/components/admin/AdminLoLeadFinderPanel.tsx`
- Rendered in Marketing Funnels, beside `AdminLoOutreachPanel`.
- Table: email, name, employer, city, source, found date, status.
- Actions: select rows → "Send Acquisition Link"; per-row "Skip"; "Run now" button; status filter.
- Follows existing admin panel styling/patterns.

### 4.6 City defaults (top 10 US mortgage markets)
`Dallas-Fort Worth TX`, `Houston TX`, `Atlanta GA`, `Phoenix AZ`, `Los Angeles CA`, `Miami FL`, `Washington DC`, `Chicago IL`, `New York NY`, `Denver CO`. Editable later; hard-coded default list to start.

---

## 5. Config / Secrets (Render env)
- `GOOGLE_CSE_API_KEY` — Google Custom Search API key.
- `GOOGLE_CSE_ID` — Custom Search Engine ID (configured to search the whole web).
- `LO_SCRAPER_MAX_SEARCHES` — default `100`.

One-time user setup (guided, one step at a time): create Google Cloud project → enable Custom Search API → create API key → create Programmable Search Engine (whole web) → paste both into Render.

---

## 6. Cost

- Free tier: 100 searches/day = **$0**.
- Past free: $5 / 1,000 searches, 10,000/day cap.
- For 1,000–1,500 emails/day (≈25–40% email hit rate): ~300–500 searches/day → **~$1–2/day (~$30–60/mo)**.
- Upgrade path: enable Google Cloud billing + raise `LO_SCRAPER_MAX_SEARCHES`. No code change. Set a Google Cloud hard spend cap so it can never surprise-charge.

---

## 7. Error handling
- Missing Google keys → service no-ops, logs warning, does not crash worker (matches existing guard pattern).
- Google API error/quota → stop the run gracefully, log, leave already-found leads saved.
- Page fetch failure/timeout → skip that URL, continue.
- DB unique-violation on email → treated as dupe, counted, continue.
- All admin endpoints require `verifyAdmin`.

---

## 8. Testing
- Unit: `extractContacts` against sample HTML (real email, `noreply@`, no email, multiple emails, email in image alt).
- Unit: dedup logic (same email twice → one insert).
- Unit: `maxSearches` cap halts the loop.
- Integration (mocked Google API + fetch): full `runLoLeadScrape` returns correct counts.
- Admin endpoint tests: list/send/skip happy paths + `verifyAdmin` gate.
- Run under the pinned `America/Los_Angeles` TZ like the rest of the suite.

---

## 9. Out of scope (YAGNI)
- Apollo/Hunter email enrichment (designed so it can bolt on later — decision made AFTER Phase 1 measures real yield).
- Auto-send (review-first only; auto-send is a future one-flag toggle).
- Phone number scraping (capture if trivially present, but not a goal).
- Per-city scheduling UI (fixed rotation to start).

## 11. Compliance (Golden Rule #4 — non-negotiable)
- Suppression list checked on both scrape and send.
- Acquisition emails must carry a working unsubscribe link + physical mailing address + honest subject (CAN-SPAM). Verify the existing `lo-outreach/invite` email template already does this; if not, add it in Phase 2 before any bulk send.
- No emailing of obvious role/catch-all addresses by default in bulk send (flag `info@`, `admin@`, `noreply@` for manual-only).

---

## 10. Decisions locked
- Source: Google Custom Search API (Option A).
- Email-only: yes.
- Review-first: yes (no auto-send).
- Start on free 100/day; upgrade is a config flip.
- Seed cities: top 10 US mortgage markets above.
