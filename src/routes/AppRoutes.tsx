import { useEffect } from 'react'
import type { Dispatch, ReactElement, SetStateAction } from 'react'
import { Navigate, Outlet, useNavigate, useParams, useRoutes } from 'react-router-dom'
import { AdminModalProvider } from '../context/AdminModalContext'
import AgentLayout from './layouts/AgentLayout'
import AdminAppLayout from './layouts/AdminAppLayout'
import PublicLayout from './layouts/PublicLayout'
import LandingPage from '../components/LandingPage'
import SignUpPage from '../components/SignUpPage'
import SignInPage from '../components/SignInPage'
import CheckoutPage from '../components/CheckoutPage'
import Dashboard from '../components/Dashboard'
import ListingsPage from '../components/ListingsPage'
import PropertyPage from '../components/PropertyPage'
import AddListingPage from '../components/AddListingPage'
import LeadsAndAppointmentsPage from '../components/LeadsAndAppointmentsPage'
import InteractionHubPage from '../components/InteractionHubPage'
import AIConversationsPage from '../components/AIConversationsPage'
import EnhancedAISidekicksHub from '../components/EnhancedAISidekicksHub'
import AIInteractiveTraining from '../components/AIInteractiveTraining'
import AgentDashboardBlueprint from '../components/AgentDashboardBlueprint'
import DemoListingPage from '../components/DemoListingPage'
import NewLandingPage from '../components/NewLandingPage'
import BlogPage from '../components/BlogPage'
import BlogPostPage from '../components/BlogPostPage'
import AICardBuilderPage from '../pages/AICardBuilder'
import AdminLayout from '../components/AdminLayout'
import AdminSetup from '../components/AdminSetup'
import SettingsPage from '../components/SettingsPage'
import NotificationSystem from '../components/NotificationSystem'
import LoadingSpinner from '../components/LoadingSpinner'
import { AppUser } from '../types/app'
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
} from '../types'

type InteractionSetter = Dispatch<SetStateAction<Interaction[]>>

export interface AppRoutesProps {
  session: {
    user: AppUser | null
    isDemoMode: boolean
    isLocalAdmin: boolean
    isAdminUser: boolean
  }
  ui: {
    agentSidebarOpen: boolean
    openAgentSidebar: () => void
    closeAgentSidebar: () => void
    adminSidebarOpen: boolean
    openAdminSidebar: () => void
    closeAdminSidebar: () => void
    scrollToSection: string | null
    setScrollToSection: (section: string | null) => void
  }
  data: {
    userProfile: AgentProfile
    properties: Property[]
    selectedProperty: Property | null
    leads: Lead[]
    appointments: Appointment[]
    interactions: Interaction[]
    tasks: AgentTask[]
    sequences: FollowUpSequence[]
    notificationSettings: NotificationSettings
    emailSettings: EmailSettings
    calendarSettings: CalendarSettings
    billingSettings: BillingSettings
    activeAgentSlug: string | null
  }
  operations: {
    enterDemoMode: () => void
    openConsultationModal: () => void
    openAdminLogin: () => void
    setActiveAgentSlug: (slug: string | null) => void
    selectProperty: (id: string | null) => void
    upsertProperty: (property: Property) => void
    removeProperty: (id: string) => void
    seedSampleProperty: () => Promise<void>
    addLead: (payload: { name: string; email: string; phone: string; message: string; source: string }) => Promise<Lead>
    addAppointment: (appointment: Appointment) => Promise<void>
    updateTask: (taskId: string, updates: Partial<AgentTask>) => void
    addTask: (task: AgentTask) => void
    deleteTask: (taskId: string) => void
    saveNotificationSettings: (settings: NotificationSettings) => void
    saveEmailSettings: (settings: EmailSettings) => void
    saveCalendarSettings: (settings: CalendarSettings) => void
    saveBillingSettings: (settings: BillingSettings) => void
    setInteractions: InteractionSetter
    setUserProfile: (profile: AgentProfile) => void
    signOut: () => Promise<void>
  }
  registration: {
    slugForCheckout: string | null
  }
  auth: {
    rememberReturnPath: () => void
  }
}

const ADMIN_ROUTE_TO_VIEW = {
  dashboard: 'admin-dashboard',
  contacts: 'admin-contacts',
  leads: 'admin-leads',
  'knowledge-base': 'admin-knowledge-base',
  'ai-training': 'admin-ai-training',
  'ai-card': 'admin-ai-card',
  'ai-content': 'admin-ai-content',
  analytics: 'admin-analytics',
  security: 'admin-security',
  billing: 'admin-billing',
  settings: 'admin-settings',
  'blog-writer': 'admin-blog-writer'
} as const

type AdminRouteKey = keyof typeof ADMIN_ROUTE_TO_VIEW
type AdminView = (typeof ADMIN_ROUTE_TO_VIEW)[AdminRouteKey]

const CheckoutPlaceholder = ({ onNavigateToSignUp }: { onNavigateToSignUp: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
    <div className="max-w-md space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">We could not find your registration</h2>
      <p className="text-sm text-slate-600">
        Your secure checkout link may have expired. Please restart the signup process to generate a new link.
      </p>
      <button
        type="button"
        onClick={onNavigateToSignUp}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition"
      >
        <span className="material-symbols-outlined text-base">person_add</span>
        Start new signup
      </button>
    </div>
  </div>
)

const LegacyBlogPostRedirect = () => {
  const { slug } = useParams<{ slug?: string }>()
  return <Navigate to={slug ? `/blog/${slug}` : '/blog'} replace />
}

export const AppRoutes = ({
  session,
  ui,
  data,
  operations,
  registration,
  auth
}: AppRoutesProps) => {
  const navigate = useNavigate()
  const notificationSlot = session.user ? <NotificationSystem userId={session.user.uid} /> : null

  const navigateToLanding = () => navigate('/')
  const navigateToSignUp = () => navigate('/signup')
  const navigateToSignIn = (isAdmin = false) => navigate(isAdmin ? '/signin?admin=1' : '/signin')

  const handleEnterDemoMode = () => {
    operations.enterDemoMode()
    navigate('/app/dashboard', { replace: true })
  }

  const handleSelectProperty = (id: string) => {
    operations.selectProperty(id)
    navigate('/app/property')
  }

  const handleBackToListings = () => {
    operations.selectProperty(null)
    navigate('/app/listings')
  }

  const handleAddListing = () => {
    operations.selectProperty(null)
    navigate('/app/add-listing')
  }

  const handleEditListing = (id: string) => {
    operations.selectProperty(id)
    navigate('/app/edit-listing')
  }

  const handleBackToDashboard = () => {
    operations.selectProperty(null)
    navigate('/app/dashboard')
  }

  const RequireAgent = ({ children }: { children: ReactElement }) => {
    const shouldRedirect = !session.user && !session.isDemoMode && !session.isLocalAdmin
    useEffect(() => {
      if (shouldRedirect) {
        auth.rememberReturnPath()
      }
    }, [shouldRedirect])
    if (shouldRedirect) {
      return <Navigate to="/signin" replace />
    }
    return children
  }

  const RequireAdmin = ({ children }: { children: ReactElement }) => {
    const shouldRedirect = !session.isAdminUser && !session.isLocalAdmin
    useEffect(() => {
      if (shouldRedirect) {
        auth.rememberReturnPath()
        operations.openAdminLogin()
      }
    }, [shouldRedirect])
    if (shouldRedirect) {
      return <Navigate to="/signin?admin=1" replace />
    }
    return children
  }

  const AgentLayoutContainer = () => (
    <AgentLayout
      isSidebarOpen={ui.agentSidebarOpen}
      onSidebarOpen={ui.openAgentSidebar}
      onSidebarClose={ui.closeAgentSidebar}
      headerEndSlot={notificationSlot}
    >
      <Outlet />
    </AgentLayout>
  )

  const AdminLayoutContainer = () => (
    <AdminAppLayout
      isSidebarOpen={ui.adminSidebarOpen}
      onSidebarOpen={ui.openAdminSidebar}
      onSidebarClose={ui.closeAdminSidebar}
      fallback={
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <Outlet />
    </AdminAppLayout>
  )

  const CheckoutRoute = () => {
    const params = useParams<{ slug?: string }>()
    const slugParam = params.slug ?? null

    useEffect(() => {
      if (slugParam !== null) {
        operations.setActiveAgentSlug(slugParam)
      }
    }, [slugParam])

    const slugForCheckout =
      slugParam ?? data.activeAgentSlug ?? registration.slugForCheckout ?? null

    if (!slugForCheckout) {
      return <CheckoutPlaceholder onNavigateToSignUp={navigateToSignUp} />
    }

    return <CheckoutPage slug={slugForCheckout} onBackToSignup={navigateToSignUp} />
  }

  const PropertyRoute = () => {
    if (!data.selectedProperty) {
      return <Navigate to="/app/listings" replace />
    }
    return (
      <PropertyPage
        property={data.selectedProperty}
        setProperty={operations.upsertProperty}
        onBack={handleBackToListings}
      />
    )
  }

  const EditListingRoute = () => {
    if (!data.selectedProperty) {
      return <Navigate to="/app/listings" replace />
    }
    return (
      <AddListingPage
        initialProperty={data.selectedProperty}
        onCancel={handleBackToListings}
        onSave={property => {
          operations.upsertProperty(property)
          handleBackToListings()
        }}
      />
    )
  }

  const renderAdminView = (view: AdminView) => (
    <AdminModalProvider>
      <AdminLayout currentView={view} />
    </AdminModalProvider>
  )

  const routes = [
    {
      path: '/',
      element: <PublicLayout />,
      children: [
        {
          index: true,
          element: (
            <LandingPage
              onNavigateToSignUp={navigateToSignUp}
              onNavigateToSignIn={() => navigateToSignIn(false)}
              onEnterDemoMode={handleEnterDemoMode}
              scrollToSection={ui.scrollToSection}
              onScrollComplete={() => ui.setScrollToSection(null)}
              onOpenConsultationModal={operations.openConsultationModal}
              onNavigateToAdmin={() => {
                operations.openAdminLogin()
                navigateToSignIn(true)
              }}
            />
          )
        },
        {
          path: 'signup',
          element: (
            <SignUpPage
              onNavigateToSignIn={() => navigateToSignIn(false)}
              onNavigateToLanding={navigateToLanding}
              onNavigateToSection={section => {
                ui.setScrollToSection(section)
                navigateToLanding()
              }}
              onEnterDemoMode={handleEnterDemoMode}
            />
          )
        },
        {
          path: 'signin',
          element: (
            <SignInPage
              onNavigateToSignUp={navigateToSignUp}
              onNavigateToLanding={navigateToLanding}
              onNavigateToSection={section => {
                ui.setScrollToSection(section)
                navigateToLanding()
              }}
              onEnterDemoMode={handleEnterDemoMode}
            />
          )
        },
        {
          path: 'checkout',
          element: <CheckoutRoute />
        },
        {
          path: 'checkout/:slug',
          element: <CheckoutRoute />
        },
        {
          path: 'demo-listing',
          element: <DemoListingPage />
        },
        {
          path: 'blog',
          element: <BlogPage />
        },
        {
          path: 'blog/:slug',
          element: <BlogPostPage />
        },
        {
          path: 'blog-post',
          element: <LegacyBlogPostRedirect />
        },
        {
          path: 'blog-post/:slug',
          element: <LegacyBlogPostRedirect />
        },
        {
          path: 'new-landing',
          element: <NewLandingPage />
        },
        {
          path: 'dashboard-blueprint',
          element: <AgentDashboardBlueprint />
        },
        {
          path: 'blueprint',
          element: <Navigate to="/dashboard-blueprint" replace />
        }
      ]
    },
    {
      path: '/app',
      element: (
        <RequireAgent>
          <AgentLayoutContainer />
        </RequireAgent>
      ),
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        {
          path: 'dashboard',
          element: (
            <Dashboard
              agentProfile={data.userProfile}
              properties={data.properties}
              leads={data.leads}
              appointments={data.appointments}
              tasks={data.tasks}
              onSelectProperty={handleSelectProperty}
              onTaskUpdate={operations.updateTask}
              onTaskAdd={operations.addTask}
              onTaskDelete={operations.deleteTask}
            />
          )
        },
        {
          path: 'listings',
          element: (
            <ListingsPage
              properties={data.properties}
              onSelectProperty={handleSelectProperty}
              onAddNew={handleAddListing}
              onDeleteProperty={id => {
                operations.removeProperty(id)
              }}
              onBackToDashboard={handleBackToDashboard}
              onOpenBuilder={id => {
                if (id) {
                  handleEditListing(id)
                } else {
                  handleAddListing()
                }
              }}
              onSeedSample={() => operations.seedSampleProperty()}
            />
          )
        },
        {
          path: 'property',
          element: <PropertyRoute />
        },
        {
          path: 'add-listing',
          element: (
            <AddListingPage
              onCancel={handleBackToDashboard}
              onSave={property => {
                operations.upsertProperty(property)
                handleBackToListings()
              }}
            />
          )
        },
        {
          path: 'edit-listing',
          element: <EditListingRoute />
        },
        {
          path: 'leads',
          element: (
            <LeadsAndAppointmentsPage
              leads={data.leads}
              appointments={data.appointments}
              onAddNewLead={operations.addLead}
              onBackToDashboard={handleBackToDashboard}
              onNewAppointment={operations.addAppointment}
            />
          )
        },
        {
          path: 'inbox',
          element: (
            <InteractionHubPage
              properties={data.properties}
              interactions={data.interactions}
              setInteractions={operations.setInteractions}
              onAddNewLead={operations.addLead}
              onBackToDashboard={handleBackToDashboard}
            />
          )
        },
        {
          path: 'ai-conversations',
          element: <AIConversationsPage />
        },
        {
          path: 'ai-card-builder',
          element: <AICardBuilderPage />
        },
        {
          path: 'knowledge-base',
          element: <EnhancedAISidekicksHub />
        },
        {
          path: 'ai-training',
          element: <AIInteractiveTraining />
        },
        {
          path: 'ai-sidekicks',
          element: <EnhancedAISidekicksHub />
        },
        {
          path: 'settings',
          element: (
            <SettingsPage
              userId={session.user?.uid ?? 'guest-agent'}
              userProfile={data.userProfile}
              onSaveProfile={operations.setUserProfile}
              notificationSettings={data.notificationSettings}
              onSaveNotifications={operations.saveNotificationSettings}
              emailSettings={data.emailSettings}
              onSaveEmailSettings={operations.saveEmailSettings}
              calendarSettings={data.calendarSettings}
              onSaveCalendarSettings={operations.saveCalendarSettings}
              billingSettings={data.billingSettings}
              onSaveBillingSettings={operations.saveBillingSettings}
              onBackToDashboard={handleBackToDashboard}
            />
          )
        },
        {
          path: 'blueprint',
          element: <AgentDashboardBlueprint />
        }
      ]
    },
    {
      path: '/admin',
      element: (
        <RequireAdmin>
          <AdminLayoutContainer />
        </RequireAdmin>
      ),
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        ...(Object.keys(ADMIN_ROUTE_TO_VIEW) as AdminRouteKey[]).map(route => ({
          path: route,
          element: renderAdminView(ADMIN_ROUTE_TO_VIEW[route])
        })),
        {
          path: 'setup',
          element: <AdminSetup />
        }
      ]
    },
    {
      path: '*',
      element: <Navigate to="/" replace />
    }
  ]

  return useRoutes(routes)
}
