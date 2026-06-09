import { buildApiUrl } from '../../lib/api';
import { isDemoModeActive } from '../../demo/useDemoMode';
import {
  createDemoAppointment,
  updateDemoAppointmentStatus,
  getDemoAppointments,
  getDemoAppointmentReminders,
  retryDemoReminder,
  retryDemoReminderForAppointment,
  sendDemoReminderNow,
  disableDemoReminders
} from '../../demo/demoData';
import { resolveAgentId, defaultJsonHeaders, withAgentQuery, parseResponse } from './utils';
import type { DashboardLeadAppointment } from './leads';

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

export const rescheduleAppointment = async (
  appointmentId: string,
  payload: { date: string; time: string; location?: string | null },
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return updateDemoAppointmentStatus(appointmentId, 'scheduled');
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(`/api/appointments/${encodeURIComponent(appointmentId)}`), {
    method: 'PUT',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify({
      date: payload.date,
      time: payload.time,
      timeLabel: payload.time,
      location: payload.location ?? undefined,
      status: 'scheduled',
      confirmation_status: 'needs_confirmation',
      agentId
    })
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
