import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BillingSettings } from '../../types';
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  deleteDashboardAccount,
  fetchDashboardBilling,
  type DashboardBillingSnapshot,
  type PlanId
} from '../../services/dashboardBillingService';
import { supabase } from '../../services/supabase';
import { fetchOnboardingState } from '../../services/onboardingService';
import { fetchMyInvoices, formatCents, type Invoice } from '../../services/loInvoiceService';
import { FeatureSection } from './SettingsCommon';
import { LoRow, LoTag, loCard } from '../dashboard-command/loUi';

interface BillingSettingsProps {
  settings: BillingSettings;
  onSave: (settings: BillingSettings) => Promise<void>;
  onBack?: () => void;
  isLoading?: boolean;
  isBlueprintMode?: boolean;
  agentProfile?: unknown;
}

type PaidPlanId = Exclude<PlanId, 'free'>;

const planLabels: Record<PlanId, string> = {
  free: 'Free',
  lo_lite: 'HomeListingAI — $99/mo',
  starter: 'HomeListingAI — $99/mo',
  pro: 'HomeListingAI — $99/mo'
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  trialing: 'Active',
  free: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelled',
  cancel_pending: 'Cancel scheduled'
};

const inferPlanFromSettings = (settings: BillingSettings): PlanId => {
  const name = String(settings.planName || '').toLowerCase();
  if (name.includes('team') || name.includes('pro') || name.includes('299')) return 'pro';
  if (name.includes('lite') || name.includes('79')) return 'lo_lite';
  if (name.includes('starter') || name.includes('lo') || name.includes('39') || name.includes('149')) return 'starter';
  return 'free';
};

const BillingSettingsPage: React.FC<BillingSettingsProps> = ({
  settings,
  onSave: _onSave,
  onBack: _onBack,
  isLoading: _isLoading,
  isBlueprintMode,
  agentProfile: _agentProfile
}) => {
  const [snapshot, setSnapshot] = useState<DashboardBillingSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'lo_lite' | 'starter' | 'pro' | 'portal' | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (isBlueprintMode) {
      setAccountType('lo');
      return;
    }
    let cancelled = false;
    fetchOnboardingState()
      .then((state) => { if (!cancelled) setAccountType(state?.account_type || 'realtor'); })
      .catch(() => { if (!cancelled) setAccountType('lo'); }); // can't tell: show the full page
    return () => { cancelled = true; };
  }, [isBlueprintMode]);

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

  const planButtons = useMemo(() => {
    return {
      liteDisabled: busy !== null || currentPlanId === 'lo_lite',
      starterDisabled: busy !== null || currentPlanId === 'starter',
      proDisabled: busy !== null || currentPlanId === 'pro'
    };
  }, [busy, currentPlanId]);

  const deleteEnabled = deleteConfirmation.trim().toUpperCase() === 'DELETE' && !deleteBusy;

  const handleDeleteAccount = async () => {
    setError(null);
    if (!deleteEnabled) {
      setError('Type DELETE to confirm account removal.');
      return;
    }

    try {
      setDeleteBusy(true);
      await deleteDashboardAccount('DELETE');
      await supabase.auth.signOut();
      window.location.href = '/signin?reason=account_deleted';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account.');
      setDeleteBusy(false);
    }
  };

  const dangerZone = (
    <FeatureSection title="Danger zone" icon="warning">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-rose-900">Delete account</h3>
          <p className="mt-1 text-sm text-rose-700">
            This permanently deletes your account, listings, leads, and billing profile.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-rose-700">
            Type DELETE to confirm
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="DELETE"
              className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 sm:max-w-xs"
            />
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={!deleteEnabled}
              className="rounded-lg border border-rose-300 bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteBusy ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </div>
      </FeatureSection>
  );

  // Realtor agents do not buy a plan. Their loan officer covers the tools, and any cost they share
  // with the loan officer arrives as an invoice they pay the loan officer directly.
  const isFreeAgent = accountType !== null && accountType !== 'lo' && accountType !== 'office' && !loadingSnapshot && currentPlanId === 'free';

  useEffect(() => {
    if (!isFreeAgent) return;
    let cancelled = false;
    void fetchMyInvoices().then((rows) => { if (!cancelled) setMyInvoices(rows); });
    return () => { cancelled = true; };
  }, [isFreeAgent]);

  if (accountType === null || (loadingSnapshot && !isBlueprintMode)) {
    return (
      <div className="space-y-5 p-4 sm:p-6" role="status" aria-label="Loading billing">
        <div className={`${loCard} h-28 animate-pulse bg-slate-100`} />
        <div className={`${loCard} h-40 animate-pulse bg-slate-100`} />
      </div>
    );
  }

  if (isFreeAgent) {
    return (
      <div className="space-y-5 p-4 animate-fadeIn sm:p-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Billing</h2>
          <p className="mt-1 text-sm text-slate-600">There is nothing to buy here.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        <FeatureSection title="Your plan" icon="credit_card">
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
            <h3 className="text-xl font-bold text-slate-900">Included with your loan officer</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your listings, lead capture and share kit are covered. You do not pay HomeListingAI.
            </p>
          </div>
        </FeatureSection>

        <FeatureSection title="Invoices from your loan officer" icon="receipt_long">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {myInvoices.length === 0 ? (
              <p className="p-6 text-sm text-slate-700">
                No invoices. If you and your loan officer split a marketing cost, their invoice will show up here and in your email.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {myInvoices.map((inv) => (
                  <li key={inv.link} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{inv.invoiceNumber} · {formatCents(inv.totalCents)}</p>
                      <p className="truncate text-xs text-slate-600">
                        From {inv.loName || 'your loan officer'}{inv.listingAddress ? ` · ${inv.listingAddress}` : ''}
                        {inv.dueDate ? ` · due ${inv.dueDate}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : inv.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {inv.status === 'paid' ? 'Paid' : inv.status === 'overdue' ? 'Overdue' : 'Open'}
                      </span>
                      <a href={inv.link} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 min-h-[44px] inline-flex items-center px-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                        View
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-slate-100 p-4 text-xs text-slate-600">
              You pay your loan officer directly, the way you agreed. HomeListingAI does not take or hold payments.
            </p>
          </div>
        </FeatureSection>

        {dangerZone}
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 animate-fadeIn sm:p-6">
      <div>
        <h2 className="text-4xl font-black tracking-tight text-slate-900">Billing</h2>
        <p className="mt-1 text-sm text-slate-600">Pick your plan, upgrade when you want, and manage billing from one place.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <FeatureSection title="Current plan" icon="credit_card">
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-primary-800">Current plan</p>
              <h3 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{currentPlanLabel}</h3>
              <p className="mt-2 text-sm text-slate-600">Status: {currentStatus}</p>
              <p className="text-sm text-slate-600">
                Next billing date: {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString() : isPaidPlan ? 'Not available' : 'N/A on Free'}
              </p>
            </div>
            {loadingSnapshot ? (
              <div role="status" aria-label="Loading billing status" className="h-12 w-40 animate-pulse rounded-xl bg-primary-100" />
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {!isPaidPlan ? (
              <>
                <button
                  type="button"
                  onClick={() => void startCheckout('lo_lite')}
                  disabled={planButtons.liteDisabled}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
                >
                  {busy === 'lo_lite' ? 'Opening checkout…' : 'Start plan — $99/mo'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={busy !== null}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-primary-500 hover:text-primary-700 disabled:opacity-60"
                >
                  {busy === 'portal' ? 'Opening…' : 'Manage plan'}
                </button>
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={busy !== null}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-300 bg-white px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </FeatureSection>

      <FeatureSection title="Billing history" icon="history">
        <div className="space-y-2">
          {settings.history && settings.history.length > 0 ? (
            settings.history.map((entry) => (
              <LoRow
                key={entry.id}
                icon="receipt_long"
                title={`${entry.description || 'Subscription'} · $${typeof entry.amount === 'number' ? entry.amount.toFixed(2) : entry.amount}`}
                description={entry.date}
              >
                <LoTag tone={entry.status === 'Paid' ? 'green' : entry.status === 'Pending' ? 'amber' : 'red'}>{entry.status}</LoTag>
                {entry.invoiceUrl ? (
                  <a href={entry.invoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center px-2 text-sm font-bold text-primary-700 hover:underline">
                    Download
                  </a>
                ) : (
                  <span className="text-sm text-slate-600">Unavailable</span>
                )}
              </LoRow>
            ))
          ) : (
            <div className={`${loCard} text-center text-sm text-slate-700`}>No billing history available yet.</div>
          )}
        </div>
      </FeatureSection>

      {dangerZone}
    </div>
  );
};

export default BillingSettingsPage;
