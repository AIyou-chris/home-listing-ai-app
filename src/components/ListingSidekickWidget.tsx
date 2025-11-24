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
  const [testPrompt, setTestPrompt] = useState('')
  const [testResponseText, setTestResponseText] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
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
  const [knowledgeLoading, setKnowledgeLoading] = useState({
    text: false,
    file: false,
    url: false
  })
  const [showVoiceSamples, setShowVoiceSamples] = useState(true)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

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

  const handleVoicePreview = () => {
    const text = property.description
      ? `${property.description.title} ${property.description.paragraphs?.join(' ') ?? ''}`.trim()
      : 'Listing Sidekick preview'
    playVoiceSample(selectedVoice, text || 'Listing Sidekick preview')
  }

  const handleSavePersonality = async (payload: PersonalityPayload) => {
    if (!uid) return
    setSavingPersona(true)
    try {
      const updated = await upsertListingProfile(uid, property.id, {
        description: payload.description,
        traits: payload.traits,
        persona_preset: payload.preset
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

  const handleTestResponse = async () => {
    const prompt = testPrompt.trim()
    if (!prompt || isTesting) return
    setIsTesting(true)
    setTestError(null)
    try {
      const text = await continueConversation([
        { sender: 'system', text: persona },
        { sender: 'user', text: prompt }
      ])
      setTestResponseText(text)
      setTestPrompt('')
      await playVoiceSample(selectedVoice, text)
    } catch (error) {
      console.error('Listing sidekick test failed', error)
      setTestError('Unable to test responses right now.')
    } finally {
      setIsTesting(false)
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
        addingText={knowledgeLoading.text}
        uploading={knowledgeLoading.file}
        scraping={knowledgeLoading.url}
        onClose={() => setShowKnowledgeEditor(false)}
        onAddText={handleAddTextKnowledge}
        onUpload={handleUploadKnowledgeFiles}
        onScrape={handleScrapeKnowledge}
      />
      <div className='rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-1'>
      <div className='px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='material-symbols-outlined text-slate-700'>smart_toy</span>
          <div>
            <div className='text-sm font-semibold text-slate-900'>Listing Sidekick</div>
            <div className='text-xs text-slate-500'>Speaks with your configured voice and persona</div>
          </div>
        </div>
      </div>

      <div className='px-5 py-5 space-y-6'>
        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-[11px] uppercase tracking-[0.2em] text-slate-500'>Who I am</p>
              <p className='text-lg font-semibold text-slate-900'>Listing Sidekick</p>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => {
                  setFeedbackMessage(null)
                  setShowPersonaEditor(true)
                }}
                className='px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-full'
              >
                AI Personality
              </button>
              <button
                onClick={() => {
                  setFeedbackMessage(null)
                  setKnowledgeStatus(null)
                  setKnowledgeError(null)
                  setShowKnowledgeEditor(true)
                }}
                className='px-4 py-2 border border-slate-300 text-xs text-slate-700 rounded-full hover:border-slate-400'
              >
                Add Knowledge
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={profile?.description ?? DEFAULT_PERSONA_DESCRIPTION}
            className='w-full min-h-[92px] rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 focus:outline-none'
          />
          {(feedbackMessage || knowledgeStatus || knowledgeError) && (
            <div className='space-y-1'>
              {feedbackMessage && <p className='text-xs text-emerald-600'>{feedbackMessage}</p>}
              {knowledgeStatus && <p className='text-xs text-slate-600'>{knowledgeStatus}</p>}
              {knowledgeError && <p className='text-xs text-red-600'>{knowledgeError}</p>}
            </div>
          )}
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-4 space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-[11px] uppercase tracking-[0.2em] text-slate-500'>Voice & Preview Tools</p>
              <p className='text-sm text-slate-700'>Select a voice and preview how the sidekick sounds.</p>
            </div>
            <button
              onClick={handleVoicePreview}
              className='px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition'
            >
              Preview Voice
            </button>
          </div>
          <select
            className='w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-200'
            value={selectedVoice}
            onChange={e => setSelectedVoice(e.target.value)}
          >
            {SAMPLE_VOICES.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name} — {voice.tone}
              </option>
            ))}
          </select>
        </div>

        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <p className='text-[11px] uppercase tracking-[0.2em] text-slate-500'>Sample All 6 OpenAI Voices</p>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => setShowVoiceSamples(prev => !prev)}
                className='text-xs font-semibold text-blue-600 hover:underline'
              >
                {showVoiceSamples ? 'Hide samples' : 'Show samples'}
              </button>
              <a href='https://www.openai.fm/' target='_blank' rel='noreferrer' className='text-xs text-blue-600 hover:underline'>Try on openai.fm</a>
            </div>
          </div>
          {showVoiceSamples && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {SAMPLE_VOICES.map(voice => (
                <div key={voice.id} className='rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-col justify-between'>
                  <div>
                    <div className='flex items-center justify-between mb-1'>
                      <p className='text-base font-semibold text-slate-900'>{voice.name}</p>
                      <span className='text-[10px] uppercase tracking-[0.2em] text-slate-500'>{voice.gender}</span>
                    </div>
                    <p className='text-sm text-slate-600 mb-1'>{voice.tone}</p>
                    <p className='text-xs text-slate-500'>{voice.description}</p>
                  </div>
                  <button
                    onClick={() => playVoiceSample(voice.id, `Hi, this is the ${voice.name} voice preview for your listing.`)}
                    className={`mt-3 w-full px-3 py-1.5 rounded-lg text-xs font-semibold ${playingVoiceId === voice.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'}`}
                  >
                    {playingVoiceId === voice.id ? 'Playing…' : 'Play'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-semibold text-slate-900'>Test Responses</span>
            {isTesting && <span className='text-xs text-emerald-600'>Generating response…</span>}
          </div>
          <div className='flex gap-3'>
            <input
              value={testPrompt}
              onChange={e => setTestPrompt(e.target.value)}
              disabled={isTesting}
              placeholder='Enter a question or statement to test…'
              className='flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-200'
            />
            <button
              onClick={handleTestResponse}
              disabled={!testPrompt.trim() || isTesting}
              className='px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60'
            >
              {isTesting ? 'Testing…' : 'Test Responses'}
            </button>
          </div>
          {testError && <p className='text-xs text-red-600'>{testError}</p>}
          {testResponseText && (
            <div className='space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Preview</p>
              <p>{testResponseText}</p>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => playVoiceSample(selectedVoice, testResponseText)}
                  className='px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:border-slate-400'
                >
                  Replay Voice
                </button>
                <span className='text-[11px] text-slate-500'>Plays the current voice with the latest response.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div ref={scroller} className='p-4 space-y-3 max-h-[48vh] overflow-y-auto'>
        {history.length === 0 && (
          <div className='text-sm text-slate-500'>Ask about features, schools, HOA, upgrades, timing…</div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-3 py-2 rounded-xl text-sm ${m.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className='border-t border-slate-200 p-3'>
        <div className='flex items-center gap-2'>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder='Ask about this home…' className='flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm' />
          <button onClick={run} disabled={!input.trim() || loading} className='px-3 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:bg-slate-300'>
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </div>
        <div className='mt-2 text-[11px] text-slate-500'>If I can’t answer, I’ll escalate to the agent.</div>
      </div>
    </div>
    </>
  )
}

export default ListingSidekickWidget
