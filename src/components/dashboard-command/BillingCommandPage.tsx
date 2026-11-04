import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  fetchDashboardBilling,
  type DashboardBillingSnapshot,
  type PlanId
} from '../../services/dashboardBillingService';
import { LoIcon, LoIconTile, LoPageHeader, LoTag, loCard, loCardTint, loGhost, loSolid } from './loUi';
import { INCLUDED } from '../../lib/loPlanFeatures';
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
  reminder_calls_per_month: 'SMS used',
  stored_leads_cap: 'Stored leads'
};

const planMeta: Record<PlanId, { name: string; monthly: string; subtitle: string }> = {
  free: {
    name: 'Free',
    monthly: '$0/mo',
    subtitle: 'Start free and get your first WOW Link out the door.'
  },
  lo_lite: {
    name: 'HomeListingAI',
    monthly: '$99/mo',
    subtitle: '5 listings, 50 texts and 100 AI phone minutes a month, co-branded with your name.'
  },
  starter: {
    name: 'HomeListingAI',
    monthly: '$99/mo',
    subtitle: '5 listings, 50 texts and 100 AI phone minutes a month, co-branded with your name.'
  },
  pro: {
    name: 'HomeListingAI',
    monthly: '$99/mo',
    subtitle: '5 listings, 50 texts and 100 AI phone minutes a month, co-branded with your name.'
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
  if (key === 'reminder_calls_per_month') return `SMS: ${used}/${limit} used`;
  if (key === 'stored_leads_cap') return `Stored leads: ${used}/${limit} used`;
  return null;
};

const BillingCommandPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'lo_lite' | 'starter' | 'pro' | 'portal' | null>(null);
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

  const startUpgrade = async (plan: 'lo_lite' | 'starter' | 'pro') => {
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
        <div role="status" aria-label="Loading billing" className="space-y-5">
          <div className={`${loCard} h-12 w-48 animate-pulse bg-slate-100`} />
          <div className={`${loCard} h-64 animate-pulse bg-slate-100`} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${loCard} h-24 animate-pulse bg-slate-100`} />
            <div className={`${loCard} h-24 animate-pulse bg-slate-100`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-8">
      <LoPageHeader title="Billing" subtitle="Free account by default. Upgrade from here anytime." />

      {warningTriggered && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">We could not load your usage right now. Please try again in a minute.</div>
      )}

      <BillingValueProofWidget />

      <section className={loCardTint} aria-label="Current plan">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <LoIconTile name="credit_card" />
            <div>
              <p className="text-xs font-bold text-primary-800">Current plan</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-black text-slate-900">{currentPlan.name}</p>
                <LoTag tone={planStatus === 'Past due' ? 'red' : 'green'}>{planStatus}</LoTag>
              </div>
              <p className="mt-1 text-sm text-slate-700">{currentPlan.subtitle}</p>
              <p className="text-sm text-slate-700">
                {snapshot?.plan.current_period_end
                  ? `Next billing date: ${new Date(snapshot.plan.current_period_end).toLocaleDateString()}`
                  : 'No upcoming charge scheduled'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black tracking-tight text-slate-900">{currentPlan.monthly}</p>
            {(currentPlanId === 'free' || planStatus === 'Trialing') && (
              <p className="text-xs font-semibold text-slate-700">$99 regular / $69 launch (first 25 loan officers)</p>
            )}
          </div>
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-800">
              <LoIcon name="check_circle" className="text-xl text-green-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          {currentPlanId === 'free' ? (
            <button
              type="button"
              onClick={() => void startUpgrade('lo_lite')}
              disabled={busy !== null}
              className={loSolid}
            >
              {busy === 'lo_lite' ? 'Loading…' : 'Start plan — $99/mo'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={busy !== null}
                className={loSolid}
              >
                {busy === 'portal' ? 'Loading…' : 'Manage plan'}
              </button>
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={busy !== null}
                className={`${loGhost} !border-rose-300 !text-rose-700`}
              >
                Cancel
              </button>
            </>
          )}
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
            <article key={key} className={loCard}>
              <p className="text-3xl font-black tracking-tight text-slate-900">
                {used} <span className="text-base font-bold text-slate-700">/ {limit > 0 ? limit : 0}</span>
              </p>
              <p className="text-sm font-semibold text-slate-700">{meterLabels[key] || key}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${percent >= 90 ? 'bg-rose-600' : percent >= 80 ? 'bg-amber-600' : 'bg-emerald-600'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Your plan includes 50 outbound texts and 100 AI phone minutes per month. Only automated outbound texts count toward your limit. When you reach it, texts pause until next month.
      </section>
    </div>
  );
};

export default BillingCommandPage;
