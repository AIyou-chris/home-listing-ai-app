import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { AdminModalProvider } from './context/AdminModalContext';
import { supabase } from './services/supabase';
import { Property, View, AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings, Lead, Appointment, AgentTask, Interaction, Conversation, FollowUpSequence, LeadFunnelType } from './types';
import { DEMO_FAT_PROPERTIES, DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS, DEMO_SEQUENCES } from './demoConstants';
import { SAMPLE_AGENT, SAMPLE_TASKS, SAMPLE_CONVERSATIONS, SAMPLE_INTERACTIONS } from './constants';
import LandingPage from './components/LandingPage';
import NewLandingPage from './components/NewLandingPage';
import SignUpPage from './components/SignUpPage';
import SignInPage from './components/SignInPage';
import CheckoutPage from './components/CheckoutPage';
import { getRegistrationContext } from './services/agentOnboardingService';
import Dashboard from './components/Dashboard';
import AgentDashboardBlueprint from './components/AgentDashboardBlueprint';
import Sidebar from './components/Sidebar';
import PropertyPage from './components/PropertyPage';
import ListingsPage from './components/ListingsPage';
import AddListingPage from './components/AddListingPage';
import LeadsAndAppointmentsPage from './components/LeadsAndAppointmentsPage';
import InteractionHubPage from './components/InteractionHubPage';
import AIConversationsPage from './components/AIConversationsPage';
import AICardPage from './components/AICardPage';

// import KnowledgeBasePage from './components/KnowledgeBasePage';
import SettingsPage from './components/SettingsPage';
import AnalyticsDashboard from './components/AnalyticsDashboard';

import ConsultationModal from './components/ConsultationModal';
import { AISidekickProvider } from './context/AISidekickContext';
import { getProfileForDashboard, subscribeToProfileChanges } from './services/agentProfileService';
// Lazy load admin components for better performance
const AdminSidebar = lazy(() => import('./components/AdminSidebar'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const AdminSetup = lazy(() => import('./components/AdminSetup'));
import BlogPage from './components/BlogPage';
import BlogPostPage from './components/BlogPostPage';
import DemoListingPage from './components/DemoListingPage';

const FUNNEL_TRIGGER_MAP: Record<LeadFunnelType, SequenceTriggerType> = {
    homebuyer: 'Buyer Lead',
    seller: 'Seller Lead',
    postShowing: 'Property Viewed'
};

const parseRouteSegments = (raw: string): string[] => {
    if (!raw) return [];
    const cleaned = raw.replace(/^#/, '').replace(/^\//, '');
    if (!cleaned) return [];
    const [path] = cleaned.split('?');
    return path
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);
};

const getRouteInfo = () => {
    let segments = parseRouteSegments(window.location.hash);
    if (!segments.length) {
        segments = parseRouteSegments(window.location.pathname);
    }
    return {
        segments,
        route: segments[0] || ''
    };
};


import NotificationSystem from './components/NotificationSystem';
import LoadingSpinner from './components/LoadingSpinner';
import { adminAuthService } from './services/adminAuthService';
import EnhancedAISidekicksHub from './components/EnhancedAISidekicksHub';
import AIInteractiveTraining from './components/AIInteractiveTraining';

// import { getProperties, addProperty } from './services/firestoreService';
// Temporary stubs while migrating off Firebase
const getProperties = async (_uid: string): Promise<Property[]> => [];
const addProperty = async (_data: PersistedProperty, _uid: string): Promise<string> => `prop_${Date.now()}`;
import { LogoWithName } from './components/LogoWithName';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EnvValidation } from './utils/envValidation';
// SessionService removed
import { listAppointments } from './services/appointmentsService';
import { PerformanceService } from './services/performanceService';
import SequenceExecutionService, { SequenceTriggerType } from './services/sequenceExecutionService';
import { leadsService, LeadPayload } from './services/leadsService';


// A helper function to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type AppUser = {
    uid: string;
    email: string | null;
    displayName?: string | null;
};

type PersistedProperty = Omit<Property, 'id'>;

const ADMIN_VIEWS = [
    'admin-dashboard',
    'admin-users',
    'admin-leads',
    'admin-contacts',
    'admin-knowledge-base',
    'admin-ai-training',
    'admin-ai-personalities',
    'admin-ai-content',
    'admin-marketing',
    'admin-analytics',
    'admin-security',
    'admin-billing',
    'admin-settings',
    'admin-setup',
    'admin-blog-writer',
    'admin-ai-card'
] as const;

type AdminView = (typeof ADMIN_VIEWS)[number];

const isAdminView = (value: string): value is AdminView => {
    return ADMIN_VIEWS.includes(value as AdminView);
};

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

const App: React.FC = () => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    // Use a plain string for view to avoid mismatches between multiple View type declarations
    // (several `types.ts` files exist in the repo). We'll keep runtime checks as strings.
    const [view, setView] = useState<View>('landing');
    const handleViewChange = useCallback((nextView: View) => {
        setView(nextView);
    }, []);
    

    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [tasks, setTasks] = useState<AgentTask[]>([]);
    const [, setConversations] = useState<Conversation[]>([]);
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


    // Mock data for settings
    const [userProfile, setUserProfile] = useState<AgentProfile>(SAMPLE_AGENT);
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
    const [billingSettings, setBillingSettings] = useState<BillingSettings>({ planName: 'Solo Agent', history: [{id: 'inv-123', date: '07/15/2024', amount: 59.00, status: 'Paid'}] });
    // Removed unused state variables
    const [activeAgentSlug, setActiveAgentSlug] = useState<string | null>(null);


    // Handle URL routing via hash or pathname
    useEffect(() => {
        const handleRouteChange = () => {
            const { route, segments } = getRouteInfo();

            const resetAdminLogin = () => {
                setIsAdminLoginOpen(false);
                setAdminLoginError(null);
            };

            switch (route) {
                case '':
                case 'landing':
                    setActiveAgentSlug(null);
                    setIsDemoMode(false);
                    setView('landing');
                    break;
                case 'signup':
                    setActiveAgentSlug(null);
                    setView('signup');
                    break;
                case 'signin':
                    setActiveAgentSlug(null);
                    setView('signin');
                    break;
                case 'checkout':
                    setActiveAgentSlug(segments[1] || null);
                    setView('checkout');
                    break;
                case 'dashboard':
                    setActiveAgentSlug(segments[1] || null);
                    setView('dashboard');
                    break;
                case 'dashboard-blueprint':
                    setActiveAgentSlug(null);
                    setView('dashboard-blueprint');
                    break;
                case 'admin-dashboard':
                    resetAdminLogin();
                    setView('admin-dashboard');
                    break;
                case 'admin-setup':
                    resetAdminLogin();
                    setView('admin-setup');
                    break;
                case 'ai-card':
                    setView('dashboard');
                    break;
                case 'test':
                    setView('landing');
                    break;
                case 'openai-test':
                    setView('dashboard');
                    break;
                case 'ai-sidekicks':
                    setView('ai-sidekicks');
                    break;
                case 'demo-listing':
                    setView('demo-listing');
                    break;
                case 'blog':
                    setView('blog');
                    break;
                case 'blog-post':
                    setView('blog-post');
                    break;
                default:
                    if (route && isAdminView(route)) {
                        resetAdminLogin();
                        setView(route);
                    } else if (!route) {
                        setView('landing');
                    }
                    break;
            }
        };

        handleRouteChange();
        window.addEventListener('hashchange', handleRouteChange);
        window.addEventListener('popstate', handleRouteChange);
        return () => {
            window.removeEventListener('hashchange', handleRouteChange);
            window.removeEventListener('popstate', handleRouteChange);
        };
    }, []);

    useEffect(() => {
        // Validate environment on app startup
        EnvValidation.logValidationResults();
        
        // Initialize session tracking
        // SessionService removed
        
        // Initialize performance monitoring
        PerformanceService.initialize();
        
        const initAuth = async () => {
            const { data } = await supabase.auth.getUser();
            const currentUser: AppUser | null = data.user
                ? { uid: data.user.id, email: data.user.email, displayName: data.user.user_metadata?.name }
                : null;
            setIsLoading(true);
            setIsSettingUp(false); // Reset on every auth change
            setIsDemoMode(false); // Reset demo mode on any auth change

            // Check URL hash/path first - some routes don't require auth
            const { route } = getRouteInfo();
            
            // Allow access to certain routes without auth
            if (route === 'dashboard-blueprint') {
                setView('dashboard-blueprint');
                setIsLoading(false);
                return;
            }

            // Force signup mode - bypass auth check
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('force') === 'signup') {
                setView('signup');
                setIsLoading(false);
                return;
            }

            if (currentUser) {
                console.log(`User signed in: ${currentUser.uid}`);
                
                // Check if user is the specific admin
                const isAdmin = currentUser.email === 'us@homelistingai.com';
                
                if (isAdmin) {
                    console.log("Admin user detected, going to admin dashboard");
                    setUser(currentUser);
                    setUserProfile({
                        ...SAMPLE_AGENT,
                        name: 'System Administrator',
                        email: currentUser.email ?? '',
                        headshotUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}`,
                    });
                    setProperties([]);
                    setLeads([]);
                    setAppointments([]);
                    setInteractions([]);
                    setTasks([]);
                    setConversations([]);
                    setSequences([]);
                    setView('admin-dashboard');
                    setIsLoading(false);
                    return;
                }
                
                let propertiesToLoad: Property[] = [];
                let attempts = 0;
                const maxAttempts = 5;

                // Retry mechanism for new users, in case the cloud function is still running
                while (propertiesToLoad.length === 0 && attempts < maxAttempts) {
                    attempts++;
                    console.log(`Fetching properties, attempt #${attempts}`);
                    propertiesToLoad = await getProperties(currentUser.uid);

                    if (propertiesToLoad.length === 0 && attempts < maxAttempts) {
                        if (attempts === 1) {
                             // This is likely a new user.
                             console.log("New user detected, waiting for account setup from backend...");
                             setIsSettingUp(true); // Show a setup message
                        }
                        await sleep(2000); // Wait and retry
                    }
                }

                setIsSettingUp(false); // Stop showing setup message

                if (propertiesToLoad.length > 0) {
                    console.log("Properties loaded successfully.");
                    const profileToLoad = propertiesToLoad[0].agent;

                    setUser(currentUser);
                    setUserProfile(profileToLoad);
                    setProperties(propertiesToLoad);
                    setAppointments(DEMO_FAT_APPOINTMENTS); // Using demo data for now
                    setInteractions(SAMPLE_INTERACTIONS); // Using demo data for now
                    setTasks(SAMPLE_TASKS);
                    setConversations(SAMPLE_CONVERSATIONS);
                    setSequences(DEMO_SEQUENCES);
                    setView('dashboard');
                } else {
                    console.error(`Failed to load properties for user ${currentUser.uid} after ${maxAttempts} attempts.`);
                    alert("We couldn't retrieve your account's data. Please try signing out and in again, or contact support if the problem persists.");
                    // Keep user logged in but show the dashboard in a degraded state.
                    setUser(currentUser);
                    setProperties([]);
                    setUserProfile({
                        ...SAMPLE_AGENT,
                        name: currentUser.displayName ?? 'New Agent',
                        email: currentUser.email ?? '',
                        headshotUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}`,
                    });
                    setLeads([]);
                    setAppointments([]);
                    setInteractions([]);
                    setTasks([]);
                    setConversations([]);
                    setSequences([]);
                    setView('dashboard');
                }
            } else {
                // User is signed out.
                console.log("User signed out.");
                setUser(null);
                setProperties([]);
                setUserProfile(SAMPLE_AGENT);
                setLeads([]);
                setAppointments([]);
                setInteractions([]);
                setTasks([]);
                setConversations([]);
                setSequences([]);
                const { route: signedOutRoute } = getRouteInfo();
                console.log('🔍 No user logged in, route=', signedOutRoute);

                if (signedOutRoute === 'dashboard-blueprint') {
                    setView('dashboard-blueprint');
                } else if (signedOutRoute === 'admin-setup') {
                    setView('admin-setup');
                } else if (signedOutRoute === 'signup') {
                    setView('signup');
                } else if (signedOutRoute === 'signin') {
                    setView('signin');
                } else {
                    console.log('📍 Defaulting to landing');
                    setIsDemoMode(false);
                    setView('landing');
                }
            }
            setIsLoading(false);
        };

        initAuth();

        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser: AppUser | null = session?.user
                ? { uid: session.user.id, email: session.user.email, displayName: session.user.user_metadata?.name }
                : null;
            // Re-run the same flow with new user
            setIsLoading(true);
            setIsSettingUp(false);
            setIsDemoMode(false);
            if (currentUser) {
                console.log(`User signed in: ${currentUser.uid}`);
                setUser(currentUser);
            } else {
                console.log('User signed out.');
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => { sub.subscription.unsubscribe(); };
    }, []);

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

    const handleNavigateToSignUp = () => {
        setView('signup');
        window.location.hash = 'signup';
    };
    const handleNavigateToSignIn = () => {
        setView('signin');
        window.location.hash = 'signin';
    };
    const handleNavigateToLanding = () => {
        setIsDemoMode(false);
        setView('landing');
        window.location.hash = 'landing';
    };
    
    const loadLeadsFromBackend = async () => {
        try {
            const data = await leadsService.list();
            setLeads(data.leads || []);
            console.log('✅ Loaded leads from backend:', data.leads?.length || 0);
        } catch (error) {
            console.error('Error loading leads from backend:', error);
            setLeads(DEMO_FAT_LEADS);
        }
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
        // Load leads from backend in demo mode too
        loadLeadsFromBackend();
        setAppointments(DEMO_FAT_APPOINTMENTS);
        setInteractions(SAMPLE_INTERACTIONS);
        setTasks(SAMPLE_TASKS);
        setConversations(SAMPLE_CONVERSATIONS);
        setSequences(DEMO_SEQUENCES);
        setUserProfile(SAMPLE_AGENT);
        setView('dashboard');
    };

    const handleNavigateToAdmin = () => {
        // Show admin login modal instead of direct access
        setIsAdminLoginOpen(true);
        setAdminLoginError(null);
    };

    const handleAdminLogin = async (email: string, password: string) => {
        setIsAdminLoginLoading(true);
        setAdminLoginError(null);
        
        try {
            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();

            // Try local demo credentials first for immediate access
            const demo = await adminAuthService.login(trimmedEmail, trimmedPassword);
            if (demo.success) {
                setIsAdminLoginOpen(false);
                setView('admin-dashboard');
                window.location.hash = 'admin-dashboard';
                return;
            }

            // If demo credentials don't match, try Supabase Auth
            const { error } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password: trimmedPassword
            });
            
            if (error) {
                setAdminLoginError('Invalid login credentials');
                return;
            }
            
            // Ensure admin metadata
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.role !== 'admin') {
                await supabase.auth.updateUser({
                    data: { role: 'admin', name: 'Admin User', plan: 'Admin' }
                });
            }
            
            setIsAdminLoginOpen(false);
            setView('admin-dashboard');
            window.location.hash = 'admin-dashboard';
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
    const handleNavigateToSection = (sectionId: string) => {
        if (sectionId === '#contact') {
            setIsConsultationModalOpen(true);
            return;
        }
        setView('landing');
        setScrollToSection(sectionId);
    };

    // Notification handling is now managed by NotificationSystem component

    // Task management handlers
    const handleTaskUpdate = (taskId: string, updates: Partial<AgentTask>) => {
        setTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
        ));
    };

    const handleTaskAdd = (newTask: AgentTask) => {
        setTasks(prev => [newTask, ...prev]);
    };

    const handleTaskDelete = (taskId: string) => {
        setTasks(prev => prev.filter(task => task.id !== taskId));
    };

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
                const newDocId = await addProperty(dataForPersistence, user.uid);
                
                setProperties(prev => prev.map(p => p.id === tempId ? { ...p, id: newDocId } : p));
            } catch (error) {
                console.error("Failed to save property:", error);
                alert("Error: Could not save the property to the database. Please try again.");
                setProperties(prev => prev.filter(p => p.id !== tempId));
                setView('add-listing');
            }
        }
    };

    const handleDeleteProperty = (id: string) => {
        if(window.confirm('Are you sure you want to delete this listing?')) {
            setProperties(prev => prev.filter(p => p.id !== id));
            if(selectedPropertyId === id) {
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
	// Detect local admin mode via persisted flag
	const isLocalAdmin = Boolean(localStorage.getItem('adminUser'));

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

	const renderViewContent = () => {
		const registrationContext = getRegistrationContext() as { slug?: string } | null;
		const slugForCheckout = activeAgentSlug || registrationContext?.slug || null;
		const renderCheckout = () => {
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

        const isMarketingLanding = view === 'landing' && !user && !isDemoMode && !isLocalAdmin;
        const resolvedView = (user || isDemoMode || isLocalAdmin) && view === 'landing' ? 'dashboard' : view;

        if (!user && !isDemoMode && !isLocalAdmin && view === 'admin-dashboard') {
            return (
                <LandingPage
                    onNavigateToSignUp={handleNavigateToSignUp}
                    onNavigateToSignIn={handleNavigateToSignIn}
                    onEnterDemoMode={handleEnterDemoMode}
                    scrollToSection={scrollToSection}
                    onScrollComplete={() => setScrollToSection(null)}
                    onOpenConsultationModal={() => setIsConsultationModalOpen(true)}
                    onNavigateToAdmin={handleNavigateToAdmin}
                />
            );
        }

		if (isMarketingLanding) {
			return (
				<LandingPage
					onNavigateToSignUp={handleNavigateToSignUp}
					onNavigateToSignIn={handleNavigateToSignIn}
					onEnterDemoMode={handleEnterDemoMode}
					scrollToSection={scrollToSection}
					onScrollComplete={() => setScrollToSection(null)}
					onOpenConsultationModal={() => setIsConsultationModalOpen(true)}
					onNavigateToAdmin={handleNavigateToAdmin}
				/>
			);
		}

		// Logged-in, Demo, or Local Admin views
		if ((user || isDemoMode || isLocalAdmin) && view === 'dashboard-blueprint') {
			return <AgentDashboardBlueprint />;
		}

		if (user || isDemoMode || isLocalAdmin) {

			const mainContent = () => {
				switch(resolvedView) {
					case 'openai-test':
						return (
							<LandingPage
								onNavigateToSignUp={handleNavigateToSignUp}
								onNavigateToSignIn={handleNavigateToSignIn}
								onEnterDemoMode={handleEnterDemoMode}
								scrollToSection={scrollToSection}
								onScrollComplete={() => setScrollToSection(null)}
								onOpenConsultationModal={() => setIsConsultationModalOpen(true)}
								onNavigateToAdmin={handleNavigateToAdmin}
							/>
						);
					case 'admin-dashboard':
						return <AdminModalProvider><AdminLayout currentView={resolvedView} /></AdminModalProvider>;
					case 'admin-users':
					case 'admin-knowledge-base': 
					case 'admin-ai-training':
					case 'admin-ai-personalities':
					case 'admin-marketing': 
					case 'admin-analytics': 
					case 'admin-security': 
					case 'admin-billing': 
					case 'admin-settings': 
						return <AdminModalProvider><AdminLayout currentView={view} /></AdminModalProvider>;
					case 'admin-leads':
					case 'admin-contacts':
						return <AdminModalProvider><AdminLayout currentView={view} /></AdminModalProvider>;
					case 'dashboard':
						return <Dashboard 
							agentProfile={userProfile} 
							properties={properties} 
							leads={leads} 
							appointments={appointments} 
							tasks={tasks} 
							onSelectProperty={handleSelectProperty} 
							onTaskUpdate={handleTaskUpdate}
							onTaskAdd={handleTaskAdd}
							onTaskDelete={handleTaskDelete}
						/>;
					case 'dashboard-blueprint':
						return <AgentDashboardBlueprint />;
					case 'checkout':
						return renderCheckout();
					case 'property': 
						return selectedProperty ? <PropertyPage property={selectedProperty} setProperty={handleSetProperty} onBack={() => setView('listings')} /> : <ListingsPage properties={properties} onSelectProperty={handleSelectProperty} onAddNew={() => setView('add-listing')} onDeleteProperty={handleDeleteProperty} onBackToDashboard={() => setView('dashboard')} />;
					case 'listings': 
						return <ListingsPage properties={properties} onSelectProperty={handleSelectProperty} onAddNew={() => setView('add-listing')} onDeleteProperty={handleDeleteProperty} onBackToDashboard={() => setView('dashboard')}/>;
					case 'add-listing': 
						return <AddListingPage onCancel={() => setView('dashboard')} onSave={handleSaveNewProperty} />;
					case 'leads': 
						return (
							<LeadsAndAppointmentsPage
								leads={leads}
								appointments={appointments}
								onAddNewLead={handleAddNewLead}
								onBackToDashboard={() => setView('dashboard')}
								resolvePropertyForLead={resolvePropertyForLead}
								onNewAppointment={async (appt) => {
									setAppointments((prev) => [appt, ...prev]);

									const lead = appt.leadId ? leads.find((l) => l.id === appt.leadId) : undefined;
									if (lead) {
										await triggerLeadSequences(
											lead,
											'Appointment Scheduled',
											resolvePropertyForLead(lead)
										);
									}
								}}
								onAssignFunnel={handleLeadFunnelAssigned}
							/>
						);
					case 'inbox': 
						return <InteractionHubPage properties={properties} interactions={interactions} setInteractions={setInteractions} onAddNewLead={handleAddNewLead} onBackToDashboard={() => setView('dashboard')} />;
					case 'ai-conversations':
						return <AIConversationsPage />;
					case 'ai-card':
						return <AICardPage />;
					case 'knowledge-base': 
						return <EnhancedAISidekicksHub />;
					case 'ai-training':
						return <AIInteractiveTraining />;
					case 'analytics': 
						return <AnalyticsDashboard />;
					case 'ai-sidekicks':
						return <EnhancedAISidekicksHub />;
					case 'demo-listing':
						return <DemoListingPage />;
					case 'settings': 
						return <SettingsPage 
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
							onBackToDashboard={() => setView('dashboard')}
						/>;
					default:
						return <Dashboard 
							agentProfile={userProfile} 
							properties={properties} 
							leads={leads} 
							appointments={appointments} 
							tasks={tasks} 
							onSelectProperty={handleSelectProperty} 
							onTaskUpdate={handleTaskUpdate}
							onTaskAdd={handleTaskAdd}
							onTaskDelete={handleTaskDelete}
						/>;
				}
			};

			// Admin views get the admin sidebar
			if (view.startsWith('admin-')) {
				return (
					<div className="flex h-screen bg-slate-50">
						<Suspense fallback={<LoadingSpinner />}>
							<AdminSidebar activeView={view} setView={handleViewChange} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
						</Suspense>
						<div className="flex-1 flex flex-col overflow-hidden">
							<header className="md:hidden flex items-center justify-between p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm">
								<button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Open menu">
									<span className="material-symbols-outlined text-xl">menu</span>
								</button>
								<div className="flex-1 flex justify-center">
									<LogoWithName />
								</div>
								<div className="w-10"></div> {/* Spacer for balance */}
							</header>
							<main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
								<Suspense fallback={<LoadingSpinner />}>
									{mainContent()}
								</Suspense>
							</main>
						</div>
					</div>
				);
			}

			return (
				<div className="flex h-screen bg-slate-50">
					<Sidebar activeView={view} setView={handleViewChange} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
					<div className="flex-1 flex flex-col overflow-hidden">
						<header className="md:hidden flex items-center justify-between p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm">
							<button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Open menu">
								<span className="material-symbols-outlined text-xl">menu</span>
							</button>
							<div className="flex-1 flex justify-center">
								<LogoWithName />
							</div>
                            <div className="flex items-center space-x-1">
                                <NotificationSystem userId={user?.uid || ''} />
                            </div>
						</header>
						<main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
							{mainContent()}
						</main>
					</div>
				</div>
			);
		}

		// Unauthenticated views
		switch(view) {
			case 'signup':
				return <SignUpPage onNavigateToSignIn={handleNavigateToSignIn} onNavigateToLanding={handleNavigateToLanding} onNavigateToSection={handleNavigateToSection} onEnterDemoMode={handleEnterDemoMode} />;
			case 'signin':
				return <SignInPage onNavigateToSignUp={handleNavigateToSignUp} onNavigateToLanding={handleNavigateToLanding} onNavigateToSection={handleNavigateToSection} onEnterDemoMode={handleEnterDemoMode} />;
			case 'checkout':
				return renderCheckout();
			case 'dashboard-blueprint':
				return <AgentDashboardBlueprint />;
			case 'landing':
				return <LandingPage onNavigateToSignUp={handleNavigateToSignUp} onNavigateToSignIn={handleNavigateToSignIn} onEnterDemoMode={handleEnterDemoMode} scrollToSection={scrollToSection} onScrollComplete={() => setScrollToSection(null)} onOpenConsultationModal={() => setIsConsultationModalOpen(true)} onNavigateToAdmin={handleNavigateToAdmin} />;
			case 'new-landing':
				return <NewLandingPage />;
			case 'blog':
				return <BlogPage />;
			case 'blog-post':
				return <BlogPostPage />;
			case 'demo-listing':
				return <DemoListingPage />;
			case 'vapi-test':
				return <LandingPage onNavigateToSignUp={handleNavigateToSignUp} onNavigateToSignIn={handleNavigateToSignIn} onEnterDemoMode={handleEnterDemoMode} scrollToSection={scrollToSection} onScrollComplete={() => setScrollToSection(null)} onOpenConsultationModal={() => setIsConsultationModalOpen(true)} onNavigateToAdmin={handleNavigateToAdmin} />;
			case 'admin-setup':
				if (isAdminLoginOpen) {
					setIsAdminLoginOpen(false);
					setAdminLoginError(null);
				}
				return (
					<Suspense fallback={<LoadingSpinner />}>
						<AdminSetup />
					</Suspense>
				);
			default:
				return <LandingPage onNavigateToSignUp={handleNavigateToSignUp} onNavigateToSignIn={handleNavigateToSignIn} onEnterDemoMode={handleEnterDemoMode} scrollToSection={scrollToSection} onScrollComplete={() => setScrollToSection(null)} onOpenConsultationModal={() => setIsConsultationModalOpen(true)} onNavigateToAdmin={handleNavigateToAdmin} />;
		}
	};

	// DEBUG: Log current state before render
	console.log('🎨 RENDERING with view=', view, 'hash=', window.location.hash);

	// OVERRIDE: Check hash directly at render time
	const currentHash = window.location.hash.substring(1);
	const [hashPath] = currentHash.split('?');
	const hashRoute = hashPath.split('/').filter(Boolean)[0] || '';
	
	if (hashRoute === 'dashboard-blueprint') {
		console.log('🚀 FORCING dashboard-blueprint render from hash');
		return (
			<ErrorBoundary>
				<AISidekickProvider>
					<AgentDashboardBlueprint />
				</AISidekickProvider>
			</ErrorBoundary>
		);
	}

	return (
		<ErrorBoundary>
			<AISidekickProvider>
				{renderViewContent()}
			</AISidekickProvider>
			{isConsultationModalOpen && (
				<ConsultationModal onClose={() => setIsConsultationModalOpen(false)} onSuccess={() => { console.log('Consultation scheduled successfully!'); }} />
			)}
			{isAdminLoginOpen && view !== 'admin-setup' && (
				<Suspense fallback={<LoadingSpinner />}>
					<AdminLogin onLogin={handleAdminLogin} onBack={handleAdminLoginClose} isLoading={isAdminLoginLoading} error={adminLoginError || undefined} />
				</Suspense>
			)}
			{/* Temporarily disabled while building */}
			{/* {view !== 'ai-card' && (
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
				/>
			)} */}
		</ErrorBoundary>
	);
};

export default App;
