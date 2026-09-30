export type VoiceClientStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface VoiceClientEventHandlers {
  onAssistantDelta?: (text: string) => void
  onAssistantComplete?: (text: string) => void
  onPartialTranscript?: (text: string) => void
  onListeningChange?: (isListening: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onToolCall?: (toolName: string, args: Record<string, any>) => Promise<string | void>
}

export interface VoiceConnectOptions {
  model?: string
  voice?: string
  systemPrompt?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: any[]
}
