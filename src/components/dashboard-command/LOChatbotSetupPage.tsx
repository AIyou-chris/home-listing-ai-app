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
  faq: FaqItem[];
  is_active: boolean;
}

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
    faq: [],
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        {/* Left: Config */}
        <div className="space-y-6">

          {/* Bot Identity */}
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

          {/* Personality */}
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

          {/* Knowledge Base */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              <span className="material-symbols-outlined text-base text-emerald-500">library_books</span>
              Knowledge Base
            </h2>
            <textarea
              value={config.knowledge_base}
              onChange={(e) => setConfig((c) => ({ ...c, knowledge_base: e.target.value }))}
              placeholder="Paste your rate sheet, loan programs, down payment assistance info, or any other content you want the bot to reference..."
              rows={8}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Paste rate sheets, program details, eligibility criteria — anything you want the bot to know. Plain text works best.
            </p>
          </section>

          {/* FAQ */}
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
          <p className="mt-3 text-xs text-slate-400 text-center">
            Preview uses FAQ matching only. Live bot uses OpenAI with your full knowledge base.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LOChatbotSetupPage;
