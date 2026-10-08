'use strict';
// Sends an APPROVED Marketing Studio campaign to HomeListingAI's own connected accounts.
// Approval is the gate. A row is claimed before the network is called, so a double click or a
// sweep and a click together cannot post twice. A post that fails waits for a person; it is never retried by itself.
const { CHANNELS, ReconnectError, publishToPlatform } = require('./socialPublish');
const { encryptToken, decryptToken } = require('./tokenCrypto');

const BUCKET = 'admin-marketing';
const PER_SWEEP = 5;
const HOME = /^https?:\/\/(?:www\.)?homelistingai\.com(?:[/?#]|$)/i;

class PostError extends Error {
  constructor(message, status = 400, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}

// Add tracking tags to our own links so each campaign's visits can be counted. Other sites are left alone.
function tagLinks(text, { source, campaign }) {
  return String(text || '').replace(/https?:\/\/[^\s)>\]]+/g, (raw) => {
    const trailing = (raw.match(/[.,;:!?]+$/) || [''])[0];
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    if (!HOME.test(url) || /[?&]utm_source=/.test(url)) return raw;
    const hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';
    const base = hash ? url.slice(0, url.indexOf('#')) : url;
    const tags = `utm_source=${source}&utm_medium=social&utm_campaign=${campaign}`;
    return `${base}${base.includes('?') ? '&' : '?'}${tags}${hash}${trailing}`;
  });
}

const TEXT_FIELD = { facebook: 'facebook', instagram: 'instagram', linkedin: 'linkedin', youtube: 'facebook' };

function createMarketingPoster({ db, publish = publishToPlatform, now = () => new Date(), decrypt = decryptToken, encrypt = encryptToken } = {}) {
  const iso = () => now().toISOString();

  async function loadCampaign(id) {
    const { data, error } = await db.from('admin_marketing_campaigns').select('id, status, brief, outputs').eq('id', id).maybeSingle();
    if (error) throw new PostError('Could not load this campaign', 503);
    if (!data) throw new PostError('Campaign not found', 404);
    return data;
  }

  async function connectionFor(channel) {
    const { data } = await db.from('house_social_connections').select('*').eq('platform', channel).maybeSingle();
    return data && data.status === 'connected' ? data : null;
  }

  async function mediaUrls(campaignId) {
    const { data } = await db.from('admin_marketing_media').select('kind, path, status').eq('campaign_id', campaignId).in('kind', ['image', 'video']);
    const out = {};
    for (const row of data || []) {
      if (row.status !== 'ready' || !row.path) continue;
      const signed = await db.storage.from(BUCKET).createSignedUrl(row.path, 3600);
      if (signed?.data?.signedUrl) out[row.kind] = signed.data.signedUrl;
    }
    return out;
  }

  const list = async (campaignId) => {
    const { data, error } = await db.from('admin_marketing_posts').select('id, channel, status, scheduled_for, posted_at, url, error').eq('campaign_id', campaignId).order('channel');
    if (error) throw new PostError('Could not load the posting list', 503);
    return data || [];
  };

  // Put an approved campaign on the schedule for the channels picked. `at` null means right away (the next sweep or Post now).
  async function schedule({ campaignId, channels, at, by }) {
    const picked = [...new Set((channels || []).filter((c) => CHANNELS.includes(c)))];
    if (!picked.length) throw new PostError('Pick at least one account to post to.');
    const campaign = await loadCampaign(campaignId);
    if (campaign.status !== 'approved') throw new PostError('Approve the campaign first, then choose where it goes.');
    let when = at ? new Date(at) : now();
    if (Number.isNaN(when.getTime())) throw new PostError('Choose a real date and time.');
    if (when.getTime() > now().getTime() + 365 * 86400000) throw new PostError('Choose a time within the next year.');
    for (const channel of picked) {
      if (!(await connectionFor(channel))) throw new PostError('Connect that account first, on the Connected accounts tab.', 400, { needsConnection: channel });
      if (!String(campaign.outputs?.[TEXT_FIELD[channel]] || '').trim()) throw new PostError(`This campaign has no ${channel} text.`);
    }
    const { data: existing } = await db.from('admin_marketing_posts').select('channel, status').eq('campaign_id', campaignId);
    const done = new Set((existing || []).filter((r) => r.status === 'published' || r.status === 'posting').map((r) => r.channel));
    const rows = picked.filter((c) => !done.has(c)).map((channel) => ({
      campaign_id: campaignId, channel, status: 'scheduled', scheduled_for: when.toISOString(),
      posted_at: null, url: null, error: null, container_id: null, created_by: by || null, updated_at: iso()
    }));
    if (rows.length) {
      const { error } = await db.from('admin_marketing_posts').upsert(rows, { onConflict: 'campaign_id,channel' });
      if (error) throw new PostError('Could not save the schedule', 503);
    }
    return list(campaignId);
  }

  async function cancel(campaignId, channel) {
    const { error } = await db.from('admin_marketing_posts').delete().eq('campaign_id', campaignId).eq('channel', channel).in('status', ['scheduled', 'failed']);
    if (error) throw new PostError('Could not cancel that', 503);
    return list(campaignId);
  }

  // Post one row now. Returns the row's final state.
  async function run(postId) {
    const { data: post } = await db.from('admin_marketing_posts').select('*').eq('id', postId).maybeSingle();
    if (!post) throw new PostError('Not found', 404);
    if (post.status === 'published') throw new PostError('This has already been posted.', 409);
    const { data: claimed } = await db.from('admin_marketing_posts').update({ status: 'posting', updated_at: iso() })
      .eq('id', post.id).in('status', ['scheduled', 'failed']).select('id').maybeSingle();
    if (!claimed) throw new PostError('This is already being posted.', 409);

    const fail = async (message, extra = {}) => {
      await db.from('admin_marketing_posts').update({ status: 'failed', error: String(message).slice(0, 300), updated_at: iso(), ...extra }).eq('id', post.id);
    };
    let connection = null;
    try {
      const campaign = await loadCampaign(post.campaign_id);
      if (campaign.status !== 'approved') { await fail('The campaign is no longer approved, so it was not posted.'); return list(post.campaign_id); }
      connection = await connectionFor(post.channel);
      if (!connection) { await fail('Connect this account first, on the Connected accounts tab.'); return list(post.campaign_id); }

      const raw = String(campaign.outputs?.[TEXT_FIELD[post.channel]] || '').trim();
      const text = tagLinks(raw, { source: post.channel, campaign: String(campaign.id).slice(0, 8) });
      const media = await mediaUrls(campaign.id);
      const payload = post.channel === 'youtube'
        ? { title: campaign.outputs?.title || 'HomeListingAI', description: text, videoStatus: media.video ? 'ready' : '', videoUrl: media.video || '' }
        : post.channel === 'instagram'
          ? { captionText: text, hashtags: [], videoStatus: media.video ? 'ready' : '', videoUrl: media.video || '', instagramContainerId: post.container_id || '' }
          : { caption: text };

      const result = await publish(post.channel, {
        connection: {
          ...connection,
          accessToken: decrypt(connection.access_token_encrypted),
          refreshToken: connection.refresh_token_encrypted ? decrypt(connection.refresh_token_encrypted) : null
        },
        payload,
        imageUrl: post.channel === 'youtube' ? '' : (media.image || '')
      });

      if (result.refreshedToken) {
        await db.from('house_social_connections').update({
          access_token_encrypted: encrypt(result.refreshedToken.token),
          token_expires_at: new Date(now().getTime() + result.refreshedToken.expiresIn * 1000).toISOString(), updated_at: iso()
        }).eq('platform', post.channel);
      }
      if (result.pending) {
        // Instagram is still processing: try the same upload again in two minutes.
        await db.from('admin_marketing_posts').update({
          status: 'scheduled', container_id: result.instagramContainerId || null,
          scheduled_for: new Date(now().getTime() + 120000).toISOString(), updated_at: iso()
        }).eq('id', post.id);
        return list(post.campaign_id);
      }
      await db.from('admin_marketing_posts').update({ status: 'published', url: result.url || null, posted_at: iso(), error: null, container_id: null, updated_at: iso() }).eq('id', post.id);
    } catch (error) {
      const message = String(error?.message || 'Posting failed');
      if (error instanceof ReconnectError && connection) {
        await db.from('house_social_connections').update({ status: 'needs_reconnect', last_error: message.slice(0, 240), updated_at: iso() }).eq('platform', post.channel);
        await fail('That account needs to be reconnected on the Connected accounts tab.');
      } else {
        await fail(message);
      }
    }
    return list(post.campaign_id);
  }

  async function postNow(campaignId, channel) {
    const { data: post } = await db.from('admin_marketing_posts').select('id, status').eq('campaign_id', campaignId).eq('channel', channel).maybeSingle();
    if (!post) throw new PostError('Choose this account first, then post.', 404);
    return run(post.id);
  }

  // The 5-minute pass: send what is due. Never more than PER_SWEEP at a time.
  async function sweep() {
    const { data: due } = await db.from('admin_marketing_posts').select('id').eq('status', 'scheduled')
      .lte('scheduled_for', iso()).order('scheduled_for', { ascending: true }).limit(PER_SWEEP);
    let posted = 0;
    for (const row of due || []) {
      try { await run(row.id); posted += 1; } catch { /* another sweep got it, or it was cancelled */ }
    }
    return { due: (due || []).length, posted };
  }

  return { schedule, cancel, list, postNow, sweep, run };
}

module.exports = { createMarketingPoster, tagLinks, PostError, PER_SWEEP };
