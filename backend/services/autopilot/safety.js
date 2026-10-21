'use strict';
const { findVoiceViolations } = require('../brandVoice');
const { PLATFORM_BANNED_PHRASES } = require('../loBrainService');
const { business, hostPattern } = require('../../config/business');

const FIELDS = ['title', 'facebook', 'linkedin', 'instagram', 'bluesky', 'videoScript'];
const PROMISES = /\b(guarantee[sd]?|lowest rate|best rate|no credit check|risk[- ]free|pre-?approved? in|approved in|instant approval|zero fees|free money)\b/i;
const REPLACE = /\b(replace|eliminate|get rid of)\b[^.]{0,30}\b(staff|team|employees|agents|loan officers|humans?|people)\b|never hire|no need to hire/i;
const KICKBACK = /\b(referral fee|kickback|pay(?:ing)? (?:agents|realtors) for)\b/i;
const INVENTED = /\b(thousands|hundreds|millions) of\b|\b(testimonial|case study)\b|\b(our|loan officers)\s+(customers|clients)\s+(say|report|love|saw|see)\b|\bsaid\s*[:"“]/i;
// The product gives a loan officer something to bring to an agent. It does not find, match or supply agents.
const MASS_EXIT = /\b(all|every|most|nearly all|so many|millions? of)\s+(the\s+)?(realtors?|agents?)\b[^.!?]{0,30}\b(are|is|have|has)?\s*(quit(?:ting)?|leav(?:e|ing)|left|gone|disappear(?:ing)?|abandon(?:ing)?)\b/i;
const FINDS_AGENTS = /\b(we|it|homelistingai|this app|the app|our ai|ai)\s+(finds?|locates?|matches|connects you (?:with|to)|sources?|supplies|delivers)\b[^.!?]{0,40}\b(realtors?|agents?|partners?|referrals?)\b|\b(database|directory|list) of (realtors?|agents)\b|\bguaranteed? (referrals?|closings?|deals?)\b/i;
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ALLOWED_MONEY = new RegExp(`^(${business.prices.allowed.map(esc).join('|')})(\\/mo(nth)?)?$`);
const OWN_SITE = hostPattern(business);

// The wording checks every piece of text must pass (posts, and the words drawn into a video). Returns plain-words problems.
function textProblems(text, key, ok = new Set()) {
  const problems = [];
  const voice = findVoiceViolations(text);
  if (voice.length) problems.push(`${key}: ${voice.join(', ')}`);
  const holder = text.match(/\[[^\]]*\]|\{\{[^}]*\}\}|TODO|lorem ipsum/i);
  if (holder) problems.push(`${key} has a placeholder (${holder[0].slice(0, 30)})`);
  if (PLATFORM_BANNED_PHRASES.some((phrase) => text.toLowerCase().includes(phrase))) problems.push(`${key} has a banned claim`);
  if (PROMISES.test(text)) problems.push(`${key} makes a promise`);
  if (REPLACE.test(text)) problems.push(`${key} talks about replacing people`);
  if (KICKBACK.test(text)) problems.push(`${key} mentions paying for referrals`);
  if (INVENTED.test(text)) problems.push(`${key} may invent results or customers`);
  if (MASS_EXIT.test(text)) problems.push(`${key} says all or most Realtors are leaving`);
  if (FINDS_AGENTS.test(text)) problems.push(`${key} claims the product finds or supplies agents`);
  // Statistics: only numbers from the verified facts list (facts.js) may appear.
  for (const pct of text.match(/\d+(?:\.\d+)?\s*%/g) || []) if (!ok.has(pct.replace(/\s/g, '').toLowerCase())) problems.push(`${key} has an unverified percentage (${pct})`);
  for (const big of text.match(/\d+(?:\.\d+)?\s*(?:million|billion|thousand)/gi) || []) if (!ok.has(big.replace(/\s+/g, ' ').toLowerCase())) problems.push(`${key} has an unverified number (${big})`);
  for (const money of text.match(/\$\s?\d[\d,]*(?:\.\d+)?(?:\/mo(?:nth)?)?/g) || []) if (!ALLOWED_MONEY.test(money.replace(/\s/g, ''))) problems.push(`${key} has a money amount (${money})`);
  if ((text.match(/#\w+/g) || []).length > 4) problems.push(`${key} has too many hashtags`);
  if (/\b[A-Z]{4,}(?:\s+[A-Z]{4,}){2,}\b/.test(text)) problems.push(`${key} is shouting in capitals`);
  for (const url of text.match(/https?:\/\/[^\s)]+/g) || []) if (!(/^https:/i.test(url) && OWN_SITE.test(url))) problems.push(`${key} links outside the site (${url})`);
  return problems;
}

// The last gate before anything posts on its own. Returns a list of plain-words problems; empty means it may go.
function checkPost(outputs = {}, { allowed = [] } = {}) {
  const problems = [];
  const ok = new Set(allowed.map((t) => String(t).toLowerCase()));
  for (const key of FIELDS) {
    const text = String(outputs[key] || '');
    if (!text.trim()) { if (key !== 'bluesky') problems.push(`${key} is empty`); continue; }
    problems.push(...textProblems(text, key, ok));
  }
  if (String(outputs.facebook || '').length < 60) problems.push('facebook post is too short');
  if (String(outputs.linkedin || '').length < 80) problems.push('linkedin post is too short');
  return [...new Set(problems)];
}

module.exports = { checkPost, textProblems };
