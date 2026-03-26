import { buildApiUrl } from '../lib/api';
import {
  createDemoAppointment,
  createDemoTestLead,
  disableDemoReminders,
  generateDemoListingVideo,
  getDemoAppointmentReminders,
  getDemoAppointments,
  getDemoCommandCenterSnapshot,
  getDemoLeadConversation,
  getDemoLeadDetail,
  getDemoLeads,
  getDemoListingPerformance,
  getDemoListingShareKit,
  getDemoRoiSummary,
  getDemoVideoById,
  logDemoAgentAction,
  publishDemoListingShareKit,
  retryDemoReminder,
  retryDemoReminderForAppointment,
  sendDemoReminderNow,
  setDemoListingVideoScenario,
  updateDemoAppointmentStatus,
  updateDemoLeadStatusById
} from '../demo/demoData'
import { isDemoModeActive } from '../demo/useDemoMode'
import { BillingLimitError } from './dashboardBillingService';
import { waitForAuthenticatedUserId } from './authSession';
import { emitDashboardInvalidation } from './dashboardInvalidation';

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

export interface LightCmaManualComp {
  id: string;
  address: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: 'sold' | 'active' | 'pending';
  note?: string | null;
  is_anchor?: boolean;
}

export interface LightCmaConfig {
  pricing_notes: string;
  manual_comps: LightCmaManualComp[];
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
  latest_video?: {
    id: string;
    title: string | null;
    caption: string | null;
    file_name: string | null;
    mime_type: string;
    status: string;
    created_at: string | null;
  } | null;
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
      const upgradePlanCandidate = String(payload.upgrade_plan_id || '').toLowerCase();
      const upgradePlanId =
        upgradePlanCandidate === 'starter' || upgradePlanCandidate === 'pro'
          ? (upgradePlanCandidate as 'starter' | 'pro')
          : null;
      throw new BillingLimitError('limit_reached', {
        feature: String(payload.feature || 'unknown'),
        modal: (payload.modal as { title: string; body: string; primary: string; secondary: string }) || {
          title: "You're at your limit.",
          body: 'Upgrade to keep capturing leads and sending reports without interruptions.',
          primary: 'Upgrade now',
          secondary: 'Not now'
        },
        planId: String(payload.plan_id || 'free'),
        upgradePlanId,
        reasonLine: String(payload.reason_line || ''),
        used: Number(payload.used || 0),
        limit: Number(payload.limit || 0)
      });
    }
    const textError = typeof payload.error === 'string' ? payload.error : '';
    throw new Error(textError || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
};

const parseVideoResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const code = typeof payload.error === 'string' && payload.error.trim()
      ? payload.error.trim()
      : `http_${response.status}`;
    const error = new Error(code) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
};

export const resolveAgentId = async (): Promise<string | null> => {
  if (isDemoModeActive()) return 'demo-agent-busy';
  return waitForAuthenticatedUserId();
};

const withAgentQuery = (path: string, agentId: string | null): string => {
  if (!agentId) return path;
  const delimiter = path.includes('?') ? '&' : '?';
  return `${path}${delimiter}agentId=${encodeURIComponent(agentId)}`;
};

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
  if (isDemoModeActive()) {
    return createDemoAppointment(payload);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl('/api/appointments'), {
    method: 'POST',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify({ ...payload, agentId })
  });
  return parseResponse<{ success: boolean; appointment?: DashboardLeadAppointment }>(response);
};

export const updateAppointmentStatus = async (appointmentId: string, status: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return updateDemoAppointmentStatus(appointmentId, status);
  }

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
  if (isDemoModeActive()) {
    const appointments = getDemoAppointments(options.view || 'week');
    return {
      success: true,
      appointments,
      counts: {
        total: appointments.length
      }
    };
  }

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

export const fetchDashboardRoi = async (range: '7d' | '30d' = '7d', agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      ...getDemoRoiSummary(range)
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/roi?range=${encodeURIComponent(range)}`, agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<{ success: boolean } & DashboardRoiSummary>(response);
};

export const fetchBillingValueProof = async (range: '7d' | '30d' = '30d', agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/billing/value-proof?range=${encodeURIComponent(range)}`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );
  return parseResponse<{ success: boolean } & BillingValueProofSnapshot>(response);
};

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

export const fetchLightCmaConfig = async (listingId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      listing_id: listingId,
      config: {
        pricing_notes: '',
        manual_comps: []
      } as LightCmaConfig
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/light-cma/config`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );
  return parseResponse<{ success: boolean; listing_id: string; config: LightCmaConfig }>(response);
};

export const saveLightCmaConfig = async (
  listingId: string,
  config: LightCmaConfig,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      listing_id: listingId,
      config
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/light-cma/config`, agentId)),
    {
      method: 'PUT',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify(config)
    }
  );
  return parseResponse<{ success: boolean; listing_id: string; config: LightCmaConfig }>(response);
};

export const fetchListingShareKit = async (listingId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return getDemoListingShareKit(listingId);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/share-kit`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );

  // 409 = listing exists but is unpublished — return a safe draft state so the
  // Share Kit page renders the Publish button instead of crashing into an error box.
  if (response.status === 409) {
    return {
      success: false,
      listing_id: listingId,
      is_published: false,
      published_at: null,
      public_slug: null,
      share_url: null,
      qr_code_url: null,
      qr_code_svg: null,
      latest_video: null,
      source_defaults: {}
    } as ListingShareKitResponse;
  }

  return parseResponse<ListingShareKitResponse>(response);
};

export const fetchDashboardVideoSignedUrl = async (
  videoId: string,
  expiresIn = 1800,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    const video = getDemoVideoById(videoId);
    if (!video?.video_url) {
      throw new Error('Video is still processing.');
    }
    return {
      signedUrl: video.video_url,
      expiresIn,
      fileName: video.file_name,
      mimeType: video.mime_type
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const path = withAgentQuery(
    `/api/dashboard/videos/${encodeURIComponent(videoId)}/signed-url?expiresIn=${encodeURIComponent(String(expiresIn))}`,
    agentId
  );
  const response = await fetch(buildApiUrl(path), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<{
    signedUrl: string;
    expiresIn: number;
    fileName: string;
    mimeType: string;
  }>(response);
};

export const fetchListingVideos = async (listingId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    const { getDemoListingVideos } = await import('../demo/demoData');
    return getDemoListingVideos(listingId);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/videos`, agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseVideoResponse<{
    credits_remaining: number;
    credits_total?: number;
    credits_used?: number;
    limit?: number;
    used?: number;
    remaining?: number;
    scenario?: 'normal' | 'limit_reached' | 'failed_render';
    videos: Array<{
      id: string;
      status: string;
      template_style?: string | null;
      title?: string | null;
      caption?: string | null;
      file_name?: string | null;
      mime_type?: string | null;
      video_url?: string | null;
      error_message?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      source_photos?: string[] | null;
    }>;
  }>(response);
};

export const fetchDashboardVideoStatus = async (videoId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/videos/${encodeURIComponent(videoId)}/status`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );

  return parseVideoResponse<{
    video_id: string;
    status: string;
    stage?: 'ffmpeg_rendering' | 'rendering' | 'finalizing' | 'failed' | string;
    error_message?: string | null;
  }>(response);
};

export const fetchListingVideoCredits = async (listingId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/video-credits/${encodeURIComponent(listingId)}`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );

  return parseResponse<{
    listing_id: string;
    remaining: number;
    limit: number;
    used: number;
    included?: number;
    extra?: number;
  }>(response);
};

export const addFreeTestVideoCredits = async (
  listingId: string,
  add = 3,
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery('/api/dashboard/video-credits/free-test', agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ listing_id: listingId, add })
    }
  );

  return parseResponse<{
    ok: boolean;
    listing_id: string;
    added: number;
    remaining: number;
  }>(response);
};

export const generateListingVideo = async (
  listingId: string,
  payload: { template_style: string },
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    const result = generateDemoListingVideo(listingId, payload.template_style);
    if (!result.queued) {
      throw new Error(result.error || 'Failed to generate video.');
    }
    return {
      success: true,
      status: 'queued',
      credits_remaining: result.credits_remaining,
      video: result.video || null
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/videos/generate`, agentId)), {
    method: 'POST',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify(payload)
  });
  return parseVideoResponse<{
    success: boolean;
    video_id?: string;
    status?: string;
    credits_remaining?: number;
    video?: Record<string, unknown> | null;
  }>(response);
};

export const addDevListingVideoCredits = async (
  listingId: string,
  count = 3,
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dev/listings/${encodeURIComponent(listingId)}/videos/credits/add`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ count })
    }
  );
  return parseResponse<{
    success: boolean;
    listing_id: string;
    added: number;
    credits: {
      included: number;
      extra: number;
      used: number;
      remaining: number;
    };
  }>(response);
};

export const updateDemoVideoScenario = async (listingId: string, scenario: 'normal' | 'limit_reached' | 'failed_render') => {
  if (!isDemoModeActive()) return;
  setDemoListingVideoScenario(listingId, scenario);
};

export const publishListingShareKit = async (listingId: string, isPublished = true, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return publishDemoListingShareKit(listingId);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/publish`, agentId)),
    {
      method: 'PATCH',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ is_published: isPublished, agentId })
    }
  );
  const payload = await parseResponse<ListingShareKitResponse>(response);
  emitDashboardInvalidation({
    reason: isPublished ? 'listing_published' : 'listing_unpublished',
    listingId
  });
  return payload;
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
  if (isDemoModeActive()) {
    const shareKit = getDemoListingShareKit(listingId);
    const sourceKey = payload.source_key || payload.source_type || 'sign';
    const trackedUrl = `${shareKit.share_url || `https://homelistingai.com/l/${shareKit.public_slug || listingId}`}?src=${encodeURIComponent(sourceKey)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(trackedUrl)}`;
    return {
      success: true,
      listing_id: listingId,
      source_key: sourceKey,
      source_type: payload.source_type || 'qr',
      share_url: shareKit.share_url || trackedUrl,
      tracked_url: trackedUrl,
      qr_code_url: qrCodeUrl,
      qr_code_svg: ''
    };
  }

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

export const downloadOpenHouseFlyerPdf = async (listingId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const path = isDemoModeActive()
    ? `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/open-house-flyer.pdf`
    : withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/open-house-flyer.pdf`, agentId);
  const response = await fetch(
    buildApiUrl(path),
    {
      headers: agentId ? { 'x-user-id': agentId } : undefined
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`);
  }

  return {
    blob: await response.blob(),
    fileName:
      response.headers
        .get('content-disposition')
        ?.match(/filename="([^"]+)"/i)?.[1] || `${listingId}-open-house-flyer.pdf`
  };
};

const downloadListingBinaryAsset = async (
  listingId: string,
  path: string,
  query: Record<string, string | null | undefined> = {},
  agentIdOverride?: string | null,
  options: {
    demoPath?: string;
  } = {}
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const queryString = params.toString();
  const resolvedPath = isDemoModeActive()
    ? `${options.demoPath || path}${queryString ? `?${queryString}` : ''}`
    : withAgentQuery(`${path}${queryString ? `?${queryString}` : ''}`, agentId);
  const response = await fetch(
    buildApiUrl(resolvedPath),
    {
      headers: agentId ? { 'x-user-id': agentId } : undefined
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`);
  }

  const contentType = String(response.headers.get('content-type') || '').trim();
  if (/text\/html/i.test(contentType)) {
    throw new Error('unexpected_html_response');
  }

  return {
    blob: await response.blob(),
    fileName:
      response.headers.get('content-disposition')?.match(/filename="([^"]+)"/i)?.[1] || `${listingId}-asset`,
    contentType: contentType || 'application/octet-stream'
  };
};

export const downloadListingQrFile = async (
  listingId: string,
  format: 'png' | 'svg',
  options: {
    sourceKey?: string | null;
    sourceType?: string | null;
  } = {},
  agentIdOverride?: string | null
) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/qr.${encodeURIComponent(format)}`,
    {
      sourceKey: options.sourceKey || null,
      sourceType: options.sourceType || null
    },
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/qr.${encodeURIComponent(format)}`
    }
  );

export const downloadSignRiderPdf = async (listingId: string, agentIdOverride?: string | null) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/sign-rider.pdf`,
    {},
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/sign-rider.pdf`
    }
  );

export const downloadSocialAssetPng = async (
  listingId: string,
  format: 'ig_post' | 'ig_story',
  agentIdOverride?: string | null
) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/social-asset.png`,
    { format },
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/social-asset.png`
    }
  );

export const downloadPropertyReportPdf = async (listingId: string, agentIdOverride?: string | null) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/property-report.pdf`,
    {},
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/property-report.pdf`
    }
  );

export const downloadFairHousingReviewPdf = async (listingId: string, agentIdOverride?: string | null) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/fair-housing-review.pdf`,
    {},
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/fair-housing-review.pdf`
    }
  );

export const downloadLightCmaPdf = async (listingId: string, agentIdOverride?: string | null) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/light-cma.pdf`,
    {},
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/light-cma.pdf`
    }
  );

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
  if (isDemoModeActive()) {
    return createDemoTestLead(listingId, payload);
  }

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
  if (isDemoModeActive()) {
    return {
      success: true,
      ...getDemoCommandCenterSnapshot()
    };
  }

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

export const retryDashboardReminder = async (appointmentId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return retryDemoReminderForAppointment(appointmentId);
  }

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
  if (isDemoModeActive()) {
    return {
      success: true,
      appointment_id: appointmentId,
      reminders: getDemoAppointmentReminders(appointmentId)
    };
  }

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
  if (isDemoModeActive()) {
    return retryDemoReminder(appointmentId, reminderId);
  }

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
  if (isDemoModeActive()) {
    return sendDemoReminderNow(appointmentId);
  }

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
  if (isDemoModeActive()) {
    return disableDemoReminders(appointmentId);
  }

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
