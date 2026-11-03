import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { buildApiUrl } from '../lib/api';

// Free "Homebuyer 101" under a loan officer's own name. Six interactive steps, a readiness score, then a sign-up
// that lands in their Leads as a "class" request. General education only: no rates, no promises about approval.

interface LoProfile { slug: string; name: string; company: string | null; nmls: string | null; photo: string | null }

const CHECKS: Record<string, string[]> = {
  start: ['I know my monthly income', 'I know my monthly debts', 'I know what I have saved', 'I pulled my free credit reports'],
  credit: ['I pay every bill on time', 'My card balances are low', 'I am not opening new credit', 'I checked my reports for mistakes'],
  docs: ['Recent pay stubs', 'W-2s or tax returns', 'Bank statements', 'Photo ID'],
};
const STEP_TITLES = ['Starting point', 'Credit', 'Cash needed', 'Pre-approval', 'Monthly cost', 'Closing'];
const COST_TILES = [
  { t: 'Loan payment', d: 'Principal and interest. This part is set by your loan.' },
  { t: 'Property taxes', d: 'Usually paid monthly with your payment and sent to the county for you.' },
  { t: 'Home insurance', d: 'Required by lenders. Ask for quotes before you make an offer.' },
  { t: 'HOA and extras', d: 'Condos and some neighborhoods charge monthly dues. Always ask.' },
];
const TIMELINE = [
  { t: 'Offer accepted', d: 'You and the seller agree on a price and terms.' },
  { t: 'Inspection and appraisal', d: 'Read the results. They can change your plans.' },
  { t: 'Underwriting', d: 'The lender checks everything. Do not change jobs or make big purchases.' },
  { t: 'Closing Disclosure', d: 'You get it at least 3 business days before closing. Read it and ask questions.' },
  { t: 'Sign and get your keys', d: 'Final walk-through, sign, and the home is yours.' },
];
const QUIZ: { q: string; fact: boolean; why: string }[] = [
  { q: 'You need 20% down to buy a home.', fact: false, why: 'Myth. Many loan programs allow much less, and a few allow none for eligible buyers.' },
  { q: 'Checking your own credit report lowers your score.', fact: false, why: 'Myth. Looking at your own report is a soft check and does not hurt your score.' },
  { q: 'Closing costs are on top of your down payment.', fact: true, why: 'Fact. Plan for both. Ask for an estimate early so there are no surprises.' },
  { q: 'Pre-qualified and pre-approved mean the same thing.', fact: false, why: 'Myth. Pre-approval means a lender actually reviewed your documents. It carries more weight.' },
  { q: 'Your monthly payment is just the loan.', fact: false, why: 'Myth. Taxes, insurance and sometimes HOA dues are part of what you pay each month.' },
  { q: 'You get your Closing Disclosure at least 3 business days before closing.', fact: true, why: 'Fact. Use those days to read it and ask every question you have.' },
];
const GOALS = ['My first home', 'Moving up', 'Just exploring'];
const WHENS = ['Within 3 months', '3 to 12 months', 'Over a year'];
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const CSS = `
@keyframes h1-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes h1-glow{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.9;transform:scale(1.08)}}
@keyframes h1-sheen{0%{background-position:-200% 0}100%{background-position:200% 0}}
.h1-up{animation:h1-up .5s cubic-bezier(.2,.8,.2,1) both}
.h1-glow{animation:h1-glow 6s ease-in-out infinite}
.h1-sheen{background-image:linear-gradient(110deg,#22d3ee 20%,#a5b4fc 40%,#fff 50%,#a5b4fc 60%,#22d3ee 80%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:h1-sheen 6s linear infinite}
@media (prefers-reduced-motion:reduce){.h1-up,.h1-glow,.h1-sheen{animation:none}.h1-sheen{color:#22d3ee}}
`;

const useCount = (target: number) => {
  const [v, setV] = useState(target); const from = useRef(target);
  useEffect(() => {
    const start = performance.now(); const a = from.current; let raf = 0;
    const tick = (now: number) => { const p = Math.min(1, (now - start) / 450); const e = 1 - Math.pow(1 - p, 3); setV(a + (target - a) * e); if (p < 1) raf = requestAnimationFrame(tick); else from.current = target; };
    raf = requestAnimationFrame(tick);
    // If the tab is in the background the animation frames pause; land on the real number anyway.
    const settle = window.setTimeout(() => { setV(target); from.current = target; }, 700);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(settle); };
  }, [target]);
  return v;
};

const glass = 'rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/15 backdrop-blur-md';
const primary = 'min-h-[48px] rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-7 text-sm font-extrabold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-60';

const Toggle: React.FC<{ on: boolean; label: string; onClick: () => void }> = ({ on, label, onClick }) => (
  <button type="button" role="checkbox" aria-checked={on} onClick={onClick} className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 text-left text-base font-semibold ring-1 transition ${on ? 'bg-cyan-400/15 text-white ring-cyan-300/70' : 'bg-white/[0.04] text-slate-200 ring-white/15 hover:bg-white/10'}`}>
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${on ? 'bg-cyan-300 text-slate-900' : 'bg-white/10 text-transparent'}`}>✓</span>{label}
  </button>
);

const HomebuyerClassPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [search] = useSearchParams();
  const [lo, setLo] = useState<LoProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [step, setStep] = useState(-1); // -1 intro, 0..5 steps, 6 result
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [price, setPrice] = useState(350000);
  const [downPct, setDownPct] = useState(5);
  const [open, setOpen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, 'right' | 'wrong' | 'unsure'>>({});
  const [goal, setGoal] = useState('');
  const [when, setWhen] = useState('');
  const [nudged, setNudged] = useState<number | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(buildApiUrl(`/api/public/lo/${encodeURIComponent(slug)}/profile`))
      .then(async (r) => {
        if (!r.ok) throw new Error('missing');
        const d = await r.json() as { lo: LoProfile };
        if (live) { setLo(d.lo); setState('ready'); document.title = `Homebuyer 101 with ${d.lo.name}`; }
      })
      .catch(() => { if (live) setState('missing'); });
    return () => { live = false; };
  }, [slug]);

  const all = useMemo(() => (['start', 'credit', 'docs'] as const).flatMap((g) => CHECKS[g].map((label) => ({ key: `${g}:${label}`, label }))), []);
  const doneCount = all.filter((c) => ticks[c.key]).length;
  const rightCount = Object.values(answers).filter((a) => a === 'right').length;
  const score = Math.round(((doneCount * 5 + rightCount * 10) / (all.length * 5 + QUIZ.length * 10)) * 100);
  const missing = all.filter((c) => !ticks[c.key]);
  const learn = QUIZ.map((x, i) => ({ ...x, i, a: answers[i] })).filter((x) => x.a !== 'right');
  const flip = (g: string, label: string) => setTicks((t) => ({ ...t, [`${g}:${label}`]: !t[`${g}:${label}`] }));

  const down = price * (downPct / 100);
  const cLow = useCount(down + price * 0.02);
  const cHigh = useCount(down + price * 0.05);
  const downShown = useCount(down);
  const ring = useCount(score);

  const profileLine = () => [goal && `Goal: ${goal}.`, when && `Timing: ${when}.`].filter(Boolean).join(' ');
  const send = async (note: string, after: () => void) => {
    const c = contact.trim();
    if (!c) { setError('Enter an email or phone.'); return; }
    if (!consent) { setError('Please check the box so we know it is OK to contact you.'); return; }
    const isEmail = c.includes('@');
    setBusy(true); setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/public/lo/${encodeURIComponent(slug)}/inquiry`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ door: 'class', full_name: name || undefined, utm_source: search.get('utm_source') || 'learn101', email: isEmail ? c : undefined, phone: isEmail ? undefined : c, message: note.slice(0, 500), consent: true }),
      });
      if (!res.ok) throw new Error('failed');
      after();
    } catch { setError('Something went wrong. Please try again in a minute.'); } finally { setBusy(false); }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const unsure = learn.slice(0, 4).map((l) => l.q.replace(/\.$/, '')).join(' | ');
    void send(`Finished Homebuyer 101. Readiness ${score}%. ${profileLine()} ${missing.length ? `Still to do: ${missing.slice(0, 4).map((m) => m.label).join('; ')}. ` : ''}${unsure ? `Missed or unsure about: ${unsure}. ` : ''}Thinking about a ${money(price)} home.`.replace(/\s+/g, ' ').trim(), () => setDone(true));
  };
  const submitAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) { setError('Type your question first.'); return; }
    void send(`Question during Homebuyer 101 (step ${step + 1}, ${STEP_TITLES[step]}): ${question.trim()} ${profileLine()}`.trim(), () => { setAsked(true); setAskOpen(false); setQuestion(''); });
  };
  const answer = (i: number, saysFact: boolean | null) => {
    if (answers[i]) return;
    setAnswers((a) => ({ ...a, [i]: saysFact === null ? 'unsure' : saysFact === QUIZ[i].fact ? 'right' : 'wrong' }));
  };

  if (state === 'loading') return <div className="flex min-h-screen items-center justify-center bg-[#070b1a] text-slate-300">Loading…</div>;
  if (state === 'missing' || !lo) return <div className="flex min-h-screen items-center justify-center bg-[#070b1a] px-6 text-center text-slate-300">This page is not active.</div>;

  const first = lo.name.split(' ')[0];
  const inSteps = step >= 0 && step <= 5;
  const touched = (st: number) => st < 0 || answers[st] !== undefined || (st <= 1 && CHECKS[st === 0 ? 'start' : 'credit'].some((l) => ticks[`${st === 0 ? 'start' : 'credit'}:${l}`])) || (st === 3 && CHECKS.docs.some((l) => ticks[`docs:${l}`]));
  const next = () => {
    if (step >= 0 && step <= 5 && !touched(step) && nudged !== step) { setNudged(step); return; }
    setOpen(null); setAskOpen(false); setNudged(null); setStep((s) => s + 1); window.scrollTo({ top: 0 });
  };
  const back = () => { setOpen(null); setAskOpen(false); setNudged(null); setStep((s) => Math.max(-1, s - 1)); };
  const tier = score >= 75 ? 'You are in great shape.' : score >= 40 ? 'You have a solid start.' : 'Everyone starts here.';

  const quiz = (i: number) => {
    const a = answers[i]; const item = QUIZ[i];
    return (
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 p-4 ring-1 ring-cyan-300/30">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Myth or fact?</p>
        <p className="mt-2 text-lg font-bold leading-snug text-white">{item.q}</p>
        {!a ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => answer(i, false)} className="min-h-[48px] rounded-xl bg-white/10 text-sm font-extrabold text-white ring-1 ring-white/25 hover:bg-white/20">Myth</button>
            <button type="button" onClick={() => answer(i, true)} className="min-h-[48px] rounded-xl bg-white/10 text-sm font-extrabold text-white ring-1 ring-white/25 hover:bg-white/20">Fact</button>
            <button type="button" onClick={() => answer(i, null)} className="min-h-[48px] rounded-xl bg-transparent text-sm font-bold text-slate-300 ring-1 ring-white/15 hover:bg-white/10">Not sure</button>
          </div>
        ) : (
          <div className="h1-up mt-3" role="status">
            <p className={`text-sm font-black ${a === 'right' ? 'text-emerald-300' : a === 'wrong' ? 'text-amber-300' : 'text-cyan-200'}`}>{a === 'right' ? '✓ Nice. +10 points' : a === 'wrong' ? 'Good to know. Most people miss this one.' : 'No problem. Here is the answer.'}</p>
            <p className="mt-1 text-sm text-slate-100">{item.why}</p>
          </div>
        )}
      </div>
    );
  };
  const askBox = step >= 0 && step <= 5 && (
    <div className="space-y-2">
      {nudged === step && <p className="h1-up rounded-xl bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-100 ring-1 ring-amber-300/40" role="status">Tap an answer above. It helps {first} help you. Or tap Next again to skip.</p>}
      {!askOpen ? (
        <button type="button" onClick={() => setAskOpen(true)} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl bg-white/[0.06] px-4 text-left ring-1 ring-white/15 hover:bg-white/10">
          {lo.photo ? <img src={lo.photo} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold">{lo.name.charAt(0)}</span>}
          <span className="text-sm font-bold text-white">{asked ? `Ask ${first} another question` : `Got a question? Ask ${first}`}<span className="block text-xs font-medium text-slate-300">A real person answers. No pressure.</span></span>
        </button>
      ) : (
        <form onSubmit={submitAsk} className={`${glass} h1-up space-y-3 p-4`}>
          <textarea aria-label="Your question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} maxLength={400} placeholder={`Ask ${first} anything about this step…`} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder-slate-400" />
          {!(contact && consent && asked) && (<>
            <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder-slate-400" />
            <input aria-label="Email or phone" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone, so they can answer you" className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder-slate-400" />
            <label className="flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />I agree that {lo.name} may contact me about my request. I can ask to stop at any time.</label>
          </>)}
          {error && <p className="text-sm font-semibold text-rose-300" role="alert">{error}</p>}
          <div className="flex gap-2"><button type="submit" disabled={busy} className={`${primary} flex-1`}>{busy ? 'Sending…' : `Send to ${first}`}</button><button type="button" onClick={() => setAskOpen(false)} className="px-3 text-sm font-semibold text-slate-300">Cancel</button></div>
        </form>
      )}
      {asked && !askOpen && <p className="text-center text-xs font-semibold text-emerald-300" role="status">Sent. {first} will get back to you.</p>}
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b1a] px-4 py-8 text-slate-100">
      <style>{CSS}</style>
      <div className="h1-glow pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-cyan-500/25 blur-3xl" aria-hidden />
      <div className="h1-glow pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/30 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-md space-y-5">
        <div className="flex items-center gap-3">
          {lo.photo ? <img src={lo.photo} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-cyan-300/60" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 font-bold ring-2 ring-cyan-300/60">{lo.name.charAt(0)}</div>}
          <div><p className="text-sm font-bold text-white">{lo.name}</p><p className="text-xs text-slate-300">{[lo.company, lo.nmls ? `NMLS #${lo.nmls}` : null].filter(Boolean).join(' · ')}</p></div>
        </div>

        {inSteps && (
          <div aria-label="Lesson progress" role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={step + 1}>
            <div className="relative h-1.5 rounded-full bg-white/15"><div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300 transition-all duration-500" style={{ width: `${((step + 1) / 6) * 100}%` }} /><span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_18px_6px_rgba(34,211,238,0.7)] transition-all duration-500" style={{ left: `${((step + 1) / 6) * 100}%` }} /></div>
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-cyan-200">Step {step + 1} of 6 · {STEP_TITLES[step]}</p>
          </div>
        )}

        <div key={step} className="h1-up space-y-5">
          {step === -1 && (
            <div className="space-y-6 pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">Free · 3 minutes</p>
              <h1 className="text-5xl font-black leading-[1.02] tracking-tight text-white">Homebuyer <span className="h1-sheen">101</span></h1>
              <p className="text-lg leading-relaxed text-slate-200">Six quick steps from credit to keys. Tap along, get your readiness score, and see exactly what to do next.</p>
              <div className="space-y-3">
                <p className="text-sm font-bold text-white">What brings you here?</p>
                <div className="flex flex-wrap gap-2">{GOALS.map((g) => <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(goal === g ? '' : g)} className={`min-h-[44px] rounded-full px-4 text-sm font-bold ring-1 ${goal === g ? 'bg-cyan-300 text-slate-900 ring-cyan-300' : 'bg-white/[0.06] text-slate-100 ring-white/20'}`}>{g}</button>)}</div>
                <p className="pt-1 text-sm font-bold text-white">When are you thinking?</p>
                <div className="flex flex-wrap gap-2">{WHENS.map((g) => <button key={g} type="button" aria-pressed={when === g} onClick={() => setWhen(when === g ? '' : g)} className={`min-h-[44px] rounded-full px-4 text-sm font-bold ring-1 ${when === g ? 'bg-cyan-300 text-slate-900 ring-cyan-300' : 'bg-white/[0.06] text-slate-100 ring-white/20'}`}>{g}</button>)}</div>
              </div>
              <button type="button" onClick={next} className={`${primary} w-full text-base`}>Start the lesson</button>
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-300">{['Interactive', 'Plain words', 'No pressure'].map((t) => <span key={t} className="rounded-xl bg-white/[0.06] py-2 ring-1 ring-white/10">{t}</span>)}</div>
            </div>
          )}

          {step === 0 && (<div className={glass}><h1 className="text-2xl font-black text-white">Know your starting point</h1><p className="mb-4 mt-1 text-sm text-slate-300">Tap everything you already have done.</p><div className="space-y-2">{CHECKS.start.map((l) => <Toggle key={l} on={!!ticks[`start:${l}`]} label={l} onClick={() => flip('start', l)} />)}</div><p className="mt-4 text-sm text-slate-300">Free credit reports: annualcreditreport.com. Pick a monthly payment you would be comfortable with, not the biggest one a lender might allow.</p></div>)}

          {step === 1 && (<div className={glass}><h1 className="text-2xl font-black text-white">Get your credit ready</h1><p className="mb-4 mt-1 text-sm text-slate-300">Tap what is already true for you.</p><div className="space-y-2">{CHECKS.credit.map((l) => <Toggle key={l} on={!!ticks[`credit:${l}`]} label={l} onClick={() => flip('credit', l)} />)}</div><p className="mt-4 text-sm text-slate-300">On-time payments matter most. Avoid new credit or big purchases on credit before you apply.</p></div>)}

          {step === 2 && (
            <div className={glass}>
              <h1 className="text-2xl font-black text-white">Plan the cash you need</h1>
              <p className="mt-1 text-sm text-slate-300">Slide the home price. See a rough example of cash to plan for.</p>
              <p className="mt-5 text-4xl font-black text-white">{money(price)}</p>
              <input type="range" aria-label="Home price" min={100000} max={1000000} step={10000} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-2 w-full accent-cyan-300" />
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-cyan-200">Down payment</p>
              <div className="mt-2 flex flex-wrap gap-2">{[0, 3, 5, 10, 20].map((p) => <button key={p} type="button" aria-pressed={downPct === p} onClick={() => setDownPct(p)} className={`min-h-[44px] rounded-full px-4 text-sm font-bold ring-1 ${downPct === p ? 'bg-cyan-300 text-slate-900 ring-cyan-300' : 'bg-white/[0.06] text-slate-100 ring-white/20'}`}>{p}%</button>)}</div>
              <div className="mt-5 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="flex justify-between text-sm text-slate-300"><span>Down payment</span><span className="font-bold text-white">{money(downShown)}</span></div>
                <div className="mt-2 flex justify-between text-sm text-slate-300"><span>Closing costs (about 2% to 5%)</span><span className="font-bold text-white">{money(price * 0.02)} to {money(price * 0.05)}</span></div>
                <div className="mt-3 border-t border-white/10 pt-3"><p className="text-xs text-slate-300">Cash to plan for</p><p className="text-2xl font-black text-cyan-200">{money(cLow)} to {money(cHigh)}</p></div>
              </div>
              <p className="mt-3 text-xs text-slate-300">Example only. Some programs allow a low down payment, and a few allow none for eligible buyers. Costs vary.</p>
            </div>
          )}

          {step === 3 && (<div className={glass}><h1 className="text-2xl font-black text-white">Get pre-approved</h1><p className="mb-4 mt-1 text-sm text-slate-300">A pre-approval means a lender looked at your documents. Tap what you have ready.</p><div className="space-y-2">{CHECKS.docs.map((l) => <Toggle key={l} on={!!ticks[`docs:${l}`]} label={l} onClick={() => flip('docs', l)} />)}</div><p className="mt-4 text-sm text-slate-300">It is not a promise to lend. Final approval depends on the home and your documents.</p></div>)}

          {step === 4 && (
            <div className={glass}>
              <h1 className="text-2xl font-black text-white">Look at the whole monthly cost</h1>
              <p className="mb-4 mt-1 text-sm text-slate-300">Tap each piece. The payment is more than the loan.</p>
              <div className="space-y-2">{COST_TILES.map((c, i) => (
                <button key={c.t} type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="w-full rounded-2xl bg-white/[0.06] px-4 py-3 text-left ring-1 ring-white/15 transition hover:bg-white/10">
                  <span className="flex items-center justify-between text-base font-bold text-white">{c.t}<span className="text-cyan-200">{open === i ? '−' : '+'}</span></span>
                  {open === i && <span className="mt-1 block text-sm text-slate-200">{c.d}</span>}
                </button>))}</div>
              <p className="mt-4 text-sm text-slate-300">Work with a real estate agent to see homes and write an offer.</p>
            </div>
          )}

          {step === 5 && (
            <div className={glass}>
              <h1 className="text-2xl font-black text-white">Close and get your keys</h1>
              <ol className="mt-4 space-y-4">{TIMELINE.map((t, i) => (
                <li key={t.t} className="h1-up flex gap-3" style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-indigo-300 text-xs font-black text-slate-900">{i + 1}</span>
                  <span><span className="block font-bold text-white">{t.t}</span><span className="block text-sm text-slate-300">{t.d}</span></span>
                </li>))}</ol>
            </div>
          )}

          {step >= 0 && step <= 5 && quiz(step)}
          {askBox}

          {step === 6 && (
            <div className="space-y-5">
              <div className={`${glass} text-center`}>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">Your readiness</p>
                <div className="relative mx-auto my-4 h-44 w-44">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" /><circle cx="60" cy="60" r="52" fill="none" stroke="url(#g)" strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - ring / 100)} /><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee" /><stop offset="1" stopColor="#a5b4fc" /></linearGradient></defs></svg>
                  <p className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white">{Math.round(ring)}%</p>
                </div>
                <h1 className="text-2xl font-black text-white">{tier}</h1>
                {learn.length > 0 && <div className="mt-4 text-left"><p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Worth a second look</p><ul className="mt-2 space-y-2">{learn.slice(0, 3).map((l) => <li key={l.i}><button type="button" onClick={() => { setStep(l.i); window.scrollTo({ top: 0 }); }} className="min-h-[44px] w-full rounded-xl bg-white/[0.06] px-3 text-left text-sm font-semibold text-slate-100 ring-1 ring-white/15 hover:bg-white/10">{l.a ? '↻' : '○'} {l.q}</button></li>)}</ul></div>}
                {missing.length > 0 ? <div className="mt-3 text-left"><p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Your next moves</p><ul className="mt-2 space-y-1 text-sm text-slate-100">{missing.slice(0, 4).map((m) => <li key={m.key}>○ {m.label}</li>)}</ul></div> : <p className="mt-2 text-sm text-slate-200">You checked every box. You are ready to talk numbers.</p>}
              </div>
              {done ? (
                <div className={`${glass} text-center`} role="status"><p className="text-xl font-black text-white">Thank you.</p><p className="mt-2 text-sm text-slate-200">{first} will reach out to you soon.</p></div>
              ) : (
                <form onSubmit={submit} className={`${glass} space-y-3`}>
                  <h2 className="text-xl font-black text-white">Want {first} to map your next step?</h2>
                  <p className="text-sm text-slate-300">Free, no pressure. {first} sees your score so you do not repeat yourself.</p>
                  <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder-slate-400" />
                  <input aria-label="Email or phone" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder-slate-400" required />
                  <label className="flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />I agree that {lo.name} may contact me about my request. I can ask to stop at any time.</label>
                  {error && <p className="text-sm font-semibold text-rose-300" role="alert">{error}</p>}
                  <button type="submit" disabled={busy} className={`${primary} w-full`}>{busy ? 'Sending…' : 'Yes, contact me'}</button>
                </form>
              )}
            </div>
          )}
        </div>

        {step >= 0 && step <= 5 && (
          <div className="flex items-center justify-between">
            <button type="button" onClick={back} className="min-h-[48px] px-2 text-sm font-semibold text-slate-300">← Back</button>
            <button type="button" onClick={next} className={primary}>{step === 5 ? 'See my score' : 'Next'}</button>
          </div>
        )}
        {step === 6 && !done && <button type="button" onClick={() => setStep(0)} className="w-full text-center text-xs font-semibold text-slate-300 underline">Go back through it</button>}

        <p className="pb-4 text-center text-xs text-slate-400">General education only. Not a commitment to lend, an offer of credit or financial advice. Programs, costs and rules vary by loan and location.{lo.nmls ? ` NMLS #${lo.nmls}.` : ''}</p>
      </div>
    </div>
  );
};

export default HomebuyerClassPage;
