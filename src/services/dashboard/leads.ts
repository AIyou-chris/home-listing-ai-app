import { buildApiUrl } from '../../lib/api';
import { isDemoModeActive } from '../../demo/useDemoMode';
import {
  getDemoLeads,
  getDemoLeadDetail,
  getDemoLeadConversation,
  updateDemoLeadStatusById,
  logDemoAgentAction
} from '../../demo/demoData';
import { resolveAgentId, defaultJsonHeaders, withAgentQuery, parseResponse } from './utils';

export type LeadIntentLevel = 'Hot' | 'Warm' | 'Cold';

export interface DashboardLeadItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  source_type: string;
  intent_level: LeadIntentLevel;
  intent_score: number;
  timeline: string;
  financing: string;
  lead_summary: string | null;
  next_best_action: string | null;
  last_activity_at: string | null;
  last_activity_relative: string;
  last_message_preview: string | null;
  created_at: string;
  listing_id: string | null;
  last_agent_action_at?: string | null;
  listing: {
    id: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
}

export interface DashboardLeadEvent {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface DashboardLeadAppointment {
  id: string;
  status: string;
  normalizedStatus?: string;
  startsAt?: string | null;
  startIso?: string | null;
  location?: string | null;
  reminders?: Array<{
    id: string;
    reminder_type: string;
    status: string;
    scheduled_for: string;
    provider_response?: Record<string, unknown> | null;
  }>;
  lastReminderResult?: {
    status: string;
    reminder_type: string;
    scheduled_for: string;
    provider_response?: Record<string, unknown> | null;
  } | null;
}

export interface DashboardLeadDetail {
  lead: Record<string, unknown>;
  listing: Record<string, unknown> | null;
  intel: {
    intent_score: number;
    intent_level: LeadIntentLevel;
    intent_tags: string[];
    lead_summary: string | null;
    next_best_action: string | null;
    last_intent_at: string | null;
  };
  actionBar: {
    canCall: boolean;
    canEmail: boolean;
    statusOptions: string[];
    appointmentQuickCreate: boolean;
  };
  events: DashboardLeadEvent[];
  appointments: DashboardLeadAppointment[];
  upcoming_appointment: DashboardLeadAppointment | null;
  transcript: Array<Record<string, unknown>>;
  conversation_summary?: {
    summary_bullets: string[];
    last_question: string | null;
    intent_tags: string[];
    timeline: string | null;
    financing: string | null;
    working_with_agent: string | null;
    next_best_action: string | null;
    updated_at: string | null;
  } | null;
}

export interface DashboardLeadConversationMessage {
  id: string;
  sender: string;
  channel: string;
  text: string;
  is_capture_event: boolean;
  intent_tags: string[];
  confidence: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardLeadConversationResponse {
  success: boolean;
  conversation: {
    id: string;
    listing_id: string | null;
    visitor_id: string | null;
    channel: string;
    metadata?: Record<string, unknown>;
    started_at: string | null;
    last_activity_at: string | null;
  } | null;
  messages: DashboardLeadConversationMessage[];
}

interface LeadsFilterInput {
  tab?: 'New' | 'All';
  status?: string;
  intent?: string;
  listingId?: string;
  timeframe?: '24h' | '7d' | '30d' | 'all';
  sort?: 'hot_first' | 'newest';
}

export const fetchDashboardLeads = async (filters: LeadsFilterInput = {}, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    const allLeads = getDemoLeads();
    const tab = filters.tab || 'New';
    const filteredLeads =
      tab === 'All' ? allLeads : allLeads.filter((lead) => String(lead.status || '').toLowerCase() === 'new');
    return {
      success: true,
      leads: filteredLeads
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const params = new URLSearchParams();

  params.set('tab', filters.tab || 'New');
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.intent && filters.intent !== 'all') params.set('intent', filters.intent);
  if (filters.listingId && filters.listingId !== 'all') params.set('listingId', filters.listingId);
  if (filters.timeframe && filters.timeframe !== 'all') params.set('timeframe', filters.timeframe);
  if (filters.sort) params.set('sort', filters.sort);

  const url = buildApiUrl(withAgentQuery(`/api/dashboard/leads?${params.toString()}`, agentId));
  const response = await fetch(url, { headers: defaultJsonHeaders(agentId) });
  return parseResponse<{ success: boolean; leads: DashboardLeadItem[] }>(response);
};

export const fetchDashboardLeadDetail = async (leadId: string, refreshIntel = false, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return getDemoLeadDetail(leadId);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const query = new URLSearchParams();
  if (refreshIntel) query.set('refreshIntel', 'true');
  const path = `/api/dashboard/leads/${encodeURIComponent(leadId)}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(buildApiUrl(withAgentQuery(path, agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<DashboardLeadDetail>(response);
};

export const fetchDashboardLeadConversation = async (leadId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return getDemoLeadConversation(leadId);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/leads/${encodeURIComponent(leadId)}/conversation`, agentId)),
    {
      headers: defaultJsonHeaders(agentId)
    }
  );
  return parseResponse<DashboardLeadConversationResponse>(response);
};

export const updateDashboardLeadStatus = async (
  leadId: string,
  payload: { status: string; timeline?: string; financing?: string; working_with_agent?: string; notes?: string },
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return updateDemoLeadStatusById(leadId, payload);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/leads/${encodeURIComponent(leadId)}/status`, agentId)), {
    method: 'PATCH',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify(payload)
  });
  return parseResponse<{ success: boolean }>(response);
};

export const logDashboardAgentAction = async (
  payload: { lead_id: string; action: 'call_clicked' | 'email_clicked' | 'lead_opened' | 'status_changed' | 'appointment_created' | 'appointment_updated'; metadata?: Record<string, unknown> },
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return logDemoAgentAction(payload);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl('/api/dashboard/agent-actions'), {
    method: 'POST',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify({
      ...payload,
      agentId
    })
  });
  return parseResponse<{ success: boolean; action: { id: string | null; lead_id: string; action: string; created_at: string } }>(response);
};
