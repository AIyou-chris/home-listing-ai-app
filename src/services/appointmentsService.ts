import { supabase } from './supabase'
import { SAMPLE_APPOINTMENTS } from '../constants'
import { getAuthenticatedUserId } from './session-utils'

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
  const payload = {
    user_id: row.user_id,
    lead_id: row.lead_id ?? null,
    property_id: row.property_id ?? null,
    property_address: row.property_address ?? null,
    kind: row.kind,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    date: row.date,
    time_label: row.time_label,
    start_iso: row.start_iso,
    end_iso: row.end_iso,
    meet_link: row.meet_link ?? null,
    notes: row.notes ?? null,
    status: row.status ?? 'Scheduled',
    remind_agent: row.remind_agent ?? true,
    remind_client: row.remind_client ?? true,
    agent_reminder_minutes_before: row.agent_reminder_minutes_before ?? 60,
    client_reminder_minutes_before: row.client_reminder_minutes_before ?? 60
  }

  const { data, error } = await supabase.from('appointments').insert(payload).select('*').single()
  if (error) throw error
  return data as AppointmentRow
}

const buildDemoAppointmentRows = (): AppointmentRow[] => {
  return SAMPLE_APPOINTMENTS.map((appointment, index) => {
    const label = appointment.time || '02:00 PM'
    const baseDate = new Date(`${appointment.date} ${label}`)
    const start = Number.isNaN(baseDate.getTime()) ? new Date(Date.now() + index * 60 * 60 * 1000) : baseDate
    const end = new Date(start.getTime() + 30 * 60 * 1000)

    return {
      id: appointment.id || `demo-appt-${index}`,
      user_id: 'demo-user',
      lead_id: appointment.leadId ?? null,
      property_id: appointment.propertyId ?? null,
      property_address: appointment.propertyAddress ?? null,
      kind: appointment.type,
      name: appointment.leadName ?? appointment.notes ?? 'Prospect Meeting',
      email: appointment.email ?? null,
      phone: appointment.phone ?? null,
      date: appointment.date,
      time_label: label,
      start_iso: appointment.startIso ?? start.toISOString(),
      end_iso: appointment.endIso ?? end.toISOString(),
      meet_link: appointment.meetLink ?? null,
      notes: appointment.notes ?? null,
      status: appointment.status ?? 'Scheduled',
      remind_agent: appointment.remindAgent ?? true,
      remind_client: appointment.remindClient ?? true,
      agent_reminder_minutes_before: appointment.agentReminderMinutes ?? 60,
      client_reminder_minutes_before: appointment.clientReminderMinutes ?? 60,
      created_at: appointment.createdAt ?? start.toISOString(),
      updated_at: appointment.updatedAt ?? start.toISOString()
    }
  })
}

export const listAppointments = async (userId?: string) => {
  const resolvedUserId = userId ?? (await getAuthenticatedUserId())
  if (!resolvedUserId) {
    return buildDemoAppointmentRows()
  }

  const query = supabase.from('appointments').select('*').eq('user_id', resolvedUserId).order('start_iso', { ascending: true })
  const { data, error } = await query
  if (error) throw error
  return (data || []) as AppointmentRow[]
}

