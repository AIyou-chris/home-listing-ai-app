import { insertAppointment, AppointmentRow } from './appointmentsService'
import { supabase } from './supabase'
import { googleOAuthService } from './googleOAuthService'
import { googleMeetService } from './googleMeetService'
import { emailService } from './emailService'

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
}

const ENABLE_GOOGLE_INTEGRATIONS =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    String(import.meta.env.VITE_ENABLE_GOOGLE_INTEGRATIONS || '').toLowerCase() === 'true') ||
  false

const googleIntegrationsReady =
  ENABLE_GOOGLE_INTEGRATIONS &&
  typeof googleOAuthService?.isAuthenticated === 'function' &&
  googleOAuthService.isAuthenticated()

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

export const scheduleAppointment = async (
  input: SchedulerInput
): Promise<SchedulerResult> => {
  const { start, end } = toIsoRange(input.date, input.time)
  const dateOnly = start.slice(0, 10)

  const summary = `${input.kind} - ${input.name}`
  const description = `${input.kind} with ${input.name}

Contact Information:
- Email: ${input.email}
- Phone: ${input.phone || 'N/A'}

Notes:
${input.message || 'No additional notes'}
`

  const attendees = [
    input.email,
    input.agentEmail || (googleOAuthService.getUserEmail?.() || 'us@homelistingai.com')
  ]

  const event = {
    summary,
    description,
    startTime: start,
    endTime: end,
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
          name: input.name,
          email: input.email,
          phone: input.phone || '',
          date: input.date,
          time: input.time,
          message: input.message || ''
        },
        calendar.meetLink
      )
    } catch (error) {
      console.warn('⚠️ Consultation confirmation email failed', error)
    }

    try {
      await emailService.sendAdminNotification(
        {
          name: input.name,
          email: input.email,
          phone: input.phone || '',
          date: input.date,
          time: input.time,
          message: input.message || ''
        },
        calendar.meetLink
      )
    } catch (error) {
      console.warn('⚠️ Admin notification email failed', error)
    }
  } else {
    console.info('ℹ️ Google integrations disabled; skipping calendar event and email sends.')
  }

  const reminderDefaults = {
    remindAgent: input.remindAgent ?? true,
    remindClient: input.remindClient ?? true,
    agentReminderMinutes: input.agentReminderMinutes ?? 60,
    clientReminderMinutes: input.clientReminderMinutes ?? 60
  }

  const appointmentPayload = {
    kind: input.kind,
    name: input.name,
    email: input.email,
    phone: input.phone,
    notes: input.message || '',
    date: dateOnly,
    time_label: input.time,
    start_iso: start,
    end_iso: end,
    meet_link: calendar.meetLink,
    status: input.status || 'Scheduled',
    lead_id: isUuid(input.leadId) ? input.leadId : undefined,
    property_id: input.propertyId,
    property_address: input.propertyAddress,
    remind_agent: reminderDefaults.remindAgent,
    remind_client: reminderDefaults.remindClient,
    agent_reminder_minutes_before: reminderDefaults.agentReminderMinutes,
    client_reminder_minutes_before: reminderDefaults.clientReminderMinutes
  }

  let storedAppointment: AppointmentRow | null = null

  const { data: user } = await supabase.auth.getUser()
  const uid = user?.user?.id

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

  if (!storedAppointment) {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: input.kind,
          date: dateOnly,
          time: input.time,
          timeLabel: input.time,
          startIso: start,
          endIso: end,
          leadId: isUuid(input.leadId) ? input.leadId : null,
          leadName: input.name,
          name: input.name,
          email: input.email,
          phone: input.phone,
          propertyId: input.propertyId,
          propertyAddress: input.propertyAddress,
          notes: input.message || '',
          status: input.status || 'Scheduled',
          remindAgent: reminderDefaults.remindAgent,
          remindClient: reminderDefaults.remindClient,
          agentReminderMinutes: reminderDefaults.agentReminderMinutes,
          clientReminderMinutes: reminderDefaults.clientReminderMinutes,
          meetLink: calendar.meetLink,
          agentId: input.agentId,
          userId: uid
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

  return { eventId: calendar.eventId, meetLink: calendar.meetLink, appointmentId: storedAppointment?.id }
}
