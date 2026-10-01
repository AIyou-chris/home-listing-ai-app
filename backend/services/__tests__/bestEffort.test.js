const test = require('node:test');
const assert = require('node:assert/strict');
// Mirrors the helper in server.cjs: a Supabase builder is a thenable with no .catch().
const bestEffort = (query) => Promise.resolve(query).then((r) => r, () => null);
const builder = (value, reject = false) => ({ then: (res, rej) => (reject ? rej(value) : res(value)) });

test('a thenable without .catch() resolves instead of throwing', async () => {
  const b = builder({ data: [{ id: 1 }], error: null });
  assert.equal(typeof b.catch, 'undefined');
  assert.deepEqual(await bestEffort(b), { data: [{ id: 1 }], error: null });
});
test('a rejected thenable becomes null, never a throw', async () => {
  assert.equal(await bestEffort(builder(new Error('boom'), true)), null);
});
test('an error payload is passed through, not thrown', async () => {
  const out = await bestEffort(builder({ data: null, error: { message: 'fk violation' } }));
  assert.equal(out.error.message, 'fk violation');
});
