import { toConversationRow, toMessageRow } from '../adminConversationsAdapters'

describe('toConversationRow', () => {
  it('turns the admin API shape into the shape the screen reads', () => {
    const row = toConversationRow({
      id: 'c1', userId: 'u1', scope: 'agent', listingId: 'l1', leadId: 'lead1', contactName: 'Maya Reynolds',
      contactEmail: 'maya@example.com', contactPhone: '+15125550001', type: 'chat', lastMessage: 'Can I tour on Friday?',
      lastMessageAt: '2026-10-04T10:00:00Z', status: 'active', messageCount: 6, tags: ['financing'], created_at: '2026-10-04T09:00:00Z'
    })
    expect(row).toMatchObject({
      id: 'c1', user_id: 'u1', listing_id: 'l1', lead_id: 'lead1', contact_name: 'Maya Reynolds', contact_email: 'maya@example.com',
      last_message: 'Can I tour on Friday?', last_message_at: '2026-10-04T10:00:00Z', message_count: 6, tags: ['financing']
    })
  })

  it('also accepts rows that are already snake_case, and fills safe defaults', () => {
    const row = toConversationRow({ id: 'c2', contact_name: 'Sam', message_count: 2, created_at: '2026-10-01T00:00:00Z' })
    expect(row.contact_name).toBe('Sam')
    expect(row.message_count).toBe(2)
    expect(row.status).toBe('active')
    expect(row.tags).toEqual([])
    expect(row.type).toBe('chat')
  })
})

describe('toMessageRow', () => {
  it('shows buyers as "lead", not as the AI', () => {
    expect(toMessageRow({ id: 'm1', conversationId: 'c1', sender: 'visitor', content: 'hi', created_at: 'x' }).sender).toBe('lead')
    expect(toMessageRow({ id: 'm2', conversationId: 'c1', sender: 'ai', content: 'hello', created_at: 'x' }).sender).toBe('ai')
  })

  it('keeps the text and conversation id', () => {
    const row = toMessageRow({ id: 'm3', conversationId: 'c9', sender: 'ai', content: 'Yes, Friday works.', created_at: 't' })
    expect(row.content).toBe('Yes, Friday works.')
    expect(row.conversation_id).toBe('c9')
  })
})
