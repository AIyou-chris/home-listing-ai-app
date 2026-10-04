import type { Lead } from '../types'

// Plain helpers for the admin Leads tab: who needs a call first, and whose leads are going cold.

const HOUR = 60 * 60 * 1000
export const DROPPED_BALL_HOURS = 24

export const ownerKeyOf = (lead: Pick<Lead, 'ownerId' | 'ownerName'>): string => lead.ownerId || (lead.ownerName ? `name:${lead.ownerName}` : 'none')

export const ownerLabelOf = (lead: Pick<Lead, 'ownerName'>): string => lead.ownerName || 'No owner'

// A lead nobody has touched yet.
export const isUntouched = (lead: Lead): boolean => lead.status === 'New' && !lead.lastContactAt

const ageMs = (lead: Lead, now: number): number => {
  const created = new Date(lead.createdAt || lead.date || '').getTime()
  return Number.isFinite(created) ? Math.max(0, now - created) : 0
}

export const waitingLabel = (lead: Lead, now: number = Date.now()): string => {
  const mins = Math.floor(ageMs(lead, now) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const heat = (lead: Lead): number => {
  const level = String(lead.intentLevel || '').toLowerCase()
  if (level === 'hot') return 2
  if (level === 'warm') return 1
  const score = lead.score?.totalScore ?? 0
  if (score >= 90) return 2
  if (score >= 70) return 1
  return 0
}

// Hot and warm leads nobody has contacted, longest-waiting first (speed to lead wins).
export const selectCallFirst = (leads: Lead[], now: number = Date.now(), limit = 5): Lead[] =>
  leads
    .filter((lead) => isUntouched(lead) && heat(lead) > 0)
    .sort((a, b) => heat(b) - heat(a) || ageMs(b, now) - ageMs(a, now))
    .slice(0, limit)

export interface DroppedBallGroup {
  key: string
  label: string
  count: number
  oldestLabel: string
}

// Untouched leads older than 24 hours, grouped by who owns them (most first).
export const selectDroppedBall = (leads: Lead[], now: number = Date.now()): DroppedBallGroup[] => {
  const groups = new Map<string, { label: string; leads: Lead[] }>()
  leads
    .filter((lead) => isUntouched(lead) && ageMs(lead, now) >= DROPPED_BALL_HOURS * HOUR)
    .forEach((lead) => {
      const key = ownerKeyOf(lead)
      const group = groups.get(key) || { label: ownerLabelOf(lead), leads: [] }
      group.leads.push(lead)
      groups.set(key, group)
    })
  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      label: group.label,
      count: group.leads.length,
      oldestLabel: waitingLabel(group.leads.reduce((oldest, l) => (ageMs(l, now) > ageMs(oldest, now) ? l : oldest)), now)
    }))
    .sort((a, b) => b.count - a.count)
}
