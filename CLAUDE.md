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
| Integrations | OpenAI, Google GenAI / googleapis, Stripe, Telnyx, QR tooling |
| Tooling | ESLint, TypeScript checks, Jest tests, npm scripts for local orchestration |

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

**LO (Loan Officer) Platform:**
- `/dashboard/lo-partners` — agent partnerships
- `/dashboard/lo-listings` — assigned listings + branding toggles + "📊 Live Dashboard" share
- `/dashboard/lo-chatbot` — LO AI financing bot setup (#13)
- `/partner-invite/:token` — **WOW Link**: live listing demo w/ chatbots, sent to agents
- `/listing-dashboard/:token` — **#15** public per-listing live lead dashboard (token-gated)

**Office Tier (#17):**
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
- **SMS messaging areas** — intentionally show "coming soon" in UI.

---

### ⚠️ Critical Architecture Notes (LO Platform)

- **Two ID forms per account.** `resolveRequesterUserId()` returns the **auth/login id**; FK-enforced tables (`lo_chatbot_configs`, `listing_lo_assignments`, `pre_qual_submissions`, `listing_branding_toggles`, `listing_dashboard_tokens.created_by`) require the **agents.id profile id**. ALWAYS use the canonical helper **`resolveLoAgentId(req)`** for those — never pass the raw auth id. Office accounts use **`resolveOfficeContext(req)`**.
- **`listings` vs `properties`.** The LO platform's `listing_id` everywhere = **`properties.id`** (rich data). The `listings` table is a legacy stub — do not query it for price/beds/photos.
- **`account_type`** values: `realtor` | `lo` | `agent` | `office`. The old DB check constraint was dropped (app-controlled). An "office" is an `agents` row with `account_type='office'`; LOs link via `agents.office_id`.
- **`agent_invites.lo_agent_id`** stores the auth id (its FK was dropped) — the odd one out; internally consistent within the invite→claim→partnership chain. Leave as-is.
- Migrations are committed as `*-migration.sql` / `*.sql` in repo root; user runs them manually in Supabase SQL editor.

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
| `src/components/dashboard-command/TodayDashboardPage.tsx` | Today / main dashboard page |
| `src/components/Sidebar.tsx` | Agent nav sidebar |
| `src/components/AdminSidebar.tsx` | Admin nav sidebar |
| `src/services/dashboardCommandService.ts` | Dashboard API calls |
| `src/state/useDashboardRealtimeStore.ts` | Zustand store for realtime leads/appointments |
| `backend/server.cjs` | Express monolith — all API routes |
| `src/types.ts` | Shared TypeScript types |

---

## 7. Notes

- Snapshot reflects repo state as of **May 17, 2026** (post WOW Link, #13 LO bot, #15 listing dashboard, ID-consistency pass, #17 Office tier; #18 white-label in progress).
- When in doubt about route wiring, check `src/App.tsx` `<Routes>` block.
- Demo mode is toggled via `useDemoMode()` hook — always guard demo-only data behind it.
- `primary-600` is the brand blue used throughout — do not swap to generic Tailwind blue.

---

## Agent skills

### Issue tracker

Issues live in GitHub Issues at `AIyou-chris/home-listing-ai-app`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default mattpocock/skills label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- code-review-graph MCP tools -->
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
