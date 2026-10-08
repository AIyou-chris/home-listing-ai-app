import React, { useCallback, useEffect, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { authedFetch } from '../../services/authedFetch';

// After a campaign is approved: pick the accounts, pick the time, and it posts for you with tracking tags.
// Nothing posts until a person picks accounts here. Scheduled posts also need the Auto-posting switch ON.

type Channel = 'facebook' | 'instagram' | 'linkedin' | 'youtube';
type Post = { id: string; channel: Channel; status: 'scheduled' | 'posting' | 'published' | 'failed'; scheduled_for: string; posted_at: string | null; url: string | null; error: string | null };
type Connection = { platform: Channel; connected: boolean };

const LABEL: Record<Channel, string> = { facebook: 'Facebook Page', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube Short' };
const ORDER: Channel[] = ['linkedin', 'facebook', 'instagram', 'youtube'];
const btn = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const primary = 'rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50';

const call = async (path: string, init?: RequestInit) => {
  const res = await authedFetch(buildApiUrl(path), { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};
const toLocalInput = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export default function MarketingCampaignPosting({ campaignId, plannedAt, hasBlogPost }: { campaignId: string; plannedAt?: string; hasBlogPost: boolean }) {
  const base = `/api/admin/marketing-studio/campaigns/${campaignId}`;
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [picked, setPicked] = useState<Set<Channel>>(new Set());
  const [when, setWhen] = useState<'now' | 'later'>(plannedAt ? 'later' : 'now');
  const [at, setAt] = useState(plannedAt || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [blogSaved, setBlogSaved] = useState(hasBlogPost);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([call('/api/admin/house-social/connections'), call(`${base}/posts`)]);
      setConnected(Object.fromEntries((c.connections as Connection[]).map((x) => [x.platform, x.connected])));
      setPosts(p.posts);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load'); }
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(''); setNote('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); } finally { setBusy(''); }
  };
  const schedule = () => act('schedule', async () => {
    const iso = when === 'later' && at ? new Date(at).toISOString() : null;
    const r = await call(`${base}/posts`, { method: 'PUT', body: JSON.stringify({ channels: [...picked], at: iso }) });
    setPosts(r.posts); setPicked(new Set());
    setNote(iso ? 'Scheduled. It posts at that time while Auto-posting is ON.' : 'Ready. Press Post now on each one, or it goes out within 5 minutes if Auto-posting is ON.');
  });
  const postNow = (channel: Channel) => act(`now-${channel}`, async () => { setPosts((await call(`${base}/posts/${channel}/post-now`, { method: 'POST', body: '{}' })).posts); });
  const remove = (channel: Channel) => act(`rm-${channel}`, async () => { setPosts((await call(`${base}/posts/${channel}`, { method: 'DELETE' })).posts); });
  const saveBlog = () => act('blog', async () => { await call(`${base}/save-blog`, { method: 'POST', body: '{}' }); setBlogSaved(true); setNote('Saved as a draft in your blog. Open Blog to review and publish it.'); });

  const taken = new Set(posts.filter((p) => p.status !== 'failed').map((p) => p.channel));
  const toggle = (c: Channel) => setPicked((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`post-${campaignId}`}>
      <h3 id={`post-${campaignId}`} className="font-semibold text-slate-900">Send it out</h3>
      <p className="mt-1 text-sm text-slate-600">Pick the accounts. Links to your site get tracking tags automatically, so you can see which campaign brought each visit.</p>

      <div className="mt-3 flex flex-wrap gap-3">
        {ORDER.map((c) => (
          <label key={c} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${connected[c] ? 'border-slate-300 text-slate-800' : 'border-slate-200 text-slate-400'}`}>
            <input type="checkbox" disabled={!connected[c] || taken.has(c)} checked={picked.has(c)} onChange={() => toggle(c)} />
            {LABEL[c]}{!connected[c] && ' (connect it first)'}{taken.has(c) && ' (already chosen)'}
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-800">
        <label className="flex items-center gap-2"><input type="radio" checked={when === 'now'} onChange={() => setWhen('now')} /> As soon as I say</label>
        <label className="flex items-center gap-2"><input type="radio" checked={when === 'later'} onChange={() => setWhen('later')} /> On a date</label>
        {when === 'later' && <input type="datetime-local" value={at} min={toLocalInput(new Date().toISOString())} onChange={(e) => setAt(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" aria-label="Post date and time" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={busy !== '' || picked.size === 0 || (when === 'later' && !at)} onClick={() => void schedule()}>{busy === 'schedule' ? 'Saving…' : 'Choose these'}</button>
        <button type="button" className={btn} disabled={busy !== '' || blogSaved} onClick={() => void saveBlog()}>{blogSaved ? 'Article is in your blog' : busy === 'blog' ? 'Saving…' : 'Save article to my blog (draft)'}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {note && <p role="status" className="mt-2 text-sm text-emerald-700">{note}</p>}

      {posts.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{LABEL[p.channel]}</p>
                <p className={p.status === 'failed' ? 'text-red-700' : p.status === 'published' ? 'text-emerald-700' : 'text-slate-600'}>
                  {p.status === 'published' ? <>Posted. {p.url && <a className="underline" href={p.url} target="_blank" rel="noreferrer">See it</a>}</>
                    : p.status === 'failed' ? `Did not post: ${p.error || 'unknown reason'}`
                    : p.status === 'posting' ? 'Posting now…'
                    : `Scheduled for ${new Date(p.scheduled_for).toLocaleString()}`}
                </p>
              </div>
              {p.status !== 'published' && p.status !== 'posting' && (
                <div className="flex gap-2">
                  <button type="button" className={btn} disabled={busy !== ''} onClick={() => void postNow(p.channel)}>{busy === `now-${p.channel}` ? 'Posting…' : p.status === 'failed' ? 'Try again' : 'Post now'}</button>
                  <button type="button" className={btn} disabled={busy !== ''} onClick={() => void remove(p.channel)}>Remove</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
