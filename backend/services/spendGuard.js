'use strict';

// Spend guard: hard daily/monthly stops on everything that costs money (AI, voice, texts, email,
// number purchases, translation). Counters live in memory, so a restart resets them. That is the
// intended trade-off: this is a ceiling against a runaway bug or abuse, not an exact meter.
// Every limit can be raised or lowered from Render env without a code change.
// When a stop trips, the owner gets ONE email per day per stop (see setAlertSender).

const { AsyncLocalStorage } = require('async_hooks');

const num = (name, fallback) => {
  const v = parseInt(process.env[name] || '', 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

// One place for every limit. Names are the Render env vars that override them.
const buildLimits = () => ({
  // Weighted AI units per day for the whole platform (chat call = 1, voice clip = 3, picture = 20).
  openai_units_day: num('SPEND_OPENAI_UNITS_DAY', 8000),
  openai_images_day: num('SPEND_OPENAI_IMAGES_DAY', 60),
  typesafe_calls_day: num('SPEND_TYPESAFE_CALLS_DAY', 20000),
  translate_calls_day: num('SPEND_TRANSLATE_CALLS_DAY', 1500),
  sms_day: num('SPEND_SMS_DAY', 300),
  sms_per_number_day: num('SPEND_SMS_PER_NUMBER_DAY', 3),
  sms_account_month_default: num('SPEND_SMS_ACCOUNT_MONTH', 300),
  email_day: num('SPEND_EMAIL_DAY', 3000),
  email_per_address_day: num('SPEND_EMAIL_PER_ADDRESS_DAY', 12),
  ai_calls_day: num('SPEND_AI_CALLS_DAY', 150),
  ai_calls_per_caller_day: num('SPEND_AI_CALLS_PER_CALLER_DAY', 4),
  number_purchases_day: num('SPEND_NUMBER_PURCHASES_DAY', 3),
  reels_day: num('SPEND_REELS_DAY', 60),
  reels_account_month: num('SPEND_REELS_ACCOUNT_MONTH', 40),
  hoa_reads_day: num('SPEND_HOA_READS_DAY', 80),
  hoa_reads_account_day: num('SPEND_HOA_READS_ACCOUNT_DAY', 15),
  voice_previews_account_day: num('SPEND_VOICE_PREVIEWS_ACCOUNT_DAY', 30),
});

const dayKey = (d) => d.toISOString().slice(0, 10);
const monthKey = (d) => d.toISOString().slice(0, 7);

const createSpendGuard = ({ now = () => new Date(), limits = buildLimits() } = {}) => {
  const counters = new Map(); // `${window}:${kind}:${scope}:${bucket}` -> number
  const alerted = new Set(); // `${day}:${kind}`
  const bypass = new AsyncLocalStorage();
  let alertSender = null;

  const prune = () => {
    if (counters.size < 20000) return;
    const today = dayKey(now());
    const month = monthKey(now());
    for (const k of counters.keys()) {
      const bucket = k.split('|').pop();
      if (bucket !== today && bucket !== month) counters.delete(k);
    }
  };

  const keyFor = (window, kind, scope) => `${window}|${kind}|${scope}|${window === 'month' ? monthKey(now()) : dayKey(now())}`;

  const used = (window, kind, scope = 'all') => counters.get(keyFor(window, kind, scope)) || 0;

  const trip = (kind, detail) => {
    const k = `${dayKey(now())}|${kind}`;
    if (alerted.has(k)) return;
    alerted.add(k);
    try {
      if (alertSender) alertSender({ kind, detail });
    } catch (_e) { /* an alert must never break the request */ }
  };

  // Try to spend `units` against every rule. Nothing is counted unless ALL rules allow it.
  // rules: [{ window: 'day'|'month', scope: 'all'|<id>, limit, label }]
  const take = (kind, rules, units = 1) => {
    if (bypass.getStore()) return { ok: true, bypassed: true };
    prune();
    for (const r of rules) {
      if (r.limit == null) continue; // no limit configured for this rule
      const have = used(r.window, kind, r.scope);
      if (have + units > r.limit) {
        const label = r.label || `${kind} ${r.window} limit`;
        trip(`${kind}:${r.scope === 'all' ? 'all' : 'one'}`, `${label} reached (${r.limit}).`);
        return { ok: false, reason: label, limit: r.limit };
      }
    }
    for (const r of rules) {
      if (r.limit == null) continue;
      const k = keyFor(r.window, kind, r.scope);
      counters.set(k, (counters.get(k) || 0) + units);
    }
    return { ok: true };
  };

  const stopError = (kind, result) => {
    const err = new Error(`spend_guard_stop:${kind}:${result.reason}`);
    err.code = 'spend_guard_stop';
    err.status = 429;
    return err;
  };

  // ── Named helpers: one per thing that costs money ──────────────────────────
  const l = limits;
  const api = {
    limits,
    used,
    take,
    stopError,
    setAlertSender(fn) { alertSender = fn; },
    runBypassed(fn) { return bypass.run(true, fn); }, // for the owner alert email itself
    alertOnce: (kind, detail) => trip(kind, detail),

    openai: (path) => {
      const isImage = /\/images\//.test(path);
      const isVoice = /\/audio\//.test(path);
      const units = isImage ? 20 : isVoice ? 3 : 1;
      const rules = [{ window: 'day', scope: 'all', limit: l.openai_units_day, label: 'Daily AI limit' }];
      if (isImage) rules.push({ window: 'day', scope: 'images', limit: l.openai_images_day * 20, label: 'Daily AI picture limit' });
      return take('openai', rules, units);
    },
    typesafe: () => take('typesafe', [{ window: 'day', scope: 'all', limit: l.typesafe_calls_day, label: 'Daily TypeSafe limit' }]),
    translate: () => take('translate', [{ window: 'day', scope: 'all', limit: l.translate_calls_day, label: 'Daily translation limit' }]),
    sms: ({ to, accountId = null, accountMonthLimit = null }) => {
      const rules = [
        { window: 'day', scope: 'all', limit: l.sms_day, label: 'Daily text limit' },
        { window: 'day', scope: `to:${to}`, limit: l.sms_per_number_day, label: 'Texts to one number today' },
      ];
      if (accountId) rules.push({ window: 'month', scope: `acct:${accountId}`, limit: accountMonthLimit ?? l.sms_account_month_default, label: 'Monthly texts for one account' });
      return take('sms', rules);
    },
    emailSend: () => take('email', [{ window: 'day', scope: 'all', limit: l.email_day, label: 'Daily email limit' }]),
    emailTo: ({ to }) => take('email_address', [
      { window: 'day', scope: `to:${String(to || '').toLowerCase()}`, limit: l.email_per_address_day, label: 'Emails to one address today' },
    ]),
    aiCall: ({ from }) => take('ai_call', [
      { window: 'day', scope: 'all', limit: l.ai_calls_day, label: 'Daily AI phone call limit' },
      { window: 'day', scope: `from:${from || 'unknown'}`, limit: l.ai_calls_per_caller_day, label: 'AI calls from one caller today' },
    ]),
    numberPurchase: () => take('number_purchase', [{ window: 'day', scope: 'all', limit: l.number_purchases_day, label: 'Daily phone number purchase limit' }]),
    reel: ({ accountId }) => take('reel', [
      { window: 'day', scope: 'all', limit: l.reels_day, label: 'Daily reel limit' },
      { window: 'month', scope: `acct:${accountId}`, limit: l.reels_account_month, label: 'Monthly reels for one account' },
    ]),
    hoaRead: ({ accountId }) => take('hoa_read', [
      { window: 'day', scope: 'all', limit: l.hoa_reads_day, label: 'Daily document-reader limit' },
      { window: 'day', scope: `acct:${accountId}`, limit: l.hoa_reads_account_day, label: 'Daily document reads for one account' },
    ]),
    voicePreview: ({ accountId }) => take('voice_preview', [
      { window: 'day', scope: `acct:${accountId}`, limit: l.voice_previews_account_day, label: 'Daily voice previews for one account' },
    ]),
    snapshot() {
      const out = {};
      for (const [k, v] of counters) {
        const [window, kind, scope, bucket] = k.split('|');
        if (scope === 'all' || scope === 'images') (out[`${kind}${scope === 'all' ? '' : ':' + scope}`] ||= {})[`${window}:${bucket}`] = v;
      }
      return { limits, used: out };
    },
    reset() { counters.clear(); alerted.clear(); },
  };
  return api;
};

// ── Network-level stop: wraps global fetch so EVERY paid call is counted, including ones made by
//    SDKs and services that were written before this existed. ─────────────────────────────────
const installFetchGuard = (guard, baseFetch = globalThis.fetch) => {
  if (typeof baseFetch !== 'function') return baseFetch;
  const guarded = async function guardedFetch(input, init) {
    let url = '';
    try { url = typeof input === 'string' ? input : (input && input.url) || String(input); } catch (_e) { url = ''; }
    let host = '';
    let path = '';
    try { const u = new URL(url); host = u.hostname; path = u.pathname; } catch (_e) { /* relative url: not ours */ }

    let result = null;
    let kind = null;
    if (host === 'api.openai.com') { kind = 'openai'; result = guard.openai(path); }
    else if (host === 'api.typesafe.ai') { kind = 'typesafe'; result = guard.typesafe(); }
    else if (host === 'translation.googleapis.com') { kind = 'translate'; result = guard.translate(); }
    else if (host === 'api.mailgun.net' && /\/messages$/.test(path)) { kind = 'email'; result = guard.emailSend(); }
    else if (host === 'api.telnyx.com' && /\/number_orders/.test(path) && String(init?.method || 'GET').toUpperCase() === 'POST') { kind = 'number_purchase'; result = guard.numberPurchase(); }

    if (result && !result.ok) throw guard.stopError(kind, result);
    return baseFetch.call(this, input, init);
  };
  guarded.__spendGuarded = true;
  return guarded;
};

const guard = createSpendGuard();

module.exports = { createSpendGuard, installFetchGuard, guard, buildLimits };
