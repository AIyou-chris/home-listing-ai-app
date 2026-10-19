<!-- AI-HANDOFF-POINTER -->
> **READ FIRST: `HOW_TO_TALK_TO_CHRIS.md`.** Keep it simple. 1 to 3 short lines on what you did. No "why". Anything Chris must do goes in **bold**, one step at a time.

> **🤝 Claude + Codex both work in this repo.** At the start of every session read `AI_HANDOFF.md` (latest entries). At the end, add an entry at the top of its log. Use **Jev (TypeSafe)** for yes/no, category and scoring judgments. Rules are in `AI_HANDOFF.md`.

# HomeListingAI — Claude Project Context

> This file is read automatically at the start of every Claude session.
> Keep it up to date as the project evolves.

---

## Contents

*10 sections. A long file may only be read in part, so jump to the section you need from this list.*

- [0. Golden Rules (read this first — always)](#0-golden-rules-read-this-first--always)
- [1. App Purpose / Who It's For](#1-app-purpose--who-its-for)
- [2. Tech Stack](#2-tech-stack)
- [3. Coding Conventions (Codex-established)](#3-coding-conventions-codex-established)
- [4. Pages — Done vs In Progress](#4-pages--done-vs-in-progress)
- [5. How to Work With This User](#5-how-to-work-with-this-user)
- [6. Key Files to Know](#6-key-files-to-know)
- [7. Current State (2026-10-11)](#7-current-state-2026-10-11)
- [Agent skills](#agent-skills)
- [MCP Tools: code-review-graph](#mcp-tools-code-review-graph)

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

- **Render:** ONE service, `home-listing-ai-backend`, runs `APP_RUNTIME_MODE=all` + `JOB_WORKER_ENABLED=true` (check `/healthz`: `run_background_tasks` and `run_job_worker` must be `true`). The ai-you-* services on the same account belong to a different business. Render build uses `--ignore-scripts`, so `ffmpeg-static` is missing (reels off).
- **Env that matters:** `SENTRY_DSN`, `CRON_SECRET`, `INTERNAL_JOB_SECRET`, `EMAIL_WEBHOOK_SECRET`, `FOUNDING_COUPON_ID`, `TELNYX_API_KEY`, `OPENAI_*`, `SPEND_*` overrides, `OWNER_ALERT_EMAIL`.
- **Netlify proxy:** `/api/*` goes to the Render backend.
- **Email:** Mailgun, From forced onto `mg.homelistingai.com`. Inbound lead forwarding to `{agent-slug}@mg.homelistingai.com`.
- **`supabase` / `supabaseAdmin`** in `server.cjs` are null-guarded.


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

## 7. Current State (2026-10-11)

Latest details: top of `AI_HANDOFF.md`. Old sprint-by-sprint notes: `docs/history/CLAUDE_MD_HISTORY_2026-10-11.md`.

- **One plan.** $79/mo (5 listings, 50 WOW Links, 50 texts, 100 AI phone minutes). Launch price $49 for the first 25 LOs = Stripe coupon `FOUNDING49` (forever, max 50) applied by `services/foundingCoupon.js` when Render env `FOUNDING_COUPON_ID` is set. Old tiers (`lo`, `lo_pro`, office) still exist in the backend but are not sold. **Any price change must also update** `public/llms.txt`, `public/ai.txt`, `scripts/generate-seo-pages.mjs`, `index.html` JSON-LD and `helpSalesChatBot.ts`.
- **Trial.** 7 days, no card. Trial caps: 10 AI phone minutes, 10 texts, no buying a phone number. One trial per phone number (`services/repeatTrial.js`, status `trial_used`). Checkout on day 1 gives Stripe only the days left, so a test checkout charges $0 until the trial ends.
- **Spend stops.** `services/spendGuard.js` caps every paid thing per day/month (`SPEND_*` env). Telnyx low-balance email every 6h (`services/telnyxBalanceWatch.js`). Never promise "unlimited".
- **AI phone line.** (754) 243-8686 is Chris's test LO. Telnyx balance must stay funded (auto-recharge on) or every line dies. A quiet call saves an event trail in `lo_phone_calls.error`. LO can write their own greeting (`lo_chatbot_configs.phone_greeting`); the recording notice is always kept. Replies are told to stay short and ask for name + number by the second reply.
- **LO dashboard.** Menu: Today, Partners, Listings, Leads, AI Brain, Settings. Appointments is a link on Leads; Invoices a link on Partners. Hidden on purpose: per-listing phone numbers (`SHOW_LISTING_NUMBERS`), partner follow-up log + recap (`SHOW_PARTNER_EXTRAS`), reels.
- **Texts.** Textbelt, signed reply webhook, STOP writes `leads.status='Unsubscribed'`. Buyer chat has NO automatic follow-up to the buyer (waiting on lawyer).
- **Buyer journey verified live.** WOW Link, claim, publish, chat, consent, lead to the right LO + agent, alerts, delete account, showing reminder.
- **Open.** Lawyer review of `docs/legal/*` then publish privacy/terms; first real money test (trial checkout then cancel); Render plan/invoice check; reels need ffmpeg in the Render build + more memory; daily Sentry health check runs ~8:11.
- **Hard-won lessons.** Never `.catch()` a Supabase builder (use `bestEffort`). DB check constraints are stricter than code vocab (`messageRows.js`, capital-U `Unsubscribed`). Verify columns before selecting them. Re-verify every part of a scripted multi-part edit. Do not claim "100%".


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
