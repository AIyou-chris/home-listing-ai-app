'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const createService = require('../agentOnboardingService');
const { createFakeDb } = require('../../__tests__/helpers/fakeDb');

const details = { firstName: 'Sam', lastName: 'Buyer', email: 'sam@example.invalid', password: 'Chosen-password-123', accountType: 'lo' };
function fixture() {
  const db = createFakeDb();
  const users = new Map();
  const links = [];
  const mail = [];
  let failMail = false;
  db.auth = { admin: {
    getUserById: async id => ({ data: { user: [...users.values()].find(u => u.id === id) }, error: null }),
    generateLink: async options => {
      links.push(options);
      let user = users.get(options.email);
      if (user && options.type === 'signup') return { data: null, error: { code: 'email_exists' } };
      if (!user) { user = { id: 'auth-' + users.size, email: options.email, email_confirmed_at: null }; users.set(options.email, user); }
      return { data: { user, properties: { action_link: 'https://auth.example.invalid/verify?token=PRIVATE' } }, error: null };
    }
  } };
  const service = createService({ supabaseAdmin: db, dashboardBaseUrl: 'https://homelistingai.com', emailService: {
    sendEmail: async value => { mail.push(value); return { sent: !failMail }; },
    sendWelcomeEmail: async value => { mail.push(value); return { sent: true }; }
  } });
  return { db, users, links, mail, service, failMail: value => { failMail = value; } };
}

test('signup creates an unconfirmed login and sends its private link only by email', async () => {
  const f = fixture();
  const result = await f.service.registerAgent(details);
  assert.equal(f.links[0].type, 'signup');
  assert.equal(f.links[0].password, details.password);
  assert.equal(f.links[0].email_confirm, undefined);
  assert.equal(f.links[0].options.redirectTo, 'https://homelistingai.com/signin');
  assert.equal(f.users.get(details.email).email_confirmed_at, null);
  assert.equal(result.credentials, null);
  assert(!JSON.stringify(result).includes('PRIVATE'));
  assert(!JSON.stringify(result).includes(details.password));
  assert(f.mail[0].html.includes('token=PRIVATE'));
});

test('failed confirmation delivery resumes the same account without changing its owner or password', async () => {
  const f = fixture();
  f.failMail(true);
  await assert.rejects(f.service.registerAgent(details), /try signing up again/);
  const profileId = f.db.tables.agents[0].id;
  f.failMail(false);
  const result = await f.service.registerAgent({ ...details, password: 'different-password', accountType: 'office' });
  assert.equal(result.agent.id, profileId);
  assert.equal(result.agent.account_type, 'lo');
  assert.equal(f.db.tables.agents.length, 1);
  assert.equal(f.links.at(-1).type, 'magiclink');
  assert.equal(f.links.at(-1).password, undefined);
  assert.equal(result.confirmationRequired, true);
});

test('partial dashboard setup can be retried without creating a second login/profile', async () => {
  const f = fixture();
  const from = f.db.from;
  let fail = true;
  f.db.from = name => { if (name === 'dashboards' && fail) { fail = false; throw new Error('temporary setup outage'); } return from(name); };
  await assert.rejects(f.service.registerAgent(details), /temporary setup outage/);
  await f.service.registerAgent(details);
  assert.equal(f.users.size, 1);
  assert.equal(f.db.tables.agents.length, 1);
  assert.equal(f.db.tables.dashboards.length, 1);
});

test('confirmed users cannot be modified through public registration', async () => {
  const f = fixture();
  await f.service.registerAgent(details);
  f.users.get(details.email).email_confirmed_at = new Date().toISOString();
  const count = f.mail.length;
  await assert.rejects(f.service.registerAgent({ ...details, accountType: 'office' }), /already exists/);
  assert.equal(f.mail.length, count);
  assert.equal(f.db.tables.agents[0].account_type, 'lo');
});

test('a retry after auth-link persistence failed recovers an unconfirmed login', async () => {
  const f = fixture();
  const from = f.db.from;
  let fail = true;
  f.db.from = name => {
    const q = from(name);
    if (name === 'agents') { const update = q.update; q.update = patch => { if (patch.auth_user_id && fail) { fail = false; throw new Error('link write failed'); } return update(patch); }; }
    return q;
  };
  await assert.rejects(f.service.registerAgent(details), /link write failed/);
  const result = await f.service.registerAgent(details);
  assert.equal(result.agent.auth_user_id, 'auth-0');
  assert.equal(f.users.size, 1);
});

test('payment success reuses an already verified login without issuing new signup credentials', async () => {
  const f = fixture();
  const signed = await f.service.registerAgent(details);
  f.users.get(details.email).email_confirmed_at = new Date().toISOString();
  const linksBefore = f.links.length;
  const result = await f.service.handlePaymentSuccess({ slug: signed.slug, paymentProvider: 'promo_code', amount: 0 });
  assert.equal(f.links.length, linksBefore);
  assert.equal(result.credentials, null);
});
