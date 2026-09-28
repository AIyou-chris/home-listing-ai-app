'use strict';

// Telnyx, in one place — phone numbers only for now (search, hold, buy, attach).
// Ported from An AI You (ai-landing-template/server/lib/telnyx/client.cjs), which
// has run this flow in production. Calls/answering come in the next slice.
//
// Rules carried over on purpose:
//  * Only numbers returned by a search can be ordered (search → reserve → order).
//  * A reservation holds ONE number at its REAL price while the LO confirms.
//  * Nothing here throws for an ordinary Telnyx refusal; callers get { ok:false, error }.
//  * The mock is the default. Real money is only spent when live provisioning is
//    explicitly armed AND an API key exists (see phoneLineConfig).

const TELNYX_BASE = 'https://api.telnyx.com/v2';
const DEFAULT_TIMEOUT_MS = 20000;

function describeError(status, payload) {
  const first = Array.isArray(payload?.errors) ? payload.errors[0] : null;
  if (first) {
    const detail = String(first.detail || first.title || '').trim();
    if (detail) return detail.slice(0, 300);
  }
  if (status === 401 || status === 403) return 'Telnyx refused the account credentials.';
  if (status === 404) return 'Telnyx could not find that resource.';
  if (status === 422) return 'Telnyx rejected the request as invalid.';
  if (status === 429) return 'Telnyx is rate limiting us. Try again shortly.';
  if (status >= 500) return 'Telnyx had a problem at their end. Try again shortly.';
  return `Telnyx answered ${status}.`;
}

function isRetryable(status) {
  return status === 429 || status >= 500;
}

function createTelnyxClient({ apiKey, fetchImpl, timeoutMs = DEFAULT_TIMEOUT_MS, baseUrl = TELNYX_BASE } = {}) {
  const doFetch = fetchImpl || globalThis.fetch;

  async function request(method, path, { body, query } = {}) {
    if (!apiKey) return { ok: false, status: 0, error: 'Telnyx is not connected on this deployment.', retryable: false };
    let url = `${baseUrl}${path}`;
    if (query) {
      const search = new URLSearchParams(query).toString();
      if (search) url += `?${search}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await doFetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      const raw = await response.text();
      let payload = null;
      if (raw) {
        try { payload = JSON.parse(raw); } catch { payload = null; }
      }
      if (!response.ok) {
        console.error('[Telnyx] api error', { method, path, status: response.status, body: raw ? raw.slice(0, 1000) : '' });
        return { ok: false, status: response.status, error: describeError(response.status, payload), retryable: isRetryable(response.status) };
      }
      return { ok: true, data: payload?.data ?? payload ?? null };
    } catch (error) {
      const aborted = error?.name === 'AbortError';
      return { ok: false, status: 0, error: aborted ? 'Telnyx did not answer in time.' : 'Could not reach Telnyx.', retryable: true };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    name: 'telnyx',
    mock: false,
    request,

    // best_effort OFF: an LO who asked for 509 must not be quietly sold a number in another state.
    async searchAvailableNumbers({ areaCode, countryCode = 'US', limit = 10 } = {}) {
      const query = {
        'filter[country_code]': countryCode,
        'filter[phone_number_type]': 'local',
        'filter[features][]': 'voice',
        'filter[limit]': String(Math.min(Math.max(Number(limit) || 10, 1), 50)),
        'filter[best_effort]': 'false',
      };
      if (areaCode) query['filter[national_destination_code]'] = String(areaCode);
      const result = await request('GET', '/available_phone_numbers', { query });
      if (!result.ok) return result;
      const numbers = (Array.isArray(result.data) ? result.data : [])
        .map((row) => ({
          phoneNumber: String(row?.phone_number || '').trim(),
          monthlyCost: String(row?.cost_information?.monthly_cost || '').trim(),
          currency: String(row?.cost_information?.currency || '').trim() || 'USD',
        }))
        .filter((entry) => entry.phoneNumber && entry.monthlyCost); // never offer a number we can't price
      return { ok: true, data: numbers };
    },

    async reserveNumber({ phoneNumber, customerReference, attempts = 3, waitMs = 700, wait } = {}) {
      const sleep = wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
      const created = await request('POST', '/number_reservations', {
        body: {
          phone_numbers: [{ phone_number: phoneNumber }],
          ...(customerReference ? { customer_reference: String(customerReference).slice(0, 128) } : {}),
        },
      });
      if (!created.ok) return created;
      let reservation = created.data;
      for (let attempt = 0; attempt < attempts; attempt++) {
        const entry = (reservation?.phone_numbers || [])[0];
        if (entry?.status === 'success') return { ok: true, data: reservation };
        if (entry?.status === 'failure') return { ok: false, status: 409, error: 'That number was just taken. Try again for a new one.', retryable: true };
        if (attempt === attempts - 1) break;
        await sleep(waitMs);
        const checked = await request('GET', `/number_reservations/${encodeURIComponent(reservation.id)}`);
        if (checked.ok) reservation = checked.data;
      }
      return { ok: false, status: 0, error: 'Could not confirm that number in time. Try again.', retryable: true };
    },

    // connection_id goes IN the order so a bought number is never attached to nothing.
    async orderNumber({ phoneNumber, connectionId, customerReference } = {}) {
      return request('POST', '/number_orders', {
        body: {
          phone_numbers: [{ phone_number: phoneNumber }],
          ...(connectionId ? { connection_id: connectionId } : {}),
          ...(customerReference ? { customer_reference: String(customerReference).slice(0, 128) } : {}),
        },
      });
    },

    async getNumberOrder(orderId) {
      return request('GET', `/number_orders/${encodeURIComponent(orderId)}`);
    },

    async listPhoneNumbers({ phoneNumber } = {}) {
      return request('GET', '/phone_numbers', { query: phoneNumber ? { 'filter[phone_number]': phoneNumber } : undefined });
    },

    async setNumberVoiceConnection(phoneNumberId, connectionId) {
      return request('PATCH', `/phone_numbers/${encodeURIComponent(phoneNumberId)}`, { body: { connection_id: connectionId } });
    },

    // ── Live call control (Voice API app). Each is one command on one call leg. ──
    async callAction(callControlId, action, body = {}) {
      return request('POST', `/calls/${encodeURIComponent(callControlId)}/actions/${action}`, { body });
    },
  };
}

// Costs nothing and buys nothing. Numbers are 555-01xx, reserved for fiction.
function createMockTelnyxClient({ now = () => Date.now() } = {}) {
  let sequence = 0;
  const next = () => `${now()}-${++sequence}`;
  return {
    name: 'telnyx-mock',
    mock: true,
    async searchAvailableNumbers({ areaCode, limit = 10 } = {}) {
      const code = String(areaCode || '555').replace(/\D/g, '').slice(0, 3).padStart(3, '5');
      return {
        ok: true,
        data: Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
          phoneNumber: `+1${code}555${String(100 + i).padStart(4, '0')}`,
          monthlyCost: '1.00',
          currency: 'USD',
        })),
      };
    },
    async reserveNumber({ phoneNumber }) {
      return {
        ok: true,
        data: {
          id: `mock-reservation-${next()}`,
          status: 'success',
          phone_numbers: [{ phone_number: phoneNumber, status: 'success', expired_at: new Date(now() + 15 * 60 * 1000).toISOString() }],
        },
      };
    },
    async orderNumber({ phoneNumber }) {
      return { ok: true, data: { id: `mock-order-${next()}`, status: 'success', phone_numbers: [{ phone_number: phoneNumber }] } };
    },
    async getNumberOrder(orderId) {
      return { ok: true, data: { id: orderId, status: 'success', phone_numbers: [] } };
    },
    async listPhoneNumbers({ phoneNumber } = {}) {
      return { ok: true, data: [{ id: `mock-number-${next()}`, phone_number: phoneNumber }] };
    },
    async setNumberVoiceConnection() {
      return { ok: true, data: { record_type: 'phone_number' } };
    },
    async callAction(callControlId, action) {
      return { ok: true, data: { result: 'ok', call_control_id: callControlId, action } };
    },
  };
}

module.exports = { createTelnyxClient, createMockTelnyxClient, describeError, isRetryable, TELNYX_BASE };
