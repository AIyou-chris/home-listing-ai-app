import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BillingSettings } from '../../types';
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  fetchDashboardBilling,
  type DashboardBillingSnapshot,
  type PlanId
} from '../../services/dashboardBillingService';
import { FeatureSection } from './SettingsCommon';

interface BillingSettingsProps {
  settings: BillingSettings;
  onSave: (settings: BillingSettings) => Promise<void>;
  onBack?: () => void;
  isLoading?: boolean;
  isBlueprintMode?: boolean;
}

type PaidPlanId = Exclude<PlanId, 'free'>;

const planLabels: Record<PlanId, string> = {
  free: 'Free',
  starter: 'Pro $39',
  pro: 'Team $79'
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  trialing: 'Active',
  free: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelled',
  cancel_pending: 'Cancel scheduled'
};

const featureRows: Array<{ label: string; free: string; starter: string; pro: string }> = [
  { label: 'Listings allowed', free: '1', starter: '10', pro: '50' },
  { label: 'AI Listing Brain sources', free: '1 source/listing', starter: '10 sources/listing', pro: 'Unlimited' },
  { label: 'Social Video credits/month', free: '2', starter: '25', pro: '100' },
  { label: 'Multilingual support', free: 'Yes', starter: 'Yes', pro: 'Yes' },
  { label: 'Fair-housing compliance scan', free: 'Coming soon', starter: 'Coming soon', pro: 'Coming soon' },
  { label: 'Team / multi-agent branding', free: 'No', starter: 'Limited', pro: 'Full' },
  { label: 'Support level', free: 'Email (48h)', starter: 'Priority email', pro: 'Priority + onboarding' }
];

const inferPlanFromSettings = (settings: BillingSettings): PlanId => {
  const name = String(settings.planName || '').toLowerCase();
  if (name.includes('team') || name.includes('pro') || name.includes('79')) return 'pro';
  if (name.includes('starter') || name.includes('39')) return 'starter';
  return 'free';
};

const BillingSettingsPage: React.FC<BillingSettingsProps> = ({
  settings,
  onSave: _onSave,
  onBack: _onBack,
  isLoading: _isLoading,
  isBlueprintMode
}) => {
  const [snapshot, setSnapshot] = useState<DashboardBillingSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'starter' | 'pro' | 'portal' | null>(null);
  const comparisonRef = useRef<HTMLDivElement | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (isBlueprintMode) {
      setLoadingSnapshot(false);
      return;
    }
    setLoadingSnapshot(true);
    setError(null);
    try {
      const payload = await fetchDashboardBilling();
      setSnapshot(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data.');
    } finally {
      setLoadingSnapshot(false);
    }
  }, [isBlueprintMode]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const currentPlanId: PlanId = snapshot?.plan.id || inferPlanFromSettings(settings);
  const currentPlanLabel = planLabels[currentPlanId];
  const currentStatus = statusLabels[snapshot?.plan.status || settings.planStatus || 'active'] || 'Active';
  const nextBillingDate = snapshot?.plan.current_period_end || settings.renewalDate || null;
  const isPaidPlan = currentPlanId !== 'free';

  const startCheckout = async (planId: PaidPlanId) => {
    try {
      setBusy(planId);
      const checkout = await createBillingCheckoutSession(planId);
      if (!checkout.url) {
        throw new Error('Missing checkout URL');
      }
      window.location.href = checkout.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open checkout.');
      setBusy(null);
    }
  };

  const openPortal = async () => {
    try {
      setBusy('portal');
      const portal = await createBillingPortalSession();
      if (!portal.url) {
        throw new Error('Missing billing portal URL');
      }
      window.location.href = portal.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal.');
      setBusy(null);
    }
  };

  const handleChangePlanClick = () => {
    comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const planButtons = useMemo(() => {
    return {
      starterDisabled: busy !== null || currentPlanId === 'starter',
      proDisabled: busy !== null || currentPlanId === 'pro'
    };
  }, [busy, currentPlanId]);

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing</h2>
        <p className="text-slate-500 mt-1">Pick your plan, upgrade when you want, and manage billing from one place.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <FeatureSection title="Current plan" icon="credit_card">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Current plan</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{currentPlanLabel}</h3>
              <p className="mt-2 text-sm text-slate-600">Status: {currentStatus}</p>
              <p className="text-sm text-slate-500">
                Next billing date: {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString() : isPaidPlan ? 'Not available' : 'N/A on Free'}
              </p>
            </div>
            {loadingSnapshot ? (
              <p className="text-sm text-slate-500">Loading billing status…</p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {!isPaidPlan ? (
              <>
                <button
                  type="button"
                  onClick={() => void startCheckout('starter')}
                  disabled={planButtons.starterDisabled}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === 'starter' ? 'Opening checkout…' : 'Upgrade to $39'}
                </button>
                <button
                  type="button"
                  onClick={() => void startCheckout('pro')}
                  disabled={planButtons.proDisabled}
                  className="rounded-lg bg-[#233074] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1b275e] disabled:opacity-50"
                >
                  {busy === 'pro' ? 'Opening checkout…' : 'Upgrade to $79'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={busy !== null}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === 'portal' ? 'Opening…' : 'Manage plan'}
                </button>
                <button
                  type="button"
                  onClick={handleChangePlanClick}
                  disabled={busy !== null}
                  className="rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                >
                  Change plan
                </button>
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={busy !== null}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </FeatureSection>

      <FeatureSection title="Plan comparison" icon="table_chart">
        <div ref={comparisonRef} className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Feature</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Free</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    <div className="inline-flex items-center gap-2">
                      <span>Pro $39</span>
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700">Most popular</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Team $79</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{row.label}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.free}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.starter}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.pro}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">Action</td>
                  <td className="px-4 py-4 text-sm text-slate-500">{currentPlanId === 'free' ? 'Current plan' : 'Free option'}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => void startCheckout('starter')}
                      disabled={planButtons.starterDisabled}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {currentPlanId === 'starter' ? 'Current plan' : busy === 'starter' ? 'Opening…' : 'Choose plan'}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => void startCheckout('pro')}
                      disabled={planButtons.proDisabled}
                      className="rounded-md bg-[#233074] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1b275e] disabled:opacity-50"
                    >
                      {currentPlanId === 'pro' ? 'Current plan' : busy === 'pro' ? 'Opening…' : 'Choose plan'}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </FeatureSection>

      <FeatureSection title="Billing history" icon="history">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {settings.history && settings.history.length > 0 ? (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {settings.history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{entry.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{entry.description || 'Subscription'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ${typeof entry.amount === 'number' ? entry.amount.toFixed(2) : entry.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.status === 'Paid'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {entry.invoiceUrl ? (
                        <a href={entry.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-900">
                          Download
                        </a>
                      ) : (
                        <span className="text-slate-400">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500">No billing history available yet.</div>
          )}
        </div>
      </FeatureSection>
    </div>
  );
};

export default BillingSettingsPage;
