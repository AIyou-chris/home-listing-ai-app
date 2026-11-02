import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { useDemoMode } from '../../demo/useDemoMode';
import { showToast } from '../../utils/toastService';
import LOVideoMaker from './LOVideoMaker';

interface MyLink { slug: string; url: string; name: string; company: string | null; nmls: string | null }
interface Picture { name: string; url: string | null }
interface Stats {
  days: number; total: number; contacted: number;
  by_door: { key: string; count: number }[]; by_source: { key: string; count: number }[];
  by_day?: { date: string; count: number }[];
  recent: { id: string; name: string; door: string; status: string; created_at: string }[];
}
interface PlanItem { id: string; day: number; platform: Platform; title: string; text: string }
type Platform = 'linkedin' | 'facebook' | 'instagram' | 'email';

const DEMO_LINK: MyLink = { slug: 'sample', url: 'https://homelistingai.com/ask/sample', name: 'Chris Potter', company: 'Sample Mortgage', nmls: '12345' };
const DEMO_STATS: Stats = {
  days: 30, total: 27, contacted: 19,
  by_door: [{ key: 'review', count: 11 }, { key: 'buy', count: 10 }, { key: 'class', count: 6 }],
  by_source: [{ key: 'social', count: 14 }, { key: 'qr', count: 8 }, { key: 'email', count: 5 }],
  by_day: [2, 3, 2, 4, 3, 5, 4, 2, 5, 6, 4, 7, 5, 8].map((count, i) => ({ date: `d${i}`, count })),
  recent: [],
};
const DOORS: Record<string, string> = { buy: 'Buying a home', review: 'Mortgage review', class: 'Homebuyer class' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PLATFORMS: Record<Platform, string> = { linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram', email: 'Email' };
const PLAN_KEY = 'lo_promote_plan_v1';

const card = 'rounded-2xl border border-indigo-950 bg-[#111a33] p-5';
const ghost = 'rounded-lg border border-indigo-800 bg-transparent px-3 py-1.5 text-xs font-bold text-indigo-200 hover:bg-indigo-950';
const solid = 'rounded-xl bg-cyan-400 px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-cyan-300 disabled:opacity-60';
const chipCls = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs font-bold ${on ? 'border-cyan-400 bg-cyan-400 text-slate-900' : 'border-indigo-800 bg-indigo-950 text-indigo-200'}`;

const api = async (path: string, init: RequestInit = {}) => {
  const headers = { ...(await authHeaders(null)), ...(init.body ? { 'Content-Type': 'application/json' } : {}) };
  return fetch(buildApiUrl(path), { ...init, headers });
};
const copyText = (text: string) =>
  navigator.clipboard.writeText(text).then(() => showToast.success('Copied'), () => showToast.error('Could not copy'));

const toSmallDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const img = new Image(); const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(objectUrl); resolve(c.toDataURL('image/jpeg', 0.82));
  };
  img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('bad_image')); };
  img.src = objectUrl;
});

const loadPlan = (): PlanItem[] => { try { return JSON.parse(localStorage.getItem(PLAN_KEY) || '[]') as PlanItem[]; } catch { return []; } };
const savePlan = (items: PlanItem[]) => { try { localStorage.setItem(PLAN_KEY, JSON.stringify(items)); } catch { /* private mode */ } };
const todayIndex = () => (new Date().getDay() + 6) % 7;

const Stat: React.FC<{ value: React.ReactNode; label: string; note?: string }> = ({ value, label, note }) => (
  <div className={card}><p className="text-4xl font-extrabold tracking-tight text-white">{value}</p><p className="mt-1 text-sm text-indigo-300">{label}</p>{note && <p className="mt-1 text-xs font-bold text-emerald-400">{note}</p>}</div>
);

const LOPromotePage: React.FC = () => {
  const demo = useDemoMode();
  const [link, setLink] = useState<MyLink | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [qr, setQr] = useState('');
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState(30);
  const [plan, setPlan] = useState<PlanItem[]>(loadPlan);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [writing, setWriting] = useState(false);
  // composer
  const [text, setText] = useState('');
  const [title, setTitle] = useState('New post');
  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [pic, setPic] = useState<Picture | null>(null);
  const [planDay, setPlanDay] = useState(todayIndex());

  useEffect(() => {
    let live = true;
    if (demo) {
      setLink(DEMO_LINK); setState('ready'); setStats(DEMO_STATS);
      QRCode.toDataURL(DEMO_LINK.url, { width: 600, margin: 1 }).then((u) => live && setQr(u)).catch(() => undefined);
      return () => { live = false; };
    }
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
  }, [demo]);

  const loadStats = useCallback(async (n: number) => {
    if (demo) return;
    try { const r = await api(`/api/lo/link-stats?days=${n}`); if (r.ok) setStats(await r.json() as Stats); } catch { /* quiet */ }
  }, [demo]);
  useEffect(() => { void loadStats(days); }, [days, loadStats]);

  const nmlsLine = link?.nmls ? ` NMLS #${link.nmls}` : '';
  const starters = useMemo(() => link ? [
    { door: 'review', label: 'Mortgage review', text: `Is your mortgage rate about to change? I will take a free look and tell you if it still fits your plans.${nmlsLine}\n${link.url}?door=review&utm_source=social` },
    { door: 'buy', label: 'Buying a home', text: `Thinking about buying a home? Ask me anything, no pressure. I will tell you what to do first.${nmlsLine}\n${link.url}?door=buy&utm_source=social` },
    { door: 'class', label: 'Homebuyer class', text: `Want to learn the steps to buying a home and the programs that can help? Sign up for my homebuyer class.${nmlsLine}\n${link.url}?door=class&utm_source=social` },
  ] : [], [link, nmlsLine]);
  useEffect(() => { if (starters.length && !text) { setText(starters[0].text); setTitle(starters[0].label); } }, [starters, text]);

  const upload = async (file: File | undefined) => {
    if (!file || demo) return;
    setUploading(true);
    try {
      const res = await api('/api/lo/pictures', { method: 'POST', body: JSON.stringify({ dataUrl: await toSmallDataUrl(file) }) });
      const d = await res.json().catch(() => ({})) as { picture?: Picture };
      if (res.status === 409) { showToast.error('Your library is full. Delete one first.'); return; }
      if (!res.ok || !d.picture) throw new Error('failed');
      setPictures((p) => [d.picture as Picture, ...p]);
    } catch { showToast.error('Could not upload that picture.'); } finally { setUploading(false); }
  };
  const removePicture = async (name: string) => {
    if (!window.confirm('Delete this picture?')) return;
    const res = await api(`/api/lo/pictures/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok) { setPictures((p) => p.filter((x) => x.name !== name)); if (pic?.name === name) setPic(null); } else showToast.error('Could not delete it.');
  };
  const writeDrafts = async (topic: string) => {
    if (demo) { showToast.error('Sign in to write drafts.'); return; }
    setWriting(true);
    try {
      const res = await api('/api/lo/post-drafts', { method: 'POST', body: JSON.stringify({ topic }) });
      const d = await res.json().catch(() => ({})) as { drafts?: string[] };
      if (res.status === 429) { showToast.error('That is enough for today. Try again tomorrow.'); return; }
      if (!res.ok || !d.drafts) throw new Error('failed');
      setDrafts(d.drafts);
    } catch { showToast.error('Could not write drafts right now.'); } finally { setWriting(false); }
  };

  const addToPlan = () => {
    const next = [...plan, { id: String(Date.now()), day: planDay, platform, title, text }];
    setPlan(next); savePlan(next); showToast.success(`Added to ${DAYS[planDay]}`);
  };
  const removeFromPlan = (id: string) => { const next = plan.filter((p) => p.id !== id); setPlan(next); savePlan(next); };
  const loadFromPlan = (p: PlanItem) => { setText(p.text); setTitle(p.title); setPlatform(p.platform); window.scrollTo({ top: 0, behavior: 'smooth' }); };

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
  const openPlatform = async () => {
    await copyText(text);
    const first = text.match(/https?:\/\/\S+/)?.[0] || link?.url || '';
    if (platform === 'linkedin') window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    else if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(first)}`, '_blank', 'noopener');
    else if (platform === 'instagram') showToast.success('Copied. Paste it into Instagram.');
  };

  if (state === 'loading') return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-500">Loading…</div>;
  if (state === 'error' || !link) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-700">Could not load your link. Try again in a minute.</div>;

  const footer = `${link.name}${link.nmls ? ` · NMLS #${link.nmls}` : ''}`;
  const maxDay = Math.max(1, ...(stats?.by_day || []).map((d) => d.count));
  const answered = stats && stats.total ? Math.round((stats.contacted / stats.total) * 100) : 0;
  const planned = plan.length;
  const today = todayIndex();

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 md:px-6">
      <div className="space-y-5 rounded-3xl bg-[#0a1020] p-4 text-indigo-50 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Promote yourself</h1>
            <p className="mt-1 text-sm text-indigo-300">Your videos, your posts, your week, your results. Everything is yours to edit.</p>
          </div>
          <button type="button" className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-2.5 text-sm font-extrabold text-slate-900" onClick={() => { setText(''); setTitle('New post'); setPic(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>+ New post</button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat value={stats?.total ?? 0} label={`requests, last ${days} days`} />
          <Stat value={stats?.contacted ?? 0} label="you followed up on" note={stats?.total ? `${answered}% answered` : undefined} />
          <Stat value={planned} label="posts planned this week" />
          <Stat value={pictures.length || (demo ? 6 : 0)} label="pictures ready" />
        </div>

        <section className={card} aria-label="Create a video">
          <h2 className="text-lg font-extrabold text-white">🎬 Create a video</h2>
          <p className="mb-4 mt-1 text-sm text-indigo-300">Pick a topic, edit every word, make it. Free. You download it and post it yourself.</p>
          <LOVideoMaker footer={footer} />
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={card} aria-label="Write a post">
            <h2 className="text-lg font-extrabold text-white">✍️ Write a post</h2>
            <p className="mb-3 mt-1 text-sm text-indigo-300">Start from an idea, edit it, then preview it.</p>
            <div className="flex flex-wrap gap-2">
              {starters.map((s) => <button key={s.door} type="button" className={chipCls(false)} onClick={() => { setText(s.text); setTitle(s.label); }}>{s.label}</button>)}
              {Object.entries(DOORS).map(([k, l]) => <button key={k} type="button" disabled={writing} onClick={() => void writeDrafts(k)} className={`${chipCls(false)} disabled:opacity-50`}>{writing ? 'Writing…' : `✨ AI draft: ${l}`}</button>)}
            </div>
            {drafts.length > 0 && (
              <div className="mt-3 space-y-2">
                {drafts.map((d, i) => <button key={i} type="button" onClick={() => { setText(d); setTitle(`Draft ${i + 1}`); }} className="block w-full rounded-lg border border-indigo-900 bg-[#0d1530] p-3 text-left text-xs text-indigo-100 hover:border-cyan-400"><strong className="text-cyan-300">Draft {i + 1} · tap to edit</strong><br />{d.split('\n')[0]}</button>)}
              </div>
            )}
            <textarea aria-label="Edit your post" value={text} onChange={(e) => setText(e.target.value)} rows={7} className="mt-3 w-full rounded-lg border border-indigo-900 bg-[#0d1530] px-3 py-2 text-sm text-white" />
            {pictures.length > 0 && (
              <div className="mt-2 flex items-center gap-2 overflow-x-auto"><span className="text-xs text-indigo-300">Picture:</span>
                {pictures.slice(0, 10).map((p) => <button key={p.name} type="button" aria-pressed={pic?.name === p.name} onClick={() => setPic(pic?.name === p.name ? null : p)} className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 ${pic?.name === p.name ? 'border-cyan-400' : 'border-transparent'}`}>{p.url && <img src={p.url} alt="" className="h-full w-full object-cover" />}</button>)}
              </div>
            )}
          </section>

          <section className={card} aria-label="Preview">
            <h2 className="text-lg font-extrabold text-white">📱 Preview before you post</h2>
            <div className="mb-3 mt-3 flex flex-wrap gap-2">
              {(Object.keys(PLATFORMS) as Platform[]).map((p) => <button key={p} type="button" className={chipCls(platform === p)} onClick={() => setPlatform(p)}>{PLATFORMS[p]}</button>)}
            </div>
            <div className="rounded-2xl bg-white p-4 text-sm leading-snug text-slate-900">
              <div className="mb-3 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500" /><div><p className="font-bold">{link.name}</p><p className="text-xs text-slate-500">Loan Officer{link.nmls ? ` · NMLS #${link.nmls}` : ''} · now</p></div></div>
              <p className="whitespace-pre-line">{text || 'Your post shows here.'}</p>
              {pic?.url && <img src={pic.url} alt="" className="mt-3 max-h-56 w-full rounded-lg object-cover" />}
              <p className="mt-3 text-xs text-slate-500">👍 Like &nbsp; 💬 Comment &nbsp; ↗ Share</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={solid} onClick={() => void openPlatform()}>{platform === 'email' ? 'Copy' : `Copy & open ${PLATFORMS[platform]}`}</button>
              <button type="button" className={ghost} onClick={() => void share()}>Share…</button>
              {pic?.url && <a className={ghost} href={pic.url} download={pic.name} target="_blank" rel="noreferrer">Save picture</a>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-indigo-300">
              <span>Plan it for</span>
              <select aria-label="Day" value={planDay} onChange={(e) => setPlanDay(Number(e.target.value))} className="rounded-lg border border-indigo-800 bg-[#0d1530] px-2 py-1 text-white">{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
              <button type="button" className={ghost} onClick={addToPlan}>Add to my week</button>
            </div>
            <p className="mt-2 text-xs text-indigo-400">Nothing is posted for you. LinkedIn and Facebook open in a new tab with your words copied.</p>
          </section>
        </div>

        <section className={card} aria-label="Your week">
          <h2 className="text-lg font-extrabold text-white">🗓 Your week</h2>
          <p className="mb-4 mt-1 text-sm text-indigo-300">Plan it once. Tap a post to edit it. Saved on this device.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {DAYS.map((d, i) => (
              <div key={d} className={`min-h-[110px] rounded-xl border p-2 ${i === today ? 'border-cyan-400 bg-[#0f1b3d]' : 'border-indigo-950 bg-[#0d1530]'}`}>
                <p className="mb-1 text-xs font-bold text-white">{d}{i === today ? ' · today' : ''}</p>
                {plan.filter((p) => p.day === i).map((p) => (
                  <div key={p.id} className="mb-1 rounded-lg bg-indigo-200 p-1.5 text-[11px] font-bold text-slate-900">
                    <button type="button" className="block w-full text-left" onClick={() => loadFromPlan(p)}>{PLATFORMS[p.platform]}<br />{p.title}</button>
                    <button type="button" aria-label="Remove from plan" onClick={() => removeFromPlan(p.id)} className="mt-0.5 text-[10px] font-semibold underline">remove</button>
                  </div>
                ))}
                {!plan.some((p) => p.day === i) && <p className="rounded-lg border border-dashed border-indigo-800 p-1.5 text-[11px] text-indigo-400">open</p>}
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className={card} aria-label="Your link">
            <h2 className="text-lg font-extrabold text-white">🔗 Your link</h2>
            <p className="mb-3 mt-1 break-all text-sm text-indigo-300">{link.url}</p>
            <div className="flex items-center gap-4">
              {qr && <img src={qr} alt="QR code for your link" className="h-28 w-28 rounded-xl bg-white p-2" />}
              <div className="space-y-2">
                <button type="button" className={solid} onClick={() => void copyText(link.url)}>Copy link</button>
                {qr && <a href={qr} download="my-link-qr.png" className={`${ghost} block text-center`}>Download QR</a>}
                <a href={link.url} target="_blank" rel="noreferrer" className={`${ghost} block text-center`}>Preview</a>
              </div>
            </div>
            <p className="mt-3 text-xs text-indigo-400">Email line: Questions about buying or your mortgage? Ask me here: {link.url}?utm_source=email <button type="button" className="underline" onClick={() => void copyText(`Questions about buying or your mortgage? Ask me here: ${link.url}?utm_source=email`)}>copy</button></p>
          </section>

          <section className={card} aria-label="My pictures">
            <h2 className="text-lg font-extrabold text-white">📸 My pictures</h2>
            <p className="mb-3 mt-1 text-sm text-indigo-300">Your headshot, team, open houses.</p>
            <div className="grid grid-cols-3 gap-2">
              {pictures.map((p) => (
                <div key={p.name} className="relative overflow-hidden rounded-lg bg-indigo-950">
                  {p.url && <img src={p.url} alt="" className="aspect-square w-full object-cover" />}
                  <button type="button" aria-label="Delete picture" onClick={() => void removePicture(p.name)} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-sm text-white">×</button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-indigo-700 text-xs font-bold text-indigo-300">
                {uploading ? '…' : '+ Add'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            </div>
          </section>

          <section className={card} aria-label="Results">
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-white">📈 Results</h2>
              <select aria-label="Time range" value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-indigo-800 bg-[#0d1530] px-2 py-1 text-xs text-white"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></div>
            <div className="mt-4 flex h-24 items-end gap-1.5" aria-label="Requests by day">
              {(stats?.by_day || []).map((d, i) => <div key={`${d.date}-${i}`} title={`${d.date}: ${d.count}`} className="flex-1 rounded-t-md bg-gradient-to-b from-cyan-400 to-indigo-500" style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%` }} />)}
            </div>
            <p className="mt-1 text-xs text-indigo-400">Last 14 days</p>
            {stats && stats.by_door.length > 0 && <p className="mt-3 text-xs text-indigo-200">Best button: <strong>{DOORS[stats.by_door[0].key] || stats.by_door[0].key}</strong> ({stats.by_door[0].count})</p>}
            {stats && stats.by_source.length > 0 && <p className="mt-1 text-xs text-indigo-200">Best channel: <strong>{stats.by_source[0].key}</strong> ({stats.by_source[0].count})</p>}
            {stats && !stats.total && <p className="mt-3 text-xs text-indigo-300">Nothing yet. Share your link or QR to get your first request.</p>}
          </section>
        </div>
      </div>
    </div>
  );
};

export default LOPromotePage;
