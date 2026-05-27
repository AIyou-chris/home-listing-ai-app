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
  uncontactedLeads?: number
  viewedNoResponse?: number
}

interface ReminderItem {
  id: string
  name: string
  email: string | null
  lastViewedAt: string
  followUpAt: string | null
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

interface UpcomingAppointment {
  id: string
  kind: string
  name: string | null
  startIso: string
  endIso: string | null
  location: string | null
  status: string
}

interface LODashboardData {
  loName: string | null
  profileIncomplete?: boolean
  stats: LOStats
  recentLeads: RecentLead[]
  assignedListings: AssignedListing[]
  upcomingAppointments: UpcomingAppointment[]
  remindersToday?: ReminderItem[]
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_DATA: LODashboardData = {
  loName: 'Chris',
  stats: {
    totalLeads: 24,
    newToday: 3,
    newThisWeek: 9,
    newThisMonth: 24,
    preApprovalLeads: 14,
    showingLeads: 10,
    assignedListings: 4,
    partnersReached: 7,
    uncontactedLeads: 2,
    viewedNoResponse: 3,
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
  ],
  upcomingAppointments: [
    { id: 'a1', kind: 'Consultation', name: 'Jordan Kim', startIso: new Date(Date.now() + 2 * 3600000).toISOString(), endIso: null, location: null, status: 'scheduled' },
    { id: 'a2', kind: 'Showing', name: 'Maria Santos', startIso: new Date(Date.now() + 26 * 3600000).toISOString(), endIso: null, location: '2203 Barton Hills Dr', status: 'scheduled' },
  ],
  remindersToday: [
    { id: 'r1', name: 'Karen Webb', email: 'karen.webb@realty.com', lastViewedAt: new Date(Date.now() - 2 * 86400000).toISOString(), followUpAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'r2', name: 'Mike Okafor', email: 'mokafor@homes.com', lastViewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), followUpAt: new Date(Date.now() - 86400000).toISOString() },
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

const formatApptTime = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const apptDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((apptDay.getTime() - today.getTime()) / 86400000)
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 0) return `Today · ${timeStr}`
  if (diffDays === 1) return `Tomorrow · ${timeStr}`
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${timeStr}`
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

// ─── Onboarding Checklist ─────────────────────────────────────────────────────

const DISMISS_KEY = 'lo_onboarding_dismissed'

interface OnboardingProps {
  stats: LOStats
  profileIncomplete: boolean
  onNavigate: (path: string) => void
}

const OnboardingChecklist: React.FC<OnboardingProps> = ({ stats, profileIncomplete, onNavigate }) => {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true')
  const [profileDone, setProfileDone] = useState(!profileIncomplete)

  const partnerDone = stats.partnersReached > 0
  const leadDone = stats.totalLeads > 0
  const allDone = profileDone && partnerDone && leadDone

  // Auto-dismiss once everything is complete
  useEffect(() => {
    if (allDone) {
      localStorage.setItem(DISMISS_KEY, 'true')
      setDismissed(true)
    }
  }, [allDone])

  if (dismissed) return null

  const handleProfileClick = () => {
    setProfileDone(true)
    onNavigate('/settings')
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  const steps = [
    {
      done: profileDone,
      icon: '👤',
      title: 'Complete your profile',
      desc: 'Add your name, NMLS #, photo, and contact info. It shows on every WOW Link you send.',
      cta: 'Go to Settings →',
      onClick: handleProfileClick,
    },
    {
      done: partnerDone,
      icon: '🤝',
      title: 'Add your first agent partner',
      desc: 'Send a WOW Link to a real estate agent. When they click it, they see your brand on a live listing.',
      cta: 'Go to Partners →',
      onClick: () => onNavigate('/lo-partners'),
    },
    {
      done: leadDone,
      icon: '🔥',
      title: 'Get your first lead',
      desc: 'Once a buyer fills out the form on a listing you\'re attached to, your first lead appears here.',
      cta: 'View Leads →',
      onClick: () => onNavigate('/lo-leads'),
    },
  ]

  const completedCount = steps.filter(s => s.done).length

  return (
    <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-black">
            {completedCount}/3
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-sm">Welcome! Get set up in 3 steps</h2>
            <p className="text-xs text-slate-500">Complete these to start generating leads with your agent partners.</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          title="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-0 divide-y divide-primary-100 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
        {steps.map((step, i) => (
          <div key={i} className={`p-5 flex flex-col gap-3 ${step.done ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
              {/* Check circle */}
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                step.done
                  ? 'bg-emerald-500 text-white'
                  : 'border-2 border-slate-300 text-transparent'
              }`}>
                {step.done && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{step.icon}</span>
                  <p className={`text-sm font-bold ${step.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {step.title}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
            {!step.done && (
              <button
                onClick={step.onClick}
                className="mt-auto text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline text-left transition-colors"
              >
                {step.cta}
              </button>
            )}
          </div>
        ))}
      </div>
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

      const res = await fetch(buildApiUrl('/api/lo/dashboard/today'), {
        headers: { 'x-user-id': user.id }
      })
      if (!res.ok) throw new Error('fetch_failed')
      const json = await res.json() as { success: boolean } & LODashboardData
      if (!mountedRef.current) return
      setData(json)
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

  const {
    loName = null,
    profileIncomplete = false,
    stats,
    recentLeads = [],
    assignedListings = [],
    upcomingAppointments = [],
    remindersToday = []
  } = data
  const firstName = loName ? loName.split(' ')[0] : null

  return (
    <div className="space-y-6 pb-12">

      {/* ── Greeting ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Good {dayPart()}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Here's your pipeline across {stats.assignedListings} listing{stats.assignedListings !== 1 ? 's' : ''}.
          </p>
        </div>

        {/* Send WOW Link — primary action always visible */}
        <button
          onClick={() => navTo('/lo-partners')}
          className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-colors"
        >
          <span className="text-base">🤝</span>
          Send WOW Link
        </button>
      </div>

      {/* ── Onboarding checklist ─────────────────────────────────────────────── */}
      <OnboardingChecklist stats={stats} profileIncomplete={profileIncomplete} onNavigate={navTo} />

      {/* ── Profile incomplete nudge ─────────────────────────────────────────── */}
      {!demoMode && profileIncomplete && stats.assignedListings > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <span className="material-symbols-outlined text-amber-500 mt-0.5 shrink-0">warning</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Complete your profile — buyers are seeing your listing</p>
            <p className="text-xs text-amber-700 mt-0.5">You're co-branded on {stats.assignedListings} listing{stats.assignedListings !== 1 ? 's' : ''}. Add your headshot, company, and NMLS # so buyers see the real you.</p>
          </div>
          <button
            onClick={() => navTo('/settings')}
            className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600"
          >
            Complete Profile
          </button>
        </div>
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
        <div className={`rounded-2xl p-5 shadow-sm ${stats.preApprovalLeads > 0 ? 'border border-emerald-100 bg-emerald-50' : 'border border-slate-200 bg-white'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${stats.preApprovalLeads > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>Pre-approvals</p>
          <p className={`text-3xl font-black ${stats.preApprovalLeads > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{stats.preApprovalLeads}</p>
          <p className={`text-xs mt-1 ${stats.preApprovalLeads > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>financing intent</p>
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

      {/* ── Needs attention: follow-up reminders ─────────────────────────────── */}
      {(remindersToday.length > 0 || (stats.viewedNoResponse ?? 0) > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-amber-100">
            <span className="text-lg">🔔</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Needs Your Attention</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {remindersToday.length > 0
                  ? `${remindersToday.length} agent${remindersToday.length > 1 ? 's' : ''} viewed your WOW link but haven't responded yet`
                  : `${stats.viewedNoResponse} agent${(stats.viewedNoResponse ?? 0) > 1 ? 's' : ''} viewed your WOW link — follow up today`}
              </p>
            </div>
            <button
              onClick={() => navTo('/lo-partners')}
              className="flex-shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600"
            >
              Follow Up →
            </button>
          </div>
          {remindersToday.length > 0 && (
            <ul className="divide-y divide-amber-100">
              {remindersToday.slice(0, 3).map(r => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-800 flex-shrink-0">
                    {r.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{r.name}</p>
                    <p className="text-xs text-slate-500 truncate">{r.email || 'No email'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-amber-700 font-semibold">Viewed {toRelativeTime(r.lastViewedAt)}</p>
                    <p className="text-[10px] text-slate-400">Follow up due</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
                    onClick={() => navTo('/lo-leads')}
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

        {/* Right col: listings + appointments stacked */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Upcoming Appointments */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm">Upcoming</h2>
              <button
                onClick={() => navTo('/appointments')}
                className="text-xs text-primary-600 font-semibold hover:underline"
              >
                All →
              </button>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm px-5">
                No upcoming appointments
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {upcomingAppointments.map(appt => (
                  <li
                    key={appt.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navTo('/appointments')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 flex-shrink-0">
                      <span className="text-sm">📅</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{appt.kind}{appt.name ? ` · ${appt.name}` : ''}</p>
                      <p className="text-[11px] text-primary-600 font-semibold mt-0.5">{formatApptTime(appt.startIso)}</p>
                      {appt.location && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{appt.location}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Assigned listings */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
              <div className="py-8 text-center text-slate-400 text-sm px-5">
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
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 text-sm mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
            onClick={() => navTo('/lo-chatbot')}
            className="flex flex-col items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 p-4 hover:border-violet-300 hover:bg-violet-100 transition-all text-center"
          >
            <span className="text-2xl">🤖</span>
            <span className="text-xs font-semibold text-violet-700">AI Bot</span>
          </button>
          <button
            onClick={() => navTo('/appointments')}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:bg-primary-50 transition-all text-center"
          >
            <span className="text-2xl">📅</span>
            <span className="text-xs font-semibold text-slate-700">Appointments</span>
          </button>
          <button
            onClick={() => navTo('/lo-partners')}
            className="flex flex-col items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 p-4 hover:border-primary-300 hover:bg-primary-100 transition-all text-center"
          >
            <span className="text-2xl">🤝</span>
            <span className="text-xs font-semibold text-primary-700">Partners</span>
          </button>
        </div>
      </div>

    </div>
  )
}

export default LOTodayPage
