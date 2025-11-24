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
    const payload: SchedulerInput = {
      name: 'New Client',
      email: 'new.client@example.com',
      phone: '555-0000',
      date: '2025-12-22',
      time: '2:00 PM',
      message: 'Looking forward to meeting',
      kind: 'Consultation'
    }

    const result = await scheduleAppointment(payload)

    expect(listAppointmentsMock).toHaveBeenCalledWith('agent-123')
    expect(insertAppointmentMock).toHaveBeenCalled()

    const insertArgs = insertAppointmentMock.mock.calls[0][0]
    expect(insertArgs.date).toBe('2025-12-22')
    expect(insertArgs.time_label).toBe('3:15 PM')

    expect(result.scheduledAt?.date).toBe('2025-12-22')
    expect(result.scheduledAt?.time).toBe('3:15 PM')
  })
})

