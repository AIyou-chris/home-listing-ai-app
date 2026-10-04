'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMissingColumn, writeWithColumnFallback } = require('../columnFallback');

const missingColumnError = (name) => ({ message: `Could not find the '${name}' column of 'ai_conversation_messages' in the schema cache` });

test('reads the column name out of both error styles', () => {
  assert.equal(parseMissingColumn(missingColumnError('intent_tags')), 'intent_tags');
  assert.equal(parseMissingColumn({ message: 'column "visitor_id" does not exist' }), 'visitor_id');
  assert.equal(parseMissingColumn({ message: 'column ai_conversations.channel does not exist' }), null);
  assert.equal(parseMissingColumn({ message: 'duplicate key value' }), null);
});

test('drops each missing column and still saves the rest of the row', async () => {
  const have = new Set(['conversation_id', 'sender', 'content']);
  const seen = [];
  const run = async (payload) => {
    seen.push(Object.keys(payload).length);
    const bad = Object.keys(payload).find((k) => !have.has(k));
    return bad ? { data: null, error: missingColumnError(bad) } : { data: { saved: payload }, error: null };
  };
  const result = await writeWithColumnFallback(run, {
    conversation_id: 'c1', sender: 'visitor', content: 'hi', is_capture_event: false, intent_tags: ['x'], confidence: 0.7
  });
  assert.equal(result.error, null);
  assert.deepEqual(Object.keys(result.data.saved), ['conversation_id', 'sender', 'content']);
  assert.deepEqual(result.dropped.sort(), ['confidence', 'intent_tags', 'is_capture_event']);
});

test('a real error (not a missing column) is returned, not retried', async () => {
  let calls = 0;
  const run = async () => { calls += 1; return { data: null, error: { message: 'violates foreign key constraint' } }; };
  const result = await writeWithColumnFallback(run, { a: 1, b: 2 });
  assert.equal(calls, 1);
  assert.match(result.error.message, /foreign key/);
});

test('a first-try success touches nothing', async () => {
  const result = await writeWithColumnFallback(async (p) => ({ data: p, error: null }), { a: 1 });
  assert.deepEqual(result, { data: { a: 1 }, error: null, dropped: [] });
});
