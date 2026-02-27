import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchCommandCenterSnapshot,
  logDashboardAgentAction,
  retryDashboardReminder,
  updateAppointmentStatus,
  updateDashboardLeadStatus,
  type CommandCenterAppointmentQueueItem,
  type CommandCenterLeadQueueItem
} from '../../services/dashboardCommandService'
import { fetchOnboardingState, type OnboardingState } from '../../services/onboardingService'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

const normalizeAppointmentStatus = (value?: string | null) => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'confirmed') return 'confirmed'
  if (normalized === 'reschedule_requested' || normalized === 'rescheduled_requested' || normalized === 'rescheduled') {
    return 'reschedule_requested'
  }
  if (normalized === 'canceled' || normalized === 'cancelled') return 'canceled'
  if (normalized === 'completed') return 'completed'
  return 'scheduled'
}

const statCardClass =
  'rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm'

const queueCardClass =
  'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'

const ConversionDashboardHome: React.FC = () => {
  const navigate = useNavigate()
  const commandCenter = useDashboardRealtimeStore((state) => state.commandCenter)
  const setCommandCenter = useDashboardRealtimeStore((state) => state.setCommandCenter)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workingItemId, setWorkingItemId] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchCommandCenterSnapshot()
        setCommandCenter({
          stats: response.stats,
          queues: response.queues
        })
        const onboardingState = await fetchOnboardingState().catch(() => null)
        if (onboardingState) {
          setOnboarding(onboardingState)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load command center.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [setCommandCenter])

  const stats = commandCenter?.stats || {
    new_leads_today: 0,
    unworked_leads: 0,
    appointments_today: 0,
    confirmations_7d: 0
  }

  const queues = useMemo(
    () =>
      commandCenter?.queues || {
        new_leads_to_work: [],
        appointments_coming_up: [],
        needs_attention: []
      },
    [commandCenter]
  )

  const logLeadAction = async (
    leadId: string | null | undefined,
    action: 'call_clicked' | 'email_clicked' | 'status_changed' | 'appointment_created' | 'appointment_updated',
    metadata?: Record<string, unknown>
  ) => {
    if (!leadId) return
    await logDashboardAgentAction({ lead_id: leadId, action, metadata }).catch(() => undefined)
  }

  const handleCallLead = async (lead: CommandCenterLeadQueueItem) => {
    if (!lead.phone) return
    await logLeadAction(lead.lead_id, 'call_clicked')
    window.location.href = `tel:${lead.phone}`
  }

  const handleEmailLead = async (lead: CommandCenterLeadQueueItem) => {
    if (!lead.email) return
    await logLeadAction(lead.lead_id, 'email_clicked')
    window.location.href = `mailto:${lead.email}`
  }

  const handleMarkContacted = async (lead: CommandCenterLeadQueueItem) => {
    setWorkingItemId(lead.lead_id)
    setError(null)
    try {
      await updateDashboardLeadStatus(lead.lead_id, { status: 'Contacted' })
      await logLeadAction(lead.lead_id, 'status_changed', { status: 'Contacted', source: 'command_center' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead status.')
    } finally {
      setWorkingItemId(null)
    }
  }

  const handleAppointmentCall = async (appointment: CommandCenterAppointmentQueueItem) => {
    if (!appointment.lead_phone) return
    await logLeadAction(appointment.lead_id, 'call_clicked', { appointment_id: appointment.appointment_id })
    window.location.href = `tel:${appointment.lead_phone}`
  }

  const handleMarkConfirmed = async (appointment: CommandCenterAppointmentQueueItem) => {
    setWorkingItemId(appointment.appointment_id)
    setError(null)
    try {
      await updateAppointmentStatus(appointment.appointment_id, 'confirmed')
      await logLeadAction(appointment.lead_id, 'appointment_updated', {
        appointment_id: appointment.appointment_id,
        status: 'confirmed',
        source: 'command_center'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark appointment confirmed.')
    } finally {
      setWorkingItemId(null)
    }
  }

  const handleReschedule = async (appointment: CommandCenterAppointmentQueueItem) => {
    setWorkingItemId(appointment.appointment_id)
    setError(null)
    try {
      await updateAppointmentStatus(appointment.appointment_id, 'reschedule_requested')
      await logLeadAction(appointment.lead_id, 'appointment_updated', {
        appointment_id: appointment.appointment_id,
        status: 'reschedule_requested',
        source: 'command_center'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update appointment.')
    } finally {
      setWorkingItemId(null)
    }
  }

  const handleRetryReminder = async (appointment: CommandCenterAppointmentQueueItem) => {
    setWorkingItemId(appointment.appointment_id)
    setError(null)
    try {
      await retryDashboardReminder(appointment.appointment_id)
      await logLeadAction(appointment.lead_id, 'appointment_updated', {
        appointment_id: appointment.appointment_id,
        retry: true,
        source: 'command_center'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry reminder.')
    } finally {
      setWorkingItemId(null)
    }
  }

  const renderQueueActionButton = (
    label: string,
    onClick: () => void,
    opts: { disabled?: boolean; tone?: 'default' | 'primary' | 'warning' } = {}
  ) => {
    const toneClass =
      opts.tone === 'primary'
        ? 'border-blue-300 bg-blue-50 text-blue-700'
        : opts.tone === 'warning'
          ? 'border-amber-300 bg-amber-50 text-amber-800'
          : 'border-slate-300 bg-white text-slate-700'

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={opts.disabled}
        className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${toneClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Command Center</h1>
        <p className="mt-1 text-sm text-slate-600">Live pipeline view of what needs attention right now.</p>
      </div>

      {onboarding && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Launch Checklist</h2>
              <p className="text-xs text-slate-500">
                {onboarding.onboarding_completed
                  ? 'You’re live. Jump into your highest-value actions.'
                  : 'Complete your first launch in under 5 minutes.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/onboarding')}
              className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700"
            >
              {onboarding.onboarding_completed ? 'Open Checklist' : 'Launch Checklist'}
            </button>
          </div>

          {!onboarding.onboarding_completed ? (
            <div className="mt-3 space-y-2">
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-primary-600 transition-all"
                  style={{
                    width: `${Math.round((onboarding.progress.completed_items / Math.max(onboarding.progress.total_items, 1)) * 100)}%`
                  }}
                />
              </div>
              <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Add agent profile', onboarding.onboarding_checklist.brand_profile, 1],
                  ['Create first listing', onboarding.onboarding_checklist.first_listing_created, 2],
                  ['Publish listing', onboarding.onboarding_checklist.first_listing_published, 3],
                  ['Copy link', onboarding.onboarding_checklist.share_kit_copied, 3],
                  ['Send test lead', onboarding.onboarding_checklist.test_lead_sent, 4],
                  ['Create appointment (Pro)', onboarding.onboarding_checklist.first_appointment_created, 5]
                ].map(([label, done, step]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => navigate(`/dashboard/onboarding?step=${step}`)}
                    className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left ${
                      done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span>{done ? '✓' : '○'}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate('/add-listing')} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                New Listing
              </button>
              <button type="button" onClick={() => onboarding.first_listing_id ? navigate(`/dashboard/listings/${onboarding.first_listing_id}`) : navigate('/dashboard')} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                Share Kit
              </button>
              <button type="button" onClick={() => navigate('/dashboard/leads')} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                Leads Inbox
              </button>
              <button type="button" onClick={() => navigate('/dashboard/command-center')} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                Command Center
              </button>
            </div>
          )}
        </section>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className={statCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New leads today</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.new_leads_today}</p>
        </article>
        <article className={statCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unworked leads</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.unworked_leads}</p>
        </article>
        <article className={statCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Appointments today</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.appointments_today}</p>
        </article>
        <article className={statCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirmations (7 days)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.confirmations_7d}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={queueCardClass}>
          <header>
            <h2 className="text-base font-semibold text-slate-900">New leads to work</h2>
            <p className="text-xs text-slate-500">Reply fast. Book the showing.</p>
          </header>

          <div className="mt-3 space-y-3">
            {queues.new_leads_to_work.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">All caught up.</p>
                <p className="mt-1">New leads will show up here automatically.</p>
              </div>
            )}

            {queues.new_leads_to_work.slice(0, 10).map((lead) => (
              <div key={lead.lead_id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{lead.full_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{lead.listing_address || 'No listing attached'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {lead.status === 'New' && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">NEW</span>
                    )}
                    {lead.intent_level === 'Hot' && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">HOT</span>
                    )}
                  </div>
                </div>
                <p className="mt-2 line-clamp-1 text-xs text-slate-600">{lead.lead_summary_preview || 'No summary yet.'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {renderQueueActionButton('Call', () => void handleCallLead(lead), { disabled: !lead.phone })}
                  {renderQueueActionButton('Email', () => void handleEmailLead(lead), { disabled: !lead.email })}
                  {renderQueueActionButton('Open', () => navigate(`/dashboard/leads/${lead.lead_id}`), { tone: 'primary' })}
                  <button
                    type="button"
                    onClick={() => void handleMarkContacted(lead)}
                    disabled={workingItemId === lead.lead_id}
                    className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 disabled:opacity-50"
                  >
                    Mark contacted
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={queueCardClass}>
          <header>
            <h2 className="text-base font-semibold text-slate-900">Appointments coming up</h2>
            <p className="text-xs text-slate-500">Confirm these to reduce no-shows.</p>
          </header>

          <div className="mt-3 space-y-3">
            {queues.appointments_coming_up.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Nothing scheduled in the next 24 hours.
              </div>
            )}

            {queues.appointments_coming_up.slice(0, 10).map((appointment) => (
              <div key={appointment.appointment_id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{appointment.lead_name || 'Unknown'}</p>
                <p className="text-xs text-slate-500">{appointment.listing_address || 'No listing attached'}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(appointment.starts_at)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {renderQueueActionButton('Call lead', () => void handleAppointmentCall(appointment), {
                    disabled: !appointment.lead_phone
                  })}
                  {renderQueueActionButton('Mark confirmed', () => void handleMarkConfirmed(appointment), {
                    tone: 'primary',
                    disabled: workingItemId === appointment.appointment_id
                  })}
                  {renderQueueActionButton('Open', () => {
                    if (appointment.lead_id) {
                      navigate(`/dashboard/leads/${appointment.lead_id}`)
                    } else {
                      navigate('/dashboard/appointments')
                    }
                  })}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={queueCardClass}>
          <header>
            <h2 className="text-base font-semibold text-slate-900">Needs attention</h2>
            <p className="text-xs text-slate-500">Fix these and keep the pipeline clean.</p>
          </header>

          <div className="mt-3 space-y-3">
            {queues.needs_attention.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Nothing urgent right now.
              </div>
            )}

            {queues.needs_attention.slice(0, 10).map((appointment) => {
              const isRescheduleRequested = normalizeAppointmentStatus(appointment.status) === 'reschedule_requested'
              const isFailedReminder = String(appointment.last_reminder_outcome || '').toLowerCase() === 'failed'

              return (
                <div key={`attention-${appointment.appointment_id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{appointment.lead_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{appointment.listing_address || 'No listing attached'}</p>
                  <p className="mt-1 text-xs text-amber-700">
                    {isRescheduleRequested ? 'Reschedule requested' : isFailedReminder ? 'Reminder failed' : 'Needs review'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {renderQueueActionButton('Call', () => void handleAppointmentCall(appointment), {
                      disabled: !appointment.lead_phone
                    })}
                    {renderQueueActionButton('Reschedule', () => void handleReschedule(appointment), {
                      tone: 'warning',
                      disabled: workingItemId === appointment.appointment_id
                    })}
                    {renderQueueActionButton('Retry reminder', () => void handleRetryReminder(appointment), {
                      tone: 'primary',
                      disabled: workingItemId === appointment.appointment_id
                    })}
                    {renderQueueActionButton('Open', () => {
                      if (appointment.lead_id) {
                        navigate(`/dashboard/leads/${appointment.lead_id}`)
                      } else {
                        navigate('/dashboard/appointments')
                      }
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading command center…</div>
      )}
    </div>
  )
}

export default ConversionDashboardHome
