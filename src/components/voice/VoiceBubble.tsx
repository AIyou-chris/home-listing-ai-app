import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRealtimeClient } from './useRealtimeClient'
import { type AISidekick, getLocalSidekick, getSidekicks } from '../../services/aiSidekicksService'
const animations = `
@keyframes pulse-slow {0%,100%{transform:scale(0.96);opacity:0.55;}50%{transform:scale(1.04);opacity:1;}}
@keyframes pulse-talk {0%,100%{transform:scale(0.92);opacity:0.65;}50%{transform:scale(1.12);opacity:1;}}
@keyframes wave {0%,100%{transform:scaleY(0.35);}50%{transform:scaleY(1.05);}}
@keyframes wave-fast {0%,100%{transform:scaleY(0.4);}50%{transform:scaleY(1.3);}}
@keyframes wave-glow {0%,100%{opacity:0.15;}50%{opacity:0.6;}}
@keyframes pulse-core {0%,100%{transform:scale(0.9);}50%{transform:scale(1.08);}}
@keyframes ring-flash {0%,100%{opacity:0.15;transform:scale(1);}50%{opacity:0.55;transform:scale(1.08);}}
.animate-listening{animation:pulse-slow 2200ms ease-in-out infinite;}
.animate-speaking{animation:pulse-talk 1500ms ease-in-out infinite;}
.animate-wave{animation:wave 900ms ease-in-out infinite;}
.animate-wave-fast{animation:wave-fast 600ms ease-in-out infinite;}
.animate-wave-glow{animation:wave-glow 1500ms ease-in-out infinite;}
.animate-core{animation:pulse-core 2000ms ease-in-out infinite;}
.animate-ring{animation:ring-flash 2400ms ease-in-out infinite;}
.wave-bar{transform-origin:bottom;}
.wave-bar-idle{background:linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05));}
.wave-bar-listening{background:linear-gradient(180deg,rgba(96,165,250,0.95),rgba(37,99,235,0.6));}
.wave-bar-speaking{background:linear-gradient(180deg,rgba(249,115,22,0.95),rgba(244,63,94,0.75));}
.wave-bar-flare{box-shadow:0 0 14px 2px rgba(255,255,255,0.25);}
@media (prefers-reduced-motion: reduce){
  .animate-listening,.animate-speaking,.animate-wave,.animate-wave-fast,.animate-wave-glow,.animate-core,.animate-ring{animation-duration:1ms;animation-iteration-count:1;}
}
`


export type VoiceBubbleProps = {
  brandGradient?: string
  assistantName?: string
  model?: string
  systemPrompt?: string
  sidekickId?: string
  autoConnect?: boolean
  onResponseText?: (text: string) => void
  onFinalResponse?: (text: string) => void
  onUserSpeechFinal?: (text: string) => void
  showHeader?: boolean
  className?: string
  onClose?: () => void
}

const defaultPrompt =
  "You are HomeListingAI's sales concierge. Default to English with a confident, customer-first tone. Guide visitors toward booking a demo by showcasing the most relevant features and benefits. If a user explicitly asks for another language, acknowledge the switch before continuing. Always wait for the user to speak before responding."

const defaultSalesSidekickId = 'demo-sales-sidekick'

const buildSidekickPrompt = (sidekick: AISidekick): string => {
  const personality = sidekick.personality?.description
    ? sidekick.personality.description
    : 'Act as a confident but consultative sales partner focused on helping agents succeed.'
  const traits =
    sidekick.personality?.traits && sidekick.personality.traits.length > 0
      ? `Tone traits: ${sidekick.personality.traits.join(', ')}.`
      : ''
  const knowledge =
    sidekick.knowledgeBase && sidekick.knowledgeBase.length > 0
      ? `Key talking points:\n${sidekick.knowledgeBase
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n')}`
      : ''

  return [
    `You are ${sidekick.name}, the ${sidekick.description}. You are HomeListingAI's frontline sales concierge for inbound prospects on the marketing site.`,
    personality,
    traits,
    'Primary goals:\n1. Quickly understand the visitor’s role, goals, and timeline.\n2. Highlight the most relevant product benefits based on their answers.\n3. Handle objections with empathy and clear proof points.\n4. Drive toward scheduling a live demo or trial sign-up when appropriate.\n5. Keep every reply under 3 short paragraphs unless the visitor asks for more detail.',
    knowledge,
    'Guardrails:\n- Default to English unless the visitor explicitly asks for a different language.\n- Ask clarifying questions before giving long answers.\n- Never invent pricing; describe pricing tiers only if you are sure, otherwise offer to connect them with sales.\n- End with a clear CTA (schedule a demo, explore a feature, or connect with a teammate).'
  ]
    .filter(Boolean)
    .join('\n\n')
}

const defaultGradient = 'from-indigo-600 to-fuchsia-500'

const buttonBase =
  'text-xs px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/60'

const srOnly = 'sr-only'

type WaveMode = 'idle' | 'listening' | 'speaking'

const WaveBars: React.FC<{ mode: WaveMode }> = ({ mode }) => {
  const active = mode !== 'idle'
  const barClass =
    mode === 'speaking'
      ? 'wave-bar wave-bar-speaking wave-bar-flare animate-wave-fast'
      : mode === 'listening'
        ? 'wave-bar wave-bar-listening animate-wave'
        : 'wave-bar wave-bar-idle'

  return (
    <div className='flex items-end gap-0.5 h-12 transition-all duration-500' aria-hidden>
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className={`${barClass} ${active ? 'animate-wave-glow' : ''}`.trim()}
          style={{
            animationDelay: `${index * 90}ms`,
            height: active ? `${20 + ((index % 5) + 1) * 6}px` : '16px',
            width: '6px',
            borderRadius: '9999px'
          }}
        />
      ))}
    </div>
  )
}

export const VoiceBubble: React.FC<VoiceBubbleProps> = ({
  brandGradient = defaultGradient,
  assistantName = 'Home AI',
  model,
  systemPrompt = defaultPrompt,
  sidekickId = defaultSalesSidekickId,
  autoConnect = false,
  onResponseText,
  onFinalResponse,
  onUserSpeechFinal,
  showHeader = true,
  className,
  onClose
}) => {
  const [interimTranscript, setInterimTranscript] = useState('')
  const [assistantCaption, setAssistantCaption] = useState('')
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false)
  const autoConnectTriggeredRef = useRef(false)
  const [activePrompt, setActivePrompt] = useState(systemPrompt || defaultPrompt)
  const [activeAssistantName, setActiveAssistantName] = useState(assistantName)
  const [loadingSidekick, setLoadingSidekick] = useState(false)
  const transcriptRef = useRef('')

  useEffect(() => {
    let isMounted = true

    const resolvePrompt = async () => {
      const fallbackPrompt = systemPrompt || defaultPrompt
      if (!sidekickId) {
        if (isMounted) {
          setActivePrompt(fallbackPrompt)
          setActiveAssistantName(assistantName)
          setLoadingSidekick(false)
        }
        return
      }

      setLoadingSidekick(true)
      try {
        let sidekick = getLocalSidekick(sidekickId)
        if (!sidekick) {
          const { sidekicks } = await getSidekicks()
          sidekick = sidekicks.find((item) => item.id === sidekickId)
        }

        if (!isMounted) return

        if (sidekick) {
          const salesPrompt = buildSidekickPrompt(sidekick)
          const combinedPrompt =
            systemPrompt && systemPrompt.trim().length > 0 && systemPrompt !== defaultPrompt
              ? `${salesPrompt}\n\nAdditional context:\n${systemPrompt.trim()}`
              : salesPrompt
          setActivePrompt(combinedPrompt)
          setActiveAssistantName(sidekick.name || assistantName)
        } else {
          setActivePrompt(fallbackPrompt)
          setActiveAssistantName(assistantName)
        }
      } catch (error) {
        console.error('VoiceBubble: failed to load sidekick persona', error)
        if (isMounted) {
          setActivePrompt(systemPrompt || defaultPrompt)
          setActiveAssistantName(assistantName)
        }
      } finally {
        if (isMounted) {
          setLoadingSidekick(false)
        }
      }
    }

    resolvePrompt()

    return () => {
      isMounted = false
    }
  }, [assistantName, sidekickId, systemPrompt])

  const client = useRealtimeClient({
    onPartialTranscript: (value) => {
      transcriptRef.current = value
      setInterimTranscript(value)
    },
    onAssistantDelta: (value) => {
      setAssistantCaption(value)
      setIsAssistantSpeaking(value.trim().length > 0)
      onResponseText?.(value)
    },
    onAssistantComplete: (value) => {
      setAssistantCaption(value)
      setIsAssistantSpeaking(false)
      onFinalResponse?.(value)
    }
  })

  const stateLabel = useMemo(() => {
    if (loadingSidekick) return 'Loading sales concierge…'
    if (client.status === 'connecting') return 'Connecting to voice assistant…'
    if (client.isListening) return 'Listening…'
    if (isAssistantSpeaking) return 'Assistant is responding…'
    return 'Ready to chat'
  }, [client.isListening, client.status, isAssistantSpeaking, loadingSidekick])

  const commitUserSpeech = useCallback(() => {
    const transcript = transcriptRef.current.trim()
    if (transcript) {
      onUserSpeechFinal?.(transcript)
    }
    transcriptRef.current = ''
    setInterimTranscript('')
  }, [onUserSpeechFinal])

  const connect = useCallback(async () => {
    if (!activePrompt || loadingSidekick) return
    await client.connect({ model, systemPrompt: activePrompt })
  }, [activePrompt, client, loadingSidekick, model])

  const handleFinish = useCallback(() => {
    commitUserSpeech()
    client.finalizeUserSpeech()
  }, [client, commitUserSpeech])

  const handleRestart = useCallback(() => {
    commitUserSpeech()
    setAssistantCaption('')
    setIsAssistantSpeaking(false)
    client.resetConversation()
  }, [client, commitUserSpeech])

  const handleBack = useCallback(() => {
    commitUserSpeech()
    client.stopListening()
    client.disconnect()
    setIsAssistantSpeaking(false)
    onClose?.()
  }, [client, commitUserSpeech, onClose])

  const showAssistantText = assistantCaption.trim().length > 0
  const waveMode: WaveMode = loadingSidekick
    ? 'idle'
    : client.isListening
    ? 'listening'
    : isAssistantSpeaking
      ? 'speaking'
        : 'idle'
  const micState = loadingSidekick
    ? 'idle'
    : client.status === 'connecting'
    ? 'connecting'
    : client.isListening
      ? 'listening'
      : isAssistantSpeaking
        ? 'speaking'
          : 'idle'

  const micGlowClass =
    micState === 'speaking'
      ? 'from-orange-500/80 via-amber-400/70 to-rose-500/70'
      : micState === 'listening'
        ? 'from-sky-400/75 via-blue-500/70 to-indigo-500/65'
        : 'from-white/25 via-white/15 to-white/5'

  const micCoreClass =
    micState === 'speaking'
      ? 'bg-gradient-to-br from-orange-200/90 via-amber-200/85 to-rose-200/90'
      : micState === 'listening'
        ? 'bg-gradient-to-br from-sky-200/85 via-blue-200/80 to-indigo-200/85'
        : 'bg-white/15'

  React.useEffect(() => {
    if (autoConnect && !autoConnectTriggeredRef.current && !loadingSidekick && activePrompt) {
      autoConnectTriggeredRef.current = true
      void connect()
    }
    if (!autoConnect) {
      autoConnectTriggeredRef.current = false
    }
  }, [activePrompt, autoConnect, connect, loadingSidekick])

  React.useEffect(() => {
    if (client.isListening) {
      setIsAssistantSpeaking(false)
    } else {
      commitUserSpeech()
    }
  }, [client.isListening, commitUserSpeech])

  const statusCaption = loadingSidekick
    ? 'Preparing our sales concierge...'
    : showAssistantText
      ? assistantCaption
      : interimTranscript

  const canFinalize = !loadingSidekick && (client.isListening || isAssistantSpeaking || interimTranscript.trim().length > 0)

  return (
    <section
      className={`absolute inset-0 flex flex-col text-white overflow-hidden rounded-3xl bg-gradient-to-br ${className ?? ''}`.trim()}
      aria-live='polite'
    >
      <style>{animations}</style>
      <div className={`absolute inset-0 bg-gradient-to-br ${brandGradient}`.trim()} aria-hidden />

      <div className='relative flex-1 flex flex-col items-center justify-center gap-6 p-6'>
        {showHeader && (
          <header className='w-full max-w-xs bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center justify-between text-xs font-medium'>
            <span className='flex items-center gap-2'>
              <span className='material-symbols-outlined text-base'>graphic_eq</span>
              {activeAssistantName}
            </span>
            <span className='opacity-80'>{stateLabel}</span>
          </header>
        )}

        <div className='relative h-32 w-32 rounded-full flex items-center justify-center'>
          <div
            className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 bg-gradient-to-br ${micGlowClass}`}
          />
          <div
            className={`absolute inset-0 rounded-full border pointer-events-none transition-all duration-500 ${
              micState === 'speaking'
                ? 'border-orange-100/70 animate-speaking'
                : micState === 'listening'
                  ? 'border-sky-100/70 animate-listening'
                  : 'border-white/25'
            }`}
          />
          <div className={`absolute inset-4 rounded-full transition-all duration-700 animate-core ${micCoreClass}`} />
          <div
            className={`absolute inset-6 rounded-full border border-white/30 transition-all duration-700 ${
              micState === 'speaking' ? 'animate-ring' : ''
            }`}
          />
          <button
            type='button'
            onClick={connect}
            disabled={loadingSidekick}
            className={`relative h-28 w-28 rounded-full bg-white/25 backdrop-blur flex items-center justify-center shadow-xl focus:outline-none focus:ring-4 focus:ring-white/60 transition-opacity ${
              loadingSidekick ? 'opacity-60 cursor-not-allowed' : ''
            }`}
            aria-label='Toggle voice assistant'
          >
            <span className='material-symbols-outlined text-4xl'>mic</span>
          </button>
        </div>

        <WaveBars mode={waveMode} />

        <div
          className='w-full max-w-md min-h-[64px] bg-white/15 rounded-2xl px-4 py-3 text-sm backdrop-blur'
          role='status'
        >
          {statusCaption ? (
            <p className='whitespace-pre-wrap leading-6'>{statusCaption}</p>
          ) : (
            <p className='opacity-80'>Ask anything about this property or how we automate your listings.</p>
          )}
        </div>

        <div className='flex gap-3'>
          <button
            type='button'
            className={`${buttonBase} ${!canFinalize ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={handleFinish}
            disabled={!canFinalize}
            aria-label='Finish speaking'
          >
            Finish
          </button>
          <button
            type='button'
            className={`${buttonBase} ${loadingSidekick ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={handleRestart}
            disabled={loadingSidekick}
            aria-label='Restart conversation'
          >
            Restart
          </button>
          <button
            type='button'
            className={`${buttonBase} ${loadingSidekick ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={handleBack}
            disabled={loadingSidekick}
            aria-label='Back to chat'
          >
            Back to Chat
          </button>
        </div>

        <span className={srOnly}>{client.hasAudioPermission ? 'Microphone enabled' : 'Microphone permission not granted yet'}</span>
      </div>
    </section>
  )
}

export default VoiceBubble

export const PopupVoicePanel: React.FC<VoiceBubbleProps> = (props) => (
  <div className='relative h-full w-full'>
    <VoiceBubble {...props} className={`absolute inset-0 ${props.className ?? ''}`.trim()} />
  </div>
)



