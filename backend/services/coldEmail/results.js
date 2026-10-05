'use strict';

// Pure aggregation so it can be tested without a database.
const empty = () => ({ sent: 0, bounced: 0, complained: 0, clicked: 0, replies: 0, positive: 0 });

const add = (bucket, send) => {
  if (send.status !== 'sent') return;
  bucket.sent += 1;
  if (send.bounced_at) bucket.bounced += 1;
  if (send.complained_at) bucket.complained += 1;
  if (send.clicked_at) bucket.clicked += 1;
  if (send.replied_at) bucket.replies += 1;
  if (send.reply_class === 'interested') bucket.positive += 1;
};

const rates = (b) => ({
  ...b,
  bounceRate: b.sent ? +(b.bounced / b.sent * 100).toFixed(1) : 0,
  complaintRate: b.sent ? +(b.complained / b.sent * 100).toFixed(2) : 0,
  replyRate: b.sent ? +(b.replies / b.sent * 100).toFixed(1) : 0,
  positivePer100: b.sent ? +(b.positive / b.sent * 100).toFixed(1) : 0
});

const MIN_SENDS_FOR_WINNER = 100;

const computeResults = (sends, { trialsStarted = 0, demosBooked = 0 } = {}) => {
  const total = empty();
  const groups = { angle: {}, opener: {}, touch: {}, variant: {} };
  for (const s of sends) {
    add(total, s);
    for (const [dim, key] of [['angle', s.angle], ['opener', s.opener], ['touch', String(s.touch)], ['variant', s.variant_id]]) {
      if (!key) continue;
      groups[dim][key] = groups[dim][key] || empty();
      add(groups[dim][key], s);
    }
  }
  const out = { total: { ...rates(total), trialsStarted, demosBooked }, byAngle: {}, byOpener: {}, byTouch: {}, byVariant: {} };
  const names = { angle: 'byAngle', opener: 'byOpener', touch: 'byTouch', variant: 'byVariant' };
  for (const dim of Object.keys(groups)) for (const [k, v] of Object.entries(groups[dim])) out[names[dim]][k] = rates(v);
  out.winner = pickWinner(out);
  out.summary = summarize(out);
  return out;
};

// Primary metric: positive replies per 100 sends. Needs 100 sends in a group before it can win.
const pickWinner = (r) => {
  const best = (group) => Object.entries(group).filter(([, v]) => v.sent >= MIN_SENDS_FOR_WINNER).sort((a, b) => b[1].positivePer100 - a[1].positivePer100)[0];
  const angle = best(r.byAngle);
  const opener = best(r.byOpener);
  return { angle: angle ? angle[0] : null, opener: opener ? opener[0] : null };
};

const summarize = (r) => {
  const t = r.total;
  if (!t.sent) return 'Nothing has been sent yet.';
  const parts = [`${t.sent} sent, ${t.positive} positive repl${t.positive === 1 ? 'y' : 'ies'} (${t.positivePer100} per 100), ${t.replies} replies in all.`];
  if (r.winner.angle) parts.push(`Best angle so far: ${r.winner.angle.replace(/_/g, ' ')}.`);
  else parts.push(`No winner yet. Each group needs ${MIN_SENDS_FOR_WINNER} sends before we pick one.`);
  if (t.bounceRate > 3) parts.push(`Bounce rate is ${t.bounceRate}%. That is too high.`);
  return parts.join(' ');
};

module.exports = { computeResults, pickWinner, MIN_SENDS_FOR_WINNER };
