// backend/services/listingAlertService.js
'use strict';

const STOP_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);

function normalizeAlertPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

function isStopKeyword(text) {
  if (!text) return false;
  return STOP_KEYWORDS.has(String(text).trim().toUpperCase());
}

function formatPrice(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '';
  return `$${Math.round(num).toLocaleString('en-US')}`;
}

function detectPriceDrop(oldPrice, newPrice) {
  const o = Number(oldPrice);
  const n = Number(newPrice);
  if (!Number.isFinite(o) || !Number.isFinite(n)) return false;
  if (o <= 0 || n <= 0) return false;
  return n < o;
}

function buildPriceDropMessage({ address, oldPrice, newPrice }) {
  const where = address || 'a home you saved';
  return `Price drop on ${where} — now ${formatPrice(newPrice)} (was ${formatPrice(oldPrice)}). Reply for details. Reply STOP to opt out.`;
}

// --- helpers that read a filtered list compatibly with the real + fake client ---
async function fetchRows(supabase, table, filters) {
  let q = supabase.from(table).select('*');
  Object.entries(filters).forEach(([c, v]) => { q = q.eq(c, v); });
  const { data, error } = await q;            // real client resolves the builder
  if (error) throw error;
  return data || [];
}

async function subscribeToListing(deps, { listingId, agentId, phone, visitorId, consentText }) {
  const { supabase, logger } = deps;
  const normalized = normalizeAlertPhone(phone);
  if (!listingId || !normalized) return { ok: false, reason: 'invalid_input' };
  try {
    await supabase.from('listing_alert_subscribers').upsert({
      listing_id: listingId,
      agent_id: agentId || null,
      phone: normalized,
      visitor_id: visitorId || null,
      status: 'active',
      consent_text: consentText || null,
      consent_at: new Date().toISOString(),
    });
    return { ok: true, phone: normalized };
  } catch (err) {
    logger?.error?.('subscribeToListing failed', err);
    return { ok: false, reason: 'db_error' };
  }
}

async function createPendingAlert(deps, { listingId, agentId, type, payload }) {
  const { supabase } = deps;
  const subs = await fetchRows(supabase, 'listing_alert_subscribers', { listing_id: listingId, status: 'active' });
  const { data } = await supabase.from('listing_alert_pending').insert({
    listing_id: listingId,
    agent_id: agentId || null,
    type,
    payload: payload || {},
    recipient_count: subs.length,
    status: 'pending',
    created_at: new Date().toISOString(),
  }).select('*').single();
  return { pendingId: data?.id || null, recipientCount: subs.length };
}

async function sendAlert(deps, { pendingId }) {
  const { supabase, sendSms, logger } = deps;
  const { data: pending } = await supabase.from('listing_alert_pending')
    .select('*').eq('id', pendingId).maybeSingle();
  if (!pending || pending.status !== 'pending') return { sent: 0, skipped: 0, reason: 'not_pending' };

  const message = pending.payload?.message
    || buildPriceDropMessage(pending.payload || {});
  const subs = await fetchRows(supabase, 'listing_alert_subscribers', { listing_id: pending.listing_id, status: 'active' });
  const suppressed = new Set(
    (await fetchRows(supabase, 'sms_suppression', {})).map((r) => r.phone)
  );

  let sent = 0; let skipped = 0;
  for (const sub of subs) {
    if (suppressed.has(sub.phone)) { skipped += 1; continue; }
    try {
      const ok = await sendSms(sub.phone, message, [], pending.agent_id || null);
      if (ok) {
        sent += 1;
        await supabase.from('listing_alert_subscribers')
          .update({ last_alerted_at: new Date().toISOString() }).eq('id', sub.id);
      } else { skipped += 1; }
    } catch (err) { logger?.error?.('sendAlert send failed', err); skipped += 1; }
  }

  await supabase.from('listing_alert_pending')
    .update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', pendingId);
  return { sent, skipped };
}

async function suppressPhone(deps, { phone, reason }) {
  const { supabase } = deps;
  const normalized = normalizeAlertPhone(phone) || phone;
  await supabase.from('sms_suppression').upsert({
    phone: normalized, reason: reason || 'stop_reply', created_at: new Date().toISOString(),
  });
  await supabase.from('listing_alert_subscribers')
    .update({ status: 'unsubscribed' }).eq('phone', normalized);
  return { ok: true, phone: normalized };
}

module.exports = {
  normalizeAlertPhone,
  isStopKeyword,
  formatPrice,
  detectPriceDrop,
  buildPriceDropMessage,
  subscribeToListing,
  createPendingAlert,
  sendAlert,
  suppressPhone,
};
