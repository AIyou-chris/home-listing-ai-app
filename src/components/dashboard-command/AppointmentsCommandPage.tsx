import React, { useEffect, useMemo, useState } from 'react'
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
    return {
      label: 'Reschedule requested',
      className: 'bg-amber-100 text-amber-700 border border-amber-200'
    }
  }
  if (lastOutcome === 'failed') {
    return {
      label: 'Reminder failed',
      className: 'bg-rose-100 text-rose-700 border border-rose-200'
    }
  }
  if (status === 'confirmed') {
    return {
      label: 'Confirmed',
      className: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    }
  }
  return {
    label: 'Needs confirmation',
    className: 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

const sortByStartAsc = (appointments: DashboardAppointmentRow[]) =>
  [...appointments].sort(
    (a, b) => new Date(a.startsAt || a.startIso || 0).getTime() - new Date(b.startsAt || b.startIso || 0).getTime()
  )

const AppointmentsCommandPage: React.FC = () => {
  const appointmentsById = useDashboardRealtimeStore((state) => state.appointmentsById)
  const setInitialAppointments = useDashboardRealtimeStore((state) => state.setInitialAppointments)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [remindersByAppointment, setRemindersByAppointment] = useState<Record<string, AppointmentReminderRow[]>>({})
  const [planId, setPlanId] = useState<PlanId>('free')
  const [reminderUsageWarning, setReminderUsageWarning] = useState<string | null>(null)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [response, billing] = await Promise.all([
          fetchDashboardAppointments({ view: 'week' }),
          fetchDashboardBilling().catch(() => null)
        ])
        setInitialAppointments(response.appointments || [])
        if (billing?.plan?.id) setPlanId(billing.plan.id)
        const reminderMeter = billing?.usage?.reminder_calls_per_month
        const warning = (billing?.warnings || []).find(
          (item) => item.key === 'reminder_calls_per_month' && Number(item.percent || 0) >= 80 && Number(item.percent || 0) < 100
        )
        if (warning && reminderMeter) {
          setReminderUsageWarning(
            `Reminder calls: ${Number(reminderMeter.used || 0)}/${Number(reminderMeter.limit || 0)} used`
          )
        } else {
          setReminderUsageWarning(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointments.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [setInitialAppointments])

  const allAppointments = useMemo(
    () =>
      sortByStartAsc(
        Object.values(appointmentsById).filter((appointment) => Boolean(appointment.startsAt || appointment.startIso))
      ),
    [appointmentsById]
  )

  const now = Date.now()
  const next24h = now + 24 * 60 * 60 * 1000

  const needsConfirmation = useMemo(
    () =>
      allAppointments.filter((appointment) => {
        const startsAt = new Date(appointment.startsAt || appointment.startIso || '').getTime()
        if (!Number.isFinite(startsAt) || startsAt < now || startsAt > next24h) return false
        return normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status) !== 'confirmed'
      }),
    [allAppointments, now, next24h]
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

  useEffect(() => {
    if (selectedAppointmentId) return
    const fallback = needsConfirmation[0] || needsAttention[0] || allAppointments[0] || null
    setSelectedAppointmentId(fallback?.id || null)
  }, [selectedAppointmentId, needsConfirmation, needsAttention, allAppointments])

  const selectedAppointment = selectedAppointmentId ? appointmentsById[selectedAppointmentId] : null

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

  useEffect(() => {
    if (!selectedAppointmentId) return
    if (remindersByAppointment[selectedAppointmentId]) return
    void loadReminderTimeline(selectedAppointmentId)
  }, [selectedAppointmentId, remindersByAppointment])

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

  const handleRetryReminder = async (appointment: DashboardAppointmentRow) => {
    setWorkingId(appointment.id)
    setError(null)
    try {
      await retryDashboardReminder(appointment.id)
      await logAction(appointment.lead?.id, 'appointment_updated', { appointment_id: appointment.id, retry: true })
      await loadReminderTimeline(appointment.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry reminder.')
    } finally {
      setWorkingId(null)
    }
  }

  const timelineRows = selectedAppointmentId ? remindersByAppointment[selectedAppointmentId] || [] : []
  const remindersLocked = planId !== 'pro'

  const renderCard = (appointment: DashboardAppointmentRow) => {
    const badge = appointmentBadge(appointment)
    const lastReminderStatus = normalizeReminderOutcome(appointment.last_reminder_outcome?.status)

    return (
      <article key={appointment.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-900">{appointment.lead?.name || 'Unknown'}</p>
            <p className="text-xs text-slate-500">{appointment.listing?.address || 'No listing attached'}</p>
            <p className="mt-1 text-xs text-slate-500">{formatDateTime(appointment.startsAt || appointment.startIso)}</p>
            <p className="mt-1 text-xs text-slate-500">
              Last reminder: {lastReminderStatus ? `${lastReminderStatus} • ${formatDateTime(appointment.last_reminder_outcome?.scheduled_for)}` : 'No reminders yet'}
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCallLead(appointment)}
            disabled={!appointment.lead?.phone}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Call lead
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedAppointmentId(appointment.id)
              void loadReminderTimeline(appointment.id)
            }}
            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => void handleMarkConfirmed(appointment)}
            disabled={workingId === appointment.id}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
          >
            Mark confirmed
          </button>
          {(lastReminderStatus === 'failed' || lastReminderStatus === 'no_answer') && (
            <button
              type="button"
              onClick={() => {
                if (remindersLocked) {
                  setUpgradeModalOpen(true)
                  return
                }
                void handleRetryReminder(appointment)
              }}
              disabled={workingId === appointment.id}
              className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 disabled:opacity-60"
            >
              Retry reminder
            </button>
          )}
          {normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status) === 'reschedule_requested' && (
            <button
              type="button"
              onClick={() => void handleReschedule(appointment)}
              disabled={workingId === appointment.id}
              className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800"
            >
              Reschedule
            </button>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
        <p className="mt-1 text-sm text-slate-600">Confirm showings, reduce no-shows, and handle reschedules fast.</p>
      </div>
      {remindersLocked ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-700 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              PRO
            </span>
            <p className="font-semibold">Pro feature — includes appointment reminder calls.</p>
          </div>
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="mt-2 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700"
          >
            Upgrade now
          </button>
        </div>
      ) : null}
      {reminderUsageWarning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">You’re close to your limit.</p>
          <p>Upgrade to keep everything running without interruptions.</p>
          <p className="mt-1 text-xs">{reminderUsageWarning}</p>
        </div>
      ) : null}

      {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading appointments...</div>}
      {!loading && error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {!loading && !error && allAppointments.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <p className="text-base font-semibold text-slate-900">No upcoming appointments.</p>
          <p className="mt-1">When you set a showing, reminders and updates appear here.</p>
        </div>
      )}

      {!loading && !error && allAppointments.length > 0 && (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Needs confirmation</h2>
            </div>
            {needsConfirmation.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Nothing awaiting confirmation in the next 24 hours.</div>
            ) : (
              needsConfirmation.map(renderCard)
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Confirmed</h2>
            </div>
            {confirmed.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No confirmed appointments yet.</div>
            ) : (
              confirmed.map(renderCard)
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Needs attention</h2>
            </div>
            {needsAttention.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Nothing urgent right now.</div>
            ) : (
              needsAttention.map(renderCard)
            )}
          </section>
        </>
      )}

      {selectedAppointment && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Reminder Timeline</h2>
              <p className="text-xs text-slate-500">
                {selectedAppointment.lead?.name || 'Unknown'} • {selectedAppointment.listing?.address || 'No listing attached'}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {formatDateTime(selectedAppointment.startsAt || selectedAppointment.startIso)}
            </span>
          </div>

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
                return (
                  <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.reminder_type.toUpperCase()} • {row.status}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(row.scheduled_for)}</p>
                        {outcome && <p className="mt-1 text-xs text-slate-600">Outcome: {outcome}</p>}
                      </div>
                      {canRetry && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (remindersLocked) {
                              setUpgradeModalOpen(true)
                              return
                            }
                            setWorkingId(row.id)
                            setError(null)
                            try {
                              await retryAppointmentReminder(selectedAppointment.id, row.id)
                              await logAction(selectedAppointment.lead?.id, 'appointment_updated', {
                                appointment_id: selectedAppointment.id,
                                reminder_id: row.id,
                                retry: true
                              })
                              await loadReminderTimeline(selectedAppointment.id)
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to retry reminder.')
                            } finally {
                              setWorkingId(null)
                            }
                          }}
                          disabled={workingId === row.id}
                          className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 disabled:opacity-60"
                        >
                          Retry reminder
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                if (remindersLocked) {
                  setUpgradeModalOpen(true)
                  return
                }
                setWorkingId(selectedAppointment.id)
                setError(null)
                try {
                  await sendAppointmentReminderNow(selectedAppointment.id)
                  await logAction(selectedAppointment.lead?.id, 'appointment_updated', {
                    appointment_id: selectedAppointment.id,
                    send_now: true
                  })
                  await loadReminderTimeline(selectedAppointment.id)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to send reminder now.')
                } finally {
                  setWorkingId(null)
                }
              }}
              disabled={workingId === selectedAppointment.id}
              className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-60"
            >
              Send now
            </button>
            <button
              type="button"
              onClick={async () => {
                if (remindersLocked) {
                  setUpgradeModalOpen(true)
                  return
                }
                setWorkingId(selectedAppointment.id)
                setError(null)
                try {
                  await disableAppointmentReminders(selectedAppointment.id)
                  await logAction(selectedAppointment.lead?.id, 'appointment_updated', {
                    appointment_id: selectedAppointment.id,
                    reminders_disabled: true
                  })
                  await loadReminderTimeline(selectedAppointment.id)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to disable reminders.')
                } finally {
                  setWorkingId(null)
                }
              }}
              disabled={workingId === selectedAppointment.id}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              Turn reminders off
            </button>
          </div>
        </section>
      )}
      <UpgradePromptModal
        isOpen={upgradeModalOpen}
        title="You’re at your limit."
        body="Upgrade to keep capturing leads and sending reports without interruptions."
        reasonLine="Reminder calls are included in Pro."
        upgrading={upgradeLoading}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgrade={() => {
          void (async () => {
            try {
              setUpgradeLoading(true)
              const checkout = await createBillingCheckoutSession('pro')
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
