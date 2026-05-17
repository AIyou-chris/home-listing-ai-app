import { buildApiUrl } from '../../lib/api';
import { isDemoModeActive } from '../../demo/useDemoMode';
import { getDemoListingPerformance } from '../../demo/demoData';
import { resolveAgentId, defaultJsonHeaders, withAgentQuery, parseResponse } from './utils';

export interface ListingPerformanceMetrics {
  leads_count: number;
  appointments_count: number;
  appointments_confirmed: number;
  status_breakdown: Record<string, number>;
  qr_usage: number | null;
  leads_by_source?: Record<string, number>;
  showing_requests_count?: number;
  last_lead_captured_at?: string | null;
  top_source?: {
    label: string;
    count: number;
  };
  updated_at?: string;
}

export const fetchListingPerformance = async (
  listingId: string,
  options: { range?: '7d' | '30d' } = {},
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return getDemoListingPerformance(listingId, options.range || '30d');
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const range = options.range || '30d';
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/performance?range=${encodeURIComponent(range)}`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );
  return parseResponse<{
    success: boolean;
    listing_id: string;
    range: string;
    metrics: ListingPerformanceMetrics;
    breakdown?: {
      by_source_type: Array<{ source_type: string; total: number }>;
      by_source_key: Array<{ source_key: string; total: number }>;
      showing_requests_by_source_type?: Array<{ source_type: string; total: number }>;
      showing_requests_by_source_key?: Array<{ source_key: string; total: number }>;
    };
  }>(response);
};
