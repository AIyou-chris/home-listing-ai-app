export type VoiceClientStatus = 'idle' | 'connecting' | 'connected'

export interface VoiceClientEventHandlers {
  onPartialTranscript?: (value: string) => void
  onAssistantDelta?: (value: string) => void
  onAssistantComplete?: (value: string) => void
  onListeningChange?: (listening: boolean) => void
}

export interface VoiceConnectOptions {
  model?: string
  systemPrompt?: string
}


