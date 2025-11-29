import { CalendarSettings } from '../types'
import { getAuthenticatedUserId } from './session-utils'

export interface CalendarConnectionInfo {
  provider: string | null
  email: string | null
  connectedAt: string | null
  status: string
  metadata?: Record<string, unknown>
}

export interface CalendarSettingsResponse {
  success?: boolean
  settings: CalendarSettings
  connection?: CalendarConnectionInfo
}

const handleResponse = async (response: Response): Promise<CalendarSettingsResponse> => {
  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  const data = (await response.json()) as CalendarSettingsResponse

  if (!data || !data.settings) {
    throw new Error('Server did not return calendar settings')
  }

  return data
}

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
  smsReminders: true,
  newAppointmentAlerts: true
}

const buildDemoResponse = (): CalendarSettingsResponse => ({
  settings: { ...DEFAULT_CALENDAR_SETTINGS },
  connection: {
    provider: null,
    email: null,
    connectedAt: null,
    status: 'demo'
  }
})

const fetchSettings = async (userId?: string): Promise<CalendarSettingsResponse> => {
  const resolvedUserId = userId ?? (await getAuthenticatedUserId())
  if (!resolvedUserId) {
    return buildDemoResponse()
  }

  const response = await fetch(`/api/calendar/settings/${encodeURIComponent(resolvedUserId)}`)
  return handleResponse(response)
}

const updateSettings = async (
  userId: string,
  settings: Partial<CalendarSettings>
): Promise<CalendarSettingsResponse> => {
  const resolvedUserId = userId || (await getAuthenticatedUserId())
  if (!resolvedUserId) {
    return { success: false, ...buildDemoResponse() }
  }

  const response = await fetch(`/api/calendar/settings/${encodeURIComponent(resolvedUserId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  })

  return handleResponse(response)
}

export const calendarSettingsService = {
  fetch: fetchSettings,
  update: updateSettings
}

export default calendarSettingsService





