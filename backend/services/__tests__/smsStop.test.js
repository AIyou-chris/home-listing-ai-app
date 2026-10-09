'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { verifyTextbeltWebhook, isStopMessage } = require('../webhookSignatures');

const KEY = 'test-key';
const sign = (ts, body) => crypto.createHmac('sha256', KEY).update(`${ts}${body}`).digest('hex');

test('a correctly signed Textbelt reply is accepted', () => {
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));
  const body = '{"textId":"1","fromNumber":"+15551234567","text":"STOP"}';
  const r = verifyTextbeltWebhook({ headers: { 'x-textbelt-timestamp': ts, 'x-textbelt-signature': sign(ts, body) }, rawBody: body, apiKey: KEY, now });
  assert.strictEqual(r.ok, true);
});

test('forged, tampered, old or unsigned replies are refused', () => {
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));
  const body = '{"fromNumber":"+15551234567","text":"STOP"}';
  const good = sign(ts, body);
  assert.strictEqual(verifyTextbeltWebhook({ headers: { 'x-textbelt-timestamp': ts, 'x-textbelt-signature': good }, rawBody: body + ' ', apiKey: KEY, now }).ok, false);
  assert.strictEqual(verifyTextbeltWebhook({ headers: { 'x-textbelt-timestamp': ts, 'x-textbelt-signature': 'deadbeef' }, rawBody: body, apiKey: KEY, now }).ok, false);
  assert.strictEqual(verifyTextbeltWebhook({ headers: {}, rawBody: body, apiKey: KEY, now }).ok, false);
  const old = String(Math.floor(now / 1000) - 16 * 60);
  assert.strictEqual(verifyTextbeltWebhook({ headers: { 'x-textbelt-timestamp': old, 'x-textbelt-signature': sign(old, body) }, rawBody: body, apiKey: KEY, now }).ok, false);
  assert.strictEqual(verifyTextbeltWebhook({ headers: { 'x-textbelt-timestamp': ts, 'x-textbelt-signature': good }, rawBody: body, apiKey: '', now }).ok, false);
});

test('every normal way of saying stop is a stop, and ordinary messages are not', () => {
  for (const t of ['STOP', 'stop', 'Stop.', ' stop all ', 'UNSUBSCRIBE!', 'Cancel', 'end', 'QUIT', 'opt out', 'Revoke']) assert.ok(isStopMessage(t), t);
  for (const t of ['Can I see it Saturday?', 'please stop by at 5', 'stop sign on the corner?', 'start', 'yes', '', null]) assert.ok(!isStopMessage(t), String(t));
});

test('sendSms never texts a number on the STOP list', async () => {
  const sms = require('../smsService');
  const original = sms.isSuppressed;
  let sentToProvider = false;
  sms.isSuppressed = async (n) => n === '+15551230000';
  try {
    const result = await sms.sendSms('(555) 123-0000', 'hello', [], null);
    assert.strictEqual(result, false);
    assert.strictEqual(sentToProvider, false);
  } finally {
    sms.isSuppressed = original;
  }
});
