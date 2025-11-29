import { Lead, Appointment } from '../types'
import { appendMessage, createConversation } from './chatService'

type FunnelStage = 'lead_captured' | 'lead_contacted' | 'appointment_scheduled'

interface FunnelEventInput {
  leadId: string
  stage: FunnelStage
  action: string
  metadata?: Record<string, unknown>
}

interface FunnelEvent extends FunnelEventInput {
  id: string
  createdAt: string
}

const localEvents: FunnelEvent[] = []
const leadConversationCache = new Map<string, string>()

const randomId = () => `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
const nowIso = () => new Date().toISOString()

const funnelEventEndpoint = '/api/funnel/events'

const getConversationStorageKey = (leadId: string) => `ai-funnel-conversation:${leadId}`

const getStoredConversationId = (leadId: string): string | null => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(getConversationStorageKey(leadId))
}

const storeConversationId = (leadId: string, conversationId: string) => {
  leadConversationCache.set(leadId, conversationId)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(getConversationStorageKey(leadId), conversationId)
  }
}

export const listLocalFunnelEvents = () => [...localEvents]

const recordLocalEvent = (event: FunnelEventInput) => {
  const fallback: FunnelEvent = {
    id: randomId(),
    createdAt: nowIso(),
    ...event
  }
  localEvents.push(fallback)
}

const postFunnelEvent = async (event: FunnelEventInput) => {
  try {
    const response = await fetch(funnelEventEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    })
    if (!response.ok) {
      throw new Error(`Failed to log funnel event: ${response.status}`)
    }
  } catch (error) {
    console.warn('[aiFunnelService] Falling back to local funnel event store:', error)
    recordLocalEvent(event)
  }
}

const ensureLeadConversation = async (lead: Lead): Promise<string | null> => {
  const leadId = lead.id
  if (!leadId) return null

  const cached = leadConversationCache.get(leadId) ?? getStoredConversationId(leadId)
  if (cached) {
    leadConversationCache.set(leadId, cached)
    return cached
  }

  try {
    const conversation = await createConversation({
      scope: 'agent',
      leadId: leadId,
      contactName: lead.name ?? '',
      contactEmail: lead.email ?? '',
      contactPhone: lead.phone ?? '',
      type: 'chat',
      tags: ['lead'],
      intent: 'Lead Intake',
      language: 'English',
      metadata: {
        source: lead.source ?? 'Unknown',
        createdVia: 'ai-card'
      }
    })
    storeConversationId(leadId, conversation.id)
    return conversation.id
  } catch (error) {
    console.warn('[aiFunnelService] Failed to ensure conversation, continuing without log:', error)
    return null
  }
}

const appendConversationNote = async (
  lead: Lead,
  content: string,
  metadata?: Record<string, unknown>
) => {
  const conversationId = await ensureLeadConversation(lead)
  if (!conversationId) return
  try {
    await appendMessage({
      conversationId,
      role: 'system',
      content,
      channel: 'chat',
      metadata
    })
  } catch (error) {
    console.warn('[aiFunnelService] Failed to append conversation note:', error)
  }
}

export const logLeadCaptured = async (lead: Lead) => {
  await postFunnelEvent({
    leadId: lead.id,
    stage: 'lead_captured',
    action: 'created',
    metadata: {
      source: lead.source ?? 'Unknown',
      email: lead.email,
      phone: lead.phone
    }
  })

  await appendConversationNote(
    lead,
    `Lead captured from ${lead.source || 'Unknown source'}. Next step: qualify and follow up.`,
    {
      stage: 'lead_captured',
      eventType: 'lead'
    }
  )
}

export const logLeadContact = async (
  lead: Lead,
  details: { method: 'call' | 'email' | 'note'; outcome?: string; notes?: string }
) => {
  await postFunnelEvent({
    leadId: lead.id,
    stage: 'lead_contacted',
    action: details.method,
    metadata: {
      outcome: details.outcome,
      notes: details.notes
    }
  })

  const summaryParts = [`Lead contacted via ${details.method}.`]
  if (details.outcome) summaryParts.push(`Outcome: ${details.outcome}.`)
  if (details.notes) summaryParts.push(`Notes: ${details.notes}`)

  await appendConversationNote(
    lead,
    summaryParts.join(' '),
    {
      stage: 'lead_contacted',
      method: details.method,
      outcome: details.outcome
    }
  )
}

export const logAppointmentScheduled = async (appointment: Appointment, lead?: Lead) => {
  const leadId = appointment.leadId || lead?.id || 'manual'
  await postFunnelEvent({
    leadId,
    stage: 'appointment_scheduled',
    action: appointment.type || 'Appointment',
    metadata: {
      appointmentId: appointment.id,
      date: appointment.date,
      time: appointment.time,
      propertyId: appointment.propertyId,
      notes: appointment.notes
    }
  })

  if (lead) {
    await appendConversationNote(
      lead,
      `Appointment scheduled (${appointment.type}) for ${appointment.date} ${appointment.time}.`,
      {
        stage: 'appointment_scheduled',
        appointmentId: appointment.id,
        appointmentType: appointment.type
      }
    )
  }
}

