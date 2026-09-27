const test = require('node:test');
const assert = require('node:assert');
const { createTypeSafeClient, TYPESAFE_API_URL, DEFAULT_MODEL } = require('../typesafeClient');

test('isConfigured() reflects whether an apiKey was provided', () => {
  assert.strictEqual(createTypeSafeClient({ apiKey: 'k' }).isConfigured(), true);
  assert.strictEqual(createTypeSafeClient({ apiKey: undefined }).isConfigured(), false);
  assert.strictEqual(createTypeSafeClient({}).isConfigured(), false);
});

test('evaluate() throws without hitting the network when no apiKey is set', async () => {
  const client = createTypeSafeClient({
    apiKey: undefined,
    fetchImpl: async () => { throw new Error('should not be called'); },
  });
  await assert.rejects(
    () => client.evaluate({ state: 'x', questions: { q: { type: 'noul', instructions: 'y' } } }),
    /TYPESAFE_API_KEY is not configured/
  );
});

test('evaluate() throws when called with no questions', async () => {
  const client = createTypeSafeClient({
    apiKey: 'k',
    fetchImpl: async () => { throw new Error('should not be called'); },
  });
  await assert.rejects(() => client.evaluate({ state: 'x', questions: {} }), /requires at least one question/);
});

test('evaluate() posts the right URL, auth header, and body shape, and returns the answers map', async () => {
  let seenUrl = null;
  let seenOpts = null;
  const client = createTypeSafeClient({
    apiKey: 'sk-test-123',
    fetchImpl: async (url, opts) => {
      seenUrl = url;
      seenOpts = opts;
      return {
        ok: true,
        json: async () => ({
          model: 'jev-1.0.0',
          answers: { isThing: { type: 'noul', noul: 0.87 } },
          usage: { input_tokens: 10, output_tokens: 2 },
        }),
      };
    },
  });

  const answers = await client.evaluate({
    state: { title: 'Loan Officer' },
    questions: { isThing: { type: 'noul', instructions: 'Is this a thing?' } },
  });

  assert.strictEqual(seenUrl, TYPESAFE_API_URL);
  assert.strictEqual(seenOpts.method, 'POST');
  assert.strictEqual(seenOpts.headers.Authorization, 'Bearer sk-test-123');
  assert.strictEqual(seenOpts.headers['Content-Type'], 'application/json');

  const body = JSON.parse(seenOpts.body);
  assert.deepStrictEqual(body.state, { title: 'Loan Officer' });
  assert.strictEqual(body.model, DEFAULT_MODEL);
  assert.deepStrictEqual(body.questions, { isThing: { type: 'noul', instructions: 'Is this a thing?' } });

  assert.deepStrictEqual(answers, { isThing: { type: 'noul', noul: 0.87 } });
});

test('evaluate() lets a caller override the model', async () => {
  let seenBody = null;
  const client = createTypeSafeClient({
    apiKey: 'k',
    fetchImpl: async (_url, opts) => {
      seenBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ answers: {} }) };
    },
  });
  await client.evaluate({
    state: 'x',
    model: 'jev-1.13.0',
    questions: { q: { type: 'noul', instructions: 'y' } },
  });
  assert.strictEqual(seenBody.model, 'jev-1.13.0');
});

test('evaluate() surfaces a non-ok response as an error with status + body snippet', async () => {
  const client = createTypeSafeClient({
    apiKey: 'k',
    fetchImpl: async () => ({ ok: false, status: 401, text: async () => 'invalid api key' }),
  });
  await assert.rejects(
    () => client.evaluate({ state: 'x', questions: { q: { type: 'noul', instructions: 'y' } } }),
    /TypeSafe API HTTP 401.*invalid api key/
  );
});

test('evaluate() returns an empty object when the response has no answers field', async () => {
  const client = createTypeSafeClient({
    apiKey: 'k',
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
  });
  const answers = await client.evaluate({ state: 'x', questions: { q: { type: 'noul', instructions: 'y' } } });
  assert.deepStrictEqual(answers, {});
});
