'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createLoPhoneCallService, sipHeader } = require('../loPhoneCallService');
const { callToken, verifyOpenAiWebhook, verifyTelnyxSignature } = require('../webhookSignatures');
const { createHmac, generateKeyPairSync, sign } = require('node:crypto');

// ── tiny in-memory Supabase ──────────────────────────────────────────────
function fakeSupabase(seed = {}) {
  const tables = { lo_phone_calls: [], lo_phone_lines: [], leads: [], agents: [], lo_compliance_events: [], listing_lo_assignments: [], properties: [], ...seed };
  let n = 0;
  const from = (name) => {
    const rows = (tables[name] ||= []);
    const filters = [];
    let op = 'select';
    let payload = null;
    let limit = null;
    const q = {
      select() { return q; },
      eq(c, v) { filters.push((r) => r[c] === v); return q; },
      is(c, v) { filters.push((r) => (r[c] ?? null) === v); return q; },
      in(c, vs) { filters.push((r) => vs.includes(r[c])); return q; },
      order() { return q; },
      limit(k) { limit = k; return q; },
      insert(p) { op = 'insert'; payload = p; return q; },
      update(p) { op = 'update'; payload = p; return q; },
      async maybeSingle() { return run(true); },
      then(resolve, reject) { return Promise.resolve(run(false)).then(resolve, reject); },
    };
    function run(single) {
      if (op === 'insert') {
        const list = Array.isArray(payload) ? payload : [payload];
        if (name === 'lo_phone_calls' && list.some((p) => rows.some((r) => r.telnyx_call_control_id === p.telnyx_call_control_id))) {
          return { data: null, error: { code: '23505' } };
        }
        const made = list.map((p) => ({ id: `${name}-${++n}`, ...p }));
        rows.push(...made);
        return { data: single ? made[0] : made, error: null };
      }
      let hits = rows.filter((r) => filters.every((f) => f(r)));
      if (op === 'update') hits.forEach((r) => Object.assign(r, payload));
      if (limit) hits = hits.slice(0, limit);
      return { data: single ? (hits[0] || null) : hits, error: null };
    }
    return q;
  };
  return { from, tables };
}

function fakeTelnyx() {
  const calls = [];
  return { calls, async callAction(id, action, body) { calls.push({ id, action, body }); return { ok: true }; } };
}

function fakeBrain(config = { is_active: true, bot_name: 'Ava', voice_name: 'cedar', banned_phrases: [] }) {
  return {
    async loadBrain() { return { config, lo: { first_name: 'Chris', last_name: 'P', nmls_number: '123' } }; },
    buildBrainPrompt() { return 'BRAIN PROMPT'; },
    checkReplyCompliance(text) {
      return /guaranteed approval/i.test(text) ? { reply: 'x', actions: [{ action: 'blocked', reason: 'banned_phrase:guaranteed approval' }] } : { reply: text, actions: [] };
    },
  };
}

function fakeFetch() {
  const hits = [];
  const fn = async (url, init) => { hits.push({ url, body: init.body ? JSON.parse(init.body) : null }); return { ok: true, text: async () => '' }; };
  fn.hits = hits;
  return fn;
}

class FakeSocket extends EventEmitter {
  constructor(url) { super(); this.url = url; this.sent = []; FakeSocket.last = this; }
  send(s) { this.sent.push(JSON.parse(s)); }
  close() { this.emit('close'); }
}

const ENV = { OPENAI_API_KEY: 'sk', OPENAI_PROJECT_ID: 'proj_1' };
const LINE = { id: 'line-1', lo_agent_id: 'lo1', phone_number: '+15095550100', status: 'active', tool_token: 'secret-token', is_mock: false };

function setup({ env = ENV, config, agentPhone = '9495550111', timers = [] } = {}) {
  const supabase = fakeSupabase({ lo_phone_lines: [{ ...LINE }], agents: [{ id: 'lo1', phone: agentPhone }] });
  const telnyx = fakeTelnyx();
  const fetchImpl = fakeFetch();
  const leads = [];
  const svc = createLoPhoneCallService({
    supabase, telnyx, brain: fakeBrain(config), env, fetchImpl, WebSocketImpl: FakeSocket,
    setTimer: (fn) => timers.push(fn),
    generateSummary: async () => 'Jordan wants pre-approval for 12 Oak St.',
    typesafeClient: { isConfigured: () => true, evaluate: async () => ({ intent: { choice: 'hot' } }) },
    onLead: async (x) => leads.push(x),
    log: { warn() {}, error() {}, log() {} },
  });
  return { svc, supabase, telnyx, fetchImpl, leads, timers };
}

const ring = (ccid = 'cc-1', from = '+12065550199') => ({ data: { event_type: 'call.initiated', payload: { call_control_id: ccid, direction: 'incoming', to: '+1 509-555-0100', from } } });
const answered = (ccid = 'cc-1') => ({ data: { event_type: 'call.answered', payload: { call_control_id: ccid } } });

test('a ring on an LO number is logged once and answered for the AI', async () => {
  const { svc, supabase, telnyx } = setup();
  const r = await svc.handleTelnyxEvent(ring());
  assert.equal(r.mode, 'ai');
  const again = await svc.handleTelnyxEvent(ring());
  assert.equal(again.ignored, 'duplicate');
  assert.equal(supabase.tables.lo_phone_calls.length, 1);
  assert.deepEqual(telnyx.calls.map((c) => c.action), ['answer']);
});

test('a ring on an unknown number is left alone', async () => {
  const { svc, telnyx } = setup();
  const r = await svc.handleTelnyxEvent({ data: { event_type: 'call.initiated', payload: { call_control_id: 'x', direction: 'incoming', to: '+12065550000' } } });
  assert.equal(r.ignored, 'unknown_number');
  assert.equal(telnyx.calls.length, 0);
});

test('answered AI call is sent to OpenAI over SIP with a signed call header', async () => {
  const { svc, supabase, telnyx } = setup();
  await svc.handleTelnyxEvent(ring());
  await svc.handleTelnyxEvent(answered());
  const t = telnyx.calls.find((c) => c.action === 'transfer');
  assert.equal(t.body.to, 'sip:proj_1@sip.api.openai.com;transport=tls');
  const callId = supabase.tables.lo_phone_calls[0].id;
  assert.equal(sipHeader(t.body.custom_headers, 'x-hlai-call'), callId);
  assert.equal(sipHeader(t.body.custom_headers, 'X-HLAI-Token'), callToken(callId, 'secret-token'));
});

test('AI not configured: the call rings the LO cell instead', async () => {
  const { svc, telnyx } = setup({ env: {} });
  const r = await svc.handleTelnyxEvent(ring());
  assert.equal(r.mode, 'forward');
  await svc.handleTelnyxEvent(answered());
  const t = telnyx.calls.find((c) => c.action === 'transfer');
  assert.equal(t.body.to, '+19495550111');
});

test('brain off and no cell: a polite message plays, then hang up', async () => {
  const { svc, telnyx } = setup({ config: { is_active: false }, agentPhone: null });
  const r = await svc.handleTelnyxEvent(ring());
  assert.equal(r.mode, 'unavailable');
  await svc.handleTelnyxEvent(answered());
  await svc.handleTelnyxEvent({ data: { event_type: 'call.speak.ended', payload: { call_control_id: 'cc-1' } } });
  assert.deepEqual(telnyx.calls.map((c) => c.action), ['answer', 'speak', 'hangup']);
});

test('OpenAI: a SIP call without our token is rejected', async () => {
  const { svc, fetchImpl } = setup();
  await svc.handleTelnyxEvent(ring());
  const r = await svc.handleOpenAiEvent({ type: 'realtime.call.incoming', data: { call_id: 'rtc_1', sip_headers: [{ name: 'X-HLAI-Call', value: 'lo_phone_calls-1' }, { name: 'X-HLAI-Token', value: 'forged' }] } });
  assert.equal(r.rejected, 'not_ours');
  assert.match(fetchImpl.hits[0].url, /\/realtime\/calls\/rtc_1\/reject$/);
});

async function liveCall(ctx) {
  await ctx.svc.handleTelnyxEvent(ring());
  await ctx.svc.handleTelnyxEvent(answered());
  const callId = ctx.supabase.tables.lo_phone_calls[0].id;
  const r = await ctx.svc.handleOpenAiEvent({ type: 'realtime.call.incoming', data: { call_id: 'rtc_1', sip_headers: [{ name: 'X-HLAI-Call', value: callId }, { name: 'X-HLAI-Token', value: callToken(callId, 'secret-token') }] } });
  return { callId, r, socket: FakeSocket.last };
}

test('OpenAI: our call is accepted with the brain, voice and tools', async () => {
  const ctx = setup();
  const { r, socket } = await liveCall(ctx);
  assert.ok(r.accepted);
  const accept = ctx.fetchImpl.hits.find((h) => /\/accept$/.test(h.url));
  assert.equal(accept.body.model, 'gpt-realtime-2.1');
  assert.equal(accept.body.audio.output.voice, 'cedar');
  assert.match(accept.body.instructions, /BRAIN PROMPT/);
  assert.match(accept.body.instructions, /LIVE PHONE CALL/);
  assert.deepEqual(accept.body.tools.map((t) => t.name), ['save_caller_details', 'transfer_to_loan_officer', 'end_call']);
  assert.match(socket.url, /call_id=rtc_1/);
  socket.emit('open');
  assert.equal(socket.sent[0].type, 'response.create');
});

test('hand-off moves the caller to the LO cell', async () => {
  const ctx = setup();
  const { socket, callId } = await liveCall(ctx);
  socket.emit('message', Buffer.from(JSON.stringify({ type: 'response.function_call_arguments.done', name: 'transfer_to_loan_officer', call_id: 'fc1', arguments: '{"reason":"ready"}' })));
  await new Promise((r) => setImmediate(r));
  await ctx.timers.at(-1)();
  const t = ctx.telnyx.calls.filter((c) => c.action === 'transfer').at(-1);
  assert.equal(t.body.to, '+19495550111');
  assert.equal(ctx.supabase.tables.lo_phone_calls.find((c) => c.id === callId).status, 'transferred');
});

test('after the call: transcript saved, lead created once, Jev intent, compliance flagged', async () => {
  const ctx = setup();
  const { socket, callId } = await liveCall(ctx);
  const say = (ev) => socket.emit('message', Buffer.from(JSON.stringify(ev)));
  say({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'Hi, I want to get pre-approved.' });
  say({ type: 'response.output_audio_transcript.done', transcript: 'Great! You have guaranteed approval.' });
  say({ type: 'response.function_call_arguments.done', name: 'save_caller_details', call_id: 'f', arguments: '{"name":"Jordan","timeline":"30 days"}' });
  await new Promise((r) => setImmediate(r));
  socket.close();
  await new Promise((r) => setTimeout(r, 10));
  const again = await ctx.svc.finalize(callId);
  assert.equal(again.skipped, 'already_finalized');
  const call = ctx.supabase.tables.lo_phone_calls[0];
  assert.equal(call.transcript.length, 2);
  assert.equal(call.intent_level, 'hot');
  assert.equal(ctx.supabase.tables.leads.length, 1);
  const lead = ctx.supabase.tables.leads[0];
  assert.equal(lead.full_name, 'Jordan');
  assert.equal(lead.phone_e164, '+12065550199');
  assert.equal(lead.intent_level, 'Hot');
  assert.equal(ctx.leads.length, 1);
  assert.equal(ctx.supabase.tables.lo_compliance_events.length, 1);
  assert.equal(ctx.supabase.tables.lo_compliance_events[0].channel, 'phone');
});

test('webhook signatures: OpenAI standard-webhooks and Telnyx ed25519', () => {
  const secret = `whsec_${Buffer.from('shh').toString('base64')}`;
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));
  const body = '{"type":"realtime.call.incoming"}';
  const sig = createHmac('sha256', Buffer.from('shh')).update(`msg_1.${ts}.${body}`).digest('base64');
  assert.equal(verifyOpenAiWebhook({ headers: { 'webhook-id': 'msg_1', 'webhook-timestamp': ts, 'webhook-signature': `v1,${sig}` }, rawBody: body, secret, now }).ok, true);
  assert.equal(verifyOpenAiWebhook({ headers: { 'webhook-id': 'msg_1', 'webhook-timestamp': ts, 'webhook-signature': 'v1,bad' }, rawBody: body, secret, now }).ok, false);

  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const rawPub = publicKey.export({ format: 'der', type: 'spki' }).subarray(12).toString('base64');
  const tsig = sign(null, Buffer.from(`${ts}|${body}`), privateKey).toString('base64');
  assert.equal(verifyTelnyxSignature({ headers: { 'telnyx-signature-ed25519': tsig, 'telnyx-timestamp': ts }, rawBody: body, publicKey: rawPub, now }).ok, true);
  assert.equal(verifyTelnyxSignature({ headers: { 'telnyx-signature-ed25519': tsig, 'telnyx-timestamp': ts }, rawBody: `${body} `, publicKey: rawPub, now }).ok, false);
});
