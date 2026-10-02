import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode';
import {
  fetchListingShareKit,
  publishListingShareKit,
  type ListingShareKitResponse
} from '../../services/dashboardCommandService';
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore';
import AgentShareKitSection from './AgentShareKitSection';
import UpgradePromptModal from '../billing/UpgradePromptModal';
import {
  BillingLimitError,
  createBillingCheckoutSession,
  fetchDashboardBilling
} from '../../services/dashboardBillingService';
import ListingPerformanceWidget from '../dashboard-widgets/ListingPerformanceWidget';
import ListingAlertPanel from './ListingAlertPanel';

const ListingPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const demoMode = useDemoMode();
  const { listingId = '' } = useParams<{ listingId: string }>();
  const listingRealtimeSignal = useDashboardRealtimeStore((state) =>
    listingId ? state.listingSignalsById[listingId] : undefined
  );

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareKit, setShareKit] = useState<ListingShareKitResponse | null>(null);
  const [activeListingWarning, setActiveListingWarning] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    title: string;
    body: string;
    reasonLine: string | null;
    targetPlan: 'lo_lite' | 'starter' | 'pro' | null;
  }>({
    open: false,
    title: "You're at your limit.",
    body: 'Upgrade to keep capturing leads and sending reports without interruptions.',
    reasonLine: null,
    targetPlan: null
  });

  const loadShareKit = useCallback(async () => {
    if (!listingId) return;
    const response = await fetchListingShareKit(listingId);
    setShareKit(response);
  }, [listingId]);

  const loadAll = useCallback(async () => {
    if (!listingId) return;
    setLoading((current) => current || !hasLoadedOnce);
    setError(null);
    try {
      await loadShareKit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing dashboard.');
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [hasLoadedOnce, listingId, loadShareKit]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!listingRealtimeSignal) return;
    void loadAll();
  }, [listingRealtimeSignal, loadAll]);

  useEffect(() => {
    let isMounted = true;
    const loadWarning = async () => {
      try {
        const snapshot = await fetchDashboardBilling();
        if (!isMounted) return;
        const meter = snapshot.usage?.active_listings;
        const warning = (snapshot.warnings || []).find((item) => item.key === 'active_listings' && Number(item.percent || 0) >= 80);
        if (!meter || !warning) {
          setActiveListingWarning(null);
          return;
        }
        setActiveListingWarning(`Active listings: ${Number(meter.used || 0)}/${Number(meter.limit || 0)} used`);
      } catch (_error) {
        if (isMounted) setActiveListingWarning(null);
      }
    };
    void loadWarning();
    return () => {
      isMounted = false;
    };
  }, []);

  const onPublish = async () => {
    if (!listingId) return;
    try {
      const published = await publishListingShareKit(listingId, true);
      setShareKit(published);
      toast.success('Listing published.');
    } catch (err) {
      if (err instanceof BillingLimitError) {
        setUpgradeModal({
          open: true,
          title: err.modal.title,
          body: err.modal.body,
          reasonLine: err.reasonLine || err.modal.reason_line || null,
          targetPlan: err.upgradePlanId
        });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Failed to publish listing.');
    }
  };

  if (loading && !hasLoadedOnce) {
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
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(buildDashboardPath('/listings', demoMode))}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          All Listings
        </button>
        <button
          type="button"
          onClick={() => navigate(buildDashboardPath(`/listings/${listingId}/edit`, demoMode))}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Edit Listing
        </button>
      </div>
      {activeListingWarning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">You’re close to your limit.</p>
          <p>Upgrade to keep everything running without interruptions.</p>
          <p className="mt-1 text-xs">{activeListingWarning}</p>
        </div>
      ) : null}
      <AgentShareKitSection listingId={listingId} isPublished={Boolean(shareKit?.is_published)} demoMode={demoMode} onPublish={onPublish} />
      <div id="listing-performance">
        <ListingPerformanceWidget listingId={listingId} />
      </div>
      {listingId && <ListingAlertPanel listingId={listingId} agentId={null} />}

      <UpgradePromptModal
        isOpen={upgradeModal.open}
        title={upgradeModal.title}
        body={upgradeModal.body}
        reasonLine={upgradeModal.reasonLine}
        allowPromoCode
        upgrading={upgradeLoading}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, open: false }))}
          onUpgrade={(promoCode) => {
            if (!upgradeModal.targetPlan) {
              navigate(buildDashboardPath('/settings/billing', demoMode));
              return;
            }
          void (async () => {
            try {
              setUpgradeLoading(true);
              const checkout = await createBillingCheckoutSession(upgradeModal.targetPlan, promoCode);
              if (!checkout.url) throw new Error('Missing checkout URL');
              window.location.href = checkout.url;
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to start checkout.');
            } finally {
              setUpgradeLoading(false);
            }
          })();
        }}
      />
    </div>
  );
};

export default ListingPerformancePage;
