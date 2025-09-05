import { supabase } from './supabase'

export type ChatScope = 'agent' | 'listing' | 'marketing'

export interface ConversationRow {
  id: string
  user_id: string | null
  scope: ChatScope
  listing_id: string | null
  lead_id: string | null
  title: string | null
  status: 'active' | 'archived'
  last_message_at: string | null
  created_at: string
}

export interface MessageRow {
  id: string
  conversation_id: string
  user_id: string | null
  role: 'user' | 'ai' | 'system'
  content: string
  metadata: any | null
  created_at: string
}

export const createConversation = async (params: {
  userId?: string | null
  scope: ChatScope
  listingId?: string | null
  title?: string | null
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
        title: params.title
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ConversationRow;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
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
  userId?: string | null
  metadata?: any
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
    console.error('Error appending message:', error);
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

