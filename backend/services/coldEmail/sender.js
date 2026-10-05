'use strict';

const { listUnsubscribeHeaders } = require('./compliance');

// Cold mail goes out from its OWN domain, never the product/transactional domain.
// Env: COLD_EMAIL_DOMAIN (Mailgun sending domain), COLD_EMAIL_MAILBOXES ("Chris Potter <chris@domain>, ..."),
//      COLD_EMAIL_MAILGUN_API_KEY (falls back to MAILGUN_API_KEY), COLD_EMAIL_ENABLED=true to turn sending on.
const readConfig = (env = process.env) => {
  const domain = String(env.COLD_EMAIL_DOMAIN || '').trim().toLowerCase();
  const mailboxes = String(env.COLD_EMAIL_MAILBOXES || '')
    .split(/,(?![^<]*>)/)
    .map((m) => m.trim())
    .filter(Boolean);
  const productDomain = String(env.MAILGUN_DOMAIN || 'mg.homelistingai.com').toLowerCase();
  const addressOf = (m) => (m.match(/<([^>]+)>/) || [null, m])[1].toLowerCase();
  const sameAsProduct = mailboxes.some((m) => addressOf(m).endsWith(`@${productDomain}`)) || domain === productDomain || domain === 'homelistingai.com';
  return {
    enabled: String(env.COLD_EMAIL_ENABLED || '').toLowerCase() === 'true',
    domain,
    mailboxes,
    apiKey: env.COLD_EMAIL_MAILGUN_API_KEY || env.MAILGUN_API_KEY || '',
    siteUrl: String(env.PUBLIC_SITE_URL || 'https://homelistingai.com').replace(/\/+$/, ''),
    backendUrl: String(env.BACKEND_BASE_URL || env.RENDER_EXTERNAL_URL || 'https://home-listing-ai-backend.onrender.com').replace(/\/+$/, ''),
    maxPerMailbox: Number(env.COLD_EMAIL_MAX_PER_MAILBOX) || 60,
    sameAsProduct,
    addressOf
  };
};

// What still blocks real sending (shown in the admin checklist).
const blockers = (cfg) => {
  const out = [];
  if (!cfg.domain) out.push('Set COLD_EMAIL_DOMAIN to a separate sending domain.');
  if (cfg.sameAsProduct) out.push('The cold-email domain must not be the product domain (homelistingai.com / mg.homelistingai.com).');
  if (!cfg.mailboxes.length) out.push('Set COLD_EMAIL_MAILBOXES (one or more "Name <address@sending-domain>").');
  if (!cfg.apiKey) out.push('No Mailgun API key for the cold-email domain.');
  if (!cfg.enabled) out.push('COLD_EMAIL_ENABLED is not "true", so nothing sends yet.');
  return out;
};

const sendColdEmail = async ({ cfg, mailbox, to, subject, text, unsubscribeUrl, sendId, fetchImpl = fetch }) => {
  const form = new FormData();
  form.append('from', mailbox);
  form.append('to', to);
  form.append('subject', subject);
  form.append('text', text);
  form.append('h:Reply-To', mailbox);
  const headers = listUnsubscribeHeaders({ unsubscribeUrl, mailto: cfg.addressOf(mailbox) });
  for (const [k, v] of Object.entries(headers)) form.append(`h:${k}`, v);
  form.append('o:tracking', 'no');
  form.append('o:tracking-clicks', 'no');
  form.append('o:tracking-opens', 'no');
  form.append('o:tag', 'cold-email');
  if (sendId) form.append('v:cold_send_id', sendId);
  const auth = Buffer.from(`api:${cfg.apiKey}`).toString('base64');
  const res = await fetchImpl(`https://api.mailgun.net/v3/${cfg.domain}/messages`, { method: 'POST', headers: { Authorization: `Basic ${auth}` }, body: form });
  if (!res.ok) throw new Error(`mailgun_${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json().catch(() => ({}));
  return { messageId: body.id || null };
};

module.exports = { readConfig, blockers, sendColdEmail };
