'use strict';
const { findVoiceViolations } = require('../brandVoice');
const { PLATFORM_BANNED_PHRASES } = require('../loBrainService');

const FIELDS = ['title', 'facebook', 'linkedin', 'instagram', 'bluesky', 'videoScript'];
const PROMISES = /\b(guarantee[sd]?|lowest rate|best rate|no credit check|risk[- ]free|pre-?approved? in|approved in|instant approval|zero fees|free money)\b/i;
const REPLACE = /\b(replace|eliminate|get rid of)\b[^.]{0,30}\b(staff|team|employees|agents|loan officers|humans?|people)\b|never hire|no need to hire/i;
const KICKBACK = /\b(referral fee|kickback|pay(?:ing)? (?:agents|realtors) for)\b/i;
const INVENTED = /\b(thousands|hundreds|millions) of\b|\b(testimonial|case study)\b|\b(our|loan officers)\s+(customers|clients)\s+(say|report|love|saw|see)\b|\bsaid\s*[:"“]/i;
const ALLOWED_MONEY = /^\$(49|79)(\/mo(nth)?)?$/;

// The last gate before anything posts on its own. Returns a list of plain-words problems; empty means it may go.
function checkPost(outputs = {}) {
  const problems = [];
  for (const key of FIELDS) {
    const text = String(outputs[key] || '');
    if (!text.trim()) { if (key !== 'bluesky') problems.push(`${key} is empty`); continue; }
    const voice = findVoiceViolations(text);
    if (voice.length) problems.push(`${key}: ${voice.join(', ')}`);
    if (/\[[^\]]*\]|\{\{|TODO|lorem/i.test(text)) problems.push(`${key} has a placeholder`);
    if (PLATFORM_BANNED_PHRASES.some((phrase) => text.toLowerCase().includes(phrase))) problems.push(`${key} has a banned claim`);
    if (PROMISES.test(text)) problems.push(`${key} makes a promise`);
    if (REPLACE.test(text)) problems.push(`${key} talks about replacing people`);
    if (KICKBACK.test(text)) problems.push(`${key} mentions paying for referrals`);
    if (INVENTED.test(text)) problems.push(`${key} may invent results or customers`);
    if (/\d\s*%/.test(text)) problems.push(`${key} has a percentage`);
    for (const money of text.match(/\$\s?\d[\d,]*(?:\.\d+)?(?:\/mo(?:nth)?)?/g) || []) if (!ALLOWED_MONEY.test(money.replace(/\s/g, ''))) problems.push(`${key} has a money amount (${money})`);
    if ((text.match(/#\w+/g) || []).length > 4) problems.push(`${key} has too many hashtags`);
    if (/\b[A-Z]{4,}(?:\s+[A-Z]{4,}){2,}\b/.test(text)) problems.push(`${key} is shouting in capitals`);
    for (const url of text.match(/https?:\/\/[^\s)]+/g) || []) if (!/^https:\/\/(www\.)?homelistingai\.com(\/|$)/i.test(url)) problems.push(`${key} links outside the site (${url})`);
  }
  if (String(outputs.facebook || '').length < 60) problems.push('facebook post is too short');
  if (String(outputs.linkedin || '').length < 80) problems.push('linkedin post is too short');
  return [...new Set(problems)];
}

module.exports = { checkPost };
