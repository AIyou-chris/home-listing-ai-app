'use strict';
// Every marketing route in one place: Marketing Studio (campaigns, pictures, voice, video), connected social accounts, posting,
// Autopilot, the Today page numbers and the results page. server.cjs calls mount() once with the few things the engine
// needs from the host app. A copy of the engine for another business mounts the same way.
const express = require('express');

function mount(hostApp, deps) {
  const {
    verifyAdmin, supabaseAdmin, openai, loadBusinessBrain, createJevClient, blogService, emailService, APP_RUNTIME_MODE
  } = deps;
  const addon = require('./services/addon');
  // Every route behind the login guard also checks that this customer has the add-on (only when the settings say it is sold).
  const app = addon.withAddonGuard(hostApp, verifyAdmin, supabaseAdmin);
// Marketing Studio: drafts only; all ownership comes from the verified admin.
const marketingMediaService = require('./services/adminMarketingMedia').createMediaService({ db: supabaseAdmin, openai, jev: createJevClient({ apiKey: process.env.TYPESAFE_API_KEY }) });
const marketingMediaHandlers = require('./services/adminMarketingMedia').createMediaHandlers(marketingMediaService);
const marketingStudioHandlers = require('./services/adminMarketingStudio').createStudioHandlers({
  db: supabaseAdmin, openai, loadBrain: loadBusinessBrain, media: marketingMediaService
});
app.get('/api/admin/marketing-studio/campaigns', verifyAdmin, marketingStudioHandlers.list);
app.put('/api/admin/marketing-studio/campaigns/:id', verifyAdmin, marketingStudioHandlers.save);
app.delete('/api/admin/marketing-studio/campaigns/:id', verifyAdmin, marketingStudioHandlers.remove);
app.post('/api/admin/marketing-studio/campaigns/:id/generate', verifyAdmin, marketingStudioHandlers.generate);
app.patch('/api/admin/marketing-studio/campaigns/:id/content', verifyAdmin, marketingStudioHandlers.edit);
app.patch('/api/admin/marketing-studio/campaigns/:id/settings', verifyAdmin, marketingStudioHandlers.settings);
app.post('/api/admin/marketing-studio/campaigns/:id/approve', verifyAdmin, marketingStudioHandlers.approve);
app.get('/api/admin/marketing-studio/media-capabilities', verifyAdmin, marketingMediaHandlers.capabilities);
const imageAction = action => async (req,res) => {try {res.json(await action(req));}catch(error){res.status(error.status||400).json({error:error.status?error.message:'This picture could not be made. Your campaign is safe.'});}};
app.get('/api/admin/marketing-studio/image-catalog', verifyAdmin, imageAction(req=>marketingMediaService.images.catalog(req.user.id)));
app.get('/api/admin/marketing-studio/image-library', verifyAdmin, imageAction(async req=>({images:await marketingMediaService.images.library(req.user.id)})));
app.get('/api/admin/marketing-studio/image-results', verifyAdmin, imageAction(async req=>({scenes:await marketingMediaService.images.performance(req.user.id)})));
app.post('/api/admin/marketing-studio/image-library/:imageId/review', verifyAdmin, imageAction(req=>marketingMediaService.images.review(req.user.id,req.params.imageId,req.body)));
app.delete('/api/admin/marketing-studio/image-library/:imageId', verifyAdmin, imageAction(req=>marketingMediaService.images.remove(req.user.id,req.params.imageId)));
app.post('/api/admin/marketing-studio/image-samples', verifyAdmin, imageAction(req=>marketingMediaService.images.samples(req.user.id)));
app.get('/api/public/marketing-images/:id', async(req,res)=>{
  try{const image=await require('./services/marketingImages/blog.cjs').publishedImage(supabaseAdmin,req.params.id);if(!image)return res.sendStatus(404);res.setHeader('Cache-Control','public, max-age=300');res.type(image.type).send(image.buffer);}catch{res.sendStatus(404);}
});
app.post('/api/admin/marketing-studio/campaigns/:id/image-options', verifyAdmin, imageAction(req=>marketingMediaService.images.options(req.user.id,req.params.id,req.body)));
app.post('/api/admin/marketing-studio/campaigns/:id/image-choice', verifyAdmin, imageAction(req=>marketingMediaService.images.choose(req.user.id,req.params.id,req.body)));
app.post('/api/admin/marketing-studio/campaigns/:id/image-layout', verifyAdmin, imageAction(req=>marketingMediaService.images.layout(req.user.id,req.params.id,req.body)));
app.get('/api/admin/marketing-studio/campaigns/:id/media', verifyAdmin, marketingMediaHandlers.list);
app.delete('/api/admin/marketing-studio/campaigns/:id/media/:kind', verifyAdmin, marketingMediaHandlers.remove);
app.post('/api/admin/marketing-studio/campaigns/:id/picture', verifyAdmin, express.json({ limit: '12mb' }), marketingMediaHandlers.picture);
app.post('/api/admin/marketing-studio/campaigns/:id/audio', verifyAdmin, marketingMediaHandlers.audio);
app.post('/api/admin/marketing-studio/campaigns/:id/video', verifyAdmin, marketingMediaHandlers.render);
app.post('/api/admin/marketing-studio/campaigns/:id/video-review', verifyAdmin, marketingMediaHandlers.videoReview);

// ---- HomeListingAI's own social accounts: direct connections (Facebook, Instagram, YouTube, LinkedIn). ----
// Same connection flow as the An AI You admin. Tokens are encrypted; browsers only see status and labels.
let houseSocialStoreInstance = null;
const getHouseSocialStore = () => {
  if (!houseSocialStoreInstance && supabaseAdmin) {
    houseSocialStoreInstance = require('./services/houseSocialStore').createHouseSocialStore({ supabaseAdmin });
  }
  return houseSocialStoreInstance;
};

app.get('/api/admin/house-social/connections', verifyAdmin, async (req, res) => {
  try {
    const { PLATFORMS, providerStatus } = require('./services/houseSocialOauth');
    const store = getHouseSocialStore();
    if (!store) return res.status(503).json({ error: 'unavailable' });
    const byPlatform = new Map((await store.list(req.user.id)).map((row) => [row.platform, row]));
    res.json({
      connections: PLATFORMS.map((platform) => {
        const row = byPlatform.get(platform);
        const setup = providerStatus(platform);
        return {
          platform,
          configured: setup.configured,
          setupNeeded: setup.missing || null,
          connected: Boolean(row) && row.status === 'connected',
          status: row?.status || 'not_connected',
          accountLabel: row?.account_label || null,
          lastError: row?.last_error || null,
          connectedAt: row?.connected_at || null
        };
      })
    });
  } catch (err) {
    console.error('[House social] list failed:', err?.message || err);
    res.status(500).json({ error: 'Could not load connected accounts' });
  }
});

app.post('/api/admin/house-social/connections/:platform/connect', verifyAdmin, async (req, res) => {
  try {
    const { PLATFORMS, providerStatus, newVerifier, authorizeUrl } = require('./services/houseSocialOauth');
    const platform = String(req.params.platform || '').toLowerCase();
    if (!PLATFORMS.includes(platform)) return res.status(404).json({ error: 'Unknown social platform' });
    const setup = providerStatus(platform);
    if (!setup.configured) return res.status(503).json({ error: `${setup.missing} must be added before ${platform} can connect.` });
    const store = getHouseSocialStore();
    if (!store) return res.status(503).json({ error: 'unavailable' });
    const verifier = newVerifier();
    const state = await store.rememberState(req.user.id, platform, verifier);
    res.json({ url: authorizeUrl(platform, { state, codeVerifier: verifier }) });
  } catch (err) {
    console.error('[House social] connect failed:', err?.message || err);
    res.status(500).json({ error: 'Could not start that connection' });
  }
});

app.delete('/api/admin/house-social/connections/:platform', verifyAdmin, async (req, res) => {
  try {
    const { PLATFORMS } = require('./services/houseSocialOauth');
    const platform = String(req.params.platform || '').toLowerCase();
    if (!PLATFORMS.includes(platform)) return res.status(404).json({ error: 'Unknown social platform' });
    const store = getHouseSocialStore();
    if (!store) return res.status(503).json({ error: 'unavailable' });
    await store.remove(req.user.id, platform);
    res.json({ ok: true });
  } catch (err) {
    console.error('[House social] disconnect failed:', err?.message || err);
    res.status(500).json({ error: 'Could not disconnect that account' });
  }
});

// The provider sends the admin back here. The one-time "state" saved when they clicked Connect proves who started it.
app.get('/api/marketing/oauth/:platform/callback', async (req, res) => {
  const { studioReturn } = require('./services/houseSocialStore');
  const { PLATFORMS, exchangeCode, accountFor } = require('./services/houseSocialOauth');
  const platform = String(req.params.platform || '').toLowerCase();
  if (!PLATFORMS.includes(platform)) return res.redirect(studioReturn(platform, 'error', 'Unknown platform'));
  const store = getHouseSocialStore();
  if (!store) return res.redirect(studioReturn(platform, 'error', 'Not available right now'));
  try {
    if (req.query.error) {
      if (typeof req.query.state === 'string') await store.claimState(req.query.state, platform).catch(() => null);
      return res.redirect(studioReturn(platform, 'cancelled'));
    }
    if (typeof req.query.state !== 'string' || typeof req.query.code !== 'string') {
      return res.redirect(studioReturn(platform, 'error', 'The connection link was incomplete. Please try again.'));
    }
    const attempt = await store.claimState(req.query.state, platform);
    if (!attempt) return res.redirect(studioReturn(platform, 'error', 'That connection link expired. Please try again.'));
    const tokens = await exchangeCode(platform, { code: req.query.code, codeVerifier: attempt.code_verifier });
    const account = await accountFor(platform, tokens);
    await store.saveConnection(attempt.owner_id || attempt.started_by, platform, { account, tokens, connectedBy: attempt.started_by });
    return res.redirect(studioReturn(platform, 'connected'));
  } catch (err) {
    console.error('[House social] callback failed:', platform, err?.message || err);
    return res.redirect(studioReturn(platform, 'error', 'Connection failed. Please try again.'));
  }
});


// ---- Marketing Studio: send an APPROVED campaign to the connected accounts, on a date, with tracking tags. ----
let marketingPosterInstance = null;
const getMarketingPoster = () => {
  if (!marketingPosterInstance && supabaseAdmin) {
    marketingPosterInstance = require('./services/marketingPoster').createMarketingPoster({ db: supabaseAdmin });
  }
  return marketingPosterInstance;
};
const posterAction = (fn) => async (req, res) => {
  try {
    const poster = getMarketingPoster();
    if (!poster) return res.status(503).json({ error: 'Posting is not available right now' });
    if (!/^[0-9a-f-]{36}$/i.test(String(req.params.id || ''))) return res.status(400).json({ error: 'Invalid campaign ID' });
    res.json({ posts: await fn(poster, req) });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message, ...(err.needsConnection ? { needsConnection: err.needsConnection } : {}) });
    console.error('[Marketing post] failed:', err?.message || err);
    res.status(500).json({ error: 'Could not do that. Try again.' });
  }
};
app.get('/api/admin/marketing-studio/campaigns/:id/posts', verifyAdmin, posterAction((poster, req) => poster.list(req.params.id, req.user.id)));
app.put('/api/admin/marketing-studio/campaigns/:id/posts', verifyAdmin, posterAction((poster, req) =>
  poster.schedule({ owner: req.user.id, campaignId: req.params.id, channels: req.body?.channels, at: req.body?.at || null, by: req.user?.email })));
app.delete('/api/admin/marketing-studio/campaigns/:id/posts/:channel', verifyAdmin, posterAction((poster, req) => poster.cancel(req.user.id, req.params.id, req.params.channel)));
app.post('/api/admin/marketing-studio/campaigns/:id/posts/:channel/post-now', verifyAdmin, posterAction((poster, req) => poster.postNow(req.user.id, req.params.id, req.params.channel)));

// Auto-posting master switch (default OFF). "Post now" always works; the 5-minute sweep only runs while this is ON.
app.get('/api/admin/house-social/auto-post', verifyAdmin, async (req, res) => {
  res.json({ enabled: await require('./services/adminSwitches').getSwitch(supabaseAdmin, 'social_auto_post', req.user.id) });
});
app.post('/api/admin/house-social/auto-post', verifyAdmin, async (req, res) => {
  try {
    const enabled = await require('./services/adminSwitches').setSwitch(supabaseAdmin, 'social_auto_post', req.body?.enabled === true, req.user?.email, req.user.id);
    console.log(`[Marketing post] auto-posting switched ${enabled ? 'ON' : 'OFF'} by ${req.user?.email || 'admin'}`);
    res.json({ enabled });
  } catch (err) {
    console.error('[Marketing post] switch failed:', err?.message || err);
    res.status(500).json({ error: 'Could not change that' });
  }
});

let marketingPostSweepBusy = false;
async function runMarketingPostSweep() {
  if (marketingPostSweepBusy || !supabaseAdmin) return;
  marketingPostSweepBusy = true;
  try {
    const owners = await addon.entitledOwners(supabaseAdmin, await require('./services/adminSwitches').ownersWithSwitchOn(supabaseAdmin, 'social_auto_post'));
    if (!owners.length) return;
    const poster = getMarketingPoster();
    const result = poster ? await poster.sweep(owners) : null;
    if (result?.posted) console.log('[Marketing post] sweep posted', result.posted);
  } catch (err) {
    if (!/does not exist|schema cache/i.test(err?.message || '')) console.warn('[Marketing post] sweep failed:', err?.message);
  } finally {
    marketingPostSweepBusy = false;
  }
}
if (APP_RUNTIME_MODE !== 'worker') {
  setInterval(() => { runMarketingPostSweep().catch(() => {}); }, 5 * 60 * 1000);
}

// ---- Autopilot: three posts a day, written ahead, checked, and posted by the scheduler above. ----
// Master switch `autopilot_on` (default OFF). Stop turns it off and takes back anything not yet posted.
let autopilotInstance = null;
const getAutopilot = () => {
  if (!autopilotInstance && supabaseAdmin) {
    const { createStudioService } = require('./services/adminMarketingStudio');
    autopilotInstance = require('./services/autopilot/engine').createAutopilot({
      db: supabaseAdmin,
      isEntitled: (owner) => addon.isEntitled(supabaseAdmin, owner),
      studioFor: () => createStudioService({ db: supabaseAdmin, openai, loadBrain: loadBusinessBrain, media: marketingMediaService }),
      media: marketingMediaService,
      directExplainer: (args) => require('./services/explainerDirector').directVideo({ ...args, openai }),
      getPoster: () => getMarketingPoster(),
      getConnections: async (owner) => {
        const { data } = await supabaseAdmin.from('house_social_connections').select('platform, status').eq('owner_id', owner);
        return Object.fromEntries((data || []).map((c) => [c.platform, c.status === 'connected']));
      },
      loadArticles: async () => (await blogService.publicPosts()).filter((p) => p.role !== 'tool').slice(0, 12),
      blog: {
        nextBrief: async (owner) => {
          const { data } = await supabaseAdmin.from('blog_posts').select('id, title, role, generation_attempts').eq('owner_id', owner).eq('status', 'brief').neq('role', 'tool').eq('generation_attempts', 0).order('created_at', { ascending: true }).limit(1);
          return data?.[0] || null;
        },
        write: (owner, id) => blogService.generate(owner, { id }),
        // A cinematic picture for the new draft, attached as its featured image (the article is still a draft for Chris to read).
        makeHero: async (owner, id) => {
          const { data: post } = await supabaseAdmin.from('blog_posts').select('id, title, excerpt, short_answer, status').eq('id', id).eq('owner_id', owner).maybeSingle();
          if (!post || post.status === 'published') return null;
          const made = await marketingMediaService.images.blogHero(owner, { postId: id, title: post.title, excerpt: post.excerpt || post.short_answer || '', count: 1 });
          if (!made[0]) return null;
          await supabaseAdmin.from('blog_posts').update({ featured_image: `${require('./config/business').business.siteUrl}/api/public/marketing-images/${made[0].id}`, featured_image_alt: String(made[0].alt_text || post.title).slice(0, 300) }).eq('id', id).neq('status', 'published');
          return made[0];
        }
      },
      sendMail: async ({ subject, text }) => {
        const to = process.env.OWNER_ALERT_EMAIL || require('./config/business').business.alertEmail;
        const html = `<pre style="font-family:inherit;white-space:pre-wrap">${String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</pre>`;
        await emailService.sendEmail({ to, subject, html, tags: { template: 'autopilot', type: 'internal' } });
      }
    });
  }
  return autopilotInstance;
};
app.get('/api/admin/today', verifyAdmin, async (req, res) => {
  try {
    const { buildToday } = require('./services/adminToday');
    res.json(await buildToday({ db: supabaseAdmin, owner: req.user.id, days: 7, videoCheck: () => require('./services/explainerVideo').selfCheck() }));
  } catch (err) {
    console.error('[Admin today] failed:', err?.message || err);
    res.status(500).json({ error: 'Could not load Today.' });
  }
});
// Is the animated video maker really working on this server? (draws and encodes one second)
app.get('/api/admin/video-check', verifyAdmin, async (req, res) => {
  try { res.json(await require('./services/explainerVideo').selfCheck({ force: req.query.fresh === '1' })); }
  catch (err) { res.status(500).json({ ok: false, error: 'Could not run the video check.' }); }
});
app.get('/api/admin/marketing-analytics', verifyAdmin, async (req, res) => {
  try {
    const { buildAnalytics } = require('./services/marketingAnalytics');
    res.json(await buildAnalytics({ db: supabaseAdmin, owner: req.user.id, days: Number(req.query.days) || 30 }));
  } catch (err) {
    console.error('[Marketing analytics] failed:', err?.message || err);
    res.status(500).json({ error: 'Could not load the analytics.' });
  }
});

app.get('/api/admin/autopilot', verifyAdmin, async (req, res) => {
  try { const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' }); res.json(await autopilot.status(req.user.id)); }
  catch (err) { console.error('[Autopilot] status failed:', err?.message || err); res.status(500).json({ error: 'Could not load Autopilot' }); }
});
app.post('/api/admin/autopilot', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be true or false' });
    res.json(req.body.enabled ? await autopilot.start(req.user.id, { plan: req.body.plan !== false }) : await autopilot.stop(req.user.id));
  } catch (err) { console.error('[Autopilot] switch failed:', err?.message || err); res.status(500).json({ error: 'Could not change Autopilot' }); }
});
// "Make the explainer video": a fresh animated video (new words, with voice) for one waiting post. Spends on paid AI, so one at a time per post.
app.post('/api/admin/autopilot/posts/:campaignId/explainer', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    const out = await autopilot.makeExplainer(req.user.id, req.params.campaignId, { scene: String(req.body?.scene || ''), note: String(req.body?.note || '') });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    out.done.catch(() => {});
    res.json({ queued: true, scene: out.scene });
  } catch (err) { console.error('[Autopilot] explainer failed:', err?.message || err); res.status(500).json({ error: 'Could not start the video' }); }
});
app.post('/api/admin/autopilot/posts/:campaignId/video-rating', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    const out = await autopilot.rateVideo(req.user.id, req.params.campaignId, { rating: req.body?.rating, reason: req.body?.reason });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.json(out);
  } catch (err) { console.error('[Autopilot] rating failed:', err?.message || err); res.status(500).json({ error: 'Could not save that' }); }
});
app.post('/api/admin/autopilot/auto-publish', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be true or false' });
    res.json(await autopilot.setAutoPublish(req.user.id, req.body.enabled));
  } catch (err) { console.error('[Autopilot] auto-publish switch failed:', err?.message || err); res.status(500).json({ error: 'Could not change the setting' }); }
});
app.post('/api/admin/autopilot/posts/:campaignId/approve', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    const out = await autopilot.approvePost(req.user.id, req.params.campaignId);
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.json(out);
  } catch (err) { console.error('[Autopilot] approve failed:', err?.message || err); res.status(500).json({ error: 'Could not approve this post' }); }
});
// "New picture": another scene for one waiting post (the video is made again from it). Runs after the reply.
app.post('/api/admin/autopilot/posts/:campaignId/new-picture', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    if (!/^[0-9a-f-]{36}$/i.test(String(req.params.campaignId || ''))) return res.status(400).json({ error: 'Invalid post' });
    res.json({ started: true });
    autopilot.redoPicture(req.user.id, req.params.campaignId).catch((err) => console.warn('[Autopilot] new picture failed:', err?.message || err));
  } catch (err) { console.error('[Autopilot] new-picture failed:', err?.message || err); res.status(500).json({ error: 'Could not start a new picture' }); }
});
// "New direction": standing instructions applied to every post not yet written.
app.post('/api/admin/autopilot/direction', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    if (typeof req.body?.direction !== 'string' || req.body.direction.length > 1000) return res.status(400).json({ error: 'Keep the direction under 1,000 characters.' });
    res.json(await autopilot.setDirection(req.user.id, req.body.direction));
  } catch (err) { console.error('[Autopilot] direction failed:', err?.message || err); res.status(500).json({ error: 'Could not save the direction' }); }
});
// Take back one waiting post: "skip" leaves that time empty, otherwise a replacement is written.
app.post('/api/admin/autopilot/posts/:campaignId/remove', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    if (!/^[0-9a-f-]{36}$/i.test(String(req.params.campaignId || ''))) return res.status(400).json({ error: 'Invalid post' });
    const out = await autopilot.removeUpcoming(req.user.id, req.params.campaignId, { skip: req.body?.skip === true });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.json(out);
  } catch (err) { console.error('[Autopilot] remove failed:', err?.message || err); res.status(500).json({ error: 'Could not take that post back' }); }
});
// Blog pictures made by AI for one article: start (runs after the reply) and list.
app.post('/api/admin/blog/posts/:id/hero', verifyAdmin, async (req, res) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(String(req.params.id || ''))) return res.status(400).json({ error: 'Invalid article' });
    const { data: post } = await supabaseAdmin.from('blog_posts').select('id, title, excerpt, short_answer, status').eq('id', req.params.id).eq('owner_id', req.user.id).maybeSingle();
    if (!post) return res.status(404).json({ error: 'Save the article first.' });
    res.json({ started: true });
    marketingMediaService.images.blogHero(req.user.id, { postId: post.id, title: post.title, excerpt: post.excerpt || post.short_answer || '', count: Math.min(3, Number(req.body?.count) || 3), variantStart: Number(req.body?.variantStart) || 0 })
      .catch((err) => console.warn('[Blog picture] failed:', err?.message || err));
  } catch (err) { console.error('[Blog picture] start failed:', err?.message || err); res.status(500).json({ error: 'Could not start the picture' }); }
});
app.get('/api/admin/blog/posts/:id/hero', verifyAdmin, async (req, res) => {
  try { res.json({ pictures: await marketingMediaService.images.blogHeroList(req.user.id, req.params.id) }); }
  catch (err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not load the pictures' }); }
});
// "Write a blog draft now": the next planned article is written as a DRAFT (never published from here).
app.post('/api/admin/autopilot/blog-now', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    res.json({ started: true });
    autopilot.maybeBlogDraft(req.user.id, { force: true }).catch(() => {});
  } catch (err) { console.error('[Autopilot] blog-now failed:', err?.message || err); res.status(500).json({ error: 'Could not start the blog draft' }); }
});
// "Write the next one now": starts the next missing post at once instead of waiting for the timer.
app.post('/api/admin/autopilot/run-now', verifyAdmin, async (req, res) => {
  try {
    const autopilot = getAutopilot(); if (!autopilot) return res.status(503).json({ error: 'Autopilot is not available right now' });
    if (!(await require('./services/adminSwitches').getSwitch(supabaseAdmin, 'autopilot_on', req.user.id))) return res.status(409).json({ error: 'Turn Autopilot on first.' });
    res.json({ started: true });
    autopilot.tick({ force: true, owner: req.user.id }).catch(() => {});
  } catch (err) { console.error('[Autopilot] run-now failed:', err?.message || err); res.status(500).json({ error: 'Could not start the next post' }); }
});
if (APP_RUNTIME_MODE !== 'worker') {
  setInterval(() => { try { getAutopilot()?.tick().catch(() => {}); } catch { /* never break the server */ } }, 10 * 60 * 1000);
}

}

module.exports = { mount };
