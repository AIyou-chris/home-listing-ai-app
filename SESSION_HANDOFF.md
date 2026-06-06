# HomeListingAI — Session Handoff

> **Purpose:** Hand this to a new chat so it knows exactly what was done, what's live, and what's still pending. Last updated end of session **2026-06-06**.

---

## TL;DR

A large feature + hardening sprint shipped to production. Everything below is **committed to `main` and auto-deployed** (Netlify = frontend, Render = backend). Latest commit at handoff: `8a153e37`.

Two **config-only** items remain on the user's plate (not code) — see "Still Pending."

---

## What's Live (shipped this session)

### Security & Auth
- **Sentry** error monitoring — `@sentry/node`, initialized in `backend/server.cjs` via `SENTRY_DSN` env var, wired into the global error handler. DSN is set in `.env`.
- **Mailgun webhook signing key hardening** — both Mailgun webhook handlers now hard-reject (`500 mailgun_webhook_signing_key_misconfigured`) when `MAILGUN_WEBHOOK_SIGNING_KEY` equals the API key. Correct signing key is set in `.env`.
- **Google OAuth** — "Continue with Google" button on SignIn + SignUp pages. Enabled in Supabase (Google provider configured with client ID/secret). Working.
- **2-Step Verification (TOTP)** — built into Settings → Security (`src/components/settings/SecuritySettings.tsx`). Uses Supabase MFA. Supabase TOTP is **Enabled**. LOs can scan a QR with Google Authenticator/Authy to require a code at login. Optional (not a hard gate).
- **Onboarding gate** — `RequireOnboarding` route guard in `src/App.tsx` wraps all feature routes; redirects to onboarding if `onboarding_completed` is false. Excludes `/dashboard/today` + onboarding routes to avoid loops. Fails open on network error.
- **NMLS# validation** — `PATCH /api/lo/profile` validates NMLS as 7–10 digits.

### Billing / LO Trial — **Model A** (card upfront + 3-day Stripe trial)
- LO signup at **`/lo-signup`** (`LOSignupPage`) sets `account_type='lo'`, collects NMLS + phone, sets password, starts Stripe checkout with `trial_period_days: 3` (in `/api/payments/checkout-session` → `paymentService.createCheckoutSession`).
- `/signup?type=lo` (and `?plan=lo`/`?plan=lo_pro`) **redirect** to `/lo-signup` so a deep link can't drop an LO into the agent flow.
- **Trialing subs correctly entitled** — `resolveLoWowInviteLimit` now accepts both `active` AND `trialing` Stripe statuses (was `active`-only, which blocked paying trial LOs from the core WOW-link feature).
- **Trial caps (AI-cost protection):** during the 3-day trial, **10 WOW link invites** (`LO_TRIAL_INVITE_CAP`) + **5 listings** (`TRIAL_PROPERTY_CAP`). Full plan limits unlock when the sub goes `active`: LO $149 → 250 invites/mo, LO Pro $299 → unlimited.
- **Trial feature gates** (lead export, property creation) now read `subscription_status` (the column the Stripe webhook actually writes), not `payment_status`.
- **Dunning email** on `invoice.payment_failed` (in `backend/services/billingEngine.js`) — styled, links to billing settings.
- **Coupons:** Stripe checkout has `allow_promotion_codes: true` → the Stripe-hosted page shows a promo-code field. Create coupons/promo codes in the Stripe dashboard. (No coupon box on the app's own form — decided not needed.)
- Landing pricing section (`PricingSectionNew.tsx`) shows the 3-day trial + limits honestly.

### LO Platform features (UI wired to existing endpoints)
- **Invite resend** — `POST /api/lo/partners/invite/:inviteId/resend` + button on LOPartnersPage pending invites.
- **Invite revoke** — `DELETE /api/lo/partners/invite/:inviteId` + button (expires token).
- **Partner removal** — `DELETE /api/lo/partners/:partnershipId` + button on partner cards. Disables branding on that agent's listings + expires unclaimed invite tokens. WOW Link then returns `410 partnership_ended`.
- **Lead CSV export** — `GET /api/lo/leads/export.csv` + "Export CSV" button on LO leads page (server-side, all leads w/ listing address).

### Fixes
- **LO chatbot multi-turn memory** — `/api/public/lo-chat` was dropping conversation history (read wrong field + wrong role check) so follow-up questions lost context. Fixed.
- **Dark auth forms autofill** — Chrome autofill forced white-on-white invisible text on SignIn/SignUp/LO-signup. Fixed with scoped `.auth-dark` autofill CSS in `src/styles.css` + class on the three page roots.
- **WOW Link agent card buttons** — adapt to context: demo invite (no listing) shows **"Contact the LO" + "See How It Works"**; live listing shows **"Call Agent" / "Message Agent" / "Tour"**. Detected via `isDemo = !listing`.
- **ChatBotFAB hidden** on WOW Link + listing-dashboard pages (they have their own chat).
- **Unworked-lead nudge email** upgraded from plain to styled template.
- **SettingsPage props** — fixed missing `emailSettings`/`calendarSettings` props in `App.tsx`.
- **TypeScript** — fixed 3 errors at session start (SettingsPage props, `LoPartner` type + `lo_partner` on `ListingShareKitResponse`, backend share-kit now returns assigned LO partner data).

### White Label (#18 — completed this session)
- All 5 PDF templates accept `brandName` (open house flyer, sign rider, property report, fair housing, light CMA). `resolveListingBrandName(listingId)` resolves the assigned LO's office brand at PDF generation time.
- Email subjects genericized (invite, office invite, trial ending, login alert) — no hard-coded "HomeListingAI."
- `SEO.tsx` page titles read `officeBrand.companyName` when `whiteLabel`.
- "Powered by HomeListingAI" footers hidden for white-label offices (PartnerInvitePage, ListingDashboardPage).
- Print components use `agentCompany` prop instead of hard-coded brand.
- Office Settings UI (`WhiteLabelCard` in `OfficeDashboardPage.tsx`) already existed — company name, color, logo URL, custom domain, webhook.

### Dashboard UX
- **Launch Checklist** pinned to top of Today dashboard (full-width), with X/Y done counter, auto-hides when `onboarding_completed`. Removed two buried duplicate cards.

### Cleanup (Fallow report)
- **Stage 1 (deps) — DONE.** Removed verified-unused dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@google/genai`, `immer`, `eslint-plugin-react`, `vite-plugin-pwa`, backend `puppeteer-core` + paired config cleanups (vite.config manualChunks, vite-env.d.ts pwa reference). Unused deps 11 → 6.

---

## ⚠️ Fallow Cleanup — IMPORTANT lesson for next chat

The Fallow static-analysis report (`fallow-report.json`, dated 2026-05-29) is **stale and unreliable on this codebase.** Do NOT trust it for automated removal/deletion.

- Proven **~28% false-positive rate** on dead-code/exports (verified by hand + by the TypeScript compiler).
- Root causes: it mis-classifies **netlify functions** as non-entry-points (cascades fake "unused" onto everything they import), **skips `backend/scripts/`**, and gets confused by **name collisions** (e.g. `supabaseAdmin` defined in many files).
- The "#1 complexity hotspot" it named (`src/services/dashboard/commandCenter.ts`) is actually a clean 94-line file. Its complexity metric is also unreliable.

**Decisions made:**
- ✅ Stage 1 (unused deps) — done, deps are grep-verifiable so safe.
- 🛑 Stage 2 (unused exports) — **abandoned.** High false-positive rate, cosmetic value (~4 health pts). Reverted cleanly.
- 🔴 Stage 4 (delete 207 "dead files") — **DO NOT DO.** Same misclassification means the list almost certainly includes live netlify functions + lazy-loaded components. Bulk-deleting would break production.
- Stage 3 (dupes) / Stage 5 (complexity) — manual refactors only; the real big files are giant React components (AISidekicks 2368 lines, ShareKitPanel 1914, etc.) — risky to refactor mid-launch, not worth it now.

**Bottom line:** the safe value was captured (Stage 1). Don't run `npx fallow fix` or bulk deletions on this repo.

---

## Still Pending (config only — not code)

1. **Supabase MFA** — ✅ DONE (TOTP confirmed Enabled).
2. **Forgot-password email template** — ✅ DONE (branded HTML saved in Supabase → Auth → Email Templates → Reset Password).
3. **Custom domain DNS for white-label offices** — when an office sets a custom domain, they point a CNAME at the host. Infrastructure step, per-customer. No code needed (backend `custom_domain` column + hostname resolver already handle it).
4. **Stripe coupons** — create in Stripe dashboard if running promos (e.g. a 100%-off code to test signup at $0). App already supports the Stripe promo field.

---

## Critical Architecture Notes (carried from CLAUDE.md — still true)

- **Two ID forms per account.** `resolveRequesterUserId()` = auth/login id; FK tables need the `agents.id` profile id. Use **`resolveLoAgentId(req)`** for LO platform tables, **`resolveOfficeContext(req)`** for offices. `agent_invites.lo_agent_id` stores the **auth id** (odd one out, leave as-is).
- **`listings` vs `properties`.** LO platform `listing_id` = **`properties.id`** (rich data). `listings` is a legacy stub.
- **`account_type`** values: `realtor` | `lo` | `agent` | `office`.
- **`subscription_status`** (written by Stripe webhook) vs **`payment_status`** (set at registration to `awaiting_payment`, NOT updated by webhook) — use `subscription_status` for trial gating.

## Key Files
| File | Purpose |
|---|---|
| `backend/server.cjs` | Express monolith — all API routes (~34k lines) |
| `backend/services/billingEngine.js` | Stripe webhooks, checkout, subscription sync |
| `backend/services/paymentService.js` | Stripe checkout session (trial_period_days here) |
| `src/App.tsx` | Routing, auth, `RequireOnboarding` gate |
| `src/components/LOSignupPage.tsx` | The real LO program signup (`/lo-signup`) |
| `src/components/dashboard-command/LOPartnersPage.tsx` | Partner mgmt UI (invite/resend/revoke/remove) |
| `src/components/dashboard-command/OfficeDashboardPage.tsx` | Office tier + white-label settings card |
| `src/components/settings/SecuritySettings.tsx` | Password + 2FA (TOTP) |
| `src/pages/PartnerInvitePage.tsx` | WOW Link (demo vs live) |

## Deploy
- Push to `main` → Netlify (frontend) + Render (backend) auto-deploy.
- Verify gates: `npx tsc --noEmit`, `npm run build`, `node --check backend/server.cjs`.
- Supabase project: `yocchddxdsaldgsibmmc`. Backend: `home-listing-ai-backend.onrender.com`. Frontend: `homelistingai.com`.
