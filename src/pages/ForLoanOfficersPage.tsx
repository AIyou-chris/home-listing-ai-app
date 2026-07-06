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

// ── Inline AI demo — fully client-side, zero backend, zero signup ─────────────
// The whole pitch is "your AI answers buyers and hands you the lead", so the
// page proves it instead of claiming it: tap a real buyer question, watch the
// bot answer, watch the lead land in "your" inbox.
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

const InlineDemo: React.FC = () => {
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
    setAsked(prev => [...prev, qa.q]);
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', text: qa.q }]);
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: qa.a }]);
      if (!leadCaptured) window.setTimeout(() => setLeadCaptured(true), 900);
    }, 1100);
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.1)]">
      {/* Mock listing header */}
      <div className="flex h-[86px] items-end bg-gradient-to-br from-blue-900 to-blue-600 p-3">
        <div>
          <div className="text-[18px] font-black text-white">$875,000</div>
          <div className="text-[10px] text-white/75">2847 Sunset Ridge Dr, Austin TX · Sample listing</div>
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="h-[300px] space-y-2.5 overflow-y-auto bg-[#f8fafc] p-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              m.role === 'user'
                ? 'rounded-br-md bg-blue-600 text-white'
                : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
              <span className="inline-flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        {leadCaptured && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">🔥 New warm lead — routed to YOU</p>
            <p className="mt-1 text-[12px] leading-relaxed text-emerald-800">
              That buyer just became <strong>your</strong> lead: name, phone, and what they asked — in your inbox before your competition wakes up. Never shared. Never resold.
            </p>
          </div>
        )}
      </div>

      {/* Question chips */}
      <div className="border-t border-slate-100 bg-white p-3">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Tap a real buyer question</p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_QA.map(qa => (
            <button
              key={qa.q}
              onClick={() => ask(qa)}
              disabled={asked.includes(qa.q)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${
                asked.includes(qa.q)
                  ? 'border-slate-100 bg-slate-50 text-slate-300'
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

// ── Page ──────────────────────────────────────────────────────────────────────
const ForLoanOfficersPage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string | null>(null);
  const openedFired = useRef(false);
  const demoRef = useRef<HTMLDivElement>(null);

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

  const scrollToDemo = () => demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-[#f1f5f9]" style={{ WebkitTapHighlightColor: 'transparent' }}>
      <div className="mx-auto max-w-[480px] bg-white shadow-sm">

        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-[#1e3a5f] px-6 pb-9 pt-10 text-center text-white">
          <span className="inline-block rounded-full border border-cyan-400/25 bg-cyan-400/12 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-cyan-300">
            For Loan Officers
          </span>
          <h1 className="mx-auto mt-4 max-w-[380px] text-[27px] font-black leading-[1.18] tracking-tight">
            {firstName ? `${firstName}, stop` : 'Stop'} buying leads that were <span className="text-[#38bdf8]">sold to 5 other LOs</span> first.
          </h1>
          <p className="mx-auto mt-3 max-w-[340px] text-sm leading-relaxed text-slate-300">
            HomeListingAI puts your AI assistant on your partner agents' listings. Buyers chat 24/7 — every financing question routes to you. Only you.
          </p>
          <button onClick={scrollToDemo} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-[16px] font-extrabold text-white shadow-[0_8px_24px_rgba(37,99,235,0.4)] active:scale-[0.99]">
            ▶ Try it right now — no signup
          </button>
          <button onClick={goSignup} className="mt-2.5 w-full rounded-2xl border border-slate-600 bg-white/5 py-3.5 text-[14px] font-bold text-slate-200 active:scale-[0.99]">
            Start my free 7-day trial
          </button>
          <p className="mt-2.5 text-[11px] font-semibold text-slate-500">No card needed · Full access for 7 days · Cancel anytime</p>
        </div>

        {/* Live demo — THE proof */}
        <div ref={demoRef} className="scroll-mt-4 bg-[#f8fafc] px-5 py-6">
          <p className="text-center text-[10px] font-extrabold uppercase tracking-widest text-blue-600">Live demo — this is the product</p>
          <h2 className="mb-4 mt-1 text-center text-[20px] font-black text-slate-900">Your AI, working a listing.</h2>
          <InlineDemo />
          <button
            onClick={() => window.open('/partner-invite/demo', '_blank')}
            className="mt-3 w-full rounded-2xl border border-blue-200 bg-white py-3.5 text-[13px] font-extrabold text-blue-700 active:scale-[0.99]"
          >
            👁️ See the full experience your agents get →
          </button>
        </div>

        {/* Cost math */}
        <div className="bg-[#0b0b09] px-6 py-7 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#ff7a4d]">Do the math</p>
          <div className="mt-3 flex items-stretch justify-center gap-3">
            <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[24px] font-black text-white">$75–150<span className="text-[#d64327]">+</span></div>
              <div className="mt-1 text-[11px] font-bold leading-snug text-slate-400">ONE shared Zillow lead — sold to 5 LOs</div>
            </div>
            <div className="flex-1 rounded-2xl border border-[#d64327]/40 bg-[#d64327]/10 p-4">
              <div className="text-[24px] font-black text-[#ff7a4d]">$79<span className="text-[14px] text-white">/mo</span></div>
              <div className="mt-1 text-[11px] font-bold leading-snug text-slate-300">Unlimited warm leads — yours alone</div>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-[320px] text-[13px] font-bold leading-relaxed text-white">One closed loan covers 20+ months. Less than one of their leads. Every single month.</p>
          <p className="mt-3 text-[9px] leading-relaxed text-slate-600">Zillow lead costs vary by market; based on average reported costs of $75–$150 per shared lead. HomeListingAI is not affiliated with or endorsed by Zillow.</p>
        </div>

        {/* How it works */}
        <div className="space-y-2.5 bg-white px-5 py-6">
          <p className="text-center text-[10px] font-extrabold uppercase tracking-widest text-blue-600">How it works</p>
          {[
            { icon: '🤝', t: 'You send your agent a magic link', d: 'One tap. Your agent gets a live AI-powered listing demo — branded to you. Free for them, so saying yes is easy.' },
            { icon: '🏡', t: 'Their listings answer buyers 24/7', d: 'Your AI is live on every listing — answering questions, qualifying buyers, night and day.' },
            { icon: '🔥', t: 'Warm leads come straight to you', d: 'Every buyer who asks about financing gets routed to you — with name, phone, and what they asked.' }
          ].map(s => (
            <div key={s.t} className="flex items-start gap-3 rounded-2xl bg-[#f8fafc] p-3.5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">{s.icon}</div>
              <div>
                <p className="text-[13px] font-extrabold text-slate-900">{s.t}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Founder — honest credibility, not a fake testimonial */}
        <div className="bg-gradient-to-br from-slate-900 to-[#1e3a5f] px-5 py-6">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300">Why this exists</p>
          <p className="mt-2.5 text-[15px] leading-relaxed text-slate-200">
            "I spent 15 years in the mortgage business buying the same recycled leads as everyone else. So I built the tool I always wanted: my own AI on my agents' listings, sending buyers to <em>me</em> first — not to whoever paid Zillow that month."
          </p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">C</div>
            <div>
              <div className="text-[13px] font-bold text-white">Chris — Founder, HomeListingAI</div>
              <div className="text-[11px] text-slate-400">15 years in mortgage lending</div>
            </div>
          </div>
        </div>

        {/* Straight answers */}
        <div className="space-y-2.5 bg-[#f8fafc] px-5 py-6">
          <p className="text-center text-[10px] font-extrabold uppercase tracking-widest text-blue-600">Straight answers</p>
          {[
            { q: 'Do I need a credit card to try it?', a: 'No. Seven days, full access, no card. If it fills your pipeline, pick a plan. If not, walk away — nothing to cancel.' },
            { q: 'What does my agent pay?', a: 'Nothing, ever. Agents get the AI listing pages free. You pay for your own tool, your own branding, your own leads.' },
            { q: 'How long does setup take?', a: 'About 5 minutes: create your account, add your NMLS and branding, send your first agent link.' }
          ].map(f => (
            <div key={f.q} className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
              <p className="text-[13px] font-extrabold text-slate-900">{f.q}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{f.a}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="bg-white px-5 pb-9 pt-7 text-center">
          <h3 className="text-[20px] font-black text-slate-900">Your next lead shouldn't cost $150.</h3>
          <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-relaxed text-slate-500">7 days free. No card. Your first agent link goes out in minutes.</p>
          <button onClick={goSignup} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-[16px] font-extrabold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] active:scale-[0.99]">
            Start My Free 7-Day Trial →
          </button>
        </div>

        <p className="bg-white pb-6 text-center text-[10px] text-slate-400">Powered by HomeListingAI</p>
      </div>
    </div>
  );
};

export default ForLoanOfficersPage;
