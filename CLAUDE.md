<!-- AI-HANDOFF-POINTER -->
> **🤝 Claude + Codex both work in this repo.** At the start of every session read `AI_HANDOFF.md` (latest entries). At the end, add an entry at the top of its log. Use **Jev (TypeSafe)** for yes/no, category and scoring judgments. Rules are in `AI_HANDOFF.md`.

# HomeListingAI — Claude Project Context

> This file is read automatically at the start of every Claude session.
> Keep it up to date as the project evolves.

---

## 0. Golden Rules (read this first — always)

See `GOLDEN_RULES.md` in the project root. Every feature decision is measured against these three rules:

1. **🔥 Get warm leads** — does it turn browsers into real, qualified conversations?
2. **🤝 Build agent partnerships** — does it make the LO indispensable to agents?
3. **⚡ Keep it simple and fast** — 3 taps max, one primary action per screen, show don't tell

This is built by someone with 15 years in the mortgage industry. The two biggest pain points for every LO are warm leads and agent partnerships. This app solves both. Never lose sight of that.

---

## 1. App Purpose / Who It's For

HomeListingAI is an AI-powered operating system for real estate agents and small broker teams.

It helps agents:
- Create listing content
- Run share kits
- Capture leads
- Manage appointments
- Track pipeline health

**Primary users:**
- **Agents** — day-to-day use
- **Team leads / brokers** — performance + oversight
- **Admins** — platform operations

---

## 2. Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite 7, React Router 6, Tailwind CSS, Zustand, react-hot-toast |
| Backend | Node.js + Express 5 (monolithic server in `backend/server.cjs`) |
| Data / Auth / Storage | Supabase (Postgres + auth/storage via `@supabase/supabase-js`) + `pg` driver |
| Integrations | OpenAI, Google GenAI / googleapis, Stripe, Telnyx, QR tooling, Mailgun (sending + inbound), Textbelt (SMS) |
| Tooling | ESLint, TypeScript checks, Jest tests, npm scripts for local orchestration |
| Hosting | Frontend → Netlify (`homelistingai.com`); Backend → Render (`home-listing-ai-backend.onrender.com`) |

---

## 3. Coding Conventions (Codex-established)

- Keep API responses contract-stable and explicit — use predictable JSON envelopes.
- Enforce dashboard ownership checks on agent resources; wrong owner returns `403 listing_access_denied`.
- Use `listing.status` as the single source of truth for publish state (`draft` or `published`).
- Prefer meaningful error codes (e.g. `409 NOT_PUBLISHED`) instead of generic 500 failures.
- Keep dev/demo-only behavior behind explicit guards/flags — do not leak into production behavior.
- Apply schema updates via idempotent SQL migration before relying on new tables/columns.
- Make targeted changes and avoid collateral edits to unrelated subsystems.
- Frontend components live in `src/components/`. Page-level route components live in `src/pages/` or `src/components/dashboard-command/`.
- **API auth pattern**: All dashboard API calls must send `Authorization: Bearer {accessToken}`. Use `authHeaders(agentId)` (async, from `src/services/dashboard/utils.ts`). `defaultJsonHeaders` is now an **alias of `authHeaders`** (as of 2026-10-01) — it is async and must be awaited; there is no token-less builder any more. `resolveRequesterUserId()` in production requires a Bearer token; without it the endpoint returns 401.
- **Never derive an owner id from the request.** No `req.query.agentId`, `req.headers['x-user-id']` or `DEFAULT_LEAD_USER_ID` fallback — that is a hole, not a pattern. Use the guards/resolvers: `requireAuth` · `requireLoAgent` · `requireOffice` · `verifyAdmin` · `resolveDashboardOwnerId(req)` (async, 401 on null) for `/api/dashboard/*` · `resolveLoAgentId(req)` for FK-enforced LO tables · `resolveBillingAgentId(req)` · `appointmentOwnerIds(req)`.
- **Every `/api` route needs a guard or an allowlist entry.** `backend/__tests__/routeGuards.test.js` fails the build for any route with no login guard that is not in `backend/__tests__/publicRoutes.allowlist.js`. Money, mail, SMS, calls, deletes and paid-AI routes must NEVER be public. Probe new routes live with an empty POST body: a 400 with no token means it is open.
- **Never select a column you have not verified.** The `agents` table has NO `full_name` and NO `brokerage` (use `first_name`+`last_name` and `company`); `properties` has no `city/state/zip`. Supabase returns `data: null` and the code swallows it. Run `node backend/scripts/check-db-columns.cjs --sql` and paste the output into the Supabase SQL editor (or set `SUPABASE_DB_URL`), or `npm run check:db`. The server also logs `🚨 [DB SCHEMA ERROR]` for any such query.
- **User-typed URLs must go through `safeFetch()`** (`backend/services/safeUrl.js`), never a bare `fetch(url)` (SSRF).
- **The app stylesheet is `src/public.css`** (`main.tsx` → `PublicApp` → `public.css`). Its last block is the dashboard accessibility layer (12px minimum text, AA contrast, 40px touch targets). `styles.css` / `index.tsx` / `App.css` were dead and are deleted.
- **Never write `.catch()` directly on a Supabase query builder.** A builder is a thenable with `then` but **no `catch`**, so `.catch(() => null)` throws *after* the write already happened. Use the `bestEffort(query)` helper in `server.cjs`.

---

## 4. Pages — Done vs In Progress

### ✅ Done / Active Routes

**Public:**
- `/` — Landing
- `/signin`, `/signup`
- `/checkout/:slug?`
- `/store/:slug`
- `/blog`, `/blog/:slug`
- `/listing/:id`, `/l/:publicSlug`

**Agent Dashboard (command suite):**
- `/dashboard/today`
- `/dashboard/command-center`
- `/dashboard/leads`
- `/dashboard/appointments`
- `/dashboard/listings`
- `/dashboard/listings/:listingId`
- `/dashboard/billing`
- `/dashboard/onboarding`
- `/dashboard/settings` — Profile, Notifications, Email, Calendar, Security, Billing tabs

**LO (Loan Officer) Platform:**
- `/dashboard/lo-partners` — agent partnerships + WOW Link sender
- `/dashboard/lo-listings/:listingId/share-kit` — **LO Share Kit** (link, QR, flyer, social post)
- `/dashboard/lo-listings` — assigned listings + branding toggles + rate sheet upload + Payment Reference toggle + "📊 Live Dashboard" share
- `/dashboard/lo-chatbot` — **AI Brain** (LO Brain: train once, every listing uses it; Compliance Brain; Calls & Texts; AI phone number + recent calls)
- `/dashboard/lo-invoices` + public `/invoice/:token` — **LO → agent invoices** (shared marketing cost). We create/email/track only; never handle the payment. Run `lo-invoices-migration.sql` first. Agents see theirs in Settings → Billing.
- `/partner-invite/:token` — **WOW Link**: iPhone-style app (listing, agent card, LO card, loan chat, tour booking preview), sent to agents
- `/listing-dashboard/:token` — public per-listing live lead dashboard (token-gated)
- `/for-loan-officers` + `/for-loan-officers/:token` — **LO Acquisition Link**: marketing pitch page admin sends to *prospective* LOs (inverse of the WOW Link). Tokened version tracks opens/clicks + personalizes the hero; CTA → `/lo-signup`. Untokened version is shareable but untracked. Admin sends/tracks from Marketing Funnels (`AdminLoOutreachPanel`).

**Office Tier:**
- `/dashboard/office` — branch-manager oversight: KPIs + LO leaderboard + invite LOs
- `/office-invite/:token` — invited LO claims account, auto-linked to office

**Legacy listing flow (still active):**
- `/listings`, `/add-listing`, `/property`, `/listings-v2`

**Admin:**
- `/admin`, `/admin/:tab`, `/admin-login`, `/admin-setup`

---

### 🚧 In Progress / Partial

- **#18 White Label** — custom domain + full office rebrand (IN PROGRESS).
- **SMS messaging** — Textbelt sends text-only messages; link-in-SMS requires key verification at textbelt.com/whitelist.
- **7-day drip video slots** — `TRIAL_DRIP_VIDEOS` map in `backend/services/emailService.js` ready; paste video URLs to auto-add watch buttons per day.

---

### ⚠️ Critical Architecture Notes (LO Platform)

- **Two ID forms per account.** `resolveRequesterUserId()` returns the **auth/login id**; FK-enforced tables (`lo_chatbot_configs`, `listing_lo_assignments`, `pre_qual_submissions`, `listing_branding_toggles`, `listing_dashboard_tokens.created_by`) require the **agents.id profile id**. ALWAYS use the canonical helper **`resolveLoAgentId(req)`** for those — never pass the raw auth id. Office accounts use **`resolveOfficeContext(req)`**.
- **`listings` vs `properties`.** The LO platform's `listing_id` everywhere = **`properties.id`** (rich data). The `listings` table is a legacy stub — do not query it for price/beds/photos.
- **`account_type`** values: `realtor` | `lo` | `agent` | `office`. The old DB check constraint was dropped (app-controlled). An "office" is an `agents` row with `account_type='office'`; LOs link via `agents.office_id`.
- **`agent_invites.lo_agent_id`** stores the auth id (its FK was dropped) — the odd one out; internally consistent within the invite→claim→partnership chain. Leave as-is.
- **`ai_conversations`** — `listing_id` FK to legacy `listings` table was dropped (migration applied). `visitor_id` lives in `metadata->>'visitor_id'`, not a column. `user_id` must be `agents.id` (profile id), resolved via `resolveAgentProfileId(rawId)`.
- Migrations are committed as `*-migration.sql` / `*.sql` in repo root; user runs them manually in Supabase SQL editor.

---

### ⚠️ Infrastructure Notes

- **Render (as of 2026-10-02): ONE service does everything.** `home-listing-ai-backend` runs `APP_RUNTIME_MODE=all` + `JOB_WORKER_ENABLED=true` (verify at `/healthz`: `run_background_tasks` and `run_job_worker` must be `true`). In `web` mode the 60-second loop (trial warnings, trial expiry, daily digest, follow-up funnel engine) and the job queue (email_send, sms_send, Stripe webhook jobs, lead summaries) did NOT run anywhere. **To do (Chris):** upgrade the web service to the $7 Starter plan (free plan sleeps; a GitHub Action pings it every 10 min), then suspend `home-listing-ai-worker`, delete `home-listing-ai-video-worker`, and downgrade the $25/mo Pro workspace plan. The ai-you-* services on the same account belong to a different business. A payment failure on the Render account (Sep invoice $73.52) was open on 2026-10-02: **pay it first.**
- **Optional env to set on Render:** `SENTRY_DSN` (Sentry is already wired; free Developer plan), `CRON_SECRET` and `INTERNAL_JOB_SECRET` (the cron/nudge routes now refuse without them; the old hardcoded defaults were removed), `EMAIL_WEBHOOK_SECRET` (generic bounce hook is closed without it).
- **Netlify proxy**: `/api/*` → Render backend. The old `/api/ai-card/*` → Netlify Functions redirect was dead and has been removed.
- **Email inbound**: Mailgun receiving domain is `mg.homelistingai.com` (MX records already in Netlify DNS). Route set up to POST to `/api/leads/email-forward`. Agent forwarding address format: `{agent-slug}@mg.homelistingai.com`.
- **`supabase` and `supabaseAdmin`** in `server.cjs` are guarded against null (won't crash if env vars missing at startup).

---

## 5. How to Work With This User

- **One step at a time.** When the user needs to do something manually, give them exactly one clear instruction. Wait for them to confirm it's done before giving the next step. No walls of instructions.
- **Do the heavy lifting.** The user does not code. Write all code directly — don't explain how to do it, just do it.
- **Act like a 20-year senior engineer + startup guru.** If something looks wrong, incomplete, or could be better — say so. Lay out what you want to fix and why. Be proactive, not just reactive.
- **Be clear, direct, and to the point.** No fluff. No filler. Say what needs to be said and stop.
- **Surface ambiguity before implementing.** If multiple interpretations exist, present them — don't pick silently.
- **Keep it simple.** Build for non-technical users. If it needs an explanation to use, it's too complicated.
- **Flag issues early.** If you see a bug, a bad pattern, or a missing piece while working on something else — call it out. Don't silently walk past problems.

### Audit & Fix Reporting Format

**When auditing a page or the backend**, present all findings as a simple table — nothing else:

| # | Issue | Severity | Blocks Users? |
|---|---|---|---|
| 1 | Short description of the problem | 🔴 Broken / 🟡 Watch / 🟢 Minor | Yes / No |

Then ask: "Want me to fix all of these, or just the 🔴 ones?"

**After fixes are implemented**, present results as a simple table with a green light:

| # | What Was Fixed | Status |
|---|---|---|
| 1 | Short description of what changed | ✅ Fixed |

No long explanations. No walls of text. Table in, table out.

---

## 6. Key Files to Know

| File | Purpose |
|---|---|
| `src/App.tsx` | Root routing + auth state |
| `src/components/dashboard-command/TodayDashboardPage.tsx` | Agent Today / main dashboard |
| `src/components/dashboard-command/LOTodayPage.tsx` | LO Today dashboard |
| `src/components/Sidebar.tsx` | Agent nav sidebar |
| `src/components/AdminSidebar.tsx` | Admin nav sidebar |
| `src/services/dashboardCommandService.ts` | Dashboard API calls |
| `src/services/dashboard/utils.ts` | Shared fetch helpers — use `authHeaders()` (async, includes Bearer token) for auth'd endpoints |
| `src/services/dashboard/roi.ts` | ROI / performance data fetching |
| `src/services/onboardingService.ts` | Onboarding state fetch/patch |
| `src/state/useDashboardRealtimeStore.ts` | Zustand store for realtime leads/appointments |
| `src/components/dashboard-command/PageGuide.tsx` | Per-page how-to guides (12 pages covered) |
| `src/components/settings/EmailSettings.tsx` | Email settings — inbound lead forwarding address |
| `src/components/settings/NotificationSettings.tsx` | Notification toggles — SMS section is push + test only |
| `backend/server.cjs` | Express monolith — all API routes |
| `backend/services/emailService.js` | Transactional email + 7-day LO trial drip |
| `backend/services/schedulerService.js` | Drip email scheduler (days 1–7 at d×24h windows) |
| `backend/services/LeadScoringService.js` | Lead scoring — guarded against missing Supabase creds |
| `src/types.ts` | Shared TypeScript types |
| `netlify.toml` | Netlify build + proxy config (`/api/*` → Render) |
| `render.yaml` | Render service definitions (web + worker) |

---

## 7. Current State Snapshot (as of 2026-10-02)

### ✅ Recently completed — Agent + admin launch audits (2026-10-03/04)

| Area | Notes |
|---|---|
| **Agent dashboard audit** | Public `POST /api/appointments` is rate limited (`services/publicBookingGuard.js`) and books Hot leads; `POST /api/properties` always creates drafts (publish route enforces plan cap); `/api/billing/checkout-session` accepts `lo_lite`; agents no longer blocked by onboarding; lead list capped at 500; WebSocket sends its token as a first message; ~1,700 lines of dead code removed. |
| **LO to agent invoices** | `lo_agent_invoices` + `/dashboard/lo-invoices` + public `/invoice/:token`. We create/email/track only; **never handle payment**. Realtor agents are free: their Settings → Billing lists invoices, no plans. |
| **🔴 Admin setup hole** | `POST /api/admin/setup` had no login and only refused if `admin_users` had rows (that table does not exist), so anyone could create a super-admin. Now needs `ADMIN_SETUP_TOKEN` (`services/adminSetupGuard.js`). Only admin is cdipotter@me.com. |
| **Buyer chat was not saving** | Real DB lacks `ai_conversation_messages.intent_tags/is_capture_event/confidence` and `ai_conversations.agent_id/visitor_id/channel/last_activity_at/started_at`. Use `insertRowTolerant`/`updateRowTolerant` (`services/columnFallback.js`). Optional `ai-chat-columns-migration.sql` adds them. |
| **Admin tabs done** | Leads & Appointments (call-first, owner filter, notes, appointment edit), AI Conversations (field-name adapter, paging, badges), Inbox (rebuilt). Admin Settings/Training Studio now send the login token. Remaining: AI Sidekicks, Marketing Funnels, Broadcasts, Listings, LO Platform, Users, Blog, White Label, Settings. |
| **Guards** | `noUndefinedNames.test.js` fails the build on undefined variables in `server.cjs`. Never put `.catch()` on a Supabase builder (still true). |

### ✅ Recently completed — Security + dashboard hardening day (2026-10-02, commits dd126dc6 … b93cb43e)

| Area | Notes |
|---|---|
| **🔴 Second security lockdown** | ~60 owner-scoped routes locked (listings, conversations, sidekicks, email/security/notification settings, funnels, lead stats, ai-card writes) with new hoisted guards in `server.cjs`: `authOwnsId`, `requireParamOwner`, `requireLeadOwner`, `requireConversationAccess`, `requireNamedUserIsCaller`, `requireSidekickOwner`. Then probing live with empty POSTs found that anyone on the internet could send email (any From), place calls, send SMS, make short links, use paid OpenAI, **delete any agent** (`/api/setup/reset-agent`), open **any account's Stripe portal**, email attacker-chosen addresses (`notify-login`) and mark any lead Bounced. All closed and verified 401. Hardcoded fallback secrets removed. SSRF closed via `safeFetch`. |
| **Safety nets** | Route-guard test + allowlist (above), `dbErrorWatch` (loud schema errors, Sentry if configured), `check-db-columns` script. `npm run test:backend` = 155 tests. |
| **🔴 Silent schema bugs found and fixed** | `agents.full_name/brokerage`, `properties.city/state/zip`, `ai_conversations.visitor_id/channel/...`, `listing_sources.text` do not exist. Broke: lead-detail Mortgage Partner card, LO Share Kit flyer (no LO/agent), WOW page agent info, lead "View conversation" (always 500), lead detail listing, weekly agent email. Migration `missing-core-tables-migration.sql` (appointment_reminders, lead_events, lead_conversation_summaries) was RUN in Supabase. Known remaining (tolerated by fallbacks): `agents.user_id/is_admin`, `ai_knowledge_base` missing, two reminder systems (the queue processor `processQueuedAppointmentReminders` and `queueAppointmentInviteEmails` are never called; the 1-minute cron on `appointments` does the real reminders). |
| **Agent dashboard** | New: Call-now hero (`CallNowHero`), speed-to-lead `WaitingBadge`, Jev reason on every lead (`LeadReason`), "Ask my loan officer to call" (`POST /api/dashboard/leads/:id/ask-lo`, bell + email, once per 30 min), "Your loan officer" card (`GET /api/dashboard/my-loan-officer`), primary Share button, install-to-home-screen prompt, live new-lead toast with Call button. Agent Share Kit now matches the LO kit (shared `ShareKitCards.tsx`) minus co-branding; flyer has a smaller price and a short description. |
| **LO dashboard** | Call-now hero + timer + one-tap Call/Text on LO Today; LO Today now returns `phone`/`sourceType`/`intentReason` (phone-only leads used to read "No contact info"); heading padding; bell no longer covers the page-guide X. Compliance Brain starts from the LO profile (company, lending states). |
| **Lead rating at capture** | `services/captureIntent.js`: showing/pre-approval = Hot, report = Warm, contact left = Warm, none = Cold, with reason in `source_meta.intent_reason`; repeat visits only raise it. Jev still rates replies (`TypeSafeLeadQualificationService`, +points in `LeadScoringService`) and pre-approvals. |
| **Cleanup** | ~10,000 lines of hidden pages/unused helpers removed (AI Conversations, AI Sidekicks, Funnel Analytics, Marketing Reports, Voice Lab, Share Test, old Share Kit panel, `Dashboard.tsx`, dead entry/style files). Admin still uses AICardPage, AIConversationsPage, AISidekicks (so their backend routes stay). ~40 backend routes with no caller remain (all auth-locked; a bulk edit was blocked by the harness). |
| **Sentry is live** | `SENTRY_DSN` saved on Render (project `node-express`, free Developer plan, error monitoring only). First alert was real: `ensureDefaultFunnels()` looked funnels up by `type` (empty on existing rows, they use `funnel_key`) and inserted with non-existent columns (`title`, `is_active`); fixed, mark the issue Resolved. |
| **🔴 Money path audit (2026-10-03)** | DB had ZERO paying customers ever. Fixed: (1) hardcoded `LIFETIME`/`FRIENDS30` free-access codes in both checkout routes and the UI placeholder; codes now come only from env `FREE_ACCESS_PROMO_CODES` (`services/promoCodes.js`). (2) LO checkout used the agent SLUG as the Stripe `client_reference_id`, which the webhook used as the account id, so a paying LO was never activated; checkout now sends `agent_id` in session + subscription metadata and the webhook converts a slug to the real id. (3) Checkout added a full 7-day Stripe trial on top of the no-card trial; `services/checkoutTrial.js` now gives only the days left (0 once expired). Entitlement is read live from Stripe (`active`/`trialing`). **Live money test still to run.** |
| **Measured design fixes** | Tiny text 17-23/page → 0, low contrast 10-22 → 0-4, touch targets 40 → 0 (Appointments). |

**Open threads / next:** (1) Chris pays Render, then the Render savings above; (2) ~~set `SENTRY_DSN`~~ done; (3) **"money test"** — sign up a brand-new LO, trial, Stripe checkout, confirm the account unlocks (in the DB: `subscriptions` row + `agents.stripe_customer_id`), then cancel inside the trial; (4) background push alerts (service worker + VAPID + subscriptions table; `public/sw.js` is still the kill-switch); (5) Today/Appointments declutter (one primary action per card, collapse the page-guide); (6) untested for real: "Ask my LO", "Your loan officer" card, "Send hot callers to", real reminder emails, WOW link with a real agent; (7) the earlier AI Brain "Reason:" line never came back; (8) repo clutter (105 root files, ~30 stale `.md`, 6 AI-tool config files).

**Lesson recorded:** a multi-part scripted edit failed halfway twice today (an `import` anchor that did not exist). Re-verify every part with a grep count before committing. And measure in the browser before declaring a visual fix done (the first CSS went into a dead file).

### Earlier snapshot (2026-10-01)

### ✅ Recently completed — Tab-by-tab dashboard audit + auth lockdown (2026-10-01, PRs #43–#60)

A full pass over every dashboard tab, LO side then agent side. Per-PR detail is in `AI_HANDOFF.md`; this is the state it left behind.

| Area | Notes |
|---|---|
| **🔴 Auth: 24 unauthenticated endpoints closed across the whole app** | The recurring root cause was an owner id taken from `req.query.agentId` / `req.headers['x-user-id']` with `DEFAULT_LEAD_USER_ID` as a fallback, so **no token was needed at all**. Closed: Today leads/appointments/roi-metrics · all four `/api/appointments` routes (anyone could delete any meeting platform-wide) · notification settings read+write · and on the agent side 17 more (PR #60) including `DELETE /api/dashboard/leads/:leadId`, `PATCH /api/dashboard/leads/:leadId/status` (which had **no owner check of any kind**), `/api/dashboard/leads/:leadId[/conversation]`, `/export-conversations`, `/command-center`, `/automation-recipes`, the five appointment-reminder routes, `/listings/:id/{leads,performance}`, `/agent-actions`, and `GET/PUT /api/agent/identity` (could rewrite the From address on an agent's outgoing email). Live-verified 401 after deploy. |
| **`resolveDashboardOwnerId` is now async + authenticated** | Resolves the owner from the signed-in session, returns null on a bad/expired token (→ 401, never 500), and allows the one legitimate case where a caller sends the `agents` **profile** id while the token carries the **login** id. Every `/api/dashboard` owner-resolution site goes through it, each followed by `res.status(401).json(UNAUTHORIZED_DASHBOARD)`. |
| **Frontend: there is only ONE header builder now** | `defaultJsonHeaders` in `src/services/dashboard/utils.ts` is an **alias of `authHeaders`** (async, sends Bearer) and all 32 call sites await it. The sync token-less version is gone, so there is nothing left to reach for by mistake. `listingBuilderService.ts` keeps its own local async version (already sent Bearer). **This closed the bug class that caused three separate production 401s** (ROI/onboarding, dashboard appointments, listing photo upload). |
| **🔴 AI Brain data-loss bug** (`LOBrainPage.tsx`) | A failed config load left `EMPTY_CONFIG` on screen and the next save — including the automatic one from add/remove source — wiped `knowledge_base`, `faq`, compliance and `banned_phrases` while toasting "AI Brain saved". Now: one silent retry after 1.5s, then a hard-stop card printing `Reason: <status>`, and `persist()` refuses to write while `loadFailed`. **Chris reported the card firing on the live site and has not yet sent the Reason line — that is the open thread.** |
| **Jev rates every pre-approval lead** (`backend/services/leadIntentRater.js`, +15 tests) | Hot / Warm / Cold via a TypeSafe `choice` question, with a conservative plain-rules fallback on unconfigured / error / unknown choice / confidence < 0.4. Never loses or leaves a lead unrated. Stored in `leads.source_meta` as `intent_reason` + `intent_source` (`jev` or why it fell back). `TYPESAFE_API_KEY` is set on Render; confirmed live (`intent_source: "jev"`). |
| **Pre-approval form takes name + phone OR email** (`PreApprovalSheet.tsx`) | Was phone-only. Success line matches whichever channel they gave. |
| **🔴 `bestEffort()` helper** | A Supabase query builder is a thenable with `then` but **no `catch`**, so `.catch(() => null)` threw *after* the rows were written — that was the pre-approval form's 500. `const bestEffort = (query) => Promise.resolve(query).then((r) => r, () => null)` now wraps all six such sites. **Never write `.catch()` directly on a Supabase builder.** |
| **Listing editor publish rules** (`ListingEditorPage.tsx`) | Publishing needs **address + price + at least one photo**; beds/baths/sqft are optional so land and lots can publish. `publishBlockers` shows "To publish, add …". `beforeunload` guard on unsaved edits. |
| **Per-listing call forwarding** | `PUT /api/lo/listings/:listingId/phone-line/transfer` + UI in `ListingPhonePanel.tsx`, on the pre-existing `lo_phone_lines.transfer_number`. "Send hot callers to" — **never tested with a real call.** |
| **Price-drop opt-in shows once** | Per-visitor, was re-prompting on every visit. Flyer fixed. |
| **Public listing view tracking** | `POST /api/public/listing/:listingId/view`, 1 per visitor per hour → `listing_events` type `view`. |
| **LO notifications actually land** | `notifications.user_id` FKs to `auth.users`; the code was passing the **profile** id. Now resolves `agents.auth_user_id`. |
| **Duplicate leads fixed** | A regression from PR #41: a pre-qual writes both a `leads` row and a `pre_qual_submissions` row and `/api/lo/leads` listed both. Now only **orphan** pre-quals (no `lead_id`) are listed; linked ones enrich their `leads` row. |
| **One WOW reminder email builder** | `backend/services/wowReminderEmail.js` (+4 tests) — the manual nudge and the hourly follow-up cron now match the first invite's look. |

**Verification baseline as of this date:** `npm run test:backend` **129 pass** · `npm test` (Jest) **43 pass** · `npx tsc --noEmit -p .` clean · `npm run lint` clean · `npm run build` ✓.

**🔴 Open threads from this block:**
1. **Chris's AI Brain page won't load** — he needs to send the `Reason:` line from https://homelistingai.com/dashboard/lo-chatbot.
2. **His Compliance Brain is empty** — `company_name`, `company_nmls`, `required_disclosure` blank, `licensed_states` 0, `faq` 0, `calls_mode` `off`. The AI answers loan questions without naming the company, NMLS or licensed states.
3. **Still spoofable, deliberately left** (not agent-dashboard, each needs Chris's call): `POST /api/listings` · `GET /api/listings/:listingId/market-analysis` · `GET /api/video-credits/:listingId` · `POST /api/security/audit` · `GET /api/training/feedback/:sidekick` · the 6-route `/api/ai-card/*` group (that UI is hidden as unused — fix or delete) · the `last_seen_at` middleware on `/api/dashboard` (cosmetic).
4. **Never tested in the real world:** a real phone call through "Send hot callers to" · a real appointment reminder email · the WOW link end to end with a real agent.

**Lesson recorded:** when a scripted multi-part edit fails partway, **re-verify every part** — a Python edit script that raised before its `write()` silently discarded all its changes, and work was reported as done that was not.

### ✅ Recently completed — Partner-agent experience + email deliverability (2026-09-30, PRs #34–#38)

| Feature | Notes |
|---|---|
| **WOW Link page is an iPhone-style app** (`src/pages/PartnerInvitePage.tsx`, `/partner-invite/:token`) | Phone frame on desktop, full screen on phones. Letterboxed photo card with price / facts / address / **listing description** (3 lines + Read more), blue **listing-agent** card + Contact sheet, green **loan-officer** card + "Loan questions" chat, glass tab bar (Home / Tour the Home / Contact). Colors: **agent = blue, LO = green** everywhere. Demo token `demo` is fully client-side (`DEMO_AGENT` Sarah Johnson / `DEMO_LISTING` / Alex Rivera). The old dark pitch hero is gone on purpose. |
| **Tour the Home = booking calendar (preview)** | `TourSheet`: 7 days, 9 time slots, name + phone, confirmation with "Add to my calendar" (.ics). **Saves nothing yet**; the page says "Preview". Real booking needs the agent to claim an account (then reuse `POST /api/appointments`, which is owner-scoped). |
| **Payment schedule in Loan chat** | Only the demo (and any LO-supplied `schedule`) shows a schedule card + CSV download. Generated numbers (7.1%, 30 yr, P&I only) are labeled "Example only, not a quote" and never shown to real invites. LO uploads are free text (`lo_listing_kb_docs.content`), so a structured schedule is **not wired yet**. |
| **API** | `GET /api/public/partner-invite/:token` also returns `agent {name, company, headshotUrl, phone, email, website}`. Phone/email come **only from the claimed agent profile** (unclaimed invitee contact data is never exposed). |
| **Invite email = mix of concept A + B** (`buildWowLinkEmail` in `server.cjs`) | "YOUR LISTING, UPGRADED / {street} can now answer buyers by itself", App Store-style header, stats strip, 3 hosted phone previews (`public/email/wow-preview-{home,contact,loan}.png`), 3-step How it works, agent card, blue demo button, claim link, footer with LO NMLS. Email-safe: tables, inline CSS, system fonts. Blank agent name reads "your", not "there's". |
| **Invite text = concept C** (`buildWowLinkText`) | `POST /api/lo/partners/invite` returns `smsText`; the invite modal has **"Copy the text to send"**. The **LO sends it from their own phone** (human send), so Textbelt's link block and 10DLC do not apply. **Automated** sending still needs the SMS provider switch (Telnyx + 10DLC). |
| **Email deliverability fix** (`emailService.js`) | Real headers showed SPF pass, DKIM pass, **DMARC fail** because From was `homelistingai@gmail.com` while mail is signed for `mg.homelistingai.com` (Proton showed "failed its domain's authentication"). `From` is now forced onto the Mailgun domain (`notifications@mg.homelistingai.com`) whenever the env From is on another domain; Reply-To still goes to the real inbox. Mailgun DNS (MX, SPF, DKIM `pic`, tracking CNAME) all verified. |
| **LO Share Kit** (`LOShareKitPage.tsx`, `/dashboard/lo-listings/:listingId/share-kit`) | `GET /api/lo/listings/:listingId/share-kit` (LO must be assigned; listing published with a `public_slug`, else 409 `NOT_PUBLISHED` / `NO_SHARE_LINK`). Tracked link, QR, social post, and **flyer design C** (full-bleed photo, big price, listing agent + loan officer blocks, QR). Share-kit response includes `realtor {name, brokerage, headshot_url, phone}`. |
| **Per-listing AI phone numbers** (LO / LO Pro) | `lo_phone_lines.listing_id`; `GET /api/lo/listing-phone-lines`, `POST /api/lo/listings/:id/phone-line/{preview,buy}`; `ListingPhonePanel.tsx`. Numbers are never auto-released; "retire ~60 days after sale" and the $20 / 200-minute pack are **not built**. |
| **Listing editor Brain tab trimmed** | `ListingEditorPage.tsx`: 2 boxes ("Teach this home's AI" and a closed "Financing" card). |
| **Phone cost caps** | Default realtime model `gpt-realtime-2.1-mini`; monthly AI minutes by plan (`LO_PHONE_MINUTES`: trial 30, lo_lite 100, lo 300, lo_pro/office/comp 1000). |

**Still open from this block:** reminder + follow-up WOW emails (`sendWowLinkReminderEmail`, `schedulerService.js`) use the old copy · social buttons on the WOW page are demo-only (no social fields in `agents`) · real headshots only after the agent claims · `agentCompany` is not passed to the email (unknown before claim) · automated WOW text needs Telnyx + 10DLC · real tour booking · phone caller-side transcript bug (needs a test call to (754) 243-8686) · move Render web off the FREE plan.

**Rule:** any pricing or plan change must also update the AI/SEO surfaces (`public/llms.txt`, `public/ai.txt`, `scripts/generate-seo-pages.mjs`, `index.html` JSON-LD).

### ✅ Recently completed — LO Brain + AI phone that answers (2026-09-28, PRs #17–#24)

| Feature | Notes |
|---|---|
| **LO Brain** (`backend/services/loBrainService.js`) | One brain per LO behind every listing chat. Prompt stacks: platform guardrails → Compliance Brain (company, NMLS, licensed states, disclosure, banned phrases) → identity → ONE rulebook picked by **Jev** (money→Loan Advisor, home→Listing, help→Borrower Care, fallback Borrower Care) → knowledge/FAQ → listing facts + optional payment schedule. Plain-code compliance check on every reply (`lo_compliance_events`). |
| **AI Brain page** (`LOBrainPage.tsx`, route `/dashboard/lo-chatbot`) | Light LO-Today look, one column, collapsible cards. Talk-to-your-brain test chat, knowledge library, voice + personality, **Calls & Texts** (OpenAI voice picker + "Hear it" via gpt-4o-mini-tts, Off/Ask/Auto modes, call/voicemail/SMS templates), rulebooks, Compliance Brain, FAQs. |
| **AI phone number** (`telnyxClient.js`, `loPhoneLineService.js`, table `lo_phone_lines`) | One Telnyx number per LO. Search → hold at real price → buy (never auto-retried, never released, one live line per LO). Mock (555-01xx) unless `TELNYX_LIVE_PROVISIONING=true` + `TELNYX_API_KEY`. Visible to `PHONE_BETA_LO_IDS` or all if `TELNYX_PHONE_ENABLED`. |
| **AI answers the phone** (`loPhoneCallService.js`, `webhookSignatures.js`, table `lo_phone_calls`) | Caller → Telnyx Voice API app **"HomeListingAI Phone"** (webhook `/api/webhooks/telnyx/voice`) → answer + SIP transfer to `sip:$OPENAI_PROJECT_ID@sip.api.openai.com` with signed X-HLAI headers → OpenAI webhook `/api/webhooks/openai/realtime` accepts with the LO Brain (gpt-realtime-2.1, LO's voice). Tools: save_caller_details, transfer_to_loan_officer (LO cell), end_call. After hang-up: transcript, Jev hot/warm/cold, summary, compliance flags, lead (source_type `phone`), alert. Falls back to LO cell or a polite message. 15-min cap. |
| **Comped accounts** | `agents.payment_status='comp'` → LO Pro (admin-set in DB only). Chris's test LO (anaiyou@pm.me) is comped. |
| **First live call worked (2026-09-28)** | Chris's test LO has **(754) 243-8686** (moved from An AI You's numbers, attached to HomeListingAI Phone app). AI answered in his voice. **Bug:** only the AI side was transcribed, so no lead was made — PR #24 adds logging; next step is one more test call and read the logs. |

**Render env set for phone:** `OPENAI_PROJECT_ID`, `OPENAI_WEBHOOK_SECRET`, `TELNYX_API_KEY`, `TELNYX_PUBLIC_KEY`, `TELNYX_CONNECTION_ID` (HomeListingAI Phone app), `TELNYX_LIVE_PROVISIONING=true`, `PHONE_BETA_LO_IDS`. OpenAI project webhook → `/api/webhooks/openai/realtime` (event `realtime.call.incoming`). Telnyx app has the Default outbound voice profile.

**Phone — still to do:** fix caller-side transcript · move Render web off the FREE plan (a sleeping server can't answer a call) · outbound calls (consent-gated) · texts after 10DLC brand approval · delete old Vapi/Hume paths · old web-voice path still defaults to removed `gpt-4o-realtime-preview` · `/api/public/lo-chat` trusts the browser's `lo_agent_id` (validate against `listing_lo_assignments`) · Listing Brain + Admin Brain pages · port An AI You Marketing Studio + Prospect Finder.


### ✅ Recently completed — TypeSafe (Jev) integration: LO Lead Finder role classification (2026-09-27)

| Feature | Notes |
|---|---|
| **New shared client** | `backend/services/typesafeClient.js` — raw-`fetch` wrapper for TypeSafe's System One HTTP API (`POST https://api.typesafe.ai/v1/systemone`, Bearer auth). Deliberately not the `@typesafe-ai/sdk` package — it's ESM-only and this backend is CommonJS throughout. DI-friendly (`fetchImpl` injectable), generic — not scoped to any one feature. Full pattern + rationale: `docs/adr/0003-typesafe-jev-integration.md`. |
| **First real use** | `loLeadScraperService.js` → `classifyRoleMatches()`. Every fresh Lead Finder contact with a `job_title` gets one Jev Noul question before being stored in `lo_lead_pool`: is this actually a loan-officer decision-maker, not an assistant/processor/underwriter (catches false positives the keyword-based Apify/HarvestAPI title filters let through, e.g. "Loan Processor"). Conservative: only drops when Jev is >85% confident "no" (`noul < 0.15`) — uncertain titles are kept. **Fails open**: no `TYPESAFE_API_KEY` or an API error keeps every contact and logs once; Lead Finder works exactly as before with zero TypeSafe calls if unconfigured. New `roleFiltered` counter alongside `leadsAdded`/`dupesSkipped` in scrape/import results. |
| **Env needed (Render)** | `TYPESAFE_API_KEY` — not yet confirmed set. Get it at console.typesafe.ai/keys. No `VITE_` prefix (backend-only, must never reach the browser bundle). |
| Verification | 25/25 `loLeadScraperService.test.js` (5 new role-classification tests), 7/7 new `typesafeClient.test.js`, full backend suite 62/62, tsc clean. Backend `node_modules` had to be installed fresh in this worktree first (`cheerio` missing) — unrelated to this change, just a fresh-worktree artifact. |
| **Not yet built** | Two other TypeSafe candidates identified but not implemented: buyer-chatbot question routing (financing vs. property vs. scheduling), and a real lead-quality Score to replace `LeadScoringService.js`'s current logic. Both would reuse `typesafeClient.js` as-is. |

### ✅ Recently completed — Post-deploy audit + 2 defensive fixes (2026-09-26)

| Feature | Notes |
|---|---|
| **Audit** | The 2026-07-10 pricing fix branch sat unmerged for ~2 months while `main` moved on (dead-code purge, security hardening, LO Lite pricing feature, Buffer social posting, price-drop SMS alerts). Rebased cleanly (no file overlap) and pushed to `main`. Live-verified `/lo-signup` now shows all 3 plans correctly. Full audit of `main` followed — see fixes below. |
| **Fix: SMS STOP-reply webhook now has a real fallback chain** | `getTextbeltReplyWebhookUrl()` in `smsService.js` previously returned `null` unless `TEXTBELT_REPLY_WEBHOOK_URL` was manually set on Render — meaning STOP replies from price-drop SMS alert subscribers might never reach the suppression handler (TCPA risk: opted-out buyers keep getting texted). Now falls back to `RENDER_EXTERNAL_URL` (auto-populated by Render, no manual step) → `BACKEND_BASE_URL` → hardcoded `https://home-listing-ai-backend.onrender.com`. Never resolves to null again. **Still worth setting `TEXTBELT_REPLY_WEBHOOK_URL` explicitly if the backend ever moves off that Render URL.** |
| **Fix: LO Lite checkout fails loud instead of mischarging** | `POST /api/payments/checkout-session` silently fell back `STRIPE_LO_LITE_PRICE_ID → STRIPE_DEFAULT_PRICE_ID` — if the LO Lite env var was never set on Render, a $79 signup could get checked out at the wrong price with zero error. Added a guard: if `plan==='lo_lite'` and `STRIPE_LO_LITE_PRICE_ID` is unset, return `500 checkout_misconfigured_missing_STRIPE_LO_LITE_PRICE_ID` instead of silently proceeding. **LO/LO Pro fallback behavior is untouched** (they've been live for months — not worth the regression risk of tightening them without being able to verify their env vars first). |
| **Still open (needs a human, not a code fix)** | (1) `STRIPE_LO_LITE_PRICE_ID` presence on Render is still unverified — the fix above makes it fail safely, but someone should confirm it's actually set. (2) Admin 2FA (`verifyAdmin`) fails *open* on an MFA-check error by design (avoids locking the admin out) and nobody has enrolled yet per earlier notes — flipping fail-open→fail-closed is a real security-policy call with lockout risk, not something to change silently; flag if you want it changed. |

### ✅ Recently completed — Stale-pricing purge + LO Lite everywhere (2026-07-10)

| Feature | Notes |
|---|---|
| **AI-crawlable layer de-staled** | An AI-written marketing guide surfaced old info ($149 entry, $299, 3-day trial, no $79 plan). Root cause: `public/llms.txt`, `public/ai.txt`, `scripts/generate-seo-pages.mjs` (prerendered SEO pages — last remaining "3-day trial" copy), and the `index.html` JSON-LD (offers + FAQ) all predated LO Lite. All now say: $79 LO Lite (5 listings, 50 WOW links, 50 SMS) / $149 LO / $299 LO Pro, 7-day free trial, no card, month-to-month. **Rule: any future pricing change must also update these four AI/SEO surfaces.** |
| **Sales bot + drips** | `helpSalesChatBot.ts` SALES_SYSTEM_PROMPT and day-6/day-7 trial drip emails (`emailService.js`) reframed from "$149/mo" to "starts at $79/mo". |
| **LO Lite is now a first-class billing plan** | `billingEngine.js`: new `PLAN_IDS.LO_LITE` ('lo_lite', $79, 5 listings, price id from `STRIPE_LO_LITE_PRICE_ID`, plans-table row auto-upserts on boot). Frontend `PlanId` union widened. Billing pages (`BillingSettings.tsx`, `BillingCommandPage.tsx`) show/label/upgrade-to LO Lite; fixed legacy name-inference where "79" mapped to **pro**. `ComparePlansModal` now 4 columns incl. LO Lite. Dead `_PricingSection` (stale "$149 • $299" hero) deleted from `LandingPage.tsx`. |
| Verification | tsc clean (2 pre-existing unrelated errors remain: `PublicPropertyApp` nmlsNumber, `setupTests` jest namespace), Jest 53/53, backend node:test 30/31 (1 pre-existing `loLeadScraperService` failure, unrelated). Compare Plans modal visually verified in dev preview. |

### ✅ Recently completed — Post-signup loop: trial banner, activation, testimonials (2026-07-06)

| Feature | Notes |
|---|---|
| **LO trial countdown banner** | `LoTrialBanner` in the dashboard shell (`App.tsx` ProtectedDashboardLayout). `GET /api/lo/plan-status` returns tier/trialDaysLeft/slug. Trial: dismissible-per-day countdown (amber ≤2d). Expired (`tier:'none'`): red non-dismissible bar with one-click Stripe checkout using `localStorage.hlai_preferred_plan` (saved at signup, defaults lo_lite). LO accounts only. |
| **Bug fix: `/api/lo/listing-limit`** | Selected non-existent `agents.plan_id` (column is `plan`) — the query silently failed so EVERY LO incl. paying got the Free limit of 1 listing. Fixed. |
| **Activation** | LO signup now lands on `/dashboard/lo-today` (setup checklist) instead of empty lo-listings; lo-listings empty state got a "Send my first WOW Link" CTA. |
| **Testimonial capture** | `LoTestimonialAsk` on LO Today when `stats.totalLeads >= 2` (one-time, localStorage `hlai_testimonial_prompt`). `POST /api/lo/testimonial` upserts `lo_testimonials` (migration `lo-testimonials-migration.sql`, applied) with `approved=false` + emails owner. Never show unapproved quotes publicly. |
| **Demo analytics** | GA4 events from `InlineLoDemo`: `demo_question_tap`, `demo_lead_banner_shown` (with page_path). |

### ✅ Recently completed — No-card trial + LO pitch page rebuild (2026-07-05)

| Feature | Notes |
|---|---|
| **True no-card 7-day trial** | `LOSignupPage` no longer redirects to Stripe checkout — signup → dashboard directly. Backend already granted `'trial'` tier via `payment_status='awaiting_payment'` + account age < 7d in `resolveLoPlanTier` (no backend change needed). Chosen plan saved to `localStorage.hlai_preferred_plan` for billing-page preselect. This made the site's 12+ pre-existing "no card required" claims (incl. Terms of Service + Refund Policy) TRUE — they previously contradicted the checkout flow. |
| **`/for-loan-officers` pitch page rebuilt** | Investor-driven fix: 441 cold emails → 84 page opens → 0 CTA clicks. New page: interactive inline AI chat demo (client-side canned Q&A, tap-a-question chips, "lead routed to YOU" banner), Zillow cost-math strip, honest founder block (**replaced a FAKE testimonial** — "Marcus T." never existed), straight-answers FAQ, dual CTA (try demo / start trial). Demo WOW link `/partner-invite/demo` is fully client-side mocked. |
| **Service-worker kill-switch** | `public/sw.js` created: skipWaiting + wipe caches + unregister + reload clients. Old SWs could never update because `/sw.js` fell through to the SPA HTML fallback (MIME error = stuck on stale builds forever). `netlify.toml` adds `Cache-Control: no-cache` for `/sw.js`. Fixes the long-standing "stale builds after deploy" issue for trapped users. |
| Copy consistency | `LODemoPage` stale "3-Day Trial" → 7-day; LO outreach + Zillow follow-up email footers → "7 days free · No card needed · Cancel anytime". |

### ✅ Recently completed — LO Zillow cost-math follow-up email (2026-07-05)

| Feature | Notes |
|---|---|
| **Zillow follow-up email in LO outreach flow** | Every LO acquisition invite now gets a second email 48h later: the "One Zillow lead costs you $75–$150+ vs $79/mo" square graphic (hosted in Supabase `blog-assets/marketing/zillow-cost-square.png`) + cost-math copy + tracked CTA (`/for-loan-officers/{token}`) + per-recipient unsubscribe. Template: `buildLoZillowMathEmail` in `server.cjs`. |
| Sweep mechanics | `processLoZillowFollowups` runs every 5 min on the web service (plus 30s after boot for free-plan wake-ups). Claims `lo_outreach_invites.followup_sent_at` atomically, checks `lo_suppression_list` at send time, dedupes per email. Migration `lo-outreach-followup-migration.sql` (already applied in Supabase). Mailgun can't schedule >24h out (plan limit) — that's why it's a sweep, not `o:deliverytime`. `emailService` now supports `options.deliveryTime` for ≤24h scheduling. |
| One-time backlog blast | Start gate `LO_ZILLOW_FOLLOWUP_START_MS` = Tue 2026-07-07 09:00 PT. First sweep after that sends the backlog (~352 LOs = 441 invited − 89 unsubscribed) — then the gate is inert. CAN-SPAM footer address: 3855 Self Rd, Cashmere, WA 98815 (fallback if `LO_MAILING_ADDRESS` unset). |
| Related asset | `public/dead-zillow-lead-reel.html` — animated 9:16 HTML reel (5.5s loop, `?still` for poster frame) rebuilt from the Claude Design mp4 (uncommitted). |

### ✅ Recently completed — Listing price-drop SMS alerts (Layer 1)

| Feature | Notes |
|---|---|
| **QR-scanner re-engagement: price-drop SMS alerts** | Buyers who scan a listing opt in by **phone** (no email). When the agent lowers the price, a pending alert is queued and the agent approves it one-tap; manual blasts + an "open house" template also supported. STOP replies auto-suppress (global). Spec: `docs/superpowers/specs/2026-06-28-listing-price-drop-sms-alerts-design.md`; plan: `docs/superpowers/plans/2026-06-28-listing-price-drop-sms-alerts.md`. |
| Backend | New DI service `backend/services/listingAlertService.js` (+11 node:tests). 6 endpoints in `server.cjs`: `POST /api/public/listing-alerts/subscribe`, `GET /api/listing-alerts/pending`, `GET /api/listing-alerts/subscribers`, `POST /api/listing-alerts/:id/send`, `/:id/dismiss`, `/manual`. Price-drop auto-detected in `PUT /api/properties/:id` (compares old vs new `properties.price`). STOP reuses the existing Textbelt inbound webhook (`/api/webhooks/textbelt/inbound` → extended STOP branch in `processInboundSmsMessage`). |
| DB | Migration `listing-price-alerts-migration.sql` (run in Supabase ✓): `listing_alert_subscribers`, `sms_suppression`, `listing_alert_pending`. `listing_id` = `properties.id`. |
| Frontend | `src/services/listingAlerts.ts`; public opt-in card `src/components/listing/ListingAlertOptIn.tsx` (rendered on `PublicListingPage` as a fixed bottom overlay — verify it doesn't crowd chat launchers); agent approval + blast panel `src/components/dashboard-command/ListingAlertPanel.tsx` (on `ListingPerformancePage`). |
| Env / pending | Set `TEXTBELT_REPLY_WEBHOOK_URL=https://home-listing-ai-backend.onrender.com` on Render so STOP suppresses (alerts still send without it). Live e2e still to run: opt in → drop price → send → reply STOP. |
| Deferred (Layer 2) | Per-listing PWA "save like an app" + web push — blocked by iOS install requirement + the deliberate service-worker removal in `main.tsx`. |

### ✅ Recently completed — 2026-06-28 sprint (Owner alerts + Admin Overview/Analytics real data + GA4 + Blog/LO fixes)

| Feature | Notes |
|---|---|
| **Owner signup alerts** (email + text) | New signup at `POST /api/agents/register` fires fire-and-forget `notifyOwnerOfSignup()` → emails + texts the owner with name/email/phone/account type. Covers BOTH agent (`SignUpPage`) and LO (`LOSignupPage`) signups. Env: `OWNER_ALERT_EMAIL` (default `homelistingai@gmail.com`), `OWNER_ALERT_PHONE` (SMS skipped if unset). Never blocks/fails the signup. |
| **Admin: removed Marketing Reports** | Hidden from admin dashboard (sidebar + route + `MarketingReportsPage` import in `src/admin-dashboard/AdminDashboard*`). Standalone `/marketing-reports` agent route left intact. |
| **Admin: removed dead Analytics page** | `AnalyticsDashboard.tsx` + its admin tab + standalone `/analytics` route DELETED. It was a 100% stub (`src/services/analyticsService.ts` returns empty/zero — still used by `RealTimeAnalytics.tsx`, left in place). The **Settings → Analytics** tab is the real one and stays. |
| **Admin Settings → Analytics: live Website Traffic** | New "Website Traffic" cards (Visitors / New Visitors / Sessions / Page Views) in `AdminSettingsPage.tsx`, wired to `/api/admin/analytics/google` (GA4). Shows real GA error reason in an amber box when not returning data. |
| **GA4 — fully wired** | (1) Site tag measurement ID fixed **G-V8NWQPFF6C → G-3STYDX7KN6** in `index.html` + `RouteAnalyticsTracker.tsx` so the site feeds the property the backend reads (`GA_PROPERTY_ID=499620080`). `send_page_view:false` is intentional (manual per-route pageviews via RouteAnalyticsTracker). (2) `getGaClient()` reads creds from env via robust `parseServiceAccountJson()` (tolerates `$ cat…` junk / base64), preferring `GA_SERVICE_ACCOUNT_KEY` then reusing `GOOGLE_INDEXING_SERVICE_ACCOUNT`. (3) User enabled the **Google Analytics Data API** on project `home-listing-blog` + granted the service account (`blog-indexer@home-listing-blog.iam.gserviceaccount.com`) **Viewer** on the GA property. Same robust parser also repaired Google blog indexing (the `GOOGLE_INDEXING_SERVICE_ACCOUNT` value had a shell-command prefix). |
| **Blog editor — fixed saving** | (1) Strip AI helper field `image_search_query` before save (was a "column not found" error). (2) Routed ALL blog CRUD through new `verifyAdmin` backend endpoints `GET/POST/DELETE /api/admin/blog/posts[/:id]` (service role) — the editor used to write to Supabase directly from the browser, but `blog_posts` RLS keys off the `agents` table and **the admin account is NOT an agent**, so every write hit "new row violates row-level security policy". Drafts are now visible to admins too. |
| **LO Lead Finder — CSV + fixes** | (1) DM/LinkedIn/Site **404 fixed** — `absUrl()` forces `https://` on protocol-less scraped URLs. (2) **Bulk send runs in background** — endpoint responds instantly with a queued count + sends in a background loop (sending 100+ synchronously exceeded the client timeout → false "Bulk send failed"; sends were actually working). Frontend shows "sending in background…" + polls. (3) New/Sent lead lists are **collapsible** (Lead Finder pool + Outreach "Sent invites"). Limits: CSV import up to 10k rows; "Send to all new" processes 500/click. |
| **All signup CTAs → /lo-signup** | Product is LO-first. `handleNavigateToSignUp` (App.tsx + PublicApp.tsx) + every "Create Free Account"/"Claim Your Free Account"/"Get Started" CTA now route to `/lo-signup` (ConversionWedge, PublicHeader, ComparePlansModal free tier, LODemoPage, HowItWorksPage, ResetPasswordPage). No `navigate('/signup')` left in public marketing. |
| **Design System page** | `/design-system` route + `src/components/DesignSystemPage.tsx` committed. |
| **Scroll-to-top on navigation** | New `src/components/ScrollToTop.tsx` rendered inside the router resets scroll to top on every route change (honors `#hash` anchors). Fixed CTAs opening the next page already scrolled down. |
| **Admin Overview — REAL metrics** | Campaign Command/Operational metrics were a mix of real + broken. Fixes: **Emails Sent** now logs an `accepted` row to `email_events` on every successful Mailgun send (`emailService`) and counts those (funnel_logs was always empty + was clobbering real values — removed). **Bounced** sources from real Mailgun `failed` webhook events. **Delivery Rate** computed from real sent vs failed. **Tickets** stopped counting new leads as tickets (`openTickets:0` — no ticketing system). **Last Login** `record-login` now also writes to `audit_logs` so platform admins WITHOUT an agents row get tracked (security monitor's fallback). **Note: Emails Sent counts from this deploy forward** (historical sends were never logged); opens/clicks/bounced were always real (Mailgun webhooks). |
| **Data cleanup** | Deleted **99 mis-filed `csv_import` LO-prospect rows** from the `leads` table (imported via the generic "Import Leads" button into the buyer/seller pipeline, malformed with quote-wrapped values). They live cleanly in `lo_lead_pool`. This de-inflated Leads This Week / New Leads / Tickets / Recent Leads. |
| Env needed (Render) | `OWNER_ALERT_PHONE` (for signup text alerts). Already present: `OWNER_ALERT_EMAIL`(optional, defaults), `GA_PROPERTY_ID=499620080`, `GOOGLE_INDEXING_SERVICE_ACCOUNT` (reused for GA). |

### ✅ Earlier — 2026-06-21 sprint (LO Lead Finder + Blog distribution + Admin security)

| Feature | Notes |
|---|---|
| **LO Lead Finder** (find → import → outreach) | Scraper service `backend/services/loLeadScraperService.js` (DI factory; tests `npm run test:backend`, node:test). 4 swappable engines via `LO_SCRAPER_ENGINE`: `google` (CSE), `apify` (Search/Maps auto-detect), `leads` (**primary**). Primary = Apify actor `code_crafter/leads-finder` (`IoSHqwTR9YGhzccez`) — Apollo-style validated emails (name, email, company, job title, mobile, LinkedIn). **Free Apify plan blocks API *runs* of that actor → semi-auto**: user clicks Start in Apify UI, then imports the finished run's dataset (reading datasets IS allowed free). Verified live: 100-row run → 94 stored. |
| LO Lead Finder — DB | Migration `lo-lead-pool-migration.sql` (run in Supabase): `lo_lead_pool` (email unique + name/employer/job_title/phone/linkedin/city/source_url/is_role/status), `lo_suppression_list`, `lo_scraper_state`. |
| LO Lead Finder — endpoints | `POST /api/admin/lo-leads/run`, `/import-apify`, `GET /api/admin/lo-leads`, `POST /api/admin/lo-leads/:id/send`, `/send-bulk`, `/:id/skip`. All `verifyAdmin`. |
| LO Lead Finder — admin UI | `src/components/admin/AdminLoLeadFinderPanel.tsx` (in Marketing Funnels, above LO Outreach). Import from Apify → review pool → per-lead **💬 Text** + **🔗 DM** (1-tap copy + open Messages/LinkedIn, human sends = TCPA/ToS-safe) + Email + Skip + bulk "Send to all new". |
| Outreach copy — "2006" voice | SMS + LinkedIn templates in `AdminLoLeadFinderPanel.tsx`. LinkedIn = **189-char connection-note** (no link — notes don't make links clickable). Voice playbook: `HomeListingAI-Brand-Voice-Playbook.pdf` on Desktop (for NotebookLM). |
| LO Lead Finder — CAN-SPAM | `sendLoAcquisitionInvite()` helper (one source of truth for outreach email). Unsubscribe footer (`LO_MAILING_ADDRESS` env) + `GET /api/public/lo-unsubscribe/:token` → suppression list. **Review-first, never auto-send.** |
| Custom LinkedIn share image | `public/og-loan-officers.png` (+ `.svg` source). `/for-loan-officers` prerendered with this og:image via `scripts/generate-seo-pages.mjs` so the pitch link unfurls a branded card. |
| Blog — distribution | BlogEditor "Repurpose" now has 1-click **Copy + Open** to LinkedIn/Facebook/FB Group + **X** (intent prefill). Added `twitter` to the AI repurpose prompt. |
| Blog — conversion CTA | Shared `src/pages/Blog/BlogCTA.tsx` (→ `/lo-signup`) at the end of every post AND the blog index hero (replaced "Create Free Account" button). |
| Blog — cleanups | `featured_image_alt` input + rendered; post HTML sanitized with **DOMPurify**; BlogEditor `authHeader` reads live Supabase session token (no hardcoded storage key). |
| Admin — real 2FA (opt-in) | Supabase MFA (TOTP). `Admin2FASetup` (enroll/QR/verify/disable in Settings→Security), `Admin2FAGate` (login code challenge, wraps dashboard), `verifyAdmin` enforces AAL2 server-side (fails OPEN). Recovery: `docs/admin-2fa-recovery.md` (service-role SQL). Was a fake toggle. |
| Admin — real Change Password | `AdminChangePassword` (verify current → update via Supabase). Was a dead form. |
| Admin — Activity Logs real | Logs admin logins: `POST /api/admin/activity/record-login` + call in `adminAuthService`. Panel was always empty. |
| Admin — decluttered | Hid fake **API Keys** section (generated a fake token nothing validated) + **AI Cards** nav item (unused). **Audit finding: Admin Overview stats are REAL** (DB queries + live Mailgun stats), not demo — earlier assumption was wrong. |
| Env needed (Render) | `APIFY_TOKEN`, `LO_MAILING_ADDRESS`. Optional: `GOOGLE_CSE_API_KEY`/`GOOGLE_CSE_ID`/`LO_SCRAPER_MAX_SEARCHES`, `LO_SCRAPER_ENGINE`, `APIFY_ACTOR_ID`/`APIFY_LEADS_ACTOR_ID`. |

### ✅ Earlier sprint

| Feature | Notes |
|---|---|
| LO Acquisition Link | Tracked marketing pitch page sent to prospective LOs. New `lo_outreach_invites` table (migration `lo-outreach-invites-migration.sql`, run in Supabase). Routes `/for-loan-officers[/:token]` (`src/pages/ForLoanOfficersPage.tsx`). Admin sender + opened/clicked tracking table (`src/components/admin/AdminLoOutreachPanel.tsx`) rendered in Marketing Funnels. Endpoints: `POST/GET /api/admin/lo-outreach/invite[s]`, `GET /api/public/lo-invite/:token`, `POST /api/public/lo-invite/:token/event`. Email-only send via `emailService`. Built/tested end-to-end. |
| Jest suite green (53/53) | Fixed root causes: `esModuleInterop` (React default import under ts-jest), `import.meta` AST transformer (`src/test/importMetaTransformer.cjs`), jsdom `fetch` polyfill + supabase test env in `setupTests.ts`, ignore `.claude/` worktrees in jest. Realigned stale tests (billing→Stripe, security→session-based pw change, calendar→onSave, AICardPage, scheduler→`POST /api/appointments`). Test TZ pinned to `America/Los_Angeles` (`npm test`). |
| Per-page how-to guides | All 12 dashboard pages — collapsible, dismissible to pill, localStorage state |
| 7-day free trial | Extended from 3 days everywhere — frontend, backend, drip emails |
| 7-day LO onboarding drip | Replaces old 3-email agent drip; video slot map ready for URLs |
| LO notified when partner agent builds listing | Email + SMS via `notifyPartnerLosOfNewListing()` |
| Rate sheet CSV parser fix | 0% down payments (VA/USDA) no longer dropped |
| Rate sheet delete ("Remove from Bot") | Confirmed + DELETE route wired |
| Payment Reference toggle | Per-listing, green/slate switch, localStorage persisted |
| Buyer chatbot reads rate sheets | `/api/public/lo-chat` reads `lo_listing_kb_docs`, injects into prompt |
| Public listing chat fix | Three stacked bugs fixed: column strip cap, FK drop, auth id vs profile id |
| Collapsible listing description | 250px clamp, Read more/Show less, fade gradient |
| Inbound lead email forwarding | Mailgun route on `mg.homelistingai.com` → backend; slug extracted from recipient |
| Agent notification settings persist | `agent_notification_settings` table created + migration applied |
| SMS settings show correctly | `SettingsPage.tsx` self-fetches on mount; threading through App.tsx |
| SMS toggles cleaned up | Agent Notifications: removed paid toggles; kept Browser Push + Send Test |
| Email settings domain fixed | Shows `{slug}@mg.homelistingai.com` (was dead `leads.` subdomain) |
| Netlify dead redirect removed | `/api/ai-card/*` no longer hijacked to non-existent Netlify Functions |
| Supabase crash guard | `server.cjs` + `LeadScoringService.js` won't throw at startup if env vars missing |
| Bearer token in API calls | ROI, onboarding, LO Today now send `Authorization: Bearer` — fixes production 401s |
| Mailgun inbound field names | `/api/leads/email-forward` accepts both generic and Mailgun-native field names |
| Tailwind config consolidated | Single `tailwind.config.js` covering all `src/**`; dead `src/index.css` removed |
| Admin email updated everywhere | `us@homelistingai.com` → `homelistingai@gmail.com` across server.cjs, App.tsx, emailService.ts, schedulerService.ts, helpSalesChatBot.ts, ShareTestPage.tsx, help-mode.json |
| ErrorBoundary fixed | Class component `hasError` state now resets on route change via `resetKey={location.pathname}` — was showing "Something went wrong" on every page after any single error |
| LO profile completion check fixed | Backend was checking `lo_chatbot_configs.full_name` (always null); now checks `agents.first_name + nmls_number` correctly |
| LO logo raw base64 hidden | `<input type="url">` was rendering full base64 string in LO profile settings; now hidden |
| Dev "Test" button removed from notification panel | `NotificationSystem.tsx` — debug button was visible to all users in production |
| Bell icon overlap fixed | Added `pr-10` to page headers on LO Chatbot, LO Appointments, and Agent Appointments pages |
| EmailSettings Bearer token fix | `/api/agent/profile` fetch now sends `Authorization: Bearer` — was returning 401 in production |
| Render worker env vars confirmed | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` already present in worker — no action needed |
| Full live production test | Both Agent (foodtrucknai@gmail.com) and LO (anaiyou@pm.me) dashboards tested end-to-end |
| /post-auth redirect loop fixed | App.tsx nav guard was re-navigating to /post-auth and blocking PostAuth component's own redirect to dashboard |
| Weekly Report toggle removed | Unbuilt feature hidden from Notification Settings until backend is ready |
| Email Settings setup steps condensed | 3-panel grid replaced with single compact inline row |

### 🔴 Known open issues

| Issue | Where | Notes |
|---|---|---|
| Day-6 trial warning overlap | Email drip | Day 6 drip handles "trial ending" but standalone `checkTrialWarnings` billing email may also fire — minor, low impact |
| ~~Service worker serves stale builds~~ | ~~`src/main.tsx`~~ | **RESOLVED 2026-07-05** — `public/sw.js` kill-switch (skipWaiting + wipe caches + unregister + reload) ships and is live in the current tree. This row was stale for ~2.5 months after the fix landed; removed 2026-09-26. If you're reading an even older cached copy of this file, the fix is real — check `public/sw.js` directly. |

### ⏳ Pending manual steps (user to do)

| Step | Where | What |
|---|---|---|
| Switch SMS provider | When ready | Textbelt has no whitelist option — links in SMS blocked until provider is swapped (Twilio, Telnyx already in stack) |
| Paste drip video URLs | `backend/services/emailService.js` → `TRIAL_DRIP_VIDEOS` | Each day auto-adds a watch button when URL is non-null |
| Test end-to-end email forward | Forward any lead email to `{slug}@mg.homelistingai.com` | Confirm it arrives in Leads inbox |
| Test Stripe checkout live | Billing page → upgrade flow | Confirm charge goes through and plan updates |
| Test LO Acquisition Link live | Admin → Marketing Funnels → LO Outreach → send to self | Open the link on phone, tap CTA, confirm row flips to Opened ✓ / Clicked ✓ |
| Enroll in admin 2FA | Admin → Settings → Security → Set up 2FA | Opt-in; nobody is protected until they enroll. Test: enroll → sign out/in → code prompt fires. Recovery in `docs/admin-2fa-recovery.md`. |
| Run LO Lead Finder live | Apify UI → Start (100 leads) → Admin → Marketing Funnels → 🧲 LO Lead Finder → Import from Apify | Migration + `APIFY_TOKEN`/`LO_MAILING_ADDRESS` already in place. Work leads via 💬 Text / 🔗 DM (cold email lands in spam — prefer text/LinkedIn). |
| **Run listing price-drop alerts migration** | Supabase SQL editor → run `listing-price-alerts-migration.sql` | Creates `listing_alert_subscribers`, `sms_suppression`, `listing_alert_pending`. Required before the opt-in card / agent panel work. |
| **Set `TEXTBELT_REPLY_WEBHOOK_URL` on Render** | Render env → backend service | Set to backend base URL (e.g. `https://home-listing-ai-backend.onrender.com`). `smsService.buildReplyWebhookUrl()` appends `/api/webhooks/textbelt/inbound` so STOP replies suppress alert subscribers. Confirm the Textbelt key plan supports `replyWebhookUrl`. |
| **Test price-drop alert e2e** | Public listing → opt in by phone → as owning agent lower the price → listing detail shows pending card → Send alert → reply STOP | Confirm text arrives, then STOP adds a `sms_suppression` row + flips subscriber to `unsubscribed` (second send skips it). |

---

## Agent skills

### Issue tracker

Issues live in GitHub Issues at `AIyou-chris/home-listing-ai-app`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default mattpocock/skills label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
