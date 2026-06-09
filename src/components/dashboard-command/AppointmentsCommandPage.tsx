import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  disableAppointmentReminders,
  fetchAppointmentReminders,
  fetchDashboardAppointments,
  logDashboardAgentAction,
  retryAppointmentReminder,
  retryDashboardReminder,
  sendAppointmentReminderNow,
  updateAppointmentStatus,
  type AppointmentReminderRow,
  type DashboardAppointmentRow
} from '../../services/dashboardCommandService'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'
import UpgradePromptModal from '../billing/UpgradePromptModal'
import { createBillingCheckoutSession, fetchDashboardBilling, type PlanId } from '../../services/dashboardBillingService'
import ScheduleAppointmentModal, { type ScheduleAppointmentFormData } from '../ScheduleAppointmentModal'
import { scheduleAppointment } from '../../services/schedulerService'
import toast from 'react-hot-toast'

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

const normalizeAppointmentStatus = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'confirmed') return 'confirmed'
  if (normalized === 'reschedule_requested' || normalized === 'rescheduled_requested' || normalized === 'rescheduled') {
    return 'reschedule_requested'
  }
  if (normalized === 'canceled' || normalized === 'cancelled') return 'canceled'
  if (normalized === 'completed') return 'completed'
  return 'scheduled'
}

const normalizeReminderOutcome = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'rescheduled' || normalized === 'rescheduled_requested') return 'reschedule_requested'
  if (normalized === 'human_handoff_requested') return 'handoff_requested'
  return normalized
}

const appointmentBadge = (appointment: DashboardAppointmentRow) => {
  const status = normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status)
  const lastOutcome = normalizeReminderOutcome(appointment.last_reminder_outcome?.status)
  if (status === 'reschedule_requested') {
    return { label: 'Reschedule requested', className: 'bg-amber-100 text-amber-700 border border-amber-200' }
  }
  if (lastOutcome === 'failed') {
    return { label: 'Reminder failed', className: 'bg-rose-100 text-rose-700 border border-rose-200' }
  }
  if (status === 'confirmed') {
    return { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' }
  }
  return { label: 'Needs confirmation', className: 'bg-slate-100 text-slate-600 border border-slate-200' }
}

const sortByStartAsc = (appointments: DashboardAppointmentRow[]) =>
  [...appointments].sort(
    (a, b) => new Date(a.startsAt || a.startIso || 0).getTime() - new Date(b.startsAt || b.startIso || 0).getTime()
  )

const ACCT_KEY = 'hla_account_type'

const AppointmentsCommandPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  // Agents are not on a billing plan — treat them as fully unlocked
  const isAgent = (localStorage.getItem(ACCT_KEY) || 'realtor') === 'agent'
  const appointmentsById = useDashboardRealtimeStore((state) => state.appointmentsById)
  const setInitialAppointments = useDashboardRealtimeStore((state) => state.setInitialAppointments)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)
  // expandedId tracks which card has its reminder timeline open — null = all collapsed
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const deepLinkedRef = useRef(false)
  const [remindersByAppointment, setRemindersByAppointment] = useState<Record<string, AppointmentReminderRow[]>>({})
  const [planId, setPlanId] = useState<PlanId>('free')
  const [reminderUsageWarning, setReminderUsageWarning] = useState<string | null>(null)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [schedulingAppt, setSchedulingAppt] = useState(false)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        // Agents have no billing plan — skip the billing fetch entirely
        const [response, billing] = await Promise.all([
          fetchDashboardAppointments({ view: 'week' }),
          isAgent ? Promise.resolve(null) : fetchDashboardBilling().catch(() => null)
        ])
        setInitialAppointments(response.appointments || [])
        if (isAgent) {
          // Agents are fully unlocked — treat as pro plan, no usage warnings
          setPlanId('pro')
        } else {
          if (billing?.plan?.id) setPlanId(billing.plan.id)
          const reminderMeter = billing?.usage?.reminder_calls_per_month
          const warning = (billing?.warnings || []).find(
            (item) => item.key === 'reminder_calls_per_month' && Number(item.percent || 0) >= 80 && Number(item.percent || 0) < 100
          )
          if (warning && reminderMeter) {
            setReminderUsageWarning(`SMS: ${Number(reminderMeter.used || 0)}/${Number(reminderMeter.limit || 0)} used`)
          } else {
            setReminderUsageWarning(null)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointments.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [setInitialAppointments, isAgent])

  // Deep-link: if ?appointmentId=<id> is in the URL, expand that card once data loads
  useEffect(() => {
    if (loading) return
    if (deepLinkedRef.current) return
    const targetId = searchParams.get('appointmentId')
    if (!targetId) return
    deepLinkedRef.current = true
    if (appointmentsById[targetId]) {
      setExpandedId(targetId)
      // Inline reminder fetch so we don't reference loadReminderTimeline before declaration
      fetchAppointmentReminders(targetId)
        .then((response) => {
          setRemindersByAppointment((prev) => ({
            ...prev,
            [targetId]: (response.reminders || []).sort(
              (a, b) => new Date(a.scheduled_for || 0).getTime() - new Date(b.scheduled_for || 0).getTime()
            )
          }))
        })
        .catch(() => undefined)
      // Scroll the card into view after a brief tick to let React render
      setTimeout(() => {
        const el = document.getElementById(`appt-card-${targetId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [loading, searchParams, appointmentsById])

  const allAppointments = useMemo(
    () =>
      sortByStartAsc(
        Object.values(appointmentsById).filter((appointment) => Boolean(appointment.startsAt || appointment.startIso))
      ),
    [appointmentsById]
  )

  const needsConfirmation = useMemo(
    () => {
      const now = Date.now()
      const next24h = now + 24 * 60 * 60 * 1000
      return allAppointments.filter((appointment) => {
        const startsAt = new Date(appointment.startsAt || appointment.startIso || '').getTime()
        if (!Number.isFinite(startsAt) || startsAt < now || startsAt > next24h) return false
        return normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status) !== 'confirmed'
      })
    },
    [allAppointments]
  )

  const confirmed = useMemo(
    () =>
      allAppointments.filter(
        (appointment) => normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status) === 'confirmed'
      ),
    [allAppointments]
  )

  const needsAttention = useMemo(
    () =>
      allAppointments.filter((appointment) => {
        const status = normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status)
        const outcome = normalizeReminderOutcome(appointment.last_reminder_outcome?.status)
        return status === 'reschedule_requested' || outcome === 'failed'
      }),
    [allAppointments]
  )

  const remindersLocked = planId === 'free'

  const logAction = async (
    leadId: string | null | undefined,
    action: 'call_clicked' | 'email_clicked' | 'lead_opened' | 'status_changed' | 'appointment_created' | 'appointment_updated',
    metadata?: Record<string, unknown>
  ) => {
    if (!leadId) return
    await logDashboardAgentAction({ lead_id: leadId, action, metadata }).catch(() => undefined)
  }

  const handleCallLead = async (appointment: DashboardAppointmentRow) => {
    const phone = appointment.lead?.phone
    if (!phone) return
    await logAction(appointment.lead?.id, 'call_clicked', { appointment_id: appointment.id })
    window.location.href = `tel:${phone}`
  }

  const handleMarkConfirmed = async (appointment: DashboardAppointmentRow) => {
    setWorkingId(appointment.id)
    setError(null)
    try {
      await updateAppointmentStatus(appointment.id, 'confirmed')
      await logAction(appointment.lead?.id, 'appointment_updated', { appointment_id: appointment.id, status: 'confirmed' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark confirmed.')
    } finally {
      setWorkingId(null)
    }
  }

  const handleReschedule = async (appointment: DashboardAppointmentRow) => {
    setWorkingId(appointment.id)
    setError(null)
    try {
      await updateAppointmentStatus(appointment.id, 'reschedule_requested')
      await logAction(appointment.lead?.id, 'appointment_updated', {
        appointment_id: appointment.id,
        status: 'reschedule_requested'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark reschedule requested.')
    } finally {
      setWorkingId(null)
    }
  }

  const handleCancelAppointment = async (appointment: DashboardAppointmentRow) => {
    setCancelConfirmId(null)
    setWorkingId(appointment.id)
    setError(null)
    try {
      await updateAppointmentStatus(appointment.id, 'cancelled')
      await logAction(appointment.lead?.id, 'appointment_updated', { appointment_id: appointment.id, status: 'cancelled' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment.')
    } finally {
      setWorkingId(null)
    }
  }

  const handleRetryReminder = async (appointment: DashboardAppointmentRow) => {
    setWorkingId(appointment.id)
    setError(null)
    try {
      await retryDashboardReminder(appointment.id)
      await logAction(appointment.lead?.id, 'appointment_updated', { appointment_id: appointment.id, retry: true })
      const response = await fetchAppointmentReminders(appointment.id)
      setRemindersByAppointment((prev) => ({
        ...prev,
        [appointment.id]: (response.reminders || []).sort(
          (a, b) => new Date(a.scheduled_for || 0).getTime() - new Date(b.scheduled_for || 0).getTime()
        )
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry reminder.')
    } finally {
      setWorkingId(null)
    }
  }

  const loadReminderTimeline = async (appointmentId: string) => {
    try {
      const response = await fetchAppointmentReminders(appointmentId)
      setRemindersByAppointment((prev) => ({
        ...prev,
        [appointmentId]: (response.reminders || []).sort(
          (a, b) => new Date(a.scheduled_for || 0).getTime() - new Date(b.scheduled_for || 0).getTime()
        )
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminder timeline.')
    }
  }

  const toggleDetails = (appointmentId: string) => {
    if (expandedId === appointmentId) {
      setExpandedId(null)
      return
    }
    setExpandedId(appointmentId)
    if (!remindersByAppointment[appointmentId]) {
      void loadReminderTimeline(appointmentId)
    }
  }

  const renderCard = (appointment: DashboardAppointmentRow) => {
    const badge = appointmentBadge(appointment)
    const lastReminderStatus = normalizeReminderOutcome(appointment.last_reminder_outcome?.status)
    const isExpanded = expandedId === appointment.id
    const timelineRows = remindersByAppointment[appointment.id] || []

    return (
      <div key={appointment.id} id={`appt-card-${appointment.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Card header */}
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-slate-900">{appointment.lead?.name || 'Unknown'}</p>
              <p className="mt-0.5 text-xs text-slate-500">{appointment.listing?.address || 'No listing attached'}</p>
              <p className="mt-1 text-xs font-medium text-slate-700">{formatDateTime(appointment.startsAt || appointment.startIso)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>

          {lastReminderStatus && (
            <p className="mt-2 text-[11px] text-slate-400">
              Last reminder:{' '}
              <span className="font-medium text-slate-500">
                {lastReminderStatus} · {formatDateTime(appointment.last_reminder_outcome?.scheduled_for)}
              </span>
            </p>
          )}

          {/* Action row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCallLead(appointment)}
              disabled={!appointment.lead?.phone}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              📞 Call
            </button>

            {normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status) !== 'confirmed' && (
              <button
                type="button"
                onClick={() => void handleMarkConfirmed(appointment)}
                disabled={workingId === appointment.id}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60"
              >
                ✓ Confirm
              </button>
            )}

            {normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status) === 'reschedule_requested' && (
              <button
                type="button"
                onClick={() => void handleReschedule(appointment)}
                disabled={workingId === appointment.id}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60"
              >
                ↻ Reschedule
              </button>
            )}

            {(lastReminderStatus === 'failed' || lastReminderStatus === 'no_answer') && (
              <button
                type="button"
                onClick={() => {
                  if (remindersLocked) { setUpgradeModalOpen(true); return }
                  void handleRetryReminder(appointment)
                }}
                disabled={workingId === appointment.id}
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
              >
                ↩ Retry reminder
              </button>
            )}

            {/* Inline cancel confirm */}
            {cancelConfirmId === appointment.id ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleCancelAppointment(appointment)}
                  disabled={workingId === appointment.id}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  Confirm cancel
                </button>
                <button
                  type="button"
                  onClick={() => setCancelConfirmId(null)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCancelConfirmId(appointment.id)}
                disabled={workingId === appointment.id}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            )}

            {/* Details toggle — rightmost, always last */}
            <button
              type="button"
              onClick={() => toggleDetails(appointment.id)}
              className={`ml-auto rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isExpanded
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {isExpanded ? 'Hide details ▴' : 'Details ▾'}
            </button>
          </div>
        </div>

        {/* Inline reminder timeline — only visible when expanded */}
        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Reminder Timeline</p>

            {timelineRows.length === 0 ? (
              <p className="text-sm text-slate-500">No reminder schedule yet.</p>
            ) : (
              <div className="space-y-2">
                {timelineRows.map((row) => {
                  const providerOutcome =
                    row.provider_response && typeof row.provider_response.outcome === 'string'
                      ? row.provider_response.outcome
                      : ''
                  const outcome = normalizeReminderOutcome(row.normalized_outcome || providerOutcome || row.status)
                  const canRetry = outcome === 'failed' || outcome === 'no_answer'
                  const outcomeColor =
                    outcome === 'confirmed'
                      ? 'text-emerald-600'
                      : outcome === 'failed' || outcome === 'no_answer'
                        ? 'text-rose-600'
                        : outcome === 'reschedule_requested'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                  return (
                    <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                          {row.reminder_type}
                          <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">·</span>
                          <span className={`ml-2 font-medium normal-case tracking-normal ${outcomeColor}`}>{row.status}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(row.scheduled_for)}</p>
                        {outcome && outcome !== row.status && (
                          <p className={`mt-0.5 text-[11px] font-medium ${outcomeColor}`}>Outcome: {outcome}</p>
                        )}
                      </div>
                      {canRetry && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (remindersLocked) { setUpgradeModalOpen(true); return }
                            setWorkingId(row.id)
                            setError(null)
                            try {
                              await retryAppointmentReminder(appointment.id, row.id)
                              await logAction(appointment.lead?.id, 'appointment_updated', {
                                appointment_id: appointment.id,
                                reminder_id: row.id,
                                retry: true
                              })
                              await loadReminderTimeline(appointment.id)
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to retry reminder.')
                            } finally {
                              setWorkingId(null)
                            }
                          }}
                          disabled={workingId === row.id}
                          className="shrink-0 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Timeline actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (remindersLocked) { setUpgradeModalOpen(true); return }
                  setWorkingId(appointment.id)
                  setError(null)
                  try {
                    await sendAppointmentReminderNow(appointment.id)
                    await logAction(appointment.lead?.id, 'appointment_updated', {
                      appointment_id: appointment.id,
                      send_now: true
                    })
                    await loadReminderTimeline(appointment.id)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to send reminder now.')
                  } finally {
                    setWorkingId(null)
                  }
                }}
                disabled={workingId === appointment.id}
                className="rounded-lg border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-60"
              >
                Send reminder now
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (remindersLocked) { setUpgradeModalOpen(true); return }
                  setWorkingId(appointment.id)
                  setError(null)
                  try {
                    await disableAppointmentReminders(appointment.id)
                    await logAction(appointment.lead?.id, 'appointment_updated', {
                      appointment_id: appointment.id,
                      reminders_disabled: true
                    })
                    await loadReminderTimeline(appointment.id)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to disable reminders.')
                  } finally {
                    setWorkingId(null)
                  }
                }}
                disabled={workingId === appointment.id}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Turn reminders off
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="mt-1 text-sm text-slate-500">Confirm showings, reduce no-shows, and handle reschedules fast.</p>
        </div>
        <button
          type="button"
          onClick={() => setNewApptOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <span className="text-base leading-none">+</span>
          New Appointment
        </button>
      </div>

      {/* Upgrade / usage banners */}
      {remindersLocked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Paid
            </span>
            <p className="text-sm font-semibold text-indigo-900">Upgrade to unlock appointment reminder texts.</p>
          </div>
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Upgrade plan
          </button>
        </div>
      )}

      {reminderUsageWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">You're approaching your SMS limit.</p>
          <p className="mt-0.5 text-xs text-amber-700">{reminderUsageWarning} · Upgrade to keep reminders running.</p>
        </div>
      )}

      {/* Loading / error / empty states */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400 shadow-sm">
          Loading appointments…
        </div>
      )}
      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}
      {!loading && !error && allAppointments.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">No upcoming appointments</p>
          <p className="mt-1 text-sm text-slate-500">When you set a showing, reminders and updates appear here.</p>
        </div>
      )}

      {/* Appointment sections */}
      {!loading && !error && allAppointments.length > 0 && (
        <>
          {/* Needs confirmation — only shows when there are items in the next 24h */}
          {needsConfirmation.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <h2 className="text-sm font-semibold text-slate-700">Needs confirmation · next 24 hours</h2>
              </div>
              {needsConfirmation.map(renderCard)}
            </div>
          )}

          {/* Needs attention */}
          {needsAttention.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <h2 className="text-sm font-semibold text-slate-700">Needs attention</h2>
              </div>
              {needsAttention.map(renderCard)}
            </div>
          )}

          {/* Confirmed */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-700">Confirmed</h2>
            </div>
            {confirmed.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400 shadow-sm">
                No confirmed appointments yet.
              </div>
            ) : (
              confirmed.map(renderCard)
            )}
          </div>

          {/* All upcoming (deduplicated from above sections for reference) */}
          {allAppointments.some(
            (a) =>
              !needsConfirmation.includes(a) &&
              !needsAttention.includes(a) &&
              normalizeAppointmentStatus(a.normalizedStatus || a.status) !== 'confirmed'
          ) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <h2 className="text-sm font-semibold text-slate-700">All upcoming</h2>
              </div>
              {allAppointments
                .filter(
                  (a) =>
                    !needsConfirmation.includes(a) &&
                    !needsAttention.includes(a) &&
                    normalizeAppointmentStatus(a.normalizedStatus || a.status) !== 'confirmed'
                )
                .map(renderCard)}
            </div>
          )}
        </>
      )}

      {/* Schedule modal */}
      {newApptOpen && (
        <ScheduleAppointmentModal
          lead={null}
          onClose={() => setNewApptOpen(false)}
          onSchedule={async (data: ScheduleAppointmentFormData) => {
            if (schedulingAppt) return
            setSchedulingAppt(true)
            try {
              await scheduleAppointment({
                name: data.name,
                email: data.email,
                phone: data.phone,
                date: data.date,
                time: data.time,
                message: data.message,
                kind: data.kind || 'Consultation',
                remindAgent: data.remindAgent,
                remindClient: data.remindClient,
                agentReminderMinutes: data.agentReminderMinutes,
                clientReminderMinutes: data.clientReminderMinutes,
              })
              setNewApptOpen(false)
              toast.success('Appointment scheduled!')
              const response = await fetchDashboardAppointments({ view: 'week' })
              setInitialAppointments(response.appointments || [])
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to schedule appointment.')
            } finally {
              setSchedulingAppt(false)
            }
          }}
        />
      )}

      <UpgradePromptModal
        isOpen={upgradeModalOpen}
        title="You're at your limit."
        body="Upgrade to keep capturing leads and sending reports without interruptions."
        reasonLine="Starter includes 50 SMS each month. Pro includes 250."
        allowPromoCode
        upgrading={upgradeLoading}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgrade={(promoCode) => {
          void (async () => {
            try {
              setUpgradeLoading(true)
              const checkout = await createBillingCheckoutSession('pro', promoCode)
              if (!checkout.url) throw new Error('Missing checkout URL')
              window.location.href = checkout.url
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to start checkout.')
            } finally {
              setUpgradeLoading(false)
            }
          })()
        }}
      />
    </div>
  )
}

export default AppointmentsCommandPage
