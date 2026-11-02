import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { buildApiUrl } from '../lib/api';

type Door = 'buy' | 'review' | 'class';

interface LoProfile { slug: string; name: string; company: string | null; nmls: string | null; photo: string | null; phone: string | null }

const DOORS: { key: Door; icon: string; title: string; hint: string; ask: string }[] = [
  { key: 'buy', icon: 'home', title: 'Buy a home', hint: 'See what you can afford and what to do first.', ask: 'What are you hoping to buy, and when?' },
  { key: 'review', icon: 'fact_check', title: 'Review my mortgage', hint: 'A free check on whether your loan still fits your plans.', ask: 'What do you pay now, and is your rate changing soon?' },
  { key: 'class', icon: 'school', title: 'Join a homebuyer class', hint: 'Learn the steps and the programs that can help.', ask: 'Anything you want covered in the class?' },
];

const BorrowerLinkPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [search] = useSearchParams();
  const [lo, setLo] = useState<LoProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const preset = search.get('door');
  const [door, setDoor] = useState<Door | null>(preset === 'buy' || preset === 'review' || preset === 'class' ? preset : null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
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
        if (live) { setLo(d.lo); setState('ready'); document.title = `${d.lo.name} | Mortgage help`; }
      })
      .catch(() => { if (live) setState('missing'); });
    return () => { live = false; };
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!door) return;
    const c = contact.trim();
    if (!c) { setError('Enter an email or phone.'); return; }
    if (!consent) { setError('Please check the box so we know it is OK to contact you.'); return; }
    const isEmail = c.includes('@');
    setBusy(true); setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/public/lo/${encodeURIComponent(slug)}/inquiry`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ door, full_name: name || undefined, email: isEmail ? c : undefined, phone: isEmail ? undefined : c, message: message || undefined, consent: true }),
      });
      if (!res.ok) throw new Error('failed');
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again in a minute.');
    } finally { setBusy(false); }
  };

  if (state === 'loading') return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;
  if (state === 'missing' || !lo) return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-600">This link is not active.</div>;

  const picked = DOORS.find((d) => d.key === door);
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-5">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          {lo.photo ? <img src={lo.photo} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-600">{lo.name.charAt(0)}</div>}
          <div>
            <h1 className="text-lg font-bold text-slate-900">{lo.name}</h1>
            <p className="text-sm text-slate-600">{[lo.company, lo.nmls ? `NMLS #${lo.nmls}` : null].filter(Boolean).join(' · ')}</p>
          </div>
        </div>

        {done ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200" role="status">
            <p className="text-xl font-bold text-slate-900">Thank you.</p>
            <p className="mt-2 text-sm text-slate-600">{lo.name.split(' ')[0]} will reach out to you soon.</p>
          </div>
        ) : !picked ? (
          <div className="space-y-3">
            <p className="text-center text-base font-semibold text-slate-800">How can I help?</p>
            {DOORS.map((d) => (
              <button key={d.key} type="button" onClick={() => setDoor(d.key)} className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 hover:ring-slate-400">
                <span className="material-symbols-outlined text-3xl text-slate-700">{d.icon}</span>
                <span><span className="block font-bold text-slate-900">{d.title}</span><span className="block text-sm text-slate-600">{d.hint}</span></span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <button type="button" onClick={() => setDoor(null)} className="text-sm font-semibold text-slate-500">← Back</button>
            <h2 className="text-lg font-bold text-slate-900">{picked.title}</h2>
            <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <input aria-label="Email or phone" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" required />
            <textarea aria-label="Your question" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={picked.ask} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              I agree that {lo.name} may contact me about my request. I can ask to stop at any time.
            </label>
            {error && <p className="text-sm font-semibold text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send'}</button>
          </form>
        )}
        <p className="text-center text-xs text-slate-500">This is not a commitment to lend or an offer of credit. Rates and programs depend on your situation.{lo.nmls ? ` NMLS #${lo.nmls}.` : ''}</p>
      </div>
    </div>
  );
};

export default BorrowerLinkPage;
