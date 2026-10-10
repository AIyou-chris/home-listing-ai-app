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
