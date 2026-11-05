'use strict';
// Loan officers' own social accounts and approve-first posting.
//   GET/POST/DELETE /api/lo/social/accounts...  connect Facebook, Instagram, LinkedIn, YouTube with the LO's own login
//   /api/lo/social/queue...                      AI drafts wait here; nothing posts until the LO taps Approve
// The OAuth callback is the shared /api/marketing/oauth/:platform/callback (it finds the LO's saved attempt there).
const { PLATFORMS, providerStatus, newVerifier, authorizeUrl } = require('../marketing-engine/services/houseSocialOauth');
const { createHouseSocialStore, LO_TABLES } = require('../marketing-engine/services/houseSocialStore');
const { createLoSocialPoster, LoPostError } = require('../services/loSocialPoster');

const isUuid = (v) => /^[0-9a-f-]{36}$/i.test(String(v || ''));

function createLoSocial({ supabaseAdmin, guard }) {
  const store = createHouseSocialStore({ supabaseAdmin, tables: LO_TABLES });
  const supaHost = (() => { try { return new URL(process.env.SUPABASE_URL || '').host; } catch { return ''; } })();
  // Only pictures from our own storage can go out with a post.
  const imageHostOk = (url) => { try { const u = new URL(url); return u.protocol === 'https:' && !!supaHost && u.host === supaHost; } catch { return false; } };
  const poster = createLoSocialPoster({ db: supabaseAdmin, guard, imageHostOk });
  return { store, poster };
}

function register(app, { requireAuth, resolveLoAgentId, supabaseAdmin, guard, runLoDraftWriter, draftTopics, runBackground }) {
  const { store, poster } = createLoSocial({ supabaseAdmin, guard });

  const action = (fn) => async (req, res) => {
    try {
      const loId = await resolveLoAgentId(req);
      if (!loId) return res.status(401).json({ error: 'unauthorized' });
      await fn(req, res, loId);
    } catch (err) {
      if (err instanceof LoPostError) return res.status(err.status).json({ error: err.message, ...(err.needsConnection ? { needsConnection: err.needsConnection } : {}), ...(err.needs ? { needs: err.needs } : {}) });
      if (/does not exist|schema cache/i.test(err?.message || '')) return res.status(503).json({ error: 'Social posting is not switched on yet.' });
      console.error('[LoSocial] failed:', err?.message || err);
      res.status(500).json({ error: 'Could not do that. Try again.' });
    }
  };
  const platformOf = (req) => String(req.params.platform || '').toLowerCase();

  app.get('/api/lo/social/accounts', requireAuth, action(async (req, res, loId) => {
    const rows = await store.list(loId);
    const byPlatform = Object.fromEntries(rows.map((r) => [r.platform, r]));
    res.json({
      accounts: PLATFORMS.map((platform) => {
        const row = byPlatform[platform];
        const setup = providerStatus(platform);
        return {
          platform, status: row ? row.status : 'not_connected', label: row?.account_label || '',
          connectedAt: row?.connected_at || null, available: setup.configured, canPost: poster.POST_CHANNELS.includes(platform)
        };
      })
    });
  }));

  app.post('/api/lo/social/accounts/:platform/connect', requireAuth, action(async (req, res, loId) => {
    const platform = platformOf(req);
    if (!PLATFORMS.includes(platform)) return res.status(404).json({ error: 'Unknown social platform' });
    const setup = providerStatus(platform);
    if (!setup.configured) return res.status(503).json({ error: 'This connection is not switched on yet. We are finishing it.' });
    const verifier = newVerifier();
    const state = await store.rememberState(loId, platform, verifier);
    res.json({ url: authorizeUrl(platform, { state, codeVerifier: verifier }) });
  }));

  app.delete('/api/lo/social/accounts/:platform', requireAuth, action(async (req, res, loId) => {
    const platform = platformOf(req);
    if (!PLATFORMS.includes(platform)) return res.status(404).json({ error: 'Unknown social platform' });
    await store.remove(loId, platform);
    res.json({ ok: true });
  }));

  app.get('/api/lo/social/queue', requireAuth, action(async (req, res, loId) => {
    res.json({ posts: await poster.list(loId) });
  }));

  // AI writes drafts INTO the queue. Writing is capped per month; posting needs the LO's Approve.
  app.post('/api/lo/social/queue/drafts', requireAuth, action(async (req, res, loId) => {
    const topic = String(req.body?.topic || '');
    if (!draftTopics[topic]) return res.status(400).json({ error: 'invalid_topic' });
    const spend = guard.loSocialDraft({ loId });
    if (!spend.ok) return res.status(429).json({ error: 'You have used this month\'s AI drafts. Write your own, or try next month.' });
    const out = await runLoDraftWriter(loId, { topicText: draftTopics[topic], linkFor: (base, slug) => `${base}/ask/${slug}?door=${topic}&utm_source=social` });
    if (out.status !== 200) return res.status(out.status).json(out.body);
    res.json({ posts: await poster.addDrafts(loId, out.body.drafts, { topic }), remaining_today: out.body.remaining_today });
  }));

  app.post('/api/lo/social/queue', requireAuth, action(async (req, res, loId) => {
    res.json({ posts: await poster.addDrafts(loId, [req.body?.text], { source: 'manual' }) });
  }));

  app.patch('/api/lo/social/queue/:id', requireAuth, action(async (req, res, loId) => {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid post ID' });
    res.json({ posts: await poster.edit(loId, req.params.id, req.body?.text) });
  }));

  app.post('/api/lo/social/queue/:id/approve', requireAuth, action(async (req, res, loId) => {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid post ID' });
    res.json({ posts: await poster.approve(loId, req.params.id, { channels: req.body?.channels, at: req.body?.at || null, imageUrl: req.body?.imageUrl }) });
  }));

  app.delete('/api/lo/social/queue/:id', requireAuth, action(async (req, res, loId) => {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid post ID' });
    res.json({ posts: await poster.discard(loId, req.params.id) });
  }));

  if (runBackground) {
    setInterval(() => { poster.sweep().catch((err) => { if (!/does not exist|schema cache/i.test(err?.message || '')) console.warn('[LoSocial] sweep failed:', err?.message); }); }, 5 * 60 * 1000);
  }
  return { store, poster };
}

module.exports = { register, createLoSocial, LO_TABLES };
