# LO Acquisition Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin send a prospective Loan Officer a personalized, tracked pitch link from the Marketing Funnels page, and see who opened it and who clicked through to sign up.

**Architecture:** A new public pitch page (`ForLoanOfficersPage`) reachable with or without a tracking token. A new `lo_outreach_invites` table + four Express endpoints (two admin, two public) mirror the proven `agent_invites` WOW Link pattern. A new admin component (`AdminLoOutreachPanel`) — a sender form plus a tracking table — is rendered inside the existing Marketing Funnels panel.

**Tech Stack:** React 18 + TypeScript + Tailwind (frontend), Express 5 monolith `backend/server.cjs` (backend), Supabase Postgres via `supabaseAdmin`, `emailService` for sending. No new dependencies.

---

## Reference material

- **Approved visual mockup:** `.superpowers/brainstorm/*/content/lo-pitch-mockup.html` — the page JSX in Task 4 is the React port of this.
- **Spec:** `docs/superpowers/specs/2026-06-17-lo-acquisition-link-design.md`
- **Pattern to mirror (backend):** `agent_invites` endpoints in `backend/server.cjs`:
  - create: ~line 31374 (`/api/lo/partners/invite`)
  - public data: ~line 31582 (`/api/public/partner-invite/:token`)
  - event: ~line 31676 (`/api/public/partner-invite/:token/event`)
- **Pattern to mirror (frontend page):** `src/pages/PartnerInvitePage.tsx`
- **Pattern to mirror (admin sender UI):** `InviteModal` in `src/components/dashboard-command/LOPartnersPage.tsx` (lines 160-301)
- **Pattern to mirror (admin table + auth):** `src/admin-dashboard/components/AdminLOPage.tsx` (uses `AuthService.getInstance().makeAuthenticatedRequest()` with relative paths)

### Conventions confirmed in the codebase

- `crypto` is already required in `server.cjs` (used at line 552). Generate tokens with `crypto.randomBytes(16).toString('hex')`.
- App base URL: `const appBase = process.env.APP_BASE_URL || process.env.DASHBOARD_BASE_URL || 'https://homelistingai.com';`
- Email: `const emailService = createEmailService(supabaseAdmin);` already exists at module scope (line 1404). Use `emailService.sendEmail({ to, subject, html })`.
- Admin auth middleware: `verifyAdmin` (defined at `server.cjs:15614`). Use it directly: `app.post('/path', verifyAdmin, async (req, res) => {...})`.
- Admin identity inside a `verifyAdmin` route: `await resolveRequesterUserId(req, { allowDefault: false })` returns the auth id (may be null — store as-is).
- `nowIso()` helper exists for timestamps.

### Testing note

There is no DB available in the Jest environment, and the backend endpoints are thin Supabase/email wrappers — so they are verified manually with `curl` and the dev preview (per the spec). The frontend pitch page and admin panel are presentational; they are verified visually in the preview. This plan uses **manual verification steps with exact commands and expected output** in place of automated tests where automated tests would not exercise real behavior.

---

## File Structure

| File | Responsibility | New/Modified |
|---|---|---|
| `lo-outreach-invites-migration.sql` | Creates `lo_outreach_invites` table + indexes | Create (repo root) |
| `backend/server.cjs` | 4 endpoints + `buildLoOutreachEmail()` helper | Modify |
| `src/pages/ForLoanOfficersPage.tsx` | Public pitch page (tokened + untokened), tracking wiring | Create |
| `src/App.tsx` | Two lazy routes + public-route allowlist entries | Modify |
| `src/components/admin/AdminLoOutreachPanel.tsx` | Admin sender form + tracking table | Create |
| `src/components/admin/AdminMarketingFunnelsPanel.tsx` | Render `AdminLoOutreachPanel` in the funnels view | Modify |

---

### Task 1: Database migration

**Files:**
- Create: `lo-outreach-invites-migration.sql` (repo root)

- [ ] **Step 1: Write the migration SQL**

Create `lo-outreach-invites-migration.sql`:

```sql
-- LO Acquisition Link — tracked outreach invites
-- Idempotent: safe to run multiple times.
create table if not exists public.lo_outreach_invites (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null,
  lo_name     text,
  lo_email    text not null,
  lo_phone    text,
  lo_website  text,
  status      text not null default 'sent',   -- sent | opened | clicked
  opened_at   timestamptz,
  clicked_at  timestamptz,
  created_by  text,                            -- admin auth id (may be null)
  created_at  timestamptz not null default now()
);

create index if not exists lo_outreach_invites_token_idx
  on public.lo_outreach_invites (token);

create index if not exists lo_outreach_invites_created_at_idx
  on public.lo_outreach_invites (created_at desc);
```

- [ ] **Step 2: Verify the SQL parses (syntax check only — no DB in this env)**

Run: `grep -c "create" lo-outreach-invites-migration.sql`
Expected: `3` (one table + two indexes)

- [ ] **Step 3: Commit**

```bash
git add lo-outreach-invites-migration.sql
git commit -m "feat: lo_outreach_invites migration"
```

- [ ] **Step 4: Hand the migration to the user to run**

The user runs migrations manually in the Supabase SQL editor (per CLAUDE.md). After committing, tell the user:
> "Run `lo-outreach-invites-migration.sql` in your Supabase SQL editor before testing the backend."

---

### Task 2: Backend — email builder + admin create/list endpoints

**Files:**
- Modify: `backend/server.cjs` (add near the WOW Link endpoints, after line ~31455)

- [ ] **Step 1: Add the email builder helper**

Add this function in `backend/server.cjs` immediately above the `/api/lo/partners/invite` route (search for `app.post('/api/lo/partners/invite'` and insert before it). It mirrors the tone of `buildWowLinkEmail`:

```javascript
// ── LO Acquisition Link email ─────────────────────────────────────────────────
function buildLoOutreachEmail({ name, link }) {
  const firstName = (name || '').trim().split(/\s+/)[0] || 'there';
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(160deg,#0f172a,#1e3a5f);padding:28px 24px;border-radius:16px 16px 0 0;text-align:center">
      <p style="color:#38bdf8;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px">For Loan Officers</p>
      <h1 style="color:#fff;font-size:22px;font-weight:900;line-height:1.25;margin:0">Your pipeline shouldn't slow down when you're off the clock.</h1>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px">
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px">HomeListingAI puts an AI concierge on every one of your partner agents' listings — it answers buyers 24/7 and routes every warm financing lead straight back to you. More leads, stickier agent partnerships, and your time back.</p>
      <a href="${link}" style="display:block;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-size:16px;font-weight:800;text-decoration:none;text-align:center;padding:15px;border-radius:14px;margin:20px 0">See how it works →</a>
      <p style="font-size:12px;color:#64748b;text-align:center;margin:0">No credit card · Cancel anytime · Live in under 5 minutes</p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0">Powered by HomeListingAI</p>
  </div>`;
}
```

- [ ] **Step 2: Add the admin create endpoint**

Add after the email builder (still above `/api/lo/partners/invite`, or directly after the WOW Link event route at ~line 31694 — either is fine; keep the two LO-outreach admin routes and two public routes together). Insert:

```javascript
// ── POST /api/admin/lo-outreach/invite — admin sends an LO acquisition link ────
app.post('/api/admin/lo-outreach/invite', verifyAdmin, async (req, res) => {
  try {
    const { email, name, phone, website } = req.body || {};
    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ error: 'valid_email_required' });
    }
    const adminId = await resolveRequesterUserId(req, { allowDefault: false }).catch(() => null);
    const token = crypto.randomBytes(16).toString('hex');
    const { error: insertErr } = await supabaseAdmin
      .from('lo_outreach_invites')
      .insert({
        token,
        lo_email: String(email).trim().toLowerCase(),
        lo_name: (name && String(name).trim()) || null,
        lo_phone: (phone && String(phone).trim()) || null,
        lo_website: (website && String(website).trim()) || null,
        created_by: adminId || null
      });
    if (insertErr) throw insertErr;

    const appBase = process.env.APP_BASE_URL || process.env.DASHBOARD_BASE_URL || 'https://homelistingai.com';
    const link = `${appBase.replace(/\/$/, '')}/for-loan-officers/${token}`;
    try {
      await emailService.sendEmail({
        to: String(email).trim().toLowerCase(),
        subject: 'Fill your pipeline while you sleep — a quick look',
        html: buildLoOutreachEmail({ name, link })
      });
    } catch (emailErr) {
      console.warn('[LO Outreach] Email failed (non-fatal):', emailErr?.message);
    }
    res.json({ success: true, link });
  } catch (err) {
    console.error('[LO Outreach] Create failed:', err);
    res.status(500).json({ error: 'invite_failed' });
  }
});

// ── GET /api/admin/lo-outreach/invites — list for the tracking table ───────────
app.get('/api/admin/lo-outreach/invites', verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('lo_outreach_invites')
      .select('id, lo_name, lo_email, lo_phone, lo_website, status, opened_at, clicked_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    res.json({ success: true, invites: data || [] });
  } catch (err) {
    console.error('[LO Outreach] List failed:', err);
    res.status(500).json({ error: 'list_failed' });
  }
});
```

- [ ] **Step 3: Lint the changed file**

Run: `npx eslint backend/server.cjs --no-eslintrc --parser-options ecmaVersion:2022 2>&1 | head` (or the project's normal lint). 
Expected: no new syntax errors reported for the added lines. If the project has no eslint config for `.cjs`, instead run `node --check backend/server.cjs` — Expected: no output (file parses).

- [ ] **Step 4: Commit**

```bash
git add backend/server.cjs
git commit -m "feat: LO outreach admin endpoints (create + list)"
```

---

### Task 3: Backend — public data + event endpoints

**Files:**
- Modify: `backend/server.cjs` (immediately after the admin list endpoint from Task 2)

- [ ] **Step 1: Add the public GET (records first open) and event endpoints**

```javascript
// ── GET /api/public/lo-invite/:token — pitch page data + record first open ─────
// Public, no auth. Returns the LO name for personalization. Never errors the page.
app.get('/api/public/lo-invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { data: invite } = await supabaseAdmin
      .from('lo_outreach_invites')
      .select('id, lo_name, opened_at')
      .eq('token', token)
      .maybeSingle();
    if (!invite) return res.json({ success: false });
    if (!invite.opened_at) {
      await supabaseAdmin
        .from('lo_outreach_invites')
        .update({ opened_at: nowIso(), status: 'opened' })
        .eq('token', token)
        .is('opened_at', null);
    }
    res.json({ success: true, name: invite.lo_name || null });
  } catch (err) {
    console.error('[LO Outreach] Public get failed:', err);
    res.json({ success: false });
  }
});

// ── POST /api/public/lo-invite/:token/event — record click ────────────────────
// Public, fire-and-forget. Only advances state forward.
app.post('/api/public/lo-invite/:token/event', async (req, res) => {
  const { token } = req.params;
  const { event } = req.body || {};
  if (!token || event !== 'clicked') {
    return res.status(400).json({ error: 'invalid_event' });
  }
  try {
    await supabaseAdmin
      .from('lo_outreach_invites')
      .update({ clicked_at: nowIso(), status: 'clicked' })
      .eq('token', token)
      .is('clicked_at', null);
    res.json({ success: true });
  } catch {
    res.json({ success: true }); // never block the pitch page
  }
});
```

- [ ] **Step 2: Verify the file still parses**

Run: `node --check backend/server.cjs`
Expected: no output (parses cleanly).

- [ ] **Step 3: Commit**

```bash
git add backend/server.cjs
git commit -m "feat: LO outreach public data + click event endpoints"
```

---

### Task 4: Frontend — the pitch page component

**Files:**
- Create: `src/pages/ForLoanOfficersPage.tsx`

- [ ] **Step 1: Create the page component**

This is the React port of the approved mockup, with tracking wiring built in. Create `src/pages/ForLoanOfficersPage.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../lib/api';

// Fire-and-forget click event — never blocks navigation.
const fireClick = (token: string) => {
  fetch(buildApiUrl(`/api/public/lo-invite/${token}/event`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'clicked' })
  }).catch(() => { /* silent */ });
};

const ForLoanOfficersPage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string | null>(null);
  const openedFired = useRef(false);

  useEffect(() => {
    document.title = 'HomeListingAI — For Loan Officers';
    if (!token || openedFired.current) return;
    openedFired.current = true;
    fetch(buildApiUrl(`/api/public/lo-invite/${token}`))
      .then(r => r.json())
      .then((d: { success?: boolean; name?: string | null }) => {
        if (d.success && d.name) setFirstName(d.name.trim().split(/\s+/)[0]);
      })
      .catch(() => { /* render untracked */ });
  }, [token]);

  const goSignup = () => {
    if (token) fireClick(token);
    navigate('/lo-signup');
  };

  const headline = firstName
    ? `${firstName}, your pipeline doesn't have to slow down when you're not working.`
    : `Your pipeline doesn't have to slow down when you're not working.`;

  return (
    <div className="min-h-screen bg-[#f1f5f9]" style={{ WebkitTapHighlightColor: 'transparent' }}>
      <div className="mx-auto max-w-[480px] bg-white shadow-sm">

        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-[#1e3a5f] px-6 pb-9 pt-10 text-center text-white">
          <span className="inline-block rounded-full border border-cyan-400/25 bg-cyan-400/12 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-cyan-300">
            For Loan Officers
          </span>
          <h1 className="mx-auto mt-4 max-w-[360px] text-[27px] font-black leading-[1.18] tracking-tight">
            {headline.split('slow down')[0]}<span className="text-[#38bdf8]">slow down</span>{headline.split('slow down')[1] || ''}
          </h1>
          <p className="mx-auto mt-3 max-w-[340px] text-sm leading-relaxed text-slate-300">
            HomeListingAI gives your partner agents AI-powered listings — and sends every warm lead straight back to you, 24/7.
          </p>
          <button onClick={goSignup} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-[16px] font-extrabold text-white shadow-[0_8px_24px_rgba(37,99,235,0.4)] active:scale-[0.99]">
            Start My Free 7-Day Trial →
          </button>
          <p className="mt-2.5 text-[11px] font-semibold text-slate-500">No credit card · Cancel anytime · Live in under 5 minutes</p>
        </div>

        {/* Stats */}
        <div className="flex border-b border-slate-100 bg-white">
          {[['24/7', 'AI works'], ['3x', 'More leads'], ['5min', 'To launch']].map(([n, l]) => (
            <div key={l} className="flex-1 border-r border-slate-100 py-4 text-center last:border-r-0">
              <div className="text-[22px] font-black text-slate-900">{n}</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{l}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="space-y-2.5 bg-[#f8fafc] px-5 py-6">
          <p className="text-center text-[10px] font-extrabold uppercase tracking-widest text-blue-600">How it works</p>
          {[
            { icon: '🤝', t: 'You send your agent a magic link', d: 'One tap. Your agent gets a live AI-powered listing demo — branded to you.' },
            { icon: '🏡', t: 'Their listing answers buyers 24/7', d: 'Your AI bot is live on every listing — answering questions, qualifying buyers, night and day.' },
            { icon: '🔥', t: 'Warm leads come straight to you', d: 'Every buyer who asks about financing gets routed to you — pre-qualified, automatically.' }
          ].map(s => (
            <div key={s.t} className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">{s.icon}</div>
              <div>
                <p className="text-[13px] font-extrabold text-slate-900">{s.t}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Value props */}
        <div className="bg-white px-5 py-6">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">Why LOs love it</p>
          <h2 className="mb-5 mt-1 text-[20px] font-black text-slate-900">Three things every LO wants.</h2>
          {[
            { icon: '🔥', bg: '#dbeafe', t: 'A pipeline that fills itself', d: 'Buyers ask your AI about financing at 11pm on a Sunday. You wake up to a qualified lead. No cold calls.' },
            { icon: '🤝', bg: '#dcfce7', t: 'Agents who actually call you back', d: 'When you make their listings smarter, you become their go-to LO. Partner count grows every time you hit send.' },
            { icon: '⏰', bg: '#fef3c7', t: 'Time to focus on what closes', d: 'The AI handles buyer questions, lead capture, and pre-qual intake. You spend your time on applications.' }
          ].map(p => (
            <div key={p.t} className="mb-4 flex items-start gap-3.5 last:mb-0">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl" style={{ background: p.bg }}>{p.icon}</div>
              <div>
                <p className="text-[15px] font-extrabold text-slate-900">{p.t}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{p.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Agent preview */}
        <div className="bg-[#f8fafc] px-5 py-6">
          <p className="mb-3 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-500">👇 This is what your agents get</p>
          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.1)]">
            <div className="flex h-[120px] items-end bg-gradient-to-br from-blue-900 to-blue-600 p-3">
              <div>
                <div className="text-[20px] font-black text-white">$875,000</div>
                <div className="text-[10px] text-white/75">2847 Sunset Ridge Dr, Austin TX</div>
              </div>
            </div>
            <div className="flex gap-2 p-3">
              <div className="flex-1 rounded-xl bg-blue-600 py-2.5 text-center text-[11px] font-extrabold text-white">💬 Talk to the Home</div>
              <div className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-center text-[11px] font-extrabold text-white">🏦 Ask About Financing</div>
            </div>
          </div>
          <p className="mt-2.5 text-center text-[12px] leading-relaxed text-slate-500">Every buyer question goes through your AI.<br />Every financing inquiry comes to <strong>you</strong>.</p>
        </div>

        {/* Social proof — TODO: replace with a real LO testimonial when available */}
        <div className="bg-gradient-to-br from-slate-900 to-[#1e3a5f] px-5 py-6">
          <p className="text-[15px] italic leading-relaxed text-slate-200">"I sent this to 6 agents on a Friday. By Monday I had 3 new listings on the platform and 2 pre-qual requests in my inbox. Best tool I've ever used."</p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">M</div>
            <div>
              <div className="text-[13px] font-bold text-white">Marcus T.</div>
              <div className="text-[11px] text-slate-400">Senior Loan Officer · Dallas, TX</div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-white px-5 pb-9 pt-7 text-center">
          <h3 className="text-[20px] font-black text-slate-900">Start filling your pipeline today.</h3>
          <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-relaxed text-slate-500">7-day free trial. No card required. Your first WOW Link goes out in minutes.</p>
          <button onClick={goSignup} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-[16px] font-extrabold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] active:scale-[0.99]">
            Claim My Free Trial →
          </button>
        </div>

        <p className="bg-white pb-6 text-center text-[10px] text-slate-400">Powered by HomeListingAI</p>
      </div>
    </div>
  );
};

export default ForLoanOfficersPage;
```

- [ ] **Step 2: Type-check the new file**

Run: `npx tsc --noEmit 2>&1 | grep -i "ForLoanOfficersPage" | head`
Expected: no output (no type errors in the new file).

- [ ] **Step 3: Commit**

```bash
git add src/pages/ForLoanOfficersPage.tsx
git commit -m "feat: LO acquisition pitch page component"
```

---

### Task 5: Frontend — wire the routes

**Files:**
- Modify: `src/App.tsx` (lazy import ~line 41-54 area; routes near `/lo-signup` at ~line 1593; public-route allowlist near line 546)

- [ ] **Step 1: Add the lazy import**

In `src/App.tsx`, near the other lazy page imports (e.g. next to `const PartnerInvitePage = lazy(() => import('./pages/PartnerInvitePage'))` at line ~41), add:

```tsx
const ForLoanOfficersPage = lazy(() => import('./pages/ForLoanOfficersPage'))
```

- [ ] **Step 2: Add both routes**

Find the `/lo-signup` route (line ~1593: `<Route path="/lo-signup" element={<LOSignupPage />} />`) and add directly after it:

```tsx
<Route path="/for-loan-officers" element={<ForLoanOfficersPage />} />
<Route path="/for-loan-officers/:token" element={<ForLoanOfficersPage />} />
```

- [ ] **Step 3: Add paths to the public-route allowlist**

Find the array of public paths around line 546 (it contains `'/signup'`, `'/lo-signup'`, `'/demo-dashboard'`). Add both new paths to that same array:

```tsx
            '/signup',
            '/lo-signup',
            '/for-loan-officers',
            '/demo-dashboard',
```

Note: `/for-loan-officers` (a prefix) is sufficient if the array is checked with `startsWith`; if entries are matched exactly, also add `'/for-loan-officers/'`. Read the surrounding matching logic (search for where this array is consumed — look for `.some(` or `.includes(` or `startsWith` near the array) and match the existing comparison style. If matching is exact-equality, add the tokened form too; if it's `startsWith`/prefix, the single entry covers both routes.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -i "App.tsx" | head`
Expected: no output.

- [ ] **Step 5: Verify in the dev preview (untracked page renders without auth)**

Start the preview (preview_start if needed), then load `/for-loan-officers`.
- Confirm: page renders fully, no login redirect, no dashboard sidebar/chrome.
- Confirm: clicking "Start My Free 7-Day Trial →" navigates to `/lo-signup`.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire LO acquisition page routes (tokened + untokened, public)"
```

---

### Task 6: Frontend — admin sender + tracking table component

**Files:**
- Create: `src/components/admin/AdminLoOutreachPanel.tsx`

- [ ] **Step 1: Create the component**

This mirrors `InviteModal` (form) and `AdminLOPage` (table + auth). Create `src/components/admin/AdminLoOutreachPanel.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { AuthService } from '../../services/authService';

type Invite = {
  id: string;
  lo_name: string | null;
  lo_email: string;
  lo_phone: string | null;
  lo_website: string | null;
  status: string;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const check = (d: string | null) =>
  d ? <span className="text-emerald-600 font-bold">✓ {fmt(d)}</span> : <span className="text-slate-300">—</span>;

const AdminLoOutreachPanel: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [sentLink, setSentLink] = useState('');
  const [error, setError] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auth = AuthService.getInstance();
      const res = await auth.makeAuthenticatedRequest('/api/admin/lo-outreach/invites');
      const d = await res.json() as { invites?: Invite[] };
      setInvites(d.invites || []);
    } catch (e) {
      console.error('[LO Outreach] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    setError('');
    setSentLink('');
    try {
      const auth = AuthService.getInstance();
      const res = await auth.makeAuthenticatedRequest('/api/admin/lo-outreach/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined
        })
      });
      const d = await res.json() as { success?: boolean; link?: string };
      if (!res.ok || !d.success) { setError("Couldn't send — try again."); return; }
      setSentLink(d.link || '');
      setName(''); setEmail(''); setPhone(''); setWebsite('');
      await load();
    } catch {
      setError("Couldn't send — try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">📨 LO Outreach</h2>
        <p className="mt-1 text-sm text-slate-500">Send a prospective loan officer a personalized pitch link. Track who opens it and who clicks through.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="LO name (optional)" value={name} onChange={e => setName(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="LO email address" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Phone (optional)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Website (optional)" type="url" value={website} onChange={e => setWebsite(e.target.value)} />
        </div>

        <button onClick={send} disabled={sending || !email.trim()} className="mt-4 w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-50 sm:w-auto sm:px-8">
          {sending ? 'Sending…' : '🚀 Send Link →'}
        </button>

        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        {sentLink && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <span className="text-sm font-semibold text-emerald-700">✅ Link sent!</span>
            <button onClick={() => { navigator.clipboard.writeText(sentLink); }} className="ml-auto rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">📋 Copy link</button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-900">Sent invites</h3>
        </div>
        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['LO', 'Contact', 'Sent', 'Opened', 'Clicked'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{inv.lo_name || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-600">{inv.lo_email}</p>
                    <p className="text-xs text-slate-400">{inv.lo_phone || inv.lo_website || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmt(inv.created_at)}</td>
                  <td className="px-4 py-3 text-xs">{check(inv.opened_at)}</td>
                  <td className="px-4 py-3 text-xs">{check(inv.clicked_at)}</td>
                </tr>
              ))}
              {invites.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No invites sent yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminLoOutreachPanel;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -i "AdminLoOutreachPanel" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminLoOutreachPanel.tsx
git commit -m "feat: admin LO outreach sender + tracking table"
```

---

### Task 7: Frontend — render the panel inside the Funnels page

**Files:**
- Modify: `src/components/admin/AdminMarketingFunnelsPanel.tsx` (import near top with the other component imports ~lines 1-17; render right after the `</header>` at line ~1819)

- [ ] **Step 1: Add the import**

Near the top of `src/components/admin/AdminMarketingFunnelsPanel.tsx`, with the other imports (e.g. after `import SequenceFeedbackPanel from '../SequenceFeedbackPanel';` at line 7), add:

```tsx
import AdminLoOutreachPanel from './AdminLoOutreachPanel';
```

- [ ] **Step 2: Render the panel on the main funnels view**

Find the closing `</header>` tag at line ~1819. Immediately after it, and before the `{isAnalyticsOpen ? (` block at line ~1821, insert:

```tsx
                {!isAnalyticsOpen && (
                    <div className="mb-8">
                        <AdminLoOutreachPanel />
                    </div>
                )}
```

This shows the LO Outreach sender + table at the top of the Marketing Funnels view, and hides it when the admin drills into the analytics sub-view.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -i "AdminMarketingFunnelsPanel" | head`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminMarketingFunnelsPanel.tsx
git commit -m "feat: render LO outreach panel in Marketing Funnels page"
```

---

### Task 8: End-to-end verification

**Files:** none (verification only)

> Prerequisite: the user has run `lo-outreach-invites-migration.sql` in Supabase (Task 1, Step 4), and the backend is running (locally on :3002 or against the deployed backend).

- [ ] **Step 1: Backend — admin create endpoint rejects unauthenticated calls**

Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3002/api/admin/lo-outreach/invite -H "Content-Type: application/json" -d '{"email":"x@y.com"}'`
Expected: `401` (verifyAdmin blocks calls without a Bearer token).

- [ ] **Step 2: Backend — public token GET on an unknown token never errors**

Run: `curl -s http://localhost:3002/api/public/lo-invite/doesnotexist`
Expected: `{"success":false}`

- [ ] **Step 3: Backend — event endpoint rejects a bad event**

Run: `curl -s -X POST http://localhost:3002/api/public/lo-invite/sometoken/event -H "Content-Type: application/json" -d '{"event":"bogus"}'`
Expected: `{"error":"invalid_event"}`

- [ ] **Step 4: Frontend — admin can send and see the row**

In the dev preview, sign in as admin (`cdipotter@me.com`), open Admin → Marketing Funnels.
- Confirm the "📨 LO Outreach" card and "Sent invites" table render at the top.
- Fill the form with a test name + your own email, click "🚀 Send Link →".
- Confirm: success banner + Copy link button appears; a new row shows in the table with Opened/Clicked = "—".

- [ ] **Step 5: Frontend — open the link, confirm tracking**

Copy the link from the success banner (or the test email) and open `/for-loan-officers/<token>` in a new tab.
- Confirm: hero greets you by first name; page renders fully.
- Back in the admin table, reload — confirm "Opened ✓" now shows for that row.
- Click "Start My Free 7-Day Trial →" on the pitch page → lands on `/lo-signup`.
- Reload the admin table — confirm "Clicked ✓" now shows.

- [ ] **Step 6: Capture proof**

Take a preview screenshot of (a) the admin LO Outreach panel with a tracked row showing Opened ✓ / Clicked ✓, and (b) the pitch page personalized hero. Share with the user.

- [ ] **Step 7: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "fix: LO outreach verification adjustments"
```
(Skip if no changes were required during verification.)

---

## Self-Review

**1. Spec coverage**

| Spec requirement | Task |
|---|---|
| Tokenized pitch page `/for-loan-officers/:token` + untokened `/for-loan-officers` | Task 4, 5 |
| Light first-name personalization | Task 4 (GET), Task 2/3 (returns name) |
| CTA → `/lo-signup`, records click | Task 4 |
| Page renders without auth / dashboard chrome | Task 5 (allowlist + verify) |
| Unknown token still renders full page | Task 3 (returns `{success:false}`), Task 4 (ignores it) |
| Admin sender in Funnels page, mirrors WOW Link modal | Task 6, 7 |
| Fields: name (opt), email (req), phone (opt), website (opt) | Task 6 |
| Tracking table: opened/clicked per LO | Task 6 |
| `lo_outreach_invites` table + migration | Task 1 |
| 4 endpoints (2 admin verifyAdmin, 2 public) | Task 2, 3 |
| Email-only sending via emailService | Task 2 |
| Opened recorded once, click advances state | Task 3 |
| Admin fetches use makeAuthenticatedRequest + relative paths | Task 6 |
| No SMS / no CSV / no edit-resend-expiry (YAGNI) | Not built ✓ |

No gaps.

**2. Placeholder scan:** The testimonial in Task 4 carries an explicit `TODO: replace with a real LO testimonial` code comment — this is intentional per spec (placeholder copy flagged for the user), not a plan placeholder. No "TBD"/"implement later"/"add error handling" hand-waving remains; all code is complete.

**3. Type/name consistency:** `Invite` type fields (`lo_name`, `lo_email`, `lo_phone`, `lo_website`, `status`, `opened_at`, `clicked_at`, `created_at`) match the SQL columns (Task 1) and the `select` lists in Task 2/3. Endpoint paths are identical across backend (Task 2/3), the pitch page (Task 4: `/api/public/lo-invite/...`), and the admin panel (Task 6: `/api/admin/lo-outreach/...`). Token route param is `:token` everywhere. Event payload `{ event: 'clicked' }` matches the backend's `event !== 'clicked'` guard.
