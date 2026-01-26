export type VoiceClientStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface VoiceClientEventHandlers {
  onAssistantDelta?: (text: string) => void
  onAssistantComplete?: (text: string) => void
  onPartialTranscript?: (text: string) => void
  onListeningChange?: (isListening: boolean) => void
  onToolCall?: (toolName: string, args: Record<string, any>) => Promise<string | void>
}

export interface VoiceConnectOptions {
  model?: string
  voice?: string
  systemPrompt?: string
  tools?: any[]
}
