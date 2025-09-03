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
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: params.userId || null,
      scope: params.scope,
      listing_id: params.listingId || null,
      title: params.title || null,
      status: 'active'
    })
    .select('*')
    .single()
  if (error) throw error
  return data as ConversationRow
}

export const listConversations = async (params: {
  userId?: string
  scope?: ChatScope
  listingId?: string
} = {}) => {
  let query = supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false })

  if (params.userId) query = query.eq('user_id', params.userId)
  if (params.scope) query = query.eq('scope', params.scope)
  if (params.listingId) query = query.eq('listing_id', params.listingId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as ConversationRow[]
}

export const getMessages = async (
  conversationId: string,
  limit = 100
): Promise<MessageRow[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data || []) as MessageRow[]
}

export const appendMessage = async (params: {
  conversationId: string
  role: 'user' | 'ai' | 'system'
  content: string
  userId?: string | null
  metadata?: any
}) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      user_id: params.userId || null,
      metadata: params.metadata || null
    })
    .select('*')
    .single()
  if (error) throw error
  return data as MessageRow
}

export const touchConversation = async (conversationId: string) => {
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
}

export const updateConversationTitle = async (
  conversationId: string,
  title: string
) => {
  await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)
}


