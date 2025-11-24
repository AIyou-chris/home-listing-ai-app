import { Appointment, Lead } from '../types';

const API_BASE = '/api/analytics/funnel';

const postJson = async (path: string, payload: unknown) => {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed (${response.status}): ${text}`);
    }
  } catch (error) {
    console.warn(`[aiFunnelService] Failed to post ${path}`, error);
  }
};

export const logLeadCaptured = async (lead: Lead) => {
  if (!lead) return;
  await postJson('/lead-captured', {
    leadId: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source ?? 'unknown',
    capturedAt: lead.createdAt ?? new Date().toISOString()
  });
};

export const logAppointmentScheduled = async (appointment: Appointment, lead?: Lead) => {
  if (!appointment) return;
  await postJson('/appointment-scheduled', {
    appointmentId: appointment.id,
    leadId: lead?.id,
    leadName: lead?.name,
    scheduledFor: `${appointment.date}T${appointment.time}`,
    propertyId: appointment.propertyId ?? null,
    status: appointment.status ?? 'Scheduled'
  });
};
