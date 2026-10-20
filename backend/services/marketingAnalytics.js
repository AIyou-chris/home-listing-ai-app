'use strict';
// One quick answer to "what is working in our marketing?" Counts only what we can really see:
// posts we sent, signups and leads that carry a source tag, blog article events and cold email results.
// We do NOT see visits per social post (the platforms keep those), and the page says so.
const { computeResults } = require('./coldEmail/results');

const DAY = 24 * 60 * 60 * 1000;
const tally = (rows, keyOf) => {
  const map = new Map();
  for (const row of rows) { const key = keyOf(row); if (key) map.set(key, (map.get(key) || 0) + 1); }
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
};

async function safe(label, notes, run, fallback) {
  try { return await run(); } catch (err) { notes.push(`${label} could not be read.`); return fallback; }
}

// `owner` is the customer. Posts, cold email, article events and campaign names are theirs only.
async function buildAnalytics({ db, owner, days = 30, now = Date.now() }) {
  if (!owner) throw new Error('owner_required');
  const span = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const since = new Date(now - span * DAY).toISOString();
  const notes = [];
  const rows = async (query) => { const { data, error } = await query; if (error) throw error; return data || []; };

  const posts = await safe('Posts', notes, () => rows(db.from('admin_marketing_posts').select('campaign_id,channel,status,posted_at,scheduled_for').eq('owner_id', owner).gte('created_at', since).limit(2000)), []);
  const agents = await safe('Signups', notes, () => rows(db.from('agents').select('id,created_at,account_type,metadata').gte('created_at', since).limit(3000)), []);
  const leads = await safe('Leads', notes, () => rows(db.from('leads').select('source,source_type,created_at').gte('created_at', since).limit(3000)), []);
  const slugs = (await safe('Articles', notes, () => rows(db.from('blog_posts').select('slug').eq('owner_id', owner).limit(1000)), [])).map((p) => p.slug);
  const events = slugs.length ? await safe('Blog events', notes, () => rows(db.from('blog_events').select('slug,event').in('slug', slugs).gte('created_at', since).limit(10000)), []) : [];
  const sends = await safe('Cold email', notes, () => rows(db.from('cold_email_sends').select('status,touch,angle,opener,variant_id,bounced_at,complained_at,clicked_at,replied_at,reply_class').eq('owner_id', owner).gte('created_at', since).limit(5000)), []);

  // Posts
  const channels = {};
  for (const p of posts) {
    const c = channels[p.channel] || (channels[p.channel] = { channel: p.channel, published: 0, failed: 0, scheduled: 0 });
    if (p.status === 'published') c.published += 1; else if (p.status === 'failed') c.failed += 1; else c.scheduled += 1;
  }
  const byChannel = Object.values(channels).sort((a, b) => b.published - a.published);

  // Signups that carry a tag: the tag's campaign is the first 8 letters of the campaign id.
  const tagged = agents.map((a) => ({ ...a, touch: a.metadata?.signup_source || null })).filter((a) => a.touch && (a.touch.source || a.touch.ref));
  const signupsBySource = tally(tagged, (a) => a.touch.source || a.touch.ref).map((r) => ({ source: r.key, count: r.count }));
  const prefixes = [...new Set(tagged.map((a) => a.touch.campaign).filter(Boolean))];
  let titles = {};
  if (prefixes.length) {
    const campaigns = await safe('Campaign names', notes, () => rows(db.from('admin_marketing_campaigns').select('id,outputs').eq('owner_id', owner).limit(1000)), []);
    for (const c of campaigns) { const short = String(c.id).slice(0, 8); if (prefixes.includes(short)) titles[short] = String(c.outputs?.title || '').slice(0, 90); }
  }
  const signupsByCampaign = tally(tagged.filter((a) => a.touch.campaign), (a) => `${a.touch.campaign}|${a.touch.source || ''}`)
    .map((r) => { const [campaign, source] = r.key.split('|'); return { campaign, source, title: titles[campaign] || '', count: r.count }; });

  // Leads by where they came from
  const leadsBySource = tally(leads, (l) => l.source_type || l.source || 'unknown').map((r) => ({ source: r.key, count: r.count }));

  // Blog
  const perSlug = {};
  for (const e of events) {
    const s = perSlug[e.slug] || (perSlug[e.slug] = { slug: e.slug, views: 0, ctaClicks: 0, leads: 0, trials: 0 });
    if (e.event === 'article_view') s.views += 1; else if (e.event === 'cta_click') s.ctaClicks += 1;
    else if (e.event === 'lead_magnet_signup') s.leads += 1; else if (e.event === 'trial_start') s.trials += 1;
  }
  const articles = Object.values(perSlug).sort((a, b) => b.views - a.views);
  const blog = {
    views: articles.reduce((n, a) => n + a.views, 0), ctaClicks: articles.reduce((n, a) => n + a.ctaClicks, 0),
    leads: articles.reduce((n, a) => n + a.leads, 0), trials: articles.reduce((n, a) => n + a.trials, 0), top: articles.slice(0, 5)
  };

  // Cold email
  const results = computeResults(sends);
  const cold = {
    ...results.total,
    byAngle: Object.entries(results.byAngle || {}).map(([angle, v]) => ({ angle, sent: v.sent, replies: v.replies, positive: v.positive, replyRate: v.replyRate })).sort((a, b) => b.replyRate - a.replyRate)
  };

  // Plain-words verdicts. Small numbers get an honest "too early".
  const verdicts = [];
  const published = byChannel.reduce((n, c) => n + c.published, 0);
  const failed = byChannel.reduce((n, c) => n + c.failed, 0);
  verdicts.push(published ? `${published} posts went out in the last ${span} days${failed ? `, ${failed} failed and need a look` : ''}.` : `No posts have gone out in the last ${span} days.`);
  if (signupsBySource.length) verdicts.push(`Best source for signups: ${signupsBySource[0].source} (${signupsBySource[0].count}).`);
  else verdicts.push(tagged.length === 0 && agents.length ? 'Signups came in, but none carried a source tag yet, so no post can take the credit.' : 'No tagged signups yet, so it is too early to say which post works.');
  if (blog.views) verdicts.push(`Blog: ${blog.views} article views${blog.ctaClicks ? `, ${blog.ctaClicks} clicked the sign-up button` : ', nobody clicked the sign-up button yet'}.`);
  if (cold.sent) verdicts.push(cold.sent < 100 ? `Cold email: ${cold.sent} sent, ${cold.replies} replies. Too early to pick a winner (needs 100 sent).` : `Cold email: ${cold.replyRate}% replied, ${cold.bounceRate}% bounced.`);
  if (cold.sent && (cold.bounceRate > 3 || cold.complaintRate > 0.1)) verdicts.push('Cold email: bounces or complaints are high. Slow down and check the list.');
  if (failed) verdicts.push(`${failed} posts failed. Open Autopilot to see why.`);

  return {
    days: span, since,
    posts: { total: posts.length, published, failed, byChannel },
    signups: { total: agents.length, tagged: tagged.length, bySource: signupsBySource, byCampaign: signupsByCampaign.slice(0, 8) },
    leads: { total: leads.length, bySource: leadsBySource.slice(0, 8) },
    blog, cold, verdicts, notes,
    gaps: ['Signups and leads are counted for the whole business, not per customer.', 'Visits per social post are kept by Facebook, LinkedIn, Instagram and YouTube. Only signups, leads and blog views are counted here.']
  };
}

module.exports = { buildAnalytics };
