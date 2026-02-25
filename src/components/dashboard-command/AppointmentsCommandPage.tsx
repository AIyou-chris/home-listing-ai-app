import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchDashboardAppointments,
  logDashboardAgentAction,
  retryDashboardReminder,
  updateAppointmentStatus,
  type DashboardAppointmentRow
} from '../../services/dashboardCommandService'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

const isSameCalendarDay = (dateValue: string, targetDate: Date) => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return false
  return (
    date.getFullYear() === targetDate.getFullYear() &&
    date.getMonth() === targetDate.getMonth() &&
    date.getDate() === targetDate.getDate()
  )
}

const isWithinWeek = (dateValue: string, fromDate: Date) => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return false
  const end = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  return date >= fromDate && date <= end
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

const appointmentBadge = (appointment: DashboardAppointmentRow) => {
  const status = normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status)
  if (status === 'confirmed') {
    return {
      label: 'Confirmed',
      className: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    }
  }
  if (status === 'reschedule_requested') {
    return {
      label: 'Reschedule requested',
      className: 'bg-amber-100 text-amber-700 border border-amber-200'
    }
  }
  return {
    label: 'Needs confirmation',
    className: 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

const AppointmentsCommandPage: React.FC = () => {
  const navigate = useNavigate()
  const appointmentsById = useDashboardRealtimeStore((state) => state.appointmentsById)
  const setInitialAppointments = useDashboardRealtimeStore((state) => state.setInitialAppointments)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'today' | 'week'>('today')
  const [workingId, setWorkingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchDashboardAppointments({ view: 'week' })
        setInitialAppointments(response.appointments || [])
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
      Object.values(appointmentsById)
        .filter((appointment) => Boolean(appointment.startsAt || appointment.startIso))
        .sort((a, b) => new Date(a.startsAt || a.startIso || 0).getTime() - new Date(b.startsAt || b.startIso || 0).getTime()),
    [appointmentsById]
  )

  const now = new Date()
  const upcomingAppointments = useMemo(() => {
    return allAppointments.filter((appointment) => {
      const startsAt = appointment.startsAt || appointment.startIso
      if (!startsAt) return false
      if (tab === 'today') return isSameCalendarDay(startsAt, now)
      return isWithinWeek(startsAt, now)
    })
  }, [allAppointments, tab, now])

  const needsAttention = useMemo(
    () =>
      allAppointments.filter((appointment) => {
        const status = normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status)
        const lastOutcome = String(appointment.last_reminder_outcome?.status || '').toLowerCase()
        return status === 'reschedule_requested' || lastOutcome === 'failed'
      }),
    [allAppointments]
  )

  const logAction = async (leadId: string | null | undefined, action: 'call_clicked' | 'email_clicked' | 'status_changed' | 'appointment_created' | 'appointment_updated', metadata?: Record<string, unknown>) => {
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

  const handleRetryReminder = async (appointment: DashboardAppointmentRow) => {
    setWorkingId(appointment.id)
    setError(null)
    try {
      await retryDashboardReminder(appointment.id)
      await logAction(appointment.lead?.id, 'appointment_updated', { appointment_id: appointment.id, retry: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry reminder.')
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

  const openAppointment = (appointment: DashboardAppointmentRow) => {
    if (appointment.lead?.id) {
      navigate(`/dashboard/leads/${appointment.lead.id}`)
      return
    }
    navigate('/dashboard/leads')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
        <p className="mt-1 text-sm text-slate-600">Upcoming showings and confirmations—so you waste less time.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('today')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tab === 'today' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setTab('week')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tab === 'week' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
          >
            This Week
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading appointments...</div>}
        {!loading && error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {!loading && !error && upcomingAppointments.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            <p className="text-base font-semibold text-slate-900">No upcoming appointments.</p>
            <p className="mt-1">When you set a showing, reminders and updates appear here.</p>
          </div>
        )}

        {!loading && !error && upcomingAppointments.map((appointment) => {
          const badge = appointmentBadge(appointment)
          return (
            <article key={appointment.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{appointment.lead?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{appointment.listing?.address || 'No listing attached'}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(appointment.startsAt || appointment.startIso)}</p>
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
                  onClick={() => openAppointment(appointment)}
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
              </div>
            </article>
          )
        })}
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-amber-900">Needs attention</h2>
          <p className="text-xs text-amber-700">Reschedule and failed reminder outcomes show up here in real time.</p>
        </div>

        {needsAttention.length === 0 ? (
          <p className="text-sm text-amber-800">Nothing urgent right now.</p>
        ) : (
          <div className="space-y-2">
            {needsAttention.map((appointment) => (
              <div key={`attention-${appointment.id}`} className="rounded-lg border border-amber-200 bg-white px-3 py-3">
                <p className="text-sm font-semibold text-slate-900">{appointment.lead?.name || 'Unknown'} • {appointment.listing?.address || 'No listing'}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(appointment.startsAt || appointment.startIso)}</p>
                <p className="mt-1 text-xs text-amber-700">
                  {normalizeAppointmentStatus(appointment.normalizedStatus || appointment.status) === 'reschedule_requested'
                    ? 'Reschedule requested'
                    : 'Reminder failed'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
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
                    onClick={() => void handleReschedule(appointment)}
                    disabled={workingId === appointment.id}
                    className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRetryReminder(appointment)}
                    disabled={workingId === appointment.id}
                    className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 disabled:opacity-60"
                  >
                    Retry reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => openAppointment(appointment)}
                    className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default AppointmentsCommandPage
