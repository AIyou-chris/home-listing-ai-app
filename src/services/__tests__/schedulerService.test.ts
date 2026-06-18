import type { SchedulerInput } from '../schedulerService'

const getUserMock = jest.fn()
const insertAppointmentMock = jest.fn()
const listAppointmentsMock = jest.fn()
const fetchCalendarSettingsMock = jest.fn()
const createMeetEventMock = jest.fn()
const sendConsultationConfirmationMock = jest.fn()
const sendAdminNotificationMock = jest.fn()

let scheduleAppointment: typeof import('../schedulerService')['scheduleAppointment']

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: getUserMock
    }
  }
}))

jest.mock('../appointmentsService', () => ({
  insertAppointment: (...args: unknown[]) => insertAppointmentMock(...args),
  listAppointments: (...args: unknown[]) => listAppointmentsMock(...args)
}))

jest.mock('../calendarSettingsService', () => ({
  calendarSettingsService: {
    fetch: (...args: unknown[]) => fetchCalendarSettingsMock(...args)
  },
  default: {
    fetch: (...args: unknown[]) => fetchCalendarSettingsMock(...args)
  }
}))

jest.mock('../googleOAuthService', () => ({
  googleOAuthService: {
    isAuthenticated: jest.fn().mockReturnValue(false),
    getUserEmail: jest.fn()
  }
}))

jest.mock('../googleMeetService', () => ({
  googleMeetService: {
    createMeetEvent: (...args: unknown[]) => createMeetEventMock(...args)
  }
}))

jest.mock('../emailService', () => ({
  emailService: {
    sendConsultationConfirmation: (...args: unknown[]) => sendConsultationConfirmationMock(...args),
    sendAdminNotification: (...args: unknown[]) => sendAdminNotificationMock(...args)
  }
}))

beforeAll(async () => {
  const mod = await import('../schedulerService')
  scheduleAppointment = mod.scheduleAppointment
})

describe('scheduleAppointment', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getUserMock.mockResolvedValue({
      data: {
        user: { id: 'agent-123' }
      }
    })

    fetchCalendarSettingsMock.mockResolvedValue({
      settings: {
        integrationType: 'google',
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
    })

    listAppointmentsMock.mockResolvedValue([
      {
        id: 'appt-existing',
        user_id: 'agent-123',
        lead_id: null,
        property_id: null,
        property_address: null,
        kind: 'Consultation',
        name: 'Existing Meeting',
        email: 'client@example.com',
        phone: null,
        date: '2025-12-22',
        time_label: '2:00 PM',
        start_iso: '2025-12-22T22:00:00Z',
        end_iso: '2025-12-22T23:00:00Z',
        meet_link: null,
        notes: null,
        status: 'Scheduled',
        remind_agent: true,
        remind_client: true,
        agent_reminder_minutes_before: 60,
        client_reminder_minutes_before: 1440,
        created_at: '2025-08-01T00:00:00Z',
        updated_at: '2025-08-01T00:00:00Z'
      }
    ])

    insertAppointmentMock.mockResolvedValue({
      id: 'appt-created',
      start_iso: '2025-12-22T23:15:00Z',
      end_iso: '2025-12-23T00:15:00Z'
    })
  })

  it('moves appointment to next available slot when requested time is busy', async () => {
    // Busy-interval filtering drops past appointments; pin "now" to just before the
    // fixture date so the 2025-12-22 conflict is in the future and detected.
    jest.useFakeTimers({ now: new Date('2025-12-20T12:00:00Z') })

    const payload: SchedulerInput = {
      name: 'New Client',
      email: 'new.client@example.com',
      phone: '555-0000',
      date: '2025-12-22',
      time: '2:00 PM',
      message: 'Looking forward to meeting',
      kind: 'Consultation'
    }

    // Appointment creation now POSTs to /api/appointments rather than the
    // insertAppointment service. Return a created row so the flow completes.
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'appt-created', start_iso: '2025-12-22T21:15:00Z', end_iso: '2025-12-22T22:15:00Z' })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await scheduleAppointment(payload)

    expect(listAppointmentsMock).toHaveBeenCalledWith('agent-123')

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => String(url).includes('/api/appointments') && (init as RequestInit | undefined)?.method === 'POST'
    )
    expect(postCall).toBeDefined()
    const body = JSON.parse((postCall?.[1] as RequestInit).body as string)
    expect(body.date).toBe('2025-12-22')
    expect(body.timeLabel).toBe('3:15 PM')

    expect(result.scheduledAt?.date).toBe('2025-12-22')
    expect(result.scheduledAt?.time).toBe('3:15 PM')

    jest.useRealTimers()
  })
})

