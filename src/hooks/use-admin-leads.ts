import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { adminLeadsService, type CreateLeadPayload, type LeadNote, type UpdateLeadPayload } from '../services/adminLeadsService'
import { Lead, LeadStatus } from '../types'

type NewLeadPayload = CreateLeadPayload & { status: LeadStatus }

interface UseAdminLeadsResult {
  leads: Lead[]
  isLoading: boolean
  error: string | null
  refreshLeads: () => Promise<void>
  addLead: (payload: NewLeadPayload) => Promise<Lead>
  updateLead: (payload: UpdateLeadPayload) => Promise<void>
  deleteLead: (leadId: string) => Promise<void>
  addNote: (leadId: string, content: string) => Promise<LeadNote>
  fetchNotesForLead: (leadId: string) => Promise<LeadNote[]>
  notesByLeadId: Record<string, LeadNote[]>
}

export const useAdminLeads = (): UseAdminLeadsResult => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [notesByLeadId, setNotesByLeadId] = useState<Record<string, LeadNote[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didInitialFetch = useRef(false)

  const refreshLeads = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const payload = await adminLeadsService.list()
      setLeads(payload)
    } catch (err) {
      console.error('useAdminLeads: failed to fetch leads', err)
      setError(err instanceof Error ? err.message : 'Failed to load leads')
      setLeads([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (didInitialFetch.current) return
    didInitialFetch.current = true
    refreshLeads().catch(err => {
      console.error('useAdminLeads: initial fetch failed', err)
    })
  }, [refreshLeads])

  const addLead = useCallback(async ({ name, email, phone, status, source, notes }: NewLeadPayload) => {
    const lead = await adminLeadsService.create({
      name,
      email,
      phone,
      status,
      source,
      notes,
      funnelId: 'universal_sales',
      funnelType: 'universal_sales'
    })
    setLeads(prev => [lead, ...prev])
    return lead
  }, [])

  const updateLead = useCallback(async (payload: UpdateLeadPayload) => {
    const updated = await adminLeadsService.update(payload)
    if (!updated) return
    setLeads(prev => prev.map(lead => (lead.id === payload.id ? { ...lead, ...updated } : lead)))
  }, [])

  const deleteLead = useCallback(async (leadId: string) => {
    await adminLeadsService.remove(leadId)
    setLeads(prev => prev.filter(lead => lead.id !== leadId))
    setNotesByLeadId(prev => {
      const next = { ...prev }
      delete next[leadId]
      return next
    })
  }, [])

  const fetchNotesForLead = useCallback(async (leadId: string) => {
    const notes = await adminLeadsService.listNotes(leadId)
    setNotesByLeadId(prev => ({ ...prev, [leadId]: notes }))
    return notes
  }, [])

  const addNote = useCallback(async (leadId: string, content: string) => {
    const note = await adminLeadsService.addNote(leadId, content)
    setNotesByLeadId(prev => {
      const existing = prev[leadId] ?? []
      return { ...prev, [leadId]: [note, ...existing] }
    })
    return note
  }, [])

  return useMemo(
    () => ({
      leads,
      isLoading,
      error,
      refreshLeads,
      addLead,
      updateLead,
      deleteLead,
      addNote,
      fetchNotesForLead,
      notesByLeadId
    }),
    [leads, isLoading, error, refreshLeads, addLead, updateLead, deleteLead, addNote, fetchNotesForLead, notesByLeadId]
  )
}

export type { NewLeadPayload, UpdateLeadPayload, LeadNote }
