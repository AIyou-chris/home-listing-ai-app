# BUILD.md — HomeListingAI

*Last updated: October 3, 2026*

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

- LO Brain (train once, Compliance Brain, calls and texts), AI phone number that answers, per-listing numbers.
- WOW Link (agent-facing mini app), LO Share Kit, agent Share Kit (same cards, no co-branding).
- Lead flow: capture, rating (rules at capture, Jev on replies and pre-approvals), speed-to-lead timer, one-tap call/text, "Ask my loan officer to call".
- Two full security sweeps (about 100 routes locked, open mail/SMS/call/delete routes closed, SSRF closed) plus an automatic route-guard test.
- Silent database bugs found by checking every selected column against the real DB; `npm run check:db`.
- About 10,000 lines of hidden pages and dead code removed; dashboard accessibility pass.
- Render: one service now runs the web server, the 60-second background loop and the job queue.
- Sentry error alerts are live (`SENTRY_DSN` saved). Its first alert was a real bug (default-funnel seed), already fixed.
- Money path audited. Fixed: hardcoded free-for-life promo codes (`LIFETIME`/`FRIENDS30`), paying LOs never being unlocked (slug used as account id in the Stripe webhook), and a second free trial week at checkout.

## Right Now 🔨

- Chris pays the failed Render invoice, then cuts Render costs (Pro plan, video worker, old worker).
- **Money test (live):** new LO signup, "Choose my plan", Stripe checkout, confirm the account unlocks, then cancel inside the 7-day trial. Nobody has ever paid yet.
- If friends get free access: set `FREE_ACCESS_PROMO_CODES` on Render (comma separated, non-guessable). No free codes exist by default.

## Next Up ⏭️

1. **Money test** (above), then watch Sentry for the first real-world errors.
2. Verify the trial and follow-up emails now fire (the loop was off before today).
3. Stronger first line and button on the LO pitch email (84 opens, 0 clicks).
4. Background push alerts for hot leads (service worker, VAPID keys, subscriptions table).
5. Simplify Today and Appointments (one primary action per card).
6. Repo clutter: about 30 stale `.md` files, 30 SQL files in the root, 6 AI-tool config files.

## Known Problems ⚠️

- Email From is forced onto `mg.homelistingai.com` (fixed DMARC failures); Mailgun DNS verified.
- Never select `agents.full_name` or `agents.brokerage` (columns do not exist).
- About 40 backend routes have no caller; they are all login-locked.

## Decisions Log

| Date | Decision |
|------|----------|
| Sep 2026 | One brain, 3 brains (admin, LO, listing) |
| Sep 2026 | Brains work like An AI You's Business Brain |
| Sep 2026 | OpenAI voice only, no outside voice apps |
| Sep 2026 | Claude and Codex both work on this repo — this file keeps them in sync |
| Oct 2026 | One Render service in `all` mode instead of web + worker |
| Oct 2026 | Every `/api` route needs a login guard or a reviewed allowlist entry (tested in CI) |
