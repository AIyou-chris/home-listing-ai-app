'use strict';

// Each loan officer's own AI phone number. Ported from An AI You's provisioning
// (ai-landing-template/server/lib/phone/provisioning.cjs) — the only code that
// spends real money on an outside account, so the same guarantees apply:
//
//  * The line row is written FIRST. A unique index on lo_phone_lines(lo_agent_id)
//    (live statuses) means two quick clicks race for one row and the loser gets
//    the winner's line having spent nothing. Never two numbers.
//  * Each step records its intent before acting ('ordering' before the order),
//    so a crash mid-order is recoverable instead of buying again.
//  * A number order is never retried automatically.
//  * Nothing here ever releases a number.
//
// Switches (backend env only, never VITE_):
//   TELNYX_PHONE_ENABLED      feature visible to every LO
//   PHONE_BETA_LO_IDS         comma list of agents.id that see it before that
//   TELNYX_LIVE_PROVISIONING  may it buy a REAL number (needs TELNYX_API_KEY)
// Anything not armed runs against the mock (555-01xx numbers, $0).

const { randomBytes } = require('crypto');
const { createTelnyxClient, createMockTelnyxClient } = require('./telnyxClient');

const UNIQUE_VIOLATION = '23505';
const LIVE_STATUSES = ['searching', 'ordering', 'configuring', 'active', 'failed'];

function flag(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function phoneLineConfig(env = process.env) {
  const apiKey = String(env.TELNYX_API_KEY || '').trim();
  const live = flag(env.TELNYX_LIVE_PROVISIONING) && Boolean(apiKey);
  return {
    apiKey,
    connectionId: String(env.TELNYX_CONNECTION_ID || '').trim(),
    enabledForAll: flag(env.TELNYX_PHONE_ENABLED),
    betaIds: String(env.PHONE_BETA_LO_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),
    live,
    mock: !live,
  };
}

function isEnabledFor(loAgentId, env = process.env) {
  const cfg = phoneLineConfig(env);
  return cfg.enabledForAll || cfg.betaIds.includes(String(loAgentId));
}

function cleanAreaCode(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return /^[2-9]\d{2}$/.test(digits) ? digits : '';
}

function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return '';
}

function maskPhone(value) {
  const n = normalizePhone(value);
  return n ? `${n.slice(0, 5)}•••${n.slice(-2)}` : '';
}

function createLoPhoneLineService({ supabase, env = process.env, telnyx = null } = {}) {
  const config = () => phoneLineConfig(env);
  const client = () => telnyx || (config().mock ? createMockTelnyxClient() : createTelnyxClient({ apiKey: config().apiKey }));

  async function currentLine(loAgentId) {
    const { data, error } = await supabase
      .from('lo_phone_lines')
      .select('*')
      .eq('lo_agent_id', loAgentId)
      .in('status', LIVE_STATUSES)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function patchLine(lineId, patch) {
    const { data, error } = await supabase
      .from('lo_phone_lines')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', lineId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const failLine = (lineId, message) => patchLine(lineId, { status: 'failed', provisioning_error: String(message || '').slice(0, 500) });

  async function claimLine(loAgentId, areaCode) {
    const existing = await currentLine(loAgentId);
    if (existing) return existing;
    const row = {
      lo_agent_id: loAgentId,
      requested_area_code: cleanAreaCode(areaCode) || null,
      status: 'searching',
      tool_token: randomBytes(32).toString('base64url'),
      is_mock: config().mock,
    };
    const { data, error } = await supabase.from('lo_phone_lines').insert(row).select('*').maybeSingle();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        const won = await currentLine(loAgentId);
        if (won) return won;
      }
      throw error;
    }
    return data;
  }

  function reservationIsLive(line) {
    if (!line?.reserved_number || !line?.telnyx_reservation_id || !line?.reservation_expires_at) return false;
    return new Date(line.reservation_expires_at).getTime() > Date.now();
  }

  // Find a real number in the area code and HOLD it at its real price. Buys nothing.
  async function previewNumber(loAgentId, areaCode) {
    const code = cleanAreaCode(areaCode);
    if (!code) return { ok: false, reason: 'bad_area_code', error: 'Enter a 3-digit US area code.' };

    let line = await claimLine(loAgentId, code);
    if (line.phone_number) return { ok: true, line }; // already owns one — never a second

    // New area code, or retrying after a failure: start the hold over.
    if (line.requested_area_code !== code || line.status === 'failed') {
      line = await patchLine(line.id, {
        requested_area_code: code, status: 'searching', provisioning_error: null,
        reserved_number: null, reserved_monthly_cost: null, reserved_currency: null,
        telnyx_reservation_id: null, reservation_expires_at: null,
      });
    }
    if (reservationIsLive(line)) return { ok: true, line };

    const search = await client().searchAvailableNumbers({ areaCode: code, countryCode: 'US', limit: 10 });
    if (!search.ok) return { ok: false, line: await failLine(line.id, search.error), reason: 'search_failed' };
    const candidate = (search.data || []).find((n) => normalizePhone(n.phoneNumber) && n.monthlyCost);
    if (!candidate) {
      return { ok: false, line: await failLine(line.id, `No numbers are available in the ${code} area code right now. Try a nearby area code.`), reason: 'none_available' };
    }
    const held = await client().reserveNumber({ phoneNumber: candidate.phoneNumber, customerReference: `hlai-line-${line.id}` });
    if (!held.ok) return { ok: false, line: await failLine(line.id, held.error), reason: 'reservation_failed' };
    const entry = (held.data?.phone_numbers || [])[0] || {};
    line = await patchLine(line.id, {
      status: 'searching',
      provisioning_error: null,
      reserved_number: normalizePhone(entry.phone_number || candidate.phoneNumber),
      reserved_monthly_cost: candidate.monthlyCost,
      reserved_currency: candidate.currency || 'USD',
      telnyx_reservation_id: held.data?.id || null,
      reservation_expires_at: entry.expired_at || null,
    });
    return { ok: true, line };
  }

  async function recoverOrderedNumber(line) {
    if (!line.telnyx_order_id) return null;
    const order = await client().getNumberOrder(line.telnyx_order_id);
    if (!order.ok) return null;
    const number = normalizePhone((order.data?.phone_numbers || [])[0]?.phone_number);
    if (!number) return null;
    console.warn('[LO Phone] recovered number from interrupted order', { line: line.id, number: maskPhone(number) });
    return patchLine(line.id, { phone_number: number, status: 'configuring' });
  }

  // Buy the held number and point it at our voice app. Never retried automatically.
  async function buyNumber(loAgentId) {
    const cfg = config();
    let line = await currentLine(loAgentId);
    if (!line) return { ok: false, reason: 'no_line', error: 'Pick an area code first.' };
    if (line.phone_number && line.status === 'active') return { ok: true, line };

    try {
      if (!line.phone_number && line.status === 'ordering') {
        const recovered = await recoverOrderedNumber(line);
        if (recovered) line = recovered;
        else return { ok: false, line, reason: 'order_in_progress', error: 'Your number order is still finishing. Refresh in a minute.' };
      }

      if (!line.phone_number) {
        if (!reservationIsLive(line)) return { ok: false, line, reason: 'hold_expired', error: 'That number hold expired. Pick your area code again.' };
        const candidate = normalizePhone(line.reserved_number);
        line = await patchLine(line.id, { status: 'ordering', provisioning_error: null }); // intent BEFORE the order
        const order = await client().orderNumber({ phoneNumber: candidate, connectionId: cfg.connectionId || undefined, customerReference: `hlai-line-${line.id}` });
        if (!order.ok) return { ok: false, line: await failLine(line.id, order.error), reason: 'order_failed', error: order.error };
        line = await patchLine(line.id, {
          phone_number: normalizePhone((order.data?.phone_numbers || [])[0]?.phone_number) || candidate,
          telnyx_order_id: order.data?.id || null,
          telnyx_connection_id: cfg.connectionId || null,
          monthly_cost: line.reserved_monthly_cost,
          status: 'configuring',
          reserved_number: null, reserved_monthly_cost: null, reserved_currency: null,
          telnyx_reservation_id: null, reservation_expires_at: null,
        });
      }

      if (!line.telnyx_phone_number_id) {
        const listed = await client().listPhoneNumbers({ phoneNumber: line.phone_number });
        const found = listed.ok ? (listed.data || [])[0] : null;
        if (found?.id) line = await patchLine(line.id, { telnyx_phone_number_id: found.id });
      }
      if (line.telnyx_phone_number_id && cfg.connectionId) {
        const attached = await client().setNumberVoiceConnection(line.telnyx_phone_number_id, cfg.connectionId);
        if (!attached.ok && !attached.retryable) return { ok: false, line: await failLine(line.id, attached.error), reason: 'connection_failed', error: attached.error };
      }

      line = await patchLine(line.id, { status: 'active', provisioning_error: null, activated_at: line.activated_at || new Date().toISOString() });
      console.log('[LO Phone] number active', { line: line.id, number: maskPhone(line.phone_number), mock: cfg.mock });
      return { ok: true, line };
    } catch (err) {
      console.error('[LO Phone] provisioning error', { line: line?.id, error: err?.message || err });
      const failed = line?.id ? await failLine(line.id, 'Something went wrong setting up your number. Try again.') : line;
      return { ok: false, line: failed, reason: 'exception', error: 'Something went wrong setting up your number. Try again.' };
    }
  }

  // What the page may show. Never the tool token or Telnyx ids.
  function publicView(line) {
    if (!line) return null;
    return {
      status: line.status,
      phoneNumber: line.phone_number || null,
      areaCode: line.requested_area_code || null,
      reservedNumber: reservationIsLive(line) ? line.reserved_number : null,
      reservedMonthlyCost: reservationIsLive(line) ? line.reserved_monthly_cost : null,
      reservationExpiresAt: reservationIsLive(line) ? line.reservation_expires_at : null,
      monthlyCost: line.monthly_cost || null,
      error: line.status === 'failed' ? line.provisioning_error : null,
      isTest: Boolean(line.is_mock),
      aiAnswering: false, // turns on when the OpenAI voice link ships (next slice)
    };
  }

  return { currentLine, claimLine, previewNumber, buyNumber, publicView, reservationIsLive };
}

module.exports = { createLoPhoneLineService, phoneLineConfig, isEnabledFor, cleanAreaCode, normalizePhone, maskPhone, LIVE_STATUSES };
