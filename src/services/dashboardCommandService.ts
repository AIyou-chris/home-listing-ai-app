import { buildApiUrl } from '../lib/api';
import { supabase } from './supabase';
import { BillingLimitError } from './dashboardBillingService';

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
}

export interface DashboardAppointmentRow {
  id: string;
  startsAt?: string | null;
  startIso?: string | null;
  status: string;
  normalizedStatus?: string;
  location?: string | null;
  lead: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  listing: {
    id: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  last_reminder_outcome: {
    status: string;
    reminder_type: string;
    scheduled_for: string;
    provider_response?: Record<string, unknown> | null;
  } | null;
  reminder_statuses?: Array<{
    id: string;
    reminder_type: string;
    status: string;
    scheduled_for: string;
    provider_response?: Record<string, unknown> | null;
  }>;
  confirmation_status?: 'needs_confirmation' | 'confirmed' | 'unknown' | string;
}

export interface AppointmentReminderRow {
  id: string;
  appointment_id: string;
  reminder_type: 'voice' | 'sms' | 'email' | string;
  scheduled_for: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'suppressed' | 'canceled' | string;
  provider?: string | null;
  payload?: Record<string, unknown> | null;
  provider_response?: Record<string, unknown> | null;
  idempotency_key?: string | null;
  normalized_outcome?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CommandCenterLeadQueueItem {
  lead_id: string;
  listing_id: string | null;
  listing_address: string | null;
  full_name: string;
  intent_level: LeadIntentLevel;
  status: string;
  timeline: string;
  financing: string;
  source_type: string;
  last_activity_at: string | null;
  lead_summary_preview: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  last_agent_action_at: string | null;
}

export interface CommandCenterAppointmentQueueItem {
  appointment_id: string;
  lead_id: string | null;
  listing_id: string | null;
  listing_address: string | null;
  starts_at: string | null;
  status: string;
  lead_name: string;
  lead_phone: string | null;
  lead_email: string | null;
  last_reminder_outcome: string | null;
}

export interface DashboardCommandCenterSnapshot {
  stats: {
    new_leads_today: number;
    unworked_leads: number;
    appointments_today: number;
    confirmations_7d: number;
  };
  queues: {
    new_leads_to_work: CommandCenterLeadQueueItem[];
    appointments_coming_up: CommandCenterAppointmentQueueItem[];
    needs_attention: CommandCenterAppointmentQueueItem[];
  };
}

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

export interface ListingPerformanceMetrics {
  leads_count: number;
  appointments_count: number;
  appointments_confirmed: number;
  status_breakdown: Record<string, number>;
  qr_usage: number | null;
  leads_by_source?: Record<string, number>;
  last_lead_captured_at?: string | null;
}

export interface ListingSourceDefault {
  id: string | null;
  source_type: string;
  source_key: string;
}

export interface ListingShareKitResponse {
  success: boolean;
  listing_id: string;
  is_published: boolean;
  published_at: string | null;
  public_slug: string | null;
  share_url: string | null;
  qr_code_url: string | null;
  qr_code_svg: string | null;
  source_defaults: Record<string, ListingSourceDefault>;
}

export interface AutomationRecipe {
  id?: string;
  key: string;
  name: string;
  trigger: string;
  enabled: boolean;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
}

interface LeadsFilterInput {
  tab?: 'New' | 'All';
  status?: string;
  intent?: string;
  listingId?: string;
  timeframe?: '24h' | '7d' | '30d' | 'all';
  sort?: 'hot_first' | 'newest';
}

const defaultJsonHeaders = (agentId: string | null): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(agentId ? { 'x-user-id': agentId } : {})
});

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (String(payload.error || '') === 'limit_reached') {
      throw new BillingLimitError('limit_reached', {
        feature: String(payload.feature || 'unknown'),
        modal: (payload.modal as { title: string; body: string; primary: string; secondary: string }) || {
          title: "You're at your limit.",
          body: 'Upgrade to keep capturing leads and sending reports without interruptions.',
          primary: 'Upgrade now',
          secondary: 'Not now'
        },
        planId: String(payload.plan_id || 'free'),
        used: Number(payload.used || 0),
        limit: Number(payload.limit || 0)
      });
    }
    const textError = typeof payload.error === 'string' ? payload.error : '';
    throw new Error(textError || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
};

export const resolveAgentId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};

const withAgentQuery = (path: string, agentId: string | null): string => {
  if (!agentId) return path;
  const delimiter = path.includes('?') ? '&' : '?';
  return `${path}${delimiter}agentId=${encodeURIComponent(agentId)}`;
};

export const fetchDashboardLeads = async (filters: LeadsFilterInput = {}, agentIdOverride?: string | null) => {
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
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const query = new URLSearchParams();
  if (refreshIntel) query.set('refreshIntel', 'true');
  const path = `/api/dashboard/leads/${encodeURIComponent(leadId)}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(buildApiUrl(withAgentQuery(path, agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<DashboardLeadDetail>(response);
};

export const updateDashboardLeadStatus = async (
  leadId: string,
  payload: { status: string; timeline?: string; financing?: string; working_with_agent?: string },
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/leads/${encodeURIComponent(leadId)}/status`, agentId)), {
    method: 'PATCH',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify(payload)
  });
  return parseResponse<{ success: boolean }>(response);
};

export const createLeadAppointment = async (
  payload: {
    lead_id?: string;
    listing_id?: string;
    starts_at: string;
    timezone?: string;
    location?: string;
  },
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl('/api/appointments'), {
    method: 'POST',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify({ ...payload, agentId })
  });
  return parseResponse<{ success: boolean; appointment?: DashboardLeadAppointment }>(response);
};

export const updateAppointmentStatus = async (appointmentId: string, status: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(`/api/appointments/${encodeURIComponent(appointmentId)}`), {
    method: 'PUT',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify({ status, agentId })
  });
  return parseResponse<{ success: boolean }>(response);
};

export const fetchDashboardAppointments = async (
  options: { view?: 'today' | 'week' } = {},
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const view = options.view || 'week';
  const url = buildApiUrl(withAgentQuery(`/api/dashboard/appointments?view=${view}`, agentId));
  const response = await fetch(url, {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<{ success: boolean; appointments: DashboardAppointmentRow[]; counts: Record<string, number> }>(response);
};

export const fetchAutomationRecipes = async (agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery('/api/dashboard/automation-recipes', agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<{ success: boolean; recipes: AutomationRecipe[] }>(response);
};

export const updateAutomationRecipe = async (recipeKey: string, enabled: boolean, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/automation-recipes/${encodeURIComponent(recipeKey)}`, agentId)), {
    method: 'PATCH',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify({ enabled, agentId })
  });
  return parseResponse<{ success: boolean; recipe: AutomationRecipe }>(response);
};

export const fetchRoiMetrics = async (timeframe: '1d' | '7d' | '14d' | '30d' = '7d', agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/roi-metrics?timeframe=${timeframe}`, agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<{ success: boolean; metrics: RoiMetrics }>(response);
};

export const fetchListingPerformance = async (
  listingId: string,
  options: { range?: '7d' | '30d' } = {},
  agentIdOverride?: string | null
) => {
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
    };
  }>(response);
};

export const fetchListingShareKit = async (listingId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/share-kit`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );
  return parseResponse<ListingShareKitResponse>(response);
};

export const publishListingShareKit = async (listingId: string, isPublished = true, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/publish`, agentId)),
    {
      method: 'PATCH',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ is_published: isPublished, agentId })
    }
  );
  return parseResponse<ListingShareKitResponse>(response);
};

export const generateListingQrCode = async (
  listingId: string,
  payload: {
    source_type?: string;
    source_key?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  },
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/generate-qr`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ ...payload, agentId })
    }
  );
  return parseResponse<{
    success: boolean;
    listing_id: string;
    source_key: string;
    source_type: string;
    share_url: string;
    tracked_url: string;
    qr_code_url: string;
    qr_code_svg: string;
  }>(response);
};

export const sendListingTestLeadCapture = async (
  listingId: string,
  payload: {
    full_name?: string;
    email?: string;
    phone?: string;
    consent_sms?: boolean;
    context?: 'report_requested' | 'showing_requested';
    source_key?: string;
    source_type?: string;
    source_meta?: Record<string, unknown>;
  },
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/test-capture`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ ...payload, agentId })
    }
  );
  return parseResponse<{
    success: boolean;
    message: string;
    lead_id: string;
    is_deduped: boolean;
    status: string;
    intent_level: LeadIntentLevel;
    source_key: string | null;
    source_type: string;
  }>(response);
};

export const fetchCommandCenterSnapshot = async (agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery('/api/dashboard/command-center', agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<{ success: boolean } & DashboardCommandCenterSnapshot>(response);
};

export const logDashboardAgentAction = async (
  payload: { lead_id: string; action: 'call_clicked' | 'email_clicked' | 'lead_opened' | 'status_changed' | 'appointment_created' | 'appointment_updated'; metadata?: Record<string, unknown> },
  agentIdOverride?: string | null
) => {
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

export const retryDashboardReminder = async (appointmentId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(`/api/dashboard/reminders/${encodeURIComponent(appointmentId)}/retry`), {
    method: 'POST',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify({ agentId })
  });
  return parseResponse<{
    success: boolean;
    queued: boolean;
    duplicate: boolean;
    job_id: string | null;
    idempotency_key: string;
    reminder_id?: string | null;
  }>(response);
};

export const fetchAppointmentReminders = async (appointmentId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/appointments/${encodeURIComponent(appointmentId)}/reminders`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );
  return parseResponse<{ success: boolean; appointment_id: string; reminders: AppointmentReminderRow[] }>(response);
};

export const retryAppointmentReminder = async (
  appointmentId: string,
  reminderId: string,
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(`/api/dashboard/appointments/${encodeURIComponent(appointmentId)}/reminders/${encodeURIComponent(reminderId)}/retry`),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ agentId })
    }
  );
  return parseResponse<{
    success: boolean;
    queued: boolean;
    duplicate: boolean;
    job_id: string | null;
    reminder_id?: string | null;
    idempotency_key: string;
  }>(response);
};

export const sendAppointmentReminderNow = async (appointmentId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(`/api/dashboard/appointments/${encodeURIComponent(appointmentId)}/reminders/send-now`),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ agentId })
    }
  );
  return parseResponse<{
    success: boolean;
    queued: boolean;
    duplicate: boolean;
    job_id: string | null;
    reminder_id?: string | null;
    idempotency_key: string;
  }>(response);
};

export const disableAppointmentReminders = async (appointmentId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(`/api/dashboard/appointments/${encodeURIComponent(appointmentId)}/reminders/disable`),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ agentId })
    }
  );
  return parseResponse<{ success: boolean; appointment_id: string; canceled_count: number }>(response);
};
