'use strict';
// The ONLY place the marketing engine reaches into the rest of the app.
//
// Everything else in marketing-engine/ depends only on files inside marketing-engine/ (a test, marketing-engine/__tests__/boundary.test.js,
// fails if that stops being true). To use the engine for another business, copy the folder and replace this one file with that
// business's own versions of these few things:
//
//   wording rules   findVoiceViolations(text) -> list of problems, scrubVoice(text), MARKETING_VOICE_RULES (text for the writer),
//                   PLATFORM_GUARDRAILS (text), PLATFORM_BANNED_PHRASES (list of phrases that must never appear)
//   business brain  withDefaults(brain), buildBrainPrompt(brain) (what the business has taught the AI about itself)
//   cold email      computeResults(sends) for the results page (return zeros if the business has no cold email)
//
// Each is loaded only when first used, so the engine starts even if one of them is missing.
const lazy = (path, name) => ({ get [name]() { return require(path)[name]; } });

module.exports = {
  ...lazy('../services/brandVoice', 'findVoiceViolations'),
  ...lazy('../services/brandVoice', 'scrubVoice'),
  ...lazy('../services/brandVoice', 'MARKETING_VOICE_RULES'),
  ...lazy('../services/loBrainService', 'PLATFORM_GUARDRAILS'),
  ...lazy('../services/loBrainService', 'PLATFORM_BANNED_PHRASES'),
  ...lazy('../services/businessBrain', 'withDefaults'),
  ...lazy('../services/businessBrain', 'buildBrainPrompt'),
  ...lazy('../services/coldEmail/results', 'computeResults')
};
