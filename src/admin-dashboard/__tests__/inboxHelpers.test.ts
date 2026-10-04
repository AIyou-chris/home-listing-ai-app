import type { Interaction } from '../../types'
import { filterInteractions, loadReadIds, needsAttention, replyLinkFor, saveReadIds } from '../inboxHelpers'

const item = (over: Partial<Interaction> & { metadata?: Record<string, unknown> } = {}): Interaction => ({
  id: 'i', sourceType: 'listing-inquiry', sourceName: '1 Main St', contact: { name: 'Maya' }, message: 'hello', timestamp: 't', isRead: false, ...over
})

describe('needsAttention', () => {
  it('flags captured leads and hot topics, not idle browsing', () => {
    expect(needsAttention(item({ metadata: { leadId: 'l1' } }))).toBe(true)
    expect(needsAttention(item({ metadata: { tags: ['Financing'] } }))).toBe(true)
    expect(needsAttention(item({ metadata: { status: 'follow-up' } }))).toBe(true)
    expect(needsAttention(item({ metadata: { tags: ['schools'] } }))).toBe(false)
    expect(needsAttention(item())).toBe(false)
  })
})

describe('filterInteractions', () => {
  const list = [
    item({ id: 'a', contact: { name: 'Maya Reynolds', email: 'maya@example.com' }, metadata: { leadId: 'l1' } }),
    item({ id: 'b', contact: { name: 'Sam' }, message: 'what are the schools like' })
  ]
  it('shows only items that need a human on the attention tab', () => {
    expect(filterInteractions(list, { tab: 'attention', search: '' }).map((i) => i.id)).toEqual(['a'])
    expect(filterInteractions(list, { tab: 'all', search: '' }).map((i) => i.id)).toEqual(['a', 'b'])
  })
  it('searches name, email and message', () => {
    expect(filterInteractions(list, { tab: 'all', search: 'MAYA@' }).map((i) => i.id)).toEqual(['a'])
    expect(filterInteractions(list, { tab: 'all', search: 'schools' }).map((i) => i.id)).toEqual(['b'])
    expect(filterInteractions(list, { tab: 'all', search: 'zzz' })).toEqual([])
  })
})

describe('replyLinkFor', () => {
  it('prefers email, then text, else nothing', () => {
    expect(replyLinkFor(item({ contact: { name: 'M', email: 'm@x.com', phone: '+1555' } }))?.href).toMatch(/^mailto:m@x.com\?subject=/)
    expect(replyLinkFor(item({ contact: { name: 'M', phone: '+15125550001' } }))).toEqual({ href: 'sms:+15125550001', label: 'Reply by text' })
    expect(replyLinkFor(item())).toBeNull()
  })
})

describe('read marks', () => {
  it('survive a reload', () => {
    localStorage.clear()
    saveReadIds(new Set(['a', 'b']))
    expect([...loadReadIds()].sort()).toEqual(['a', 'b'])
  })
})
