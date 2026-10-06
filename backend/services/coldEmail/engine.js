'use strict';

const dns = require('dns').promises;
const rules = require('./rules');
const seq = require('./sequence');
const { appendFooter, postalAddress } = require('./compliance');
const { classifyReply, draftReply, STOPS_SEQUENCE, SUPPRESSES } = require('./replyClassifier');
const { buildLaterTouches, fill, pickObjection } = require('./templates');
const { draftFirstTouch } = require('./writer');
const sender = require('./sender');
const { computeResults } = require('./results');

const TABLE_MISSING = /relation .* does not exist|schema cache|Could not find the table/i;
const FIRST_SEND_LIMIT = 20; // the very first approved batch is capped
const SWEEP_LIMIT = 25;
const STOP_STATUSES = new Set(['replied', 'demo_booked', 'unsubscribed', 'bounced', 'complained']);

const mxLookup = async (domain) => {
  try { return (await dns.resolveMx(domain)).length > 0; } catch { return false; }
};

const emailKey = (e) => String(e || '').trim().toLowerCase();

const loadSuppression = async (db) => {
  const { data, error } = await db.from('lo_suppression_list').select('email').limit(100000);
  if (error) throw error;
  return new Set((data || []).map((r) => emailKey(r.email)));
};

const suppress = async (db, email, reason) => {
  await db.from('lo_suppression_list').upsert({ email: emailKey(email), reason, added_at: new Date().toISOString() }, { onConflict: 'email' });
};

const tablesReady = async (db) => {
  const { error } = await db.from('cold_email_sends').select('id').limit(1);
  if (error && TABLE_MISSING.test(error.message || '')) return false;
  return true;
};

// ---- prospects -------------------------------------------------------------
const normalizeProspect = (row) => {
  const email = emailKey(row.email);
  const pick = (...keys) => { for (const k of keys) if (row[k] != null && String(row[k]).trim()) return String(row[k]).trim(); return null; };
  const name = pick('first_name', 'firstName', 'name');
  return {
    email,
    first_name: name ? name.split(/\s+/)[0] : null,
    last_name: pick('last_name', 'lastName') || (pick('name') ? pick('name').split(/\s+/).slice(1).join(' ') || null : null),
    company: pick('company', 'employer'),
    nmls_id: pick('nmls_id', 'nmls'),
    city: pick('city'),
    state: pick('state'),
    source: pick('source') || 'csv',
    personalization_fact: pick('personalization_fact', 'fact'),
    personalization_source_url: pick('personalization_source_url', 'fact_url')
  };
};

const importProspects = async (db, rows) => {
  const suppressed = await loadSuppression(db);
  const seen = new Set();
  const result = { added: 0, duplicates: 0, rejected: [] };
  const toInsert = [];
  for (const raw of rows.slice(0, 5000)) {
    const p = normalizeProspect(raw);
    if (!rules.isValidEmailSyntax(p.email)) { result.rejected.push({ email: p.email || '(blank)', reason: 'not a valid email' }); continue; }
    if (rules.isRoleAddress(p.email)) { result.rejected.push({ email: p.email, reason: 'role address' }); continue; }
    if (suppressed.has(p.email)) { result.rejected.push({ email: p.email, reason: 'unsubscribed or bounced before' }); continue; }
    if (p.personalization_fact && !p.personalization_source_url) { p.personalization_fact = null; } // a fact with no source is not allowed
    if (seen.has(p.email)) { result.duplicates += 1; continue; }
    seen.add(p.email);
    toInsert.push(p);
  }
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200);
    const { data, error } = await db.from('lo_prospects').upsert(chunk, { onConflict: 'email', ignoreDuplicates: true }).select('id');
    if (error) throw error;
    result.added += (data || []).length;
    result.duplicates += chunk.length - (data || []).length;
  }
  return result;
};

const promoteFromFinder = async (db, limit = 200) => {
  const { data, error } = await db.from('lo_lead_pool').select('email,name,employer,job_title,phone,linkedin,city,source_url,is_role,status').eq('status', 'new').eq('is_role', false).limit(limit);
  if (error) throw error;
  // The finder pool also holds non-loan-officers (tax advisors, "founders") and test rows. Only people whose
  // title really says mortgage / loan / lending go into the cold-email list.
  const looksLikeLo = (r) => /mortgage|loan|lend|originat|nmls/i.test(`${r.job_title || ''} ${r.employer || ''}`);
  const isTestRow = (r) => /hlai-test|@example\.|test\s*real/i.test(`${r.email || ''} ${r.name || ''}`);
  const rows = (data || [])
    .filter((r) => looksLikeLo(r) && !isTestRow(r))
    .map((r) => ({ email: r.email, name: r.name, company: r.employer, city: r.city, source: 'lead-finder' }));
  const out = await importProspects(db, rows);
  return { ...out, skippedNotLo: (data || []).length - rows.length };
};

const verifyProspects = async (db, { limit = 200 } = {}) => {
  const { data, error } = await db.from('lo_prospects').select('id,email').eq('status', 'new').limit(limit);
  if (error) throw error;
  const cache = new Map();
  let ok = 0; let bad = 0;
  for (const p of data || []) {
    const domain = p.email.split('@')[1];
    if (!cache.has(domain)) cache.set(domain, await mxLookup(domain));
    const good = cache.get(domain);
    await db.from('lo_prospects').update({ mx_ok: good, status: good ? 'verified' : 'bad_email', verified_at: new Date().toISOString() }).eq('id', p.id);
    if (good) ok += 1; else bad += 1;
  }
  return { verified: ok, bad };
};

// ---- batches ---------------------------------------------------------------
const createBatch = async (db, { name, angle, opener = 'A', variantId = 'A', window = 'morning', replyOnly = true, prospectIds = [] }) => {
  if (!name || !angle) throw new Error('name_and_angle_required');
  if (!prospectIds.length) throw new Error('pick_prospects');
  const { data: batch, error } = await db.from('cold_email_batches').insert({ name, angle, opener, variant_id: variantId, send_window: window, reply_only: replyOnly }).select('*').single();
  if (error) throw error;
  const { data: prospects } = await db.from('lo_prospects').select('id,status,last_contacted_at').in('id', prospectIds.slice(0, 500));
  const recent = Date.now() - rules.RECENT_DAYS * 86400000;
  const rows = (prospects || [])
    .filter((p) => p.status === 'verified' && !(p.last_contacted_at && new Date(p.last_contacted_at).getTime() > recent))
    .map((p) => ({ batch_id: batch.id, prospect_id: p.id, touch: 1, angle, opener, variant_id: variantId, status: 'pending' }));
  if (rows.length) {
    const { error: insErr } = await db.from('cold_email_sends').upsert(rows, { onConflict: 'prospect_id,touch', ignoreDuplicates: true });
    if (insErr) throw insErr;
  }
  return { batch, queued: rows.length, skipped: prospectIds.length - rows.length };
};

const generateDrafts = async (db, batchId, { complete, limit = 8, winner = '' }) => {
  const { data: batch } = await db.from('cold_email_batches').select('*').eq('id', batchId).single();
  const { data: pending } = await db.from('cold_email_sends').select('id,prospect_id').eq('batch_id', batchId).eq('touch', 1).eq('status', 'pending').limit(limit);
  let done = 0; let flagged = 0;
  for (const s of pending || []) {
    const { data: p } = await db.from('lo_prospects').select('*').eq('id', s.prospect_id).single();
    const draft = await draftFirstTouch({
      complete,
      params: { angle: batch.angle, opener: batch.opener, firstName: p.first_name, company: p.company, market: p.city, personalizationFact: p.personalization_fact, replyOnly: batch.reply_only, winner }
    });
    await db.from('cold_email_sends').update({ subject: draft.subject, body_text: draft.body_text, opener: draft.opener_used, check_failures: draft.flags, status: 'draft' }).eq('id', s.id);
    done += 1; if (!draft.ok) flagged += 1;
  }
  const { count } = await db.from('cold_email_sends').select('id', { count: 'exact', head: true }).eq('batch_id', batchId).eq('touch', 1).eq('status', 'pending');
  return { generated: done, flagged, remaining: count || 0 };
};

const editSend = async (db, sendId, { subject, body_text }) => {
  const { data: s } = await db.from('cold_email_sends').select('*, cold_email_batches(reply_only)').eq('id', sendId).single();
  if (!s || !['draft', 'approved'].includes(s.status)) throw new Error('not_editable');
  const check = rules.checkColdEmail({ touch: s.touch, subject, body: body_text, replyOnly: s.touch === 1 && s.cold_email_batches?.reply_only !== false });
  await db.from('cold_email_sends').update({ subject, body_text, check_failures: check.failures.map((f) => f.message) }).eq('id', sendId);
  return { ok: check.ok, failures: check.failures };
};

const linkFor = (cfg, prospect, batch, touch) =>
  `${cfg.siteUrl}/for-loan-officers/${prospect.unsub_token}?utm_source=cold-email&utm_medium=email&utm_campaign=${batch.id}&utm_content=${batch.angle}-${touch}`;

const approveBatch = async (db, batchId, { approvedBy, cfg }) => {
  const { data: batch } = await db.from('cold_email_batches').select('*').eq('id', batchId).single();
  if (!batch || batch.status !== 'draft') throw new Error('batch_not_draft');
  const { data: drafts } = await db.from('cold_email_sends').select('*, lo_prospects(*)').eq('batch_id', batchId).eq('touch', 1).eq('status', 'draft');
  const clean = (drafts || []).filter((d) => !(d.check_failures || []).length);
  const blocked = (drafts || []).length - clean.length;

  const { count: everSent } = await db.from('cold_email_sends').select('id', { count: 'exact', head: true }).eq('status', 'sent');
  const capped = !everSent ? clean.slice(0, FIRST_SEND_LIMIT) : clean;
  const heldBack = clean.length - capped.length;

  const base = new Date();
  let approved = 0;
  for (const d of capped) {
    const p = d.lo_prospects;
    const tz = seq.tzForState(p.state);
    const times = seq.scheduleSequence(base, { timeZone: tz, window: batch.send_window });
    if (times.some((t) => !t)) continue;
    const later = buildLaterTouches({ objection: pickObjection({ company: p.company }), breakupIndex: approved });
    const values = (touch) => ({ first_name: p.first_name || 'there', company: p.company || '', city: p.city || '', demo_link: linkFor(cfg, p, batch, touch) });
    const laterRows = [];
    let sequenceOk = true;
    for (const touch of [2, 3, 4, 5]) {
      const t = later[touch];
      const subject = fill(t.subject, values(touch));
      const body_text = fill(t.body, values(touch));
      const check = rules.checkColdEmail({ touch, subject, body: body_text });
      if (!check.ok) { sequenceOk = false; break; }
      laterRows.push({ batch_id: batch.id, prospect_id: p.id, touch, angle: batch.angle, opener: batch.opener, variant_id: batch.variant_id, subject, body_text, check_failures: [], status: 'approved', scheduled_for: times[touch - 1].toISOString() });
    }
    if (!sequenceOk) continue;
    await db.from('cold_email_sends').update({ status: 'approved', scheduled_for: times[0].toISOString() }).eq('id', d.id);
    await db.from('cold_email_sends').upsert(laterRows, { onConflict: 'prospect_id,touch', ignoreDuplicates: true });
    approved += 1;
  }
  if (approved) await db.from('cold_email_batches').update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: approvedBy || null }).eq('id', batchId);
  return { approved, blocked, heldBack, firstSendCap: !everSent ? FIRST_SEND_LIMIT : null };
};

// ---- sending ---------------------------------------------------------------
const sweep = async (db, { cfg, now = new Date(), send = sender.sendColdEmail, mx = mxLookup } = {}) => {
  const out = { sent: 0, skipped: 0, failed: 0, paused: null, blockers: sender.blockers(cfg) };
  if (out.blockers.length) return out;

  const since = new Date(now.getTime() - 30 * 86400000).toISOString();
  const { data: recent } = await db.from('cold_email_sends').select('status,bounced_at,complained_at,sent_at,mailbox').gte('created_at', since);
  const sentRows = (recent || []).filter((r) => r.status === 'sent');
  const pause = seq.shouldPause({ sent: sentRows.length, bounced: sentRows.filter((r) => r.bounced_at).length, complained: sentRows.filter((r) => r.complained_at).length });
  if (pause.pause) {
    await db.from('cold_email_batches').update({ status: 'paused', paused_reason: pause.reason }).eq('status', 'approved');
    out.paused = pause.reason;
    return out;
  }

  const { data: due } = await db.from('cold_email_sends')
    .select('*, lo_prospects(*), cold_email_batches(status,send_window,reply_only,angle,id)')
    .eq('status', 'approved').lte('scheduled_for', now.toISOString()).order('scheduled_for', { ascending: true }).limit(SWEEP_LIMIT);

  const suppressed = await loadSuppression(db);
  const dayAgo = now.getTime() - 86400000;
  const sentToday = {};
  for (const r of sentRows) if (r.mailbox && new Date(r.sent_at).getTime() > dayAgo) sentToday[r.mailbox] = (sentToday[r.mailbox] || 0) + 1;
  const { data: firstEver } = await db.from('cold_email_sends').select('sent_at').eq('status', 'sent').order('sent_at', { ascending: true }).limit(1);
  const firstSendAt = firstEver?.[0]?.sent_at || null;
  const capEach = seq.dailyCapForMailbox({ firstSendAt, now: now.getTime(), max: cfg.maxPerMailbox });
  const caps = Object.fromEntries(cfg.mailboxes.map((m) => [m, capEach]));

  for (const s of due || []) {
    const p = s.lo_prospects;
    const b = s.cold_email_batches;
    const cancel = async (reason) => { await db.from('cold_email_sends').update({ status: 'cancelled', skip_reason: reason }).eq('id', s.id); out.skipped += 1; };
    if (!b || b.status !== 'approved') { out.skipped += 1; continue; } // paused batches wait
    if (STOP_STATUSES.has(p.status)) { await cancel(`prospect_${p.status}`); continue; }

    const tz = seq.tzForState(p.state);
    if (!seq.inSendWindow(now, { timeZone: tz, window: b.send_window })) {
      const next = seq.nextSendTime(now, { timeZone: tz, window: b.send_window });
      if (next) await db.from('cold_email_sends').update({ scheduled_for: next.toISOString() }).eq('id', s.id);
      out.skipped += 1; continue;
    }
    if (s.touch > 1) {
      const { data: earlier } = await db.from('cold_email_sends').select('touch,status,sent_at,replied_at').eq('prospect_id', p.id).lt('touch', s.touch);
      if ((earlier || []).some((e) => e.replied_at)) { await cancel('replied'); continue; }
      if (!(earlier || []).some((e) => e.touch === 1 && e.status === 'sent')) { out.skipped += 1; continue; }
      const lastSent = (earlier || []).filter((e) => e.sent_at).map((e) => new Date(e.sent_at).getTime()).sort((a, b) => a - b).pop();
      if (lastSent && now.getTime() - lastSent < 2 * 86400000 - 3600000) { out.skipped += 1; continue; }
    }
    const recipient = await rules.checkRecipient({ email: p.email, suppressed, mxLookup: mx, lastContactedAt: s.touch === 1 ? p.last_contacted_at : null });
    if (!recipient.ok) { await cancel(recipient.failures[0].rule); continue; }

    const unsubscribeUrl = `${cfg.backendUrl}/api/public/cold-unsubscribe/${p.unsub_token}`;
    const text = appendFooter(s.body_text, { unsubscribeUrl });
    const content = rules.checkColdEmail({ touch: s.touch, subject: s.subject, body: s.body_text, replyOnly: s.touch === 1 && b.reply_only !== false });
    const footer = rules.checkFooter(text, { postalAddress: postalAddress() });
    if (!content.ok || footer.length) { await cancel(`checker:${[...content.failures, ...footer][0].rule}`); continue; }

    const mailbox = seq.pickMailbox(cfg.mailboxes, sentToday, caps);
    if (!mailbox) { out.skipped += 1; continue; } // every mailbox is at today's cap
    // Claim first: if two sweeps overlap, only one gets the row, so nobody is emailed twice.
    const { data: claimed } = await db.from('cold_email_sends').update({ status: 'sending' }).eq('id', s.id).eq('status', 'approved').select('id');
    if (!claimed || claimed.length === 0) { out.skipped += 1; continue; }
    try {
      const res = await send({ cfg, mailbox, to: p.email, subject: s.subject, text, unsubscribeUrl, sendId: s.id });
      sentToday[mailbox] = (sentToday[mailbox] || 0) + 1;
      await db.from('cold_email_sends').update({ status: 'sent', sent_at: now.toISOString(), mailbox, message_id: res.messageId }).eq('id', s.id);
      await db.from('lo_prospects').update({ last_contacted_at: now.toISOString(), status: 'in_sequence' }).eq('id', p.id);
      out.sent += 1;
    } catch (err) {
      await db.from('cold_email_sends').update({ status: 'failed', skip_reason: String(err.message || err).slice(0, 200) }).eq('id', s.id);
      out.failed += 1;
    }
  }
  return out;
};

// ---- replies, bounces, unsubscribes ------------------------------------------
const stopSequence = async (db, prospectId) => {
  await db.from('cold_email_sends').update({ status: 'cancelled', skip_reason: 'sequence_stopped' }).eq('prospect_id', prospectId).in('status', ['approved', 'draft', 'pending']);
};

const handleReply = async (db, { fromEmail, subject, body, notify, createLead }) => {
  const email = emailKey(fromEmail);
  const { data: prospect } = await db.from('lo_prospects').select('*').eq('email', email).maybeSingle();
  const label = classifyReply(body);
  if (!prospect) return { matched: false, label };
  const { data: lastSend } = await db.from('cold_email_sends').select('id,touch,angle,opener').eq('prospect_id', prospect.id).eq('status', 'sent').order('sent_at', { ascending: false }).limit(1).maybeSingle();
  const drafted = draftReply({ label, firstName: prospect.first_name });
  await db.from('cold_email_replies').insert({ prospect_id: prospect.id, send_id: lastSend?.id || null, from_email: email, subject: String(subject || '').slice(0, 300), body_text: String(body || '').slice(0, 8000), class: label, drafted_reply: drafted || null });
  if (lastSend) await db.from('cold_email_sends').update({ replied_at: new Date().toISOString(), reply_class: label }).eq('id', lastSend.id);
  if (STOPS_SEQUENCE.has(label)) await stopSequence(db, prospect.id);
  if (label === 'out_of_office') {
    // not a real reply: pause is enough, nothing is cancelled for good
  }
  const status = label === 'unsubscribe' ? 'unsubscribed' : label === 'angry' ? 'complained' : 'replied';
  await db.from('lo_prospects').update({ status }).eq('id', prospect.id);
  if (SUPPRESSES.has(label)) await suppress(db, email, label === 'angry' ? 'cold_email_angry_reply' : 'cold_email_unsubscribe_reply');
  if (label === 'interested') {
    if (createLead) await createLead({ prospect, touch: lastSend?.touch || null, angle: lastSend?.angle || null, opener: lastSend?.opener || null, body });
    if (notify) await notify({ prospect, body, drafted });
  }
  return { matched: true, label, drafted };
};

const handleBounce = async (db, { email, kind = 'bounce' }) => {
  const key = emailKey(email);
  const { data: prospect } = await db.from('lo_prospects').select('id').eq('email', key).maybeSingle();
  await suppress(db, key, kind === 'complaint' ? 'cold_email_complaint' : 'cold_email_bounce');
  if (!prospect) return false;
  const col = kind === 'complaint' ? 'complained_at' : 'bounced_at';
  await db.from('cold_email_sends').update({ [col]: new Date().toISOString() }).eq('prospect_id', prospect.id).eq('status', 'sent');
  await db.from('lo_prospects').update({ status: kind === 'complaint' ? 'complained' : 'bounced' }).eq('id', prospect.id);
  await stopSequence(db, prospect.id);
  return true;
};

const unsubscribeByToken = async (db, token) => {
  const { data: prospect } = await db.from('lo_prospects').select('id,email').eq('unsub_token', token).maybeSingle();
  if (!prospect) return false;
  await suppress(db, prospect.email, 'cold_email_unsubscribe_link');
  await db.from('lo_prospects').update({ status: 'unsubscribed' }).eq('id', prospect.id);
  await stopSequence(db, prospect.id);
  return true;
};

const recordClick = async (db, token) => {
  const { data: prospect } = await db.from('lo_prospects').select('id').eq('unsub_token', token).maybeSingle();
  if (!prospect) return false;
  await db.from('cold_email_sends').update({ clicked_at: new Date().toISOString() }).eq('prospect_id', prospect.id).eq('status', 'sent').is('clicked_at', null);
  return true;
};

// ---- dashboard ----------------------------------------------------------------
const loadResults = async (db) => {
  const { data: sends } = await db.from('cold_email_sends').select('status,touch,angle,opener,variant_id,sent_at,clicked_at,replied_at,reply_class,bounced_at,complained_at').eq('status', 'sent').limit(50000);
  const { data: prospects } = await db.from('lo_prospects').select('email,status').in('status', ['in_sequence', 'replied', 'demo_booked']).limit(20000);
  let trialsStarted = 0;
  const emails = (prospects || []).map((p) => p.email);
  for (let i = 0; i < emails.length; i += 200) {
    const { count } = await db.from('agents').select('id', { count: 'exact', head: true }).in('email', emails.slice(i, i + 200)).eq('account_type', 'lo');
    trialsStarted += count || 0;
  }
  const demosBooked = (prospects || []).filter((p) => p.status === 'demo_booked').length;
  return computeResults(sends || [], { trialsStarted, demosBooked });
};

module.exports = {
  TABLE_MISSING, tablesReady, importProspects, promoteFromFinder, verifyProspects, createBatch, generateDrafts, editSend, approveBatch,
  sweep, handleReply, handleBounce, unsubscribeByToken, recordClick, loadResults, loadSuppression, mxLookup, FIRST_SEND_LIMIT
};
