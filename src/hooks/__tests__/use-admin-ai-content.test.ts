import { renderHook, act, waitFor } from '@testing-library/react'

import { useAdminAIContent } from '../use-admin-ai-content'
import { continueConversation } from '../../services/openaiService'
import {
  appendMessage,
  createConversation,
  exportConversationsCSV,
  getMessages,
  listConversations,
  touchConversation,
  updateConversationTitle
} from '../../services/chatService'

jest.mock('../../services/openaiService', () => ({
  continueConversation: jest.fn()
}))

jest.mock('../../services/chatService', () => ({
  createConversation: jest.fn(),
  appendMessage: jest.fn(),
  getMessages: jest.fn(),
  touchConversation: jest.fn(),
  listConversations: jest.fn(),
  updateConversationTitle: jest.fn(),
  exportConversationsCSV: jest.fn()
}))

describe('useAdminAIContent', () => {
  beforeEach(() => {
    jest.resetAllMocks()

    ;(listConversations as jest.Mock).mockResolvedValue([{ id: 'conv-1', title: 'Welcome' }])
    ;(getMessages as jest.Mock).mockResolvedValue([])
    ;(createConversation as jest.Mock).mockResolvedValue({ id: 'conv-new' })
    ;(appendMessage as jest.Mock).mockResolvedValue(undefined)
    ;(touchConversation as jest.Mock).mockResolvedValue(undefined)
    ;(updateConversationTitle as jest.Mock).mockResolvedValue(undefined)
    ;(continueConversation as jest.Mock).mockResolvedValue('AI response')
    ;(exportConversationsCSV as jest.Mock).mockResolvedValue(undefined)
  })

  it('loads conversations on mount', async () => {
    const { result } = renderHook(() => useAdminAIContent())

    await waitFor(() => expect(listConversations).toHaveBeenCalled())
    expect(result.current.conversationsList).toHaveLength(1)
  })

  it('sends a message and receives a reply', async () => {
    const { result } = renderHook(() => useAdminAIContent())

    await waitFor(() => expect(listConversations).toHaveBeenCalled())

    act(() => {
      result.current.setMessage('Hello AI')
    })

    await act(async () => {
      await result.current.send()
    })

    expect(createConversation).toHaveBeenCalled()
    expect(appendMessage).toHaveBeenCalledTimes(2)
    expect(continueConversation).toHaveBeenCalled()
    expect(result.current.history[result.current.history.length - 1].text).toBe('AI response')
  })

  it('exports conversations using current scope', async () => {
    const { result } = renderHook(() => useAdminAIContent())

    await waitFor(() => expect(listConversations).toHaveBeenCalled())

    await act(async () => {
      await result.current.exportConversations()
    })

    expect(exportConversationsCSV).toHaveBeenCalledWith({ scope: 'agent' })
  })
})
