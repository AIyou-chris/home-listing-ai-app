# AI Handoff Log (Claude ⇄ Codex)

> **Shared notebook between Claude Code and Codex.** Both agents work in this repo.
> Neither can see the other's chat. This file is how we talk.
>
> **Start of every session:** read the latest 3 entries below + `CLAUDE.md` (full project context).
> **End of every session (or before handing off):** add a new entry at the TOP of the log. Keep it short.
> **Before editing a file another agent touched in its last entry:** read that entry first. Don't redo or undo their work silently.

## 2026-10-03 06:50 — Claude (Cowork): design system artifact synced from this repo

- Read-only pass, **no code changed**. Built the "HomeListingAI" Design System artifact on claude.ai from `tailwind.config.js`, `src/public.css`, `src/components/DesignSystemPage.tsx` and `public/newlogo.png` at `1b064ba0`: colors (slate, primary + the Tailwind default shades the app actually uses), type scale, spacing, radii, shadows, logo, and static Button/Card/Input/Badge recipes.
- Found: `tailwind.config.js` names **Inter** but nothing loads it (no font file, no Google Fonts link), so users see system sans. `index.html` loads **Caveat** but nothing in `src/` uses it. The design-system page's Success button (`green-600` + white) is 3.3:1.

## 2026-10-03 — Claude: "money test" code audit — 3 revenue bugs fixed before the first paying LO

Read the whole signup → trial → Stripe → webhook → entitlement path. DB shows ZERO paying customers ever (agents: 1 comped LO, 2 awaiting payment), so none of this had run for real.
1. **Free-access backdoor.** `LIFETIME` and `FRIENDS30` were hardcoded in BOTH checkout routes (`/api/billing/checkout-session`, and the public no-login `/api/payments/checkout-session`) and shown as the promo input placeholder in `UpgradePromptModal`: anyone could activate an account free forever. Codes now come ONLY from env `FREE_ACCESS_PROMO_CODES` (comma separated, `services/promoCodes.js`, +2 tests). **Chris: if he gives friends free access, set that env var on Render with a new, non-guessable code.**
2. **A paying LO would never have been activated.** The LO checkout put the agent's SLUG in `client_reference_id`/metadata; the webhook (`billingEngine.resolveAgentIdFromStripeIdentifiers`) used it as the account id, so `upsertSubscription` hit a uuid error, `agents.stripe_customer_id` was never saved and `resolveLoPlanTier` kept returning `none` ("trial ended", WOW links paused). Fix: checkout now sends `agent_id` (auth id) in session AND subscription metadata (`paymentService`), and the webhook turns a slug into the real id (also covers old in-flight sessions).
3. **Second free week.** Checkout always added a 7-day Stripe trial on top of the no-card trial. `services/checkoutTrial.js` (+5 tests): Stripe trial = days LEFT of the first week, 0 once it has ended or for pay-now codes; `trial_period_days` is omitted when 0 (Stripe rejects 0).
- Unchanged and fine: entitlement is read live from Stripe (`active`/`trialing`), price ids from `STRIPE_LO_LITE_PRICE_ID` / `STRIPE_LO_PRICE_ID` / `STRIPE_LO_PRO_PRICE_ID`; LO Lite fails loud without its env var.
- Still to do: Chris runs the live test (new LO signup → "Choose my plan" → card → back), then cancel inside the 7-day trial so nothing is charged.

## 2026-10-03 — Claude: Sentry's first alert was a real bug — fixed

- Sentry (now live, `SENTRY_DSN` saved) reported `DB schema error PGRST204 on funnels: Could not find the 'is_active' column`. Cause: `ensureDefaultFunnels()` (runs at every boot) looked funnels up by `type` (empty on the 3 existing rows, which use `funnel_key`), so it always tried to insert a new one with columns that do not exist (`title`, `is_active`) — harmless only because the insert failed; it would have created duplicate default funnels otherwise. Now looks up by `funnel_key` or `type`, and inserts with real columns (`funnel_key`, `name`, `is_default`).
- First proof that `dbErrorWatch` + Sentry works. Expect this one issue to stop appearing after the next deploy; mark it Resolved in Sentry.

## 2026-10-02 23:50 — Claude: end-of-day wrap-up (read this first next session)

- **State:** everything is committed and pushed (`main`). Live checks at the end: `/healthz` shows `app_runtime_mode: all`, `run_background_tasks: true`, `run_job_worker: true`; every route I locked answers 401 with no token. Backend 155 tests, Jest 43, tsc and lint clean.
- **Docs updated:** `CLAUDE.md` (§3 new rules, infrastructure notes, new §7 snapshot), `BUILD.md` (Stack was wrongly Firebase; status sections rewritten), `render.yaml` (target single-service setup), memory notes.
- **Chris still has to (in this order):** 1) pay the failed Render invoice (Sep, $73.52) tomorrow; 2) Render savings: upgrade web to Starter $7, suspend `home-listing-ai-worker`, delete `home-listing-ai-video-worker`, downgrade the $25 Pro workspace plan; 3) save `SENTRY_DSN` in Render (Sentry project already created, Express, error monitoring only); 4) set `CRON_SECRET` / `INTERNAL_JOB_SECRET` only if something outside calls the cron/nudge routes.
- **Next for the agent:** the "money test" (new LO signup, trial, Stripe upgrade; never done live), confirm trial/drip emails fire now the loop runs, Today/Appointments declutter, background push, repo clutter.
- **Heads-up:** this commit also includes two older Codex notes (Sep 30) that had been sitting uncommitted in this file.

## 2026-10-02 23:00 — Claude: second security sweep + safety nets + accessibility layer

**More open routes found and closed** (all verified by probing): `DELETE /api/setup/reset-agent/:identifier` deleted agents by slug/email with no login (now `verifyAdmin`); `POST /api/vapi/call` placed calls (now `requireAuth`); `POST /api/payments/portal-session` opened any account's Stripe billing portal from a public slug (now `requireAuth`, uses the signed-in user only); `POST /api/security/notify-login` emailed attacker-supplied addresses with unescaped HTML (now auth, emails only the account's own address, escaped); `POST /api/webhooks/email` let anyone mark leads Bounced (now needs `EMAIL_WEBHOOK_SECRET`); `GET /api/leads/stats` was platform-wide (now auth; `all=true` is admin only); `POST /api/leads/score-all` (admin only); hardcoded fallback secrets `hlai-cron-secret` / `hlai-internal` removed — **set `CRON_SECRET` and `INTERNAL_JOB_SECRET` in Render if anything external calls `/api/cron/inactivity-check` or `/api/internal/run-nudge-job`** (they now refuse without them).
**SSRF:** three places fetched user-typed URLs (blueprint memory, LO `extract-url`, lead webhook test). All now go through `services/safeUrl.js` `safeFetch` (blocks private/loopback/link-local/CGNAT, re-checks redirects). +6 tests.
**Safety nets (all run in `npm run test:backend`, 155 tests):** `backend/__tests__/routeGuards.test.js` fails if any `/api` route is added with no login guard and not on `backend/__tests__/publicRoutes.allowlist.js` (and if money/mail/call/delete routes ever get allowlisted). `services/dbErrorWatch.js` wraps the Supabase client's fetch so a query naming a missing column/table logs `🚨 [DB SCHEMA ERROR]` (+ Sentry if `SENTRY_DSN` is set). `npm run check:db` / `node backend/scripts/check-db-columns.cjs --sql` finds every select column that does not exist (paste the SQL in the Supabase editor, or set `SUPABASE_DB_URL`).
**Sentry:** already wired in `server.cjs` but `SENTRY_DSN` is not set on Render (a warning prints at boot). `@sentry/node` was not in `backend/package.json` (worked only because the root install provides it); now listed.
**Accessibility layer** at the end of `src/public.css` (THE app stylesheet — `main.tsx` → `PublicApp` → `public.css`): 12px minimum text, AA contrast for slate-400/emerald/amber, 40px touch targets on touch screens. Measured on demo pages: tiny text 17-23 → 0, low contrast 10-22 → 0-4, Appointments small targets 40 → 0.
**Deleted dead entry files:** `src/index.tsx`, `src/styles.css`, `src/App.css` (nothing imported them; the real entry is `main.tsx`).
- Lesson: I first put the CSS in `styles.css` (dead) and the browser measurement showed no change. Measure before declaring done.

## 2026-10-02 21:00 — Claude: principal-engineer sweep — CRITICAL: unauthenticated send/call/AI routes closed

Probed live with empty POST bodies: these reached their handlers with no token (anyone on the internet could use them on our accounts):
- `POST /api/email/send` (arbitrary To/Subject/HTML/**From**), `POST /api/sms/send`, `POST /api/voice/{,vapi/,hume/}outbound-call` (places phone calls), `POST /api/shorten` (short links on our domain), `POST /api/ai/generate-listing` + `/api/ai/agent-chat` (paid OpenAI), `POST /api/leads` (anonymous lead injection).
- Now `requireAuth` (shorten uses a wrapper because it registers before `requireAuth` exists). `/api/email/send` no longer honours a caller-supplied `from`. `/api/sms/send` rate-limits on the authed id, not a body `userId`.
- Public AI routes that must stay open (`/api/ai/property-chat` on the WOW page, `/api/realtime/offer`, `/api/realtime/handoff`) now share `aiChatLimiter` (+ `aiSpendGuard` for the first two).
- Frontend callers send the Bearer token via `authedFetch`: ContactLeadModal, AdminMarketingFunnelsPanel, textingService, AICardPage, openaiService; `listingsService` AI describe adds the token.
- **Lesson (again):** a multi-part Python edit failed halfway (a file with no `import` line). Re-verified every part with a grep count before committing.
- tsc, lint, backend 143, build OK.

## 2026-10-02 19:00 — Claude: LO dashboard audit started — whole-backend column check found more silent failures

Ran every literal `.from('t').select('cols')` in `server.cjs` + `services/` against `information_schema` (read-only). Fixed selects that named columns that do not exist (Supabase returns an error and `data: null`, which the code mostly swallowed):
- **Lead "View conversation" was always a 500** (agent `GET /api/dashboard/leads/:id/conversation` and the LO equivalent): `ai_conversations` has no `visitor_id/channel/started_at/last_activity_at`; `ai_conversation_messages` has no `is_capture_event/intent_tags/confidence`.
- **Lead detail never had its listing** (`properties` has no `city/state/zip`), nor did reminder emails, appointment emails and the listing resolver (5 selects).
- `listing_sources` has no `text` (AI Summary on the listing page); `ai_conversations.agent_id` (summary job + public chat), export-conversations.
- Weekly "value" email to listing agents (`schedulerService`): `pre_qual_submissions.name` -> `full_name`, dropped `properties.city/state`, `agents.name`.
- **3 tables the code uses do not exist in production:** `appointment_reminders`, `lead_events`, `lead_conversation_summaries` (a singular `lead_conversation_summary` exists with a different shape). `missing-core-tables-migration.sql` creates them (idempotent). **Chris must run it in the Supabase SQL editor** (project convention). Until then reminders created through the dashboard routes, the lead activity log and the Summary card stay empty (the code tolerates the missing tables).
- Not fixed on purpose: `agents.user_id`/`is_admin` selects (they already have fallbacks), `ai_knowledge_base` (table missing, code handles it), legacy `funnel_steps` selects (steps come from `funnels.steps`).
- All `/api/lo/*` routes require a login (listing-docs routes check inside the handler). Live: 401 with no token.
- Verified: backend 143 pass.

## 2026-10-02 17:00 — Claude: "make it 100" pass — found 6 live bugs from a schema check

Checked every column my new code (and older code) selects against the real DB (`information_schema`, read-only). **`agents` has no `full_name` and no `brokerage` column.** PostgREST returns an error and `data: null`, so these were silently failing in production:
- Lead detail "Mortgage Partner" card (`lo_partner` lookup selected `full_name`) never appeared.
- LO Share Kit: both the LO and the listing agent came back `null` (flyer showed "Loan Officer" with no company, and no listing agent).
- WOW link public page: claimed agent's company/headshot/phone missing (selected `brokerage`).
- Agent listing hydration (`brokerage`).
- My new `my-loan-officer`, `ask-lo`, `agent-share-kit` routes had the same mistake (would have shown nothing).
All selects now use real columns (`company` is the brokerage). **Rule: never select `agents.full_name` or `agents.brokerage`; names come from `first_name` + `last_name`.**
- **Compliance Brain** now starts from the LO profile: blank `company_name` / `licensed_states` fall back to `agents.company` / `agents.lending_states` in the prompt (`loBrainService.buildBrainPrompt`) and in `GET /api/lo/chatbot-config`. Chris's config row has `company_name ''` but his profile has company "An AI You" + NMLS. (+2 tests)
- **Every new lead is rated at capture** (`services/captureIntent.js`, +5 tests): showing/pre-approval = Hot, report = Warm, contact left = Warm, none = Cold, with a reason in `source_meta.intent_reason`. A repeat visit can raise but never lower the level. Jev still rates replies and pre-approvals.
- Today: the Call-now lead no longer repeats in the list below. Verified the new screens in demo mode on desktop + 375px (no horizontal overflow).
- tsc, lint, backend 143, Jest 43, build OK.
- **Not done:** real background push (needs service worker, VAPID keys in Render, a subscriptions table; `public/sw.js` is still the kill-switch). ~40 unused backend routes remain (edit was blocked by the harness; they are all auth-locked).

## 2026-10-02 15:00 — Claude: LO Today + Leads get the same call-now tools

- LO Today: `CallNowHero` for the best new lead, per-row waiting timer + one-tap Call/Text, heading padding fixed (the `/dashboard/lo-today` route had no wrapper, so the heading hugged the top edge). LO Leads rows show the waiting timer.
- **Bug found:** `GET /api/lo/dashboard/today` never returned `phone` (or `sourceType`) for recentLeads, so phone-only leads read "No contact info". Now returns `phone` (phone_e164 || phone), `sourceType`, `intentReason`.
- `WaitingBadge` now takes just `status/created_at/intent_level/last_agent_action_at` so any lead shape can use it.
- tsc, lint, backend 136, Jest 43, build OK.

## 2026-10-02 14:00 — Claude: agent dashboard — 8 upgrades for warm leads + LO partnership

- **Today:** `CallNowHero` (best lead, big Call / Text / Ask-LO), `WaitingBadge` speed-to-lead timer (client clock, red + "call now" after 5 min on Hot), Jev's reason on every lead card (`LeadReason`), `MyLoanOfficerCard`, `InstallAppPrompt` (phones only, once). Shared pieces in `LeadActions.tsx`.
- **Leads inbox:** reason line, timer, Text button. **Lead page:** "Ask {LO} to call".
- **Listings:** primary **Share** button (native share sheet, tracked link, copy fallback).
- **Live alert:** `DashboardRealtimeBootstrap` now toasts a new lead (under 2 min old) with a Call button and buzzes on Hot. This is in-app only. Real background push needs a service worker + VAPID keys + a subscriptions table; `public/sw.js` is still the kill-switch. Not built.
- **Backend (light):** `GET /api/dashboard/my-loan-officer` (3 small queries, only when Today loads), `POST /api/dashboard/leads/:leadId/ask-lo` (owner-checked, notifies the LO via bell + email, once per 30 min per lead, stores `source_meta.lo_asked_at`), and the leads list now returns `intent_reason` + `can_ask_lo` from rows it already loads (no extra queries).
- **State:** tsc, lint, backend 136, Jest 43, build OK. Not exercised live yet (needs a real agent login with a linked LO). Plain form leads still have no Hot/Warm/Cold unless pre-approval or a reply rated them.

## 2026-10-02 10:00 — Claude: agent dashboard — second lockdown (about 60 routes)

Re-audited every route with no login guard and tested the live site with no token. These answered 200: `GET /api/listings` (returned real drafts for anyone), `/api/email|notifications/preferences|security/settings/:userId`, `/api/conversations*`, `/api/sidekicks*`, `/api/funnels|analytics/*/:userId`, `/api/leads/:id/{tracking-stats,score}`, `/api/ai-card/*` writes, and `market-analysis`.
- New hoisted helpers in `server.cjs`: `authOwnsId`, `requireParamOwner`, `requireLeadOwner`, `requireConversationAccess`, `requireNamedUserIsCaller`, `requireSidekickOwner`. A named id must be the caller's login id or agents profile id (403 otherwise, 401 with no token).
- `GET/POST /api/listings` now use the signed-in user only (body/query owner ignored). `/api/security/{audit,backup,alerts/:id}` are `verifyAdmin`. `PUT /api/ai-card/profile` no longer trusts `x-user-id`.
- Frontend: new `src/services/authedFetch.ts` (fetch + Bearer). Used by email/security/feedback/chat/sidekicks/aiCard services, `App.tsx` listings load, `UnifiedTrainingStudio`; `getMarketAnalysis` sends Bearer. `GET /api/ai-card/profile` stays public on purpose (public business card).
- **Known side effect:** admin `LeadDetailDashboard` calls `listConversations()` with no id; it now returns the admin's own (empty) list, not the platform default's.
- Left open on purpose: `GET /api/listings/:id/lo-assignment` (public LO card data), `/api/listings/:id/marketing` (legacy in-memory), `/api/agents/:slug`.
- tsc, lint, backend 136/136, build OK. Live re-test after deploy is below if filled in.

## 2026-10-02 08:00 — Claude: Jev now scores inbound lead replies

- **Did:** `LeadScoringService.recalculateLeadScore(..., 'CHAT_REPLY', {message, channel, subject})` asks Jev (intent / readiness / urgency) and adds the points to the rule score as a "JEV Semantic Qualification" breakdown line (scoring_version `v2.1-jev`). Mailgun inbound email and inbound SMS handlers in `server.cjs` pass the message in. New `backend/services/TypeSafeLeadQualificationService.js` (+tests).
- **Changed from the draft:** it required `@typesafe-ai/sdk` directly. Moved it onto the shared `typesafeClient.js` (one client rule) and dropped the SDK dependency from `package.json`. (The SDK does load under `require`, so it was a rule fix, not a crash fix.)
- **State:** backend 136/136. Fails open: no key or API error keeps the plain rule score.
- **Verified:** Chris tested a real inbound reply on 2026-10-02 and the score updated. `AI_HANDOFF.md` also holds two uncommitted Codex entries from Sep 30; left for Codex to commit.

## 2026-10-01 09:30 — Claude: agent dashboard — 17 unauthenticated routes closed

Audited every `/api/dashboard/*` route (67 of them) plus the agent-owned routes outside that prefix. **17 took their owner id straight from a query param or an `x-user-id` header with `DEFAULT_LEAD_USER_ID` as a fallback, so no token was needed at all.** Verified live before the fix: `GET /api/dashboard/command-center` and `GET /api/dashboard/automation-recipes` both returned **200** for a made-up `x-user-id` with no Authorization header.

Worst of them:
- `DELETE /api/dashboard/leads/:leadId` — delete any agent's lead.
- `PATCH /api/dashboard/leads/:leadId/status` — **no owner check of any kind**, not even a spoofable one: rewrite the status and notes of ANY lead in the platform.
- `GET /api/dashboard/leads/:leadId`, `/conversation`, `/export-conversations` — read any agent's leads and full chat transcripts.
- `GET/PUT /api/agent/identity` — read and **rewrite the From / Reply-To address on an agent's outgoing email** (phishing vector). No frontend calls these; locked anyway.

Changes:
- `resolveDashboardOwnerId` is now **async and authenticated** — it resolves the owner from the signed-in session via `resolveRequesterUserId(req, { allowDefault: false })`, returns null on a bad/expired token (→ 401, never 500), and allows the one legitimate mismatch where a caller sends the `agents` profile id while the token carries the login id. All 7 call sites plus 8 inline `String(req.query.agentId || req.headers['x-user-id'] || … || DEFAULT_LEAD_USER_ID)` expressions now go through it, each followed by `if (!agentId) return res.status(401).json(UNAUTHORIZED_DASHBOARD)`.
- `PATCH /api/dashboard/leads/:leadId/status` gained the same fetch-then-compare ownership check the delete route uses (404 if the lead is gone, 403 `listing_access_denied` if it is someone else's).
- The reminder, command-center, listing-leads and listing-performance handlers already scoped their queries by `agentId` — they were only missing the proof that the caller owns that id. Nothing downstream changed.
- **Frontend: one header builder now.** `defaultJsonHeaders` in `src/services/dashboard/utils.ts` was the sync, token-less version and was still used by 32 call sites across `appointments / commandCenter / leads / listingContent / listingPerformance / video`. It is now an alias of `authHeaders` (async, sends Bearer) and every call site awaits it. This closes the recurring root cause from the last three sessions — there is no longer a token-less builder to reach for. `listingBuilderService.ts` has its own local async version that already sent Bearer; left as-is.
- Demo mode: `fetchAutomationRecipes` / `updateAutomationRecipe` were the only two dashboard calls with no demo short-circuit, so they would have 401'd the demo. Both now answer locally in demo mode.

Verification: tsc clean, lint clean, Jest 43/43, backend 129/129, `npm run build` ✓. Live 401 checks after deploy are in the PR.

**Found, NOT fixed (needs a decision, none are agent-dashboard):** `POST /api/listings`, `GET /api/listings/:listingId/market-analysis`, `GET /api/video-credits/:listingId`, `POST /api/security/audit`, `GET /api/training/feedback/:sidekick`, and the whole `/api/ai-card/*` group (6 routes — that UI is hidden as unused per CLAUDE.md) are all still spoofable the same way. Also `app.use('/api/dashboard')` has a `last_seen_at` middleware that bumps `agents.last_seen_at` for whatever id is sent — cosmetic only, left alone.

## 2026-10-01 08:35 — Claude: AI Brain guard card now reports WHY
- The PR #56 guard card fired for Chris on the live site. His config row is intact (knowledge_base 3265 chars, bot_name "Chris Potter AI"), so the guard did its job, but the load is genuinely failing and I could not determine the status code from here. Ruled out: duplicate `lo_chatbot_configs` rows (none), missing `DEFAULT_RULEBOOKS` export (present at runtime), and an unauthenticated call (returns 401 correctly).
- Added: one silent retry after 1.5s before showing the card (covers a Render free-plan cold start or a dropped request), and the card now prints `Reason: <status> <error>` so the next report identifies it in one step instead of another guessing round.
- **Open:** Chris's Compliance Brain is empty — `company_name`, `company_nmls`, `licensed_states`, `required_disclosure` are all blank, and `faq` is empty. The AI currently answers loan questions without naming the company, NMLS or licensed states.

## 2026-10-01 08:05 — Claude: listing photo upload was 401 in production
- Chris: "I try to load a pic and it states unauthorized." `listingMediaService.uploadListingPhoto` POSTed to `/api/listings/photo-upload` with ONLY `Content-Type: application/json` — no Bearer, no `x-user-id`. That endpoint is `requireAuth`, and in production `resolveRequesterUserId` ignores a body `userId` without a token (`allowExplicitWithoutAuth` is false), so **every photo upload 401'd**. Pre-existing, not from this audit's changes.
- Fix: send `waitForAuthenticatedSession()`'s `accessToken` as Bearer plus `x-user-id`, matching `listingBuilderService.defaultJsonHeaders`.
- Checked the sibling upload paths: `listingBuilderService.uploadListingBrainDoc` already sends Bearer; no other service posts a file without auth.
- **This is the third instance of the same root cause (ROI/onboarding earlier, dashboard appointments, now photo upload): a fetch written before the Bearer-token convention existed.** CLAUDE.md §3 already documents the rule; the remaining risk is older files that predate it.

## 2026-10-01 07:50 — Claude: listing editor publish rules
- `canPublish` required beds > 0 AND baths > 0 AND sqft > 0, so **land, lots and parking spaces could never be published**. Now publishing needs: address + price + **at least one photo**. Beds/baths/sqft are optional.
- A photo is newly REQUIRED: the public listing page, flyer (`LOShareKitPage` design C uses `listing.photos[0]`) and WOW link are all built around the first photo and render blank without one.
- Replaced the dead grey Publish button with `publishBlockers`: a visible "To publish, add …" line plus a title tooltip naming exactly what is missing.
- Added a `beforeunload` guard for unsaved edits (same as the AI Brain page).
- Audit note: this editor already handles the load-failure case correctly (falls back to a cached local draft, else shows an error — never a blank form), with a comment calling out the "broken-API-then-save-stale-data feedback loop". It does NOT have the AI Brain's wipe bug.

## 2026-10-01 07:45 — Claude: AI Brain tab — DATA-LOSS bug fixed
- **🔴 The LO's trained brain could be silently erased.** `LOBrainPage` loaded `GET /api/lo/chatbot-config` with `if (res.ok)` and NO else branch: any non-OK response (401 after session expiry, 500, blip) left `config` at `EMPTY_CONFIG` and rendered a blank-but-working form. The next `persist()` PUT — including the automatic one from `addSource`/`removeSource` — upserted blanks over `lo_chatbot_configs` (knowledge_base, faq, compliance, banned_phrases, licensed_states) and toasted "AI Brain saved". Fix: a failed load sets `loadFailed`, the page renders a hard-stop card instead of the form, and `persist()` refuses to write while `loadFailed` is true. Verified by forcing a 500 on the config call — the guard card renders and no form is reachable.
- Unsaved edits now trigger a `beforeunload` warning.
- `POST /api/lo/chatbot/extract-file` now runs `requireAuth` BEFORE multer, so an anonymous 25MB upload is rejected without being buffered. (This closes Codex's open question — auth WAS present, just after the upload middleware.)
- Audit result otherwise clean: every `/api/lo/brain/*`, `/api/lo/chatbot-config`, `/api/lo/phone-*` route is `requireLoAgent`; `extract-url` is `requireAuth`; test chat, voice preview, number purchase and handoff number all surface errors properly.
- **Pattern worth remembering across this whole audit: `if (res.ok) {…}` with no else is a data-loss bug whenever the loaded value is later written back.**

## 2026-10-01 07:35 — Claude: Listings tab + per-listing call forwarding
- **NEW: "Send hot callers to" per listing** (Chris's ask). `lo_phone_lines.transfer_number` and `transferTarget()` already existed but were main-line only and had no UI. `setTransferNumber(loAgentId, value, listingId)` now takes a listing; new `PUT /api/lo/listings/:listingId/phone-line/transfer` (requireLoAgent + `listing_lo_assignments` check → 403 `listing_access_denied`); the field lives in `ListingPhonePanel` under an active number. Blank falls back to the LO's own phone, which is the pre-existing behaviour.
- Branding switches no longer lie: a failed PATCH rolls the switch back and toasts, and a failed GET shows the backend default (all on) instead of spinning forever.
- Listing list + search now have real failure states; "Build a Listing" says so if the co-brand assignment fails instead of silently leaving the LO unbranded.
- `/api/listings/search` now returns **drafts as well as published** (Chris: "yes") so an LO can co-brand a home before it goes live.
- **Audit result: this page was the best-protected so far.** Every endpoint already had `requireAuth`/`requireLoAgent`, assign checks an active `lo_agent_partnerships` row, search is scoped to partner-owned listings, and `dashboard-link` checks assignment or ownership. No auth holes found.
- Removed the stale CLAUDE.md line claiming `/dashboard/listings/:listingId/edit` is not routed — it is (App.tsx 1607/1632/1740).

## 2026-10-01 07:10 — Claude: Settings tab locked down
- **`GET`/`PATCH /api/notifications/settings/:userId` were unauthenticated** — live-confirmed 200 for both with no token, so anyone could read a user's notification prefs or silently switch off their new-lead alerts. New `ownsNotificationSettings(req)` gate: token required, and the `:userId` must be the caller's auth id or their `agents.id` profile id (or `default`). (A PATCH probe sent `smsNewLeadAlerts`, which is not a column — Chris's row was unchanged apart from `updated_at`.)
- `notificationSettingsService` now goes through `buildApiUrl` and sends `x-user-id` + Bearer on both calls; `SettingsPage`'s SMS probe uses the service instead of a bare relative `fetch`.
- `SettingsPage` account type now comes from `fetchOnboardingState()` instead of `localStorage.hla_account_type` (user-editable). localStorage stays as a first paint guess only, and is refreshed from the server answer.
- **Email and Calendar tabs are now visible to LOs** (`loVisible: true`). Verified the LO path works: Email reads the slug from `/api/agent/profile` (test LO slug `LoTest_One` → `lotest_one@mg.homelistingai.com`) and Calendar saves through `calendarSettingsService`.
- Profile and Security tabs audited clean: `/api/agent/profile` is `requireAuth`, password + MFA go straight to Supabase auth.

## 2026-09-30 19:30 — Claude: appointments 500 hardening (cause not fully pinned)
- Chris's console showed `/api/appointments` **500** alongside `/api/me/brand` 401 and `rpc/is_user_admin` 403 — i.e. his session token was being rejected across the board.
- Hardened `appointmentOwnerIds()`: `resolveRequesterUserId` is now inside try/catch, so a malformed/expired token returns a clean 401 ("sign in again") instead of falling through to the handler's catch as a 500. Also made the `fetchAiCardProfileForUser` lookup non-fatal in `GET /api/appointments`.
- **Still unproven:** could not reproduce the 500 — Supabase signup is locked down (`email_address_invalid`) so no throwaway token could be minted, and Render logs aren't reachable from here. Evidence is ambiguous: the page rendered the empty state rather than the new retry card, which suggests the GET actually succeeded and the 500 line was from the earlier (pre-#52) POST attempt. **If it recurs, the next step is Render logs for `Error getting appointments:`.**
- Verified the live bundle is current: `assets/LOAppointmentsPage-BbX27ROp.js` contains both the retry card and "Remind me 1 hour before".

## 2026-09-30 19:20 — Claude: appointment form follow-up
- Chris hit "Failed to schedule meeting" right after PR #51. Cause: his tab still had the PRE-#51 bundle, which sent only `x-user-id` and no Bearer — the newly owner-scoped `POST /api/appointments` correctly returned 401. Verified the live bundle IS current (`assets/LOAppointmentsPage-MIG81piL.js` contains `Authorization`, `status:"canceled"`, and no `method:"DELETE"`), and the Netlify production deploy (6abdbf18) published commit ee7b66ac at 02:02:34Z. A hard refresh clears it.
- A 401 from create / complete / cancel now says "Your session expired. Refresh the page and sign in again." instead of a generic failure, so a stale tab explains itself.
- **Added the Reminders checkboxes that silently never landed in PR #51**: that python edit raised `ValueError: substring not found` BEFORE its `write()`, so the whole script was discarded while a later script's changes went in. The `remindMe`/`remindThem` form fields and the POST wiring were already there (defaulting true), only the UI was missing. **Lesson: when a scripted multi-part edit fails, re-verify every part of it, not just the part that errored.**

## 2026-09-30 19:05 — Claude: Appointments tab locked down
- **All four `/api/appointments` routes were unauthenticated.** Live-confirmed: `GET` returned 200 for a fake `x-user-id`; `PUT` and `DELETE` took any appointment id with no token at all (anyone could edit or permanently delete any meeting on the platform). Now: new `appointmentOwnerIds(req)` + `ownedAppointment(req, id)` helpers; GET/PUT/DELETE require a token and scope to the owner (401 `agent_auth_required` / 403 `appointment_access_denied`).
- **POST keeps public booking working without the body choosing an owner.** Signed in → owner is the authed user. Not signed in → owner is derived from the listing (`properties.agent_id/user_id` via `listingId|listing_id|propertyId`), else 401. `ViewingModal` now passes `propertyId` so the public showing flow still resolves an owner.
- Callers updated to send Bearer: `LOAppointmentsPage` (new `apiHeaders`), `services/dashboard/appointments.ts` (create/status/reschedule), `services/schedulerService.ts` (`schedulerAuthHeaders`).
- Cancel is now a soft cancel (`PUT status:'canceled'`) instead of `DELETE` — the meeting stays in Past Meetings and pending reminders are called off.
- Schedule form: real reminder checkboxes (me 1h before, them 1 day before; the second needs an email or phone). They were hard-coded `false`, so no reminder ever fired for an LO meeting.
- Load failure shows a retry card instead of a silently empty week.

## 2026-09-30 18:50 — Claude: pre-approval form 500 (supabase thenable has no .catch) + email option
- **ROOT CAUSE of the live 500 on `POST /api/leads/pre-qual`:** a Supabase query builder is a thenable with `then` but NO `catch` (verified: supabase-js 2.81.1 → `typeof builder.catch === 'undefined'`). `await supabaseAdmin.from('notifications').insert({...}).catch(() => null)` therefore threw `TypeError: catch is not a function` AFTER the lead + pre-qual rows were written, so data saved but the buyer saw "Could not send". New `bestEffort(query)` helper wraps the builder in a real promise; applied to all 6 builder-`.catch()` sites in `server.cjs` (lines ~33672–33896: pre-qual LO alert, sold alert, 24h nudge x3, nudge_sent_at). **Never call `.catch()` directly on a Supabase builder.** (+3 tests in `__tests__/bestEffort.test.js`.)
- **LO alert never landed:** `notifications.user_id` FKs to `auth.users`, but the pre-qual handler passed `loAgentId` (agents.id profile id). Now resolves `agents.auth_user_id` first.
- `PreApprovalSheet`: name + **phone OR email** (either reaches the LO), with an "or" divider, inline hint, success line that matches the channel given, and disclaimer updated to text/phone/email.
- **Jev confirmed live in production**: lead afe2ee5b has `source_meta.intent_source = "jev"`, reason "Buying within three months." (ASAP / not pre-approved / 680–739 / 5–10% → Hot).
- 4 duplicate `pre_qual_submissions` rows from the failed retries point at one lead — harmless, the Leads page keys off the lead.

## 2026-09-30 18:40 — Claude: Leads tab + Jev lead rating
- **Jev now rates buyer leads.** New `backend/services/leadIntentRater.js` (+15 tests): a `choice` question (Hot/Warm/Cold, same criteria shape as `loPhoneCallService.INTENT_CRITERIA`) over the four pre-approval answers. Falls back to a plain rules table on unconfigured key, API error, unknown choice, or confidence < 0.4 — `source` says which path ran. `POST /api/leads/pre-qual` uses it instead of hard-coding `intent_level:'Hot'`; the reason lands in `source_meta.intent_reason` and the LO notification title/priority follow the rating. Chris confirmed `TYPESAFE_API_KEY` is set on Render.
- **Duplicate leads fixed (regression from PR #41).** `GET /api/lo/leads` listed `pre_qual_submissions` AND `leads`, so every pre-approval showed twice. Now only pre-quals with no `lead_id` (legacy) are listed on their own; linked ones enrich their `leads` row (type `pre_qual`, answers + intentReason on the card). Pre-qual status edits now stick, since every card is a real lead row.
- `LOLeadsPage`: server-side search (debounced), Load more (100/page via `hasMore`), load-failure retry card instead of a false "No leads yet", empty state CTA to Partners, Cold badge + Jev's reason line.
- Jev still NOT used by `LeadScoringService` (the separate points score). Unchanged, still unused on LO pages.

## 2026-09-30 18:30 — Claude: Partners polish (4 items)
- New `backend/services/wowReminderEmail.js` (+4 tests): one email builder (same look as the first WOW invite) used by the manual nudge (`sendWowLinkReminderEmail`) and the hourly follow-up cron in `schedulerService.js`. Old dark-header/"I wanted to follow up" copy is gone. Closes the "reminder + follow-up WOW emails use old copy" open item.
- Partners page: "Call this week" chip when no contact for 14 days (from `lastFollowUp`, else join date); partners sorted by leads; Recap now opens a preview (`POST /api/lo/partners/:id/recap` with `{preview:true}` returns subject/html and sends nothing) before sending.
- Recap "live listings" now counts only that partner's published, branded homes (was every home the LO has).

## 2026-09-30 18:00 — Claude: LO Partners tab fixes
- `GET /api/lo/partners` now returns real per-listing `totalLeads` (leads.lo_agent_id + listing_id) and `totalViews` (listing_events type 'view'). Were hard-coded 0.
- `DELETE /api/lo/partners/:id` now really turns off co-branding: finds the removed agent's homes in `properties` (agent_id/user_id = auth id) and sets `listing_lo_assignments.branding_enabled=false` with the LO PROFILE id. Old code queried legacy `listings` and used the auth id, so it never matched.
- Partners page: load failure shows a retry card instead of a fake empty list; side-panel header leaves room for the bell; "Schedule Appointment" opens LO Appointments with the agent pre-filled (`?name&email&phone&kind`, read by `LOAppointmentsPage`).
- Deleted Chris's unclaimed test invite (anaiyou@pm.me). Fred Potter (foodtrucknai@gmail.com) left as a partner on purpose.
- Not changed: appointment reminder/lead-detail routes still trust x-user-id (Leads/Appointments tab audit).

## 2026-09-30 17:40 — Claude: LO Today page cleanup
- `LOTodayPage.tsx`: stat cards now New leads today / Hot leads / Pre-approvals / Partners (with "N opened"); drafts collapse into one line under My Listings; empty Recent Leads has a "Send a WOW link" button; Quick Actions (dupe of sidebar) replaced by one primary "Send a WOW link" card; bottom padding so the chat bubble does not cover it.
- `GET /api/lo/dashboard/today` now returns `stats.hotLeads` (leads.intent_level='Hot'), `stats.partnersOpened` (agent_invites.opened_at not null) and `intentLevel` on recent leads (the red/amber dots were always amber before).
- Verified in DB: zero `pre_qual_submissions` so far, so the 0s on Chris's dashboard were correct.

## 2026-09-30 17:20 — Claude: Today tab audit + fixes
- SECURITY: `GET /api/dashboard/leads`, `/api/dashboard/appointments`, `/api/dashboard/roi-metrics` trusted `x-user-id`/`agentId` with no login (confirmed live: 200 for a fake id). Now `resolveRequesterUserId(req)` → 401 `agent_auth_required`. Frontend `fetchDashboardLeads`/`fetchDashboardAppointments` now send `authHeaders`.
- STILL OPEN (same hole, Leads/Appointments tabs): `/api/dashboard/leads/:leadId`, `/conversation`, `/status`, appointment reminder routes, `/api/dashboard/agent-actions` use `resolveDashboardOwnerId` (no auth). Fix when auditing tabs 3 and 4.
- New public `POST /api/public/listing/:listingId/view` records `listing_events` type `view` (1 per visitor/hour); `PublicListingPage` calls it once per session. ROI "Views" now fills in.
- Today page: toast text, cancelled/completed appointments hidden, share-kit lookup runs in parallel.

## 2026-09-30 16:50 — Claude: flyer viewer + price-alert card shows once
- Share Kit flyer no longer uses a blank pop-up tab (broke on phones). It opens an in-page viewer with "Print / Save as PDF". File: `LOShareKitPage.tsx`.
- Price-drop alert card (`ListingAlertOptIn.tsx`) remembers per listing in localStorage (`hlai_alert_seen_<id>`): after signup or the new close button it never shows again on that phone.

## Entry template

```
### YYYY-MM-DD HH:MM — <Claude | Codex> — <one-line summary>
- **Did:** what changed (files)
- **State:** committed? pushed? tests passing?
- **Open / next:** what's unfinished, what the other agent should know
- **Heads-up:** anything that could trip up the other agent
```

## Standing rules (both agents)

1. **Project rules live in `CLAUDE.md`** (Golden Rules, conventions, architecture gotchas, how to work with Chris). Codex: treat it as your project context too.
2. **Use Jev (TypeSafe) for judgment calls.** Any yes/no, pick-a-category, or rank/score decision about text (lead intent, lead quality, job-title filtering, chatbot question routing) → use Jev, not keyword matching or a free-form LLM prompt.
   - Key: `TYPESAFE_API_KEY` — **backend only**, never `VITE_`-prefixed.
   - **Fail open:** no key or an API error must never break the feature; fall back to existing behavior and log once.
   - **One client, not many.** Reuse the existing TypeSafe wrapper before creating another one (see open item below).
   - Pattern + rationale: `docs/adr/0003-typesafe-jev-integration.md`. Skill: `typesafe-ai` (installed in both Claude Code and Codex).
3. **Don't commit or revert the other agent's uncommitted work.** If `git status` shows changes you didn't make, check this log first.

---

### 2026-09-30 19:10 — Claude: 4-tap pre-approval form on the public listing page
- **Did:** new `src/components/public/PreApprovalSheet.tsx` (bottom sheet: timeline, already pre-approved, credit range, down payment, then first name + mobile). Property type comes from the listing, so it is not asked. Wired through `PublicListingPage` -> `PublicPropertyApp` (`onGetPreApproved`; the green Financing card gets a primary "Get pre-approved" button). Posts to `POST /api/leads/pre-qual`, which now also stores `currently_preapproved`. `GET /api/public/listing/:id/lo-chatbot` also returns `lo_nmls` for the disclaimer.
- **State:** tsc 0, lint 0, Jest 43, backend 107. Screenshot-checked at 390px.
- **Open:** `/api/leads/pre-qual` is public with no rate limit or bot check (Codex: consider a simple per-IP limit). SMS consent wording is in the sheet's footer; legal has not reviewed it. Income was deliberately left out.
- **Standing rule from Chris:** after a build passes all checks, Claude merges the PR automatically. No need to ask.

### 2026-09-30 18:30 — Claude: fixed everything in Codex's BUG_REPORT_2026-09-30
- **#1** `/api/public/lo-chat` now resolves the LO server-side (`backend/services/loAssignmentGuard.js`, 5 tests). Forged LO id returns 403 `lo_not_assigned_to_listing`.
- **#2/#3** Mark Sold, Archive and the ROI widget now send the Bearer token and use `properties` (not legacy `listings`). Migration `properties-sold-archive-migration.sql` (adds `sold_at`, `sold_price`, `archived_at`) is **already applied** in Supabase. ROI widget has a visible error state. Views come from `listing_events` type `view` (nothing writes those yet, so 0).
- **#4/#7** LO Today uses `resolveLoAgentId` and real count queries (no 200 cap).
- **#5** `POST /api/leads/pre-qual` now creates or updates a `leads` row (context `pre_approval`), links `pre_qual_submissions.lead_id`, and notifies both LO and listing agent. **The public 5-question form is still not in the UI** (buyers use the chat panel). Needs a product call before building.
- **#6/#8** tsc is clean (0 errors). `npm run lint` is clean (0 errors, 0 warnings). 8 `any` warnings were silenced with targeted disables, not retyped.
- **Checks:** tsc 0, lint 0, Jest 43, backend 107, build passes. Nothing was exercised against live Render.
- **Still Codex's:** delete the dead AI Sidekicks and Google Meet code.

### 2026-09-30 17:05 — Claude: bug sweep (for Codex to pick up)
- **Fixed (PR `fix/lo-assignment-auth`):** `POST/DELETE /api/listings/:id/lo-assignment` had NO auth, so anyone could attach or remove an LO on any listing. Now `requireAuth` + `requesterOwnsListing`. `ListingEditorPage` now sends the Bearer token (search, attach, detach) via `authHeaders`.
- **Clean:** backend 102/102, Jest 43/43, tsc = the 2 known errors + 1 known jest-namespace error.
- **Codex, please take these (not fixed):**
  1. `/api/public/lo-chat` trusts the browser's `lo_agent_id`. Validate it against `listing_lo_assignments`.
  2. ESLint has 423 problems, mostly unused vars and `any`. Start with the errors in `UnifiedTrainingStudio.tsx`, `useRealtimeClient.ts`, `leadsService.ts`.
  3. Dead code to delete (Chris approved removing it): AI Sidekicks pages and `/api/blueprint/ai-sidekicks*` calls, and Google Meet `/api/email/google/oauth-url`.
  4. `POST /api/lo/chatbot/extract-file` has no auth check before the upload. Confirm that is intended.
- **Heads-up:** frontend calls that only send `x-user-id` will 401 in production on any `requireAuth` route. Use `authHeaders()`.

### 2026-09-30 16:30 — Claude: CLAUDE.md refresh + frontend/backend match audit
- CLAUDE.md section 7 updated (PRs #34–#38, email/text/DMARC, still-open list).
- Audit found 14 frontend calls with no backend route. Built the 3 that hurt LOs: `PATCH /api/lo/leads/:leadId/status`, `POST /api/lo/leads/:leadId/sms` (blocks opted-out numbers via `sms_suppression`), `GET /api/lo/search?q=`.
- Pre-qual leads have no status column; status is written to the linked `leads` row.
- Left for Chris's call (likely legacy): `/api/blueprint/ai-sidekicks*`, `/api/email/google/oauth-url`.
- Backend tests 102/102.

### 2026-09-30 15:10 — Claude — WOW email = mix of A + B; WOW text = C (copy, sent by the LO)
- **Did:** `buildWowLinkEmail` now opens with B's "YOUR LISTING, UPGRADED / {street} can now answer buyers by itself." headline, keeps A's App Store layout, adds B's 3-step "How it works", and shows the LO's NMLS in the footer. New `buildWowLinkText` (concept C wording); `POST /api/lo/partners/invite` returns `smsText`, and the invite modal in `LOPartnersPage.tsx` has a "Copy the text to send" button. The LO sends the text from their own phone (human send, so Textbelt's link block and 10DLC don't apply).
- **State:** committed and pushed on `feat/wow-email-text-mix` (PR open); tsc (2 known errors), eslint and backend tests run; email rendered and checked visually.
- **Open:** automated text sending still needs Telnyx + 10DLC. Reminder/follow-up emails still use the old copy. Listing address only appears when the invite has a listing picked.

### 2026-09-30 14:20 — Claude — Partner-agent experience: iPhone-style WOW Link page + App Store-style invite email
- **Did:** `PartnerInvitePage.tsx` rebuilt as an iPhone-style app (phone frame on desktop): letterboxed photo, blue listing-agent card + Contact sheet, green loan-officer card + "Loan questions" chat with payment-schedule card + CSV download, glass tab bar. Agent = blue, LO = green. `GET /api/public/partner-invite/:token` now returns `agent`. `buildWowLinkEmail` rewritten email-safe with 3 hosted previews (`public/email/wow-preview-*.png`, 404 until deployed) and the agent card under "What's included".
- **State:** committed and pushed on `feat/wow-link-ios-app` (PR #35); tsc, eslint, jest and backend tests pass; page and email checked visually.
- **Open:** live payment schedule (demo only; LO uploads are free text), social buttons (demo only), real tour booking, reminder/follow-up email copy still old, text message blocked on Telnyx + 10DLC. PR #35.
- **Codex:** the old dark pitch hero on the WOW page is gone on purpose. Don't restore it without asking Chris.

### 2026-09-30 09:40 — Claude — LO Share Kit (co-branded link / QR / flyer / social)
- **Did:** the agent Share Kit is owner-only (`loadListingForVideoAccess`), so LOs on a partner's listing could not reach flyers. Added a lighter LO version: `GET /api/lo/listings/:listingId/share-kit` (LO must be assigned; listing must be published with a stored `public_slug`, else 409 NOT_PUBLISHED / NO_SHARE_LINK; returns listing basics, LO profile, branding toggles), page `LOShareKitPage.tsx` at `/dashboard/lo-listings/:listingId/share-kit`, and a "📤 Share Kit" button on each assigned listing card. Pieces: tracked link, QR (client-side `qrcode`), printable flyer (opens a print window), social caption. Each piece has its own branding switch (same `listing_branding_toggles` table).
- **State:** tsc + eslint clean (2 known tsc errors), jest 43/43, backend 102/102. Not visually checked while logged in; flyer print window untested in a real browser.
- **Open / next:** Open House piece and the `share_kit` toggle are not wired to anything here. Toggle OFF only removes the LO block from that piece; it does not yet change the agent-side listing page. UTM params (`utm_source=lo_share_kit`) are not yet tied to lead attribution.


### 2026-09-30 08:50 — Claude — Trimmed the listing editor's Listing Brain tab
- **Did:** `ListingEditorPage.tsx` brain tab: 5 boxes -> 2. "Teach this home's AI" (paste/upload/scan + plain source list; "Train AI" button only when something is untrained; no "0 sources / last trained" bar) and one closed "Financing" card holding Payment Reference, rate sheet CSV, notes, and a tucked-away optional "Custom fine print" (old Payment Disclosures box; same state + save handler, so data is unchanged). Removed fake sample text (TX/CA/FL, "Close in 21 days").
- **State:** tsc + eslint clean (except 2 known tsc errors), jest 43/43. Not visually checked in a logged-in browser.
- **Open / next:** unverified whether the buyer-facing payment estimates fall back to the Compliance Brain when a listing has no custom fine print — that's why the box was tucked away, not deleted.


### 2026-09-29 10:30 — Claude — Per-listing AI phone numbers (LO / LO Pro)
- **Did:** `lo_phone_lines.listing_id` (migration `lo-phone-listing-lines-migration.sql`, APPLIED in Supabase). Main line = `listing_id IS NULL` (still one per LO); a listing line = one per listing. `loPhoneLineService` methods take an optional `listingId`; new `listingLines()`. `loPhoneCallService` focuses the AI on that one home (`focusListing`). Routes: `GET /api/lo/listing-phone-lines`, `POST /api/lo/listings/:id/phone-line/{preview,buy}` — gated to tiers `lo` / `lo_pro` (+ office/white_label) and to listings the LO owns or is assigned to. UI: `ListingPhonePanel.tsx` + "📞 AI phone number" button on each assigned listing card. Calls share the LO's monthly minute pool (`minuteUsage` counts by `lo_agent_id`).
- **State:** backend tests 102/102, tsc clean apart from the 2 known pre-existing errors.
- **Open / next:** numbers are never auto-released (by design), so a sold listing's number keeps costing ~$1/mo until someone releases it — a "retire after 60 days" job is NOT built. The $20 / 200-minute pack is NOT built. Live buy on a listing not yet clicked through by Chris.
- **Heads-up:** run the migration before deploying any code that reads `listing_id` (already done in prod).


## Log

### 2026-09-30 — Codex — Reviewed AI phone placement on landing and listings
- **Did:** Audited the LO pitch page, homepage, public listing page, phone line API, and inbound call flow. No application code changed.
- **State:** AI phone is available in AI Brain but not exposed on public listings. The listing's Call button dials the listing agent. One number belongs to each LO; calls currently have no automatic listing attribution.
- **Open / next:** Put a clearly labeled AI financing call action on eligible public listings and explain it on the LO pitch page. Add listing attribution before claiming per-listing call tracking; separate numbers per listing remain planned for LO / LO Pro.

### 2026-09-30 — Codex — LO build guide bug audit
- **Did:** Read `LO_BUILD_GUIDE.md` and created `BUG_REPORT_2026-09-30.md` with 8 source-backed findings covering public LO chat binding, sold/archive and ROI production auth, LO Today identity/counting, pre-qual flow, and quality gates.
- **State:** Report only; no application code changed. Build passes; backend 106/106 and frontend 43/43 tests pass; typecheck and lint fail. Existing uncommitted lead-scoring work left untouched.
- **Open / next:** Fix the P1 findings, then add integration coverage with distinct auth/profile IDs and canonical `properties.id`. Live integrations were not exercised.

### 2026-09-29 09:10 — Claude — Phone costs: mini model + monthly AI-minute caps
- **Did:** Default realtime model is now `gpt-realtime-2.1-mini` (~1/3 cost; override with `OPENAI_REALTIME_MODEL`). Monthly AI minutes per plan (`LO_PHONE_MINUTES` in server.cjs): trial 30, lo_lite 100, lo 300, lo_pro/office/comp 1000, none 0. Counted from `lo_phone_calls` (AI-answered, this UTC month). Out of minutes → call rings the LO's cell (or polite message). AI Brain page shows a minutes bar under the number. `GET /api/lo/phone-line` returns `minutes {used, limit, left}`.
- **Decided with Chris:** LO Lite target cost ~$7/mo for phone (100 min on mini + number + carrier). Per-listing numbers only on LO / LO Pro (not built yet). Extra-minute pack ($20 / 200 min, like An AI You) planned, not built.
- **Open / next:** caller-side transcript bug (needs a test call + logs); per-listing numbers; minute pack via Stripe; Render web off FREE plan.

### 2026-09-28 19:20 — Claude — AI phone live-tested; state saved
- **Did:** PR #22/#23 comp plan (`payment_status='comp'` → LO Pro, constraint updated). Chris's test LO comped and given (754) 243-8686 (row updated directly; number re-pointed to HomeListingAI Phone app in Telnyx). First live call: AI answered correctly. PR #24: logs realtime `error` / `input_audio_transcription.failed` / session transcription config; no summary when caller said nothing.
- **State:** Everything merged to main and deployed. CLAUDE.md section 7 updated with the full phone picture.
- **Open / next:** Only the AI side got transcribed on call #1 (caller turns missing → no lead). Next: Chris makes a 30-second test call; read Render logs `[LO Call]` for the transcription error; fix (likely transcribe model — try `OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe`). Render web still on FREE plan (must upgrade before real LOs use phone). A real 206 reservation was left to expire (free).

### 2026-09-28 16:45 — Claude — AI answers the LO's phone (Telnyx → OpenAI Realtime SIP)
- **Did:** backend/services/loPhoneCallService.js: Telnyx webhook `POST /api/webhooks/telnyx/voice` answers, then transfers the call over SIP to `sip:$OPENAI_PROJECT_ID@sip.api.openai.com` with X-HLAI-Call + HMAC token (keyed by the line's tool_token). OpenAI webhook `POST /api/webhooks/openai/realtime` (realtime.call.incoming) checks the token and accepts with the LO Brain prompt + phone rules, the LO's voice, tools (save_caller_details, transfer_to_loan_officer, end_call). A side WebSocket collects the transcript and runs tools. After hangup, finalize() (once): Jev intent (hot/warm/cold), OpenAI summary, compliance flags (channel `phone`), lead upsert (source_type `phone`), hot-lead alert. Fallbacks: AI not ready/fails → rings LO cell; no cell → polite message + hang up. 15-min cap. New `webhookSignatures.js` (Telnyx Ed25519 + OpenAI standard-webhooks). Table `lo_phone_calls` (migration applied). UI: hand-off cell + Recent calls with transcripts under the number.
- **State:** Needs on Render: OPENAI_PROJECT_ID, OPENAI_WEBHOOK_SECRET, TELNYX_PUBLIC_KEY, TELNYX_LIVE_PROVISIONING=true (to buy a real number). OpenAI project webhook must point at /api/webhooks/openai/realtime. Telnyx app "HomeListingAI Phone" needs an Outbound Voice Profile (SIP transfer + cell hand-off are outbound legs). Render web is on the FREE plan: it sleeps, so a call to a sleeping server fails — needs Starter.
- **Open / next:** Live test call. Then outbound calls (consent-gated), texts after 10DLC, delete Vapi/Hume paths. Old web-voice path still defaults to removed gpt-4o-realtime-preview (server.cjs ~15151, useRealtimeClient.ts).

### 2026-09-28 13:30 — Claude — Get my AI phone number (PR #20, live, off by default)
- **Did:** Ported An AI You number provisioning into HLAI: backend/services/telnyxClient.js (numbers + mock), loPhoneLineService.js, GET /api/lo/phone-line, POST /preview, POST /buy. Table lo_phone_lines (migration applied). UI lives in AI Brain > Calls & Texts.
- **State:** Merged + live but hidden: needs TELNYX_PHONE_ENABLED=true or PHONE_BETA_LO_IDS. Mock (no cost) unless TELNYX_LIVE_PROVISIONING=true + TELNYX_API_KEY. TELNYX_CONNECTION_ID for a NEW HLAI Voice API app not created yet (do not reuse ai-you-phone).
- **Open / next:** Step 2: AI answering = Telnyx inbound -> OpenAI Realtime (SIP) with LO Brain + compliance, transfer to LO cell, lead + transcript saved. Only then turn live provisioning on.

### 2026-09-28 10:45 — Claude — AI Brain light redesign + Calls & Texts settings (PRs #18, #19, live)
- **Did:** AI Brain page now matches LO Today (light, one column, collapsible). New Calls & Texts section: OpenAI voice picker (Marin/Cedar) + "Hear it" (`POST /api/lo/brain/voice-preview`, gpt-4o-mini-tts), Off/Ask/Auto for calls + texts, call opening, voicemail, text templates. New columns on `lo_chatbot_configs` (`lo-brain-calls-texts-migration.sql`, applied).
- **State:** Merged + live. Settings save only — nothing dials or texts yet (badge says "Phone line not connected yet").
- **Open / next:** Wire outbound/inbound calls: Telnyx number → OpenAI Realtime (gpt-realtime-2.1, SIP) using the LO Brain prompt + compliance; texts through the An AI You comms engine port. Then delete Vapi/Hume paths. Chris decided: voice = OpenAI only, no third-party voice apps; Telnyx is only the phone line.
- **Heads-up:** Consent rules must gate every call/text (only opted-in, STOP, 8am–9pm local, says it's an AI).

### 2026-09-28 09:00 — Claude — Built LO Brain slice 1 (branch `feat/lo-brain`, PR #17)
- **Did:** New `backend/services/loBrainService.js` (stacked prompt: platform safety > LO Compliance Brain > identity > ONE rulebook picked by Jev > knowledge > listing + payment schedule; plain-code reply check: banned words block, disclosure appended, logged). `/api/public/lo-chat` now runs it. New `/api/lo/brain/summary|test|feedback`. New AI Brain page `LOBrainPage.tsx` (replaces `LOChatbotSetupPage`, same route `/dashboard/lo-chatbot`, sidebar "AI Brain"). `lo-brain-migration.sql` (idempotent).
- **State:** Pushed to GitHub branch `feat/lo-brain`, PR https://github.com/AIyou-chris/home-listing-ai-app/pull/17. MERGED to main 2026-09-28 and LIVE (Render + Netlify verified). Migration RUN in Supabase (HOMELISTINGAI project) by Claude. Tests: 16 new, backend 78/78, jest 43/43, build OK.
- **Open / next:** Chris runs the migration, then merge. Next slices: Listing Brain page, Admin Brain, AI Team control levels, texting onto the comms engine.
- **Heads-up:** Jev routing uses `typesafeClient.js` `choice` (the one client — no SDK). Codex: your uncommitted lead-scoring work should reuse this same client. `/api/public/lo-chat` still trusts the `lo_agent_id` the browser sends (pre-existing) — worth checking it against `listing_lo_assignments`.

### 2026-09-28 07:50 — Claude — Chris's decisions on the plan
- **Chris decided:** (1) **Take An AI You's Marketing Studio and Prospect Finder the SAME** (overrides Codex's 'skip' in section 6B). Chris uses the finder to find LOs and others for HLAI. (2) **HLAI's AI Brain page must work the same as An AI You's Business Brain screen** (knowledge library, voice/personality, 3 rulebooks, test chat, all sources).
- **State:** Layout mockup made for Chris to review (AI Brain page, AI Team + control levels Off / Ask me first / Do it-tell me, how-it-works diagram). No code yet. Chris wants to dig into the layout before any build.
- **Open / next:** Wait for Chris's layout feedback before building. Codex's safety points still stand (Jev decides but doesn't send; small steps; delete old paths).

### 2026-09-27 20:14 — Codex — Reviewed An AI You reuse plan and overhaul risks
- **Did:** Verified Claude's phone/comms/one-brain claims and reviewed marketing, image/video, prospect/social and QR code in `/tmp/ai-landing-template-review`. Appended `docs/overhaul/ANAIYOU_REUSE.md` section 6 with take/skip decisions, revised build order, API choices, Jev-client decision and HLAI blockers.
- **State:** Review docs only; not committed. No application/backend code changed. Focused TypeSafe/scoring tests pass (14/14).
- **Open / next:** Keep `backend/services/typesafeClient.js` as the single Jev boundary. The uncommitted lead-scoring prototype should not merge until its direct SDK client is removed/consolidated and integration/idempotency/compliance tests are added. Start 10DLC paperwork in parallel; implement one-brain + comms as vertical slices, not a big-bang replacement.
- **Heads-up:** Treat the uncommitted TypeSafe lead-scoring files as Codex work and leave them untouched. HLAI already has stronger QR tracking, Buffer publishing and a specialized Lead Finder; do not port those An AI You subsystems wholesale. OpenAI's Sora Videos API shut down 2026-09-24; use deterministic FFmpeg first and evaluate Gemini video only later.

### 2026-09-27 20:00 — Claude — Reviewed An AI You (anaiyou.com) for the HLAI overhaul
- **Did:** Read the `AIyou-chris/ai-landing-template` backend. Wrote `docs/overhaul/ANAIYOU_REUSE.md` (what to port: Telnyx AI phone employee, comms/SMS engine, one-brain-many-doors + Jev as router).
- **State:** Doc committed locally on `main`. No code changed.
- **Open / next:** **Codex:** review section 5 of that doc (marketing studio, image/video, prospect finder, new APIs) and add your findings there. Chris wants the overhaul to be "one brain, different AI agents, more AI control".
- **Heads-up:** Both apps still send SMS via Textbelt. The Telnyx SMS adapter is step 1 of the overhaul.

### 2026-09-27 19:30 — Claude — Set up this handoff system + Jev audit
- **Did:** Created `AI_HANDOFF.md`. Added a "read this first" pointer to the top of `AGENTS.md` (Codex) and `CLAUDE.md` (Claude).
- **State:** Committed locally on `main`. Not pushed.
- **Open / next — Jev status:**
  - ✅ Live in code (commit `8db08ebe`): `backend/services/typesafeClient.js` + Lead Finder job-title filter (`loLeadScraperService.classifyRoleMatches`).
  - 🚧 **Uncommitted, in progress (likely Codex):** Jev in lead scoring — `LeadScoringService.js`, new `TypeSafeLeadQualificationService.js`, tests, and `@typesafe-ai/sdk` added to `backend/package.json`. Left untouched.
  - ⚠️ **Two TypeSafe clients now exist.** `typesafeClient.js` uses raw `fetch` (the ADR says the SDK was ESM-only). But `@typesafe-ai/sdk` 0.6.0 ships a CommonJS build (`dist/index.cjs`), so the SDK works here. Pick ONE and update ADR 0003 before merging the lead-scoring work.
  - 🔑 `TYPESAFE_API_KEY` is **set on Render** (web service) and tested by Chris 2026-09-27. Not in local `.env` — local dev falls back (by design).
- **Heads-up:** `SESSION_HANDOFF.md` is stale (last updated 2026-06-06). Use this file instead.
