'use strict';

// Minimal client for TypeSafe's System One API (the "Jev" model) — see
// docs.typesafe.ai. Raw fetch against the HTTP API rather than the
// @typesafe-ai/sdk package: this backend is CommonJS (server.cjs,
// require/module.exports throughout) and the SDK's ESM-only interop wasn't
// worth the risk for what's currently one small classification call. If a
// second feature ends up needing System One's richer primitives (choice,
// score), reconsider the SDK then.
//
// DI-friendly to match this codebase's existing service pattern (see
// loLeadScraperService.js): pass `fetchImpl` in tests instead of hitting
// the real API.

const TYPESAFE_API_URL = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_MODEL = 'jev-latest';

function createTypeSafeClient({ apiKey, fetchImpl = fetch } = {}) {
  const isConfigured = () => Boolean(apiKey);

  // `state` is the content being judged (string | object | array).
  // `questions` is a map of questionId -> { type: 'noul'|'choice'|'score', instructions, criteria? }.
  // Returns the raw `answers` map from the API, e.g. { myQuestion: { type: 'noul', noul: 0.87 } }.
  async function evaluate({ state, questions, model = DEFAULT_MODEL }) {
    if (!apiKey) throw new Error('TYPESAFE_API_KEY is not configured');
    if (!questions || !Object.keys(questions).length) throw new Error('evaluate() requires at least one question');

    const res = await fetchImpl(TYPESAFE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state, model, questions }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`TypeSafe API HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    return data.answers || {};
  }

  return { isConfigured, evaluate };
}

module.exports = { createTypeSafeClient, TYPESAFE_API_URL, DEFAULT_MODEL };
