'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoudFetch } = require('../dbErrorWatch');

const jsonRes = (status, body) => ({ status, clone() { return { json: async () => body }; }, body });

test('reports a missing-column error once, and returns the response untouched', async () => {
  const reports = [];
  let t = 10_000_000;
  const fake = async () => jsonRes(400, { code: '42703', message: 'column agents.full_name does not exist', hint: null });
  const loud = createLoudFetch({ fetchImpl: fake, report: (r) => reports.push(r), now: () => t });
  const url = 'https://x.supabase.co/rest/v1/agents?select=first_name%2Cfull_name&id=eq.1';
  const res = await loud(url);
  assert.equal(res.status, 400);
  await loud(url);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].table, 'agents');
  assert.equal(reports[0].select, 'first_name,full_name');
  assert.match(reports[0].message, /full_name/);
  t += 11 * 60 * 1000;
  await loud(url);
  assert.equal(reports.length, 2);
});

test('missing table is reported too', async () => {
  const reports = [];
  const loud = createLoudFetch({ fetchImpl: async () => jsonRes(404, { code: 'PGRST205', message: 'no table' }), report: (r) => reports.push(r) });
  await loud('https://x.supabase.co/rest/v1/lead_events?select=id');
  assert.equal(reports.length, 1);
});

test('ordinary errors and non-database calls are ignored', async () => {
  const reports = [];
  const loud = createLoudFetch({ fetchImpl: async () => jsonRes(409, { code: '23505', message: 'duplicate' }), report: (r) => reports.push(r) });
  await loud('https://x.supabase.co/rest/v1/leads');
  const loud2 = createLoudFetch({ fetchImpl: async () => jsonRes(400, { code: '42703' }), report: (r) => reports.push(r) });
  await loud2('https://x.supabase.co/auth/v1/user');
  assert.equal(reports.length, 0);
});
