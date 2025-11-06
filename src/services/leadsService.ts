import { supabase } from './supabase'
import { Lead, LeadStatus } from '../types'
import { SAMPLE_LEADS } from '../constants'

export interface LeadPayload {
  name: string
  email: string
  phone?: string
  status?: string
  source?: string
  notes?: string
  lastMessage?: string
}

export interface PhoneLogPayload {
  callStartedAt?: string
  callOutcome?: 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'other'
  callNotes?: string
}

const LEADS_TABLE = 'leads'
const PHONE_LOGS_TABLE = 'lead_phone_logs'

const VALID_STATUSES: LeadStatus[] = ['New', 'Qualified', 'Contacted', 'Showing', 'Lost']

const getCurrentUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.warn('[LeadsService] getUser error:', error)
    return null
  }
  return data?.user?.id ?? null
}

const buildStatusStats = (leads: Lead[]) => {
  return leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1
    return acc
  }, {})
}

type LeadRow = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  status?: string | null
  created_at?: string | null
  last_message?: string | null
  source?: string | null
  notes?: string | null
  interested_properties?: string[] | null
  last_contact?: string | null
  active_sequences?: string[] | null
}

const mapLeadRow = (row: LeadRow): Lead => {
  const rawStatus = typeof row.status === 'string' ? row.status : 'New'
  const normalizedStatus = VALID_STATUSES.includes(rawStatus as LeadStatus)
    ? (rawStatus as LeadStatus)
    : 'New'
  const createdAt = row.created_at ? new Date(row.created_at) : null

  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    status: normalizedStatus,
    date: createdAt ? createdAt.toLocaleDateString() : '',
    lastMessage: row.last_message || '',
    source: row.source || 'Unknown',
    notes: row.notes || '',
    interestedProperties: row.interested_properties || [],
    createdAt: createdAt ? createdAt.toISOString() : undefined,
    lastContact: row.last_contact || undefined,
    activeSequences: row.active_sequences || undefined
  }
}

export const leadsService = {
  async list(status?: string, search?: string) {
    const userId = await getCurrentUserId()
    if (!userId) {
      const stats = buildStatusStats(SAMPLE_LEADS)
      return {
        leads: SAMPLE_LEADS,
        total: SAMPLE_LEADS.length,
        stats
      }
    }

    let query = supabase
      .from(LEADS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search && search.trim().length > 0) {
      const like = `%${search.trim()}%`
      query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    }

    const { data, error } = await query
    if (error) throw error

    const leads = ((data || []) as LeadRow[]).map(mapLeadRow)
    const stats = buildStatusStats(leads)

    return {
      leads,
      total: leads.length,
      stats
    }
  },

  async create(payload: LeadPayload) {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const insertPayload = {
      user_id: userId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone ?? null,
      status: payload.status ?? 'New',
      source: payload.source ?? 'Manual',
      notes: payload.notes ?? null,
      last_message: payload.lastMessage ?? null
    }

    const { data, error } = await supabase.from(LEADS_TABLE).insert(insertPayload).select('*').single()
    if (error) throw error
    return mapLeadRow(data)
  },

  async update(leadId: string, payload: Partial<LeadPayload>) {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const updatePayload = {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      status: payload.status,
      source: payload.source,
      notes: payload.notes,
      last_message: payload.lastMessage
    }

    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .update(updatePayload)
      .eq('id', leadId)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw error
    return mapLeadRow(data)
  },

  async remove(leadId: string) {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const { error } = await supabase.from(LEADS_TABLE).delete().eq('id', leadId).eq('user_id', userId)
    if (error) throw error
    return { success: true }
  },

  async stats() {
    const { leads, stats } = await leadsService.list()
    const statusCounts = {
      new: stats['New'] ?? 0,
      qualified: stats['Qualified'] ?? 0,
      contacted: stats['Contacted'] ?? 0,
      showing: stats['Showing'] ?? 0,
      lost: stats['Lost'] ?? 0
    }

    const total = leads.length
    const conversionRate = total > 0 ? Number(((statusCounts.qualified / total) * 100).toFixed(2)) : 0

    return {
      total,
      new: statusCounts.new,
      qualified: statusCounts.qualified,
      contacted: statusCounts.contacted,
      showing: statusCounts.showing,
      lost: statusCounts.lost,
      conversionRate,
      scoreStats: {
        averageScore: 0,
        qualified: 0,
        hot: 0,
        warm: 0,
        cold: 0,
        highestScore: 0
      }
    }
  },

  async listPhoneLogs(leadId: string) {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { logs: [] }
    }

    const { data, error } = await supabase
      .from(PHONE_LOGS_TABLE)
      .select('*')
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .order('call_started_at', { ascending: false })

    if (error) throw error
    const logs = (data || []).map((row) => ({
      id: row.id,
      callStartedAt: row.call_started_at,
      callOutcome: row.call_outcome,
      callNotes: row.call_notes || undefined
    }))

    return { logs }
  },

  async createPhoneLog(leadId: string, payload: PhoneLogPayload) {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const insertPayload = {
      lead_id: leadId,
      user_id: userId,
      call_started_at: payload.callStartedAt ?? new Date().toISOString(),
      call_outcome: payload.callOutcome ?? 'other',
      call_notes: payload.callNotes ?? null
    }

    const { data, error } = await supabase
      .from(PHONE_LOGS_TABLE)
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) throw error
    return {
      log: {
        id: data.id,
        callStartedAt: data.call_started_at,
        callOutcome: data.call_outcome,
        callNotes: data.call_notes || undefined
      }
    }
  }
}
