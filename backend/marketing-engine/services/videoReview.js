'use strict';
// A second pair of eyes for the animated videos. After the words of a video are decided (the opening and closing words,
// the chat or steps in the middle, and every spoken line), this asks a separate AI reviewer one question:
// "does a viewer come away with the SAME message as the post?" It cannot approve or post anything; it only answers.
// It reads the words, not the pixels, so it is cheap (a fraction of a cent) and can run before the video is drawn.
const REVIEW_MODEL = process.env.VIDEO_REVIEW_MODEL || 'gpt-4o';
const MIN_SCORE = 4;

const SYSTEM = [
  'You are a strict but fair editor checking a short animated video against the social post it was made for.',
  'You are given the post (title and text) and everything the video says: the words on screen and the spoken lines.',
  'Step 1: in one sentence, state the post\'s main message (what it wants the reader to understand and do).',
  'Step 2: in one sentence, state the main message a viewer takes from the video alone.',
  'Step 3: decide if they are the same message. Judge only what is written. Do not invent facts.',
  'The video is short, so it will leave out secondary points and repeated sentences, and it uses a fixed demo in the middle (a sample chat, call or steps). That is fine as long as it supports the same message.',
  'It does NOT match if: it leaves out the main point; it names a different offer or product; it changes what the viewer is asked to do or the call to action;',
  'it adds an offer, promise, price or statistic the post does not contain; its tone clearly differs (for example playful when the post is serious); or its lines are confusing or contradict each other.',
  'Reply with JSON only: {"post_main_message": "...", "video_main_message": "...", "matches": true|false, "score": 1-5, "problems": ["specific problem"], "fix": "one sentence on what to change, or empty"}.',
  'Score 5 = same message and nothing added or changed. 4 = same main message, offer and call to action, with some secondary points left out. 3 or lower = a viewer would get a different, incomplete or contradicting main message.'
].join(' ');

const flat = (v) => (Array.isArray(v) ? v.filter(Boolean).join(' / ') : String(v ?? '').trim());

// What the video says, in the order a viewer meets it.
function videoWords({ config = {}, spoken = [] }) {
  const onScreen = [
    config.hook && `Opening: ${flat(config.hook)}`,
    config.question && `Chat, buyer asks: ${config.question}`,
    config.answer && `Chat, AI answers: ${config.answer}`,
    Array.isArray(config.steps) && config.steps.length && `Steps: ${config.steps.map((s) => `${s.guideSays} (${s.label}: ${s.value}) -> ${s.result}`).join(' | ')}`,
    config.planName && `Plan card: ${config.planName}, ${config.price}. Includes: ${flat(config.items)}. Promises: ${flat(config.perks)}`,
    config.callerSays1 && `Call, caller: ${config.callerSays1}`,
    config.aiSays1 && `Call, AI: ${config.aiSays1}`,
    config.leadTitle && `Result card: ${config.leadTitle}`,
    config.endHeadline && `Closing headline: ${flat(config.endHeadline)}`,
    config.endLine && `Closing line: ${config.endLine}`,
    config.cta && `Button: ${config.cta}`,
    config.small && `Small print: ${config.small}`
  ].filter(Boolean);
  const voice = spoken.map((l) => `${l.role || 'voice'}: ${l.text}`);
  return { onScreen, voice };
}

// post: { title, text }. Returns { ok, matches, score, same_message, problems, fix } (ok=false when the reviewer could not answer).
async function reviewVideoAgainstPost({ post, config, spoken = [], openai, model = REVIEW_MODEL }) {
  if (!openai?.chat?.completions?.create) return { ok: false, error: 'reviewer_not_configured' };
  const words = videoWords({ config, spoken });
  const user = [
    `POST TITLE: ${post?.title || ''}`,
    `POST TEXT: ${String(post?.text || '').slice(0, 2500)}`,
    '',
    'VIDEO, WORDS ON SCREEN:',
    ...words.onScreen,
    '',
    'VIDEO, SPOKEN LINES:',
    ...(words.voice.length ? words.voice : ['(no voice, music only)'])
  ].join('\n');
  try {
    const response = await openai.chat.completions.create({
      model, temperature: 0, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }]
    });
    const raw = JSON.parse(response.choices?.[0]?.message?.content || '{}');
    const score = Math.max(1, Math.min(5, Math.round(Number(raw.score) || 1)));
    const problems = Array.isArray(raw.problems) ? raw.problems.map((p) => String(p).slice(0, 240)).slice(0, 6) : [];
    return {
      ok: true,
      // Both the reviewer's yes and a high enough score are needed.
      matches: raw.matches === true && score >= MIN_SCORE,
      score, post_main_message: String(raw.post_main_message || '').slice(0, 300), video_main_message: String(raw.video_main_message || '').slice(0, 300), problems, fix: String(raw.fix || '').slice(0, 300)
    };
  } catch (error) {
    return { ok: false, error: String(error?.message || error).slice(0, 200) };
  }
}

// One reviewer answer can swing between runs (a 4 one time, a 3 the next, for the same video). Three independent reviews are taken
// and the middle score wins, so a video is not accepted or rejected on one reviewer's off moment.
async function reviewWithConsensus(args, { runs = 3, review = reviewVideoAgainstPost } = {}) {
  const all = await Promise.all(Array.from({ length: runs }, () => review(args)));
  const answered = all.filter((r) => r.ok);
  if (!answered.length) return all[0];
  const sorted = [...answered].sort((a, b) => a.score - b.score);
  const middle = sorted[Math.floor((sorted.length - 1) / 2)];
  const votesYes = answered.filter((r) => r.matches).length;
  // The score is defined as the verdict (4 or more = same main message), so the middle score decides; a reviewer\'s yes/no wording is not counted twice.
  return { ...middle, matches: middle.score >= MIN_SCORE, votes: { yes: votesYes, of: answered.length, scores: sorted.map((r) => r.score) } };
}

module.exports = { reviewVideoAgainstPost, reviewWithConsensus, videoWords, MIN_SCORE, REVIEW_MODEL };
