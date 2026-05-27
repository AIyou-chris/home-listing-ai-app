import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode'
import LOTodayPage from './LOTodayPage'
import { buildBlueprintPath, useBlueprintMode } from '../../demo/useBlueprintMode'
import {
  fetchDashboardAppointments,
  fetchDashboardLeads,
  fetchListingShareKit,
  logDashboardAgentAction,
  publishListingShareKit,
  type DashboardAppointmentRow,
  type DashboardLeadItem,
  type ListingShareKitResponse
} from '../../services/dashboardCommandService'
import { createBillingCheckoutSession } from '../../services/dashboardBillingService'
import { PENDING_PLAN_KEY } from '../ComparePlansModal'
import { fetchOnboardingState, type OnboardingState } from '../../services/onboardingService'
import { listingsService } from '../../services/listingsService'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'
import { showToast } from '../../utils/toastService'
import TodayROIStrip from '../dashboard-widgets/TodayROIStrip'
import { buildApiUrl } from '../../lib/api'
import { supabase } from '../../services/supabase'

interface LoInfo {
  name: string
  email: string | null
  phone: string | null
  company: string | null
  headshotUrl: string | null
  nmlsNumber: string | null
}

const containerCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

interface RecentListing {
  id: string
  address: string
}

const toLocalTime = (value?: string | null) => {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

const toRelativeTime = (value?: string | null) => {
  if (!value) return 'just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'just now'

  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

const sourceChipLabel = (sourceType?: string | null) => {
  const normalized = String(sourceType || '').toLowerCase()
  if (normalized.includes('open_house')) return 'Open House'
  if (normalized.includes('qr') || normalized.includes('sign')) return 'Sign'
  if (normalized.includes('social')) return 'Social'
  if (normalized.includes('link')) return 'Link'
  return 'Link'
}

const dayPart = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}


const TodayDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const demoMode = useDemoMode()
  const blueprintMode = useBlueprintMode()
  // Read from localStorage immediately (same key Sidebar uses) so the correct
  // dashboard renders on first paint — no flash of the wrong view.
  const ACCT_KEY = 'hla_account_type'
  const [accountType, setAccountType] = useState<string>(
    () => localStorage.getItem(ACCT_KEY) || 'realtor'
  )

  // Unified nav helper — routes to the correct base path regardless of mode
  const navTo = useCallback((path: string) => {
    if (blueprintMode) navigate(buildBlueprintPath(path))
    else navigate(buildDashboardPath(path, demoMode))
  }, [blueprintMode, demoMode, navigate])
  const leadsById = useDashboardRealtimeStore((state) => state.leadsById)
  const appointmentsById = useDashboardRealtimeStore((state) => state.appointmentsById)
  const setInitialLeads = useDashboardRealtimeStore((state) => state.setInitialLeads)
  const setInitialAppointments = useDashboardRealtimeStore((state) => state.setInitialAppointments)
  const listingSignalsById = useDashboardRealtimeStore((state) => state.listingSignalsById)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leadsOpen, setLeadsOpen] = useState(true)
  const [appointmentsOpen, setAppointmentsOpen] = useState(true)
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)
  const [recentListing, setRecentListing] = useState<RecentListing | null>(null)
  const [shareKit, setShareKit] = useState<ListingShareKitResponse | null>(null)
const [partnerLo, setPartnerLo] = useState<LoInfo | null>(null)
  const [loFetchDone, setLoFetchDone] = useState(false)
  const hasFetchedInitialStateRef = useRef(false)
  const fetchInFlightRef = useRef(false)
  const isMountedRef = useRef(true)
  const gridRef = useRef<HTMLElement>(null)

  // ── Banner state ──────────────────────────────────────────────────────────
  // ?upgraded=true or ?checkout=success → show upgrade success banner
  const showUpgradedBanner = searchParams.get('upgraded') === 'true' || searchParams.get('checkout') === 'success'
  // sessionStorage plan intent set by ComparePlansModal → prompt user to complete upgrade
  const [pendingPlan, setPendingPlan] = useState<'starter' | 'pro' | null>(null)
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)

  useEffect(() => {
    // Only show upgrade banners in real authenticated dashboard
    if (demoMode || blueprintMode) return
    try {
      const stored = sessionStorage.getItem(PENDING_PLAN_KEY) as 'starter' | 'pro' | null
      if (stored === 'starter' || stored === 'pro') setPendingPlan(stored)
    } catch (_) { /* ignore */ }
  }, [demoMode, blueprintMode])

  const dismissUpgradedBanner = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('upgraded')
    next.delete('checkout')
    setSearchParams(next, { replace: true })
  }

  const handlePendingPlanUpgrade = async () => {
    if (!pendingPlan || isStartingCheckout) return
    setIsStartingCheckout(true)
    try {
      sessionStorage.removeItem(PENDING_PLAN_KEY)
      const { url } = await createBillingCheckoutSession(pendingPlan)
      if (url) window.location.href = url
    } catch (err) {
      console.error('[TodayDashboard] Checkout session failed', err)
      setIsStartingCheckout(false)
    }
  }

  const dismissPendingPlan = () => {
    try { sessionStorage.removeItem(PENDING_PLAN_KEY) } catch (_) { /* ignore */ }
    setPendingPlan(null)
  }

  const load = useCallback(async () => {
    if (fetchInFlightRef.current) return
    fetchInFlightRef.current = true
    setLoading(true)
    setError(null)
    try {
      const [leadRes, appointmentRes, listings, onboardingState] = await Promise.all([
        fetchDashboardLeads({ tab: 'New', sort: 'hot_first' }),
        fetchDashboardAppointments({ view: 'today' }),
        listingsService.listProperties(),
        fetchOnboardingState().catch(() => null)
      ])

      if (!isMountedRef.current) return
      setInitialLeads(leadRes.leads || [])
      setInitialAppointments(appointmentRes.appointments || [])
      setOnboarding(onboardingState)

      // Sync account type from the single onboarding fetch (no second API call needed)
      if (onboardingState?.account_type) {
        const t = onboardingState.account_type
        localStorage.setItem(ACCT_KEY, t)
        setAccountType(t)

        // Agents: fetch the LO who invited them
        if (t === 'agent') {
          supabase.auth.getSession().then(({ data: sess }) => {
            const token = sess.session?.access_token
            fetch(buildApiUrl('/api/agent/my-lo'), {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
              .then(r => r.json())
              .then((d: { success?: boolean; lo?: LoInfo | null }) => {
                if (!isMountedRef.current) return
                if (d.success && d.lo) setPartnerLo(d.lo)
                setLoFetchDone(true)
              })
              .catch(() => { if (isMountedRef.current) setLoFetchDone(true) })
          })
        }
      }

      const listingRows = listings || []
      if (listingRows.length > 0) {
        const listingSample = listingRows.slice(0, 5)

        // Fetch all share kits in parallel instead of serially
        const kits = await Promise.all(
          listingSample.map(l => fetchListingShareKit(l.id).catch(() => null))
        )

        // Prefer first published listing; fall back to first listing
        let selectedIdx = 0
        for (let i = 0; i < kits.length; i++) {
          if (kits[i]?.is_published) { selectedIdx = i; break }
        }

        if (!isMountedRef.current) return
        setRecentListing({
          id: listingSample[selectedIdx].id,
          address: listingSample[selectedIdx].address || 'Listing'
        })
        setShareKit(kits[selectedIdx])
      } else {
        if (!isMountedRef.current) return
        setRecentListing(null)
        setShareKit(null)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load today view.')
      }
    } finally {
      fetchInFlightRef.current = false
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [setInitialAppointments, setInitialLeads])

  useEffect(() => {
    if (hasFetchedInitialStateRef.current) return
    hasFetchedInitialStateRef.current = true

    if (blueprintMode) {
      // Blueprint mode: skip all API calls (no auth, would 401).
      // recentListing stays null — the Share Kit section shows the example listing card instead.
      setLoading(false)
      return
    }

    void load()
  }, [load, blueprintMode])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Responsive 2-column grid — triggers at lg (1024px) with proper cleanup
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const update = () => {
      el.style.gridTemplateColumns = window.innerWidth >= 1024 ? 'minmax(0, 2fr) minmax(0, 1fr)' : 'minmax(0, 1fr)'
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!recentListing?.id) return
    if (!listingSignalsById[recentListing.id]) return
    void fetchListingShareKit(recentListing.id)
      .then((kit) => setShareKit(kit))
      .catch(() => undefined)
  }, [listingSignalsById, recentListing?.id])

  const newLeads = useMemo(() => {
    const leads = Object.values(leadsById || {})
      .filter((lead) => String(lead.status || '').toLowerCase() === 'new')
      .sort((a, b) => {
        if (a.intent_level === 'Hot' && b.intent_level !== 'Hot') return -1
        if (b.intent_level === 'Hot' && a.intent_level !== 'Hot') return 1
        const aTs = new Date(a.last_activity_at || a.created_at || 0).getTime()
        const bTs = new Date(b.last_activity_at || b.created_at || 0).getTime()
        return bTs - aTs
      })
    return leads.slice(0, 6)
  }, [leadsById])

  const upcomingAppointments = useMemo(() => {
    const now = Date.now()
    const next24h = now + 24 * 60 * 60 * 1000

    return Object.values(appointmentsById || {})
      .filter((appointment) => {
        const startsAt = new Date(appointment.startsAt || appointment.startIso || '').getTime()
        if (Number.isNaN(startsAt)) return false
        return startsAt >= now && startsAt <= next24h
      })
      .sort((a, b) => {
        const aTs = new Date(a.startsAt || a.startIso || 0).getTime()
        const bTs = new Date(b.startsAt || b.startIso || 0).getTime()
        return aTs - bTs
      })
      .slice(0, 5)
  }, [appointmentsById])

  const greetingName = useMemo(() => {
    const fullName = onboarding?.brand_profile?.full_name?.trim()
    if (!fullName) return ''
    return fullName.split(' ')[0] || ''
  }, [onboarding?.brand_profile?.full_name])

const handleCopyLink = async () => {
    if (!shareKit?.share_url) return
    try {
      await navigator.clipboard.writeText(shareKit.share_url)
      showToast.success('Link copied')
    } catch {
      showToast.error('Could not copy link')
    }
  }

  const handleOpenLead = async (leadId: string) => {
    if (!demoMode && !blueprintMode) {
      await logDashboardAgentAction({
        lead_id: leadId,
        action: 'lead_opened',
        metadata: { source: 'today_dashboard' }
      }).catch(() => undefined)
    }
    navTo(`/leads/${leadId}`)
  }

  const handleDownloadQr = () => {
    if (!shareKit?.qr_code_url) return
    const link = document.createElement('a')
    link.href = shareKit.qr_code_url
    link.download = 'listing-qr.png'
    link.click()
    showToast.success('Downloaded')
  }

  const handlePublishListing = async () => {
    if (!recentListing?.id) return
    if (blueprintMode) return // no auth in blueprint mode
    try {
      const published = await publishListingShareKit(recentListing.id, true)
      setShareKit(published)
      showToast.success('Publish listing')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to publish listing')
    }
  }

  const appointmentBadge = (appointment: DashboardAppointmentRow) => {
    const reminderOutcome = String(appointment.last_reminder_outcome?.status || '').toLowerCase()
    if (reminderOutcome === 'failed') return 'Reminder failed'
    const normalized = String(appointment.status || '').toLowerCase()
    if (normalized === 'reschedule_requested' || normalized === 'rescheduled_requested') {
      return 'Reschedule requested'
    }
    return 'Needs confirmation'
  }

  // LO gets their own dashboard — swap before rendering the realtor view
  if (accountType === 'lo') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <LOTodayPage />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Today</h1>
        <p className="mt-1 text-base text-slate-700">Good {dayPart()}{greetingName ? `, ${greetingName}` : ''}.</p>
        <p className="mt-1 text-sm text-slate-500">Here's what needs your attention right now.</p>
      </header>

      {/* ── Upgrade success banner (?upgraded=true / ?checkout=success) ─────── */}
      {showUpgradedBanner && !demoMode && !blueprintMode && accountType !== 'agent' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-4">
          <span className="material-symbols-outlined text-emerald-500 text-2xl shrink-0 mt-0.5">celebration</span>
          <div className="flex-1">
            <h2 className="text-base font-bold text-emerald-900">You're all set! Welcome to your new plan. 🎉</h2>
            <p className="mt-0.5 text-sm text-emerald-700">Your upgraded features are active. Start adding listings, capturing leads, and growing your pipeline.</p>
          </div>
          <button onClick={dismissUpgradedBanner} className="p-1 rounded-full text-emerald-500 hover:bg-emerald-100 transition-colors shrink-0" aria-label="Dismiss">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* ── Pending plan upgrade banner (set by ComparePlansModal) ──────────── */}
      {pendingPlan && !loading && !demoMode && !blueprintMode && accountType !== 'agent' && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 flex items-start gap-4">
          <span className="material-symbols-outlined text-primary-500 text-2xl shrink-0 mt-0.5">workspace_premium</span>
          <div className="flex-1">
            <h2 className="text-base font-bold text-primary-900">Complete your {pendingPlan === 'pro' ? 'Pro' : 'Starter'} plan upgrade</h2>
            <p className="mt-0.5 text-sm text-primary-700">You selected the {pendingPlan === 'pro' ? 'Pro ($79/mo)' : 'Starter ($39/mo)'} plan. Finish checkout to unlock all your features.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handlePendingPlanUpgrade}
                disabled={isStartingCheckout}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-60"
              >
                {isStartingCheckout ? 'Opening checkout…' : `Activate ${pendingPlan === 'pro' ? 'Pro' : 'Starter'} →`}
              </button>
              <button type="button" onClick={dismissPendingPlan} className="rounded-md border border-primary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50">
                Maybe later
              </button>
            </div>
          </div>
          <button onClick={dismissPendingPlan} className="p-1 rounded-full text-primary-400 hover:bg-primary-100 transition-colors shrink-0" aria-label="Dismiss">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Welcome banner — brand new realtors only (no listing yet, onboarding pending, real dashboard) */}
      {!loading && !blueprintMode && !demoMode && accountType !== 'agent' && onboarding && !onboarding.onboarding_completed && !recentListing && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-base font-bold text-primary-900">Let's get your first listing live, {greetingName}.</h2>
              <p className="mt-1 text-sm text-primary-700">
                You're {onboarding.progress.total_items - onboarding.progress.completed_items} steps away from capturing your first lead.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navTo('/listings')}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Create your first listing
                </button>
                <button
                  type="button"
                  onClick={() => navTo('/onboarding')}
                  className="rounded-md border border-primary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-700"
                >
                  View setup checklist
                </button>
              </div>
            </div>
            {/* Quick way to see what a full dashboard looks like */}
            <button
              type="button"
              onClick={() => navigate('/blueprint-dashboard/today')}
              className="shrink-0 rounded-xl border border-primary-300 bg-white px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-50 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base text-primary-500">visibility</span>
              Preview sample data
            </button>
          </div>
        </div>
      )}

      <TodayROIStrip />

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading Today…</div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <section className="grid gap-4" ref={gridRef}>
        <div className="space-y-4">
          <article className={containerCardClass}>
            <button
              type="button"
              onClick={() => setLeadsOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">New Leads</h2>
                <p className="mt-1 text-sm text-slate-500">Follow up fast. Book the showing.</p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${leadsOpen ? 'rotate-180' : ''}`}
              >
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
            {leadsOpen && <div className="mt-4 space-y-3">
              {newLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                  {accountType === 'agent' ? (
                    <>
                      <p className="font-semibold text-slate-900">No new leads yet.</p>
                      <p className="mt-1 text-sm text-slate-500">Add a listing and publish it — buyers will start coming in automatically.</p>
                      <button
                        type="button"
                        onClick={() => navTo('/listings')}
                        className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Add a listing
                      </button>
                    </>
                  ) : !blueprintMode && !demoMode && onboarding && !onboarding.onboarding_checklist.first_listing_created ? (
                    <>
                      <p className="font-semibold text-slate-900">No leads yet — that's expected.</p>
                      <p className="mt-1 text-sm text-slate-500">Publish your first listing and leads start flowing in automatically.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navTo('/listings')}
                          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Create a listing
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/blueprint-dashboard/today')}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm text-slate-400">visibility</span>
                          See sample
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">All caught up.</p>
                      <p className="mt-1 text-sm text-slate-500">New leads will appear here automatically.</p>
                      <button
                        type="button"
                        onClick={() => navTo('/leads')}
                        className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        View all leads
                      </button>
                    </>
                  )}
                </div>
              ) : (
                newLeads.map((lead: DashboardLeadItem) => (
                  <div key={lead.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{lead.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{lead.listing?.address || 'No listing address'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">NEW</span>
                        {lead.intent_level === 'Hot' && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">HOT</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">{sourceChipLabel(lead.source_type)}</span>
                      <span>{toRelativeTime(lead.last_activity_at || lead.created_at)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void handleOpenLead(lead.id)
                      }}
                      className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Open
                    </button>
                  </div>
                ))
              )}
            </div>}
          </article>

          <article className={containerCardClass}>
            <button
              type="button"
              onClick={() => setAppointmentsOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Appointments Coming Up</h2>
                <p className="mt-1 text-sm text-slate-500">Your showings in the next 24 hours.</p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${appointmentsOpen ? 'rotate-180' : ''}`}
              >
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
            {appointmentsOpen && <div className="mt-4 space-y-3">
              {upcomingAppointments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                  {accountType === 'agent' ? (
                    <>
                      <p className="font-semibold text-slate-900">No showings today.</p>
                      <p className="mt-1 text-sm text-slate-500">Once your listing is live, buyers can request showings and they'll appear here.</p>
                      <button
                        type="button"
                        onClick={() => navTo('/appointments')}
                        className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        View all appointments
                      </button>
                    </>
                  ) : !blueprintMode && !demoMode && onboarding && !onboarding.onboarding_checklist.first_listing_created ? (
                    <>
                      <p className="font-semibold text-slate-900">Showings start here.</p>
                      <p className="mt-1 text-sm text-slate-500">Once your listing is live, buyers can request showings and they'll appear here.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">Nothing scheduled in the next 24 hours.</p>
                      <button
                        type="button"
                        onClick={() => navTo('/appointments')}
                        className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        View appointments
                      </button>
                    </>
                  )}
                </div>
              ) : (
                upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{appointment.lead?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{appointment.listing?.address || 'No listing address'}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-slate-500">{toLocalTime(appointment.startsAt || appointment.startIso)}</p>
                      {String(appointment.status || '').toLowerCase() === 'confirmed' ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Confirmed</span>
                      ) : (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{appointmentBadge(appointment)}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => navTo(`/appointments?appointmentId=${appointment.id}`)}
                      className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Open
                    </button>
                  </div>
                ))
              )}
            </div>}
          </article>
        </div>

        <div className="space-y-4">
          {/* Launch Checklist at TOP — only for brand new agents (no listing yet) */}
          {!blueprintMode && !demoMode && onboarding && !onboarding.onboarding_completed && !recentListing && (
            <article className={containerCardClass}>
              <h2 className="text-lg font-semibold text-slate-900">Launch Checklist</h2>
              <p className="mt-1 text-sm text-slate-500">Finish this once. Then it runs itself.</p>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-primary-600"
                  style={{
                    width: `${Math.round((onboarding.progress.completed_items / Math.max(onboarding.progress.total_items, 1)) * 100)}%`
                  }}
                />
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li>{onboarding.onboarding_checklist.brand_profile ? '✓' : '○'} Add your details</li>
                <li>{onboarding.onboarding_checklist.first_listing_created ? '✓' : '○'} Create a listing</li>
                <li>{onboarding.onboarding_checklist.first_listing_published && onboarding.onboarding_checklist.share_kit_copied ? '✓' : '○'} Publish and copy link</li>
                <li>{onboarding.onboarding_checklist.test_lead_sent ? '✓' : '○'} Send a test lead</li>
                <li>{onboarding.onboarding_checklist.first_appointment_created ? '✓' : '○'} Schedule a showing</li>
              </ul>
              <button
                type="button"
                onClick={() => navTo('/onboarding')}
                className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Continue setup
              </button>
            </article>
          )}

          <article className={containerCardClass}>
            <h2 className="text-lg font-semibold text-slate-900">Share Kit</h2>
            <p className="mt-1 text-sm text-slate-500">Copy your link or download a QR in seconds.</p>
            <div className="mt-4">
              {!recentListing ? (
                <div className="space-y-3">
                  {/* Example listing — shows what the share kit looks like before they build one */}
                  <div className="relative rounded-lg border border-primary-100 bg-primary-50/40 p-4 overflow-hidden">
                    {/* Example badge */}
                    <span className="absolute top-3 right-3 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-700">
                      Example
                    </span>

                    <p className="text-sm font-semibold text-slate-900 pr-20">24 Maple Street, Austin, TX 78701</p>
                    <p className="mt-1 text-xs text-slate-500">4 bed · 3 bath · 2,400 sqft · Listed at $685,000</p>

                    {/* Fake share URL preview */}
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-white border border-slate-200 px-3 py-2">
                      <span className="material-symbols-outlined text-[15px] text-primary-500 shrink-0">link</span>
                      <p className="text-xs text-slate-400 truncate">homelistingai.com/l/maple-austin-demo</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => window.open('/partner-invite/demo', '_blank')}
                        className="rounded-md border border-primary-200 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50"
                      >
                        See how it works
                      </button>
                    </div>

                    {/* Subtle shimmer overlay to signal it's not real */}
                    <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-dashed border-primary-200 opacity-50" />
                  </div>

                  <button
                    type="button"
                    onClick={() => navTo('/listings')}
                    className="w-full rounded-md bg-primary-600 px-3 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    + Build your first listing
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{recentListing.address}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${shareKit?.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {shareKit?.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  {/* LO branding strip — agents only, when LO info available */}
                  {accountType === 'agent' && partnerLo && (
                    <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1.5">
                      {partnerLo.headshotUrl ? (
                        <img src={partnerLo.headshotUrl} alt={partnerLo.name} className="h-5 w-5 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-primary-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {partnerLo.name[0]}
                        </div>
                      )}
                      <p className="text-[11px] text-blue-700 font-medium truncate">
                        {partnerLo.name} · {partnerLo.company || 'Loan Officer'} featured on this listing
                      </p>
                    </div>
                  )}

                  {shareKit?.is_published ? (
                    <>
                      {shareKit.share_url && (
                        <p className="mt-2 line-clamp-1 text-xs text-slate-400 break-all">{shareKit.share_url}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopyLink()}
                          disabled={!shareKit?.share_url}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
                          Copy link
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          disabled={!shareKit?.qr_code_url}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
                          Download QR
                        </button>
                        <button
                          type="button"
                          onClick={() => navTo(`/listings/${recentListing.id}`)}
                          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Open Share Kit
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-xs text-slate-500">This listing is still a draft. Publish it to start capturing leads.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handlePublishListing()}
                          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Publish listing
                        </button>
                        <button
                          type="button"
                          onClick={() => navTo(`/listings/${recentListing.id}`)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Open listing
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </article>


          {/* ── Your Loan Officer — agents only ─────────────────────────────────── */}
          {accountType === 'agent' && (
            <article className={containerCardClass}>
              <h2 className="text-lg font-semibold text-slate-900">Your Loan Officer</h2>
              <p className="mt-1 text-sm text-slate-500">Your mortgage partner on every deal.</p>
              {partnerLo ? (
                <div className="mt-4">
                  <div className="flex items-center gap-3">
                    {partnerLo.headshotUrl ? (
                      <img src={partnerLo.headshotUrl} alt={partnerLo.name} className="h-12 w-12 rounded-full object-cover border-2 border-slate-200 shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {partnerLo.name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{partnerLo.name}</p>
                      {partnerLo.company && <p className="text-xs text-slate-500 truncate">{partnerLo.company}</p>}
                      {partnerLo.nmlsNumber && <p className="text-xs text-blue-600 mt-0.5">NMLS #{partnerLo.nmlsNumber}</p>}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {partnerLo.phone && (
                      <a href={`tel:${partnerLo.phone}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-primary-600 transition-colors">
                        <span className="material-symbols-outlined text-[18px] text-slate-400">call</span>
                        {partnerLo.phone}
                      </a>
                    )}
                    {partnerLo.email && (
                      <a href={`mailto:${partnerLo.email}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-primary-600 transition-colors">
                        <span className="material-symbols-outlined text-[18px] text-slate-400">mail</span>
                        {partnerLo.email}
                      </a>
                    )}
                  </div>
                  <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                    <p className="text-xs text-blue-700 font-medium">Buyer leads from your listings go directly to {partnerLo.name.split(' ')[0]}.</p>
                  </div>
                </div>
              ) : loFetchDone ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">No loan officer assigned yet.</p>
                  <p className="mt-1 text-xs text-slate-500">Your LO will appear here once they send you a WOW link invitation.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              )}
            </article>
          )}

          {/* Launch Checklist at BOTTOM — only once they have a listing (already moved to top before that) */}
          {onboarding && !onboarding.onboarding_completed && recentListing && (
            <article className={containerCardClass}>
              <h2 className="text-lg font-semibold text-slate-900">Launch Checklist</h2>
              <p className="mt-1 text-sm text-slate-500">Finish this once. Then it runs itself.</p>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-primary-600"
                  style={{
                    width: `${Math.round((onboarding.progress.completed_items / Math.max(onboarding.progress.total_items, 1)) * 100)}%`
                  }}
                />
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li>{onboarding.onboarding_checklist.brand_profile ? '✓' : '○'} Add your details</li>
                <li>{onboarding.onboarding_checklist.first_listing_created ? '✓' : '○'} Create a listing</li>
                <li>{onboarding.onboarding_checklist.first_listing_published && onboarding.onboarding_checklist.share_kit_copied ? '✓' : '○'} Publish and copy link</li>
                <li>{onboarding.onboarding_checklist.test_lead_sent ? '✓' : '○'} Send a test lead</li>
                <li>{onboarding.onboarding_checklist.first_appointment_created ? '✓' : '○'} Schedule a showing</li>
              </ul>
              <button
                type="button"
                onClick={() => navTo('/onboarding')}
                className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Continue setup
              </button>
            </article>
          )}
        </div>
      </section>
    </div>
  )
}

export default TodayDashboardPage
