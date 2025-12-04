import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import LeadsAndAppointmentsPage from './LeadsAndAppointmentsPage';
import ListingsPage from './ListingsPage';
import AddListingPage from './AddListingPage';
import PropertyPage from './PropertyPage';
import InteractionHubPage from './InteractionHubPage';
import AIConversationsPage from './AIConversationsPage';
import AgentAISidekicksPage from './AgentAISidekicksPage';
import SettingsPage from './SettingsPage';
import AnalyticsDashboard from './AnalyticsDashboard';
import AICardPage from './AICardPage';
import MarketingReportsPage from './MarketingReportsPage';

import { DEMO_FAT_PROPERTIES, DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS } from '../demoConstants';
import { listingsService } from '../services/listingsService';
import { leadsService, LeadPayload } from '../services/leadsService';
import { listAppointments } from '../services/appointmentsService';
import { calendarSettingsService } from '../services/calendarSettingsService';
import { useApiErrorNotifier } from '../hooks/useApiErrorNotifier';
import { logLeadCaptured, logAppointmentScheduled } from '../services/aiFunnelService';
import FunnelAnalyticsPanel from './FunnelAnalyticsPanel';
import { useAgentBranding } from '../hooks/useAgentBranding';
import {
  Property,
  View,
  Lead,
  Appointment,
  AgentTask,
  AgentProfile,
  NotificationSettings,
  EmailSettings,
  CalendarSettings,
  BillingSettings,
  FollowUpSequence,
  Interaction
} from '../types';

type MarketingSequencesResponse = {
  sequences?: FollowUpSequence[];
};

const cloneDemoProperty = (property: Property, index: number): Property => {
  const description =
    typeof property.description === 'string'
      ? property.description
      : {
        ...property.description,
        paragraphs: [...property.description.paragraphs]
      };

  return {
    ...property,
    id: property.id || `demo-property-${index}`,
    description,
    heroPhotos: [...property.heroPhotos],
    galleryPhotos: property.galleryPhotos ? [...property.galleryPhotos] : undefined,
    features: [...property.features],
    appFeatures: { ...property.appFeatures },
    agent: { ...property.agent }
  };
};

import { useImpersonation } from '../context/ImpersonationContext';

interface AgentDashboardBlueprintProps {
  isDemoMode?: boolean;
}

const AgentDashboardBlueprint: React.FC<AgentDashboardBlueprintProps> = ({ isDemoMode: initialDemoMode = false }) => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDemoMode] = useState(initialDemoMode);
  const { isImpersonating, stopImpersonating } = useImpersonation();

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [, setIsLeadsLoading] = useState<boolean>(false);

  const notifyApiError = useApiErrorNotifier();
  const { uiProfile } = useAgentBranding();
  const [agentProfile, setAgentProfile] = useState<AgentProfile>(uiProfile);
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
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    integrationType: 'oauth',
    aiEmailProcessing: true,
    autoReply: true,
    leadScoring: true,
    followUpSequences: true
  });
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
  const [billingSettings, setBillingSettings] = useState<BillingSettings>({
    planName: 'Complete AI Solution',
    planStatus: 'active',
    amount: 89,
    currency: 'USD',
    managedBy: 'paypal',
    renewalDate: null,
    cancellationRequestedAt: null,
    history: [
      { id: 'inv-123', date: '2024-07-15', amount: 89, status: 'Paid', description: 'Complete AI Solution - Monthly' }
    ]
  });

  useEffect(() => {
    if (isDemoMode) {
      // Use Sarah Johnson demo profile with local assets
      setAgentProfile({
        name: 'Sarah Johnson',
        slug: 'demo-agent',
        title: 'Luxury Real Estate Specialist',
        company: 'Prestige Properties',
        phone: '(305) 555-1234',
        email: 'sarah.j@prestigeprop.com',
        headshotUrl: `/demo-headshot.png?v=${Date.now()}`,
        logoUrl: `/demo-logo.png?v=${Date.now()}`,
        brandColor: '#0ea5e9',
        bio: 'With over 15 years of experience in the luxury market, Sarah Johnson combines deep market knowledge with a passion for client success.',
        website: 'https://prestigeprop.com',
        socials: [
          { platform: 'Facebook', url: 'https://facebook.com' },
          { platform: 'Instagram', url: 'https://instagram.com' },
          { platform: 'LinkedIn', url: 'https://linkedin.com' }
        ],
        language: 'en'
      } as AgentProfile);
    } else {
      setAgentProfile(uiProfile);
    }
  }, [uiProfile, isDemoMode]);

  useEffect(() => {
    let isMounted = true;

    const loadProperties = async () => {
      setIsLoadingProperties(true);
      try {
        if (isDemoMode) {
          setProperties(DEMO_FAT_PROPERTIES.map((property, index) => cloneDemoProperty(property, index)));
          return;
        }
        const list = await listingsService.listProperties();
        if (!isMounted) return;
        if (list.length > 0) {
          setProperties(list);
        } else {
          setProperties([]);
        }
      } catch (error) {
        notifyApiError({
          title: 'Could not load listings',
          description: 'Showing demo listings for now. Refresh once you are signed in to try again.',
          error
        });
        if (isMounted) {
          setProperties([]);
        }
      } finally {
        if (isMounted) setIsLoadingProperties(false);
      }
    };

    loadProperties();

    return () => {
      isMounted = false;
    };
  }, [isDemoMode, notifyApiError]);

  useEffect(() => {
    let isMounted = true;

    const loadCalendarSettings = async () => {
      if (isDemoMode) return;
      try {
        const payload = await calendarSettingsService.fetch(agentProfile.slug ?? 'blueprint-agent');
        if (isMounted && payload?.settings) {
          setCalendarSettings(payload.settings);
        }
      } catch (error) {
        notifyApiError({
          title: 'Could not load calendar settings',
          description: 'We could not reach the calendar service. Please refresh to try again.',
          error
        });
      }
    };

    void loadCalendarSettings();

    return () => {
      isMounted = false;
    };
  }, [agentProfile.slug, isDemoMode, notifyApiError]);

  const leadsMountedRef = useRef(true);

  const refreshLeads = useCallback(async () => {
    if (isDemoMode) {
      setLeads(DEMO_FAT_LEADS);
      setIsLeadsLoading(false);
      return;
    }
    try {
      setIsLeadsLoading(true);
      const payload = await leadsService.list();
      if (leadsMountedRef.current && Array.isArray(payload?.leads)) {
        setLeads(payload.leads);
      }
    } catch (error) {
      notifyApiError({
        title: 'Could not load leads',
        description: 'Using sample leads for now. Refresh after signing in to try again.',
        error
      });
    } finally {
      if (leadsMountedRef.current) {
        setIsLeadsLoading(false);
      }
    }
  }, [notifyApiError, isDemoMode]);

  useEffect(() => {
    leadsMountedRef.current = true;
    refreshLeads();
    return () => {
      leadsMountedRef.current = false;
    };
  }, [refreshLeads]);

  const refreshAppointments = useCallback(async () => {
    if (isDemoMode) {
      setAppointments(DEMO_FAT_APPOINTMENTS);
      return;
    }
    try {
      const list = await listAppointments();
      if (leadsMountedRef.current) {
        // Map AppointmentRow to Appointment type if needed, or ensure types match
        // The service returns AppointmentRow, but state expects Appointment.
        // I might need to map it. Let's check the types.
        // AppointmentRow has snake_case, Appointment has camelCase.
        const mapped: Appointment[] = list.map(row => ({
          id: row.id,
          type: row.kind, // Map kind to type
          leadId: row.lead_id,
          propertyId: row.property_id,
          propertyAddress: row.property_address || undefined,
          kind: row.kind,
          name: row.name,
          email: row.email || '',
          phone: row.phone || '',
          date: row.date,
          time: row.time_label,
          startIso: row.start_iso,
          endIso: row.end_iso,
          meetLink: row.meet_link || undefined,
          notes: row.notes || '',
          status: row.status,
          remindAgent: row.remind_agent,
          remindClient: row.remind_client,
          agentReminderMinutes: row.agent_reminder_minutes_before,
          clientReminderMinutes: row.client_reminder_minutes_before,
          leadName: row.name // Fallback if lead lookup not done here
        }));
        setAppointments(mapped);
      }
    } catch (error) {
      console.warn('Failed to load appointments', error);
      // notifyApiError({ title: 'Could not load appointments', error });
    }
  }, [isDemoMode]);

  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  useEffect(() => {
    let isMounted = true;

    const loadSequences = async () => {
      if (isDemoMode) {
        if (isMounted) setSequences([]);
        return;
      }
      if (sequences.length) return;

      try {
        const response = await fetch('/api/admin/marketing/sequences');
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: MarketingSequencesResponse = await response.json();
        if (!isMounted) return;

        if (Array.isArray(data?.sequences)) {
          setSequences(
            data.sequences.map((sequence) => ({
              ...sequence,
              steps: Array.isArray(sequence?.steps) ? sequence.steps : []
            }))
          );
        }
      } catch (error) {
        notifyApiError({
          title: 'Could not load follow-up sequences',
          description: 'Please refresh the page or try again later.',
          error
        });
      }
    };

    loadSequences();

    return () => {
      isMounted = false;
    };
  }, [isDemoMode, sequences.length, notifyApiError]);

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    setActiveView('property');
  };

  const handleSetProperty = async (updated: Property) => {
    setProperties((prev) => prev.map((property) => (property.id === updated.id ? updated : property)));

    if (isDemoMode) {
      return;
    }

    if (
      updated.id.startsWith('demo-') ||
      updated.id.startsWith('prop-demo-') ||
      updated.id.startsWith('preview-')
    ) {
      return;
    }

    const previousVersion = properties.find((property) => property.id === updated.id);

    try {
      const persisted = await listingsService.updateProperty(updated.id, updated);
      setProperties((prev) => prev.map((property) => (property.id === persisted.id ? persisted : property)));
    } catch (error) {
      notifyApiError({
        title: 'Could not save property changes',
        description: 'We restored your previous details. Please try again.',
        error
      });
      if (previousVersion) {
        setProperties((prev) => prev.map((property) => (property.id === previousVersion.id ? previousVersion : property)));
      }
    }
  };

  const handleSaveNewProperty = (newProperty: Property) => {
    const nextProperty =
      isDemoMode && !newProperty.id.startsWith('demo-')
        ? { ...newProperty, id: `demo-${Date.now()}` }
        : newProperty;
    setProperties((prev) => [nextProperty, ...prev]);
    setSelectedPropertyId(nextProperty.id);
    setActiveView('property');
  };

  const handleDeleteProperty = async (id: string) => {
    const removedProperty = properties.find((property) => property.id === id) || null;
    setProperties((prev) => prev.filter((property) => property.id !== id));
    if (selectedPropertyId === id) {
      setSelectedPropertyId(null);
      setActiveView('listings');
    }

    if (isDemoMode) {
      return;
    }

    if (!id.startsWith('demo-') && !id.startsWith('prop-demo-') && !id.startsWith('preview-')) {
      try {
        await listingsService.deleteProperty(id);
      } catch (error) {
        notifyApiError({
          title: 'Could not delete property',
          description: 'The listing is still here. Please try again in a moment.',
          error
        });
        if (removedProperty) {
          setProperties((prev) => [removedProperty, ...prev]);
        }
      }
    }
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<AgentTask>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
  };

  const handleTaskAdd = (task: AgentTask) => {
    setTasks((prev) => [task, ...prev]);
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const blueprintSidekickTemplates = [
    {
      id: 'agent',
      label: 'Agent Sidekick',
      description: 'Represents the agent voice, tone, and lead interaction style.',
      type: 'agent',
      icon: '👤',
      color: '#3B82F6',
      defaultName: 'Agent Sidekick',
      defaultVoice: 'nova',
      personality: {
        description: 'You are the agent’s primary sidekick. Use the agent profile, voice, and preferences. Summarize lead notes, appointment outcomes, and funnel status. Keep tone on-brand and concise.',
        traits: ['agent-voice', 'summary', 'on-brand'],
        preset: 'professional'
      }
    },
    {
      id: 'sales_marketing',
      label: 'Sales & Marketing Sidekick',
      description: 'Writes emails, posts, SMS replies, and conversion CTAs.',
      type: 'sales_marketing',
      icon: '💼',
      color: '#10B981',
      defaultName: 'Sales & Marketing',
      defaultVoice: 'sol',
      personality: {
        description: 'You are a skilled marketer for the agent. Write email templates, social posts, SMS replies. Promote lead conversion, personalization, and engagement. Offer CTA ideas and exportable content.',
        traits: ['conversion', 'copy', 'cta'],
        preset: 'sales'
      }
    },
    {
      id: 'listing_agent',
      label: 'Listing Agent Sidekick',
      description: 'Listing-focused: pricing strategy, listing copy, Q&A.',
      type: 'listing_agent',
      icon: '🏡',
      color: '#F59E0B',
      defaultName: 'Listing Agent',
      defaultVoice: 'alloy',
      personality: {
        description: 'You are a listing-focused sidekick. Understand listings, pricing strategy, and home feature matching. Answer buyer/seller questions and refine listing descriptions.',
        traits: ['listing', 'pricing', 'copy'],
        preset: 'analytical'
      }
    }
  ]

  const handleAddNewLead = async (leadData: { name: string; email: string; phone: string; message: string; source: string }) => {
    const payload: LeadPayload = {
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      source: leadData.source || 'Website',
      lastMessage: leadData.message
    };

    if (isDemoMode) {
      const fallbackLead: Lead = {
        id: `lead-${Date.now()}`,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        status: 'New',
        date: new Date().toISOString(),
        lastMessage: leadData.message
      };
      setLeads((prev) => [fallbackLead, ...prev]);
      void logLeadCaptured(fallbackLead);
      return;
    }

    try {
      const createdLead = await leadsService.create(payload);
      setLeads((prev) => [createdLead, ...prev]);
      void logLeadCaptured(createdLead);
    } catch (error) {
      notifyApiError({
        title: 'Could not save lead',
        description: 'We saved a local copy so you do not lose the info. Try syncing again later.',
        error
      });
      const fallbackLead: Lead = {
        id: `lead-${Date.now()}`,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        status: 'New',
        date: new Date().toISOString(),
        lastMessage: leadData.message
      };
      setLeads((prev) => [fallbackLead, ...prev]);
      void logLeadCaptured(fallbackLead);
    }
  };

  const handleNewAppointment = (appointment: Appointment) => {
    setAppointments((prev) => [appointment, ...prev]);
    const matchedLead = leads.find((lead) => lead.id === (appointment.leadId ?? ''));
    if (matchedLead) {
      void logAppointmentScheduled(appointment, matchedLead);
    } else {
      void logAppointmentScheduled(appointment);
    }
  };

  const resetToDashboard = () => {
    setActiveView('dashboard');
    setSelectedPropertyId(null);
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {isLoadingProperties && properties.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Loading listings…
              </div>
            ) : (
              <Dashboard
                agentProfile={agentProfile}
                properties={properties}
                leads={leads}
                appointments={appointments}
                tasks={tasks}
                onSelectProperty={handleSelectProperty}
                onTaskUpdate={handleTaskUpdate}
                onTaskAdd={handleTaskAdd}
                onTaskDelete={handleTaskDelete}
              />
            )}
          </div>
        );
      case 'leads':
        return (
          <LeadsAndAppointmentsPage
            leads={leads}
            appointments={appointments}
            onAddNewLead={handleAddNewLead}
            onBackToDashboard={resetToDashboard}
            onNewAppointment={handleNewAppointment}
            onRefreshData={refreshLeads}
          />
        );
      case 'ai-card':
        return <AICardPage isDemoMode={isDemoMode} />;
      case 'ai-conversations':
        return <AIConversationsPage isDemoMode={isDemoMode} />;
      case 'listings':
        return (
          <ListingsPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onAddNew={() => setActiveView('add-listing')}
            onDeleteProperty={handleDeleteProperty}
            onBackToDashboard={resetToDashboard}
            onOpenMarketing={(id) => { setSelectedPropertyId(id); setActiveView('property'); }}
            onOpenBuilder={(id) => { setSelectedPropertyId(id); setActiveView('edit-listing'); }}
          />
        );
      case 'add-listing':
        return (
          <AddListingPage
            onCancel={resetToDashboard}
            onSave={handleSaveNewProperty}
            agentProfile={agentProfile}
          />
        );
      case 'edit-listing':
        return selectedProperty ? (
          <AddListingPage
            onCancel={resetToDashboard}
            onSave={handleSetProperty}
            initialProperty={selectedProperty}
            agentProfile={agentProfile}
          />
        ) : (
          <ListingsPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onAddNew={() => setActiveView('add-listing')}
            onDeleteProperty={handleDeleteProperty}
            onBackToDashboard={resetToDashboard}
            onOpenMarketing={(id) => { setSelectedPropertyId(id); setActiveView('property'); }}
            onOpenBuilder={(id) => { setSelectedPropertyId(id); setActiveView('edit-listing'); }}
          />
        );
      case 'property':
        return selectedProperty ? (
          <PropertyPage property={selectedProperty} setProperty={handleSetProperty} onBack={() => setActiveView('listings')} />
        ) : (
          <ListingsPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onAddNew={() => setActiveView('add-listing')}
            onDeleteProperty={handleDeleteProperty}
            onBackToDashboard={resetToDashboard}
            onOpenMarketing={(id) => { setSelectedPropertyId(id); setActiveView('property'); }}
            onOpenBuilder={(id) => { setSelectedPropertyId(id); setActiveView('edit-listing'); }}
          />
        );
      case 'knowledge-base':
        return <AgentAISidekicksPage sidekickTemplatesOverride={blueprintSidekickTemplates} isDemoMode={isDemoMode} />;
      case 'funnel-analytics':
        return <FunnelAnalyticsPanel onBackToDashboard={resetToDashboard} />;
      case 'settings':
        return (
          <SettingsPage
            userId={agentProfile.slug ?? 'blueprint-agent'}
            userProfile={agentProfile}
            onSaveProfile={setAgentProfile}
            notificationSettings={notificationSettings}
            onSaveNotifications={setNotificationSettings}
            emailSettings={emailSettings}
            onSaveEmailSettings={setEmailSettings}
            calendarSettings={calendarSettings}
            onSaveCalendarSettings={setCalendarSettings}
            billingSettings={billingSettings}
            onSaveBillingSettings={setBillingSettings}
            onBackToDashboard={resetToDashboard}
            onNavigateToAICard={() => setActiveView('ai-card')}
          />
        );
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'inbox':
        return (
          <InteractionHubPage
            properties={properties}
            interactions={interactions}
            setInteractions={setInteractions}
            onAddNewLead={handleAddNewLead}
            onBackToDashboard={resetToDashboard}
          />
        );
      case 'marketing-reports':
        return <MarketingReportsPage isDemoMode={isDemoMode} />;

      default:
        return (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8">
            <h2 className="text-xl font-semibold text-slate-800">Blueprint View Placeholder</h2>
            <p className="text-slate-500 mt-2">We haven&apos;t mapped this tab yet inside the blueprint. Pick another tab from the sidebar.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center font-bold shadow-md flex items-center justify-center gap-4">
          <span>👀 Viewing as {uiProfile.name} ({uiProfile.email})</span>
          <button
            onClick={() => {
              stopImpersonating();
              window.location.hash = '#/admin';
            }}
            className="bg-white text-amber-600 px-3 py-1 rounded-full text-sm hover:bg-amber-50 transition-colors"
          >
            Stop Impersonating
          </button>
        </div>
      )}

      <Sidebar
        activeView={activeView}
        setView={setActiveView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(!isSidebarOpen)}
        isDemoMode={isDemoMode}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isImpersonating ? 'mt-10' : ''}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-700 lg:hidden"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-2xl font-bold text-slate-800">
              {activeView === 'dashboard' ? 'Overview' :
                activeView === 'leads' ? 'Leads & Appointments' :
                  activeView === 'listings' ? 'Listings' :
                    activeView === 'add-listing' ? 'Add Listing' :
                      activeView === 'ai-conversations' ? 'AI Conversations' :
                        activeView === 'ai-sidekicks' ? 'AI Sidekicks' :
                          activeView === 'marketing-reports' ? 'Marketing Reports' :
                            activeView === 'settings' ? 'Settings' :
                              activeView === 'ai-card' ? 'AI Business Card' :
                                'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{agentProfile.name}</p>
                <p className="text-xs text-slate-500">{agentProfile.title}</p>
              </div>
              {agentProfile.headshotUrl ? (
                <img
                  src={agentProfile.headshotUrl}
                  alt={agentProfile.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border-2 border-white shadow-sm">
                  <span className="material-symbols-outlined">person</span>
                </div>
              )}

            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {renderMainContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentDashboardBlueprint;
