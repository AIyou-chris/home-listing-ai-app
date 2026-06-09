import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { buildApiUrl } from '../../lib/api'
import { supabase } from '../../services/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type MeetingKind = 'Consultation' | 'Coffee Meeting' | 'Borrower Call' | 'Agent Check-in'

const MEETING_KINDS: MeetingKind[] = [
  'Consultation',
  'Coffee Meeting',
  'Borrower Call',
  'Agent Check-in',
]

const KIND_COLORS: Record<MeetingKind, string> = {
  'Consultation':    'bg-primary-100 text-primary-700 border border-primary-200',
  'Coffee Meeting':  'bg-amber-100 text-amber-700 border border-amber-200',
  'Borrower Call':   'bg-sky-100 text-sky-700 border border-sky-200',
  'Agent Check-in':  'bg-emerald-100 text-emerald-700 border border-emerald-200',
}

const KIND_ICONS: Record<MeetingKind, string> = {
  'Consultation':    'person',
  'Coffee Meeting':  'coffee',
  'Borrower Call':   'call',
  'Agent Check-in':  'handshake',
}

interface LOAppointment {
  id: string
  type: MeetingKind
  leadName: string
  email: string
  phone: string
  date: string       // YYYY-MM-DD
  time: string       // human label, e.g. "2:00 PM"
  startIso: string | null
  location: string
  notes: string
  status: string     // scheduled | confirmed | completed | canceled
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)

const startOfWeek = () => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

const endOfWeek = () => {
  const d = new Date()
  d.setDate(d.getDate() + (6 - d.getDay()))
  return d.toISOString().slice(0, 10)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const formatTime = (appt: LOAppointment): string => {
  if (appt.time) return appt.time
  if (appt.startIso) {
    return new Date(appt.startIso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  return ''
}

const normalizeKind = (raw: string): MeetingKind => {
  if (MEETING_KINDS.includes(raw as MeetingKind)) return raw as MeetingKind
  return 'Consultation'
}

// ─── Inline modal ─────────────────────────────────────────────────────────────

interface ScheduleFormState {
  name: string
  email: string
  phone: string
  kind: MeetingKind
  date: string
  time: string
  location: string
  notes: string
}

const EMPTY_FORM: ScheduleFormState = {
  name: '',
  email: '',
  phone: '',
  kind: 'Consultation',
  date: '',
  time: '',
  location: '',
  notes: '',
}

interface ScheduleModalProps {
  onClose: () => void
  onSave: (form: ScheduleFormState) => Promise<void>
  saving: boolean
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ onClose, onSave, saving }) => {
  const [form, setForm] = useState<ScheduleFormState>({ ...EMPTY_FORM })
  const ref = useRef<HTMLDivElement>(null)

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) onClose()
  }

  const set = (field: keyof ScheduleFormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Contact name is required'); return }
    if (!form.date) { toast.error('Date is required'); return }
    await onSave(form)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdrop}
    >
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Schedule Meeting</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Meeting type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Type</label>
            <div className="grid grid-cols-2 gap-2">
              {MEETING_KINDS.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('kind', k)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    form.kind === k
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{KIND_ICONS[k]}</span>
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Contact name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contact Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => set('time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location / Meet Link</label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Office, Zoom link, coffee shop…"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Agenda, talking points, context…"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-60"
            >
              {saving ? 'Scheduling…' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Appointment card ─────────────────────────────────────────────────────────

interface AppointmentCardProps {
  appt: LOAppointment
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  cancelConfirmId: string | null
  setCancelConfirmId: (id: string | null) => void
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appt,
  onComplete,
  onCancel,
  cancelConfirmId,
  setCancelConfirmId,
}) => {
  const kindColor = KIND_COLORS[appt.type] ?? 'bg-slate-100 text-slate-600 border border-slate-200'
  const kindIcon  = KIND_ICONS[appt.type]  ?? 'event'
  const timeLabel = formatTime(appt)
  const isCompleted = appt.status === 'completed'
  const isCanceled  = appt.status === 'canceled' || appt.status === 'cancelled'

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3 transition-opacity ${
      isCompleted || isCanceled ? 'opacity-60' : ''
    }`}>
      {/* Top row: name + type badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800 text-sm leading-snug">{appt.leadName || '—'}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatDate(appt.date)}{timeLabel ? ` · ${timeLabel}` : ''}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${kindColor}`}>
          <span className="material-symbols-outlined text-xs">{kindIcon}</span>
          {appt.type}
        </span>
      </div>

      {/* Location */}
      {appt.location && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
          <span className="truncate">{appt.location}</span>
        </div>
      )}

      {/* Notes */}
      {appt.notes && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 line-clamp-2">
          {appt.notes}
        </p>
      )}

      {/* Status badge for terminal states */}
      {(isCompleted || isCanceled) && (
        <span className={`self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isCompleted
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            : 'bg-slate-100 text-slate-500 border border-slate-200'
        }`}>
          <span className="material-symbols-outlined text-xs">
            {isCompleted ? 'check_circle' : 'cancel'}
          </span>
          {isCompleted ? 'Completed' : 'Canceled'}
        </span>
      )}

      {/* Actions — only for active appointments */}
      {!isCompleted && !isCanceled && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          {/* Call */}
          {appt.phone && (
            <a
              href={`tel:${appt.phone}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call
            </a>
          )}
          {/* Email */}
          {appt.email && (
            <a
              href={`mailto:${appt.email}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">mail</span>
              Email
            </a>
          )}

          <div className="ml-auto flex items-center gap-1">
            {/* Complete */}
            <button
              onClick={() => onComplete(appt.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Done
            </button>

            {/* Cancel — with inline confirm */}
            {cancelConfirmId === appt.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onCancel(appt.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                >
                  Cancel meeting
                </button>
                <button
                  onClick={() => setCancelConfirmId(null)}
                  className="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCancelConfirmId(appt.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}> = ({ title, count, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 mb-3 group"
      >
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
          {count}
        </span>
        <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {open && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LOAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<LOAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const r = await fetch(buildApiUrl('/api/appointments'), {
        headers: { 'x-user-id': user.id },
      })
      if (!r.ok) return
      const data = await r.json() as { appointments?: LOAppointment[] }
      const raw = data.appointments || []
      // Only show LO-relevant meeting kinds — filter out agent-specific types if needed
      const mapped: LOAppointment[] = raw.map(a => ({
        ...a,
        type: normalizeKind(a.type ?? (a as unknown as { kind?: string }).kind ?? 'Consultation'),
      }))
      setAppointments(mapped)
    } catch {
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  // ── Schedule ──────────────────────────────────────────────────────────────

  const handleSchedule = async (form: ScheduleFormState) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Build startIso if we have date + time
      let startIso: string | undefined
      if (form.date && form.time) {
        startIso = new Date(`${form.date}T${form.time}`).toISOString()
      }

      // Format time for display label
      let timeLabel = ''
      if (form.time) {
        const [h, m] = form.time.split(':').map(Number)
        const d = new Date()
        d.setHours(h, m)
        timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }

      const r = await fetch(buildApiUrl('/api/appointments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          kind:      form.kind,
          name:      form.name,
          email:     form.email,
          phone:     form.phone,
          date:      form.date,
          time:      form.time,
          timeLabel,
          startIso,
          location:  form.location,
          notes:     form.notes,
          status:    'scheduled',
          remindAgent:  false,
          remindClient: false,
          userId:    user.id,
        }),
      })
      if (!r.ok) throw new Error('Failed to create appointment')
      toast.success('Meeting scheduled!')
      setShowModal(false)
      await load()
    } catch {
      toast.error('Failed to schedule meeting')
    } finally {
      setSaving(false)
    }
  }

  // ── Complete ──────────────────────────────────────────────────────────────

  const handleComplete = async (id: string) => {
    try {
      const r = await fetch(buildApiUrl(`/api/appointments/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!r.ok) throw new Error()
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'completed' } : a)
      )
      toast.success('Marked as completed')
    } catch {
      toast.error('Failed to update appointment')
    }
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  const handleCancel = async (id: string) => {
    setCancelConfirmId(null)
    try {
      const r = await fetch(buildApiUrl(`/api/appointments/${id}`), {
        method: 'DELETE',
      })
      if (!r.ok) throw new Error()
      setAppointments(prev => prev.filter(a => a.id !== id))
      toast.success('Meeting canceled')
    } catch {
      toast.error('Failed to cancel meeting')
    }
  }

  // ── Bucketing ─────────────────────────────────────────────────────────────

  const todayStr    = today()
  const weekStart   = startOfWeek()
  const weekEnd     = endOfWeek()

  const active = appointments.filter(a => a.status !== 'completed' && a.status !== 'canceled' && a.status !== 'cancelled')
  const done   = appointments.filter(a => a.status === 'completed' || a.status === 'canceled' || a.status === 'cancelled')

  const todayAppts    = active.filter(a => a.date === todayStr)
  const thisWeekAppts = active.filter(a => a.date > todayStr && a.date >= weekStart && a.date <= weekEnd)
  const upcomingAppts = active.filter(a => a.date > weekEnd)

  const hasAny = active.length > 0 || done.length > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
            <p className="text-sm text-slate-500 mt-1">Consultations, calls, and meetings with agents &amp; borrowers</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Schedule Meeting
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined text-3xl text-slate-300 animate-spin">progress_activity</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasAny && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="material-symbols-outlined text-5xl text-slate-200">calendar_today</span>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-600">No meetings yet</p>
              <p className="text-sm text-slate-400 mt-1">Schedule your first consultation, call, or agent check-in</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-sm"
            >
              Schedule Meeting
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && hasAny && (
          <>
            {/* Today */}
            {todayAppts.length > 0 && (
              <Section title="Today" count={todayAppts.length} defaultOpen>
                {todayAppts.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    cancelConfirmId={cancelConfirmId}
                    setCancelConfirmId={setCancelConfirmId}
                  />
                ))}
              </Section>
            )}

            {/* This week */}
            {thisWeekAppts.length > 0 && (
              <Section title="This Week" count={thisWeekAppts.length} defaultOpen>
                {thisWeekAppts.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    cancelConfirmId={cancelConfirmId}
                    setCancelConfirmId={setCancelConfirmId}
                  />
                ))}
              </Section>
            )}

            {/* Upcoming */}
            {upcomingAppts.length > 0 && (
              <Section title="Upcoming" count={upcomingAppts.length} defaultOpen={false}>
                {upcomingAppts.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    cancelConfirmId={cancelConfirmId}
                    setCancelConfirmId={setCancelConfirmId}
                  />
                ))}
              </Section>
            )}

            {/* No upcoming but has active — all today */}
            {active.length > 0 && todayAppts.length === 0 && thisWeekAppts.length === 0 && upcomingAppts.length === 0 && (
              <Section title="All Meetings" count={active.length} defaultOpen>
                {active.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    cancelConfirmId={cancelConfirmId}
                    setCancelConfirmId={setCancelConfirmId}
                  />
                ))}
              </Section>
            )}

            {/* Completed / Canceled */}
            {done.length > 0 && (
              <Section title="Past Meetings" count={done.length} defaultOpen={false}>
                {done.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    cancelConfirmId={cancelConfirmId}
                    setCancelConfirmId={setCancelConfirmId}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>

      {/* Schedule modal */}
      {showModal && (
        <ScheduleModal
          onClose={() => setShowModal(false)}
          onSave={handleSchedule}
          saving={saving}
        />
      )}
    </div>
  )
}

export default LOAppointmentsPage
