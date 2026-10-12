'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createFbGroupWriter } = require('../services/fbGroupService');

const reply = (obj) => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }) });
const group = { name: 'G', links_allowed: false };

test('retries once when a version is the schema instead of a post', async () => {
  const calls = [];
  const fetchImpl = async () => {
    calls.push(1);
    return calls.length === 1
      ? reply({ valueFirst: '{"valueFirst":{"type":"string"}}', noLink: 'b', promotional: 'c' })
      : reply({ valueFirst: 'A', noLink: 'B', promotional: 'C' });
  };
  const out = await createFbGroupWriter({ openaiApiKey: 'k', fetchImpl }).write({ group, topic: 't', link: 'x' });
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(out.valueFirst.text, 'A');
});

test('gives an error when both tries are unusable', async () => {
  const fetchImpl = async () => reply({ valueFirst: '', noLink: 'b', promotional: 'c' });
  await assert.rejects(createFbGroupWriter({ openaiApiKey: 'k', fetchImpl }).write({ group, topic: 't', link: 'x' }), /writer_bad_output/);
});

test('drops a label the model puts in front of a version', async () => {
  const fetchImpl = async () => reply({ valueFirst: '### ValueFirst:\nReal post', noLink: '### NoLink:\nTwo', promotional: 'Three' });
  const out = await createFbGroupWriter({ openaiApiKey: 'k', fetchImpl }).write({ group, topic: 't', link: 'x' });
  assert.strictEqual(out.valueFirst.text, 'Real post');
  assert.strictEqual(out.noLink.text, 'Two');
});
