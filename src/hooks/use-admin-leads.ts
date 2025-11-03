import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AuthService } from '../services/authService'
import { Lead, LeadStatus } from '../types'

type NewLeadPayload = {
  name: string
  email: string
  phone: string
  status: LeadStatus
  source?: string
  notes?: string
}

type UpdateLeadPayload = Partial<Omit<Lead, 'id'>> & { id: string }

interface UseAdminLeadsResult {
  leads: Lead[]
  isLoading: boolean
  error: string | null
  refreshLeads: () => Promise<void>
  addLead: (payload: NewLeadPayload) => Promise<Lead>
  updateLead: (payload: UpdateLeadPayload) => Promise<void>
  deleteLead: (leadId: string) => Promise<void>
}

const LEADS_STORAGE_KEY = 'adminLeads'

const DEFAULT_LEADS: Lead[] = [
  {
    id: '1',
    name: 'Alice Cooper',
    email: 'alice@example.com',
    phone: '(555) 123-4567',
    status: 'New',
    source: 'Website',
    notes: 'Interested in downtown properties',
    date: '2024-01-15',
    lastMessage: '',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    phone: '(555) 987-6543',
    status: 'Contacted',
    source: 'Referral',
    notes: 'Looking for family home',
    date: '2024-01-14',
    lastMessage: '',
    createdAt: '2024-01-14'
  },
  {
    id: '3',
    name: 'Carol Brown',
    email: 'carol@example.com',
    phone: '(555) 456-7890',
    status: 'Qualified',
    source: 'Social Media',
    notes: 'First-time buyer',
    date: '2024-01-13',
    lastMessage: '',
    createdAt: '2024-01-13'
  }
]

const isBrowser = () => typeof window !== 'undefined'

const readLeadsFromStorage = (): Lead[] => {
  if (!isBrowser()) {
    return DEFAULT_LEADS
  }

  try {
    const saved = window.localStorage.getItem(LEADS_STORAGE_KEY)
    if (!saved) {
      return DEFAULT_LEADS
    }

    const parsed = JSON.parse(saved) as unknown
    if (Array.isArray(parsed)) {
      return parsed as Lead[]
    }

    return DEFAULT_LEADS
  } catch (error) {
    console.error('useAdminLeads: failed to parse leads from storage', error)
    return DEFAULT_LEADS
  }
}

const persistLeadsToStorage = (leads: Lead[]) => {
  if (!isBrowser()) {
    return
  }

  try {
    window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads))
  } catch (error) {
    console.error('useAdminLeads: failed to persist leads', error)
  }
}

const fetchLeadsFromApi = async (endpoint: string): Promise<Lead[]> => {
  const response = await AuthService.getInstance().makeAuthenticatedRequest(endpoint)
  if (!response.ok) {
    throw new Error(`Failed to fetch leads: ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data?.leads)) {
    throw new Error('Leads payload missing or invalid')
  }

  return data.leads as Lead[]
}

export const useAdminLeads = (): UseAdminLeadsResult => {
  const [leads, setLeads] = useState<Lead[]>(() => readLeadsFromStorage())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didInitialFetch = useRef(false)

  useEffect(() => {
    persistLeadsToStorage(leads)
  }, [leads])

  const refreshLeads = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const fallbackToStoredLeads = (message?: string) => {
      if (message) {
        setError(message)
      }
      setLeads(readLeadsFromStorage())
    }

    try {
      const primary = await fetchLeadsFromApi('http://localhost:5001/home-listing-ai/us-central1/api/admin/leads')
      setLeads(primary)
      return
    } catch (primaryError) {
      console.error('useAdminLeads: primary fetch failed', primaryError)
      try {
        const fallback = await fetchLeadsFromApi('http://localhost:5001/home-listing-ai/us-central1/api/test/admin/leads')
        setLeads(fallback)
        return
      } catch (testError) {
        console.error('useAdminLeads: fallback fetch failed', testError)
        const message =
          primaryError instanceof Error
            ? primaryError.message
            : testError instanceof Error
              ? testError.message
              : 'Failed to load leads'
        fallbackToStoredLeads(message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (didInitialFetch.current) {
      return
    }

    didInitialFetch.current = true
    refreshLeads().catch(error => {
      console.error('useAdminLeads: initial refresh failed', error)
    })
  }, [refreshLeads])

  const addLead = useCallback(async ({ name, email, phone, status, source, notes }: NewLeadPayload) => {
    const now = new Date()
    const lead: Lead = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      status,
      source,
      notes,
      date: now.toISOString().slice(0, 10),
      lastMessage: '',
      createdAt: now.toISOString()
    }

    setLeads(prev => [lead, ...prev])
    return lead
  }, [])

  const updateLead = useCallback(async ({ id, ...patch }: UpdateLeadPayload) => {
    setLeads(prev => prev.map(lead => (lead.id === id ? { ...lead, ...patch } : lead)))
  }, [])

  const deleteLead = useCallback(async (leadId: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== leadId))
  }, [])

  return useMemo(
    () => ({ leads, isLoading, error, refreshLeads, addLead, updateLead, deleteLead }),
    [leads, isLoading, error, refreshLeads, addLead, updateLead, deleteLead]
  )
}

export type { NewLeadPayload, UpdateLeadPayload }

