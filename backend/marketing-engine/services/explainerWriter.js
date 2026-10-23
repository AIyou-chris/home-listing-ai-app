'use strict';
// The first of two AI helpers for an animated video. It writes only the closing words of the video (the closing line,
// the button and the small print) as a faithful short version of the post, so the video says what the post says.
// It may use only what the post says. A separate reviewer (videoReview.js) then checks the result.
const { textProblems } = require('./autopilot/safety');
const { tokensFor } = require('./autopilot/facts');

const WRITER_MODEL = process.env.VIDEO_WRITER_MODEL || 'gpt-4o';

const SYSTEM = [
  'You write the closing words of a short vertical social video from the social post it is made for.',
  'Use ONLY what the post says. Do not add any fact, offer, price, number, promise or claim that is not in the post.',
  'Keep the post\'s main benefit and its call to action. Plain, spoken words, short sentences, no hype.',
  'Return JSON only: {"must_keep": ["..."], "endLine": "...", "cta": "...", "small": "..."}.',
  'must_keep: first list the three or four things a viewer must take away from the post (the offer or product it names, who it is for or what they do, the main benefit, and the urgency if there is one).',
  'endLine: then write one or two short sentences (110 characters at most) that carry as many of those must_keep points as fit, naming the offer exactly as the post does (for example "free WOW Link listing page"). Never drop the offer\'s name. Do not repeat the headline.',
  'cta: the button text in capital letters (30 characters at most) that matches the post\'s own call to action.',
  'Use LEARN MORE when the post says visit, learn more or see more. Use TRY IT FREE FOR 7 DAYS only when the post itself offers a free trial. Use BOOK A CALL only if the post says to book or call.',
  'small: one short line (80 characters at most) saying where to go, using the post\'s own link or the site name. No promises.'
].join(' ');

const cut = (text, max) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);

// Returns { endLine?, cta?, small? }. A field that fails the wording checks is left out (the video keeps its own).
async function writeClosingWords({ post, headline = '', openai, feedback = '', model = WRITER_MODEL, facts = [] }) {
  if (!openai?.chat?.completions?.create) return {};
  const user = [
    `POST TITLE: ${post?.title || ''}`,
    `POST TEXT: ${String(post?.text || '').slice(0, 2500)}`,
    `VIDEO HEADLINE (already on screen, do not repeat it): ${headline}`,
    feedback ? `AN EDITOR SAID THE LAST VERSION HAD THIS PROBLEM, FIX IT: ${feedback}` : ''
  ].filter(Boolean).join('\n');
  let raw;
  try {
    const response = await openai.chat.completions.create({
      model, temperature: 0.2, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }]
    });
    raw = JSON.parse(response.choices?.[0]?.message?.content || '{}');
  } catch { return {}; }
  const ok = new Set(tokensFor(facts).map((t) => String(t).toLowerCase()));
  const out = {};
  const endLine = cut(raw.endLine, 110);
  if (endLine.length >= 15 && !textProblems(endLine, 'line', ok).length) out.endLine = endLine;
  const cta = cut(raw.cta, 30).toUpperCase();
  if (cta.length >= 4 && !textProblems(cta, 'cta', ok).length) out.cta = cta;
  const small = cut(raw.small, 80);
  if (small.length >= 8 && !textProblems(small, 'small', ok).length) out.small = small;
  return out;
}

module.exports = { writeClosingWords, WRITER_MODEL };
