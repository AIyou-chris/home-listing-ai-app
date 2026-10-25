'use strict';
// One place for the Marketing Image Playbook (docs/marketing/MARKETING_IMAGE_PLAYBOOK.md).
// Every picture maker (blog, social, Autopilot, video cards) reads its colors, models, budgets and art rules from here.
const crypto = require('crypto');
const { business } = require('../../config/business');
const look = business.look;

// Playbook design defaults (section 2). These are not the website's Tailwind tokens, so the blue editorial BRANDS in direction.cjs stay as they are.
const PALETTE = look.palette;

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
const DIRECTOR = look.director;

// Section 7: the same wording for every picture, only the scene and the frame change.
const LIGHTING = look.lighting;
const NEGATIVE = look.negative;

module.exports = { PALETTE, imageModels, estimateCents, budget, promptHash, DIRECTOR, LIGHTING, NEGATIVE };
