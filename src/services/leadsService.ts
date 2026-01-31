import { supabase } from './supabase'
import { Lead, LeadStatus, LeadFunnelType } from '../types'

export interface LeadPayload {
  name: string
  email: string
  phone?: string
  company?: string
  status?: string
  source?: string
  notes?: string
  lastMessage?: string
  funnelType?: LeadFunnelType | null
}

export interface PhoneLogPayload {
  callStartedAt?: string
  callOutcome?: 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'other'
  callNotes?: string
}

const LEADS_TABLE = 'leads'
const PHONE_LOGS_TABLE = 'lead_phone_logs'

const VALID_STATUSES: LeadStatus[] = ['New', 'Qualified', 'Contacted', 'Showing', 'Lost', 'Bounced', 'Unsubscribed', 'Won']
const VALID_FUNNEL_TYPES: LeadFunnelType[] = ['universal_sales', 'homebuyer', 'seller', 'postShowing']

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
  funnel_type?: string | null
  score?: number | null
}

const mapLeadRow = (row: LeadRow): Lead => {
  const rawStatus = typeof row.status === 'string' ? row.status : 'New'
  const normalizedStatus = VALID_STATUSES.includes(rawStatus as LeadStatus)
    ? (rawStatus as LeadStatus)
    : 'New'
  const createdAt = row.created_at ? new Date(row.created_at) : null
  const funnelType =
    row.funnel_type && VALID_FUNNEL_TYPES.includes(row.funnel_type as LeadFunnelType)
      ? (row.funnel_type as LeadFunnelType)
      : undefined

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
    activeSequences: row.active_sequences || undefined,
    funnelType,
    score: typeof row.score === 'number' ? {
      totalScore: row.score,
      tier: row.score >= 90 ? 'Hot' : row.score >= 70 ? 'Qualified' : row.score >= 40 ? 'Warm' : 'Cold',
      leadId: row.id,
      lastUpdated: row.created_at || new Date().toISOString(),
      scoreHistory: []
    } : undefined
  }
}

export const leadsService = {
  async list(status?: string, search?: string) {
    const userId = await getCurrentUserId()
    if (!userId) {
      // Return empty state instead of sample leads
      return {
        leads: [],
        total: 0,
        stats: {}
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
      last_message: payload.lastMessage ?? null,
      funnel_type: payload.funnelType ?? null
    }

    const { data, error } = await supabase.from(LEADS_TABLE).insert(insertPayload).select('*').single()
    if (error) throw error
    return mapLeadRow(data)
  },

  async bulkImport(leads: Partial<LeadPayload>[], assignment: { assignee: string; funnel?: LeadFunnelType; tag?: string }, onProgress?: (count: number) => void) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    try {
      // Use environment variable or default to local (Resolves "Spinning" / 404 Issues)
      const API_BASE = import.meta.env.VITE_BACKEND_URL || '';
      console.log('🔌 Connecting to Backend Import:', API_BASE);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 Minute Timeout for Large Imports

      const response = await fetch(`${API_BASE}/api/admin/leads/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          leads,
          assignment
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();

      if (onProgress) {
        onProgress(result.imported);
      }

      return {
        imported: result.imported,
        total: result.total,
        failed: result.total - result.imported
      };

    } catch (error) {
      console.error('Frontend Import Error:', error);
      throw error;
    }
  },

  async findByEmail(email: string) {
    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail) return null

    const userId = await getCurrentUserId()
    if (!userId) {
      return null
    }

    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error
    if (!data || data.length === 0) return null
    return mapLeadRow(data[0])
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
      last_message: payload.lastMessage,
      funnel_type: payload.funnelType ?? null
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

  async deleteBouncedLeads() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('status', 'Bounced')
      .select('id');

    if (error) throw error;
    return { deletedCount: data?.length || 0 };
  },

  async stats() {
    const userId = await getCurrentUserId()
    if (!userId) {
      return {
        total: 0,
        new: 0,
        qualified: 0,
        contacted: 0,
        showing: 0,
        lost: 0,
        conversionRate: 0,
        scoreStats: {
          averageScore: 0,
          qualified: 0,
          hot: 0,
          warm: 0,
          cold: 0,
          highestScore: 0
        }
      }
    }

    try {
      // Use the newly created backend endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`/api/leads/stats?userId=${userId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.success) {
        // The backend returns { success: true, ...stats } so we return the whole object
        // but we might want to strip success/error fields if strict typing matters.
        // For now, spreading data is fine as it contains all the keys we need.
        return {
          total: data.total || 0,
          new: data.new || 0,
          qualified: data.qualified || 0,
          contacted: data.contacted || 0,
          showing: data.showing || 0,
          lost: data.lost || 0,
          conversionRate: data.conversionRate || 0,
          scoreStats: {
            averageScore: data.scoreStats?.averageScore || 0,
            qualified: data.scoreStats?.qualified || 0,
            hot: data.scoreStats?.hot || 0,
            warm: data.scoreStats?.warm || 0,
            cold: data.scoreStats?.cold || 0,
            highestScore: data.scoreStats?.highestScore || 0
          }
        };
      }
    } catch (e) {
      console.warn('Backend stats fetch failed, falling back to empty:', e);
    }

    return {
      total: 0,
      new: 0,
      qualified: 0,
      contacted: 0,
      showing: 0,
      lost: 0,
      conversionRate: 0,
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
  },

  async assignFunnel(leadId: string, funnelType: LeadFunnelType | null) {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .update({ funnel_type: funnelType })
      .eq('id', leadId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    return mapLeadRow(data)
  }
}
