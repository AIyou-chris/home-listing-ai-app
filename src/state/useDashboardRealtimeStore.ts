import { create } from 'zustand'
import type {
  DashboardAppointmentRow,
  DashboardLeadItem,
  DashboardCommandCenterSnapshot
} from '../services/dashboardCommandService'

type RealtimeEventType =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.status_changed'
  | 'appointment.created'
  | 'appointment.updated'
  | 'reminder.outcome'
  | 'reminder.updated'
  | 'listing.updated'
  | 'listing.performance.updated'
  | 'system.ready'

export interface DashboardRealtimeEventEnvelope {
  type: RealtimeEventType
  v: number
  ts: string
  agent_id: string
  payload: Record<string, unknown>
}

interface DashboardRealtimeState {
  leadsById: Record<string, DashboardLeadItem>
  appointmentsById: Record<string, DashboardAppointmentRow>
  listingSignalsById: Record<string, string>
  commandCenter: DashboardCommandCenterSnapshot | null
  setInitialLeads: (leads: DashboardLeadItem[]) => void
  setInitialAppointments: (appointments: DashboardAppointmentRow[]) => void
  setCommandCenter: (snapshot: DashboardCommandCenterSnapshot | null) => void
  patchLeadAction: (leadId: string, actionIso: string) => void
  applyRealtimeEvent: (event: DashboardRealtimeEventEnvelope) => void
}

const toIso = (value: unknown, fallback: string) => {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const next = new Date(value)
  return Number.isNaN(next.getTime()) ? fallback : next.toISOString()
}

const asString = (value: unknown, fallback = '') => (typeof value === 'string' && value.trim() ? value : fallback)

const mapLeadPayload = (payload: Record<string, unknown>, current?: DashboardLeadItem): DashboardLeadItem | null => {
  const leadId = asString(payload.lead_id)
  if (!leadId) return null
  const now = new Date().toISOString()
  const listingId = asString(payload.listing_id) || current?.listing_id || null
  const lastActivityAt = toIso(payload.last_activity_at, current?.last_activity_at || now)
  const createdAt = toIso(payload.created_at, current?.created_at || now)
  const summary = asString(payload.lead_summary_preview) || current?.lead_summary || current?.last_message_preview || 'No summary yet.'

  return {
    id: leadId,
    name: asString(payload.full_name, current?.name || 'Unknown'),
    phone: asString(payload.phone, current?.phone || '') || current?.phone || null,
    email: asString(payload.email, current?.email || '') || current?.email || null,
    status: asString(payload.status, current?.status || 'New'),
    source_type: asString(payload.source_type, current?.source_type || 'unknown'),
    intent_level: (asString(payload.intent_level, current?.intent_level || 'Warm') as DashboardLeadItem['intent_level']),
    intent_score: Number(payload.intent_score ?? current?.intent_score ?? 0),
    timeline: asString(payload.timeline, current?.timeline || 'unknown'),
    financing: asString(payload.financing, current?.financing || 'unknown'),
    lead_summary: summary,
    next_best_action: current?.next_best_action || null,
    last_activity_at: lastActivityAt,
    last_activity_relative: current?.last_activity_relative || 'just now',
    last_message_preview: summary,
    created_at: createdAt,
    listing_id: listingId,
    last_agent_action_at: asString(payload.last_agent_action_at, current?.last_agent_action_at || '') || current?.last_agent_action_at || null,
    listing: listingId
      ? {
        id: listingId,
        address: asString(payload.listing_address, current?.listing?.address || '')
      }
      : null
  }
}

const mapAppointmentPayload = (
  payload: Record<string, unknown>,
  current?: DashboardAppointmentRow
): DashboardAppointmentRow | null => {
  const appointmentId = asString(payload.appointment_id)
  if (!appointmentId) return null
  const listingId = asString(payload.listing_id) || current?.listing?.id || null
  const leadId = asString(payload.lead_id) || current?.lead?.id || null
  const startsAt = asString(payload.starts_at, current?.startsAt || current?.startIso || '') || null
  const status = asString(payload.status, current?.status || 'scheduled')

  return {
    id: appointmentId,
    startsAt,
    startIso: startsAt,
    status,
    normalizedStatus: status,
    location: current?.location || null,
    lead: leadId
      ? {
        id: leadId,
        name: asString(payload.lead_name, current?.lead?.name || 'Unknown'),
        phone: asString(payload.lead_phone, current?.lead?.phone || '') || current?.lead?.phone || null,
        email: asString(payload.lead_email, current?.lead?.email || '') || current?.lead?.email || null
      }
      : current?.lead || null,
    listing: listingId
      ? {
        id: listingId,
        address: asString(payload.listing_address, current?.listing?.address || '')
      }
      : current?.listing || null,
    confirmation_status: asString(payload.confirmation_status, current?.confirmation_status || ''),
    last_reminder_outcome: asString(payload.last_reminder_outcome, current?.last_reminder_outcome?.status || '')
      ? {
        status: asString(payload.last_reminder_outcome, current?.last_reminder_outcome?.status || ''),
        reminder_type: current?.last_reminder_outcome?.reminder_type || 'voice',
        scheduled_for: current?.last_reminder_outcome?.scheduled_for || startsAt || new Date().toISOString(),
        provider_response: current?.last_reminder_outcome?.provider_response || null
      }
      : current?.last_reminder_outcome || null
  }
}

export const useDashboardRealtimeStore = create<DashboardRealtimeState>((set) => ({
  leadsById: {},
  appointmentsById: {},
  listingSignalsById: {},
  commandCenter: null,
  setInitialLeads: (leads) =>
    set(() => ({
      leadsById: Object.fromEntries((leads || []).map((lead) => [lead.id, lead]))
    })),
  setInitialAppointments: (appointments) =>
    set(() => ({
      appointmentsById: Object.fromEntries((appointments || []).map((appointment) => [appointment.id, appointment]))
    })),
  setCommandCenter: (snapshot) => set(() => ({ commandCenter: snapshot })),
  patchLeadAction: (leadId, actionIso) =>
    set((state) => {
      const existing = state.leadsById[leadId]
      if (!existing) return {}
      return {
        leadsById: {
          ...state.leadsById,
          [leadId]: {
            ...existing,
            last_agent_action_at: actionIso
          }
        }
      }
    }),
  applyRealtimeEvent: (event) =>
    set((state) => {
      const payload = event.payload || {}
      if (event.type === 'lead.created' || event.type === 'lead.updated' || event.type === 'lead.status_changed') {
        const lead = mapLeadPayload(payload, state.leadsById[asString(payload.lead_id)])
        if (!lead) return {}
        return {
          leadsById: {
            ...state.leadsById,
            [lead.id]: {
              ...(state.leadsById[lead.id] || {}),
              ...lead
            }
          }
        }
      }

      if (event.type === 'appointment.created' || event.type === 'appointment.updated') {
        const appointment = mapAppointmentPayload(payload, state.appointmentsById[asString(payload.appointment_id)])
        if (!appointment) return {}
        return {
          appointmentsById: {
            ...state.appointmentsById,
            [appointment.id]: {
              ...(state.appointmentsById[appointment.id] || {}),
              ...appointment
            }
          }
        }
      }

      if (event.type === 'reminder.outcome') {
        const appointmentId = asString(payload.appointment_id)
        if (!appointmentId) return {}
        const existing = state.appointmentsById[appointmentId]
        if (!existing) return {}
        const outcome = asString(payload.outcome, 'unknown')
        return {
          appointmentsById: {
            ...state.appointmentsById,
            [appointmentId]: {
              ...existing,
              last_reminder_outcome: {
                status: outcome,
                reminder_type: existing.last_reminder_outcome?.reminder_type || 'voice',
                scheduled_for: asString(payload.occurred_at, new Date().toISOString()),
                provider_response: {
                  ...(existing.last_reminder_outcome?.provider_response || {}),
                  provider: asString(payload.provider, 'vapi'),
                  notes: asString(payload.notes, '')
                }
              }
            }
          }
        }
      }

      if (event.type === 'reminder.updated') {
        const appointmentId = asString(payload.appointment_id)
        if (!appointmentId) return {}
        const existing = state.appointmentsById[appointmentId]
        if (!existing) return {}
        const normalized = asString(payload.outcome, asString(payload.status, existing.last_reminder_outcome?.status || ''))
        return {
          appointmentsById: {
            ...state.appointmentsById,
            [appointmentId]: {
              ...existing,
              last_reminder_outcome: {
                status: normalized || existing.last_reminder_outcome?.status || 'unknown',
                reminder_type: asString(payload.reminder_type, existing.last_reminder_outcome?.reminder_type || 'voice'),
                scheduled_for: asString(payload.scheduled_for, existing.last_reminder_outcome?.scheduled_for || new Date().toISOString()),
                provider_response:
                  (payload.provider_response as Record<string, unknown> | undefined) ||
                  existing.last_reminder_outcome?.provider_response ||
                  null
              }
            }
          }
        }
      }

      if (event.type === 'listing.updated' || event.type === 'listing.performance.updated') {
        const listingId = asString(payload.listing_id)
        if (!listingId) return {}
        return {
          listingSignalsById: {
            ...state.listingSignalsById,
            [listingId]: event.ts
          }
        }
      }

      return {}
    })
}))
