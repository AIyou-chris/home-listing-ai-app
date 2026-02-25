import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ListingPerformanceMetrics, fetchListingPerformance } from '../../services/dashboardCommandService';

const ListingPerformancePage: React.FC = () => {
  const { listingId = '' } = useParams<{ listingId: string }>();
  const [metrics, setMetrics] = useState<ListingPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!listingId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetchListingPerformance(listingId);
        setMetrics(response.metrics || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load listing performance.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [listingId]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Listing Performance</h1>
      <p className="text-sm text-slate-600">Listing ID: {listingId}</p>

      {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading...</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {!loading && !error && metrics && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Leads</p><p className="mt-2 text-2xl font-bold">{metrics.leads_count}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Appointments</p><p className="mt-2 text-2xl font-bold">{metrics.appointments_count}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Confirmed</p><p className="mt-2 text-2xl font-bold text-emerald-600">{metrics.appointments_confirmed}</p></div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Lead Status Breakdown</h2>
            <div className="mt-3 space-y-2">
              {Object.keys(metrics.status_breakdown || {}).length === 0 && <p className="text-sm text-slate-500">No status data yet.</p>}
              {Object.entries(metrics.status_breakdown || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{key}</span>
                  <span className="font-bold text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ListingPerformancePage;
