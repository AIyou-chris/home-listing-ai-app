import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchDashboardAppointments,
  fetchDashboardLeads,
  fetchListingShareKit,
  type DashboardAppointmentRow,
  type DashboardLeadItem,
  type ListingShareKitResponse
} from '../../services/dashboardCommandService'
import { fetchOnboardingState, type OnboardingState } from '../../services/onboardingService'
import { listingsService } from '../../services/listingsService'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'
import { showToast } from '../../utils/toastService'

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
  const leadsById = useDashboardRealtimeStore((state) => state.leadsById)
  const appointmentsById = useDashboardRealtimeStore((state) => state.appointmentsById)
  const setInitialLeads = useDashboardRealtimeStore((state) => state.setInitialLeads)
  const setInitialAppointments = useDashboardRealtimeStore((state) => state.setInitialAppointments)
  const listingSignalsById = useDashboardRealtimeStore((state) => state.listingSignalsById)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)
  const [recentListing, setRecentListing] = useState<RecentListing | null>(null)
  const [shareKit, setShareKit] = useState<ListingShareKitResponse | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [leadRes, appointmentRes, listings, onboardingState] = await Promise.all([
        fetchDashboardLeads({ tab: 'New', sort: 'hot_first' }),
        fetchDashboardAppointments({ view: 'today' }),
        listingsService.listProperties(),
        fetchOnboardingState().catch(() => null)
      ])

      setInitialLeads(leadRes.leads || [])
      setInitialAppointments(appointmentRes.appointments || [])
      setOnboarding(onboardingState)

      const firstListing = (listings || [])[0]
      if (firstListing) {
        const listingSummary = {
          id: firstListing.id,
          address: firstListing.address || 'Listing'
        }
        setRecentListing(listingSummary)
        const kit = await fetchListingShareKit(firstListing.id).catch(() => null)
        if (kit) setShareKit(kit)
      } else {
        setRecentListing(null)
        setShareKit(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load today view.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return leads.slice(0, 5)
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

  const handleCopyLink = async () => {
    if (!shareKit?.share_url) return
    try {
      await navigator.clipboard.writeText(shareKit.share_url)
      showToast.success('Link copied')
    } catch {
      showToast.error('Could not copy link')
    }
  }

  const handleDownloadQr = () => {
    if (!shareKit?.qr_code_url) return
    const link = document.createElement('a')
    link.href = shareKit.qr_code_url
    link.download = 'listing-qr.png'
    link.click()
    showToast.success('Downloaded')
  }

  const appointmentBadge = (appointment: DashboardAppointmentRow) => {
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

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {onboarding && !onboarding.onboarding_completed && (
        <section className={containerCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Launch Checklist</h2>
              <p className="text-sm text-slate-500">Complete setup once so every lead route is ready.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/onboarding')}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Continue setup
            </button>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-primary-600"
              style={{
                width: `${Math.round((onboarding.progress.completed_items / Math.max(onboarding.progress.total_items, 1)) * 100)}%`
              }}
            />
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-3">
        <article className={containerCardClass}>
          <h2 className="text-lg font-semibold text-slate-900">New Leads</h2>
          <p className="mt-1 text-sm text-slate-500">Follow up fast. Book the showing.</p>
          <div className="mt-4 space-y-3">
            {newLeads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">All caught up.</p>
                <p className="mt-1 text-sm text-slate-500">New leads will appear here automatically.</p>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/leads')}
                  className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  View all leads
                </button>
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
                    onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
                    className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open
                  </button>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={containerCardClass}>
          <h2 className="text-lg font-semibold text-slate-900">Appointments Coming Up</h2>
          <p className="mt-1 text-sm text-slate-500">Confirm these to reduce no-shows.</p>
          <div className="mt-4 space-y-3">
            {upcomingAppointments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Nothing scheduled in the next 24 hours.</p>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/appointments')}
                  className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  View appointments
                </button>
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
                    onClick={() => navigate(`/dashboard/appointments?appointmentId=${appointment.id}`)}
                    className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open
                  </button>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={containerCardClass}>
          <h2 className="text-lg font-semibold text-slate-900">Share Kit</h2>
          <p className="mt-1 text-sm text-slate-500">Copy your link or download a QR in seconds.</p>
          <div className="mt-4">
            {!recentListing ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">No listings yet.</p>
                <button
                  type="button"
                  onClick={() => navigate('/add-listing')}
                  className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Create a listing
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{recentListing.address}</p>
                {shareKit?.share_url ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{shareKit.share_url}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">Publish listing to generate your live share link.</p>
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
                    onClick={() => navigate(`/dashboard/listings/${recentListing.id}`)}
                    className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open Share Kit
                  </button>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading Today…</div>
      )}
    </div>
  )
}

export default TodayDashboardPage
