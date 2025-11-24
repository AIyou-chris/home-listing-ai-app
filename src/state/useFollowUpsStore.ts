import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { ActiveLeadFollowUp, FollowUpHistoryEvent } from '../types'

type FollowUpStatus = ActiveLeadFollowUp['status']

export type FollowUpAISuggestionSeverity = 'info' | 'warning' | 'critical'

export interface FollowUpAISuggestion {
  id: string
  title: string
  message: string
  severity: FollowUpAISuggestionSeverity
  actionLabel?: string
}

export interface FollowUpFilters {
  status: FollowUpStatus | 'all'
  sequenceId?: string
  search: string
}

interface FollowUpsState {
  activeFollowUps: ActiveLeadFollowUp[]
  isLoading: boolean
  isUpdatingId?: string
  error?: string | null
  hasHydrated: boolean
  selectedId: string | null
  filters: FollowUpFilters
  suggestionMap: Record<string, FollowUpAISuggestion[]>
  analyzeError?: string | null
  isAnalyzingId?: string
  fetchFollowUps: () => Promise<void>
  selectFollowUp: (id: string | null) => void
  setFilters: (updates: Partial<FollowUpFilters>) => void
  updateStatus: (id: string, status: FollowUpStatus) => Promise<void>
  logManualTouch: (id: string, note: string) => Promise<void>
  appendHistory: (id: string, event: FollowUpHistoryEvent) => void
  analyzeFollowUp: (id: string) => Promise<void>
}

const initialState: Omit<FollowUpsState, 'fetchFollowUps' | 'selectFollowUp' | 'setFilters' | 'updateStatus' | 'logManualTouch' | 'appendHistory' | 'analyzeFollowUp'> = {
  activeFollowUps: [],
  isLoading: false,
  isUpdatingId: undefined,
  error: null,
  hasHydrated: false,
  selectedId: null,
  filters: {
    status: 'all',
    sequenceId: undefined,
    search: ''
  },
  suggestionMap: {},
  analyzeError: null,
  isAnalyzingId: undefined
}

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : 'Unexpected error');

export const useFollowUpsStore = create<FollowUpsState>()(
  immer((set, get) => ({
    ...initialState,
    fetchFollowUps: async () => {
      set((state) => {
        state.isLoading = true
        state.error = null
      })

      try {
        const response = await fetch('/api/admin/marketing/active-followups')
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = await response.json()
        const followUps: ActiveLeadFollowUp[] = data?.activeFollowUps ?? []

        set((state) => {
          state.activeFollowUps = followUps
          state.hasHydrated = true
          if (!state.selectedId && followUps.length > 0) {
            state.selectedId = followUps[0].id
          } else if (state.selectedId && !followUps.some((followUp) => followUp.id === state.selectedId)) {
            state.selectedId = followUps[0]?.id ?? null
          }
        })
      } catch (error: unknown) {
        console.error('Failed to load active follow-ups:', error)
        const message = getErrorMessage(error) || 'Unable to load follow-ups.'
        set((state) => {
          state.error = message
        })
      } finally {
        set((state) => {
          state.isLoading = false
        })
      }
    },
    selectFollowUp: (id) => {
      set((state) => {
        state.selectedId = id
      })
    },
    setFilters: (updates) => {
      set((state) => {
        state.filters = {
          ...state.filters,
          ...updates
        }
      })
    },
    updateStatus: async (id, status) => {
      set((state) => {
        state.isUpdatingId = id
      })

      try {
        const response = await fetch(`/api/admin/marketing/active-followups/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data = await response.json()
        set((state) => {
          state.activeFollowUps = state.activeFollowUps.map((followUp) =>
            followUp.id === id ? data.followUp ?? { ...followUp, status } : followUp
          )
        })
      } catch (error: unknown) {
        console.error('Failed to update follow-up status:', error)
        set((state) => {
          state.activeFollowUps = state.activeFollowUps.map((followUp) => {
            if (followUp.id !== id) return followUp
            const historyEvent: FollowUpHistoryEvent = {
              id: `h-${Date.now()}`,
              type: status === 'active' ? 'resume' : status === 'paused' ? 'pause' : 'cancel',
              description: `Sequence ${status}.`,
              date: new Date().toISOString()
            }
            return {
              ...followUp,
              status,
              history: [historyEvent, ...followUp.history]
            }
          })
        })
      } finally {
        set((state) => {
          state.isUpdatingId = undefined
        })
      }
    },
    logManualTouch: async (id, note) => {
      const event: FollowUpHistoryEvent = {
        id: `manual-${Date.now()}`,
        type: 'manual-touch',
        description: note,
        date: new Date().toISOString()
      }

      // optimistic update
      get().appendHistory(id, event)

      try {
        await fetch(`/api/admin/marketing/active-followups/${id}/manual-touch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note })
        })
      } catch (error) {
        console.warn('Manual touch endpoint not available, keeping local log.', error)
      }
    },
    appendHistory: (id, event) => {
      set((state) => {
        state.activeFollowUps = state.activeFollowUps.map((followUp) =>
          followUp.id === id
            ? {
                ...followUp,
                history: [event, ...followUp.history]
              }
            : followUp
        )
      })
    },
    analyzeFollowUp: async (id) => {
      const followUp = get().activeFollowUps.find((candidate) => candidate.id === id)
      if (!followUp) return

      set((state) => {
        state.isAnalyzingId = id
        state.analyzeError = null
      })

      try {
        const response = await fetch(`/api/admin/marketing/active-followups/${id}/analyze`)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = await response.json()
        const suggestions: FollowUpAISuggestion[] = data?.suggestions ?? []
        if (suggestions.length > 0) {
          set((state) => {
            state.suggestionMap[id] = suggestions
          })
          return
        }
        throw new Error('No suggestions returned')
      } catch (error: unknown) {
        console.warn('AI analysis endpoint unavailable, generating heuristic suggestions.', error)
        const heuristics = buildHeuristicSuggestions(followUp)
        if (heuristics.length === 0) {
          const message = getErrorMessage(error) || 'No suggestions available yet.'
          set((state) => {
            state.analyzeError = message
          })
        } else {
          set((state) => {
            state.suggestionMap[id] = heuristics
          })
        }
      } finally {
        set((state) => {
          state.isAnalyzingId = undefined
        })
      }
    }
  }))
)

const hoursSince = (iso?: string) => {
  if (!iso) return Number.MAX_SAFE_INTEGER
  const deltaMs = Date.now() - new Date(iso).getTime()
  return deltaMs / (1000 * 60 * 60)
}

const buildHeuristicSuggestions = (followUp: ActiveLeadFollowUp): FollowUpAISuggestion[] => {
  const suggestions: FollowUpAISuggestion[] = []
  const latestEvent = followUp.history[0]
  const hoursSinceLastEvent = hoursSince(latestEvent?.date)

  if (followUp.status === 'paused' && hoursSinceLastEvent > 24) {
    suggestions.push({
      id: 'resume-check',
      title: 'Paused follow-up',
      message: 'This follow-up has been paused for over a day. Confirm the blocker and resume if cleared.',
      severity: 'warning',
      actionLabel: 'Resume follow-up'
    })
  }

  if (followUp.status === 'active' && hoursSinceLastEvent > 48) {
    suggestions.push({
      id: 'stale-touch',
      title: 'Stale timeline',
      message: 'No recorded touch in the last 48 hours. Consider sending a personal check-in or adding a reminder.',
      severity: 'warning',
      actionLabel: 'Send check-in'
    })
  }

  if (followUp.currentStepIndex === followUp.history.length - 1) {
    suggestions.push({
      id: 'review-next-step',
      title: 'Approaching final step',
      message: 'You are near the end of this sequence. Queue a follow-up campaign or task to stay in touch.',
      severity: 'info'
    })
  }

  if (followUp.status === 'cancelled') {
    suggestions.push({
      id: 'cancel-review',
      title: 'Cancelled follow-up',
      message: 'Ensure the lead status is updated and note why the sequence was cancelled for future analytics.',
      severity: 'info'
    })
  }

  return suggestions
}

