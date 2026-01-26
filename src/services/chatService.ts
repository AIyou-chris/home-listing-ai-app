export type ChatScope = 'agent' | 'listing' | 'marketing'
export type ConversationChannel = 'chat' | 'voice' | 'email' | 'sms'

type ConversationMetadata = Record<string, unknown> | null
type MessageTranslation = Record<string, unknown> | string | null
type MessageMetadata = Record<string, unknown> | null

export interface ConversationRow {
  id: string
  user_id: string | null
  scope: ChatScope
  listing_id?: string | null
  lead_id?: string | null
  title?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  type: ConversationChannel
  last_message?: string | null
  last_message_at?: string | null
  status: 'active' | 'archived' | 'important' | 'follow-up'
  message_count?: number
  property?: string | null
  tags?: string[] | null
  intent?: string | null
  language?: string | null
  voice_transcript?: string | null
  follow_up_task?: string | null
  metadata?: ConversationMetadata
  created_at: string
  updated_at?: string | null
}

export interface MessageRow {
  id: string
  conversation_id: string
  user_id: string | null
  sender: 'lead' | 'agent' | 'ai'
  channel: ConversationChannel
  content: string
  translation: MessageTranslation
  metadata: MessageMetadata
  created_at: string
}

const randomId = () => `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`

const buildMockConversation = (params: {
  userId?: string | null
  scope: ChatScope
  listingId?: string | null
  title?: string | null
  leadId?: string | null
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  type?: ConversationChannel
  intent?: string | null
  language?: string | null
  property?: string | null
  tags?: string[] | null
}): ConversationRow => {
  return {
    id: randomId(),
    user_id: params.userId ?? null,
    scope: params.scope,
    listing_id: params.listingId ?? null,
    lead_id: params.leadId ?? null,
    title: params.title ?? 'New Conversation',
    contact_name: params.contactName ?? null,
    contact_email: params.contactEmail ?? null,
    contact_phone: params.contactPhone ?? null,
    type: params.type ?? 'chat',
    last_message: null,
    last_message_at: new Date().toISOString(),
    status: 'active',
    message_count: 0,
    property: params.property ?? null,
    tags: params.tags ?? null,
    intent: params.intent ?? null,
    language: params.language ?? 'en',
    voice_transcript: null,
    follow_up_task: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: null
  }
}

export const createConversation = async (params: {
  userId?: string | null
  scope: ChatScope
  listingId?: string | null
  title?: string | null
  leadId?: string | null
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  type?: ConversationChannel
  intent?: string | null
  language?: string | null
  property?: string | null
  tags?: string[] | null
  voiceTranscript?: string | null
  followUpTask?: string | null
  metadata?: ConversationMetadata
}): Promise<ConversationRow> => {
  try {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: params.userId,
        scope: params.scope,
        listingId: params.listingId,
        leadId: params.leadId,
        title: params.title,
        contactName: params.contactName,
        contactEmail: params.contactEmail,
        contactPhone: params.contactPhone,
        type: params.type,
        intent: params.intent,
        language: params.language,
        property: params.property,
        tags: params.tags,
        voiceTranscript: params.voiceTranscript,
        followUpTask: params.followUpTask,
        metadata: params.metadata
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ConversationRow;
  } catch (error) {
    console.warn('[chatService] Falling back to mock conversation:', error)
    return buildMockConversation(params)
  }
}

export const listConversations = async (params: {
  userId?: string
  scope?: ChatScope
  listingId?: string
} = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.scope) queryParams.append('scope', params.scope);
    if (params.listingId) queryParams.append('listingId', params.listingId);

    const response = await fetch(`/api/conversations?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ConversationRow[];
  } catch (error) {
    console.error('Error listing conversations:', error);
    return [] as ConversationRow[];
  }
}

export const getMessages = async (
  conversationId: string,
  limit = 100
): Promise<MessageRow[]> => {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as MessageRow[];
  } catch (error) {
    console.error('Error getting messages:', error);
    return [] as MessageRow[];
  }
}

export const appendMessage = async (params: {
  conversationId: string
  role: 'user' | 'ai' | 'system'
  content: string
  channel?: ConversationChannel
  translation?: MessageTranslation
  userId?: string | null
  metadata?: MessageMetadata
}) => {
  try {
    const response = await fetch(`/api/conversations/${params.conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: params.role,
        content: params.content,
        channel: params.channel,
        translation: params.translation,
        userId: params.userId,
        metadata: params.metadata
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as MessageRow;
  } catch (error) {
    console.warn('[chatService] Falling back to mock message append:', error)
    return {
      id: randomId(),
      conversation_id: params.conversationId,
      user_id: params.userId ?? null,
      sender: params.role === 'user' ? 'agent' : 'ai',
      channel: params.channel ?? 'chat',
      content: params.content,
      translation: params.translation ?? null,
      metadata: params.metadata ?? null,
      created_at: new Date().toISOString()
    }
  }
}

export const deleteConversation = async (conversationId: string) => {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

export const touchConversation = async (conversationId: string) => {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        last_message_at: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      console.warn('Failed to touch conversation:', response.status);
    }
  } catch (error) {
    console.error('Error touching conversation:', error);
  }
}

export const updateConversationTitle = async (
  conversationId: string,
  title: string
) => {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title
      }),
    });

    if (!response.ok) {
      console.warn('Failed to update conversation title:', response.status);
    }
  } catch (error) {
    console.error('Error updating conversation title:', error);
  }
}

export interface ConversationUpdatePayload {
  title?: string | null
  status?: 'active' | 'archived' | 'important' | 'follow-up'
  followUpTask?: string | null
  intent?: string | null
  language?: string | null
  leadId?: string | null
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
}

export const updateConversation = async (
  conversationId: string,
  payload: ConversationUpdatePayload
) => {
  try {
    const body: Record<string, unknown> = {}
    if (payload.title !== undefined) body.title = payload.title ?? null
    if (payload.status !== undefined) body.status = payload.status
    if (payload.followUpTask !== undefined) body.followUpTask = payload.followUpTask ?? null
    if (payload.intent !== undefined) body.intent = payload.intent ?? null
    if (payload.language !== undefined) body.language = payload.language ?? null
    if (payload.leadId !== undefined) body.leadId = payload.leadId ?? null
    if (payload.contactName !== undefined) body.contactName = payload.contactName ?? null
    if (payload.contactEmail !== undefined) body.contactEmail = payload.contactEmail ?? null
    if (payload.contactPhone !== undefined) body.contactPhone = payload.contactPhone ?? null

    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ConversationRow;
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

// Export conversations to CSV
export const exportConversationsCSV = async (params: {
  scope?: ChatScope
  userId?: string
  startDate?: string
  endDate?: string
} = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.scope) queryParams.append('scope', params.scope);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(`/api/conversations/export/csv?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the filename from the response headers
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : `conversations_export_${new Date().toISOString().split('T')[0]}.csv`;

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log('✅ CSV export downloaded successfully');
    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting conversations to CSV:', error);
    throw error;
  }
}

export const notifyAgentHandoff = async (payload: {
  message: string
  response: string
  priority: 'low' | 'medium' | 'high'
  category: string
  needsHandoff: boolean
  timestamp: Date
}) => {
  try {
    const response = await fetch('/api/chat/handoff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Agent notified of handoff request:', data);
    return data;
  } catch (error) {
    console.error('Error notifying agent of handoff:', error);
    throw error;
  }
}

