import React, { useCallback, useEffect, useState } from 'react';
import { AuthService } from '../../services/authService';

type Invite = {
  id: string;
  lo_name: string | null;
  lo_email: string;
  lo_phone: string | null;
  lo_website: string | null;
  status: string;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const check = (d: string | null) =>
  d ? <span className="text-emerald-600 font-bold">✓ {fmt(d)}</span> : <span className="text-slate-300">—</span>;

const AdminLoOutreachPanel: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [sentLink, setSentLink] = useState('');
  const [error, setError] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auth = AuthService.getInstance();
      const res = await auth.makeAuthenticatedRequest('/api/admin/lo-outreach/invites');
      const d = await res.json() as { invites?: Invite[] };
      setInvites(d.invites || []);
    } catch (e) {
      console.error('[LO Outreach] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    setError('');
    setSentLink('');
    try {
      const auth = AuthService.getInstance();
      const res = await auth.makeAuthenticatedRequest('/api/admin/lo-outreach/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined
        })
      });
      const d = await res.json() as { success?: boolean; link?: string };
      if (!res.ok || !d.success) { setError("Couldn't send — try again."); return; }
      setSentLink(d.link || '');
      setName(''); setEmail(''); setPhone(''); setWebsite('');
      await load();
    } catch {
      setError("Couldn't send — try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">📨 LO Outreach</h2>
        <p className="mt-1 text-sm text-slate-500">Send a prospective loan officer a personalized pitch link. Track who opens it and who clicks through.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="LO name (optional)" value={name} onChange={e => setName(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="LO email address" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Phone (optional)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Website (optional)" type="url" value={website} onChange={e => setWebsite(e.target.value)} />
        </div>

        <button onClick={send} disabled={sending || !email.trim()} className="mt-4 w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-50 sm:w-auto sm:px-8">
          {sending ? 'Sending…' : '🚀 Send Link →'}
        </button>

        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        {sentLink && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <span className="text-sm font-semibold text-emerald-700">✅ Link sent!</span>
            <button onClick={() => { navigator.clipboard.writeText(sentLink); }} className="ml-auto rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">📋 Copy link</button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex w-full items-center gap-2 border-b border-slate-100 px-6 py-4 text-left hover:bg-slate-50"
        >
          <span className={`inline-block text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
          <h3 className="text-sm font-bold text-slate-900">Sent invites</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{invites.length}</span>
        </button>
        {!open ? null : loading ? (
          <p className="px-6 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['LO', 'Contact', 'Sent', 'Opened', 'Clicked'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{inv.lo_name || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-600">{inv.lo_email}</p>
                    <p className="text-xs text-slate-400">{inv.lo_phone || inv.lo_website || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmt(inv.created_at)}</td>
                  <td className="px-4 py-3 text-xs">{check(inv.opened_at)}</td>
                  <td className="px-4 py-3 text-xs">{check(inv.clicked_at)}</td>
                </tr>
              ))}
              {invites.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No invites sent yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminLoOutreachPanel;
