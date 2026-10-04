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

const STALE_DAYS = 14

// An idle chat: nobody left contact details, it never became a lead, and it has been quiet for two weeks.
export const isStaleIdle = (interaction: Interaction, now: number = Date.now()): boolean => {
  if (needsAttention(interaction)) return false
  if (interaction.contact.email || interaction.contact.phone) return false
  const last = new Date(String(interaction.metadata?.lastMessageAt || '')).getTime()
  return Number.isFinite(last) && now - last > STALE_DAYS * 24 * 60 * 60 * 1000
}

export const filterInteractions = (
  items: Interaction[],
  opts: { tab: InboxTab; search: string; showOld?: boolean; now?: number }
): Interaction[] => {
  const q = opts.search.trim().toLowerCase()
  return items.filter((item) => {
    if (opts.tab === 'attention' && !needsAttention(item)) return false
    // Old idle chats stay out of the way unless you search for something or ask to see them.
    if (opts.tab === 'all' && !opts.showOld && !q && isStaleIdle(item, opts.now)) return false
    if (!q) return true
    return [item.contact.name, item.contact.email, item.contact.phone, item.sourceName, item.message]
      .some((value) => String(value || '').toLowerCase().includes(q))
  })
}

export const countOldIdle = (items: Interaction[], now: number = Date.now()): number => items.filter((i) => isStaleIdle(i, now)).length

// How many chats need a person and have not been opened yet (the number on the menu).
export const countUnreadNeedsAttention = (items: Interaction[], readIds: Set<string>): number =>
  items.filter((i) => needsAttention(i) && !readIds.has(i.id)).length

export interface ReplyLink {
  href: string
  label: string
}

export interface ReplyTemplate {
  id: string
  label: string
  text: (firstName: string, address: string) => string
}

export const REPLY_TEMPLATES: ReplyTemplate[] = [
  { id: 'showing', label: 'Offer a showing', text: (n, a) => `Hi ${n}, thanks for your interest in ${a}. When works best for you to see it this week?` },
  { id: 'financing', label: 'Offer loan help', text: (n, a) => `Hi ${n}, I can connect you with a loan officer who can get you pre-approved for ${a}. Is a quick call OK?` },
  { id: 'checkin', label: 'Check in', text: (n, a) => `Hi ${n}, just checking in on ${a}. Any questions I can answer?` }
]

export const firstNameOf = (interaction: Interaction): string => {
  const first = String(interaction.contact.name || '').trim().split(/\s+/)[0]
  return !first || /^(unknown|buyer|visitor)$/i.test(first) ? 'there' : first
}

export const templateText = (interaction: Interaction, templateId: string): string => {
  const template = REPLY_TEMPLATES.find((t) => t.id === templateId)
  if (!template) return ''
  const address = String(interaction.metadata?.propertyAddress || interaction.sourceName || 'the home')
  return template.text(firstNameOf(interaction), address)
}

// Reply by email if we have one, otherwise by text. null = they have not left any contact details.
// A chosen template fills in the message so the admin only has to press send.
export const replyLinkFor = (interaction: Interaction, templateId?: string): ReplyLink | null => {
  const { email, phone } = interaction.contact
  const body = templateId ? templateText(interaction, templateId) : ''
  if (email) {
    const subject = encodeURIComponent(`Re: ${interaction.sourceName}`)
    return { href: `mailto:${email}?subject=${subject}${body ? `&body=${encodeURIComponent(body)}` : ''}`, label: 'Reply by email' }
  }
  if (phone) return { href: `sms:${phone}${body ? `?&body=${encodeURIComponent(body)}` : ''}`, label: 'Reply by text' }
  return null
}

const READ_KEY = 'hlai_admin_inbox_read'
export const READ_EVENT = 'hlai-inbox-read-changed'

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
    window.dispatchEvent(new Event(READ_EVENT))
  } catch {
    // private mode: read marks just will not stick
  }
}
