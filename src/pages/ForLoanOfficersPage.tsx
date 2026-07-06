import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../lib/api';
import InlineLoDemo from '../components/InlineLoDemo';

// Fire-and-forget click event — never blocks navigation.
const fireClick = (token: string) => {
  fetch(buildApiUrl(`/api/public/lo-invite/${token}/event`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'clicked' })
  }).catch(() => { /* silent */ });
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
          <InlineLoDemo theme="light" />
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
