import type { Lead } from '../../types'
import { selectCallFirst, selectDroppedBall, waitingLabel, ownerKeyOf } from '../leadInsights'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const ago = (hours: number) => new Date(NOW - hours * 3600 * 1000).toISOString()

const lead = (over: Partial<Lead>): Lead => ({
  id: 'l', name: 'Lead', status: 'New', email: '', phone: '', date: ago(1), lastMessage: '', createdAt: ago(1), ...over
}) as Lead

describe('waitingLabel', () => {
  it('uses minutes, hours, then days', () => {
    expect(waitingLabel(lead({ createdAt: ago(0.1) }), NOW)).toBe('6m')
    expect(waitingLabel(lead({ createdAt: ago(5) }), NOW)).toBe('5h')
    expect(waitingLabel(lead({ createdAt: ago(50) }), NOW)).toBe('2d')
  })
})

describe('selectCallFirst', () => {
  it('lists only untouched hot or warm leads, hottest then longest waiting', () => {
    const rows = [
      lead({ id: 'cold', intentLevel: 'Cold', createdAt: ago(30) }),
      lead({ id: 'warm-old', intentLevel: 'Warm', createdAt: ago(20) }),
      lead({ id: 'hot-new', intentLevel: 'Hot', createdAt: ago(2) }),
      lead({ id: 'hot-old', intentLevel: 'Hot', createdAt: ago(10) }),
      lead({ id: 'hot-called', intentLevel: 'Hot', lastContactAt: ago(1) }),
      lead({ id: 'hot-contacted-status', intentLevel: 'Hot', status: 'Contacted' })
    ]
    expect(selectCallFirst(rows, NOW).map((l) => l.id)).toEqual(['hot-old', 'hot-new', 'warm-old'])
  })

  it('falls back to the score when there is no intent level', () => {
    const rows = [lead({ id: 'scored', score: { totalScore: 95 } as Lead['score'] })]
    expect(selectCallFirst(rows, NOW).map((l) => l.id)).toEqual(['scored'])
  })

  it('stops at the limit', () => {
    const rows = Array.from({ length: 9 }, (_, i) => lead({ id: `h${i}`, intentLevel: 'Hot' }))
    expect(selectCallFirst(rows, NOW)).toHaveLength(5)
  })
})

describe('selectDroppedBall', () => {
  it('groups untouched leads older than 24 hours by owner, biggest group first', () => {
    const rows = [
      lead({ id: '1', ownerId: 'a', ownerName: 'Fred', createdAt: ago(30) }),
      lead({ id: '2', ownerId: 'a', ownerName: 'Fred', createdAt: ago(80) }),
      lead({ id: '3', ownerId: 'b', ownerName: 'Chris', createdAt: ago(26) }),
      lead({ id: '4', ownerId: 'a', ownerName: 'Fred', createdAt: ago(3) }),
      lead({ id: '5', ownerId: 'a', ownerName: 'Fred', createdAt: ago(40), lastContactAt: ago(1) }),
      lead({ id: '6', createdAt: ago(48) })
    ]
    const groups = selectDroppedBall(rows, NOW)
    expect(groups.map((g) => [g.label, g.count])).toEqual([['Fred', 2], ['Chris', 1], ['No owner', 1]])
    expect(groups[0].oldestLabel).toBe('3d')
  })

  it('is empty when nothing is overdue', () => {
    expect(selectDroppedBall([lead({ createdAt: ago(5) })], NOW)).toEqual([])
  })
})

describe('ownerKeyOf', () => {
  it('prefers the id, then the name, then none', () => {
    expect(ownerKeyOf({ ownerId: 'x', ownerName: 'A' })).toBe('x')
    expect(ownerKeyOf({ ownerId: null, ownerName: 'A' })).toBe('name:A')
    expect(ownerKeyOf({ ownerId: null, ownerName: null })).toBe('none')
  })
})
