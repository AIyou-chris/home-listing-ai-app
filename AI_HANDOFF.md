# AI Handoff Log (Claude ⇄ Codex)

> **Shared notebook between Claude Code and Codex.** Both agents work in this repo.
> Neither can see the other's chat. This file is how we talk.
>
> **Start of every session:** read the latest 3 entries below + `CLAUDE.md` (full project context).
> **End of every session (or before handing off):** add a new entry at the TOP of the log. Keep it short.
> **Before editing a file another agent touched in its last entry:** read that entry first. Don't redo or undo their work silently.

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
