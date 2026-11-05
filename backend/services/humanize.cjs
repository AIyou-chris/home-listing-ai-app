/**
 * Takes the machine sound out of a draft before anyone reads it.
 *
 * Ported from the MIT-licensed linkedin-agent-skill (humanize.py, (c) 2026 Jake
 * Schincariol; github.com/Jakeschincariol/linkedin-agent-skill). Three passes,
 * in order: invisible characters, typography (em dashes, curly quotes), then a
 * lexicon of stock AI words swapped for plain ones. Links and email addresses
 * are never touched. The lexicon is slop.json, next to this file.
 */
const lexicon = require('./slop.json');

const URL_RE = /https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g;

function protectUrls(text) {
  const found = [];
  const out = text.replace(URL_RE, match => `\u0000URL${found.push(match) - 1}\u0000`);
  return { text: out, found };
}

function restoreUrls(text, found) {
  return found.reduce((out, url, i) => out.split(`\u0000URL${i}\u0000`).join(url), text);
}

function codePoint(spec) {
  if (spec.includes('-')) {
    const [a, b] = spec.split('-');
    return [parseInt(a.slice(2), 16), parseInt(b.slice(2), 16)];
  }
  return parseInt(spec.slice(2), 16);
}

function passInvisible(text) {
  let out = text;
  for (const entry of lexicon.invisible) {
    const cp = codePoint(entry.cp);
    const pattern = Array.isArray(cp)
      ? new RegExp(`[\\u{${cp[0].toString(16)}}-\\u{${cp[1].toString(16)}}]`, 'gu')
      : new RegExp(`\\u{${cp.toString(16)}}`, 'gu');
    out = out.replace(pattern, entry.action === 'delete' ? '' : ' ');
  }
  // Anything else Unicode calls a format character is invisible by definition.
  return out.replace(/\p{Cf}/gu, '');
}

function passTypographic(text) {
  let out = text;
  for (const entry of lexicon.typographic) {
    const ch = entry.from;
    if (!out.includes(ch)) continue;
    // A dash ending a line just ends it; anywhere else it becomes a comma.
    if (ch === '\u2014') out = out.replace(/[ \t]*\u2014[ \t]*(?=\n)/g, '').replace(/\s*\u2014\s*/g, ', ');
    else if (ch === '\u2013') {
      out = out.replace(/\s*\u2013\s*(?=\d)/g, '-').replace(/\s+\u2013\s+/g, ', ').split('\u2013').join('-');
    } else out = out.split(ch).join(entry.to);
  }
  // A comma pushed up against other punctuation reads wrong.
  // (A real comma at the end of a line, like "Best,", is left alone.)
  return out.replace(/,\s*([,.;:!?])/g, '$1');
}

function matchCase(source, replacement) {
  if (!replacement) return replacement;
  if (source.length > 1 && source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] !== source[0].toLowerCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

const ENTRIES = [...lexicon.phrases, ...lexicon.words]
  .sort((a, b) => b.find.length - a.find.length)
  .map(entry => ({
    replace: entry.replace,
    pattern: new RegExp(`\\b${entry.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}\\b`, 'gi')
  }));

function passLexical(text) {
  let out = text;
  for (const { pattern, replace } of ENTRIES) out = out.replace(pattern, match => matchCase(match, replace));
  return out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]*[,.;:]\s*/gm, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n');
}

/** Clean one piece of text. Anything that is not a string comes back as it was. */
function humanize(value) {
  if (typeof value !== 'string' || !value) return value;
  const { text, found } = protectUrls(value);
  const cleaned = passLexical(passTypographic(passInvisible(text)));
  return restoreUrls(cleaned, found).trim();
}

module.exports = { humanize };
