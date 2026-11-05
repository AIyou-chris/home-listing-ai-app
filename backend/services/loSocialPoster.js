'use strict';
// Approve-first posting for loan officers. A post sits as a 'draft' until the LO taps Approve and picks the
// accounts; only then does anything leave the building. A row is claimed before the network is called, so a
// double tap and the 5-minute sweep together cannot post twice. A channel that fails waits for the LO.
const { ReconnectError, publishToPlatform } = require('../marketing-engine/services/socialPublish');
const { encryptToken, decryptToken } = require('../marketing-engine/services/tokenCrypto');

// YouTube is connectable but takes video only; text and picture posts go to these three.
const POST_CHANNELS = ['facebook', 'instagram', 'linkedin'];
const PER_SWEEP = 5;
const MAX_TEXT = 3000;

class LoPostError extends Error {
  constructor(message, status = 400, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}

function createLoSocialPoster({ db, guard, publish = publishToPlatform, now = () => new Date(), decrypt = decryptToken, encrypt = encryptToken, imageHostOk = () => true } = {}) {
  const iso = () => now().toISOString();

  async function load(loId, id) {
    const { data, error } = await db.from('lo_social_posts').select('*').eq('id', id).eq('lo_id', loId).maybeSingle();
    if (error) throw new LoPostError('Could not load that post', 503);
    if (!data) throw new LoPostError('Post not found', 404);
    return data;
  }

  const list = async (loId) => {
    const { data, error } = await db.from('lo_social_posts')
      .select('id, text, topic, source, image_url, channels, status, scheduled_for, posted_at, results, created_at')
      .eq('lo_id', loId).neq('status', 'rejected').order('created_at', { ascending: false }).limit(60);
    if (error) throw new LoPostError('Could not load your posts', 503);
    return data || [];
  };

  async function addDrafts(loId, texts, { topic, source = 'ai' } = {}) {
    const rows = texts.map((t) => String(t || '').trim().slice(0, MAX_TEXT)).filter(Boolean)
      .map((text) => ({ lo_id: loId, text, topic: topic || null, source, status: 'draft', created_at: iso(), updated_at: iso() }));
    if (!rows.length) throw new LoPostError('Write something first.');
    const { error } = await db.from('lo_social_posts').insert(rows);
    if (error) throw new LoPostError('Could not save the draft', 503);
    return list(loId);
  }

  async function edit(loId, id, text) {
    const post = await load(loId, id);
    if (post.status !== 'draft' && post.status !== 'failed') throw new LoPostError('Only drafts can be edited.', 409);
    const clean = String(text || '').trim().slice(0, MAX_TEXT);
    if (!clean) throw new LoPostError('The post cannot be empty.');
    await db.from('lo_social_posts').update({ text: clean, updated_at: iso() }).eq('id', id).eq('lo_id', loId);
    return list(loId);
  }

  async function discard(loId, id) {
    const post = await load(loId, id);
    if (post.status === 'posting') throw new LoPostError('This is being posted right now.', 409);
    await db.from('lo_social_posts').update({ status: 'rejected', updated_at: iso() }).eq('id', id).eq('lo_id', loId);
    return list(loId);
  }

  async function connectionFor(loId, channel) {
    const { data } = await db.from('lo_social_connections').select('*').eq('owner_id', loId).eq('platform', channel).maybeSingle();
    return data && data.status === 'connected' ? data : null;
  }

  // The LO's yes. Nothing is sent before this call.
  async function approve(loId, id, { channels, at, imageUrl }) {
    const post = await load(loId, id);
    if (!['draft', 'failed'].includes(post.status)) throw new LoPostError('This post was already approved.', 409);
    const picked = [...new Set((channels || []).filter((c) => POST_CHANNELS.includes(c)))];
    if (!picked.length) throw new LoPostError('Pick at least one account to post to.');
    const image = String(imageUrl || post.image_url || '').trim();
    if (image && !imageHostOk(image)) throw new LoPostError('Use a picture from your My pictures list.');
    if (picked.includes('instagram') && !image) throw new LoPostError('Instagram needs a picture. Pick one from My pictures.', 400, { needs: 'picture' });
    for (const channel of picked) {
      if (!(await connectionFor(loId, channel))) throw new LoPostError(`Connect ${channel} first, then approve.`, 400, { needsConnection: channel });
    }
    let when = at ? new Date(at) : now();
    if (Number.isNaN(when.getTime())) throw new LoPostError('Choose a real date and time.');
    if (when.getTime() > now().getTime() + 90 * 86400000) throw new LoPostError('Choose a time within the next 90 days.');
    // A picture post counts against the monthly picture limit, once per post.
    if (image && image !== post.image_url) {
      const spend = guard.loSocialImage({ loId });
      if (!spend.ok) throw new LoPostError('You have used this month\'s picture posts. Text posts still work.', 429);
    }
    // Channels that already went out are never sent twice.
    const prior = post.results || {};
    const results = Object.fromEntries(Object.entries(prior).filter(([, r]) => r?.ok));
    await db.from('lo_social_posts').update({
      channels: picked, image_url: image || null, status: 'scheduled', scheduled_for: when.toISOString(),
      approved_at: iso(), results, updated_at: iso()
    }).eq('id', id).eq('lo_id', loId);
    return when.getTime() <= now().getTime() + 1000 ? run(id) : list(loId);
  }

  async function run(id) {
    const { data: post } = await db.from('lo_social_posts').select('*').eq('id', id).maybeSingle();
    if (!post) throw new LoPostError('Not found', 404);
    const loId = post.lo_id;
    if (post.status === 'published') throw new LoPostError('Already posted.', 409);
    const { data: claimed } = await db.from('lo_social_posts').update({ status: 'posting', updated_at: iso() })
      .eq('id', id).eq('status', 'scheduled').select('id').maybeSingle();
    if (!claimed) throw new LoPostError('This is already being posted.', 409);

    const results = { ...(post.results || {}) };
    for (const channel of post.channels || []) {
      if (results[channel]?.ok) continue;
      try {
        const conn = await connectionFor(loId, channel);
        if (!conn) throw new LoPostError('Connect this account again, then approve.');
        const spend = guard.loSocialPost({ loId });
        if (!spend.ok) throw new LoPostError('Daily post limit reached. Approve it again tomorrow.');
        const payload = channel === 'instagram' ? { captionText: post.text, hashtags: [] } : { caption: post.text };
        const out = await publish(channel, {
          connection: { ...conn, accessToken: decrypt(conn.access_token_encrypted), refreshToken: conn.refresh_token_encrypted ? decrypt(conn.refresh_token_encrypted) : null },
          payload, imageUrl: post.image_url || ''
        });
        results[channel] = out.pending
          ? { ok: false, error: 'Instagram is still processing. Approve it again in a minute.' }
          : { ok: true, url: out.url || null, at: iso() };
      } catch (error) {
        const message = String(error?.message || 'Posting failed').slice(0, 240);
        if (error instanceof ReconnectError) {
          await db.from('lo_social_connections').update({ status: 'needs_reconnect', last_error: message, updated_at: iso() }).eq('owner_id', loId).eq('platform', channel);
          results[channel] = { ok: false, error: 'This account needs to be reconnected.' };
        } else {
          results[channel] = { ok: false, error: message };
        }
      }
    }
    const allOk = (post.channels || []).every((c) => results[c]?.ok);
    await db.from('lo_social_posts').update({
      status: allOk ? 'published' : 'failed', results, posted_at: allOk ? iso() : null, updated_at: iso()
    }).eq('id', id);
    return list(loId);
  }

  // Every 5 minutes: send what the LO already approved and scheduled. Drafts are never touched.
  async function sweep() {
    const { data } = await db.from('lo_social_posts').select('id').eq('status', 'scheduled')
      .lte('scheduled_for', iso()).order('scheduled_for', { ascending: true }).limit(PER_SWEEP);
    let posted = 0;
    for (const row of data || []) {
      try { await run(row.id); posted += 1; } catch { /* one bad row never stops the rest */ }
    }
    return { posted };
  }

  return { list, addDrafts, edit, discard, approve, run, sweep, POST_CHANNELS };
}

module.exports = { createLoSocialPoster, LoPostError, POST_CHANNELS };
