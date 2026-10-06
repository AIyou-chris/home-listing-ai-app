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
