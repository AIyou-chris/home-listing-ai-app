import React, { useCallback, useEffect, useState } from 'react'
import { buildApiUrl } from '../../lib/api'
import { authHeaders } from '../../services/dashboard/utils'
import { showToast } from '../../utils/toastService'

// The listing agent's own notes for their listing chat. Backend: GET/PUT /api/dashboard/agent-brain.
// Notes add facts and tone. They never switch off the platform rules (no rates, no approvals, Fair Housing).

interface Faq { question: string; answer: string }
interface AgentBrain { about: string; style: string; areas: string; showings: string; neverSay: string; faq: Faq[] }

const EMPTY: AgentBrain = { about: '', style: '', areas: '', showings: '', neverSay: '', faq: [] }
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

const Box: React.FC<{ title: string; hint: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    <p className="mb-3 mt-0.5 text-sm text-slate-600">{hint}</p>
    {children}
  </section>
)

const AgentBrainPage: React.FC = () => {
  const [brain, setBrain] = useState<AgentBrain>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(buildApiUrl('/api/dashboard/agent-brain'), { headers: await authHeaders(null) })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setBrain({ ...EMPTY, ...data.brain })
      setDirty(false)
    } catch {
      setLoadError('Could not load your AI Brain.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const update = (patch: Partial<AgentBrain>) => { setBrain((b) => ({ ...b, ...patch })); setDirty(true) }
  const setFaq = (index: number, patch: Partial<Faq>) => update({ faq: brain.faq.map((f, i) => (i === index ? { ...f, ...patch } : f)) })

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(buildApiUrl('/api/dashboard/agent-brain'), { method: 'PUT', headers: await authHeaders(null), body: JSON.stringify(brain) })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setBrain({ ...EMPTY, ...data.brain })
      setDirty(false)
      showToast.success('AI Brain saved. Your listing chats use it now.')
    } catch {
      showToast.error('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-slate-600">Loading your AI Brain…</div>
  if (loadError) {
    return (
      <div className="p-8">
        <p role="alert" className="mb-3 text-red-700">{loadError}</p>
        <button type="button" onClick={() => void load()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Try again</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <header className="pr-10">
        <h1 className="text-2xl font-extrabold text-slate-900">Your AI Brain</h1>
        <p className="mt-1 text-sm text-slate-600">Tell your listing chat how you work. Buyers get answers in your voice. It never quotes rates, promises approvals or breaks Fair Housing rules, whatever you write here.</p>
      </header>

      <Box title="About you" hint="Two or three sentences a buyer would care about.">
        <textarea className={`${field} min-h-[90px]`} value={brain.about} onChange={(e) => update({ about: e.target.value })} aria-label="About you" placeholder="I have sold homes in Wenatchee for 12 years. I grew up here." />
      </Box>

      <Box title="How you like buyers handled" hint="Tone, and what you want the chat to push toward.">
        <textarea className={`${field} min-h-[80px]`} value={brain.style} onChange={(e) => update({ style: e.target.value })} aria-label="How you like buyers handled" placeholder="Friendly and short. Offer a showing. Never pressure." />
      </Box>

      <Box title="Where you work" hint="Towns and neighborhoods you cover.">
        <input className={field} value={brain.areas} onChange={(e) => update({ areas: e.target.value })} aria-label="Where you work" placeholder="Wenatchee, Cashmere, East Wenatchee" />
      </Box>

      <Box title="Showing rules" hint="Notice, days, how to book.">
        <textarea className={`${field} min-h-[70px]`} value={brain.showings} onChange={(e) => update({ showings: e.target.value })} aria-label="Showing rules" placeholder="24 hours notice. Text me to book. No showings Sundays." />
      </Box>

      <Box title="Answers you have approved" hint="Questions buyers ask a lot, with the exact answer you want given.">
        <div className="space-y-3">
          {brain.faq.map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3">
              <input className={`${field} mb-2`} value={f.question} onChange={(e) => setFaq(i, { question: e.target.value })} aria-label={`Question ${i + 1}`} placeholder="Is the seller flexible on closing dates?" />
              <textarea className={`${field} min-h-[60px]`} value={f.answer} onChange={(e) => setFaq(i, { answer: e.target.value })} aria-label={`Answer ${i + 1}`} placeholder="Yes, within reason. Ask me and I will confirm." />
              <button type="button" onClick={() => update({ faq: brain.faq.filter((_, j) => j !== i) })} className="mt-2 text-sm font-semibold text-red-700">Remove</button>
            </div>
          ))}
          {brain.faq.length < 20 && (
            <button type="button" onClick={() => update({ faq: [...brain.faq, { question: '', answer: '' }] })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Add an answer</button>
          )}
        </div>
      </Box>

      <Box title="Never say" hint="Anything you do not want the chat to say.">
        <textarea className={`${field} min-h-[60px]`} value={brain.neverSay} onChange={(e) => update({ neverSay: e.target.value })} aria-label="Never say" placeholder="Do not guess the sale price history. Do not mention the neighbors." />
      </Box>

      <div className="sticky bottom-3 flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <span className="text-sm text-slate-600">{dirty ? 'You have unsaved changes.' : 'All saved.'}</span>
        <button type="button" onClick={() => void save()} disabled={!dirty || saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}

export default AgentBrainPage
