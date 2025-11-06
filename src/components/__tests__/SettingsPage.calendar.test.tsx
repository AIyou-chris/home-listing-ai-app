import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsPage from '../SettingsPage'
import {
  AgentProfile,
  BillingSettings,
  CalendarSettings,
  EmailSettings,
  NotificationSettings
} from '../../types'
import { supabase } from '../../services/supabase'
import { agentOnboardingService } from '../../services/agentOnboardingService'

jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      updateUser: jest.fn()
    }
  }
}))

jest.mock('../../services/agentOnboardingService', () => ({
  agentOnboardingService: {
    registerAgent: jest.fn(),
    getAgentBySlug: jest.fn(),
    createCheckoutSession: jest.fn(),
    listPaymentProviders: jest.fn(),
    pollAgentActivation: jest.fn()
  }
}))

const defaultAgent: AgentProfile = {
  name: 'Test Agent',
  slug: 'test-agent',
  title: 'Broker Associate',
  company: 'Home Listing AI',
  phone: '555-000-0000',
  email: 'agent@example.com',
  headshotUrl: '',
  socials: []
}

const defaultNotifications: NotificationSettings = {
  newLead: true,
  appointmentScheduled: true,
  aiInteraction: false,
  weeklySummary: true,
  appointmentReminders: true,
  taskReminders: true,
  marketingUpdates: true,
  propertyInquiries: true,
  showingConfirmations: true,
  hotLeads: true,
  priceChanges: false,
  contractMilestones: true,
  browserNotifications: true,
  weekendNotifications: true,
  weeklyReport: true,
  monthlyInsights: true
}

const defaultEmailSettings: EmailSettings = {
  integrationType: 'oauth',
  aiEmailProcessing: true,
  autoReply: true,
  leadScoring: true,
  followUpSequences: true,
  fromEmail: 'agent@example.com',
  fromName: 'Test Agent',
  signature: '',
  trackOpens: true
}

const defaultCalendarSettings: CalendarSettings = {
  integrationType: 'google',
  aiScheduling: true,
  conflictDetection: true,
  emailReminders: true,
  autoConfirm: false,
  workingHours: { start: '09:00', end: '17:00' },
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  defaultDuration: 30,
  bufferTime: 15,
  smsReminders: false,
  newAppointmentAlerts: true
}

const defaultBilling: BillingSettings = {
  planName: 'Solo Agent',
  history: []
}

const originalFetch = global.fetch
const mockedOnboardingService = agentOnboardingService as jest.Mocked<typeof agentOnboardingService>
const mockedSupabase = supabase as unknown as {
  auth: {
    getUser: jest.Mock
    signInWithPassword: jest.Mock
    updateUser: jest.Mock
  }
}

const createFetchMock = () => {
  return jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = (init?.method || 'GET').toUpperCase()

    if (url.includes('/api/email/settings/') && method === 'GET') {
      return {
        ok: true,
        json: async () => ({ settings: defaultEmailSettings, connections: [] })
      } as Response
    }

    if (url.includes('/api/calendar/settings/') && method === 'GET') {
      return {
        ok: true,
        json: async () => ({
          settings: defaultCalendarSettings,
          connection: { provider: 'google', status: 'active' }
        })
      } as Response
    }

    if (url.includes('/api/calendar/settings/') && method === 'PATCH') {
      const body = init?.body ? JSON.parse(init.body.toString()) : {}
      return {
        ok: true,
        json: async () => ({
          settings: { ...defaultCalendarSettings, ...body },
          connection: { provider: 'google', status: 'active' }
        })
      } as Response
    }

    return {
      ok: true,
      json: async () => ({})
    } as Response
  })
}

const renderSettings = () => {
  render(
    <SettingsPage
      userId="test-agent"
      userProfile={defaultAgent}
      onSaveProfile={jest.fn()}
      notificationSettings={defaultNotifications}
      onSaveNotifications={jest.fn()}
      emailSettings={defaultEmailSettings}
      onSaveEmailSettings={jest.fn()}
      calendarSettings={defaultCalendarSettings}
      onSaveCalendarSettings={jest.fn()}
      billingSettings={defaultBilling}
      onSaveBillingSettings={jest.fn()}
      onBackToDashboard={jest.fn()}
    />
  )
}

beforeEach(() => {
  global.fetch = createFetchMock()
  mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: defaultAgent.email } }, error: null })
  mockedSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })
  mockedSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: null })
  mockedOnboardingService.listPaymentProviders.mockResolvedValue(['paypal'])
  mockedOnboardingService.createCheckoutSession.mockResolvedValue({
    provider: 'paypal',
    url: 'https://paypal.test/checkout',
    id: 'order-123',
    amount: 5900,
    currency: 'USD'
  })
})

afterEach(() => {
  jest.clearAllMocks()
  global.fetch = originalFetch
})

describe('SettingsPage calendar tab', () => {

  it('renders a single calendar settings form with integration cards', async () => {
    renderSettings()

    fireEvent.click(await screen.findByRole('button', { name: /calendar/i }))

    await screen.findByRole('heading', { name: /calendar integration/i })

    expect(screen.getByText('Google Calendar')).toBeInTheDocument()
    expect(screen.getByText('Apple Calendar')).toBeInTheDocument()

    const saveButtons = screen.getAllByRole('button', { name: /save calendar settings/i })
    expect(saveButtons).toHaveLength(1)
  })

  it('saves calendar preferences via API and shows confirmation message', async () => {
    const fetchMock = createFetchMock()
    global.fetch = fetchMock as unknown as typeof global.fetch

    renderSettings()

    fireEvent.click(await screen.findByRole('button', { name: /calendar/i }))

    await screen.findByDisplayValue('09:00')
    const startInput = screen.getByLabelText('Start Time')
    fireEvent.change(startInput, { target: { value: '08:00' } })

    const saveButton = screen.getByRole('button', { name: /save calendar settings/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/calendar/settings/test-agent'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(patchCall).toBeDefined()
    const payload = JSON.parse((patchCall?.[1]?.body as string) || '{}')
    expect(payload.workingHours.start).toBe('08:00')

    expect(await screen.findByText('Calendar settings saved successfully.')).toBeInTheDocument()
  })
})

describe('SettingsPage security tab', () => {
  it('updates password via Supabase auth flow', async () => {
    renderSettings()

    fireEvent.click(await screen.findByRole('button', { name: /security/i }))

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'OldPass123!' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'NewPass123!' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'NewPass123!' } })

    const [updateButton] = screen.getAllByRole('button', { name: /update password/i })
    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(mockedSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: defaultAgent.email,
        password: 'OldPass123!'
      })
    })

    expect(mockedSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NewPass123!' })
    expect(await screen.findByText('Password updated successfully.')).toBeInTheDocument()
  })
})

describe('SettingsPage billing tab', () => {
  const originalOpen = window.open

  afterEach(() => {
    window.open = originalOpen
  })

  it('launches PayPal checkout when available', async () => {
    const openSpy = jest.fn().mockReturnValue({})
    window.open = openSpy as unknown as typeof window.open

    mockedOnboardingService.listPaymentProviders.mockResolvedValue(['paypal'])
    mockedOnboardingService.createCheckoutSession.mockResolvedValue({
      provider: 'paypal',
      url: 'https://paypal.test/session',
      id: 'order-xyz',
      amount: 13900,
      currency: 'USD'
    })

    renderSettings()

    fireEvent.click(await screen.findByRole('button', { name: /billing/i }))

    await waitFor(() => expect(mockedOnboardingService.listPaymentProviders).toHaveBeenCalled())

    const manageButton = await screen.findByRole('button', { name: /manage via paypal/i })
    fireEvent.click(manageButton)

    await waitFor(() => {
      expect(mockedOnboardingService.createCheckoutSession).toHaveBeenCalledWith({
        slug: 'test-agent',
        provider: 'paypal'
      })
    })

    expect(openSpy).toHaveBeenCalledWith('https://paypal.test/session', '_blank', 'noopener,noreferrer')
    expect(await screen.findByText('Opening PayPal subscription checkout in a new tab.')).toBeInTheDocument()
  })
})

