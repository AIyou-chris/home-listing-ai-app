import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
}

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
  company_name: '', company_nmls: '', licensed_states: [], required_disclosure: '', banned_phrases: []
};

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

const formatDate = (iso: string | null) => {
  if (!iso) return 'Not yet';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString();
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="add-source-title">
      <div className="lo-brain lb-card w-full max-w-xl p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="add-source-title" className="lb-h text-3xl">Add knowledge</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="lb-ghost !min-h-[40px] !px-3"><Icon name="close" /></button>
        </div>
        <label className="lb-label mb-1 block" htmlFor="src-type">What is it?</label>
        <select id="src-type" className="lb-input mb-4" value={type} onChange={(e) => setType(e.target.value as SourceType)}>
          {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-[#143047] bg-[#020b18] p-1" role="tablist" aria-label="How to add it">
          {([['text', 'Paste text', 'edit_note'], ['file', 'Upload file', 'upload_file'], ['url', 'Scan website', 'travel_explore']] as const).map(([id, label, icon]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold ${mode === id ? 'bg-[#00dbea] text-[#020b18]' : 'text-[#b7c6d9]'}`}>
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
            <label htmlFor="src-file" className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-[#00dbea] bg-[#020b18] px-6 py-10 text-center">
              <Icon name="upload_file" className="text-4xl text-[#00dbea]" />
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
  const readiness = readyCount >= 5 ? { text: 'Strong', cls: 'text-[#4ade80]' } : readyCount >= 3 ? { text: 'Getting there', cls: 'text-[#fbbf24]' } : { text: 'Just started', cls: 'text-[#fda4af]' };

  if (loading) {
    return <div className="lo-brain flex min-h-screen items-center justify-center"><span className="lb-muted">Loading your AI Brain…</span></div>;
  }

  return (
    <div className="lo-brain min-h-screen px-4 pb-28 pt-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="lb-eyebrow">Your AI Brain</p>
            <h1 className="lb-h mt-2 text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">Train it once.<br /><span className="text-[#00dbea]">Every listing gets it.</span></h1>
            <p className="lb-muted mt-3 text-lg leading-relaxed">Your listing chat and financing AI use this one brain on every listing — same name, same knowledge, same rules.</p>
          </div>
          <label className="lb-ghost shrink-0 cursor-pointer self-start">
            <input type="checkbox" className="h-5 w-5 accent-[#00dbea]" checked={config.is_active} onChange={(e) => update({ is_active: e.target.checked })} />
            AI answering on my listings
          </label>
        </header>

        {/* Summary */}
        <section className="lb-card flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
          <div className="flex flex-1 gap-4">
            <Icon name="psychology" className="text-4xl text-[#00dbea]" />
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="lb-h text-3xl">Your Loan Officer Brain</h2>
                <p className="lb-muted text-sm">One source of truth for your AI team and every listing.</p>
              </div>
              <dl className="flex flex-wrap gap-x-10 gap-y-3">
                <div><dt className="lb-dim text-xs font-bold tracking-widest">SOURCES</dt><dd className="lb-h text-3xl">{sources.length}</dd></div>
                <div><dt className="lb-dim text-xs font-bold tracking-widest">LISTINGS USING IT</dt><dd className="lb-h text-3xl">{summary?.listings.length ?? '—'}</dd></div>
                <div><dt className="lb-dim text-xs font-bold tracking-widest">LAST UPDATED</dt><dd className="pt-2 font-semibold">{formatDate(summary?.lastUpdated ?? null)}</dd></div>
                <div><dt className="lb-dim text-xs font-bold tracking-widest">READINESS</dt><dd className={`pt-2 font-bold ${readiness.cls}`}>{readiness.text}</dd></div>
              </dl>
            </div>
          </div>
          <button type="button" onClick={() => setShowAdd(true)} className="flex items-center gap-4 rounded-2xl bg-[#00dbea] px-6 py-5 text-left text-[#020b18] transition hover:-translate-y-0.5 lg:w-[380px]">
            <Icon name="add_circle" className="text-3xl" />
            <span><span className="block text-lg font-extrabold">Add knowledge to your brain</span><span className="text-sm font-medium">Loan programs, rate sheet, FAQs, your bio — anything your AI should know.</span></span>
          </button>
        </section>

        {/* Test chat + library/voice */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="lb-card flex flex-col gap-4 p-6">
            <div>
              <h2 className="lb-h text-3xl">Talk to your brain</h2>
              <p className="lb-muted text-sm">Ask what a buyer would ask. This is the real AI buyers talk to.</p>
            </div>
            <div className="lb-inset flex max-h-80 min-h-[180px] flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
              {!chat.length && <p className="lb-dim text-sm">Try: “Can I buy with 3% down?” or “What does the payment look like on a $400k home?”</p>}
              {chat.map((m, i) => (
                <div key={i} className={`flex flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-br-sm bg-[#00dbea] font-medium text-[#020b18]' : 'rounded-bl-sm border border-[#176078] bg-[#0b2033] text-[#e6eef6]'}`}>{m.content}</div>
                  {m.role === 'assistant' && m.question && (
                    <div className="flex flex-wrap items-center gap-2">
                      {m.route && <span className="lb-pill lb-info">Used: {ROUTE_LABEL[m.route] || m.route}</span>}
                      {m.fixed && <span className="lb-pill lb-warn">Compliance fixed this</span>}
                      {!m.rated && (
                        <>
                          <button type="button" onClick={() => void rate(i, 'good')} className="lb-pill lb-ready !py-1.5"><Icon name="thumb_up" className="mr-1 text-[15px]" />Good answer</button>
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
          </section>

          <div className="flex flex-col gap-5">
            <section className="lb-card flex flex-col gap-3 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="lb-h text-3xl">Knowledge library</h2>
                  <p className="lb-muted text-sm">What every listing's AI learns from you.</p>
                </div>
                <button type="button" className="lb-btn shrink-0" onClick={() => setShowAdd(true)}>+ Add source</button>
              </div>
              <ul>
                {library.map((l) => (
                  <li key={l.label} className="flex items-center gap-3 border-t border-[#143047] py-3">
                    <Icon name={l.icon} className="text-xl text-[#00dbea]" />
                    <span className="flex-1 text-sm font-semibold">{l.label}{l.hint && <span className="lb-dim font-normal"> · {l.hint}</span>}</span>
                    <span className={`lb-pill ${l.ready ? 'lb-ready' : 'lb-missing'}`}>{l.ready ? 'Ready' : 'Missing'}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="lb-card flex flex-col gap-4 p-6">
              <div>
                <h2 className="lb-h text-3xl">Voice and personality</h2>
                <p className="lb-muted text-sm">How your AI introduces itself and sounds.</p>
              </div>
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
                <div className="sm:col-span-2">
                  <label className="lb-label mb-1 block" htmlFor="greeting">First message buyers see</label>
                  <input id="greeting" className="lb-input" value={config.greeting} onChange={(e) => update({ greeting: e.target.value })} />
                </div>
                <label className="lb-inset flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold sm:col-span-2">
                  Say my NMLS# when introducing itself
                  <input type="checkbox" className="h-5 w-5 accent-[#00dbea]" checked={config.nmls_in_intro} onChange={(e) => update({ nmls_in_intro: e.target.checked })} />
                </label>
              </div>
            </section>
          </div>
        </div>

        {/* Rulebooks */}
        <section className="lb-card flex flex-col gap-4 p-6">
          <div className="grid gap-5 lg:grid-cols-3">
            {([
              ['marketing_voice', 'Your Marketing Voice', 'How your marketing is written. Your Marketing Studio posts and videos follow this.'],
              ['loan_advisor_rules', 'Your Loan Advisor AI', 'Used when a buyer asks about money — what to ask, what to offer, when to hand off to you.'],
              ['borrower_care_rules', 'Your Borrower Care', 'Used for everything else, and whenever the AI is unsure. How people are looked after.']
            ] as const).map(([key, title, help]) => (
              <div key={key} className="flex flex-col gap-2">
                <h2 className="lb-h text-2xl text-[#00dbea]"><label htmlFor={key}>{title}</label></h2>
                <p className="lb-muted text-sm leading-relaxed">{help}</p>
                <textarea id={key} className="lb-input h-60" value={config[key]} onChange={(e) => update({ [key]: e.target.value } as Partial<BrainConfig>)} />
              </div>
            ))}
          </div>
          <p className="lb-dim text-[13px]">Each starts with sensible wording — change anything that isn't how you work. None can override your Compliance Brain or HomeListingAI's safety rules.</p>
        </section>

        {/* Compliance Brain */}
        <section className="lb-card flex flex-col gap-5 !border-[#fbbf24] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <Icon name="verified_user" className="text-4xl text-[#fbbf24]" />
              <div>
                <h2 className="lb-h text-3xl">Your Compliance Brain</h2>
                <p className="lb-muted max-w-3xl text-sm leading-relaxed">Your company's rules. Every answer is checked before it reaches a buyer. Stricter always wins.</p>
              </div>
            </div>
            <span className="lb-pill lb-warn shrink-0">ALWAYS ON</span>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
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
            </div>
            <div className="flex flex-col gap-4">
              <input ref={complianceFileRef} id="compliance-file" type="file" accept=".pdf,.txt,.csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCompliance(f); }} />
              <label htmlFor="compliance-file" className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[#fbbf24] bg-[#020b18] p-5">
                <Icon name="upload_file" className="text-3xl text-[#fbbf24]" />
                <span><span className="block font-bold">{complianceUploading ? 'Reading your file…' : "Upload your company's compliance rules"}</span><span className="lb-muted text-sm">Marketing policy, social media policy, state rules. PDF or TXT.</span></span>
              </label>
              {config.compliance_rules.trim() && (
                <div className="lb-inset flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm"><Icon name="description" className="mr-2 align-middle text-lg text-[#fbbf24]" />{parseSources(config.compliance_rules).map((s) => s.label).join(', ') || 'Company rules'} — active</span>
                  <button type="button" className="lb-ghost !min-h-[36px] !px-3 !text-xs" onClick={() => { if (window.confirm('Remove your uploaded compliance rules? Platform safety rules still apply.')) { const next = { ...config, compliance_rules: '' }; setConfig(next); void persist(next, 'Compliance rules removed'); } }}>Remove</button>
                </div>
              )}
              <div className="lb-inset flex flex-col gap-2.5 p-4">
                <span className="lb-dim text-xs font-bold tracking-widest">CHECKED BEFORE IT GOES OUT</span>
                <span className="flex items-center gap-2 text-sm"><Icon name="check_circle" className="text-lg text-[#4ade80]" />Every listing chat answer</span>
                <span className="flex items-center gap-2 text-sm"><Icon name="check_circle" className="text-lg text-[#4ade80]" />Every answer in your test chat</span>
                <span className="lb-dim flex items-center gap-2 text-sm"><Icon name="schedule" className="text-lg" />Texts, posts and AI Phone — as each one moves onto the brain</span>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-[#6b5313] bg-[#2e2408] px-5 py-4">
                <span className="lb-h text-4xl text-[#fbbf24]">{summary?.complianceEventsThisMonth ?? '—'}</span>
                <span className="text-sm leading-snug text-[#fde9b8]">Answers stopped or fixed this month because they broke a rule.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Listings */}
        <section className="lb-card flex flex-col gap-4 !border-[#00dbea] p-6">
          <div>
            <h2 className="lb-h text-3xl">Your listings use this brain <span className="text-[#00dbea]">automatically</span></h2>
            <p className="lb-muted text-sm">Nothing to retrain. Each listing adds its own home facts. The only thing you can add per listing is a payment schedule — if you want.</p>
          </div>
          {!summary?.listings.length && <p className="lb-dim text-sm">No listings yet. When a partner agent's listing is assigned to you, it shows up here already connected.</p>}
          <ul className="flex flex-col gap-2.5">
            {summary?.listings.map((l) => (
              <li key={l.id} className="lb-inset flex flex-wrap items-center gap-3 px-4 py-3">
                <Icon name="home" className="text-2xl text-[#00dbea]" />
                <span className="min-w-[180px] flex-1 font-semibold">{l.address}</span>
                <span className="lb-pill lb-info">Brain connected</span>
                <span className={`w-52 text-[13px] ${l.hasPaymentSchedule ? 'font-semibold text-[#4ade80]' : 'lb-dim'}`}>{l.hasPaymentSchedule ? 'Payment schedule added' : 'No payment schedule (optional)'}</span>
                {!demo && <Link to="/dashboard/lo-listings" className="text-sm font-bold">{l.hasPaymentSchedule ? 'Edit' : 'Add schedule'}</Link>}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQs */}
        <section className="lb-card flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="lb-h text-3xl">FAQs</h2>
              <p className="lb-muted text-sm">Questions buyers ask you all the time, answered your way.</p>
            </div>
            <button type="button" className="lb-ghost shrink-0" onClick={() => update({ faq: [...config.faq, { question: '', answer: '' }] })}>+ Add FAQ</button>
          </div>
          {!config.faq.length && <p className="lb-dim text-sm">No FAQs yet.</p>}
          {config.faq.map((f, i) => (
            <div key={i} className="lb-inset grid gap-3 p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-start">
              <div><label className="lb-label mb-1 block" htmlFor={`faq-q-${i}`}>Question</label><input id={`faq-q-${i}`} className="lb-input" value={f.question} onChange={(e) => update({ faq: config.faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })} /></div>
              <div><label className="lb-label mb-1 block" htmlFor={`faq-a-${i}`}>Answer</label><textarea id={`faq-a-${i}`} className="lb-input h-20" value={f.answer} onChange={(e) => update({ faq: config.faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })} /></div>
              <button type="button" aria-label="Delete FAQ" className="lb-ghost sm:mt-6" onClick={() => update({ faq: config.faq.filter((_, j) => j !== i) })}><Icon name="delete" /></button>
            </div>
          ))}
        </section>

        {/* All sources */}
        <section className="lb-card flex flex-col gap-4 p-6">
          <div>
            <h2 className="lb-h text-3xl">All sources</h2>
            <p className="lb-muted text-sm">Everything saved in your brain.</p>
          </div>
          {!sources.length && <p className="lb-dim text-sm">Nothing yet. Add your loan programs and rate sheet first — those answer most buyer questions.</p>}
          <ul className="flex flex-col gap-2.5">
            {sources.map((s) => (
              <li key={`${s.index}-${s.label}`} className="lb-inset flex items-center gap-3 px-4 py-3">
                <Icon name={/https?:\/\//.test(s.label) ? 'language' : /\.pdf$/i.test(s.label) ? 'picture_as_pdf' : 'notes'} className="text-2xl text-[#00dbea]" />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{s.label}</span><span className="lb-dim block truncate text-[13px]">{s.preview}</span></span>
                <button type="button" aria-label={`Delete ${s.label}`} className="lb-ghost !min-h-[40px] !px-3" onClick={() => { if (window.confirm(`Remove "${s.label}" from your brain?`)) void removeSource(s.index); }}><Icon name="delete" /></button>
              </li>
            ))}
          </ul>
        </section>

        <p className="lb-dim text-[13px]">Secure and private: your brain is only used by your own AI team. It is never shared with other loan officers.</p>
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-[150] border-t border-[#176078] bg-[#051423]/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
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
