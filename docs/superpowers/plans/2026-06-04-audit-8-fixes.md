# Audit 8 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 8 ❌ failures from the full HomeListingAI audit: invite management, partner removal, lead export, dunning email, Mailgun key hardening, Sentry monitoring, and WOW Link revocation state.

**Architecture:** All fixes are additive backend routes in `backend/server.cjs`, one update to `backend/services/billingEngine.js` for dunning, Sentry initialization at server boot, and one enhancement to the public WOW Link endpoint to respect partnership status.

**Tech Stack:** Node.js/Express, Supabase, Mailgun (emailService), Stripe (billingEngine), @sentry/node

---

## Files Modified

- **Modify:** `backend/server.cjs` — Tasks 1, 2, 3, 4, 6, 7, 8
- **Modify:** `backend/services/billingEngine.js` — Task 5
- **Modify:** `package.json` — Task 7 (add @sentry/node)

---

### Task 1: Invite Resend Endpoint

**Fix:** ❌ 2.1c — LO can resend an invite if agent didn't receive it

**File:** `backend/server.cjs` — add after the existing `POST /api/lo/partners/invite` route (around line 30588)

- [ ] **Add the resend route**

```javascript
// ── POST /api/lo/partners/invite/:inviteId/resend ─────────────────────────────
app.post('/api/lo/partners/invite/:inviteId/resend', requireAuth, async (req, res) => {
  try {
    const loAuthId = req.authUserId;
    const { inviteId } = req.params;

    const { data: invite } = await supabaseAdmin
      .from('agent_invites')
      .select('id, token, invited_email, invited_name, claimed_at, expires_at, lo_agent_id, listing_id')
      .eq('id', inviteId)
      .eq('lo_agent_id', loAuthId)
      .maybeSingle();

    if (!invite) return res.status(404).json({ error: 'invite_not_found' });
    if (invite.claimed_at) return res.status(409).json({ error: 'already_claimed' });

    // Extend expiry by 30 days from now
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('agent_invites').update({ expires_at: newExpiry }).eq('id', inviteId);

    let loProfileId = loAuthId;
    try { loProfileId = (await resolveLoAgentId(req)) || loAuthId; } catch { /* fallback */ }

    const { data: loAgent } = await supabaseAdmin.from('agents')
      .select('id, first_name, last_name, company, headshot_url')
      .eq('id', loProfileId).limit(1).maybeSingle();

    const appBase = (process.env.APP_BASE_URL || process.env.DASHBOARD_BASE_URL || 'https://homelistingai.com').replace(/\/$/, '');
    const wowLink = `${appBase}/partner-invite/${invite.token}`;
    const claimLink = `${appBase}/agent/claim/${invite.token}`;
    const loName = [loAgent?.first_name, loAgent?.last_name].filter(Boolean).join(' ') || 'Your Loan Officer';
    const loBrand = await resolveBrandForLoAgent(loAgent?.id).catch(() => ({ whiteLabel: false, brandColor: '#2563eb', logoUrl: null, companyName: null }));
    const name = invite.invited_name;

    const emailHtml = `
<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
${buildBrandedEmailHeader(loBrand, `${loName} built something for your listings`)}
<p style="font-size:16px;">Hi${name ? ` ${name}` : ''},</p>
<p style="font-size:15px;color:#475569;line-height:1.6;">Resending this — I built a live demo of what your listings could look like with my AI financing assistant built in.</p>
<div style="text-align:center;margin:32px 0;">
  <a href="${wowLink}" style="background:#2563eb;color:white;text-decoration:none;padding:16px 36px;border-radius:12px;font-weight:700;font-size:16px;display:inline-block;">See Your Listing Demo →</a>
</div>
<p style="font-size:13px;color:#94a3b8;text-align:center;">No account needed to view · Link valid for 30 more days</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
<p style="font-size:13px;color:#64748b;">Ready to claim your account? <a href="${claimLink}" style="color:#2563eb;">Click here →</a></p>
</body></html>`;

    await emailService.sendEmail({
      to: invite.invited_email,
      subject: `[Reminder] ${loName} built a listing demo for you`,
      html: emailHtml
    });

    res.json({ success: true, wowLink });
  } catch (err) {
    console.error('[LO Invite Resend] Failed:', err);
    res.status(500).json({ error: 'resend_failed' });
  }
});
```

---

### Task 2: Invite Revoke Endpoint

**Fix:** ❌ 2.1d — LO can cancel/revoke a pending invite

**File:** `backend/server.cjs` — add after Task 1's resend route

- [ ] **Add the revoke route**

```javascript
// ── DELETE /api/lo/partners/invite/:inviteId ──────────────────────────────────
app.delete('/api/lo/partners/invite/:inviteId', requireAuth, async (req, res) => {
  try {
    const loAuthId = req.authUserId;
    const { inviteId } = req.params;

    const { data: invite } = await supabaseAdmin
      .from('agent_invites')
      .select('id, claimed_at, lo_agent_id')
      .eq('id', inviteId)
      .eq('lo_agent_id', loAuthId)
      .maybeSingle();

    if (!invite) return res.status(404).json({ error: 'invite_not_found' });
    if (invite.claimed_at) return res.status(409).json({ error: 'already_claimed_cannot_revoke' });

    // Expire immediately — PartnerInvitePage already shows "Link Unavailable" for expired tokens
    await supabaseAdmin.from('agent_invites').update({ expires_at: new Date().toISOString() }).eq('id', inviteId);

    res.json({ success: true });
  } catch (err) {
    console.error('[LO Invite Revoke] Failed:', err);
    res.status(500).json({ error: 'revoke_failed' });
  }
});
```

---

### Task 3: Partner Removal Endpoint + WOW Link Invalidation

**Fix:** ❌ 2.3b — LO can remove agent partner · 🔲 WOW Link shows correct state when removed

**File:** `backend/server.cjs` — add after `GET /api/lo/partners` route (around line 31190)

Also update `GET /api/public/partner-invite/:token` to check partnership status for claimed tokens.

- [ ] **Add the partner removal route**

```javascript
// ── DELETE /api/lo/partners/:partnershipId ────────────────────────────────────
app.delete('/api/lo/partners/:partnershipId', requireAuth, async (req, res) => {
  try {
    const loAuthId = req.authUserId;
    const { partnershipId } = req.params;

    const { data: partnership } = await supabaseAdmin
      .from('lo_agent_partnerships')
      .select('id, lo_agent_id, agent_id, status')
      .eq('id', partnershipId)
      .eq('lo_agent_id', loAuthId)
      .maybeSingle();

    if (!partnership) return res.status(404).json({ error: 'partnership_not_found' });
    if (partnership.status === 'removed') return res.status(409).json({ error: 'already_removed' });

    // Mark partnership inactive
    await supabaseAdmin.from('lo_agent_partnerships')
      .update({ status: 'removed' })
      .eq('id', partnershipId);

    // Disable LO branding on all listings for this agent
    await supabaseAdmin.from('listing_lo_assignments')
      .update({ branding_enabled: false })
      .eq('lo_agent_id', loAuthId)
      .eq('listing_id', supabaseAdmin.from('listings').select('id').eq('agent_id', partnership.agent_id));

    // Expire all unclaimed invite tokens for this LO+agent pair
    const { data: agentRow } = await supabaseAdmin.from('agents')
      .select('email').eq('id', partnership.agent_id).maybeSingle();
    if (agentRow?.email) {
      await supabaseAdmin.from('agent_invites')
        .update({ expires_at: new Date().toISOString() })
        .eq('lo_agent_id', loAuthId)
        .eq('invited_email', agentRow.email.toLowerCase())
        .is('claimed_at', null);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[LO Partner Remove] Failed:', err);
    res.status(500).json({ error: 'remove_failed' });
  }
});
```

- [ ] **Update `GET /api/public/partner-invite/:token` to check partnership status for claimed tokens**

In the existing route, after the `expires_at` check, add:

```javascript
// If token was claimed, verify the partnership is still active
if (invite.claimed_at) {
  const { data: claimedAgent } = await supabaseAdmin
    .from('agent_invites')
    .select('claimed_agent_id')
    .eq('id', invite.id)
    .maybeSingle();
  if (claimedAgent?.claimed_agent_id) {
    const { data: partnership } = await supabaseAdmin
      .from('lo_agent_partnerships')
      .select('status')
      .eq('lo_agent_id', invite.lo_agent_id)
      .eq('agent_id', claimedAgent.claimed_agent_id)
      .maybeSingle();
    if (partnership && partnership.status === 'removed') {
      return res.status(410).json({ error: 'partnership_ended' });
    }
  }
}
```

---

### Task 4: Lead CSV Export for LO

**Fix:** ❌ 5.3b — Lead data exports correctly (no LO-facing export exists)

**File:** `backend/server.cjs` — add near the other LO dashboard routes (after `GET /api/lo/dashboard/today`)

- [ ] **Add the CSV export route**

```javascript
// ── GET /api/lo/leads/export.csv ─────────────────────────────────────────────
app.get('/api/lo/leads/export.csv', requireAuth, async (req, res) => {
  try {
    const loAgentId = req.authUserId;

    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select('full_name, name, email_lower, email, phone, status, source_type, source_meta, created_at, listing_id')
      .eq('lo_agent_id', loAgentId)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;

    // Fetch listing addresses for context
    const listingIds = [...new Set((leads || []).map(l => l.listing_id).filter(Boolean))];
    let addressMap = {};
    if (listingIds.length > 0) {
      const { data: listingRows } = await supabaseAdmin.from('listings').select('id, address').in('id', listingIds);
      (listingRows || []).forEach(r => { addressMap[r.id] = r.address; });
    }

    const csvEscape = (v) => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const headers = ['Name', 'Email', 'Phone', 'Listing Address', 'Source', 'Context', 'Status', 'Created At'];
    const rows = (leads || []).map(l => [
      l.full_name || l.name || '',
      l.email_lower || l.email || '',
      l.phone || '',
      addressMap[l.listing_id] || '',
      l.source_type || '',
      l.source_meta?.context || '',
      l.status || 'new',
      l.created_at ? new Date(l.created_at).toISOString().split('T')[0] : ''
    ].map(csvEscape).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('[LO Lead Export] Failed:', err);
    res.status(500).json({ error: 'export_failed' });
  }
});
```

---

### Task 5: Dunning Email on `invoice.payment_failed`

**Fix:** ❌ 7.3b — Failed recurring charge triggers dunning email (DB update works; email is missing)

**File:** `backend/services/billingEngine.js` — update the `invoice.payment_failed` handler

- [ ] **Find the section (around line 1100) and add email send after the DB update:**

In the existing `invoice.payment_failed` block, after `await syncAgentBillingFields(...)`, add:

```javascript
      // Send dunning email so LO knows their payment failed
      if (type === 'invoice.payment_failed') {
        try {
          const { data: agentRow } = await supabaseAdmin.from('agents')
            .select('email, first_name')
            .or(`id.eq.${agentId},auth_user_id.eq.${agentId}`)
            .limit(1).maybeSingle();
          if (agentRow?.email) {
            await emailService.sendEmail({
              to: agentRow.email,
              subject: 'Action required: your HomeListingAI payment failed',
              html: `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
<h2 style="color:#dc2626;">Payment failed</h2>
<p>Hi${agentRow.first_name ? ` ${agentRow.first_name}` : ''},</p>
<p>We weren't able to process your most recent HomeListingAI payment. Your account is currently paused.</p>
<p>To keep your WOW Links and AI assistant active, please update your payment method:</p>
<div style="text-align:center;margin:28px 0;">
  <a href="${process.env.APP_BASE_URL || 'https://homelistingai.com'}/dashboard/settings/billing" style="background:#2563eb;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">Update Payment Method →</a>
</div>
<p style="color:#64748b;font-size:13px;">If you believe this is an error, reply to this email and we'll sort it out.</p>
</body></html>`
            });
          }
        } catch (emailErr) {
          console.warn('[Billing] Dunning email failed (non-fatal):', emailErr?.message);
        }
      }
```

Note: `emailService` must be passed into `createBillingEngine`. Check the factory call in `server.cjs` to confirm it's already threaded through (it is — check the `createBillingEngine({ ..., emailService })` call).

---

### Task 6: Mailgun Signing Key Hardening

**Fix:** ❌ 8.3b / ❌ 11b — Mailgun webhook verification broken when signing key equals API key

**File:** `backend/server.cjs` — update the webhook endpoint (around line 1908 and 2074)

- [ ] **Reject webhook requests when using the fallback key instead of silently verifying them**

In both Mailgun webhook handlers, after the `verifyMailgunSignature` check, add a guard before the signature check:

Change the guard at the top of each webhook handler from a soft warn to a hard reject:

```javascript
// At line ~1908 (inbound webhook) and ~2074 (event webhook)
// Replace the existing signature check with:
if (MAILGUN_WEBHOOK_SIGNING_KEY === MAILGUN_API_KEY) {
  console.error('🚨 [Mailgun Webhook] MAILGUN_WEBHOOK_SIGNING_KEY is not set. Set it in your environment to the Webhook Signing Key from the Mailgun dashboard (different from your API key). Rejecting webhook.');
  return res.status(500).json({ error: 'mailgun_webhook_signing_key_misconfigured' });
}
```

This surfaces the misconfiguration immediately rather than silently accepting unverified events.

Also update the startup warning at line ~70:
```javascript
if (MAILGUN_WEBHOOK_SIGNING_KEY === MAILGUN_API_KEY) {
  console.error('🚨 [Config] MAILGUN_WEBHOOK_SIGNING_KEY is not configured. Set MAILGUN_WEBHOOK_SIGNING_KEY in your environment to the Webhook Signing Key (not the API key) from the Mailgun dashboard. Email webhook events will be rejected until this is set.');
}
```

---

### Task 7: Sentry Error Monitoring

**Fix:** ❌ 9.3a — No production error monitoring

**Files:** `package.json`, `backend/server.cjs`

- [ ] **Install @sentry/node**

```bash
npm install @sentry/node
```

- [ ] **Initialize Sentry at top of server.cjs** (add after existing `require` block, around line 25):

```javascript
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
  });
  console.info('[Sentry] Error monitoring initialized');
} else {
  console.warn('[Sentry] SENTRY_DSN not set — error monitoring disabled');
}
```

- [ ] **Add Sentry error capture in the global Express error handler** (find the existing error handler, typically at the end of server.cjs):

```javascript
// In the global error handler:
app.use((err, req, res, next) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
  console.error('[Global] Unhandled error:', err);
  res.status(500).json({ error: 'internal_server_error' });
});
```

- [ ] **Add to .env.example or document in CLAUDE.md:**

```
SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

---

### Task 8: WOW Link Partnership Status Check

**Fix:** 🔲 10.3c — WOW Link shows appropriate state when partner removed

This is implemented as part of Task 3 (the `GET /api/public/partner-invite/:token` update to check partnership status for claimed tokens, returning `410 partnership_ended`). The `PartnerInvitePage.tsx` already handles any non-`success` response by showing "Link Unavailable."

Verify the existing error state in `src/pages/PartnerInvitePage.tsx`:
```tsx
// Already present — handles any error (including partnership_ended):
if (error || !data) return (
  <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">link_off</span>
    <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Unavailable</h1>
    <p className="text-slate-500">{error || 'This invite link is invalid or has expired.'}</p>
  </div>
);
```

The `partnership_ended` API error hits the `else` branch in the fetch handler, sets `error` to "Invalid or expired invite link." and renders the above. No frontend change needed.

---

## Execution Order

Tasks 1→2→3→4 can be done sequentially (all backend/server.cjs additions).
Task 5 is billingEngine.js — do after 1-4.
Task 6 is a small change in server.cjs.
Task 7 requires `npm install` first, then server.cjs changes.
Task 8 is verified complete via Task 3.
