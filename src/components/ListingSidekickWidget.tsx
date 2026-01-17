import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Property } from '../types'
import { resolveUserId } from '../services/userId'
import { continueConversation, generateSpeech } from '../services/openaiService'
import { getListingProfile, type SidekickProfile } from '../services/sidekickProfilesService'
import { searchListingKb } from '../services/listingKbService'
import { leadsService } from '../services/leadsService'
import { appendMessage, createConversation, getMessages, touchConversation, updateConversation } from '../services/chatService'
import { normalizeOpenAIVoice } from '../constants/openaiVoices'
import { upsertListingProfile } from '../services/sidekickProfilesService'
import { addTextKb, addUrlKb, uploadFileKb } from '../services/supabaseKb'
import PersonalityEditorModal, { PersonalityPayload } from './PersonalityEditorModal'
import KnowledgeEditorModal from './KnowledgeEditorModal'

interface ListingSidekickWidgetProps {
  property: Property
}

const EMAIL_PATTERN = '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}'

const extractEmailAddresses = (text: string): string[] => {
  if (!text) return []
  const regex = new RegExp(EMAIL_PATTERN, 'gi')
  const matches = text.match(regex)
  if (!matches) return []
  return Array.from(new Set(matches.map(match => match.trim().toLowerCase())))
}

const deriveLeadNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] || ''
  const cleaned = localPart.replace(/[^a-zA-Z0-9 ]+/g, ' ').trim()
  return cleaned || 'Listing Sidekick Lead'
}

const DEFAULT_PERSONA_DESCRIPTION =
  'You are the Listing Sidekick. Detail-oriented and helpful. Present property highlights and answer questions clearly.'

const SAMPLE_VOICES = [
  { id: 'nova', name: 'Nova', tone: 'Warm & Energetic', gender: 'female', description: 'Friendly, upbeat tone ideal for client engagement.' },
  { id: 'alloy', name: 'Alloy', tone: 'Balanced & Neutral', gender: 'neutral', description: 'Professional, well-rounded voice for general communications.' },
  { id: 'onyx', name: 'Onyx', tone: 'Confident & Steady', gender: 'male', description: 'Calm, confident tone suited for advisory conversations.' },
  { id: 'shimmer', name: 'Shimmer', tone: 'Enthusiastic & Creative', gender: 'female', description: 'High-energy voice perfect for marketing and promo copy.' },
  { id: 'echo', name: 'Echo', tone: 'Calm & Clear', gender: 'neutral', description: 'Soft, reassuring tone that keeps messaging grounded.' },
  { id: 'fable', name: 'Fable', tone: 'Friendly Narrative', gender: 'neutral', description: 'Storyteller vibe that feels warm and generous.' }
]

const ListingSidekickWidget: React.FC<ListingSidekickWidgetProps> = ({ property }) => {
  const uid = useMemo(() => resolveUserId(), [])
  const [profile, setProfile] = useState<SidekickProfile | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([])
  const scroller = useRef<HTMLDivElement | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const processedEmailsRef = useRef<Set<string>>(new Set())
  const [selectedVoice, setSelectedVoice] = useState('alloy')
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null)

  const persona = useMemo(
    () => profile?.description?.trim() ?? DEFAULT_PERSONA_DESCRIPTION,
    [profile]
  )
  const [showPersonaEditor, setShowPersonaEditor] = useState(false)
  const [savingPersona, setSavingPersona] = useState(false)
  const [showKnowledgeEditor, setShowKnowledgeEditor] = useState(false)
  const [knowledgeStatus, setKnowledgeStatus] = useState<string | null>(null)
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null)
  const [, setKnowledgeLoading] = useState({
    text: false,
    file: false,
    url: false
  })
  const [, setFeedbackMessage] = useState<string | null>(null);

  const getStoredConversationId = (listingId: string) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(`conv:${listingId}`)
  }

  const setStoredConversationId = (listingId: string, id: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(`conv:${listingId}`, id)
  }

  useEffect(() => {
    let isCancelled = false

    const loadProfile = async () => {
      try {
        const fetchedProfile = await getListingProfile(uid, property.id)
        if (!isCancelled) setProfile(fetchedProfile)
      } catch (error) {
        console.error('Failed to load listing sidekick profile', error)
      }
    }

    void loadProfile()

    return () => {
      isCancelled = true
    }
  }, [uid, property.id])

  // Sync voice from profile
  useEffect(() => {
    if (profile?.voice_label) {
      setSelectedVoice(profile.voice_label)
    }
  }, [profile])

  // Scroll to bottom of chat
  useEffect(() => {
    if (scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [history])

  const syncEmailsWithLeads = async (message: string, conversationId: string) => {
    if (!message || !conversationId || property.id === 'preview-id') return
    const emails = extractEmailAddresses(message)
    if (emails.length === 0) return
    const listingLabel = property.title || property.address || property.id
    for (const email of emails) {
      if (processedEmailsRef.current.has(email)) continue
      try {
        let lead = await leadsService.findByEmail(email)
        if (!lead) {
          lead = await leadsService.create({
            name: deriveLeadNameFromEmail(email),
            email,
            source: 'Listing Sidekick',
            notes: `Captured via Listing Sidekick for ${listingLabel}`
          })
        }
        await updateConversation(conversationId, {
          leadId: lead.id,
          contactEmail: lead.email,
          contactName: lead.name,
          contactPhone: lead.phone || null
        })
        processedEmailsRef.current.add(email)
      } catch (error) {
        console.error('Listing sidekick lead sync failed', error)
      }
    }
  }

  const cleanupVoiceAudio = () => {
    if (voiceAudioRef.current) {
      try {
        voiceAudioRef.current.pause()
      } catch (error) {
        console.error('Failed to pause voice audio', error)
      }
      try {
        URL.revokeObjectURL(voiceAudioRef.current.src)
      } catch (error) {
        console.error('Failed to revoke voice audio URL', error)
      }
      voiceAudioRef.current = null
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    } catch (error) {
      console.error('Failed to cancel speech synthesis', error)
    }
    setPlayingVoiceId(null)
  }

  const speakFallback = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setPlayingVoiceId(null)
      return
    }
    setPlayingVoiceId('fallback')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onend = () => setPlayingVoiceId(null)
    utterance.onerror = () => setPlayingVoiceId(null)
    window.speechSynthesis.speak(utterance)
  }

  const playVoiceSample = async (voiceId: string, text: string) => {
    if (!text) return
    cleanupVoiceAudio()
    setPlayingVoiceId(voiceId)
    try {
      const speech = await generateSpeech(text, normalizeOpenAIVoice(voiceId))
      if (speech.fallback || !speech.audioUrl) {
        speakFallback(text)
        return
      }
      const audio = new Audio(speech.audioUrl)
      voiceAudioRef.current = audio
      audio.onended = () => cleanupVoiceAudio()
      audio.onerror = () => cleanupVoiceAudio()
      await audio.play()
    } catch (error) {
      console.error('Voice preview failed', error)
      speakFallback(text)
    }
  }

  const handleVoiceChange = async (voiceId: string) => {
    setSelectedVoice(voiceId)
    if (!uid) return
    try {
      const updated = await upsertListingProfile(uid, property.id, {
        description: profile?.description,
        traits: profile?.traits,
        persona_preset: profile?.persona_preset,
        voice_label: voiceId
      })
      setProfile(updated)
    } catch (error) {
      console.error('Failed to save voice preference', error)
    }
  }

  const handleVoicePreview = () => {
    // Simple greeting preview
    const text = 'Hi! I am ready to answer questions about this property.';
    playVoiceSample(selectedVoice, text)
  }

  const handleSavePersonality = async (payload: PersonalityPayload) => {
    if (!uid) return
    setSavingPersona(true)
    try {
      const updated = await upsertListingProfile(uid, property.id, {
        description: payload.description,
        traits: payload.traits,
        persona_preset: payload.preset,
        voice_label: profile?.voice_label // Preserve voice
      })
      setProfile(updated)
      setFeedbackMessage('Personality saved.')
      setKnowledgeError(null)
      setShowPersonaEditor(false)
    } catch (error) {
      console.error('Listing sidekick personality save failed', error)
      setKnowledgeError('Unable to save personality right now.')
    } finally {
      setSavingPersona(false)
    }
  }

  const handleAddTextKnowledge = async (title: string, content: string) => {
    if (!uid) return
    setKnowledgeLoading(prev => ({ ...prev, text: true }))
    try {
      await addTextKb(uid, 'listing', title, content)
      setKnowledgeStatus('Text knowledge saved.')
      setKnowledgeError(null)
    } catch (error) {
      console.error('Failed to add listing knowledge', error)
      setKnowledgeError('Unable to add text knowledge right now.')
    } finally {
      setKnowledgeLoading(prev => ({ ...prev, text: false }))
    }
  }

  const handleUploadKnowledgeFiles = async (files: FileList | File[]) => {
    if (!uid) return
    setKnowledgeLoading(prev => ({ ...prev, file: true }))
    try {
      const fileArray = Array.from(files)
      for (const file of fileArray) {
        await uploadFileKb(uid, 'listing', file)
      }
      setKnowledgeStatus(`${fileArray.length} file${fileArray.length === 1 ? '' : 's'} uploaded.`)
      setKnowledgeError(null)
    } catch (error) {
      console.error('Listing knowledge file upload failed', error)
      setKnowledgeError('Failed to upload files.')
    } finally {
      setKnowledgeLoading(prev => ({ ...prev, file: false }))
    }
  }

  const handleScrapeKnowledge = async (url: string, frequency: 'once' | 'daily' | 'weekly') => {
    if (!uid) return
    setKnowledgeLoading(prev => ({ ...prev, url: true }))
    try {
      await addUrlKb(uid, 'listing', url, url)
      setKnowledgeStatus(`Website added to knowledge base (${frequency}).`)
      setKnowledgeError(null)
    } catch (error) {
      console.error('Listing knowledge scraping failed', error)
      setKnowledgeError('Failed to scrape website.')
    } finally {
      setKnowledgeLoading(prev => ({ ...prev, url: false }))
    }
  }

  const run = async () => {
    const q = input.trim()
    if (!q || loading) return
    setLoading(true)
    setHistory(prev => [...prev, { sender: 'user', text: q }])
    setInput('')
    try {
      // Ensure conversation exists (one per listing in localStorage)
      let convId = conversationId || getStoredConversationId(property.id)
      if (!convId) {
        const conv = await createConversation({ scope: 'listing', listingId: property.id })
        convId = conv.id
        setStoredConversationId(property.id, convId)
        setConversationId(convId)
      }
      void syncEmailsWithLeads(q, convId)
      await appendMessage({ conversationId: convId!, role: 'user', content: q })
      // 1) try listing KB first
      const hit = await searchListingKb(uid, property.id, q)
      if (hit?.answer) {
        setHistory(prev => [...prev, { sender: 'ai', text: hit.answer }])
        await appendMessage({ conversationId: convId!, role: 'ai', content: hit.answer })
        await touchConversation(convId!)
        setLoading(false)
        return
      }
      // 2) fallback to agent-wide listing KB
      const agentHit = await searchListingKb(uid, 'agent', q)
      if (agentHit?.answer) {
        setHistory(prev => [...prev, { sender: 'ai', text: agentHit.answer }])
        setLoading(false)
        return
      }
      // 3) final fallback to LLM with persona only
      const text = await continueConversation([
        { sender: 'system', text: persona },
        { sender: 'user', text: q }
      ])
      setHistory(prev => [...prev, { sender: 'ai', text }])
      await appendMessage({ conversationId: convId!, role: 'ai', content: text })
      await touchConversation(convId!)
    } catch (error) {
      console.error('Listing sidekick interaction failed', error)
      const fallback = 'I could not find that. Tap to contact the agent for details.'
      setHistory(prev => [...prev, { sender: 'ai', text: fallback }])
    } finally {
      setLoading(false)
    }
  }

  // Load existing conversation messages if present
  useEffect(() => {
    const loadExistingMessages = async () => {
      const storedId = conversationId || getStoredConversationId(property.id)
      if (!storedId || storedId === conversationId) return
      setConversationId(storedId)
      try {
        const msgs = await getMessages(storedId)
        const mapped = msgs.map((m): { sender: 'user' | 'ai'; text: string } => ({
          sender: m.sender === 'ai' ? 'ai' : 'user',
          text: m.content
        }))
        if (mapped.length) setHistory(mapped)
      } catch (error) {
        console.error('Failed to load listing sidekick history', error)
      }
    }

    void loadExistingMessages()
  }, [property.id, conversationId])

  useEffect(() => {
    return () => {
      cleanupVoiceAudio()
    }
  }, [])

  return (
    <>
      <PersonalityEditorModal
        isOpen={showPersonaEditor}
        initialDescription={profile?.description ?? DEFAULT_PERSONA_DESCRIPTION}
        initialTraits={profile?.traits ?? []}
        initialPreset={profile?.persona_preset ?? 'custom'}
        saving={savingPersona}
        onClose={() => setShowPersonaEditor(false)}
        onSave={handleSavePersonality}
      />
      <KnowledgeEditorModal
        isOpen={showKnowledgeEditor}
        // addingText={knowledgeLoading.text}
        // uploading={knowledgeLoading.file}
        // scraping={knowledgeLoading.url}
        onClose={() => setShowKnowledgeEditor(false)}
        onAddText={handleAddTextKnowledge}
        onUpload={handleUploadKnowledgeFiles}
        onScrape={handleScrapeKnowledge}
      />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-md">
            <span className='material-symbols-outlined'>smart_toy</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">AI Listing Agent</h3>
            <p className="text-sm text-slate-500">Your 24/7 automated open house host.</p>
          </div>
        </div>

        {/* 3 Config Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Identity Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-semibold">
              <span className="material-symbols-outlined text-indigo-500">face</span>
              Identity
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-600 line-clamp-2 h-10 leading-relaxed">
                {profile?.description || "Professional & detail-oriented advisor."}
              </div>
              <button
                onClick={() => setShowPersonaEditor(true)}
                className="w-full py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-xs hover:bg-indigo-100 transition"
              >
                Edit Persona
              </button>
            </div>
          </div>

          {/* Knowledge Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 text-slate-900 font-semibold">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">menu_book</span>
                Training
              </div>
              {(knowledgeStatus || profile) && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-600 line-clamp-2 h-10 leading-relaxed">
                {knowledgeStatus || "Knowledge Base Active"}
                {knowledgeError && <span className="text-red-500 block">{knowledgeError}</span>}
              </div>
              <button
                onClick={() => {
                  setKnowledgeStatus(null);
                  setShowKnowledgeEditor(true);
                }}
                className="w-full py-2 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-xs hover:bg-emerald-100 transition"
              >
                Add Knowledge
              </button>
            </div>
          </div>

          {/* Voice Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-semibold">
              <span className="material-symbols-outlined text-sky-500">graphic_eq</span>
              Voice
            </div>
            <div className="space-y-3">
              <select
                className='w-full rounded-lg border border-slate-200 text-xs py-1.5 px-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500'
                value={selectedVoice}
                onChange={e => handleVoiceChange(e.target.value)}
              >
                {SAMPLE_VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.tone})
                  </option>
                ))}
              </select>
              <button
                onClick={handleVoicePreview}
                className="w-full py-2 bg-sky-50 text-sky-700 font-semibold rounded-lg text-xs hover:bg-sky-100 transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">{playingVoiceId ? 'stop' : 'play_arrow'}</span>
                {playingVoiceId ? 'Playing...' : 'Preview Voice'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Chat */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-700">Live Preview</h4>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-600">Online</span>
            </div>
          </div>

          <div ref={scroller} className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
            {/* Initial Greeting */}
            {history.length === 0 && (
              <div className="flex justify-start">
                <div className="flex gap-2 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                  </div>
                  <div className="px-4 py-2.5 bg-slate-100 text-slate-800 rounded-2xl rounded-tl-none shadow-sm border border-slate-200/50 text-sm">
                    Hi! I'm ready to answer any questions about {property.address || 'this property'}.
                  </div>
                </div>
              </div>
            )}

            {history.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'ai' && (
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-sm">smart_toy</span>
                    </div>
                    <div className="px-4 py-2.5 bg-slate-100 text-slate-800 rounded-2xl rounded-tl-none shadow-sm border border-slate-200/50 text-sm leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                )}
                {m.sender === 'user' && (
                  <div className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl rounded-br-none shadow-md text-sm leading-relaxed max-w-[85%]">
                    {m.text}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                  </div>
                  <div className="px-4 py-3 bg-slate-50 rounded-2xl rounded-tl-none">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-white">
            <div className="relative">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && run()}
                placeholder="Ask a test question..."
                className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
              <button
                onClick={run}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ListingSidekickWidget
