import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, useParams } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Property, View, AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings, Lead, Appointment, Interaction, FollowUpSequence, LeadFunnelType } from './types';
import { DEMO_FAT_PROPERTIES, DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS, DEMO_SEQUENCES } from './demoConstants';
import { SAMPLE_AGENT, SAMPLE_INTERACTIONS } from './constants';
import {
    BLUEPRINT_AGENT,
    BLUEPRINT_PROPERTIES
} from './constants/agentBlueprintData';
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

const AgentDashboard = lazy(() => import('./components/AgentDashboard'));
const NotificationSystem = lazy(() => import('./components/NotificationSystem'));

const Sidebar = lazy(() => import('./components/Sidebar'));
const PropertyPage = lazy(() => import('./components/PropertyPage'));
const ListingsPage = lazy(() => import('./components/ListingsPage'));
const AddListingPage = lazy(() => import('./components/AddListingPage'));
const ListingStudioV2Page = lazy(() => import('./components/listings/ListingStudioV2Page'));
const ConversionDashboardHome = lazy(() => import('./components/dashboard-command/ConversionDashboardHome'));
const LeadsInboxCommandPage = lazy(() => import('./components/dashboard-command/LeadsInboxCommandPage'));
const LeadDetailCommandPage = lazy(() => import('./components/dashboard-command/LeadDetailCommandPage'));
const AppointmentsCommandPage = lazy(() => import('./components/dashboard-command/AppointmentsCommandPage'));
const ListingPerformancePage = lazy(() => import('./components/dashboard-command/ListingPerformancePage'));
const BillingCommandPage = lazy(() => import('./components/dashboard-command/BillingCommandPage'));
const LeadsAndAppointmentsPage = lazy(() => import('./components/LeadsAndAppointmentsPage'));
const InteractionHubPage = lazy(() => import('./components/AIInteractionHubPage'));
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
const MultiToolShowcase = lazy(() => import('./components/MultiToolShowcase').then(module => ({ default: module.MultiToolShowcase })));
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
import { LogoWithName } from './components/LogoWithName';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EnvValidation } from './utils/envValidation';
import DashboardRealtimeBootstrap from './components/dashboard-command/DashboardRealtimeBootstrap';
// SessionService removed
import { listAppointments } from './services/appointmentsService';
import { PerformanceService } from './services/performanceService';
import SequenceExecutionService, { SequenceTriggerType } from './services/sequenceExecutionService';
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
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [interactions, setInteractions] = useState<Interaction[]>([]);


    const [sequences, setSequences] = useState<FollowUpSequence[]>([]);

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
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
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
    const [emailSettings, setEmailSettings] = useState<EmailSettings>({ integrationType: 'oauth', aiEmailProcessing: true, autoReply: true, leadScoring: true, followUpSequences: true });
    const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
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






    useEffect(() => {
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
            // Safety timeout to prevent infinite loading screen
            const safetyTimeout = setTimeout(() => {
                console.warn('⚠️ Auth check timed out. Forcing app load.');
                setIsLoading(false);
            }, 5000);

            // Check URL path immediately
            const currentPath = window.location.pathname;
            console.log('📍 Initial Route:', currentPath);

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
                currentPath === '/agent-blueprint-dashboard' || currentPath.startsWith('/agent-blueprint-dashboard') ||
                currentPath === '/white-label';

            // Force Blueprint Mode handling if on that route specifically
            if (currentPath.includes('blueprint')) {
                if (!isBlueprintMode) handleEnterBlueprintMode();
            }

            if (isPublicRoute) {

                // We typically just let the router handle the view based on URL,
                // but for compatibility we set 'view' for the old renderer if needed
                if (currentPath.startsWith('/checkout')) {
                    // Do nothing, let router render Outlet
                } else if (currentPath === '/signup') {
                    setView('signup');
                } else if (currentPath === '/signin') {
                    setView('signin');
                }
            } else {
                // If protected route, show loading briefly while we check session
                setIsLoading(true);
            }

            try {
                // 0. OPTIMISTIC CHECK: Look in LocalStorage before waiting for network
                // This prevents the 5s wait if the user was previously logged in.
                try {
                    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
                    if (sbKey) {
                        const raw = localStorage.getItem(sbKey);
                        if (raw) {
                            const sessionData = JSON.parse(raw);
                            if (sessionData?.user?.id) {
                                console.log('⚡️ Optimistic Auth: User found in local storage');
                                const optimisticUser: AppUser = {
                                    uid: sessionData.user.id,
                                    id: sessionData.user.id,
                                    email: sessionData.user.email,
                                    displayName: sessionData.user.user_metadata?.name ?? null,
                                    created_at: sessionData.user.created_at
                                };
                                // Update State immediately
                                setUser(optimisticUser);

                                // CRITICAL for Admin routes: Do NOT unblock UI yet if we are heading to /admin.
                                // We MUST wait for the official admin check to prevent the 'flash' redirect to agent dashboard.
                                if (!currentPath.startsWith('/admin')) {
                                    setIsLoading(false);
                                }
                                clearTimeout(safetyTimeout);

                                // We still let the network check run below to verify validity, 
                                // but the user is already seeing the app!
                            }
                        }
                    }
                } catch (e) { console.warn('Optimistic check failed', e); }

                // 1. Check Local Session (Network Validation)
                console.log('🔍 Checking session (Network Validation)...');
                const sessionPromise = supabase.auth.getSession();

                // Add a small timeout race for the network check too, just in case
                const { data: { session }, error: sessionError } = await Promise.race([
                    sessionPromise,
                    new Promise<{ data: { session: any }, error: any }>((resolve) => setTimeout(() => resolve({ data: { session: null }, error: null }), 3000))
                ]);

                console.log('🔍 Network Session check complete. User:', session?.user?.email);

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
                            clearTimeout(safetyTimeout);
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

                    // Redirect protected routes to signin
                    if (!isPublicRoute) {
                        console.log('🔒 Protected route accessed without session. Redirecting to signin.');
                        // Store return url?
                        navigate('/signin');
                    }
                }

            } catch (error) {
                console.error("❌ Auth Init Error:", error);
            } finally {
                clearTimeout(safetyTimeout);
                setIsLoading(false);
            }
        };


        initAuth();

        // Listen for auth changes (Sign In / Sign Out / Token Refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("🔐 Auth Change:", event, session?.user?.email);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    const currentUser: AppUser = {
                        uid: session.user.id,
                        id: session.user.id,
                        email: session.user.email ?? null,
                        displayName: session.user.user_metadata?.name ?? null,
                        created_at: session.user.created_at
                    };
                    setUser(currentUser);

                    // IMMEDIATE ADMIN CHECK (Redundant but fast)
                    const envAdminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
                    const adminEmails = ['admin@homelistingai.com', 'us@homelistingai.com'];
                    if (envAdminEmail) adminEmails.push(envAdminEmail.toLowerCase());

                    if (session.user.email && adminEmails.includes(session.user.email.toLowerCase())) {
                        console.log("👮 Fast Admin Check Passed");
                        setIsAdmin(true);
                        // Force navigation will happen via useEffect below
                    }

                    await loadUserData(currentUser);

                    // Security Notification (Non-blocking)
                    if (currentUser.email) {
                        void securitySettingsService.notifyLogin(currentUser.id, currentUser.email);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);

                setUserProfile(SAMPLE_AGENT);
                setIsAdmin(false);
                setProperties([]);
                localStorage.removeItem('hlai_impersonated_user_id'); // Clear impersonation
                navigate('/');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate, setView]);

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
        } else if (location.pathname.startsWith('/admin') && location.pathname !== '/admin-login') {
            // Safety: If NOT admin but on admin page, kick out
            console.warn("⛔️ Accessing admin page without admin privileges. Redirecting.");
            if (user) {
                // If logged in but not admin, maybe regular dashboard?
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/admin-login', { replace: true });
            }
        }
    }, [isAdmin, user, location.pathname, navigate]);

    // --- FORCE AUTH REDIRECT ---
    // If user is logged in but on a public auth page (Signin/Signup), redirect to Dashboard.
    useEffect(() => {
        if (user && !isLoading) {
            const path = location.pathname;
            if (path === '/signin' || path === '/signup') {
                console.log("✅ User authenticated on auth page. Redirecting to dashboard...");
                navigate('/dashboard', { replace: true });
            }
        }
    }, [user, isLoading, location.pathname, navigate]);

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
                console.log('✅ Loaded listings from backend:', frontendProperties.length);
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

        setSequences(DEMO_SEQUENCES);
        setUserProfile(SAMPLE_AGENT);
        navigate('/demo-dashboard');
    };

    const handleEnterBlueprintMode = () => {
        setIsDemoMode(false);
        setIsBlueprintMode(true);

        // Clear mock data to ensure "Blank Slate" / "Live" experience
        // BUT stick the Demo Listing in so they have an example (as requested)
        setProperties(BLUEPRINT_PROPERTIES);
        setLeads([]);
        setAppointments([]);
        setInteractions([]);
        setSequences([]);

        // Keep the Blueprint Agent profile for context/sidebar branding
        setUserProfile(BLUEPRINT_AGENT);
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


    const handleSelectProperty = (id: string) => {
        setSelectedPropertyId(id);
        setView('property');
    };

    const handleSetProperty = (updatedProperty: Property) => {
        setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
    };

    const handleSaveNewProperty = async (newPropertyData: Omit<Property, 'id' | 'description' | 'imageUrl'>) => {
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

    const handleDeleteProperty = (id: string) => {
        if (window.confirm('Are you sure you want to delete this listing?')) {
            const removedProperty = properties.find(p => p.id === id);
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
            propertyOverride?: Property
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
        [resolvePropertyForLead, sequences, userProfile]
    );

    const handleAddNewLead = async (leadData: { name: string; email: string; phone: string; message: string; source: string; funnelType?: string }) => {
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

    const handleLeadFunnelAssigned = useCallback(
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

    const handleUpdateLead = useCallback(async (leadId: string, updatedData: { name: string; email: string; phone: string; message: string; source: string; funnelType?: string }) => {
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
                        const sequenceContext = {
                            lead: updatedLead,
                            agent: userProfile
                        };
                        // [MIGRATION] Client-side execution disabled.
                        // await SequenceExecutionService.getInstance().triggerSequences(
                        //     triggerType,
                        //     sequenceContext,
                        //     sequences
                        // );
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
    }, [leads, userProfile, sequences]);

    const handleDeleteLead = useCallback(async (leadId: string) => {
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
    const selectedProperty = properties.find(p => p.id === selectedPropertyId);
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


    // Unified Checkout Wrapper to handle both URL params and context
    const CheckoutRouteWrapper = () => {
        const params = useParams<{ slug?: string }>();
        const registrationContext = getRegistrationContext() as { slug?: string } | null;

        // Prioritize URL param, fallback to context
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
                            onClick={handleNavigateToSignUp}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition"
                        >
                            <span className="material-symbols-outlined text-base">person_add</span>
                            Start new signup
                        </button>
                    </div>
                </div>
            );
        }

        return <CheckoutPage slug={slugForCheckout} onBackToSignup={handleNavigateToSignUp} />;
    };

    const ProtectedLayout = () => (
        <div className="flex h-screen bg-slate-50 relative">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm z-20">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Open menu">
                        <span className="material-symbols-outlined text-xl">menu</span>
                    </button>
                    <div className="flex-1 flex justify-center">
                        <LogoWithName />
                    </div>
                    <div>
                        {user && <NotificationSystem userId={user.uid} />}
                    </div>
                </header>

                {/* Desktop Notification Bell (Absolute Top-Right) */}
                <div className="hidden md:block absolute top-6 right-8 z-50">
                    {user && <NotificationSystem userId={user.uid} />}
                </div>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 relative z-0">
                    <DashboardRealtimeBootstrap />
                    <Outlet />
                </main>
            </div>
        </div>
    );

    // Helper to render routes
    const renderRoutes = () => {
        if (isLoading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner /></div>;
        console.log("📍 Rendering Routes");
        return (
            <div className="h-full">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={
                        (user || isDemoMode || isAdmin) ? <Navigate to="/dashboard" replace /> :
                            <Suspense fallback={<LoadingSpinner />}>
                                <LandingPage
                                    onNavigateToSignUp={handleNavigateToSignUp}
                                    onNavigateToSignIn={handleNavigateToSignIn}
                                    onEnterDemoMode={() => navigate('/demo-dashboard')}
                                    onNavigateToShowcase={() => navigate('/demo-dashboard')}
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
                    <Route path="/demo-dashboard/*" element={<AgentDashboard isDemoMode={true} demoListingCount={4} />} />
                    <Route path="/dashboard-blueprint/*" element={<AgentDashboard isDemoMode={true} demoListingCount={1} />} />
                    <Route path="/agent-blueprint-dashboard/*" element={<AgentDashboard isDemoMode={false} isBlueprintMode={true} demoListingCount={1} />} />
                    <Route path="/demo-showcase" element={<MultiToolShowcase />} />

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
                    <Route element={<ProtectedLayout />}>
                        <Route path="/dashboard" element={
                            isAdmin ? <Navigate to="/admin-dashboard" replace /> :
                                <ConversionDashboardHome />
                        } />
                        <Route path="/daily-pulse" element={
                            isAdmin ? <Navigate to="/admin-dashboard" replace /> :
                                (userProfile.slug && userProfile.id !== SAMPLE_AGENT.id ? <Navigate to={`/dashboard/${userProfile.slug}`} replace /> : <AgentDashboard preloadedProperties={properties} />)
                        } />
                        <Route path="/dashboard/:slug" element={<AgentDashboard preloadedProperties={properties} />} />

                        <Route path="/dashboard/command-center" element={<ConversionDashboardHome />} />
                        <Route path="/dashboard/leads" element={<LeadsInboxCommandPage />} />
                        <Route path="/dashboard/leads/:leadId" element={<LeadDetailCommandPage />} />
                        <Route path="/dashboard/appointments" element={<AppointmentsCommandPage />} />
                        <Route path="/dashboard/listings/:listingId" element={<ListingPerformancePage />} />
                        <Route path="/dashboard/billing" element={<BillingCommandPage />} />


                        <Route path="/listings" element={
                            <ListingsPage properties={properties} onSelectProperty={handleSelectProperty} onAddNew={() => navigate('/add-listing')} onDeleteProperty={handleDeleteProperty} onBackToDashboard={() => navigate('/dashboard')} />
                        } />

                        <Route path="/listings-v2" element={
                            <ListingStudioV2Page properties={properties} agentProfile={userProfile} onBackToListings={() => navigate('/listings')} />
                        } />

                        <Route path="/add-listing" element={
                            <AddListingPage onCancel={() => navigate('/dashboard')} onSave={handleSaveNewProperty} />
                        } />

                        <Route path="/property" element={
                            selectedProperty ? <PropertyPage property={selectedProperty} setProperty={handleSetProperty} onBack={() => navigate('/listings')} leadCount={leads.filter(l => l.interestedProperties?.includes(selectedProperty.id)).length} /> : <Navigate to="/listings" />
                        } />

                        <Route path="/leads" element={
                            <LeadsAndAppointmentsPage
                                leads={leads}
                                appointments={appointments}
                                onAddNewLead={handleAddNewLead}
                                onBackToDashboard={() => navigate('/dashboard')}
                                resolvePropertyForLead={resolvePropertyForLead}
                                onNewAppointment={async (appt) => {
                                    setAppointments((prev) => [appt, ...prev]);
                                    const lead = appt.leadId ? leads.find((l) => l.id === appt.leadId) : undefined;
                                    if (lead) await triggerLeadSequences(lead, 'Appointment Scheduled', resolvePropertyForLead(lead));
                                }}
                                onAssignFunnel={handleLeadFunnelAssigned}
                                onUpdateLead={(lead) => handleUpdateLead(lead.id, {
                                    name: lead.name,
                                    email: lead.email,
                                    phone: lead.phone,
                                    message: lead.lastMessage,
                                    source: lead.source || 'Manual Entry',
                                    funnelType: lead.funnelType
                                })}
                                onDeleteLead={handleDeleteLead}
                            />
                        } />

                        <Route path="/inbox" element={
                            <InteractionHubPage properties={properties} interactions={interactions} setInteractions={setInteractions} onAddNewLead={handleAddNewLead} onBackToDashboard={() => navigate('/dashboard')} />
                        } />

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
                        <Route path="/settings" element={
                            <SettingsPage
                                userId={user?.uid ?? 'guest-agent'}
                                userProfile={userProfile}
                                onSaveProfile={async (profile) => setUserProfile(profile)}
                                notificationSettings={notificationSettings}
                                onSaveNotifications={async (settings) => {
                                    setNotificationSettings(settings);
                                    if (user?.uid) {
                                        await notificationSettingsService.update(user.uid, settings);
                                    }
                                }}
                                emailSettings={emailSettings}
                                onSaveEmailSettings={async (settings) => {
                                    setEmailSettings(settings);
                                    if (user?.uid) {
                                        try {
                                            await emailSettingsService.update(user.uid, settings);
                                        } catch (error) {
                                            console.error('Failed to save email settings:', error);
                                        }
                                    }
                                }}
                                calendarSettings={calendarSettings}
                                onSaveCalendarSettings={async (settings) => {
                                    setCalendarSettings(settings);
                                    if (user?.uid) {
                                        await calendarSettingsService.update(user.uid, settings);
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
                            />
                        } />
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
