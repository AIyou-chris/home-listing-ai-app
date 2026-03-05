import React, { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, useParams } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Property, View, AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings, Lead, Appointment, Interaction, LeadFunnelType } from './types';
import { DEMO_FAT_PROPERTIES, DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS } from './demoConstants';
import { SAMPLE_AGENT, SAMPLE_INTERACTIONS } from './constants';
const LandingPage = lazy(() => import('./components/LandingPage'));
const NewLandingPage = lazy(() => import('./components/NewLandingPage'));
const SignUpPage = lazy(() => import('./components/SignUpPage'));
const SignInPage = lazy(() => import('./components/SignInPage'));
const ForgotPasswordPage = lazy(() => import('./components/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));
import { Toaster } from 'react-hot-toast';
import { showToast } from './utils/toastService';
import { getRegistrationContext } from './services/agentOnboardingService';

const WhiteLabelPage = lazy(() => import('./pages/WhiteLabelPage'));

const NotificationSystem = lazy(() => import('./components/NotificationSystem'));

const Sidebar = lazy(() => import('./components/Sidebar'));
const ConversionDashboardHome = lazy(() => import('./components/dashboard-command/ConversionDashboardHome'));
const TodayDashboardPage = lazy(() => import('./components/dashboard-command/TodayDashboardPage'));
const LeadsInboxCommandPage = lazy(() => import('./components/dashboard-command/LeadsInboxCommandPage'));
const LeadDetailCommandPage = lazy(() => import('./components/dashboard-command/LeadDetailCommandPage'));
const AppointmentsCommandPage = lazy(() => import('./components/dashboard-command/AppointmentsCommandPage'));
const ListingsCommandPage = lazy(() => import('./components/dashboard-command/ListingsCommandPage'));
const ListingPerformancePage = lazy(() => import('./components/dashboard-command/ListingPerformancePage'));
const ListingEditorPage = lazy(() => import('./components/dashboard-command/ListingEditorPage'));
const BillingCommandPage = lazy(() => import('./components/dashboard-command/BillingCommandPage'));
const OnboardingCommandPage = lazy(() => import('./components/dashboard-command/OnboardingCommandPage'));
const ShareTestPage = lazy(() => import('./components/dashboard-command/ShareTestPage'));
const AIConversationsPage = lazy(() => import('./components/AIConversationsPage'));
const AICardPage = lazy(() => import('./components/AICardPage'));
const MarketingReportsPage = lazy(() => import('./components/MarketingReportsPage'));
const CompliancePolicyPage = lazy(() => import('./components/CompliancePolicyPage'));
const DmcaPolicyPage = lazy(() => import('./components/DmcaPolicyPage'));
const TrialLock = lazy(() => import('./components/TrialLock'));

// import KnowledgeBasePage from './components/KnowledgeBasePage';
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));

const ConsultationModal = lazy(() => import('./components/ConsultationModal'));
import { AISidekickProvider } from './context/AISidekickContext';
import { AgentBrandingProvider } from './context/AgentBrandingContext';
import { getProfileForDashboard, subscribeToProfileChanges } from './services/agentProfileService';
// Lazy load admin components for better performance
const AdminSetup = lazy(() => import('./components/AdminSetup'));
import AdminLogin from './components/AdminLogin'; // Keep AdminLogin static for faster auth interaction? No, lazy is fine if wrapped.
const AdminDashboard = lazy(() => import('./admin-dashboard/AdminDashboard'));
const LeadDetailDashboard = lazy(() => import('./admin-dashboard/LeadDetailDashboard'));
import { NotFound } from './components/NotFound';
const DemoListingPage = lazy(() => import('./components/DemoListingPage'));
const ChatBotFAB = lazy(() => import('./components/ChatBotFAB'));
const StorefrontPage = lazy(() => import('./pages/StorefrontPage').then(module => ({ default: module.StorefrontPage })));
// Note: StorefrontPage is named export in original file based on import { StorefrontPage } ...
const FUNNEL_TRIGGER_MAP: Record<LeadFunnelType, SequenceTriggerType> = {
    universal_sales: 'Buyer Lead',
    homebuyer: 'Buyer Lead',
    seller: 'Seller Lead',
    postShowing: 'Property Viewed'
};





import LoadingSpinner from './components/LoadingSpinner';
import { adminAuthService } from './services/adminAuthService';
import { securitySettingsService } from './services/securitySettingsService';
import { notificationSettingsService } from './services/notificationSettingsService';
import { calendarSettingsService } from './services/calendarSettingsService';
import { billingSettingsService } from './services/billingSettingsService';
import { emailSettingsService } from './services/emailSettingsService';
const EnhancedAISidekicksHub = lazy(() => import('./components/EnhancedAISidekicksHub'));
const PublicAICard = lazy(() => import('./components/PublicAICard')); // Public View
const PublicListingPage = lazy(() => import('./pages/PublicListingPage')); // Public View
const BlogIndex = lazy(() => import('./pages/Blog/BlogIndex'));
const BlogPost = lazy(() => import('./pages/Blog/BlogPost'));
const VoiceLabPage = lazy(() => import('./pages/VoiceLabPage'));
const CombinedTrainingPage = lazy(() => import('./components/AgentAISidekicksPage'));
// import AIInteractiveTraining from './components/AIInteractiveTraining'; // Keeping as backkup
const FunnelAnalyticsPanel = lazy(() => import('./components/FunnelAnalyticsPanel'));

import { listingsService, CreatePropertyInput } from './services/listingsService';
// Stubs removed, using real service
import { ErrorBoundary } from './components/ErrorBoundary';
import { EnvValidation } from './utils/envValidation';
import DashboardRealtimeBootstrap from './components/dashboard-command/DashboardRealtimeBootstrap';
import { fetchOnboardingState } from './services/onboardingService';
// SessionService removed
import { listAppointments } from './services/appointmentsService';
import { PerformanceService } from './services/performanceService';
import { SequenceTriggerType } from './services/sequenceExecutionService';
import { leadsService, LeadPayload } from './services/leadsService';


// A helper function to delay execution


export type AppUser = {
    uid: string;
    id: string;
    email: string | null;
    displayName?: string | null;
    created_at?: string;
};



// const ADMIN_VIEWS = [
//     'admin-dashboard',
//     'admin-users',
//     'admin-leads',
//     'admin-contacts',
//     'admin-knowledge-base',
//     'admin-ai-training',
//     'admin-ai-personalities',
//     'admin-ai-content',
//     'admin-marketing',
//     'admin-analytics',
//     'admin-security',
//     'admin-billing',
//     'admin-settings',
//     'admin-setup',
//     'admin-blog-writer',
//     'admin-ai-card'
// ] as const;

// type AdminView = (typeof ADMIN_VIEWS)[number];

// const isAdminView = (value: string): value is AdminView => {
//     return ADMIN_VIEWS.includes(value as AdminView);
// };

interface BackendListing {
    id: string;
    title: string;
    address: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    propertyType: string;
    description?: string;
    heroPhotos?: string[];
    galleryPhotos?: string[];
    features?: string[];
    agent: AgentProfile;
    ctaListingUrl?: string;
    ctaMediaUrl?: string;
}

import { ImpersonationProvider } from './context/ImpersonationContext';

// ─── Module-level contexts ───────────────────────────────────────────────────
// ProtectedDashboardLayout and CheckoutRouteWrapper are defined OUTSIDE App so
// their component identity is stable across App re-renders (sidebar open/close,
// toast notifications, profile updates, etc.). Defining them inside App or
// renderRoutes() creates a NEW component type on every render, causing React to
// unmount and remount the entire dashboard tree on every state change.

interface DashboardLayoutContextValue {
    authReady: boolean;
    user: AppUser | null;
    isAdmin: boolean;
    isDemoMode: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    logAuthBreadcrumb: (eventType: string, session: { expires_at?: number; user?: { id?: string } } | null) => void;
}
const DashboardLayoutContext = React.createContext<DashboardLayoutContextValue | null>(null);
const CheckoutContext = React.createContext<{ onBackToSignup: () => void } | null>(null);
// ────────────────────────────────────────────────────────────────────────────

const DashboardRouteGate = () => {
    const [routeTarget, setRouteTarget] = useState<'loading' | 'today' | 'onboarding'>('loading');

    useEffect(() => {
        let cancelled = false;
        const resolveTarget = async () => {
            try {
                const onboarding = await Promise.race([
                    fetchOnboardingState(),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
                ]);
                if (cancelled) return;
                if (!onboarding) {
                    setRouteTarget('today');
                    return;
                }
                setRouteTarget(onboarding.onboarding_completed ? 'today' : 'onboarding');
            } catch (_error) {
                if (cancelled) return;
                setRouteTarget('today');
            }
        };

        void resolveTarget();
        return () => {
            cancelled = true;
        };
    }, []);

    if (routeTarget === 'loading') {
        return (
            <div className="flex items-center justify-center p-10">
                <LoadingSpinner size="lg" type="dots" text="Loading your dashboard..." />
            </div>
        );
    }

    if (routeTarget === 'onboarding') {
        return <Navigate to="/dashboard/onboarding" replace />;
    }

    return <Navigate to="/dashboard/today" replace />;
};

const resolveDashboardPageTitle = (pathname: string) => {
    if (pathname.includes('/command-center')) return 'Command Center';
    if (pathname.includes('/listings')) return 'Listings';
    if (pathname.includes('/leads')) return 'Leads';
    if (pathname.includes('/appointments')) return 'Appointments';
    if (pathname.includes('/settings')) return 'Settings';
    return 'Today';
};

const DemoDashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const pageTitle = resolveDashboardPageTitle(location.pathname);

    return (
        <div className="relative flex h-screen bg-slate-50">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isDemoMode />
            <div className="relative flex flex-1 flex-col overflow-hidden">
                <header
                    className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3 shadow-sm lg:hidden"
                    style={{
                        paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
                        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)'
                    }}
                >
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                        aria-label="Open navigation menu"
                    >
                        <span className="material-symbols-outlined text-xl">menu</span>
                    </button>
                    <h1 className="truncate px-3 text-base font-semibold text-slate-900">{pageTitle}</h1>
                    <div className="w-10" aria-hidden="true" />
                </header>
                <main className="relative z-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
                    <DashboardRealtimeBootstrap />
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

// ─── BlueprintDashboardLayout ─────────────────────────────────────────────────
// Same shell as DemoDashboardLayout but with isBlueprintMode sidebar flag.
// Data is NOT pre-seeded — TodayDashboardPage detects the route and shows
// empty state + one example listing without making real API calls.
const BlueprintDashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const pageTitle = resolveDashboardPageTitle(location.pathname);

    return (
        <div className="relative flex h-screen bg-slate-50">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isBlueprintMode />
            <div className="relative flex flex-1 flex-col overflow-hidden">
                <header
                    className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3 shadow-sm lg:hidden"
                    style={{
                        paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
                        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)'
                    }}
                >
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                        aria-label="Open navigation menu"
                    >
                        <span className="material-symbols-outlined text-xl">menu</span>
                    </button>
                    <h1 className="truncate px-3 text-base font-semibold text-slate-900">{pageTitle}</h1>
                    <div className="w-10" aria-hidden="true" />
                </header>
                <main className="relative z-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

// ─── ProtectedDashboardLayout (module-level, stable identity) ────────────────
const ProtectedDashboardLayout: React.FC = () => {
    const ctx = React.useContext(DashboardLayoutContext)!;
    const { authReady, user, isAdmin, isDemoMode, isSidebarOpen, setIsSidebarOpen, logAuthBreadcrumb } = ctx;
    const location = useLocation();

    if (!authReady) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <LoadingSpinner size="lg" type="dots" text="Checking session..." />
            </div>
        );
    }

    if (!user && !isAdmin && !isDemoMode) {
        logAuthBreadcrumb('ROUTE_GUARD_REDIRECT_NO_SESSION', null);
        return <Navigate to="/signin?reason=expired" replace />;
    }

    return (
        <div className="flex h-screen bg-slate-50 relative">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Mobile Header */}
                <header
                    className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3 shadow-sm lg:hidden"
                    style={{
                        paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
                        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)'
                    }}
                >
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                        aria-label="Open navigation menu"
                    >
                        <span className="material-symbols-outlined text-xl">menu</span>
                    </button>
                    <h1 className="truncate px-3 text-base font-semibold text-slate-900">
                        {resolveDashboardPageTitle(location.pathname)}
                    </h1>
                    <div className="flex w-10 justify-end">
                        {user && <NotificationSystem userId={user.uid} />}
                    </div>
                </header>

                {/* Desktop Notification Bell (Absolute Top-Right) */}
                <div className="absolute right-8 top-6 z-50 hidden lg:block">
                    {user && <NotificationSystem userId={user.uid} />}
                </div>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 relative z-0">
                    <DashboardRealtimeBootstrap />
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

// ─── CheckoutRouteWrapper (module-level, stable identity) ─────────────────────
const CheckoutRouteWrapper: React.FC = () => {
    const params = useParams<{ slug?: string }>();
    const ctx = React.useContext(CheckoutContext)!;
    const registrationContext = getRegistrationContext() as { slug?: string } | null;
    const slugForCheckout = params.slug || registrationContext?.slug || null;

    if (!slugForCheckout) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
                <div className="max-w-md space-y-4">
                    <h2 className="text-xl font-semibold text-slate-800">We could not find your registration</h2>
                    <p className="text-sm text-slate-600">
                        Your secure checkout link may have expired. Please restart the signup process to generate a new link.
                    </p>
                    <button
                        type="button"
                        onClick={ctx.onBackToSignup}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition"
                    >
                        <span className="material-symbols-outlined text-base">person_add</span>
                        Start new signup
                    </button>
                </div>
            </div>
        );
    }

    return <CheckoutPage slug={slugForCheckout} onBackToSignup={ctx.onBackToSignup} />;
};
// ────────────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
    const [user, setUser] = useState<AppUser | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Mock data for settings (Moved up for scope access)
    const [userProfile, setUserProfile] = useState<AgentProfile>(SAMPLE_AGENT);

    // COMPATIBILITY: Bridge legacy 'setView' calls to 'navigate'
    const setView = useCallback((viewName: string) => {
        // Handle special cases
        if (viewName === 'landing') {
            navigate('/');
        } else if (viewName === 'dashboard') {
            // FIX: Do not redirect to slug if it's the default sample agent (Sarah Johnson)
            // This prevents new users from seeing "/dashboard/sarah-johnson"
            if (userProfile?.slug && userProfile.id !== SAMPLE_AGENT.id) {
                navigate(`/dashboard/${userProfile.slug}`);
            } else {
                navigate('/dashboard');
            }
        } else {
            navigate(`/${viewName}`);
        }
    }, [navigate, userProfile?.slug, userProfile?.id]);



    // Determine 'view' from location for legacy compatibility or Sidebar highlighting
    // e.g. /dashboard -> 'dashboard'
    const getCurrentView = (): View => {
        const path = location.pathname.substring(1); // remove leading /
        if (!path) return 'landing';
        return (path as View) || 'landing';
    };

    // We treat 'view' as derived state now
    const view = getCurrentView();

    const shouldNoindexRoute = useCallback((pathname: string) => {
        const privatePrefixes = [
            '/admin',
            '/admin-dashboard',
            '/admin-login',
            '/admin-setup',
            '/dashboard',
            '/daily-pulse',
            '/listings',
            '/listings-v2',
            '/add-listing',
            '/property',
            '/leads',
            '/inbox',
            '/ai-conversations',
            '/ai-card',
            '/knowledge-base',
            '/ai-training',
            '/ai-agent',
            '/funnel-analytics',
            '/analytics',
            '/ai-sidekicks',
            '/marketing-reports',
            '/voice-lab',
            '/settings',
            '/signin',
            '/signup',
            '/forgot-password',
            '/reset-password',
            '/checkout',
            '/demo-dashboard',
            '/dashboard-blueprint',
            '/agent-blueprint-dashboard',
            '/demo-showcase',
            '/demo-listing',
            '/demo/'
        ];

        return privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    }, []);

    useEffect(() => {
        const robotsContent = shouldNoindexRoute(location.pathname) ? 'noindex,nofollow' : 'index,follow';
        let robotsTag = document.querySelector('meta[name="robots"]');
        if (!robotsTag) {
            robotsTag = document.createElement('meta');
            robotsTag.setAttribute('name', 'robots');
            document.head.appendChild(robotsTag);
        }
        robotsTag.setAttribute('content', robotsContent);

        const canonicalPath = location.pathname === '/' ? '/' : location.pathname.replace(/\/+$/, '');
        const canonicalUrl = `https://homelistingai.com${canonicalPath}`;
        let canonicalTag = document.querySelector('link[rel="canonical"]');
        if (!canonicalTag) {
            canonicalTag = document.createElement('link');
            canonicalTag.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalTag);
        }
        canonicalTag.setAttribute('href', canonicalUrl);
    }, [location.pathname, shouldNoindexRoute]);

    // PERF: Initialize loading state
    const [isLoading, setIsLoading] = useState(false); // Router handles most loading now
    const [authReady, setAuthReady] = useState(false);
    const [isSettingUp] = useState(false); // Helper state for setup flows (currently unused)
    const [isDemoMode, setIsDemoMode] = useState(() => {
        const path = window.location.pathname;
        return path.includes('/demo-');
    });
    const [isBlueprintMode, setIsBlueprintMode] = useState(() => {
        const path = window.location.pathname;
        return path.includes('blueprint') || path.includes('/agent-blueprint-');
    });
    const [isAdmin, setIsAdmin] = useState(false); // Validated Admin State




    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [_appointments, setAppointments] = useState<Appointment[]>();
    const [_interactions, setInteractions] = useState<Interaction[]>();



    const resolvePropertyForLead = useCallback(
        (targetLead?: Lead | null): Property | undefined => {
            const leadRef = targetLead ?? null;
            if (leadRef?.interestedProperties?.length) {
                const matchedProperty = properties.find((property) =>
                    leadRef.interestedProperties?.includes(property.id)
                );
                if (matchedProperty) {
                    return matchedProperty;
                }
            }
            if (selectedPropertyId) {
                return properties.find((property) => property.id === selectedPropertyId);
            }
            return undefined;
        },
        [properties, selectedPropertyId]
    );

    // Removed unused selectedLead state
    const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
    const [consultationRole, setConsultationRole] = useState<'realtor' | 'broker'>('realtor');
    const [scrollToSection, setScrollToSection] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // Notification system is now handled by NotificationSystem component
    // Removed unused analyticsTimeRange state
    const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
    const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
    const [isAdminLoginLoading, setIsAdminLoginLoading] = useState(false);



    const [, setIsProfileLoading] = useState(false);
    const [profileLoadFailed, setProfileLoadFailed] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        email_enabled: true,
        daily_digest_enabled: false,
        unworked_lead_nudge_enabled: true,
        appt_confirm_nudge_enabled: true,
        reschedule_nudge_enabled: true,
        digest_time_local: '08:00',
        timeZone: 'America/Los_Angeles',
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
    });
    const [_emailSettings, setEmailSettings] = useState<EmailSettings>({ integrationType: 'oauth', aiEmailProcessing: true, autoReply: true, leadScoring: true, followUpSequences: true });
    const [_calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
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
    });
    const [billingSettings, setBillingSettings] = useState<BillingSettings>({ planName: 'Free Tier', history: [] });
    // Removed unused state variables

    const hasInitializedAuthRef = useRef(false);
    const authReadyRef = useRef(false);

    useEffect(() => {
        authReadyRef.current = authReady;
    }, [authReady]);

    const logAuthBreadcrumb = useCallback((eventType: string, session: { expires_at?: number; user?: { id?: string } } | null) => {
        const expiresAt =
            typeof session?.expires_at === 'number'
                ? new Date(session.expires_at * 1000).toISOString()
                : null;

        console.log('🧭 Auth breadcrumb', {
            authReady: authReadyRef.current,
            sessionExists: !!session?.user,
            eventType,
            expiresAt,
            currentRoute: window.location.pathname
        });
    }, []);

    const markAuthReady = useCallback((eventType: string, session: { expires_at?: number; user?: { id?: string } } | null) => {
        queueMicrotask(() => {
            if (!authReadyRef.current) {
                authReadyRef.current = true;
                setAuthReady(true);
            }
            logAuthBreadcrumb(eventType, session);
        });
    }, [logAuthBreadcrumb]);





    useEffect(() => {
        if (hasInitializedAuthRef.current) return;
        hasInitializedAuthRef.current = true;

        console.log('🚀 APP INIT: Optimized Auth Flow');

        // Validate environment
        EnvValidation.logValidationResults();

        // Initialize performance monitoring
        PerformanceService.initialize();



        // Separate function to load heavy data without blocking UI
        const loadUserData = async (currentUser: AppUser) => {
            try {
                console.log('🔄 Loading user data in background...');

                // 1. Admin Check logic - OPTIMIZED ORDER
                // Fast Local Check: Check email whitelist FIRST to avoid blocking network calls
                const envAdminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
                const adminEmails = ['admin@homelistingai.com', 'us@homelistingai.com'];
                if (envAdminEmail) adminEmails.push(envAdminEmail.toLowerCase());

                const isEnvAdmin = currentUser.email && adminEmails.includes(currentUser.email.toLowerCase());

                if (isEnvAdmin) {
                    console.log("👮 Admin privileges confirmed via Email Whitelist:", currentUser.email);
                    setIsAdmin(true);
                    setUserProfile({
                        ...SAMPLE_AGENT,
                        name: 'System Administrator',
                        email: currentUser.email ?? '',
                        headshotUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}`,
                    });

                    // CRITICAL: Unblock UI immediately
                    setIsLoading(false);
                    return;
                }

                // Slow Remote Check: Only RPC if not locally confirmed
                console.log("⏳ Checking Admin RPC...");
                const { data: isRpcAdmin } = await supabase.rpc('is_user_admin', { uid: currentUser.uid });

                if (isRpcAdmin) {
                    console.log("👮 Admin privileges confirmed via RPC for:", currentUser.email);
                    setIsAdmin(true);
                    setUserProfile({
                        ...SAMPLE_AGENT,
                        name: 'System Administrator',
                        email: currentUser.email ?? '',
                        headshotUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}`,
                    });
                    return;
                }

                // 2. Properties (for regular users)
                const propertiesToLoad = await listingsService.listProperties(currentUser.uid);
                if (propertiesToLoad.length > 0) {
                    setProperties(propertiesToLoad);
                    setUserProfile(propertiesToLoad[0].agent);
                } else {
                    // New/Empty user
                    console.log('🆕 No properties. Initializing empty profile with auth data.');
                    const generatedSlug = currentUser.displayName
                        ? currentUser.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                        : `agent-${currentUser.uid.substring(0, 8)}`;

                    setUserProfile({
                        ...SAMPLE_AGENT,
                        name: currentUser.displayName || 'Agent',
                        slug: generatedSlug,
                        email: currentUser.email || '',
                        id: currentUser.uid,
                    });
                }

                // 3. Load User Settings (Notifications, Calendar, Billing, Email)
                try {
                    console.log('⚙️ Loading user settings...');
                    const [notifRes, calRes, billRes, emailRes] = await Promise.allSettled([
                        notificationSettingsService.fetch(currentUser.uid),
                        calendarSettingsService.fetch(currentUser.uid),
                        billingSettingsService.get(currentUser.uid),
                        emailSettingsService.fetch(currentUser.uid)
                    ]);

                    if (notifRes.status === 'fulfilled' && notifRes.value.settings) {
                        setNotificationSettings(notifRes.value.settings);
                    }
                    if (calRes.status === 'fulfilled' && calRes.value.settings) {
                        setCalendarSettings(calRes.value.settings);
                    }
                    if (billRes.status === 'fulfilled' && billRes.value) {
                        setBillingSettings(billRes.value);
                    }
                    if (emailRes.status === 'fulfilled' && emailRes.value.settings) {
                        setEmailSettings(emailRes.value.settings);
                    }
                    console.log('✅ User settings loaded');
                } catch (settingsError) {
                    console.warn('Failed to load user settings:', settingsError);
                }

            } catch (err) {
                console.warn('Background data load warning:', err);
            }
        };

        const initAuth = async () => {
            // Check URL path immediately
            const currentPath = window.location.pathname;
            console.log('📍 Initial Route:', currentPath);
            let resolvedSession: { expires_at?: number; user?: { id?: string } } | null = null;

            // Fast path for public routes - DO NOT BLOCK
            const isPublicRoute =
                currentPath === '/' ||
                currentPath === '/landing' ||
                currentPath === '/signin' ||
                currentPath === '/signup' ||
                currentPath === '/forgot-password' ||
                currentPath === '/reset-password' ||
                currentPath.startsWith('/store/') ||
                currentPath.startsWith('/checkout') || // Critical for checkout flow
                currentPath.includes('/demo-') ||
                currentPath.startsWith('/blog') || // Allow blog access
                currentPath.startsWith('/listing/') || // Public listing pages
                currentPath.startsWith('/l/') || // Public listing short URLs
                currentPath.startsWith('/card/') || // Public AI card pages
                currentPath === '/compliance' ||
                currentPath === '/dmca' ||
                currentPath === '/agent-blueprint-dashboard' || currentPath.startsWith('/agent-blueprint-dashboard') ||
                currentPath === '/white-label';

            // Force Blueprint Mode handling if on that route specifically
            if (currentPath.includes('blueprint')) {
                if (!isBlueprintMode) {
                    setIsBlueprintMode(true);
                    setIsDemoMode(true);
                }
            }

            if (!isPublicRoute) {
                // If protected route, show loading briefly while we check session
                setIsLoading(true);
            }

            try {
                // 1. Check Local Session (Network Validation) with timeout guard
                console.log('🔍 Checking session...');
                const sessionResult = await Promise.race<
                    Awaited<ReturnType<typeof supabase.auth.getSession>> | { timedOut: true }
                >([
                    supabase.auth.getSession(),
                    new Promise<{ timedOut: true }>((resolve) =>
                        setTimeout(() => resolve({ timedOut: true }), 3000)
                    )
                ]);

                if ('timedOut' in sessionResult) {
                    // getSession() took too long — unblock the UI but DO NOT clear user state.
                    // INITIAL_SESSION has already fired and restored the user from local storage.
                    // Calling setUser(null) here would race against that and kill the session.
                    console.warn('⚠️ Session check timed out. Unblocking UI — INITIAL_SESSION already handled user state.');
                    return;
                }

                const { data: { session }, error: sessionError } = sessionResult;
                resolvedSession = session ?? null;

                console.log('🔍 Session check complete. User:', session?.user?.email);

                if (sessionError) throw sessionError;

                if (session?.user) {
                    console.log(`✅ Session found for: ${session.user.email}`);
                    const currentUser: AppUser = {
                        uid: session.user.id,
                        id: session.user.id,
                        email: session.user.email,
                        displayName: session.user.user_metadata?.name ?? null,
                        created_at: session.user.created_at
                    };

                    setUser(currentUser);

                    // 2. Admin Check Priority
                    // If we are attempting to access an Admin route, we MUST wait for the admin check
                    // otherwise the route protection will kick us out (isAdmin defaults to false).
                    if (currentPath.startsWith('/admin')) {
                        console.log('⏳ Awaiting admin check for admin route...');
                        // Add timeout dynamically for this specific await if needed, but the outer safety covers it
                        await loadUserData(currentUser);
                    } else {
                        // For regular dashboard, load async to unblock UI
                        loadUserData(currentUser);
                    }

                    // Route Protection Logic
                    if (currentPath === '/signin' || currentPath === '/signup' || currentPath === '/') {
                        // Redirect logged-in users away from auth pages
                        // EXCEPTION: If the user just signed up (created_at is very recent), let SignUpPage handle the Next step
                        const isNewUser = currentUser.created_at && (new Date().getTime() - new Date(currentUser.created_at).getTime() < 60000);

                        if (currentPath === '/signup' && isNewUser) {
                            console.log('🆕 New user detected on signup page. Allowing signup flow to continue.');
                            return;
                        }

                        // Check for specific redirect (scenarios like "Finish Signup")
                        const urlParams = new URLSearchParams(window.location.search);
                        const next = urlParams.get('next'); // e.g. /checkout
                        if (next) {
                            navigate(next);
                        } else {
                            navigate('/dashboard');
                        }
                    }
                    // ELSE: Stay on current path (e.g. /admin-dashboard)

                } else {
                    // No Session
                    console.log('👤 No active session.');
                    setUser(null);
                }

            } catch (error) {
                console.error("❌ Auth Init Error:", error);
            } finally {
                setIsLoading(false);
                markAuthReady('INIT_SESSION_RESOLVED', resolvedSession);
            }
        };


        initAuth();

        // Listen for auth changes (Sign In / Sign Out / Token Refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("🔐 Auth Change:", event, session?.user?.email);
            markAuthReady(event, session ?? null);

            // Helper: build AppUser from a Supabase User object
        const buildAppUser = (supaUser: NonNullable<typeof session>['user']): AppUser => ({
            uid: supaUser.id,
            id: supaUser.id,
            email: supaUser.email ?? null,
            displayName: supaUser.user_metadata?.name ?? null,
            created_at: supaUser.created_at
        });

        // Fast admin email check
        const fastAdminCheck = (email: string | null | undefined) => {
            const envAdminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
            const adminEmails = ['admin@homelistingai.com', 'us@homelistingai.com'];
            if (envAdminEmail) adminEmails.push(envAdminEmail.toLowerCase());
            if (email && adminEmails.includes(email.toLowerCase())) {
                console.log("👮 Fast Admin Check Passed");
                setIsAdmin(true);
            }
        };

        if (event === 'INITIAL_SESSION') {
                // CRITICAL FIX: INITIAL_SESSION fires on page load when a session exists in storage.
                // We MUST set `user` here before markAuthReady() makes authReady=true,
                // otherwise ProtectedDashboardLayout sees authReady=true + user=null → redirect to /signin.
                // loadUserData is intentionally skipped here — initAuth's getSession() path handles it.
                if (session?.user) {
                    const currentUser = buildAppUser(session.user);
                    setUser(currentUser);
                    fastAdminCheck(session.user.email);
                    console.log('🔄 INITIAL_SESSION: user restored from storage, authReady will resolve.');
                }
            } else if (event === 'SIGNED_IN') {
                if (session?.user) {
                    const currentUser = buildAppUser(session.user);
                    setUser(currentUser);
                    fastAdminCheck(session.user.email);
                    await loadUserData(currentUser);

                    // Security Notification (Non-blocking)
                    if (currentUser.email) {
                        void securitySettingsService.notifyLogin(currentUser.id, currentUser.email);
                    }
                }
            } else if (event === 'TOKEN_REFRESHED') {
                // Token silently refreshed every ~1hr — just update the user reference.
                // No need to reload all data (properties, settings, etc.) — it hasn't changed.
                if (session?.user) {
                    const currentUser = buildAppUser(session.user);
                    setUser(currentUser);
                    fastAdminCheck(session.user.email);
                    console.log('🔑 TOKEN_REFRESHED: session extended, skipping full data reload.');
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setUserProfile(SAMPLE_AGENT);
                setIsAdmin(false);
                setProperties([]);
                localStorage.removeItem('hlai_impersonated_user_id'); // Clear impersonation
                navigate('/signin'); // Send to sign-in, not landing
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate, isBlueprintMode, markAuthReady]);

    // --- FORCE ADMIN REDIRECT ---
    // If we are detected as Admin, but not on an admin page, GO TO ADMIN DASHBOARD.
    // --- FORCE ADMIN REDIRECT ---
    // If we are detected as Admin, but not on an admin page, GO TO ADMIN DASHBOARD.
    useEffect(() => {
        if (isAdmin) {
            const path = location.pathname;
            const isPublicDetails = path.startsWith('/listing/') || path.startsWith('/store/') || path.startsWith('/card/') || path.startsWith('/p/') || path.startsWith('/compliance') || path.startsWith('/dmca');
            const isPublicRoot = path === '/' || path === '/landing' || path === '/white-label' || path.includes('/demo-');

            if (!path.startsWith('/admin') && path !== '/admin-login' && !isPublicDetails && !isPublicRoot) {
                console.log("👮 Admin detected on protected agent page (" + path + "). Redirecting...");
                navigate('/admin-dashboard', { replace: true });
            }
        } else if (authReady && location.pathname.startsWith('/admin') && location.pathname !== '/admin-login') {
            // Safety: If NOT admin but on admin page, kick out.
            // Guard with authReady so we don't bounce RPC-only admins before loadUserData completes.
            console.warn("⛔️ Accessing admin page without admin privileges. Redirecting.");
            if (user) {
                // If logged in but not admin, send to regular dashboard
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/admin-login', { replace: true });
            }
        }
    }, [isAdmin, authReady, user, location.pathname, navigate]);

    // --- FORCE AUTH REDIRECT ---
    // If user is logged in but on a public auth page (Signin/Signup), redirect to Dashboard.
    // Skip admin users — the FORCE ADMIN REDIRECT above already handles routing them to /admin-dashboard.
    // Without this guard, both effects fire and the last one (this one) wins, sending admins to /dashboard.
    useEffect(() => {
        if (user && authReady && !isAdmin) {
            const path = location.pathname;
            if (path === '/signin' || path === '/signup') {
                console.log("✅ User authenticated on auth page. Redirecting to dashboard...");
                navigate('/dashboard', { replace: true });
            }
        }
    }, [user, authReady, isAdmin, location.pathname, navigate]);

    // Load centralized agent profile and set up real-time updates
    useEffect(() => {
        if (user && !isDemoMode && !isAdmin) {
            // Load centralized agent profile
            loadAgentProfile();

            // Load listings from backend
            loadListingsFromBackend();

            // Subscribe to profile changes for real-time updates
            const unsubscribe = subscribeToProfileChanges((updatedProfile) => {
                setUserProfile(prev => ({
                    ...prev,
                    name: updatedProfile.name,
                    title: updatedProfile.title,
                    company: updatedProfile.company,
                    headshotUrl: updatedProfile.headshotUrl,
                    email: updatedProfile.email,
                    phone: updatedProfile.phone
                }));
                console.log('🔄 Profile updated across app');
            });

            return () => {
                unsubscribe();
            };
        }
    }, [user, isDemoMode, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNavigateToSignUp = () => navigate('/signup');
    const handleNavigateToSignIn = () => navigate('/signin');
    const handleNavigateToLanding = () => {
        setIsDemoMode(false);
        navigate('/');
    };

    // Load centralized agent profile
    const loadAgentProfile = async () => {
        try {
            setIsProfileLoading(true);
            setProfileLoadFailed(false);
            const profileData = await getProfileForDashboard();

            // SECURITY: If we have been identified as an admin while this was loading, 
            // DO NOT overwrite the System Administrator profile with a personal agent profile.
            if (isAdmin) {
                console.log('👮 Admin detected during profile load. Skipping agent profile overwrite.');
                return;
            }

            setUserProfile(prev => ({
                ...prev,
                name: profileData.name,
                title: profileData.title,
                company: profileData.company,
                headshotUrl: profileData.headshotUrl,
                email: profileData.email,
                phone: profileData.phone,
                language: profileData.language ?? prev.language
            }));
            console.log('✅ Loaded centralized agent profile');
        } catch (error) {
            console.error('Failed to load agent profile:', error);
            setProfileLoadFailed(true);
            // Keep using SAMPLE_AGENT as fallback
        } finally {
            setIsProfileLoading(false);
        }
    };

    // Load listings from backend
    const loadListingsFromBackend = async () => {
        try {
            if (!user?.id) return;
            const response = await fetch(`/api/listings?userId=${user.id}`);
            if (response.ok) {
                const data: { listings?: BackendListing[] } = await response.json();
                // Convert backend format to frontend format
                const backendListings: BackendListing[] = Array.isArray(data.listings) ? data.listings : [];
                const frontendProperties = backendListings.map((listing) => ({
                    id: listing.id,
                    title: listing.title,
                    address: listing.address,
                    price: listing.price,
                    bedrooms: listing.bedrooms,
                    bathrooms: listing.bathrooms,
                    squareFeet: listing.squareFeet,
                    propertyType: listing.propertyType,
                    description: listing.description || '',
                    imageUrl: listing.heroPhotos?.[0] || '/demo/home-1.png',
                    features: listing.features || [],
                    heroPhotos: listing.heroPhotos || [],
                    galleryPhotos: listing.galleryPhotos || [],
                    agent: listing.agent,
                    appFeatures: {
                        gallery: true,
                        schools: true,
                        financing: true,
                        virtualTour: true,
                        amenities: true,
                        schedule: true,
                        map: true,
                        history: true,
                        neighborhood: true,
                        reports: true,
                        messaging: true
                    },
                    ctaListingUrl: listing.ctaListingUrl ?? '',
                    ctaMediaUrl: listing.ctaMediaUrl ?? ''
                }));
                setProperties(frontendProperties);
            } else {
                console.warn('Failed to load listings from backend');
                // IN PRODUCTION: Do NOT show demo data on failure. Show nothing.
                setProperties([]);
            }
        } catch (error) {
            console.error('Error loading listings from backend:', error);
            // IN PRODUCTION: Do NOT show demo data on error.
            setProperties([]);
        }
    };

    const handleEnterDemoMode = () => {
        setIsDemoMode(true);
        setProperties(DEMO_FAT_PROPERTIES);
        setLeads(DEMO_FAT_LEADS);
        setAppointments(DEMO_FAT_APPOINTMENTS);
        setInteractions(SAMPLE_INTERACTIONS);

        setUserProfile(SAMPLE_AGENT);
        navigate('/demo-dashboard');
    };

    const handleNavigateToAdmin = () => {
        navigate('/admin-login');
    };

    const handleAdminLogin = async (email: string, password: string) => {
        setIsAdminLoginLoading(true);
        setAdminLoginError(null);

        try {
            const trimmedEmail = email.trim().toLowerCase();
            const trimmedPassword = password.trim();

            // Removed insecure bypass check. All logins must go through Supabase.

            // Try local demo credentials first (DEV ONLY)
            if (import.meta.env.DEV) {
                const demo = await adminAuthService.login(trimmedEmail, trimmedPassword);
                if (demo.success) {
                    setIsAdminLoginOpen(false);
                    // navigate to admin dashboard
                    navigate('/admin-dashboard');
                    return;
                }
            }

            // If demo credentials don't match, try Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password: trimmedPassword
            });

            if (error || !data.user) {
                setAdminLoginError('Invalid login credentials');
                return;
            }

            // Check if user has admin role via RPC
            const { data: isAdmin, error: rpcError } = await supabase.rpc('is_user_admin', { uid: data.user.id });

            if (rpcError || !isAdmin) {
                console.warn('Login successful but user is not an admin', rpcError);
                await supabase.auth.signOut();
                setAdminLoginError('Unauthorized: You do not have admin privileges.');
                return;
            }

            // Admin role confirmed via RPC
            // Proceed to dashboard

            setIsAdminLoginOpen(false);
            setIsAdmin(true); // Manually set admin for this session (RPC verified)
            // CRITICAL: Clear any leftover impersonation state to ensure we enter Admin Dashboard cleanly
            localStorage.removeItem('hlai_impersonated_user_id');
            navigate('/admin-dashboard');
        } catch (error) {
            console.error('Admin login failed', error);
            setAdminLoginError('Invalid login credentials');
        } finally {
            setIsAdminLoginLoading(false);
        }
    };

    const handleAdminLoginClose = () => {
        setIsAdminLoginOpen(false);
        setAdminLoginError(null);
    };


    // Notification handling is now managed by NotificationSystem component

    // Task management handlers


    const _handleSelectProperty = (id: string) => {
        setSelectedPropertyId(id);
        setView('property');
    };

    const _handleSetProperty = (updatedProperty: Property) => {
        setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
    };

    const _handleSaveNewProperty = async (newPropertyData: Omit<Property, 'id' | 'description' | 'imageUrl'>) => {
        if (!user && !isDemoMode) {
            alert("Please sign in to add a new listing.");
            setView('signin');
            return;
        }

        const propertyWithAgent = {
            ...newPropertyData,
            agent: userProfile,
        };

        const tempId = `prop-temp-${Date.now()}`;
        const propertyForState: Property = {
            id: tempId,
            description: '',
            imageUrl: 'https://images.unsplash.com/photo-1599809275671-55822c1f6a12?q=80&w=800&auto-format&fit=crop',
            ...propertyWithAgent,
        };

        setProperties(prev => [propertyForState, ...prev]);
        setView('listings');

        if (isDemoMode) {
            // In demo mode, simulate saving and then automatically delete the listing after a delay
            setTimeout(() => {
                alert("This is a demo. The listing you just created will now be automatically deleted to complete the demonstration.");
                setProperties(prev => prev.filter(p => p.id !== tempId));
            }, 4000);
        } else if (user) { // Only save to Firestore if a real user is logged in
            try {
                const { id: _discardedId, ...dataForPersistence } = propertyForState;
                void _discardedId;

                // Map Property object to CreatePropertyInput
                const propertyInput: CreatePropertyInput = {
                    ...dataForPersistence,
                    agentSnapshot: dataForPersistence.agent,
                    // Ensure features are passed correctly
                    features: dataForPersistence.features || [],
                    heroPhotos: dataForPersistence.heroPhotos,
                    galleryPhotos: dataForPersistence.galleryPhotos,
                    appFeatures: dataForPersistence.appFeatures,
                    status: dataForPersistence.status?.toLowerCase() || 'active'
                };

                const newProperty = await listingsService.createProperty(propertyInput);

                setProperties(prev => prev.map(p => p.id === tempId ? newProperty : p));
            } catch (error) {
                console.error("Failed to save property:", error);
                alert("Error: Could not save the property to the database. Please try again.");
                setProperties(prev => prev.filter(p => p.id !== tempId));
                setView('add-listing');
            }
        }
    };

    const _handleDeleteProperty = (id: string) => {
        if (window.confirm('Are you sure you want to delete this listing?')) {
            setProperties(prev => prev.filter(p => p.id !== id));
            if (selectedPropertyId === id) {
                setSelectedPropertyId(null);
                setView('listings');
            }
            showToast.success('Listing removed successfully');
        }
    };

    const triggerLeadSequences = useCallback(
        async (
            lead: Lead,
            triggerType: SequenceTriggerType = 'Lead Capture',
            _propertyOverride?: Property
        ) => {
            try {
                // [MIGRATION] Client-side execution disabled. Architecture moved to Server (funnelExecutionService.js)
                // const sequenceService = SequenceExecutionService.getInstance();
                console.log(`✅ [Backend] Sequence trigger requested for: ${triggerType} (Handled by Server)`);
                console.log(`✅ ${triggerType} sequences triggered for:`, lead.name);
            } catch (error) {
                console.error('❌ Error triggering sequences:', error);
            }
        },
        []
    );

    const _handleAddNewLead = async (leadData: { name: string; email: string; phone: string; message: string; source: string; funnelType?: string }) => {
        const payload: LeadPayload = {
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            source: leadData.source || 'Website',
            lastMessage: leadData.message,
            funnelType: leadData.funnelType || null
        };

        try {
            const createdLead = await leadsService.create(payload);
            setLeads(prev => [createdLead, ...prev]);
            await triggerLeadSequences(createdLead);
        } catch (error) {
            console.error('❌ Failed to create lead via API, using local fallback:', error);
            const createdLead: Lead = {
                id: `lead-${Date.now()}`,
                name: leadData.name,
                email: leadData.email,
                phone: leadData.phone,
                lastMessage: leadData.message,
                status: 'New',
                date: new Date().toISOString(),
                funnelType: null,
                interestedProperties: []
            };
            setLeads(prev => [createdLead, ...prev]);
            await triggerLeadSequences(createdLead);
        }
        setView('leads');
    };

    const _handleLeadFunnelAssigned = useCallback(
        async (lead: Lead, funnel: LeadFunnelType | null) => {
            const previous = lead.funnelType ?? null;
            setLeads((prev) =>
                prev.map((item) =>
                    item.id === lead.id ? { ...item, funnelType: funnel ?? undefined } : item
                )
            );
            try {
                const updatedLead = await leadsService.assignFunnel(lead.id, funnel);
                setLeads((prev) => prev.map((item) => (item.id === lead.id ? updatedLead : item)));
                if (funnel) {
                    const triggerType = FUNNEL_TRIGGER_MAP[funnel];
                    await triggerLeadSequences(
                        updatedLead,
                        triggerType,
                        resolvePropertyForLead(updatedLead)
                    );
                }
            } catch (error) {
                console.error('❌ Failed to assign lead funnel:', error);
                setLeads((prev) =>
                    prev.map((item) =>
                        item.id === lead.id ? { ...item, funnelType: previous ?? undefined } : item
                    )
                );
                alert('Unable to update the lead funnel right now. Please try again.');
            }
        },
        [resolvePropertyForLead, triggerLeadSequences]
    );

    const _handleUpdateLead = useCallback(async (leadId: string, updatedData: { name: string; email: string; phone: string; message: string; source: string; funnelType?: string }) => {
        try {
            // Optimistic update
            const leadToUpdate = leads.find(l => l.id === leadId);
            if (!leadToUpdate) return;
            const previousLead = leadToUpdate; // Capture for comparison

            const updatedLead = {
                ...leadToUpdate,
                ...updatedData,
                notes: updatedData.message // Map message back to notes/lastMessage if needed
            };

            setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));

            await leadsService.update(leadId, {
                name: updatedData.name,
                email: updatedData.email,
                phone: updatedData.phone,
                lastMessage: updatedData.message,
                source: updatedData.source,
                funnelType: updatedData.funnelType
            });

            // AUTOMATION TRIGGER: If status changed, trigger sequences
            if (previousLead && previousLead.status !== updatedLead.status) {
                console.log(`🔄 Lead status changed from ${previousLead.status} to ${updatedLead.status}. Triggering automation...`);
                try {
                    // Map status to appropriate trigger type
                    let triggerType: SequenceTriggerType | null = null;
                    if (updatedLead.status === 'Qualified') {
                        triggerType = 'Buyer Lead';
                    } else if (updatedLead.status === 'Contacted') {
                        triggerType = 'Seller Lead';
                    }

                    if (triggerType) {
                        // [MIGRATION] Client-side execution disabled.
                        console.log('✅ [Backend] Lead status change automation handled by server');
                    }
                } catch (automationError) {
                    console.error('Failed to trigger automation:', automationError);
                    // Don't block the update, just log the error
                }
            }

            console.log('Lead updated successfully');
        } catch (error) {
            console.error('Failed to update lead:', error);
            // Revert state if needed - relying on next fetch for now or we could snapshot prev state
        }
    }, [leads]);

    const _handleDeleteLead = useCallback(async (leadId: string) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            // Store previous state for rollback
            const previousLeads = leads;

            try {
                // Optimistic update
                setLeads(prev => prev.filter(l => l.id !== leadId));

                // Call backend API to actually delete
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/leads/${leadId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('access_token') || ''}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to delete lead: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('✅ Lead deleted successfully:', result);
                showToast.success('Lead removed successfully');
            } catch (error) {
                console.error('DELETE LEAD ERROR:', error);
                // Rollback on error - this ensures the UI matches reality
                setLeads(previousLeads);
                showToast.error('Delete failed. Try again.');
            }
        }
    }, [leads]);

    // Load appointments from Supabase when user signs in or demo/local admin
    React.useEffect(() => {
        const load = async () => {
            try {
                // In demo/local mode we won't have a user id; fetch all for preview
                const uid = (user && (user.id || user.uid)) || undefined;
                const rows = await listAppointments(uid);
                const mapped: Appointment[] = rows.map(r => ({
                    id: r.id,
                    type: r.kind,
                    date: r.date,
                    time: r.time_label,
                    leadId: r.lead_id ?? null,
                    propertyId: r.property_id ?? null,
                    propertyAddress: r.property_address || undefined,
                    notes: r.notes || '',
                    status: r.status,
                    leadName: r.name,
                    email: r.email || undefined,
                    phone: r.phone || undefined,
                    remindAgent: r.remind_agent,
                    remindClient: r.remind_client,
                    agentReminderMinutes: r.agent_reminder_minutes_before,
                    clientReminderMinutes: r.client_reminder_minutes_before,
                    meetLink: r.meet_link || undefined,
                    startIso: r.start_iso,
                    endIso: r.end_iso,
                    createdAt: r.created_at,
                    updatedAt: r.updated_at
                }));
                setAppointments(mapped);
            } catch (e) {
                console.warn('Failed loading appointments', e);
            }
        };
        load();
    }, [user, isDemoMode]);

    // Track which property is currently selected
    const _selectedProperty = properties.find(p => p.id === selectedPropertyId);
    // Local admin check removed (use isAdmin state)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <LoadingSpinner size="xl" type="dots" text="Loading Application..." />
            </div>
        );
    }

    if (isSettingUp) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <LoadingSpinner size="xl" type="pulse" text="Setting up your new account..." />
            </div>
        );
    }


    // CheckoutRouteWrapper is defined at module level above for stable component identity.


    // Helper to render routes
    // Note: ProtectedDashboardLayout and CheckoutRouteWrapper are defined at module level
    // above the App component for stable component identity (see Edit #2).
    const renderRoutes = () => {
        if (isLoading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner /></div>;
        console.log("📍 Rendering Routes");

        const renderSettingsPage = (initialTab: 'profile' | 'notifications' | 'security' | 'billing' = 'profile') => (
            <SettingsPage
                userId={user?.uid ?? 'guest-agent'}
                userProfile={userProfile}
                profileLoadFailed={profileLoadFailed}
                onSaveProfile={async (profile) => {
                    setUserProfile(profile);
                    setProfileLoadFailed(false);
                }}
                notificationSettings={notificationSettings}
                onSaveNotifications={async (settings) => {
                    setNotificationSettings(settings);
                    if (user?.uid) {
                        await notificationSettingsService.update(user.uid, settings);
                    }
                }}
                billingSettings={billingSettings}
                onSaveBillingSettings={async (settings) => {
                    setBillingSettings(settings);
                    if (user?.uid) {
                        await billingSettingsService.update(user.uid, settings);
                    }
                }}
                onBackToDashboard={() => navigate('/dashboard')}
                onNavigateToAICard={() => navigate('/ai-card')}
                securitySettings={{}}
                onSaveSecuritySettings={async () => { }}
                isBlueprintMode={isBlueprintMode}
                initialTab={initialTab}
            />
        );
        return (
            <div className="h-full">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={
                        !authReady ? <LoadingSpinner /> :
                        (user || isDemoMode || isAdmin) ? <Navigate to="/dashboard" replace /> :
                            <Suspense fallback={<LoadingSpinner />}>
                                <LandingPage
                                    onNavigateToSignUp={handleNavigateToSignUp}
                                    onNavigateToSignIn={handleNavigateToSignIn}
                                    onEnterDemoMode={() => navigate('/demo-dashboard/today')}
                                    onNavigateToShowcase={() => navigate('/demo-dashboard/today')}
                                    scrollToSection={scrollToSection}
                                    onScrollComplete={() => setScrollToSection(null)}
                                    onOpenConsultationModal={() => { setConsultationRole('realtor'); setIsConsultationModalOpen(true); }}
                                    onNavigateToAdmin={handleNavigateToAdmin}
                                />
                            </Suspense>
                    } />
                    <Route path="/landing" element={<Navigate to="/" replace />} />
                    <Route path="/signin" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <SignInPage
                                onNavigateToSignUp={handleNavigateToSignUp}
                                onNavigateToLanding={handleNavigateToLanding}
                                onEnterDemoMode={() => navigate('/demo-dashboard')}
                                onNavigateToSection={(section) => { navigate('/'); setTimeout(() => setScrollToSection(section), 100); }}
                            />
                        </Suspense>
                    } />
                    <Route path="/forgot-password" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <ForgotPasswordPage
                                onNavigateToSignUp={handleNavigateToSignUp}
                                onNavigateToSignIn={handleNavigateToSignIn}
                                onNavigateToLanding={handleNavigateToLanding}
                            />
                        </Suspense>
                    } />
                    <Route path="/reset-password" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <ResetPasswordPage />
                        </Suspense>
                    } />
                    <Route path="/signup" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <SignUpPage
                                onNavigateToSignIn={handleNavigateToSignIn}
                                onNavigateToLanding={handleNavigateToLanding}
                                onEnterDemoMode={() => navigate('/demo-dashboard')}
                                onNavigateToSection={(section) => { navigate('/'); setTimeout(() => setScrollToSection(section), 100); }}
                            />
                        </Suspense>
                    } />

                    <Route path="/checkout/:slug?" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <CheckoutRouteWrapper />
                        </Suspense>
                    } />

                    {/* Legal Pages */}
                    <Route path="/compliance" element={<CompliancePolicyPage />} />
                    <Route path="/dmca" element={<DmcaPolicyPage />} />

                    {/* Public Storefront Route */}
                    <Route path="/store/:slug" element={<StorefrontPage />} />

                    {/* Public White Label Route - EXPLICITLY PUBLIC */}
                    <Route path="/white-label" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <WhiteLabelPage
                                onOpenContact={() => { setConsultationRole('broker'); setIsConsultationModalOpen(true); }}
                                onNavigateToAdmin={handleNavigateToAdmin}
                                onNavigateToSignUp={handleNavigateToSignUp}
                                onNavigateToSignIn={handleNavigateToSignIn}
                                onEnterDemoMode={() => navigate('/demo-dashboard')}
                            />
                        </Suspense>
                    } />

                    {/* Blog Routes */}
                    <Route path="/blog" element={<BlogIndex />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />

                    {/* Public AI Card View */}
                    <Route path="/card/:id" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <PublicAICard />
                        </Suspense>
                    } />
                    <Route path="/demo-dashboard" element={<DemoDashboardLayout />}>
                        <Route index element={<Navigate to="/demo-dashboard/today" replace />} />
                        <Route path="today" element={<TodayDashboardPage />} />
                        <Route path="command-center" element={<ConversionDashboardHome />} />
                        <Route path="leads" element={<LeadsInboxCommandPage />} />
                        <Route path="leads/:leadId" element={<LeadDetailCommandPage />} />
                        <Route path="appointments" element={<AppointmentsCommandPage />} />
                        <Route path="listings" element={<ListingsCommandPage />} />
                        <Route path="listings/:listingId" element={<ListingPerformancePage />} />
                        <Route path="listings/:listingId/edit" element={<ListingEditorPage />} />
                        <Route path="billing" element={<BillingCommandPage />} />
                        <Route path="onboarding" element={<OnboardingCommandPage />} />
                    </Route>
                    {/* New Blueprint Dashboard — same UI as demo, zero fake data, one example listing */}
                    <Route path="/blueprint-dashboard" element={<BlueprintDashboardLayout />}>
                        <Route index element={<Navigate to="/blueprint-dashboard/today" replace />} />
                        <Route path="today" element={<TodayDashboardPage />} />
                        <Route path="command-center" element={<ConversionDashboardHome />} />
                        <Route path="leads" element={<LeadsInboxCommandPage />} />
                        <Route path="leads/:leadId" element={<LeadDetailCommandPage />} />
                        <Route path="appointments" element={<AppointmentsCommandPage />} />
                        <Route path="listings" element={<ListingsCommandPage />} />
                        <Route path="listings/:listingId" element={<ListingPerformancePage />} />
                        <Route path="listings/:listingId/edit" element={<ListingEditorPage />} />
                        <Route path="billing" element={<BillingCommandPage />} />
                        <Route path="onboarding" element={<OnboardingCommandPage />} />
                    </Route>

                    {/* Public Property Route */}
                    <Route path="/listing/:id" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <PublicListingPage />
                        </Suspense>
                    } />
                    <Route path="/l/:publicSlug" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <PublicListingPage />
                        </Suspense>
                    } />

                    {/* Demo Dashboard */}
                    <Route path="/admin" element={
                        isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/" />
                    } />
                    <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin/:tab" element={
                        isAdmin ? (
                            <AdminDashboard />
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                    <Route path="/admin/leads/:id/dashboard" element={
                        isAdmin ? (
                            <Suspense fallback={<LoadingSpinner />}>
                                <LeadDetailDashboard leads={leads} />
                            </Suspense>
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                    <Route path="/admin-login" element={
                        <AdminLogin
                            onLogin={handleAdminLogin}
                            onBack={() => navigate('/')}
                            isLoading={isAdminLoginLoading}
                            error={adminLoginError || undefined}
                        />
                    } />

                    {/* Admin Setup */}
                    <Route path="/admin-setup" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <AdminSetup key={isAdminLoginOpen ? 'open' : 'closed'} />
                        </Suspense>
                    } />


                    {/* Authenticated Admin Views (Users) */}



                    {/* Protected Routes (Wrapped in Layout) */}
                    <Route element={<ProtectedDashboardLayout />}>
                        <Route path="/dashboard" element={
                            <DashboardRouteGate />
                        } />
                        <Route path="/daily-pulse" element={<Navigate to="/dashboard/today" replace />} />
                        <Route path="/dashboard/:slug" element={<Navigate to="/dashboard/today" replace />} />

                        <Route path="/dashboard/today" element={<TodayDashboardPage />} />
                        <Route path="/dashboard/command-center" element={<ConversionDashboardHome />} />
                        <Route path="/dashboard/leads" element={<LeadsInboxCommandPage />} />
                        <Route path="/dashboard/leads/:leadId" element={<LeadDetailCommandPage />} />
                        <Route path="/dashboard/appointments" element={<AppointmentsCommandPage />} />
                        <Route path="/dashboard/listings" element={<ListingsCommandPage />} />
                        <Route path="/dashboard/listings/:listingId" element={<ListingPerformancePage />} />
                        <Route path="/dashboard/listings/:listingId/edit" element={<ListingEditorPage />} />
                        <Route path="/dashboard/billing" element={<BillingCommandPage />} />
                        <Route path="/dashboard/onboarding" element={<OnboardingCommandPage />} />
                        <Route path="/dashboard/dev/share-test" element={<ShareTestPage />} />


                        <Route path="/listings" element={<Navigate to="/dashboard/listings" replace />} />
                        <Route path="/listings-v2" element={<Navigate to="/dashboard/listings" replace />} />
                        <Route path="/add-listing" element={<Navigate to="/dashboard/listings" replace />} />
                        <Route path="/property" element={<Navigate to="/dashboard/listings" replace />} />
                        <Route path="/leads" element={<Navigate to="/dashboard/leads" replace />} />
                        <Route path="/inbox" element={<Navigate to="/dashboard/leads" replace />} />

                        <Route path="/ai-conversations" element={<AIConversationsPage isDemoMode={isDemoMode} />} />
                        <Route path="/ai-card" element={<AICardPage isDemoMode={isDemoMode} isBlueprintMode={isBlueprintMode} />} />
                        <Route path="/knowledge-base" element={<EnhancedAISidekicksHub isDemoMode={isDemoMode} />} />
                        <Route path="/ai-training" element={<CombinedTrainingPage isDemoMode={isDemoMode} initialTab="training" />} />
                        <Route path="/ai-agent" element={<CombinedTrainingPage isDemoMode={isDemoMode} initialTab="overview" />} />
                        {/* <Route path="/ai-training" element={<AIInteractiveTraining demoMode={isDemoMode} />} /> */}
                        <Route path="/funnel-analytics" element={
                            <FunnelAnalyticsPanel
                                onBackToDashboard={() => navigate('/dashboard')}
                                title="Leads Funnel"
                                subtitle="Homebuyer, Seller, and Showing funnels for every lead"
                                variant="page"
                            />
                        } />
                        <Route path="/analytics" element={<AnalyticsDashboard />} />
                        <Route path="/ai-sidekicks" element={<EnhancedAISidekicksHub isDemoMode={isDemoMode} />} />
                        <Route path="/marketing-reports" element={<MarketingReportsPage />} />
                        <Route path="/voice-lab" element={
                            <Suspense fallback={<LoadingSpinner />}>
                                <VoiceLabPage />
                            </Suspense>
                        } />
                        <Route path="/settings" element={renderSettingsPage()} />
                        <Route path="/dashboard/settings/notifications" element={renderSettingsPage('notifications')} />
                    </Route>

                    {/* Legacy/Misc Public Views */}

                    <Route path="/demo-listing" element={<DemoListingPage />} />
                    <Route path="/demo/listings/:id" element={<DemoListingPage />} />
                    <Route path="/new-landing" element={<NewLandingPage onNavigateToSignUp={handleNavigateToSignUp} onNavigateToSignIn={handleNavigateToSignIn} onEnterDemoMode={handleEnterDemoMode} />} />

                    {/* Fallback */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </div>
        );
    };

    // DEBUG: Log current state before render
    console.log('🎨 RENDERING with view=', view, 'hash=', window.location.hash);

    // Hash override removed - AppRoutes handles routing now

    return (
        <ImpersonationProvider>
            <AgentBrandingProvider>
                <AISidekickProvider>
                    <DashboardLayoutContext.Provider value={{ authReady, user, isAdmin, isDemoMode, isSidebarOpen, setIsSidebarOpen, logAuthBreadcrumb }}>
                    <CheckoutContext.Provider value={{ onBackToSignup: handleNavigateToSignUp }}>
                    <ErrorBoundary>
                        <Suspense fallback={<LoadingSpinner />}>
                            {renderRoutes()}
                        </Suspense>
                        {user && userProfile?.payment_status === 'trialing' && (() => {
                            const created = new Date(user.created_at || '').getTime();
                            const now = new Date().getTime();
                            const isExpired = now - created >= 3 * 24 * 60 * 60 * 1000;
                            return isExpired ? (
                                <Suspense fallback={null}>
                                    <TrialLock _user={user} />
                                </Suspense>
                            ) : null;
                        })()}
                        {isConsultationModalOpen && (
                            <Suspense fallback={<LoadingSpinner />}>
                                <ConsultationModal leadRole={consultationRole} onClose={() => setIsConsultationModalOpen(false)} onSuccess={() => { console.log('Consultation scheduled successfully!'); }} />
                            </Suspense>
                        )}
                        {isAdminLoginOpen && view !== 'admin-setup' && (
                            <Suspense fallback={<LoadingSpinner />}>
                                <AdminLogin onLogin={handleAdminLogin} onBack={handleAdminLoginClose} isLoading={isAdminLoginLoading} error={adminLoginError || undefined} />
                            </Suspense>
                        )}
                        {view !== 'landing' && view !== 'new-landing' && (
                            <Suspense fallback={null}>
                                <ChatBotFAB
                                    context={{
                                        userType: user ? (isDemoMode ? 'prospect' : 'client') : 'visitor',
                                        currentPage: view,
                                        previousInteractions: user ? 1 : 0,
                                        userInfo: user ? { name: user.displayName || 'User', email: user.email || '', company: 'Real Estate' } : undefined
                                    }}
                                    onLeadGenerated={(leadInfo) => { console.log('Lead generated from chat:', leadInfo); }}
                                    onSupportTicket={async (ticketInfo) => {
                                        console.log('Support ticket created from chat:', ticketInfo);
                                        try {
                                            const { notifyAgentHandoff } = await import('./services/chatService');
                                            await notifyAgentHandoff(ticketInfo);
                                        } catch (err) {
                                            console.error("Failed to notify agent of handoff:", err);
                                        }
                                    }}
                                    position="bottom-right"
                                    showWelcomeMessage={false}
                                />
                            </Suspense>
                        )}
                    </ErrorBoundary>
                    </CheckoutContext.Provider>
                    </DashboardLayoutContext.Provider>
                </AISidekickProvider>
                <Toaster
                    position="bottom-center"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#333',
                            color: '#fff',
                        },
                    }}
                />
            </AgentBrandingProvider>
        </ImpersonationProvider>
    );
};


export default App;
