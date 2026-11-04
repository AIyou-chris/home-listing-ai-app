import React, { useEffect, useState } from 'react';
import { showToast } from '../../utils/toastService';

// Market one loan program: upload the sheet, write a few lines, get a page, posts and a video for it.

interface Program { id: string; name: string; summary: string; points: string[]; doc: { url: string | null; name: string } | null }
type Api = (path: string, init?: RequestInit) => Promise<Response>;

const DEMO_PROGRAMS: Program[] = [
  { id: 'demo1', name: 'First-time buyer program', summary: 'A program built for people buying their first home. Ask me if you could qualify.', points: ['Made for first-time buyers', 'I walk you through every step'], doc: { url: null, name: 'program-sheet.pdf' } },
];
const ghost = 'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50';
const solid = 'inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-primary-700 disabled:opacity-60';
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';

const readFile = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error('read_failed')); r.readAsDataURL(file);
});

const LOProgramsCard: React.FC<{
  demo: boolean; api: Api; slug: string; origin: string;
  onDrafts: (drafts: string[]) => void;
  onMakeVideo: (scenes: string[]) => void;
  copyText: (t: string) => void;
}> = ({ demo, api, slug, origin, onDrafts, onMakeVideo, copyText }) => {
  const [programs, setPrograms] = useState<Program[]>(demo ? DEMO_PROGRAMS : []);
  const [loaded, setLoaded] = useState(demo);
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [points, setPoints] = useState<string[]>(['', '']);
  const [file, setFile] = useState<File | null>(null);
  const [removeDoc, setRemoveDoc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [writingId, setWritingId] = useState('');

  useEffect(() => {
    if (demo) return;
    let live = true;
    api('/api/lo/programs').then((r) => r.ok ? r.json() : null).then((d: { programs: Program[] } | null) => { if (live && d) setPrograms(d.programs); }).catch(() => undefined).finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [demo, api]);

  const urlFor = (p: Program) => `${origin}/program/${slug}/${p.id}`;
  const open = (p: Program | null) => {
    setEditing(p ? p.id : 'new'); setName(p?.name || ''); setSummary(p?.summary || ''); setPoints([...(p?.points || []), '', '', '', ''].slice(0, 4)); setFile(null); setRemoveDoc(false);
  };

  const save = async () => {
    if (!name.trim()) { showToast.error('Give the program a name.'); return; }
    if (file && file.size > 3 * 1024 * 1024) { showToast.error('That file is over 3 MB. Try a smaller one.'); return; }
    if (demo) { showToast.success('Saved (demo).'); setEditing(null); return; }
    setBusy(true);
    try {
      const doc = file ? { name: file.name, dataUrl: await readFile(file) } : undefined;
      const res = await api('/api/lo/programs', { method: 'POST', body: JSON.stringify({ id: editing && editing !== 'new' ? editing : undefined, name, summary, points: points.filter((x) => x.trim()), doc, removeDoc }) });
      const d = await res.json().catch(() => ({})) as { programs?: Program[]; error?: string };
      if (res.status === 409) { showToast.error('You have 12 programs. Delete one first.'); return; }
      if (res.status === 400 && d.error === 'pdf_or_picture_only') { showToast.error('Use a PDF or a picture (JPG, PNG).'); return; }
      if (!res.ok || !d.programs) throw new Error('failed');
      setPrograms(d.programs); setEditing(null); showToast.success('Program saved.');
    } catch { showToast.error('Could not save it. Try again.'); } finally { setBusy(false); }
  };

  const remove = async (p: Program) => {
    if (!window.confirm(`Delete "${p.name}"? Its page stops working.`)) return;
    if (demo) { setPrograms((x) => x.filter((y) => y.id !== p.id)); return; }
    const res = await api(`/api/lo/programs/${p.id}`, { method: 'DELETE' });
    if (res.ok) setPrograms((x) => x.filter((y) => y.id !== p.id)); else showToast.error('Could not delete it.');
  };

  const write = async (p: Program) => {
    if (demo) { onDrafts([`Wondering if the ${p.name} could fit you? Take a look and ask me anything.\n\n${urlFor(p)}`]); return; }
    setWritingId(p.id);
    try {
      const res = await api(`/api/lo/programs/${p.id}/drafts`, { method: 'POST', body: JSON.stringify({}) });
      const d = await res.json().catch(() => ({})) as { drafts?: string[] };
      if (res.status === 429) { showToast.error('That is 5 sets of drafts today. Try again tomorrow.'); return; }
      if (!res.ok || !d.drafts?.length) throw new Error('failed');
      onDrafts(d.drafts); showToast.success('Drafts are in the post writer.');
    } catch { showToast.error('Could not write drafts just now.'); } finally { setWritingId(''); }
  };

  const video = (p: Program) => {
    const firstSentence = (p.summary.split(/(?<=[.!?])\s/)[0] || '').slice(0, 110);
    onMakeVideo([p.name.slice(0, 90), firstSentence || 'Ask me if this program could fit you.', 'See the details. Link in my profile.']);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="My programs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-lg font-extrabold text-slate-900">Promote a program</h2><p className="mt-1 text-sm text-slate-600">Upload a program sheet, write a few lines, and market it. Each program gets its own page, posts and video.</p></div>
        {editing === null && <button type="button" className={solid} onClick={() => open(null)}>+ Add a program</button>}
      </div>

      {editing !== null && (
        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <label className="block text-xs font-semibold text-slate-700">Program name<input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Example: First-time buyer program" className={`${field} mt-1`} /></label>
          <label className="block text-xs font-semibold text-slate-700">What should buyers know? (your words)<textarea value={summary} rows={4} maxLength={600} onChange={(e) => setSummary(e.target.value)} className={`${field} mt-1`} /></label>
          <div className="space-y-2"><p className="text-xs font-semibold text-slate-700">Key points (up to 4)</p>
            {points.map((pt, i) => <input key={i} aria-label={`Key point ${i + 1}`} value={pt} maxLength={140} onChange={(e) => setPoints(points.map((x, j) => j === i ? e.target.value : x))} className={field} />)}
          </div>
          <div><p className="text-xs font-semibold text-slate-700">Program sheet (PDF or picture, up to 3 MB)</p>
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" aria-label="Program sheet" onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveDoc(false); }} className="mt-1 block w-full text-sm text-slate-700" />
            {editing !== 'new' && programs.find((p) => p.id === editing)?.doc && !file && <label className="mt-1 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={removeDoc} onChange={(e) => setRemoveDoc(e.target.checked)} />Remove the current sheet</label>}
          </div>
          <p className="text-xs text-slate-600">Tip: posts we write leave out rates, payments and down-payment percentages. If you add them yourself, check your compliance rules first.</p>
          <div className="flex gap-2"><button type="button" className={solid} disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save program'}</button><button type="button" className={ghost} onClick={() => setEditing(null)}>Cancel</button></div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loaded && programs.length === 0 && editing === null && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600">No programs yet. Add your first one.</p>}
        {programs.map((p) => (
          <div key={p.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="break-words font-bold text-slate-900">{p.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <a className={`${ghost} flex min-h-[44px] items-center justify-center`} href={urlFor(p)} target="_blank" rel="noreferrer">Preview page</a>
              <button type="button" className={`${solid} min-h-[44px]`} onClick={() => copyText(`${urlFor(p)}?utm_source=social`)}>Copy link</button>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer py-2 text-sm font-semibold text-primary-700">Program tools</summary>
              {p.doc && <p className="break-words text-xs text-slate-600">{p.doc.name}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={ghost} disabled={writingId === p.id} onClick={() => void write(p)}>{writingId === p.id ? 'Writing…' : 'Write posts'}</button>
                <button type="button" className={ghost} onClick={() => video(p)}>Make a video</button>
                <a className={ghost} href={`sms:?&body=${encodeURIComponent(`${p.name}: ${urlFor(p)}?utm_source=text`)}`}>Text it</a>
                <button type="button" className={ghost} onClick={() => open(p)}>Edit</button>
                <button type="button" className={ghost} onClick={() => void remove(p)}>Delete</button>
              </div>
            </details>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LOProgramsCard;
