import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchListingShareKit,
  publishListingShareKit,
  sendListingTestLeadCapture,
  type ListingShareKitResponse
} from '../../services/dashboardCommandService';
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore';
import { ShareKitPanel } from '../dashboard/ShareKitPanel';
import UpgradePromptModal from '../billing/UpgradePromptModal';
import {
  BillingLimitError,
  createBillingCheckoutSession,
  fetchDashboardBilling
} from '../../services/dashboardBillingService';
import ListingPerformanceWidget from '../dashboard-widgets/ListingPerformanceWidget';

type TestCaptureContext = 'report_requested' | 'showing_requested';

const ListingPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { listingId = '' } = useParams<{ listingId: string }>();
  const listingRealtimeSignal = useDashboardRealtimeStore((state) =>
    listingId ? state.listingSignalsById[listingId] : undefined
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareKit, setShareKit] = useState<ListingShareKitResponse | null>(null);
  const [activeListingWarning, setActiveListingWarning] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    title: string;
    body: string;
    reasonLine: string | null;
    targetPlan: 'starter' | 'pro' | null;
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
    setLoading(true);
    setError(null);
    try {
      await loadShareKit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing dashboard.');
    } finally {
      setLoading(false);
    }
  }, [listingId, loadShareKit]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!listingRealtimeSignal) return;
    void loadShareKit();
  }, [listingRealtimeSignal, loadShareKit]);

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
      {activeListingWarning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">You’re close to your limit.</p>
          <p>Upgrade to keep everything running without interruptions.</p>
          <p className="mt-1 text-xs">{activeListingWarning}</p>
        </div>
      ) : null}
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
        latestVideo={shareKit?.latest_video || null}
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
            await loadShareKit();
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
            toast.error(err instanceof Error ? err.message : 'Failed to create test lead.');
          }
        }}
      />
      <ListingPerformanceWidget listingId={listingId} />

      <UpgradePromptModal
        isOpen={upgradeModal.open}
        title={upgradeModal.title}
        body={upgradeModal.body}
        reasonLine={upgradeModal.reasonLine}
        upgrading={upgradeLoading}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, open: false }))}
        onUpgrade={() => {
          if (!upgradeModal.targetPlan) {
            navigate('/dashboard/billing');
            return;
          }
          void (async () => {
            try {
              setUpgradeLoading(true);
              const checkout = await createBillingCheckoutSession(upgradeModal.targetPlan);
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
