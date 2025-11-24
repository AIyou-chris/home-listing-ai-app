import { useCallback, useEffect, useMemo, useState } from 'react'

import { continueConversation } from '../services/openaiService'
import {
  appendMessage,
  createConversation,
  exportConversationsCSV,
  getMessages,
  listConversations,
  touchConversation,
  updateConversationTitle,
  type ConversationRow,
  type MessageRow
} from '../services/chatService'

export type SourceScope = 'agent' | 'listing' | 'marketing'
export type ContentTab = 'chat' | 'history'

interface AdminMessage {
  role: 'user' | 'ai'
  text: string
}

interface UseAdminAIContentResult {
  tab: ContentTab
  setTab: (tab: ContentTab) => void
  scope: SourceScope
  setScope: (scope: SourceScope) => void
  message: string
  setMessage: (value: string) => void
  reply: string
  loading: boolean
  history: AdminMessage[]
  send: (prompt?: string) => Promise<void>
  handleNewConversation: () => void
  handleSelectConversation: (id: string) => Promise<void>
  conversationsList: ConversationRow[]
  conversationId: string | null
  exportConversations: () => Promise<void>
  convSearch: string
  setConvSearch: (value: string) => void
  convDrawer: boolean
  setConvDrawer: (open: boolean) => void
}

const INITIAL_GREETING = {
  role: 'ai' as const,
  text: "Hello! I'm your AI real estate assistant. I can help with market analysis, property descriptions, client communications, and much more. What would you like to know?"
}

export const useAdminAIContent = (): UseAdminAIContentResult => {
  const [tab, setTab] = useState<ContentTab>('chat')
  const [scope, setScopeState] = useState<SourceScope>('agent')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<AdminMessage[]>([INITIAL_GREETING])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationsList, setConversationsList] = useState<ConversationRow[]>([])
  const [convSearch, setConvSearch] = useState('')
  const [convDrawer, setConvDrawer] = useState(false)

  const scopeSystem = useMemo(() => {
    switch (scope) {
      case 'listing':
        return 'You are the Listing Sidekick. Use listing knowledge when available. Be clear and accurate.'
      case 'marketing':
        return 'You are the Marketing Sidekick. Write on-brand, conversion-focused content.'
      case 'agent':
      default:
        return 'You are the Agent Sidekick. Help the agent with tasks, messaging, and strategy.'
    }
  }, [scope])

  const refreshConversations = useCallback(async () => {
    try {
      const list = await listConversations({ scope })
      setConversationsList(list)
    } catch (error) {
      console.error('useAdminAIContent: failed to load conversations', error)
      setConversationsList([])
    }
  }, [scope])

  const setScope = useCallback((next: SourceScope) => {
    setScopeState(next)
  }, [])

  useEffect(() => {
    refreshConversations().catch(error => {
      console.error('useAdminAIContent: refresh conversations failed', error)
    })
  }, [refreshConversations])

  useEffect(() => {
    if (!conversationId) {
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const messages: MessageRow[] = await getMessages(conversationId)
        if (cancelled) return

        const mapped: AdminMessage[] = messages.map(msg => ({
          role: msg.sender === 'ai' ? 'ai' : 'user',
          text: msg.content
        }))

        setHistory(prev => (mapped.length ? mapped : prev))
      } catch (error) {
        if (!cancelled) {
          console.error('useAdminAIContent: failed to load messages', error)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [conversationId])

  const handleNewConversation = useCallback(() => {
    setConversationId(null)
    setHistory([INITIAL_GREETING])
    setReply('')
  }, [])

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setConversationId(id)
      try {
        const messages: MessageRow[] = await getMessages(id)
        const mapped: AdminMessage[] = messages.map(msg => ({
          role: msg.sender === 'ai' ? 'ai' : 'user',
          text: msg.content
        }))
        setHistory(mapped.length ? mapped : [INITIAL_GREETING])
        setTab('chat')
      } catch (error) {
        console.error('useAdminAIContent: failed to select conversation', error)
      }
    },
    []
  )

  const send = useCallback(
    async (prompt?: string) => {
      if (loading) return

      const text = (prompt ?? message).trim()
      if (!text) return

      setLoading(true)
      setMessage('')
      setHistory(prev => [...prev, { role: 'user', text }])

      try {
        let currentConversationId = conversationId
        const isNewConversation = !currentConversationId

        if (isNewConversation) {
          const conversation = await createConversation({ scope })
          currentConversationId = conversation.id
          setConversationId(conversation.id)
        }

        await appendMessage({ conversationId: currentConversationId!, role: 'user', content: text })

        if (isNewConversation) {
          const title = text.split(/\s+/).slice(0, 6).join(' ')
          try {
            await updateConversationTitle(currentConversationId!, title)
          } catch (error) {
            console.error('useAdminAIContent: failed to auto title conversation', error)
          }

          await refreshConversations()
        }

        const output = await continueConversation([
          { sender: 'system', text: scopeSystem },
          { sender: 'user', text }
        ])

        setReply(output)
        setHistory(prev => [...prev, { role: 'ai', text: output }])

        await appendMessage({ conversationId: currentConversationId!, role: 'ai', content: output })
        await touchConversation(currentConversationId!)
      } catch (error) {
        console.error('useAdminAIContent: send failed', error)
      } finally {
        setLoading(false)
      }
    },
    [conversationId, loading, message, refreshConversations, scope, scopeSystem]
  )

  const exportConversations = useCallback(async () => {
    await exportConversationsCSV({ scope })
  }, [scope])

  return {
    tab,
    setTab,
    scope,
    setScope,
    message,
    setMessage,
    reply,
    loading,
    history,
    send,
    handleNewConversation,
    handleSelectConversation,
    conversationsList,
    conversationId,
    exportConversations,
    convSearch,
    setConvSearch,
    convDrawer,
    setConvDrawer
  }
}


