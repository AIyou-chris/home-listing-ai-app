import React, { useCallback, useEffect, useState } from 'react';
import { buildApiUrl } from '../host/api';
import { authedFetch } from '../host/authedFetch';
import Collapsible from './Collapsible';

// Autopilot: three posts a day, written the day before and checked. By default each post waits for your OK; "Post by itself" is a separate switch. One big Stop.

type PostRow = { channel: string; status: 'scheduled' | 'posting' | 'published' | 'failed'; scheduled_for: string; posted_at: string | null; url: string | null; error: string | null };
type Slot = { campaignId: string; slot: string; topic: string; title: string; failed: boolean; skipped?: boolean; awaitingApproval?: boolean; reason: string; preview?: string; pictureUrl?: string; posts: PostRow[] };
type Plan = { name: string; day: number; week: number; offerOpen?: boolean; offerEnds?: string | null } | null;
type BlogDraft = { id: string; title: string; status: string; updatedAt?: string; problems: number; written: boolean };
type Status = { on: boolean; autoPublish?: boolean; blogDrafts?: BlogDraft[]; autoPost: boolean; lastIssue?: { slot: string; reason: string } | null; plan?: Plan; direction?: string; slots: Slot[]; times: string[] };

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
  const [launch, setLaunch] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [direction, setDirection] = useState('');
  const [directionLoaded, setDirectionLoaded] = useState(false);

  const load = useCallback(async () => {
    try { const next: Status = await call('/api/admin/autopilot'); setStatus(next); setUpdatedAt(new Date()); setDirection((current) => (directionLoaded ? current : next.direction || '')); setDirectionLoaded(true); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load Autopilot'); }
  }, [directionLoaded]);
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
    return act('on', async () => { await call('/api/admin/autopilot', { method: 'POST', body: JSON.stringify({ enabled: true, plan: launch }) }); setNote('Autopilot is ON. The next posts are being written now.'); });
  };
  const stop = () => {
    if (!window.confirm('Stop Autopilot?\n\nNothing new will be written, and posts that are scheduled but not yet posted are taken back. Posts already out stay out.')) return;
    return act('off', async () => { const r = await call('/api/admin/autopilot', { method: 'POST', body: JSON.stringify({ enabled: false }) }); setNote(`Autopilot is OFF. ${r.cancelled ? 'Waiting posts were taken back.' : ''}`); });
  };
  const saveDirection = () => act('direction', async () => { await call('/api/admin/autopilot/direction', { method: 'POST', body: JSON.stringify({ direction }) }); setNote(direction.trim() ? 'Saved. Every post written from now on follows it.' : 'Direction cleared.'); });
  const takeBack = (campaignId: string, skip: boolean) => {
    if (!window.confirm(skip ? 'Skip this time? Nothing will be posted at it.' : 'Replace this post? It is taken back and a new one is written.')) return;
    return act(`remove-${campaignId}`, async () => { await call(`/api/admin/autopilot/posts/${campaignId}/remove`, { method: 'POST', body: JSON.stringify({ skip }) }); setNote(skip ? 'Skipped.' : 'Taken back. A new one is being written.'); });
  };
  const blogNow = () => act('blog', async () => { await call('/api/admin/autopilot/blog-now', { method: 'POST', body: '{}' }); setNote('Writing the next blog article as a draft. It takes about 2 minutes. Nothing is published.'); });
  const newPicture = (campaignId: string) => {
    if (!window.confirm('Make a new picture for this post? It takes about 2 minutes (a new scene, and the video is made again). The posting times stay the same.')) return;
    return act(`pic-${campaignId}`, async () => { await call(`/api/admin/autopilot/posts/${campaignId}/new-picture`, { method: 'POST', body: '{}' }); setNote('Making a new picture and video for this post. Press Refresh in about 2 minutes.'); });
  };
  const approve = (campaignId: string) => act(`approve-${campaignId}`, async () => { await call(`/api/admin/autopilot/posts/${campaignId}/approve`, { method: 'POST', body: '{}' }); setNote('Approved. It goes out at its time.'); });
  const setAutoPublish = (enabled: boolean) => {
    if (enabled && !window.confirm('Let Autopilot post by itself?\n\nPosts will go out to your real accounts without waiting for you. Every post is still checked first. You can turn this off any time.')) return;
    return act('autopublish', async () => { await call('/api/admin/autopilot/auto-publish', { method: 'POST', body: JSON.stringify({ enabled }) }); setNote(enabled ? 'Autopilot will now post by itself.' : 'Posts now wait for your OK.'); });
  };
  const runNow = () => act('run', async () => { await call('/api/admin/autopilot/run-now', { method: 'POST', body: '{}' }); setNote('Writing the next post now. It takes about 2 minutes. This page updates by itself.'); });

  const on = status?.on === true;
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Autopilot</h3>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Three posts a day, written for you and checked. {status?.autoPublish ? 'They post by themselves.' : 'Each one waits for your OK before it goes out.'} Press Stop any time.</p>
      </div>

      <div className={`rounded-2xl border p-5 ${on ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
        <p className="text-lg font-bold text-slate-900">Autopilot is {status ? (on ? 'ON' : 'OFF') : '…'}</p>
        <p className="mt-1 text-sm text-slate-700">{status?.times?.length ? `Posts at ${status.times.join(', ')} to LinkedIn, Facebook, Instagram and YouTube.` : 'Posts three times a day.'}</p>
        {on && status?.plan && <p className="mt-1 text-sm font-semibold text-emerald-800">Running the {status.plan.name} campaign: day {status.plan.day} of 30, week {status.plan.week} ({['Wake them up', 'Turn up the pressure', 'Introduce the solution', 'Close the deal'][status.plan.week - 1]}).{status.plan.offerOpen && status.plan.offerEnds ? ` The founding price is being promoted and ends ${status.plan.offerEnds} (or when the 25 spots are gone).` : ''}</p>}
        {!on && <label className="mt-3 flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" className="mt-1" checked={launch} onChange={(e) => setLaunch(e.target.checked)} /><span><strong>Run the 30-day launch campaign</strong> ("The market changed. It's time you did too."), black and red look, four weeks. Leave it unchecked for plain everyday posts.</span></label>}
        <div className="mt-4 flex flex-wrap gap-3">
          {!on && <button type="button" className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50" disabled={busy !== '' || !status} onClick={() => void turnOn()}>{busy === 'on' ? 'Turning on…' : 'Turn Autopilot ON'}</button>}
          {on && <button type="button" className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50" disabled={busy !== ''} onClick={() => void stop()}>{busy === 'off' ? 'Stopping…' : 'STOP Autopilot'}</button>}
          {on && <button type="button" className={btn} disabled={busy !== ''} onClick={() => void runNow()}>{busy === 'run' ? 'Starting…' : 'Write the next post now'}</button>}
          <button type="button" className={btn} disabled={busy !== ''} onClick={() => void act('refresh', load)}>{busy === 'refresh' ? 'Refreshing…' : 'Refresh'}</button>
          {updatedAt && <span className="self-center text-xs text-slate-500">Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>}
        </div>
        {status?.lastIssue && <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Last problem ({slotLabel(status.lastIssue.slot)}): {status.lastIssue.reason}. {on ? 'It will try again on its own.' : 'If Autopilot switched itself off, it did that on purpose after repeated problems. Turn it back on when you are ready.'}</p>}
        {status && <label className="mt-3 flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" className="mt-1" checked={status.autoPublish === true} disabled={busy !== ''} onChange={(e) => void setAutoPublish(e.target.checked)} /><span><strong>Post by itself</strong> (no OK needed). Off is safer: every post waits for you to press Approve.</span></label>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {note && <p role="status" className="mt-3 text-sm text-emerald-800">{note}</p>}
      </div>

      <Collapsible title="New direction" hint="Tell Autopilot something new. It applies to every post not yet written." defaultOpen={false}>
        <textarea value={direction} onChange={(e) => setDirection(e.target.value)} maxLength={1000} rows={4} aria-label="New direction for Autopilot" placeholder="Example: This week lean on the free trial. Don't mention rates. Talk about weekends." className="w-full rounded-xl border border-slate-300 p-3 text-sm" />
        <div className="mt-2 flex flex-wrap items-center gap-3"><button type="button" className={btn} disabled={busy !== ''} onClick={() => void saveDirection()}>{busy === 'direction' ? 'Saving…' : 'Save direction'}</button><span className="text-xs text-slate-500">{direction.length} / 1000. Posts already written stay as they are; use Replace on those.</span></div>
      </Collapsible>

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

      <Collapsible title="Blog drafts" hint="Twice a week the next planned article is written as a draft for you to read and publish" defaultOpen={false}>
        <p className="text-sm text-slate-700">Autopilot never publishes a blog article. It writes the draft, you read it, fix anything the checker flags, and press Publish.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={busy !== ''} onClick={() => void blogNow()}>{busy === 'blog' ? 'Starting…' : 'Write a blog draft now'}</button>
          <a href="/admin/blog" className={btn}>Open Manage blog posts</a>
        </div>
        {!status?.blogDrafts?.length && <p className="mt-3 text-sm text-slate-500">No drafts from Autopilot yet.</p>}
        <ul className="mt-3 divide-y divide-slate-100">
          {status?.blogDrafts?.map((d) => (
            <li key={d.id} className="py-2 text-sm"><span className="font-semibold text-slate-900">{d.title}</span> <span className="text-slate-600">{d.updatedAt ? `· ${new Date(d.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ` : ''}{d.written ? (d.problems ? `· draft, ${d.problems} thing${d.problems === 1 ? '' : 's'} to fix before publishing` : '· draft, ready for you to read') : '· being written'}</span></li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible title="Coming up and recent posts" hint={status ? `${status.slots.length} listed` : 'Loading…'}>
        {!status?.slots.length && <p className="text-sm text-slate-500">Nothing yet. Turn Autopilot on and the first posts show up here within a few minutes.</p>}
        <ul className="divide-y divide-slate-100">
          {status?.slots.map((s) => (
            <li key={s.campaignId} className="py-3 text-sm">
              <p className="font-semibold text-slate-900">{slotLabel(s.slot)}</p>
              <p className="text-slate-700">{s.skipped ? <span className="text-slate-500">Skipped by you</span> : s.failed ? <span className="text-red-700">Did not go out: {s.reason || 'did not pass the check'}</span> : (s.title || 'Writing…')}</p>
              {!s.failed && s.pictureUrl && <a href={s.pictureUrl} target="_blank" rel="noreferrer" className="mt-2 block w-40"><img src={s.pictureUrl} alt={`Picture for ${s.title || 'this post'}`} className="w-40 rounded-lg border border-slate-200" /></a>}
              {!s.failed && s.preview && <details className="mt-1"><summary className="cursor-pointer text-xs font-semibold text-slate-600">Read the post</summary><p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{s.preview}</p></details>}
              {!s.failed && s.awaitingApproval && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Waiting for your OK</span>
                  <button type="button" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50" disabled={busy !== ''} onClick={() => void approve(s.campaignId)}>{busy === `approve-${s.campaignId}` ? 'Approving…' : 'Approve'}</button>
                  <button type="button" className={btn} disabled={busy !== ''} onClick={() => void newPicture(s.campaignId)}>New picture</button>
                  <button type="button" className={btn} disabled={busy !== ''} onClick={() => void takeBack(s.campaignId, false)}>Replace</button>
                  <button type="button" className={btn} disabled={busy !== ''} onClick={() => void takeBack(s.campaignId, true)}>Skip</button>
                </div>
              )}
              {!s.failed && s.posts.length > 0 && !s.posts.some((p) => p.status === 'published' || p.status === 'posting') && (
                <div className="mt-2 flex gap-2">
                  <button type="button" className={btn} disabled={busy !== ''} onClick={() => void newPicture(s.campaignId)}>{busy === `pic-${s.campaignId}` ? 'Starting…' : 'New picture'}</button>
                  <button type="button" className={btn} disabled={busy !== ''} onClick={() => void takeBack(s.campaignId, false)}>Replace</button>
                  <button type="button" className={btn} disabled={busy !== ''} onClick={() => void takeBack(s.campaignId, true)}>Skip</button>
                </div>
              )}
              {!s.failed && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {s.posts.length === 0 && !s.awaitingApproval && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Being written</span>}
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
