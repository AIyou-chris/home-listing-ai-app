import type { ConversationRow, MessageRow } from './chatService'

// The admin API sends camelCase (contactName, lastMessage). The conversations screen reads the same
// snake_case shape the agent screens use (contact_name, last_message). Without this translation every
// admin conversation showed "Unknown Contact" with no last message and no message count.

type Loose = Record<string, unknown>

const str = (value: unknown): string | null => (typeof value === 'string' && value ? value : null)
const pick = (api: Loose, camel: string, snake: string): unknown => (api[camel] !== undefined ? api[camel] : api[snake])

export const toConversationRow = (api: Loose): ConversationRow => ({
  id: String(api.id),
  user_id: str(pick(api, 'userId', 'user_id')),
  scope: (str(api.scope) || 'agent') as ConversationRow['scope'],
  listing_id: str(pick(api, 'listingId', 'listing_id')),
  lead_id: str(pick(api, 'leadId', 'lead_id')),
  title: str(api.title),
  contact_name: str(pick(api, 'contactName', 'contact_name')),
  contact_email: str(pick(api, 'contactEmail', 'contact_email')),
  contact_phone: str(pick(api, 'contactPhone', 'contact_phone')),
  type: (str(api.type) || 'chat') as ConversationRow['type'],
  last_message: str(pick(api, 'lastMessage', 'last_message')),
  last_message_at: str(pick(api, 'lastMessageAt', 'last_message_at')),
  status: (str(api.status) || 'active') as ConversationRow['status'],
  message_count: Number(pick(api, 'messageCount', 'message_count') || 0),
  property: str(api.property),
  tags: Array.isArray(api.tags) ? (api.tags as string[]) : [],
  intent: str(api.intent),
  language: str(api.language),
  voice_transcript: str(pick(api, 'voiceTranscript', 'voice_transcript')),
  follow_up_task: str(pick(api, 'followUpTask', 'follow_up_task')),
  metadata: (api.metadata && typeof api.metadata === 'object' ? api.metadata : {}) as ConversationRow['metadata'],
  created_at: String(api.created_at || api.createdAt || api.startedAt || new Date(0).toISOString()),
  updated_at: str(pick(api, 'updatedAt', 'updated_at'))
})

// Buyers are saved as "visitor"; the screen's word for them is "lead" (otherwise they showed as "AI Sidekick").
export const toMessageRow = (api: Loose): MessageRow => {
  const sender = String(api.sender || 'ai')
  return {
    id: String(api.id),
    conversation_id: String(pick(api, 'conversationId', 'conversation_id')),
    user_id: str(pick(api, 'userId', 'user_id')),
    sender: (sender === 'visitor' || sender === 'user' ? 'lead' : sender) as MessageRow['sender'],
    channel: (str(api.channel) || 'chat') as MessageRow['channel'],
    content: String(api.content ?? api.text ?? ''),
    translation: (api.translation ?? null) as MessageRow['translation'],
    metadata: (api.metadata ?? {}) as MessageRow['metadata'],
    created_at: String(api.created_at || api.createdAt || new Date(0).toISOString())
  }
}
