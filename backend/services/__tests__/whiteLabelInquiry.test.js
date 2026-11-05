'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInquiry, createWhiteLabelInquiryHandler } = require('../whiteLabelInquiry');
const NOW = Date.parse('2026-11-05T12:00:00Z');
const body = () => ({ requestId: 'f9be538a-160d-46b6-888c-67f7d534708f', name: 'Taylor Example', email: 'taylor@example.com', office: 'Example office', message: 'A branded platform for our team.', date: '2026-11-10', time: '10:00', timezone: 'America/Los_Angeles', startIso: '2026-11-10T18:00:00.000Z' });

function fixture({ failAppointment = false, admins = [{ id: 'admin-owner', app_metadata: { admin: true } }] } = {}) {
  const tables = { leads: new Map(), appointments: new Map() };
  let fail = failAppointment;
  const db = {
    auth: { admin: { listUsers: async () => ({ data: { users: admins } }), getUserById: async id => ({ data: { user: admins.find(u => u.id === id) } }) } },
    from(table) {
      return {
        async insert(payload) {
          if (table === 'appointments' && fail) { fail = false; return { error: { code: 'DB_DOWN' } }; }
          if (tables[table].has(payload.id)) return { error: { code: '23505' } };
          tables[table].set(payload.id, payload);
          return { error: null };
        },
        select() {
          const filters = [];
          const query = { eq(k, v) { filters.push([k, v]); return query; }, async maybeSingle() { return { data: [...tables[table].values()].find(row => filters.every(([k, v]) => row[k] === v)) || null }; } };
          return query;
        }
      };
    }
  };
  const handler = createWhiteLabelInquiryHandler({ db, now: () => NOW, logger: { error() {} } });
  const invoke = async (overrides = {}) => {
    const res = { code: 200, status(code) { this.code = code; return this; }, set() {}, json(data) { this.data = data; return this; } };
    await handler({ body: { ...body(), ...overrides }, ip: 'test-ip' }, res);
    return res;
  };
  return { tables, invoke };
}

test('validates dates, actual time zones, DST gaps, email, field types and limits', () => {
  assert.equal(validateInquiry(body(), NOW), null);
  for (const overrides of [{ email: 'bad' }, { name: [] }, { message: 'x'.repeat(1001) }, { timezone: 'Fake/Zone' }, { requestId: 'not-uuid' }, { startIso: '2026-11-04T18:00:00Z' }, { time: '11:00' }, { date: '2026-02-30' }, { startIso: '2027-11-10T18:00:00Z' }]) {
    assert.ok(validateInquiry({ ...body(), ...overrides }, NOW), JSON.stringify(overrides));
  }
  assert.ok(validateInquiry({ ...body(), date: '2027-03-14', time: '02:30', startIso: '2027-03-14T10:30:00Z' }, NOW));
});

test('saves lead and linked admin calendar request, ignores visitor owner/status fields, sends no reminders', async () => {
  const { tables, invoke } = fixture();
  const res = await invoke({ userId: 'attacker', targetUserId: 'attacker', status: 'confirmed' });
  assert.equal(res.code, 201);
  const lead = [...tables.leads.values()][0];
  const appointment = [...tables.appointments.values()][0];
  assert.equal(lead.user_id, 'admin-owner');
  assert.equal(lead.source, 'White Label Inquiry');
  assert.equal(lead.manual_follow_up, true);
  assert.equal(appointment.user_id, 'admin-owner');
  assert.equal(appointment.lead_id, lead.id);
  assert.equal(appointment.confirmation_status, 'needs_confirmation');
  assert.equal(appointment.remind_client, false);
  assert.equal(appointment.remind_agent, false);
  assert.equal(Date.parse(appointment.end_iso) - Date.parse(appointment.start_iso), 1800000);
  assert.match(appointment.notes, /Example office/);
  assert.deepEqual(res.data, { success: true });
});

test('retry after a partial save creates exactly one lead and one appointment', async () => {
  const { tables, invoke } = fixture({ failAppointment: true });
  const failed = await invoke();
  assert.equal(failed.code, 503);
  assert.equal(failed.data.leadSaved, true);
  assert.equal((await invoke()).code, 201);
  assert.equal(tables.leads.size, 1);
  assert.equal(tables.appointments.size, 1);
});

test('retry after a successful save is idempotent', async () => {
  const { tables, invoke } = fixture();
  assert.equal((await invoke()).code, 201);
  assert.equal((await invoke()).code, 201);
  assert.equal(tables.leads.size, 1);
  assert.equal(tables.appointments.size, 1);
  assert.equal((await invoke()).code, 429);
});

test('fails closed without exactly one verified admin; validation performs no writes', async () => {
  for (const admins of [[], [{ id: 'fake', user_metadata: { admin: true } }], [{ id: 'a', app_metadata: { admin: true } }, { id: 'b', app_metadata: { admin: true } }]]) {
    const { tables, invoke } = fixture({ admins });
    assert.equal((await invoke()).code, 503);
    assert.equal(tables.leads.size, 0);
  }
  const { tables, invoke } = fixture();
  assert.equal((await invoke({ email: 'bad' })).code, 400);
  assert.equal(tables.leads.size, 0);
});
