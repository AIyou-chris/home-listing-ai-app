import type { Interaction } from '../types'

// Pure helpers for the admin Inbox: what needs a human, search, who to reply to, and which items were read.

export type InboxTab = 'attention' | 'all'

const HOT_TAGS = ['showing', 'offer', 'financing', 'follow_up', 'timeline']

const tagsOf = (interaction: Interaction): string[] => {
  const tags = interaction.metadata?.tags
  return Array.isArray(tags) ? tags.map((t) => String(t).toLowerCase()) : []
}

// A buyer who left contact details, or asked about showing / offer / financing, is worth a human look.
export const needsAttention = (interaction: Interaction): boolean => {
  if (interaction.metadata?.leadId) return true
  if (String(interaction.metadata?.status || '') === 'follow-up') return true
  return tagsOf(interaction).some((tag) => HOT_TAGS.includes(tag))
}

export const filterInteractions = (items: Interaction[], opts: { tab: InboxTab; search: string }): Interaction[] => {
  const q = opts.search.trim().toLowerCase()
  return items.filter((item) => {
    if (opts.tab === 'attention' && !needsAttention(item)) return false
    if (!q) return true
    return [item.contact.name, item.contact.email, item.contact.phone, item.sourceName, item.message]
      .some((value) => String(value || '').toLowerCase().includes(q))
  })
}

export interface ReplyLink {
  href: string
  label: string
}

// Reply by email if we have one, otherwise by text. null = they have not left any contact details.
export const replyLinkFor = (interaction: Interaction): ReplyLink | null => {
  const { email, phone } = interaction.contact
  if (email) return { href: `mailto:${email}?subject=${encodeURIComponent(`Re: ${interaction.sourceName}`)}`, label: 'Reply by email' }
  if (phone) return { href: `sms:${phone}`, label: 'Reply by text' }
  return null
}

const READ_KEY = 'hlai_admin_inbox_read'

export const loadReadIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

export const saveReadIds = (ids: Set<string>): void => {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(-500)))
  } catch {
    // private mode: read marks just will not stick
  }
}
