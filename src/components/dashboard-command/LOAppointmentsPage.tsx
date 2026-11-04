import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageGuide from './PageGuide';
import toast from 'react-hot-toast'
import { buildApiUrl } from '../../lib/api'
import { authHeaders } from '../../services/dashboard/utils';
import { supabase } from '../../services/supabase'
import { LoPageHeader, LoTag, LoIcon, LoIconTile, loCard, loSolid, loGhost, loInput } from './loUi'

// Every appointment call must carry the login token: the API is owner-scoped now.
const apiHeaders = async (json = false): Promise<HeadersInit> => {
  const headers = await authHeaders(null) as Record<string, string>
  if (!json) delete headers['Content-Type']
  return headers
}

// ─── Types ───────────────────────────────────────────────────────────────────

type MeetingKind = 'Consultation' | 'Coffee Meeting' | 'Borrower Call' | 'Agent Check-in'

const MEETING_KINDS: MeetingKind[] = [
  'Consultation',
  'Coffee Meeting',
  'Borrower Call',
  'Agent Check-in',
]

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

// Local calendar dates. toISOString() is UTC, which flips to "tomorrow" every evening in the US.
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const today = () => localDate(new Date())

const startOfWeek = () => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return localDate(d)
}

const endOfWeek = () => {
  const d = new Date()
  d.setDate(d.getDate() + (6 - d.getDay()))
  return localDate(d)
}

// Soonest first: by date, then by start time.
const byWhen = (a: LOAppointment, b: LOAppointment) =>
  `${a.date} ${a.startIso ? new Date(a.startIso).toTimeString().slice(0, 5) : '99:99'}`.localeCompare(
    `${b.date} ${b.startIso ? new Date(b.startIso).toTimeString().slice(0, 5) : '99:99'}`)

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
  remindMe: boolean
  remindThem: boolean
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
  remindMe: true,
  remindThem: true,
}

interface ScheduleModalProps {
  onClose: () => void
  onSave: (form: ScheduleFormState) => Promise<void>
  saving: boolean
  initial?: Partial<ScheduleFormState>
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ onClose, onSave, saving, initial }) => {
  const [form, setForm] = useState<ScheduleFormState>({ ...EMPTY_FORM, ...initial })
  const ref = useRef<HTMLDivElement>(null)

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    // A stray click outside must not throw away a half-filled form.
    const touched = Boolean(form.name || form.email || form.phone || form.notes || form.location)
    if (!touched && ref.current && !ref.current.contains(e.target as Node)) onClose()
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-title"
    >
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <LoIconTile name="event" tone="blue" />
            <h2 id="schedule-title" className="text-lg font-extrabold text-slate-900">Schedule Meeting</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Meeting type */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Meeting Type</label>
            <div className="grid grid-cols-2 gap-2">
              {MEETING_KINDS.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('kind', k)}
                  className={`flex min-h-[44px] items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
                    form.kind === k
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-slate-300 text-slate-700 hover:border-slate-400'
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
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Contact Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Full name"
              className={`${loInput} min-h-[44px]`}
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@example.com"
                className={`${loInput} min-h-[44px]`}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 000-0000"
                className={`${loInput} min-h-[44px]`}
              />
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className={`${loInput} min-h-[44px]`}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => set('time', e.target.value)}
                className={`${loInput} min-h-[44px]`}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Location / Meet Link</label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Office, Zoom link, coffee shop…"
              className={`${loInput} min-h-[44px]`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Agenda, talking points, context…"
              className={`${loInput} resize-none`}
            />
          </div>

          {/* Reminders */}
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-bold text-slate-800 mb-1">Reminders</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.remindMe}
                onChange={e => setForm(prev => ({ ...prev, remindMe: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-300"
              />
              Remind me 1 hour before
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.remindThem && Boolean(form.email || form.phone)}
                disabled={!form.email && !form.phone}
                onChange={e => setForm(prev => ({ ...prev, remindThem: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-300"
              />
              Remind them the day before
              {!form.email && !form.phone && <span className="text-xs text-slate-600">(add an email or phone)</span>}
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={loGhost}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={loSolid}
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
  const kindIcon  = KIND_ICONS[appt.type]  ?? 'event'
  const timeLabel = formatTime(appt)
  const statusLower = appt.status.toLowerCase()
  const isCompleted = statusLower === 'completed'
  const isCanceled  = statusLower === 'canceled' || statusLower === 'cancelled'

  const dateObj = appt.date ? new Date(appt.date + 'T12:00:00') : null
  const month = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short' }) : ''
  const dayNum = dateObj ? dateObj.getDate() : ''
  const statusTone = isCompleted ? 'green' : isCanceled ? 'slate' : statusLower === 'confirmed' ? 'green' : 'blue'
  const statusText = isCompleted ? 'Completed' : isCanceled ? 'Canceled' : statusLower === 'confirmed' ? 'Confirmed' : 'Scheduled'
  const actionCls = 'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors'

  return (
    <div className={`${loCard} flex flex-col gap-4 transition-opacity ${isCompleted || isCanceled ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Date tile */}
        <div aria-hidden="true" className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary-50 text-primary-800">
          <span className="text-xs font-bold uppercase leading-none">{month}</span>
          <span className="text-2xl font-black leading-tight">{dayNum || <LoIcon name="event" />}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-extrabold leading-snug text-slate-900">{appt.leadName || '—'}</p>
            <LoTag tone={statusTone}>{statusText}</LoTag>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">
            {formatDate(appt.date)}{timeLabel ? ` · ${timeLabel}` : ''}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary-800">
            <LoIcon name={kindIcon} className="text-sm" />{appt.type}
          </p>
          {appt.location && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
              <LoIcon name="location_on" className="text-base text-slate-500" />
              <span className="min-w-0 break-words">{appt.location}</span>
            </p>
          )}
        </div>
      </div>

      {appt.notes && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 line-clamp-3">{appt.notes}</p>
      )}

      {!isCompleted && !isCanceled && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button onClick={() => onComplete(appt.id)} className={loSolid}>
            <LoIcon name="check_circle" className="text-lg" />
            Done
          </button>
          {appt.phone && (
            <a href={`tel:${appt.phone}`} className={loGhost}>
              <LoIcon name="call" className="text-lg" />
              Call
            </a>
          )}
          {appt.email && (
            <a href={`mailto:${appt.email}`} className={loGhost}>
              <LoIcon name="mail" className="text-lg" />
              Email
            </a>
          )}
          <div className="ml-auto flex items-center gap-1">
            {cancelConfirmId === appt.id ? (
              <>
                <button onClick={() => onCancel(appt.id)} className={`${actionCls} bg-rose-600 text-white hover:bg-rose-700`}>
                  Cancel meeting
                </button>
                <button onClick={() => setCancelConfirmId(null)} className={`${actionCls} text-slate-700 hover:bg-slate-100`}>
                  ✕
                </button>
              </>
            ) : (
              <button onClick={() => setCancelConfirmId(appt.id)} className={`${actionCls} text-slate-700 hover:bg-rose-50 hover:text-rose-700`}>
                <LoIcon name="close" className="text-lg" />
                <span className="sr-only">Cancel</span>
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
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="mb-3 flex min-h-[44px] items-center gap-2"
      >
        <span className="text-lg font-extrabold text-slate-900">{title}</span>
        <LoTag tone="slate">{count}</LoTag>
        <LoIcon name="expand_more" className={`text-xl text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LOAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<LOAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  // Arriving from the Partners page with ?name=…: open the form with that agent filled in.
  const [prefill] = useState<Partial<ScheduleFormState> | undefined>(() => {
    const name = searchParams.get('name')
    if (!name) return undefined
    const kindParam = searchParams.get('kind') as MeetingKind | null
    return {
      name,
      email: searchParams.get('email') || '',
      phone: searchParams.get('phone') || '',
      kind: kindParam && MEETING_KINDS.includes(kindParam) ? kindParam : 'Agent Check-in'
    }
  })
  const [showModal, setShowModal] = useState(Boolean(prefill))
  const [saving, setSaving] = useState(false)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    try {
      const r = await fetch(buildApiUrl('/api/appointments'), { headers: await apiHeaders() })
      if (!r.ok) throw new Error('appointments_load_failed')
      const data = await r.json() as { appointments?: LOAppointment[] }
      const raw = data.appointments || []
      const mapped: LOAppointment[] = raw.map(a => ({
        ...a,
        type: normalizeKind(a.type ?? (a as unknown as { kind?: string }).kind ?? 'Consultation'),
      }))
      setAppointments(mapped)
      setLoadFailed(false)
    } catch {
      setLoadFailed(true)
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
        headers: await apiHeaders(true),
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
          // Reminders were hard-wired off, so nobody was ever reminded. The form now decides.
          remindAgent:  form.remindMe,
          remindClient: form.remindThem && Boolean(form.email || form.phone),
          agentReminderMinutes: 60,
          clientReminderMinutes: 1440,
        }),
      })
      if (r.status === 401) {
        toast.error('Your session expired. Refresh the page and sign in again.')
        return
      }
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
        headers: await apiHeaders(true),
        body: JSON.stringify({ status: 'completed' }),
      })
      if (r.status === 401) { toast.error('Your session expired. Refresh the page and sign in again.'); return }
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
      // Mark it canceled instead of erasing it: the meeting stays in Past Meetings,
      // and its reminders are called off.
      const r = await fetch(buildApiUrl(`/api/appointments/${id}`), {
        method: 'PUT',
        headers: await apiHeaders(true),
        body: JSON.stringify({ status: 'canceled' }),
      })
      if (r.status === 401) { toast.error('Your session expired. Refresh the page and sign in again.'); return }
      if (!r.ok) throw new Error()
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'canceled' } : a))
      toast.success('Meeting canceled')
    } catch {
      toast.error('Failed to cancel meeting')
    }
  }

  // ── Bucketing ─────────────────────────────────────────────────────────────

  const todayStr    = today()
  const weekStart   = startOfWeek()
  const weekEnd     = endOfWeek()

  const isTerminal = (s: string) => { const l = s.toLowerCase(); return l === 'completed' || l === 'canceled' || l === 'cancelled' }
  const active = appointments.filter(a => !isTerminal(a.status)).sort(byWhen)
  const done   = appointments.filter(a => isTerminal(a.status)).sort((a, b) => byWhen(b, a))

  // A meeting that already happened but was never marked done used to vanish from the page.
  const overdueAppts  = active.filter(a => a.date && a.date < todayStr)
  const todayAppts    = active.filter(a => a.date === todayStr)
  const thisWeekAppts = active.filter(a => a.date > todayStr && a.date >= weekStart && a.date <= weekEnd)
  const upcomingAppts = active.filter(a => a.date > weekEnd)

  const hasAny = active.length > 0 || done.length > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mx-auto max-w-4xl space-y-6 px-4 pb-28 pt-6 sm:pt-8">

        <LoPageHeader
          title="Appointments"
          subtitle="Consultations, calls, and meetings with agents and borrowers."
          action={(
            <button onClick={() => setShowModal(true)} className={`${loSolid} mr-10`}>
              <LoIcon name="add" className="text-lg" />
              Schedule Meeting
            </button>
          )}
        />

        <PageGuide pageKey="lo-appointments" />

        {/* Loading */}
        {loading && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading meetings">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
                <div className="mt-4 h-11 w-32 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* Load failed */}
        {!loading && loadFailed && (
          <div className={`${loCard} flex flex-wrap items-center gap-4`} role="alert">
            <LoIconTile name="error" tone="amber" />
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-base font-extrabold text-slate-900">We couldn't load your meetings just now.</p>
              <p className="text-sm text-slate-600">Check your connection, then try again.</p>
            </div>
            <button onClick={() => { setLoading(true); void load() }} className={loSolid}>
              <LoIcon name="refresh" className="text-lg" />
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadFailed && !hasAny && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <div className="flex justify-center"><LoIconTile name="calendar_today" tone="blue" /></div>
            <p className="mt-4 text-base font-extrabold text-slate-900">No meetings yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-slate-600">Schedule your first consultation, call, or agent check-in.</p>
            <button onClick={() => setShowModal(true)} className={`${loSolid} mt-4`}>
              Schedule Meeting
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && hasAny && (
          <>
            {/* Overdue */}
            {overdueAppts.length > 0 && (
              <Section title="Overdue — mark done or cancel" count={overdueAppts.length} defaultOpen>
                {overdueAppts.map(a => (
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
            {active.length > 0 && overdueAppts.length === 0 && todayAppts.length === 0 && thisWeekAppts.length === 0 && upcomingAppts.length === 0 && (
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
          onClose={() => { setShowModal(false); if (searchParams.get('name')) setSearchParams({}, { replace: true }) }}
          onSave={handleSchedule}
          saving={saving}
          initial={prefill}
        />
      )}
    </div>
  )
}

export default LOAppointmentsPage
