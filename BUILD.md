# BUILD.md — HomeListingAI

*Last updated: October 4, 2026*

> **Every AI (Claude, Codex, anything else) reads this first and updates it last.**
> When you finish work, update "What We've Done", "Right Now" and "Next Up".
> If something here doesn't match the code, the code wins — fix this file.

## How to talk to Chris

- Answer short. Explain it like he's 10.
- Yes or no first. A few short sentences.
- **Bold every single thing he has to do.**
- Give the full clickable link to the exact screen, not menu paths.
- Give commands clean and ready to paste. No `#` comment lines in commands.
- Give whole files, not partial edits, when he has to paste something.
- Do everything you can yourself (run code, deploy, update the database).
  Only ask him for things you truly can't do.

## The Goal

HomeListingAI (homelistingai.com) is an AI partner for **mortgage loan officers**.
Buyers talk to an AI "property assistant" (chat, voice, text) trained on real
listings and rates. It turns them into **warm leads** and scores them, so the
loan officer stops chasing cold internet leads.

**Tagline:** "Warm leads. Not cold calls."
**Offer:** 7-day free trial.

## The Overhaul Plan (Sept 2026)

The old app got bloated. The new version is simpler and has **"one brain"**
running different AI agents.

**3 brains:**
1. **Admin brain** — Chris runs the whole platform.
2. **Loan officer brain** — the LO trains it **once** and it covers all their
   listings. Controls calls and texts. Has a **compliance** section.
3. **Listing brain** — one per listing. The only thing the LO adds per listing
   is an **optional payment schedule**.

**Rules for the brains:**
- Work the same way as An AI You's **Business Brain**
  (in `/Volumes/GFY/EatADick/ai-landing-template`).
- Brain screens match the app and front page colors and feel.

**Bring over from An AI You, as-is:**
- Marketing Studio
- Lead / prospect finder (used to find loan officers and others for HLAI)

**Voice + phone:** OpenAI's own voice setup (Realtime). No outside voice apps.
Calls and texts are controlled from the LO brain. SMS is part of the plan.
The voice client already used in An AI You was ported from HomeListingAI.

**Landing page:** redone, short and to the point for loan officers.

## Stack

*Verified against the code on 2026-10-02. `CLAUDE.md` is the long version.*

- Frontend: React 18 + TypeScript + Vite + Tailwind, hosted on **Netlify**. App stylesheet is `src/public.css`.
- Backend: one Node/Express file, `backend/server.cjs`, on **Render** (single service, `APP_RUNTIME_MODE=all`).
- Data / auth / storage: **Supabase** (Postgres). Not Firebase.
- AI / voice: OpenAI (chat, Realtime voice), **TypeSafe "Jev"** for judgments (lead rating, routing), Telnyx for the phone line, Mailgun for email, Textbelt for SMS, Stripe for billing.
- Old repo `-homelistingai-New` is retired. **Only work in `home-listing-ai-app`.**

## Brand

- Colors: blue → purple → indigo gradients, glass effects
- Hero idea: "Talk to the House"
- Full brand voice rules are in the Claude project "Home Listing AI NEW".

## What We've Done ✅

- **Marketing Studio stage one (Oct 4):** replaced the Social Auto-Posting box on Marketing Funnels with the approved six-tab studio. Campaign/video briefs save per account in this browser; editing, copying, removal, planning calendar, photo preview and downloadable QR codes work. AI generation, shared storage, account connections and publishing are later stages. Existing lead finder, outreach and funnels remain below it.
- LO Brain (train once, Compliance Brain, calls and texts), AI phone number that answers, per-listing numbers.
- WOW Link (agent-facing mini app), LO Share Kit, agent Share Kit (same cards, no co-branding).
- Lead flow: capture, rating (rules at capture, Jev on replies and pre-approvals), speed-to-lead timer, one-tap call/text, "Ask my loan officer to call".
- Two full security sweeps (about 100 routes locked, open mail/SMS/call/delete routes closed, SSRF closed) plus an automatic route-guard test.
- Silent database bugs found by checking every selected column against the real DB; `npm run check:db`.
- About 10,000 lines of hidden pages and dead code removed; dashboard accessibility pass.
- Render: one service now runs the web server, the 60-second background loop and the job queue.
- Sentry error alerts are live (`SENTRY_DSN` saved). Its first alert was a real bug (default-funnel seed), already fixed.
- Money path audited. Fixed: hardcoded free-for-life promo codes (`LIFETIME`/`FRIENDS30`), paying LOs never being unlocked (slug used as account id in the Stripe webhook), and a second free trial week at checkout.
- **Agent dashboard launch audit (Oct 3-4), all fixed and live:** public booking can no longer be used to email strangers (rate limited); the $79 LO Lite upgrade button works (Stripe checkout verified live); new listings start as drafts so the plan limit can't be skipped; agents are no longer locked behind the 6-step wizard; CSV exports are safe in Excel; hot lead from a showing booking; page guides start collapsed; header and tab titles are right on LO pages; about 1,700 lines of dead code removed; a test now fails the build on any undefined variable in `server.cjs`.
- **LO to agent invoices (live):** the loan officer bills an agent for their share of marketing (some states require shared cost). We create, email and track the invoice and **never touch the money**. Realtor agents are free in the app: their Billing page no longer sells the LO plans and just lists their invoices. Table `lo_agent_invoices` (migration run).
- **Admin dashboard audit, tab by tab (Oct 4):** closed a **critical hole** (anyone could create a super-admin at `/api/admin/setup`; now needs `ADMIN_SETUP_TOKEN`; nobody had used it). Admin Settings, Training Studio and coupons were sending no login token (every call failed): fixed. Admin Broadcast, lead notes, edit/delete of other agents' appointments all fixed. **Buyer listing chat was saving nothing** (3 columns missing in the real DB): now saves, and conversations link to leads. Admin Leads has "Call these first", owner chip and filter, and a "waiting over 24h" card. Admin AI Conversations shows real names, paging, financing and lead badges. Admin Inbox rebuilt (working archive, search, thread, reply links, quick replies, menu unread count). Tabs done: Leads & Appointments, AI Conversations, Inbox, **AI Sidekicks (replaced by Business Brain)**.
- **Admin Business Brain (Oct 4):** the old AI Sidekicks / Training Studio tab is gone. The admin sidebar item is now **Business Brain** (same look as the AI You page): test chat, knowledge library (paste text, upload file, scan website), voice and personality, Marketing / Sales / Customer Service boxes. It is stored in the new `platform_brain` table (migration run) and, once saved with at least one source, is added to the public landing-page chat. Also closed: 4 open `/api/blueprint/ai-sidekicks/*` routes and `/api/training/*` (anyone could call them), and admin routes that were registered inside the chat handler on every message. ~3,800 lines of old sidekick code deleted.

## Right Now 🔨

- **Marketing Studio:** stage one is built and checked locally; GitHub push authorized, live deployment not verified. Briefs are browser-only, photos are preview-only, and calendar dates do not schedule posts. No paid service or new dependency added.
- **Chris:** hard-refresh and click through the admin tabs we fixed (Leads & Appointments, AI Conversations, Inbox, Business Brain: add pricing + FAQs and Save, then ask the site chat a pricing question); open a live listing as a buyer and chat to confirm real AI answers and the chat shows in Admin.
- **Chris:** pays the failed Render invoice, then cuts Render costs (Pro plan, video worker, old worker).
- **Money test (still open):** new LO signup, Stripe checkout, account unlocks, cancel inside the trial. The $79 checkout opens correctly (seen live) but nobody has paid yet.
- Stripe account public name still says "AN AI You" (Chris said it's fine for now).
- Optional: run `ai-chat-columns-migration.sql` (adds the 8 missing chat columns; the app works without it).

## Next Up ⏭️

0. **Marketing Studio stage two:** connect campaign generation to the admin Business Brain and persist campaigns on the server; then add FFmpeg video creation and manual/daily publishing with connected social accounts. The old Buffer backend remains in place; stage one only removes its panel.
1. **Admin audit, remaining tabs (one at a time):** Marketing Funnels (also re-check the CSV import consent prompt), Broadcasts, Listings, LO Platform, Users, Blog, White Label, Settings.
2. **Money test** (above), then watch Sentry for real-world errors.
3. Background push alerts for hot leads (service worker, VAPID keys, subscriptions table).
4. Weekly "your loan officer got you N leads" email to agents.
5. Stronger first line and button on the LO pitch email (84 opens, 0 clicks).
6. Repo clutter: about 30 stale `.md` files, 30 SQL files in the root, 6 AI-tool config files.

## Known Problems ⚠️

- Email From is forced onto `mg.homelistingai.com` (fixed DMARC failures); Mailgun DNS verified.
- Never select `agents.full_name` or `agents.brokerage` (columns do not exist). `ai_conversation_messages` has no `intent_tags`/`is_capture_event`/`confidence`; `ai_conversations` has no `agent_id`/`visitor_id`/`channel`/`last_activity_at`/`started_at`. Use `insertRowTolerant`/`updateRowTolerant` for chat writes.
- Admin "delete user" does not cancel their Stripe subscription or clean their leads/listings (self-service account delete does).
- About 28 admin routes and a few service exports have no caller (all login-locked). Not deleted: needs Chris's call per tab.
- 20 undefined-name hits in `server.cjs` are known harmless (see `backend/__tests__/noUndefinedNames.test.js`).
- Admin screens were verified by code, tests and live probes, not by clicking through (needs an admin login).

## Decisions Log

| Date | Decision |
|------|----------|
| Sep 2026 | One brain, 3 brains (admin, LO, listing) |
| Sep 2026 | Brains work like An AI You's Business Brain |
| Sep 2026 | OpenAI voice only, no outside voice apps |
| Sep 2026 | Claude and Codex both work on this repo — this file keeps them in sync |
| Oct 2026 | One Render service in `all` mode instead of web + worker |
| Oct 2026 | Every `/api` route needs a login guard or a reviewed allowlist entry (tested in CI) |
| Oct 2026 | Realtor agents are free in the app; loan officers pay. Cost sharing between an LO and an agent is an invoice the LO sends; we never handle that payment |
| Oct 2026 | Admin dashboard audited and fixed one tab at a time, each reported as verdict + red/yellow/green/suggestions |
| Oct 2026 | Admin AI Sidekicks replaced by one platform Business Brain (`platform_brain`), feeding the landing chat |
| Oct 2026 | `/api/admin/setup` is off unless `ADMIN_SETUP_TOKEN` is set and sent |
