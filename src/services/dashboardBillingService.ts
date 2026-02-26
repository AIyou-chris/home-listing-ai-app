import { buildApiUrl } from '../lib/api';
import { supabase } from './supabase';

export type PlanId = 'free' | 'starter' | 'pro';

export interface UsageMeter {
  used: number;
  limit: number;
}

export interface DashboardBillingSnapshot {
  plan: {
    id: PlanId;
    name: string;
    status: string;
    price_monthly_usd: number;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  };
  usage: {
    active_listings: UsageMeter;
    reports_per_month: UsageMeter;
    reminder_calls_per_month: UsageMeter;
    stored_leads_cap: UsageMeter;
  };
  limits: Record<string, number>;
  warnings: Array<{ key: string; percent: number }>;
  copy?: {
    header: string;
    subhead: string;
    warning_banner: string;
  };
}

export interface LimitModalPayload {
  title: string;
  body: string;
  primary: string;
  secondary: string;
}

export class BillingLimitError extends Error {
  readonly feature: string;
  readonly modal: LimitModalPayload;
  readonly planId: string;
  readonly used: number;
  readonly limit: number;

  constructor(message: string, payload: {
    feature: string;
    modal: LimitModalPayload;
    planId: string;
    used: number;
    limit: number;
  }) {
    super(message);
    this.name = 'BillingLimitError';
    this.feature = payload.feature;
    this.modal = payload.modal;
    this.planId = payload.planId;
    this.used = payload.used;
    this.limit = payload.limit;
  }
}

const defaultModal: LimitModalPayload = {
  title: "You're at your limit.",
  body: 'Upgrade to keep capturing leads and sending reports without interruptions.',
  primary: 'Upgrade now',
  secondary: 'Not now'
};

const resolveAgentId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};

const withAgentQuery = (path: string, agentId: string | null): string => {
  if (!agentId) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}agentId=${encodeURIComponent(agentId)}`;
};

const parseJson = async (response: Response): Promise<Record<string, unknown>> => {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
};

const assertResponse = async (response: Response) => {
  if (response.ok) return;

  const payload = await parseJson(response);
  const errorCode = String(payload.error || `Request failed (${response.status})`);

  if (errorCode === 'limit_reached') {
    throw new BillingLimitError('limit_reached', {
      feature: String(payload.feature || 'unknown'),
      modal: (payload.modal as LimitModalPayload) || defaultModal,
      planId: String(payload.plan_id || 'free'),
      used: Number(payload.used || 0),
      limit: Number(payload.limit || 0)
    });
  }

  throw new Error(errorCode);
};

export const fetchDashboardBilling = async (): Promise<DashboardBillingSnapshot> => {
  const agentId = await resolveAgentId();
  const response = await fetch(buildApiUrl(withAgentQuery('/api/dashboard/billing', agentId)), {
    headers: agentId ? { 'x-user-id': agentId } : undefined
  });

  await assertResponse(response);
  return (await parseJson(response)) as unknown as DashboardBillingSnapshot;
};

export const createBillingCheckoutSession = async (planId: Exclude<PlanId, 'free'>): Promise<{ url: string }> => {
  const agentId = await resolveAgentId();
  const response = await fetch(buildApiUrl('/api/billing/checkout-session'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(agentId ? { 'x-user-id': agentId } : {})
    },
    body: JSON.stringify({
      plan_id: planId,
      success_url: `${window.location.origin}/dashboard/billing?checkout=success`,
      cancel_url: `${window.location.origin}/dashboard/billing?checkout=cancelled`
    })
  });

  await assertResponse(response);
  const payload = await parseJson(response);
  return {
    url: String(payload.url || '')
  };
};

export const createBillingPortalSession = async (): Promise<{ url: string }> => {
  const agentId = await resolveAgentId();
  const response = await fetch(buildApiUrl('/api/billing/portal-session'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(agentId ? { 'x-user-id': agentId } : {})
    },
    body: JSON.stringify({
      return_url: `${window.location.origin}/dashboard/billing`
    })
  });

  await assertResponse(response);
  const payload = await parseJson(response);
  return {
    url: String(payload.url || '')
  };
};

export const trackDashboardReportGeneration = async (listingId: string, referenceId?: string) => {
  const agentId = await resolveAgentId();
  const response = await fetch(buildApiUrl('/api/dashboard/reports/track-generation'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(agentId ? { 'x-user-id': agentId } : {})
    },
    body: JSON.stringify({
      listing_id: listingId,
      reference_id: referenceId || `report_${Date.now()}`
    })
  });

  await assertResponse(response);
  return parseJson(response);
};

export const checkBillingEntitlement = async (
  feature: string,
  requestedUnits = 1,
  context: Record<string, unknown> = {}
) => {
  const agentId = await resolveAgentId();
  const response = await fetch(buildApiUrl('/api/dashboard/billing/check-entitlement'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(agentId ? { 'x-user-id': agentId } : {})
    },
    body: JSON.stringify({
      feature,
      requested_units: requestedUnits,
      context
    })
  });

  await assertResponse(response);
  return parseJson(response);
};
