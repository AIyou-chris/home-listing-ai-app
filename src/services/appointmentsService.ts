import { supabase } from './supabase'

export interface AppointmentRow {
  id: string
  user_id: string
  lead_id: string | null
  property_id: string | null
  property_address: string | null
  kind: 'Showing' | 'Consultation' | 'Open House' | 'Virtual Tour' | 'Follow-up'
  name: string
  email: string | null
  phone: string | null
  date: string
  time_label: string
  start_iso: string
  end_iso: string
  meet_link: string | null
  notes: string | null
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  remind_agent: boolean
  remind_client: boolean
  agent_reminder_minutes_before: number
  client_reminder_minutes_before: number
  created_at: string
  updated_at: string
}

export interface InsertAppointmentInput {
  user_id: string
  lead_id?: string | null
  property_id?: string | null
  property_address?: string | null
  kind: AppointmentRow['kind']
  name: string
  email?: string | null
  phone?: string | null
  date: string
  time_label: string
  start_iso: string
  end_iso: string
  meet_link?: string | null
  notes?: string | null
  status?: AppointmentRow['status']
  remind_agent?: boolean
  remind_client?: boolean
  agent_reminder_minutes_before?: number
  client_reminder_minutes_before?: number
}

export const insertAppointment = async (row: InsertAppointmentInput) => {
  // Use the Backend API to ensure emails, double-booking checks, and lead creation happen.
  try {
    const { authService } = await import('./authService');
    const response = await authService.makeAuthenticatedRequest('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        ...row,
        // Map frontend fields to backend expected casing if needed
        // Backend expects: date, time or timeLabel, contactName (from name)
        timeLabel: row.time_label,
        startIso: row.start_iso,
        endIso: row.end_iso,
        remindAgent: row.remind_agent,
        remindClient: row.remind_client,
        agentReminderMinutes: row.agent_reminder_minutes_before,
        clientReminderMinutes: row.client_reminder_minutes_before
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Failed to create appointment');
    }

    const result = await response.json();
    return result.appointment as AppointmentRow;
  } catch (error) {
    console.error('Error creating appointment via API:', error);
    throw error;
  }
}

export const listAppointments = async (userId?: string) => {
  const query = supabase.from('appointments').select('*').order('start_iso', { ascending: true })
  if (userId) query.eq('user_id', userId)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as AppointmentRow[]
}

