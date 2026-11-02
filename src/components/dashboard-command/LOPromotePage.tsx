import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { showToast } from '../../utils/toastService';

interface MyLink { slug: string; url: string; name: string; company: string | null; nmls: string | null }
interface Picture { name: string; url: string | null }
interface Stats {
  days: number; total: number; contacted: number;
  by_door: { key: string; count: number }[]; by_source: { key: string; count: number }[];
  recent: { id: string; name: string; door: string; status: string; created_at: string }[];
}

const DOOR_LABELS: Record<string, string> = { buy: 'Buying a home', review: 'Mortgage review', class: 'Homebuyer class' };
const btn = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50';

const api = async (path: string, init: RequestInit = {}) => {
  const headers = { ...(await authHeaders(null)), ...(init.body ? { 'Content-Type': 'application/json' } : {}) };
  return fetch(buildApiUrl(path), { ...init, headers });
};

const copyText = (text: string) =>
  navigator.clipboard.writeText(text).then(() => showToast.success('Copied'), () => showToast.error('Could not copy'));

// Shrink a photo in the browser so uploads stay small and fast.
const toSmallDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    resolve(canvas.toDataURL('image/jpeg', 0.82));
  };
  img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('bad_image')); };
  img.src = objectUrl;
});

// Every post is editable. Nothing is ever posted for the LO: they review, edit, then share it themselves.
const PostCard: React.FC<{ title: string; initial: string; link: string; pictures: Picture[] }> = ({ title, initial, link, pictures }) => {
  const [text, setText] = useState(initial);
  const [pic, setPic] = useState<Picture | null>(null);
  const encoded = encodeURIComponent(text);
  const share = async () => {
    try {
      if (pic?.url && navigator.canShare) {
        const blob = await (await fetch(pic.url)).blob();
        const file = new File([blob], pic.name, { type: blob.type });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ text, files: [file] }); return; }
      }
      if (navigator.share) { await navigator.share({ text }); return; }
      await copyText(text);
    } catch { /* cancelled */ }
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <textarea aria-label={`Edit: ${title}`} value={text} onChange={(e) => setText(e.target.value)} rows={5} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800" />
      {pictures.length > 0 && (
        <div className="mt-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-slate-500">Picture:</span>
          {pictures.slice(0, 8).map((p) => (
            <button key={p.name} type="button" onClick={() => setPic(pic?.name === p.name ? null : p)} aria-pressed={pic?.name === p.name} className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 ${pic?.name === p.name ? 'border-slate-900' : 'border-transparent'}`}>
              {p.url && <img src={p.url} alt="" className="h-full w-full object-cover" />}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => void copyText(text)}>Copy</button>
        <button type="button" className={btn} onClick={() => void share()}>Share…</button>
        <a className={btn} target="_blank" rel="noreferrer" href={`https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`}>LinkedIn</a>
        <a className={btn} target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}>Facebook</a>
        {pic?.url && <a className={btn} href={pic.url} download={pic.name} target="_blank" rel="noreferrer">Save picture</a>}
      </div>
      <p className="mt-2 text-xs text-slate-500">Nothing is posted for you. Facebook and LinkedIn open in a new tab so you can paste and post.</p>
    </div>
  );
};

const LOPromotePage: React.FC = () => {
  const [link, setLink] = useState<MyLink | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [qr, setQr] = useState('');
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [uploading, setUploading] = useState(false);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [writing, setWriting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await api('/api/lo/my-link');
        if (!res.ok) throw new Error('bad');
        const d = await res.json() as MyLink;
        if (!live) return;
        setLink(d); setState('ready');
        QRCode.toDataURL(`${d.url}?utm_source=qr`, { width: 600, margin: 1 }).then((u) => live && setQr(u)).catch(() => undefined);
      } catch { if (live) setState('error'); }
    })();
    api('/api/lo/pictures').then((r) => r.ok ? r.json() : null).then((d: { pictures: Picture[] } | null) => { if (live && d) setPictures(d.pictures); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  const loadStats = useCallback(async (n: number) => {
    try { const r = await api(`/api/lo/link-stats?days=${n}`); if (r.ok) setStats(await r.json() as Stats); } catch { /* quiet */ }
  }, []);
  useEffect(() => { void loadStats(days); }, [days, loadStats]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await toSmallDataUrl(file);
      const res = await api('/api/lo/pictures', { method: 'POST', body: JSON.stringify({ dataUrl }) });
      const d = await res.json().catch(() => ({})) as { picture?: Picture; error?: string };
      if (res.status === 409) { showToast.error('Your library is full. Delete one first.'); return; }
      if (!res.ok || !d.picture) throw new Error('failed');
      setPictures((p) => [d.picture as Picture, ...p]);
    } catch { showToast.error('Could not upload that picture.'); } finally { setUploading(false); }
  };

  const removePicture = async (name: string) => {
    if (!window.confirm('Delete this picture?')) return;
    const res = await api(`/api/lo/pictures/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok) setPictures((p) => p.filter((x) => x.name !== name)); else showToast.error('Could not delete it.');
  };

  const writeDrafts = async (topic: string) => {
    setWriting(true);
    try {
      const res = await api('/api/lo/post-drafts', { method: 'POST', body: JSON.stringify({ topic }) });
      const d = await res.json().catch(() => ({})) as { drafts?: string[] };
      if (res.status === 429) { showToast.error('That is enough for today. Try again tomorrow.'); return; }
      if (!res.ok || !d.drafts) throw new Error('failed');
      setDrafts(d.drafts);
    } catch { showToast.error('Could not write drafts right now.'); } finally { setWriting(false); }
  };

  if (state === 'loading') return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-500">Loading…</div>;
  if (state === 'error' || !link) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-700">Could not load your link. Try again in a minute.</div>;

  const nmls = link.nmls ? ` NMLS #${link.nmls}` : '';
  const posts = [
    { title: 'Buying a home', door: 'buy', text: `Thinking about buying a home? Ask me anything, no pressure. I will tell you what to do first.${nmls}` },
    { title: 'Mortgage review', door: 'review', text: `Is your mortgage rate about to change? I will take a free look and tell you if it still fits your plans.${nmls}` },
    { title: 'Homebuyer class', door: 'class', text: `Want to learn the steps to buying a home and the programs that can help? Sign up for my homebuyer class.${nmls}` },
  ].map((p) => ({ ...p, url: `${link.url}?door=${p.door}&utm_source=social` }));
  const signature = `Questions about buying or your mortgage? Ask me here: ${link.url}?utm_source=email`;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Promote yourself</h1>
        <p className="text-sm text-slate-500">One link, no agent needed. Every request lands in your Leads. Everything here is yours to edit.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Your personal link</p>
        <p className="mt-1 break-all rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{link.url}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void copyText(link.url)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Copy link</button>
          <a href={link.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Preview</a>
        </div>
        {qr && <img src={qr} alt="QR code for your link" className="mt-4 h-40 w-40" />}
        {qr && <a href={qr} download="my-link-qr.png" className="mt-2 inline-block text-sm font-semibold text-slate-700 underline">Download QR</a>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">My pictures</p>
        <p className="mt-1 text-xs text-slate-500">Your headshot, your team, an open house. Add them to any post below.</p>
        <label className={`${btn} mt-3 inline-block cursor-pointer`}>
          {uploading ? 'Uploading…' : 'Add a picture'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {pictures.map((p) => (
            <div key={p.name} className="relative overflow-hidden rounded-lg bg-slate-100">
              {p.url && <img src={p.url} alt="" className="aspect-square w-full object-cover" />}
              <button type="button" aria-label="Delete picture" onClick={() => void removePicture(p.name)} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-sm text-white">×</button>
            </div>
          ))}
        </div>
        {!pictures.length && <p className="mt-3 text-sm text-slate-500">No pictures yet.</p>}
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Ready-to-post</p>
        {posts.map((p) => <PostCard key={p.door} title={p.title} initial={`${p.text}\n${p.url}`} link={p.url} pictures={pictures} />)}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Write me new post drafts</p>
        <p className="mt-1 text-xs text-slate-500">Drafts only. Read it, change it, then post it yourself.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(DOOR_LABELS).map(([k, label]) => (
            <button key={k} type="button" disabled={writing} onClick={() => void writeDrafts(k)} className={`${btn} disabled:opacity-50`}>{writing ? 'Writing…' : label}</button>
          ))}
        </div>
        <div className="mt-3 space-y-3">
          {drafts.map((d, i) => <PostCard key={`${i}-${d.slice(0, 12)}`} title={`Draft ${i + 1}`} initial={d} link={link.url} pictures={pictures} />)}
        </div>
      </section>

      <PostCard title="Email signature line" initial={signature} link={link.url} pictures={[]} />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Results</p>
          <select aria-label="Time range" value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
        </div>
        {stats ? (
          <div className="mt-3 space-y-3 text-sm text-slate-800">
            <p><strong className="text-2xl">{stats.total}</strong> requests from your link{stats.total ? `, ${stats.contacted} you have followed up on` : ''}.</p>
            {stats.by_door.length > 0 && <p>By button: {stats.by_door.map((d) => `${DOOR_LABELS[d.key] || d.key} ${d.count}`).join(' · ')}</p>}
            {stats.by_source.length > 0 && <p>Where they came from: {stats.by_source.map((d) => `${d.key} ${d.count}`).join(' · ')}</p>}
            {stats.recent.length > 0 && <ul className="space-y-1">{stats.recent.map((r) => <li key={r.id} className="text-slate-600">{r.name} · {DOOR_LABELS[r.door] || r.door} · {r.status}</li>)}</ul>}
            {!stats.total && <p className="text-slate-500">Nothing yet. Share your link or QR to get your first request.</p>}
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">Loading…</p>}
      </section>
    </div>
  );
};

export default LOPromotePage;
