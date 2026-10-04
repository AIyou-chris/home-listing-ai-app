import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { buildApiUrl } from '../../lib/api';
import { authedFetch } from '../../services/authedFetch';

// Admin Business Brain: one place to teach the platform's own AI (landing-page chat,
// sales and support wording). Backend: GET/PUT /api/admin/business-brain and
// POST /api/admin/business-brain/test (backend/services/businessBrain.js).

type SourceType = 'text' | 'url' | 'file' | 'faq';

interface BrainSource {
  id: string;
  type: SourceType;
  title: string;
  url: string;
  content: string;
  createdAt: string;
}

interface BrainConfig {
  aiName: string;
  voice: string;
  personality: string;
  firstMessage: string;
  marketing: string;
  sales: string;
  service: string;
  sources: BrainSource[];
}

interface ChatTurn { role: 'user' | 'assistant'; content: string }

const VOICES = ['marin', 'cedar', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'];
const SOURCE_LABEL: Record<SourceType, string> = { text: 'Notes', url: 'Website', file: 'File', faq: 'FAQ' };
const SUGGESTIONS = ['What does HomeListingAI cost?', 'How does the free trial work?', 'What is a WOW Link?'];

const EMPTY: BrainConfig = {
  aiName: '', voice: 'marin', personality: '', firstMessage: '', marketing: '', sales: '', service: '', sources: []
};

const jsonHeaders = { 'Content-Type': 'application/json' };

const brainReadiness = (count: number): { label: string; tone: string } => {
  if (count >= 3) return { label: 'Strong', tone: 'text-emerald-700 bg-emerald-50' };
  if (count >= 1) return { label: 'Growing', tone: 'text-amber-700 bg-amber-50' };
  return { label: 'Empty', tone: 'text-slate-600 bg-slate-100' };
};

const Card: React.FC<{ title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, hint, action, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-slate-600">{hint}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none';

const AdminBusinessBrainPage: React.FC = () => {
  const [config, setConfig] = useState<BrainConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await authedFetch(buildApiUrl('/api/admin/business-brain'));
      if (!res.ok) throw new Error(`Could not load (${res.status})`);
      const data = await res.json();
      setConfig({ ...EMPTY, ...data.config });
      setTableReady(data.tableReady !== false);
      setDirty(false);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the Business Brain');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = (patch: Partial<BrainConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await authedFetch(buildApiUrl('/api/admin/business-brain'), { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(config) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Save failed (${res.status})`);
      setConfig({ ...EMPTY, ...data.config });
      setDirty(false);
      toast.success('Business Brain saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ---- knowledge library ----
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<'text' | 'url' | 'file'>('text');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addSource = (source: Omit<BrainSource, 'id' | 'createdAt'>) => {
    update({ sources: [...config.sources, { ...source, id: `src_${Date.now()}`, createdAt: new Date().toISOString() }] });
    setAdding(false);
    setTitle(''); setText(''); setUrl('');
  };

  const extract = async (path: string, init: RequestInit, fallback: string) => {
    setBusy(true);
    try {
      const res = await authedFetch(buildApiUrl(path), init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || fallback);
      return data as { text: string; truncated?: boolean };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : fallback);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const submitAdd = async () => {
    if (mode === 'text') {
      if (!text.trim()) return;
      addSource({ type: 'text', title: title.trim() || 'Notes', url: '', content: text.trim() });
    } else if (mode === 'url') {
      if (!url.trim()) return;
      const data = await extract('/api/lo/chatbot/extract-url', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ url: url.trim() }) }, 'Could not scan that page');
      if (data?.text) addSource({ type: 'url', title: title.trim() || url.trim(), url: url.trim(), content: data.text });
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const data = await extract('/api/lo/chatbot/extract-file', { method: 'POST', body: form }, 'Could not read that file');
    if (fileRef.current) fileRef.current.value = '';
    if (data?.text) addSource({ type: 'file', title: title.trim() || file.name, url: '', content: data.text });
  };

  const removeSource = (id: string) => update({ sources: config.sources.filter((s) => s.id !== id) });

  // ---- test chat ----
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  const ask = async (q: string) => {
    const message = q.trim();
    if (!message || asking) return;
    setQuestion('');
    setTurns((t) => [...t, { role: 'user', content: message }]);
    setAsking(true);
    try {
      const res = await authedFetch(buildApiUrl('/api/admin/business-brain/test'), {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({ message, history: turns, config })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Test failed (${res.status})`);
      setTurns((t) => [...t, { role: 'assistant', content: data.reply || '(no answer)' }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setAsking(false);
    }
  };

  const ready = useMemo(() => brainReadiness(config.sources.length), [config.sources.length]);
  const lastUpdated = useMemo(() => {
    const dates = config.sources.map((s) => s.createdAt).sort();
    return dates.length ? new Date(dates[dates.length - 1]).toLocaleDateString() : 'Not yet';
  }, [config.sources]);

  if (loading) return <div className="p-8 text-slate-600">Loading the Business Brain…</div>;
  if (loadError) {
    return (
      <div className="p-8">
        <p className="mb-3 text-red-700">{loadError}</p>
        <button type="button" onClick={() => void load()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Try again</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Business Brain</p>
        <h1 className="text-3xl font-extrabold text-slate-900">One brain for your AI team.</h1>
        <p className="mt-1 text-sm text-slate-600">Add knowledge once. The HomeListingAI chat on your website uses it to answer prospects.</p>
      </header>

      {!tableReady && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          The brain cannot be saved yet. Run <code>platform-brain-migration.sql</code> in the Supabase SQL editor, then reload this page.
        </div>
      )}

      <Card title="Your Business Brain" hint="Single source of truth for your AI team.">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs font-bold uppercase text-slate-500">Sources</p><p className="text-2xl font-bold text-slate-900">{config.sources.length}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-500">Last added</p><p className="font-semibold text-slate-900">{lastUpdated}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-500">Readiness</p><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${ready.tone}`}>{ready.label}</span></div>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700">
          + Add knowledge to the Business Brain
        </button>
      </Card>

      <Card title="Talk to your Business Brain" hint="Test answers before visitors see them. Unsaved edits are included.">
        <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm" aria-live="polite">
          {turns.length === 0 && <p className="text-slate-500">Ask your Business Brain a question to test what it knows.</p>}
          {turns.map((t, i) => (
            <p key={i} className={t.role === 'user' ? 'text-right font-semibold text-slate-900' : 'text-slate-800'}>{t.content}</p>
          ))}
          {asking && <p className="text-slate-500">Thinking…</p>}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((q) => (
            <button key={q} type="button" onClick={() => void ask(q)} className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800">{q}</button>
          ))}
          {turns.length > 0 && <button type="button" onClick={() => setTurns([])} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Clear</button>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void ask(question); }} className="flex gap-2">
          <input className={inputCls} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything about the business…" aria-label="Ask the Business Brain" />
          <button type="submit" disabled={asking || !question.trim()} className="rounded-lg bg-orange-600 px-4 text-sm font-bold text-white disabled:opacity-50">Ask</button>
        </form>
      </Card>

      <Card title="Knowledge library" hint="These are the things your AI learns from."
        action={<button type="button" onClick={() => setAdding(true)} className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white">Add source</button>}>
        {adding && (
          <div className="mb-4 space-y-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-white p-1" role="tablist" aria-label="How to add it">
              {([['text', 'Paste text'], ['file', 'Upload file'], ['url', 'Scan website']] as const).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
                  className={`rounded-md px-2 py-2 text-sm font-semibold ${mode === id ? 'bg-orange-600 text-white' : 'text-slate-700'}`}>{label}</button>
              ))}
            </div>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name (e.g. Pricing, FAQ, Refund policy)" aria-label="Source name" />
            {mode === 'text' && <textarea className={`${inputCls} min-h-[120px]`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste services, prices, policies, FAQs…" aria-label="Text to add" />}
            {mode === 'url' && <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://homelistingai.com/pricing" aria-label="Website address" />}
            {mode === 'file' && <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv,.doc,.docx" onChange={(e) => void onFile(e.target.files?.[0])} aria-label="File to upload" className="text-sm" />}
            <div className="flex gap-2">
              {mode !== 'file' && <button type="button" disabled={busy} onClick={() => void submitAdd()} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Reading…' : 'Add'}</button>}
              <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
            </div>
          </div>
        )}
        {config.sources.length === 0 ? (
          <p className="text-sm text-slate-600">Nothing here yet. Add your pricing, how the trial works, and common questions.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {config.sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{s.title}</p>
                  <p className="text-xs text-slate-600">{SOURCE_LABEL[s.type]} · {s.content.length.toLocaleString()} characters · {new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <button type="button" onClick={() => removeSource(s.id)} aria-label={`Remove ${s.title}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Voice and personality" hint="How your public AI sounds.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">Public AI name
            <input className={`${inputCls} mt-1 font-normal`} value={config.aiName} onChange={(e) => update({ aiName: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-slate-800">Voice
            <select className={`${inputCls} mt-1 font-normal`} value={config.voice} onChange={(e) => update({ voice: e.target.value })}>
              {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-sm font-semibold text-slate-800">Personality and mission
          <textarea className={`${inputCls} mt-1 min-h-[90px] font-normal`} value={config.personality} onChange={(e) => update({ personality: e.target.value })} />
        </label>
        <label className="mt-3 block text-sm font-semibold text-slate-800">First message
          <input className={`${inputCls} mt-1 font-normal`} value={config.firstMessage} onChange={(e) => update({ firstMessage: e.target.value })} />
        </label>
      </Card>

      {([
        ['marketing', 'Your Marketing Manager', 'How you want your marketing written.'],
        ['sales', 'Your Sales AI', 'How you want selling done.'],
        ['service', 'Your Customer Service', 'How you want customers looked after.']
      ] as const).map(([key, heading, hint]) => (
        <Card key={key} title={heading} hint={hint}>
          <textarea className={`${inputCls} min-h-[130px]`} value={config[key]} onChange={(e) => update({ [key]: e.target.value } as Partial<BrainConfig>)} aria-label={heading} />
        </Card>
      ))}

      <div className="sticky bottom-3 flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <span className="text-sm text-slate-600">{dirty ? 'You have unsaved changes.' : 'All saved.'}</span>
        <button type="button" onClick={() => void save()} disabled={!dirty || saving} className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default AdminBusinessBrainPage;
