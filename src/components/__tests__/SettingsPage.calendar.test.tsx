import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from '../SettingsPage'
import {
  AgentProfile,
  BillingSettings,
  CalendarSettings,
  EmailSettings,
  NotificationSettings
} from '../../types'
import { supabase } from '../../services/supabase'
import { AgentBrandingContext } from '../../context/AgentBrandingContextInstance'
import type { AgentBrandingContextValue } from '../../context/AgentBrandingContext'

jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest.fn(),
      updateUser: jest.fn(),
      mfa: {
        listFactors: jest.fn().mockResolvedValue({ data: { totp: [] }, error: null }),
        enroll: jest.fn(),
        challenge: jest.fn(),
        verify: jest.fn(),
        unenroll: jest.fn()
      }
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

jest.mock('../../services/dashboardBillingService', () => ({
  fetchDashboardBilling: jest.fn(),
  fetchDashboardBillingUsage: jest.fn(),
  createBillingCheckoutSession: jest.fn(),
  createBillingPortalSession: jest.fn(),
  deleteDashboardAccount: jest.fn()
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

const brandingContextValue: AgentBrandingContextValue = {
  profile: null,
  aiCardProfile: null,
  loading: false,
  error: null,
  hasProfile: true,
  brandColor: '#0ea5e9',
  headshotUrl: defaultAgent.headshotUrl,
  logoUrl: defaultAgent.logoUrl,
  uiProfile: defaultAgent,
  contact: {
    name: defaultAgent.name,
    title: defaultAgent.title,
    company: defaultAgent.company,
    phone: defaultAgent.phone,
    email: defaultAgent.email,
    website: ''
  },
  refresh: jest.fn(),
  getSocialLink: () => '',
  getSignature: () => defaultAgent.name,
  signature: defaultAgent.name
}

const originalFetch = global.fetch
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockedBilling = jest.requireMock('../../services/dashboardBillingService') as {
  fetchDashboardBilling: jest.Mock
  createBillingCheckoutSession: jest.Mock
}
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

const onSaveCalendarSettingsMock = jest.fn()

const renderSettings = () => {
  render(
    <MemoryRouter>
    <AgentBrandingContext.Provider value={brandingContextValue}>
      <SettingsPage
        userId="test-agent"
        userProfile={defaultAgent}
        onSaveProfile={jest.fn()}
        notificationSettings={defaultNotifications}
        onSaveNotifications={jest.fn()}
        emailSettings={defaultEmailSettings}
        onSaveEmailSettings={jest.fn()}
        calendarSettings={defaultCalendarSettings}
        onSaveCalendarSettings={onSaveCalendarSettingsMock}
        securitySettings={{ loginNotifications: true, sessionTimeout: 24, twoFactorEnabled: false }}
        onSaveSecuritySettings={jest.fn()}
        billingSettings={defaultBilling}
        onSaveBillingSettings={jest.fn()}
        onBackToDashboard={jest.fn()}
      />
    </AgentBrandingContext.Provider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  global.fetch = createFetchMock()
  mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: defaultAgent.email } }, error: null })
  mockedSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })
  mockedSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: null })
  mockedBilling.fetchDashboardBilling.mockResolvedValue({
    plan: { id: 'free', status: 'active', current_period_end: null }
  })
  mockedBilling.createBillingCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.test/session' })
})

afterEach(() => {
  jest.clearAllMocks()
  global.fetch = originalFetch
})

describe('SettingsPage calendar tab', () => {

  it('renders a single calendar settings form with integration cards', async () => {
    renderSettings()

    fireEvent.click((await screen.findAllByRole('button', { name: /calendar/i }))[0])

    const headings = await screen.findAllByRole('heading', { name: /calendar settings/i })
    expect(headings.length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText(/Google, Apple, and Outlook ready/i)).toBeInTheDocument()

    const saveButtons = screen.getAllByRole('button', { name: /save calendar settings/i })
    expect(saveButtons).toHaveLength(1)
  })

  it('saves calendar preferences via the onSave handler', async () => {
    renderSettings()

    fireEvent.click((await screen.findAllByRole('button', { name: /calendar/i }))[0])

    await screen.findByDisplayValue('09:00')
    const startInput = screen.getByLabelText('Start Time')
    fireEvent.change(startInput, { target: { value: '08:00' } })

    const saveButton = screen.getByRole('button', { name: /save calendar settings/i })
    fireEvent.click(saveButton)

    await waitFor(() => expect(onSaveCalendarSettingsMock).toHaveBeenCalled())
    const savedSettings = onSaveCalendarSettingsMock.mock.calls[0][0]
    expect(savedSettings.workingHours.start).toBe('08:00')
  })
})

describe('SettingsPage security tab', () => {
  it('updates password via Supabase auth flow', async () => {
    mockedSupabase.auth.updateUser.mockResolvedValue({ error: null })
    renderSettings()

    fireEvent.click((await screen.findAllByRole('button', { name: /security/i }))[0])

    // Session-based change: no current-password re-auth step.
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'NewPass123!' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'NewPass123!' } })

    const [updateButton] = screen.getAllByRole('button', { name: /update password/i })
    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(mockedSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NewPass123!' })
    })
    expect(mockedSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(await screen.findByText('Password updated successfully')).toBeInTheDocument()
  })
})

describe('SettingsPage billing tab', () => {
  const originalOpen = window.open

  afterEach(() => {
    window.open = originalOpen
  })

  it('starts Stripe checkout when upgrading', async () => {
    renderSettings()

    fireEvent.click((await screen.findAllByRole('button', { name: /billing/i }))[0])

    await waitFor(() => expect(mockedBilling.fetchDashboardBilling).toHaveBeenCalled())

    const upgradeButton = await screen.findByRole('button', { name: /upgrade to lo — \$149\/mo/i })
    fireEvent.click(upgradeButton)

    await waitFor(() => {
      expect(mockedBilling.createBillingCheckoutSession).toHaveBeenCalledWith('starter')
    })
  })
})
