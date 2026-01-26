import { CalendarSettings } from '../types'

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

const fetchSettings = async (userId: string): Promise<CalendarSettingsResponse> => {
  const safeId = userId || 'default'
  const response = await fetch(`/api/calendar/settings/${encodeURIComponent(safeId)}`)
  return handleResponse(response)
}

const updateSettings = async (
  userId: string,
  settings: Partial<CalendarSettings>
): Promise<CalendarSettingsResponse> => {
  const safeId = userId || 'default'
  const response = await fetch(`/api/calendar/settings/${encodeURIComponent(safeId)}`, {
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


