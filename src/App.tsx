import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AdminModalProvider } from './context/AdminModalContext';
import { supabase } from './services/supabase';
import { Property, View, AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings, Lead, Appointment, AgentTask, Interaction, Conversation, FollowUpSequence } from './types';
import { DEMO_FAT_PROPERTIES, DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS, DEMO_SEQUENCES } from './demoConstants';
import { SAMPLE_AGENT, SAMPLE_TASKS, SAMPLE_CONVERSATIONS, SAMPLE_INTERACTIONS } from './constants';
import LandingPage from './components/LandingPage';
import NewLandingPage from './components/NewLandingPage';
import SignUpPage from './components/SignUpPage';
import SignInPage from './components/SignInPage';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import PropertyPage from './components/PropertyPage';
import ListingsPage from './components/ListingsPage';
import AddListingPage from './components/AddListingPage';
import LeadsAndAppointmentsPage from './components/LeadsAndAppointmentsPage';
import InteractionHubPage from './components/InteractionHubPage';
import AIConversationsPage from './components/AIConversationsPage';
import AICardPage from './components/AICardPage';

// import KnowledgeBasePage from './components/KnowledgeBasePage';
import MarketingPage from './components/MarketingPage';
import SettingsPage from './components/SettingsPage';
import AnalyticsDashboard from './components/AnalyticsDashboard';

import ConsultationModal from './components/ConsultationModal';
import { AISidekickProvider } from './context/AISidekickContext';
// Lazy load admin components for better performance
const AdminSidebar = lazy(() => import('./components/AdminSidebar'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const AdminSetup = lazy(() => import('./components/AdminSetup'));
import BlogPage from './components/BlogPage';
import BlogPostPage from './components/BlogPostPage';
import DemoListingPage from './components/DemoListingPage';


import AILeadQualificationTestPage from './components/AILeadQualificationTestPage';
import HelpSalesChatBotTestPage from './components/HelpSalesChatBotTestPage';
import AITestNavigation from './components/AITestNavigation';
import ChatBotFAB from './components/ChatBotFAB';
import PropertyComparison from './components/PropertyComparison';
import NotificationSystem from './components/NotificationSystem';
import LoadingSpinner from './components/LoadingSpinner';
import { adminAuthService } from './services/adminAuthService';
import AIAgentHub from './components/AIAgentHub';
import EnhancedAISidekicksHub from './components/EnhancedAISidekicksHub';

// import { getProperties, addProperty } from './services/firestoreService';
// Temporary stubs while migrating off Firebase
const getProperties = async (_uid: string) => [] as any[];
const addProperty = async (_data: any, _uid: string) => `prop_${Date.now()}`;
import { LogoWithName } from './components/LogoWithName';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EnvValidation } from './utils/envValidation';
// SessionService removed
import { listAppointments } from './services/appointmentsService';
import { PerformanceService } from './services/performanceService';


// A helper function to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    // Use a plain string for view to avoid mismatches between multiple View type declarations
    // (several `types.ts` files exist in the repo). We'll keep runtime checks as strings.
    const [view, setView] = useState<string>('landing');
    

    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [tasks, setTasks] = useState<AgentTask[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [sequences, setSequences] = useState<FollowUpSequence[]>([]);

    // Removed unused selectedLead state
    const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
    const [scrollToSection, setScrollToSection] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // Notification system is now handled by NotificationSystem component
    const [isPropertyComparisonOpen, setIsPropertyComparisonOpen] = useState(false);
    // Removed unused analyticsTimeRange state
    const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
    const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
    const [isAdminLoginLoading, setIsAdminLoginLoading] = useState(false);


    // Mock data for settings
    const [userProfile, setUserProfile] = useState<AgentProfile>(SAMPLE_AGENT);
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


    // Handle URL hash routing
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1); // Remove the #
            if (hash === 'admin-dashboard') {
                setView('admin-dashboard');
                // Reset admin login modal state when going to admin-dashboard
                setIsAdminLoginOpen(false);
                setAdminLoginError(null);
            } else if (hash === 'admin-setup') {
                setView('admin-setup');
                // Reset admin login modal state when going to admin-setup
                setIsAdminLoginOpen(false);
                setAdminLoginError(null);
            } else if (hash === 'ai-card') {
                // AI Card route
                setView('dashboard');
            } else if (hash === 'landing') {
                setView('landing');
            } else if (hash === 'signin') {
                setView('signin');
            } else if (hash === 'signup') {
                setView('signup');
            } else if (hash === 'test') {
                setView('landing');
            } else if (hash === 'openai-test') {
                // removed
                setView('dashboard');
            } else if (hash === 'ai-sidekicks') {
                setView('ai-sidekicks');
            } else if (hash === 'demo-listing') {
                setView('demo-listing');
            }
        };

        // Handle initial hash with a small delay to avoid race conditions
        setTimeout(handleHashChange, 100);

        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
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
            const currentUser = data.user
                ? { uid: data.user.id, email: data.user.email, displayName: data.user.user_metadata?.name }
                : null;
            setIsLoading(true);
            setIsSettingUp(false); // Reset on every auth change
            setIsDemoMode(false); // Reset demo mode on any auth change

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
                    // Load leads from backend
                    loadLeadsFromBackend();
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
                // Don't override admin-setup view when user signs out
                if (view !== 'admin-setup') {
                    setView('landing');
                }
            }
            setIsLoading(false);
        };

        initAuth();

        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user
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


    const handleNavigateToSignUp = () => setView('signup');
    const handleNavigateToSignIn = () => setView('signin');
    const handleNavigateToLanding = () => setView('landing');
    
    const loadLeadsFromBackend = async () => {
        try {
            const response = await fetch('/api/admin/leads');
            if (response.ok) {
                const data = await response.json();
                setLeads(data.leads || []);
                console.log('✅ Loaded leads from backend:', data.leads?.length || 0);
            } else {
                console.warn('Failed to load leads from backend, using demo data');
                setLeads(DEMO_FAT_LEADS);
            }
        } catch (error) {
            console.error('Error loading leads from backend:', error);
            setLeads(DEMO_FAT_LEADS);
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
        } catch (error: any) {
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

    // Notification handler for future use - will be used when implementing real notifications
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Notification handling is now managed by NotificationSystem component

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
                const { id, ...dataForFirestore } = propertyForState;
                const newDocId = await addProperty(dataForFirestore, user.uid);
                
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
    
    const handleAddNewLead = (leadData: { name: string; email: string; phone: string; message: string; source: string; }) => {
        const newLead: Lead = {
            id: `lead-${Date.now()}`,
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            lastMessage: leadData.message,
            status: 'New',
            date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
        };
        setLeads(prev => [newLead, ...prev]);
        setView('leads'); 
    };

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
                    leadId: r.lead_id || '',
                    propertyId: r.property_id || '',
                    notes: r.notes || '',
                    status: r.status
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
		// Logged-in, Demo, or Local Admin views
		if (user || isDemoMode || isLocalAdmin) {
			// If explicitly viewing landing, render standalone marketing page
			if (view === 'landing') {
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
			const mainContent = () => {
				switch(view) {
					case 'landing':
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
					case 'openai-test':
						return <LandingPage 
							onNavigateToSignUp={handleNavigateToSignUp} 
							onNavigateToSignIn={handleNavigateToSignIn} 
							onEnterDemoMode={handleEnterDemoMode}
							scrollToSection={scrollToSection}
							onScrollComplete={() => setScrollToSection(null)}
							onOpenConsultationModal={() => setIsConsultationModalOpen(true)}
							onNavigateToAdmin={handleNavigateToAdmin}
						/>;
					case 'admin-dashboard':
						return <AdminModalProvider><AdminLayout currentView={view} /></AdminModalProvider>;
					case 'admin-users':
					case 'admin-knowledge-base': 
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
					case 'property': 
						return selectedProperty ? <PropertyPage property={selectedProperty} setProperty={handleSetProperty} onBack={() => setView('listings')} /> : <ListingsPage properties={properties} onSelectProperty={handleSelectProperty} onAddNew={() => setView('add-listing')} onDeleteProperty={handleDeleteProperty} onBackToDashboard={() => setView('dashboard')} />;
					case 'listings': 
						return <ListingsPage properties={properties} onSelectProperty={handleSelectProperty} onAddNew={() => setView('add-listing')} onDeleteProperty={handleDeleteProperty} onBackToDashboard={() => setView('dashboard')}/>;
					case 'add-listing': 
						return <AddListingPage onCancel={() => setView('dashboard')} onSave={handleSaveNewProperty} />;
					case 'leads': 
						return <LeadsAndAppointmentsPage leads={leads} appointments={appointments} onAddNewLead={handleAddNewLead} onBackToDashboard={() => setView('dashboard')} onNewAppointment={(appt) => setAppointments(prev => [appt, ...prev])} />;
					case 'inbox': 
						return <InteractionHubPage properties={properties} interactions={interactions} setInteractions={setInteractions} onAddNewLead={handleAddNewLead} onBackToDashboard={() => setView('dashboard')} />;
					case 'ai-conversations':
						return <AIConversationsPage />;
					case 'ai-card':
						return <AICardPage />;
					case 'knowledge-base': 
						return <EnhancedAISidekicksHub />;
					case 'marketing': 
						return <MarketingPage properties={properties} sequences={sequences} setSequences={setSequences} onBackToDashboard={() => setView('dashboard')} />;
					case 'analytics': 
						return <AnalyticsDashboard />;
					case 'ai-sidekicks':
						return <EnhancedAISidekicksHub />;
					case 'demo-listing':
						return <DemoListingPage />;
					case 'settings': 
						return <SettingsPage 
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
							<AdminSidebar activeView={view as any} setView={setView as any} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
					<Sidebar activeView={view as any} setView={setView as any} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
								<button onClick={() => setIsPropertyComparisonOpen(true)} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Compare properties">
									<span className="material-symbols-outlined text-lg">compare</span>
								</button>
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