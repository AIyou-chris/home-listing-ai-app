'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { isEntitled, entitledOwners, setEntitled, addonGuard, withAddonGuard } = require('../services/addon');

const A = 'aaaaaaaa-0000-4000-8000-000000000001';
const B = 'bbbbbbbb-0000-4000-8000-000000000002';
function fakeDb() {
  const rows = [];
  const from = () => {
    const filters = []; let op = 'select'; let payload;
    const api = {
      select() { return api; }, update(p) { op = 'update'; payload = p; return api; }, insert(p) { op = 'insert'; payload = p; return api; },
      eq(k, v) { filters.push((r) => r[k] === v); return api; }, maybeSingle() { api.one = true; return api; },
      then(resolve) {
        const hit = () => rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'insert') { rows.push({ ...payload }); return resolve({ data: null, error: null }); }
        if (op === 'update') { const m = hit(); m.forEach((r) => Object.assign(r, payload)); return resolve({ data: m, error: null }); }
        const m = hit(); resolve({ data: api.one ? (m[0] || null) : m, error: null });
      }
    };
    return api;
  };
  return { rows, from };
}
const SOLD = { addon: { required: true } };
const OWN = { addon: { required: false } };

test('in the business\'s own copy everybody who can log in has the add-on', async () => {
  assert.strictEqual(await isEntitled(fakeDb(), A, OWN), true);
  assert.strictEqual(await isEntitled(fakeDb(), A, {}), true);
});

test('in a sold copy a customer has nothing until the switch is turned on, and only for them', async () => {
  const db = fakeDb();
  assert.strictEqual(await isEntitled(db, A, SOLD), false);
  await setEntitled(db, A, true);
  assert.strictEqual(await isEntitled(db, A, SOLD), true);
  assert.strictEqual(await isEntitled(db, B, SOLD), false);
  await setEntitled(db, A, false);
  assert.strictEqual(await isEntitled(db, A, SOLD), false);
});

test('background jobs only serve customers who have the add-on', async () => {
  const db = fakeDb();
  await setEntitled(db, A, true);
  assert.deepStrictEqual(await entitledOwners(db, [A, B], SOLD), [A]);
  assert.deepStrictEqual(await entitledOwners(db, [A, B], OWN), [A, B]);
});

test('the guard answers 402 for a customer without the add-on and lets one with it through', async () => {
  const db = fakeDb(); await setEntitled(db, A, true);
  const guard = addonGuard(db, SOLD);
  const run = async (id) => { let status = 0; let body = null; let nexted = false; await guard({ user: { id } }, { status(c) { status = c; return this; }, json(b) { body = b; } }, () => { nexted = true; }); return { status, body, nexted }; };
  assert.strictEqual((await run(A)).nexted, true);
  const denied = await run(B);
  assert.strictEqual(denied.status, 402); assert.strictEqual(denied.body.code, 'ADDON_OFF'); assert.strictEqual(denied.nexted, false);
  assert.strictEqual((await run(undefined)).status, 402);
});

test('every route behind the login guard gets the add-on check right after it; open routes are left alone', () => {
  const added = [];
  const raw = { get: (p, ...h) => added.push([p, h]), post() {}, put() {}, patch() {}, delete() {}, use() {} };
  const login = () => {}; const other = () => {};
  const app = withAddonGuard(raw, login, fakeDb(), SOLD);
  app.get('/closed', login, other);
  app.get('/open', other);
  assert.strictEqual(added[0][1][0], login);
  assert.strictEqual(added[0][1].length, 3);
  assert.strictEqual(added[0][1][2], other);
  assert.deepStrictEqual(added[1][1], [other]);
});
