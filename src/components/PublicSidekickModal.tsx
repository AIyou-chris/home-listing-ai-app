import React, { useEffect, useState, useRef, useMemo } from 'react'
import Modal from './Modal'
import { Property } from '../types'
import { getListingProfile, SidekickProfile } from '../services/sidekickProfilesService'
import { createConversation, appendMessage, getMessages, touchConversation, updateConversation } from '../services/chatService'
import { continueConversation, generateSpeech } from '../services/openaiService'
import { leadsService } from '../services/leadsService'
import { normalizeOpenAIVoice } from '../constants/openaiVoices'

interface PublicSidekickModalProps {
    property: Property
    onClose: () => void
    initialMode?: 'voice' | 'chat'
}

const DEFAULT_PERSONA_DESCRIPTION = 'You are the Listing Sidekick. Detail-oriented and helpful. Present property highlights and answer questions clearly.'

export const PublicSidekickModal: React.FC<PublicSidekickModalProps> = ({ property, onClose, initialMode = 'voice' }) => {
    const [mode, setMode] = useState<'voice' | 'chat'>(initialMode)
    const [profile, setProfile] = useState<SidekickProfile | null>(null)

    // Chat State
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([])
    const scroller = useRef<HTMLDivElement | null>(null)
    const [conversationId, setConversationId] = useState<string | null>(null)

    // Voice State
    const [isListening, setIsListening] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const voiceAudioRef = useRef<HTMLAudioElement | null>(null)
    const recognitionRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any

    const persona = useMemo(() => profile?.description?.trim() ?? DEFAULT_PERSONA_DESCRIPTION, [profile])

    // Load Profile (using Agent ID from property)
    useEffect(() => {
        const loadProfile = async () => {
            if (!property.agentId) return
            try {
                const fetched = await getListingProfile(property.agentId, property.id)
                setProfile(fetched)
            } catch (error) {
                console.error('Failed to load public sidekick profile', error)
            }
        }
        void loadProfile()
    }, [property.agentId, property.id])

    // Load/Create Conversation
    useEffect(() => {
        const initConv = async () => {
            // We use localStorage to persist session for anonymous user
            const storageKey = `public_conv:${property.id}`
            let storedId = localStorage.getItem(storageKey)

            if (!storedId) {
                const conv = await createConversation({ scope: 'listing', listingId: property.id, title: 'Visitor' })
                storedId = conv.id
                localStorage.setItem(storageKey, storedId)
            }
            setConversationId(storedId)

            // Load history
            const msgs = await getMessages(storedId)
            setHistory(msgs.map(m => ({ sender: m.sender === 'ai' ? 'ai' : 'user', text: m.content })))
        }
        initConv()
    }, [property.id])

    // Scroll to bottom
    useEffect(() => {
        if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
    }, [history, mode])

    const runChat = async (text: string) => {
        if (!text.trim() || !conversationId) return
        setLoading(true)

        // Add user message
        const newHistory = [...history, { sender: 'user' as const, text }]
        setHistory(newHistory)

        try {
            await appendMessage({ conversationId, role: 'user', content: text })

            // Generate AI Response
            const aiText = await continueConversation([
                { sender: 'system', text: persona },
                ...newHistory.slice(-10).map(m => ({ sender: m.sender, text: m.text })) // Context window
            ])

            setHistory(prev => [...prev, { sender: 'ai', text: aiText }])
            await appendMessage({ conversationId, role: 'ai', content: aiText })
            await touchConversation(conversationId)

            // If in voice mode, speak it
            if (mode === 'voice') {
                speak(aiText)
            }

        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const speak = async (text: string) => {
        if (isPlaying) {
            voiceAudioRef.current?.pause()
        }
        setIsPlaying(true)
        try {
            const voiceId = profile?.voice_label || 'alloy'
            const speech = await generateSpeech(text, normalizeOpenAIVoice(voiceId))
            if (speech.audioUrl) {
                const audio = new Audio(speech.audioUrl)
                voiceAudioRef.current = audio
                audio.onended = () => setIsPlaying(false)
                await audio.play()
            }
        } catch (e) {
            console.error('TTS failed', e)
            setIsPlaying(false)
        }
    }

    // Voice Recognition Setup
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SpeechRecognition = (window as any).webkitSpeechRecognition
            const recognition = new SpeechRecognition()
            recognition.continuous = false
            recognition.interimResults = false
            recognition.lang = 'en-US'

            recognition.onstart = () => setIsListening(true)
            recognition.onend = () => setIsListening(false)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                runChat(transcript)
            }
            recognitionRef.current = recognition
        }
    }, [conversationId, history, persona, profile]) // Deps might need tuning

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop()
        } else {
            recognitionRef.current?.start()
        }
    }

    const header = (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <span className="material-symbols-outlined">smart_toy</span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-white">AI Assistant</h3>
                <p className="text-white/80 text-xs">Here to help!</p>
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm h-[600px] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-4 shrink-0 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    {header}
                </div>

                {/* Content */}
                <div className="flex-1 bg-gradient-to-b from-violet-500/5 to-white relative flex flex-col">
                    {mode === 'voice' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
                            <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isListening ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' : (isPlaying ? 'bg-violet-500 shadow-lg shadow-violet-500/50 scale-105' : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-xl')}`}>
                                {/* Waves Ripple */}
                                {(isListening || isPlaying) && (
                                    <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                                )}
                                <span className="material-symbols-outlined text-5xl text-white">mic</span>
                            </div>

                            <div className="text-center space-y-2">
                                <h4 className="text-xl font-bold text-slate-800">
                                    {isListening ? 'Listening...' : (isPlaying ? 'Speaking...' : 'Tap to Speak')}
                                </h4>
                                <p className="text-slate-500 text-sm px-6">
                                    Ask anything about this property or how we automate your listings.
                                </p>
                            </div>

                            {/* Visualizer bars (fake) */}
                            <div className="flex items-center gap-1 h-8">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i}
                                        className={`w-1.5 bg-violet-400 rounded-full transition-all duration-150 ${isPlaying ? 'animate-bounce' : 'h-2'}`}
                                        style={{ height: isPlaying ? `${Math.random() * 24 + 8}px` : '8px', animationDelay: `${i * 0.1}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scroller}>
                            {history.map((m, i) => (
                                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm ${m.sender === 'user' ? 'bg-violet-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="px-4 py-3 bg-slate-50 rounded-2xl rounded-tl-none border border-slate-100">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab Switcher / Footer */}
                    <div className="p-4 bg-white/80 backdrop-blur border-t border-slate-100 shrink-0">
                        {mode === 'chat' ? (
                            <div className="relative">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (runChat(input), setInput(''))}
                                    placeholder="Type a message..."
                                    className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-violet-500"
                                    autoFocus
                                />
                                <button
                                    onClick={() => { runChat(input); setInput('') }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-violet-700"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-center gap-4">
                                <button onClick={toggleListening} className="px-6 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-semibold hover:bg-violet-200 transition">
                                    {isListening ? 'Stop' : 'Start'}
                                </button>
                            </div>
                        )}

                        <div className="flex justify-center gap-2 mt-4">
                            <button onClick={() => setMode('voice')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${mode === 'voice' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                                Voice
                            </button>
                            <button onClick={() => setMode('chat')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${mode === 'chat' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                                Chat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
