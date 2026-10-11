'use strict';

// Telnyx stops the AI phone line the moment its balance hits zero (this happened on 2026-10-10).
// Auto-recharge is the main fix; this is the backup: an email to the owner, at most once a day,
// when the balance drops under the threshold.

const createTelnyxBalanceWatch = ({ fetchImpl = globalThis.fetch, apiKey = process.env.TELNYX_API_KEY, threshold = Number(process.env.TELNYX_LOW_BALANCE) || 20, sendEmail, ownerEmail = process.env.OWNER_ALERT_EMAIL || 'homelistingai@gmail.com', now = () => new Date() } = {}) => {
  let lastAlertDay = '';
  return async function check() {
    if (!apiKey || typeof fetchImpl !== 'function') return { skipped: 'not_configured' };
    let balance = null;
    try {
      const res = await fetchImpl('https://api.telnyx.com/v2/balance', { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) return { skipped: `telnyx_${res.status}` };
      const json = await res.json();
      balance = Number(json?.data?.balance);
    } catch (_e) { return { skipped: 'unreachable' }; }
    if (!Number.isFinite(balance)) return { skipped: 'no_balance' };
    if (balance >= threshold) return { ok: true, balance };
    const day = now().toISOString().slice(0, 10);
    if (lastAlertDay === day) return { low: true, balance, alerted: false };
    lastAlertDay = day;
    if (sendEmail) {
      try {
        await sendEmail({
          to: ownerEmail,
          subject: `Telnyx balance is low: $${balance.toFixed(2)}`,
          html: `<p>Your Telnyx balance is <strong>$${balance.toFixed(2)}</strong>. If it reaches $0, every AI phone line stops answering.</p><p>Add credit at portal.telnyx.com, or check that Auto-recharge is on (Billing &rarr; Payments).</p>`,
        });
      } catch (_e) { /* an alert must never break the job */ }
    }
    return { low: true, balance, alerted: true };
  };
};

module.exports = { createTelnyxBalanceWatch };
