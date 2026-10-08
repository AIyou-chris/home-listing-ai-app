import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminMarketingStudioService, type StudioCampaign } from '../../services/adminMarketingStudioService';
import {
  adminColdEmailService as api, parseProspectCsv,
  type SendSwitch, type ColdBatch, type ColdDraft, type ColdExamples, type ColdOverview, type ColdProspect, type ColdReply, type ColdResults, type ColdSend
} from '../../services/adminColdEmailService';

// Cold email to loan officers. Plain steps: Setup, Prospects, Write and send, Replies, Results, Examples.
// Nothing sends until a batch is approved here AND the sending domain is set up on the server.

type Tab = 'setup' | 'prospects' | 'send' | 'replies' | 'results' | 'examples';
const TABS: Array<[Tab, string]> = [['setup', '1. Setup'], ['prospects', '2. Prospects'], ['send', '3. Write and send'], ['replies', 'Replies'], ['results', 'Results'], ['examples', 'Examples']];

const ANGLE_LABEL: Record<string, string> = {
  agent_referrals: 'Agent referrals', warm_vs_cold: 'Warm vs. cold leads', built_for_market: 'Built for this market', time_saver: 'Time saver (the 9pm buyer)'
};
const OPENER_LABEL: Record<string, string> = {
  A: 'A: market + slow referrals (safe)', B: 'B: a real fact about them', C: 'C: their brokerage', D: 'D: Chris, a loan officer too', E: 'E: the paid-lead problem'
};

const btn = 'rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50';
const primary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
const ghost = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';

const Problems: React.FC<{ items: string[] }> = ({ items }) => items.length === 0 ? null : (
  <ul role="alert" className="mt-2 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
    {items.map((m) => <li key={m}>• {m}</li>)}
  </ul>
);

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

// The master switch. Off means nothing is sent, no matter what is approved.
const SendSwitchCard: React.FC = () => {
  const [state, setState] = useState<SendSwitch | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setState(await api.sendSwitch()); } catch { setState(null); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (!state) return null;
  const blocked = !state.enabled && state.setupBlockers.length > 0;
  const flip = async () => {
    const next = !state.enabled;
    if (next && !window.confirm(`Turn email sending ON? ${state.waiting} approved email${state.waiting === 1 ? '' : 's'} will start going out in the next send window (Tuesday to Thursday mornings).`)) return;
    setBusy(true);
    try { await api.setSendSwitch(next); toast.success(next ? 'Sending is ON' : 'Sending is OFF'); await load(); } catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
  };
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${state.enabled ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
      <div>
        <p className="text-base font-bold text-slate-900">Email sending is {state.enabled ? 'ON' : 'OFF'}</p>
        <p className="text-sm text-slate-600">{state.enabled ? `${state.waiting} approved email${state.waiting === 1 ? '' : 's'} waiting to go out. Turn it off any time to stop everything.` : 'Nothing will be sent, even if emails are approved.'}</p>
        {blocked && <p className="mt-1 text-sm text-amber-800">Not ready to turn on: {state.setupBlockers[0]}</p>}
      </div>
      <button type="button" role="switch" aria-checked={state.enabled} aria-label="Email sending" disabled={busy || blocked} onClick={() => void flip()}
        className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${state.enabled ? 'bg-emerald-600' : 'bg-slate-400'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${state.enabled ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
};

const AdminColdEmailPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('setup');
  const [overview, setOverview] = useState<ColdOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setOverview(await api.overview()); setError(null); } catch (e) { setError(msg(e)); }
  }, []);
  useEffect(() => { if (open && !overview) void refresh(); }, [open, overview, refresh]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="cold-email-title">
      <div className="p-5 pb-0"><SendSwitchCard /></div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-5 text-left">
        <span>
          <span id="cold-email-title" className="block text-lg font-bold text-slate-900">Cold email to loan officers</span>
          <span className="block text-sm text-slate-600">Short, plain emails in 5 touches. Nothing sends until you approve it.</span>
        </span>
        <span className="material-symbols-outlined text-slate-500">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-200 p-5">
          {error && <p role="alert" className="mb-3 text-sm text-red-700">{error} <button type="button" className="underline" onClick={() => void refresh()}>Try again</button></p>}
          {overview && !overview.tablesReady && (
            <p role="alert" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              The database tables are missing. Run <code>cold-email-migration.sql</code> in the Supabase SQL editor, then reload.
            </p>
          )}
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Cold email steps">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>
            ))}
          </div>
          {tab === 'setup' && <SetupTab overview={overview} onRefresh={refresh} />}
          {tab === 'prospects' && <ProspectsTab overview={overview} onChange={refresh} />}
          {tab === 'send' && <SendTab overview={overview} onChange={refresh} />}
          {tab === 'replies' && <RepliesTab />}
          {tab === 'results' && <ResultsTab />}
          {tab === 'examples' && <ExamplesTab />}
        </div>
      )}
    </section>
  );
};

// ---- Setup ------------------------------------------------------------------
const SetupTab: React.FC<{ overview: ColdOverview | null; onRefresh: () => Promise<void> }> = ({ overview, onRefresh }) => {
  const [busy, setBusy] = useState(false);
  if (!overview) return <p className="text-sm text-slate-600">Loading…</p>;
  const c = overview.config;
  const rows: Array<[string, boolean, string]> = [
    ['Database tables', overview.tablesReady, 'Run cold-email-migration.sql in Supabase.'],
    ['Separate sending domain', Boolean(c.domain), 'Set COLD_EMAIL_DOMAIN on Render (see docs/COLD_EMAIL_DNS.md).'],
    ['Mailboxes', c.mailboxes > 0, 'Set COLD_EMAIL_MAILBOXES on Render.'],
    ['Postal address in every footer', Boolean(c.postalAddress), 'Set LO_MAILING_ADDRESS on Render.'],
    ['Replies and bounces connected', c.replyWebhook, 'Set MAILGUN_WEBHOOK_SIGNING_KEY and add the Mailgun route (docs/COLD_EMAIL_DNS.md).'],
    ['Sending switched on', c.enabled, 'Use the switch at the top of this section when you are ready.']
  ];
  const testSend = async () => {
    setBusy(true);
    try { const r = await api.testSend('cold email test', 'This is a test of the headers and footer.\n\nChris'); toast.success(`Test sent to ${r.sentTo}. Check the headers there.`); } catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
  };
  return (
    <div>
      <ul className="space-y-2">
        {rows.map(([label, ok, fix]) => (
          <li key={label} className="flex items-start gap-2 text-sm">
            <span aria-hidden="true">{ok ? '✅' : '⏳'}</span>
            <span><strong className="text-slate-900">{label}</strong>{!ok && <span className="block text-slate-600">{fix}</span>}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-600">Footer address: {c.postalAddress}. The first batch you approve is capped at 20 emails.</p>
      <Problems items={overview.blockers} />
      <div className="mt-3 flex gap-2">
        <button type="button" className={ghost} onClick={() => void onRefresh()}>Check again</button>
        <button type="button" className={ghost} disabled={busy || overview.blockers.length > 0} onClick={() => void testSend()}>{busy ? 'Sending…' : 'Send a test to me'}</button>
      </div>
    </div>
  );
};

// ---- Prospects --------------------------------------------------------------
const ProspectsTab: React.FC<{ overview: ColdOverview | null; onChange: () => Promise<void> }> = ({ overview, onChange }) => {
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<ColdProspect[]>([]);
  const [filter, setFilter] = useState('verified');
  const [rejected, setRejected] = useState<Array<{ email: string; reason: string }>>([]);

  const load = useCallback(async () => { try { setList((await api.prospects(filter)).prospects); } catch (e) { toast.error(msg(e)); } }, [filter]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try { toast.success(await fn()); await onChange(); await load(); } catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
  };
  const importCsv = () => run(async () => {
    const rows = parseProspectCsv(csv);
    if (!rows.length) throw new Error('Paste a CSV with a header row (email, first_name, company, city, state).');
    const r = await api.importProspects(rows);
    setRejected(r.rejected.slice(0, 20));
    setCsv('');
    return `${r.added} added, ${r.duplicates} duplicates, ${r.rejected.length} skipped.`;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Business emails of loan officers only, from their professional listings. Role addresses (info@, admin@), anyone who unsubscribed and duplicates are dropped automatically. A personal fact is only kept if you give its source link.</p>
      <div className="flex flex-wrap gap-2 text-sm text-slate-700">
        {overview && Object.entries(overview.counts).map(([k, v]) => <span key={k} className="rounded-full bg-slate-100 px-2 py-1">{k.replace('_', ' ')}: {v}</span>)}
      </div>
      <label className="block text-sm font-semibold text-slate-800">Paste CSV (columns: email, first_name, last_name, company, city, state, fact, fact_url)
        <textarea className={`${input} mt-1 min-h-[110px] font-mono text-xs font-normal`} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="email,first_name,company,city,state" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={busy || !csv.trim()} onClick={() => void importCsv()}>Import CSV</button>
        <button type="button" className={ghost} disabled={busy} onClick={() => void run(async () => { const r = await api.fromFinder(); return `${r.added} added from the Lead Finder.`; })}>Add from Lead Finder</button>
        <button type="button" className={ghost} disabled={busy} onClick={() => void run(async () => { const r = await api.verify(); return `${r.verified} verified, ${r.bad} bad addresses.`; })}>Check the new ones</button>
      </div>
      {rejected.length > 0 && <Problems items={rejected.map((r) => `${r.email}: ${r.reason}`)} />}
      <div>
        <label className="text-sm font-semibold text-slate-800">Show
          <select className={`${input} ml-2 inline-block w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)}>
            {['new', 'verified', 'in_sequence', 'replied', 'demo_booked', 'unsubscribed', 'bounced', 'bad_email'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </label>
        <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm">
          {list.length === 0 && <li className="py-2 text-slate-500">None here.</li>}
          {list.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate">{p.first_name || '—'} · {p.email}{p.company ? ` · ${p.company}` : ''}</span>
              {p.status === 'replied' && <button type="button" className={ghost} onClick={() => void api.markDemo(p.id).then(load)}>Demo booked</button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ---- Write and send ------------------------------------------------------------
const SendTab: React.FC<{ overview: ColdOverview | null; onChange: () => Promise<void> }> = ({ overview, onChange }) => {
  const [angle, setAngle] = useState('agent_referrals');
  const [opener, setOpener] = useState('A');
  const [replyOnly, setReplyOnly] = useState(true);
  const [variant, setVariant] = useState('A');
  const [windowKind, setWindowKind] = useState('morning');
  const [campaigns, setCampaigns] = useState<StudioCampaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [draft, setDraft] = useState<ColdDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState<ColdProspect[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ batch: ColdBatch; sends: ColdSend[] } | null>(null);

  useEffect(() => { void adminMarketingStudioService.list().then((all) => setCampaigns(all.filter((c) => c.status === 'approved'))).catch(() => undefined); }, []);
  useEffect(() => { void api.prospects('verified').then((r) => setVerified(r.prospects)).catch(() => undefined); }, [overview]);
  const loadBatch = useCallback(async (id: string) => { try { setBatch(await api.batch(id)); } catch (e) { toast.error(msg(e)); } }, []);
  useEffect(() => { if (batchId) void loadBatch(batchId); }, [batchId, loadBatch]);

  const wrap = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.error(msg(e)); } finally { setBusy(false); } };
  const togglePick = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const createBatch = () => wrap(async () => {
    const r = await api.createBatch({ name: `${ANGLE_LABEL[angle]} · ${new Date().toLocaleDateString()}`, angle, opener, variantId: variant, window: windowKind, replyOnly, prospectIds: [...picked], ...(campaignId ? { marketingCampaignId: campaignId } : {}) });
    setBatchId(r.batch.id); setPicked(new Set());
    toast.success(`${r.queued} queued${r.skipped ? `, ${r.skipped} skipped (emailed in the last 30 days or not verified)` : ''}.`);
    await onChange();
  });
  const generate = () => wrap(async () => {
    if (!batchId) return;
    let remaining = 1; let guard = 0;
    while (remaining > 0 && guard < 30) { const r = await api.generate(batchId); remaining = r.remaining; guard += 1; if (!r.generated) break; }
    await loadBatch(batchId);
  });
  const approve = () => wrap(async () => {
    if (!batchId) return;
    const phrase = window.confirm('Approve this batch? Each person gets all 5 emails over about 16 days, only Tuesday to Thursday mornings. Nothing sends until the sending domain is switched on.');
    if (!phrase) return;
    const r = await api.approve(batchId);
    toast.success(`${r.approved} approved${r.blocked ? `, ${r.blocked} blocked by the checker` : ''}${r.heldBack ? `, ${r.heldBack} held back (first send is capped at ${r.firstSendCap})` : ''}.`);
    await loadBatch(batchId); await onChange();
  });

  const firstTouches = useMemo(() => (batch?.sends || []).filter((s) => s.touch === 1), [batch]);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-800">Angle
          <select className={`${input} mt-1 font-normal`} value={angle} onChange={(e) => setAngle(e.target.value)}>
            {Object.entries(ANGLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">Opener
          <select className={`${input} mt-1 font-normal`} value={opener} onChange={(e) => setOpener(e.target.value)}>
            {Object.entries(OPENER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">Test name (one thing changes per batch)
          <input className={`${input} mt-1 font-normal`} value={variant} onChange={(e) => setVariant(e.target.value.slice(0, 20))} />
        </label>
        <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Tie to a marketing campaign (optional)
          <select className={`${input} mt-1 font-normal`} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">No campaign</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{(c.outputs.title || c.idea || 'Campaign').slice(0, 80)}</option>)}
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">The campaign's idea shapes what each email leads with. Only approved campaigns show up.</span>
        </label>
        <label className="text-sm font-semibold text-slate-800">Send time
          <select className={`${input} mt-1 font-normal`} value={windowKind} onChange={(e) => setWindowKind(e.target.value)}>
            <option value="morning">Tue–Thu, 7:30–9:30am their time</option>
            <option value="afternoon">Tue–Thu, 3:30–5:30pm their time (test)</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-800"><input type="checkbox" checked={replyOnly} onChange={(e) => setReplyOnly(e.target.checked)} /> First email has no link (reply only)</label>

      <div className="rounded-xl border border-slate-200 p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">Try one first</p>
        <button type="button" className={ghost} disabled={busy} onClick={() => void wrap(async () => setDraft(await api.draft({ angle, opener, replyOnly, firstName: 'Sam' })))}>{busy ? 'Writing…' : 'Write a sample email'}</button>
        {draft && (
          <div className="mt-3 text-sm">
            <p className="font-semibold text-slate-900">Subject: {draft.subject}</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{draft.body_text}</pre>
            <p className="mt-1 text-slate-600">{draft.word_count} words · {draft.ok ? '✅ passed every check' : '❌ blocked'}</p>
            <Problems items={draft.flags} />
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-900">Pick people ({picked.size} chosen, {verified.length} verified)</p>
        <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto text-sm">
          {verified.length === 0 && <li className="py-2 text-slate-500">No verified prospects yet. Import some and press "Check the new ones".</li>}
          {verified.slice(0, 100).map((p) => (
            <li key={p.id}><label className="flex items-center gap-2 py-1.5"><input type="checkbox" checked={picked.has(p.id)} onChange={() => togglePick(p.id)} />{p.first_name || '—'} · {p.email}</label></li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <button type="button" className={ghost} onClick={() => setPicked(new Set(verified.slice(0, 100).map((p) => p.id)))}>Pick first 100</button>
          <button type="button" className={primary} disabled={busy || picked.size === 0} onClick={() => void createBatch()}>Make a batch</button>
        </div>
      </div>

      {batch && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <p className="text-sm font-semibold text-slate-900">{batch.batch.name} <span className="rounded-full bg-white px-2 py-0.5 text-xs">{batch.batch.status}</span></p>
          {batch.batch.paused_reason && <p className="text-sm text-amber-800">Paused: {batch.batch.paused_reason}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={ghost} disabled={busy} onClick={() => void generate()}>Write the emails</button>
            <button type="button" className={primary} disabled={busy || batch.batch.status !== 'draft'} onClick={() => void approve()}>Approve this batch</button>
            {batch.batch.status === 'approved' && <button type="button" className={ghost} onClick={() => void api.pause(batch.batch.id).then(() => loadBatch(batch.batch.id))}>Pause</button>}
            {batch.batch.status === 'paused' && <button type="button" className={ghost} onClick={() => void api.resume(batch.batch.id).then(() => loadBatch(batch.batch.id))}>Resume</button>}
          </div>
          <ul className="mt-3 divide-y divide-slate-200 text-sm">
            {firstTouches.map((s) => (
              <li key={s.id} className="py-2">
                <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                  <span className="truncate">{s.lo_prospects?.first_name || s.lo_prospects?.email} · {s.subject || '(not written yet)'}</span>
                  <span>{s.status === 'pending' ? '…' : s.check_failures.length ? '❌' : '✅'}</span>
                </button>
                {openId === s.id && <DraftEditor send={s} onSaved={() => void loadBatch(batch.batch.id)} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const DraftEditor: React.FC<{ send: ColdSend; onSaved: () => void }> = ({ send, onSaved }) => {
  const [subject, setSubject] = useState(send.subject || '');
  const [body, setBody] = useState(send.body_text || '');
  const [problems, setProblems] = useState<string[]>(send.check_failures || []);
  const save = async () => {
    try { const r = await api.editSend(send.id, subject, body); setProblems(r.failures.map((f) => f.message)); toast[r.ok ? 'success' : 'error'](r.ok ? 'Saved. It passes every check.' : 'Saved, but it is still blocked.'); onSaved(); } catch (e) { toast.error(msg(e)); }
  };
  return (
    <div className="mt-2 space-y-2">
      <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
      <textarea className={`${input} min-h-[190px]`} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Email body" />
      <Problems items={problems} />
      <button type="button" className={primary} onClick={() => void save()}>Save and check</button>
    </div>
  );
};

// ---- Replies ----------------------------------------------------------------
const RepliesTab: React.FC = () => {
  const [replies, setReplies] = useState<ColdReply[]>([]);
  const [from, setFrom] = useState('');
  const [text, setText] = useState('');
  const load = useCallback(async () => { try { setReplies((await api.replies()).replies); } catch (e) { toast.error(msg(e)); } }, []);
  useEffect(() => { void load(); }, [load]);
  const log = async () => {
    try { const r = await api.logReply(from, '', text); toast.success(r.matched ? `Filed as: ${r.label.replace('_', ' ')}` : 'That address is not a prospect.'); setText(''); await load(); } catch (e) { toast.error(msg(e)); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Replies stop the sequence. "Interested" replies become a lead and email you a drafted answer. Nothing is ever sent for you.</p>
      <ul className="space-y-3">
        {replies.length === 0 && <li className="text-sm text-slate-500">No replies yet.</li>}
        {replies.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-semibold text-slate-900">{r.from_email} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{r.class.replace('_', ' ')}</span></p>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{r.body_text.slice(0, 400)}</p>
            {r.drafted_reply && <details className="mt-2"><summary className="cursor-pointer text-indigo-700">Draft reply</summary><pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2">{r.drafted_reply}</pre></details>}
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-slate-200 p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">Got a reply in your inbox? File it here</p>
        <input className={`${input} mb-2`} placeholder="Their email" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Their email" />
        <textarea className={`${input} mb-2 min-h-[80px]`} placeholder="Paste what they wrote" value={text} onChange={(e) => setText(e.target.value)} aria-label="Their reply" />
        <button type="button" className={primary} disabled={!from.trim() || !text.trim()} onClick={() => void log()}>File the reply</button>
      </div>
    </div>
  );
};

// ---- Results ----------------------------------------------------------------
const Row: React.FC<{ label: string; g: ColdResults['total'] | ColdResults['byAngle'][string] }> = ({ label, g }) => (
  <tr className="border-t border-slate-100">
    <td className="py-1.5 pr-2 font-medium text-slate-900">{label}</td><td className="px-2">{g.sent}</td><td className="px-2">{g.replyRate}%</td>
    <td className="px-2 font-semibold text-emerald-700">{g.positivePer100}</td><td className="px-2">{g.clicked}</td><td className="px-2">{g.bounceRate}%</td><td className="px-2">{g.complaintRate}%</td>
  </tr>
);
const ResultsTab: React.FC = () => {
  const [r, setR] = useState<ColdResults | null>(null);
  useEffect(() => { void api.results().then(setR).catch((e) => toast.error(msg(e))); }, []);
  if (!r) return <p className="text-sm text-slate-600">Loading…</p>;
  const group = (title: string, data: Record<string, ColdResults['total']>) => (
    <div key={title} className="overflow-x-auto">
      <p className="mb-1 mt-4 text-sm font-semibold text-slate-900">{title}</p>
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="text-xs uppercase text-slate-500"><tr><th>Group</th><th className="px-2">Sent</th><th className="px-2">Replies</th><th className="px-2">Good replies per 100</th><th className="px-2">Clicks</th><th className="px-2">Bounce</th><th className="px-2">Spam</th></tr></thead>
        <tbody>{Object.entries(data).map(([k, v]) => <Row key={k} label={ANGLE_LABEL[k] || OPENER_LABEL[k] || (title === 'By touch' ? `Email ${k}` : k)} g={v} />)}</tbody>
      </table>
    </div>
  );
  return (
    <div>
      <p className="rounded-lg bg-indigo-50 p-3 text-sm text-slate-800">{r.summary}</p>
      <p className="mt-2 text-sm text-slate-600">What matters is good replies per 100 emails, not opens. Trials started: {r.total.trialsStarted}. Demos booked: {r.total.demosBooked}.</p>
      {group('By angle', r.byAngle as never)}{group('By opener', r.byOpener as never)}{group('By touch', r.byTouch as never)}{group('By test name', r.byVariant as never)}
    </div>
  );
};

// ---- Examples ---------------------------------------------------------------
const ExamplesTab: React.FC = () => {
  const [ex, setEx] = useState<ColdExamples | null>(null);
  useEffect(() => { void api.examples().then(setEx).catch((e) => toast.error(msg(e))); }, []);
  if (!ex) return <p className="text-sm text-slate-600">Loading…</p>;
  const Mail: React.FC<{ subject: string; body: string; tag?: string }> = ({ subject, body, tag }) => (
    <details className="rounded-lg border border-slate-200 p-3 text-sm">
      <summary className="cursor-pointer font-semibold text-slate-900">{subject}{tag && <span className="ml-2 text-xs font-normal text-slate-500">{tag}</span>}</summary>
      <pre className="mt-2 whitespace-pre-wrap text-slate-800">{body}</pre>
    </details>
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">What good looks like. Every one passes the same checker as your real emails. Match the voice and length, do not copy them word for word.</p>
      <p className="text-sm font-semibold text-slate-900">12 first emails</p>
      {ex.firstTouches.map((m) => <Mail key={m.subject + m.angle} subject={m.subject} body={m.body} tag={`${ANGLE_LABEL[m.angle]} · opener ${m.opener}`} />)}
      <p className="pt-2 text-sm font-semibold text-slate-900">4 full sequences</p>
      {ex.sequences.map((s) => (
        <details key={s.name} className="rounded-lg border border-slate-200 p-3 text-sm"><summary className="cursor-pointer font-semibold text-slate-900">{s.name}</summary>
          <div className="mt-2 space-y-2">{Object.entries(s.touches).map(([n, t]) => <Mail key={n} subject={`Email ${n}: ${t.subject}`} body={t.body} />)}</div></details>
      ))}
      <p className="pt-2 text-sm font-semibold text-slate-900">5 break-up emails</p>
      {ex.breakups.map((m) => <Mail key={m.subject} subject={m.subject} body={m.body} />)}
    </div>
  );
};

export default AdminColdEmailPanel;
