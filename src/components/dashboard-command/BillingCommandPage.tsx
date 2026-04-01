import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  fetchDashboardBilling,
  type DashboardBillingSnapshot,
  type PlanId
} from '../../services/dashboardBillingService';
import BillingValueProofWidget from '../dashboard-widgets/BillingValueProofWidget';

const meterOrder: Array<keyof DashboardBillingSnapshot['usage']> = [
  'active_listings',
  'reports_per_month',
  'reminder_calls_per_month',
  'stored_leads_cap'
];

const meterLabels: Record<string, string> = {
  active_listings: 'Active listings',
  reports_per_month: 'Reports used',
  reminder_calls_per_month: 'Reminder calls used',
  stored_leads_cap: 'Stored leads'
};

const planMeta: Record<PlanId, { name: string; monthly: string; subtitle: string }> = {
  free: {
    name: 'Free',
    monthly: '$0/mo',
    subtitle: 'Start free and publish your first listing.'
  },
  starter: {
    name: 'Starter $39',
    monthly: '$39/mo',
    subtitle: 'More listings, reports, and faster growth.'
  },
  pro: {
    name: 'Pro $79',
    monthly: '$79/mo',
    subtitle: 'Higher limits, team support, and full automation.'
  }
};

const statusLabel: Record<string, string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Past due',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  free: 'Active'
};

const formatPercent = (used: number, limit: number) => {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

const formatWarningLine = (snapshot: DashboardBillingSnapshot, key: keyof DashboardBillingSnapshot['usage']) => {
  const meter = snapshot.usage?.[key];
  if (!meter) return null;
  const used = Number(meter.used || 0);
  const limit = Number(meter.limit || 0);
  if (limit <= 0) return null;
  if (key === 'active_listings') return `Active listings: ${used}/${limit} used`;
  if (key === 'reports_per_month') return `Reports: ${used}/${limit} used`;
  if (key === 'reminder_calls_per_month') return `Reminder calls: ${used}/${limit} used`;
  if (key === 'stored_leads_cap') return `Stored leads: ${used}/${limit} used`;
  return null;
};

const BillingCommandPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'starter' | 'pro' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardBillingSnapshot | null>(null);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchDashboardBilling();
      setSnapshot(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const currentPlanId: PlanId = (snapshot?.plan.id as PlanId) || 'free';
  const currentPlan = planMeta[currentPlanId] || planMeta.free;
  const planStatus = statusLabel[String(snapshot?.plan.status || 'active')] || String(snapshot?.plan.status || 'Active');

  const warningTriggered = useMemo(
    () => (snapshot?.warnings || []).some((item) => item.percent >= 80 && item.percent < 100),
    [snapshot]
  );
  const warningLines = useMemo(() => {
    if (!snapshot) return [];
    return (snapshot.warnings || [])
      .filter((item) => Number(item.percent || 0) >= 80 && Number(item.percent || 0) < 100)
      .map((item) => formatWarningLine(snapshot, item.key as keyof DashboardBillingSnapshot['usage']))
      .filter((line): line is string => Boolean(line));
  }, [snapshot]);

  const startUpgrade = async (plan: 'starter' | 'pro') => {
    try {
      setBusy(plan);
      const checkout = await createBillingCheckoutSession(plan);
      if (!checkout.url) {
        throw new Error('Missing checkout URL');
      }
      window.location.href = checkout.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout.');
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    try {
      setBusy('portal');
      const portal = await createBillingPortalSession();
      if (!portal.url) throw new Error('Missing billing portal URL');
      window.location.href = portal.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading billing…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">Free account by default. Upgrade from here anytime.</p>
      </header>

      {warningTriggered && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">You’re close to your limit.</p>
          <p>Upgrade to keep everything running without interruptions.</p>
          {warningLines.length > 0 ? (
            <div className="mt-1 space-y-0.5 text-xs">
              {warningLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <BillingValueProofWidget />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Current plan</p>
            <p className="text-2xl font-bold text-slate-900">{currentPlan.name}</p>
            <p className="mt-1 text-sm text-slate-600">Status: {planStatus}</p>
            <p className="text-sm text-slate-500">
              {snapshot?.plan.current_period_end
                ? `Next billing date: ${new Date(snapshot.plan.current_period_end).toLocaleDateString()}`
                : 'No upcoming charge scheduled'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentPlanId === 'free' ? (
              <>
                <button
                  type="button"
                  onClick={() => void startUpgrade('starter')}
                  disabled={busy !== null}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === 'starter' ? 'Loading…' : 'Upgrade to $39'}
                </button>
                <button
                  type="button"
                  onClick={() => void startUpgrade('pro')}
                  disabled={busy !== null}
                  className="rounded-lg bg-[#233074] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1b275e] disabled:opacity-50"
                >
                  {busy === 'pro' ? 'Loading…' : 'Upgrade to $79'}
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
                  {busy === 'portal' ? 'Loading…' : 'Manage plan'}
                </button>
                <button
                  type="button"
                  onClick={() => void startUpgrade(currentPlanId === 'starter' ? 'pro' : 'starter')}
                  disabled={busy !== null}
                  className="rounded-lg bg-[#233074] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1b275e] disabled:opacity-50"
                >
                  {currentPlanId === 'starter'
                    ? busy === 'pro' ? 'Loading…' : 'Change plan to $79'
                    : busy === 'starter' ? 'Loading…' : 'Change plan to $39'}
                </button>
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={busy !== null}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Plans</h2>
        <p className="mt-1 text-sm text-slate-600">Upgrade happens only from Dashboard → Settings → Billing.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-3 font-semibold">Feature</th>
                <th className="px-3 py-3 font-semibold">Free</th>
                <th className="px-3 py-3 font-semibold">Starter $39</th>
                <th className="px-3 py-3 font-semibold">Pro $79</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium">Listings allowed</td>
                <td className="px-3 py-3">1</td>
                <td className="px-3 py-3">10</td>
                <td className="px-3 py-3">50</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium">AI Listing Brain sources</td>
                <td className="px-3 py-3">1 source/listing</td>
                <td className="px-3 py-3">10 sources/listing</td>
                <td className="px-3 py-3">Unlimited</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium">Social video credits/month</td>
                <td className="px-3 py-3">2</td>
                <td className="px-3 py-3">25</td>
                <td className="px-3 py-3">100</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium">Multilingual support</td>
                <td className="px-3 py-3">Yes</td>
                <td className="px-3 py-3">Yes</td>
                <td className="px-3 py-3">Yes</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium">Fair-housing compliance scan</td>
                <td className="px-3 py-3">Coming soon</td>
                <td className="px-3 py-3">Coming soon</td>
                <td className="px-3 py-3">Coming soon</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium">Team / multi-agent branding</td>
                <td className="px-3 py-3">No</td>
                <td className="px-3 py-3">Limited</td>
                <td className="px-3 py-3">Full</td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-medium">Support</td>
                <td className="px-3 py-3">Email</td>
                <td className="px-3 py-3">Priority email</td>
                <td className="px-3 py-3">Priority + team support</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Free</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">$0/mo</p>
            <button type="button" disabled className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500">
              {currentPlanId === 'free' ? 'Current plan' : 'Included'}
            </button>
          </div>
          <div className="rounded-xl border border-primary-200 bg-primary-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-primary-700">Starter</p>
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-700">Most popular</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900">$39/mo</p>
            <button
              type="button"
              onClick={() => void startUpgrade('starter')}
              disabled={busy !== null || currentPlanId === 'starter'}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
            >
              {currentPlanId === 'starter' ? 'Current plan' : busy === 'starter' ? 'Loading…' : 'Choose plan'}
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pro</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">$79/mo</p>
            <button
              type="button"
              onClick={() => void startUpgrade('pro')}
              disabled={busy !== null || currentPlanId === 'pro'}
              className="mt-3 w-full rounded-lg bg-[#233074] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1b275e] disabled:opacity-50"
            >
              {currentPlanId === 'pro' ? 'Current plan' : busy === 'pro' ? 'Loading…' : 'Choose plan'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {meterOrder.map((key) => {
          const meter = snapshot?.usage[key];
          if (!meter) return null;
          const used = Number(meter.used || 0);
          const limit = Number(meter.limit || 0);
          const percent = formatPercent(used, limit);
          return (
            <article key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{meterLabels[key] || key}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {used} / {limit > 0 ? limit : 0}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${percent >= 90 ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        SMS alerts are available when enabled in your account settings.
      </section>
    </div>
  );
};

export default BillingCommandPage;
