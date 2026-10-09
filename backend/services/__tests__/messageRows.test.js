'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { normalizeMessageRow, fromDbSender, fromDbChannel, isVisitorRow, toDbSender, toDbChannel } = require('../messageRows');

// The values the live database accepts (check constraints on ai_conversation_messages)
const OK_SENDER = ['lead', 'agent', 'ai'];
const OK_CHANNEL = ['chat', 'voice', 'email'];

test('every word the app writes becomes a value the database accepts', () => {
  for (const s of ['visitor', 'system', 'ai', 'agent', 'lead', 'user', 'assistant', 'whatever', '', undefined]) {
    assert.ok(OK_SENDER.includes(toDbSender(s)), `sender ${s}`);
  }
  for (const c of ['web', 'sms', 'phone', 'chat', 'voice', 'email', 'whatever', '', undefined]) {
    assert.ok(OK_CHANNEL.includes(toDbChannel(c)), `channel ${c}`);
  }
});

test('the buyer chat row that used to fail now fits the constraints and keeps its labels', () => {
  const row = normalizeMessageRow({ conversation_id: 'c', sender: 'visitor', channel: 'web', content: 'hi', metadata: { source: 'public_listing_chat' } });
  assert.strictEqual(row.sender, 'lead');
  assert.strictEqual(row.channel, 'chat');
  assert.strictEqual(row.metadata.source, 'public_listing_chat');
  assert.strictEqual(row.metadata.sender_label, 'visitor');
  assert.strictEqual(row.metadata.channel_label, 'web');
});

test('rows that already fit are left alone', () => {
  const row = { sender: 'ai', channel: 'chat', content: 'x', metadata: { a: 1 } };
  assert.deepStrictEqual(normalizeMessageRow(row), row);
});

test('reading translates back: lead is the visitor, labels win, channel restored', () => {
  assert.strictEqual(fromDbSender({ sender: 'lead' }), 'visitor');
  assert.strictEqual(fromDbSender({ sender: 'lead', metadata: { sender_label: 'visitor' } }), 'visitor');
  assert.strictEqual(fromDbSender({ sender: 'ai', metadata: { sender_label: 'system' } }), 'system');
  assert.strictEqual(fromDbSender({ sender: 'ai' }), 'ai');
  assert.strictEqual(fromDbChannel({ channel: 'chat', metadata: { channel_label: 'sms' } }), 'sms');
  assert.strictEqual(fromDbChannel({ channel: 'voice' }), 'voice');
  assert.ok(isVisitorRow({ sender: 'lead' }));
  assert.ok(!isVisitorRow({ sender: 'ai' }));
});
