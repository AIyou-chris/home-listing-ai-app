import React, { useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LOChatbotInfo {
  enabled: boolean;
  lo_agent_id?: string;
  bot_name?: string;
  greeting?: string;
  lo_name?: string;
  lo_photo?: string | null;
  lo_logo?: string | null;
  lo_company?: string | null;
}

interface ChatMessage {
  id: string;
  role: 'visitor' | 'bot';
  text: string;
}

interface LOFinanceChatPanelProps {
  listingId: string;
  open: boolean;
  onClose: () => void;
}

// ─── Suggested questions visitors commonly ask ────────────────────────────────

const SUGGESTED = [
  "What's the monthly payment?",
  'How much do I need down?',
  'Can I qualify with less-than-perfect credit?'
];

// ─── Lead capture form ────────────────────────────────────────────────────────

const LeadCaptureForm: React.FC<{
  loAgentId: string;
  listingId: string;
  loName?: string;
  onDone: () => void;
}> = ({ loAgentId, listingId, loName, onDone }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() && !form.email.trim() && !form.phone.trim()) return;
    setSubmitting(true);
    try {
      await fetch(buildApiUrl('/api/lo/chatbot/capture-lead'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lo_agent_id: loAgentId,
          listing_id: listingId,
          name: form.name || null,
          email: form.email || null,
          phone: form.phone || null,
        })
      });
      setDone(true);
      setTimeout(onDone, 3000);
    } catch {
      // non-fatal — still mark done so UX doesn't break
      setDone(true);
      setTimeout(onDone, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-4 mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
        <span className="material-symbols-outlined text-xl text-emerald-600">check_circle</span>
        <p className="mt-1 text-sm font-semibold text-emerald-800">Got it! {loName || 'Your loan officer'} will reach out soon.</p>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
      <p className="text-xs font-bold text-emerald-800">
        Want {loName || 'the loan officer'} to reach out to you directly?
      </p>
      <input
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder="Your name"
        className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
      />
      <input
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        placeholder="Email address"
        type="email"
        className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
      />
      <input
        value={form.phone}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        placeholder="Phone (optional)"
        type="tel"
        className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
      />
      <div className="flex gap-2">
        <button
          onClick={onDone}
          className="flex-1 rounded-lg border border-emerald-200 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          No thanks
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={submitting || (!form.name.trim() && !form.email.trim())}
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Connect me'}
        </button>
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const LOFinanceChatPanel: React.FC<LOFinanceChatPanelProps> = ({ listingId, open, onClose }) => {
  const [info, setInfo] = useState<LOChatbotInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [booted, setBooted] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [captureDismissed, setCaptureDismissed] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);

  // ── Fetch LO chatbot info when listing id changes ─────────────────────────
  useEffect(() => {
    if (!listingId) return;
    setInfoLoading(true);
    setInfo(null);
    setBooted(false);
    setMessages([]);
    setShowCapture(false);
    setCaptureDismissed(false);

    fetch(buildApiUrl(`/api/public/listing/${encodeURIComponent(listingId)}/lo-chatbot`))
      .then((r) => r.json())
      .then((data: LOChatbotInfo) => {
        setInfo(data);
        if (data.enabled && data.greeting) {
          setMessages([{ id: 'greeting', role: 'bot', text: data.greeting }]);
        }
        setBooted(true);
      })
      .catch(() => {
        setInfo({ enabled: false });
        setBooted(true);
      })
      .finally(() => setInfoLoading(false));
  }, [listingId]);

  // ── Scroll to bottom on new message ──────────────────────────────────────
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, showCapture]);

  // ── Send message ──────────────────────────────────────────────────────────
  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending || !info?.enabled || !info.lo_agent_id) return;

    setInput('');
    const userMsg: ChatMessage = {
      id: `visitor_${Date.now()}`,
      role: 'visitor',
      text: clean
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch(buildApiUrl('/api/public/lo-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          lo_agent_id: info.lo_agent_id,
          message: clean,
          history
        })
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: `bot_${Date.now()}`, role: 'bot', text: String(data.reply || 'Please contact me directly for details.') }
      ]);
      // Show lead capture if backend signals warm interest
      if (data.showCapture && !captureDismissed) {
        setShowCapture(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `bot_err_${Date.now()}`, role: 'bot', text: 'Something went wrong. Please contact me directly.' }
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-stretch md:justify-end">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close financing chat"
      />

      {/* Panel */}
      <section
        className="relative z-10 flex h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:h-full md:max-w-[430px] md:rounded-none md:rounded-l-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <header className="bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {info?.lo_photo ? (
                <img
                  src={info.lo_photo}
                  alt={info.lo_name || 'LO'}
                  className="h-9 w-9 flex-shrink-0 rounded-full border-2 border-white/30 object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/20">
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">
                  {infoLoading ? 'Loading...' : (info?.bot_name || info?.lo_name || 'Financing Assistant')}
                </p>
                <p className="text-xs text-emerald-100 truncate">
                  {info?.lo_company || 'Mortgage & Financing Questions'}
                </p>
              </div>
              {info?.lo_logo && (
                <div className="flex-shrink-0 rounded-md bg-white/15 px-1.5 py-1">
                  <img
                    src={info.lo_logo}
                    alt={info.lo_company || 'Lender'}
                    className="h-5 w-14 object-contain"
                  />
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
              aria-label="Close financing chat"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </header>

        {/* Body */}
        {infoLoading || !booted ? (
          <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
            Loading...
          </div>
        ) : !info?.enabled ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">chat_bubble</span>
            <p className="text-sm font-semibold text-slate-600">Financing chat not available</p>
            <p className="text-xs text-slate-400">
              The loan officer for this listing hasn't set up their financing assistant yet.
            </p>
          </div>
        ) : (
          <>
            {/* Transcript */}
            <div ref={transcriptRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
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
              {sending && (
                <div className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 shadow-sm">
                  Thinking...
                </div>
              )}
            </div>

            {/* Lead capture — appears when bot signals warm interest */}
            {showCapture && !captureDismissed && info.lo_agent_id && (
              <LeadCaptureForm
                loAgentId={info.lo_agent_id}
                listingId={listingId}
                loName={info.lo_name}
                onDone={() => { setShowCapture(false); setCaptureDismissed(true); }}
              />
            )}

            {/* Input area */}
            <div className="space-y-2 border-t border-slate-200 px-4 py-3">
              {/* Suggested questions — only show while conversation is fresh */}
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void send(input); }
                  }}
                  placeholder="Ask a financing question..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                />
                <button
                  onClick={() => void send(input)}
                  disabled={sending}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default LOFinanceChatPanel;
