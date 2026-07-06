import React, { useEffect, useState } from 'react';
import { buildApiUrl } from '../lib/api';
import { authHeaders } from '../services/dashboard/utils';
import { agentOnboardingService } from '../services/agentOnboardingService';

// ── LO trial countdown / trial-ended banner ───────────────────────────────────
// Renders inside the dashboard shell for LO accounts only:
//   trial      → countdown bar (dismissible per day; turns amber at ≤2 days)
//   none (LO)  → trial-ended bar, not dismissible, one-click checkout with the
//                plan remembered from signup (localStorage.hlai_preferred_plan)
// Paid tiers, agents, offices → renders nothing.

type PlanStatus = {
  success?: boolean;
  tier?: 'trial' | 'lo_lite' | 'lo' | 'lo_pro' | 'none';
  accountType?: string | null;
  slug?: string | null;
  trialDaysLeft?: number | null;
};

const PLAN_LABELS: Record<string, string> = {
  lo_lite: 'LO Lite — $79/mo',
  lo: 'LO — $149/mo',
  lo_pro: 'LO Pro — $299/mo'
};

const preferredPlan = (): 'lo_lite' | 'lo' | 'lo_pro' => {
  try {
    const v = localStorage.getItem('hlai_preferred_plan');
    if (v === 'lo' || v === 'lo_pro' || v === 'lo_lite') return v;
  } catch { /* private mode */ }
  return 'lo_lite';
};

const dismissKey = () => `hlai_trial_banner_dismissed_${new Date().toISOString().slice(0, 10)}`;

export const LoTrialBanner: React.FC = () => {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey()) === '1'; } catch { return false; }
  });
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders(null);
        const res = await fetch(buildApiUrl('/api/lo/plan-status'), { headers });
        if (!res.ok) return;
        const data = (await res.json()) as PlanStatus;
        if (!cancelled) setStatus(data);
      } catch { /* banner is best-effort — never break the dashboard */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!status || status.accountType !== 'lo') return null;
  const { tier } = status;
  if (tier !== 'trial' && tier !== 'none') return null;
  if (tier === 'trial' && dismissed) return null;

  const plan = preferredPlan();

  const startCheckout = async () => {
    if (!status.slug || busy) return;
    setBusy(true);
    try {
      const session = await agentOnboardingService.createCheckoutSession({ slug: status.slug, plan });
      if (session?.url) {
        window.location.href = session.url;
        return;
      }
      setCheckoutError(true);
    } catch {
      setCheckoutError(true);
    } finally {
      setBusy(false);
    }
  };

  const onDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(dismissKey(), '1'); } catch { /* private mode */ }
  };

  if (tier === 'none') {
    return (
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 text-white shadow-md">
        <p className="text-[13px] font-bold">
          Your free trial has ended — new WOW links and listings are paused.
        </p>
        <button
          onClick={startCheckout}
          disabled={busy}
          className="rounded-full bg-white px-4 py-1.5 text-[12px] font-extrabold text-red-700 transition-transform active:scale-95 disabled:opacity-60"
        >
          {busy ? 'Opening checkout…' : `Reactivate — ${PLAN_LABELS[plan]}`}
        </button>
        {checkoutError && (
          <span className="text-[11px] font-semibold text-red-100">
            Checkout unavailable — email homelistingai@gmail.com and we'll sort it out.
          </span>
        )}
      </div>
    );
  }

  const days = typeof status.trialDaysLeft === 'number' ? status.trialDaysLeft : 7;
  const urgent = days <= 2;
  return (
    <div
      className={`sticky top-0 z-30 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-2 text-white shadow-md ${
        urgent ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-cyan-600'
      }`}
    >
      <p className="text-[13px] font-bold">
        ⏳ {days === 0 ? 'Last day' : `${days} day${days === 1 ? '' : 's'} left`} in your free trial — full access, no card on file.
      </p>
      <button
        onClick={startCheckout}
        disabled={busy}
        className={`rounded-full bg-white px-4 py-1 text-[12px] font-extrabold transition-transform active:scale-95 disabled:opacity-60 ${
          urgent ? 'text-orange-700' : 'text-blue-700'
        }`}
      >
        {busy ? 'Opening checkout…' : 'Choose my plan'}
      </button>
      {checkoutError && (
        <span className="text-[11px] font-semibold text-white/90">
          Checkout unavailable — email homelistingai@gmail.com.
        </span>
      )}
      <button onClick={onDismiss} aria-label="Dismiss" className="ml-1 text-white/70 transition-colors hover:text-white">
        ✕
      </button>
    </div>
  );
};

export default LoTrialBanner;
