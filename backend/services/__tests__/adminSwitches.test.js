'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getSwitch, setSwitch } = require('../adminSwitches');
const { buildWriterPrompt } = require('../coldEmail/writer');
const sender = require('../coldEmail/sender');

const dbWith = (result) => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => result }) }) }) });

test('a switch is OFF unless it is plainly ON', async () => {
  assert.equal(await getSwitch(dbWith({ data: { enabled: true } }), 'k'), true);
  assert.equal(await getSwitch(dbWith({ data: { enabled: false } }), 'k'), false);
  assert.equal(await getSwitch(dbWith({ data: null }), 'k'), false);
  assert.equal(await getSwitch(dbWith({ data: null, error: { message: 'relation does not exist' } }), 'k'), false);
  assert.equal(await getSwitch({ from: () => { throw new Error('down'); } }, 'k'), false);
});

test('setSwitch writes the value and who changed it', async () => {
  let row;
  const db = { from: () => ({ upsert: async (r) => { row = r; return { error: null }; } }) };
  assert.equal(await setSwitch(db, 'cold_email_send', true, 'chris@x.com'), true);
  assert.equal(row.enabled, true);
  assert.equal(row.updated_by, 'chris@x.com');
  assert.equal((await setSwitch(db, 'cold_email_send', 'yes', 'a')), false); // only a real true turns it on
});

test('the sender stays blocked until the admin switch is on', () => {
  const env = { COLD_EMAIL_DOMAIN: 'mail.example.com', COLD_EMAIL_MAILBOXES: 'Chris <c@mail.example.com>', COLD_EMAIL_MAILGUN_API_KEY: 'k', COLD_EMAIL_ENABLED: 'true' };
  const off = sender.blockers({ ...sender.readConfig(env), enabled: false });
  assert.ok(off.some((m) => /not "true"/.test(m)));
  assert.deepEqual(sender.blockers({ ...sender.readConfig(env), enabled: true }), []);
});

test('a marketing campaign theme reaches the writer prompt, and is optional', () => {
  assert.match(buildWriterPrompt({ angle: 'agent_referrals', theme: 'Fannie condo reserves | Get warm leads' }), /marketing campaign about: Fannie condo reserves/);
  assert.doesNotMatch(buildWriterPrompt({ angle: 'agent_referrals' }), /marketing campaign about/);
});
