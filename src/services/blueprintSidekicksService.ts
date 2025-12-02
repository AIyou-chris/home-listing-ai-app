import { resolveUserId } from './userId'

export type BlueprintSidekickId = 'agent' | 'sales_marketing' | 'listing_agent'

export interface BlueprintSidekick {
  id: BlueprintSidekickId
  name: string
  description: string
  systemPrompt: string
}

const BP_STORAGE_KEY = 'hlai_blueprint_sidekicks_meta_v1'

const DEFAULT_SIDEKICKS: BlueprintSidekick[] = [
  {
    id: 'agent',
    name: 'Agent Sidekick',
    description: 'Represents the agent voice, tone, and lead interaction style.',
    systemPrompt: 'You are the agent’s primary sidekick. Use the agent profile, voice, and preferences. Summarize lead notes, appointment outcomes, and funnel status. Keep tone on-brand and concise.'
  },
  {
    id: 'sales_marketing',
    name: 'Sales & Marketing Sidekick',
    description: 'Writes emails, posts, SMS replies, and conversion CTAs.',
    systemPrompt: 'You are a skilled marketer for the agent. Write email templates, social posts, SMS replies. Promote lead conversion, personalization, and engagement. Offer CTA ideas and exportable content.'
  },
  {
    id: 'listing_agent',
    name: 'Listing Agent Sidekick',
    description: 'Listing-focused: pricing strategy, listing copy, Q&A.',
    systemPrompt: 'You are a listing-focused sidekick. Understand listings, pricing strategy, and home feature matching. Answer buyer/seller questions and refine listing descriptions.'
  }
]

const apiBase = (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_API_BASE_URL || ''
const API_BASE = apiBase.replace(/\/$/, '')

const persistLocal = (sidekicks: BlueprintSidekick[]) => {
  try {
    localStorage.setItem(BP_STORAGE_KEY, JSON.stringify(sidekicks))
  } catch {
    // ignore
  }
}

export const blueprintSidekicksService = {
  async list(): Promise<BlueprintSidekick[]> {
    // Try metadata file first
    try {
      const res = await fetch('/blueprint/ai-sidekicks/metadata.json')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.sidekicks)) {
          persistLocal(data.sidekicks)
          return data.sidekicks as BlueprintSidekick[]
        }
      }
    } catch {
      // ignore
    }
    // Try local cache
    try {
      const raw = localStorage.getItem(BP_STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw) as BlueprintSidekick[]
      }
    } catch {
      // ignore
    }
    // Fallback defaults
    persistLocal(DEFAULT_SIDEKICKS)
    return DEFAULT_SIDEKICKS
  },

  async savePrompt(sidekickId: BlueprintSidekickId, systemPrompt: string) {
    const body = { sidekickId, systemPrompt, userId: resolveUserId() }
    try {
      const res = await fetch(`${API_BASE}/api/blueprint/ai-sidekicks/${sidekickId}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error(`savePrompt failed ${res.status}`)
    } catch {
      // ignore errors in demo environments
    }
  },

  async uploadMemory(sidekickId: BlueprintSidekickId, file: File) {
    const text = await file.text().catch(() => '')
    const body = {
      sidekickId,
      userId: resolveUserId(),
      type: 'file',
      fileName: file.name,
      content: text
    }
    try {
      await fetch(`${API_BASE}/api/blueprint/ai-sidekicks/${sidekickId}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).catch(() => undefined)
    } catch {
      // ignore
    }
  },

  async chat(sidekickId: BlueprintSidekickId, message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>) {
    const res = await fetch(`${API_BASE}/api/blueprint/ai-sidekicks/${sidekickId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, userId: resolveUserId() })
    }).catch(() => null)
    if (res && res.ok) {
      const data = await res.json()
      return data?.response || ''
    }
    return 'I’m ready. Provide your prompt to begin.'
  }
}
