'use strict';

// Admin cold email to loan officers. Everything is verifyAdmin except the signed webhooks and the unsubscribe page.
const engine = require('../services/coldEmail/engine');
const sender = require('../services/coldEmail/sender');
const rules = require('../services/coldEmail/rules');
const examples = require('../services/coldEmail/examples');
const templates = require('../services/coldEmail/templates');
const writer = require('../services/coldEmail/writer');
const seq = require('../services/coldEmail/sequence');
const { appendFooter, listUnsubscribeHeaders, postalAddress } = require('../services/coldEmail/compliance');

const page = (title, message) => `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;color:#0f172a"><h2>${title}</h2><p style="line-height:1.6;color:#334155">${message}</p></body>`;

const register = (app, deps) => {
  const { verifyAdmin, supabaseAdmin: db, openai, emailService, verifyMailgunSignature, signingKey, signingKeyIsSet, defaultLeadUserId, upload, ownerAlertEmail } = deps;
  const cfg = () => sender.readConfig();
  const fail = (res, err, code = 'cold_email_failed') => {
    console.error(`[ColdEmail] ${code}:`, err?.message || err);
    const missing = engine.TABLE_MISSING.test(err?.message || '');
    res.status(missing ? 409 : 500).json({ error: missing ? 'tables_missing' : code, message: missing ? 'Run cold-email-migration.sql in Supabase first.' : undefined });
  };
  const complete = async (prompt) => {
    if (!openai) throw new Error('ai_unavailable');
    const r = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 500, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] });
    return r.choices[0]?.message?.content || '';
  };
  const winnerHint = async () => {
    try { const r = await engine.loadResults(db); return r.winner.angle ? `angle ${r.winner.angle}${r.winner.opener ? `, opener ${r.winner.opener}` : ''}` : ''; } catch { return ''; }
  };

  // ---- status / checklist ----
  app.get('/api/admin/cold-email/overview', verifyAdmin, async (req, res) => {
    try {
      const c = cfg();
      const ready = await engine.tablesReady(db);
      const out = {
        tablesReady: ready,
        blockers: sender.blockers(c),
        config: { domain: c.domain || null, mailboxes: c.mailboxes.length, enabled: c.enabled, postalAddress: postalAddress(), replyWebhook: Boolean(signingKeyIsSet) },
        counts: {}
      };
      if (ready) {
        for (const status of ['new', 'verified', 'in_sequence', 'replied', 'unsubscribed', 'bounced', 'bad_email']) {
          const { count } = await db.from('lo_prospects').select('id', { count: 'exact', head: true }).eq('status', status);
          out.counts[status] = count || 0;
        }
        const { data: batches } = await db.from('cold_email_batches').select('*').order('created_at', { ascending: false }).limit(20);
        out.batches = batches || [];
      }
      res.json(out);
    } catch (err) { fail(res, err); }
  });

  app.get('/api/admin/cold-email/examples', verifyAdmin, (req, res) => {
    const vals = examples.SAMPLE;
    res.json({
      firstTouches: examples.FIRST_TOUCHES.map((x) => ({ angle: x.angle, opener: x.opener, subject: templates.fill(x.subject, vals), body: templates.fill(x.body, vals) })),
      sequences: examples.SEQUENCES.map((s) => ({ name: s.name, touches: Object.fromEntries(Object.entries(s.touches).map(([n, t]) => [n, { subject: templates.fill(t.subject, vals), body: templates.fill(t.body, vals) }])) })),
      breakups: examples.BREAKUPS.map((b) => ({ subject: b.subject, body: templates.fill(b.body, vals) })),
      angles: writer.ANGLES, openers: writer.OPENERS
    });
  });

  // ---- prospects ----
  app.post('/api/admin/cold-email/prospects/import', verifyAdmin, async (req, res) => {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      if (!rows.length) return res.status(400).json({ error: 'rows_required' });
      res.json(await engine.importProspects(db, rows));
    } catch (err) { fail(res, err); }
  });
  app.post('/api/admin/cold-email/prospects/from-finder', verifyAdmin, async (req, res) => {
    try { res.json(await engine.promoteFromFinder(db, Math.min(Number(req.body?.limit) || 200, 1000))); } catch (err) { fail(res, err); }
  });
  app.post('/api/admin/cold-email/prospects/verify', verifyAdmin, async (req, res) => {
    try { res.json(await engine.verifyProspects(db, { limit: Math.min(Number(req.body?.limit) || 200, 500) })); } catch (err) { fail(res, err); }
  });
  app.get('/api/admin/cold-email/prospects', verifyAdmin, async (req, res) => {
    try {
      let q = db.from('lo_prospects').select('id,email,first_name,last_name,company,city,state,status,source,personalization_fact,last_contacted_at,created_at').order('created_at', { ascending: false }).limit(Math.min(Number(req.query.limit) || 100, 500));
      if (req.query.status) q = q.eq('status', String(req.query.status));
      const { data, error } = await q;
      if (error) throw error;
      res.json({ prospects: data || [] });
    } catch (err) { fail(res, err); }
  });
  app.post('/api/admin/cold-email/prospects/:id/mark', verifyAdmin, async (req, res) => {
    try {
      const status = req.body?.status === 'demo_booked' ? 'demo_booked' : null;
      if (!status) return res.status(400).json({ error: 'status_not_allowed' });
      await db.from('lo_prospects').update({ status }).eq('id', req.params.id);
      res.json({ success: true });
    } catch (err) { fail(res, err); }
  });

  // ---- writing / checking ----
  app.post('/api/admin/cold-email/check', verifyAdmin, (req, res) => {
    const { touch = 1, subject = '', body = '', replyOnly = false } = req.body || {};
    const result = rules.checkColdEmail({ touch: Number(touch) || 1, subject, body, replyOnly: Boolean(replyOnly) });
    res.json({ ok: result.ok, wordCount: result.wordCount, failures: result.failures });
  });
  app.post('/api/admin/cold-email/draft', verifyAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      let p = {};
      if (b.prospectId) { const { data } = await db.from('lo_prospects').select('*').eq('id', b.prospectId).maybeSingle(); if (data) p = data; }
      const draft = await writer.draftFirstTouch({
        complete,
        params: { angle: b.angle || 'agent_referrals', opener: b.opener, firstName: p.first_name || b.firstName, company: p.company || b.company, market: p.city || b.market, personalizationFact: p.personalization_fact || b.personalizationFact, replyOnly: b.replyOnly !== false, winner: await winnerHint() }
      });
      res.json(draft);
    } catch (err) { fail(res, err, 'draft_failed'); }
  });

  // ---- batches ----
  app.post('/api/admin/cold-email/batches', verifyAdmin, async (req, res) => {
    try { res.json(await engine.createBatch(db, req.body || {})); } catch (err) { if (/required|pick/.test(err.message)) return res.status(400).json({ error: err.message }); fail(res, err); }
  });
  app.get('/api/admin/cold-email/batches/:id', verifyAdmin, async (req, res) => {
    try {
      const { data: batch } = await db.from('cold_email_batches').select('*').eq('id', req.params.id).maybeSingle();
      if (!batch) return res.status(404).json({ error: 'not_found' });
      const { data: sends } = await db.from('cold_email_sends').select('id,touch,subject,body_text,check_failures,status,scheduled_for,sent_at,reply_class,lo_prospects(email,first_name,company)').eq('batch_id', req.params.id).order('touch', { ascending: true }).limit(1000);
      res.json({ batch, sends: sends || [] });
    } catch (err) { fail(res, err); }
  });
  app.post('/api/admin/cold-email/batches/:id/generate', verifyAdmin, async (req, res) => {
    try { res.json(await engine.generateDrafts(db, req.params.id, { complete, limit: 8, winner: await winnerHint() })); } catch (err) { fail(res, err, 'generate_failed'); }
  });
  app.patch('/api/admin/cold-email/sends/:id', verifyAdmin, async (req, res) => {
    try { res.json(await engine.editSend(db, req.params.id, { subject: String(req.body?.subject || ''), body_text: String(req.body?.body_text || '') })); } catch (err) { if (err.message === 'not_editable') return res.status(409).json({ error: 'not_editable' }); fail(res, err); }
  });
  app.post('/api/admin/cold-email/batches/:id/approve', verifyAdmin, async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(400).json({ error: 'confirm_required' });
      res.json(await engine.approveBatch(db, req.params.id, { approvedBy: req.user?.email || null, cfg: cfg() }));
    } catch (err) { if (err.message === 'batch_not_draft') return res.status(409).json({ error: err.message }); fail(res, err); }
  });
  const setBatchPaused = (pausing) => async (req, res) => {
    try {
      await db.from('cold_email_batches').update({ status: pausing ? 'paused' : 'approved', paused_reason: pausing ? 'Paused by admin' : null }).eq('id', req.params.id);
      res.json({ success: true });
    } catch (err) { fail(res, err); }
  };
  app.post('/api/admin/cold-email/batches/:id/pause', verifyAdmin, setBatchPaused(true));
  app.post('/api/admin/cold-email/batches/:id/resume', verifyAdmin, setBatchPaused(false));
  app.post('/api/admin/cold-email/run', verifyAdmin, async (req, res) => {
    try { res.json(await engine.sweep(db, { cfg: cfg() })); } catch (err) { fail(res, err, 'sweep_failed'); }
  });

  // Test send goes to the admin's own mailbox so the headers can be inspected. Never to a prospect.
  app.post('/api/admin/cold-email/test-send', verifyAdmin, async (req, res) => {
    try {
      const c = cfg();
      const blockers = sender.blockers({ ...c, enabled: true });
      if (blockers.length) return res.status(409).json({ error: 'not_configured', blockers });
      const to = req.user?.email;
      if (!to) return res.status(400).json({ error: 'no_admin_email' });
      const unsubscribeUrl = `${c.backendUrl}/api/public/cold-unsubscribe/test-token`;
      const subject = `[TEST] ${String(req.body?.subject || 'cold email test').slice(0, 120)}`;
      const text = appendFooter(String(req.body?.body || 'This is a test of the cold email headers and footer.\n\nChris'), { unsubscribeUrl });
      await sender.sendColdEmail({ cfg: c, mailbox: c.mailboxes[0], to, subject, text, unsubscribeUrl });
      res.json({ success: true, sentTo: to, headers: Object.keys(listUnsubscribeHeaders({ unsubscribeUrl })) });
    } catch (err) { fail(res, err, 'test_send_failed'); }
  });

  app.get('/api/admin/cold-email/results', verifyAdmin, async (req, res) => {
    try { res.json(await engine.loadResults(db)); } catch (err) { fail(res, err); }
  });

  // Log a reply by hand (useful before the inbound webhook is connected).
  const replyContext = () => ({
    notify: async ({ prospect, body, drafted }) => {
      if (!emailService || !ownerAlertEmail) return;
      await emailService.sendEmail({
        to: ownerAlertEmail,
        subject: `Warm reply from ${prospect.first_name || prospect.email}`,
        html: `<p><strong>${prospect.first_name || ''} ${prospect.last_name || ''}</strong> (${prospect.email}${prospect.company ? `, ${prospect.company}` : ''}) replied to your cold email:</p><pre style="white-space:pre-wrap">${String(body).slice(0, 1500).replace(/</g, '&lt;')}</pre><p><strong>Draft reply (not sent):</strong></p><pre style="white-space:pre-wrap">${String(drafted || '').replace(/</g, '&lt;')}</pre>`,
        tags: { template: 'cold-email-reply' }
      });
    },
    createLead: async ({ prospect, touch, angle, opener, body }) => {
      if (!defaultLeadUserId) return;
      await db.from('leads').insert({
        user_id: defaultLeadUserId,
        name: [prospect.first_name, prospect.last_name].filter(Boolean).join(' ') || prospect.email,
        email: prospect.email,
        source: 'cold-email',
        status: 'New',
        last_message: String(body).slice(0, 500),
        source_meta: { touch, angle, opener, company: prospect.company || null },
        created_at: new Date().toISOString()
      });
    }
  });
  app.post('/api/admin/cold-email/replies', verifyAdmin, async (req, res) => {
    try {
      const { fromEmail, subject, body } = req.body || {};
      if (!fromEmail || !body) return res.status(400).json({ error: 'fromEmail_and_body_required' });
      res.json(await engine.handleReply(db, { fromEmail, subject, body, ...replyContext() }));
    } catch (err) { fail(res, err); }
  });
  app.get('/api/admin/cold-email/replies', verifyAdmin, async (req, res) => {
    try {
      const { data } = await db.from('cold_email_replies').select('id,from_email,subject,body_text,class,drafted_reply,handled,created_at').order('created_at', { ascending: false }).limit(50);
      res.json({ replies: data || [] });
    } catch (err) { fail(res, err); }
  });

  // ---- signed Mailgun inbound: replies to the cold-email mailboxes ----
  app.post('/api/webhooks/mailgun/cold-reply', upload ? upload.none() : (req, res, next) => next(), async (req, res) => {
    try {
      const body = req.body || {};
      const sig = body.signature && typeof body.signature === 'object' ? body.signature : { timestamp: body.timestamp, token: body.token, signature: body.signature };
      if (!signingKeyIsSet) return res.status(500).json({ error: 'mailgun_webhook_signing_key_misconfigured' });
      if (!sig.signature || !verifyMailgunSignature(signingKey, sig.timestamp, sig.token, sig.signature)) return res.status(401).json({ error: 'Invalid signature' });
      const from = String(body.sender || body.from || '').match(/[^\s<>"]+@[^\s<>"]+/)?.[0];
      const result = await engine.handleReply(db, { fromEmail: from, subject: body.subject, body: body['stripped-text'] || body['body-plain'] || '', ...replyContext() });
      res.json({ ok: true, label: result.label });
    } catch (err) { console.error('[ColdEmail] reply webhook failed:', err); res.status(200).json({ ok: false }); }
  });

  // ---- public unsubscribe (link, and one-click POST from the List-Unsubscribe header) ----
  app.get('/api/public/cold-unsubscribe/:token', async (req, res) => {
    try {
      const ok = await engine.unsubscribeByToken(db, String(req.params.token || ''));
      res.type('html').send(ok ? page('You are unsubscribed', 'You will not get any more emails from us. Sorry for the interruption.') : page('Already done', 'This link is no longer active, so nothing more will be sent.'));
    } catch { res.status(500).type('html').send(page('Something went wrong', 'Please reply STOP to the email and we will remove you.')); }
  });
  app.post('/api/public/cold-unsubscribe/:token', async (req, res) => {
    try { await engine.unsubscribeByToken(db, String(req.params.token || '')); res.json({ ok: true }); } catch { res.status(500).json({ ok: false }); }
  });
};

module.exports = { register, rulesTouchDays: seq.TOUCH_DAYS };
