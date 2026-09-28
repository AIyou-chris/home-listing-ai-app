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

## Log

### 2026-09-28 13:30 â Claude â Get my AI phone number (PR #20, live, off by default)
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
