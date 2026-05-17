import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buildApiUrl } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  intentLevel: string;
  intentScore: number | null;
  lastMessage: string | null;
  lastActiveAt: string;
  financing: boolean;
  hasAgent: boolean;
  createdAt: string;
}

interface DashboardData {
  listing: { address: string; price: number; beds: number; baths: number; sqft: number; photo: string | null; status: string };
  owner: { name: string; company: string | null } | null;
  stats: { views: number; leads: number; hotLeads: number };
  leads: Lead[];
}

const relativeTime = (iso: string): string => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

const intentStyle = (level: string): { bg: string; text: string; label: string; dot: string } => {
  const l = String(level).toLowerCase();
  if (l === 'hot') return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: '🔥 Hot', dot: 'bg-red-500' };
  if (l === 'warm') return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: '🌤 Warm', dot: 'bg-amber-500' };
  return { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', label: 'Cold', dot: 'bg-slate-300' };
};

const ListingDashboardPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }
    const load = () => {
      fetch(buildApiUrl(`/api/public/listing-dashboard/${token}`))
        .then(r => r.json())
        .then((d: { success?: boolean; error?: string } & Partial<DashboardData>) => {
          if (d.success && d.listing) {
            setData(d as DashboardData);
            document.title = `${d.listing!.address} — Live Dashboard`;
          } else {
            setError(d.error === 'dashboard_expired' ? 'This dashboard link has expired.' : 'Dashboard not found.');
          }
        })
        .catch(() => setError('Unable to load dashboard. Check your connection.'))
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 30000); // live refresh every 30s
    return () => clearInterval(interval);
  }, [token]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#eef2f7]">
      <LoadingSpinner size="xl" text="Loading dashboard…" />
    </div>
  );

  if (error || !data) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#eef2f7] px-6 text-center">
      <span className="material-symbols-outlined mb-4 text-5xl text-slate-300">analytics</span>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Dashboard Unavailable</h1>
      <p className="text-slate-500">{error || 'This link is invalid or has expired.'}</p>
    </div>
  );

  const { listing, owner, stats, leads } = data;

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="mx-auto max-w-[520px] pb-10">

        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-[#1e3a5f] px-5 pb-6 pt-7 text-white">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/10" />
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">Live · updates automatically</span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            {listing.photo
              ? <img src={listing.photo} alt={listing.address} className="h-16 w-24 flex-shrink-0 rounded-xl object-cover" />
              : <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">🏠</div>
            }
            <div className="min-w-0">
              <p className="truncate text-base font-black leading-tight">{listing.address}</p>
              <p className="mt-0.5 text-sm text-slate-300">
                ${listing.price.toLocaleString()}
                {listing.beds > 0 && ` · ${listing.beds}bd`}
                {listing.baths > 0 && ` ${listing.baths}ba`}
                {listing.sqft > 0 && ` · ${listing.sqft.toLocaleString()} sqft`}
              </p>
              {owner && <p className="mt-1 text-xs text-slate-400">{owner.name}{owner.company ? ` · ${owner.company}` : ''}</p>}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="-mt-4 grid grid-cols-3 gap-2.5 px-3.5">
          {[
            { v: stats.views.toLocaleString(), l: 'Views', c: 'text-slate-900' },
            { v: stats.leads.toLocaleString(), l: 'Leads', c: 'text-slate-900' },
            { v: stats.hotLeads.toLocaleString(), l: '🔥 Hot', c: 'text-red-600' },
          ].map(s => (
            <div key={s.l} className="rounded-2xl bg-white p-4 text-center shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
              <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Leads */}
        <div className="px-3.5 pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Warm Leads</h2>
            <span className="text-[11px] text-slate-400">Hottest first</span>
          </div>

          {leads.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
              <div className="mb-3 text-4xl">🌱</div>
              <p className="font-bold text-slate-700">No leads yet</p>
              <p className="mt-1 text-sm text-slate-400">As buyers chat with the AI or request showings, they'll appear here in real time.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {leads.map(lead => {
                const st = intentStyle(lead.intentLevel);
                return (
                  <div key={lead.id} className={`rounded-2xl border bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${st.dot}`}>
                        {lead.name[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">{lead.name}</p>
                          <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${st.bg} ${st.text}`}>{st.label}</span>
                        </div>
                        {lead.lastMessage && (
                          <p className="mt-1 line-clamp-2 text-[13px] italic text-slate-500">"{lead.lastMessage}"</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {lead.financing && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">💰 Asked financing</span>}
                          {lead.hasAgent
                            ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Has agent</span>
                            : <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">⭐ No agent yet</span>}
                          <span className="text-[11px] text-slate-400">· {relativeTime(lead.lastActiveAt)}</span>
                        </div>
                      </div>
                    </div>
                    {(lead.email || lead.phone) && (
                      <div className="mt-3 flex gap-2 border-t border-slate-50 pt-3">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex-1 rounded-lg bg-slate-900 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-slate-800">
                            📞 Call
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50">
                            ✉️ Email
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-6 px-3.5 text-center text-[11px] text-slate-400">
          🔒 Private dashboard · Powered by HomeListingAI
        </p>
      </div>
    </div>
  );
};

export default ListingDashboardPage;
