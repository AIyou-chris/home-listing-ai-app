'use strict';
// Mailgun stats give a number, {total}, or a nested object (failed = {temporary:{}, permanent:{}}).
// Always return a plain number so totals never turn into "0[object Object]".
function statCount(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (!v || typeof v !== 'object') return 0;
  if (typeof v.total === 'number') return v.total;
  return Object.values(v).reduce((sum, x) => sum + statCount(x), 0);
}

function sumMailgunStats(days = []) {
  const keys = ['accepted', 'delivered', 'failed', 'opened', 'clicked', 'unsubscribed', 'complained'];
  const totals = Object.fromEntries(keys.map(k => [k, 0]));
  for (const day of days) for (const k of keys) totals[k] += statCount(day?.[k]);
  return totals;
}

module.exports = { statCount, sumMailgunStats };
