import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('../../pages/AICardBuilder', () => ({ __esModule: true, default: () => null }))

import type { AppRoutesProps } from '../AppRoutes'
import { AppRoutes } from '../AppRoutes'
import { SAMPLE_AGENT } from '../../constants'
import type {
  AgentProfile,
  Appointment,
  BillingSettings,
  CalendarSettings,
  EmailSettings,
  Lead,
  NotificationSettings,
  Property
} from '../../types'

type PartialAppRoutesProps = Partial<Omit<AppRoutesProps, 'session' | 'ui' | 'data' | 'operations' | 'registration' | 'auth'>> & {
  session?: Partial<AppRoutesProps['session']>
  ui?: Partial<AppRoutesProps['ui']>
  data?: Partial<AppRoutesProps['data']>
  operations?: Partial<AppRoutesProps['operations']>
  registration?: Partial<AppRoutesProps['registration']>
  auth?: Partial<AppRoutesProps['auth']>
}

const defaultNotificationSettings: NotificationSettings = {
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
  followUpSequences: true
}

const defaultCalendarSettings: CalendarSettings = {
  integrationType: 'google',
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

const defaultBillingSettings: BillingSettings = {
  planName: 'Solo Agent',
  history: []
}

const sampleAgent: AgentProfile = {
  ...SAMPLE_AGENT,
  socials: SAMPLE_AGENT.socials ?? []
}

const sampleProperty: Property = {
  id: 'prop-1',
  title: 'Sample Property',
  address: '123 Main St',
  price: 750000,
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1800,
  description: 'A charming property for testing.',
  heroPhotos: ['https://example.com/hero.jpg'],
  galleryPhotos: ['https://example.com/gallery.jpg'],
  appFeatures: { virtualTour: true },
  agent: sampleAgent,
  propertyType: 'Single-Family Home',
  features: ['Open Floor Plan'],
  imageUrl: 'https://example.com/image.jpg',
  ctaListingUrl: 'https://example.com/listing'
}

const sampleLead: Lead = {
  id: 'lead-1',
  name: 'Jane Buyer',
  status: 'New',
  email: 'jane@example.com',
  phone: '555-0100',
  date: new Date().toISOString(),
  lastMessage: 'Looking forward to a tour.'
}

const sampleAppointment: Appointment = {
  id: 'appt-1',
  type: 'Consultation',
  date: new Date().toISOString(),
  time: '2:00 PM',
  notes: 'Discuss financing options'
}

const mergeProps = (base: AppRoutesProps, overrides?: PartialAppRoutesProps): AppRoutesProps => {
  if (!overrides) return base
  return {
    ...base,
    ...overrides,
    session: { ...base.session, ...(overrides.session ?? {}) },
    ui: { ...base.ui, ...(overrides.ui ?? {}) },
    data: { ...base.data, ...(overrides.data ?? {}) },
    operations: { ...base.operations, ...(overrides.operations ?? {}) },
    registration: { ...base.registration, ...(overrides.registration ?? {}) },
    auth: { ...base.auth, ...(overrides.auth ?? {}) }
  }
}

const createProps = () => {
  const rememberReturnPath = jest.fn()
  const openAdminLogin = jest.fn()

  const props: AppRoutesProps = {
    session: {
      user: null,
      isDemoMode: false,
      isLocalAdmin: false,
      isAdminUser: false
    },
    ui: {
      agentSidebarOpen: false,
      openAgentSidebar: jest.fn(),
      closeAgentSidebar: jest.fn(),
      adminSidebarOpen: false,
      openAdminSidebar: jest.fn(),
      closeAdminSidebar: jest.fn(),
      scrollToSection: null,
      setScrollToSection: jest.fn()
    },
    data: {
      userProfile: sampleAgent,
      properties: [sampleProperty],
      selectedProperty: null,
      leads: [sampleLead],
      appointments: [sampleAppointment],
      interactions: [],
      tasks: [],
      sequences: [],
      notificationSettings: defaultNotificationSettings,
      emailSettings: defaultEmailSettings,
      calendarSettings: defaultCalendarSettings,
      billingSettings: defaultBillingSettings,
      activeAgentSlug: null
    },
    operations: {
      enterDemoMode: jest.fn(),
      openConsultationModal: jest.fn(),
      openAdminLogin,
      setActiveAgentSlug: jest.fn(),
      selectProperty: jest.fn(),
      upsertProperty: jest.fn(),
      removeProperty: jest.fn(),
      seedSampleProperty: jest.fn().mockResolvedValue(undefined),
      addLead: jest.fn().mockResolvedValue(sampleLead),
      addAppointment: jest.fn().mockResolvedValue(undefined),
      updateTask: jest.fn(),
      addTask: jest.fn(),
      deleteTask: jest.fn(),
      saveNotificationSettings: jest.fn(),
      saveEmailSettings: jest.fn(),
      saveCalendarSettings: jest.fn(),
      saveBillingSettings: jest.fn(),
      setInteractions: jest.fn(),
      setUserProfile: jest.fn(),
      signOut: jest.fn().mockResolvedValue(undefined)
    },
    registration: {
      slugForCheckout: null
    },
    auth: {
      rememberReturnPath
    }
  }

  return { props, rememberReturnPath, openAdminLogin }
}

const renderWithRouter = (path: string, overrides?: PartialAppRoutesProps) => {
  const { props, rememberReturnPath, openAdminLogin } = createProps()
  const merged = mergeProps(props, overrides)

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes {...merged} />
    </MemoryRouter>
  )

  return { rememberReturnPath, openAdminLogin }
}

describe('AppRoutes', () => {
  it('redirects unauthenticated users away from agent routes', async () => {
    const { rememberReturnPath } = renderWithRouter('/app/dashboard')

    expect(await screen.findByRole('heading', { name: /sign in to homelistingai/i })).toBeInTheDocument()
    expect(rememberReturnPath).toHaveBeenCalled()
  })

  it('allows demo mode users to access agent dashboard content', async () => {
    renderWithRouter('/app/dashboard', { session: { isDemoMode: true } })

    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('redirects non-admin users away from admin routes and opens the admin login', async () => {
    const { rememberReturnPath, openAdminLogin } = renderWithRouter('/admin/dashboard', {
      session: { isAdminUser: false, isLocalAdmin: false }
    })

    expect(await screen.findByRole('heading', { name: /sign in to homelistingai/i })).toBeInTheDocument()
    expect(rememberReturnPath).toHaveBeenCalled()
    expect(openAdminLogin).toHaveBeenCalled()
  })

  it('allows local admins to access agent routes without redirecting', async () => {
    const { rememberReturnPath } = renderWithRouter('/app/dashboard', {
      session: { isLocalAdmin: true }
    })

    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    expect(rememberReturnPath).not.toHaveBeenCalled()
  })

  it('allows admin users to access admin routes without forcing login modal', async () => {
    const { rememberReturnPath, openAdminLogin } = renderWithRouter('/admin/dashboard', {
      session: { isAdminUser: true }
    })

    expect(await screen.findByRole('heading', { name: /admin overview/i })).toBeInTheDocument()
    expect(rememberReturnPath).not.toHaveBeenCalled()
    expect(openAdminLogin).not.toHaveBeenCalled()
  })

  it('routes authenticated agents accessing /app to the dashboard redirect', async () => {
    renderWithRouter('/app', {
      session: { user: { uid: 'agent-123' } as AppRoutesProps['session']['user'] }
    })

    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('routes authenticated admins accessing /admin to the dashboard redirect', async () => {
    renderWithRouter('/admin', {
      session: { isAdminUser: true }
    })

    expect(await screen.findByRole('heading', { name: /admin overview/i })).toBeInTheDocument()
  })
})
