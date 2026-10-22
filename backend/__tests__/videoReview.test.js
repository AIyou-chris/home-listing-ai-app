const test = require('node:test');
const assert = require('node:assert');
const { reviewVideoAgainstPost, reviewWithConsensus, videoWords, MIN_SCORE } = require('../services/videoReview');
const { writeClosingWords } = require('../services/explainerWriter');
const { directVideo, toSceneWords } = require('../services/explainerDirector');

const fakeAI = (...replies) => {
  const asked = [];
  let i = 0;
  return { asked, chat: { completions: { create: async (args) => { asked.push(args); const r = replies[Math.min(i++, replies.length - 1)]; if (r instanceof Error) throw r; return { choices: [{ message: { content: JSON.stringify(r) } }] }; } } } };
};
const post = { title: 'Send one WOW Link', text: 'Send one WOW Link to one agent this week. They get a free listing page and you get the warm lead. Visit https://homelistingai.com/for-loan-officers to learn more.' };
const config = { endHeadline: ['Send one WOW Link'], endLine: 'They get a free listing page.', cta: 'LEARN MORE', small: 'Visit homelistingai.com', steps: [{ guideSays: 'Pick an agent', label: 'AGENT', value: 'Jordan', result: 'Agent added' }] };
const good = { post_main_message: 'a', video_main_message: 'a', matches: true, score: 5, problems: [], fix: '' };

test('the reviewer is shown the post and every word the video says, and answers in plain fields', async () => {
  const ai = fakeAI(good);
  const r = await reviewVideoAgainstPost({ post, config, spoken: [{ role: 'narrator', text: 'Send one WOW Link.' }], openai: ai });
  assert.deepStrictEqual([r.ok, r.matches, r.score], [true, true, 5]);
  const prompt = ai.asked[0].messages[1].content;
  assert.match(prompt, /POST TITLE: Send one WOW Link/);
  assert.match(prompt, /Closing line: They get a free listing page\./);
  assert.match(prompt, /narrator: Send one WOW Link\./);
  assert.strictEqual(ai.asked[0].temperature, 0);
});

test('a "yes" with a low score is still a no, and a bad score is kept in range', async () => {
  const r = await reviewVideoAgainstPost({ post, config, openai: fakeAI({ ...good, matches: true, score: MIN_SCORE - 1 }) });
  assert.strictEqual(r.matches, false);
  assert.strictEqual((await reviewVideoAgainstPost({ post, config, openai: fakeAI({ ...good, score: 99 }) })).score, 5);
  assert.strictEqual((await reviewVideoAgainstPost({ post, config, openai: fakeAI({ matches: true }) })).matches, false, 'no score means no');
});

test('when the reviewer cannot answer it says so, instead of guessing', async () => {
  assert.deepStrictEqual((await reviewVideoAgainstPost({ post, config, openai: null })).ok, false);
  const r = await reviewVideoAgainstPost({ post, config, openai: fakeAI(new Error('429 no credits')) });
  assert.deepStrictEqual([r.ok, /429/.test(r.error)], [false, true]);
});

test('videoWords lists the opening, the chat or steps, the closing and the small print', () => {
  const w = videoWords({ config: { hook: ['A', 'B'], question: 'Q?', answer: 'A.', callerSays1: 'hi', endHeadline: ['X'], endLine: 'Y', cta: 'Z', small: 'S', steps: [{ guideSays: 'g', label: 'L', value: 'v', result: 'r' }] }, spoken: [{ role: 'assistant', text: 'hello' }] });
  assert.ok(w.onScreen.some((l) => l.startsWith('Opening: A / B')));
  assert.ok(w.onScreen.some((l) => l.startsWith('Steps: g (L: v) -> r')));
  assert.deepStrictEqual(w.voice, ['assistant: hello']);
});

// ---- the writer ----
test('the writer keeps only closing words that pass the same checks as a post', async () => {
  const w = await writeClosingWords({ post, openai: fakeAI({ must_keep: ['offer'], endLine: 'Send a free listing page to one agent and get the warm lead.', cta: 'learn more', small: 'Visit homelistingai.com' }) });
  assert.deepStrictEqual(w, { endLine: 'Send a free listing page to one agent and get the warm lead.', cta: 'LEARN MORE', small: 'Visit homelistingai.com' });
  const bad = await writeClosingWords({ post, openai: fakeAI({ endLine: 'We guarantee the lowest rate and 40% more leads for you.', cta: 'APPLY NOW', small: 'Rates from $9' }) });
  assert.strictEqual(bad.endLine, undefined);
  assert.strictEqual(bad.small, undefined, 'a money amount that is not an allowed price is dropped');
  assert.deepStrictEqual(await writeClosingWords({ post, openai: null }), {});
  assert.deepStrictEqual(await writeClosingWords({ post, openai: fakeAI(new Error('down')) }), {});
});

test('the writer is told the reviewer\'s complaint when it tries again', async () => {
  const ai = fakeAI({ endLine: 'Send a free listing page to one agent and get the warm lead.', cta: 'LEARN MORE', small: 'Visit homelistingai.com' });
  await writeClosingWords({ post, openai: ai, feedback: 'name the free WOW Link page' });
  assert.match(ai.asked[0].messages[1].content, /name the free WOW Link page/);
});

// ---- the two together ----
const writerOK = async () => ({ endLine: 'They get a free listing page and you get the warm lead.', cta: 'LEARN MORE', small: 'Visit homelistingai.com' });
const reviewer = (...answers) => { const calls = []; let i = 0; const fn = async (args) => { calls.push(args); return answers[Math.min(i++, answers.length - 1)]; }; fn.calls = calls; return fn; };
const ok5 = { ok: true, matches: true, score: 5, problems: [], fix: '' };
const bad3 = { ok: true, matches: false, score: 3, problems: ['leaves out the offer'], fix: 'name the offer' };

test('director: a video that matches goes through on the first try', async () => {
  const r = await directVideo({ name: 'wow-link', post, openai: {}, writer: writerOK, reviewer: reviewer(ok5) });
  assert.deepStrictEqual([r.ok, r.reviewed, r.tries], [true, true, 1]);
  assert.strictEqual(r.words.cta, 'LEARN MORE');
});

test('director: a miss sends the reviewer\'s note back to the writer for one more try', async () => {
  const notes = [];
  const writer = async (args) => { notes.push(args.feedback); return writerOK(); };
  const r = await directVideo({ name: 'wow-link', post, openai: {}, writer, reviewer: reviewer(bad3, ok5) });
  assert.deepStrictEqual([r.ok, r.tries], [true, 2]);
  assert.strictEqual(notes[0], '');
  assert.match(notes[1], /leaves out the offer/);
});

test('director: two misses means no (the caller must not use this video) and the better try is kept', async () => {
  const r = await directVideo({ name: 'wow-link', post, openai: {}, writer: writerOK, reviewer: reviewer({ ...bad3, score: 2 }, { ...bad3, score: 3 }) });
  assert.deepStrictEqual([r.ok, r.tries, r.review.score], [false, 2, 3]);
});

test('director: if the reviewer is not available, that is not a reason to block the video', async () => {
  const r = await directVideo({ name: 'wow-link', post, openai: {}, writer: writerOK, reviewer: reviewer({ ok: false, error: 'no credits' }) });
  assert.deepStrictEqual([r.ok, r.reviewed], [true, false]);
});

test('director: spoken lines are only shown to the reviewer when there is a voice', async () => {
  const withVoice = reviewer(ok5); await directVideo({ name: 'wow-link', post, openai: {}, writer: writerOK, reviewer: withVoice, voice: true });
  const without = reviewer(ok5); await directVideo({ name: 'wow-link', post, openai: {}, writer: writerOK, reviewer: without, voice: false });
  assert.ok(withVoice.calls[0].spoken.length > 0);
  assert.strictEqual(without.calls[0].spoken.length, 0);
});

test('toSceneWords turns a headline into the opening and closing words', () => {
  assert.deepStrictEqual(toSceneWords({ headline: ['A', 'B'], cta: 'X' }, 'walkthrough'), { cta: 'X', endHeadline: ['A', 'B'], endAccent: 'B', hook: ['A', 'B'], hookAccent: 'B' });
  assert.strictEqual(toSceneWords({ headline: ['A'] }, 'chat-answer').hook, undefined);
});

// ---- three reviews, middle score wins ----
const answers = (...list) => { let i = 0; return async () => list[i++ % list.length]; };
const ans = (score, matches = score >= 4) => ({ ok: true, matches, score, problems: [`p${score}`], fix: '' });

test('consensus: the middle of three scores wins, so one off moment cannot decide', async () => {
  const r = await reviewWithConsensus({}, { review: answers(ans(4), ans(3), ans(4)) });
  assert.deepStrictEqual([r.matches, r.score, r.votes.of], [true, 4, 3]);
  const low = await reviewWithConsensus({}, { review: answers(ans(3), ans(5), ans(3)) });
  assert.deepStrictEqual([low.matches, low.score], [false, 3], 'one generous review is outvoted');
});

test('consensus: the score is the verdict, so a reviewer\'s stray "no" next to a good score is not counted twice', async () => {
  const r = await reviewWithConsensus({}, { review: answers(ans(4, false), ans(4, false), ans(5, true)) });
  assert.deepStrictEqual([r.matches, r.score], [true, 4]);
  const bad = await reviewWithConsensus({}, { review: answers(ans(3, true), ans(3, true), ans(5, true)) });
  assert.deepStrictEqual([bad.matches, bad.score], [false, 3], 'a "yes" next to a low score is still a no');
});

test('consensus: reviewers that fail are ignored, and if all fail it says so', async () => {
  const r = await reviewWithConsensus({}, { review: answers({ ok: false, error: 'x' }, ans(5), ans(5)) });
  assert.deepStrictEqual([r.ok, r.votes.of], [true, 2]);
  const none = await reviewWithConsensus({}, { review: answers({ ok: false, error: 'no credits' }) });
  assert.deepStrictEqual([none.ok, none.error], [false, 'no credits']);
});
