import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, useParams } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Property, View, AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings, Lead, Appointment, Interaction, FollowUpSequence, LeadFunnelType } from './types';
import { DEMO_FAT_PROPERTIES, DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS, DEMO_SEQUENCES } from './demoConstants';
import { SAMPLE_AGENT, SAMPLE_INTERACTIONS } from './constants';
import {
    BLUEPRINT_AGENT,
    BLUEPRINT_PROPERTIES,
    BLUEPRINT_LEADS,
    BLUEPRINT_APPOINTMENTS,
    BLUEPRINT_INTERACTIONS,
    BLUEPRINT_SEQUENCES
} from './constants/agentBlueprintData';
import LandingPage from './components/LandingPage';
import NewLandingPage from './components/NewLandingPage';
import SignUpPage from './components/SignUpPage';
import SignInPage from './components/SignInPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import CheckoutPage from './components/CheckoutPage';
import { getRegistrationContext } from './services/agentOnboardingService';

import AgentDashboard from './components/AgentDashboard';

import Sidebar from './components/Sidebar';
import PropertyPage from './components/PropertyPage';
import ListingsPage from './components/ListingsPage';
import AddListingPage from './components/AddListingPage';
import LeadsAndAppointmentsPage from './components/LeadsAndAppointmentsPage';
import InteractionHubPage from './components/AIInteractionHubPage';
import AIConversationsPage from './components/AIConversationsPage';
import AICardPage from './components/AICardPage';
import MarketingReportsPage from './components/MarketingReportsPage';
import CompliancePolicyPage from './components/CompliancePolicyPage';
import DmcaPolicyPage from './components/DmcaPolicyPage';

// import KnowledgeBasePage from './components/KnowledgeBasePage';
import SettingsPage from './components/SettingsPage';
import AnalyticsDashboard from './components/AnalyticsDashboard';

import ConsultationModal from './components/ConsultationModal';
import { AISidekickProvider } from './context/AISidekickContext';
import { AgentBrandingProvider } from './context/AgentBrandingContext';
import { getProfileForDashboard, subscribeToProfileChanges } from './services/agentProfileService';
// Lazy load admin components for better performance
const AdminSetup = lazy(() => import('./components/AdminSetup'));
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './admin-dashboard/AdminDashboard';
import type { DashboardView } from './admin-dashboard/AdminDashboard';
import BlogPage from './components/BlogPage';
import BlogPostPage from './components/BlogPostPage';
import DemoListingPage from './components/DemoListingPage';
import ChatBotFAB from './components/ChatBotFAB';
import { StorefrontPage } from './pages/StorefrontPage';
import { MultiToolShowcase } from './components/MultiToolShowcase';
const FUNNEL_TRIGGER_MAP: Record<LeadFunnelType, SequenceTriggerType> = {
    universal_sales: 'Buyer Lead',
    homebuyer: 'Buyer Lead',
    seller: 'Seller Lead',
    postShowing: 'Property Viewed'
};





import LoadingSpinner from './components/LoadingSpinner';
import { adminAuthService } from './services/adminAuthService';
import EnhancedAISidekicksHub from './components/EnhancedAISidekicksHub';
const PublicAICard = lazy(() => import('./components/PublicAICard')); // Public View
import AIInteractiveTraining from './components/AIInteractiveTraining';
import FunnelAnalyticsPanel from './components/FunnelAnalyticsPanel';

import { listingsService, CreatePropertyInput } from './services/listingsService';
// Stubs removed, using real service
import { LogoWithName } from './components/LogoWithName';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EnvValidation } from './utils/envValidation';
// SessionService removed
import { listAppointments } from './services/appointmentsService';
import { PerformanceService } from './services/performanceService';
import SequenceExecutionService, { SequenceTriggerType } from './services/sequenceExecutionService';
import { leadsService, LeadPayload } from './services/leadsService';


// A helper function to delay execution


type AppUser = {
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
const AdminUsersPage = lazy(() => import('./components/AdminUsersPage'));

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
    }, [navigate, userProfile?.slug]);



    // Determine 'view' from location for legacy compatibility or Sidebar highlighting
    // e.g. /dashboard -> 'dashboard'
    const getCurrentView = (): View => {
        const path = location.pathname.substring(1); // remove leading /
        if (!path) return 'landing';
        return (path as View) || 'landing';
    };

    // We treat 'view' as derived state now
    const view = getCurrentView();

    // PERF: Initialize loading state
    const [isLoading, setIsLoading] = useState(false); // Router handles most loading now
    const [isSettingUp] = useState(false); // Helper state for setup flows (currently unused)
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isBlueprintMode, setIsBlueprintMode] = useState(false);
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
    const [billingSettings, setBillingSettings] = useState<BillingSettings>({ planName: 'Solo Agent', history: [{ id: 'inv-123', date: '07/15/2024', amount: 59.00, status: 'Paid' }] });
    // Removed unused state variables






    useEffect(() => {
        console.log('🚀 APP INIT: Optimized Auth Flow');

        // Validate environment
        EnvValidation.logValidationResults();

        // Initialize performance monitoring
        PerformanceService.initialize();

        // FAILSAFE: Force loading to complete after 3 seconds (was 8)
        const safetyTimer = setTimeout(() => {
            setIsLoading((prev) => {
                if (prev) console.warn("⚠️ Safety timer triggered: Forcing loading complete.");
                return false;
            });
        }, 3000);

        const initAuth = async () => {
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
                currentPath === '/agent-blueprint-dashboard' || currentPath.startsWith('/agent-blueprint-dashboard');

            if (isPublicRoute) {
                console.log('🔓 Public route detected, unblocking UI immediately.');
                setIsLoading(false);

                if (currentPath.startsWith('/agent-blueprint-dashboard')) {
                    handleEnterBlueprintMode();
                }

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
                // 1. Check Local Session FIRST (Fastest)
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

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

                    // 2. Non-blocking Admin/Data Check
                    // We DO NOT await this before allowing the user to see the dashboard.
                    // Instead, we let the dashboard load and upgrade the user permissions/data context asynchronously.
                    loadUserData(currentUser);

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
                setIsLoading(false);
            }
        };

        // Separate function to load heavy data without blocking UI
        const loadUserData = async (currentUser: AppUser) => {
            try {
                console.log('🔄 Loading user data in background...');

                // 1. Admin Check logic
                const { data: isRpcAdmin } = await supabase.rpc('is_user_admin', { uid: currentUser.uid });
                const envAdminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
                const adminEmails = ['admin@homelistingai.com', 'us@homelistingai.com'];
                if (envAdminEmail) adminEmails.push(envAdminEmail.toLowerCase());

                const isEnvAdmin = currentUser.email && adminEmails.includes(currentUser.email.toLowerCase());

                if (isRpcAdmin || isEnvAdmin) {
                    console.log("👮 Admin privileges confirmed for:", currentUser.email);
                    setIsAdmin(true);
                    // Update profile for admin
                    setUserProfile({
                        ...SAMPLE_AGENT,
                        name: 'System Administrator',
                        email: currentUser.email ?? '',
                        headshotUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}`,
                    });
                    // If on admin dashboard, great.
                    return;
                }

                // 2. Properties (for regular users)
                const propertiesToLoad = await listingsService.listProperties(currentUser.uid);
                if (propertiesToLoad.length > 0) {
                    setProperties(propertiesToLoad);
                    setUserProfile(propertiesToLoad[0].agent);
                } else {
                    // New/Empty user
                    console.log('🆕 No properties. Initializing empty profile.');
                }

            } catch (err) {
                console.warn('Background data load warning:', err);
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
                    const adminEmails = ['admin@homelistingai.com', 'us@homelistingai.com'];
                    if (session.user.email && adminEmails.includes(session.user.email.toLowerCase())) {
                        console.log("👮 Fast Admin Check Passed");
                        setIsAdmin(true);
                        // Force navigation will happen via useEffect below
                    }

                    await loadUserData(currentUser);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);

                setUserProfile(SAMPLE_AGENT);
                setIsAdmin(false);
                setProperties([]);
                navigate('/');
            }
        });

        return () => {
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);

    // --- FORCE ADMIN REDIRECT ---
    // If we are detected as Admin, but not on an admin page, GO TO ADMIN DASHBOARD.
    useEffect(() => {
        if (isAdmin) {
            const path = location.pathname;
            if (!path.startsWith('/admin') && path !== '/admin-login') {
                console.log("👮 Admin detected on agent page (" + path + "). Redirecting...");
                navigate('/admin-dashboard', { replace: true });
            }
        }
    }, [isAdmin, location.pathname, navigate]);

    // Load centralized agent profile and set up real-time updates
    useEffect(() => {
        if (user && !isDemoMode) {
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
    }, [user, isDemoMode]);

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
            const response = await fetch('/api/listings');
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
                console.warn('Failed to load listings from backend, using demo data');
                setProperties(DEMO_FAT_PROPERTIES);
            }
        } catch (error) {
            console.error('Error loading listings from backend:', error);
            setProperties(DEMO_FAT_PROPERTIES);
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
        setIsDemoMode(true);
        setIsBlueprintMode(true);
        setProperties(BLUEPRINT_PROPERTIES);
        setLeads(BLUEPRINT_LEADS);
        setAppointments(BLUEPRINT_APPOINTMENTS);
        setInteractions(BLUEPRINT_INTERACTIONS);

        setSequences(BLUEPRINT_SEQUENCES);
        setUserProfile(BLUEPRINT_AGENT);
        // We stay on this route, Dashboard will render with this data
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
            setProperties(prev => prev.filter(p => p.id !== id));
            if (selectedPropertyId === id) {
                setSelectedPropertyId(null);
                setView('listings');
            }
        }
    };

    const triggerLeadSequences = useCallback(
        async (
            lead: Lead,
            triggerType: SequenceTriggerType = 'Lead Capture',
            propertyOverride?: Property
        ) => {
            try {
                const sequenceService = SequenceExecutionService.getInstance();
                await sequenceService.triggerSequences(
                    triggerType,
                    {
                        lead,
                        agent: userProfile || SAMPLE_AGENT,
                        property: propertyOverride ?? resolvePropertyForLead(lead)
                    },
                    sequences
                );
                console.log(`✅ ${triggerType} sequences triggered for:`, lead.name);
            } catch (error) {
                console.error('❌ Error triggering sequences:', error);
            }
        },
        [resolvePropertyForLead, sequences, userProfile]
    );

    const handleAddNewLead = async (leadData: { name: string; email: string; phone: string; message: string; source: string; }) => {
        const payload: LeadPayload = {
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            source: leadData.source || 'Website',
            lastMessage: leadData.message,
            funnelType: null
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

    const handleUpdateLead = useCallback(async (updatedLead: Lead) => {
        try {
            // Optimistic update
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));

            await leadsService.update(updatedLead.id, {
                name: updatedLead.name,
                email: updatedLead.email,
                phone: updatedLead.phone,
                lastMessage: updatedLead.lastMessage,
                source: updatedLead.source,
                funnelType: updatedLead.funnelType
            });
            // Use console for success or a toast if available (dashboard has its own notification context usually)
            console.log('Lead updated successfully');
        } catch (error) {
            console.error('Failed to update lead:', error);
            // Revert state if needed - relying on next fetch for now or we could snapshot prev state
        }
    }, []);

    const handleDeleteLead = useCallback(async (leadId: string) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            try {
                // Optimistic update
                setLeads(prev => prev.filter(l => l.id !== leadId));
                // Call service if strictly needed, but for now local/demo state is primary or service is mock
                // await leadsService.delete(leadId); 
            } catch (error) {
                console.error('Failed to delete lead:', error);
            }
        }
    }, []);

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
        <div className="flex h-screen bg-slate-50">
            <Sidebar activeView={view} setView={setView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="md:hidden flex items-center justify-between p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Open menu">
                        <span className="material-symbols-outlined text-xl">menu</span>
                    </button>
                    <div className="flex-1 flex justify-center">
                        <LogoWithName />
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
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
                            <LandingPage
                                onNavigateToSignUp={handleNavigateToSignUp}
                                onNavigateToSignIn={handleNavigateToSignIn}
                                onEnterDemoMode={() => navigate('/demo-dashboard')}
                                onNavigateToShowcase={() => navigate('/demo-dashboard')}
                                scrollToSection={scrollToSection}
                                onScrollComplete={() => setScrollToSection(null)}
                                onOpenConsultationModal={() => setIsConsultationModalOpen(true)}
                                onNavigateToAdmin={handleNavigateToAdmin}
                            />
                    } />
                    <Route path="/landing" element={<Navigate to="/" replace />} />
                    <Route path="/signin" element={
                        <SignInPage
                            onNavigateToSignUp={handleNavigateToSignUp}
                            onNavigateToLanding={handleNavigateToLanding}
                            onEnterDemoMode={() => navigate('/demo-dashboard')}
                            onNavigateToSection={(section) => { navigate('/'); setTimeout(() => setScrollToSection(section), 100); }}
                        />
                    } />
                    <Route path="/forgot-password" element={
                        <ForgotPasswordPage
                            onNavigateToSignUp={handleNavigateToSignUp}
                            onNavigateToSignIn={handleNavigateToSignIn}
                            onNavigateToLanding={handleNavigateToLanding}
                        />
                    } />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/signup" element={
                        <SignUpPage
                            onNavigateToSignIn={handleNavigateToSignIn}
                            onNavigateToLanding={handleNavigateToLanding}
                            onEnterDemoMode={() => navigate('/demo-dashboard')}
                            onNavigateToSection={(section) => { navigate('/'); setTimeout(() => setScrollToSection(section), 100); }}
                        />
                    } />

                    <Route path="/checkout/:slug?" element={<CheckoutRouteWrapper />} />

                    {/* Legal Pages */}
                    <Route path="/compliance" element={<CompliancePolicyPage />} />
                    <Route path="/dmca" element={<DmcaPolicyPage />} />

                    {/* Public Storefront Route */}
                    <Route path="/store/:slug" element={<StorefrontPage />} />

                    {/* Public AI Card View */}
                    <Route path="/card/:id" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <PublicAICard />
                        </Suspense>
                    } />

                    {/* Demo Dashboard */}
                    <Route path="/admin-dashboard" element={
                        isAdmin ? <AdminDashboard /> : <Navigate to="/" />
                    } />
                    <Route path="/demo-dashboard" element={<AgentDashboard isDemoMode={true} demoListingCount={2} />} />
                    <Route path="/dashboard-blueprint" element={<AgentDashboard isDemoMode={true} demoListingCount={1} />} />
                    <Route path="/agent-blueprint-dashboard" element={<AgentDashboard isDemoMode={true} isBlueprintMode={true} demoListingCount={1} />} />
                    <Route path="/demo-showcase" element={<MultiToolShowcase />} />

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
                    <Route path="/admin-users" element={
                        <Suspense fallback={<LoadingSpinner />}>
                            <AdminUsersPage />
                        </Suspense>
                    } />

                    {/* Authenticated Admin Views (Cloned Dashboard Tabs) */}
                    {['leads', 'contacts', 'ai-card', 'ai-training', 'knowledge-base', 'funnel-analytics', 'analytics', 'settings'].map(tab => (
                        <Route key={tab} path={`/admin-${tab}`} element={
                            <Suspense fallback={<LoadingSpinner />}>
                                <AdminDashboard initialTab={tab === 'contacts' ? 'leads' : tab as DashboardView} />
                            </Suspense>
                        } />
                    ))}
                    {/* Catch-all for other admin routes */}
                    <Route path="/admin-marketing" element={<Suspense fallback={<LoadingSpinner />}><AdminDashboard initialTab="funnel-analytics" /></Suspense>} />
                    <Route path="/admin-ai-personalities" element={<Suspense fallback={<LoadingSpinner />}><AdminDashboard initialTab="knowledge-base" /></Suspense>} />


                    {/* Protected Routes (Wrapped in Layout) */}
                    <Route element={<ProtectedLayout />}>
                        <Route path="/dashboard" element={
                            isAdmin ? <Navigate to="/admin-dashboard" replace /> :
                                (userProfile.slug ? <Navigate to={`/dashboard/${userProfile.slug}`} replace /> : <AgentDashboard />)
                        } />
                        <Route path="/dashboard/:slug" element={<AgentDashboard />} />


                        <Route path="/listings" element={
                            <ListingsPage properties={properties} onSelectProperty={handleSelectProperty} onAddNew={() => navigate('/add-listing')} onDeleteProperty={handleDeleteProperty} onBackToDashboard={() => navigate('/dashboard')} />
                        } />

                        <Route path="/add-listing" element={
                            <AddListingPage onCancel={() => navigate('/dashboard')} onSave={handleSaveNewProperty} />
                        } />

                        <Route path="/property" element={
                            selectedProperty ? <PropertyPage property={selectedProperty} setProperty={handleSetProperty} onBack={() => navigate('/listings')} isDemoMode={isDemoMode} leadCount={leads.filter(l => l.interestedProperties?.includes(selectedProperty.id)).length} /> : <Navigate to="/listings" />
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
                                onUpdateLead={handleUpdateLead}
                                onDeleteLead={handleDeleteLead}
                            />
                        } />

                        <Route path="/inbox" element={
                            <InteractionHubPage properties={properties} interactions={interactions} setInteractions={setInteractions} onAddNewLead={handleAddNewLead} onBackToDashboard={() => navigate('/dashboard')} />
                        } />

                        <Route path="/ai-conversations" element={<AIConversationsPage isDemoMode={isDemoMode} />} />
                        <Route path="/ai-card" element={<AICardPage isDemoMode={isDemoMode} isBlueprintMode={isBlueprintMode} />} />
                        <Route path="/knowledge-base" element={<EnhancedAISidekicksHub isDemoMode={isDemoMode} />} />
                        <Route path="/ai-training" element={<AIInteractiveTraining demoMode={isDemoMode} />} />
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
                        <Route path="/settings" element={
                            <SettingsPage
                                userId={user?.uid ?? 'guest-agent'}
                                userProfile={userProfile}
                                onSaveProfile={setUserProfile}
                                notificationSettings={notificationSettings}
                                onSaveNotifications={setNotificationSettings}
                                emailSettings={emailSettings}
                                onSaveEmailSettings={setEmailSettings}
                                calendarSettings={calendarSettings}
                                onSaveCalendarSettings={setCalendarSettings}
                                billingSettings={billingSettings}
                                onSaveBillingSettings={setBillingSettings}
                                onBackToDashboard={() => navigate('/dashboard')}
                                onNavigateToAICard={() => navigate('/ai-card')}
                            />
                        } />
                    </Route>

                    {/* Legacy/Misc Public Views */}
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog-post" element={<BlogPostPage />} />
                    <Route path="/demo-listing" element={<DemoListingPage />} />
                    <Route path="/demo/listings/:id" element={<DemoListingPage />} />
                    <Route path="/new-landing" element={<NewLandingPage onNavigateToSignUp={handleNavigateToSignUp} onNavigateToSignIn={handleNavigateToSignIn} onEnterDemoMode={handleEnterDemoMode} />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
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
                        {renderRoutes()}
                        {isConsultationModalOpen && (
                            <ConsultationModal onClose={() => setIsConsultationModalOpen(false)} onSuccess={() => { console.log('Consultation scheduled successfully!'); }} />
                        )}
                        {isAdminLoginOpen && view !== 'admin-setup' && (
                            <Suspense fallback={<LoadingSpinner />}>
                                <AdminLogin onLogin={handleAdminLogin} onBack={handleAdminLoginClose} isLoading={isAdminLoginLoading} error={adminLoginError || undefined} />
                            </Suspense>
                        )}
                        {view !== 'landing' && view !== 'new-landing' && (
                            <ChatBotFAB
                                context={{
                                    userType: user ? (isDemoMode ? 'prospect' : 'client') : 'visitor',
                                    currentPage: view,
                                    previousInteractions: user ? 1 : 0,
                                    userInfo: user ? { name: user.displayName || 'User', email: user.email || '', company: 'Real Estate' } : undefined
                                }}
                                onLeadGenerated={(leadInfo) => { console.log('Lead generated from chat:', leadInfo); }}
                                onSupportTicket={(ticketInfo) => { console.log('Support ticket created from chat:', ticketInfo); }}
                                position="bottom-right"
                                showWelcomeMessage={false}
                            />
                        )}
                    </ErrorBoundary>
                </AISidekickProvider>
            </AgentBrandingProvider>
        </ImpersonationProvider>
    );
};


export default App;
