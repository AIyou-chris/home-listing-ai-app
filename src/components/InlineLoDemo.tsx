import React, { useEffect, useRef, useState } from 'react';

// ── Inline AI demo — fully client-side, zero backend, zero signup ─────────────
// The whole pitch is "your AI answers buyers and hands you the lead", so pages
// prove it instead of claiming it: tap a real buyer question, watch the bot
// answer, watch the lead land in "your" inbox. Used on the homepage (dark) and
// the /for-loan-officers pitch page (light).
const DEMO_QA: { q: string; a: string }[] = [
  {
    q: 'What are rates like right now?',
    a: "Rates move daily, but based on the loan officer's current rate sheet, well-qualified buyers are seeing 30-yr fixed offers in the low-to-mid 6s. Want an exact quote for your situation? I can have the LO text you today's numbers — what's the best number to reach you?"
  },
  {
    q: 'How much do I need down?',
    a: 'Less than most people think! Conventional loans start at 3% down, FHA at 3.5% — and VA or USDA can be 0% down if you qualify. On this home at $875,000, 3% is about $26,250. Want me to break down what your monthly payment would look like?'
  },
  {
    q: 'Can I qualify at $120k income?',
    a: "Very possibly — at $120k/year with average debts, you'd typically qualify in the $450–550k range, and more with a co-borrower or stronger credit. The LO on this listing can run a real pre-qual in about 10 minutes. Should I set that up?"
  },
  {
    q: "What's PMI?",
    a: "PMI is private mortgage insurance — a monthly fee (usually 0.3–1.5% of the loan per year) when you put less than 20% down. It drops off once you hit 20% equity. A good LO can often structure the loan to minimize or avoid it — want me to connect you?"
  }
];

type ChatMsg = { id: string; role: 'bot' | 'user'; text: string };

// GA4 event — safe no-op when analytics hasn't loaded (consent-gated).
const track = (name: string, params: Record<string, string>) => {
  const w = window as typeof window & { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === 'function') w.gtag('event', name, params);
};

export const InlineLoDemo: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'light' }) => {
  const dark = theme === 'dark';
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'w', role: 'bot', text: "Hi! I'm the AI on this listing. Ask me what real buyers ask at 11pm on a Sunday 👇" }
  ]);
  const [typing, setTyping] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, leadCaptured]);

  const ask = (qa: { q: string; a: string }) => {
    if (typing || asked.includes(qa.q)) return;
    track('demo_question_tap', { question: qa.q, page_path: window.location.pathname });
    setAsked(prev => [...prev, qa.q]);
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', text: qa.q }]);
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: qa.a }]);
      if (!leadCaptured) {
        window.setTimeout(() => {
          setLeadCaptured(true);
          track('demo_lead_banner_shown', { page_path: window.location.pathname });
        }, 900);
      }
    }, 1100);
  };

  return (
    <div className={`overflow-hidden rounded-[18px] border shadow-[0_4px_16px_rgba(15,23,42,0.1)] ${
      dark ? 'border-slate-700/60 bg-slate-900 shadow-cyan-900/10' : 'border-slate-200 bg-white'
    }`}>
      {/* Mock listing header */}
      <div className="flex h-[86px] items-end bg-gradient-to-br from-blue-900 to-blue-600 p-3">
        <div>
          <div className="text-[18px] font-black text-white">$875,000</div>
          <div className="text-[10px] text-white/75">2847 Sunset Ridge Dr, Austin TX · Sample listing</div>
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className={`h-[300px] space-y-2.5 overflow-y-auto p-3 ${dark ? 'bg-[#0B0F19]' : 'bg-[#f8fafc]'}`}>
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              m.role === 'user'
                ? `rounded-br-md text-white ${dark ? 'bg-cyan-600' : 'bg-blue-600'}`
                : dark
                  ? 'rounded-bl-md border border-slate-700/60 bg-slate-800/80 text-slate-200'
                  : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className={`rounded-2xl rounded-bl-md border px-4 py-3 ${dark ? 'border-slate-700/60 bg-slate-800/80' : 'border-slate-200 bg-white'}`}>
              <span className="inline-flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className={`h-1.5 w-1.5 animate-bounce rounded-full ${dark ? 'bg-slate-500' : 'bg-slate-400'}`} style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        {leadCaptured && (
          <div className={`rounded-xl border p-3 ${dark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}>
            <p className={`text-[11px] font-extrabold uppercase tracking-wide ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>🔥 New warm lead — routed to YOU</p>
            <p className={`mt-1 text-[12px] leading-relaxed ${dark ? 'text-emerald-200/90' : 'text-emerald-800'}`}>
              That buyer just became <strong>your</strong> lead: name, phone, and what they asked — in your inbox before your competition wakes up. Never shared. Never resold.
            </p>
          </div>
        )}
      </div>

      {/* Question chips */}
      <div className={`border-t p-3 ${dark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
        <p className={`mb-2 text-[10px] font-extrabold uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Tap a real buyer question</p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_QA.map(qa => (
            <button
              key={qa.q}
              onClick={() => ask(qa)}
              disabled={asked.includes(qa.q)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${
                asked.includes(qa.q)
                  ? dark
                    ? 'border-slate-800 bg-slate-800/50 text-slate-600'
                    : 'border-slate-100 bg-slate-50 text-slate-300'
                  : dark
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 active:scale-95'
                    : 'border-blue-200 bg-blue-50 text-blue-700 active:scale-95'
              }`}
            >
              {qa.q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InlineLoDemo;
