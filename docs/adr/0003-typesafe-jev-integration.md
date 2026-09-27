# ADR-0003: TypeSafe (Jev) integration pattern

**Status:** Accepted  
**Date:** 2026-09-27

## Context

We wanted programmable, semantic judgments in a few places instead of keyword matching — starting with: is a scraped LinkedIn/Apify job title actually a mortgage loan officer, or did it just contain the word "loan" (e.g. "Loan Processor," "Loan Officer Assistant")? [TypeSafe](https://docs.typesafe.ai) (model: **Jev**) does this — it returns typed, calibrated judgments (yes/no probabilities, scored ratings, multiple-choice picks) instead of free-text generation, so application code can act on the answer directly.

TypeSafe ships an official SDK (`@typesafe-ai/sdk`), but it's ESM. This backend is CommonJS end to end (`server.cjs`, `require`/`module.exports` everywhere). Rather than fight ESM/CJS interop for one classification call, we call TypeSafe's plain HTTP API with `fetch` — the same pattern this codebase already uses for every other external API (Apify, HarvestAPI, Mailgun).

## Decision

**Account & key.** Sign up / log in at [console.typesafe.ai/keys](https://console.typesafe.ai/keys) to get an API key. Set it as `TYPESAFE_API_KEY` on whichever backend service will call it (Render env vars here) — no `VITE_` prefix, this must never reach the browser bundle.

**Client.** `backend/services/typesafeClient.js` — a small, dependency-free wrapper:

```js
const { createTypeSafeClient } = require('./typesafeClient');
const client = createTypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY });

const answers = await client.evaluate({
  state: { job_title: 'Loan Processor', employer: 'Acme Mortgage' },
  questions: {
    isLoanOfficerRole: {
      type: 'noul', // yes/no, returns a 0-1 probability
      instructions: 'Does this job title describe a mortgage loan officer...',
    },
  },
});
// answers.isLoanOfficerRole.noul -> 0.03
```

`evaluate()` posts to `POST https://api.typesafe.ai/v1/systemone` with `Authorization: Bearer <key>` and returns the raw `answers` map. It's DI-friendly (`fetchImpl` injectable) to match every other service in this codebase — see `backend/services/__tests__/typesafeClient.test.js`.

**First real use: LO Lead Finder role classification** (`backend/services/loLeadScraperService.js`, `classifyRoleMatches`). Every fresh contact with a `job_title`, right before it's stored in `lo_lead_pool`, gets one Noul question: *is this actually a loan-officer decision-maker, not an assistant/processor/underwriter/unrelated role?* This runs **after** the existing keyword-based `jobTitles`/`excludeTitles` filters already sent to Apify/HarvestAPI as search params — those are the third party's fuzzy string matching; this is a second, semantic pass on our side.

Two design choices worth keeping if this pattern gets reused elsewhere:

1. **Conservative threshold, not a hard cutoff.** Only drops a contact when Jev is >85% confident the answer is "no" (`noul < 0.15`). An uncertain or borderline title is *kept*, never guessed away — a false positive here costs the admin one wasted review click; a false negative costs a real lead. Pick your own threshold based on which mistake is cheaper for your feature.
2. **Fails open.** No `TYPESAFE_API_KEY` set, or the API call errors/times out → every contact is kept and a warning is logged once. An unconfigured or briefly-down classifier must never block the underlying feature (the Lead Finder still fully works with zero TypeSafe calls, exactly as it did before this integration).

Contacts with no `job_title` (most of the Google-CSE-engine results) are never sent to Jev — nothing to judge, so they pass through unclassified rather than wasting a call.

## Consequences

- One new required env var (`TYPESAFE_API_KEY`) on the backend, unset by default — every code path degrades gracefully without it.
- New per-contact API calls at Lead Finder run time, sized to however many contacts arrived with a job title (not the whole batch/pool) — worth watching if run volume grows.
- The client (`typesafeClient.js`) is intentionally generic — not scoped to lead classification. The next TypeSafe use case (chatbot buyer-question routing, lead-quality scoring — see the two other candidates identified but not yet built) reuses it directly; no new plumbing needed, just new `questions`.
- If a future feature needs `choice` (pick one of several options) or `score` (rate on a rubric) rather than `noul`, add them to `typesafeClient.js`'s `evaluate()` — the request shape is identical, only the question `type` and answer field change. Re-read the [primitives docs](https://docs.typesafe.ai/primitives) before adding a new type; don't guess the response shape.
