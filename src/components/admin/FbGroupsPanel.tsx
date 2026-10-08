import React, { useCallback, useEffect, useState } from 'react';
import { Check, Clipboard, ExternalLink, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabase';
import { buildApiUrl } from '../../lib/api';

// Facebook does not allow apps to post into groups. So: keep your groups and their rules here,
// let the AI write the post, copy it, paste it in the group yourself, then tap "I posted this".

type Group = {
  id: string; name: string; facebook_url: string; audience: string; member_count: number;
  join_status: 'researching' | 'requested' | 'joined' | 'paused'; promotion_days: string[];
  links_allowed: boolean | null; rules: string; notes: string; last_posted_at: string | null;
};
type Variant = { text: string; voiceIssues: string[] };
type Variants = Record<'valueFirst' | 'noLink' | 'promotional', Variant>;

const EMPTY = { name: '', facebookUrl: '', audience: '', memberCount: '', joinStatus: 'researching', linksAllowed: '', promotionDays: '', rules: '', notes: '' };
const VARIANTS: { key: keyof Variants; label: string; hint: string }[] = [
  { key: 'valueFirst', label: 'Value first', hint: 'Helps first, one soft line about us.' },
  { key: 'noLink', label: 'No link', hint: 'Does not name us. Safe almost anywhere.' },
  { key: 'promotional', label: 'Promotional', hint: 'Direct. Only if the group allows promotion.' }
];
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400';
const btn = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50';

const authHeader = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const api = async (path: string, init: RequestInit = {}) => {
  const res = await fetch(buildApiUrl(path), { ...init, headers: await authHeader() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

const FbGroupsPanel: React.FC = () => {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState('');
  const [openId, setOpenId] = useState('');
  const [topic, setTopic] = useState('');
  const [variants, setVariants] = useState<Variants | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try { setGroups((await api('/api/admin/fb-groups')).groups); setLoadError(''); }
    catch (e) { setLoadError(e instanceof Error ? e.message : 'Could not load'); setGroups([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const startEdit = (g: Group) => {
    setEditing(g.id); setShowForm(true);
    setForm({ name: g.name, facebookUrl: g.facebook_url, audience: g.audience, memberCount: String(g.member_count || ''), joinStatus: g.join_status,
      linksAllowed: g.links_allowed === true ? 'yes' : g.links_allowed === false ? 'no' : '', promotionDays: g.promotion_days.join(', '), rules: g.rules, notes: g.notes });
  };
  const save = async () => {
    setBusy('save');
    try {
      await api(editing ? `/api/admin/fb-groups/${editing}` : '/api/admin/fb-groups', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) });
      setForm(EMPTY); setEditing(null); setShowForm(false); await load(); toast.success('Saved');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(''); }
  };
  const remove = async (g: Group) => {
    if (!window.confirm(`Remove ${g.name} from your list?`)) return;
    try { await api(`/api/admin/fb-groups/${g.id}`, { method: 'DELETE' }); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not remove'); }
  };
  const write = async (g: Group) => {
    setBusy(`write-${g.id}`); setVariants(null);
    try { setVariants((await api(`/api/admin/fb-groups/${g.id}/write`, { method: 'POST', body: JSON.stringify({ topic }) })).variants); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not write that'); } finally { setBusy(''); }
  };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success('Copied'); } catch { toast.error('Could not copy'); } };
  const posted = async (g: Group, key: string, text: string) => {
    try { await api(`/api/admin/fb-groups/${g.id}/posted`, { method: 'POST', body: JSON.stringify({ variant: key, text }) }); toast.success('Logged'); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not log that'); }
  };

  const rule = (v: boolean | null) => (v === true ? 'Links OK' : v === false ? 'No links' : 'Links not checked');

  return (
    <section>
      <h3 className="text-xl font-bold text-slate-900">Facebook groups</h3>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">Facebook does not let apps post into groups, so you post by hand. Keep each group and its rules here. I write the post to fit, you copy it, paste it in the group, then tap "I posted this."</p>

      {loadError && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{loadError}</p>}

      <div className="mt-4"><button type="button" className={primary} onClick={() => { setEditing(null); setForm(EMPTY); setShowForm((v) => !v); }}><Plus className="h-4 w-4" /> Add a group</button></div>

      {showForm && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Group name<input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">Group link<input className={input} placeholder="https://facebook.com/groups/..." value={form.facebookUrl} onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">Who is in it<input className={input} placeholder="Loan officers, realtors..." value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">Members<input className={input} inputMode="numeric" value={form.memberCount} onChange={(e) => setForm({ ...form, memberCount: e.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">Where you are with it
            <select className={input} value={form.joinStatus} onChange={(e) => setForm({ ...form, joinStatus: e.target.value })}>
              <option value="researching">Researching</option><option value="requested">Asked to join</option><option value="joined">Joined</option><option value="paused">Paused</option>
            </select></label>
          <label className="text-sm font-semibold text-slate-700">Are links allowed?
            <select className={input} value={form.linksAllowed} onChange={(e) => setForm({ ...form, linksAllowed: e.target.value })}>
              <option value="">Not checked yet</option><option value="yes">Yes</option><option value="no">No, links are banned</option>
            </select></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Days promotion is allowed<input className={input} placeholder="Friday, Saturday (blank if never)" value={form.promotionDays} onChange={(e) => setForm({ ...form, promotionDays: e.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Group rules (paste them)<textarea className={input} rows={4} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Notes<textarea className={input} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className={primary} disabled={busy === 'save'} onClick={() => void save()}>{busy === 'save' ? 'Saving…' : 'Save group'}</button>
            <button type="button" className={btn} onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {groups === null && <p className="text-sm text-slate-500">Loading…</p>}
        {groups?.length === 0 && !loadError && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No groups yet. Add the first one.</p>}
        {groups?.map((g) => (
          <article key={g.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{g.name}</h4>
                <p className="text-sm text-slate-600">{[g.audience, g.member_count ? `${g.member_count.toLocaleString('en-US')} members` : '', g.join_status].filter(Boolean).join(' · ')}</p>
                <p className="mt-1 text-xs text-slate-500">{rule(g.links_allowed)}{g.promotion_days.length ? ` · Promo: ${g.promotion_days.join(', ')}` : ''}{g.last_posted_at ? ` · Last posted ${new Date(g.last_posted_at).toLocaleDateString()}` : ' · Never posted'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.facebook_url && <a className={btn} href={g.facebook_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Open group</a>}
                <button type="button" className={btn} onClick={() => startEdit(g)}><Pencil className="h-4 w-4" /> Edit</button>
                <button type="button" className={btn} onClick={() => void remove(g)} aria-label={`Remove ${g.name}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-4">
              <button type="button" className={primary} onClick={() => { setOpenId(openId === g.id ? '' : g.id); setVariants(null); }}><Sparkles className="h-4 w-4" /> {openId === g.id ? 'Close' : 'Write a post'}</button>
            </div>

            {openId === g.id && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <input className={`${input} min-w-0 flex-1`} placeholder="What is it about? (optional)" value={topic} onChange={(e) => setTopic(e.target.value)} />
                  <button type="button" className={primary} disabled={busy === `write-${g.id}`} onClick={() => void write(g)}>{busy === `write-${g.id}` ? 'Writing…' : 'Write it'}</button>
                </div>
                {g.links_allowed !== true && <p className="text-xs text-slate-500">This group's link rule is not "allowed," so the posts have no link.</p>}
                {variants && VARIANTS.map((v) => (
                  <div key={v.key} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">{v.label} <span className="font-normal text-slate-500">· {v.hint}</span></p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{variants[v.key].text}</p>
                    {variants[v.key].voiceIssues.length > 0 && <p className="mt-2 text-xs text-amber-700">Check these words: {variants[v.key].voiceIssues.join(', ')}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className={btn} onClick={() => void copy(variants[v.key].text)}><Clipboard className="h-4 w-4" /> Copy</button>
                      <button type="button" className={btn} onClick={() => void posted(g, v.key, variants[v.key].text)}><Check className="h-4 w-4" /> I posted this</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default FbGroupsPanel;
