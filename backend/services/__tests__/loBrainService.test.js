'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoBrainService, PLATFORM_GUARDRAILS, DEFAULT_RULEBOOKS } = require('../loBrainService');

const quietLog = { warn: () => {}, log: () => {} };

function jev(answer, { configured = true, throws = false } = {}) {
  const calls = [];
  return {
    calls,
    isConfigured: () => configured,
    evaluate: async (args) => {
      calls.push(args);
      if (throws) throw new Error('boom');
      return { route: answer };
    },
  };
}

// ── routing ────────────────────────────────────────────────────────────────
test('Jev picks Loan Advisor for a money question', async () => {
  const client = jev({ type: 'choice', choice: 'money', confidence: 0.9 });
  const brain = createLoBrainService({ typesafeClient: client, log: quietLog });
  const r = await brain.routeQuestion('What would my payment be with 5% down?');
  assert.equal(r.route, 'loan_advisor');
  assert.equal(r.source, 'jev');
  assert.equal(client.calls[0].questions.route.type, 'choice');
  assert.deepEqual(Object.keys(client.calls[0].questions.route.criteria).sort(), ['help', 'home', 'money']);
});

test('Jev picks Listing for a question about the home', async () => {
  const brain = createLoBrainService({ typesafeClient: jev({ choice: 'home', confidence: 0.8 }), log: quietLog });
  assert.equal((await brain.routeQuestion('Does it have a pool?')).route, 'listing');
});

test('uses probabilities when choice is missing', async () => {
  const brain = createLoBrainService({ typesafeClient: jev({ probabilities: { money: 0.1, help: 0.7, home: 0.2 } }), log: quietLog });
  const r = await brain.routeQuestion('I am confused about the process');
  assert.equal(r.route, 'borrower_care');
  assert.equal(r.source, 'jev');
});

test('low confidence falls back to Borrower Care', async () => {
  const brain = createLoBrainService({ typesafeClient: jev({ choice: 'money', confidence: 0.3 }), log: quietLog });
  const r = await brain.routeQuestion('hmm');
  assert.equal(r.route, 'borrower_care');
  assert.equal(r.source, 'fallback_low_confidence');
});

test('no Jev key falls back to Borrower Care without calling Jev', async () => {
  const client = jev({ choice: 'money' }, { configured: false });
  const brain = createLoBrainService({ typesafeClient: client, log: quietLog });
  const r = await brain.routeQuestion('rates?');
  assert.equal(r.route, 'borrower_care');
  assert.equal(client.calls.length, 0);
});

test('Jev error fails open to Borrower Care', async () => {
  const brain = createLoBrainService({ typesafeClient: jev(null, { throws: true }), log: quietLog });
  assert.equal((await brain.routeQuestion('rates?')).source, 'fallback_error');
});

test('unknown choice falls back', async () => {
  const brain = createLoBrainService({ typesafeClient: jev({ choice: 'weather', confidence: 0.99 }), log: quietLog });
  assert.equal((await brain.routeQuestion('rain?')).route, 'borrower_care');
});

// ── prompt stacking ──────────────────────────────────────────────────────────
test('prompt stacks safety > compliance > identity > rulebook > knowledge > listing', () => {
  const brain = createLoBrainService({ log: quietLog });
  const prompt = brain.buildBrainPrompt({
    config: {
      bot_name: 'Sky',
      company_name: 'Acme Lending',
      company_nmls: '999',
      licensed_states: ['WA', 'OR'],
      required_disclosure: 'Estimates only.',
      banned_phrases: ['lowest rate'],
      compliance_rules: 'No texting after 8pm.',
      loan_advisor_rules: 'Ask about down payment first.',
      knowledge_base: 'We do VA loans.',
      faq: [{ question: 'Do you do FHA?', answer: 'Yes.' }],
    },
    lo: { first_name: 'Chris', last_name: 'P', nmls_number: '12345' },
    listing: { address: '1 Main St', price: 500000, sqft: 1800 },
    paymentSchedule: 'Conv 30yr: $3,100/mo',
    route: 'loan_advisor',
  });
  const order = [
    PLATFORM_GUARDRAILS.slice(0, 40),
    'Acme Lending',
    'licensed ONLY in: WA, OR',
    'Estimates only.',
    '"lowest rate"',
    'No texting after 8pm.',
    'You are Sky',
    'NMLS# 12345',
    'Ask about down payment first.',
    'We do VA loans.',
    'Do you do FHA?',
    'Address: 1 Main St',
    'Square feet: 1800',
    'Conv 30yr: $3,100/mo',
  ];
  let last = -1;
  for (const piece of order) {
    const at = prompt.indexOf(piece);
    assert.ok(at > last, `"${piece}" should come after the previous section`);
    last = at;
  }
});

test('borrower care is used by default and falls back to default wording', () => {
  const brain = createLoBrainService({ log: quietLog });
  const prompt = brain.buildBrainPrompt({ config: {} });
  assert.ok(prompt.includes(DEFAULT_RULEBOOKS.borrower_care_rules));
  assert.ok(!prompt.includes('THIS IS A FINANCING QUESTION'));
});

test('NMLS intro can be turned off', () => {
  const brain = createLoBrainService({ log: quietLog });
  const prompt = brain.buildBrainPrompt({ config: { nmls_in_intro: false }, lo: { nmls_number: '12345' } });
  assert.ok(!prompt.includes('NMLS# 12345'));
});

// ── compliance check ─────────────────────────────────────────────────────────
test('banned phrase blocks the reply', () => {
  const brain = createLoBrainService({ log: quietLog });
  const r = brain.checkReplyCompliance('You have guaranteed approval!', { config: {}, lo: { first_name: 'Chris' } });
  assert.equal(r.actions[0].action, 'blocked');
  assert.ok(r.reply.startsWith('Good question'));
  assert.ok(r.reply.includes('Chris'));
});

test('LO banned words are enforced too', () => {
  const brain = createLoBrainService({ log: quietLog });
  const r = brain.checkReplyCompliance('We have the LOWEST RATE in town.', { config: { banned_phrases: ['lowest rate'] } });
  assert.equal(r.actions[0].action, 'blocked');
});

test('disclosure is added when a number is quoted', () => {
  const brain = createLoBrainService({ log: quietLog });
  const r = brain.checkReplyCompliance('About $2,900 a month at 6.5%.', { config: { required_disclosure: 'Estimates only.' } });
  assert.equal(r.actions[0].action, 'fixed');
  assert.ok(r.reply.endsWith('Estimates only.'));
});

test('no change when there is nothing to fix', () => {
  const brain = createLoBrainService({ log: quietLog });
  const r = brain.checkReplyCompliance('The home has 3 bedrooms.', { config: { required_disclosure: 'Estimates only.' } });
  assert.equal(r.actions.length, 0);
  assert.equal(r.reply, 'The home has 3 bedrooms.');
});

// ── full answer ──────────────────────────────────────────────────────────────
function fakeSupabase(tables) {
  const inserted = [];
  function query(table) {
    const rows = tables[table] || [];
    const q = {
      select: () => q, eq: () => q, ilike: () => q, order: async () => ({ data: rows }),
      maybeSingle: async () => ({ data: rows[0] || null }),
      insert: async (payload) => { inserted.push({ table, payload }); return { error: null }; },
    };
    return q;
  }
  return { from: query, inserted };
}

test('answer routes, generates, checks compliance and logs events', async () => {
  const supabase = fakeSupabase({
    lo_chatbot_configs: [{ bot_name: 'Sky', is_active: true, required_disclosure: 'Estimates only.' }],
    agents: [{ first_name: 'Chris', nmls_number: '1' }],
    properties: [{ address: '1 Main St, Town', price: 400000 }],
    lo_listing_kb_docs: [{ content: 'FHA 30yr: $2,700/mo' }],
  });
  let sent;
  const brain = createLoBrainService({
    supabase,
    typesafeClient: jev({ choice: 'money', confidence: 0.9 }),
    generateReply: async (messages) => { sent = messages; return 'About $2,700 a month.'; },
    log: quietLog,
  });
  const out = await brain.answer({ loAgentId: 'lo1', listingId: 'p1', message: 'Payment?', history: [{ role: 'visitor', text: 'hi' }] });
  assert.equal(out.route, 'loan_advisor');
  assert.ok(out.reply.endsWith('Estimates only.'));
  assert.equal(out.actions[0].action, 'fixed');
  assert.ok(sent[0].content.includes('FHA 30yr: $2,700/mo'));
  assert.equal(sent[1].role, 'user');
  assert.equal(supabase.inserted[0].table, 'lo_compliance_events');
});

test('answer returns setup message when the LO has no brain yet', async () => {
  const brain = createLoBrainService({ supabase: fakeSupabase({}), generateReply: async () => 'x', log: quietLog });
  const out = await brain.answer({ loAgentId: 'lo1', message: 'hi' });
  assert.equal(out.configured, false);
});
