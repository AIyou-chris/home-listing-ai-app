'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { writeScene, pickVariety } = require('../services/explainerSceneWriter');
const { directVideo } = require('../services/explainerDirector');
const { recentScenes, tasteFor } = require('../services/explainerMemory');
const { wordsKey } = require('../services/explainerWordsKey');
const explainer = require('../services/explainerVideo');

const POST = { title: 'Send one WOW Link', text: 'Send one free WOW Link listing page to an agent. Buyers chat with it and warm leads come to you. Try it free for 7 days.', script: 'Send one link. Get the lead.', facts: [] };
const CHAT = {
  business: 'Palm Ave condo', closedLine: 'The office is closed for the night.', timeLabel: '9:15', timeSuffix: 'PM', question: 'What should I bring to start?',
  answer: 'I am an AI. Usually pay stubs and bank statements.', optionA: 'Call me', optionB: 'Text me', booked: 'A loan officer will reach out.', leadTitle: 'Warm lead sent to the loan officer',
  leadLine1: 'Name and phone captured', leadLine2: 'Question: what to bring', leadLine3: 'Follow-up task created',
  endHeadline1: 'One link.', endHeadline2: 'One warm lead.', endAccent: 'One warm lead.', endLine: 'Send a free WOW Link to an agent and the warm lead comes to you.', cta: 'TRY IT FREE FOR 7 DAYS', small: 'Visit homelistingai.com'
};
const fakeAI = (...answers) => { const calls = []; let i = 0; return { calls, chat: { completions: { async create(args) { calls.push(args); const a = answers[Math.min(i, answers.length - 1)]; i += 1; if (a instanceof Error) throw a; return { choices: [{ message: { content: JSON.stringify(a) } }] }; } } } }; };

test('the writer fills every word of the scene from the post and its script, and the result is a valid scene', async () => {
  const ai = fakeAI(CHAT);
  const out = await writeScene({ name: 'buyer-chat', post: POST, openai: ai, seed: 'a' });
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.words.question, 'What should I bring to start?');
  assert.match(out.words.business, /^Sample: Palm Ave condo$/);
  const prompt = ai.calls[0].messages[0].content;
  assert.ok(prompt.includes(POST.title) && prompt.includes('Send one link. Get the lead.'), 'the post and its script are in the prompt');
  assert.ok(ai.calls[0].response_format.json_schema.strict, 'strict JSON');
  assert.ok(explainer.plan('buyer-chat', { words: out.words }).spoken.length > 3, 'the words make a real voiced scene');
});

test('code enforces the AI label, no rates or approvals, and prices from the settings only', async () => {
  const noAi = { ...CHAT, answer: 'Usually pay stubs and bank statements.' };
  const ai = fakeAI(noAi, CHAT);
  const fixed = await writeScene({ name: 'buyer-chat', post: POST, openai: ai });
  assert.strictEqual(fixed.ok, true); assert.strictEqual(fixed.tries, 2, 'the first try was refused and the checker\'s note was sent back');
  assert.match(ai.calls[1].messages[0].content, /plainly that it is an AI/);
  const rates = await writeScene({ name: 'buyer-chat', post: POST, openai: fakeAI({ ...CHAT, answer: 'I am an AI. You are pre-approved at 5%.' }) });
  assert.strictEqual(rates.ok, false);
  assert.ok(rates.problems.some((p) => /rates or approvals|percentage/.test(p)));
  const money = await writeScene({ name: 'buyer-chat', post: POST, openai: fakeAI({ ...CHAT, booked: 'A plan for $9 a month.' }) });
  assert.strictEqual(money.ok, false);
});

test('a trial button is refused when the post does not offer a trial; the plan scene must use an approved price', async () => {
  const noTrial = { ...POST, text: 'Send one free WOW Link listing page to an agent.' };
  const out = await writeScene({ name: 'buyer-chat', post: noTrial, openai: fakeAI(CHAT) });
  assert.strictEqual(out.ok, false);
  assert.ok(out.problems.some((p) => /free trial/.test(p)));
  const PLAN = { hook1: 'One plan.', hook2: 'Everything in it.', hookAccent: 'Everything in it.', planName: 'Loan officer plan', price: '$12/month', item1: 'Listing pages', item2: 'WOW Links', item3: 'Buyer chat', item4: 'AI phone line', perk1: '7-day free trial', perk2: 'No card to start', endHeadline1: 'One plan.', endHeadline2: 'More agents.', endAccent: 'More agents.', endLine: 'One plan for your agent partnerships.', cta: 'LEARN MORE', small: 'Visit homelistingai.com' };
  const bad = await writeScene({ name: 'plan', post: POST, openai: fakeAI(PLAN) });
  assert.strictEqual(bad.ok, false);
  const good = await writeScene({ name: 'plan', post: POST, openai: fakeAI({ ...PLAN, price: '$79/month' }) });
  assert.strictEqual(good.ok, true);
});

test('with no AI, an unknown scene or a broken answer the writer returns nothing and the older closing-words writer takes over', async () => {
  assert.strictEqual(await writeScene({ name: 'buyer-chat', post: POST, openai: null }), null);
  assert.strictEqual(await writeScene({ name: 'nope', post: POST, openai: fakeAI(CHAT) }), null);
  assert.strictEqual(await writeScene({ name: 'buyer-chat', post: POST, openai: fakeAI(new Error('down')) }), null);
  const review = { ok: true, matches: true, score: 5, problems: [] };
  const seen = [];
  const out = await directVideo({ name: 'buyer-chat', post: POST, openai: fakeAI(new Error('down')), reviewer: async (a) => { seen.push(a); return review; } });
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.scene, null, 'no scene record when the older writer was used');
});

test('director: the full scene is what the reviewer sees, and a scene record is returned for next time', async () => {
  const seen = [];
  const out = await directVideo({ name: 'buyer-chat', post: POST, openai: fakeAI(CHAT), voice: true, reviewer: async (a) => { seen.push(a); return { ok: true, matches: true, score: 5, problems: [] }; } });
  assert.strictEqual(out.ok, true);
  assert.strictEqual(seen[0].config.question, 'What should I bring to start?');
  assert.ok(seen[0].spoken.some((l) => /What should I bring/.test(l.text)), 'the spoken lines come from the new words');
  assert.strictEqual(out.scene.scene, 'buyer-chat');
  assert.strictEqual(out.scene.subject, 'Palm Ave condo');
});

test('variety: a subject used recently is avoided, the same seed picks the same one', () => {
  const list = ['A', 'B', 'C'];
  assert.strictEqual(pickVariety(list, 's1'), pickVariety(list, 's1'));
  assert.notStrictEqual(pickVariety(list, 's1', [pickVariety(list, 's1')]), pickVariety(list, 's1'));
});

// ---- memory: recent scenes and thumbs, one customer at a time ----
function memDb(rows) {
  return { from() { const f = []; const api = { select() { return api; }, eq(k, v) { f.push((r) => r[k] === v); return api; }, order() { return api; }, limit() { return api; }, then(res) { res({ data: rows.filter((r) => f.every((x) => x(r))), error: null }); } }; return api; } };
}
const A = 'aaaaaaaa-0000-4000-8000-000000000001'; const B = 'bbbbbbbb-0000-4000-8000-000000000002';

test('recent scenes and thumbs come from the customer\'s own campaigns only', async () => {
  const rows = [
    { id: '1', owner_id: A, brief: { explainerScene: { scene: 'buyer-chat', subject: 'Palm Ave condo', line: 'q', summary: 'liked one' }, videoFeedback: { rating: 'up', reason: 'clear' } } },
    { id: '2', owner_id: A, brief: { explainerScene: { scene: 'buyer-chat', subject: 'Oak', line: 'q2', summary: 'bad one' }, videoFeedback: { rating: 'down', reason: 'too long' } } },
    { id: '3', owner_id: B, brief: { explainerScene: { scene: 'buyer-chat', subject: 'OTHER', line: 'x', summary: 'theirs' }, videoFeedback: { rating: 'up' } } }
  ];
  const db = memDb(rows);
  assert.deepStrictEqual((await recentScenes(db, A)).map((s) => s.subject), ['Palm Ave condo', 'Oak']);
  const taste = await tasteFor(db, A, 'buyer-chat');
  assert.deepStrictEqual(taste.liked, ['liked one (clear)']);
  assert.deepStrictEqual(taste.disliked, ['bad one (too long)']);
  assert.deepStrictEqual(await recentScenes(db, 'not-an-id'), []);
});

test('saved words are only reused while the scene, voice and post are the same', () => {
  const row = (title, explainer = 'buyer-chat') => ({ outputs: { title, facebook: 'x', videoScript: 's' }, brief: { layout: 'explainer', explainer, explainerVoice: 'on', videoFormat: 'vertical', videoDuration: '15' } });
  assert.strictEqual(wordsKey(row('a')), wordsKey(row('a')));
  assert.notStrictEqual(wordsKey(row('a')), wordsKey(row('b')));
  assert.notStrictEqual(wordsKey(row('a')), wordsKey(row('a', 'ai-phone')));
});
