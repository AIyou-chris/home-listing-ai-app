import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import { useDemoMode } from '../../demo/useDemoMode';
import './lo-brain.css';

// The Loan Officer Brain. Trained once; every listing uses it automatically.
// Backend: GET/PUT /api/lo/chatbot-config, GET /api/lo/brain/summary,
// POST /api/lo/brain/test, POST /api/lo/brain/feedback (see loBrainService.js).

const SEPARATOR = '\n\n---\n\n';

const getApiHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data } = await supabase.auth.getUser();
  return {
    'Content-Type': 'application/json',
    ...(data.user?.id ? { 'x-user-id': data.user.id } : {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  };
};

interface FaqItem { question: string; answer: string }

interface BrainConfig {
  bot_name: string;
  greeting: string;
  personality: string;
  knowledge_base: string;
  compliance_rules: string;
  faq: FaqItem[];
  is_active: boolean;
  tone: string;
  nmls_in_intro: boolean;
  marketing_voice: string;
  loan_advisor_rules: string;
  borrower_care_rules: string;
  company_name: string;
  company_nmls: string;
  licensed_states: string[];
  required_disclosure: string;
  banned_phrases: string[];
  voice_name: string;
  voice_style: string;
  calls_mode: Mode;
  texts_mode: Mode;
  call_opening: string;
  voicemail_message: string;
  sms_followup_template: string;
  sms_reminder_template: string;
}

type Mode = 'off' | 'ask' | 'auto';

interface BrainSummary {
  sourceCount: number;
  faqCount: number;
  lastUpdated: string | null;
  hasNmls: boolean;
  hasCompany: boolean;
  complianceEventsThisMonth: number | null;
  listings: { id: string; address: string; status: string | null; hasPaymentSchedule: boolean }[];
}

const EMPTY_CONFIG: BrainConfig = {
  bot_name: '', greeting: '', personality: '', knowledge_base: '', compliance_rules: '', faq: [], is_active: true,
  tone: 'Friendly and straight', nmls_in_intro: true, marketing_voice: '', loan_advisor_rules: '', borrower_care_rules: '',
  company_name: '', company_nmls: '', licensed_states: [], required_disclosure: '', banned_phrases: [],
  voice_name: 'marin',
  voice_style: 'Warm, calm and friendly. Speak at an easy pace, like a helpful neighbor.',
  calls_mode: 'off',
  texts_mode: 'ask',
  call_opening: 'Hi {first_name}, this is {ai_name}, the AI assistant for {lo_name}. You asked about {listing_address} — is now a good time for a quick question or two?',
  voicemail_message: 'Hi {first_name}, this is {ai_name}, the AI assistant for {lo_name}, following up on {listing_address}. No rush — call or text back any time.',
  sms_followup_template: "Hi {first_name}, it's {lo_name}'s AI assistant. Thanks for checking out {listing_address}! Want me to run payment numbers for you? Reply STOP to opt out.",
  sms_reminder_template: 'Hi {first_name}, quick reminder about your call with {lo_name} on {appointment_time}. Reply STOP to opt out.'
};

const VOICES: { id: string; label: string }[] = [
  { id: 'marin', label: 'Marin — most natural (recommended)' },
  { id: 'cedar', label: 'Cedar — most natural (recommended)' },
  { id: 'coral', label: 'Coral' }, { id: 'sage', label: 'Sage' }, { id: 'ballad', label: 'Ballad' }, { id: 'verse', label: 'Verse' },
  { id: 'alloy', label: 'Alloy' }, { id: 'ash', label: 'Ash' }, { id: 'echo', label: 'Echo' }, { id: 'fable', label: 'Fable' },
  { id: 'nova', label: 'Nova' }, { id: 'onyx', label: 'Onyx' }, { id: 'shimmer', label: 'Shimmer' }
];



const DEMO_CONFIG: BrainConfig = {
  ...EMPTY_CONFIG,
  bot_name: "Alex's Financing Assistant",
  greeting: 'Hi! Ask me anything about down payments, monthly costs, or getting pre-approved for this home.',
  knowledge_base: '[From: Rate sheet — rate-sheet.pdf]\nConventional 30-yr from 6.25% · FHA from 5.99% · VA from 5.75%.' + SEPARATOR + '[From: Loan programs — programs.txt]\nFHA, VA, Conventional, USDA, first-time buyer programs with 3% down.',
  faq: [{ question: "What's the minimum down payment?", answer: 'Conventional starts at 3% for first-time buyers, FHA at 3.5%, VA can be 0%.' }],
  marketing_voice: 'Who we talk to: first-time buyers and the agents who serve them.',
  loan_advisor_rules: 'Find out what they need first. One question at a time.',
  borrower_care_rules: 'Warm, calm, short. Answer first, then the next step.',
  company_name: 'Demo Home Loans', company_nmls: '000000', licensed_states: ['WA', 'OR'],
  required_disclosure: 'Estimates only. Not a commitment to lend.', banned_phrases: ['lowest rate']
};

const DEMO_SUMMARY: BrainSummary = {
  sourceCount: 2, faqCount: 1, lastUpdated: new Date().toISOString(), hasNmls: true, hasCompany: true, complianceEventsThisMonth: 0,
  listings: [
    { id: 'demo-1', address: '123 Demo Street', status: 'published', hasPaymentSchedule: true },
    { id: 'demo-2', address: '456 Sample Ave', status: 'published', hasPaymentSchedule: false }
  ]
};

const SOURCE_TYPES = ['Loan programs', 'Rate sheet', 'FAQs', 'About me', 'Website', 'Other'] as const;
type SourceType = typeof SOURCE_TYPES[number];

const ROUTE_LABEL: Record<string, string> = {
  loan_advisor: 'Loan Advisor rules',
  borrower_care: 'Borrower Care rules',
  listing: 'Listing facts'
};

const TONES = ['Friendly and straight', 'Warm and patient', 'Professional and precise', 'Upbeat and energetic'];

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>
);

const parseSources = (kb: string) => {
  if (!kb.trim()) return [];
  return kb.split(SEPARATOR).map((chunk, index) => {
    const trimmed = chunk.trim();
    const m = trimmed.match(/^\[From:\s*(.+?)\]/);
    const label = m ? m[1] : `Entry ${index + 1}`;
    const preview = trimmed.replace(/^\[From:[^\]]+\]\n?/, '').slice(0, 90).trim();
    return { index, label, preview };
  }).filter((c) => c.label || c.preview);
};


// ─── Add knowledge modal ─────────────────────────────────────────────────────

const AddSourceModal: React.FC<{
  onClose: () => void;
  onAdd: (text: string, label: string) => Promise<void>;
  demo: boolean;
}> = ({ onClose, onAdd, demo }) => {
  const [mode, setMode] = useState<'text' | 'file' | 'url'>('text');
  const [type, setType] = useState<SourceType>('Loan programs');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const guardDemo = () => {
    if (demo) toast('Adding knowledge is off in the demo — start your free trial to train your own brain.', { icon: '🔒' });
    return demo;
  };

  const addText = async () => {
    if (guardDemo() || !text.trim()) return;
    setBusy(true);
    const name = title.trim() || type;
    await onAdd(`[From: ${type} — ${name}]\n${text.trim()}`, name);
    setBusy(false);
    onClose();
  };

  const addFile = async (file: File) => {
    if (guardDemo()) return;
    setBusy(true);
    try {
      const headers = await getApiHeaders();
      delete headers['Content-Type'];
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(buildApiUrl('/api/lo/chatbot/extract-file'), { method: 'POST', headers, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not read that file');
      await onAdd(`[From: ${type} — ${file.name}]\n${data.text}`, file.name);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addUrl = async () => {
    if (guardDemo() || !url.trim()) return;
    setBusy(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl('/api/lo/chatbot/extract-url'), { method: 'POST', headers, body: JSON.stringify({ url: url.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not scan that page');
      await onAdd(`[From: ${type} — ${url.trim()}]\n${data.text}`, url.trim());
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not scan that page');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-source-title">
      <div className="lo-brain lb-card w-full max-w-xl p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="add-source-title" className="lb-h text-2xl">Add knowledge</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="lb-ghost !min-h-[40px] !px-3"><Icon name="close" /></button>
        </div>
        <label className="lb-label mb-1 block" htmlFor="src-type">What is it?</label>
        <select id="src-type" className="lb-input mb-4" value={type} onChange={(e) => setType(e.target.value as SourceType)}>
          {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="How to add it">
          {([['text', 'Paste text', 'edit_note'], ['file', 'Upload file', 'upload_file'], ['url', 'Scan website', 'travel_explore']] as const).map(([id, label, icon]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold ${mode === id ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
              <Icon name={icon} className="text-lg" />{label}
            </button>
          ))}
        </div>
        {mode === 'text' && (
          <div className="space-y-3">
            <div>
              <label className="lb-label mb-1 block" htmlFor="src-title">Name (optional)</label>
              <input id="src-title" className="lb-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Programs I offer" />
            </div>
            <div>
              <label className="lb-label mb-1 block" htmlFor="src-text">Text</label>
              <textarea id="src-text" className="lb-input h-40" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste anything your AI should know…" />
            </div>
            <button type="button" className="lb-btn w-full" disabled={busy || !text.trim()} onClick={() => void addText()}>{busy ? 'Saving…' : 'Add to brain'}</button>
          </div>
        )}
        {mode === 'file' && (
          <div>
            <input ref={fileRef} id="src-file" type="file" accept=".pdf,.txt,.csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void addFile(f); }} />
            <label htmlFor="src-file" className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-blue-400 bg-slate-50 px-6 py-10 text-center">
              <Icon name="upload_file" className="text-4xl text-blue-600" />
              <span className="font-bold">{busy ? 'Reading your file…' : 'Choose a PDF, TXT or CSV'}</span>
              <span className="lb-dim text-sm">Up to 25 MB</span>
            </label>
          </div>
        )}
        {mode === 'url' && (
          <div className="space-y-3">
            <label className="lb-label block" htmlFor="src-url">Web page</label>
            <input id="src-url" className="lb-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-website.com/about" />
            <button type="button" className="lb-btn w-full" disabled={busy || !url.trim()} onClick={() => void addUrl()}>{busy ? 'Scanning…' : 'Scan and add'}</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Chips input (states, banned words) ──────────────────────────────────────

const ChipsInput: React.FC<{
  id: string; label: string; hint?: string; values: string[]; onChange: (v: string[]) => void;
  tone: 'info' | 'missing'; placeholder: string; upper?: boolean;
}> = ({ id, label, hint, values, onChange, tone, placeholder, upper }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = upper ? draft.trim().toUpperCase() : draft.trim();
    if (!v || values.includes(v)) { setDraft(''); return; }
    onChange([...values, v]);
    setDraft('');
  };
  return (
    <div>
      <label className="lb-label mb-2 block" htmlFor={id}>{label}{hint && <span className="lb-dim font-normal"> · {hint}</span>}</label>
      <div className="mb-2 flex flex-wrap gap-2">
        {values.map((v) => (
          <span key={v} className={`lb-pill ${tone === 'info' ? 'lb-info' : 'lb-missing'} !py-1.5 !text-[13px]`}>
            {v}
            <button type="button" aria-label={`Remove ${v}`} className="ml-1.5 leading-none" onClick={() => onChange(values.filter((x) => x !== v))}><Icon name="close" className="text-[15px]" /></button>
          </span>
        ))}
        {!values.length && <span className="lb-dim text-sm">None yet</span>}
      </div>
      <div className="flex gap-2">
        <input id={id} className="lb-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="lb-ghost shrink-0" onClick={add}>Add</button>
      </div>
    </div>
  );
};

// ─── AI phone number (one per LO) ────────────────────────────────────────────

interface PhoneLineView {
  status: string;
  phoneNumber: string | null;
  reservedNumber: string | null;
  reservationExpiresAt: string | null;
  error: string | null;
  isTest: boolean;
  aiAnswering: boolean;
  transferNumber?: string | null;
}

interface PhoneCallView {
  id: string;
  from: string | null;
  name: string | null;
  status: string;
  mode: string;
  summary: string | null;
  intent: string | null;
  handoff: boolean;
  startedAt: string;
  seconds: number | null;
  transcript: { role: 'caller' | 'ai'; text: string }[];
}

const INTENT_PILL: Record<string, string> = { hot: 'bg-red-100 text-red-700', warm: 'bg-amber-100 text-amber-800', cold: 'bg-slate-100 text-slate-600' };

const RecentCalls: React.FC<{ demo: boolean }> = ({ demo }) => {
  const [calls, setCalls] = useState<PhoneCallView[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (demo) { setCalls([]); return; }
    (async () => {
      try {
        const res = await fetch(buildApiUrl('/api/lo/phone-calls'), { headers: await getApiHeaders() });
        const data = await res.json().catch(() => ({}));
        setCalls(Array.isArray(data.calls) ? data.calls : []);
      } catch { setCalls([]); }
    })();
  }, [demo]);
  if (!calls) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="lb-label">Recent calls</span>
      {calls.length === 0 && <p className="lb-dim text-sm">No calls yet. Call your number to hear your AI.</p>}
      {calls.map((c) => (
        <div key={c.id} className="rounded-xl border border-slate-200 bg-white">
          <button type="button" className="flex w-full items-center gap-3 px-3 py-2.5 text-left" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
            <Icon name={c.handoff ? 'phone_forwarded' : 'call'} className="text-xl text-blue-600" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{c.name || prettyPhone(c.from) || 'Unknown caller'}</span>
              <span className="lb-dim block truncate text-xs">{c.summary || (c.mode === 'ai' ? 'Call in progress or no words said' : c.mode === 'forward' ? 'Rang your cell' : 'Missed')}</span>
            </span>
            {c.intent && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${INTENT_PILL[c.intent] || INTENT_PILL.cold}`}>{c.intent}</span>}
            <span className="lb-dim text-xs">{new Date(c.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          </button>
          {open === c.id && (
            <div className="flex flex-col gap-1.5 border-t border-slate-100 px-3 py-3 text-sm">
              {c.transcript.length === 0 && <span className="lb-dim">No transcript for this call.</span>}
              {c.transcript.map((m, i) => (
                <p key={i}><span className={`font-semibold ${m.role === 'ai' ? 'text-blue-700' : 'text-slate-800'}`}>{m.role === 'ai' ? 'AI' : 'Caller'}:</span> {m.text}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const HandoffNumber: React.FC<{ demo: boolean; value: string | null; onSaved: (line: PhoneLineView) => void }> = ({ demo, value, onSaved }) => {
  const [number, setNumber] = useState(value ? prettyPhone(value) : '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (demo) { toast.success('Saved (demo).'); return; }
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/lo/phone-line/transfer'), { method: 'PUT', headers: await getApiHeaders(), body: JSON.stringify({ number }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.line) { onSaved(data.line); toast.success('Saved. Hot callers will ring this phone.'); }
      else toast.error(data.message || 'Could not save that number.');
    } catch { toast.error('Could not save. Try again.'); } finally { setSaving(false); }
  };
  return (
    <div>
      <label htmlFor="handoff-cell" className="lb-label mb-1 block">Pass hot callers to my cell</label>
      <div className="flex gap-2">
        <input id="handoff-cell" inputMode="tel" className="lb-input max-w-[220px]" placeholder="Your profile phone" value={number} onChange={(e) => setNumber(e.target.value)} />
        <button type="button" className="lb-ghost" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <p className="lb-dim mt-1 text-xs">Leave empty to use the phone on your profile.</p>
    </div>
  );
};

const prettyPhone = (e164: string | null) => {
  const d = String(e164 || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(e164 || '');
};

const PhoneNumberBox: React.FC<{ demo: boolean }> = ({ demo }) => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [line, setLine] = useState<PhoneLineView | null>(null);
  const [minutes, setMinutes] = useState<{ used: number; limit: number | null; left: number | null } | null>(null);
  const [areaCode, setAreaCode] = useState('');
  const [busy, setBusy] = useState<'' | 'find' | 'buy'>('');

  useEffect(() => {
    if (demo) { setEnabled(true); setTestMode(true); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(buildApiUrl('/api/lo/phone-line'), { headers: await getApiHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok) { setEnabled(Boolean(data.enabled)); setTestMode(Boolean(data.testMode)); setLine(data.line || null); setMinutes(data.minutes || null); }
      } catch { /* shows as not available */ } finally { setLoading(false); }
    })();
  }, [demo]);

  const find = async () => {
    const code = areaCode.replace(/\D/g, '');
    if (!/^[2-9]\d{2}$/.test(code)) { toast.error('Enter a 3-digit US area code, like 509.'); return; }
    setBusy('find');
    try {
      if (demo) {
        setLine({ status: 'searching', phoneNumber: null, reservedNumber: `+1${code}5550100`, reservationExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(), error: null, isTest: true, aiAnswering: false });
        return;
      }
      const res = await fetch(buildApiUrl('/api/lo/phone-line/preview'), { method: 'POST', headers: await getApiHeaders(), body: JSON.stringify({ areaCode: code }) });
      const data = await res.json().catch(() => ({}));
      if (data.line) setLine(data.line);
      if (!res.ok) toast.error(data.message || data.line?.error || 'Could not find a number there. Try a nearby area code.');
    } catch {
      toast.error('Could not reach the phone service. Try again.');
    } finally { setBusy(''); }
  };

  const buy = async () => {
    setBusy('buy');
    try {
      if (demo) {
        setLine((l) => (l ? { ...l, status: 'active', phoneNumber: l.reservedNumber, reservedNumber: null } : l));
        toast.success('Demo number set up.');
        return;
      }
      const res = await fetch(buildApiUrl('/api/lo/phone-line/buy'), { method: 'POST', headers: await getApiHeaders(), body: JSON.stringify({ confirm: true }) });
      const data = await res.json().catch(() => ({}));
      if (data.line) setLine(data.line);
      if (res.ok) toast.success('Your AI phone number is yours.');
      else toast.error(data.message || 'Could not get that number. Try again.');
    } catch {
      toast.error('Could not reach the phone service. Try again.');
    } finally { setBusy(''); }
  };

  if (loading) return <div className="lb-inset px-4 py-3 text-sm lb-dim">Checking your phone number…</div>;

  if (!enabled) {
    return (
      <div className="lb-inset flex items-center gap-3 px-4 py-3">
        <Icon name="phone_in_talk" className="text-2xl text-slate-400" />
        <span className="text-sm"><span className="block font-semibold">Your own AI phone number</span><span className="lb-dim">Coming soon — a local number buyers can call or text 24/7.</span></span>
      </div>
    );
  }

  const testBadge = (testMode || line?.isTest) ? <span className="lb-pill lb-warn">Test number — not a real line</span> : null;

  if (line?.phoneNumber) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
          <Icon name="phone_in_talk" className="text-3xl text-green-700" />
          <div className="min-w-0 flex-1">
            <span className="lb-dim block text-xs font-semibold uppercase tracking-wide">Your AI phone number</span>
            <span className="block text-2xl font-bold">{prettyPhone(line.phoneNumber)}</span>
            <span className="lb-muted block text-sm">{line.aiAnswering ? 'Your AI answers this number 24/7 and passes hot callers to you.' : line.isTest ? 'Practice number — it can\'t ring. Get a real one when live numbers are on.' : 'Calls ring your cell until AI answering is switched on.'}</span>
          </div>
          {testBadge}
        </div>
        {minutes && minutes.limit != null && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">AI minutes this month</span>
              <span className={minutes.left === 0 ? 'font-semibold text-red-700' : 'lb-muted'}>{minutes.used} of {minutes.limit}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${minutes.left === 0 ? 'bg-red-500' : (minutes.limit && minutes.used / minutes.limit > 0.8 ? 'bg-amber-500' : 'bg-blue-600')}`} style={{ width: `${Math.min(100, minutes.limit ? (minutes.used / minutes.limit) * 100 : 100)}%` }} />
            </div>
            {minutes.left === 0 && <p className="text-xs text-red-700">You've used this month's AI minutes. Calls ring your cell until the 1st.</p>}
          </div>
        )}
        <HandoffNumber demo={demo} value={line.transferNumber || null} onSaved={setLine} />
        <RecentCalls demo={demo} />
      </div>
    );
  }

  if (line?.reservedNumber) {
    const until = line.reservationExpiresAt ? new Date(line.reservationExpiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-blue-900">We found you a local number:</span>
          {testBadge}
        </div>
        <span className="text-3xl font-bold text-slate-900">{prettyPhone(line.reservedNumber)}</span>
        <span className="text-sm text-blue-900">Held for you{until ? ` until ${until}` : ''}. Included in your plan.</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="lb-btn" disabled={busy !== ''} onClick={() => void buy()}>{busy === 'buy' ? 'Setting it up…' : 'Get this number'}</button>
          <button type="button" className="lb-ghost" disabled={busy !== ''} onClick={() => setLine(null)}>Try another area code</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-center gap-3">
        <Icon name="add_call" className="text-2xl text-blue-600" />
        <span><span className="block font-semibold">Get my AI phone number</span><span className="lb-dim text-sm">A local number buyers can call or text. Included in your plan.</span></span>
        <span className="ml-auto">{testBadge}</span>
      </div>
      {line?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{line.error}</p>}
      <div className="flex gap-2">
        <label htmlFor="area-code" className="sr-only">Area code</label>
        <input id="area-code" inputMode="numeric" maxLength={3} className="lb-input max-w-[140px]" placeholder="Area code" value={areaCode}
          onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void find(); } }} />
        <button type="button" className="lb-btn" disabled={busy !== '' || areaCode.length !== 3} onClick={() => void find()}>{busy === 'find' ? 'Looking…' : 'Find my number'}</button>
      </div>
    </div>
  );
};

// ─── Collapsible section (open/closed remembered per browser) ────────────────

const Section: React.FC<{
  id: string;
  icon: string;
  title: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  accent?: 'amber' | 'blue';
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ id, icon, title, subtitle, badge, accent, defaultOpen = false, children }) => {
  const storageKey = `hlai_lo_brain_open_${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved === null ? defaultOpen : saved === '1';
    } catch {
      return defaultOpen;
    }
  });
  const toggle = () => {
    setOpen((o) => {
      try { window.localStorage.setItem(storageKey, o ? '0' : '1'); } catch { /* per-browser convenience only */ }
      return !o;
    });
  };
  const border = accent === 'amber' ? '!border-amber-300' : accent === 'blue' ? '!border-blue-300' : '';
  const iconColor = accent === 'amber' ? 'text-amber-600' : 'text-blue-600';
  return (
    <section className={`lb-card ${border}`}>
      <h2 className="m-0">
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls={`sec-${id}`}
          className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left hover:bg-slate-50">
          <Icon name={icon} className={`text-2xl ${iconColor}`} />
          <span className="min-w-0 flex-1">
            <span className="lb-h block text-lg">{title}</span>
            {subtitle && <span className="lb-dim block text-sm font-normal">{subtitle}</span>}
          </span>
          {badge}
          <Icon name="expand_more" className={`text-2xl text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      {open && <div id={`sec-${id}`} className="border-t border-slate-100 px-5 pb-5 pt-4">{children}</div>}
    </section>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const LOBrainPage: React.FC = () => {
  const demo = useDemoMode();
  const [config, setConfig] = useState<BrainConfig>(EMPTY_CONFIG);
  const [summary, setSummary] = useState<BrainSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [chat, setChat] = useState<{ role: 'user' | 'assistant'; content: string; route?: string; question?: string; rated?: boolean; fixed?: boolean }[]>([]);
  const [ask, setAsk] = useState('');
  const [asking, setAsking] = useState(false);
  const [complianceUploading, setComplianceUploading] = useState(false);
  const complianceFileRef = useRef<HTMLInputElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const playVoice = async () => {
    if (demo) { toast('Voice samples are off in the demo — start your free trial to hear your AI.', { icon: '🔒' }); return; }
    setPreviewing(true);
    try {
      const res = await fetch(buildApiUrl('/api/lo/brain/voice-preview'), {
        method: 'POST', headers: await getApiHeaders(),
        body: JSON.stringify({ voice: config.voice_name, style: config.voice_style, text: `Hi, thanks for calling! This is ${config.bot_name || 'your AI assistant'}. How can I help you today?` })
      });
      if (!res.ok) throw new Error(res.status === 429 ? 'Too many samples — try again in a bit.' : 'Could not play the sample.');
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not play the sample.');
    } finally {
      setPreviewing(false);
    }
  };

  const loadSummary = useCallback(async () => {
    if (demo) { setSummary(DEMO_SUMMARY); return; }
    try {
      const res = await fetch(buildApiUrl('/api/lo/brain/summary'), { headers: await getApiHeaders() });
      if (res.ok) setSummary(await res.json());
    } catch (err) {
      console.error('[LOBrainPage] summary error', err);
    }
  }, [demo]);

  useEffect(() => {
    if (demo) { setConfig(DEMO_CONFIG); setSummary(DEMO_SUMMARY); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), { headers: await getApiHeaders() });
        if (res.ok) {
          const d = await res.json();
          setConfig({
            ...EMPTY_CONFIG,
            ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== null && v !== undefined)),
            faq: Array.isArray(d.faq) ? d.faq.map((f: FaqItem) => ({ question: f.question || '', answer: f.answer || '' })) : [],
            licensed_states: Array.isArray(d.licensed_states) ? d.licensed_states : [],
            banned_phrases: Array.isArray(d.banned_phrases) ? d.banned_phrases : []
          } as BrainConfig);
        }
      } catch (err) {
        console.error('[LOBrainPage] load error', err);
        toast.error('Could not load your AI Brain.');
      } finally {
        setLoading(false);
      }
    })();
    void loadSummary();
  }, [demo, loadSummary]);

  const update = (patch: Partial<BrainConfig>) => { setConfig((c) => ({ ...c, ...patch })); setDirty(true); };

  const persist = async (next: BrainConfig, successMsg = 'AI Brain saved') => {
    if (demo) { setDirty(false); toast.success(`${successMsg} (demo — resets on refresh)`); return true; }
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), { method: 'PUT', headers: await getApiHeaders(), body: JSON.stringify(next) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error === 'lo_brain_migration_not_run'
          ? 'The AI Brain database update has not been run yet.'
          : 'Save failed. Try again.');
      }
      setDirty(false);
      toast.success(successMsg);
      void loadSummary();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addSource = async (text: string, label: string) => {
    const next = { ...config, knowledge_base: config.knowledge_base.trim() ? `${config.knowledge_base}${SEPARATOR}${text}` : text };
    setConfig(next);
    await persist(next, `"${label}" added`);
  };

  const removeSource = async (index: number) => {
    const chunks = config.knowledge_base.split(SEPARATOR);
    const next = { ...config, knowledge_base: chunks.filter((_, i) => i !== index).join(SEPARATOR) };
    setConfig(next);
    await persist(next, 'Source removed');
  };

  const uploadCompliance = async (file: File) => {
    if (demo) { toast('Uploads are off in the demo.', { icon: '🔒' }); return; }
    setComplianceUploading(true);
    try {
      const headers = await getApiHeaders();
      delete headers['Content-Type'];
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(buildApiUrl('/api/lo/chatbot/extract-file'), { method: 'POST', headers, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not read that file');
      const text = `[From: ${file.name}]\n${data.text}`;
      const next = { ...config, compliance_rules: config.compliance_rules.trim() ? `${config.compliance_rules}${SEPARATOR}${text}` : text };
      setConfig(next);
      await persist(next, 'Compliance rules added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file');
    } finally {
      setComplianceUploading(false);
      if (complianceFileRef.current) complianceFileRef.current.value = '';
    }
  };

  const sendTest = async () => {
    const q = ask.trim();
    if (!q || asking) return;
    if (demo) { toast('Testing is off in the demo — start your free trial to talk to your own brain.', { icon: '🔒' }); return; }
    if (dirty) toast('Testing your last saved brain — save to include your latest changes.', { icon: '💾' });
    const history = chat.map(({ role, content }) => ({ role, content }));
    setChat((c) => [...c, { role: 'user', content: q }]);
    setAsk('');
    setAsking(true);
    try {
      const res = await fetch(buildApiUrl('/api/lo/brain/test'), { method: 'POST', headers: await getApiHeaders(), body: JSON.stringify({ message: q, history }) });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setChat((c) => [...c, { role: 'assistant', content: data.reply, route: data.route, question: q, fixed: Array.isArray(data.actions) && data.actions.length > 0 }]);
    } catch {
      setChat((c) => [...c, { role: 'assistant', content: 'The test chat could not answer just now. Try again.' }]);
    } finally {
      setAsking(false);
    }
  };

  const rate = async (i: number, rating: 'good' | 'needs_work') => {
    const m = chat[i];
    if (!m || !m.question) return;
    setChat((c) => c.map((x, j) => (j === i ? { ...x, rated: true } : x)));
    try {
      await fetch(buildApiUrl('/api/lo/brain/feedback'), { method: 'POST', headers: await getApiHeaders(), body: JSON.stringify({ rating, question: m.question, answer: m.content, route: m.route }) });
      toast.success(rating === 'good' ? 'Thanks — noted.' : 'Noted. Add a source or FAQ to teach it the right answer.');
    } catch { /* feedback is best-effort */ }
  };

  const sources = useMemo(() => parseSources(config.knowledge_base), [config.knowledge_base]);
  const hasType = (t: string) => sources.some((s) => s.label.toLowerCase().startsWith(t.toLowerCase()));
  const library = [
    { icon: 'account_balance', label: 'Loan programs', hint: 'FHA, VA, Conventional, USDA…', ready: hasType('Loan programs') },
    { icon: 'percent', label: 'Rate sheet', hint: 'used for every listing', ready: hasType('Rate sheet') },
    { icon: 'help', label: 'FAQs', hint: `${config.faq.length} saved`, ready: config.faq.length > 0 || hasType('FAQs') },
    { icon: 'badge', label: 'About you', hint: 'bio + NMLS#', ready: Boolean(summary?.hasNmls) || hasType('About me') },
    { icon: 'language', label: 'Your website', hint: '', ready: hasType('Website') || sources.some((s) => /https?:\/\//.test(s.label)) }
  ];
  const readyCount = library.filter((l) => l.ready).length + (config.company_name ? 1 : 0);
  const readiness = readyCount >= 5 ? { text: 'Strong', cls: 'text-green-700' } : readyCount >= 3 ? { text: 'Getting there', cls: 'text-amber-700' } : { text: 'Just started', cls: 'text-red-600' };

  if (loading) {
    return <div className="lo-brain flex min-h-[60vh] items-center justify-center"><span className="lb-muted">Loading your AI Brain…</span></div>;
  }

  const libraryMissing = library.filter((l) => !l.ready).length;

  return (
    <div className="lo-brain px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {/* Header */}
        <header className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="lb-eyebrow">Your AI Brain</p>
            <h1 className="lb-h mt-1 text-3xl sm:text-4xl">Train it once. <span className="text-blue-600">Every listing gets it.</span></h1>
            <p className="lb-muted mt-2 text-base leading-relaxed">Your listing chat and financing AI use this one brain on every listing — same name, same knowledge, same rules.</p>
          </div>
          <label className="lb-ghost shrink-0 cursor-pointer self-start">
            <input type="checkbox" className="h-5 w-5 accent-blue-600" checked={config.is_active} onChange={(e) => update({ is_active: e.target.checked })} />
            AI answering on my listings
          </label>
        </header>

        {/* Summary — always open */}
        <section className="lb-card flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex flex-1 gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50"><Icon name="psychology" className="text-2xl text-blue-600" /></span>
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="lb-h text-xl">Your Loan Officer Brain</h2>
                  <p className="lb-dim text-sm">One brain for your chat, your phone and every listing.</p>
                </div>
                <dl className="flex flex-wrap gap-x-8 gap-y-3">
                  <div><dt className="lb-dim text-xs font-semibold uppercase tracking-wide">Sources</dt><dd className="text-2xl font-bold">{sources.length}</dd></div>
                  <div><dt className="lb-dim text-xs font-semibold uppercase tracking-wide">Listings using it</dt><dd className="text-2xl font-bold">{summary?.listings.length ?? '—'}</dd></div>
                  <div><dt className="lb-dim text-xs font-semibold uppercase tracking-wide">Readiness</dt><dd className={`pt-1.5 text-sm font-bold ${readiness.cls}`}>{readiness.text}</dd></div>
                </dl>
              </div>
            </div>
            <div className="flex flex-col gap-2 md:w-[260px]">
              <button type="button" onClick={() => setShowAdd(true)} className="lb-btn justify-center"><Icon name="add_circle" className="text-xl" />Add knowledge</button>
              <button type="button" onClick={() => setShowTest((v) => !v)} className="lb-ghost justify-center" aria-expanded={showTest}><Icon name="forum" className="text-xl text-blue-600" />{showTest ? 'Close test chat' : 'Test it'}</button>
            </div>
          </div>

          {showTest && (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <div className="lb-inset flex max-h-80 min-h-[120px] flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
                {!chat.length && <p className="lb-dim text-sm">Ask what a buyer would ask, like “Can I buy with 3% down?”</p>}
                {chat.map((m, i) => (
                  <div key={i} className={`flex flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'}`}>{m.content}</div>
                    {m.role === 'assistant' && m.question && (
                      <div className="flex flex-wrap items-center gap-2">
                        {m.route && <span className="lb-pill lb-info">Used: {ROUTE_LABEL[m.route] || m.route}</span>}
                        {m.fixed && <span className="lb-pill lb-warn">Compliance fixed this</span>}
                        {!m.rated && (
                          <>
                            <button type="button" onClick={() => void rate(i, 'good')} className="lb-pill lb-ready !py-1.5"><Icon name="thumb_up" className="mr-1 text-[15px]" />Good</button>
                            <button type="button" onClick={() => void rate(i, 'needs_work')} className="lb-pill lb-missing !py-1.5"><Icon name="thumb_down" className="mr-1 text-[15px]" />Needs work</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {asking && <p className="lb-dim text-sm">Thinking…</p>}
              </div>
              <div className="flex gap-2">
                <label htmlFor="brain-ask" className="sr-only">Ask your brain</label>
                <input id="brain-ask" className="lb-input" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask anything a buyer might ask…"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sendTest(); } }} />
                <button type="button" className="lb-btn shrink-0" disabled={asking || !ask.trim()} onClick={() => void sendTest()}>Ask</button>
              </div>
            </div>
          )}
        </section>

        {/* 1. What it knows */}
        <Section id="knows" icon="library_books" title="What it knows" subtitle="Your loan programs, rates, FAQs and bio."
          badge={<span className={`lb-pill ${libraryMissing ? 'lb-missing' : 'lb-ready'}`}>{libraryMissing ? `${libraryMissing} missing` : 'All ready'}</span>}>
          <div className="flex flex-col gap-5">
            <ul>
              {library.map((l) => (
                <li key={l.label} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
                  <Icon name={l.icon} className="text-xl text-blue-600" />
                  <span className="flex-1 text-sm font-semibold">{l.label}{l.hint && <span className="lb-dim font-normal"> · {l.hint}</span>}</span>
                  <span className={`lb-pill ${l.ready ? 'lb-ready' : 'lb-missing'}`}>{l.ready ? 'Ready' : 'Missing'}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="lb-btn self-start" onClick={() => setShowAdd(true)}>+ Add knowledge</button>

            {sources.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="lb-label">Saved ({sources.length})</span>
                {sources.map((s) => (
                  <div key={`${s.index}-${s.label}`} className="lb-inset flex items-center gap-3 px-4 py-2.5">
                    <Icon name={/https?:\/\//.test(s.label) ? 'language' : /\.pdf$/i.test(s.label) ? 'picture_as_pdf' : 'notes'} className="text-xl text-blue-600" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.label}</span>
                    <button type="button" aria-label={`Delete ${s.label}`} className="lb-ghost !min-h-[36px] !px-3" onClick={() => { if (window.confirm(`Remove "${s.label}" from your brain?`)) void removeSource(s.index); }}><Icon name="delete" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <span className="lb-label">FAQs ({config.faq.length})</span>
              {config.faq.map((f, i) => (
                <div key={i} className="lb-inset grid gap-3 p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-start">
                  <div><label className="lb-label mb-1 block" htmlFor={`faq-q-${i}`}>Question</label><input id={`faq-q-${i}`} className="lb-input" value={f.question} onChange={(e) => update({ faq: config.faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })} /></div>
                  <div><label className="lb-label mb-1 block" htmlFor={`faq-a-${i}`}>Answer</label><textarea id={`faq-a-${i}`} className="lb-input h-20" value={f.answer} onChange={(e) => update({ faq: config.faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })} /></div>
                  <button type="button" aria-label="Delete FAQ" className="lb-ghost sm:mt-6" onClick={() => update({ faq: config.faq.filter((_, j) => j !== i) })}><Icon name="delete" /></button>
                </div>
              ))}
              <button type="button" className="lb-ghost self-start" onClick={() => update({ faq: [...config.faq, { question: '', answer: '' }] })}>+ Add FAQ</button>
            </div>
          </div>
        </Section>

        {/* 2. How it talks */}
        <Section id="talks" icon="record_voice_over" title="How it talks" subtitle="Its name, tone and voice.">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="lb-label mb-1 block" htmlFor="bot-name">AI name</label>
                <input id="bot-name" className="lb-input" value={config.bot_name} onChange={(e) => update({ bot_name: e.target.value })} placeholder="e.g. Sky, your financing assistant" />
              </div>
              <div>
                <label className="lb-label mb-1 block" htmlFor="tone">Tone</label>
                <select id="tone" className="lb-input" value={config.tone} onChange={(e) => update({ tone: e.target.value })}>
                  {[...new Set([config.tone, ...TONES].filter(Boolean))].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="lb-label mb-1 block" htmlFor="greeting">First chat message buyers see</label>
              <input id="greeting" className="lb-input" value={config.greeting} onChange={(e) => update({ greeting: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="lb-label mb-1 block" htmlFor="voice-name">Phone voice</label>
                <select id="voice-name" className="lb-input" value={config.voice_name} onChange={(e) => update({ voice_name: e.target.value })}>
                  {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </div>
              <button type="button" className="lb-ghost" disabled={previewing} onClick={() => void playVoice()}>
                <Icon name={previewing ? 'hourglass_top' : 'play_circle'} className="text-xl text-blue-600" />{previewing ? 'Playing…' : 'Hear it'}
              </button>
            </div>
            <label className="lb-inset flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
              Say my NMLS# when introducing itself
              <input type="checkbox" className="h-5 w-5 accent-blue-600" checked={config.nmls_in_intro} onChange={(e) => update({ nmls_in_intro: e.target.checked })} />
            </label>
            <button type="button" className="lb-ghost self-start" onClick={() => setShowAdvanced((v) => !v)} aria-expanded={showAdvanced}>
              <Icon name={showAdvanced ? 'expand_less' : 'tune'} className="text-xl text-blue-600" />{showAdvanced ? 'Hide advanced' : 'Advanced'}
            </button>
            {showAdvanced && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="lb-label mb-1 block" htmlFor="voice-style">How the phone voice should sound</label>
                  <input id="voice-style" className="lb-input" value={config.voice_style} onChange={(e) => update({ voice_style: e.target.value })} placeholder="e.g. Warm, calm and friendly. Easy pace." />
                </div>
                {([
                  ['loan_advisor_rules', 'Money questions', 'What to ask, what to offer, when to hand off to you.'],
                  ['borrower_care_rules', 'Everything else', 'How people are looked after, and what it does when unsure.']
                ] as const).map(([key, title, help]) => (
                  <div key={key}>
                    <label htmlFor={key} className="lb-label block">{title}</label>
                    <p className="lb-dim mb-1 text-xs">{help}</p>
                    <textarea id={key} className="lb-input h-32" value={config[key]} onChange={(e) => update({ [key]: e.target.value } as Partial<BrainConfig>)} />
                  </div>
                ))}
                <p className="lb-dim text-xs">These can't override your Compliance Brain or HomeListingAI's safety rules.</p>
              </div>
            )}
          </div>
        </Section>

        {/* 3. Your phone */}
        <Section id="phone" icon="call" title="Your phone" subtitle="Your AI answers, gets their info and passes hot buyers to you.">
          <PhoneNumberBox demo={demo} />
        </Section>

        {/* 4. Compliance */}
        <Section id="compliance" icon="verified_user" accent="amber" title="Your Compliance Brain" subtitle="Your company's rules. Every answer is checked. Stricter always wins."
          badge={<span className="lb-pill lb-warn">ALWAYS ON</span>}>
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="lb-label mb-1 block" htmlFor="co-name">Company name</label><input id="co-name" className="lb-input" value={config.company_name} onChange={(e) => update({ company_name: e.target.value })} /></div>
              <div><label className="lb-label mb-1 block" htmlFor="co-nmls">Company NMLS#</label><input id="co-nmls" className="lb-input" value={config.company_nmls} onChange={(e) => update({ company_nmls: e.target.value })} /></div>
            </div>
            <ChipsInput id="states" label="States you're licensed in" hint="AI won't discuss loans outside these" values={config.licensed_states} onChange={(v) => update({ licensed_states: v })} tone="info" placeholder="e.g. WA" upper />
            <div>
              <label className="lb-label mb-1 block" htmlFor="disclosure">Required disclosure <span className="lb-dim font-normal">· added whenever the AI gives a number</span></label>
              <textarea id="disclosure" className="lb-input h-24" value={config.required_disclosure} onChange={(e) => update({ required_disclosure: e.target.value })} placeholder="e.g. Estimates only. Not a commitment to lend." />
            </div>
            <ChipsInput id="banned" label="Words the AI must never use" values={config.banned_phrases} onChange={(v) => update({ banned_phrases: v })} tone="missing" placeholder="e.g. lowest rate" />
            <input ref={complianceFileRef} id="compliance-file" type="file" accept=".pdf,.txt,.csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCompliance(f); }} />
            <label htmlFor="compliance-file" className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
              <Icon name="upload_file" className="text-3xl text-amber-600" />
              <span><span className="block font-semibold">{complianceUploading ? 'Reading your file…' : "Upload your company's compliance rules"}</span><span className="lb-muted text-sm">PDF or TXT.</span></span>
            </label>
            {config.compliance_rules.trim() && (
              <div className="lb-inset flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm"><Icon name="description" className="mr-2 align-middle text-lg text-amber-600" />{parseSources(config.compliance_rules).map((s) => s.label).join(', ') || 'Company rules'} — active</span>
                <button type="button" className="lb-ghost !min-h-[36px] !px-3 !text-xs" onClick={() => { if (window.confirm('Remove your uploaded compliance rules? Platform safety rules still apply.')) { const next = { ...config, compliance_rules: '' }; setConfig(next); void persist(next, 'Compliance rules removed'); } }}>Remove</button>
              </div>
            )}
            <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="text-3xl font-bold text-amber-700">{summary?.complianceEventsThisMonth ?? '—'}</span>
              <span className="text-sm leading-snug text-amber-900">Answers stopped, fixed or flagged this month because they broke a rule.</span>
            </div>
          </div>
        </Section>

        <p className="lb-dim text-xs">Secure and private: your brain is only used by your own AI team. It is never shared with other loan officers.</p>
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-[150] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <span className="lb-muted text-sm">You have unsaved changes.</span>
            <button type="button" className="lb-btn" disabled={saving} onClick={() => void persist(config)}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      )}

      {showAdd && <AddSourceModal demo={demo} onClose={() => setShowAdd(false)} onAdd={addSource} />}
    </div>
  );
};

export default LOBrainPage;
