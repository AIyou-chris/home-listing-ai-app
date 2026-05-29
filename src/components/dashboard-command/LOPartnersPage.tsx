import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemoMode } from '../../demo/useDemoMode'
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
  headshotUrl: string | null
  company: string | null
  totalLeads: number
  listings: PartnerListing[]
  joinedAt: string
  rating?: PartnerRating
  lastFollowUp?: string | null
}

interface PendingInvite {
  id: string
  email: string
  name: string | null
  sentAt: string
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_PARTNERS: Partner[] = [
  {
    partnershipId: 'p1', agentId: 'a1',
    name: 'Chris Potter', email: 'chris@prestigeproperties.com', phone: '(512) 448-7731',
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
    name: 'Sarah Mitchell', email: 'sarah@compass.com', phone: '(737) 214-8830',
    headshotUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
    company: 'Compass Austin', totalLeads: 3,
    listings: [
      { listingId: 'l3', address: '908 W 12th St, Austin TX', price: 620000, status: 'published', heroPhoto: null, totalLeads: 3, totalViews: 47 }
    ],
    joinedAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString()
  }
]

const DEMO_PENDING: PendingInvite[] = [
  { id: 'i1', email: 'mike@realty.com', name: 'Mike Johnson', sentAt: new Date(Date.now() - 2 * 3600000).toISOString() }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPrice = (p: number | null) => p ? `$${(p / 1000).toFixed(0)}k` : '—'

// localStorage-backed partner metadata (rating + follow-up)
const STORAGE_KEY = 'lo_partner_meta'
type PartnerMeta = Record<string, { rating: PartnerRating; lastFollowUp: string | null }>

const loadMeta = (): PartnerMeta => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
const saveMeta = (meta: PartnerMeta) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
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
      const json = await res.json() as { success?: boolean; wowLink?: string }
      if (!res.ok) throw new Error('send_failed')
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

const PartnerCard: React.FC<{ partner: Partner; onViewListings: (p: Partner) => void }> = ({ partner, onViewListings }) => {
  const [meta, setMeta] = React.useState(() => {
    const all = loadMeta()
    return all[partner.partnershipId] || { rating: null as PartnerRating, lastFollowUp: null }
  })

  const setRating = (rating: PartnerRating) => {
    const all = loadMeta()
    const next = { ...all[partner.partnershipId] || { lastFollowUp: null }, rating }
    all[partner.partnershipId] = next
    saveMeta(all)
    setMeta(next)
  }

  const logFollowUp = () => {
    const all = loadMeta()
    const next = { ...all[partner.partnershipId] || { rating: null }, lastFollowUp: new Date().toISOString() }
    all[partner.partnershipId] = next
    saveMeta(all)
    setMeta(next)
    showToast.success(`Logged follow-up with ${partner.name.split(' ')[0]}`)
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
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-black text-slate-900">{partner.totalLeads}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">leads</p>
        </div>
      </div>

      {/* Rating row */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">Rate</p>
        {RATINGS.map(r => (
          <button
            key={r.key}
            onClick={() => setRating(meta.rating === r.key ? null : r.key)}
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
          📞 Follow Up
        </button>
        {partner.email && (
          <a
            href={`mailto:${partner.email}`}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white text-xs font-semibold transition-all"
          >
            ✉️
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Partner Detail Drawer ────────────────────────────────────────────────────

const PartnerDetail: React.FC<{ partner: Partner; onClose: () => void }> = ({ partner, onClose }) => (
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
        <div className="rounded-xl border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Contact</p>
          {partner.email && <p className="text-sm text-slate-700">✉️ {partner.email}</p>}
          {partner.phone && <p className="text-sm text-slate-700">📞 {partner.phone}</p>}
          <p className="text-xs text-slate-400">Partner since {new Date(partner.joinedAt).toLocaleDateString()}</p>
        </div>

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

        {/* Referral link */}
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Share their co-brand link</p>
          <p className="text-xs text-slate-500 mb-3">Send this to {partner.name.split(' ')[0]} so they can share their listing page.</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/agent/${partner.agentId}`)
              showToast.success('Link copied!')
            }}
            className="w-full border border-slate-200 rounded-lg py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition-all"
          >
            📋 Copy Partner Link
          </button>
        </div>
      </div>
    </div>
  </div>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

const LOPartnersPage: React.FC = () => {
  const _navigate = useNavigate()
  const demoMode = useDemoMode()
  const [partners, setPartners] = useState<Partner[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Partner Agents</h1>
          <p className="text-slate-500 text-sm mt-1">
            {partners.length} active partner{partners.length !== 1 ? 's' : ''}
            {pendingInvites.length > 0 && ` · ${pendingInvites.length} invite pending`}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-all shadow-sm"
        >
          + Add Partner
        </button>
      </div>

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
          <div className="space-y-2">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{invite.name || invite.email}</p>
                  <p className="text-xs text-slate-500">{invite.email} · sent {toRelativeTime(invite.sentAt)}</p>
                </div>
                <span className="text-xs text-amber-600 font-semibold">Awaiting claim</span>
              </div>
            ))}
          </div>
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
