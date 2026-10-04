import type { Interaction } from '../../types'
import { countOldIdle, countUnreadNeedsAttention, filterInteractions, firstNameOf, isStaleIdle, loadReadIds, needsAttention, replyLinkFor, saveReadIds, templateText } from '../inboxHelpers'

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

const NOW = Date.parse('2026-10-20T12:00:00Z')
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86400000).toISOString()

describe('old idle chats', () => {
  const old = item({ id: 'old', metadata: { lastMessageAt: iso(20) } })
  const recent = item({ id: 'recent', metadata: { lastMessageAt: iso(3) } })
  const oldWithPhone = item({ id: 'old-phone', contact: { name: 'P', phone: '+1555' }, metadata: { lastMessageAt: iso(30) } })
  const oldLead = item({ id: 'old-lead', metadata: { lastMessageAt: iso(30), leadId: 'l' } })

  it('only counts quiet, contact-less, non-lead chats older than 14 days', () => {
    expect([old, recent, oldWithPhone, oldLead].map((i) => isStaleIdle(i, NOW))).toEqual([true, false, false, false])
    expect(countOldIdle([old, recent, oldWithPhone, oldLead], NOW)).toBe(1)
  })

  it('hides them on All unless you search or ask to see them', () => {
    const all = [old, recent]
    expect(filterInteractions(all, { tab: 'all', search: '', now: NOW }).map((i) => i.id)).toEqual(['recent'])
    expect(filterInteractions(all, { tab: 'all', search: '', showOld: true, now: NOW }).map((i) => i.id)).toEqual(['old', 'recent'])
    expect(filterInteractions(all, { tab: 'all', search: 'hello', now: NOW }).map((i) => i.id)).toEqual(['old', 'recent'])
  })
})

describe('menu count', () => {
  it('counts needs-you chats that have not been opened', () => {
    const a = item({ id: 'a', metadata: { leadId: 'l' } })
    const b = item({ id: 'b', metadata: { tags: ['showing'] } })
    const c = item({ id: 'c' })
    expect(countUnreadNeedsAttention([a, b, c], new Set())).toBe(2)
    expect(countUnreadNeedsAttention([a, b, c], new Set(['a']))).toBe(1)
  })
})

describe('quick replies', () => {
  const maya = item({ contact: { name: 'Maya Reynolds', email: 'maya@example.com' }, metadata: { propertyAddress: '124 Oak St' } })
  it('uses the first name, and "there" when we do not know it', () => {
    expect(firstNameOf(maya)).toBe('Maya')
    expect(firstNameOf(item({ contact: { name: 'Unknown Contact' } }))).toBe('there')
  })
  it('fills in the home and puts the message in the link', () => {
    expect(templateText(maya, 'showing')).toContain('Hi Maya, thanks for your interest in 124 Oak St.')
    expect(replyLinkFor(maya, 'showing')?.href).toContain('&body=Hi%20Maya')
    expect(replyLinkFor(item({ contact: { name: 'P', phone: '+1555' } }), 'checkin')?.href).toMatch(/^sms:\+1555\?&body=Hi%20P/)
    expect(replyLinkFor(maya)?.href).not.toContain('body=')
  })
})
