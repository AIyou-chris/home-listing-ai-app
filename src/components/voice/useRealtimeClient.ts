import { useCallback, useEffect, useRef, useState } from 'react'
import {
  VoiceClientEventHandlers,
  VoiceClientStatus,
  VoiceConnectOptions
} from '../../types/realtime'

export interface RealtimeClientApi {
  status: VoiceClientStatus
  isListening: boolean
  hasAudioPermission: boolean
  connect: (options: VoiceConnectOptions) => Promise<boolean>
  stopListening: () => void
  sendEvent: (payload: Record<string, unknown>) => void
  resetConversation: () => void
  finalizeUserSpeech: () => void
  disconnect: () => void
}

const DEFAULT_LANGUAGE_INSTRUCTION =
  'Always respond in English unless the user explicitly asks for another language. If they do, acknowledge the change and continue in the requested language.'

const AUTO_RESPONSE_DELAY_MS = 1200

const mergeInstructions = (custom?: string): string => {
  const guard = DEFAULT_LANGUAGE_INSTRUCTION
  if (!custom || !custom.trim()) return guard
  const trimmed = custom.trim()
  if (trimmed.toLowerCase().includes('always respond in english')) {
    return trimmed
  }
  return `${trimmed}\n\n${guard}`
}

export const useRealtimeClient = (
  handlers: VoiceClientEventHandlers = {}
): RealtimeClientApi => {
  const [status, setStatusState] = useState<VoiceClientStatus>('idle')
  const [isListening, setIsListening] = useState(false)
  const [hasAudioPermission, setHasAudioPermission] = useState(false)

  const handlersRef = useRef<VoiceClientEventHandlers>(handlers)
  const statusRef = useRef<VoiceClientStatus>('idle')
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const microphoneStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const assistantBufferRef = useRef('')
  const hasUserSpeechRef = useRef(false)
  const instructionsRef = useRef<string>(mergeInstructions())
  const speechEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateStatus = useCallback((nextStatus: VoiceClientStatus) => {
    statusRef.current = nextStatus
    setStatusState(nextStatus)
  }, [])

  const clearSpeechEndTimer = useCallback(() => {
    if (speechEndTimeoutRef.current !== null) {
      clearTimeout(speechEndTimeoutRef.current)
      speechEndTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.setAttribute('playsinline', 'true')
    audio.style.display = 'none'
    document.body.appendChild(audio)
    remoteAudioRef.current = audio
    return () => {
      audio.remove()
    }
  }, [])

  const awaitIceGatheringComplete = useCallback((peer: RTCPeerConnection) => {
    if (peer.iceGatheringState === 'complete') return Promise.resolve()
    return new Promise<void>((resolve) => {
      const checkState = () => {
        if (peer.iceGatheringState === 'complete') {
          peer.removeEventListener('icegatheringstatechange', checkState)
          resolve()
        }
      }
      const checkCandidate = (event: RTCPeerConnectionIceEvent) => {
        if (!event.candidate) {
          peer.removeEventListener('icecandidate', checkCandidate)
          peer.removeEventListener('icegatheringstatechange', checkState)
          resolve()
        }
      }
      peer.addEventListener('icegatheringstatechange', checkState)
      peer.addEventListener('icecandidate', checkCandidate)
    })
  }, [])

  const cleanup = useCallback(() => {
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop())
    microphoneStreamRef.current = null

    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close()
      } catch {
        /* noop */
      }
    }
    dataChannelRef.current = null

    if (peerRef.current) {
      try {
        peerRef.current.close()
      } catch {
        /* noop */
      }
    }
    peerRef.current = null

    assistantBufferRef.current = ''
    hasUserSpeechRef.current = false
    clearSpeechEndTimer()
    setIsListening(false)
    handlersRef.current.onListeningChange?.(false)
    updateStatus('idle')
  }, [clearSpeechEndTimer, updateStatus])

  useEffect(() => cleanup, [cleanup])

  const sendEvent = useCallback((payload: Record<string, unknown>) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      return
    }
    dataChannelRef.current.send(JSON.stringify(payload))
  }, [])

  const finalizeUserSpeech = useCallback(() => {
    clearSpeechEndTimer()
    if (!hasUserSpeechRef.current) {
      return
    }
    sendEvent({ type: 'input_audio_buffer.commit' })
    sendEvent({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: instructionsRef.current || DEFAULT_LANGUAGE_INSTRUCTION
      }
    })
    hasUserSpeechRef.current = false
  }, [clearSpeechEndTimer, sendEvent])

  const stopListening = useCallback(() => {
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop())
    setIsListening(false)
    handlersRef.current.onListeningChange?.(false)
    finalizeUserSpeech()
  }, [finalizeUserSpeech])

  const disconnect = useCallback(() => {
    cleanup()
  }, [cleanup])

  const resetConversation = useCallback(() => {
    assistantBufferRef.current = ''
    hasUserSpeechRef.current = false
    clearSpeechEndTimer()
    sendEvent({ type: 'conversation.reset' })
    const instructions = instructionsRef.current || DEFAULT_LANGUAGE_INSTRUCTION
    sendEvent({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions
      }
    })
    const currentHandlers = handlersRef.current
    currentHandlers.onAssistantDelta?.('')
    currentHandlers.onAssistantComplete?.('')
    currentHandlers.onPartialTranscript?.('')
  }, [clearSpeechEndTimer, sendEvent])

  const handleRealtimeMessage = useCallback((event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data as string) as { type: string; [key: string]: unknown }
      switch (payload.type) {
        case 'response.output_text.delta': {
          const delta = typeof payload.delta === 'string' ? payload.delta : ''
          assistantBufferRef.current += delta
          handlersRef.current.onAssistantDelta?.(assistantBufferRef.current)
          break
        }
        case 'response.output_text.done': {
          handlersRef.current.onAssistantComplete?.(assistantBufferRef.current)
          break
        }
        case 'conversation.item.input_audio_transcription.delta': {
          const delta = typeof payload.delta === 'string' ? payload.delta : ''
          handlersRef.current.onPartialTranscript?.(delta)
          if (delta.trim().length > 0) {
            hasUserSpeechRef.current = true
          }
          break
        }
        case 'input_audio_buffer.speech_started': {
          handlersRef.current.onPartialTranscript?.('')
          clearSpeechEndTimer()
          hasUserSpeechRef.current = false
          setIsListening(true)
          handlersRef.current.onListeningChange?.(true)
          break
        }
        case 'input_audio_buffer.speech_stopped': {
          setIsListening(false)
          handlersRef.current.onListeningChange?.(false)
          clearSpeechEndTimer()
          speechEndTimeoutRef.current = setTimeout(() => {
            finalizeUserSpeech()
          }, AUTO_RESPONSE_DELAY_MS)
          break
        }
        default:
          break
      }
    } catch {
      // ignore malformed frames
    }
  }, [clearSpeechEndTimer, finalizeUserSpeech])

  const connect = useCallback(
    async ({ model, systemPrompt }: VoiceConnectOptions) => {
      let attempts = 0
      const tryConnect = async (): Promise<boolean> => {
        attempts += 1

        if (statusRef.current === 'connecting' || statusRef.current === 'connected') {
          return false
        }

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          updateStatus('idle')
          return false
        }

        try {
          updateStatus('connecting')

          instructionsRef.current = mergeInstructions(systemPrompt)

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          })
          microphoneStreamRef.current = stream
          setHasAudioPermission(true)

          const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          })
          peerRef.current = peer

          stream.getTracks().forEach((track) => peer.addTrack(track, stream))

          peer.ontrack = (e) => {
            const [remoteStream] = e.streams
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream
            }
          }

          const channel = peer.createDataChannel('oai-events')
          dataChannelRef.current = channel

          channel.onopen = () => {
            if (peerRef.current !== peer) {
              return
            }
            sendEvent({ type: 'conversation.reset' })
            const sessionUpdatePayload: Record<string, unknown> = {
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: instructionsRef.current || DEFAULT_LANGUAGE_INSTRUCTION
              }
            }
            sendEvent(sessionUpdatePayload)
            updateStatus('connected')
          }

          channel.onmessage = handleRealtimeMessage

          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          await awaitIceGatheringComplete(peer)

          const localDescription = peer.localDescription
          if (!localDescription) {
            throw new Error('missing local description')
          }

          const response = await fetch('/api/realtime/offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sdp: localDescription.sdp,
              type: localDescription.type,
              model: model || 'gpt-4o-realtime-preview',
              instructions: instructionsRef.current || DEFAULT_LANGUAGE_INSTRUCTION
            })
          })

          if (!response.ok) {
            throw new Error('realtime negotiation failed')
          }

          const answer: RTCSessionDescriptionInit = await response.json()
          if (peerRef.current !== peer || peer.signalingState === 'closed') {
            return false
          }
          await peer.setRemoteDescription(answer)
          if (peerRef.current !== peer) {
            return false
          }
          return true
        } catch (error) {
          console.error('Realtime connect error', error)
          cleanup()
          setHasAudioPermission(false)
          if (attempts < 3) {
            await new Promise((resolve) => setTimeout(resolve, 300))
            return tryConnect()
          }
          return false
        }
      }

      if (peerRef.current) {
        cleanup()
      }

      return tryConnect()
    },
    [awaitIceGatheringComplete, cleanup, handleRealtimeMessage, sendEvent, updateStatus]
  )

  return {
    status,
    isListening,
    hasAudioPermission,
    connect,
    stopListening,
    sendEvent,
    resetConversation,
    finalizeUserSpeech,
    disconnect
  }
}


