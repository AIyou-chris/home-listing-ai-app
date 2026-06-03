import React, { useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

const getApiHeaders = async (): Promise<HeadersInit> => {
  const { data } = await supabase.auth.getUser();
  return {
    'Content-Type': 'application/json',
    ...(data.user?.id ? { 'x-user-id': data.user.id } : {})
  };
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface ChatbotConfig {
  bot_name: string;
  greeting: string;
  personality: string;
  knowledge_base: string;
  compliance_rules: string;
  faq: FaqItem[];
  is_active: boolean;
}

// ─── Knowledge Base Section ───────────────────────────────────────────────────

type KbTab = 'text' | 'file' | 'url';

const KnowledgeBaseSection: React.FC<{
  value: string;
  onChange: (text: string) => void;
  getHeaders: () => Promise<HeadersInit>;
}> = ({ value, onChange, getHeaders }) => {
  const [tab, setTab] = useState<KbTab>('text');
  const [urlInput, setUrlInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const appendText = (newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    onChange(value ? `${value}\n\n---\n\n${trimmed}` : trimmed);
    toast.success('Added to knowledge base');
  };

  const scanUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setScanning(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(buildApiUrl('/api/lo/chatbot/extract-url'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to scan');
      appendText(`[From: ${url}]\n${data.text}`);
      setUrlInput('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not scan that URL');
    } finally {
      setScanning(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const headers = await getHeaders();
      // Remove Content-Type so browser sets multipart boundary
      const headerEntries = Object.entries(headers as Record<string, string>).filter(([k]) => k.toLowerCase() !== 'content-type');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(buildApiUrl('/api/lo/chatbot/extract-file'), {
        method: 'POST',
        headers: Object.fromEntries(headerEntries),
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to extract file');
      appendText(`[From: ${file.name}]\n${data.text}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const TABS: { id: KbTab; label: string; icon: string }[] = [
    { id: 'text', label: 'Paste Text', icon: 'edit_note' },
    { id: 'file', label: 'Upload File', icon: 'upload_file' },
    { id: 'url', label: 'Scan Website', icon: 'travel_explore' }
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        <span className="material-symbols-outlined text-base text-emerald-500">library_books</span>
        Knowledge Base
      </h2>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Paste Text */}
      {tab === 'text' && (
        <div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste your rate sheet, loan programs, down payment assistance info, or any other content you want the bot to reference..."
            rows={8}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
          />
          <p className="mt-1 text-xs text-slate-400">
            Paste rate sheets, program details, eligibility — anything you want the bot to know.
          </p>
        </div>
      )}

      {/* Upload File */}
      {tab === 'file' && (
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void uploadFile(file);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            {uploading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-3xl text-emerald-500">progress_activity</span>
                <p className="text-sm font-medium text-slate-600">Extracting text...</p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-3xl text-slate-400">upload_file</span>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Drop a file here or click to browse</p>
                  <p className="mt-1 text-xs text-slate-400">Supports PDF, TXT, CSV — up to 10MB</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
          {value && (
            <p className="mt-2 text-xs text-emerald-600">
              ✓ {value.length.toLocaleString()} characters in knowledge base
            </p>
          )}

          {/* Rate Sheet Template Download */}
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-xl text-amber-600 flex-shrink-0">description</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">Need a starting point?</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Download our rate sheet template — pre-built with Conventional, FHA, VA, USDA, Jumbo, and DPA programs.
                  Fill in your actual rates, save as CSV, then upload here.
                </p>
                <a
                  href="/lo-rate-sheet-template.csv"
                  download="lo-rate-sheet-template.csv"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 underline"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download Rate Sheet Template (CSV)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan Website */}
      {tab === 'url' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void scanUrl(); } }}
              placeholder="https://yoursite.com/loan-programs"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
            />
            <button
              onClick={() => void scanUrl()}
              disabled={scanning || !urlInput.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {scanning ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">travel_explore</span>
              )}
              {scanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Enter a URL and we'll extract the text content — great for loan program pages, rate sheets, or your company bio.
          </p>
          {value && (
            <p className="text-xs text-emerald-600">
              ✓ {value.length.toLocaleString()} characters in knowledge base
            </p>
          )}
        </div>
      )}

      {/* Current KB preview (shown when not in text mode) */}
      {tab !== 'text' && value && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-slate-500">Current Knowledge Base</p>
            <button
              onClick={() => { if (window.confirm('Clear the entire knowledge base?')) onChange(''); }}
              className="text-xs text-rose-500 hover:underline"
            >
              Clear all
            </button>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none transition focus:border-slate-300"
          />
        </div>
      )}
    </section>
  );
};

// ─── Compliance Section ───────────────────────────────────────────────────────

const PLATFORM_RULES = [
  "Never provide legal advice of any kind. Always direct buyers to consult a qualified attorney for legal questions.",
  "If you don't know the answer to a question, never guess or speculate. Always refer the buyer directly to the loan officer or the real estate agent for clarification.",
  "Never quote specific interest rates or APRs unless they were provided by the loan officer in their knowledge base or uploaded rate sheets. Always encourage buyers to contact the loan officer directly for personalized numbers.",
  "Never discriminate or make comments based on race, religion, national origin, sex, disability, or familial status (Fair Housing Act).",
  "Never guarantee loan approval, closing timelines, or specific loan terms without qualification.",
];

const ComplianceSection: React.FC<{
  value: string;
  onChange: (text: string) => void;
  getHeaders: () => Promise<HeadersInit>;
}> = ({ value, onChange, getHeaders }) => {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadComplianceFile = async (file: File) => {
    setUploading(true);
    try {
      const headers = await getHeaders();
      const headerEntries = Object.entries(headers as Record<string, string>).filter(([k]) => k.toLowerCase() !== 'content-type');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(buildApiUrl('/api/lo/chatbot/extract-file'), {
        method: 'POST',
        headers: Object.fromEntries(headerEntries),
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to extract file');
      onChange(data.text);
      toast.success('Compliance rules uploaded and active');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeDoc = async () => {
    if (!window.confirm('Remove your uploaded compliance rules? Platform guardrails will still apply.')) return;
    setRemoving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(buildApiUrl('/api/lo/chatbot/compliance-doc'), {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('remove_failed');
      onChange('');
      toast.success('Compliance rules removed');
    } catch {
      toast.error('Failed to remove. Try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        <span className="material-symbols-outlined text-base text-red-500">shield_lock</span>
        Compliance Rules
      </h2>

      {/* Platform guardrails — locked */}
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Platform Guardrails</span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700">Always On · Cannot Be Removed</span>
        </div>
        <div className="space-y-2">
          {PLATFORM_RULES.map((rule, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border-l-4 border-red-300 bg-slate-50 px-4 py-2.5">
              <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-sm text-red-400">lock</span>
              <p className="text-xs text-slate-700">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      <hr className="mb-5 border-slate-100" />

      {/* Company compliance upload */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Your Company's Compliance Rules</span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">Optional</span>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Get a compliance doc from your compliance officer. Upload it here and the AI will follow those rules in every response and piece of content it generates.
        </p>

        {value ? (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="material-symbols-outlined flex-shrink-0 text-2xl text-red-400">picture_as_pdf</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">Compliance rules active</p>
              <p className="text-xs text-slate-500">{value.length.toLocaleString()} characters · Applied to all AI responses</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <button
                onClick={() => void removeDoc()}
                disabled={removing}
                className="text-xs text-slate-400 transition hover:text-red-500 disabled:opacity-50"
              >
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        ) : null}

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) void uploadComplianceFile(file);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition hover:border-primary-400 hover:bg-primary-50"
        >
          {uploading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-3xl text-primary-500">progress_activity</span>
              <p className="text-sm font-medium text-slate-600">Extracting compliance rules...</p>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-3xl text-slate-400">upload_file</span>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {value ? 'Upload a new compliance doc' : 'Drop your compliance doc here'}
                </p>
                <p className="mt-1 text-xs text-slate-400">PDF, TXT, or Word · Max 10MB</p>
              </div>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadComplianceFile(file);
          }}
        />
      </div>
    </section>
  );
};

// ─── Preview ─────────────────────────────────────────────────────────────────

const BotPreview: React.FC<{ config: ChatbotConfig }> = ({ config }) => {
  const [messages, setMessages] = useState<{ role: 'visitor' | 'bot'; text: string }[]>([
    { role: 'bot', text: config.greeting || 'Hi! I can answer your financing questions.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: 'bot', text: config.greeting || 'Hi! I can answer your financing questions.' }]);
  }, [config.greeting]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'visitor', text: clean }]);
    setLoading(true);

    // Simulate response using FAQ or generic fallback in preview
    await new Promise((resolve) => setTimeout(resolve, 700));
    const faqMatch = config.faq.find((f) =>
      clean.toLowerCase().includes(f.question.toLowerCase().slice(0, 15))
    );
    const reply = faqMatch
      ? faqMatch.answer
      : "Great question! I'd love to walk you through the details — please reach out directly and I can give you personalized numbers.";
    setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    setLoading(false);
  };

  return (
    <div className="flex h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-3 text-white">
        <p className="text-sm font-bold">{config.bot_name || 'Your Loan Officer'}</p>
        <p className="text-xs text-emerald-100">Financing Assistant • Preview</p>
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'visitor'
                  ? 'rounded-br-sm bg-slate-900 text-white'
                  : 'rounded-tl-sm border border-slate-200 bg-white text-slate-800 shadow-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 shadow-sm">
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 px-3 py-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void send(input); } }}
            placeholder="Ask a financing question..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
          />
          <button
            onClick={() => void send(input)}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const LOChatbotSetupPage: React.FC = () => {
  const [config, setConfig] = useState<ChatbotConfig>({
    bot_name: '',
    greeting: '',
    personality: '',
    knowledge_base: '',
    compliance_rules: '',
    faq: [],
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'knowledge' | 'compliance' | 'faq'>('identity');

  // ── Load existing config ──────────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const headers = await getApiHeaders();
        const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), { headers });
        if (res.ok) {
          const data = await res.json();
          setConfig({
            bot_name: data.bot_name || '',
            greeting: data.greeting || '',
            personality: data.personality || '',
            knowledge_base: data.knowledge_base || '',
            compliance_rules: data.compliance_rules || '',
            faq: Array.isArray(data.faq) ? data.faq.map((f: Omit<FaqItem, 'id'> & { id?: string }) => ({
              ...f,
              id: f.id || crypto.randomUUID()
            })) : [],
            is_active: data.is_active !== false
          });
        }
      } catch (err) {
        console.error('[LOChatbotSetupPage] load error', err);
      } finally {
        setLoading(false);
      }
    };
    void fetch_();
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...config,
          faq: config.faq.map(({ question, answer }) => ({ question, answer }))
        })
      });
      if (!res.ok) throw new Error('save_failed');
      toast.success('Chatbot saved!');
    } catch {
      toast.error('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── FAQ helpers ───────────────────────────────────────────────────────────
  const addFaq = () =>
    setConfig((c) => ({
      ...c,
      faq: [...c.faq, { id: crypto.randomUUID(), question: '', answer: '' }]
    }));

  const updateFaq = (id: string, field: 'question' | 'answer', value: string) =>
    setConfig((c) => ({
      ...c,
      faq: c.faq.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    }));

  const removeFaq = (id: string) =>
    setConfig((c) => ({ ...c, faq: c.faq.filter((f) => f.id !== id) }));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
        Loading chatbot config...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Financing Bot</h1>
          <p className="mt-1 text-sm text-slate-500">
            Train your bot to answer mortgage and financing questions on your listing pages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <div
              onClick={() => setConfig((c) => ({ ...c, is_active: !c.is_active }))}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                config.is_active ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  config.is_active ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="font-medium">{config.is_active ? 'Active' : 'Off'}</span>
          </label>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Config with tabs */}
        <div>
          {/* Tab nav */}
          <div className="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(
              [
                { id: 'identity', label: 'Identity & Tone', icon: 'smart_toy' },
                { id: 'knowledge', label: 'Knowledge Base', icon: 'library_books' },
                { id: 'compliance', label: 'Compliance', icon: 'shield_lock' },
                { id: 'faq', label: 'FAQ', icon: 'quiz' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {/* Identity & Tone tab */}
            {activeTab === 'identity' && (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                    <span className="material-symbols-outlined text-base text-emerald-500">smart_toy</span>
                    Bot Identity
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Bot Name</label>
                      <input
                        value={config.bot_name}
                        onChange={(e) => setConfig((c) => ({ ...c, bot_name: e.target.value }))}
                        placeholder="e.g. Jake's Financing Assistant"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Opening Greeting</label>
                      <textarea
                        value={config.greeting}
                        onChange={(e) => setConfig((c) => ({ ...c, greeting: e.target.value }))}
                        placeholder="Hi! I can answer your mortgage and financing questions..."
                        rows={3}
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                      />
                      <p className="mt-1 text-xs text-slate-400">This is the first message visitors see when they open the chat.</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                    <span className="material-symbols-outlined text-base text-emerald-500">psychology</span>
                    Personality & Tone
                  </h2>
                  <textarea
                    value={config.personality}
                    onChange={(e) => setConfig((c) => ({ ...c, personality: e.target.value }))}
                    placeholder="Professional and friendly mortgage advisor. Use simple language. Always encourage visitors to reach out directly for personalized rates..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">Describe how you want the bot to communicate. This shapes every reply.</p>
                </section>
              </>
            )}

            {/* Knowledge Base tab */}
            {activeTab === 'knowledge' && (
              <KnowledgeBaseSection
                value={config.knowledge_base}
                onChange={(text) => setConfig((c) => ({ ...c, knowledge_base: text }))}
                getHeaders={getApiHeaders}
              />
            )}

            {/* Compliance tab */}
            {activeTab === 'compliance' && (
              <ComplianceSection
                value={config.compliance_rules}
                onChange={(text) => setConfig((c) => ({ ...c, compliance_rules: text }))}
                getHeaders={getApiHeaders}
              />
            )}

            {/* FAQ tab */}
            {activeTab === 'faq' && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                    <span className="material-symbols-outlined text-base text-emerald-500">quiz</span>
                    FAQ Pairs
                  </h2>
                  <button
                    onClick={addFaq}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Question
                  </button>
                </div>

                {config.faq.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                    No FAQ pairs yet. Add common financing questions visitors ask.
                  </p>
                )}

                <div className="space-y-4">
                  {config.faq.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Q&A Pair</span>
                        <button
                          onClick={() => removeFaq(item.id)}
                          className="rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-rose-500"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                      <input
                        value={item.question}
                        onChange={(e) => updateFaq(item.id, 'question', e.target.value)}
                        placeholder="Question (e.g. What's the minimum down payment?)"
                        className="mb-2 w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-primary-400"
                      />
                      <textarea
                        value={item.answer}
                        onChange={(e) => updateFaq(item.id, 'answer', e.target.value)}
                        placeholder="Answer..."
                        rows={2}
                        className="w-full resize-none rounded border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-primary-400"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-slate-400">preview</span>
            <p className="text-sm font-semibold text-slate-600">Live Preview</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Simulated
            </span>
          </div>
          <BotPreview config={config} />
          <p className="mt-3 text-center text-xs text-slate-400">
            Preview uses FAQ matching only. Live bot uses OpenAI with your full knowledge base.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LOChatbotSetupPage;
