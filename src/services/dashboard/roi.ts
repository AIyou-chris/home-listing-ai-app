import { buildApiUrl } from '../../lib/api';
import { isDemoModeActive } from '../../demo/useDemoMode';
import { getDemoRoiSummary } from '../../demo/demoData';
import { resolveAgentId, authHeaders, withAgentQuery, parseResponse } from './utils';

export interface RoiMetrics {
  leads_captured: number;
  leads_contacted: number;
  appointments_set: number;
  appointments_confirmed: number;
  reschedule_requests: number;
  reminder_success_rate: number;
  time_to_first_action_minutes: number | null;
  unworked_leads: number;
  top_listing_id: string | null;
  top_listing_leads: number;
}

export interface DashboardRoiSummary {
  range: '7d' | '30d';
  leads_captured: number;
  appointments_set: number;
  confirmations: number;
  top_source: {
    label: string;
    count: number;
  };
  last_lead_at?: string | null;
  updated_at: string;
}

export interface BillingValueProofSnapshot {
  range: '7d' | '30d';
  plan: {
    id: string;
    name: string;
    status: string;
    current_period_end: string | null;
  };
  usage: Record<string, { used: number; limit: number; percent: number }>;
  roi: DashboardRoiSummary;
}

export const fetchRoiMetrics = async (timeframe: '1d' | '7d' | '14d' | '30d' = '7d', agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/roi-metrics?timeframe=${timeframe}`, agentId)), {
    headers: await authHeaders(agentId)
  });
  return parseResponse<{ success: boolean; metrics: RoiMetrics }>(response);
};

export const fetchDashboardRoi = async (range: '7d' | '30d' = '7d', agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      ...getDemoRoiSummary(range)
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/roi?range=${encodeURIComponent(range)}`, agentId)), {
    headers: await authHeaders(agentId)
  });
  return parseResponse<{ success: boolean } & DashboardRoiSummary>(response);
};

export const fetchBillingValueProof = async (range: '7d' | '30d' = '30d', agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/billing/value-proof?range=${encodeURIComponent(range)}`, agentId)),
    { headers: await authHeaders(agentId) }
  );
  return parseResponse<{ success: boolean } & BillingValueProofSnapshot>(response);
};
