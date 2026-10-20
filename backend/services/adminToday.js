'use strict';
// The admin "Today" page: what went out, what needs me, what worked.
// Every box says plainly when its data could not be read. Nothing here is estimated or invented.
const { buildAnalytics } = require('./marketingAnalytics');

const DAY = 24 * 60 * 60 * 1000;
const CHANNEL_NAMES = { linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube' };
const nameOf = (channel) => CHANNEL_NAMES[channel] || channel;
const titleOf = (c) => String(c?.outputs?.title || c?.brief?.topic || 'Untitled').slice(0, 90);

async function rows(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Runs one lookup. A failure marks that part "not available" instead of showing a made-up zero.
async function part(label, notes, run) {
  try { return { ok: true, value: await run() }; } catch { notes.push(`${label} is not available right now.`); return { ok: false, value: null }; }
}

async function buildToday({ db, owner, days = 7, now = Date.now() }) {
  const since = new Date(now - days * DAY).toISOString();
  const notes = [];

  const campaigns = await part('Campaigns', notes, () => rows(
    db.from('admin_marketing_campaigns').select('id,status,outputs,brief,updated_at').eq('owner_id', owner).order('updated_at', { ascending: false }).limit(300)));
  const mine = new Map((campaigns.value || []).map((c) => [c.id, c]));

  const posts = await part('Posts', notes, () => rows(
    db.from('admin_marketing_posts').select('id,campaign_id,channel,status,posted_at,scheduled_for,url,error').gte('created_at', since).limit(500)));
  const ownPosts = (posts.value || []).filter((p) => mine.has(p.campaign_id));

  const connections = await part('Connected accounts', notes, () => rows(db.from('house_social_connections').select('platform,status')));
  const cold = await part('Cold email', notes, () => rows(
    db.from('cold_email_sends').select('sent_at,replied_at,reply_class').gte('sent_at', since).limit(5000)));

  // What went out
  const published = ownPosts.filter((p) => p.status === 'published').sort((a, b) => String(b.posted_at).localeCompare(String(a.posted_at)));
  const wentOut = {
    available: posts.ok && campaigns.ok,
    posts: published.slice(0, 8).map((p) => ({ channel: nameOf(p.channel), title: titleOf(mine.get(p.campaign_id)), postedAt: p.posted_at, url: p.url || null })),
    postCount: published.length,
    emailsSent: cold.ok ? cold.value.filter((s) => s.sent_at).length : null
  };

  // What needs me
  const needs = [];
  if (campaigns.ok) {
    const waiting = campaigns.value.filter((c) => c.status === 'draft');
    if (waiting.length) needs.push({ kind: 'approve', text: `${waiting.length} draft${waiting.length === 1 ? '' : 's'} waiting for your OK`, count: waiting.length, to: 'marketing' });
    const broken = campaigns.value.filter((c) => c.status === 'failed');
    if (broken.length) needs.push({ kind: 'failed-campaign', text: `${broken.length} campaign${broken.length === 1 ? '' : 's'} did not finish being written`, count: broken.length, to: 'marketing' });
  }
  const failedPosts = ownPosts.filter((p) => p.status === 'failed');
  if (failedPosts.length) needs.push({ kind: 'failed-post', text: `${failedPosts.length} post${failedPosts.length === 1 ? '' : 's'} failed to send`, count: failedPosts.length, to: 'marketing' });
  if (connections.ok) {
    for (const c of connections.value.filter((x) => x.status !== 'connected')) needs.push({ kind: 'reconnect', text: `${nameOf(c.platform)} needs to be reconnected`, count: 1, to: 'settings' });
  }
  if (cold.ok) {
    const replies = cold.value.filter((s) => s.replied_at && !['unsubscribe', 'out_of_office', 'angry'].includes(s.reply_class));
    if (replies.length) needs.push({ kind: 'replies', text: `${replies.length} cold email repl${replies.length === 1 ? 'y' : 'ies'} to read`, count: replies.length, to: 'marketing' });
  }
  const needsMe = { available: campaigns.ok && posts.ok, items: needs };

  // What worked: only counts we can really see (see marketingAnalytics for what is not tracked)
  const analytics = await part('Results', notes, () => buildAnalytics({ db, days, now }));
  const worked = analytics.ok
    ? { available: true, verdicts: analytics.value.verdicts, gaps: analytics.value.gaps, signups: analytics.value.signups.total, taggedSignups: analytics.value.signups.tagged, leads: analytics.value.leads.total }
    : { available: false, verdicts: [], gaps: [], signups: null, taggedSignups: null, leads: null };

  return { days, since, wentOut, needsMe, worked, notes };
}

module.exports = { buildToday };
