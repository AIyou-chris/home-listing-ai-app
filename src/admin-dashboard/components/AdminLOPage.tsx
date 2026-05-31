import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

type LOUser = {
  id: string; auth_user_id: string; first_name: string; last_name: string;
  email: string; company: string; account_type: string; payment_status: string;
  nmls_number: string; created_at: string;
  partnerCount: number; listingCount: number; preQualCount: number;
};
type Invite = {
  id: string; invited_email: string; invited_name: string; status: string;
  created_at: string; claimed_at: string | null;
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

const badge = (label: string, color: string) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${color}`}>{label}</span>
);

const planBadge = (status: string) => {
  if (status === 'trialing') return badge('Trial', 'bg-blue-100 text-blue-700');
  if (status === 'active') return badge('Active', 'bg-emerald-100 text-emerald-700');
  if (status === 'past_due') return badge('Past Due', 'bg-red-100 text-red-700');
  return badge(status || 'No Plan', 'bg-slate-100 text-slate-500');
};

const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const AdminLOPage: React.FC = () => {
  const [tab, setTab] = useState<'users' | 'invites' | 'prequals' | 'offices'>('users');
  const [los, setLos] = useState<LOUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [preQuals, setPreQuals] = useState<PreQual[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('sb-yocchddxdsaldgsibmmc-auth-token');
    try { return { 'Authorization': `Bearer ${JSON.parse(token || '{}')?.access_token}`, 'Content-Type': 'application/json' }; }
    catch { return { 'Content-Type': 'application/json' }; }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const headers = getHeaders();
      try {
        const [r1, r2, r3, r4] = await Promise.all([
          fetch(`${API}/api/admin/lo/users`, { headers }),
          fetch(`${API}/api/admin/lo/invites`, { headers }),
          fetch(`${API}/api/admin/lo/pre-quals`, { headers }),
          fetch(`${API}/api/admin/lo/offices`, { headers }),
        ]);
        const [d1, d2, d3, d4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()]);
        setLos(d1.los || []);
        setInvites(d2.invites || []);
        setPreQuals(d3.preQuals || []);
        setOffices(d4.offices || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAll();
  }, []);

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

      {/* LO Users */}
      {tab === 'users' && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Name', 'Email', 'NMLS', 'Plan', 'Partners', 'Listings', 'Pre-Quals', 'Joined'].map(h => (
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
                </tr>
              ))}
              {los.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No LO accounts yet.</td></tr>
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
                {['Invited To', 'Sent By (LO)', 'Status', 'Sent', 'Claimed'].map(h => (
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
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmt(inv.created_at)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{inv.claimed_at ? fmt(inv.claimed_at) : '—'}</td>
                </tr>
              ))}
              {invites.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No invites sent yet.</td></tr>
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
    </div>
  );
};
