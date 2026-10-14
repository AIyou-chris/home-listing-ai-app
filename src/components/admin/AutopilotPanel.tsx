import React, { useCallback, useEffect, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { authedFetch } from '../../services/authedFetch';
import Collapsible from './Collapsible';

// Autopilot: three posts a day, written the day before, checked, then posted by themselves. One big Stop.

type PostRow = { channel: string; status: 'scheduled' | 'posting' | 'published' | 'failed'; scheduled_for: string; posted_at: string | null; url: string | null; error: string | null };
type Slot = { campaignId: string; slot: string; topic: string; title: string; failed: boolean; reason: string; posts: PostRow[] };
type Status = { on: boolean; autoPost: boolean; slots: Slot[]; times: string[] };

const LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube' };
const btn = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

const call = async (path: string, init?: RequestInit) => {
  const res = await authedFetch(buildApiUrl(path), { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

const slotLabel = (key: string) => {
  const [date, time] = key.split('@');
  const [h, m] = (time || '00:00').split(':').map(Number);
  const d = new Date(`${date}T12:00:00`);
  const day = Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day}, ${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'} Pacific`;
};

export default function AutopilotPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try { setStatus(await call('/api/admin/autopilot')); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load Autopilot'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!status?.on) return undefined;
    const timer = window.setInterval(() => { void load(); }, 20000);
    return () => window.clearInterval(timer);
  }, [status?.on, load]);

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(''); setNote('');
    try { await fn(); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Something went wrong'); } finally { setBusy(''); }
  };
  const turnOn = () => {
    if (!window.confirm('Turn Autopilot ON?\n\nIt will write and post 3 times a day to your real LinkedIn, Facebook, Instagram and YouTube until you press Stop. Every post is checked first.')) return;
    return act('on', async () => { await call('/api/admin/autopilot', { method: 'POST', body: JSON.stringify({ enabled: true }) }); setNote('Autopilot is ON. The next posts are being written now.'); });
  };
  const stop = () => {
    if (!window.confirm('Stop Autopilot?\n\nNothing new will be written, and posts that are scheduled but not yet posted are taken back. Posts already out stay out.')) return;
    return act('off', async () => { const r = await call('/api/admin/autopilot', { method: 'POST', body: JSON.stringify({ enabled: false }) }); setNote(`Autopilot is OFF. ${r.cancelled ? 'Waiting posts were taken back.' : ''}`); });
  };
  const runNow = () => act('run', async () => { await call('/api/admin/autopilot/run-now', { method: 'POST', body: '{}' }); setNote('Writing the next post now. It takes about 2 minutes. This page updates by itself.'); });

  const on = status?.on === true;
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Autopilot</h3>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Three posts a day, written for you, checked, and posted by themselves. Press Stop any time.</p>
      </div>

      <div className={`rounded-2xl border p-5 ${on ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
        <p className="text-lg font-bold text-slate-900">Autopilot is {status ? (on ? 'ON' : 'OFF') : '…'}</p>
        <p className="mt-1 text-sm text-slate-700">{status?.times?.length ? `Posts at ${status.times.join(', ')} to LinkedIn, Facebook, Instagram and YouTube.` : 'Posts three times a day.'}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {!on && <button type="button" className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50" disabled={busy !== '' || !status} onClick={() => void turnOn()}>{busy === 'on' ? 'Turning on…' : 'Turn Autopilot ON'}</button>}
          {on && <button type="button" className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50" disabled={busy !== ''} onClick={() => void stop()}>{busy === 'off' ? 'Stopping…' : 'STOP Autopilot'}</button>}
          {on && <button type="button" className={btn} disabled={busy !== ''} onClick={() => void runNow()}>{busy === 'run' ? 'Starting…' : 'Write the next post now'}</button>}
          <button type="button" className={btn} disabled={busy !== ''} onClick={() => void load()}>Refresh</button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {note && <p role="status" className="mt-3 text-sm text-emerald-800">{note}</p>}
      </div>

      <Collapsible title="How it works" hint="What happens, and what keeps it safe" defaultOpen={false}>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>About 18 hours before each time, it picks a topic, writes the posts in your voice, and makes the picture and a 15-second video.</li>
          <li>Every post goes through a safety check first: no banned words, no promises, no made-up results, no numbers except your two prices, links only to your own site.</li>
          <li>A post that fails the check is thrown away and a different one is written. If three in a row fail, Autopilot switches itself OFF and emails you.</li>
          <li>You get one email each evening listing what went out, with links.</li>
          <li>Topics rotate and do not repeat. One post a day shares a real article from your blog.</li>
          <li>Stop takes back anything scheduled but not yet posted. Posts already out stay out.</li>
        </ul>
      </Collapsible>

      <Collapsible title="Coming up and recent posts" hint={status ? `${status.slots.length} listed` : 'Loading…'}>
        {!status?.slots.length && <p className="text-sm text-slate-500">Nothing yet. Turn Autopilot on and the first posts show up here within a few minutes.</p>}
        <ul className="divide-y divide-slate-100">
          {status?.slots.map((s) => (
            <li key={s.campaignId} className="py-3 text-sm">
              <p className="font-semibold text-slate-900">{slotLabel(s.slot)}</p>
              <p className="text-slate-700">{s.failed ? <span className="text-red-700">Did not go out: {s.reason || 'did not pass the check'}</span> : (s.title || 'Writing…')}</p>
              {!s.failed && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {s.posts.length === 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Being written</span>}
                  {s.posts.map((p) => (
                    <span key={p.channel} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === 'published' ? 'bg-emerald-100 text-emerald-800' : p.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {LABEL[p.channel] || p.channel}: {p.status === 'published' ? 'posted' : p.status === 'failed' ? `failed${p.error ? ` (${p.error})` : ''}` : p.status === 'posting' ? 'posting…' : 'waiting'}
                      {p.url && <> · <a className="underline" href={p.url} target="_blank" rel="noreferrer">see it</a></>}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Collapsible>
    </section>
  );
}
