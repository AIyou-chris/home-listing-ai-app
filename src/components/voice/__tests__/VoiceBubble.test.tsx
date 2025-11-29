import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { VoiceBubble } from '../VoiceBubble'

const mockConnect = jest.fn().mockResolvedValue(true)
const mockStop = jest.fn()
const mockFinalize = jest.fn()
const mockReset = jest.fn()
const mockDisconnect = jest.fn()

type MockRealtimeHandlers = {
  onPartialTranscript?: (text: string) => void
  onAssistantDelta?: (text: string) => void
  onAssistantResponse?: (text: string) => void
  onConversationReset?: () => void
}

let latestHandlers: MockRealtimeHandlers | null = null

jest.mock('../useRealtimeClient', () => ({
  useRealtimeClient: (handlers: MockRealtimeHandlers) => {
    latestHandlers = handlers
    return {
      status: 'connected',
      isListening: false,
      hasAudioPermission: true,
      connect: mockConnect,
      stopListening: mockStop,
      finalizeUserSpeech: mockFinalize,
      resetConversation: mockReset,
      disconnect: mockDisconnect
    }
  }
}))

describe('VoiceBubble', () => {
  beforeEach(() => {
    latestHandlers = null
    mockConnect.mockClear()
    mockFinalize.mockClear()
    mockReset.mockClear()
    mockDisconnect.mockClear()
  })

  it('renders assistant name and default caption', () => {
    render(<VoiceBubble assistantName='Listing Concierge' sidekickId='' />)
    expect(screen.getByText('Listing Concierge')).toBeInTheDocument()
    expect(screen.getByText(/Ask anything/)).toBeInTheDocument()
  })

  it('triggers connect when mic pressed', () => {
    render(<VoiceBubble assistantName='Voice AI' sidekickId='' />)
    fireEvent.click(screen.getByLabelText('Toggle voice assistant'))
    expect(mockConnect).toHaveBeenCalled()
  })

  it('shows streamed assistant text via handler', async () => {
    render(<VoiceBubble assistantName='Voice AI' sidekickId='' />)
    expect(latestHandlers).toBeTruthy()
    await act(async () => {
      latestHandlers.onAssistantDelta?.('Streaming reply')
    })
    expect(await screen.findByText('Streaming reply')).toBeInTheDocument()
  })

  it('fires finish/reset/back controls', async () => {
    render(<VoiceBubble assistantName='Voice AI' sidekickId='' />)

    await act(async () => {
      latestHandlers?.onPartialTranscript?.('User is speaking')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Finish speaking' }))
    expect(mockFinalize).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Restart conversation' }))
    expect(mockReset).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Back to chat' }))
    expect(mockStop).toHaveBeenCalled()
    expect(mockDisconnect).toHaveBeenCalled()
  })
})


