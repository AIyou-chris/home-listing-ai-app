import { supabase } from './supabase'

export interface AppointmentRow {
  id: string
  user_id: string
  lead_id: string | null
  property_id: string
  kind: 'Showing' | 'Consultation' | 'Open House' | 'Virtual Tour' | 'Follow-up'
  name: string
  email: string
  phone?: string
  date: string
  time_label: string
  start_iso: string
  end_iso: string
  meet_link?: string
  notes?: string
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  created_at: string
}

export const insertAppointment = async (row: Omit<AppointmentRow, 'id' | 'created_at'>) => {
  const { data, error } = await supabase.from('appointments').insert(row).select('*').single()
  if (error) throw error
  return data as AppointmentRow
}

export const listAppointments = async (userId?: string) => {
  const query = supabase.from('appointments').select('*').order('created_at', { ascending: false })
  if (userId) query.eq('user_id', userId)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as AppointmentRow[]
}


