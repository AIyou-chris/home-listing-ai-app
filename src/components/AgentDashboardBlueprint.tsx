import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import LeadsAndAppointmentsPage from './LeadsAndAppointmentsPage';
import ListingsPage from './ListingsPage';
import AddListingPage from './AddListingPage';
import PropertyPage from './PropertyPage';
import InteractionHubPage from './InteractionHubPage';
import AIConversationsPage from './AIConversationsPage';
import AICardPage from './AICardPage';
import EnhancedAISidekicksHub from './EnhancedAISidekicksHub';
import AIInteractiveTraining from './AIInteractiveTraining';
import MarketingPage from './MarketingPage';
import SettingsPage from './SettingsPage';
import AnalyticsDashboard from './AnalyticsDashboard';
import { LogoWithName } from './LogoWithName';
import { SAMPLE_AGENT } from '../constants';
import { DEMO_FAT_PROPERTIES } from '../demoConstants';
import { listingsService } from '../services/listingsService';
import { leadsService, LeadPayload } from '../services/leadsService';
import { calendarSettingsService } from '../services/calendarSettingsService';
import AgentBlueprintHero from './blueprint/AgentBlueprintHero';
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

const AgentDashboardBlueprint: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const [agentProfile, setAgentProfile] = useState<AgentProfile>({
    ...SAMPLE_AGENT,
    name: 'Blueprint Agent',
    slug: 'blueprint-agent',
    headshotUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&auto=format&fit=crop'
  });
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
    planName: 'Solo Agent',
    history: [{ id: 'inv-123', date: '07/15/2024', amount: 59, status: 'Paid' }]
  });

  useEffect(() => {
    let isMounted = true;

    const loadProperties = async () => {
      setIsLoadingProperties(true);
      try {
        const list = await listingsService.listProperties();
        if (!isMounted) return;
        if (list.length > 0) {
          setProperties(list);
        } else {
          setProperties(DEMO_FAT_PROPERTIES.map((property, index) => cloneDemoProperty(property, index)));
        }
      } catch (error) {
        console.error('[Blueprint] Unable to load properties from Supabase:', error);
        if (isMounted) {
          setProperties(DEMO_FAT_PROPERTIES.map((property, index) => cloneDemoProperty(property, index)));
        }
      } finally {
        if (isMounted) setIsLoadingProperties(false);
      }
    };

    loadProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCalendarSettings = async () => {
      try {
        const payload = await calendarSettingsService.fetch(agentProfile.slug ?? 'blueprint-agent');
        if (isMounted && payload?.settings) {
          setCalendarSettings(payload.settings);
        }
      } catch (error) {
        console.error('[Blueprint] Unable to load calendar settings:', error);
      }
    };

    void loadCalendarSettings();

    return () => {
      isMounted = false;
    };
  }, [agentProfile.slug]);

  useEffect(() => {
    let isMounted = true;
    const loadLeads = async () => {
      try {
        setIsLeadsLoading(true);
        const payload = await leadsService.list();
        if (isMounted && Array.isArray(payload?.leads)) {
          setLeads(payload.leads);
        }
      } catch (error) {
        console.error('[Blueprint] Unable to load leads from API:', error);
      } finally {
        if (isMounted) {
          setIsLeadsLoading(false);
        }
      }
    };

    loadLeads();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSequences = async () => {
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
        console.error('[Blueprint] Unable to load follow-up sequences:', error);
      }
    };

    loadSequences();

    return () => {
      isMounted = false;
    };
  }, [sequences.length]);

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    setActiveView('property');
  };

  const handleSetProperty = async (updated: Property) => {
    setProperties((prev) => prev.map((property) => (property.id === updated.id ? updated : property)));

    if (
      updated.id.startsWith('demo-') ||
      updated.id.startsWith('prop-demo-') ||
      updated.id.startsWith('preview-')
    ) {
      return;
    }

    try {
      const persisted = await listingsService.updateProperty(updated.id, updated);
      setProperties((prev) => prev.map((property) => (property.id === persisted.id ? persisted : property)));
    } catch (error) {
      console.error('[Blueprint] Failed to persist property update:', error);
    }
  };

  const handleSaveNewProperty = (newProperty: Property) => {
    setProperties((prev) => [newProperty, ...prev]);
    setSelectedPropertyId(newProperty.id);
    setActiveView('property');
  };

  const handleDeleteProperty = async (id: string) => {
    setProperties((prev) => prev.filter((property) => property.id !== id));
    if (selectedPropertyId === id) {
      setSelectedPropertyId(null);
      setActiveView('listings');
    }

    if (!id.startsWith('demo-') && !id.startsWith('prop-demo-') && !id.startsWith('preview-')) {
      try {
        await listingsService.deleteProperty(id);
      } catch (error) {
        console.error('[Blueprint] Failed to delete property:', error);
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

  const handleAddNewLead = async (leadData: { name: string; email: string; phone: string; message: string; source: string }) => {
    const payload: LeadPayload = {
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      source: leadData.source || 'Website',
      lastMessage: leadData.message
    };

    try {
      const createdLead = await leadsService.create(payload);
      setLeads((prev) => [createdLead, ...prev]);
    } catch (error) {
      console.error('Failed to create lead via API, falling back to local insert:', error);
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
    }
  };

  const handleNewAppointment = (appointment: Appointment) => {
    setAppointments((prev) => [appointment, ...prev]);
  };

  const resetToDashboard = () => {
    setActiveView('dashboard');
    setSelectedPropertyId(null);
  };

  const onboardingSteps = useMemo(
    () => [
      {
        label: 'Brand profile dialed in',
        isComplete: Boolean(agentProfile.logoUrl && agentProfile.bio)
      },
      {
        label: 'AI playbooks connected',
        isComplete: sequences.length > 0
      },
      {
        label: 'Automations staged for launch',
        isComplete: sequences.length >= 2 && properties.length > 0
      }
    ],
    [agentProfile.logoUrl, agentProfile.bio, sequences.length, properties.length]
  );

  const onboardingProgress = useMemo(() => {
    if (!onboardingSteps.length) return 0;
    const completed = onboardingSteps.filter((step) => step.isComplete).length;
    return Math.round((completed / onboardingSteps.length) * 100);
  }, [onboardingSteps]);

  const heroStats = useMemo(
    () => [
      {
        label: 'Active listings in review',
        value: properties.length.toString().padStart(2, '0')
      },
      {
        label: 'New leads this week',
        value: leads.length.toString().padStart(2, '0')
      },
      {
        label: 'AI follow-ups queued',
        value: sequences.length ? sequences.length.toString().padStart(2, '0') : '00'
      },
      {
        label: 'Upcoming appointments',
        value: appointments.length.toString().padStart(2, '0')
      }
    ],
    [appointments.length, leads.length, properties.length, sequences.length]
  );

  const heroQuickLinks = [
    {
      label: 'Complete branding profile',
      description: 'Confirm contact details, brand assets, and compliance before launch.',
      icon: 'account_circle',
      onClick: () => setActiveView('settings')
    },
    {
      label: 'Review AI automations',
      description: 'Peek at nurture journeys and AI drafts queued for live rollout.',
      icon: 'bolt',
      onClick: () => setActiveView('marketing')
    },
    {
      label: 'Train knowledge base',
      description: 'Layer in scripts, market intel, and FAQs for the concierge sidekick.',
      icon: 'neurology',
      onClick: () => setActiveView('knowledge-base')
    }
  ];

  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <AgentBlueprintHero
              agent={agentProfile}
              heroStats={heroStats}
              quickLinks={heroQuickLinks}
              onboarding={{
                percentage: onboardingProgress,
                label: onboardingProgress === 100 ? 'Ready for launch' : 'Blueprint setup in progress',
                steps: onboardingSteps
              }}
            />
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
          />
        );
      case 'ai-card':
        return <AICardPage />;
      case 'ai-conversations':
        return <AIConversationsPage />;
      case 'listings':
        return (
          <ListingsPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onAddNew={() => setActiveView('add-listing')}
            onDeleteProperty={handleDeleteProperty}
            onBackToDashboard={resetToDashboard}
          />
        );
      case 'add-listing':
        return <AddListingPage onCancel={resetToDashboard} onSave={handleSaveNewProperty} />;
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
          />
        );
      case 'knowledge-base':
        return <EnhancedAISidekicksHub />;
      case 'ai-training':
        return <AIInteractiveTraining />;
      case 'marketing':
        return <MarketingPage properties={properties} sequences={sequences} setSequences={setSequences} onBackToDashboard={resetToDashboard} />;
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
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeView={activeView} setView={setActiveView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Open menu">
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <div className="flex-1 flex justify-center">
            <LogoWithName />
          </div>
          <div className="flex items-center space-x-3 pr-1">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-200">
              {agentProfile.headshotUrl ? (
                <img
                  src={agentProfile.headshotUrl}
                  alt={agentProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          <div className="min-h-full space-y-6 p-6">{renderMainContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default AgentDashboardBlueprint;
