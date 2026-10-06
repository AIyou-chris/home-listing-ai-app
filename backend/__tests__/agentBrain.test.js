const test = require('node:test');
const assert = require('node:assert');
const { sanitizeAgentBrain, buildAgentNotes, hasAnything } = require('../services/agentBrain');

test('empty or junk input gives no notes', () => {
  assert.strictEqual(buildAgentNotes(null), '');
  assert.strictEqual(buildAgentNotes({ about: '   ', faq: [{ question: 'q', answer: '' }] }), '');
  assert.strictEqual(hasAnything(sanitizeAgentBrain('nope')), false);
});

test('notes include what the agent wrote and drop half-filled answers', () => {
  const notes = buildAgentNotes({
    about: 'I sell in Wenatchee.', style: 'Short and friendly.', areas: 'Cashmere', showings: '24 hours notice.',
    neverSay: 'the old price', faq: [{ question: 'Flexible on closing?', answer: 'Yes, within reason.' }, { question: 'half', answer: '' }]
  });
  assert.match(notes, /I sell in Wenatchee/);
  assert.match(notes, /Q: Flexible on closing\?\nA: Yes, within reason\./);
  assert.match(notes, /never to say: the old price/);
  assert.ok(!notes.includes('half'));
});

test('lengths and counts are capped', () => {
  const b = sanitizeAgentBrain({ about: 'x'.repeat(5000), faq: Array.from({ length: 40 }, (_, i) => ({ question: `q${i}`, answer: 'a' })) });
  assert.strictEqual(b.about.length, 1500);
  assert.strictEqual(b.faq.length, 20);
});

test('every brain ships with basics, and the loan officer brain prompt includes them', () => {
  const { LOAN_BASICS, HOME_BUYING_BASICS } = require('../services/baseKnowledge');
  assert.match(LOAN_BASICS, /VA: for eligible veterans/);
  assert.match(LOAN_BASICS, /Pre-qualification is a quick estimate/);
  assert.match(HOME_BUYING_BASICS, /Earnest money/);
  // no rates or promises in the starter text
  for (const text of [LOAN_BASICS, HOME_BUYING_BASICS]) {
    assert.ok(!/\b\d+\.\d+\s?%/.test(text), 'no interest-rate style numbers');
    assert.ok(!/guaranteed approval|you will be approved/i.test(text));
  }
  const brain = require('../services/loBrainService');
  const make = brain.createLoBrainService ? brain.createLoBrainService({}) : null;
  assert.ok(brain.PLATFORM_GUARDRAILS);
  if (make && make.buildBrainPrompt) {
    const prompt = make.buildBrainPrompt({ config: {}, lo: { first_name: 'Ana' }, route: 'loan_advisor' });
    assert.match(prompt, /GENERAL MORTGAGE BASICS/);
    assert.match(prompt, /general mortgage and home-buying questions/);
    // the loan officer's own knowledge comes AFTER the basics, so it wins
    const withOwn = make.buildBrainPrompt({ config: { knowledge_base: 'We do FHA only.' }, lo: {}, route: 'loan_advisor' });
    assert.ok(withOwn.indexOf('GENERAL MORTGAGE BASICS') < withOwn.indexOf('We do FHA only.'));
  }
});
