import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode'
import { buildBlueprintPath, useBlueprintMode } from '../../demo/useBlueprintMode'
import { BLUEPRINT_PROPERTIES } from '../../constants/agentBlueprintData'
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
import { fetchDashboardBilling, createBillingCheckoutSession, type DashboardBillingSnapshot } from '../../services/dashboardBillingService'
import { PENDING_PLAN_KEY } from '../ComparePlansModal'
import { fetchOnboardingState, type OnboardingState } from '../../services/onboardingService'
import { listingsService } from '../../services/listingsService'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'
import { showToast } from '../../utils/toastService'
import TodayROIStrip from '../dashboard-widgets/TodayROIStrip'

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

const percentUsed = (used?: number, limit?: number) => {
  const safeLimit = Math.max(0, Number(limit || 0))
  const safeUsed = Math.max(0, Number(used || 0))
  if (safeLimit <= 0) return 0
  return Math.min(100, Math.round((safeUsed / safeLimit) * 100))
}

const formatWarningLine = (billing: DashboardBillingSnapshot, key: string) => {
  const meter = billing.usage?.[key as keyof DashboardBillingSnapshot['usage']]
  if (!meter) return null
  const used = Number(meter.used || 0)
  const limit = Number(meter.limit || 0)
  if (limit <= 0) return null
  if (key === 'active_listings') return `Active listings: ${used}/${limit} used`
  if (key === 'reports_per_month') return `Reports: ${used}/${limit} used`
  if (key === 'reminder_calls_per_month') return `Reminder calls: ${used}/${limit} used`
  if (key === 'stored_leads_cap') return `Stored leads: ${used}/${limit} used`
  return null
}

const TodayDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const demoMode = useDemoMode()
  const blueprintMode = useBlueprintMode()

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
  const [billing, setBilling] = useState<DashboardBillingSnapshot | null>(null)
  const hasFetchedInitialStateRef = useRef(false)
  const fetchInFlightRef = useRef(false)
  const isMountedRef = useRef(true)

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
      const [leadRes, appointmentRes, listings, onboardingState, billingSnapshot] = await Promise.all([
        fetchDashboardLeads({ tab: 'New', sort: 'hot_first' }),
        fetchDashboardAppointments({ view: 'today' }),
        listingsService.listProperties(),
        fetchOnboardingState().catch(() => null),
        fetchDashboardBilling().catch(() => null)
      ])

      if (!isMountedRef.current) return
      setInitialLeads(leadRes.leads || [])
      setInitialAppointments(appointmentRes.appointments || [])
      setOnboarding(onboardingState)
      setBilling(billingSnapshot)

      const listingRows = listings || []
      if (listingRows.length > 0) {
        let selectedListing = listingRows[0]
        let selectedKit: ListingShareKitResponse | null = null
        const listingSample = listingRows.slice(0, 5)

        for (const listing of listingSample) {
          // Prefer first published listing so Share Kit actions are immediately useful.
          const kit = await fetchListingShareKit(listing.id).catch(() => null)
          if (!selectedKit && listing.id === selectedListing.id) {
            selectedKit = kit
          }
          if (kit?.is_published) {
            selectedListing = listing
            selectedKit = kit
            break
          }
        }

        if (!isMountedRef.current) return
        setRecentListing({
          id: selectedListing.id,
          address: selectedListing.address || 'Listing'
        })
        setShareKit(selectedKit)
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
      // Show one example listing in Share Kit; leads + appointments stay empty.
      const bp = BLUEPRINT_PROPERTIES[0]
      if (bp) {
        setRecentListing({ id: bp.id, address: bp.address || '123 Inspiration Way, Future City, CA 90210' })
      }
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
        if (startsAt < now || startsAt > next24h) return false
        return String(appointment.status || '').toLowerCase() !== 'confirmed'
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
    if (!fullName) return 'there'
    return fullName.split(' ')[0] || 'there'
  }, [onboarding?.brand_profile?.full_name])

  const billingWarningLines = useMemo(() => {
    if (!billing) return []
    return (billing.warnings || [])
      .filter((warning) => Number(warning.percent || 0) >= 80 && Number(warning.percent || 0) < 100)
      .map((warning) => formatWarningLine(billing, warning.key))
      .filter((line): line is string => Boolean(line))
  }, [billing])

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
    await logDashboardAgentAction({
      lead_id: leadId,
      action: 'lead_opened',
      metadata: { source: 'today_dashboard' }
    }).catch(() => undefined)
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Today</h1>
        <p className="mt-1 text-base text-slate-700">Good {dayPart()}, {greetingName}.</p>
        <p className="mt-1 text-sm text-slate-500">Here’s what needs your attention right now.</p>
      </header>

      {/* ── Upgrade success banner (?upgraded=true / ?checkout=success) ─────── */}
      {showUpgradedBanner && !demoMode && !blueprintMode && (
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
      {pendingPlan && !loading && !demoMode && !blueprintMode && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 flex items-start gap-4">
          <span className="material-symbols-outlined text-primary-500 text-2xl shrink-0 mt-0.5">workspace_premium</span>
          <div className="flex-1">
            <h2 className="text-base font-bold text-primary-900">Complete your {pendingPlan === 'pro' ? 'Pro' : 'Starter'} upgrade</h2>
            <p className="mt-0.5 text-sm text-primary-700">You selected the {pendingPlan === 'pro' ? 'Pro ($79/mo)' : 'Starter ($34/mo)'} plan. Finish checkout to unlock all your features.</p>
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

      {/* Welcome banner — brand new agents only (no listing yet, onboarding pending, real dashboard) */}
      {!loading && !blueprintMode && !demoMode && onboarding && !onboarding.onboarding_completed && !recentListing && (
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

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
                  {!blueprintMode && !demoMode && onboarding && !onboarding.onboarding_checklist.first_listing_created ? (
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
                <p className="mt-1 text-sm text-slate-500">Confirm these to reduce no-shows.</p>
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
                  {!blueprintMode && !demoMode && onboarding && !onboarding.onboarding_checklist.first_listing_created ? (
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
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        {appointmentBadge(appointment)}
                      </span>
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
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">No listings yet</p>
                  <button
                    type="button"
                    onClick={() => navTo('/listings')}
                    className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Create your first listing
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{recentListing.address}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${shareKit?.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                    >
                      {shareKit?.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {shareKit?.is_published ? (
                    <>
                      {shareKit.share_url && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{shareKit.share_url}</p>
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
                      <p className="mt-1 text-xs text-slate-500">This listing is still a draft.</p>
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
                          onClick={() => navTo('/listings')}
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

          <article className={containerCardClass}>
            <h2 className="text-lg font-semibold text-slate-900">Plan & Limits</h2>
            <p className="mt-1 text-sm text-slate-500">Clear limits. No surprise charges.</p>
            <div className="mt-4 space-y-3">
              {billing ? (
                <>
                  {billing.plan.id === 'free' && (
                    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      On Free plan — 1 listing / 1 report
                    </p>
                  )}

                  {[
                    ['Active listings', billing.usage.active_listings.used, billing.usage.active_listings.limit],
                    ['Reports this month', billing.usage.reports_per_month.used, billing.usage.reports_per_month.limit],
                    ...(billing.plan.id === 'pro'
                      ? [['Reminder calls', billing.usage.reminder_calls_per_month.used, billing.usage.reminder_calls_per_month.limit] as const]
                      : [])
                  ].map(([label, used, limit]) => (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-semibold text-slate-700">
                          {used}/{limit}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-primary-600"
                          style={{ width: `${percentUsed(Number(used), Number(limit))}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {billingWarningLines.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <p className="font-semibold">You’re close to your limit.</p>
                      <p>Upgrade to keep everything running without interruptions.</p>
                      <div className="mt-1 space-y-0.5">
                        {billingWarningLines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {(billing.plan.id === 'free' || billingWarningLines.length > 0) && (
                    <button
                    type="button"
                    onClick={() => navTo('/billing')}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Upgrade
                    </button>
                  )}
                </>
              ) : blueprintMode ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Your plan and usage limits will appear here once you sign up.
                  </p>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 w-0 rounded-full bg-primary-600" />
                  </div>
                  <a
                    href="/#signup"
                    className="inline-block rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Start your app
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Loading plan usage...</p>
              )}
            </div>
          </article>

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

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading Today…</div>
      )}
    </div>
  )
}

export default TodayDashboardPage
