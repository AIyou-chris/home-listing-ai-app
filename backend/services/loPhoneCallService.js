'use strict';

// The LO's AI answers the phone.
//
//   Caller ──► LO's Telnyx number ──► Telnyx Voice API app (webhook: handleTelnyxEvent)
//                                         │ answer, then transfer the call over SIP
//                                         ▼
//                            OpenAI Realtime (gpt-realtime) ──► webhook: handleOpenAiEvent
//                                         │ we accept with the LO Brain as instructions
//                                         ▼
//                   side WebSocket (monitor): transcript + tools
//                      save_caller_details · transfer_to_loan_officer · end_call
//                                         ▼
//                   call ends ──► finalize(): transcript, Jev intent, lead, alert
//
// Rules:
//  * Nothing is believed from a webhook until its signature passes (done in the route).
//  * OpenAI only answers calls we sent it: each SIP leg carries X-HLAI-Call + an HMAC
//    token keyed by that line's secret. Anything else is rejected.
//  * The brain's compliance layers are in the instructions. Speech can't be blocked
//    mid-sentence, so every AI turn is checked afterwards and flagged to the LO.
//  * Every call is capped (default 15 min). Every step fails toward a human:
//    if the AI can't start, the call rings the LO's cell; if there's no cell, a
//    polite message plays. Nobody is left in silence.
//  * finalize() runs once per call, however many hang-up events arrive.

const { callToken, callTokenMatches } = require('./webhookSignatures');
const { normalizePhone } = require('./loPhoneLineService');

const OPENAI_BASE = 'https://api.openai.com/v1';
const MAX_CALL_MS = 15 * 60 * 1000;
const UNAVAILABLE_MESSAGE = "Sorry, we can't take your call right now. Please call back a little later. Goodbye.";

const TOOLS = [
  {
    type: 'function',
    name: 'save_caller_details',
    description: "Save what you've learned about the caller as soon as you learn it (call again as you learn more).",
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Caller's name" },
        email: { type: 'string' },
        best_number: { type: 'string', description: 'Only if different from the number they are calling from' },
        interest: { type: 'string', description: 'What they want: a home, pre-approval, refinance, a question…' },
        property: { type: 'string', description: 'Address or listing they asked about, if any' },
        timeline: { type: 'string', description: 'When they want to buy or move' },
        financing: { type: 'string', description: 'Pre-approved, needs pre-approval, cash, unsure…' },
        best_time: { type: 'string', description: 'Best time for the loan officer to call back' },
      },
    },
  },
  {
    type: 'function',
    name: 'transfer_to_loan_officer',
    description: 'Connect the caller live to the loan officer. Use when they ask for a person, or are ready to apply or get pre-approved now. Tell them you are connecting them BEFORE calling this.',
    parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] },
  },
  {
    type: 'function',
    name: 'end_call',
    description: 'Hang up after you have said goodbye and the caller is done.',
    parameters: { type: 'object', properties: {} },
  },
];

const INTENT_CRITERIA = {
  hot: 'Ready now: wants to apply, get pre-approved, see a home soon, or asked to talk to the loan officer.',
  warm: 'Interested and gave real details, but not ready to act this week.',
  cold: 'Just browsing, wrong number, spam, vendor, or hung up without saying much.',
};

function b64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

function unb64(value) {
  try { return JSON.parse(Buffer.from(String(value || ''), 'base64').toString('utf8')); } catch { return null; }
}

function sipHeader(headers, name) {
  const want = name.toLowerCase();
  if (Array.isArray(headers)) {
    const hit = headers.find((h) => String(h?.name || '').toLowerCase() === want);
    return hit ? String(hit.value || '') : '';
  }
  if (headers && typeof headers === 'object') {
    const key = Object.keys(headers).find((k) => k.toLowerCase() === want);
    return key ? String(headers[key] || '') : '';
  }
  return '';
}

function clean(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function createLoPhoneCallService({
  supabase,
  telnyx,
  brain,
  typesafeClient = null,
  generateSummary = null,
  onLead = null,
  env = process.env,
  fetchImpl = globalThis.fetch,
  WebSocketImpl = null,
  setTimer = setTimeout,
  log = console,
} = {}) {
  const sessions = new Map(); // callRowId -> live state (transcript, details, socket)

  const cfg = () => {
    const openaiKey = clean(env.OPENAI_API_KEY);
    const projectId = clean(env.OPENAI_PROJECT_ID);
    return {
      openaiKey,
      projectId,
      model: clean(env.OPENAI_REALTIME_MODEL) || 'gpt-realtime-2.1',
      transcribeModel: clean(env.OPENAI_TRANSCRIBE_MODEL) || 'whisper-1',
      aiReady: Boolean(openaiKey && projectId),
      maxCallMs: Number(env.PHONE_MAX_CALL_MS) || MAX_CALL_MS,
    };
  };

  // ── small data helpers ───────────────────────────────────────────────────
  async function getCall(id) {
    const { data } = await supabase.from('lo_phone_calls').select('*').eq('id', id).maybeSingle();
    return data || null;
  }

  async function getCallByTelnyx(ccid) {
    const { data } = await supabase.from('lo_phone_calls').select('*').eq('telnyx_call_control_id', ccid).maybeSingle();
    return data || null;
  }

  async function patchCall(id, patch) {
    const { data, error } = await supabase
      .from('lo_phone_calls')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) log.warn('[LO Call] update failed', { id, error: error.message || error });
    return data || null;
  }

  async function getLine(lineId) {
    if (!lineId) return null;
    const { data } = await supabase.from('lo_phone_lines').select('*').eq('id', lineId).maybeSingle();
    return data || null;
  }

  async function lineForNumber(number) {
    const { data } = await supabase
      .from('lo_phone_lines')
      .select('*')
      .eq('phone_number', number)
      .eq('status', 'active')
      .maybeSingle();
    return data || null;
  }

  async function transferTarget(line, lo) {
    return normalizePhone(line?.transfer_number) || normalizePhone(lo?.phone) || '';
  }

  async function loadLo(loAgentId) {
    const { config, lo } = await brain.loadBrain(loAgentId);
    const { data: extra } = await supabase.from('agents').select('phone').eq('id', loAgentId).maybeSingle();
    return { config, lo: { ...(lo || {}), phone: extra?.phone || null } };
  }

  async function listingsFor(loAgentId) {
    try {
      const { data: rows } = await supabase.from('listing_lo_assignments').select('listing_id').eq('lo_agent_id', loAgentId).limit(15);
      const ids = (rows || []).map((r) => r.listing_id).filter(Boolean);
      if (!ids.length) return [];
      const { data: props } = await supabase.from('properties').select('*').in('id', ids);
      return props || [];
    } catch (err) {
      log.warn('[LO Call] could not load listings', err?.message || err);
      return [];
    }
  }

  // ── the instructions: the LO Brain, plus phone rules ─────────────────────
  function buildInstructions({ config, lo, listings = [], callerNumber = '', canTransfer = false }) {
    const loName = [clean(lo.first_name), clean(lo.last_name)].filter(Boolean).join(' ') || 'the loan officer';
    const loFirst = clean(lo.first_name) || loName;
    const botName = clean(config.bot_name) || 'the AI assistant';
    const parts = [brain.buildBrainPrompt({ config, lo, route: 'borrower_care' })];
    const advisor = clean(config.loan_advisor_rules);
    if (advisor) parts.push(`When the caller asks about money or loans, also follow the Loan Advisor rules:\n${advisor}`);
    if (listings.length) {
      const lines = listings.slice(0, 15).map((l) => {
        const bits = [l.address, l.price ? `$${Number(l.price).toLocaleString('en-US')}` : '', l.bedrooms ? `${l.bedrooms} bd` : '', l.bathrooms ? `${l.bathrooms} ba` : ''].filter(Boolean);
        return `- ${bits.join(', ')}`;
      });
      parts.push(`Homes ${loFirst} is working on (callers may be calling about one of these):\n${lines.join('\n')}`);
    }
    const style = clean(config.voice_style);
    parts.push([
      'THIS IS A LIVE PHONE CALL. Rules for the phone:',
      `- Your very first words: greet them, say you are ${botName}, ${loFirst}'s AI assistant, and that the call is transcribed so ${loFirst} can follow up. Then ask how you can help.`,
      '- Talk like a person on the phone: short sentences, one question at a time, let them finish. Never read out links, lists or symbols.',
      "- Early on, get their name and ask if the number they're calling from is the best one. Call save_caller_details as you learn things.",
      canTransfer
        ? `- If they ask for ${loFirst}, or they're ready to apply or get pre-approved now, say you're connecting them, then call transfer_to_loan_officer.`
        : `- ${loFirst} can't be connected live right now. If they want a person, promise ${loFirst} will call them back soon and ask the best time.`,
      '- When they are done, say a short goodbye, then call end_call.',
      callerNumber ? `- They are calling from ${callerNumber}.` : '',
      style ? `- How your voice should sound: ${style}` : '',
    ].filter(Boolean).join('\n'));
    return parts.join('\n\n');
  }

  function openingLine({ config, lo }) {
    const loFirst = clean(lo.first_name) || 'the loan officer';
    const botName = clean(config.bot_name) || 'an AI assistant';
    return `Hi, thanks for calling! This is ${botName}, ${loFirst}'s AI assistant. This call is transcribed so ${loFirst} can follow up. How can I help you today?`;
  }

  // ── OpenAI call control ─────────────────────────────────────────────────
  async function openai(path, body) {
    const { openaiKey } = cfg();
    try {
      const res = await fetchImpl(`${OPENAI_BASE}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        log.error('[LO Call] OpenAI error', { path, status: res.status, body: text.slice(0, 400) });
        return { ok: false, status: res.status, error: text.slice(0, 400) };
      }
      return { ok: true };
    } catch (err) {
      log.error('[LO Call] OpenAI unreachable', { path, error: err?.message || err });
      return { ok: false, status: 0, error: 'unreachable' };
    }
  }

  // ── fallbacks: never leave a caller in silence ──────────────────────────
  async function fallBack(call, reason) {
    const line = await getLine(call.line_id);
    const { lo } = await loadLo(call.lo_agent_id).catch(() => ({ lo: {} }));
    const target = await transferTarget(line, lo);
    log.warn('[LO Call] falling back', { call: call.id, reason, toCell: Boolean(target) });
    if (target) {
      const r = await telnyx.callAction(call.telnyx_call_control_id, 'transfer', { to: target, from: line?.phone_number || undefined, timeout_secs: 30 });
      if (r.ok) return patchCall(call.id, { mode: 'forward', status: 'transferred', transferred_to: target, error: reason });
    }
    await patchCall(call.id, { mode: 'unavailable', error: reason });
    return telnyx.callAction(call.telnyx_call_control_id, 'speak', { payload: UNAVAILABLE_MESSAGE, voice: 'female', language: 'en-US' });
  }

  // ── 1. Telnyx: the phone rings ──────────────────────────────────────────
  async function handleTelnyxEvent(body) {
    const event = body?.data || {};
    const type = event.event_type;
    const p = event.payload || {};
    const ccid = p.call_control_id;
    if (!type || !ccid) return { ignored: 'no_event' };

    if (type === 'call.initiated') {
      if (p.direction && p.direction !== 'incoming') return { ignored: 'outgoing_leg' };
      const to = normalizePhone(p.to);
      const line = to ? await lineForNumber(to) : null;
      if (!line) {
        log.warn('[LO Call] call to a number with no active line', { to });
        return { ignored: 'unknown_number' };
      }
      const { data: call, error } = await supabase.from('lo_phone_calls').insert({
        lo_agent_id: line.lo_agent_id,
        line_id: line.id,
        telnyx_call_control_id: ccid,
        from_number: normalizePhone(p.from) || String(p.from || '').slice(0, 40) || null,
        to_number: to,
        status: 'ringing',
      }).select('*').maybeSingle();
      if (error) {
        if (error.code === '23505') return { ignored: 'duplicate' }; // Telnyx retried
        throw error;
      }
      const { config, lo } = await loadLo(line.lo_agent_id);
      const brainOn = Boolean(config) && config.is_active !== false;
      const cell = await transferTarget(line, lo);
      const mode = brainOn && cfg().aiReady ? 'ai' : (cell ? 'forward' : 'unavailable');
      await patchCall(call.id, { mode });
      await telnyx.callAction(ccid, 'answer', { client_state: b64({ c: call.id }) });
      return { handled: 'answered', mode, callId: call.id };
    }

    const call = await getCallByTelnyx(ccid);
    if (!call) return { ignored: 'not_our_leg' }; // e.g. the SIP/cell leg we created

    if (type === 'call.answered') {
      if (call.answered_at) return { ignored: 'duplicate' };
      await patchCall(call.id, { answered_at: new Date().toISOString() });
      const line = await getLine(call.line_id);
      if (call.mode === 'ai') {
        const { projectId } = cfg();
        const r = await telnyx.callAction(ccid, 'transfer', {
          to: `sip:${projectId}@sip.api.openai.com;transport=tls`,
          sip_transport_protocol: 'TLS',
          timeout_secs: 20,
          custom_headers: [
            { name: 'X-HLAI-Call', value: call.id },
            { name: 'X-HLAI-Token', value: callToken(call.id, line?.tool_token) },
            { name: 'X-HLAI-Caller', value: call.from_number || '' },
          ],
        });
        if (!r.ok) await fallBack(call, `sip_transfer_failed: ${r.error || ''}`.slice(0, 300));
        return { handled: 'to_ai' };
      }
      if (call.mode === 'forward') {
        await fallBack(call, 'ai_off');
        return { handled: 'to_cell' };
      }
      await telnyx.callAction(ccid, 'speak', { payload: UNAVAILABLE_MESSAGE, voice: 'female', language: 'en-US' });
      return { handled: 'unavailable' };
    }

    if (type === 'call.speak.ended') {
      if (call.mode === 'unavailable') await telnyx.callAction(ccid, 'hangup', {});
      return { handled: 'speak_ended' };
    }

    if (type === 'call.hangup') {
      if (!call.ended_at) await patchCall(call.id, { ended_at: new Date().toISOString(), hangup_cause: String(p.hangup_cause || '').slice(0, 80) || null });
      // Give the AI's socket a moment to close and hand over the last words.
      setTimer(() => { finalize(call.id).catch((err) => log.error('[LO Call] finalize failed', err?.message || err)); }, 3000);
      return { handled: 'hangup' };
    }

    return { ignored: type };
  }

  // ── 2. OpenAI: our SIP leg arrived — accept it with the LO's brain ──────
  async function handleOpenAiEvent(body) {
    const type = body?.type;
    if (type !== 'realtime.call.incoming') return { ignored: type || 'no_type' };
    const data = body.data || {};
    const openaiCallId = data.call_id;
    if (!openaiCallId) return { ignored: 'no_call_id' };

    const callId = sipHeader(data.sip_headers, 'X-HLAI-Call');
    const token = sipHeader(data.sip_headers, 'X-HLAI-Token');
    const call = callId ? await getCall(callId) : null;
    const line = call ? await getLine(call.line_id) : null;
    if (!call || !line || !callTokenMatches(call.id, token, line.tool_token)) {
      log.warn('[LO Call] rejected a SIP call we did not send', { hasCall: Boolean(call) });
      await openai(`/realtime/calls/${encodeURIComponent(openaiCallId)}/reject`, { status_code: 603 });
      return { rejected: 'not_ours' };
    }
    if (call.openai_call_id) return { ignored: 'duplicate' };
    await patchCall(call.id, { openai_call_id: openaiCallId });

    const { config, lo } = await loadLo(call.lo_agent_id);
    const listings = await listingsFor(call.lo_agent_id);
    const canTransfer = Boolean(await transferTarget(line, lo));
    const c = cfg();
    const accepted = await openai(`/realtime/calls/${encodeURIComponent(openaiCallId)}/accept`, {
      type: 'realtime',
      model: c.model,
      instructions: buildInstructions({ config: config || {}, lo, listings, callerNumber: call.from_number, canTransfer }),
      audio: {
        input: { transcription: { model: c.transcribeModel }, turn_detection: { type: 'semantic_vad' } },
        output: { voice: clean(config?.voice_name) || 'marin' },
      },
      tools: TOOLS,
      tool_choice: 'auto',
    });
    if (!accepted.ok) {
      await fallBack(call, `openai_accept_failed:${accepted.status}`);
      return { failed: 'accept' };
    }
    await patchCall(call.id, { status: 'ai_live' });
    startMonitor(call, { openaiCallId, config: config || {}, lo, line });
    return { accepted: call.id };
  }

  // ── 3. Watch the live call: transcript + tools ──────────────────────────
  function startMonitor(call, { openaiCallId, config, lo, line }) {
    const state = { openaiCallId, transcript: [], details: {}, handoff: false, transferredTo: null, socket: null, closed: false };
    sessions.set(call.id, state);
    const c = cfg();
    const hangup = () => openai(`/realtime/calls/${encodeURIComponent(openaiCallId)}/hangup`);
    setTimer(() => { if (!state.closed) { log.warn('[LO Call] max length reached', { call: call.id }); hangup(); } }, c.maxCallMs);
    if (!WebSocketImpl) return state;

    let socket;
    try {
      socket = new WebSocketImpl(`wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(openaiCallId)}`, {
        headers: { Authorization: `Bearer ${c.openaiKey}` },
      });
    } catch (err) {
      log.error('[LO Call] monitor socket failed', err?.message || err);
      return state;
    }
    state.socket = socket;
    const send = (obj) => { try { socket.send(JSON.stringify(obj)); } catch { /* socket gone */ } };

    socket.on('open', () => {
      send({ type: 'response.create', response: { instructions: `Greet the caller now, in your own warm words, close to: "${openingLine({ config, lo })}"` } });
    });

    socket.on('message', async (raw) => {
      let ev;
      try { ev = JSON.parse(raw.toString()); } catch { return; }
      await handleRealtimeEvent(call, state, ev, { send, hangup, line, lo }).catch((err) => log.error('[LO Call] event error', err?.message || err));
    });

    socket.on('close', () => {
      state.closed = true;
      finalize(call.id).catch((err) => log.error('[LO Call] finalize failed', err?.message || err));
    });
    socket.on('error', (err) => log.warn('[LO Call] monitor socket error', err?.message || err));
    return state;
  }

  async function handleRealtimeEvent(call, state, ev, { send, hangup, line, lo }) {
    const t = ev?.type || '';
    if (t === 'conversation.item.input_audio_transcription.completed' && clean(ev.transcript)) {
      state.transcript.push({ role: 'caller', text: clean(ev.transcript), at: new Date().toISOString() });
      return;
    }
    if ((t === 'response.output_audio_transcript.done' || t === 'response.audio_transcript.done') && clean(ev.transcript)) {
      state.transcript.push({ role: 'ai', text: clean(ev.transcript), at: new Date().toISOString() });
      return;
    }
    if (t !== 'response.function_call_arguments.done') return;

    let args = {};
    try { args = JSON.parse(ev.arguments || '{}'); } catch { args = {}; }
    const reply = (output) => {
      send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: ev.call_id, output: JSON.stringify(output) } });
    };

    if (ev.name === 'save_caller_details') {
      for (const [k, v] of Object.entries(args)) if (clean(v)) state.details[k] = clean(v).slice(0, 300);
      await patchCall(call.id, { caller_details: state.details });
      reply({ saved: true });
      send({ type: 'response.create' });
      return;
    }

    if (ev.name === 'transfer_to_loan_officer') {
      state.handoff = true;
      const target = await transferTarget(line, lo);
      if (!target) {
        reply({ ok: false, message: 'Nobody can be connected right now. Promise a callback soon and ask the best time.' });
        send({ type: 'response.create' });
        await patchCall(call.id, { handoff_requested: true });
        return;
      }
      reply({ ok: true, message: 'Connecting now. Say one short line like "Connecting you now" and nothing else.' });
      send({ type: 'response.create' });
      await patchCall(call.id, { handoff_requested: true });
      setTimer(async () => {
        // Move the caller's own leg to the LO's cell (drops the AI leg).
        const r = await telnyx.callAction(call.telnyx_call_control_id, 'transfer', { to: target, from: line?.phone_number || undefined, timeout_secs: 30 });
        let ok = r.ok;
        if (!ok) ok = (await openai(`/realtime/calls/${encodeURIComponent(state.openaiCallId || '')}/refer`, { target_uri: `tel:${target}` })).ok;
        state.transferredTo = ok ? target : null;
        await patchCall(call.id, ok ? { status: 'transferred', transferred_to: target } : { error: 'handoff_failed' });
      }, 4000);
      return;
    }

    if (ev.name === 'end_call') {
      reply({ ok: true });
      setTimer(() => { hangup(); }, 3000);
    }
  }

  // ── 4. After the call: transcript, intent, lead, alert (once) ───────────
  async function classifyIntent(transcript, details) {
    if (!typesafeClient || !typesafeClient.isConfigured || !typesafeClient.isConfigured()) return null;
    try {
      const text = transcript.map((m) => `${m.role === 'caller' ? 'Caller' : 'AI'}: ${m.text}`).join('\n').slice(-6000);
      const answers = await typesafeClient.evaluate({
        state: { call_transcript: text, caller_details: JSON.stringify(details || {}) },
        questions: { intent: { type: 'choice', instructions: "A person called a loan officer's AI line. How ready are they?", criteria: INTENT_CRITERIA } },
      });
      const pick = answers?.intent?.choice;
      return INTENT_CRITERIA[pick] ? pick : null;
    } catch (err) {
      log.warn('[LO Call] Jev intent failed', err?.message || err);
      return null;
    }
  }

  async function summarize(transcript) {
    if (!generateSummary || !transcript.length) return '';
    try {
      const text = transcript.map((m) => `${m.role === 'caller' ? 'Caller' : 'AI'}: ${m.text}`).join('\n').slice(-8000);
      const out = await generateSummary([
        { role: 'system', content: 'Summarize this phone call for a busy loan officer in 2 short sentences: who called, what they want, and the next step. Plain words.' },
        { role: 'user', content: text },
      ]);
      return clean(out).slice(0, 600);
    } catch (err) {
      log.warn('[LO Call] summary failed', err?.message || err);
      return '';
    }
  }

  async function flagCompliance(call, transcript, config, lo) {
    const rows = [];
    for (const m of transcript) {
      if (m.role !== 'ai') continue;
      const { actions } = brain.checkReplyCompliance(m.text, { config, lo });
      for (const a of actions) rows.push({ lo_agent_id: call.lo_agent_id, channel: 'phone', action: 'flagged', reason: a.reason, original: m.text.slice(0, 4000), final: '' });
    }
    if (!rows.length) return;
    try { await supabase.from('lo_compliance_events').insert(rows); } catch (err) { log.warn('[LO Call] compliance log failed', err?.message || err); }
  }

  async function saveLead(call, { details, transcript, intent, summary }) {
    const phone = normalizePhone(details.best_number) || normalizePhone(call.from_number);
    const spoke = transcript.some((m) => m.role === 'caller');
    if (!spoke && !details.name) return null;
    const ts = new Date().toISOString();
    const level = intent === 'hot' ? 'Hot' : intent === 'cold' ? 'Cold' : 'Warm';
    const lastCaller = [...transcript].reverse().find((m) => m.role === 'caller')?.text || '';
    const name = clean(details.name) || 'Phone caller';
    const email = clean(details.email) || null;
    const notes = [summary, details.best_time ? `Best time to call: ${details.best_time}` : '', details.property ? `Asked about: ${details.property}` : ''].filter(Boolean).join('\n');
    const common = {
      last_message: lastCaller.slice(0, 2000) || null,
      last_message_preview: (summary || lastCaller).slice(0, 140) || null,
      last_message_at: ts, last_contact: ts, last_touch_at: ts, updated_at: ts,
      intent_level: level,
      lead_summary: summary || null,
    };
    let existing = null;
    if (phone) {
      const { data } = await supabase.from('leads').select('id, notes').eq('lo_agent_id', call.lo_agent_id).eq('phone_e164', phone).order('created_at', { ascending: false }).limit(1).maybeSingle();
      existing = data || null;
    }
    if (existing) {
      const { data } = await supabase.from('leads').update({
        ...common,
        notes: [notes, existing.notes].filter(Boolean).join('\n\n').slice(0, 8000),
        ...(details.name ? { full_name: name, name } : {}),
        ...(email ? { email, email_lower: email.toLowerCase() } : {}),
      }).eq('id', existing.id).select('*').maybeSingle();
      return data || existing;
    }
    const { data, error } = await supabase.from('leads').insert({
      ...common,
      user_id: call.lo_agent_id,
      agent_id: call.lo_agent_id,
      lo_agent_id: call.lo_agent_id,
      full_name: name,
      name,
      phone,
      phone_e164: phone || null,
      email,
      email_lower: email ? email.toLowerCase() : null,
      source_type: 'phone',
      source: 'phone_call',
      source_key: call.id,
      source_meta: { phone_call_id: call.id },
      status: 'New',
      timeline: clean(details.timeline) || 'unknown',
      financing: clean(details.financing) || null,
      property_interest: clean(details.property) || clean(details.interest) || null,
      notes: notes || null,
      first_touch_at: ts,
      created_at: ts,
    }).select('*').maybeSingle();
    if (error) { log.error('[LO Call] lead insert failed', error.message || error); return null; }
    return data;
  }

  async function finalize(callId) {
    // Claim it: only one finalize ever runs for a call.
    const { data: call } = await supabase
      .from('lo_phone_calls')
      .update({ finalized_at: new Date().toISOString() })
      .eq('id', callId)
      .is('finalized_at', null)
      .select('*')
      .maybeSingle();
    if (!call) return { skipped: 'already_finalized' };

    const state = sessions.get(callId);
    sessions.delete(callId);
    try { state?.socket?.close(); } catch { /* already closed */ }

    const transcript = state?.transcript?.length ? state.transcript : (Array.isArray(call.transcript) ? call.transcript : []);
    const details = { ...(call.caller_details || {}), ...(state?.details || {}) };
    const patch = { transcript, caller_details: details, ended_at: call.ended_at || new Date().toISOString() };
    if (call.status !== 'transferred') patch.status = 'completed';

    if (call.mode !== 'ai' || !transcript.length) {
      await patchCall(callId, patch);
      return { finalized: callId, lead: null };
    }

    const { config, lo } = await loadLo(call.lo_agent_id).catch(() => ({ config: {}, lo: {} }));
    const [intent, summary] = await Promise.all([classifyIntent(transcript, details), summarize(transcript)]);
    await flagCompliance(call, transcript, config || {}, lo || {});
    const lead = await saveLead(call, { details, transcript, intent, summary });
    await patchCall(callId, { ...patch, intent_level: intent, summary: summary || null, lead_id: lead?.id || null });
    if (lead && onLead) {
      try { await onLead({ loAgentId: call.lo_agent_id, lead, intent, handoff: Boolean(call.handoff_requested || state?.handoff), call }); } catch (err) { log.warn('[LO Call] onLead failed', err?.message || err); }
    }
    return { finalized: callId, lead: lead?.id || null, intent };
  }

  // ── what the LO's page shows ────────────────────────────────────────────
  async function recentCalls(loAgentId, limit = 20) {
    const { data, error } = await supabase
      .from('lo_phone_calls')
      .select('id, from_number, status, mode, summary, intent_level, handoff_requested, transferred_to, caller_details, transcript, lead_id, started_at, answered_at, ended_at')
      .eq('lo_agent_id', loAgentId)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map((c) => ({
      id: c.id,
      from: c.from_number,
      name: c.caller_details?.name || null,
      status: c.status,
      mode: c.mode,
      summary: c.summary,
      intent: c.intent_level,
      handoff: c.handoff_requested,
      transferredTo: c.transferred_to,
      leadId: c.lead_id,
      startedAt: c.started_at,
      seconds: c.answered_at && c.ended_at ? Math.max(0, Math.round((new Date(c.ended_at) - new Date(c.answered_at)) / 1000)) : null,
      transcript: Array.isArray(c.transcript) ? c.transcript : [],
    }));
  }

  return { handleTelnyxEvent, handleOpenAiEvent, finalize, recentCalls, buildInstructions, openingLine, isAiReady: () => cfg().aiReady, _sessions: sessions, _handleRealtimeEvent: handleRealtimeEvent };
}

module.exports = { createLoPhoneCallService, TOOLS, UNAVAILABLE_MESSAGE, sipHeader };
