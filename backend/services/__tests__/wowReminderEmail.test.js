const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWowReminderEmail } = require('../wowReminderEmail');

const base = { name: 'Fred Potter', loName: 'Alex Rivera', loCompany: 'Summit Home Loans', nmls: '123456', wowLink: 'https://homelistingai.com/partner-invite/tok' };

test('nudge email names the agent, LO, link and NMLS', () => {
  const { subject, html } = buildWowReminderEmail(base);
  assert.match(subject, /Alex Rivera/);
  assert.match(html, /Hi Fred/);
  assert.match(html, /partner-invite\/tok/);
  assert.match(html, /NMLS #123456/);
  assert.match(html, /Summit Home Loans/);
});

test('followup uses its own wording', () => {
  const { subject, html } = buildWowReminderEmail({ ...base, kind: 'followup' });
  assert.match(subject, /Still want to see/);
  assert.match(html, /saved your listing demo/);
});

test('blank agent name reads "there" and html is escaped', () => {
  const { html } = buildWowReminderEmail({ ...base, name: '', loName: 'Al <b>x</b>', loCompany: null });
  assert.match(html, /Hi there/);
  assert.ok(!html.includes('<b>x</b>'));
  assert.ok(html.includes('&lt;b&gt;'));
});

test('NMLS line is skipped when unknown', () => {
  const { html } = buildWowReminderEmail({ ...base, nmls: null });
  assert.ok(!html.includes('NMLS'));
});
