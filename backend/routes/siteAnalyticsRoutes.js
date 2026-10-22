'use strict';
// Own, cookie-free site analytics.
// POST /api/track (public, rate limited): one page view or click. Stores path only (no query/hash), a random
// browser id, the referrer host and phone/computer. No names, emails or IPs.
// GET /api/admin/site-analytics (admin): totals for the front page of the admin dashboard.
const express = require('express');

const MAX_ROWS = 50000;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|curl|wget/i;

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function normalizeEvent(body, userAgent) {
  const b = body && typeof body === 'object' ? body : {};
  const type = b.type === 'click' ? 'click' : b.type === 'view' ? 'view' : null;
  let path = clean(b.path, 300).split('?')[0].split('#')[0];
  if (!type || !path.startsWith('/')) return null;
  if (BOT.test(userAgent || '')) return null;
  let refHost = '';
  try { refHost = b.ref ? new URL(String(b.ref)).hostname.replace(/^www\./, '').slice(0, 120) : ''; } catch { refHost = ''; }
  return {
    type,
    path,
    label: type === 'click' ? clean(b.label, 80) || null : null,
    visitor_id: clean(b.vid, 40).replace(/[^a-zA-Z0-9-]/g, '') || null,
    referrer_host: refHost || null,
    device: /mobile|iphone|android/i.test(userAgent || '') ? 'phone' : 'computer'
  };
}

const top = (counts, n) => [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

function summarize(rows, days, now = new Date()) {
  const visitors = new Set();
  const byDay = new Map();
  const pages = new Map(), clicks = new Map(), refs = new Map(), devices = new Map();
  let views = 0, clickCount = 0;
  for (const r of rows) {
    const day = String(r.created_at).slice(0, 10);
    if (r.type === 'view') {
      views += 1;
      bump(pages, r.path);
      if (r.referrer_host) bump(refs, r.referrer_host);
      if (r.device) bump(devices, r.device);
      if (!byDay.has(day)) byDay.set(day, { views: 0, visitors: new Set() });
      const d = byDay.get(day);
      d.views += 1;
      if (r.visitor_id) d.visitors.add(r.visitor_id);
    } else {
      clickCount += 1;
      bump(clicks, r.label || r.path);
    }
    if (r.visitor_id) visitors.add(r.visitor_id);
  }
  const daily = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    const d = byDay.get(day);
    daily.push({ day, views: d ? d.views : 0, visitors: d ? d.visitors.size : 0 });
  }
  const pick = (m, n, key) => top(m, n).map(([name, count]) => ({ [key]: name, count }));
  return {
    days, visitors: visitors.size, views, clicks: clickCount,
    clickRate: views ? Math.round((clickCount / views) * 1000) / 10 : 0,
    daily, topPages: pick(pages, 8, 'path'), topClicks: pick(clicks, 8, 'label'),
    topReferrers: pick(refs, 6, 'host'), devices: pick(devices, 2, 'device'),
    truncated: rows.length >= MAX_ROWS
  };
}

function register(app, { verifyAdmin, supabaseAdmin, limiter }) {
  const guard = limiter || ((req, res, next) => next());
  app.post('/api/track', guard, express.json({ limit: '2kb' }), async (req, res) => {
    try {
      const row = normalizeEvent(req.body, req.get('user-agent'));
      if (row && supabaseAdmin) await Promise.resolve(supabaseAdmin.from('site_events').insert(row)).then((r) => r, () => null);
    } catch { /* never bother the visitor */ }
    res.status(204).end();
  });

  app.get('/api/admin/site-analytics', verifyAdmin, async (req, res) => {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
    try {
      const since = new Date(Date.now() - (days - 1) * 86400000);
      since.setUTCHours(0, 0, 0, 0);
      const { data, error } = await supabaseAdmin.from('site_events')
        .select('created_at,type,path,label,visitor_id,referrer_host,device')
        .gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(MAX_ROWS);
      if (error) return res.status(503).json({ error: 'not_available', detail: error.code || null });
      res.json(summarize(data || [], days));
    } catch (err) {
      res.status(500).json({ error: 'site_analytics_failed' });
    }
  });
}

module.exports = { register, normalizeEvent, summarize };
