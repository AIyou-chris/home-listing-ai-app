import { insertAppointment, listAppointments } from './appointmentsService'
import type { AppointmentRow } from './appointmentsService'
import { supabase } from './supabase'
import { googleOAuthService } from './googleOAuthService'
import { getEnvValue } from '../lib/env'
import { googleMeetService } from './googleMeetService'
import { emailService } from './emailService'
import { calendarSettingsService } from './calendarSettingsService'
import type { CalendarSettings } from '../types'

export type AppointmentKind =
  | 'Showing'
  | 'Consultation'
  | 'Open House'
  | 'Virtual Tour'
  | 'Follow-up'

export interface SchedulerInput {
  name: string
  email: string
  phone?: string
  date: string
  time: string
  message?: string
  kind: AppointmentKind
  agentEmail?: string
  agentId?: string
  leadId?: string
  propertyId?: string
  propertyAddress?: string
  remindAgent?: boolean
  remindClient?: boolean
  agentReminderMinutes?: number
  clientReminderMinutes?: number
  status?: 'Scheduled' | 'Completed' | 'Cancelled'
}

export interface SchedulerResult {
  eventId: string
  meetLink?: string
  appointmentId?: string
  scheduledAt?: {
    date: string
    time: string
    startIso: string
    endIso: string
  }
}

const resolveGoogleIntegrationFlag = (): boolean => {
  const candidate = getEnvValue('VITE_ENABLE_GOOGLE_INTEGRATIONS')
  return String(candidate || '').toLowerCase() === 'true'
}

const ENABLE_GOOGLE_INTEGRATIONS = resolveGoogleIntegrationFlag()

const googleIntegrationsReady =
  ENABLE_GOOGLE_INTEGRATIONS &&
  typeof googleOAuthService?.isAuthenticated === 'function' &&
  googleOAuthService.isAuthenticated('calendar')

const isUuid = (value?: string | null) =>
  typeof value === 'string' &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)

const parseTimeLabel = (label: string): { hour: number; minute: number } => {
  const trimmed = label?.trim() || ''
  if (!trimmed) return { hour: 14, minute: 0 }

  const explicit = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (explicit) {
    let hour = parseInt(explicit[1], 10)
    const minute = explicit[2] ? parseInt(explicit[2], 10) : 0
    const meridiem = explicit[3]?.toLowerCase()

    if (meridiem === 'pm' && hour < 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0

    return {
      hour: Number.isFinite(hour) ? hour : 14,
      minute: Number.isFinite(minute) ? minute : 0
    }
  }

  const lower = trimmed.toLowerCase()
  if (lower.includes('morning')) return { hour: 10, minute: 0 }
  if (lower.includes('afternoon')) return { hour: 14, minute: 0 }
  if (lower.includes('evening')) return { hour: 18, minute: 0 }

  return { hour: 14, minute: 0 }
}

const toIsoRange = (dateStr: string, timeLabel: string): {
  start: string
  end: string
} => {
  // Accepts mm/dd/yyyy or yyyy-mm-dd
  const normalized = dateStr.includes('-')
    ? dateStr
    : dateStr
        .split('/')
        .map((p, i) => (i === 2 ? p : p.padStart(2, '0')))
        .reverse()
        .join('-')

  const { hour, minute } = parseTimeLabel(timeLabel)
  const start = new Date(
    `${normalized}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  )
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

const DAY_NAMES: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  integrationType: null,
  aiScheduling: true,
  conflictDetection: true,
  emailReminders: true,
  autoConfirm: false,
  workingHours: { start: '09:00', end: '17:00' },
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  defaultDuration: 60,
  bufferTime: 15,
  smsReminders: false,
  newAppointmentAlerts: true
}

type BusyInterval = { start: Date; end: Date }

const mergeCalendarSettings = (settings?: CalendarSettings | null): CalendarSettings => {
  if (!settings) {
    return { ...DEFAULT_CALENDAR_SETTINGS, workingDays: [...DEFAULT_CALENDAR_SETTINGS.workingDays] }
  }

  return {
    ...DEFAULT_CALENDAR_SETTINGS,
    ...settings,
    workingHours: {
      ...DEFAULT_CALENDAR_SETTINGS.workingHours,
      ...(settings.workingHours ?? DEFAULT_CALENDAR_SETTINGS.workingHours)
    },
    workingDays:
      settings.workingDays && settings.workingDays.length > 0
        ? [...settings.workingDays]
        : [...DEFAULT_CALENDAR_SETTINGS.workingDays]
  }
}

const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTimeForLabel = (date: Date): string => {
  const hours24 = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${minutes} ${suffix}`
}

const parseWorkingTime = (
  value: string | undefined,
  fallback: { hour: number; minute: number }
): { hour: number; minute: number } => {
  if (!value) return fallback
  const [hourPart, minutePart] = value.split(':')
  const hour = Number.parseInt(hourPart ?? '', 10)
  const minute = Number.parseInt(minutePart ?? '', 10)
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return fallback
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
    return { hour, minute: fallback.minute }
  }
  return { hour, minute }
}

const setTimeOnDate = (date: Date, hour: number, minute: number): Date => {
  const next = new Date(date)
  next.setHours(hour, minute, 0, 0)
  return next
}

const getDayName = (date: Date): string => DAY_NAMES[date.getDay()]

const moveToNextWorkingDay = (
  date: Date,
  allowedDays: Set<string>,
  workStartHour: number,
  workStartMinute: number
): Date => {
  const next = new Date(date)
  for (let i = 0; i < 7; i += 1) {
    next.setDate(next.getDate() + 1)
    next.setHours(workStartHour, workStartMinute, 0, 0)
    if (allowedDays.has(getDayName(next))) {
      return next
    }
  }
  return next
}

const parseAppointmentStart = (row: AppointmentRow): Date | null => {
  if (row.start_iso) {
    const direct = new Date(row.start_iso)
    if (!Number.isNaN(direct.getTime())) return direct
  }

  if (row.date) {
    const { start } = toIsoRange(row.date, row.time_label || '')
    const computed = new Date(start)
    if (!Number.isNaN(computed.getTime())) return computed
  }

  return null
}

const resolveAppointmentInterval = (
  row: AppointmentRow,
  defaultDurationMinutes: number
): BusyInterval | null => {
  const start = parseAppointmentStart(row)
  if (!start) return null

  const end = row.end_iso ? new Date(row.end_iso) : new Date(start.getTime() + defaultDurationMinutes * 60 * 1000)
  if (Number.isNaN(end.getTime())) return null

  return { start, end }
}

const buildBusyIntervals = (rows: AppointmentRow[], settings: CalendarSettings): BusyInterval[] => {
  const defaultDuration = Math.max(settings.defaultDuration || 60, 15)
  const now = new Date()

  const intervals = rows
    .filter(row => (row.status || 'Scheduled') !== 'Cancelled')
    .map(row => resolveAppointmentInterval(row, defaultDuration))
    .filter((interval): interval is BusyInterval => Boolean(interval))
    .filter(interval => interval.end.getTime() > now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  return intervals
}

const findAvailableSlot = ({
  initialStart,
  durationMinutes,
  settings,
  busyIntervals
}: {
  initialStart: Date
  durationMinutes: number
  settings: CalendarSettings
  busyIntervals: BusyInterval[]
}): { start: Date; end: Date } => {
  const { hour: workStartHour, minute: workStartMinute } = parseWorkingTime(settings.workingHours?.start, {
    hour: 9,
    minute: 0
  })
  const { hour: workEndHour, minute: workEndMinute } = parseWorkingTime(settings.workingHours?.end, {
    hour: 17,
    minute: 0
  })

  const allowedDays = new Set(
    settings.workingDays && settings.workingDays.length > 0
      ? settings.workingDays
      : DEFAULT_CALENDAR_SETTINGS.workingDays
  )

  const bufferMinutes = Math.max(settings.bufferTime || 0, 0)
  const bufferMs = bufferMinutes * 60 * 1000
  const expandedBusy = busyIntervals
    .map(interval => ({
      start: new Date(interval.start.getTime() - bufferMs),
      end: new Date(interval.end.getTime() + bufferMs)
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  let candidateStart = new Date(initialStart)

  const maxIterations = 365
  for (let i = 0; i < maxIterations; i += 1) {
    if (!allowedDays.has(getDayName(candidateStart))) {
      candidateStart = moveToNextWorkingDay(candidateStart, allowedDays, workStartHour, workStartMinute)
      continue
    }

    const workStart = setTimeOnDate(candidateStart, workStartHour, workStartMinute)
    const workEnd = setTimeOnDate(candidateStart, workEndHour, workEndMinute)

    if (candidateStart < workStart) {
      candidateStart = new Date(workStart)
    }

    let candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60 * 1000)
    if (candidateEnd > workEnd) {
      candidateStart = moveToNextWorkingDay(candidateStart, allowedDays, workStartHour, workStartMinute)
      continue
    }

    const conflict = expandedBusy.find(interval => candidateStart < interval.end && candidateEnd > interval.start)
    if (!conflict) {
      return { start: candidateStart, end: candidateEnd }
    }

    candidateStart = new Date(conflict.end)
    candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60 * 1000)
    if (candidateEnd > workEnd) {
      candidateStart = moveToNextWorkingDay(candidateStart, allowedDays, workStartHour, workStartMinute)
    }
  }

  throw new Error('Unable to find available slot that satisfies calendar guidelines')
}

const deriveReminderConfig = (
  input: SchedulerInput,
  settings: CalendarSettings
): {
  remindAgent: boolean
  remindClient: boolean
  agentReminderMinutes: number
  clientReminderMinutes: number
} => {
  const remindAgent = settings.newAppointmentAlerts ? input.remindAgent ?? true : false
  const remindClient = settings.emailReminders ? input.remindClient ?? true : false

  const agentReminderMinutesRaw =
    input.agentReminderMinutes ?? (settings.newAppointmentAlerts ? Math.max(settings.bufferTime || 0, 30) : 0)
  const clientReminderMinutesRaw =
    input.clientReminderMinutes ?? (settings.emailReminders ? Math.max(settings.defaultDuration || 60, 60) : 0)

  return {
    remindAgent,
    remindClient,
    agentReminderMinutes: remindAgent ? agentReminderMinutesRaw : 0,
    clientReminderMinutes: remindClient ? clientReminderMinutesRaw : 0
  }
}

const loadCalendarContext = async (
  userId?: string | null
): Promise<{ settings: CalendarSettings; busyIntervals: BusyInterval[] }> => {
  const baseSettings = mergeCalendarSettings()

  if (!userId) {
    return { settings: baseSettings, busyIntervals: [] }
  }

  const [settingsResult, appointmentsResult] = await Promise.allSettled([
    calendarSettingsService.fetch(userId),
    listAppointments(userId)
  ])

  const resolvedSettings =
    settingsResult.status === 'fulfilled' && settingsResult.value?.settings
      ? mergeCalendarSettings(settingsResult.value.settings)
      : baseSettings

  const busyIntervals =
    appointmentsResult.status === 'fulfilled'
      ? buildBusyIntervals(appointmentsResult.value, resolvedSettings)
      : []

  return { settings: resolvedSettings, busyIntervals }
}

export const scheduleAppointment = async (
  input: SchedulerInput
): Promise<SchedulerResult> => {
  const { data: user } = await supabase.auth.getUser()
  const uid = user?.user?.id ?? null
  const agentUserId = input.agentId || uid || 'guest-agent'

  const { settings, busyIntervals } = await loadCalendarContext(uid)

  const { start: initialStartIso, end: initialEndIso } = toIsoRange(input.date, input.time)
  const initialStart = new Date(initialStartIso)
  const initialEnd = new Date(initialEndIso)

  if (Number.isNaN(initialStart.getTime()) || Number.isNaN(initialEnd.getTime())) {
    throw new Error('Invalid appointment time provided')
  }

  const requestedDurationMinutes = Math.max(
    Math.round((initialEnd.getTime() - initialStart.getTime()) / (60 * 1000)),
    15
  )
  const durationMinutes =
    settings.defaultDuration && settings.defaultDuration > 0
      ? Math.max(requestedDurationMinutes, settings.defaultDuration)
      : requestedDurationMinutes

  let slotStart = new Date(initialStart)
  let slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)

  if (settings.aiScheduling || settings.conflictDetection) {
    try {
      const resolved = findAvailableSlot({
        initialStart: slotStart,
        durationMinutes,
        settings,
        busyIntervals
      })
      slotStart = resolved.start
      slotEnd = resolved.end
    } catch (error) {
      console.warn('⚠️ Calendar guidelines could not adjust slot; using requested time', error)
      slotStart = new Date(initialStart)
      slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)
    }
  }

  const finalDate = formatDateOnly(slotStart)
  const finalTimeLabel = formatTimeForLabel(slotStart)
  const startIso = slotStart.toISOString()
  const endIso = slotEnd.toISOString()

  const reminders = deriveReminderConfig(input, settings)

  const normalizedInput = {
    ...input,
    date: finalDate,
    time: finalTimeLabel,
    remindAgent: reminders.remindAgent,
    remindClient: reminders.remindClient,
    agentReminderMinutes: reminders.agentReminderMinutes,
    clientReminderMinutes: reminders.clientReminderMinutes
  }

  const summary = `${normalizedInput.kind} - ${normalizedInput.name}`
  const description = `${normalizedInput.kind} with ${normalizedInput.name}

Contact Information:
- Email: ${normalizedInput.email}
- Phone: ${normalizedInput.phone || 'N/A'}

Notes:
${normalizedInput.message || 'No additional notes'}
`

  const attendees = [
    normalizedInput.email,
    normalizedInput.agentEmail || (googleOAuthService.getUserEmail?.('calendar') || 'us@homelistingai.com')
  ]

  const event = {
    summary,
    description,
    startTime: startIso,
    endTime: endIso,
    attendees
  }

  let calendar: { meetLink?: string; eventId: string } = { eventId: '' }

  if (googleIntegrationsReady) {
    try {
      calendar = await googleMeetService.createMeetEvent(event)
    } catch (error) {
      console.warn('⚠️ Google Calendar event creation failed, continuing without Meet link', error)
      calendar = { eventId: '', meetLink: undefined }
    }

    try {
      await emailService.sendConsultationConfirmation(
        {
          name: normalizedInput.name,
          email: normalizedInput.email,
          phone: normalizedInput.phone || '',
          date: normalizedInput.date,
          time: normalizedInput.time,
          message: normalizedInput.message || ''
        },
        calendar.meetLink
      )
    } catch (error) {
      console.warn('⚠️ Consultation confirmation email failed', error)
    }

    try {
      await emailService.sendAdminNotification(
        {
          name: normalizedInput.name,
          email: normalizedInput.email,
          phone: normalizedInput.phone || '',
          date: normalizedInput.date,
          time: normalizedInput.time,
          message: normalizedInput.message || ''
        },
        calendar.meetLink,
        { userId: agentUserId }
      )
    } catch (error) {
      console.warn('⚠️ Admin notification email failed', error)
    }
  } else {
    console.info('ℹ️ Google integrations disabled; skipping calendar event and email sends.')
  }

  const appointmentPayload = {
    kind: normalizedInput.kind,
    name: normalizedInput.name,
    email: normalizedInput.email,
    phone: normalizedInput.phone,
    notes: normalizedInput.message || '',
    date: finalDate,
    time_label: finalTimeLabel,
    start_iso: startIso,
    end_iso: endIso,
    meet_link: calendar.meetLink,
    status: normalizedInput.status || 'Scheduled',
    lead_id: isUuid(normalizedInput.leadId) ? normalizedInput.leadId : undefined,
    property_id: normalizedInput.propertyId,
    property_address: normalizedInput.propertyAddress,
    remind_agent: reminders.remindAgent,
    remind_client: reminders.remindClient,
    agent_reminder_minutes_before: reminders.agentReminderMinutes,
    client_reminder_minutes_before: reminders.clientReminderMinutes
  }

  let storedAppointment: AppointmentRow | null = null

  if (uid) {
    try {
      storedAppointment = await insertAppointment({
        user_id: uid,
        ...appointmentPayload
      })
    } catch (error) {
      console.warn('⚠️ Failed to persist appointment via Supabase client, falling back to backend', error)
    }
  }

  const ownerIdForBackend = uid ?? normalizedInput.agentId ?? null

  if (!storedAppointment && ownerIdForBackend) {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: normalizedInput.kind,
          date: finalDate,
          time: finalTimeLabel,
          timeLabel: finalTimeLabel,
          startIso,
          endIso,
          leadId: isUuid(normalizedInput.leadId) ? normalizedInput.leadId : null,
          leadName: normalizedInput.name,
          name: normalizedInput.name,
          email: normalizedInput.email,
          phone: normalizedInput.phone,
          propertyId: normalizedInput.propertyId,
          propertyAddress: normalizedInput.propertyAddress,
          notes: normalizedInput.message || '',
          status: normalizedInput.status || 'Scheduled',
          remindAgent: reminders.remindAgent,
          remindClient: reminders.remindClient,
          agentReminderMinutes: reminders.agentReminderMinutes,
          clientReminderMinutes: reminders.clientReminderMinutes,
          meetLink: calendar.meetLink,
          agentId: normalizedInput.agentId,
          userId: ownerIdForBackend
        })
      })

      if (!response.ok) {
        console.warn('⚠️ Backend appointment creation responded with non-OK status', response.status)
      } else {
        const data = await response.json()
        if (data && data.id) {
          storedAppointment = data as AppointmentRow
        }
      }
    } catch (error) {
      console.warn('⚠️ Backend appointment creation failed', error)
    }
  }

  return {
    eventId: calendar.eventId,
    meetLink: calendar.meetLink,
    appointmentId: storedAppointment?.id,
    scheduledAt: {
      date: finalDate,
      time: finalTimeLabel,
      startIso,
      endIso
    }
  }
}
