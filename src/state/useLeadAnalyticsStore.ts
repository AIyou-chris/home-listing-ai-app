import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { leadsService } from '../services/leadsService'
import { Lead } from '../types'

export interface LeadStatsResponse {
  total: number
  new: number
  qualified: number
  contacted: number
  showing: number
  lost: number
  conversionRate: string | number
  scoreStats: {
    averageScore: string | number
    qualified: number
    hot: number
    warm: number
    cold: number
    highestScore: number
  }
}

export interface ScoringRuleResponse {
  id: string
  name: string
  description: string
  points: number
  category: string
}

export interface ScoreTierResponse {
  id: string
  min: number
  max: number
  description: string
}

export interface LeadSourceBreakdownItem {
  sourceName: string
  leadCount: number
  conversionRate: number
  hotCount: number
}

type ScoringRulesPayload = {
  rules?: Array<{
    id: string
    name: string
    description: string
    points: number
    category: string
  }>
  tiers?: Record<string, { min: number; max: number; description: string }>
}

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : 'Unexpected error')

export interface LeadAnalyticsState {
  isLoading: boolean
  error?: string | null
  hasHydrated: boolean
  stats?: LeadStatsResponse
  scoringRules: ScoringRuleResponse[]
  scoreTiers: ScoreTierResponse[]
  leadSources: LeadSourceBreakdownItem[]
  refresh: () => Promise<void>
}

const normalizeConversionRate = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const tierOrder = ['QUALIFIED', 'HOT', 'WARM', 'COLD']

const buildSourceBreakdown = (leads: Lead[]): LeadSourceBreakdownItem[] => {
  const map = new Map<string, { leadCount: number; hotCount: number }>()

  leads.forEach((lead) => {
    const sourceRaw = lead.source || 'Unknown'
    const source = sourceRaw.trim() || 'Unknown'
    const entry = map.get(source) ?? { leadCount: 0, hotCount: 0 }
    entry.leadCount += 1
    if (lead.score?.tier === 'Qualified' || lead.score?.tier === 'Hot') {
      entry.hotCount += 1
    }
    map.set(source, entry)
  })

  return Array.from(map.entries()).map(([sourceName, { leadCount, hotCount }]) => ({
    sourceName,
    leadCount,
    hotCount,
    conversionRate: leadCount > 0 ? Math.round((hotCount / leadCount) * 1000) / 10 : 0
  }))
}

const convertTiers = (tiers: Record<string, { min: number; max: number; description: string }>): ScoreTierResponse[] => {
  return tierOrder
    .filter((key) => Boolean(tiers[key]))
    .map((key) => ({
      id: key,
      min: tiers[key].min,
      max: tiers[key].max,
      description: tiers[key].description
    }))
}

const fetchScoringRules = async (): Promise<{ rules: ScoringRuleResponse[]; tiers: ScoreTierResponse[] }> => {
  const response = await fetch('/api/leads/scoring-rules')
  if (!response.ok) {
    throw new Error(`Failed to load scoring rules: ${response.status}`)
  }
  const data = (await response.json()) as ScoringRulesPayload
  const rawRules = Array.isArray(data?.rules) ? data.rules : []
  return {
    rules: rawRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      points: rule.points,
      category: rule.category
    })),
    tiers: convertTiers(data?.tiers ?? {})
  }
}

export const useLeadAnalyticsStore = create<LeadAnalyticsState>()(
  immer((set, get) => ({
    isLoading: false,
    error: null,
    hasHydrated: false,
    stats: undefined,
    scoringRules: [],
    scoreTiers: [],
    leadSources: [],
    refresh: async () => {
      if (get().isLoading) return
      set((state) => {
        state.isLoading = true
        state.error = null
      })

      try {
        const [statsResponse, leadsResponse, scoringResponse] = await Promise.all([
          leadsService.stats(),
          leadsService.list(),
          fetchScoringRules()
        ])

        const stats: LeadStatsResponse = {
          total: statsResponse.total ?? 0,
          new: statsResponse.new ?? 0,
          qualified: statsResponse.qualified ?? 0,
          contacted: statsResponse.contacted ?? 0,
          showing: statsResponse.showing ?? 0,
          lost: statsResponse.lost ?? 0,
          conversionRate: normalizeConversionRate(statsResponse.conversionRate),
          scoreStats: {
            averageScore: normalizeConversionRate(statsResponse.scoreStats?.averageScore),
            qualified: statsResponse.scoreStats?.qualified ?? 0,
            hot: statsResponse.scoreStats?.hot ?? 0,
            warm: statsResponse.scoreStats?.warm ?? 0,
            cold: statsResponse.scoreStats?.cold ?? 0,
            highestScore: statsResponse.scoreStats?.highestScore ?? 0
          }
        }

        const leads: Lead[] = Array.isArray(leadsResponse?.leads) ? leadsResponse.leads : []
        const leadSources = buildSourceBreakdown(leads)

        set((state) => {
          state.stats = stats
          state.scoringRules = scoringResponse.rules
          state.scoreTiers = scoringResponse.tiers
          state.leadSources = leadSources
          state.hasHydrated = true
        })
      } catch (error: unknown) {
        console.error('Lead analytics fetch failed:', error)
        const message = getErrorMessage(error) || 'Unable to load analytics.'
        set((state) => {
          state.error = message
        })
      } finally {
        set((state) => {
          state.isLoading = false
        })
      }
    }
  }))
)
