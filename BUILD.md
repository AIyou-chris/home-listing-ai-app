> **READ FIRST: `HOW_TO_TALK_TO_CHRIS.md`.** Keep it simple. 1 to 3 short lines on what you did. No "why". Anything Chris must do goes in **bold**, one step at a time.

# BUILD.md — HomeListingAI

*Last updated: October 6, 2026*

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

- **Marketing pictures (Oct 5, local):** 40 editorial scenes, three choices, plain-word tweaks, free resizing/headlines, checked private library and reusable blog covers. Six sample ideas have three choices each; all 18 passed automatic checks. No publication. See `docs/MARKETING_IMAGES.md`.

- **Loan-officer blog (Oct 5):** full article pages, five topic groups, author bio, search, calculator, signed PDF downloads and lead capture. Existing blog editor now checks drafts, previews, schedules and prepares sharing drafts in Marketing Studio. All ten starter articles remain drafts; the database also holds 26 briefs. No social posting.

- **Marketing video polish (Oct 4):** gentle picture zoom with steady captions, soft fades, voice-pause-aware estimated caption timing and a three-second logo/See a WOW Link ending. Still/cut/no-ending switches work. Reuses saved media, no extra AI spend. Real vertical/landscape exports checked.

- **Marketing Studio stage four (Oct 4):** optional AI narration (Nova/Alloy/Onyx) or free recorded-voice uploads; free built-in calm/upbeat music or your own uploaded music. Private audio previews, volume/speed/caption-size/colour controls and real H.264/AAC exports. Reuses saved narration through speed/music edits; changed scripts require refreshed voice. AI narration has a visible disclosure; three paid voice attempts per campaign, no automatic paid retries. Real AI + storage + narrated/music video workflow passed.

- **Marketing Studio stage three (Oct 4):** private saved photos, free branded pictures, optional AI pictures and finished silent MP4 videos. Preview/download, editable script/direction, 15/30/60-second vertical or landscape settings, stale-preview warnings and approval reset on media replacement. Real AI picture + Supabase + FFmpeg workflow verified. Chris explicitly wants social account connections LAST.
- **Marketing Studio stage two (Oct 4):** campaign drafts now use the saved admin Business Brain and existing OpenAI account. Blog, email, social text (including Bluesky), video script and picture prompt save to the admin account. Editing, review and approval work; approval does not publish. Database migration applied and real AI/database workflow checked.
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

- **All nine admin tabs audited (Oct 5-6) and pushed:** Leads & Appointments, AI Conversations, Inbox, Business Brain (replaced AI Sidekicks), Marketing Funnels, Broadcasts, Listings, LO Platform, Users, Settings. White Label merged into Users ("Set domain" on office accounts). Blog tab hidden (auto-publishing and auto-sharing OFF). Fake parts removed (Impersonate, Deliverability, System Config, Update Card, fake API keys). Delete user now cancels their Stripe plans. LO Platform has **Check account**: a read-only "what looks wrong" report per loan officer (every look is logged). I clicked through the live admin on Oct 6: all screens load, Studio saves and removes campaigns.
- **Brains (Oct 5-6):** Business Brain (website chat) is loaded from `HLAI_BUSINESS_BRAIN.md` (pricing, trial, refunds, compliance, objections, voice). Agents now have their own **AI Brain** page (notes, approved answers, showing rules). Every brain ships with starter knowledge so nobody dead-ends: loan basics for the loan officer brain and phone line, home-buying basics for the listing chat (`backend/services/baseKnowledge.js`).
- **/blog outage fixed (Oct 6):** the blog and calculator pages looped on redirects after the Codex push; fixed in 75d796a2 (`express.static` with `redirect:false` + a test). If `/blog` still loops, clear the Netlify cache and redeploy.
- **Cold email to loan officers** and **Marketing Studio / blog library / picture library** (Codex) are pushed. See Right Now for what is still pending.

## Right Now 🔨

- **Marketing pictures:** pushed in c85d1385; the private picture-library migration is live. Samples are in the Picture library tab ("Load sample ideas · free"). Lending ads still need the official Equal Housing artwork and a verified NMLS. Blog auto-publishing and auto-sharing stay OFF.

- **Cold email to loan officers (pushed in c6172c47; setup pending):** Admin > Marketing Funnels > "Cold email to loan officers". 5-touch sequence, a checker that blocks bad emails, own sending domain, warm-up, auto-pause, reply handling, results by angle/opener/touch. Nothing sends until the migration is run, a separate sending domain is set up (`docs/COLD_EMAIL_DNS.md`), `COLD_EMAIL_ENABLED=true` is set and an admin approves a batch (first batch capped at 20). How to use: `docs/COLD_EMAIL.md`.

- **Blog:** pushed in c6172c47; database migration and 36-record library saved. Auto-publishing OFF; Blog sidebar tab hidden per Chris. Preview http://127.0.0.1:5181/blog and admin preview http://127.0.0.1:5177/tmp/blog-studio/index.html. Needs: backend IndexNow key, Chris's real photo and verified LinkedIn URL. Ten articles need human review before publication. Details: `docs/BLOG.md`.

- **Marketing Studio:** stages one to four are live. One AI campaign draft was tested live on Oct 6 and works (about a cent). Not yet tested live: AI pictures, AI voice, video render (they cost money), and whether FFmpeg is installed on Render. Social connections come last.
- **Chris:** open the loan officer AI Brain, press Test it and ask about VA loans; open a live listing as a buyer and chat to confirm real answers and that the chat shows in Admin.
- **Chris:** pays the failed Render invoice, then cuts Render costs (Pro plan, video worker, old worker).
- **Money test (still open):** new LO signup, Stripe checkout, account unlocks, cancel inside the trial. The $79 checkout opens correctly (seen live) but nobody has paid yet.
- Stripe account public name still says "AN AI You" (Chris said it's fine for now).
- Optional: run `ai-chat-columns-migration.sql` (adds the 8 missing chat columns; the app works without it).

## Next Up ⏭️

- **Marketing pictures:** Database update is applied and checked. Chris reviews the private sample page, then requests a push. Use sample loading and manual review; do not turn on blog publishing or connect social accounts.

- **Blog:** review the starter articles and preview, deploy when requested, then manually publish reviewed articles when Chris requests it. Auto-publishing stays off. Social drafts remain a separate two-per-day plan, with account connections last.

0. **Marketing Studio:** review/tweak pictures and finished videos with Chris; voice/music refinements and additional visual styles if wanted. Only after media is right, connect native social accounts and add manual/daily posting. Existing Buffer backend remains unchanged.
1. Cold email: set the separate sending domain (`gethomelistingai.com` bought, DNS passes), set the Render settings, connect the Mailgun reply route, then switch on (`docs/COLD_EMAIL_DNS.md`). Chris pauses this until Mailgun's MX shows green.
2. **Money test** (above), then watch Sentry for real-world errors.
3. Background push alerts for hot leads (service worker, VAPID keys, subscriptions table).
4. Weekly "your loan officer got you N leads" email to agents.
5. The LO pitch page, not the email, is the weak spot: about 99 of 441 invitees visited it and none pressed the button.
6. Repo clutter: about 30 stale `.md` files, 30 SQL files in the root, 6 AI-tool config files.

## Known Problems ⚠️

- Email From is forced onto `mg.homelistingai.com` (fixed DMARC failures); Mailgun DNS verified.
- Never select `agents.full_name` or `agents.brokerage` (columns do not exist). `ai_conversation_messages` has no `intent_tags`/`is_capture_event`/`confidence`; `ai_conversations` has no `agent_id`/`visitor_id`/`channel`/`last_activity_at`/`started_at`. Use `insertRowTolerant`/`updateRowTolerant` for chat writes.
- Admin "delete user" cancels their Stripe plans but does not clean their leads/listings (self-service account delete does).
- Some admin routes and service exports still have no caller (all login-locked). Not deleted.
- 20 undefined-name hits in `server.cjs` are known harmless (see `backend/__tests__/noUndefinedNames.test.js`).
- Admin screens were clicked through live on Oct 6. Not yet clicked because they cost money: AI pictures, AI voice, video render.
- The Lead Finder pool holds non-loan-officers and a test row ("Test RealLO"); cold email only imports mortgage/loan/lending titles.
- Every admin page logs one harmless 403 (`rpc/is_user_admin`).

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

### Video preview repair — 2026-10-04
Inline player now preloads data with a campaign-picture poster and an unclipped black wrapper. Separate Watch video link opens native playback. Verified actual captioned frames in the local studio after reload; no encoding change or AI charges.

Video ending logo enlarged to 188px within a 220px white tile; landscape positioning adjusted to prevent cropping.
| Oct 2026 | Admin White Label tab merged into Users; Blog tab hidden; auto-blogging OFF until Chris says so |
| Oct 2026 | Every brain ships with starter knowledge; a person's own notes always sit on top of it |
| Oct 2026 | Loan officer customer service uses a read-only "Check account" report, not "log in as them" |
