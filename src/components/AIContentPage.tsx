import React, { useMemo, useState, useEffect } from 'react'
import { continueConversation } from '../services/openaiService'
import { appendMessage, createConversation, getMessages, touchConversation, listConversations, updateConversationTitle, exportConversationsCSV } from '../services/chatService'

type SourceScope = 'agent' | 'listing' | 'marketing'

// Preset prompts removed for Conversations-only view

const AIContentPage: React.FC = () => {
  const [tab, setTab] = useState<'chat' | 'history'>('chat')
  const [scope, setScope] = useState<SourceScope>('agent')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ role: 'user'|'ai'; text: string }>>([
    { role: 'ai', text: "Hello! I'm your AI real estate assistant. I can help with market analysis, property descriptions, client communications, and much more. What would you like to know?" }
  ])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationsList, setConversationsList] = useState<Array<{ id: string; title: string | null; created_at?: string }>>([])
  const [convSearch, setConvSearch] = useState('')
  // Quick chips removed for Conversations-only view
  // Blog/article writer form state (matches desired UI)
  const [blogTopic, setBlogTopic] = useState('')
  const [blogTone, setBlogTone] = useState('')
  const [blogLength, setBlogLength] = useState('')
  const [blogDetails, setBlogDetails] = useState('')
  const [useHeaderImage, setUseHeaderImage] = useState(true)
  const [useBodyImage, setUseBodyImage] = useState(true)
  const [blogSignature, setBlogSignature] = useState('')
  const [blogUrl, setBlogUrl] = useState('')
  const [blogDraft, setBlogDraft] = useState<{ title?: string; body?: string; imagePrompt?: string } | null>(null)
  const [blogLoading, setBlogLoading] = useState(false)
  // Prompt library removed
  const [convDrawer, setConvDrawer] = useState(false)

  const scopeSystem = useMemo(() => {
    switch (scope) {
      case 'listing':
        return 'You are the Listing Sidekick. Use listing knowledge when available. Be clear and accurate.'
      case 'marketing':
        return 'You are the Marketing Sidekick. Write on-brand, conversion-focused content.'
      case 'agent':
      default:
        return 'You are the Agent Sidekick. Help the agent with tasks, messaging, and strategy.'
    }
  }, [scope])

  const send = async (prompt?: string) => {
    const text = (prompt || message).trim()
    if (!text || loading) return
    setLoading(true)
    setMessage('')
    setHistory(prev => [...prev, { role: 'user', text }])
    try {
      // Ensure conversation exists
      let convId = conversationId
      const isNew = !convId
      if (isNew) {
        const conv = await createConversation({ scope })
        convId = conv.id
        setConversationId(convId)
      }
      await appendMessage({ conversationId: convId!, role: 'user', content: text })
      // Auto-title if new conversation
      if (isNew) {
        const title = text.split(/\s+/).slice(0, 6).join(' ')
        try { await updateConversationTitle(convId!, title) } catch {}
        try { const list = await listConversations({ scope }); setConversationsList(list as any) } catch {}
      }
      const out = await continueConversation([
        { sender: 'system', text: scopeSystem },
        { sender: 'user', text }
      ])
      setReply(out)
      setHistory(prev => [...prev, { role: 'ai', text: out }])
      await appendMessage({ conversationId: convId!, role: 'ai', content: out })
      await touchConversation(convId!)
    } finally {
      setLoading(false)
    }
  }

  // Load messages when we switch scope if there is an existing conversation id in session
  useEffect(() => {
    (async () => {
      if (!conversationId) return
      try {
        const msgs = await getMessages(conversationId)
        const mapped = msgs.map(m => ({ role: (m.role as any), text: m.content }))
        if (mapped.length) setHistory(mapped as any)
      } catch {}
    })()
  }, [conversationId])

  // Load conversation list on mount and when scope changes
  useEffect(() => {
    (async () => {
      try {
        const list = await listConversations({ scope })
        setConversationsList(list as any)
      } catch {}
    })()
  }, [scope])

  const handleSelectConversation = async (id: string) => {
    setConversationId(id)
    try {
      const msgs = await getMessages(id)
      const mapped = msgs.map(m => ({ role: (m.role as any), text: m.content }))
      setHistory(mapped as any)
      setTab('chat')
    } catch {}
  }

  const handleNewConversation = () => {
    setConversationId(null)
    setHistory([{ role: 'ai', text: "Hello! I'm your AI real estate assistant. I can help with market analysis, property descriptions, client communications, and much more. What would you like to know?" }])
    setReply('')
  }

  const generateBlog = async () => {
    setBlogLoading(true)
    setBlogDraft(null)
    try {
      const prompt = `Create a real estate blog article using the ${scope} knowledge.
Details:
- Topic: ${blogTopic}
- Tone: ${blogTone}
- Length: ${blogLength}
- Extra Details: ${blogDetails || 'None'}
- Include Header Image: ${useHeaderImage ? 'Yes' : 'No'}
- Include In-Body Image: ${useBodyImage ? 'Yes' : 'No'}
- Signature: ${blogSignature || 'None'}
- Additional URL: ${blogUrl || 'None'}

Requirements:
- First line must be an H1 title (no markdown symbols shown, just the text).
- Then write ${blogLength === 'Short' ? '3-5' : blogLength === 'Medium' ? '5-8' : '8-12'} concise paragraphs with subheadings.
- Maintain the selected tone.
- End with a clear call to action tailored for agents.
- At the end, add a single line starting with 'Image Prompt:' describing an ideal hero image that matches the topic and tone.
- If a signature is provided, append a final line: '— ${blogSignature}'.`
      const out = await continueConversation([
        { sender: 'system', text: scopeSystem },
        { sender: 'user', text: prompt }
      ])
      // Parse title (first line), body, and image prompt if present
      const lines = out.split(/\n+/)
      const title = (lines[0] || '').replace(/^#+\s*/, '').trim()
      const imageIdx = out.lastIndexOf('Image Prompt:')
      const imagePrompt = imageIdx >= 0 ? out.slice(imageIdx + 'Image Prompt:'.length).trim() : ''
      const body = imageIdx >= 0 ? out.slice(0, imageIdx).trim() : out.trim()
      setBlogDraft({ title, body, imagePrompt })
    } finally {
      setBlogLoading(false)
    }
  }

  const buildBlogText = (): string => {
    const title = blogDraft?.title || ''
    const body = blogDraft?.body || ''
    return `${title}\n\n${body}`.trim()
  }

  const handleDownload = () => {
    const text = buildBlogText()
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (blogDraft?.title || 'article').replace(/[^a-z0-9\-]+/gi, '-').toLowerCase() + '.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    const text = buildBlogText()
    await navigator.clipboard.writeText(text)
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(blogDraft?.title || 'Article Draft')
    const body = encodeURIComponent(buildBlogText())
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleCopyLink = async () => {
    const dataUrl = 'data:text/plain;charset=utf-8,' +
      encodeURIComponent(buildBlogText())
    await navigator.clipboard.writeText(dataUrl)
  }

  const handleWebShare = async () => {
    const text = buildBlogText()
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: blogDraft?.title || 'Article Draft',
          text
        })
      } catch {}
    } else {
      await handleCopy()
    }
  }

  return (
    <div className='bg-slate-50 min-h-full'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6'>
      {/* Header */}
      <div className='mb-5 flex items-center justify-between'>
        <div>
          <h1 className='text-[22px] font-semibold tracking-[-0.01em] text-slate-900'>AI Content Management</h1>
          <p className='text-slate-500 text-sm'>Leverage AI to enhance your real estate business.</p>
        </div>
        <div className='flex items-center gap-3'>
          <button 
            onClick={async () => {
              try {
                await exportConversationsCSV({ scope });
              } catch (error) {
                console.error('Export failed:', error);
              }
            }}
            className='inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          >
            <span className='material-symbols-outlined text-base'>download</span>
            Export CSV
          </button>
          <button onClick={() => setConvDrawer(true)} className='lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50'>
            <span className='material-symbols-outlined text-base'>forum</span>
            Conversations
          </button>
          {/* Prompt Library button removed */}
          <span className='text-xs text-slate-500'>Knowledge</span>
          <div className='inline-flex rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden'>
            {(['agent','listing','marketing'] as SourceScope[]).map(k => (
              <button key={k} onClick={() => setScope(k)} className={`px-3 py-1.5 text-xs font-medium ${scope===k?'bg-slate-900 text-white':'text-slate-700 hover:bg-slate-50'}`}>{k}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
        {[{label:'Conversations',value:'24',icon:'forum',color:'blue-600'},{label:'Blogs Created',value:'8',icon:'draft',color:'purple-600'},{label:'AI Responses',value:'156',icon:'bolt',color:'emerald-600'},{label:'Efficiency',value:'+45%',icon:'trending_up',color:'orange-600'}].map((k)=> (
          <div key={k.label} className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3'>
            <span className={`material-symbols-outlined text-${k.color}`}>{k.icon}</span>
            <div>
              <div className='text-xs text-slate-500'>{k.label}</div>
              <div className='text-lg font-semibold text-slate-900'>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className='mb-4 border-b border-slate-200'>
        <div className='flex items-center gap-1'>
          <button
            onClick={() => setTab('chat')}
            className={`px-3 py-2 text-sm font-medium inline-flex items-center gap-2 rounded-t-lg border-b-2 ${
              tab==='chat'
                ? 'text-blue-700 bg-blue-50 border-blue-600'
                : 'text-slate-500 hover:text-slate-700 border-transparent'
            }`}
          >
            <span className='material-symbols-outlined text-base'>chat</span>
            Conversations
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-3 py-2 text-sm font-medium inline-flex items-center gap-2 rounded-t-lg border-b-2 ${
              tab==='history'
                ? 'text-blue-700 bg-blue-50 border-blue-600'
                : 'text-slate-500 hover:text-slate-700 border-transparent'
            }`}
          >
            <span className='material-symbols-outlined text-base'>visibility</span>
            History
          </button>
        </div>
      </div>

      {tab === 'chat' && (
        <div className='flex gap-5'>
          {/* Sidebar */}
          <aside className='hidden lg:block w-72 flex-shrink-0'>
            <div className='rounded-2xl border border-slate-200 bg-white shadow-sm p-3'>
              <div className='flex items-center justify-between mb-2'>
                <div className='text-sm font-semibold text-slate-900'>Conversations</div>
                <button onClick={handleNewConversation} className='text-xs px-2 py-1 rounded-md bg-slate-900 text-white'>New</button>
              </div>
              <input value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder='Search…' className='w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs mb-2' />
              <div className='max-h-[460px] overflow-y-auto -mx-1 pr-1'>
                {conversationsList
                  .filter(c => (c.title || 'Untitled').toLowerCase().includes(convSearch.toLowerCase()))
                  .map(c => (
                    <button key={c.id} onClick={() => handleSelectConversation(c.id)} className={`w-full text-left px-2 py-2 rounded-md text-sm mb-1 ${conversationId===c.id?'bg-blue-50 text-blue-700':'hover:bg-slate-50'}`}>
                      <div className='truncate'>{c.title || 'Untitled'}</div>
                    </button>
                  ))}
              </div>
            </div>
          </aside>

          {/* Chat full width */}
          <div className='flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col h-[520px]'>
              <div className='px-4 py-3 border-b border-slate-200 flex items-center justify-between'>
                <div className='text-sm font-semibold text-slate-900'>Assistant</div>
              </div>
              <div className='flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50'>
                {history.length === 0 && <div className='text-sm text-slate-500'>Start a conversation with your AI assistant…</div>}
                {history.map((m,i) => (
                  <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${m.role==='user'?'bg-blue-600 text-white':'bg-white border border-slate-200 text-slate-800'}`}>{m.text}</div>
                  </div>
                ))}
                {loading && <div className='text-sm text-slate-500'>Thinking…</div>}
                {reply && !loading && (
                  <div className='flex justify-start'>
                    <div className='max-w-[80%] px-3 py-2 rounded-xl text-sm bg-white border border-slate-200 text-slate-800 whitespace-pre-wrap'>{reply}</div>
                  </div>
                )}
              </div>
              <div className='px-3 py-3 border-t border-slate-200 bg-white'>
                <div className='flex items-center gap-2'>
                  <input value={message} onChange={e => setMessage(e.target.value)} placeholder='Ask me anything about real estate…' className='flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm' />
                  <button onClick={() => send()} disabled={loading} className='px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1'>
                    <span className='material-symbols-outlined text-base'>send</span>
                    Send
                  </button>
                </div>
                {/* Quick prompt chips removed */}
              </div>
          </div>

          {/* Preset Prompts removed */}
        </div>
      )}

      {tab === 'history' && (
        <div className='text-sm text-slate-600'>Conversation history will appear here.</div>
      )}
      </div>

      {/* Prompt Drawer removed */}

      {/* Conversations Drawer (mobile) */}
      {convDrawer && (
        <div className='fixed inset-0 z-50 lg:hidden'>
          <div className='absolute inset-0 bg-black/30' onClick={() => setConvDrawer(false)} />
          <div className='absolute left-0 top-0 h-full w-full max-w-sm bg-white border-r border-slate-200 shadow-2xl flex flex-col'>
            <div className='px-4 py-3 border-b border-slate-200 flex items-center justify-between'>
              <div className='text-sm font-semibold text-slate-900'>Conversations</div>
              <button className='p-1 rounded-md hover:bg-slate-100' onClick={() => setConvDrawer(false)}><span className='material-symbols-outlined'>close</span></button>
            </div>
            <div className='p-3 border-b border-slate-200 flex items-center gap-2'>
              <input value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder='Search…' className='flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm' />
              <button onClick={handleNewConversation} className='text-xs px-2 py-1 rounded-md bg-slate-900 text-white'>New</button>
            </div>
            <div className='p-3 space-y-1 overflow-y-auto'>
              {conversationsList
                .filter(c => (c.title || 'Untitled').toLowerCase().includes(convSearch.toLowerCase()))
                .map(c => (
                  <button key={c.id} onClick={() => { handleSelectConversation(c.id); setConvDrawer(false) }} className={`w-full text-left px-2 py-2 rounded-md text-sm ${conversationId===c.id?'bg-blue-50 text-blue-700':'hover:bg-slate-50'}`}>
                    <div className='truncate'>{c.title || 'Untitled'}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIContentPage


