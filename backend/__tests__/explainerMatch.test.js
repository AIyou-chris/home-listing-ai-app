const test = require('node:test');
const assert = require('node:assert');
const { matchPost, wrapHeadline, clean } = require('../services/explainerMatch');
const explainer = require('../services/explainerVideo');

const post = (over = {}) => ({ outputs: { title: 'Send one WOW Link to one agent', facebook: 'Send one WOW Link to one agent this week. They get a free listing page and you get the warm lead. Try it free: https://homelistingai.com/lo-signup #loans', ...over }, brief: {} });

test('the post title becomes the closing headline, and the opening one on scenes that have it', () => {
  const chat = matchPost({ template: 'chat-answer', post: post() });
  assert.deepStrictEqual(chat.endHeadline, ['Send one WOW Link', 'to one agent']);
  assert.strictEqual(chat.endAccent, 'to one agent');
  assert.strictEqual(chat.hook, undefined, 'the chat scene has no opening words');
  const walk = matchPost({ template: 'walkthrough', post: post() });
  assert.deepStrictEqual(walk.hook, walk.endHeadline);
});

test('the closing line is the first sentence that is not the title again, with no link, hashtag or emoji', () => {
  const m = matchPost({ template: 'chat-answer', post: post() });
  assert.strictEqual(m.endLine, 'They get a free listing page and you get the warm lead.');
  assert.ok(!/https?:|#/.test(m.endLine));
  assert.strictEqual(clean('Hi 🏠 there #tag https://x.com/y ok'), 'Hi there ok');
});

test('a title that cannot fit is trimmed to its first sentence, or left alone', () => {
  assert.deepStrictEqual(wrapHeadline('One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen'), null);
  const m = matchPost({ template: 'chat-answer', post: post({ title: 'Agents love free help. Here is a very long second sentence that will never fit on three short lines at all.' }) });
  assert.deepStrictEqual(m.endHeadline, ['Agents love free help.']);
  assert.deepStrictEqual(matchPost({ template: 'chat-answer', post: post({ title: 'Supercalifragilisticexpialidocious' }) }).endHeadline, undefined);
});

test('words that fail the post safety check are never drawn', () => {
  const bad = matchPost({ template: 'chat-answer', post: post({ title: 'We guarantee 40% more leads for you', facebook: 'We guarantee more leads every single time. Lowest rate around, no risk at all, sign up today.' }) });
  assert.deepStrictEqual(bad, {});
  const ok = matchPost({ template: 'chat-answer', post: { outputs: { title: 'About 10% fewer Realtors', facebook: '' }, brief: { facts: ['nar-members-now'] } } });
  assert.deepStrictEqual(ok.endHeadline, ['About 10% fewer Realtors'], 'a verified number from the post\'s facts is allowed');
});

test('a post with nothing usable leaves the scene exactly as it was', () => {
  assert.deepStrictEqual(matchPost({ template: 'walkthrough', post: { outputs: {}, brief: {} } }), {});
  assert.deepStrictEqual(matchPost({ template: 'walkthrough', post: null }), {});
});

test('the finished video follows the post: a real MP4 is made with the post words applied', async (t) => {
  if (!(await explainer.available())) return t.skip('FFmpeg is not installed here');
  const bytes = await explainer.render('wow-link', { post: post() });
  assert.strictEqual(bytes.slice(4, 8).toString(), 'ftyp');
  assert.ok(bytes.length > 100000);
});

test('a question stays a question, and the closing line does not just repeat the headline', () => {
  const m = matchPost({ template: 'walkthrough', post: post({ title: 'Your competition is building. Are you?', facebook: 'Your competition is busy building new relationships. Are you? Loan officers who keep adding agent partners have more opportunities. Visit https://homelistingai.com/for-loan-officers to learn more!' }) });
  assert.deepStrictEqual(m.endHeadline, ['Your competition is', 'building. Are you?']);
  assert.strictEqual(m.endAccent, 'building. Are you?');
  assert.strictEqual(m.endLine, 'Loan officers who keep adding agent partners have more opportunities.');
});

test('headlines are wrapped evenly, never leaving one word alone on the last line', () => {
  assert.deepStrictEqual(wrapHeadline('Your competition is busy building new relationships. Are you?'), ['Your competition is', 'busy building new', 'relationships. Are you?']);
  assert.deepStrictEqual(wrapHeadline('Send one WOW Link to one agent'), ['Send one WOW Link', 'to one agent']);
  assert.deepStrictEqual(wrapHeadline('Hello there'), ['Hello there']);
});
