'use strict';
// Makes an animated explainer follow its campaign: the post's title becomes the big opening and closing words,
// and the post's first sentence becomes the closing line. The scene in the middle (chat, phone call, WOW Link steps) stays.
// Every piece of text must pass the same wording checks as a post. Anything that fails or does not fit is left as the scene had it.
const { textProblems } = require('./autopilot/safety');
const { tokensFor } = require('./autopilot/facts');

const LINE_MAX = 22; // the scenes cut every headline line at 22 letters
const HOOK_TEMPLATES = new Set(['phone-call', 'walkthrough', 'website-edit']);

const clean = (text) => String(text || '')
  .replace(/https?:\/\/\S+/g, ' ').replace(/#\w+/g, ' ').replace(/[*_`>~]/g, ' ')
  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ')
  .replace(/\s+/g, ' ').trim();

const sentences = (text) => (clean(text).match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || []).map((x) => x.trim()).filter(Boolean);
const firstSentence = (text) => sentences(text)[0] || '';

// Wraps words into at most three lines of at most 22 letters. Returns null when it will not fit.
function wrapHeadline(text) {
  const words = clean(text).replace(/[.!?]+$/, '.').split(' ').filter(Boolean);
  if (!words.length) return null;
  const lines = [];
  let line = '';
  for (const word of words) {
    if (word.length > LINE_MAX) return null;
    if (!line) line = word;
    else if (`${line} ${word}`.length <= LINE_MAX) line = `${line} ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length <= 3 ? lines : null;
}

// What to change in the scene's words so it follows the post. `post` is { outputs, brief }.
function matchPost({ template, post }) {
  const outputs = post?.outputs || {};
  const ok = new Set(tokensFor(post?.brief?.facts || []).map((t) => String(t).toLowerCase()));
  const passes = (text, key) => textProblems(text, key, ok).length === 0;
  const out = {};

  const title = clean(outputs.title);
  const lines = wrapHeadline(title) || wrapHeadline(firstSentence(title));
  if (lines && passes(lines.join(' '), 'title')) {
    out.endHeadline = lines;
    out.endAccent = lines[lines.length - 1];
    if (HOOK_TEMPLATES.has(template)) { out.hook = lines; out.hookAccent = lines[lines.length - 1]; }
  }

  // The first sentence of the post that is not just the title again.
  const seen = title.toLowerCase();
  const sentence = [...sentences(outputs.facebook), ...sentences(outputs.linkedin)].find((x) => x.length >= 20 && x.length <= 110 && !seen.includes(x.toLowerCase().replace(/[.!?]+$/, '')) && !(seen && x.toLowerCase().includes(seen.replace(/[.!?]+$/, ''))) && passes(x, 'line'));
  if (sentence) out.endLine = sentence;
  return out;
}

module.exports = { matchPost, wrapHeadline, firstSentence, clean };
