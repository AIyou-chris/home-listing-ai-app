'use strict';
const test = require('node:test');
const assert = require('node:assert');
const createFunnelService = require('../services/funnelExecutionService');

const run = async (content, agent) => {
  const sent = [];
  const svc = createFunnelService({
    supabaseAdmin: {},
    emailService: { sendEmail: async (m) => { sent.push(m); return { sent: true }; } },
    smsService: {},
    voiceService: {}
  });
  await svc.executeStep(
    { type: 'email', subject: 'Hi', content, step_key: 's1' },
    { id: 'l1', name: 'Smoke Funnel', email: 'a@b.test' },
    agent,
    []
  );
  return sent[0].html;
};

test('fills the signature and keeps paragraph breaks in plain text', async () => {
    const html = await run('Hi {{lead.first_name}},\n\nFirst.\n\n{{agent.signature}}', { id: 'a1', first_name: 'Chris', last_name: 'Potter' });
    assert.ok(!html.includes('{{'));
    assert.ok(html.includes('Hi Smoke,<br/><br/>First.'));
    assert.ok(html.includes('Best,<br/>Chris Potter'));
});

test('falls back to the company sign-off when the account has no name', async () => {
    const html = await run('Thanks\n{{agent.signature}}', { id: 'a1' });
    assert.ok(html.includes('Best,<br/>HomeListingAI Team'));
});

test('leaves bodies written in HTML alone', async () => {
    const html = await run('<p>Hello</p>', { id: 'a1' });
    assert.ok(html.includes('<p>Hello</p>'));
    assert.ok(!html.includes('&lt;p&gt;'));
});
