import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from './services/firebase';
import { Property, View, AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings, AIPersonality, Lead, Appointment, AgentTask, Interaction, Conversation, FollowUpSequence, AIAssignment } from './types';
import { DEMO_FAT_PROPERTIES, DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS, DEMO_SEQUENCES } from './demoConstants';
import { SAMPLE_AGENT, SAMPLE_TASKS, SAMPLE_CONVERSATIONS, SAMPLE_INTERACTIONS, AI_PERSONALITIES, DEFAULT_AI_ASSIGNMENTS } from './constants';
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
import AIChatPage from './components/AIChatPage';
import KnowledgeBasePage from './components/KnowledgeBasePage';
import MarketingPage from './components/MarketingPage';
import SettingsPage from './components/SettingsPage';
import SupportFAB from './components/SupportFAB';
import VoiceAssistant from './components/VoiceAssistant';
import ConsultationModal from './components/ConsultationModal';
import AdminDashboard from './components/AdminDashboard';
import AdminSidebar from './components/AdminSidebar';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './components/AdminLogin';
import AdminSetup from './components/AdminSetup';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PropertyComparison from './components/PropertyComparison';
import NotificationSystem from './components/NotificationSystem';
import LoadingSpinner from './components/LoadingSpinner';
import { getProperties, addProperty } from './services/firestoreService';
import { LogoWithName } from './components/LogoWithName';

// A helper function to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [view, setView] = useState<View>('landing');
    

    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [tasks, setTasks] = useState<AgentTask[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
    const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
    const [selectedLead] = useState<Lead | null>(null);
    const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
    const [scrollToSection, setScrollToSection] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // Notification system is now handled by NotificationSystem component
    const [isPropertyComparisonOpen, setIsPropertyComparisonOpen] = useState(false);
    const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
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
    const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({ integrationType: 'google', aiScheduling: true, conflictDetection: true, emailReminders: true, autoConfirm: false });
    const [billingSettings, setBillingSettings] = useState<BillingSettings>({ planName: 'Solo Agent', history: [{id: 'inv-123', date: '07/15/2024', amount: 59.00, status: 'Paid'}] });
    const [personalities, setPersonalities] = useState<AIPersonality[]>(AI_PERSONALITIES);
    const [assignments, setAssignments] = useState<AIAssignment[]>(DEFAULT_AI_ASSIGNMENTS);


    // Handle URL hash routing
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1); // Remove the #
            if (hash === 'admin-setup') {
                setView('admin-setup');
                // Reset admin login modal state when going to admin-setup
                setIsAdminLoginOpen(false);
                setAdminLoginError(null);
            } else if (hash === 'landing') {
                setView('landing');
            } else if (hash === 'signin') {
                setView('signin');
            } else if (hash === 'signup') {
                setView('signup');
            }
        };

        // Handle initial hash with a small delay to avoid race conditions
        setTimeout(handleHashChange, 100);

        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        // Temporary: Clear any existing authentication to show landing page
        auth.signOut();
        
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setIsLoading(true);
            setIsSettingUp(false); // Reset on every auth change
            setIsDemoMode(false); // Reset demo mode on any auth change

            if (currentUser) {
                console.log(`User signed in: ${currentUser.uid}`);
                
                // Check if user is an admin
                const token = await currentUser.getIdTokenResult();
                const isAdmin = token?.claims?.role === 'admin';
                
                if (isAdmin) {
                    console.log("Admin user detected, going to landing page");
                    setUser(currentUser);
                    setUserProfile({
                        ...SAMPLE_AGENT,
                        name: currentUser.displayName ?? 'System Administrator',
                        email: currentUser.email ?? '',
                        headshotUrl: currentUser.photoURL ?? `https://i.pravatar.cc/150?u=${currentUser.uid}`,
                    });
                    setProperties([]);
                    setLeads([]);
                    setAppointments([]);
                    setInteractions([]);
                    setTasks([]);
                    setConversations([]);
                    setSequences([]);
                    setView('landing');
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
                    setLeads(DEMO_FAT_LEADS); // Using demo data for now
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
                        headshotUrl: currentUser.photoURL ?? `https://i.pravatar.cc/150?u=${currentUser.uid}`,
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
        });

        return () => unsubscribe();
    }, []);


    const handleNavigateToSignUp = () => setView('signup');
    const handleNavigateToSignIn = () => setView('signin');
    const handleNavigateToLanding = () => setView('landing');
    
    const handleEnterDemoMode = () => {
        setIsDemoMode(true);
        setProperties(DEMO_FAT_PROPERTIES);
        setLeads(DEMO_FAT_LEADS);
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
            // Use Firebase Auth to sign in
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const { auth } = await import('./services/firebase');
            
            await signInWithEmailAndPassword(auth, email, password);
            
            // Check if user has admin role
            const token = await auth.currentUser?.getIdTokenResult();
            if (token?.claims?.role !== 'admin') {
                // If no admin role, set custom claims via Firebase Function
                const { getFunctions, httpsCallable } = await import('firebase/functions');
                const functions = getFunctions();
                const setAdminRole = httpsCallable(functions, 'setAdminRole');
                
                try {
                    await setAdminRole({ email });
                    // Refresh token to get updated claims
                    await auth.currentUser?.getIdToken(true);
                } catch (error) {
                    console.error('Failed to set admin role:', error);
                }
            }
            
            setIsAdminLoginOpen(false);
            setView('admin-dashboard');
        } catch (error: any) {
            console.error('Admin login error:', error);
            setAdminLoginError(error.message || 'Failed to login. Please check your credentials.');
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

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);

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
        // Logged-in or Demo views
        if (user || isDemoMode) {
             const mainContent = () => {
                switch(view) {
                    case 'admin-dashboard': 
                    case 'admin-users': 
                    case 'admin-leads': 
                    case 'admin-ai-content': 
                    case 'admin-knowledge-base': 
                    case 'admin-marketing': 
                    case 'admin-analytics': 
                    case 'admin-security': 
                    case 'admin-billing': 
                    case 'admin-settings': 
                        return <AdminLayout currentView={view} />;
                                case 'dashboard':
                return <Dashboard 
                    agentProfile={userProfile} 
                    properties={properties} 
                    leads={leads} 
                    appointments={appointments} 
                    tasks={tasks} 
                    onSelectProperty={handleSelectProperty} 
                    onAddNew={() => setView('add-listing')}
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
                        return <LeadsAndAppointmentsPage leads={leads} appointments={appointments} onAddNewLead={handleAddNewLead} onBackToDashboard={() => setView('dashboard')} />;
                    case 'inbox': 
                        return <InteractionHubPage properties={properties} interactions={interactions} setInteractions={setInteractions} onAddNewLead={handleAddNewLead} onBackToDashboard={() => setView('dashboard')} />;
                    case 'ai-content': 
                        return <AIChatPage properties={properties} agentProfile={userProfile} conversations={conversations} setConversations={setConversations} onBackToDashboard={() => setView('dashboard')} />;
                    case 'knowledge-base': 
                        return <KnowledgeBasePage 
                            agentProfile={userProfile}
                        />;
                    case 'marketing': 
                        return <MarketingPage properties={properties} sequences={sequences} setSequences={setSequences} onBackToDashboard={() => setView('dashboard')} />;
                    case 'analytics': 
                        return <AnalyticsDashboard />;
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
                    // Default to dashboard if logged in and view is somehow invalid
                    default:
                        return <Dashboard 
                            agentProfile={userProfile} 
                            properties={properties} 
                            leads={leads} 
                            appointments={appointments} 
                            tasks={tasks} 
                            onSelectProperty={handleSelectProperty} 
                            onAddNew={() => setView('add-listing')}
                            onTaskUpdate={handleTaskUpdate}
                            onTaskAdd={handleTaskAdd}
                            onTaskDelete={handleTaskDelete}
                        />;
                }
            };
            
            // Admin views get the admin sidebar
            if (view.startsWith('admin-')) {
                // Check if user has admin role
                const checkAdminAccess = async () => {
                    try {
                        const token = await user?.getIdTokenResult();
                        if (token?.claims?.role !== 'admin') {
                            setView('dashboard');
                            return;
                        }
                    } catch (error) {
                        console.error('Failed to verify admin access:', error);
                        setView('dashboard');
                        return;
                    }
                };

                // Check admin access on mount
                if (user) {
                    checkAdminAccess();
                }

                return (
                    <div className="flex h-screen bg-slate-50">
                        <AdminSidebar activeView={view} setView={setView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
                                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600" aria-label="Open menu">
                                    <span className="material-symbols-outlined">menu</span>
                                </button>
                                <LogoWithName />
                            </header>
                            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
                                {mainContent()}
                            </main>
                        </div>
                    </div>
                );
            }

            return (
                <div className="flex h-screen bg-slate-50">
                    <Sidebar activeView={view} setView={setView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    <div className="flex-1 flex flex-col overflow-hidden">
                         <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
                            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600" aria-label="Open menu">
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                            <LogoWithName />
                            <div className="flex items-center space-x-2">
                                <NotificationSystem 
                                    userId={user?.uid || ''}
                                />
                                <button 
                                    onClick={() => setIsPropertyComparisonOpen(true)}
                                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                    aria-label="Compare properties"
                                >
                                    <span className="material-symbols-outlined">compare</span>
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
                return <SignUpPage 
                    onNavigateToSignIn={handleNavigateToSignIn} 
                    onNavigateToLanding={handleNavigateToLanding} 
                    onNavigateToSection={handleNavigateToSection} 
                    onEnterDemoMode={handleEnterDemoMode} 
                />;
            case 'signin':
                return <SignInPage 
                    onNavigateToSignUp={handleNavigateToSignUp} 
                    onNavigateToLanding={handleNavigateToLanding} 
                    onNavigateToSection={handleNavigateToSection} 
                    onEnterDemoMode={handleEnterDemoMode} 
                />;
            case 'landing':
                return <LandingPage 
                    onNavigateToSignUp={handleNavigateToSignUp} 
                    onNavigateToSignIn={handleNavigateToSignIn} 
                    onEnterDemoMode={handleEnterDemoMode}
                    scrollToSection={scrollToSection}
                    onScrollComplete={() => setScrollToSection(null)}
                    onOpenConsultationModal={() => setIsConsultationModalOpen(true)}
                    onNavigateToAdmin={handleNavigateToAdmin}
                />;
            case 'new-landing':
                return <NewLandingPage />;
            case 'admin-setup':
                // Admin setup page should be standalone, not showing modals
                // Force close admin login modal when rendering admin setup
                if (isAdminLoginOpen) {
                    setIsAdminLoginOpen(false);
                    setAdminLoginError(null);
                }
                return <AdminSetup />;
            default:
                return <LandingPage 
                    onNavigateToSignUp={handleNavigateToSignUp} 
                    onNavigateToSignIn={handleNavigateToSignIn} 
                    onEnterDemoMode={handleEnterDemoMode}
                    scrollToSection={scrollToSection}
                    onScrollComplete={() => setScrollToSection(null)}
                    onOpenConsultationModal={() => setIsConsultationModalOpen(true)}
                    onNavigateToAdmin={handleNavigateToAdmin}
                />;
        }
    }
    
    return (
        <>
            {renderViewContent()}
            
            {isConsultationModalOpen && <ConsultationModal onClose={() => setIsConsultationModalOpen(false)} onSuccess={() => {
                // Success notification is now handled by NotificationSystem component
                console.log('Consultation scheduled successfully!');
            }} />}
            
            {/* Don't show admin login modal on admin-setup page */}
            {isAdminLoginOpen && view !== 'admin-setup' && (
                <AdminLogin 
                    onLogin={handleAdminLogin}
                    onBack={handleAdminLoginClose}
                    isLoading={isAdminLoginLoading}
                    error={adminLoginError}
                />
            )}
            
            {isPropertyComparisonOpen && (
                <PropertyComparison 
                    properties={properties}
                    onClose={() => setIsPropertyComparisonOpen(false)}
                />
            )}
            
            {/* Don't show SupportFAB on admin-setup page */}
            {view !== 'admin-setup' && <SupportFAB onClick={() => setIsVoiceAssistantOpen(true)} />}
            {isVoiceAssistantOpen && <VoiceAssistant onClose={() => setIsVoiceAssistantOpen(false)} />}
            

        </>
    )
}

export default App;