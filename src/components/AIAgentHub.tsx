import React, { useMemo, useState, useRef, useEffect } from 'react'
import { continueConversation as aiContinue } from '../services/openaiService'
import { listKb, uploadFileKb, addTextKb, addUrlKb, deleteKb, getEntry, getPublicUrl, type KbEntry } from '../services/supabaseKb'

interface AgentCard {
  id: string
  name: string
  category: string
  tags: string[]
  entries: number
  updatedAt: string
  description: string
  accent: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet'
}

const sampleAgents: AgentCard[] = [
  {
    id: 'sales-bot',
    name: 'Sales Bot',
    category: 'AI Agent',
    tags: ['Sales'],
    entries: 0,
    updatedAt: new Date().toISOString().slice(0, 10),
    description:
      'Your persuasive, calm closer. Handles objections, follow-ups, and '
      + 'next-step nudges with concise, high-conversion language.',
    accent: 'blue'
  }
]

const accentRing: Record<AgentCard['accent'], string> = {
  blue: 'ring-blue-200/60',
  emerald: 'ring-emerald-200/60',
  amber: 'ring-amber-200/60',
  rose: 'ring-rose-200/60',
  violet: 'ring-violet-200/60'
}

const accentBadge: Record<AgentCard['accent'], string> = {
  blue: 'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  violet: 'bg-violet-50 text-violet-700'
}

const accentPrimary: Record<AgentCard['accent'], string> = {
  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  amber: 'bg-amber-600 hover:bg-amber-700 text-white',
  rose: 'bg-rose-600 hover:bg-rose-700 text-white',
  violet: 'bg-violet-600 hover:bg-violet-700 text-white'
}

const accentOutline: Record<AgentCard['accent'], string> = {
  blue: 'border-blue-200 text-blue-700 hover:bg-blue-50',
  emerald: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
  amber: 'border-amber-200 text-amber-700 hover:bg-amber-50',
  rose: 'border-rose-200 text-rose-700 hover:bg-rose-50',
  violet: 'border-violet-200 text-violet-700 hover:bg-violet-50'
}

const accentHeaderBg: Record<AgentCard['accent'], string> = {
  blue: 'bg-blue-50',
  emerald: 'bg-emerald-50',
  amber: 'bg-amber-50',
  rose: 'bg-rose-50',
  violet: 'bg-violet-50'
}

const accentIconBg: Record<AgentCard['accent'], string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500'
}

type VoiceOption = 'Female Voice 1' | 'Female Voice 2' | 'Male Voice 1' | 'Male Voice 2' | 'Neutral Voice 1'
type PersonaOption = 'Professional' | 'Friendly' | 'Enthusiastic'

interface SidekickConfig {
  id: 'main' | 'sales' | 'listing' | 'agent' | 'helper' | 'marketing' | 'support'
  title: string
  icon: string
  tone: PersonaOption
  voice: VoiceOption
  accent: AgentCard['accent']
}

const AIAgentHub: React.FC = () => {
  const agents = useMemo(() => sampleAgents, [])
  const agent = agents[0]
  const [showPersona, setShowPersona] = useState<SidekickConfig['id'] | null>(null)
  const [showKnowledge, setShowKnowledge] = useState<SidekickConfig['id'] | null>(null)
  const [showTest, setShowTest] = useState<SidekickConfig['id'] | null>(null)
  const [kbTarget, setKbTarget] = useState<SidekickConfig['id'] | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResponse, setTestResponse] = useState('')
  // Legacy per-card knowledge (no longer surfaced on cards)
  const [knowledge, setKnowledge] = useState<Array<{ id: string; title: string; createdAt: string; for: SidekickConfig['id']; fileId?: string }>>([])
  // Modal-scoped knowledge list for the active sidekick
  const [kbEntries, setKbEntries] = useState<KbEntry[]>([])
  const [kbLoading, setKbLoading] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [preview, setPreview] = useState<{ id: string; title: string; content?: string; url?: string } | null>(null)

  const getUserId = () => {
    const raw = localStorage.getItem('adminUser') || 'dev-admin'
    try {
      const obj = JSON.parse(raw)
      return (obj?.uid || obj?.email || 'dev-admin') as string
    } catch {
      return raw
    }
  }
  const [kTitle, setKTitle] = useState('')
  const [kText, setKText] = useState('')
  const [kUrl, setKUrl] = useState('')
  const [kFrequency, setKFrequency] = useState<'once' | 'daily' | 'weekly'>('once')
  const [kFiles, setKFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [personas, setPersonas] = useState<Record<SidekickConfig['id'], { preset: string; description: string; traits: string[] }>>({
    main: { preset: 'custom', description: 'You are the Main Sidekick. Professional, reliable, and helpful across scenarios.', traits: [] },
    sales: { preset: 'custom', description: 'You are the Sales Sidekick. Calm, persuasive, and concise. Handle objections, offer next steps.', traits: [] },
    listing: { preset: 'custom', description: 'You are the Listing Sidekick. Detail-oriented and helpful. Present property highlights and answer questions clearly.', traits: [] },
    agent: { preset: 'custom', description: 'You are the Agent Sidekick. Proactive and organized. Assist the agent with tasks and communication.', traits: [] },
    helper: { preset: 'custom', description: 'You are the Helper Sidekick. Friendly general assistant for miscellaneous tasks.', traits: [] },
    marketing: { preset: 'custom', description: 'You are the Marketing Sidekick. Energetic and conversion-focused. Craft catchy, on-brand copy and CTAs.', traits: [] },
    support: { preset: 'custom', description: 'You are the Support Sidekick. Empathetic, clear, and solutions-oriented. Resolve issues and guide next actions.', traits: [] }
  })
  const [traitDraft, setTraitDraft] = useState('')

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const savedPersonas = localStorage.getItem('aiSidekicks_personas')
      if (savedPersonas) {
        setPersonas(prev => ({ ...prev, ...JSON.parse(savedPersonas) }))
      }
    } catch {}
    try {
      const savedKnowledge = localStorage.getItem('aiSidekicks_knowledge')
      if (savedKnowledge) {
        const parsed = JSON.parse(savedKnowledge)
        if (Array.isArray(parsed)) setKnowledge(parsed)
      }
    } catch {}
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aiSidekicks_personas', JSON.stringify(personas))
    } catch {}
  }, [personas])

  useEffect(() => {
    try {
      localStorage.setItem('aiSidekicks_knowledge', JSON.stringify(knowledge))
    } catch {}
  }, [knowledge])

  // When opening the Knowledge modal, fetch existing entries for that sidekick
  useEffect(() => {
    (async () => {
      if (!showKnowledge) return
      const userId = getUserId()
      try {
        const entries = await listKb(userId, showKnowledge as any)
        setKbEntries(entries)
      } catch (e) {
        console.warn('listKnowledge failed', e)
      }
    })()
  }, [showKnowledge])
  const [testInputs, setTestInputs] = useState<Record<SidekickConfig['id'], string>>({
    main: '', sales: '', listing: '', agent: '', helper: '', marketing: '', support: ''
  })

  const [sidekicks, setSidekicks] = useState<SidekickConfig[]>([
    { id: 'main', title: 'Main Sidekick', icon: 'account_circle', tone: 'Professional', voice: 'Female Voice 1', accent: 'blue' },
    { id: 'sales', title: 'Sales Sidekick', icon: 'trending_up', tone: 'Friendly', voice: 'Male Voice 1', accent: 'emerald' },
    { id: 'marketing', title: 'Marketing Sidekick', icon: 'campaign', tone: 'Enthusiastic', voice: 'Female Voice 2', accent: 'amber' },
    { id: 'support', title: 'Support Sidekick', icon: 'support_agent', tone: 'Professional', voice: 'Male Voice 2', accent: 'violet' }
  ])

  const setTone = (id: SidekickConfig['id'], tone: PersonaOption) => setSidekicks(prev => prev.map(s => s.id === id ? { ...s, tone } : s))
  const setVoice = (id: SidekickConfig['id'], voice: VoiceOption) => setSidekicks(prev => prev.map(s => s.id === id ? { ...s, voice } : s))
  const [expanded, setExpanded] = useState<Record<SidekickConfig['id'], boolean>>({ main: false, sales: false, listing: false, agent: false, helper: false, marketing: false, support: false })

  const getPersonaPrompt = (id: SidekickConfig['id']) => {
    switch (id) {
      case 'sales':
        return 'You are the Sales Sidekick. Calm, persuasive, and concise. Handle objections, offer next steps.'
      case 'marketing':
        return 'You are the Marketing Sidekick. Energetic and conversion-focused. Craft catchy, on-brand copy and CTAs.'
      case 'support':
        return 'You are the Support Sidekick. Empathetic, clear, and solutions-oriented. Resolve issues and guide next actions.'
      case 'listing':
        return 'You are the Listing Sidekick. Detail-oriented and helpful. Present property highlights and answer questions clearly.'
      case 'agent':
        return 'You are the Agent Sidekick. Proactive and organized. Assist the agent with tasks and communication.'
      case 'helper':
        return 'You are the Helper Sidekick. Friendly general assistant for miscellaneous tasks.'
      case 'main':
      default:
        return 'You are the Main Sidekick. Professional, reliable, and helpful across scenarios.'
    }
  }

  const handleRunTest = async () => {
    if (!showTest) return
    const message = (testInputs[showTest] || '').trim()
    if (!message) return
    setTestLoading(true)
    setTestResponse('')
    try {
      const persona = getPersonaPrompt(showTest)
      const text = await aiContinue([
        { sender: 'system', text: persona },
        { sender: 'user', text: message }
      ])
      setTestResponse(text)
    } catch (e) {
      setTestResponse('Failed to get response')
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-slate-200'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'>
          <div>
            <h1 className='text-[22px] font-semibold tracking-[-0.01em] text-slate-900'>
              AI Agent Library
            </h1>
            <p className='text-slate-500 text-sm'>
              Curated, consistent, Apple-like elegance
            </p>
          </div>
          {/* Header action buttons removed */}
        </div>
      </header>

      <main className='mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10'>
        <article
          className={`relative rounded-3xl bg-white/90 ring-1 ${accentRing[agent.accent]} `
            + 'shadow-[0_1px_0_0_rgba(15,23,42,0.04),0_1px_2px_0_rgba(15,23,42,0.08)] '
            + 'transition-all duration-300 overflow-hidden'}
        >
          <div className='p-6 md:p-8'>
            {/* Sales Bot section removed */}

            {/* Two sidekick cards */}
            <div className='mt-8 grid grid-cols-1 md:grid-cols-2 gap-6'>
              {sidekicks.map(sk => (
                <div key={sk.id} className={`rounded-3xl ring-1 ${accentRing[sk.accent]} bg-white/90 shadow-[0_1px_0_0_rgba(15,23,42,0.04),0_1px_2px_0_rgba(15,23,42,0.08)] overflow-hidden`}>
                  <button onClick={() => setExpanded(prev => ({ ...prev, [sk.id]: !prev[sk.id] }))} className={`${accentHeaderBg[sk.accent]} w-full flex items-center justify-between px-4 py-3 md:py-4`}>
                    <div className='flex items-center gap-3'>
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white ${accentIconBg[sk.accent]}`}>
                        <span className='material-symbols-outlined'>{sk.icon}</span>
                      </span>
                      <span className='text-slate-900 font-semibold'>{sk.title}</span>
                    </div>
                    <span className='material-symbols-outlined text-slate-500 md:hidden'>
                      {expanded[sk.id] ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  <div className={`${expanded[sk.id] ? 'block' : 'hidden'} md:block p-4 md:p-5 space-y-4`}>
                    <div>
                      <div className='text-[13px] font-semibold text-slate-800 mb-1'>Who I am</div>
                      <textarea
                        rows={3}
                        className='w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white'
                        value={personas[sk.id]?.description || ''}
                        onChange={e => setPersonas(prev => ({ ...prev, [sk.id]: { ...(prev[sk.id] || { preset: 'custom', description: '', traits: [] }), description: e.target.value } }))}
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <button
                        onClick={() => setShowPersona(sk.id)}
                        className={`px-3 py-2 rounded-xl text-sm transition-colors ${accentPrimary[sk.accent]}`}
                      >
                        AI Personality
                      </button>
                      <button
                        onClick={() => { setShowKnowledge(sk.id); setKbTarget(sk.id); }}
                        className={`px-3 py-2 rounded-xl bg-white border text-sm transition-colors ${accentOutline[sk.accent]}`}
                      >
                        Add Knowledge
                      </button>
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-xs text-slate-600 mb-1'>Voice</label>
                        <select value={sk.voice} onChange={e => setVoice(sk.id, e.target.value as VoiceOption)} className='w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white'>
                          <option>Female Voice 1</option>
                          <option>Female Voice 2</option>
                          <option>Male Voice 1</option>
                          <option>Male Voice 2</option>
                          <option>Neutral Voice 1</option>
                        </select>
                      </div>
                    </div>
                    {/* Knowledge list removed from card; managed in modal now */}

                    {/* Per-card testing */}
                    <div className='mt-3 rounded-xl border border-slate-200 p-3'>
                      <div className='text-sm font-semibold text-slate-900 mb-2'>Test Personality</div>
                      <div className='flex items-center gap-3'>
                        <input
                          value={testInputs[sk.id]}
                          onChange={e => setTestInputs(prev => ({ ...prev, [sk.id]: e.target.value }))}
                          className='flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm'
                          placeholder='Enter a question or statement to test...'
                        />
                        <button
                          onClick={() => setShowTest(sk.id)}
                          className={`px-3 py-2 rounded-lg text-white text-sm ${accentPrimary[sk.accent]}`}
                        >
                          Test Responses
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Global Knowledge entries removed (now per card) */}

            {/* Sample Voices */}
            <div className='mt-8 rounded-2xl border border-slate-200 p-4'>
              <h4 className='text-sm font-semibold text-slate-900 mb-3'>Sample Voices</h4>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {(['Female Voice 1','Female Voice 2','Male Voice 1','Male Voice 2','Neutral Voice 1'] as VoiceOption[]).map(v => (
                  <div key={v} className='rounded-xl border border-slate-200 p-3'>
                    <div className='font-medium text-slate-900 text-sm mb-2'>{v}</div>
                    <div className='flex items-center gap-2'>
                      <button onClick={() => {
                        const u = new SpeechSynthesisUtterance('This is a sample voice.');
                        window.speechSynthesis.cancel();
                        window.speechSynthesis.speak(u);
                      }} className='px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700'>Play</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* Persona modal - AI Personality Editor */}
        {showPersona && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <div className='absolute inset-0 bg-black/40' onClick={() => setShowPersona(null)} />
            <div className='relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden'>
              <div className='flex items-center justify-between px-5 py-4 border-b border-slate-200'>
                <div className='flex items-center gap-2'>
                  <span className='material-symbols-outlined text-primary-600'>magic_button</span>
                  <h3 className='text-base font-semibold text-slate-900'>AI Personality Editor</h3>
                </div>
                <button onClick={() => setShowPersona(null)} className='p-1 rounded-md hover:bg-slate-100'><span className='material-symbols-outlined'>close</span></button>
              </div>
              <div className='p-5 space-y-5 max-h-[75vh] overflow-y-auto'>
                <div>
                  <div className='text-sm font-semibold text-slate-900 mb-2'>Who You Are</div>
                  <div className='rounded-xl border border-slate-200 p-3 bg-slate-50'>
                    <div className='text-[13px] font-medium text-slate-900 mb-2'>Custom Personality</div>
                    <div className='text-xs text-slate-600'>Create your own unique AI personality with custom traits & behavior.</div>
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-semibold text-slate-900 mb-2'>Personality Description</label>
                  <textarea
                    rows={8}
                    value={personas[showPersona]?.description || ''}
                    onChange={e => setPersonas(prev => ({ ...prev, [showPersona]: { ...(prev[showPersona] || { preset: 'custom', description: '', traits: [] }), description: e.target.value } }))}
                    className='w-full border border-slate-300 rounded-lg px-3 py-2 text-sm'
                    placeholder='Define who you want the AI to be and how they should behave.'
                  />
                  <p className='mt-2 text-xs text-slate-600'>Be specific about role, expertise, and approach. Keep it concise.</p>
                </div>

                <div>
                  <label className='block text-sm font-semibold text-slate-900 mb-2'>Additional Personality Traits</label>
                  <div className='flex gap-2'>
                    <input value={traitDraft} onChange={e => setTraitDraft(e.target.value)} className='flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm' placeholder="Add a personality trait (e.g., 'patient', 'creative')" />
                    <button onClick={() => {
                      const t = traitDraft.trim();
                      if (!t) return;
                      setPersonas(prev => ({ ...prev, [showPersona]: { ...(prev[showPersona] || { preset: 'custom', description: '', traits: [] }), traits: [...(prev[showPersona]?.traits || []), t] } }));
                      setTraitDraft('');
                    }} className='px-3 py-2 rounded-lg bg-slate-900 text-white text-sm'>Add</button>
                  </div>
                  {(personas[showPersona]?.traits?.length || 0) > 0 && (
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {(personas[showPersona]?.traits || []).map((t, i) => (
                        <span key={i} className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200'>
                          {t}
                          <button onClick={() => setPersonas(prev => ({ ...prev, [showPersona]: { ...(prev[showPersona] || { preset: 'custom', description: '', traits: [] }), traits: (prev[showPersona]?.traits || []).filter((_, idx) => idx !== i) } }))} className='text-slate-500 hover:text-slate-900'>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className='text-sm font-semibold text-slate-900 mb-2'>Preview</div>
                  <div className='rounded-xl border border-slate-200 p-3 text-sm text-slate-800 bg-slate-50'>
                    {personas[showPersona]?.description || 'Nothing to preview yet.'}
                  </div>
                </div>
              </div>
              <div className='border-t border-slate-200 p-4 bg-white flex items-center justify-end gap-2'>
                <button onClick={() => setShowPersona(null)} className='px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm'>Cancel</button>
                <button onClick={() => setShowPersona(null)} className='px-4 py-2 rounded-full bg-slate-900 text-white text-sm'>Save Personality</button>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge modal */}
        {showKnowledge && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <div className='absolute inset-0 bg-black/40' onClick={() => setShowKnowledge(null)} />
            <div className='relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col'>
              <div className='flex items-center justify-between px-5 py-4 border-b border-slate-200 rounded-t-xl'>
                <h3 className='text-base font-semibold text-slate-900'>Agent Knowledge Base</h3>
                <button onClick={() => setShowKnowledge(null)} className='p-1 rounded-md hover:bg-slate-100'><span className='material-symbols-outlined'>close</span></button>
              </div>
              <div className='px-5 pt-4 pb-5 space-y-5 max-h-[75vh] overflow-y-auto'>
                <p className='text-sm text-slate-600'>Upload documents, scripts, and materials that will help your AI understand your expertise and approach.</p>

                {/* Upload Area */}
                <div className='rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center'>
                  <div className='flex flex-col items-center gap-2'>
                    <span className='material-symbols-outlined text-4xl text-slate-400'>upload</span>
                    <div className='font-semibold text-slate-800'>Upload Agent Files</div>
                    <div className='text-sm text-slate-500'>Drag and drop files here, or click to browse</div>
                    <div className='mt-3'>
                      <button onClick={() => fileInputRef.current?.click()} className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm'>
                        <span className='material-symbols-outlined text-base'>file_upload</span>
                        Choose Files
                      </button>
                      <input ref={fileInputRef} type='file' multiple className='hidden' onChange={async e => {
                        const files = Array.from(e.target.files || [])
                        setKFiles(prev => [...prev, ...files])
                        // Upload to Supabase
                        if (files.length > 0) {
                          setIsUploadingFiles(true)
                          const activeFor = (showKnowledge || 'listing') as SidekickConfig['id']
                          const userId = getUserId()
                          try {
                            for (const f of files) {
                              const row = await uploadFileKb(userId, activeFor, f)
                              setKbEntries(prev => [row, ...prev])
                            }
                          } catch (err) {
                            console.error('Upload error', err)
                          } finally {
                            setIsUploadingFiles(false)
                          }
                        }
                      }} />
                    </div>
                  </div>
                  {kFiles.length === 0 ? (
                    <div className='mt-6 text-sm text-slate-500'>
                      {isUploadingFiles ? 'Uploading files...' : 'No files uploaded yet. Upload documents to train your AI assistant.'}
                    </div>
                  ) : (
                    <ul className='mt-6 grid sm:grid-cols-2 gap-2 text-sm'>
                      {kFiles.map((f, i) => (
                        <li key={i} className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 bg-white'>
                          <span className='truncate'>{f.name}</span>
                          <button onClick={() => setKFiles(prev => prev.filter((_, idx) => idx !== i))} className='text-slate-500 hover:text-slate-900'>Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Add Text Knowledge */}
                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='flex items-center gap-2 mb-3'>
                    <span className='material-symbols-outlined text-amber-600'>note_add</span>
                    <div className='font-semibold text-slate-900'>Add Text Knowledge</div>
                  </div>
                  <label className='block text-xs text-slate-600 mb-1'>Content Title</label>
                  <input value={kTitle} onChange={e => setKTitle(e.target.value)} className='w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3' placeholder='e.g., Agent Scripts, Q&A' />
                  <label className='block text-xs text-slate-600 mb-1'>Agent Knowledge</label>
                  <textarea rows={5} value={kText} onChange={e => setKText(e.target.value)} className='w-full border border-slate-300 rounded-lg px-3 py-2 text-sm' placeholder='Paste your agent knowledge content here...' />
                  <button onClick={async () => {
                    const textBody = kText.trim()
                    const safeTitle = (kTitle.trim() || textBody.slice(0, 60) || 'Text Note').replace(/\s+/g, ' ').trim()
                    if (!textBody) return
                    const target = (showKnowledge || 'listing') as SidekickConfig['id']
                    const userId = getUserId()
                    try {
                      const row = await addTextKb(userId, target, safeTitle, textBody)
                      setKbEntries(prev => [row, ...prev])
                    } catch (e) {
                      console.warn('Text KB save failed (local only)', e)
                    }
                    setKTitle('')
                    setKText('')
                  }} className='mt-3 w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm'>Add to Knowledge Base</button>
                </div>

                {/* URL Scraper */}
                <div className='rounded-2xl border border-slate-200 bg-green-50 p-4'>
                  <div className='flex items-center gap-2 mb-3'>
                    <span className='material-symbols-outlined text-green-700'>language</span>
                    <div className='font-semibold text-slate-900'>URL Scraper</div>
                  </div>
                  <label className='block text-xs text-slate-600 mb-1'>Website URL</label>
                  <input value={kUrl} onChange={e => setKUrl(e.target.value)} className='w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3' placeholder='https://example.com/agent-resources' />
                  <label className='block text-xs text-slate-600 mb-1'>Scraping Frequency</label>
                  <select value={kFrequency} onChange={e => setKFrequency(e.target.value as any)} className='w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3'>
                    <option value='once'>Once (Manual)</option>
                    <option value='daily'>Daily</option>
                    <option value='weekly'>Weekly</option>
                  </select>
                  <button onClick={async () => {
                    const raw = kUrl.trim()
                    if (!raw) return
                    const target = (showKnowledge || 'listing') as SidekickConfig['id']
                    const userId = getUserId()
                    setIsScraping(true)
                    try {
                      // 1) Save the URL reference row (for traceability)
                      const refRow = await addUrlKb(userId, target, 'Source URL', raw)
                      setKbEntries(prev => [refRow, ...prev])

                      // 2) Fetch readable content using Jina Reader (no CORS issues)
                      const encoded = encodeURI(raw)
                      const readerUrl = `https://r.jina.ai/${encoded}`
                      const resp = await fetch(readerUrl, { method: 'GET' })
                      const text = (await resp.text()).trim()
                      if (text.length > 0) {
                        const hostname = (() => { try { return new URL(raw).hostname } catch { return 'page' } })()
                        const title = `Scraped: ${hostname}`
                        const clipped = text.length > 20000 ? text.slice(0, 20000) : text
                        const row = await addTextKb(userId, target, title, clipped)
                        setKbEntries(prev => [row, ...prev])
                      }
                    } catch (e) {
                      console.warn('URL scrape failed', e)
                    } finally {
                      setIsScraping(false)
                      setKUrl('')
                    }
                  }} disabled={isScraping} className={`w-full px-4 py-2 rounded-lg text-white text-sm ${isScraping ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>{isScraping ? 'Scraping…' : 'Start Scraping'}</button>
                </div>

                {/* Existing Knowledge Entries (modal only) */}
                <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <div className='font-semibold text-slate-900'>Saved Knowledge</div>
                    <button onClick={async () => {
                      if (!showKnowledge) return
                      const userId = getUserId()
                      setKbLoading(true)
                      try {
                        const entries = await listKb(userId, showKnowledge as any)
                        setKbEntries(entries)
                      } catch (e) {
                        console.warn('refresh knowledge failed', e)
                      } finally {
                        setKbLoading(false)
                      }
                    }} className='text-xs text-slate-600 hover:text-slate-900'>Refresh</button>
                  </div>
                  {kbLoading ? (
                    <div className='text-sm text-slate-500'>Loading...</div>
                  ) : (
                    <ul className='grid gap-2'>
                      {kbEntries.length === 0 && (
                        <li className='text-sm text-slate-500'>No knowledge yet.</li>
                      )}
                      {kbEntries.map(e => (
                        <li key={e.id} className='border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3'>
                          <span className='text-sm text-slate-800 truncate'>
                            {e.type === 'url' && e.content ? (
                              <a href={e.content} target='_blank' rel='noreferrer' className='text-blue-600 hover:underline'>{e.title}</a>
                            ) : (
                              e.title
                            )}
                          </span>
                          <div className='flex items-center gap-3'>
                            <span className='text-xs text-slate-500'>{new Date(e.created_at).toLocaleDateString()}</span>
                            <button onClick={async () => {
                              if (e.type === 'file') {
                                const url = getPublicUrl(e.file_path)
                                if (url) window.open(url, '_blank')
                                return
                              }
                              const full = await getEntry(e.id)
                              setPreview({ id: e.id, title: e.title, content: full?.content, url: e.type === 'url' ? e.content : undefined })
                            }} className='text-xs text-slate-700 hover:text-slate-900'>View</button>
                            <button onClick={async () => {
                              try { await deleteKb(e) } catch {}
                              setKbEntries(prev => prev.filter(x => x.id !== e.id))
                            }} className='text-xs text-red-600 hover:text-red-700'>Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview modal */}
        {preview && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <div className='absolute inset-0 bg-black/40' onClick={() => setPreview(null)} />
            <div className='relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden'>
              <div className='flex items-center justify-between px-5 py-4 border-b border-slate-200'>
                <h3 className='text-base font-semibold text-slate-900'>{preview.title}</h3>
                <button onClick={() => setPreview(null)} className='p-1 rounded-md hover:bg-slate-100'><span className='material-symbols-outlined'>close</span></button>
              </div>
              <div className='p-5 max-h-[70vh] overflow-y-auto text-sm text-slate-800 whitespace-pre-wrap'>
                {preview.url ? (
                  <a href={preview.url} target='_blank' rel='noreferrer' className='text-blue-600 hover:underline'>{preview.url}</a>
                ) : (
                  preview.content || 'No content.'
                )}
              </div>
              <div className='border-t border-slate-200 p-4 flex items-center justify-end gap-2'>
                {!preview.url && preview.content && (
                  <button onClick={() => navigator.clipboard.writeText(preview.content || '')} className='px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm'>Copy</button>
                )}
                {preview.url && (
                  <button onClick={() => { if (preview.url) window.open(preview.url, '_blank') }} className='px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm'>Open</button>
                )}
                <button onClick={() => setPreview(null)} className='px-4 py-2 rounded-full bg-slate-900 text-white text-sm'>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Test responses modal */}
        {showTest && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <div className='absolute inset-0 bg-black/40' onClick={() => setShowTest(null)} />
            <div className='relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col'>
              <div className='flex items-center justify-between px-4 py-3 border-b border-slate-200 rounded-t-xl'>
                <h3 className='text-base font-semibold text-slate-900'>Test Responses</h3>
                <button onClick={() => setShowTest(null)} className='p-1 rounded-md hover:bg-slate-100'><span className='material-symbols-outlined'>close</span></button>
              </div>
              <div className='px-4 pt-3 pb-4 space-y-3'>
                <div className='text-xs text-slate-600'>Persona: {getPersonaPrompt(showTest)}</div>
                <div className='flex items-center gap-3'>
                  <input
                    value={testInputs[showTest]}
                    onChange={e => setTestInputs(prev => ({ ...prev, [showTest]: e.target.value }))}
                    className='flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm'
                    placeholder='Enter a question or statement to test...'
                  />
                  <button onClick={handleRunTest} className='px-3 py-2 rounded-lg bg-slate-900 text-white text-sm' disabled={testLoading}>
                    {testLoading ? 'Testing...' : 'Run Test'}
                  </button>
                </div>
                <div className='rounded-xl border border-slate-200 p-3 text-sm text-slate-700 bg-slate-50 whitespace-pre-wrap'>
                  {testResponse || 'Preview will appear here.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AIAgentHub


