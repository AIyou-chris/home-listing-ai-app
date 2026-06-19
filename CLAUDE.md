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
- **API auth pattern**: All dashboard API calls must send `Authorization: Bearer {accessToken}` header. Use `authHeaders(agentId)` (async, from `src/services/dashboard/utils.ts`) for this — NOT the sync `defaultJsonHeaders`. `resolveRequesterUserId()` in production requires a Bearer token; without it the endpoint returns 401.

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
- `/dashboard/lo-listings` — assigned listings + branding toggles + rate sheet upload + Payment Reference toggle + "📊 Live Dashboard" share
- `/dashboard/lo-chatbot` — LO AI financing bot setup
- `/partner-invite/:token` — **WOW Link**: live listing demo w/ chatbots, sent to agents
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
- **Listing Builder V1 edit route** — `/dashboard/listings/:listingId/edit` not yet in main route table.
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

- **Render has two services**: `home-listing-ai-backend` (web, free plan) and `home-listing-ai-worker` (worker, starter plan). The worker needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` added to its Render environment — currently missing, causes worker crash. Web service is fine.
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

## 7. Current State Snapshot (as of 2026-06-18)

### ✅ Recently completed (this sprint)

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

### ⏳ Pending manual steps (user to do)

| Step | Where | What |
|---|---|---|
| Switch SMS provider | When ready | Textbelt has no whitelist option — links in SMS blocked until provider is swapped (Twilio, Telnyx already in stack) |
| Paste drip video URLs | `backend/services/emailService.js` → `TRIAL_DRIP_VIDEOS` | Each day auto-adds a watch button when URL is non-null |
| Test end-to-end email forward | Forward any lead email to `{slug}@mg.homelistingai.com` | Confirm it arrives in Leads inbox |
| Test Stripe checkout live | Billing page → upgrade flow | Confirm charge goes through and plan updates |
| Test LO Acquisition Link live | Admin → Marketing Funnels → LO Outreach → send to self | Open the link on phone, tap CTA, confirm row flips to Opened ✓ / Clicked ✓ |

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
