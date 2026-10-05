'use strict';

const { APPROVED_FACTS } = require('./facts');

// Words per touch, signature excluded.
const WORD_RANGE = { 1: [55, 110], 2: [40, 80], 3: [40, 80], 4: [50, 90], 5: [25, 50] };

const BANNED_WORDS = [
  'revolutionary', 'game-changer', 'game changer', 'leverage', 'leveraging', 'synergy', 'drive engagement',
  'empower', 'solution', 'solutions', 'best-in-class', 'seamless', 'seamlessly', 'unlock', 'elevate',
  'cutting-edge', 'state-of-the-art', 'i hope this email finds you well', 'i wanted to reach out',
  'quick question', 'touch base', 'circle back', 'just checking in', 'limited time', 'act now', 'guarantee',
  'guaranteed', 'generate leads'
];

// Promise / value / fake-proof patterns (RESPA Section 8, fair lending, invented facts).
const PROMISE_PATTERNS = [
  /\bapproved\b/i, /\blowest rates?\b/i, /\bno risk\b/i, /\brisk[- ]free\b/i, /\bmake you money\b/i, /\bearn\b/i,
  /\bguarantee/i, /\breferral fees?\b/i, /\breferral bonus/i, /\bkick ?backs?\b/i, /\bget paid\b/i,
  /\bpay(?:ing)? (?:you|agents)\b/i, /\bcompensat/i
];
const FAKE_PROOF_PATTERNS = [
  /\bloan officers like you\b/i, /\bagents we work with\b/i, /\bour customers\b/i, /\bour clients\b/i,
  /\bjoin (?:hundreds|thousands|dozens)\b/i, /\bcase stud/i, /\btestimonial/i, /\bI saw your profile\b/i,
  /\bimpressed (?:by|with) your\b/i, /\b(?:hundreds|thousands) of (?:loan officers|agents)\b/i
];
const CLICKBAIT_SUBJECT = [/urgent/i, /last chance/i, /you won'?t believe/i, /free money/i, /final notice/i, /act now/i, /\bre:/i, /\bfwd?:/i];

const ALLOWED_CAPS = new Set(['NMLS', 'STOP', 'RESPA', 'HOMELISTINGAI']);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

const PLACEHOLDER = /\{\{\s*[a-z_.]+\s*\}\}/gi;
const LINK = /https?:\/\/[^\s)>\]]+/gi;

// Strip the signature (first name + title lines at the end) so it does not count toward length.
const stripSignature = (text) => {
  const lines = String(text || '').trim().split('\n');
  while (lines.length && /^\s*$/.test(lines[lines.length - 1])) lines.pop();
  const title = /founder,\s*homelistingai/i;
  if (lines.length && title.test(lines[lines.length - 1])) lines.pop();
  if (lines.length && /^\s*chris(?:\s+potter)?\s*$/i.test(lines[lines.length - 1])) lines.pop();
  return lines.join('\n');
};

const countWords = (text) => (String(text || '').trim().match(/\S+/g) || []).length;
const bodyWordCount = (body) => countWords(stripSignature(body));

const stripGreeting = (text) => String(text || '').replace(/^\s*(?:hi|hey|hello)\b[^\n]*\n/i, '').replace(/^\s*\{\{[^}]+\}\},\s*/, '');

const sentenceCount = (text) =>
  stripGreeting(stripSignature(text))
    .replace(/https?:\/\/\S+/g, '')
    .split(/[.!?]+(?:\s|$)|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[a-z]{2,}/i.test(s)).length;

const containsPhrase = (text, phrase) => {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, 'i').test(text);
};

// Numeric tokens that are not in the approved list. Time words ("9pm") and the 24/7 idiom are fine.
const unapprovedNumbers = (text) => {
  const cleaned = String(text || '').replace(LINK, ' ').replace(PLACEHOLDER, ' ');
  const found = [];
  const regex = /\$?\d[\d,]*(?:\.\d+)?(?:\s?[kK])?%?/g;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    const token = m[0];
    const normalized = token.replace(/[$,\s%]/g, '').toLowerCase();
    if (token.includes('%')) { found.push(token); continue; }
    if (APPROVED_FACTS.allowedNumbers.includes(normalized)) continue;
    // "9pm", "7:30am": number glued to am/pm
    const after = cleaned.slice(m.index + token.length, m.index + token.length + 3).toLowerCase();
    if (/^\s?(am|pm)/.test(after)) continue;
    found.push(token);
  }
  return found;
};

// checkColdEmail: returns { ok, failures[], wordCount }. Failures are plain-English for the admin screen.
const checkColdEmail = ({ touch = 1, subject = '', body = '', replyOnly = false, allowPlaceholders = false } = {}) => {
  const failures = [];
  const add = (rule, message) => failures.push({ rule, message });
  const sub = String(subject || '').trim();
  const text = String(body || '');
  const words = bodyWordCount(text);
  const [min, max] = WORD_RANGE[touch] || WORD_RANGE[1];

  if (words < min || words > max) add('length', `The email is ${words} words. Touch ${touch} must be ${min} to ${max} words.`);
  if (touch === 1 && (sentenceCount(text) < 4 || sentenceCount(text) > 6)) {
    add('sentences', `First email must be 4 to 6 short sentences (this has ${sentenceCount(text)}).`);
  }

  const subjectWords = countWords(sub);
  if (subjectWords < 2 || subjectWords > 6) add('subject_length', `The subject has ${subjectWords} words. It must be 2 to 6.`);
  if (EMOJI.test(sub)) add('subject_emoji', 'No emojis in the subject.');
  if (/!/.test(sub)) add('subject_bang', 'No exclamation marks in the subject.');
  if (/[A-Z]{4,}/.test(sub.replace(/\bNMLS\b/g, ''))) add('subject_caps', 'No ALL CAPS words in the subject.');
  for (const re of CLICKBAIT_SUBJECT) if (re.test(sub)) { add('subject_clickbait', 'The subject looks like clickbait or a fake reply ("Re:", "urgent").'); break; }

  const lower = `${sub}\n${text}`.toLowerCase();
  for (const word of BANNED_WORDS) if (containsPhrase(lower, word)) add('banned_word', `Banned word or phrase: "${word}".`);
  for (const re of PROMISE_PATTERNS) if (re.test(`${sub}\n${text}`)) add('promise', `Promise or referral-payment wording is not allowed ("${(`${sub}\n${text}`.match(re) || [''])[0]}").`);
  for (const re of FAKE_PROOF_PATTERNS) if (re.test(text)) add('fake_proof', `Invented proof is not allowed ("${(text.match(re) || [''])[0]}").`);

  const links = text.match(LINK) || [];
  if (links.length > 1) add('links', `Only one link is allowed (found ${links.length}).`);
  if (touch === 1 && replyOnly && links.length > 0) add('links', 'This variant is reply-only, so the first email must have no link.');
  if (touch === 2 && links.length < 1) add('links', 'Touch 2 must show the live example link.');
  if (/<[a-z][\s\S]*?>/i.test(text)) add('html', 'Plain text only. No HTML.');
  if (/[*_#>`]{2,}|^\s*[-*•]\s/m.test(text)) add('formatting', 'No bold, bullets or markdown. Plain sentences only.');
  if ((text.match(/!/g) || []).length > 1) add('exclamation', 'No more than one exclamation mark.');

  const capsWords = (text.replace(LINK, ' ').replace(PLACEHOLDER, ' ').match(/\b[A-Z]{4,}\b/g) || []).filter((w) => !ALLOWED_CAPS.has(w));
  if (capsWords.length) add('all_caps', `No ALL CAPS words (${capsWords.slice(0, 3).join(', ')}).`);

  const badNumbers = unapprovedNumbers(`${sub} ${text}`);
  if (badNumbers.length) add('numbers', `A number is not in the approved facts: ${badNumbers.slice(0, 3).join(', ')}.`);

  if (!allowPlaceholders && PLACEHOLDER.test(text + sub)) add('placeholder', 'There is an unfilled {{placeholder}} in the email.');
  PLACEHOLDER.lastIndex = 0;

  if (!/\bchris\b/i.test(text)) add('signature', 'Sign off with the first name: Chris.');
  if (touch === 1 && !/founder,\s*homelistingai/i.test(text)) add('signature', 'First email must end with "Founder, HomeListingAI".');
  if (/re:\s|fwd:\s/i.test(sub) ) add('fake_thread', 'No fake "Re:" or "Fwd:" subjects.');

  return { ok: failures.length === 0, failures, wordCount: words };
};

// Server adds this at send time; the UI never edits it.
const checkFooter = (fullText, { postalAddress }) => {
  const failures = [];
  const text = String(fullText || '');
  if (!postalAddress || !text.includes(postalAddress)) failures.push({ rule: 'footer_address', message: 'The postal address is missing from the footer.' });
  if (!/unsubscribe/i.test(text) || !/https?:\/\//i.test(text)) failures.push({ rule: 'footer_unsubscribe', message: 'The visible unsubscribe line is missing.' });
  return failures;
};

const ROLE_LOCALPARTS = new Set(['info', 'admin', 'support', 'sales', 'contact', 'office', 'hello', 'team', 'help', 'noreply', 'no-reply', 'webmaster', 'marketing', 'billing', 'careers', 'jobs', 'hr', 'mail', 'service']);
const isRoleAddress = (email) => ROLE_LOCALPARTS.has(String(email || '').split('@')[0].toLowerCase());
const isValidEmailSyntax = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());

const RECENT_DAYS = 30;

// Recipient checks that must pass before ANY send. mxLookup(domain) -> Promise<boolean>
const checkRecipient = async ({ email, suppressed, lastContactedAt, now = Date.now(), mxLookup, allowRecentContact = false }) => {
  const failures = [];
  const lower = String(email || '').trim().toLowerCase();
  if (!isValidEmailSyntax(lower)) failures.push({ rule: 'syntax', message: 'The email address is not valid.' });
  if (isRoleAddress(lower)) failures.push({ rule: 'role', message: 'Role addresses (info@, admin@...) are not used.' });
  if (suppressed && suppressed.has(lower)) failures.push({ rule: 'suppressed', message: 'This person unsubscribed, bounced or complained. Never email them.' });
  if (!allowRecentContact && lastContactedAt && now - new Date(lastContactedAt).getTime() < RECENT_DAYS * 86400000) {
    failures.push({ rule: 'recent', message: `They were emailed in the last ${RECENT_DAYS} days.` });
  }
  if (!failures.length && mxLookup) {
    const ok = await mxLookup(lower.split('@')[1]).catch(() => false);
    if (!ok) failures.push({ rule: 'mx', message: 'That email domain cannot receive mail.' });
  }
  return { ok: failures.length === 0, failures };
};

module.exports = {
  WORD_RANGE, BANNED_WORDS, checkColdEmail, checkFooter, checkRecipient, bodyWordCount, stripSignature,
  isRoleAddress, isValidEmailSyntax, unapprovedNumbers, sentenceCount, RECENT_DAYS
};
