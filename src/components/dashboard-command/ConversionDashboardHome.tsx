import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLeadItem, RoiMetrics, fetchDashboardLeads, fetchRoiMetrics } from '../../services/dashboardCommandService';

const ConversionDashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<RoiMetrics | null>(null);
  const [unworked, setUnworked] = useState<DashboardLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [roiRes, leadsRes] = await Promise.all([
          fetchRoiMetrics('7d'),
          fetchDashboardLeads({ tab: 'All', status: 'New', sort: 'hot_first' })
        ]);
        setMetrics(roiRes.metrics || null);
        setUnworked((leadsRes.leads || []).slice(0, 8));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversion dashboard.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conversion Dashboard</h1>
          <p className="text-sm text-slate-600">Capture → worked → appointment set → confirmed.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard/leads')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Open Leads</button>
          <button onClick={() => navigate('/dashboard/appointments')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Open Appointments</button>
          <button onClick={() => navigate('/daily-pulse')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Legacy Pulse</button>
        </div>
      </div>

      {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading metrics...</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {!loading && !error && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Leads Captured</p><p className="mt-2 text-2xl font-bold">{metrics?.leads_captured ?? 0}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Leads Contacted</p><p className="mt-2 text-2xl font-bold">{metrics?.leads_contacted ?? 0}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Appointments Set</p><p className="mt-2 text-2xl font-bold">{metrics?.appointments_set ?? 0}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Confirmed</p><p className="mt-2 text-2xl font-bold text-emerald-600">{metrics?.appointments_confirmed ?? 0}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Reminder Success</p><p className="mt-2 text-2xl font-bold">{metrics?.reminder_success_rate ?? 0}%</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Unworked Leads</p><p className="mt-2 text-2xl font-bold text-rose-600">{metrics?.unworked_leads ?? 0}</p></div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-700">Unworked leads need attention now.</p>
            <p className="mt-1 text-xs text-rose-600">These are New leads with no agent action.</p>
            {metrics?.top_listing_id && (
              <button
                type="button"
                onClick={() => navigate(`/dashboard/listings/${metrics.top_listing_id}`)}
                className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
              >
                Top listing: {metrics.top_listing_id} ({metrics.top_listing_leads} appts)
              </button>
            )}
            <div className="mt-3 space-y-2">
              {unworked.length === 0 && <p className="text-sm text-rose-600">No unworked leads right now.</p>}
              {unworked.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
                  className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-rose-300"
                >
                  {lead.name} • {lead.listing?.address || 'No listing'} • {lead.last_activity_relative}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConversionDashboardHome;
