'use strict';
// Autopilot: three posts a day, written ahead of time, checked, then posted by the normal scheduler.
// Each post is an ordinary Marketing Studio campaign (brief.source = 'autopilot'), so pictures, video,
// approval and posting all use the code that is already tested. The master switch is `autopilot_on`.
const crypto = require('node:crypto');
const { TOPICS, LAUNCH, GOALS, LO } = require('./topics');
const { checkPost } = require('./safety');
const { getSwitch, setSwitch, ownersWithSwitchOn } = require('../adminSwitches');
const { factsText, tokensFor } = require('./facts');
const { business } = require('../../config/business');
const { offerEndsAt, setOfferEndsAt } = require('../foundingOffer');

const TZ = business.schedule.timezone;
const SLOTS = business.schedule.slots;
const CHANNELS = ['linkedin', 'facebook', 'instagram', 'youtube'];
const LEAD_HOURS = business.schedule.leadHours;           // a post is written about 18 hours before it goes out
const MIN_AHEAD_MS = 25 * 60000; // never write a post for a time that is almost here
const MAX_FAILS_IN_ROW = 3;
const KEEP_MEDIA_DAYS = 10;
const BLOG_PER_WEEK = business.schedule.blogPerWeek;          // at most two blog drafts a week
const BLOG_MIN_GAP_MS = business.schedule.blogMinGapDays * 86400000; // and at least three days apart
const RETRY_AFTER_MS = 30 * 60000; // wait this long before trying a failed time again

const pad = (n) => String(n).padStart(2, '0');
function ptParts(date) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}
// Pacific wall-clock time on a given Pacific date, as a real moment.
function ptToUtc(y, mo, d, h, mi) {
  const want = Date.UTC(y, mo - 1, d, h, mi);
  let guess = want;
  for (let i = 0; i < 3; i += 1) { const p = ptParts(new Date(guess)); guess -= Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - want; }
  return new Date(guess);
}
function upcomingSlots(now, days = 2) {
  const today = ptParts(now); const out = [];
  for (let day = 0; day < days; day += 1) {
    const base = new Date(Date.UTC(today.y, today.mo - 1, today.d + day, 12));
    const y = base.getUTCFullYear(), mo = base.getUTCMonth() + 1, d = base.getUTCDate();
    SLOTS.forEach((s, index) => out.push({ key: `${y}-${pad(mo)}-${pad(d)}@${pad(s.h)}:${pad(s.m)}`, at: ptToUtc(y, mo, d, s.h, s.m), index }));
  }
  return out.filter((s) => s.at.getTime() > now.getTime());
}

function createAutopilot({ db, studioFor, media, getPoster, getConnections, sendMail, loadArticles, blog = null, now = () => new Date(), log = console }) {
  let busy = false;
  // Everything below belongs to ONE customer (owner): their switches, their posts, their direction.
  async function recent(owner, limit = 60) {
    const { data } = await db.from('admin_marketing_campaigns').select('id, status, brief, outputs, created_at, updated_at, generation_error')
      .eq('owner_id', owner).eq('brief->>source', 'autopilot').order('created_at', { ascending: false }).limit(limit);
    return data || [];
  }

  // Chris's standing instructions for every post not written yet (Autopilot tab, "New direction").
  const directionId = (owner) => `autopilot-direction:${owner}`;
  async function direction(owner) {
    try { const { data } = await db.from('platform_brain').select('config').eq('id', directionId(owner)).maybeSingle(); return String(data?.config?.text || '').slice(0, 1000); }
    catch { return ''; }
  }
  async function setDirection(owner, text) {
    const { error } = await db.from('platform_brain').upsert({ id: directionId(owner), config: { text: String(text || '').trim().slice(0, 1000) }, updated_at: now().toISOString() }, { onConflict: 'id' });
    if (error) throw error;
    return { direction: String(text || '').trim().slice(0, 1000) };
  }
  const monthDay = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: TZ });

  // The 30-day launch plan: started with Autopilot, runs for 30 days, then everyday posts take over.
  async function launchPlan(owner) {
    const { data } = await db.from('admin_switches').select('enabled, updated_at').eq('owner_id', owner).eq('key', 'autopilot_plan_launch30').maybeSingle();
    if (!data || data.enabled !== true) return null;
    const day = Math.floor((now().getTime() - Date.parse(data.updated_at)) / 86400000);
    if (!(day >= 0 && day < business.schedule.planDays)) return null;
    return { name: '30-day launch', day: day + 1, week: Math.min(4, Math.floor(day / 7) + 1), offerOpen: day + 1 >= 17 };
  }

  async function pickTopic(owner, slot, rows) {
    const used = new Set(rows.slice(0, 30).map((r) => r.brief?.topicKey));
    const plan = await launchPlan(owner);
    const standing = await direction(owner);
    const endsAt = plan ? await offerEndsAt(db) : null;
    const withHistory = (topic) => {
      const before = rows.filter((r) => r.brief?.topicKey === topic.key && r.outputs?.title).slice(0, 4).map((r) => `"${r.outputs.title}"`);
      let idea = topic.idea;
      if (before.length) idea += ` Take a different angle and a different headline than these earlier posts: ${before.join(', ')}.`;
      if (topic.facts?.length) idea += `\nVerified facts you may use, only if they fit, with the numbers worded exactly as given (say in plain words where it comes from):\n${factsText(topic.facts)}`;
      if (plan && topic.campaign === 4 && endsAt) idea += ` The founding price ends on ${monthDay(endsAt)} or when the 25 spots are gone, whichever comes first. You may say so.`;
      if (standing) idea += `\nNew direction from Chris, follow it for this post: ${standing}`;
      return { ...topic, plan, idea };
    };
    const article = async () => {
      if (!loadArticles) return null;
      try {
        const found = ((await loadArticles()) || []).find((a) => !rows.some((r) => r.brief?.topicKey === `blog:${a.slug}`));
        return found ? { key: `blog:${found.slug}`, pillar: 'blog', link: `${business.siteUrl}/blog/${found.slug}`,
          idea: `Share this real article with loan officers: "${found.title}". Say in plain words why it is worth ten minutes, using only what the title and summary say: ${String(found.excerpt || found.short_answer || '').slice(0, 300)} Do not add facts or numbers that are not here.` } : null;
      } catch { return null; }
    };
    if (plan) {
      const week = LAUNCH.filter((t) => t.week === plan.week);
      if (slot.index === 0) { const fresh = week.filter((t) => !used.has(t.key)); const pool = fresh.length ? fresh : week; return withHistory(pool[rows.length % pool.length]); }
      if (slot.index === 2 && plan.week < 4 && !plan.offerOpen) { const art = await article(); if (art) return withHistory(art); }
      if (slot.index === 2 && plan.offerOpen) { const offer = LAUNCH.filter((t) => t.campaign === 4); const freshOffer = offer.filter((t) => !used.has(t.key)); const offerPool = freshOffer.length ? freshOffer : offer; return withHistory(offerPool[rows.length % offerPool.length]); }
      const product = TOPICS.filter((t) => ['agent-partners', 'warm-leads', 'ai'].includes(t.pillar)); const fresh = product.filter((t) => !used.has(t.key));
      const pool = fresh.length ? fresh : product; return withHistory({ ...pool[(rows.length + 1) % pool.length], idea: `${pool[(rows.length + 1) % pool.length].idea} Tie it back to this week: ${plan.week <= 2 ? 'the market is tough and loan officers need new agent relationships' : 'a WOW Link is how you start one'}.` });
    }
    if (slot.index === 2) { const art = await article(); if (art) return withHistory(art); }
    const fresh = TOPICS.filter((t) => !used.has(t.key));
    const pool = fresh.length ? fresh : TOPICS;
    return withHistory(pool[(rows.length + slot.index) % pool.length]);
  }

  const briefFor = (topic, slot) => ({
    kind: 'campaign', idea: `Write TO loan officers: "you" is the loan officer. Never speak to agents or homebuyers, and never describe things as "your listings". ${topic.idea}`, goal: topic.week === 4 ? 'Promote an offer' : (GOALS[topic.pillar] || 'Drive website visits'),
    tone: topic.plan ? 'Bold, direct and honest. Short punchy lines, contrast and consequence. No fake statistics and no fear tactics.' : 'Friendly and simple',
    audience: 'Loan officers and real estate agents', pictureMode: 'auto', pictureDescription: '', photoName: '',
    videoFormat: 'vertical', videoDuration: '15', plannedAt: '',
    source: 'autopilot', slot: slot.key, topicKey: topic.key, link: topic.link || LO, ...(topic.facts?.length ? { facts: topic.facts } : {}),
    ...(topic.plan ? { cardStyle: 'launch', plan: 'launch30', planWeek: topic.plan.week, ...(topic.headline ? { cardHeadline: topic.headline } : {}) } : {})
  });

  async function cleanup(owner, id) {
    try { const studio = studioFor(); await studio.remove(owner, id, (await db.from('admin_marketing_campaigns').select('updated_at').eq('id', id).maybeSingle()).data?.updated_at); } catch { /* leave it */ }
  }

  // Write, check, picture, video, approve and schedule ONE post. Returns { ok, campaignId, reason }.
  async function build(owner, slot, topic) {
    const studio = studioFor();
    const id = crypto.randomUUID();
    const stamp = now().toISOString();
    const ins = await db.from('admin_marketing_campaigns').insert({ id, owner_id: owner, brief: briefFor(topic, slot), created_at: stamp, updated_at: stamp }).select('*').single();
    if (ins.error) return { ok: false, reason: 'could not start the post' };
    try {
      let row = await studio.generate(owner, id);
      const link = topic.link || LO;
      const outputs = { ...row.outputs };
      // A stray "[link]" or "[Learn more]" is replaced with the real link; other leftover brackets are removed.
      for (const key of ['facebook', 'linkedin', 'instagram', 'bluesky']) {
        if (typeof outputs[key] !== 'string') continue;
        outputs[key] = outputs[key].replace(/\[(?:insert |your |the )?(?:link|url|website|site|learn more|cta)[^\]]*\]/gi, link).replace(/\[[^\]]{0,40}\]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
      }
      for (const key of ['facebook', 'linkedin', 'instagram']) if (!/https?:\/\//.test(outputs[key] || '')) outputs[key] = `${String(outputs[key] || '').trim()}\n\n${link}`;
      const problems = checkPost(outputs, { allowed: tokensFor(topic.facts) });
      if (problems.length) { await cleanup(owner, id); return { ok: false, reason: `safety check: ${problems.slice(0, 3).join('; ')}` }; }
      row = await studio.edit(owner, id, { version: row.updated_at, outputs });
      // A real cinematic scene (gpt-image-1) with the headline on top; if that fails, the free branded card.
      let aiPicture = false;
      if (media.images?.auto && process.env.AUTOPILOT_AI_PICTURES !== 'off') {
        try { await media.images.auto(owner, id, { headline: topic.headline || outputs.title, idea: topic.idea }); aiPicture = true; }
        catch (err) { log.warn?.('[Autopilot] AI picture skipped, using the free card:', err?.message || err); }
      }
      if (!aiPicture) {
        row = (await db.from('admin_marketing_campaigns').select('*').eq('id', id).maybeSingle()).data;
        await media.picture(owner, id, { version: row.updated_at });
      }
      row = (await db.from('admin_marketing_campaigns').select('*').eq('id', id).maybeSingle()).data;
      row = await studio.settings(owner, id, { version: row.updated_at, videoFormat: 'vertical', videoDuration: '15', videoOptions: { layout: 'picture', music: 'calm', musicVolume: 'low', endCard: 'wow', narration: 'none' } });
      let hasVideo = false;
      try {
        await media.render(owner, id, { version: row.updated_at });
        for (let i = 0; i < 40; i += 1) {
          await new Promise((r) => setTimeout(r, i === 0 ? 5000 : 8000));
          const rows = await media.list(owner, id);
          const v = rows.find((m) => m.kind === 'video');
          if (v && v.status === 'ready') { hasVideo = true; break; }
          if (v && v.status === 'failed') break;
        }
      } catch (err) { log.warn?.('[Autopilot] video skipped:', err?.message || err); }
      row = (await db.from('admin_marketing_campaigns').select('*').eq('id', id).maybeSingle()).data;
      row = await studio.approve(owner, id, { version: row.updated_at });
      const connected = await getConnections(owner);
      const channels = CHANNELS.filter((c) => connected[c] && (hasVideo || (c !== 'instagram' && c !== 'youtube')));
      if (!channels.length) return { ok: false, reason: 'no connected account to post to', campaignId: id };
      await getPoster().schedule({ owner, campaignId: id, channels, at: slot.at.toISOString(), by: owner });
      return { ok: true, campaignId: id, channels, hasVideo };
    } catch (err) {
      await cleanup(owner, id);
      return { ok: false, reason: String(err?.detail ? `${err.message} (${err.detail})` : err?.message || err).slice(0, 260) };
    }
  }

  async function writeSlot(owner, slot) {
    const rows = await recent(owner);
    if (rows.some((r) => r.brief?.slot === slot.key && (r.status !== 'failed' || r.brief?.skipped))) return { skipped: true };
    // After a failed try at this time, wait before trying again so one bad stretch does not burn through attempts.
    const lastTry = rows.filter((r) => r.brief?.slot === slot.key && r.brief?.failed).map((r) => Date.parse(r.created_at)).sort((a, b) => b - a)[0];
    if (lastTry && now().getTime() - lastTry < RETRY_AFTER_MS) return { skipped: true, waiting: true };
    const topic = await pickTopic(owner, slot, rows);
    let result = await build(owner, slot, topic);
    if (!result.ok) {
      const second = await pickTopic(owner, { ...slot, index: 0 }, [...rows, { brief: { topicKey: topic.key } }]);
      result = await build(owner, slot, second);
    }
    if (!result.ok) {
      const stamp = now().toISOString();
      await db.from('admin_marketing_campaigns').insert({ id: crypto.randomUUID(), owner_id: owner, status: 'failed', generation_error: result.reason || 'failed',
        brief: { ...briefFor(topic, slot), failed: true }, created_at: stamp, updated_at: stamp });
    }
    return result;
  }

  // The timer: each customer who has Autopilot on is served on their own. "Write the next one now" serves just that customer.
  async function tick({ force = false, owner: only = null } = {}) {
    if (busy) return { busy: true };
    busy = true;
    try {
      const owners = only ? ((await getSwitch(db, 'autopilot_on', only)) ? [only] : []) : await ownersWithSwitchOn(db, 'autopilot_on');
      if (!owners.length) return { off: true };
      const outcomes = [];
      for (const owner of owners) outcomes.push(await tickOwner(owner, { force }));
      return outcomes.length === 1 ? outcomes[0] : { owners: outcomes };
    } catch (err) {
      log.warn?.('[Autopilot] tick failed:', err?.message || err);
      return { error: String(err?.message || err) };
    } finally { busy = false; }
  }

  async function tickOwner(owner, { force = false } = {}) {
    try {
      const current = now();
      let slots = upcomingSlots(current, force ? 3 : 2).filter((s) => s.at.getTime() - current.getTime() >= MIN_AHEAD_MS);
      if (force) {
        // "Write the next one now": the first upcoming slot that has no post yet, however far away.
        const have = new Set((await recent(owner)).filter((r) => r.status !== 'failed').map((r) => r.brief?.slot));
        slots = slots.filter((s) => !have.has(s.key)).slice(0, 1);
      } else {
        slots = slots.filter((s) => s.at.getTime() - current.getTime() <= LEAD_HOURS * 3600000);
      }
      const results = [];
      for (const slot of slots) {
        const r = await writeSlot(owner, slot);
        results.push({ slot: slot.key, ...r });
        if (!r.skipped && force) break;
        if (!r.skipped && !r.ok) {
          const recentRows = await recent(owner, 40);
          const bySlot = new Map();
          for (const x of recentRows) { const k = x.brief?.slot; if (!k) continue; const e = bySlot.get(k) || { ok: false, failed: false }; if (x.brief?.failed) { if (!x.brief?.skipped) e.failed = true; } else e.ok = true; bySlot.set(k, e); }
          const lastSlots = [...bySlot.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0]))).slice(0, MAX_FAILS_IN_ROW).map(([, e]) => e);
          if (lastSlots.length >= MAX_FAILS_IN_ROW && lastSlots.every((e) => e.failed && !e.ok)) {
            await setSwitch(db, 'autopilot_on', false, owner, owner);
            await sendMail?.({ subject: 'Autopilot paused itself', text: `Three posts in a row did not pass. Autopilot switched itself OFF so nothing odd goes out. Last reason: ${r.reason}` });
            return { paused: true, results };
          }
        }
      }
      try { await maybeBlogDraft(owner); } catch (err) { log.warn?.('[Autopilot] blog check failed:', err?.message || err); }
      await housekeeping(owner);
      await maybeDigest(owner);
      return { results };
    } catch (err) {
      log.warn?.('[Autopilot] tick failed:', err?.message || err);
      return { error: String(err?.message || err) };
    }
  }

  // Twice a week: the next planned article on the blog list is written by the blog writer and left as a DRAFT.
  // Autopilot never publishes: Chris reads it and presses Publish. Each try is marked first, so a failure is not retried in a loop.
  async function maybeBlogDraft(owner, { force = false } = {}) {
    if (!blog) return { skipped: 'blog not connected' };
    const { data: marks } = await db.from('admin_switches').select('key, updated_at').eq('owner_id', owner).like('key', 'autopilot_blog_%').order('updated_at', { ascending: false }).limit(10);
    const times = (marks || []).map((m) => Date.parse(m.updated_at)).filter(Number.isFinite);
    const weekAgo = now().getTime() - 7 * 86400000;
    if (!force) {
      if (times.filter((t) => t > weekAgo).length >= BLOG_PER_WEEK) return { skipped: 'two this week already' };
      if (times.some((t) => now().getTime() - t < BLOG_MIN_GAP_MS)) return { skipped: 'too soon after the last one' };
    }
    const next = await blog.nextBrief(owner);
    if (!next) return { skipped: 'no planned article left' };
    await setSwitch(db, `autopilot_blog_${next.id}`, true, owner, owner);
    try {
      await blog.write(owner, next.id);
      let picture = false;
      try { picture = Boolean(blog.makeHero && await blog.makeHero(owner, next.id)); } catch (err) { log.warn?.('[Autopilot] blog picture skipped:', err?.message || err); }
      return { id: next.id, title: next.title, picture };
    }
    catch (err) { log.warn?.('[Autopilot] blog draft failed:', err?.message || err); return { id: next.id, title: next.title, failed: String(err?.message || err).slice(0, 160) }; }
  }

  async function blogDrafts(owner) {
    const { data: marks } = await db.from('admin_switches').select('key, updated_at').eq('owner_id', owner).like('key', 'autopilot_blog_%').order('updated_at', { ascending: false }).limit(6);
    const ids = (marks || []).map((m) => m.key.replace('autopilot_blog_', '')).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (!ids.length) return [];
    const { data } = await db.from('blog_posts').select('id, title, status, review_errors, generation_attempts, updated_at').eq('owner_id', owner).in('id', ids);
    return ids.map((id) => (data || []).find((p) => p.id === id)).filter(Boolean).map((p) => ({ id: p.id, title: p.title, status: p.status, updatedAt: p.updated_at, problems: Array.isArray(p.review_errors) ? p.review_errors.length : 0, written: p.status !== 'brief' }));
  }

  // Old autopilot pictures and videos are removed after a while; the post records stay.
  async function housekeeping(owner) {
    const cutoff = new Date(now().getTime() - KEEP_MEDIA_DAYS * 86400000).toISOString();
    const { data } = await db.from('admin_marketing_campaigns').select('id, brief, updated_at').eq('owner_id', owner).eq('brief->>source', 'autopilot').lt('created_at', cutoff).limit(10);
    for (const row of data || []) {
      if (row.brief?.pruned) continue;
      try {
        const paths = await media.cleanup(owner, row.id);
        await media.removeFiles(paths);
        await db.from('admin_marketing_campaigns').update({ brief: { ...row.brief, pruned: true } }).eq('id', row.id);
      } catch { /* try again next time */ }
    }
  }

  async function summary(owner, days = 1) {
    const all = (await recent(owner, 60)).filter((r) => r.brief?.slot);
    // A failed try is hidden once the same time has a post that worked, so the list shows what matters.
    const worked = new Set(all.filter((r) => !r.brief.failed).map((r) => r.brief.slot));
    const rows = all.filter((r) => !r.brief.failed || r.brief.skipped || !worked.has(r.brief.slot));
    const ids = rows.map((r) => r.id);
    const posts = ids.length ? ((await db.from('admin_marketing_posts').select('campaign_id, channel, status, scheduled_for, posted_at, url, error').in('campaign_id', ids)).data || []) : [];
    const who = owner;
    const pictures = {};
    if (who && media?.list) {
      for (const r of rows.filter((x) => !x.brief.failed).slice(0, 6)) {
        try { pictures[r.id] = (await media.list(who, r.id)).find((m) => m.kind === 'image' && m.url)?.url || ''; } catch { /* no preview */ }
      }
    }
    return rows.map((r) => ({
      campaignId: r.id, slot: r.brief.slot, topic: r.brief.topicKey, title: r.outputs?.title || '', failed: Boolean(r.brief.failed), skipped: Boolean(r.brief.skipped), reason: r.generation_error || '',
      pictureUrl: pictures[r.id] || '',
      preview: String(r.outputs?.facebook || r.outputs?.linkedin || '').slice(0, 600),
      posts: posts.filter((p) => p.campaign_id === r.id)
    })).sort((a, b) => String(b.slot).localeCompare(String(a.slot)));
  }

  async function maybeDigest(owner) {
    if (!sendMail) return;
    const p = ptParts(now());
    if (p.h < 19) return;
    const key = `autopilot_digest_${p.y}-${pad(p.mo)}-${pad(p.d)}`;
    if (await getSwitch(db, key, owner)) return;
    const today = `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
    const items = (await summary(owner)).filter((s) => s.slot.startsWith(today));
    const lines = items.map((s) => s.failed ? `${s.slot}: did not go out (${s.reason})` : `${s.slot}: ${s.title}\n` + s.posts.map((x) => `   ${x.channel}: ${x.status}${x.url ? ' ' + x.url : ''}${x.error ? ' (' + x.error + ')' : ''}`).join('\n'));
    const drafts = (await blogDrafts(owner)).filter((d) => d.written);
    if (drafts.length) lines.push(`Blog drafts waiting for you to read and publish (Marketing Funnels, Manage blog posts):\n` + drafts.map((d) => `   ${d.title}${d.problems ? ` (${d.problems} things to fix before it can publish)` : ''}`).join('\n'));
    await sendMail({ subject: `Autopilot: ${items.filter((s) => !s.failed).length} of 3 posts today`, text: lines.length ? lines.join('\n\n') : 'No posts were written today.' });
    await setSwitch(db, key, true, owner, owner);
  }

  async function start(owner, { plan = true } = {}) {
    await setSwitch(db, 'autopilot_on', true, owner, owner);
    await setSwitch(db, 'autopilot_plan_launch30', plan === true, owner, owner);
    if (plan === true) { try { await setOfferEndsAt(db, new Date(now().getTime() + 30 * 86400000)); } catch (err) { log.warn?.('[Autopilot] could not set the offer end date:', err?.message || err); } }
    await setSwitch(db, 'social_auto_post', true, owner, owner);
    return { on: true };
  }

  // Stop turns it off AND takes back everything scheduled but not yet posted.
  async function stop(owner) {
    await setSwitch(db, 'autopilot_on', false, owner, owner);
    const { data } = await db.from('admin_marketing_campaigns').select('id').eq('owner_id', owner).eq('brief->>source', 'autopilot').limit(200);
    const ids = (data || []).map((r) => r.id);
    if (ids.length) await db.from('admin_marketing_posts').delete().in('campaign_id', ids).in('status', ['scheduled']);
    return { on: false, cancelled: ids.length };
  }

  // New picture for a waiting post: another scene, the video made again from it, approved again. The scheduled times stay.
  async function redoPicture(owner, campaignId) {
    const { data: row } = await db.from('admin_marketing_campaigns').select('*').eq('id', campaignId).eq('owner_id', owner).maybeSingle();
    if (!row || row.brief?.source !== 'autopilot' || row.brief?.failed) return { error: 'not an Autopilot post', status: 404 };
    const { data: posts } = await db.from('admin_marketing_posts').select('status').eq('campaign_id', campaignId);
    if ((posts || []).some((p) => p.status === 'published' || p.status === 'posting')) return { error: 'This post is already out or going out.', status: 409 };
    if (!media.images?.auto) return { error: 'New pictures are not available right now.', status: 503 };
    const redo = (row.brief.redo || 0) + 1;
    const result = await media.images.auto(owner, campaignId, { headline: row.brief.cardHeadline || row.outputs?.title, idea: row.brief.idea, variant: redo, avoid: row.brief.sceneAlt || '' });
    await db.from('admin_marketing_campaigns').update({ brief: { ...row.brief, redo, sceneAlt: result.altText || '' } }).eq('id', campaignId);
    let fresh = (await db.from('admin_marketing_campaigns').select('*').eq('id', campaignId).maybeSingle()).data;
    try {
      await media.render(owner, campaignId, { version: fresh.updated_at });
      for (let i = 0; i < 40; i += 1) {
        await new Promise((r) => setTimeout(r, i === 0 ? 5000 : 8000));
        const v = (await media.list(owner, campaignId)).find((m) => m.kind === 'video');
        if (v && (v.status === 'ready' || v.status === 'failed')) break;
      }
    } catch (err) { log.warn?.('[Autopilot] video after new picture skipped:', err?.message || err); }
    fresh = (await db.from('admin_marketing_campaigns').select('*').eq('id', campaignId).maybeSingle()).data;
    await studioFor().approve(owner, campaignId, { version: fresh.updated_at });
    return { redone: true, redo };
  }

  // Take one waiting post back. "skip" leaves the time empty; otherwise the next tick writes a replacement.
  async function removeUpcoming(owner, campaignId, { skip = false } = {}) {
    const { data: row } = await db.from('admin_marketing_campaigns').select('id, brief, updated_at, owner_id').eq('id', campaignId).eq('owner_id', owner).maybeSingle();
    if (!row || row.brief?.source !== 'autopilot') return { error: 'not an Autopilot post', status: 404 };
    const { data: posts } = await db.from('admin_marketing_posts').select('status').eq('campaign_id', campaignId);
    if ((posts || []).some((p) => p.status === 'published' || p.status === 'posting')) return { error: 'This post is already out or going out.', status: 409 };
    await db.from('admin_marketing_posts').delete().eq('campaign_id', campaignId);
    await studioFor().remove(row.owner_id, campaignId, row.updated_at);
    if (skip) {
      const stamp = now().toISOString();
      await db.from('admin_marketing_campaigns').insert({ id: crypto.randomUUID(), owner_id: row.owner_id, status: 'failed', generation_error: 'Skipped by you',
        brief: { ...row.brief, failed: true, skipped: true }, created_at: stamp, updated_at: stamp });
    }
    return { removed: true, skipped: skip };
  }

  async function status(owner) {
    const on = await getSwitch(db, 'autopilot_on', owner);
    const autoPost = await getSwitch(db, 'social_auto_post', owner);
    const plan = on ? await launchPlan(owner) : null;
    const endsAt = plan ? await offerEndsAt(db) : null;
    const lastBad = (await recent(owner, 20)).find((r) => r.brief?.failed && !r.brief?.skipped && now().getTime() - Date.parse(r.created_at) < 36 * 3600000);
    return { on, autoPost, lastIssue: lastBad ? { slot: lastBad.brief.slot, reason: lastBad.generation_error || 'did not pass the check' } : null, plan: plan ? { ...plan, offerEnds: endsAt ? monthDay(endsAt) : null } : null, direction: await direction(owner), blogDrafts: await blogDrafts(owner), slots: await summary(owner), times: SLOTS.map((s) => `${s.h > 12 ? s.h - 12 : s.h}:${pad(s.m)} ${s.h >= 12 ? 'PM' : 'AM'} Pacific`) };
  }

  return { tick, start, stop, status, setDirection, removeUpcoming, redoPicture, maybeBlogDraft, upcomingSlots, ptToUtc };
}

module.exports = { createAutopilot, upcomingSlots, ptToUtc, SLOTS, CHANNELS };
