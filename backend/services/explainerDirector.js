'use strict';
// Decides the final words of an animated video so it represents its post, using two AI helpers:
//   1. a writer that drafts the closing words from the post (explainerWriter.js), and
//   2. a separate reviewer that reads the finished plan and says whether it carries the same message (videoReview.js).
// If the reviewer says no, the writer gets the reviewer's note and tries once more. If the second try still does not pass,
// the caller is told, and it falls back (Autopilot uses the moving-picture video instead of posting a video that does not match).
const explainer = require('./explainerVideo');
const { writeClosingWords } = require('./explainerWriter');
const { reviewWithConsensus } = require('./videoReview');

// post: { title, text, facts? }. Returns { ok, words, review, tries, reviewed }.
//   words  = the changes to the scene's words (headline, closing line, button, small print) to hand to the renderer.
//   ok     = true when the reviewer passed it, or when no reviewer is available (reviewed=false).
// The writer's headline lines become the scene's opening and closing headline (with the last line coloured).
function toSceneWords(written, template) {
  const { headline, ...rest } = written;
  const out = { ...rest };
  if (headline?.length) {
    out.endHeadline = headline; out.endAccent = headline[headline.length - 1];
    if (['phone-call', 'walkthrough', 'website-edit'].includes(template)) { out.hook = headline; out.hookAccent = headline[headline.length - 1]; }
  }
  return out;
}

async function directVideo({ name, post, openai, voice = false, maxTries = 2, writer = writeClosingWords, reviewer = reviewWithConsensus }) {
  const asPost = { outputs: { title: post.title, facebook: post.text }, brief: { facts: post.facts || [] } };
  const base = explainer.plan(name, { post: asPost });
  const history = []; // every try, with the reviewer's answer
  let feedback = '';
  for (let tries = 1; tries <= maxTries; tries += 1) {
    const written = await writer({ post, headline: (base.config.endHeadline || []).join(' '), openai, feedback, facts: post.facts || [] });
    const words = toSceneWords(written, base.template);
    const planned = explainer.plan(name, { post: asPost, words });
    const review = await reviewer({ post, config: planned.config, spoken: voice ? planned.spoken : [], openai });
    if (!review.ok) return { ok: true, words, review, tries, reviewed: false, history }; // no reviewer available: not a reason to block
    history.push({ words, review });
    if (review.matches) return { ok: true, words, review, tries, reviewed: true, history };
    feedback = [review.problems?.join('; '), review.fix].filter(Boolean).join(' | ');
  }
  // Nothing passed. Keep the best try (a later try is not always a better one).
  const best = history.reduce((a, b) => (b.review.score > a.review.score ? b : a), history[0]);
  return { ok: false, words: best.words, review: best.review, tries: history.length, reviewed: true, history };
}

module.exports = { directVideo, toSceneWords };
