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
const quick = (kind: 'hour' | 'tomorrow' | 'monday') => {
  const d = new Date();
  if (kind === 'hour') d.setHours(d.getHours() + 1, 0, 0, 0);
  else if (kind === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
  else { d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); d.setHours(9, 0, 0, 0); }
  return d.toISOString();
};
const toLocalInput = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export default function MarketingCampaignPosting({ campaignId, plannedAt, hasBlogPost, canPublish = true }: { campaignId: string; plannedAt?: string; hasBlogPost: boolean; canPublish?: boolean }) {
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
  const [autoOn, setAutoOn] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [editAt, setEditAt] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([call('/api/admin/house-social/connections'), call(`${base}/posts`)]);
      setConnected(Object.fromEntries((c.connections as Connection[]).map((x) => [x.platform, x.connected])));
      setPosts(p.posts);
      try { setAutoOn((await call('/api/admin/house-social/auto-post')).enabled === true); } catch { setAutoOn(null); }
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
  const remove = (channel: Channel) => {
    if (!window.confirm('Cancel this scheduled or failed post? Published posts are kept.')) return;
    return act(`rm-${channel}`, async () => { setPosts((await call(`${base}/posts/${channel}`, { method: 'DELETE' })).posts); });
  };
  const saveBlog = () => act('blog', async () => { await call(`${base}/save-blog`, { method: 'POST', body: '{}' }); setBlogSaved(true); setNote('Sent to your blog. The writer is writing the full article now; it shows as a draft in Manage blog posts in about a minute or two. Nothing is published.'); });

  const reschedule = (channel: Channel) => act(`edit-${channel}`, async () => {
    if (!editAt) throw new Error('Choose a date and time first.');
    const r = await call(`${base}/posts`, { method: 'PUT', body: JSON.stringify({ channels: [channel], at: new Date(editAt).toISOString() }) });
    setPosts(r.posts); setEditing(null); setNote(`${LABEL[channel]} will post on ${new Date(editAt).toLocaleString()}.`);
  });
  const turnAutoOn = () => {
    if (!window.confirm('Turn auto-posting ON? Everything you scheduled will post to your real accounts at its time.')) return;
    return act('auto', async () => { await call('/api/admin/house-social/auto-post', { method: 'POST', body: JSON.stringify({ enabled: true }) }); setAutoOn(true); setNote('Auto-posting is ON. Scheduled posts go out at their time.'); });
  };
  const waiting = posts.some((p) => p.status === 'scheduled');
  // Only posts that are live or in flight are locked; a scheduled post can be moved to a new time.
  const taken = new Set(posts.filter((p) => p.status === 'published' || p.status === 'posting').map((p) => p.channel));
  const toggle = (c: Channel) => setPicked((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`post-${campaignId}`}>
      <h3 id={`post-${campaignId}`} className="font-semibold text-slate-900">Publishing history & actions</h3>
      <p className="mt-1 text-sm text-slate-600">Pick the accounts. Links to your site get tracking tags automatically, so you can see which campaign brought each visit.</p>

      {canPublish && <>
      <div className="mt-3 flex flex-wrap gap-3">
        {ORDER.map((c) => (
          <label key={c} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${connected[c] ? 'border-slate-300 text-slate-800' : 'border-slate-200 text-slate-400'}`}>
            <input type="checkbox" disabled={!connected[c] || taken.has(c)} checked={picked.has(c)} onChange={() => toggle(c)} />
            {LABEL[c]}{!connected[c] && ' (connect it first)'}{taken.has(c) && ' (already posted)'}
          </label>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2"><input type="radio" checked={when === 'now'} onChange={() => setWhen('now')} /> As soon as I say</label>
          <label className="flex items-center gap-2"><input type="radio" checked={when === 'later'} onChange={() => setWhen('later')} /> On a date and time</label>
        </div>
        {when === 'later' && <div className="mt-3">
          <label className="block font-semibold">Date and time (your time zone)
            <input type="datetime-local" value={at} min={toLocalInput(new Date().toISOString())} onChange={(e) => setAt(e.target.value)} className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2" aria-label="Post date and time" />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setAt(toLocalInput(quick('hour')))}>In 1 hour</button>
            <button type="button" className={btn} onClick={() => setAt(toLocalInput(quick('tomorrow')))}>Tomorrow 9:00 AM</button>
            <button type="button" className={btn} onClick={() => setAt(toLocalInput(quick('monday')))}>Next Monday 9:00 AM</button>
          </div>
        </div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={busy !== '' || picked.size === 0 || (when === 'later' && !at)} onClick={() => void schedule()}>{busy === 'schedule' ? 'Saving…' : 'Choose these'}</button>
        <button type="button" className={btn} disabled={busy !== '' || blogSaved} onClick={() => void saveBlog()}>{blogSaved ? 'Article is in your blog' : busy === 'blog' ? 'Sending…' : 'Write the full article for my blog (draft)'}</button>
      </div>
      </>}
      {!canPublish && <p className="mt-3 text-sm text-slate-600">Save and approve this draft to publish. Existing posts remain visible below.</p>}
      <a href="/admin/blog" className={`${btn} mt-3 inline-block`}>Manage blog posts</a>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {note && <p role="status" className="mt-2 text-sm text-emerald-700">{note}</p>}

      {waiting && autoOn === false && <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><span><strong>Auto-posting is OFF.</strong> Scheduled posts will not go out by themselves. Turn it on, or press Post now.</span><button type="button" className={btn} disabled={busy !== ''} onClick={() => void turnAutoOn()}>Turn auto-posting on</button></div>}
      {waiting && autoOn === true && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Auto-posting is ON. Scheduled posts go out within 5 minutes of their time.</p>}
      {posts.length === 0 && !error && <p className="mt-3 text-sm text-slate-500">No scheduled or published social posts for this campaign.</p>}
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
              {editing === p.channel && <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
                <input type="datetime-local" value={editAt} min={toLocalInput(new Date().toISOString())} onChange={(e) => setEditAt(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5" aria-label={`New time for ${LABEL[p.channel]}`} />
                <button type="button" className={primary} disabled={busy !== '' || !editAt} onClick={() => void reschedule(p.channel)}>{busy === `edit-${p.channel}` ? 'Saving…' : 'Save time'}</button>
                <button type="button" className={btn} onClick={() => setEditing(null)}>Cancel</button>
              </div>}
              {p.status !== 'published' && p.status !== 'posting' && (
                <div className="flex gap-2">
                  <button type="button" className={btn} disabled={busy !== '' || !canPublish} onClick={() => { setEditing(p.channel); setEditAt(toLocalInput(p.scheduled_for)); }}>Change time</button>
                  <button type="button" className={btn} disabled={busy !== '' || !canPublish} onClick={() => void postNow(p.channel)}>{busy === `now-${p.channel}` ? 'Posting…' : p.status === 'failed' ? 'Try again' : 'Post now'}</button>
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
