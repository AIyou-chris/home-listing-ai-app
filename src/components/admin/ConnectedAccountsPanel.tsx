import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, Camera, Link2, Play, RefreshCw, Share2, Unplug } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabase';
import { buildApiUrl } from '../../lib/api';

// HomeListingAI's own social accounts. Everyone on the team shares these: connect once for the company.
// Same connect flow as the An AI You admin. Connecting never posts anything.

type Platform = 'facebook' | 'instagram' | 'youtube' | 'linkedin';
type Connection = {
  platform: Platform; configured: boolean; setupNeeded: string | null; connected: boolean;
  status: 'connected' | 'needs_reconnect' | 'revoked' | 'not_connected';
  accountLabel: string | null; lastError: string | null;
};

const DETAILS: Record<Platform, { label: string; help: string; icon: React.ReactNode }> = {
  facebook: { label: 'Facebook', help: 'Post to the Facebook Page you manage.', icon: <Share2 className="h-5 w-5" /> },
  instagram: { label: 'Instagram', help: 'A professional Instagram account linked to a Facebook Page.', icon: <Camera className="h-5 w-5" /> },
  youtube: { label: 'YouTube', help: 'Upload approved videos and Shorts.', icon: <Play className="h-5 w-5" /> },
  linkedin: { label: 'LinkedIn', help: 'Post approved content to LinkedIn.', icon: <Briefcase className="h-5 w-5" /> }
};

const authHeader = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const AutoPostSwitch: React.FC = () => {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void (async () => {
      try { const res = await fetch(buildApiUrl('/api/admin/house-social/auto-post'), { headers: await authHeader() }); const j = await res.json(); setOn(j.enabled === true); } catch { setOn(null); }
    })();
  }, []);
  if (on === null) return null;
  const flip = async () => {
    const next = !on;
    if (next && !window.confirm('Turn auto-posting ON? Campaigns you scheduled will post to your accounts at their time.')) return;
    setBusy(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/house-social/auto-post'), { method: 'POST', headers: { ...(await authHeader()), 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next }) });
      if (!res.ok) throw new Error('failed');
      setOn(next); toast.success(next ? 'Auto-posting is ON' : 'Auto-posting is OFF');
    } catch { toast.error('Could not change that'); } finally { setBusy(false); }
  };
  return (
    <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${on ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
      <div>
        <p className="text-base font-bold text-slate-900">Auto-posting is {on ? 'ON' : 'OFF'}</p>
        <p className="text-sm text-slate-600">{on ? 'Scheduled campaigns post at their time. Turn it off to stop them. "Post now" always works.' : 'Scheduled campaigns wait. Nothing posts by itself. "Post now" still works.'}</p>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label="Auto-posting" disabled={busy} onClick={() => void flip()} className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${on ? 'bg-emerald-600' : 'bg-slate-400'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${on ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
};

const ConnectedAccountsPanel: React.FC = () => {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [busy, setBusy] = useState<Platform | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await fetch(buildApiUrl('/api/admin/house-social/connections'), { headers: await authHeader() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load connected accounts');
      setConnections(data.connections || []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load connected accounts');
      setConnections([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const query = new URLSearchParams(window.location.search);
    const result = query.get('result');
    if (result) {
      if (result === 'connected') toast.success('Account connected');
      else if (result === 'cancelled') toast('Nothing changed');
      else toast.error(query.get('message') || 'That account could not be connected');
      ['social', 'result', 'message'].forEach((k) => query.delete(k));
      const rest = query.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
    }
  }, [load]);

  const connect = async (platform: Platform) => {
    setBusy(platform);
    try {
      const res = await fetch(buildApiUrl(`/api/admin/house-social/connections/${platform}/connect`), { method: 'POST', headers: await authHeader() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start the connection');
      window.location.assign(data.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start the connection');
      setBusy(null);
    }
  };

  const disconnect = async (c: Connection) => {
    if (!window.confirm(`Disconnect ${DETAILS[c.platform].label}? Automatic posting to it will stop.`)) return;
    setBusy(c.platform);
    try {
      const res = await fetch(buildApiUrl(`/api/admin/house-social/connections/${c.platform}`), { method: 'DELETE', headers: await authHeader() });
      if (!res.ok) throw new Error('Could not disconnect that account');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not disconnect that account');
    } finally { setBusy(null); }
  };

  return (
    <section>
      <h3 className="text-xl font-bold text-slate-900">Connected accounts</h3>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">Connect HomeListingAI's own accounts. Everyone on the team shares these. Connect once for the company.</p>

      <AutoPostSwitch />

      {loadError && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white"><RefreshCw className="h-4 w-4" /> Try again</button>
        </div>
      )}

      {!connections ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {connections.map((c) => {
            const d = DETAILS[c.platform];
            const working = busy === c.platform;
            const reconnect = c.status === 'needs_reconnect' || c.status === 'revoked';
            return (
              <article key={c.platform} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">{d.icon}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.connected ? 'bg-emerald-50 text-emerald-700' : reconnect ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {c.connected ? 'Connected' : reconnect ? 'Reconnect' : c.configured ? 'Not connected' : 'Setup needed'}
                    </span>
                  </div>
                  <h4 className="mt-3 text-lg font-bold text-slate-900">{d.label}</h4>
                  <p className="text-sm text-slate-600">{c.accountLabel || d.help}</p>
                  {c.lastError && <p className="mt-2 text-xs text-amber-700">{c.lastError}</p>}
                  {!c.configured && c.setupNeeded && <p className="mt-2 text-xs text-slate-500">Missing: {c.setupNeeded}</p>}
                </div>
                <div className="mt-4">
                  {c.connected ? (
                    <button type="button" onClick={() => void disconnect(c)} disabled={working} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Unplug className="h-4 w-4" /> {working ? 'Disconnecting…' : 'Disconnect'}</button>
                  ) : (
                    <button type="button" onClick={() => void connect(c.platform)} disabled={working || !c.configured} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"><Link2 className="h-4 w-4" /> {working ? 'Opening…' : reconnect ? 'Reconnect' : 'Connect'}</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Connecting an account does not post anything. These are the company accounts, kept apart from every customer's.</p>
    </section>
  );
};

export default ConnectedAccountsPanel;
