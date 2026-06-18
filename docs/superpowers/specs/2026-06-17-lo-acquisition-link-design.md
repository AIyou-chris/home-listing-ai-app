# LO Acquisition Link — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design locked, ready for implementation plan)

---

## Goal

A tracked outreach tool that HomeListingAI uses to convert prospective Loan Officers
into paying trial customers. An admin enters an LO's details in the Marketing Funnels
page, the system emails that LO a personalized pitch link, and the admin can see who
opened the link and who clicked through to sign up.

It is the inverse of the WOW Link: where the WOW Link is sent *by an LO to an agent*,
this link is sent *by HomeListingAI to a prospective LO*. The admin sender UI deliberately
mirrors the LO's existing WOW Link sender modal (`InviteModal` in
`src/components/dashboard-command/LOPartnersPage.tsx`).

The pitch itself is built around the three things every LO wants:

1. **🔥 Leads** — a pipeline that fills itself
2. **🤝 Partners** — agents who keep coming back
3. **⏰ Time** — the AI handles the busywork

---

## Core Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Experience type | **Dedicated LO pitch page** | A purpose-built marketing page converts better than a re-skinned WOW Link or a fake dashboard. |
| Distribution | **Per-LO tokenized link, admin-sent** | A unique token per LO is required to track opens/clicks. Admin enters LO details and the system emails the link. |
| Untracked fallback | **Plain `/for-loan-officers` still renders** | Same page works without a token for manual sharing (social, LinkedIn) — just no tracking/personalization. |
| Personalization | **Light** — first name in the hero when a token is present | "John, your pipeline…". Page works fine with no name. |
| CTA target | **`/lo-signup`** (existing route) | A dedicated LO signup page already exists. CTAs route there after recording the click. |
| Sending channel | **Email only** | Mirrors the WOW Link sender. SMS is deferred — Textbelt can't send links (see CLAUDE.md). |
| Layout | **Phone-screen / mobile-first** | Most LOs open marketing links on their phone. Matches the WOW Link's app-like feel. |
| Admin location | **Inside the Marketing Funnels page** | User's explicit choice. Built as its own component to avoid bloating the 2000-line funnels panel. |

---

## Page Structure (the pitch page, top → bottom)

A single mobile-first scroll, constrained to a phone-width column
(`max-w-[480px]`), matching `PartnerInvitePage.tsx` conventions (Tailwind, brand blue
`#2563eb` / slate palette, material-symbols icons).

1. **Hero** — Badge "For Loan Officers"; headline *"Your pipeline doesn't have to slow
   down when you're not working."*; subhead; primary CTA **"Start My Free 7-Day Trial →"**;
   trust line "No credit card · Cancel anytime · Live in under 5 minutes". When a token
   with a name is present, prepend the first name to the headline.
2. **Stats bar** — `24/7` works · `3x` more leads · `5 min` to launch.
3. **How it works** — 3-step flow: 🤝 send your agent a magic link → 🏡 listing answers
   buyers 24/7 → 🔥 warm leads come to you, pre-qualified.
4. **Why LOs love it** — the three value props: 🔥 a pipeline that fills itself (leads) ·
   🤝 agents who actually call you back (partners) · ⏰ time to focus on what closes (time).
5. **"This is what your agents get"** — a small static WOW Link listing-card preview
   (price, address, "Talk to the Home" / "Ask About Financing" buttons). Static, not interactive.
6. **Social proof** — one testimonial card. Copy is placeholder; flagged in-code for the
   user to swap for a real quote.
7. **Bottom CTA** — *"Start filling your pipeline today."* + **"Claim My Free Trial →"**.
8. **Footer** — "Powered by HomeListingAI".

Reference mockup: `.superpowers/brainstorm/*/content/lo-pitch-mockup.html` (approved).

### Tracking behavior on the page

- On load with a token: fire `GET /api/public/lo-invite/:token` once. Use the returned
  name for personalization; the GET also records `opened_at` (first open only).
- On any CTA tap: fire-and-forget `POST /api/public/lo-invite/:token/event` with
  `{ event: 'clicked' }`, then `navigate('/lo-signup')`. Never block navigation on the event.
- With no token (`/for-loan-officers`): render fully, fire nothing.

---

## Architecture

### Frontend

- **New page component:** `src/pages/ForLoanOfficersPage.tsx` — mirrors structure and
  styling of `src/pages/PartnerInvitePage.tsx`. Internally organized into small
  presentational sections (Hero, StatsBar, HowItWorks, ValueProps, ListingPreview,
  Testimonial, BottomCTA) co-located in the file.
- **Routes** in `src/App.tsx` (public, lazy-loaded, alongside other public routes):
  - `/for-loan-officers` (no token)
  - `/for-loan-officers/:token` (tracked)
  - Add both paths to the public-route allowlists in `App.tsx` (the arrays that already
    list `/lo-signup`, `/signup`) so they render without auth and without dashboard chrome.
- **CTAs:** record click event, then `navigate('/lo-signup')`.

- **New admin component:** `src/components/admin/AdminLoOutreachPanel.tsx` — rendered
  inside the Marketing Funnels view. Two parts:
  1. **Sender form** mirroring `InviteModal`: Name (optional), Email (required, type email),
     Phone (optional, type tel), Website (optional, type url). "🚀 Send Link →" button,
     disabled until email is non-empty. On success: success state + copy-link button
     (same UX as the WOW Link modal).
  2. **Tracking table** below the form: one row per sent invite — Name · Email ·
     Phone/Website · Sent date · Opened (✓ + time or —) · Clicked (✓ + time or —).
     Same visual language as the LO Platform tables in `AdminLOPage.tsx`.
  - All admin fetches use `AuthService.getInstance().makeAuthenticatedRequest()` with
    relative paths (Bearer token, Vite/Netlify proxy — per CLAUDE.md API auth pattern).
- **Wire into funnels page:** render `AdminLoOutreachPanel` within
  `AdminMarketingFunnelsPanel` (`src/components/admin/AdminMarketingFunnelsPanel.tsx`),
  as a distinct section so it's visible on the Marketing Funnels admin view.

### Backend (`backend/server.cjs`)

Mirrors the proven `agent_invites` WOW Link pattern (token, opened_at, cta_clicked_at,
public event endpoint).

- **Migration** (committed as `lo-outreach-invites-migration.sql` in repo root; user runs
  it in Supabase SQL editor). Table `lo_outreach_invites`:
  - `id` uuid pk default gen_random_uuid()
  - `token` text unique not null (URL-safe random)
  - `lo_name` text null
  - `lo_email` text not null
  - `lo_phone` text null
  - `lo_website` text null
  - `status` text default 'sent'  (sent | opened | clicked)
  - `opened_at` timestamptz null
  - `clicked_at` timestamptz null
  - `created_by` text null  (admin auth id from `resolveRequesterUserId`)
  - `created_at` timestamptz default now()
  - Index on `token`; index on `created_at desc`.
- **Endpoints:**
  - `POST /api/admin/lo-outreach/invite` (admin, `verifyAdmin`): body `{ email, name?, phone?, website? }`.
    Validates email, generates token, inserts row, sends the pitch email via
    `backend/services/emailService.js` containing the link
    `${appBase}/for-loan-officers/${token}`. Returns `{ success, link }`.
  - `GET /api/admin/lo-outreach/invites` (admin, `verifyAdmin`): returns rows ordered by
    `created_at desc` for the tracking table.
  - `GET /api/public/lo-invite/:token` (public): returns `{ success, name }`. On first hit
    (when `opened_at` is null) set `opened_at = now()` and `status = 'opened'`.
  - `POST /api/public/lo-invite/:token/event` (public): body `{ event: 'clicked' }`. Sets
    `clicked_at = now()` and `status = 'clicked'` (only advances status forward).
- **Email:** add a `sendLoOutreachEmail()` (or equivalent) in `emailService.js` — subject
  + short body pitching the LO and linking to their tokenized page. From the standard
  HomeListingAI sender address.

### What this deliberately does NOT include (YAGNI)

- No SMS sending (email only for now).
- No bulk CSV import of LOs (single-LO send, like the WOW Link modal).
- No editing/resending/expiry of invites in v1 (can add later if needed).
- No per-LO analytics dashboard beyond the opened/clicked table.

---

## Data Flow

1. Admin opens Marketing Funnels → LO Outreach section, fills the form, clicks Send.
2. Frontend `POST /api/admin/lo-outreach/invite` → backend inserts row, sends email,
   returns the link. UI shows success + copy button and refreshes the tracking table.
3. LO receives email, taps link → `/for-loan-officers/:token` loads, fires the public GET
   → `opened_at` recorded, hero personalized.
4. LO taps a CTA → public event POST records `clicked_at` → page navigates to `/lo-signup`.
5. Admin reloads the table → sees Opened ✓ / Clicked ✓ per LO.

---

## Error Handling

- **Send failure:** if the insert or email send fails, return a non-200 with a clear error
  code; the UI shows a toast ("Couldn't send — try again"), matching the WOW Link modal.
- **Invalid/unknown token on the public page:** the page still renders the full pitch
  (untracked) rather than showing an error — a prospect should never hit a dead page.
  The public GET simply returns `{ success: false }` and the page ignores it.
- **Event POSTs are fire-and-forget:** failures are swallowed; they never block the page
  or the CTA navigation.

---

## Testing

- **Backend:** the four endpoints are thin DB/email wrappers. Verify manually: send an
  invite (row created, email sent, link returned); open the link (opened_at set once,
  not overwritten on second open); fire the click event (clicked_at set); confirm
  `verifyAdmin` rejects the admin endpoints without a Bearer token.
- **Frontend (visual, in dev preview):**
  - `/for-loan-officers` renders without auth, no dashboard chrome, both CTAs go to `/lo-signup`.
  - `/for-loan-officers/:token` personalizes with the name and fires opened/clicked.
  - Admin LO Outreach section: form sends, success/copy state shows, table lists the
    invite and reflects opened/clicked after interaction.
- No unit tests for static presentational markup.

---

## Success Criteria

- An admin can, from the Marketing Funnels page, enter an LO's name/email (+ optional
  phone/website) and send them a pitch link in one action — same feel as sending a WOW Link.
- The admin can see, per LO, whether they opened the link and whether they clicked through.
- A prospective LO opening the link immediately understands: this gets me leads, gets me
  partners, and gives me time — with one clear action: start a free trial.
