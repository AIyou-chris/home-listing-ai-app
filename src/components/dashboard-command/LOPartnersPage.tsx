import React, { useCallback, useEffect, useRef, useState } from 'react'
import PageGuide from './PageGuide';
import { useNavigate } from 'react-router-dom'
import { useDemoMode, buildDashboardPath } from '../../demo/useDemoMode'
import { buildApiUrl } from '../../lib/api'
import { authHeaders } from '../../services/dashboard/utils'
import { showToast } from '../../utils/toastService'
import LOROIWidget from '../dashboard-widgets/LOROIWidget'

// ─── Auth helpers ─────────────────────────────────────────────────────────────

const getApiHeaders = async (contentType = false): Promise<HeadersInit> => {
  const headers = await authHeaders(null) as Record<string, string>
  if (!contentType) delete headers['Content-Type']
  return headers
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartnerListing {
  listingId: string
  address: string
  price: number | null
  status: string
  heroPhoto: string | null
  totalLeads: number
  totalViews: number
}

type PartnerRating = 'hot' | 'warm' | 'cold' | null

interface Partner {
  partnershipId: string
  agentId: string
  name: string
  email: string | null
  phone: string | null
  website: string | null
  headshotUrl: string | null
  company: string | null
  totalLeads: number
  listings: PartnerListing[]
  joinedAt: string
  notes?: string
  rating?: PartnerRating
  lastFollowUp?: string | null
}

interface PendingInvite {
  id: string
  email: string
  name: string | null
  phone: string | null
  sentAt: string
  openedAt: string | null
  ctaClickedAt: string | null
  wowLink?: string
  smsText?: string
}

interface InviteUsage { used: number; limit: number | null }

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_PARTNERS: Partner[] = [
  {
    partnershipId: 'p1', agentId: 'a1',
    name: 'Chris Potter', email: 'chris@prestigeproperties.com', phone: '(512) 448-7731', website: 'https://prestigeproperties.com',
    headshotUrl: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?q=80&w=200&auto=format&fit=crop',
    company: 'Prestige Properties', totalLeads: 14,
    listings: [
      { listingId: 'l1', address: '4821 Ridgecrest Dr, Austin TX', price: 875000, status: 'published', heroPhoto: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=400&auto=format&fit=crop', totalLeads: 14, totalViews: 203 },
      { listingId: 'l2', address: '2203 Barton Hills Dr, Austin TX', price: 1150000, status: 'published', heroPhoto: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=400&auto=format&fit=crop', totalLeads: 7, totalViews: 118 }
    ],
    joinedAt: new Date(Date.now() - 14 * 24 * 3600000).toISOString()
  },
  {
    partnershipId: 'p2', agentId: 'a2',
    name: 'Sarah Mitchell', email: 'sarah@compass.com', phone: '(737) 214-8830', website: 'https://compass.com',
    headshotUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
    company: 'Compass Austin', totalLeads: 3,
    listings: [
      { listingId: 'l3', address: '908 W 12th St, Austin TX', price: 620000, status: 'published', heroPhoto: null, totalLeads: 3, totalViews: 47 }
    ],
    joinedAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString()
  }
]

const DEMO_PENDING: PendingInvite[] = [
  { id: 'i1', wowLink: 'https://homelistingai.com/partner-invite/demo', smsText: 'Hi Mike, it\'s Alex Rivera. A buyer could text your listing: "Can I get pre-approved before the open house?" I built it to answer that and send the lead to you.\n\nTry it yourself, 30 seconds:\nhttps://homelistingai.com/partner-invite/demo', email: 'mike@realty.com', name: 'Mike Johnson', phone: '(512) 555-0190', sentAt: new Date(Date.now() - 2 * 3600000).toISOString(), openedAt: new Date(Date.now() - 1 * 3600000).toISOString(), ctaClickedAt: null }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPrice = (p: number | null) => p ? `$${(p / 1000).toFixed(0)}k` : '—'

// localStorage-backed partner metadata (rating + follow-up + notes)
const STORAGE_KEY = 'lo_partner_meta'
type PartnerMeta = Record<string, { rating: PartnerRating; lastFollowUp: string | null; notes?: string }>

const loadMeta = (): PartnerMeta => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
const saveMeta = (meta: PartnerMeta) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
}

// Fire-and-forget backend sync for partner meta — localStorage stays the fast layer
const patchPartnerMeta = async (partnershipId: string, updates: { notes?: string; rating?: PartnerRating | null; last_follow_up?: string | null }) => {
  try {
    const headers = await getApiHeaders(true)
    await fetch(buildApiUrl(`/api/lo/partners/${partnershipId}`), {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    })
  } catch { /* silently fail — localStorage remains source of truth during session */ }
}

// Opens the Appointments page with the agent pre-filled in the Schedule Meeting form
const scheduleWithPartner = (partner: { name: string; email: string | null; phone: string | null }, demoMode: boolean) => {
  const q = new URLSearchParams({ name: partner.name, kind: 'Agent Check-in' })
  if (partner.email) q.set('email', partner.email)
  if (partner.phone) q.set('phone', partner.phone)
  const base = buildDashboardPath('/lo-appointments', demoMode)
  return `${base}${base.includes('?') ? '&' : '?'}${q.toString()}`
}

const toFollowUpLabel = (ts: string | null | undefined) => {
  if (!ts) return null
  const days = Math.round((Date.now() - new Date(ts).getTime()) / 86400000)
  if (days === 0) return 'Contacted today'
  if (days === 1) return 'Contacted yesterday'
  return `Last contacted ${days}d ago`
}

const RATINGS: { key: PartnerRating; label: string; emoji: string; color: string }[] = [
  { key: 'hot',  label: 'Hot',  emoji: '🔥', color: 'bg-red-50 border-red-200 text-red-600' },
  { key: 'warm', label: 'Warm', emoji: '👍', color: 'bg-amber-50 border-amber-200 text-amber-600' },
  { key: 'cold', label: 'Cold', emoji: '❄️', color: 'bg-slate-100 border-slate-200 text-slate-500' },
]

const toRelativeTime = (v: string) => {
  const mins = Math.round((Date.now() - new Date(v).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  if (src) return <img src={src} alt={name} className="rounded-full object-cover flex-shrink-0 border-2 border-white shadow" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full bg-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0" style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  )
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

interface LOListing {
  id: string
  address: string
  status: string
}

const InviteModal: React.FC<{ onClose: () => void; onSent: () => void; usage: InviteUsage | null }> = ({ onClose, onSent, usage }) => {
  const demoMode = useDemoMode()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [listingId, setListingId] = useState<string>('')
  const [listings, setListings] = useState<LOListing[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailFailed, setEmailFailed] = useState(false)
  const [wowLink, setWowLink] = useState('')
  const [smsText, setSmsText] = useState('')
  const [limitMessage, setLimitMessage] = useState('')

  useEffect(() => {
    if (demoMode) return
    getApiHeaders().then(headers => {
      fetch(buildApiUrl('/api/lo/listings'), { headers })
        .then(r => r.json())
        .then((d: { listings?: LOListing[] }) => setListings((d.listings || []).filter(l => l.status === 'published')))
        .catch(() => {})
    })
  }, [demoMode])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const handleSend = async () => {
    if (!email.trim() || sending) return
    setSending(true)
    setLimitMessage('')
    try {
      if (demoMode) {
        await new Promise(r => setTimeout(r, 800))
        const demoLink = `${window.location.origin}/partner-invite/demo`
        setWowLink(demoLink)
        setSmsText(`Hi ${name.trim().split(' ')[0] || 'there'}, it's Alex. A buyer could text your listing: "Can I get pre-approved before the open house?" I built it to answer that and send the lead to you.\n\nTry it yourself, 30 seconds:\n${demoLink}`)
        setSent(true)
        return
      }
      const headers = await getApiHeaders(true)
      const res = await fetch(buildApiUrl('/api/lo/partners/invite'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, phone: phone.trim() || undefined, listingId: listingId || undefined })
      })
      const json = await res.json() as { success?: boolean; wowLink?: string; smsText?: string; emailSent?: boolean; error?: string; message?: string }
      if (!res.ok) {
        if (json.error === 'invite_limit_reached') {
          setLimitMessage(json.message || 'You have used all your WOW Links for now. Upgrade your plan to send more.')
        } else if (json.error === 'valid_email_required') {
          showToast.error('That email does not look right. Check it and try again.')
        } else {
          showToast.error('Failed to send invite. Try again.')
        }
        return
      }
      setWowLink(json.wowLink || '')
      setSmsText(json.smsText || '')
      setEmailFailed(json.emailSent === false)
      setSent(true)
      onSent()
      if (json.emailSent !== false) showToast.success('WOW Link sent!')
    } catch {
      showToast.error('Failed to send invite. Try again.')
    } finally {
      setSending(false)
    }
  }

  const input = 'w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="invite-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {sent ? (
          <div className="py-2 text-center">
            <div className="mb-3 text-5xl" aria-hidden="true">{emailFailed ? '⚠️' : '🚀'}</div>
            <h3 id="invite-title" className="mb-1 text-lg font-bold text-slate-900">{emailFailed ? 'Link ready, email did not send' : 'WOW Link sent!'}</h3>
            <p className="mb-4 text-sm text-slate-600">
              {emailFailed
                ? 'Your link is saved. Copy the text below and send it from your own phone.'
                : 'They get a live listing demo in their inbox, with your financing chat already working. Texting it too gets opened faster.'}
            </p>
            {smsText && (
              <button
                onClick={() => { void navigator.clipboard.writeText(smsText); showToast.success('Text copied! Paste it in Messages.') }}
                className="mb-2 min-h-[44px] w-full rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700"
              >
                💬 Copy the text to send
              </button>
            )}
            {wowLink && (
              <button
                onClick={() => { void navigator.clipboard.writeText(wowLink); showToast.success('Link copied!') }}
                className="mb-2 min-h-[44px] w-full rounded-xl border border-slate-300 text-sm font-semibold text-primary-700 hover:bg-primary-50"
              >
                📋 Copy WOW Link
              </button>
            )}
            <button onClick={onClose} className="min-h-[44px] w-full rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Done</button>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h3 id="invite-title" className="text-lg font-bold text-slate-900">Send a WOW Link</h3>
              <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-500 hover:bg-slate-100">×</button>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              The agent gets a live listing demo with your financing chatbot already running, before they even sign up.
            </p>
            {usage && usage.limit != null && (
              <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                {usage.used} of {usage.limit} WOW Links used this month
              </p>
            )}
            <div className="mb-5 space-y-3">
              <input className={input} placeholder="Agent name (optional)" aria-label="Agent name" value={name} onChange={e => setName(e.target.value)} />
              <input className={input} placeholder="Agent email address" aria-label="Agent email" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
              <input className={input} placeholder="Agent phone (optional)" aria-label="Agent phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
              <div>
                <label htmlFor="invite-listing" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Show them this listing</label>
                <select id="invite-listing" value={listingId} onChange={e => setListingId(e.target.value)} className={`${input} bg-white`}>
                  <option value="">Use the demo listing (default)</option>
                  {listings.map(l => (<option key={l.id} value={l.id}>{l.address}</option>))}
                </select>
                <p className="mt-1.5 text-xs text-slate-600">
                  {listings.length === 0 ? 'No live listings yet, so we show a polished demo home.' : 'Pick one of your live listings, or use the demo.'}
                </p>
              </div>
            </div>
            {limitMessage && (
              <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" role="alert">{limitMessage}</p>
            )}
            <button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="min-h-[48px] w-full rounded-xl bg-primary-600 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-50"
            >
              {sending ? 'Sending…' : '🚀 Send WOW Link'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Partner Card ─────────────────────────────────────────────────────────────

const PartnerCard: React.FC<{ partner: Partner; onViewListings: (p: Partner) => void; onRemoved: () => void }> = ({ partner, onViewListings, onRemoved }) => {
  const navigate = useNavigate()
  const demoMode = useDemoMode()
  const [meta, setMeta] = React.useState(() => {
    const all = loadMeta()
    return all[partner.partnershipId] || { rating: null as PartnerRating, lastFollowUp: null, notes: '' }
  })
  const [expanded, setExpanded] = React.useState(false)
  const [notesDraft, setNotesDraft] = React.useState(meta.notes || '')
  const [notesSaved, setNotesSaved] = React.useState(false)
  const [removeConfirm, setRemoveConfirm] = React.useState(false)
  const [recapSending, setRecapSending] = React.useState(false)
  const [recapLoading, setRecapLoading] = React.useState(false)
  const [recapPreview, setRecapPreview] = React.useState<{ to: string; subject: string; html: string } | null>(null)
  const firstName = partner.name.split(' ')[0]

  // Step 1: show the LO exactly what will be emailed. Nothing is sent yet.
  const openRecapPreview = async () => {
    if (recapLoading) return
    setRecapLoading(true)
    try {
      if (demoMode) {
        setRecapPreview({
          to: partner.email || 'agent@example.com',
          subject: `Your recap with ${firstName}`,
          html: `<div style="font-family:Arial,sans-serif;padding:20px"><h2>What we pulled off together this month 🤝</h2><p>Hey ${firstName}, this is a sample recap.</p></div>`
        })
        return
      }
      const headers = await getApiHeaders(true)
      const res = await fetch(buildApiUrl(`/api/lo/partners/${partner.partnershipId}/recap`), {
        method: 'POST', headers, body: JSON.stringify({ preview: true })
      })
      const json = await res.json() as { success?: boolean; error?: string; preview?: { to: string; subject: string; html: string } }
      if (!res.ok || !json.success || !json.preview) {
        showToast.error(json.error === 'agent_has_no_email' ? 'No email on file for this partner' : 'Could not build the recap')
        return
      }
      setRecapPreview(json.preview)
    } catch {
      showToast.error('Could not build the recap')
    } finally {
      setRecapLoading(false)
    }
  }

  // Step 2: the LO taps Send.
  const sendRecap = async () => {
    if (recapSending) return
    setRecapSending(true)
    try {
      if (demoMode) {
        await new Promise(r => setTimeout(r, 800))
        showToast.success(`Recap sent to ${firstName}! 🤝`)
        setRecapPreview(null)
        return
      }
      const headers = await getApiHeaders(true)
      const res = await fetch(buildApiUrl(`/api/lo/partners/${partner.partnershipId}/recap`), { method: 'POST', headers, body: JSON.stringify({}) })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        showToast.error(json.error === 'agent_has_no_email' ? 'No email on file for this partner' : 'Could not send recap')
        return
      }
      showToast.success(`Recap sent to ${firstName}! 🤝`)
      setRecapPreview(null)
    } catch {
      showToast.error('Could not send recap')
    } finally {
      setRecapSending(false)
    }
  }

  const setRating = (rating: PartnerRating | null) => {
    const all = loadMeta()
    const next = { ...all[partner.partnershipId] || { lastFollowUp: null, notes: '' }, rating }
    all[partner.partnershipId] = next
    saveMeta(all)
    setMeta(next)
    void patchPartnerMeta(partner.partnershipId, { rating })
  }

  const logFollowUp = () => {
    const ts = new Date().toISOString()
    const all = loadMeta()
    const next = { ...all[partner.partnershipId] || { rating: null, notes: '' }, lastFollowUp: ts }
    all[partner.partnershipId] = next
    saveMeta(all)
    setMeta(next)
    showToast.success(`Logged follow-up with ${partner.name.split(' ')[0]}`)
    void patchPartnerMeta(partner.partnershipId, { last_follow_up: ts })
  }

  const saveNotes = () => {
    const all = loadMeta()
    const next = { ...all[partner.partnershipId] || { rating: null, lastFollowUp: null }, notes: notesDraft }
    all[partner.partnershipId] = next
    saveMeta(all)
    setMeta(next)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
    void patchPartnerMeta(partner.partnershipId, { notes: notesDraft })
  }

  const followUpLabel = toFollowUpLabel(meta.lastFollowUp)
  // Partnerships go cold fast: flag anyone not contacted in 14 days (counts from the day they joined if never contacted).
  const lastTouch = meta.lastFollowUp || partner.joinedAt
  const daysSinceTouch = lastTouch ? Math.floor((Date.now() - new Date(lastTouch).getTime()) / 86400000) : 0
  const needsCall = daysSinceTouch >= 14
  const activeRating = RATINGS.find(r => r.key === meta.rating)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 border-b border-slate-100">
        <Avatar src={partner.headshotUrl} name={partner.name} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 text-base">{partner.name}</p>
            {activeRating && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeRating.color}`}>
                {activeRating.emoji} {activeRating.label}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs truncate">{partner.company || partner.email || '—'}</p>
          {followUpLabel && (
            <p className="text-[11px] text-slate-400 mt-0.5">{followUpLabel}</p>
          )}
          {needsCall && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              📞 Call this week · {daysSinceTouch}d since you talked
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900">{partner.totalLeads}</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">leads</p>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className={`w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${expanded ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-200 text-slate-400 hover:border-primary-300 hover:text-primary-600'}`}
            title={expanded ? 'Collapse' : 'Show details'}
            aria-label={expanded ? 'Hide partner details' : 'Show partner details'}
            aria-expanded={expanded}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Expandable contact + notes panel */}
      {expanded && (
        <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-4 space-y-4">
          {/* Contact info */}
          <div className="grid grid-cols-1 gap-2">
            {partner.phone && (
              <div className="flex items-center gap-3">
                <span className="text-base">📞</span>
                <div className="flex items-center gap-2 flex-1">
                  <a href={`tel:${partner.phone}`} className="text-sm font-semibold text-slate-800 hover:text-primary-600 transition-colors">{partner.phone}</a>
                  <span className="text-slate-300">·</span>
                  <a href={`sms:${partner.phone}`} className="text-xs text-slate-500 hover:text-primary-600 transition-colors">Text</a>
                </div>
              </div>
            )}
            {partner.email && (
              <div className="flex items-center gap-3">
                <span className="text-base">✉️</span>
                <a href={`mailto:${partner.email}`} className="text-sm font-semibold text-slate-800 hover:text-primary-600 transition-colors truncate">{partner.email}</a>
              </div>
            )}
            {partner.website && (
              <div className="flex items-center gap-3">
                <span className="text-base">🌐</span>
                <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors truncate">{partner.website.replace(/^https?:\/\//, '')}</a>
              </div>
            )}
            {!partner.phone && !partner.email && !partner.website && (
              <p className="text-xs text-slate-400 italic">No contact details on file</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Notes</p>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none bg-white"
              rows={2}
              placeholder={`Notes about ${partner.name.split(' ')[0]}…`}
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
            />
            <div className="flex justify-end mt-1.5">
              <button
                onClick={saveNotes}
                disabled={notesDraft === (meta.notes || '')}
                className="text-xs font-semibold px-3 py-1 rounded-lg bg-primary-600 text-white disabled:opacity-40 hover:bg-primary-700 transition-all"
              >
                {notesSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>

          {/* Schedule appointment */}
          <button
            type="button"
            onClick={() => navigate(scheduleWithPartner(partner, demoMode))}
            className="flex items-center justify-center gap-2 w-full border border-primary-200 rounded-xl py-2.5 text-sm font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-all"
          >
            📅 Schedule Appointment
          </button>
        </div>
      )}

      {/* Rating row */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">Rate</p>
        {RATINGS.map(r => (
          <button
            key={r.key}
            onClick={() => setRating(meta.rating === r.key ? null : r.key as PartnerRating)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all ${
              meta.rating === r.key ? r.color : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
            }`}
          >
            {r.emoji} {r.label}
          </button>
        ))}
      </div>

      {/* Listings strip */}
      <div className="divide-y divide-slate-50">
        {partner.listings.slice(0, 3).map(listing => (
          <div key={listing.listingId} className="flex items-center gap-3 px-5 py-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
              {listing.heroPhoto
                ? <img src={listing.heroPhoto} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-slate-300">🏠</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{listing.address}</p>
              <p className="text-[11px] text-slate-400">{formatPrice(listing.price)}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-slate-500">{listing.totalLeads} leads</span>
              {listing.status === 'published'
                ? <span className="text-[10px] font-bold text-emerald-600">● Live</span>
                : <span className="text-[10px] text-slate-400">Draft</span>
              }
            </div>
          </div>
        ))}
        {partner.listings.length === 0 && (
          <div className="px-5 py-3 text-xs text-slate-400">No listings yet</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-4 bg-slate-50 border-t border-slate-100">
        <button
          onClick={() => onViewListings(partner)}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg py-2.5 transition-all"
        >
          View Partner →
        </button>
        <button
          onClick={logFollowUp}
          className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-xs font-semibold transition-all"
          title="Log follow-up"
          aria-label="Log that you talked to this partner"
        >
          📞 Talked
        </button>
        <button
          onClick={openRecapPreview}
          disabled={recapLoading}
          className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-xs font-semibold transition-all disabled:opacity-50"
          title="Email this partner a 'what we did together this month' recap"
        >
          {recapLoading ? '…' : '📊 Recap'}
        </button>
        {partner.email && (
          <a
            href={`mailto:${partner.email}`}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold transition-all"
            aria-label="Email this partner"
          >
            ✉️
          </a>
        )}
        {removeConfirm ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={async () => {
                setRemoveConfirm(false)
                try {
                  const headers = await getApiHeaders()
                  const res = await fetch(buildApiUrl(`/api/lo/partners/${partner.partnershipId}`), {
                    method: 'DELETE', headers
                  })
                  if (!res.ok) throw new Error()
                  showToast.success(`${partner.name} removed`)
                  onRemoved()
                } catch { showToast.error('Failed to remove partner') }
              }}
              className="px-2.5 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all"
            >
              Remove
            </button>
            <button
              onClick={() => setRemoveConfirm(false)}
              className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setRemoveConfirm(true)}
            className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-xs font-semibold transition-all"
            title="Remove partner"
            aria-label="Remove partner"
          >
            ✕
          </button>
        )}
      </div>

      {recapPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Recap preview">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Preview. Nothing is sent yet.</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">To: {recapPreview.to}</p>
              <p className="text-sm text-slate-600">{recapPreview.subject}</p>
            </div>
            <iframe title="Recap email preview" srcDoc={recapPreview.html} sandbox="" className="h-80 w-full flex-1 border-0 bg-white" />
            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setRecapPreview(null)}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendRecap}
                disabled={recapSending}
                className="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {recapSending ? 'Sending…' : `Send to ${firstName}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Partner Detail Drawer ────────────────────────────────────────────────────

const PartnerDetail: React.FC<{ partner: Partner; onClose: () => void }> = ({ partner, onClose }) => {
  const navigate = useNavigate()
  const demoMode = useDemoMode()
  const [notesDraft, setNotesDraft] = React.useState(() => {
    const all = loadMeta()
    return all[partner.partnershipId]?.notes || ''
  })
  const [notesSaved, setNotesSaved] = React.useState(false)

  const saveNotes = () => {
    const all = loadMeta()
    const next = { ...all[partner.partnershipId] || { rating: null, lastFollowUp: null }, notes: notesDraft }
    all[partner.partnershipId] = next
    saveMeta(all)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
    void patchPartnerMeta(partner.partnershipId, { notes: notesDraft })
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  return (
  <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label={`${partner.name} details`}>
    <div className="flex-1 bg-black/30" onClick={onClose} />
    <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 pl-6 pr-16 py-4 flex items-center gap-4 z-10">
        <button onClick={onClose} aria-label="Back to partners" className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800">←</button>
        <Avatar src={partner.headshotUrl} name={partner.name} size={36} />
        <div className="flex-1">
          <p className="font-bold text-slate-900">{partner.name}</p>
          <p className="text-xs text-slate-400">{partner.company || '—'}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-black text-slate-900">{partner.totalLeads}</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Total Leads</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{partner.listings.reduce((s, l) => s + l.totalViews, 0)}</p>
            <p className="text-[10px] text-emerald-500 font-semibold uppercase mt-0.5">Views</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-black text-slate-900">{partner.listings.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Listings</p>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Contact</p>
          {partner.phone && (
            <div className="flex items-center gap-2">
              <span>📞</span>
              <a href={`tel:${partner.phone}`} className="text-sm font-semibold text-slate-800 hover:text-primary-600">{partner.phone}</a>
              <span className="text-slate-300">·</span>
              <a href={`sms:${partner.phone}`} className="text-xs text-slate-500 hover:text-primary-600">Text</a>
            </div>
          )}
          {partner.email && (
            <div className="flex items-center gap-2">
              <span>✉️</span>
              <a href={`mailto:${partner.email}`} className="text-sm font-semibold text-slate-800 hover:text-primary-600">{partner.email}</a>
            </div>
          )}
          {partner.website && (
            <div className="flex items-center gap-2">
              <span>🌐</span>
              <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary-600 hover:text-primary-700">{partner.website.replace(/^https?:\/\//, '')}</a>
            </div>
          )}
          <p className="text-xs text-slate-400 pt-1">Partner since {new Date(partner.joinedAt).toLocaleDateString()}</p>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Notes</p>
          <textarea
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            rows={3}
            placeholder={`Notes about ${partner.name.split(' ')[0]}…`}
            value={notesDraft}
            onChange={e => setNotesDraft(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={saveNotes}
              disabled={notesDraft === (loadMeta()[partner.partnershipId]?.notes || '')}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-primary-600 text-white disabled:opacity-40 hover:bg-primary-700 transition-all"
            >
              {notesSaved ? '✓ Saved' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Schedule appointment */}
        <button
          type="button"
          onClick={() => navigate(scheduleWithPartner(partner, demoMode))}
          className="flex items-center justify-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl py-3 text-sm transition-all"
        >
          📅 Schedule Appointment
        </button>

        {/* Listings */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Listings</p>
          <div className="space-y-3">
            {partner.listings.map(listing => (
              <div key={listing.listingId} className="rounded-xl border border-slate-200 overflow-hidden">
                {listing.heroPhoto && (
                  <img src={listing.heroPhoto} alt="" className="w-full h-28 object-cover" />
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{listing.address}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-500">{formatPrice(listing.price)}</span>
                      {listing.status === 'published'
                        ? <span className="text-xs font-bold text-emerald-600">● Live</span>
                        : <span className="text-xs text-slate-400">Draft</span>
                      }
                    </div>
                  </div>
                  <LOROIWidget listingId={listing.listingId} />
                </div>
              </div>
            ))}
            {partner.listings.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No listings yet — add one from the LO Listings page.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LOPartnersPage: React.FC = () => {
  const demoMode = useDemoMode()
  const [partners, setPartners] = useState<Partner[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [inviteUsage, setInviteUsage] = useState<InviteUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    if (demoMode) {
      setPartners(DEMO_PARTNERS)
      setPendingInvites(DEMO_PENDING)
      setInviteUsage({ used: 3, limit: 10 })
      setLoading(false)
      return
    }
    try {
      const headers = await getApiHeaders()
      const res = await fetch(buildApiUrl('/api/lo/partners'), { headers })
      if (!res.ok) throw new Error('partners_load_failed')
      const json = await res.json() as { success: boolean; partners: Partner[]; pendingInvites: PendingInvite[]; inviteUsage?: InviteUsage | null }
      if (!mountedRef.current) return
      // Seed localStorage from server — server is authoritative after migration
      const meta = loadMeta()
      ;(json.partners || []).forEach((p: Partner) => {
        meta[p.partnershipId] = {
          rating: p.rating || null,
          lastFollowUp: p.lastFollowUp || null,
          notes: p.notes || ''
        }
      })
      saveMeta(meta)
      setLoadFailed(false)
      setPartners(json.partners || [])
      setPendingInvites(json.pendingInvites || [])
      setInviteUsage(json.inviteUsage || null)
    } catch {
      setLoadFailed(true)
      showToast.error('Could not load your partners. Try again.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [demoMode])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [load])

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Partner Agents</h1>
        <p className="text-slate-500 text-sm mt-1">
          {partners.length} active partner{partners.length !== 1 ? 's' : ''}
          {pendingInvites.length > 0 && ` · ${pendingInvites.length} invite pending`}
        </p>
      </div>

      <PageGuide pageKey="lo-partners" />

      {/* Empty state */}
      {loadFailed && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          We couldn't load your partners just now.{' '}
          <button onClick={() => { setLoading(true); void load() }} className="font-bold underline">Try again</button>
        </div>
      )}

      {!loadFailed && partners.length === 0 && pendingInvites.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="text-5xl mb-4">🤝</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No partners yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
            Add a real estate agent as a partner. We'll send them a magic link — their co-branded listing page will be live before they even log in.
          </p>
          <button
            onClick={() => setShowInvite(true)}
            className="bg-primary-600 text-white font-bold rounded-xl px-8 py-3 text-sm hover:bg-primary-700 transition-all"
          >
            + Add Your First Partner
          </button>
        </div>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">Pending Invites</p>
          <div className="space-y-4">
            {pendingInvites.map(invite => {
              const firstName = invite.name?.split(' ')[0] || 'there'
              const copy = (text: string, done: string) => {
                void navigator.clipboard.writeText(text).then(() => showToast.success(done)).catch(() => showToast.error('Could not copy. Try again.'))
              }
              const btn = 'inline-flex min-h-[40px] items-center justify-center rounded-lg border bg-white px-3.5 text-xs font-bold transition-all'
              return (
                <div key={invite.id} className="rounded-xl border border-amber-200 bg-white p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{invite.name || invite.email}</p>
                      <p className="truncate text-xs text-slate-600">{invite.email} · sent {toRelativeTime(invite.sentAt)}</p>
                    </div>
                    {invite.ctaClickedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">🔥 Clicked through · {toRelativeTime(invite.ctaClickedAt)}</span>
                    ) : invite.openedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">👀 Opened · {toRelativeTime(invite.openedAt)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Not opened yet</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {invite.smsText && (
                      <button onClick={() => copy(invite.smsText as string, 'Text copied. Paste it in Messages.')} className={`${btn} border-primary-600 bg-primary-600 text-white hover:bg-primary-700`}>
                        💬 Copy text
                      </button>
                    )}
                    {invite.wowLink && (
                      <button onClick={() => copy(invite.wowLink as string, 'Link copied!')} className={`${btn} border-slate-300 text-slate-800 hover:bg-slate-50`}>
                        🔗 Copy link
                      </button>
                    )}
                    {invite.phone && (
                      <>
                        <a href={`sms:${invite.phone}?body=${encodeURIComponent(`Hi ${firstName} — just sent you a live listing demo with instant financing answers built in. Did it come through?`)}`} className={`${btn} border-green-400 text-green-800 hover:bg-green-50`}>
                          Text
                        </a>
                        <a href={`tel:${invite.phone}`} className={`${btn} border-slate-300 text-slate-800 hover:bg-slate-50`}>Call</a>
                      </>
                    )}
                    {/* Nudge: only after 24h and still unopened */}
                    {!invite.openedAt && (Date.now() - new Date(invite.sentAt).getTime()) > 24 * 3600 * 1000 && (
                      <button
                        onClick={async () => {
                          try {
                            const headers = await getApiHeaders()
                            const res = await fetch(buildApiUrl(`/api/lo/partners/invite/${invite.id}/nudge`), { method: 'POST', headers })
                            const json = await res.json() as { error?: string; message?: string }
                            if (!res.ok) throw new Error(json.message || 'nudge_failed')
                            showToast.success('Reminder sent! 👋')
                          } catch (e: unknown) {
                            showToast.error(e instanceof Error ? e.message : 'Failed to send reminder')
                          }
                        }}
                        className={`${btn} border-blue-400 text-blue-800 hover:bg-blue-50`}
                      >
                        Nudge 👋
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          const headers = await getApiHeaders()
                          const res = await fetch(buildApiUrl(`/api/lo/partners/invite/${invite.id}/resend`), { method: 'POST', headers })
                          const json = await res.json().catch(() => ({})) as { message?: string }
                          if (!res.ok) throw new Error(json.message || 'resend_failed')
                          showToast.success('Invite resent!')
                        } catch (e: unknown) { showToast.error(e instanceof Error && e.message !== 'resend_failed' ? e.message : 'Failed to resend') }
                      }}
                      className={`${btn} border-amber-400 text-amber-900 hover:bg-amber-50`}
                    >
                      Resend email
                    </button>
                    {revokeConfirmId === invite.id ? (
                      <>
                        <button
                          onClick={async () => {
                            setRevokeConfirmId(null)
                            try {
                              const headers = await getApiHeaders()
                              const res = await fetch(buildApiUrl(`/api/lo/partners/invite/${invite.id}`), { method: 'DELETE', headers })
                              if (!res.ok) throw new Error()
                              showToast.success('Invite revoked')
                              void load()
                            } catch { showToast.error('Failed to revoke') }
                          }}
                          className={`${btn} border-red-700 bg-red-700 text-white hover:bg-red-800`}
                        >
                          Confirm revoke
                        </button>
                        <button onClick={() => setRevokeConfirmId(null)} className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}>Keep</button>
                      </>
                    ) : (
                      <button onClick={() => setRevokeConfirmId(invite.id)} className={`${btn} border-slate-300 text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700`}>
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add partner button — only when there's content (empty state has its own CTA) */}
      {(partners.length > 0 || pendingInvites.length > 0) && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {inviteUsage && inviteUsage.limit != null && (
            <p className="text-xs font-semibold text-slate-600">{inviteUsage.used} of {inviteUsage.limit} WOW Links used this month</p>
          )}
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-all shadow-sm"
          >
            + Add Partner
          </button>
        </div>
      )}

      {/* Partner grid */}
      {partners.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...partners]
            .sort((a, b) => (b.totalLeads - a.totalLeads) || (new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime()))
            .map(partner => (
            <PartnerCard
              key={partner.partnershipId}
              partner={partner}
              onViewListings={p => setSelectedPartner(p)}
              onRemoved={load}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showInvite && (
        <InviteModal
          usage={inviteUsage}
          onClose={() => setShowInvite(false)}
          onSent={() => { void load() }}
        />
      )}
      {selectedPartner && (
        <PartnerDetail
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
        />
      )}
    </div>
  )
}

export default LOPartnersPage
