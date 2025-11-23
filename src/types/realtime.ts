export type VoiceClientStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface VoiceClientEventHandlers {
  onAssistantDelta?: (text: string) => void
  onAssistantComplete?: (text: string) => void
  onPartialTranscript?: (text: string) => void
  onListeningChange?: (isListening: boolean) => void
}

export interface VoiceConnectOptions {
  model?: string
  systemPrompt?: string
}
