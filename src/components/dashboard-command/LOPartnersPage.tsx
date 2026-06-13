import React, { useCallback, useEffect, useRef, useState } from 'react'
import PageGuide from './PageGuide';
import { useNavigate } from 'react-router-dom'
import { useDemoMode, buildDashboardPath } from '../../demo/useDemoMode'
import { buildApiUrl } from '../../lib/api'
import { supabase } from '../../services/supabase'
import { showToast } from '../../utils/toastService'
import LOROIWidget from '../dashboard-widgets/LOROIWidget'

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
  sentAt: string
  openedAt: string | null
  ctaClickedAt: string | null
}

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
  { id: 'i1', email: 'mike@realty.com', name: 'Mike Johnson', sentAt: new Date(Date.now() - 2 * 3600000).toISOString(), openedAt: new Date(Date.now() - 1 * 3600000).toISOString(), ctaClickedAt: null }
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
    const { data: { user } } = await supabase.auth.getUser()
    await fetch(buildApiUrl(`/api/lo/partners/${partnershipId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
      body: JSON.stringify(updates)
    })
  } catch { /* silently fail — localStorage remains source of truth during session */ }
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

const InviteModal: React.FC<{ onClose: () => void; onSent: (wowLink: string) => void }> = ({ onClose, onSent }) => {
  const demoMode = useDemoMode()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [listingId, setListingId] = useState<string>('')
  const [listings, setListings] = useState<LOListing[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [wowLink, setWowLink] = useState('')

  useEffect(() => {
    if (demoMode) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      fetch(buildApiUrl('/api/lo/listings'), { headers: { 'x-user-id': user.id } })
        .then(r => r.json())
        .then((d: { listings?: LOListing[] }) => setListings((d.listings || []).filter(l => l.status === 'published')))
        .catch(() => {})
    })
  }, [demoMode])

  const handleSend = async () => {
    if (!email.trim()) return
    setSending(true)
    try {
      if (demoMode) {
        await new Promise(r => setTimeout(r, 800))
        const demoLink = `${window.location.origin}/partner-invite/demo-token`
        setWowLink(demoLink)
        setSent(true)
        setTimeout(() => { onSent(demoLink); onClose() }, 3000)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(buildApiUrl('/api/lo/partners/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, listingId: listingId || undefined })
      })
      const json = await res.json() as { success?: boolean; wowLink?: string; error?: string; message?: string }
      if (!res.ok) {
        if (json.error === 'invite_limit_reached') {
          showToast.error(json.message || 'Upgrade your plan to send WOW Links.')
        } else {
          showToast.error('Failed to send invite. Try again.')
        }
        return
      }
      const link = json.wowLink || ''
      setWowLink(link)
      setSent(true)
      showToast.success('WOW Link sent!')
      setTimeout(() => { onSent(link); onClose() }, 3000)
    } catch {
      showToast.error('Failed to send invite. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        {sent ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🚀</div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">WOW Link sent!</h3>
            <p className="text-slate-500 text-sm mb-4">They'll get a live listing demo in their inbox — chatbot already working.</p>
            {wowLink && (
              <button
                onClick={() => { navigator.clipboard.writeText(wowLink); showToast.success('Link copied!') }}
                className="w-full border border-slate-200 rounded-xl py-2.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition-all"
              >
                📋 Copy WOW Link
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">Send a WOW Link</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              The agent gets a live listing demo with your financing chatbot already running — before they even sign up.
            </p>
            <div className="space-y-3 mb-5">
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Agent name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Agent email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              {/* Listing picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Show them this listing</label>
                <select
                  value={listingId}
                  onChange={e => setListingId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">📸 Use demo listing (default)</option>
                  {listings.map(l => (
                    <option key={l.id} value={l.id}>🏠 {l.address}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  {listings.length === 0
                    ? 'No published listings yet — we\'ll show a beautiful demo.'
                    : 'Pick a live listing or use the default demo.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all"
            >
              {sending ? 'Sending…' : '🚀 Send WOW Link →'}
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
            onClick={() => navigate(buildDashboardPath('/appointments', demoMode))}
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
        >
          📞
        </button>
        {partner.email && (
          <a
            href={`mailto:${partner.email}`}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white text-xs font-semibold transition-all"
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
                  const { data: { user } } = await supabase.auth.getUser()
                  const res = await fetch(buildApiUrl(`/api/lo/partners/${partner.partnershipId}`), {
                    method: 'DELETE', headers: { 'x-user-id': user?.id || '' }
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
          >
            ✕
          </button>
        )}
      </div>
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

  return (
  <div className="fixed inset-0 z-40 flex">
    <div className="flex-1 bg-black/30" onClick={onClose} />
    <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 z-10">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">←</button>
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
          onClick={() => navigate(buildDashboardPath('/appointments', demoMode))}
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
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    if (demoMode) {
      setPartners(DEMO_PARTNERS)
      setPendingInvites(DEMO_PENDING)
      setLoading(false)
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(buildApiUrl('/api/lo/partners'), {
        headers: { 'x-user-id': user?.id || '' }
      })
      const json = await res.json() as { success: boolean; partners: Partner[]; pendingInvites: PendingInvite[] }
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
      setPartners(json.partners || [])
      setPendingInvites(json.pendingInvites || [])
    } catch {
      showToast.error('Failed to load partners')
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
    <div className="space-y-6 pb-12">
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
      {partners.length === 0 && pendingInvites.length === 0 && (
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
          <div className="space-y-3">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{invite.name || invite.email}</p>
                  <p className="text-xs text-slate-500 truncate">{invite.email} · sent {toRelativeTime(invite.sentAt)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {invite.ctaClickedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        🔥 Clicked through · {toRelativeTime(invite.ctaClickedAt)}
                      </span>
                    ) : invite.openedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        👀 Opened · {toRelativeTime(invite.openedAt)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        Not opened yet
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Nudge — only show if >24hrs old and not yet opened */}
                  {!invite.openedAt && (Date.now() - new Date(invite.sentAt).getTime()) > 24 * 3600 * 1000 && (
                    <button
                      onClick={async () => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser()
                          const res = await fetch(buildApiUrl(`/api/lo/partners/invite/${invite.id}/nudge`), {
                            method: 'POST', headers: { 'x-user-id': user?.id || '' }
                          })
                          const json = await res.json() as { error?: string; message?: string }
                          if (!res.ok) throw new Error(json.message || 'nudge_failed')
                          showToast.success('Reminder sent! 👋')
                        } catch (e: unknown) {
                          showToast.error(e instanceof Error ? e.message : 'Failed to send reminder')
                        }
                      }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-300 bg-white rounded-lg px-3 py-1.5 transition-all hover:bg-blue-50"
                    >
                      Nudge 👋
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        const { data: { user } } = await supabase.auth.getUser()
                        const res = await fetch(buildApiUrl(`/api/lo/partners/invite/${invite.id}/resend`), {
                          method: 'POST', headers: { 'x-user-id': user?.id || '' }
                        })
                        if (!res.ok) throw new Error()
                        showToast.success('Invite resent!')
                      } catch { showToast.error('Failed to resend') }
                    }}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-300 bg-white rounded-lg px-3 py-1.5 transition-all hover:bg-amber-50"
                  >
                    Resend
                  </button>
                  {revokeConfirmId === invite.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          setRevokeConfirmId(null)
                          try {
                            const { data: { user } } = await supabase.auth.getUser()
                            const res = await fetch(buildApiUrl(`/api/lo/partners/invite/${invite.id}`), {
                              method: 'DELETE', headers: { 'x-user-id': user?.id || '' }
                            })
                            if (!res.ok) throw new Error()
                            showToast.success('Invite revoked')
                            load()
                          } catch { showToast.error('Failed to revoke') }
                        }}
                        className="text-xs font-bold text-white bg-red-600 border border-red-600 rounded-lg px-3 py-1.5 hover:bg-red-700 transition-all"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setRevokeConfirmId(null)}
                        className="text-xs font-semibold text-slate-400 border border-slate-200 bg-white rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirmId(invite.id)}
                      className="text-xs font-semibold text-slate-400 hover:text-red-600 border border-slate-200 bg-white rounded-lg px-3 py-1.5 transition-all hover:border-red-200 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add partner button — only when there's content (empty state has its own CTA) */}
      {(partners.length > 0 || pendingInvites.length > 0) && (
        <div className="flex justify-end">
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
          {partners.map(partner => (
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
          onClose={() => setShowInvite(false)}
          onSent={() => { load() }}
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
