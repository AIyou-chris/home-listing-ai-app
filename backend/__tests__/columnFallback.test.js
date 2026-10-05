const test = require('node:test');
const assert = require('node:assert');
const { writeWithColumnFallback } = require('../services/columnFallback');

test('retries a single row without the missing column', async () => {
  const run = async (row) => ('visitor_id' in row
    ? { data: null, error: { message: "Could not find the 'visitor_id' column of 'ai_conversations' in the schema cache" } }
    : { data: row, error: null });
  const result = await writeWithColumnFallback(run, { id: 1, visitor_id: 'v' });
  assert.deepStrictEqual(result.data, { id: 1 });
  assert.deepStrictEqual(result.dropped, ['visitor_id']);
});

test('passes real errors through', async () => {
  const result = await writeWithColumnFallback(async () => ({ data: null, error: { message: 'boom' } }), { a: 1 });
  assert.strictEqual(result.error.message, 'boom');
});

test('drops a missing column from every row of a batch insert', async () => {
  const seen = [];
  const run = async (rows) => {
    seen.push(rows);
    return rows.some((r) => 'step_key' in r)
      ? { data: null, error: { message: "Could not find the 'step_key' column of 'funnel_steps' in the schema cache" } }
      : { data: rows, error: null };
  };
  const result = await writeWithColumnFallback(run, [{ a: 1, step_key: 'x' }, { a: 2, step_key: 'y' }]);
  assert.strictEqual(result.error, null);
  assert.deepStrictEqual(result.dropped, ['step_key']);
  assert.deepStrictEqual(result.data, [{ a: 1 }, { a: 2 }]);
});
