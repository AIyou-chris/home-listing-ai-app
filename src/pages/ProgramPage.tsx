import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { buildApiUrl } from '../lib/api';

// One loan program from one loan officer: their words, their program sheet, and a "talk to me" form.

interface LoProfile { slug: string; name: string; company: string | null; nmls: string | null; photo: string | null }
interface Program { id: string; name: string; summary: string; points: string[]; doc: { url: string | null; name: string } | null }

const ProgramPage: React.FC = () => {
  const { slug = '', id = '' } = useParams();
  const [search] = useSearchParams();
  const [data, setData] = useState<{ lo: LoProfile; program: Program } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(buildApiUrl(`/api/public/lo/${encodeURIComponent(slug)}/program/${encodeURIComponent(id)}`))
      .then(async (r) => {
        if (!r.ok) throw new Error('missing');
        const d = await r.json() as { lo: LoProfile; program: Program };
        if (live) { setData(d); setState('ready'); document.title = `${d.program.name} | ${d.lo.name}`; }
      })
      .catch(() => { if (live) setState('missing'); });
    return () => { live = false; };
  }, [slug, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = contact.trim();
    if (!c) { setError('Enter an email or phone.'); return; }
    if (!consent) { setError('Please check the box so we know it is OK to contact you.'); return; }
    const isEmail = c.includes('@');
    setBusy(true); setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/public/lo/${encodeURIComponent(slug)}/inquiry`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ door: 'program', program_id: id, full_name: name || undefined, utm_source: search.get('utm_source') || undefined, email: isEmail ? c : undefined, phone: isEmail ? undefined : c, message: message || undefined, consent: true }),
      });
      if (!res.ok) throw new Error('failed');
      setDone(true);
    } catch { setError('Something went wrong. Please try again in a minute.'); } finally { setBusy(false); }
  };

  if (state === 'loading') return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading…</div>;
  if (state === 'missing' || !data) return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-600">This page is not active.</div>;
  const { lo, program } = data;
  const first = lo.name.split(' ')[0];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-5">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          {lo.photo ? <img src={lo.photo} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-600">{lo.name.charAt(0)}</div>}
          <div><p className="text-lg font-bold text-slate-900">{lo.name}</p><p className="text-sm text-slate-600">{[lo.company, lo.nmls ? `NMLS #${lo.nmls}` : null].filter(Boolean).join(' · ')}</p></div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-700">Loan program</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{program.name}</h1>
          {program.summary && <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-slate-700">{program.summary}</p>}
          {program.points.length > 0 && <ul className="mt-4 space-y-2">{program.points.map((p) => <li key={p} className="flex gap-2 text-base text-slate-800"><span className="text-primary-600">✓</span><span>{p}</span></li>)}</ul>}
          {program.doc?.url && <a href={program.doc.url} target="_blank" rel="noreferrer" className="mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-primary-600 px-4 text-sm font-bold text-primary-700 hover:bg-primary-50"><span className="material-symbols-outlined text-lg">download</span>{`Open the program sheet`}</a>}
        </div>

        {done ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200" role="status">
            <p className="text-xl font-bold text-slate-900">Thank you.</p>
            <p className="mt-2 text-sm text-slate-600">{first} will reach out to you soon.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Does this fit you? Ask {first}.</h2>
            <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <input aria-label="Email or phone" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" required />
            <textarea aria-label="Your question" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Anything you want to know?" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />I agree that {lo.name} may contact me about my request. I can ask to stop at any time.</label>
            {error && <p className="text-sm font-semibold text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? 'Sending…' : 'Send'}</button>
          </form>
        )}
        <p className="text-center text-xs text-slate-500">This is not a commitment to lend or an offer of credit. Eligibility, rates and terms depend on your situation and the program rules.{lo.nmls ? ` NMLS #${lo.nmls}.` : ''} Equal Housing Lender.</p>
      </div>
    </div>
  );
};

export default ProgramPage;
