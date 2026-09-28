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

### 2026-09-27 19:30 — Claude — Set up this handoff system + Jev audit
- **Did:** Created `AI_HANDOFF.md`. Added a "read this first" pointer to the top of `AGENTS.md` (Codex) and `CLAUDE.md` (Claude).
- **State:** Committed locally on `main`. Not pushed.
- **Open / next — Jev status:**
  - ✅ Live in code (commit `8db08ebe`): `backend/services/typesafeClient.js` + Lead Finder job-title filter (`loLeadScraperService.classifyRoleMatches`).
  - 🚧 **Uncommitted, in progress (likely Codex):** Jev in lead scoring — `LeadScoringService.js`, new `TypeSafeLeadQualificationService.js`, tests, and `@typesafe-ai/sdk` added to `backend/package.json`. Left untouched.
  - ⚠️ **Two TypeSafe clients now exist.** `typesafeClient.js` uses raw `fetch` (the ADR says the SDK was ESM-only). But `@typesafe-ai/sdk` 0.6.0 ships a CommonJS build (`dist/index.cjs`), so the SDK works here. Pick ONE and update ADR 0003 before merging the lead-scoring work.
  - 🔑 `TYPESAFE_API_KEY` is **set on Render** (web service) and tested by Chris 2026-09-27. Not in local `.env` — local dev falls back (by design).
- **Heads-up:** `SESSION_HANDOFF.md` is stale (last updated 2026-06-06). Use this file instead.
