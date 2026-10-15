'use strict';
// One place for the Marketing Image Playbook (docs/marketing/MARKETING_IMAGE_PLAYBOOK.md).
// Every picture maker (blog, social, Autopilot, video cards) reads its colors, models, budgets and art rules from here.
const crypto = require('crypto');

// Playbook design defaults (section 2). These are not the website's Tailwind tokens, so the blue editorial BRANDS in direction.cjs stay as they are.
const PALETTE = { black: '#08090D', charcoal: '#1A1D24', white: '#FFFFFF', red: '#ED1C24', orange: '#FF7A18' };

// Draft cheap, render once (playbook section 3). Both names can be changed in Render without a code change.
function imageModels(env = process.env) {
  return { draft: env.IMAGE_MODEL_DRAFT || 'gpt-image-1-mini', final: env.IMAGE_MODEL_FINAL || 'gpt-image-1' };
}
// Estimated cents per picture (not read from the OpenAI account). Used for logs and the budget guard.
const CENTS = { 'gpt-image-1-mini': { square: 2, landscape: 3, portrait: 3 }, 'gpt-image-1': { square: 4, landscape: 6, portrait: 6 } };
function estimateCents(model, format) {
  const shape = /blog|landscape|wide/.test(format) ? 'landscape' : /portrait|story|vertical/.test(format) ? 'portrait' : 'square';
  return (CENTS[model] || CENTS['gpt-image-1'])[shape];
}
// Pictures per day and per article are capped so a bug can never run up a bill.
function budget(env = process.env) {
  return { perDayCents: Number(env.IMAGE_BUDGET_DAILY_CENTS) || 150, perArticleCents: Number(env.IMAGE_BUDGET_ARTICLE_CENTS) || 30 };
}
function promptHash(...parts) { return crypto.createHash('sha256').update(parts.map(String).join('|')).digest('hex').slice(0, 16); }

// Section 6, shortened so the scene writer stays cheap.
const DIRECTOR = 'You are the visual creative director for HomeListingAI, a business-growth platform marketed to mortgage loan officers and brokers. Make premium, high-contrast, cinematic images. One concept per image. Dark charcoal composition, selective fire-red and tangerine accents, realistic homes and professionals, legible on a phone. Lead with loan officer growth and building new Realtor relationships. Never show a fake dashboard, robot, invented logo or readable text. Never say all or most Realtors are leaving.';

// Section 7: the same wording for every picture, only the scene and the frame change.
const LIGHTING = 'Dramatic, lifelike lighting: dark charcoal shadows, selective fire-red and warm tangerine edge light, a confident optimistic finish. Modern American real-estate and mortgage business setting, believable, precise focus, restrained sophistication, premium commercial photography.';
const NEGATIVE = 'No embedded text, no logos, no fabricated interface screenshots, no watermarks, no stock-art look, no unrealistic anatomy, no robots, no handshake clichés.';

module.exports = { PALETTE, imageModels, estimateCents, budget, promptHash, DIRECTOR, LIGHTING, NEGATIVE };
