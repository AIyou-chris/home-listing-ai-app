import React, { useCallback, useEffect, useState } from 'react';
import { showToast } from '../../utils/toastService';
import { LoIcon, LoSectionCard, LoTag, loGhost, loInput, loSolid } from './loUi';

type Api = (path: string, init?: RequestInit) => Promise<Response>;
type Network = 'facebook' | 'instagram' | 'linkedin' | 'youtube';
interface Account { platform: Network; status: 'connected' | 'needs_reconnect' | 'revoked' | 'not_connected'; label: string; available: boolean; canPost: boolean }
interface QueuePost {
  id: string; text: string; status: 'draft' | 'scheduled' | 'posting' | 'published' | 'failed'; channels: string[];
  scheduled_for: string | null; results: Record<string, { ok: boolean; url?: string | null; error?: string }>; image_url: string | null;
}
interface Picture { name: string; url: string | null }

const NETWORKS: { key: Network; name: string; icon: string; steps: string[]; can: string; cannot: string }[] = [
  {
    key: 'facebook', name: 'Facebook Page', icon: 'thumb_up',
    steps: ['Tap Connect. Facebook opens in a new screen.', 'Log in if it asks, then pick the Business Page you want us to post to.', 'Tap Continue / Save. You come straight back here and see "Connected".'],
    can: 'Post text and pictures to your Business Page, but only after you tap Approve.',
    cannot: 'We cannot post to your personal profile, read your messages, or post without your Approve.'
  },
  {
    key: 'instagram', name: 'Instagram', icon: 'photo_camera',
    steps: ['Your Instagram must be a Business or Creator account linked to a Facebook Page. (In Instagram: Settings, Account type.)', 'Tap Connect. You sign in through Facebook and tick your Instagram account.', 'Tap Continue. You come back here and see "Connected".'],
    can: 'Post a picture with your words, after you tap Approve.',
    cannot: 'Instagram needs a picture on every post. We cannot post to a personal account or send messages.'
  },
  {
    key: 'linkedin', name: 'LinkedIn', icon: 'work',
    steps: ['Tap Connect. LinkedIn opens in a new screen.', 'Log in if it asks, then tap Allow.', 'You come back here and see "Connected".'],
    can: 'Post text and pictures to your own LinkedIn profile, after you tap Approve.',
    cannot: 'We cannot post to a company page yet, read your messages, or post without your Approve.'
  },
  {
    key: 'youtube', name: 'YouTube', icon: 'smart_display',
    steps: ['Tap Connect. Google opens in a new screen.', 'Pick the Google account that owns your channel, then tap Allow.', 'You come back here and see "Connected".'],
    can: 'Keep your channel linked so videos can be posted from here next.',
    cannot: 'Text posts do not go to YouTube. Video posting from this page is not switched on yet.'
  },
];

const STATUS_WORD: Record<QueuePost['status'], string> = { draft: 'Waiting for you', scheduled: 'Approved, will post', posting: 'Posting…', published: 'Posted', failed: 'Needs a look' };
const TOPICS: { key: string; label: string }[] = [{ key: 'buy', label: 'Buying a home' }, { key: 'review', label: 'Mortgage review' }, { key: 'class', label: 'Homebuyer class' }];

const errorOf = async (res: Response, fallback: string) => {
  const d = await res.json().catch(() => ({})) as { error?: string };
  return d.error && !/^[a-z_]+$/.test(d.error) ? d.error : fallback;
};

const LOSocialConnect: React.FC<{ demo: boolean; api: Api; pictures: Picture[] }> = ({ demo, api, pictures }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [open, setOpen] = useState<Network | null>(null);
  const [busy, setBusy] = useState('');
  const [setupOff, setSetupOff] = useState(false);

  const load = useCallback(async () => {
    if (demo) return;
    try {
      const [a, q] = await Promise.all([api('/api/lo/social/accounts'), api('/api/lo/social/queue')]);
      if (a.ok) setAccounts(((await a.json()) as { accounts: Account[] }).accounts);
      if (q.ok) setPosts(((await q.json()) as { posts: QueuePost[] }).posts);
      setSetupOff(!a.ok || !q.ok);
    } catch { setSetupOff(true); }
  }, [api, demo]);

  useEffect(() => { void load(); }, [load]);

  // The platform sends the LO back to this page with ?social=...&result=...
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const social = p.get('social'); const result = p.get('result');
    if (!social || !result) return;
    if (result === 'connected') showToast.success('Connected. Nothing posts until you tap Approve.');
    else if (result === 'cancelled') showToast.error('Connection cancelled.');
    else showToast.error(p.get('message') || 'Could not connect. Try again.');
    window.history.replaceState({}, '', window.location.pathname);
    setOpen(null);
  }, []);

  const statusOf = (k: Network) => accounts.find((a) => a.platform === k);
  const connected = accounts.filter((a) => a.status === 'connected' && a.canPost);

  const connect = async (k: Network) => {
    if (demo) { showToast.error('Sign in to connect your accounts.'); return; }
    setBusy(k);
    try {
      const res = await api(`/api/lo/social/accounts/${k}/connect`, { method: 'POST' });
      const d = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (!res.ok || !d.url) throw new Error(d.error || 'failed');
      window.location.assign(d.url);
    } catch (e) { showToast.error(e instanceof Error && e.message !== 'failed' ? e.message : 'Could not start that connection.'); setBusy(''); }
  };
  const disconnect = async (k: Network) => {
    if (!window.confirm('Disconnect this account? Nothing will post to it.')) return;
    const res = await api(`/api/lo/social/accounts/${k}`, { method: 'DELETE' });
    if (res.ok) { showToast.success('Disconnected'); void load(); } else showToast.error('Could not disconnect it.');
  };

  const writeDrafts = async (topic: string) => {
    if (demo) { showToast.error('Sign in to write drafts.'); return; }
    setBusy(`draft-${topic}`);
    try {
      const res = await api('/api/lo/social/queue/drafts', { method: 'POST', body: JSON.stringify({ topic }) });
      if (!res.ok) { showToast.error(res.status === 429 ? await errorOf(res, 'That is enough drafts for now.') : 'Could not write drafts right now.'); return; }
      setPosts(((await res.json()) as { posts: QueuePost[] }).posts);
      showToast.success('3 drafts are waiting below. Nothing is posted.');
    } catch { showToast.error('Could not write drafts right now.'); } finally { setBusy(''); }
  };

  const call = async (key: string, path: string, init: RequestInit, ok: string) => {
    setBusy(key);
    try {
      const res = await api(path, init);
      if (!res.ok) { showToast.error(await errorOf(res, 'Could not do that. Try again.')); return; }
      setPosts(((await res.json()) as { posts: QueuePost[] }).posts);
      if (ok) showToast.success(ok);
    } catch { showToast.error('Could not do that. Try again.'); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <LoSectionCard fold icon="hub" title="Connect your accounts" description="Link your own social pages once. We write posts, you tap Approve. Nothing ever posts without your yes.">
        {setupOff && !demo && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Social posting is not switched on for your account yet. Check back soon.</p>}
        <ul className="space-y-3">
          {NETWORKS.map((n) => {
            const a = statusOf(n.key);
            const isOpen = open === n.key;
            return (
              <li key={n.key} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <LoIcon name={n.icon} className="text-2xl text-primary-700" />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="text-sm font-extrabold text-slate-900">{n.name}</p>
                    <p className="text-xs text-slate-600">{a?.status === 'connected' ? a.label || 'Connected' : a?.status === 'needs_reconnect' ? 'Your login expired.' : 'Not connected'}</p>
                  </div>
                  {a?.status === 'connected' ? <LoTag tone="green">Connected</LoTag> : a?.status === 'needs_reconnect' ? <LoTag tone="amber">Needs reconnect</LoTag> : <LoTag tone="slate">Not connected</LoTag>}
                  <button type="button" className={loGhost} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : n.key)}>{isOpen ? 'Hide steps' : 'How it works'}</button>
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm text-slate-700">
                    <ol className="list-decimal space-y-1 pl-5">{n.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                    <p><strong className="text-green-800">We can:</strong> {n.can}</p>
                    <p><strong className="text-red-800">We cannot:</strong> {n.cannot}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={loSolid} disabled={busy === n.key || (!!a && !a.available && !demo)} onClick={() => void connect(n.key)}>
                        {busy === n.key ? 'Opening…' : a?.status === 'connected' ? 'Reconnect' : a?.status === 'needs_reconnect' ? 'Reconnect now' : 'Connect'}
                      </button>
                      {a && a.status !== 'not_connected' && <button type="button" className={loGhost} onClick={() => void disconnect(n.key)}>Disconnect</button>}
                    </div>
                    {a && !a.available && !demo && <p className="text-xs text-slate-600">This one is not switched on yet. We are finishing it.</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </LoSectionCard>

      <LoSectionCard fold icon="fact_check" title="Posts waiting for your OK" description="AI writes the drafts. You read them, pick where they go, and tap Approve.">
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => <button key={t.key} type="button" className={loGhost} disabled={!!busy} onClick={() => void writeDrafts(t.key)}>{busy === `draft-${t.key}` ? 'Writing…' : `✨ Write drafts: ${t.label}`}</button>)}
        </div>
        {posts.length === 0 && <p className="mt-3 text-sm text-slate-600">No posts yet. Tap a button above to get 3 drafts.</p>}
        <ul className="mt-3 space-y-3">
          {posts.map((p) => <QueueCard key={p.id} post={p} connected={connected} pictures={pictures} busy={busy} call={call} />)}
        </ul>
      </LoSectionCard>
    </div>
  );
};

const QueueCard: React.FC<{
  post: QueuePost; connected: Account[]; pictures: Picture[]; busy: string;
  call: (key: string, path: string, init: RequestInit, ok: string) => Promise<void>;
}> = ({ post, connected, pictures, busy, call }) => {
  const [text, setText] = useState(post.text);
  const [picked, setPicked] = useState<string[]>(post.channels || []);
  const [image, setImage] = useState(post.image_url || '');
  const [at, setAt] = useState('');
  const editable = post.status === 'draft' || post.status === 'failed';
  const usable = pictures.filter((x) => x.url && x.url.startsWith('https://'));
  const toggle = (k: string) => setPicked((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const body = (extra: object) => JSON.stringify({ channels: picked, imageUrl: image || undefined, ...extra });

  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <LoTag tone={post.status === 'published' ? 'green' : post.status === 'failed' ? 'red' : post.status === 'draft' ? 'blue' : 'amber'}>{STATUS_WORD[post.status]}</LoTag>
        {post.scheduled_for && post.status === 'scheduled' && <span className="text-xs text-slate-600">{new Date(post.scheduled_for).toLocaleString()}</span>}
      </div>
      {editable ? (
        <textarea aria-label="Edit this post" value={text} onChange={(e) => setText(e.target.value)} rows={5} className={loInput} />
      ) : <p className="whitespace-pre-wrap text-sm text-slate-800">{post.text}</p>}
      {Object.entries(post.results || {}).map(([k, r]) => (
        <p key={k} className={`mt-1 text-xs ${r.ok ? 'text-green-800' : 'text-red-800'}`}>
          {k}: {r.ok ? (r.url ? <a className="underline" href={r.url} target="_blank" rel="noreferrer">Posted. View it</a> : 'Posted') : r.error}
        </p>
      ))}
      {editable && (
        <div className="mt-3 space-y-3">
          {connected.length === 0
            ? <p className="text-sm text-amber-900">Connect Facebook, Instagram or LinkedIn above to approve this.</p>
            : <fieldset className="flex flex-wrap gap-2"><legend className="mb-1 text-xs font-bold text-slate-700">Post to</legend>
              {connected.map((a) => <label key={a.platform} className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-bold ${picked.includes(a.platform) ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-slate-300 text-slate-700'}`}>
                <input type="checkbox" checked={picked.includes(a.platform)} onChange={() => toggle(a.platform)} />{a.platform[0].toUpperCase() + a.platform.slice(1)}</label>)}
            </fieldset>}
          {usable.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto"><span className="text-xs text-slate-700">Picture{picked.includes('instagram') ? ' (needed for Instagram)' : ''}:</span>
              {usable.slice(0, 10).map((x) => <button key={x.name} type="button" aria-pressed={image === x.url} aria-label={`Use picture ${x.name}`} onClick={() => setImage(image === x.url ? '' : x.url || '')} className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 ${image === x.url ? 'border-primary-600' : 'border-transparent'}`}><img src={x.url || ''} alt="" className="h-full w-full object-cover" /></button>)}
            </div>
          )}
          <label className="block text-xs font-bold text-slate-700">Post later (optional)
            <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={`${loInput} mt-1 max-w-xs`} /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={loSolid} disabled={!!busy || picked.length === 0} onClick={async () => {
              if (text.trim() !== post.text) await call(`edit-${post.id}`, `/api/lo/social/queue/${post.id}`, { method: 'PATCH', body: JSON.stringify({ text }) }, '');
              await call(`ok-${post.id}`, `/api/lo/social/queue/${post.id}/approve`, { method: 'POST', body: body({ at: at ? new Date(at).toISOString() : null }) }, at ? 'Approved. It will post at that time.' : 'Approved and sent.');
            }}>{busy === `ok-${post.id}` ? 'Posting…' : at ? 'Approve & schedule' : 'Approve & post now'}</button>
            <button type="button" className={loGhost} disabled={!!busy} onClick={() => void call(`rm-${post.id}`, `/api/lo/social/queue/${post.id}`, { method: 'DELETE' }, 'Removed')}>Discard</button>
          </div>
        </div>
      )}
    </li>
  );
};

export default LOSocialConnect;
