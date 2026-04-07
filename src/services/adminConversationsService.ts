import { AuthService } from './authService'
import type { ConversationRow, MessageRow } from './chatService'

const auth = AuthService.getInstance()

const ensureOk = async (response: Response, context: string) => {
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(`${context} failed (${response.status}): ${message}`)
  }
}

export const adminConversationsService = {
  async list(params: { scope?: string; status?: string; search?: string; limit?: number } = {}): Promise<ConversationRow[]> {
    const query = new URLSearchParams()
    if (params.scope) query.set('scope', params.scope)
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.limit) query.set('limit', String(params.limit))

    const path = query.toString() ? `/api/admin/conversations?${query.toString()}` : '/api/admin/conversations'
    const response = await auth.makeAuthenticatedRequest(path)
    await ensureOk(response, 'List admin conversations')
    const data = await response.json()
    return Array.isArray(data) ? (data as ConversationRow[]) : []
  },

  async listMessages(conversationId: string, limit = 100): Promise<MessageRow[]> {
    const response = await auth.makeAuthenticatedRequest(`/api/admin/conversations/${conversationId}/messages?limit=${limit}`)
    await ensureOk(response, 'List admin conversation messages')
    const data = await response.json()
    return Array.isArray(data) ? (data as MessageRow[]) : []
  },

  async update(conversationId: string, updates: { status?: string }): Promise<ConversationRow> {
    const response = await auth.makeAuthenticatedRequest(`/api/admin/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
    await ensureOk(response, 'Update admin conversation')
    return await response.json()
  }
}
