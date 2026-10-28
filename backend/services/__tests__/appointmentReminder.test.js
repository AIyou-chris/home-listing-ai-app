'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildAppointmentReminder } = require('../schedulerService');

const base = { name: 'Sam <b>', start_iso: '2026-10-12T16:00:00+00:00', timezone: 'America/Los_Angeles', kind: 'Showing', property_address: '482 Maple Court, Austin, TX', meet_link: null };

test('an in-person showing reminder names the place and the local time, with no dead Join button', () => {
  const r = buildAppointmentReminder(base);
  assert.match(r.subject, /showing at 482 Maple Court/);
  assert.match(r.html, /9:00 AM/);
  assert.match(r.html, /Monday, October 12/);
  assert.ok(!/Join/i.test(r.html));
  assert.ok(!r.html.includes('href="#"'));
});

test('a real meeting link adds a Join button, a non-web link does not', () => {
  assert.match(buildAppointmentReminder({ ...base, kind: 'Call', property_address: null, meet_link: 'https://meet.example.com/abc' }).html, /Join the meeting/);
  assert.ok(!/Join the meeting/.test(buildAppointmentReminder({ ...base, meet_link: 'javascript:alert(1)' }).html));
});

test('names are escaped', () => {
  assert.ok(!buildAppointmentReminder(base).html.includes('<b>'));
});

test('the reminder query includes the status public bookings are saved with', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'schedulerService.js'), 'utf8');
  assert.ok(src.includes(".in('status', ['scheduled', 'confirmed'])"));
});

test('client email reminders respect off switches and the chosen offset', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const { createRequire } = require('node:module');
  const file = path.join(__dirname, '../schedulerService.js');
  const realRequire = createRequire(file);
  const callbacks = new Map();
  const mod = { exports: {} };
  const quiet = { log(){}, warn(){}, error(){} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module: mod, console: quiet, process: { env: {} }, require: name => name === 'node-cron' ? { schedule: (pattern, fn) => callbacks.set(pattern, fn) } : realRequire(name) });
  const now = Date.now();
  const rows = [
    { id: 'off', email: 'off@example.invalid', remind_client: false, start_iso: new Date(now + 60 * 60000 - 30000).toISOString() },
    { id: 'later', email: 'later@example.invalid', remind_client: true, start_iso: new Date(now + 60 * 60000).toISOString(), client_reminder_minutes_before: 15 },
    { id: 'due', email: 'due@example.invalid', remind_client: true, start_iso: new Date(now + 15 * 60000 - 30000).toISOString(), client_reminder_minutes_before: 15 }
  ];
  const sent = [];
  const db = { from() { const q = { select(){return q;}, gte(){return q;}, lt(){return q;}, in(){return q;}, eq(){return q;}, update(){return q;}, then(resolve,reject){return Promise.resolve({data:rows}).then(resolve,reject);} }; return q; } };
  mod.exports(db, { sendEmail: async mail => { sent.push(mail); return {sent:true}; } });
  await callbacks.get('* * * * *')();
  assert.deepEqual(sent.map(mail => mail.to), ['due@example.invalid']);
  assert.match(sent[0].subject, /15 minutes/);
});
