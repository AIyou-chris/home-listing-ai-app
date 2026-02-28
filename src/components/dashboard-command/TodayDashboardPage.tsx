import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { fetchDashboardBilling, type DashboardBillingSnapshot } from '../../services/dashboardBillingService'
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
  const [billing, setBilling] = useState<DashboardBillingSnapshot | null>(null)

  const load = async () => {
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

        setRecentListing({
          id: selectedListing.id,
          address: selectedListing.address || 'Listing'
        })
        setShareKit(selectedKit)
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
    navigate(`/dashboard/leads/${leadId}`)
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

      <TodayROIStrip />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
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
        </div>

        <div className="space-y-4">
          <article className={containerCardClass}>
            <h2 className="text-lg font-semibold text-slate-900">Share Kit</h2>
            <p className="mt-1 text-sm text-slate-500">Copy your link or download a QR in seconds.</p>
            <div className="mt-4">
              {!recentListing ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">No listings yet.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/listings')}
                    className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Create a listing
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
                          onClick={() => navigate(`/dashboard/listings/${recentListing.id}`)}
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
                          onClick={() => navigate('/listings')}
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
                      onClick={() => navigate('/dashboard/billing')}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Upgrade
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">Loading plan usage...</p>
              )}
            </div>
          </article>

          {onboarding && !onboarding.onboarding_completed && (
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
                onClick={() => navigate('/dashboard/onboarding')}
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
