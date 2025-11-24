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

export const listAppointments = async (userId?: string) => {
  const query = supabase.from('appointments').select('*').order('start_iso', { ascending: true })
  if (userId) query.eq('user_id', userId)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as AppointmentRow[]
}

