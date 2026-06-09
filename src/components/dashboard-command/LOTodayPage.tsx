import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode'
import { buildApiUrl } from '../../lib/api'
import { supabase } from '../../services/supabase'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LOStats {
  totalLeads: number
  newToday: number
  newThisWeek: number
  newThisMonth: number
  preApprovalLeads: number
  showingLeads: number
  assignedListings: number
  partnersReached: number
}

interface RecentLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  intentLevel: string
  context: string
  sourceType: string
  listingId: string | null
  createdAt: string
}

interface AssignedListing {
  listingId: string
  brandingEnabled: boolean
  assignedAt: string
  address: string
  price: number | null
  status: string
  heroPhoto: string | null
  leadCount: number
}

interface LODashboardData {
  stats: LOStats
  recentLeads: RecentLead[]
  assignedListings: AssignedListing[]
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_DATA: LODashboardData = {
  stats: {
    totalLeads: 24,
    newToday: 3,
    newThisWeek: 9,
    newThisMonth: 24,
    preApprovalLeads: 14,
    showingLeads: 10,
    assignedListings: 4,
    partnersReached: 7
  },
  recentLeads: [
    { id: '1', name: 'Jordan Kim', email: 'jordan@email.com', phone: '(512) 900-4421', status: 'New', intentLevel: 'Hot', context: 'pre_approval', sourceType: 'listing_page', listingId: 'l1', createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
    { id: '2', name: 'Maria Santos', email: 'maria@email.com', phone: '(737) 214-8830', status: 'New', intentLevel: 'Warm', context: 'showing_request', sourceType: 'listing_page', listingId: 'l2', createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: '3', name: 'Derek Okafor', email: 'derek@email.com', phone: null, status: 'Contacted', intentLevel: 'Warm', context: 'pre_approval', sourceType: 'listing_page', listingId: 'l1', createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: '4', name: 'Ashley Chen', email: 'ashley@email.com', phone: '(512) 771-0033', status: 'New', intentLevel: 'Hot', context: 'pre_approval', sourceType: 'listing_page', listingId: 'l3', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: '5', name: 'Tom Rivera', email: 'tom@email.com', phone: null, status: 'Nurturing', intentLevel: 'Cold', context: 'general_info', sourceType: 'listing_page', listingId: 'l2', createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
  ],
  assignedListings: [
    { listingId: 'l1', brandingEnabled: true, assignedAt: new Date().toISOString(), address: '4821 Ridgecrest Dr, Austin TX', price: 875000, status: 'published', heroPhoto: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=400&auto=format&fit=crop', leadCount: 14 },
    { listingId: 'l2', brandingEnabled: true, assignedAt: new Date().toISOString(), address: '2203 Barton Hills Dr, Austin TX', price: 1150000, status: 'published', heroPhoto: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=400&auto=format&fit=crop', leadCount: 7 },
    { listingId: 'l3', brandingEnabled: false, assignedAt: new Date().toISOString(), address: '908 W 12th St, Austin TX', price: 620000, status: 'published', heroPhoto: null, leadCount: 3 },
    { listingId: 'l4', brandingEnabled: true, assignedAt: new Date().toISOString(), address: '1407 Travis Heights Blvd, Austin TX', price: 490000, status: 'draft', heroPhoto: null, leadCount: 0 },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toRelativeTime = (value?: string | null) => {
  if (!value) return 'just now'
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

const formatPrice = (price: number | null) => {
  if (!price) return '—'
  return `$${(price / 1000).toFixed(0)}k`
}

const contextLabel = (context: string) => {
  if (context === 'pre_approval') return { label: 'Pre-Approval', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
  if (context === 'showing_request') return { label: 'Showing', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' }
  return { label: 'General', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
}

const intentColor = (level: string) => {
  if (level === 'Hot') return 'bg-red-500'
  if (level === 'Warm') return 'bg-amber-400'
  return 'bg-slate-500'
}

const dayPart = () => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

const _StatCard: React.FC<{
  label: string
  value: number | string
  sub?: string
  accent?: string
}> = ({ label, value, sub, accent = 'text-white' }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
    <p className={`text-3xl font-black ${accent}`}>{value}</p>
    {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
  </div>
)

// ─── Setup Checklist ──────────────────────────────────────────────────────────

interface LOSetupState {
  profileDone: boolean
  partnerInvited: boolean
  onboardingCompleted: boolean
}

const LOSetupChecklist: React.FC<{ setup: LOSetupState; onDismiss: () => void; navTo: (p: string) => void }> = ({ setup, onDismiss, navTo }) => {
  const steps = [
    {
      label: 'Complete your LO profile',
      sub: 'Add your name, NMLS #, company, and headshot',
      done: setup.profileDone,
      action: () => navTo('/lo-onboarding'),
    },
    {
      label: 'Invite your first agent partner',
      sub: 'Send a WOW Link — give an agent\'s listing an AI upgrade',
      done: setup.partnerInvited,
      action: () => navTo('/lo-partners'),
    },
    {
      label: 'You\'re live — start capturing leads',
      sub: 'Your AI financing chatbot is active on every listing',
      done: setup.onboardingCompleted,
      action: () => navTo('/lo-listings'),
    },
  ]
  const doneCount = steps.filter(s => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-primary-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-sm">🚀 Get set up — {doneCount} of {steps.length} done</h2>
          <p className="text-xs text-slate-500 mt-0.5">Complete these steps to start getting warm leads from your agent partners.</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 text-xs font-semibold ml-4 flex-shrink-0"
          title="Dismiss"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-primary-100">
        <div
          className="h-full bg-primary-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="divide-y divide-slate-100">
        {steps.map((step, i) => (
          <li
            key={i}
            className={`flex items-center gap-4 px-5 py-4 ${!step.done ? 'cursor-pointer hover:bg-primary-50 transition-colors' : ''}`}
            onClick={!step.done ? step.action : undefined}
          >
            {/* Check circle */}
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold border-2 ${
              step.done
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-300 text-slate-400 bg-white'
            }`}>
              {step.done ? '✓' : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${step.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{step.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{step.sub}</p>
            </div>
            {!step.done && (
              <span className="text-xs text-primary-600 font-semibold flex-shrink-0">Start →</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const LOTodayPage: React.FC = () => {
  const navigate = useNavigate()
  const demoMode = useDemoMode()
  const [data, setData] = useState<LODashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [setup, setSetup] = useState<LOSetupState | null>(null)
  const [setupDismissed, setSetupDismissed] = useState(false)
  const mountedRef = useRef(true)

  const navTo = useCallback((path: string) => {
    navigate(buildDashboardPath(path, demoMode))
  }, [navigate, demoMode])

  const load = useCallback(async () => {
    if (demoMode) {
      setData(DEMO_DATA)
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('unauthenticated')

      // Fetch dashboard + onboarding state in parallel
      const [res, onboardingRes] = await Promise.all([
        fetch(buildApiUrl('/api/lo/dashboard/today'), { headers: { 'x-user-id': user.id } }),
        fetch(buildApiUrl('/api/dashboard/onboarding'), { headers: { 'x-user-id': user.id } }).catch(() => null),
      ])

      if (!res.ok) throw new Error('fetch_failed')
      const json = await res.json() as { success: boolean; loProfileComplete?: boolean; partnerInvited?: boolean } & LODashboardData
      if (!mountedRef.current) return
      setData(json)

      // Parse onboarding completed flag (we only need this one field from onboarding)
      let obCompleted = false
      if (onboardingRes?.ok) {
        const ob = await onboardingRes.json().catch(() => null) as { onboarding_completed?: boolean } | null
        obCompleted = Boolean(ob?.onboarding_completed)
      }

      // Use authoritative flags from the dashboard API:
      //   loProfileComplete = checks lo_chatbot_configs.full_name (not the signup name, which was a false positive)
      //   partnerInvited    = checks agent_invites count > 0
      const profileDone = Boolean(json.loProfileComplete)
      const partnerInvited = Boolean(json.partnerInvited || (json.stats?.partnersReached ?? 0) > 0)
      const allDone = profileDone && partnerInvited && obCompleted

      setSetup({ profileDone, partnerInvited, onboardingCompleted: obCompleted })
      if (allDone) setSetupDismissed(true)
    } catch (err) {
      console.error('[LOToday] load failed', err)
      if (mountedRef.current) setError('Failed to load dashboard')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [demoMode])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [load])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 text-sm">
        {error || 'No data available'}
      </div>
    )
  }

  const { stats, recentLeads, assignedListings } = data

  return (
    <div className="space-y-6 pb-12">

      {/* ── Greeting ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Good {dayPart()} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Here's your pipeline across {stats.assignedListings} listing{stats.assignedListings !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* ── Setup Checklist (shown until onboarding complete or dismissed) ────── */}
      {setup && !setupDismissed && (
        <LOSetupChecklist
          setup={setup}
          onDismiss={() => setSetupDismissed(true)}
          navTo={navTo}
        />
      )}

      {/* ── Stat row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">New today</p>
          <p className="text-3xl font-black text-slate-900">{stats.newToday}</p>
          <p className="text-xs text-slate-400 mt-1">{stats.newThisWeek} this week</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Total leads</p>
          <p className="text-3xl font-black text-slate-900">{stats.totalLeads}</p>
          <p className="text-xs text-slate-400 mt-1">{stats.newThisMonth} this month</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Pre-approvals</p>
          <p className="text-3xl font-black text-emerald-700">{stats.preApprovalLeads}</p>
          <p className="text-xs text-emerald-500 mt-1">financing intent</p>
        </div>
        <div
          className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navTo('/lo-partners')}
        >
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">Partners Reached</p>
          <p className="text-3xl font-black text-violet-700">{stats.partnersReached ?? 0}</p>
          <p className="text-xs text-violet-500 mt-1">agents sent WOW links</p>
        </div>
      </div>

      {/* ── Two column layout ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Recent leads — wider col */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm">Recent Leads</h2>
            <button
              onClick={() => navTo('/lo-leads')}
              className="text-xs text-primary-600 font-semibold hover:underline"
            >
              View all →
            </button>
          </div>

          {recentLeads.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No leads yet — share your listings to get started
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentLeads.map(lead => {
                const ctx = contextLabel(lead.context)
                return (
                  <li
                    key={lead.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navTo(`/leads`)}
                  >
                    {/* Intent dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${intentColor(lead.intentLevel)}`} />

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                      {(lead.name || '?')[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
                      <p className="text-xs text-slate-400 truncate">{lead.email || lead.phone || 'No contact info'}</p>
                    </div>

                    {/* Context chip */}
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${ctx.color}`}>
                      {ctx.label}
                    </span>

                    {/* Time */}
                    <span className="flex-shrink-0 text-xs text-slate-400">{toRelativeTime(lead.createdAt)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Assigned listings — narrower col */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm">My Listings</h2>
            <button
              onClick={() => navTo('/lo-listings')}
              className="text-xs text-primary-600 font-semibold hover:underline"
            >
              Manage →
            </button>
          </div>

          {assignedListings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm px-5">
              No listings yet —{' '}
              <button
                onClick={() => navTo('/lo-listings')}
                className="text-primary-600 font-semibold hover:underline"
              >
                add one
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {assignedListings.map(listing => (
                <li
                  key={listing.listingId}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navTo('/lo-listings')}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    {listing.heroPhoto
                      ? <img src={listing.heroPhoto} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">🏠</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate leading-snug">{listing.address}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{formatPrice(listing.price)}</span>
                      {listing.status === 'published'
                        ? <span className="text-[10px] font-bold text-emerald-600">● Live</span>
                        : <span className="text-[10px] font-bold text-slate-400">Draft</span>
                      }
                    </div>
                  </div>

                  {/* Lead count */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-black text-slate-900">{listing.leadCount}</p>
                    <p className="text-[10px] text-slate-400">leads</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 text-sm mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => navTo('/lo-leads')}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:bg-primary-50 transition-all text-center"
          >
            <span className="text-2xl">👥</span>
            <span className="text-xs font-semibold text-slate-700">All Leads</span>
          </button>
          <button
            onClick={() => navTo('/lo-listings')}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:bg-primary-50 transition-all text-center"
          >
            <span className="text-2xl">🏠</span>
            <span className="text-xs font-semibold text-slate-700">My Listings</span>
          </button>
          <button
            onClick={() => navTo('/lo-appointments')}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:bg-primary-50 transition-all text-center"
          >
            <span className="text-2xl">📅</span>
            <span className="text-xs font-semibold text-slate-700">Appointments</span>
          </button>
          <button
            onClick={() => navTo('/billing')}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:bg-primary-50 transition-all text-center"
          >
            <span className="text-2xl">💳</span>
            <span className="text-xs font-semibold text-slate-700">Billing</span>
          </button>
        </div>
      </div>

    </div>
  )
}

export default LOTodayPage
