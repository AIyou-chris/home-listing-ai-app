import { AuthService } from './authService';
import type { Appointment } from '../types';

const auth = AuthService.getInstance();

export type CreateAdminAppointmentPayload = {
  leadId?: string | null;
  propertyId?: string | null;
  propertyAddress?: string | null;
  kind: Appointment['type'];
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  date: string;
  time: string;
  notes?: string;
  remindAgent?: boolean;
  remindClient?: boolean;
  agentReminderMinutes?: number;
  clientReminderMinutes?: number;
  meetLink?: string | null;
};

export type UpdateAdminAppointmentPayload = Partial<CreateAdminAppointmentPayload> & { id: string };

const ensureOk = async (response: Response, context: string) => {
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`${context} failed (${response.status}): ${message}`);
  }
};

export const adminAppointmentsService = {
  async list(): Promise<Appointment[]> {
    const response = await auth.makeAuthenticatedRequest('/api/admin/appointments');
    await ensureOk(response, 'List appointments');
    const data = await response.json();
    if (Array.isArray(data)) {
      return data as Appointment[];
    }
    if (Array.isArray(data?.appointments)) {
      return data.appointments as Appointment[];
    }
    return [];
  },

  async create(payload: CreateAdminAppointmentPayload): Promise<Appointment> {
    const response = await auth.makeAuthenticatedRequest('/api/admin/appointments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    await ensureOk(response, 'Create appointment');
    const data = await response.json();
    return (data?.appointment ?? data) as Appointment;
  },

  async update(payload: UpdateAdminAppointmentPayload): Promise<Appointment> {
    const response = await auth.makeAuthenticatedRequest(`/api/admin/appointments/${payload.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    await ensureOk(response, 'Update appointment');
    const data = await response.json();
    return (data?.appointment ?? data) as Appointment;
  },

  async remove(id: string): Promise<void> {
    const response = await auth.makeAuthenticatedRequest(`/api/admin/appointments/${id}`, {
      method: 'DELETE'
    });
    await ensureOk(response, 'Delete appointment');
  }
};

export type { Appointment, UpdateAdminAppointmentPayload };
