'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createSpendGuard, installFetchGuard } = require('../spendGuard');

const small = (over = {}) => createSpendGuard({
  limits: {
    openai_units_day: 5, openai_images_day: 1, typesafe_calls_day: 2, translate_calls_day: 1,
    sms_day: 3, sms_per_number_day: 2, sms_account_month_default: 2,
    email_day: 3, email_per_address_day: 2, ai_calls_day: 2, ai_calls_per_caller_day: 1,
    number_purchases_day: 1, reels_day: 2, reels_account_month: 1, hoa_reads_day: 2, hoa_reads_account_day: 1,
    voice_previews_account_day: 1, ...over,
  },
});

test('openai: weighted units stop the day, images have their own tighter stop', () => {
  const g = small();
  assert.ok(g.openai('/v1/chat/completions').ok);
  assert.ok(g.openai('/v1/audio/speech').ok); // 3 units, total 4
  assert.ok(g.openai('/v1/chat/completions').ok); // 5
  assert.strictEqual(g.openai('/v1/chat/completions').ok, false);
  const g2 = small({ openai_units_day: 100 });
  assert.ok(g2.openai('/v1/images/generations').ok);
  assert.strictEqual(g2.openai('/v1/images/generations').ok, false);
});

test('a blocked request is not counted', () => {
  const g = small({ sms_day: 100, sms_per_number_day: 1 });
  assert.ok(g.sms({ to: '+1', accountId: 'a' }).ok);
  assert.strictEqual(g.sms({ to: '+1', accountId: 'a' }).ok, false);
  assert.strictEqual(g.used('month', 'sms', 'acct:a'), 1);
});

test('sms: per number, per account per month, and platform per day', () => {
  const g = small({ sms_per_number_day: 10 });
  assert.ok(g.sms({ to: '+1', accountId: 'a' }).ok);
  assert.ok(g.sms({ to: '+2', accountId: 'a' }).ok);
  assert.strictEqual(g.sms({ to: '+3', accountId: 'a' }).ok, false); // account month = 2
  assert.ok(g.sms({ to: '+3', accountId: 'b', accountMonthLimit: 50 }).ok); // 3rd of 3 for the day
  assert.strictEqual(g.sms({ to: '+4', accountId: 'c', accountMonthLimit: 50 }).ok, false); // day = 3
});

test('sms: a plan limit passed in overrides the default', () => {
  const g = small({ sms_per_number_day: 100, sms_day: 100 });
  for (let i = 0; i < 5; i += 1) assert.ok(g.sms({ to: `+${i}`, accountId: 'pro', accountMonthLimit: 5 }).ok);
  assert.strictEqual(g.sms({ to: '+9', accountId: 'pro', accountMonthLimit: 5 }).ok, false);
});

test('email, ai calls, reels, reads, previews, number purchases stop at their limits', () => {
  const g = small();
  assert.ok(g.emailTo({ to: 'A@x.com' }).ok); assert.ok(g.emailTo({ to: 'a@x.com' }).ok);
  assert.strictEqual(g.emailTo({ to: 'a@x.com' }).ok, false);
  assert.ok(g.aiCall({ from: '+1' }).ok); assert.strictEqual(g.aiCall({ from: '+1' }).ok, false);
  assert.ok(g.aiCall({ from: '+2' }).ok); assert.strictEqual(g.aiCall({ from: '+3' }).ok, false);
  assert.ok(g.reel({ accountId: 'x' }).ok); assert.strictEqual(g.reel({ accountId: 'x' }).ok, false);
  assert.ok(g.hoaRead({ accountId: 'x' }).ok); assert.strictEqual(g.hoaRead({ accountId: 'x' }).ok, false);
  assert.ok(g.voicePreview({ accountId: 'x' }).ok); assert.strictEqual(g.voicePreview({ accountId: 'x' }).ok, false);
  assert.ok(g.numberPurchase().ok); assert.strictEqual(g.numberPurchase().ok, false);
});

test('counters roll over on a new day and new month', () => {
  let t = new Date('2026-10-08T12:00:00Z');
  const g = createSpendGuard({ now: () => t, limits: { ...small().limits, sms_day: 1, sms_per_number_day: 5, sms_account_month_default: 1 } });
  assert.ok(g.sms({ to: '+1', accountId: 'a' }).ok);
  assert.strictEqual(g.sms({ to: '+2', accountId: 'a' }).ok, false);
  t = new Date('2026-10-09T12:00:00Z');
  assert.strictEqual(g.sms({ to: '+2', accountId: 'a' }).ok, false); // same month, account cap still holds
  t = new Date('2026-11-01T12:00:00Z');
  assert.ok(g.sms({ to: '+2', accountId: 'a' }).ok);
});

test('the owner is told once per stop per day, and the alert itself is never blocked', () => {
  const sent = [];
  const g = small({ email_day: 0 });
  g.setAlertSender((a) => sent.push(a));
  g.openai('/v1/chat/completions'); g.openai('/v1/chat/completions'); g.openai('/v1/chat/completions');
  g.openai('/v1/chat/completions'); g.openai('/v1/chat/completions');
  g.openai('/v1/chat/completions'); g.openai('/v1/chat/completions');
  assert.strictEqual(sent.length, 1);
  g.runBypassed(() => assert.ok(g.take('email', [{ window: 'day', scope: 'all', limit: 0 }]).ok));
});

test('fetch wrapper stops paid hosts, leaves other hosts alone', async () => {
  const g = small({ openai_units_day: 1 });
  const calls = [];
  const base = async (u) => { calls.push(String(u)); return { ok: true }; };
  const f = installFetchGuard(g, base);
  await f('https://api.openai.com/v1/chat/completions', {});
  await assert.rejects(() => f('https://api.openai.com/v1/chat/completions', {}), /spend_guard_stop/);
  await f('https://example.com/anything', {});
  await f('https://api.mailgun.net/v3/mg.x.com/messages', { method: 'POST' });
  await f('https://api.mailgun.net/v3/mg.x.com/messages', { method: 'POST' });
  await f('https://api.mailgun.net/v3/mg.x.com/messages', { method: 'POST' });
  await assert.rejects(() => f('https://api.mailgun.net/v3/mg.x.com/messages', { method: 'POST' }), /spend_guard_stop/);
  await f('https://api.telnyx.com/v2/number_orders', { method: 'POST' });
  await assert.rejects(() => f('https://api.telnyx.com/v2/number_orders', { method: 'POST' }), /spend_guard_stop/);
  await f('https://api.telnyx.com/v2/available_phone_numbers', { method: 'GET' }); // searching is free
  assert.ok(calls.includes('https://example.com/anything'));
});
