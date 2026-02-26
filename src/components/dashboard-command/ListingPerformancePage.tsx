import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchListingPerformance,
  fetchListingShareKit,
  publishListingShareKit,
  sendListingTestLeadCapture,
  type ListingPerformanceMetrics,
  type ListingShareKitResponse
} from '../../services/dashboardCommandService';
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore';
import { ShareKitPanel } from '../dashboard/ShareKitPanel';
import UpgradePromptModal from '../billing/UpgradePromptModal';
import { BillingLimitError } from '../../services/dashboardBillingService';

type RangeValue = '7d' | '30d';
type TestCaptureContext = 'report_requested' | 'showing_requested';

const ListingPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { listingId = '' } = useParams<{ listingId: string }>();
  const listingRealtimeSignal = useDashboardRealtimeStore((state) =>
    listingId ? state.listingSignalsById[listingId] : undefined
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeValue>('30d');
  const [metrics, setMetrics] = useState<ListingPerformanceMetrics | null>(null);
  const [sourceBreakdown, setSourceBreakdown] = useState<Array<{ source_type: string; total: number }>>([]);
  const [sourceKeyBreakdown, setSourceKeyBreakdown] = useState<Array<{ source_key: string; total: number }>>([]);
  const [shareKit, setShareKit] = useState<ListingShareKitResponse | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; title: string; body: string }>({
    open: false,
    title: "You're at your limit.",
    body: 'Upgrade to keep capturing leads and sending reports without interruptions.'
  });

  const loadShareKit = useCallback(async () => {
    if (!listingId) return;
    const response = await fetchListingShareKit(listingId);
    setShareKit(response);
  }, [listingId]);

  const loadPerformance = useCallback(async () => {
    if (!listingId) return;
    const response = await fetchListingPerformance(listingId, { range });
    setMetrics(response.metrics || null);
    setSourceBreakdown(response.breakdown?.by_source_type || []);
    setSourceKeyBreakdown(response.breakdown?.by_source_key || []);
  }, [listingId, range]);

  const loadAll = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadShareKit(), loadPerformance()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing dashboard.');
    } finally {
      setLoading(false);
    }
  }, [listingId, loadPerformance, loadShareKit]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!listingRealtimeSignal) return;
    void loadPerformance();
  }, [listingRealtimeSignal, loadPerformance]);

  const onPublish = async () => {
    if (!listingId) return;
    try {
      const published = await publishListingShareKit(listingId, true);
      setShareKit(published);
      toast.success('Listing published.');
      await loadPerformance();
    } catch (err) {
      if (err instanceof BillingLimitError) {
        setUpgradeModal({
          open: true,
          title: err.modal.title,
          body: err.modal.body
        });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Failed to publish listing.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading listing performance…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:px-8">
      <ShareKitPanel
        listing={{
          id: listingId,
          title: 'Your Listing',
          address: '[Listing Address]',
          price: '[-]',
          status: shareKit?.is_published ? 'PUBLISHED' : 'DRAFT',
          slug: shareKit?.public_slug || listingId,
          beds: '-',
          baths: '-'
        }}
        onPublish={onPublish}
        onTestLeadSubmit={async (data) => {
          if (!listingId) return;
          try {
            await sendListingTestLeadCapture(listingId, {
              full_name: data.name,
              email: data.contact.includes('@') ? data.contact : undefined,
              phone: !data.contact.includes('@') ? data.contact : undefined,
              consent_sms: !data.contact.includes('@') ? true : undefined,
              context: data.context as TestCaptureContext,
              source_key: 'dashboard_test'
            });
            toast.success('Test lead created — open in Leads.');
            await loadPerformance();
          } catch (err) {
            if (err instanceof BillingLimitError) {
              setUpgradeModal({
                open: true,
                title: err.modal.title,
                body: err.modal.body
              });
              return;
            }
            toast.error(err instanceof Error ? err.message : 'Failed to create test lead.');
          }
        }}
        stats={{
          leadsCaptured: metrics?.leads_count || 0,
          topSource: sourceKeyBreakdown?.[0]?.source_key || 'None',
          lastLeadAgo: metrics?.last_lead_captured_at ? 'Recently' : 'N/A'
        }}
      />

      <div className="rounded-2xl border border-slate-800 bg-[#0B1121] p-5 shadow-sm font-sans mb-[200px]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Listing Performance</h2>
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setRange('7d')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${range === '7d' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'}`}
            >
              7 days
            </button>
            <button
              type="button"
              onClick={() => setRange('30d')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${range === '30d' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'}`}
            >
              30 days
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Leads captured</p>
            <p className="mt-1 text-2xl font-bold text-white">{metrics?.leads_count || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Appointments set</p>
            <p className="mt-1 text-2xl font-bold text-white">{metrics?.appointments_count || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Appointments confirmed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{metrics?.appointments_confirmed || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Last lead captured</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {metrics?.last_lead_captured_at ? new Date(metrics.last_lead_captured_at).toLocaleString() : 'No captures yet'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-white">Leads by source</h3>
            <div className="mt-3 space-y-2">
              {sourceBreakdown.length === 0 && <p className="text-sm text-slate-500">No source data yet.</p>}
              {sourceBreakdown.map((row) => (
                <div key={row.source_type} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-300">{row.source_type}</span>
                  <span className="font-bold text-white">{row.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-white">Top source keys</h3>
            <div className="mt-3 space-y-2">
              {sourceKeyBreakdown.length === 0 && <p className="text-sm text-slate-500">No source keys captured yet.</p>}
              {sourceKeyBreakdown.slice(0, 8).map((row) => (
                <div key={row.source_key} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-300">{row.source_key}</span>
                  <span className="font-bold text-white">{row.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <UpgradePromptModal
        isOpen={upgradeModal.open}
        title={upgradeModal.title}
        body={upgradeModal.body}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, open: false }))}
        onUpgrade={() => navigate('/dashboard/billing')}
      />
    </div>
  );
};

export default ListingPerformancePage;
