# HomeListingAI — LO Platform Build Guide
**Last updated: May 14, 2026**
**Status: Steps 1–3 complete + Partner Platform built. Step 4 is next.**

---

## QUICK ORIENTATION (read this first)

This app has pivoted from a realtor tool to a **loan officer (LO) platform**.

- LOs pay. Realtors are free partners the LO invites.
- Every listing co-brands the LO + realtor side by side.
- LO controls their visibility per marketing piece.
- Buyer leads route to both — LO gets every one.
- LO and realtor share a per-listing analytics dashboard.

**Working directory:** `.claude/worktrees/reverent-hodgkin/`
**.env:** symlinked from main repo root — already in place ✅
**node_modules:** worktree backend symlinks to main `/backend/node_modules` ✅

---

## BUILD TRACKER

| # | Feature | Status | Files Touched |
|---|---|---|---|
| 1 | LO account type + onboarding flow | ✅ Done | See Section 3.1 |
| 2 | LO → listing association UI | ✅ Done | See Section 3.2 |
| 3 | Dual co-branding on listing page | ✅ Done | See Section 3.3 |
| 4 | LO Today Dashboard | ✅ Done | See Section 3.4 |
| 5 | LO gatekeeper (lead stamping + dual notify) | ✅ Done | See Section 3.5 |
| 6 | Partner platform — full hierarchy (LO → Agents → Listings → Leads) | ✅ Done | See Section 3.6 |
| 7 | Magic link agent onboarding | ✅ Done | See Section 3.7 |
| 8 | Pre-qual 5-question form | ✅ Done | See Section 3.8 |
| 9 | Mark as Sold + celebration moment | ✅ Done | See Section 3.9 |
| 10 | LO ROI widget per listing | ✅ Done | See Section 3.10 |
| 11 | LO sidebar nav (partner-aware) | ✅ Done | See Section 3.11 |
| 12 | Per-piece branding toggles (LO controls) | 🔲 Queued | — |
| 13 | LO AI chatbot (training, upload, personality) | 🔲 Queued | — |
| 14 | Smart routing between LO bot and listing bot | 🔲 Queued | — |
| 15 | Per-listing shared dashboard + public link | 🔲 Queued | — |
| 16 | Dual SMS notifications | 🔲 Queued | — |
| 17 | Office tier (multi-LO account management) | 🔲 Queued | — |
| 18 | White label setup | 🔲 Queued | — |

---

## SECTION 1 — Pricing

| Tier | Price | Who |
|---|---|---|
| LO Partner | $149/mo | Single LO |
| Office | $299/mo | Up to 5 LOs, company branding |
| White Label | $499+/mo | Unlimited LOs, custom domain |
| Setup Fee | $99 one-time | Done-for-you onboarding (optional) |

- **Trial:** 5 days free, no card required to start
- **Guarantee:** 60-day money-back from first charge
- Free tier and Starter/Pro plans **REMOVED** entirely

**Still TODO (after full build):**
- Create Stripe products for all three LO plans
- Add to `.env`: `STRIPE_LO_PARTNER_PRICE_ID`, `STRIPE_OFFICE_PRICE_ID`, `STRIPE_WHITE_LABEL_PRICE_ID`

---

## SECTION 2 — Database (Migration: `lo-overhaul-foundation.sql`) ✅ Run

| Table / Column | What it is |
|---|---|
| `agents.account_type` | `'realtor' \| 'lo' \| 'admin'` — defaults to `'lo'` on new signup |
| `agents.nmls_number` | LO NMLS license number |
| `agents.lending_states` | TEXT[] — states the LO is licensed in |
| `listing_lo_assignments` | Joins an LO to a listing (with `branding_enabled` flag) |
| `listing_branding_toggles` | Per-piece LO visibility control (listing page, flyer, QR, etc.) |
| `listing_dashboard_tokens` | Unique token per listing for public shareable dashboard link |

**RLS:**
- LO can SELECT listings they're in `listing_lo_assignments` for
- `listing_dashboard_tokens`: anyone with the token can read (public)
- Plans table: `lo_partner`, `office`, `white_label` rows seeded

---

## SECTION 3 — What's Been Built

### 3.0 — Foundation (May 13, 2026)

**Pricing UI**
- `src/components/ComparePlansModal.tsx` — LO Partner / Office / White Label plans
- `src/components/PricingSectionNew.tsx` — fully rewritten for LO audience
- `src/components/CheckoutPage.tsx` — 5-day trial, $149, 60-day guarantee
- `src/components/settings/BillingSettings.tsx` — LO plan labels + features
- `src/components/dashboard-command/BillingCommandPage.tsx` — LO upgrade buttons

**Auth**
- `src/services/authService.ts` — `AgentProfile` extended with `accountType`, `nmlsNumber`
- Fixed: session recovery on page refresh now loads `agentProfile` properly

**Backend**
- `enqueueLeadCaptureNotifications` — dual-notify (LO + realtor) on every lead event
- Stripe checkout: server-side priceId validation + customer deduplication
- Mailgun: removed unsafe fallback key; fails loud on misconfiguration

**Billing Engine**
- `backend/services/billingEngine.js` — `LO_PARTNER`, `OFFICE`, `WHITE_LABEL` plan IDs
- Unlimited listings (`-1`) for all LO plans

**Notifications**
- `src/services/notificationService.ts` — `sendEmailToUsers` now calls real `/api/email/send`

---

### 3.1 — Step 1: LO Account Type + Onboarding Flow (May 13, 2026) ✅

**What it does:**
New signups are auto-tagged as `account_type = 'lo'`. They skip the realtor onboarding and go through a 3-step LO-specific flow instead.

**Files changed:**

| File | What changed |
|---|---|
| `backend/services/agentOnboardingService.js` | Added `account_type: 'lo'` to INSERT on all new registrations |
| `backend/server.cjs` | `buildOnboardingResponse` now returns `account_type` + `lo_profile` (NMLS, states, company) |
| `backend/server.cjs` | Added `PATCH /api/lo/profile` — saves NMLS, lending_states, company, name, phone, headshot directly to `agents` |
| `backend/server.cjs` | Added `POST /api/lo/invite-realtor` — sends branded invite email, stores pending invite in agent metadata |
| `src/services/onboardingService.ts` | `OnboardingState` now includes `account_type` and `lo_profile` fields |
| `src/demo/demoData.ts` | Demo onboarding state updated with `account_type: 'lo'` + `lo_profile` |
| `src/App.tsx` | `DashboardRouteGate` routes LOs to `/dashboard/lo-onboarding`, others to `/dashboard/onboarding` |
| `src/App.tsx` | Lazy-loaded `LOOnboardingPage`, added routes in both dashboard route blocks |
| `src/components/dashboard-command/LOOnboardingPage.tsx` | **NEW** — 3-step LO onboarding (see below) |
| `src/components/SignUpPage.tsx` | Updated copy, feature highlights, and CTA for LO audience. Plans: `lo_partner/office/white_label` |

**LOOnboardingPage — 3 steps:**
- **Step 1 (Your LO profile):** Name (required), NMLS #, company/lender, phone, email, headshot upload, state license toggle grid (50 states + DC). Saves via `PATCH /api/lo/profile`.
- **Step 2 (Invite a realtor):** Optional. Enter realtor name + email → sends branded invite email + stores pending invite in agent metadata. Can skip.
- **Step 3 (You're live):** Confirmation screen with 3 next-step prompts (add listing, train LO AI, billing). Marks `onboarding_completed = true`, redirects to `/dashboard/today`.

**Route flow:**
```
Sign up → /dashboard → DashboardRouteGate checks onboarding_completed
  → not complete + account_type = 'lo' → /dashboard/lo-onboarding
  → not complete + account_type = 'realtor' → /dashboard/onboarding
  → complete → /dashboard/today
```

---

### 3.2 — Step 2: LO → Listing Association UI (May 13, 2026) ✅

**What it does:**
LOs can search all listings in the system, add themselves as co-brand partner on any listing, and remove themselves. Assigned listings show up in "My Listings" with co-brand status.

**Files changed:**

| File | What changed |
|---|---|
| `backend/server.cjs` | Added `GET /api/lo/listings` — fetch all listings this LO is assigned to |
| `backend/server.cjs` | Added `POST /api/lo/listings/:listingId/assign` — upsert into `listing_lo_assignments` |
| `backend/server.cjs` | Added `DELETE /api/lo/listings/:listingId/assign` — remove LO from a listing |
| `backend/server.cjs` | Added `GET /api/listings/search?q=` — search all listings by address/city/title |
| `src/components/dashboard-command/LOListingsPage.tsx` | **NEW** — LO listing management page (see below) |
| `src/components/dashboard-command/ListingsCommandPage.tsx` | Added LO redirect: detects `account_type = 'lo'` on mount, redirects to `/dashboard/lo-listings` |
| `src/App.tsx` | Added `LOListingsPage` lazy import + `lo-listings` route in all 3 dashboard route blocks |

**LOListingsPage — two sections:**
- **Find a listing:** Debounced search (350ms) → calls `GET /api/listings/search?q=` → shows results not already assigned → "Add me" button calls `POST /api/lo/listings/:id/assign`.
- **My Listings:** Loads from `GET /api/lo/listings` on mount — shows hero photo, address, price, beds/baths, publish status, co-brand badge. "Remove" button calls `DELETE /api/lo/listings/:id/assign`.
- Full demo mode support with `DEMO_ASSIGNED` + `DEMO_SEARCH` fixtures.

**Route flow:**
```
LO clicks "Listings" in sidebar → /dashboard/listings
  → ListingsCommandPage detects account_type = 'lo'
  → redirects to /dashboard/lo-listings
  → LOListingsPage renders
```

---

### 3.3 — Step 3: Dual Co-Branding on the Listing Page (May 14, 2026) ✅

**What it does:**
A timed slide-up sheet appears on the public listing page after 20 seconds OR 60% scroll depth (whichever fires first). It's one-time-per-session (sessionStorage flag). It shows two question buttons — "I want to see this home" (showing request) and "I need pre-approval" — each expanding into an inline lead capture form. Leads submit to the existing `/api/leads/capture` endpoint with `context: 'showing_request'` or `context: 'pre_approval'`. The LO dual-notify (`enqueueLeadCaptureNotifications`) was already wired to notify both parties — no changes needed there.

**Files changed:**

| File | What changed |
|---|---|
| `backend/server.cjs` | Added `GET /api/public/listing/:listingId/lo` — returns LO info for a listing (if `branding_enabled = true`). Returns `{ success: true, lo: null }` if none. |
| `src/components/public/LOContactSheet.tsx` | **NEW** — slide-up sheet with two question buttons + inline forms (showing + pre-approval). Fetches LO from backend; shows agent-only mode if no LO assigned. |
| `src/pages/PublicListingPage.tsx` | Imported + rendered `<LOContactSheet>` with `listingId` and `agent` props. |

**Behavior:**
- Triggers at 20s timer OR 60% scroll depth — whichever fires first
- Session-persisted dismiss (`sessionStorage` key `hlai_lo_sheet_dismissed`) — won't re-pop after dismiss
- Shows agent + LO avatars side by side in the strip when LO is assigned
- "Schedule showing" form: name, email, phone, when (pills), preferred time (pills) → `context: 'showing_request'` → `POST /api/leads/capture`
- "Pre-approval" form: upgraded to full 5-question pre-qual (see Section 3.8) → `POST /api/leads/pre-qual`
- Submit → success state → auto-closes after 3s

---

### 3.4 — LO Today Dashboard (May 14, 2026) ✅

**What it does:**
LO-specific version of the Today page auto-swapped in when `account_type === 'lo'`. Shows a greeting, 4 stat cards (new leads today, total leads, pre-approvals, showing requests), recent leads feed with intent dots, and assigned listings strip with lead counts.

**Files changed:**

| File | What changed |
|---|---|
| `src/components/dashboard-command/LOTodayPage.tsx` | **NEW** — LO Today dashboard (see below) |
| `src/components/dashboard-command/TodayDashboardPage.tsx` | Added `accountType` state; renders `<LOTodayPage />` when `account_type === 'lo'` |
| `backend/server.cjs` | Added `GET /api/lo/dashboard/today` — returns `{ stats, recentLeads, assignedListings }` |

**LOTodayPage:**
- Greeting + time-of-day salutation
- 4 stat cards: New Today / Total Leads / Pre-Approvals (emerald) / Showings (sky) — from `GET /api/lo/dashboard/today`
- Recent leads feed: intent dot (color by context), avatar initials, name + email, context chip, relative time
- My Listings strip: hero thumbnail, address, price, live/draft badge, lead count
- Quick action buttons: All Leads / My Listings / Appointments / Billing
- Full demo data (`DEMO_DATA` fixture) for demo mode

---

### 3.5 — LO Gatekeeper: Lead Stamping + Dual Notify (May 14, 2026) ✅

**What it does:**
Every lead captured on a listing now stamps the LO's ID directly on the lead row (`lo_agent_id`). The LO gets notified of every lead regardless of `branding_enabled` — visibility controls what buyers see, not who gets the data.

**Architecture:**

| Decision | Implementation |
|---|---|
| LO ID stamped at capture | `leads.lo_agent_id` set via `listing_lo_assignments` lookup at `POST /api/leads/capture` time |
| LO always gets notified | `enqueueLeadCaptureNotifications` removed `.eq('branding_enabled', true)` filter on LO lookup |
| Context labels | Single `contextLabel` var (`'wants a showing'` / `'wants pre-approval'` / `'just reached out'`) used in both agent + LO notifications |
| Clean queries | `WHERE lo_agent_id = X` — no joins through assignment table needed |

**Files changed:**

| File | What changed |
|---|---|
| `backend/server.cjs` | `enqueueLeadCaptureNotifications`: removed `branding_enabled` filter; added `contextLabel` var for both notifications |
| `backend/server.cjs` | `POST /api/leads/capture`: resolves LO via `listing_lo_assignments`, stamps `lo_agent_id` on INSERT + deduped UPDATE |
| `supabase-migrations/add-lo-agent-id-to-leads.sql` | **Run ✅** — adds `lo_agent_id UUID` col + 2 indexes + 2 RLS policies |

---

### 3.6 — Partner Platform: Full Hierarchy (May 14, 2026) ✅

**What it does:**
The core platform redesign. LO is the hub. Agents are partners the LO invites. Listings and leads are subordinate. A new Partners tab gives LOs full visibility into every agent they work with — listings, leads, ROI — from one place.

**New backend endpoints:**

| Endpoint | What it does |
|---|---|
| `GET /api/lo/partners` | All partner agents with listings + lead counts |
| `POST /api/lo/partners/invite` | Create invite record, send magic link email to agent |
| `GET /api/lo/listing-limit` | Check published listing count vs plan cap (25 for LO Partner) |
| `POST /api/internal/run-nudge-job` | Find uncontacted leads 24–48h old, send nudge notifications |
| `PATCH /api/leads/:leadId/contacted` | Mark lead contacted, flip status to 'Contacted' |

**Files changed:**

| File | What changed |
|---|---|
| `src/components/dashboard-command/LOPartnersPage.tsx` | **NEW** — full partner management page (see below) |
| `src/App.tsx` | Lazy-loaded `LOPartnersPage`; added `lo-partners` route in demo, blueprint, and main dashboard blocks |
| `supabase-migrations/lo-platform-v2.sql` | **Run ✅** — `agent_invites`, `lo_agent_partnerships`, `pre_qual_submissions` tables; new cols on `listings`, `leads`, `agents` |

**LOPartnersPage features:**
- `Partner` interface: partnershipId, agentId, name, email, phone, headshotUrl, company, totalLeads, listings[], joinedAt
- **PartnerCard**: listing strip (up to 3 thumbnails), lead count, email/call action buttons, "View Partner →"
- **PartnerDetail**: slide-in right drawer — stats grid, contact info, full listing list with `LOROIWidget` per listing, copy partner link
- **InviteModal**: name + email input → `POST /api/lo/partners/invite` → success state with "Another invite" option
- **Pending invites** section in amber — shows email, sent date
- Empty state with CTA when no partners yet
- Full demo data: `DEMO_PARTNERS` (2 partners) + `DEMO_PENDING` (1 invite)

**DB — `lo-platform-v2.sql` (Run ✅):**
- `agent_invites`: id, lo_agent_id, email, name, token (UUID), claimed_at, expires_at, created_at + RLS
- `lo_agent_partnerships`: id, lo_agent_id, agent_id, created_at + RLS
- `listings`: added sold_at, archived_at, sold_price, total_views, total_leads cols
- `leads`: added contacted_at, nudge_sent_at, nudge_count cols
- `pre_qual_submissions`: id, lead_id, listing_id, purchase_timeline, credit_range, income_range, down_payment, property_type + RLS
- `agents`: added invited_by_lo_id, agent_portal_slug, referral_code + backfill
- SQL functions: `increment_listing_views()`, `increment_listing_leads()`

---

### 3.7 — Magic Link Agent Onboarding (May 14, 2026) ✅

**What it does:**
LO enters agent name + email in the invite modal. Agent receives a branded email with a unique claim link. Agent clicks link, sees LO's headshot/name/NMLS on a dark claim page, sets a password, account is created with `account_type: 'agent'` + an `lo_agent_partnerships` record automatically inserted.

**Flow:**
```
LO: enter name + email → POST /api/lo/partners/invite
  → agent_invites row created (UUID token, 7-day expiry)
  → Mailgun sends branded invite email with /agent/claim/:token link

Agent: visits /agent/claim/:token
  → GET /api/agent/claim/:token → validates token, returns LO branding
  → Sees: LO headshot, name, company, NMLS #, personalized message
  → Sets password → POST /api/agent/claim/:token
  → Supabase auth user created, agents row upserted (account_type: 'agent')
  → lo_agent_partnerships row inserted
  → Redirect to /signin after 3s
```

**Files changed:**

| File | What changed |
|---|---|
| `src/pages/AgentClaimPage.tsx` | **NEW** — dark claim page with LO branding + password form |
| `src/App.tsx` | Added public route `/agent/claim/:token` → `<AgentClaimPage />` |
| `backend/server.cjs` | `GET /api/agent/claim/:token` — validate + return invite + LO info |
| `backend/server.cjs` | `POST /api/agent/claim/:token` — create Supabase auth user + agents row + partnership |

**Error states handled:**
- Invalid / expired token
- Already claimed
- Email already registered → "Try signing in instead"
- Network error

---

### 3.8 — Pre-Qual 5-Question Form (May 14, 2026) ✅

**What it does:**
The "I need pre-approval" path in `LOContactSheet` was upgraded from 2 simple pills (pre-approved? / budget) to a full 5-question pre-qual form. Answers are stored in `pre_qual_submissions` and the lead is created/updated via a new endpoint.

**Questions:**
1. **Purchase timeline** — ASAP / 1–3 months / 3–6 months / Just looking
2. **Estimated credit score** — Excellent (740+) / Good (680–739) / Fair (580–679) / Unsure
3. **Annual household income** — Under $50k / $50k–$100k / $100k–$150k / $150k+
4. **Down payment available** — Under 5% / 5–10% / 10–20% / 20%+
5. **Property will be used as** — Primary Home / Investment / Vacation

**Files changed:**

| File | What changed |
|---|---|
| `src/components/public/LOContactSheet.tsx` | Replaced 2-pill pre-approval section with 5-question form; new `handlePreQualSubmit` calls `POST /api/leads/pre-qual`; showing flow unchanged |
| `backend/server.cjs` | Added `POST /api/leads/pre-qual` — creates/updates lead + inserts `pre_qual_submissions` row; notifies LO + agent |

**Payload to `POST /api/leads/pre-qual`:**
```json
{
  "listing_id": "...",
  "full_name": "...",
  "email": "...",
  "phone": "...",
  "consent_sms": true,
  "purchase_timeline": "ASAP",
  "credit_range": "Excellent (740+)",
  "income_range": "$100k–$150k",
  "down_payment": "10–20%",
  "property_type": "Primary Home"
}
```

---

### 3.9 — Mark as Sold + Celebration Moment (May 14, 2026) ✅

**What it does:**
Published listing cards in the agent `ListingsCommandPage` now have a 🎉 Mark Sold button. Clicking opens an inline sold-price prompt. Confirming marks the listing sold on the backend, flips the card badge to "Sold" (amber), and fires a celebration modal with the listing's lifetime stats. The modal offers "Archive it" (removes from list) or "Keep Active" (stays in sold state).

**Files changed:**

| File | What changed |
|---|---|
| `src/components/dashboard-command/ListingsCommandPage.tsx` | Added `CelebrationData` type; `markingSoldId`, `soldPriceInput`, `soldPromptId`, `celebration` state; `handleMarkSold` + `handleArchive` handlers; inline sold-price prompt; celebration modal; "Sold" amber badge variant; 🎉 Mark Sold button on published cards |
| `backend/server.cjs` | `PATCH /api/listings/:listingId/sold` — sets `sold_at`, `sold_price`, `status: 'sold'`; returns `{ sold_price, total_leads, total_views }` for the modal |
| `backend/server.cjs` | `PATCH /api/listings/:listingId/archive` — sets `archived_at`, `status: 'archived'` |

**Celebration modal:**
- 🎉 emoji + "Listing Sold!" headline
- Sold price (amber block, if entered)
- Views + Leads + ✓ Done in 3-up grid
- "Archive it" → removes from list | "Keep Active" → dismisses modal, card stays in "Sold" state

---

### 3.10 — LO ROI Widget Per Listing (May 14, 2026) ✅

**What it does:**
A lightweight stats widget that shows views, leads, pre-qualifications, and a sold banner for any listing. Embedded in `LOPartnersPage` PartnerDetail listing cards — replaces the old simple view/lead counters with richer data from the dedicated LO ROI endpoint.

**Files changed:**

| File | What changed |
|---|---|
| `src/components/dashboard-widgets/LOROIWidget.tsx` | **NEW** — fetches `GET /api/lo/listings/:listingId/roi`; shows 3-up grid (views / leads / pre-quals) + sold banner + conversion rate |
| `src/components/dashboard-command/LOPartnersPage.tsx` | Imported `LOROIWidget`; replaced simple view/lead counters in PartnerDetail listing cards |
| `backend/server.cjs` | Added `GET /api/lo/listings/:listingId/roi` — returns `{ views, leads, preQuals, soldAt, soldPrice, address, status }` |

**Widget behavior:**
- Loading: animated skeleton
- Pre-quals shown in emerald (high-intent signal)
- Sold banner in amber with date + sold price
- Lead conversion rate shown as "X% lead conversion" below grid
- Demo mode: returns `DEMO_ROI` fixture

---

### 3.11 — LO Sidebar Nav (May 14, 2026) ✅

**What it does:**
The sidebar auto-detects `account_type` via `fetchOnboardingState()` and renders the LO-specific nav instead of the realtor nav.

**LO nav items:**
Today → Partners → Listings → Leads → Appointments → Settings

**Files changed:**

| File | What changed |
|---|---|
| `src/components/Sidebar.tsx` | Added `LO_NAV_ITEMS` constant; `accountType` state + `useEffect` to fetch; `activeNavItems` switches based on `isLO`; `pathMap` extended with `/lo-listings` + `/lo-partners` routes |

---

## SECTION 4 — What's Next (Step 12)

**Per-Piece Branding Toggles (LO Controls)**

LO can turn their co-brand on/off per marketing piece from their dashboard. Currently `branding_enabled` on `listing_lo_assignments` is a global toggle. Step 12 wires up the per-piece `listing_branding_toggles` table that's already in the DB.

**`piece_type` values:** `listing_page`, `share_kit`, `qr`, `social`, `flyer`, `open_house`

**What needs to happen:**
1. LO dashboard section: per-listing toggle grid (listing page, share kit, QR, social, flyer, open house)
2. Backend: `GET/PATCH /api/lo/listings/:listingId/branding-toggles`
3. Each marketing piece reads from `listing_branding_toggles` when rendering co-brand

---

## SECTION 5 — Key Files Reference

**Frontend — LO Dashboard**

| File | Purpose |
|---|---|
| `src/App.tsx` | Root routing — `DashboardRouteGate` + all route definitions |
| `src/components/Sidebar.tsx` | Nav sidebar — auto-switches to LO nav based on `account_type` |
| `src/components/dashboard-command/LOTodayPage.tsx` | LO Today dashboard (stats, leads, listings) |
| `src/components/dashboard-command/LOPartnersPage.tsx` | Partner management — invite, view, PartnerDetail drawer |
| `src/components/dashboard-command/LOListingsPage.tsx` | LO listing search + assign page |
| `src/components/dashboard-command/LOOnboardingPage.tsx` | LO onboarding (3 steps: profile, invite realtor, done) |
| `src/components/dashboard-command/ListingsCommandPage.tsx` | Agent listing cards — now has Mark Sold + celebration modal |
| `src/components/dashboard-command/TodayDashboardPage.tsx` | Swaps in `LOTodayPage` when `account_type === 'lo'` |
| `src/components/dashboard-widgets/LOROIWidget.tsx` | LO ROI widget — views / leads / pre-quals / sold banner |
| `src/components/public/LOContactSheet.tsx` | Slide-up sheet on listing page — showing + 5-question pre-qual |
| `src/pages/AgentClaimPage.tsx` | Agent magic-link claim page — `/agent/claim/:token` |

**Frontend — Auth / Services**

| File | Purpose |
|---|---|
| `src/services/authService.ts` | Auth + `AgentProfile` type (has `accountType`, `nmlsNumber`) |
| `src/services/onboardingService.ts` | `OnboardingState` type + fetch/patch helpers |
| `src/demo/demoData.ts` | Demo data — keep `account_type` + `lo_profile` in sync |

**Frontend — Pricing / Billing**

| File | Purpose |
|---|---|
| `src/components/SignUpPage.tsx` | Signup (LO copy, LO feature highlights) |
| `src/components/ComparePlansModal.tsx` | Pricing compare modal |
| `src/components/PricingSectionNew.tsx` | Landing page pricing section |
| `src/components/CheckoutPage.tsx` | Checkout flow |
| `src/components/settings/BillingSettings.tsx` | In-dashboard billing page |

**Backend**

| File | Purpose |
|---|---|
| `backend/server.cjs` | Express monolith — all API routes |
| `backend/services/billingEngine.js` | Stripe plan logic, limits, webhook handling |
| `backend/services/emailService.js` | Mailgun email sending |
| `backend/services/agentOnboardingService.js` | `registerAgent` — new signups get `account_type: 'lo'` |

**Migrations (all run ✅)**

| File | What it adds |
|---|---|
| `supabase-migrations/lo-overhaul-foundation.sql` | Core LO tables: `listing_lo_assignments`, `listing_branding_toggles`, `listing_dashboard_tokens`; NMLS + lending_states on `agents` |
| `supabase-migrations/add-lo-agent-id-to-leads.sql` | `leads.lo_agent_id` col + 2 indexes + 2 RLS policies |
| `supabase-migrations/lo-platform-v2.sql` | `agent_invites`, `lo_agent_partnerships`, `pre_qual_submissions`; sold/archived/views/leads cols on `listings`; contacted/nudge cols on `leads`; `invited_by_lo_id`, `referral_code` on `agents` |

---

## SECTION 6 — Environment Variables

`.env` is symlinked from the main repo root into the worktree. No action needed unless adding new vars.

```bash
# Mailgun — real signing key already set ✅
MAILGUN_API_KEY=...
MAILGUN_WEBHOOK_SIGNING_KEY=...   ← confirmed real key

# Stripe — LO plans to be created after full build
STRIPE_LO_PARTNER_PRICE_ID=       ← add when Stripe product created
STRIPE_OFFICE_PRICE_ID=           ← add when Stripe product created
STRIPE_WHITE_LABEL_PRICE_ID=      ← add when Stripe product created

# SMS — built but gated behind feature flags (Telnyx)
SMS_COMING_SOON=true              ← flip to false when carrier approval lands
FEATURE_FLAG_SMS_ENABLED=false    ← flip to true when carrier approval lands
```

---

## SECTION 7 — Local Dev

```bash
# Start frontend + backend
npm run start-server

# Frontend: http://localhost:5175
# Backend:  http://localhost:3002

# Stop
npm run stop-server
```

**If backend fails with `Cannot find module`:**
```bash
ln -sf /path/to/main/repo/backend/node_modules \
       .claude/worktrees/reverent-hodgkin/backend/node_modules
```

---

## SECTION 8 — Decisions Locked In (Don't Re-litigate)

- **LO is the paying customer** — realtors are free riders on the LO's account
- **LO controls co-branding** — realtor has no toggle, LO decides what shows
- **LO is the gatekeeper** — gets notified of EVERY lead on their assigned listings regardless of `branding_enabled`. Visibility toggle controls what buyers see, NOT who gets the lead.
- **`lo_agent_id` stamped at capture** — set on the lead row at capture time via `listing_lo_assignments` lookup. Enables `WHERE lo_agent_id = X` queries with no joins.
- **Off = realtor-only** — when LO hides themselves, no blank slot appears
- **Agent portal = same app, different account_type** — no separate URL. `account_type: 'agent'` gets agent nav; reuses all existing routing.
- **Magic link onboarding** — LO invites by email → agent claims via `/agent/claim/:token` → sets password → done. No separate signup flow.
- **Unlimited listings for LO plans** (`-1`) — average LO has 5–10 listings. 25-cap on concurrent *published* for LO Partner as a safety valve.
- **Pre-qual = 5 questions, no credit pull** — timeline, credit, income, down payment, property type. Stored in `pre_qual_submissions`, always routed to LO first.
- **Sold flow = celebration, then choose** — marking a listing sold shows lifetime stats. LO/agent decides to archive or keep active.
- **One AI conversation, smart routing** — LO bot and listing bot blend into one flow
- **"Chat with [LO Name]" button** — dedicated entry point to LO bot directly
- **Public dashboard link** — no login required to view listing analytics
- **5-day trial, no card required** — short by design (urgency > procrastination)
- **60-day money-back** — removes all purchase risk for new LOs
- **$99 done-for-you setup** — optional, team handles it manually for now
- **No free tier** — removed entirely. Trial only.
- **SMS is built** (Telnyx) — behind a feature flag, flip when carrier approval lands
- **All new signups = LO** — `account_type = 'lo'` set automatically at registration

---

## SECTION 9 — The Four Core Systems (Big Picture)

### System 1 — Dual Co-Branding
- LO + realtor appear side by side on every marketing piece
- LO controls visibility per piece (toggle per `listing_branding_toggles.piece_type`)
- `piece_type` values: `listing_page`, `share_kit`, `qr`, `social`, `flyer`, `open_house`
- Off = realtor-only display (no empty slot)
- DB ready ✅ | UI: Step 3–4 of build

### System 2 — Two AI Chatbots
- **Listing AI** (existing, realtor-owned): answers property questions
- **LO AI** (new, LO-owned): financing questions, pre-qual, rates
- One conversation with smart routing by question type
- "Chat with [LO Name]" button → opens LO bot directly
- LO uploads docs + trains their bot
- DB ready ✅ | Build: Steps 5–6

### System 3 — Per-Listing Shared Dashboard
- Public shareable link — no login to view
- Both LO and realtor can access via login too
- Shows: views, leads, engagement, financing vs property split
- Token: `listing_dashboard_tokens`
- DB ready ✅ | Build: Step 7

### System 4 — Dual Notifications
- Every lead → email + SMS to both LO and realtor
- LO dual-notify already wired in `enqueueLeadCaptureNotifications` ✅
- Just needs LO linked to listings (Step 2) to start firing
- SMS behind feature flag — flip when carrier approval lands
- Build: Step 8
