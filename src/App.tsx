import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { AISidekickProvider } from './context/AISidekickContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import ConsultationModal from './components/ConsultationModal'
import AdminLogin from './components/AdminLogin'
import LoadingSpinner from './components/LoadingSpinner'
import { AppRoutes } from './routes/AppRoutes'
import { supabase } from './services/supabase'
import { adminAuthService } from './services/adminAuthService'
import { getRegistrationContext } from './services/agentOnboardingService'
import { getProfileForDashboard, subscribeToProfileChanges, resetAgentProfileStore } from './services/agentProfileService'
import { listAppointments } from './services/appointmentsService'
import { listingsService } from './services/listingsService'
import { leadsService } from './services/leadsService'
import SequenceExecutionService from './services/sequenceExecutionService'
import { logAppointmentScheduled, logLeadCaptured } from './services/aiFunnelService'
import { seedSampleProperty } from './utils/seed'
import { PerformanceService } from './services/performanceService'
import { EnvValidation } from './utils/envValidation'
import {
  AgentProfile,
  AgentTask,
  Appointment,
  BillingSettings,
  CalendarSettings,
  EmailSettings,
  FollowUpSequence,
  Interaction,
  Lead,
  NotificationSettings,
  Property
} from './types'
import { AppUser } from './types/app'
import { DEMO_FAT_APPOINTMENTS, DEMO_FAT_LEADS, DEMO_FAT_PROPERTIES, DEMO_SEQUENCES } from './demoConstants'
import { SAMPLE_AGENT, SAMPLE_INTERACTIONS, SAMPLE_TASKS } from './constants'

const RETURN_TO_KEY = 'hlai:return_to'

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
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

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  integrationType: 'oauth',
  aiEmailProcessing: true,
  autoReply: true,
  leadScoring: true,
  followUpSequences: true
}

const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
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

const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  planName: 'Solo Agent',
  history: [{ id: 'inv-123', date: '07/15/2024', amount: 59, status: 'Paid' }]
}

const persistUserId = (userId: string | null) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    if (userId) {
      window.localStorage.setItem('hlai_user_id', userId)
    } else {
      window.localStorage.removeItem('hlai_user_id')
    }
  } catch (error) {
    console.warn('[App] Failed to persist user id', error)
  }
}

const App = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [user, setUser] = useState<AppUser | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isLocalAdmin, setIsLocalAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return Boolean(window.localStorage?.getItem('adminUser'))
    } catch {
      return false
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const [isAgentSidebarOpen, setAgentSidebarOpen] = useState(false)
  const [isAdminSidebarOpen, setAdminSidebarOpen] = useState(false)
  const [isConsultationModalOpen, setConsultationModalOpen] = useState(false)
  const [scrollToSection, setScrollToSection] = useState<string | null>(null)

  const [isAdminLoginOpen, setAdminLoginOpen] = useState(false)
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null)
  const [isAdminLoginLoading, setAdminLoginLoading] = useState(false)

  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [interactions, setInteractionsState] = useState<Interaction[]>(SAMPLE_INTERACTIONS)
  const [tasks, setTasks] = useState<AgentTask[]>(SAMPLE_TASKS)
  const [sequences, setSequences] = useState<FollowUpSequence[]>(DEMO_SEQUENCES)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  )
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(DEFAULT_EMAIL_SETTINGS)
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(DEFAULT_CALENDAR_SETTINGS)
  const [billingSettings, setBillingSettings] = useState<BillingSettings>(DEFAULT_BILLING_SETTINGS)
  const [activeAgentSlug, setActiveAgentSlug] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<AgentProfile>(SAMPLE_AGENT)

  const selectedProperty = useMemo(
    () => properties.find(property => property.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId]
  )

  const registrationContext = getRegistrationContext() as { slug?: string } | null

  const rememberReturnPath = useCallback(() => {
    const current = `${location.pathname}${location.search}`
    const existing = sessionStorage.getItem(RETURN_TO_KEY)
    if (!existing || existing !== current) {
      sessionStorage.setItem(RETURN_TO_KEY, current)
    }
  }, [location.pathname, location.search])

  const consumeReturnPath = useCallback(() => {
    const stored = sessionStorage.getItem(RETURN_TO_KEY)
    if (stored) {
      sessionStorage.removeItem(RETURN_TO_KEY)
      navigate(stored, { replace: true })
      return true
    }
    return false
  }, [navigate])

  const triggerLeadSequences = useCallback(
    async (lead: Lead) => {
      try {
        const sequenceService = SequenceExecutionService.getInstance()
        await sequenceService.triggerSequences(
          'Lead Capture',
          {
            lead,
            agent: userProfile || SAMPLE_AGENT,
            property: selectedPropertyId
              ? properties.find(property => property.id === selectedPropertyId)
              : undefined
          },
          sequences
        )
      } catch (error) {
        console.error('Error triggering lead sequences:', error)
      }
    },
    [properties, selectedPropertyId, sequences, userProfile]
  )

  const triggerAppointmentSequences = useCallback(
    async (appointment: Appointment, lead?: Lead) => {
      if (!lead) return
      try {
        const sequenceService = SequenceExecutionService.getInstance()
        await sequenceService.triggerSequences(
          'Appointment Scheduled',
          {
            lead,
            agent: userProfile || SAMPLE_AGENT,
            property: appointment.propertyId
              ? properties.find(property => property.id === appointment.propertyId)
              : undefined
          },
          sequences
        )
      } catch (error) {
        console.error('Error triggering appointment sequences:', error)
      }
    },
    [properties, sequences, userProfile]
  )

  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true)
    setUser(null)
    setIsAdminUser(false)
    setProperties(DEMO_FAT_PROPERTIES)
    setLeads(DEMO_FAT_LEADS)
    setAppointments(DEMO_FAT_APPOINTMENTS)
    setInteractionsState(SAMPLE_INTERACTIONS)
    setTasks(SAMPLE_TASKS)
    setSequences(DEMO_SEQUENCES)
    setUserProfile(SAMPLE_AGENT)
    setSelectedPropertyId(null)
    setActiveAgentSlug(null)
    setAgentSidebarOpen(false)
    setAdminSidebarOpen(false)
    setIsSettingUp(false)
    setIsLoading(false)
    setAuthChecked(true)
    navigate('/app/dashboard', { replace: true })
  }, [navigate])

  const selectProperty = useCallback((id: string | null) => {
    setSelectedPropertyId(id)
  }, [])

  const upsertProperty = useCallback((property: Property) => {
    setProperties(prev => {
      const index = prev.findIndex(p => p.id === property.id)
      if (index === -1) {
        return [property, ...prev]
      }
      const updated = [...prev]
      updated[index] = property
      return updated
    })
    setSelectedPropertyId(property.id)
  }, [])

  const removeProperty = useCallback((id: string) => {
    setProperties(prev => prev.filter(property => property.id !== id))
    setSelectedPropertyId(prev => (prev === id ? null : prev))
  }, [])

  const seedSample = useCallback(async () => {
    try {
      const created = await seedSampleProperty(userProfile, user?.uid || undefined)
      setProperties(prev => [created, ...prev])
      setSelectedPropertyId(created.id)
    } catch (error) {
      console.error('Seed failed', error)
      alert('Seeding sample listing failed. Check Supabase connection and RLS.')
    }
  }, [user, userProfile])

  const addLead = useCallback(
    async (payload: { name: string; email: string; phone: string; message: string; source: string }) => {
      try {
        const createdLead = await leadsService.create({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          source: payload.source || 'Website',
          lastMessage: payload.message
        })
        setLeads(prev => [createdLead, ...prev])
        await triggerLeadSequences(createdLead)
        void logLeadCaptured(createdLead)
        return createdLead
      } catch (error) {
        console.error('Failed to create lead via API, using local fallback:', error)
        const fallbackLead: Lead = {
          id: `lead-${Date.now()}`,
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          lastMessage: payload.message,
          status: 'New',
          date: new Date().toISOString()
        }
        setLeads(prev => [fallbackLead, ...prev])
        await triggerLeadSequences(fallbackLead)
        void logLeadCaptured(fallbackLead)
        return fallbackLead
      }
    },
    [triggerLeadSequences]
  )

  const addAppointment = useCallback(
    async (appointment: Appointment) => {
      setAppointments(prev => [appointment, ...prev])
      const matchedLead = appointment.leadId
        ? leads.find(lead => lead.id === appointment.leadId)
        : undefined
      if (matchedLead) {
        void logAppointmentScheduled(appointment, matchedLead)
      } else {
        void logAppointmentScheduled(appointment)
      }
      await triggerAppointmentSequences(appointment, matchedLead)
    },
    [leads, triggerAppointmentSequences]
  )

  const updateTask = useCallback((taskId: string, updates: Partial<AgentTask>) => {
    setTasks(prev => prev.map(task => (task.id === taskId ? { ...task, ...updates } : task)))
  }, [])

  const addTask = useCallback((task: AgentTask) => {
    setTasks(prev => [task, ...prev])
  }, [])

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }, [])

  const saveNotificationSettings = useCallback((settings: NotificationSettings) => {
    setNotificationSettings(settings)
  }, [])

  const saveEmailSettings = useCallback((settings: EmailSettings) => {
    setEmailSettings(settings)
  }, [])

  const saveCalendarSettings = useCallback((settings: CalendarSettings) => {
    setCalendarSettings(settings)
  }, [])

  const saveBillingSettings = useCallback((settings: BillingSettings) => {
    setBillingSettings(settings)
  }, [])

  const setInteractions = useCallback(
    (updater: Parameters<typeof setInteractionsState>[0]) => {
      setInteractionsState(updater)
    },
    []
  )

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Supabase sign-out failed', error)
    }
    await adminAuthService.logout()
    sessionStorage.removeItem(RETURN_TO_KEY)
    setIsLocalAdmin(false)
    setUser(null)
    setIsAdminUser(false)
    setIsDemoMode(false)
    setProperties([])
    setLeads([])
    setAppointments([])
    setInteractionsState(SAMPLE_INTERACTIONS)
    setTasks(SAMPLE_TASKS)
    setSequences(DEMO_SEQUENCES)
    setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
    setEmailSettings(DEFAULT_EMAIL_SETTINGS)
    setCalendarSettings(DEFAULT_CALENDAR_SETTINGS)
    setBillingSettings(DEFAULT_BILLING_SETTINGS)
    setUserProfile(SAMPLE_AGENT)
    setSelectedPropertyId(null)
    setActiveAgentSlug(null)
    setAgentSidebarOpen(false)
    setAdminSidebarOpen(false)
    resetAgentProfileStore()
    navigate('/', { replace: true })
  }, [navigate])

  const loadLeadsFromBackend = useCallback(async () => {
    try {
      const data = await leadsService.list()
      setLeads(data.leads ?? [])
    } catch (error) {
      console.error('Error loading leads from backend:', error)
      setLeads(DEMO_FAT_LEADS)
    }
  }, [])

  const loadAgentProfile = useCallback(async () => {
    try {
      const profileData = await getProfileForDashboard()
      setUserProfile(prev => ({
        ...prev,
        name: profileData.name,
        title: profileData.title,
        company: profileData.company,
        headshotUrl: profileData.headshotUrl,
        email: profileData.email,
        phone: profileData.phone,
        language: profileData.language ?? prev.language
      }))
    } catch (error) {
      console.error('Failed to load agent profile:', error)
    }
  }, [])

  const loadListingsFromBackend = useCallback(async () => {
    try {
      const rows = await listingsService.listProperties()
      if (Array.isArray(rows) && rows.length > 0) {
        setProperties(rows)
      } else {
        setProperties(DEMO_FAT_PROPERTIES)
      }
    } catch (error) {
      console.error('Error loading listings from Supabase:', error)
      setProperties(DEMO_FAT_PROPERTIES)
    }
  }, [])

  const loadAppointments = useCallback(
    async (userId?: string) => {
      try {
        const rows = await listAppointments(userId)
        const mapped: Appointment[] = rows.map(row => ({
          id: row.id,
          type: row.kind,
          date: row.date ?? '',
          time: row.time_label ?? 'Time TBD',
          leadId: row.lead_id ?? undefined,
          leadName: row.name,
          propertyId: row.property_id ?? undefined,
          propertyAddress: row.property_address ?? undefined,
          notes: row.notes ?? '',
          status: row.status,
          email: row.email ?? undefined,
          phone: row.phone ?? undefined,
          remindAgent: row.remind_agent,
          remindClient: row.remind_client,
          agentReminderMinutes: row.agent_reminder_minutes_before,
          clientReminderMinutes: row.client_reminder_minutes_before,
          meetLink: row.meet_link ?? undefined,
          startIso: row.start_iso ?? undefined,
          endIso: row.end_iso ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
        setAppointments(mapped)
      } catch (error) {
        console.warn('Failed loading appointments', error)
        if (isDemoMode) {
          setAppointments(DEMO_FAT_APPOINTMENTS)
        }
      }
    },
    [isDemoMode]
  )

  const syncSession = useCallback(
    async (supabaseUser: User | null) => {
      const currentUser: AppUser | null = supabaseUser
        ? {
            uid: supabaseUser.id,
            email: supabaseUser.email,
            displayName: supabaseUser.user_metadata?.name
          }
        : null

      setUser(currentUser)
      setIsAdminUser(
        Boolean(
          supabaseUser?.email === 'us@homelistingai.com' ||
            supabaseUser?.user_metadata?.role === 'admin'
        )
      )
      setIsDemoMode(prev => (supabaseUser ? false : prev))
      persistUserId(currentUser ? currentUser.uid : null)

      if (!supabaseUser) {
        setProperties([])
        setLeads([])
        setAppointments([])
        setInteractionsState(SAMPLE_INTERACTIONS)
        setTasks(SAMPLE_TASKS)
        setSequences(DEMO_SEQUENCES)
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
        setEmailSettings(DEFAULT_EMAIL_SETTINGS)
        setCalendarSettings(DEFAULT_CALENDAR_SETTINGS)
        setBillingSettings(DEFAULT_BILLING_SETTINGS)
        setUserProfile(SAMPLE_AGENT)
        setSelectedPropertyId(null)
        setActiveAgentSlug(null)
        setAgentSidebarOpen(false)
        setAdminSidebarOpen(false)
        setIsSettingUp(false)
        setIsLoading(false)
        setAuthChecked(true)
        resetAgentProfileStore()
        return
      }

      if (supabaseUser.email === 'us@homelistingai.com') {
        setUserProfile({
          ...SAMPLE_AGENT,
          name: 'System Administrator',
          email: supabaseUser.email ?? '',
          headshotUrl: `https://i.pravatar.cc/150?u=${supabaseUser.id}`
        })
        setProperties([])
        setLeads([])
        setAppointments([])
        setInteractionsState(SAMPLE_INTERACTIONS)
        setTasks(SAMPLE_TASKS)
        setSequences(DEMO_SEQUENCES)
        setSelectedPropertyId(null)
        setActiveAgentSlug(null)
        setIsSettingUp(false)
        setIsLoading(false)
        setAuthChecked(true)
        if (!consumeReturnPath()) {
          if (!location.pathname.startsWith('/admin')) {
            navigate('/admin/dashboard', { replace: true })
          }
        }
        return
      }

      setIsLoading(true)
      setIsSettingUp(false)
      await Promise.all([
        loadAgentProfile(),
        loadListingsFromBackend(),
        loadLeadsFromBackend(),
        loadAppointments(supabaseUser.id)
      ])
      setIsLoading(false)
      setAuthChecked(true)
      if (!consumeReturnPath()) {
        if (
          location.pathname === '/' ||
          location.pathname === '/signin' ||
          location.pathname === '/signup'
        ) {
          navigate('/app/dashboard', { replace: true })
        }
      }
    },
    [
      consumeReturnPath,
      loadAgentProfile,
      loadAppointments,
      loadLeadsFromBackend,
      loadListingsFromBackend,
      location.pathname,
      navigate
    ]
  )

  useEffect(() => {
    EnvValidation.logValidationResults()
    PerformanceService.initialize()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: StorageEvent) => {
      if (event.key === 'adminUser') {
        setIsLocalAdmin(Boolean(event.newValue))
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])


  useEffect(() => {
    let isMounted = true

    const initialise = async () => {
      const { data } = await supabase.auth.getUser()
      if (!isMounted) return
      await syncSession(data.user)
    }

    initialise()

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      await syncSession(session?.user ?? null)
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [syncSession])

  useEffect(() => {
    if (user && !isDemoMode) {
      const unsubscribe = subscribeToProfileChanges(updatedProfile => {
        setUserProfile(prev => ({
          ...prev,
          name: updatedProfile.name,
          title: updatedProfile.title,
          company: updatedProfile.company,
          headshotUrl: updatedProfile.headshotUrl,
          email: updatedProfile.email,
          phone: updatedProfile.phone
        }))
      })
      return () => unsubscribe()
    }
    return undefined
  }, [user, isDemoMode])

  const handleAdminLogin = useCallback(
    async (email: string, password: string) => {
      setAdminLoginLoading(true)
      setAdminLoginError(null)
      try {
        const demo = await adminAuthService.login(email.trim(), password.trim())
        if (demo.success) {
          setIsLocalAdmin(true)
          setAdminLoginOpen(false)
          if (!consumeReturnPath()) {
            navigate('/admin/dashboard', { replace: true })
          }
          return
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        })

        if (error) {
          setAdminLoginError('Invalid login credentials')
          return
        }

        const { data } = await supabase.auth.getUser()
        if (data.user) {
          setIsAdminUser(true)
          setAdminLoginOpen(false)
          if (!consumeReturnPath()) {
            navigate('/admin/dashboard', { replace: true })
          }
        }
      } catch (error) {
        console.error('Admin login failed', error)
        setAdminLoginError('Invalid login credentials')
      } finally {
        setAdminLoginLoading(false)
      }
    },
    [consumeReturnPath, navigate]
  )

  useEffect(() => {
    if (!activeAgentSlug && registrationContext?.slug) {
      setActiveAgentSlug(registrationContext.slug)
    }
  }, [activeAgentSlug, registrationContext])

  if (isLoading || !authChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <LoadingSpinner size="xl" type="dots" text="Loading Application..." />
      </div>
    )
  }

  if (isSettingUp) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <LoadingSpinner size="xl" type="pulse" text="Setting up your new account..." />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <AISidekickProvider>
        <AppRoutes
          session={{ user, isDemoMode, isLocalAdmin, isAdminUser }}
          ui={{
            agentSidebarOpen: isAgentSidebarOpen,
            openAgentSidebar: () => setAgentSidebarOpen(true),
            closeAgentSidebar: () => setAgentSidebarOpen(false),
            adminSidebarOpen: isAdminSidebarOpen,
            openAdminSidebar: () => setAdminSidebarOpen(true),
            closeAdminSidebar: () => setAdminSidebarOpen(false),
            scrollToSection,
            setScrollToSection
          }}
          data={{
            userProfile,
            properties,
            selectedProperty,
            leads,
            appointments,
            interactions,
            tasks,
            sequences,
            notificationSettings,
            emailSettings,
            calendarSettings,
            billingSettings,
            activeAgentSlug
          }}
          operations={{
            enterDemoMode,
            openConsultationModal: () => setConsultationModalOpen(true),
            openAdminLogin: () => {
              setAdminLoginError(null)
              setAdminLoginOpen(true)
            },
            setActiveAgentSlug,
            selectProperty,
            upsertProperty,
            removeProperty,
            seedSampleProperty: seedSample,
            addLead,
            addAppointment,
            updateTask,
            addTask,
            deleteTask,
            saveNotificationSettings,
            saveEmailSettings,
            saveCalendarSettings,
            saveBillingSettings,
            setInteractions,
            setUserProfile,
            signOut
          }}
          registration={{
            slugForCheckout: activeAgentSlug || registrationContext?.slug || null
          }}
          auth={{
            rememberReturnPath
          }}
        />
      </AISidekickProvider>
      {isConsultationModalOpen && (
        <ConsultationModal
          onClose={() => setConsultationModalOpen(false)}
          onSuccess={() => setConsultationModalOpen(false)}
        />
      )}
      {isAdminLoginOpen && (
        <AdminLogin
          onLogin={handleAdminLogin}
          onBack={() => {
            setAdminLoginOpen(false)
            setAdminLoginError(null)
          }}
          isLoading={isAdminLoginLoading}
          error={adminLoginError ?? undefined}
        />
      )}
    </ErrorBoundary>
  )
}

export default App

