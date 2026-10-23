'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getSwitch, setSwitch, ownersWithSwitchOn } = require('../../marketing-engine/services/adminSwitches');
const { buildWriterPrompt } = require('../coldEmail/writer');
const sender = require('../coldEmail/sender');

// In-memory switches table: select/update/insert with eq filters, like the real one.
function memDb(rows = [], { fail = false } = {}) {
  const from = () => {
    let op = 'select'; let payload; const filters = []; let single = false;
    const api = {
      select() { return api; },
      insert(p) { op = 'insert'; payload = p; return api; },
      update(p) { op = 'update'; payload = p; return api; },
      eq(k, v) { filters.push((r) => r[k] === v); return api; },
      maybeSingle() { single = true; return api; },
      then(resolve) {
        if (fail) return resolve({ data: null, error: { message: 'down' } });
        const hit = rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'insert') { rows.push({ ...payload }); return resolve({ data: null, error: null }); }
        if (op === 'update') { hit.forEach((r) => Object.assign(r, payload)); return resolve({ data: hit, error: null }); }
        return resolve({ data: single ? hit[0] || null : hit, error: null });
      }
    };
    return api;
  };
  return { rows, from };
}
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

test('a switch is OFF unless it is plainly ON, and only for its own owner', async () => {
  const db = memDb([{ key: 'k', owner_id: A, enabled: true }, { key: 'off', owner_id: A, enabled: false }]);
  assert.equal(await getSwitch(db, 'k', A), true);
  assert.equal(await getSwitch(db, 'off', A), false);
  assert.equal(await getSwitch(db, 'missing', A), false);
  assert.equal(await getSwitch(db, 'k', B), false, 'another customer never sees it');
  assert.equal(await getSwitch(db, 'k', undefined), false, 'no owner means OFF');
  assert.equal(await getSwitch(memDb([], { fail: true }), 'k', A), false);
  assert.equal(await getSwitch({ from: () => { throw new Error('down'); } }, 'k', A), false);
});

test('setSwitch writes the value, who changed it, and keeps each customer separate', async () => {
  const db = memDb();
  assert.equal(await setSwitch(db, 'cold_email_send', true, 'chris@x.com', A), true);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].owner_id, A);
  assert.equal(db.rows[0].updated_by, 'chris@x.com');
  assert.equal(await setSwitch(db, 'cold_email_send', false, 'chris@x.com', A), false);
  assert.equal(db.rows.length, 1, 'turning it off updates the same row');
  await setSwitch(db, 'cold_email_send', true, 'b@x.com', B);
  assert.equal(db.rows.length, 2);
  assert.equal(await getSwitch(db, 'cold_email_send', A), false);
  assert.equal(await getSwitch(db, 'cold_email_send', B), true);
  assert.equal(await setSwitch(db, 'cold_email_send', 'yes', 'a', A), false, 'only a real true turns it on');
  await assert.rejects(() => setSwitch(db, 'cold_email_send', true, 'x', undefined), /needs an owner/);
});

test('ownersWithSwitchOn lists only customers who turned it on', async () => {
  const db = memDb([{ key: 's', owner_id: A, enabled: true }, { key: 's', owner_id: B, enabled: false }]);
  const real = db.from;
  db.from = () => { const api = real(); const eq = api.eq; let enabledOnly = false; api.eq = (k, v) => { if (k === 'enabled') enabledOnly = true; return eq(k, v); }; return api; };
  assert.deepEqual(await ownersWithSwitchOn(db, 's'), [A]);
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
