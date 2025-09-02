import { googleMeetService } from './googleMeetService'
import { emailService } from './emailService'
// import { addConsultation } from './firestoreService' // removed with Firebase
import { googleOAuthService } from './googleOAuthService'

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
}

export interface SchedulerResult {
  eventId: string
  meetLink?: string
}

const getStartHourForLabel = (label: string): number => {
  const lower = label.toLowerCase()
  if (lower.includes('morning')) return 10
  if (lower.includes('afternoon')) return 14
  if (lower.includes('evening')) return 18
  return 14
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

  const startHour = getStartHourForLabel(timeLabel)
  const start = new Date(`${normalized}T${String(startHour).padStart(2, '0')}:00:00`)
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

export const scheduleAppointment = async (
  input: SchedulerInput
): Promise<SchedulerResult> => {
  const { start, end } = toIsoRange(input.date, input.time)

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

  const calendar = await googleMeetService.createMeetEvent(event)

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

  // Firebase removed: persist via Supabase later if needed

  return { eventId: calendar.eventId, meetLink: calendar.meetLink }
}


