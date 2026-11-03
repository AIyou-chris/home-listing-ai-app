import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { buildApiUrl } from '../lib/api';

// Free "Homebuyer 101" lesson under a loan officer's own name. Six short steps, then a sign-up that lands
// in their Leads as a "class" request. General education only: no rates, no promises about approval.

interface LoProfile { slug: string; name: string; company: string | null; nmls: string | null; photo: string | null }

const STEPS: { icon: string; title: string; points: string[] }[] = [
  { icon: 'flag', title: 'Know your starting point', points: ['Write down your monthly income, your monthly debts and what you have saved.', 'Pull your free credit reports at annualcreditreport.com and read them for mistakes.', 'Decide a monthly payment you would be comfortable with, not the biggest one a lender might allow.'] },
  { icon: 'credit_score', title: 'Get your credit ready', points: ['Pay every bill on time. It is the biggest piece of your score.', 'Keep credit card balances low compared to your limits.', 'Avoid opening new credit or making big purchases on credit before you apply.'] },
  { icon: 'savings', title: 'Plan the money you need', points: ['Down payment: the amount depends on the loan program. Some programs allow a low down payment, and a few allow none for eligible buyers.', 'Closing costs: plan for fees on top of the down payment. Ask for an estimate early.', 'Keep some savings left over after closing for repairs and surprises.'] },
  { icon: 'verified', title: 'Get pre-approved', points: ['A pre-approval means a lender has looked at your documents. It is more solid than a quick pre-qualification.', 'Typical documents: recent pay stubs, W-2s or tax returns, bank statements and a photo ID.', 'It is not a promise to lend. Final approval depends on the home and your documents.'] },
  { icon: 'home', title: 'Find the home and make an offer', points: ['Look at the whole monthly cost: loan payment, property taxes, insurance and any HOA dues.', 'Work with a real estate agent to see homes and write an offer.', 'Plan for a home inspection and an appraisal. Both can change your plans, so read the results.'] },
  { icon: 'key', title: 'Close and get your keys', points: ['Between offer and closing, the lender checks everything. Do not change jobs or make big purchases.', 'You get your Closing Disclosure at least three business days before closing. Read it and ask questions.', 'Do a final walk-through, sign, and pick up your keys.'] },
];

const HomebuyerClassPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [search] = useSearchParams();
  const [lo, setLo] = useState<LoProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [step, setStep] = useState(0);
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = contact.trim();
    if (!c) { setError('Enter an email or phone.'); return; }
    if (!consent) { setError('Please check the box so we know it is OK to contact you.'); return; }
    const isEmail = c.includes('@');
    setBusy(true); setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/public/lo/${encodeURIComponent(slug)}/inquiry`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ door: 'class', full_name: name || undefined, utm_source: search.get('utm_source') || 'learn101', email: isEmail ? c : undefined, phone: isEmail ? undefined : c, message: 'Finished the Homebuyer 101 lesson and wants the next step.', consent: true }),
      });
      if (!res.ok) throw new Error('failed');
      setDone(true);
    } catch { setError('Something went wrong. Please try again in a minute.'); } finally { setBusy(false); }
  };

  if (state === 'loading') return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;
  if (state === 'missing' || !lo) return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-600">This page is not active.</div>;

  const last = step >= STEPS.length;
  const s = STEPS[Math.min(step, STEPS.length - 1)];
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-5">
        <div className="flex items-center gap-3">
          {lo.photo ? <img src={lo.photo} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">{lo.name.charAt(0)}</div>}
          <div><p className="text-sm font-bold text-slate-900">Homebuyer 101 with {lo.name}</p><p className="text-xs text-slate-600">{[lo.company, lo.nmls ? `NMLS #${lo.nmls}` : null].filter(Boolean).join(' · ')}</p></div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={Math.min(step, STEPS.length)} aria-label="Lesson progress">
          <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${(Math.min(step, STEPS.length) / STEPS.length) * 100}%` }} />
        </div>

        {!last ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Step {step + 1} of {STEPS.length}</p>
            <div className="mt-2 flex items-center gap-3"><span className="material-symbols-outlined text-3xl text-primary-600">{s.icon}</span><h1 className="text-xl font-extrabold text-slate-900">{s.title}</h1></div>
            <ul className="mt-4 space-y-3">
              {s.points.map((p) => <li key={p} className="flex gap-2 text-base leading-snug text-slate-800"><span className="mt-0.5 text-primary-600">✓</span><span>{p}</span></li>)}
            </ul>
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="min-h-[44px] px-2 text-sm font-semibold text-slate-600 disabled:opacity-40">← Back</button>
              <button type="button" onClick={() => setStep(step + 1)} className="min-h-[44px] rounded-xl bg-primary-600 px-6 text-sm font-bold text-white hover:bg-primary-700">{step === STEPS.length - 1 ? 'Finish' : 'Next'}</button>
            </div>
          </div>
        ) : done ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200" role="status">
            <p className="text-xl font-bold text-slate-900">Thank you.</p>
            <p className="mt-2 text-sm text-slate-600">{lo.name.split(' ')[0]} will reach out to you soon.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-xl font-extrabold text-slate-900">You finished. Nice work.</h1>
            <p className="text-sm text-slate-600">Want {lo.name.split(' ')[0]} to look at your situation and tell you your next step? It is free and there is no pressure.</p>
            <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <input aria-label="Email or phone" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" required />
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              I agree that {lo.name} may contact me about my request. I can ask to stop at any time.
            </label>
            {error && <p className="text-sm font-semibold text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary-600 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Yes, contact me'}</button>
            <button type="button" onClick={() => setStep(0)} className="w-full text-center text-xs font-semibold text-slate-600 underline">Read it again</button>
          </form>
        )}
        <p className="text-center text-xs text-slate-500">General education only. This is not a commitment to lend, an offer of credit or financial advice. Programs, costs and rules vary by loan and location.{lo.nmls ? ` NMLS #${lo.nmls}.` : ''}</p>
      </div>
    </div>
  );
};

export default HomebuyerClassPage;
