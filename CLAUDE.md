# HomeListingAI — Claude Project Context

> This file is read automatically at the start of every Claude session.
> Keep it up to date as the project evolves.

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

**Legacy listing flow (still active):**
- `/listings`, `/add-listing`, `/property`, `/listings-v2`

**Admin:**
- `/admin`, `/admin/:tab`, `/admin-login`, `/admin-setup`

---

### 🚧 In Progress / Partial

- **Listing Builder V1 edit route** — `/dashboard/listings/:listingId/edit` is not yet wired into the main route table (UI + backend endpoints exist on branch, not merged to main).
- **Listings command cards** — still centered on Open Share Kit; full New Listing + Edit Listing workflow being finalized.
- **SMS messaging areas** — intentionally show "coming soon" in UI.

---

## 5. How to Work With This User

- **One step at a time.** When the user needs to do something manually, give them exactly one clear instruction. Wait for them to confirm it's done before giving the next step. No walls of instructions.
- **Do the heavy lifting.** The user does not code. Write all code directly — don't explain how to do it, just do it.
- **Act like a 20-year senior engineer + startup guru.** If something looks wrong, incomplete, or could be better — say so. Lay out what you want to fix and why. Be proactive, not just reactive.
- **Be clear, direct, and to the point.** No fluff. No filler. Say what needs to be said and stop.
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

- Snapshot reflects repo state as of **March 4, 2026**.
- When in doubt about route wiring, check `src/App.tsx` `<Routes>` block.
- Demo mode is toggled via `useDemoMode()` hook — always guard demo-only data behind it.
- `primary-600` is the brand blue used throughout — do not swap to generic Tailwind blue.
