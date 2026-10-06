import React, { useEffect, useState } from 'react';
import { AuthService } from '../../services/authService';

type LOUser = {
  id: string; auth_user_id: string; first_name: string; last_name: string;
  email: string; company: string; account_type: string; payment_status: string;
  nmls_number: string; created_at: string;
  partnerCount: number; listingCount: number; preQualCount: number;
};
type Invite = {
  id: string; invited_email: string; invited_name: string; status: string;
  created_at: string; claimed_at: string | null; view_count?: number | null;
  lo: { first_name: string; last_name: string; email: string } | null;
};
type PreQual = {
  id: string; full_name: string; email: string; phone: string;
  credit_range: string; income_range: string; down_payment: string;
  purchase_timeline: string; property_type: string; created_at: string;
  lo: { first_name: string; last_name: string; email: string } | null;
};
type Office = {
  id: string; first_name: string; last_name: string; email: string;
  company: string; created_at: string; loCount: number;
};

type SupportReport = {
  lo: { id: string; name: string; email: string; phone: string | null; company: string | null; nmls: string | null; joined: string; lastSeen: string | null; slug: string | null }
  plan: string
  trialDaysLeft: number | null
  stats: { listings: number; invitesSent: number; invitesViewed: number; invitesClaimed: number; leads: number; lastLeadAt: string | null }
  checklist: Array<{ key: string; label: string; ok: boolean }>
  problems: string[]
  recentLeads: Array<{ id: string; name: string; status: string | null; intent: string | null; source: string | null; at: string }>
  invites: Array<{ id: string; name: string; claimed: boolean; views: number; at: string }>
  calls: Array<{ id: string; from: string | null; status: string | null; intent: string | null; error: string | null; at: string | null }>
}

const badge = (label: string, color: string) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${color}`}>{label}</span>
);

const planBadge = (status: string) => {
  if (status === 'trialing') return badge('Trial', 'bg-blue-100 text-blue-700');
  if (status === 'active') return badge('Active', 'bg-emerald-100 text-emerald-700');
  if (status === 'past_due') return badge('Past Due', 'bg-red-100 text-red-700');
  if (status === 'comp') return badge('Comped', 'bg-violet-100 text-violet-700');
  if (status === 'awaiting_payment') return badge('Trial / not paid', 'bg-amber-100 text-amber-700');
  return badge(status || 'No Plan', 'bg-slate-100 text-slate-500');
};

const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const SupportPanel: React.FC<{ loId: string; onClose: () => void }> = ({ loId, onClose }) => {
  const [report, setReport] = useState<SupportReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await AuthService.getInstance().makeAuthenticatedRequest(`/api/admin/lo/users/${loId}/support`)
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as SupportReport
        if (alive) setReport(data)
      } catch (e) {
        if (alive) setError('Could not load this account. Try again.')
        console.error('LO support view failed', e)
      }
    }
    void load()
    return () => { alive = false }
  }, [loId])

  const when = (d?: string | null) => (d ? fmt(d) : '—')

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Account check">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">{report ? report.lo.name : 'Loading…'}</h2>
            {report && <p className="text-sm text-slate-500">{report.lo.email}{report.lo.phone ? ` · ${report.lo.phone}` : ''}{report.lo.company ? ` · ${report.lo.company}` : ''}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {report && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">Plan</p><p className="font-bold text-slate-900">{report.plan}</p>{report.trialDaysLeft !== null && <p className="text-xs text-slate-500">{report.trialDaysLeft > 0 ? `${report.trialDaysLeft} trial days left` : 'Trial over'}</p>}</div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">Last seen</p><p className="font-bold text-slate-900">{when(report.lo.lastSeen)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">Listings</p><p className="font-bold text-slate-900">{report.stats.listings}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">Leads</p><p className="font-bold text-slate-900">{report.stats.leads}</p></div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">What looks wrong</h3>
              {report.problems.length === 0 ? (
                <p className="text-sm text-emerald-700">Nothing looks wrong.</p>
              ) : (
                <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {report.problems.map((p) => <li key={p}>• {p}</li>)}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">Setup</h3>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {report.checklist.map((c) => (
                  <li key={c.key} className="flex items-center gap-2"><span aria-hidden="true">{c.ok ? '✅' : '⬜'}</span><span className={c.ok ? 'text-slate-700' : 'font-semibold text-slate-900'}>{c.label}</span></li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">Recent leads</h3>
                {report.recentLeads.length === 0 ? <p className="text-sm text-slate-500">None yet.</p> : (
                  <ul className="space-y-1 text-sm">{report.recentLeads.map((l) => <li key={l.id} className="flex justify-between gap-2"><span className="truncate">{l.name}{l.intent ? ` · ${l.intent}` : ''}</span><span className="text-xs text-slate-400">{when(l.at)}</span></li>)}</ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">WOW Links sent</h3>
                {report.invites.length === 0 ? <p className="text-sm text-slate-500">None yet.</p> : (
                  <ul className="space-y-1 text-sm">{report.invites.map((i) => <li key={i.id} className="flex justify-between gap-2"><span className="truncate">{i.name}</span><span className="text-xs text-slate-500">{i.claimed ? 'Claimed' : i.views ? `${i.views} view${i.views === 1 ? '' : 's'}` : 'Not opened'}</span></li>)}</ul>
                )}
              </div>
            </div>

            {report.calls.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">Recent AI phone calls</h3>
                <ul className="space-y-1 text-sm">{report.calls.map((c) => <li key={c.id} className="flex justify-between gap-2"><span>{c.from || 'Unknown'} · {c.status || '—'}{c.error ? ` · ${c.error.slice(0, 60)}` : ''}</span><span className="text-xs text-slate-400">{when(c.at)}</span></li>)}</ul>
              </div>
            )}
            <p className="text-xs text-slate-400">Read only. Looking at an account is recorded in the audit log.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export const AdminLOPage: React.FC = () => {
  const [tab, setTab] = useState<'users' | 'invites' | 'prequals' | 'offices'>('users');
  const [los, setLos] = useState<LOUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [preQuals, setPreQuals] = useState<PreQual[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);

  const [errors, setErrors] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const auth = AuthService.getInstance();
      const failed: string[] = [];
      // Each list loads on its own: one broken list must not hide the others or look like "no data".
      const load = async <T,>(label: string, path: string, key: string, set: (rows: T[]) => void) => {
        try {
          const res = await auth.makeAuthenticatedRequest(path);
          if (!res.ok) throw new Error(String(res.status));
          const data = await res.json();
          set((data[key] as T[]) || []);
        } catch (e) {
          console.error(`LO Platform: ${label} failed`, e);
          failed.push(label);
        }
      };
      await Promise.all([
        load<LOUser>('LO users', '/api/admin/lo/users', 'los', setLos),
        load<Invite>('WOW invites', '/api/admin/lo/invites', 'invites', setInvites),
        load<PreQual>('pre-quals', '/api/admin/lo/pre-quals', 'preQuals', setPreQuals),
        load<Office>('offices', '/api/admin/lo/offices', 'offices', setOffices)
      ]);
      setErrors(failed);
      setLoading(false);
    };
    void fetchAll();
  }, [reloadKey]);

  const tabs = [
    { id: 'users', label: '🏦 LO Users', count: los.length },
    { id: 'invites', label: '🔗 WOW Invites', count: invites.length },
    { id: 'prequals', label: '📋 Pre-Quals', count: preQuals.length },
    { id: 'offices', label: '🏢 Offices', count: offices.length },
  ] as const;

  const q = search.toLowerCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">LO Platform</h1>
        <p className="text-slate-500 text-sm mt-1">Loan officer accounts, partner invites, pre-qual submissions, and office accounts.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === t.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-500'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search…"
        className="w-full max-w-sm px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
      />

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && errors.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load: {errors.join(', ')}. What is shown may be missing rows.{' '}
          <button type="button" className="underline font-semibold" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
        </div>
      )}

      {/* LO Users */}
      {tab === 'users' && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Name', 'Email', 'NMLS', 'Plan', 'Partners', 'Listings', 'Pre-Quals', 'Joined', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {los.filter(lo => `${lo.first_name} ${lo.last_name} ${lo.email} ${lo.company}`.toLowerCase().includes(q)).map(lo => (
                <tr key={lo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{lo.first_name} {lo.last_name}</td>
                  <td className="px-4 py-3 text-slate-500">{lo.email}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{lo.nmls_number || '—'}</td>
                  <td className="px-4 py-3">{planBadge(lo.payment_status)}</td>
                  <td className="px-4 py-3 font-bold text-primary-600">{lo.partnerCount}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{lo.listingCount}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{lo.preQualCount}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmt(lo.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setViewingId(lo.id)} className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100">Check account</button>
                  </td>
                </tr>
              ))}
              {los.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No LO accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* WOW Invites */}
      {tab === 'invites' && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Invited To', 'Sent By (LO)', 'Status', 'Opened', 'Sent', 'Claimed'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.filter(i => `${i.invited_email} ${i.invited_name} ${i.lo?.email}`.toLowerCase().includes(q)).map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{inv.invited_name || '—'}</p>
                    <p className="text-slate-400 text-xs">{inv.invited_email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.lo ? `${inv.lo.first_name} ${inv.lo.last_name}` : '—'}</td>
                  <td className="px-4 py-3">
                    {inv.status === 'claimed' && badge('Claimed ✓', 'bg-emerald-100 text-emerald-700')}
                    {inv.status === 'pending' && badge('Pending', 'bg-amber-100 text-amber-700')}
                    {inv.status === 'expired' && badge('Expired', 'bg-slate-100 text-slate-400')}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{inv.view_count ? `${inv.view_count} view${inv.view_count === 1 ? '' : 's'}` : 'Not yet'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmt(inv.created_at)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{inv.claimed_at ? fmt(inv.claimed_at) : '—'}</td>
                </tr>
              ))}
              {invites.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No invites sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pre-Quals */}
      {tab === 'prequals' && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Buyer', 'Contact', 'Credit', 'Income', 'Down Pmt', 'Timeline', 'LO', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preQuals.filter(pq => `${pq.full_name} ${pq.email} ${pq.lo?.email}`.toLowerCase().includes(q)).map(pq => (
                <tr key={pq.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{pq.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-600 text-xs">{pq.email}</p>
                    <p className="text-slate-400 text-xs">{pq.phone || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{pq.credit_range || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{pq.income_range || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{pq.down_payment || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{pq.purchase_timeline || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{pq.lo ? `${pq.lo.first_name} ${pq.lo.last_name}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmt(pq.created_at)}</td>
                </tr>
              ))}
              {preQuals.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No pre-qual submissions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Offices */}
      {tab === 'offices' && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Office / Branch', 'Email', 'Company', 'LOs', 'Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offices.filter(o => `${o.first_name} ${o.last_name} ${o.email} ${o.company}`.toLowerCase().includes(q)).map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{o.first_name} {o.last_name}</td>
                  <td className="px-4 py-3 text-slate-500">{o.email}</td>
                  <td className="px-4 py-3 text-slate-400">{o.company || '—'}</td>
                  <td className="px-4 py-3 font-bold text-primary-600">{o.loCount}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmt(o.created_at)}</td>
                </tr>
              ))}
              {offices.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No office accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {viewingId && <SupportPanel loId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
};
