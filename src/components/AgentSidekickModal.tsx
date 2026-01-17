import React, { useEffect, useState, useRef } from 'react'
import { AICardProfile } from '../services/aiCardService'
import { createConversation, appendMessage, getMessages, touchConversation } from '../services/chatService'
import { continueAgentConversation, generateSpeech } from '../services/openaiService'
import { normalizeOpenAIVoice } from '../constants/openaiVoices'

interface AgentSidekickModalProps {
    agentProfile: AICardProfile
    onClose: () => void
    initialMode?: 'voice' | 'chat'
}

export const AgentSidekickModal: React.FC<AgentSidekickModalProps> = ({ agentProfile, onClose, initialMode = 'chat' }) => {
    const [mode, setMode] = useState<'voice' | 'chat'>(initialMode)

    // Chat State
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [history, setHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([])
    const scroller = useRef<HTMLDivElement | null>(null)
    const [conversationId, setConversationId] = useState<string | null>(null)

    // Voice State
    const [isListening, setIsListening] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const voiceAudioRef = useRef<HTMLAudioElement | null>(null)
    const recognitionRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any

    // Agent Persona


    // Load/Create Conversation
    useEffect(() => {
        const initConv = async () => {
            if (!agentProfile.id) return

            // Persist session for anonymous user on this specific agent card
            const storageKey = `agent_card_conv:${agentProfile.id}`
            let storedId = localStorage.getItem(storageKey)

            if (!storedId) {
                const conv = await createConversation({
                    scope: 'agent',
                    title: `Chat with ${agentProfile.fullName}`,
                    // We can store agentId in metadata or leadId if logged in, 
                    // but for public visitor we just want a convo.
                    metadata: { agentId: agentProfile.id }
                })
                storedId = conv.id
                localStorage.setItem(storageKey, storedId)
            }
            setConversationId(storedId)

            // Load history
            const msgs = await getMessages(storedId)
            setHistory(msgs.map(m => ({ sender: m.sender === 'ai' ? 'ai' : 'user', text: m.content })))
        }
        initConv()
    }, [agentProfile.id, agentProfile.fullName])

    // Scroll to bottom
    useEffect(() => {
        if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
    }, [history, mode])

    const speak = React.useCallback(async (text: string) => {
        if (isPlaying) {
            voiceAudioRef.current?.pause()
        }
        setIsPlaying(true)
        try {
            // Default voice since AICardProfile doesn't have one yet
            const voiceId = 'shimmer'
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
    }, [isPlaying])

    const runChat = React.useCallback(async (text: string) => {
        if (!text.trim() || !conversationId) return
        setLoading(true)
        setError(null)

        // Add user message
        const newHistory = [...history, { sender: 'user' as const, text }]
        setHistory(newHistory)

        try {
            await appendMessage({ conversationId, role: 'user', content: text })

            // Generate AI Response using Agent Service
            // We pass the history including the new user message
            // Ideally continueAgentConversation takes the history array formatted for OpenAI
            // But our service signature is (messages: {sender, text}[], agentProfile)

            // Filter system messages from history if any (though we manage system prompt on backend typically)
            const apiMessages = newHistory.map(m => ({ sender: m.sender, text: m.text }))

            const aiText = await continueAgentConversation(apiMessages, agentProfile as unknown as Record<string, unknown>)

            setHistory(prev => [...prev, { sender: 'ai', text: aiText }])
            await appendMessage({ conversationId, role: 'ai', content: aiText })
            await touchConversation(conversationId)

            // If in voice mode, speak it
            if (mode === 'voice') {
                speak(aiText)
            }

        } catch (error) {
            console.error(error)
            setError('Sorry, I encountered an issue connecting to the AI. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [conversationId, history, agentProfile, mode, speak])

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
    }, [runChat])

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop()
        } else {
            recognitionRef.current?.start()
        }
    }

    const header = (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm overflow-hidden">
                {agentProfile.headshot ? (
                    <img src={agentProfile.headshot} alt="Agent" className="w-full h-full object-cover" />
                ) : (
                    <span className="material-symbols-outlined">smart_toy</span>
                )}
            </div>
            <div>
                <h3 className="text-lg font-bold text-white">Ask {agentProfile.fullName}</h3>
                <p className="text-white/80 text-xs">{agentProfile.professionalTitle || 'AI Assistant'}</p>
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm h-[600px] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div
                    className="p-4 shrink-0 relative"
                    style={{ background: `linear-gradient(135deg, ${agentProfile.brandColor || '#4f46e5'} 0%, ${agentProfile.brandColor || '#7c3aed'}aa 100%)` }}
                >
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    {header}
                </div>

                {/* Content */}
                <div className="flex-1 bg-gradient-to-b from-slate-50 to-white relative flex flex-col">
                    {mode === 'voice' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
                            <div
                                className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isListening ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' :
                                    (isPlaying ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50 scale-105' : 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl')
                                    }`}
                            >
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
                                    Ask me about {agentProfile.fullName}'s services, listings, or background.
                                </p>
                            </div>

                            {/* Visualizer bars (fake) */}
                            <div className="flex items-center gap-1 h-8">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i}
                                        className={`w-1.5 bg-indigo-400 rounded-full transition-all duration-150 ${isPlaying ? 'animate-bounce' : 'h-2'}`}
                                        style={{ height: isPlaying ? `${Math.random() * 24 + 8}px` : '8px', animationDelay: `${i * 0.1}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scroller}>
                            {history.length === 0 && (
                                <div className="text-center text-slate-400 text-sm mt-8">
                                    <p>Start a conversation with {agentProfile.fullName}'s AI Assistant.</p>
                                </div>
                            )}
                            {history.map((m, i) => (
                                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm ${m.sender === 'user'
                                            ? 'text-white rounded-br-none'
                                            : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                                            }`}
                                        style={m.sender === 'user' ? { backgroundColor: agentProfile.brandColor || '#4f46e5' } : {}}
                                    >
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

                            {error && (
                                <div className="flex justify-center my-2">
                                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">error</span>
                                        {error}
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
                                    className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                />
                                <button
                                    onClick={() => { runChat(input); setInput('') }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 text-white rounded-full flex items-center justify-center shadow-sm hover:opacity-90"
                                    style={{ backgroundColor: agentProfile.brandColor || '#4f46e5' }}
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-center gap-4">
                                <button onClick={toggleListening} className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold hover:bg-indigo-200 transition">
                                    {isListening ? 'Stop' : 'Start'}
                                </button>
                            </div>
                        )}

                        <div className="flex justify-center gap-2 mt-4">
                            <button
                                onClick={() => setMode('voice')}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${mode === 'voice' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                style={mode === 'voice' ? { backgroundColor: agentProfile.brandColor || '#4f46e5' } : {}}
                            >
                                Voice
                            </button>
                            <button
                                onClick={() => setMode('chat')}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${mode === 'chat' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                style={mode === 'chat' ? { backgroundColor: agentProfile.brandColor || '#4f46e5' } : {}}
                            >
                                Chat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
