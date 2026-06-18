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

const ForLoanOfficersPage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string | null>(null);
  const openedFired = useRef(false);

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

  const headlinePrefix = firstName
    ? `${firstName}, your pipeline doesn't have to `
    : `Your pipeline doesn't have to `;

  return (
    <div className="min-h-screen bg-[#f1f5f9]" style={{ WebkitTapHighlightColor: 'transparent' }}>
      <div className="mx-auto max-w-[480px] bg-white shadow-sm">

        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-[#1e3a5f] px-6 pb-9 pt-10 text-center text-white">
          <span className="inline-block rounded-full border border-cyan-400/25 bg-cyan-400/12 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-cyan-300">
            For Loan Officers
          </span>
          <h1 className="mx-auto mt-4 max-w-[360px] text-[27px] font-black leading-[1.18] tracking-tight">
            {headlinePrefix}<span className="text-[#38bdf8]">slow down</span> when you're not working.
          </h1>
          <p className="mx-auto mt-3 max-w-[340px] text-sm leading-relaxed text-slate-300">
            HomeListingAI gives your partner agents AI-powered listings — and sends every warm lead straight back to you, 24/7.
          </p>
          <button onClick={goSignup} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-[16px] font-extrabold text-white shadow-[0_8px_24px_rgba(37,99,235,0.4)] active:scale-[0.99]">
            Start My Free 7-Day Trial →
          </button>
          <p className="mt-2.5 text-[11px] font-semibold text-slate-500">No charge for 7 days · Card saved, not charged till day 7 · Cancel anytime</p>
        </div>

        {/* Stats */}
        <div className="flex border-b border-slate-100 bg-white">
          {[['24/7', 'AI works'], ['3x', 'More leads'], ['5min', 'To launch']].map(([n, l]) => (
            <div key={l} className="flex-1 border-r border-slate-100 py-4 text-center last:border-r-0">
              <div className="text-[22px] font-black text-slate-900">{n}</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{l}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="space-y-2.5 bg-[#f8fafc] px-5 py-6">
          <p className="text-center text-[10px] font-extrabold uppercase tracking-widest text-blue-600">How it works</p>
          {[
            { icon: '🤝', t: 'You send your agent a magic link', d: 'One tap. Your agent gets a live AI-powered listing demo — branded to you.' },
            { icon: '🏡', t: 'Their listing answers buyers 24/7', d: 'Your AI bot is live on every listing — answering questions, qualifying buyers, night and day.' },
            { icon: '🔥', t: 'Warm leads come straight to you', d: 'Every buyer who asks about financing gets routed to you — pre-qualified, automatically.' }
          ].map(s => (
            <div key={s.t} className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">{s.icon}</div>
              <div>
                <p className="text-[13px] font-extrabold text-slate-900">{s.t}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Value props */}
        <div className="bg-white px-5 py-6">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">Why LOs love it</p>
          <h2 className="mb-5 mt-1 text-[20px] font-black text-slate-900">Three things every LO wants.</h2>
          {[
            { icon: '🔥', bg: '#dbeafe', t: 'A pipeline that fills itself', d: 'Buyers ask your AI about financing at 11pm on a Sunday. You wake up to a qualified lead. No cold calls.' },
            { icon: '🤝', bg: '#dcfce7', t: 'Agents who actually call you back', d: 'When you make their listings smarter, you become their go-to LO. Partner count grows every time you hit send.' },
            { icon: '⏰', bg: '#fef3c7', t: 'Time to focus on what closes', d: 'The AI handles buyer questions, lead capture, and pre-qual intake. You spend your time on applications.' }
          ].map(p => (
            <div key={p.t} className="mb-4 flex items-start gap-3.5 last:mb-0">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl" style={{ background: p.bg }}>{p.icon}</div>
              <div>
                <p className="text-[15px] font-extrabold text-slate-900">{p.t}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{p.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Agent preview */}
        <div className="bg-[#f8fafc] px-5 py-6">
          <p className="mb-3 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-500">👇 This is what your agents get</p>
          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.1)]">
            <div className="flex h-[120px] items-end bg-gradient-to-br from-blue-900 to-blue-600 p-3">
              <div>
                <div className="text-[20px] font-black text-white">$875,000</div>
                <div className="text-[10px] text-white/75">2847 Sunset Ridge Dr, Austin TX</div>
              </div>
            </div>
            <div className="flex gap-2 p-3">
              <div className="flex-1 rounded-xl bg-blue-600 py-2.5 text-center text-[11px] font-extrabold text-white">💬 Talk to the Home</div>
              <div className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-center text-[11px] font-extrabold text-white">🏦 Ask About Financing</div>
            </div>
          </div>
          <p className="mt-2.5 text-center text-[12px] leading-relaxed text-slate-500">Every buyer question goes through your AI.<br />Every financing inquiry comes to <strong>you</strong>.</p>
        </div>

        {/* Social proof — TODO: replace with a real LO testimonial when available */}
        <div className="bg-gradient-to-br from-slate-900 to-[#1e3a5f] px-5 py-6">
          <p className="text-[15px] italic leading-relaxed text-slate-200">"I sent this to 6 agents on a Friday. By Monday I had 3 new listings on the platform and 2 pre-qual requests in my inbox. Best tool I've ever used."</p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">M</div>
            <div>
              <div className="text-[13px] font-bold text-white">Marcus T.</div>
              <div className="text-[11px] text-slate-400">Senior Loan Officer · Dallas, TX</div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-white px-5 pb-9 pt-7 text-center">
          <h3 className="text-[20px] font-black text-slate-900">Start filling your pipeline today.</h3>
          <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-relaxed text-slate-500">7-day free trial. No charge for 7 days — cancel anytime. Your first WOW Link goes out in minutes.</p>
          <button onClick={goSignup} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-[16px] font-extrabold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] active:scale-[0.99]">
            Claim My Free Trial →
          </button>
        </div>

        <p className="bg-white pb-6 text-center text-[10px] text-slate-400">Powered by HomeListingAI</p>
      </div>
    </div>
  );
};

export default ForLoanOfficersPage;
