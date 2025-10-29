import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Property } from '../types'
import { resolveUserId } from '../services/userId'
import { continueConversation } from '../services/openaiService'
import { getListingProfile, type SidekickProfile } from '../services/sidekickProfilesService'
import { searchListingKb } from '../services/listingKbService'
import { appendMessage, createConversation, getMessages, touchConversation } from '../services/chatService'

interface ListingSidekickWidgetProps {
  property: Property
}

const ListingSidekickWidget: React.FC<ListingSidekickWidgetProps> = ({ property }) => {
  const uid = useMemo(() => resolveUserId(), [])
  const [profile, setProfile] = useState<SidekickProfile | null>(null)
  const [input, setInput] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ sender: 'user'|'ai'; text: string }>>([])
  const scroller = useRef<HTMLDivElement | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try { setProfile(await getListingProfile(uid, property.id)) } catch {}
    })()
  }, [uid, property.id])

  useEffect(() => {
    if (!scroller.current) return
    scroller.current.scrollTop = scroller.current.scrollHeight
  }, [history])

  const persona = useMemo(() => {
    const base = 'You are the Listing Sidekick for this property. Be concise, accurate, and helpful.'
    const p = profile?.description ? (' ' + profile.description) : ''
    return base + p
  }, [profile])

  const run = async () => {
    const q = input.trim(); if (!q || loading) return
    setLoading(true)
    setHistory(prev => [...prev, { sender: 'user', text: q }])
    setInput('')
    try {
      // Ensure conversation exists (one per listing in localStorage)
      let convId = conversationId || localStorage.getItem(`conv:${property.id}`)
      if (!convId) {
        const conv = await createConversation({ scope: 'listing', listingId: property.id })
        convId = conv.id
        localStorage.setItem(`conv:${property.id}`, convId)
        setConversationId(convId)
      }
      await appendMessage({ conversationId: convId!, role: 'user', content: q })
      // 1) try listing KB first
      const hit = await searchListingKb(uid, property.id, q)
      if (hit?.answer) {
        setHistory(prev => [...prev, { sender: 'ai', text: hit.answer }])
        setReply(hit.answer)
        await appendMessage({ conversationId: convId!, role: 'ai', content: hit.answer })
        await touchConversation(convId!)
        setLoading(false)
        return
      }
      // 2) fallback to agent-wide listing KB
      const agentHit = await searchListingKb(uid, 'agent', q)
      if (agentHit?.answer) {
        setHistory(prev => [...prev, { sender: 'ai', text: agentHit.answer }])
        setReply(agentHit.answer)
        setLoading(false)
        return
      }
      // 3) final fallback to LLM with persona only
      const text = await continueConversation([
        { sender: 'system', text: persona },
        { sender: 'user', text: q }
      ])
      setHistory(prev => [...prev, { sender: 'ai', text }])
      setReply(text)
      await appendMessage({ conversationId: convId!, role: 'ai', content: text })
      await touchConversation(convId!)
    } catch {
      const fallback = 'I could not find that. Tap to contact the agent for details.'
      setHistory(prev => [...prev, { sender: 'ai', text: fallback }])
      setReply(fallback)
    } finally {
      setLoading(false)
    }
  }

  // Load existing conversation messages if present
  useEffect(() => {
    (async () => {
      const convId = conversationId || localStorage.getItem(`conv:${property.id}`)
      if (!convId) return
      setConversationId(convId)
      try {
        const msgs = await getMessages(convId)
        const mapped = msgs.map((m): { sender: 'user' | 'ai'; text: string } => ({
          sender: m.sender === 'ai' ? 'ai' : 'user',
          text: m.content
        }))
        if (mapped.length) setHistory(mapped)
      } catch {}
    })()
  }, [property.id])

  return (
    <div className='rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
      <div className='px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='material-symbols-outlined text-slate-700'>smart_toy</span>
          <div>
            <div className='text-sm font-semibold text-slate-900'>Listing Sidekick</div>
            <div className='text-xs text-slate-500'>Speaks with your configured voice and persona</div>
          </div>
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
  )
}

export default ListingSidekickWidget
