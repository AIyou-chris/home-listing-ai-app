import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Dashboard from './Dashboard';
import LeadsAndAppointmentsPage from './LeadsAndAppointmentsPage';
import ListingsPage from './ListingsPage';
import AddListingPage from './AddListingPage';
import PropertyPage from './PropertyPage';
import InteractionHubPage from './InteractionHubPage';
import AIConversationsPage from './AIConversationsPage';
import EnhancedAISidekicksHub from './EnhancedAISidekicksHub';
import AIInteractiveTraining from './AIInteractiveTraining';
import SettingsPage from './SettingsPage';
import AICardBuilderPage from '../pages/AICardBuilder';
import { LogoWithName } from './LogoWithName';
import { SAMPLE_AGENT } from '../constants';
import { DEMO_FAT_PROPERTIES } from '../demoConstants';
import { listingsService } from '../services/listingsService';
import { leadsService, LeadPayload } from '../services/leadsService';
import { calendarSettingsService } from '../services/calendarSettingsService';
import { useApiErrorNotifier } from '../hooks/useApiErrorNotifier';
import AgentBlueprintHero from './blueprint/AgentBlueprintHero';
import { supabase } from '../services/supabase';
import { logLeadCaptured, logAppointmentScheduled } from '../services/aiFunnelService';
import {
  getAgentProfile as fetchCentralAgentProfile,
  subscribeToProfileChanges,
  type AgentProfile as CentralAgentProfile
} from '../services/agentProfileService';
import {
  Property,
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

type BlueprintView =
  | 'dashboard'
  | 'leads'
  | 'ai-card-builder'
  | 'ai-conversations'
  | 'listings'
  | 'inbox'
  | 'property'
  | 'add-listing'
  | 'edit-listing'
  | 'knowledge-base'
  | 'ai-training'
  | 'settings';

const blueprintNavItems: Array<{ view: BlueprintView; icon: string; label: string }> = [
  { view: 'dashboard', icon: 'home', label: 'Overview' },
  { view: 'leads', icon: 'groups', label: 'Leads & Appointments' },
  { view: 'ai-card-builder', icon: 'add_card', label: 'AI Card Builder' },
  { view: 'ai-conversations', icon: 'chat_bubble', label: 'AI Conversations' },
  { view: 'listings', icon: 'storefront', label: 'AI Listings' },
  { view: 'knowledge-base', icon: 'smart_toy', label: 'AI Sidekicks' },
  { view: 'ai-training', icon: 'school', label: 'Train Your AI' },
  { view: 'settings', icon: 'settings', label: 'Settings' }
]

const BlueprintSidebar: React.FC<{
  activeView: BlueprintView
  onSelect: (view: BlueprintView) => void
  isOpen: boolean
  onClose: () => void
}> = ({ activeView, onSelect, isOpen, onClose }) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 h-full w-64 flex-col border-r border-slate-200 bg-white px-4 py-6
          transform transition-transform duration-300 ease-in-out
          md:static md:flex md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex justify-between items-center px-2 mb-6">
          <button
            onClick={() => {
              onSelect('dashboard')
              onClose()
            }}
            className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg"
          >
            <LogoWithName />
          </button>
          <button onClick={onClose} className="md:hidden p-1 rounded-full text-slate-500 hover:bg-slate-100" type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1">
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm divide-y divide-slate-200">
            {blueprintNavItems.map((item) => {
              const isActive = activeView === item.view
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => {
                    onSelect(item.view)
                    onClose()
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-600 font-semibold text-white shadow-sm'
                      : 'font-medium text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-white' : 'text-slate-500'}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </aside>
    </>
  )
}

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
  const [activeView, setActiveView] = useState<BlueprintView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [, setIsLeadsLoading] = useState<boolean>(false);

  const notifyApiError = useApiErrorNotifier();
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
    planName: 'Complete AI Solution',
    planStatus: 'active',
    amount: 139,
    currency: 'USD',
    managedBy: 'paypal',
    renewalDate: null,
    cancellationRequestedAt: null,
    history: [
      { id: 'inv-123', date: '2024-07-15', amount: 139, status: 'Paid', description: 'Complete AI Solution - Monthly' }
    ]
  });

  const mapCentralProfileToAgentProfile = useCallback(
    (profile: CentralAgentProfile): AgentProfile => {
      const socialDefaults = new Map(SAMPLE_AGENT.socials.map((entry) => [entry.platform, entry.url]));
      const socials: AgentProfile['socials'] = [
        {
          platform: 'Twitter',
          url: profile.socialMedia?.twitter || socialDefaults.get('Twitter') || ''
        },
        {
          platform: 'LinkedIn',
          url: profile.socialMedia?.linkedin || socialDefaults.get('LinkedIn') || ''
        },
        {
          platform: 'Instagram',
          url: profile.socialMedia?.instagram || socialDefaults.get('Instagram') || ''
        },
        {
          platform: 'Facebook',
          url: profile.socialMedia?.facebook || socialDefaults.get('Facebook') || ''
        },
        {
          platform: 'YouTube',
          url: profile.socialMedia?.youtube || socialDefaults.get('YouTube') || ''
        },
        {
          platform: 'Pinterest',
          url: socialDefaults.get('Pinterest') || ''
        }
      ];

      return {
        ...SAMPLE_AGENT,
        name: profile.name || SAMPLE_AGENT.name,
        title: profile.title || SAMPLE_AGENT.title,
        company: profile.company || SAMPLE_AGENT.company,
        phone: profile.phone || SAMPLE_AGENT.phone,
        email: profile.email || SAMPLE_AGENT.email,
        website: profile.website || SAMPLE_AGENT.website || '',
        bio: profile.bio || SAMPLE_AGENT.bio || '',
        headshotUrl: profile.headshotUrl || SAMPLE_AGENT.headshotUrl,
        brandColor: profile.brandColor || SAMPLE_AGENT.brandColor,
        logoUrl: profile.logoUrl || SAMPLE_AGENT.logoUrl,
        language: profile.language || SAMPLE_AGENT.language,
        socials,
        slug: profile.id || SAMPLE_AGENT.slug
      };
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        const supabaseUser = data?.user ?? null;
        setIsDemoMode(!supabaseUser);
        setUserId(supabaseUser?.id ?? null);
      } catch (error) {
        console.warn('[Blueprint] Unable to resolve Supabase auth user, defaulting to demo mode', error);
        if (mounted) setIsDemoMode(true);
        if (mounted) setUserId(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const loadAgentProfile = async () => {
      if (isDemoMode) {
        if (isMounted) {
          setAgentProfile({
            ...SAMPLE_AGENT,
            name: 'Blueprint Agent',
            slug: 'blueprint-agent',
            headshotUrl:
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&auto=format&fit=crop'
          });
        }
        return;
      }
      try {
        const centralProfile = await fetchCentralAgentProfile(userId ?? undefined);
        if (isMounted && centralProfile) {
          setAgentProfile(mapCentralProfileToAgentProfile(centralProfile));
        }
      } catch (error) {
        notifyApiError({
          title: 'Could not load agent profile',
          description: 'Showing default blueprint profile for now. Refresh after signing in to try again.',
          error
        });
        if (isMounted) {
          setAgentProfile({
            ...SAMPLE_AGENT,
            name: 'Blueprint Agent',
            slug: 'blueprint-agent'
          });
        }
      }
    };

    void loadAgentProfile();

    if (!isDemoMode) {
      unsubscribe = subscribeToProfileChanges((profile) => {
        if (!isMounted) return;
        setAgentProfile(mapCentralProfileToAgentProfile(profile));
      });
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [isDemoMode, mapCentralProfileToAgentProfile, notifyApiError, userId]);

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
          setProperties(DEMO_FAT_PROPERTIES.map((property, index) => cloneDemoProperty(property, index)));
        }
      } catch (error) {
        notifyApiError({
          title: 'Could not load listings',
          description: 'Showing demo listings for now. Refresh once you are signed in to try again.',
          error
        });
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
        notifyApiError({
          title: 'Could not load leads',
          description: 'Using sample leads for now. Refresh after signing in to try again.',
          error
        });
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
  }, [notifyApiError]);

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
      label: 'Train your AI',
      description: 'Run live conversations and capture feedback to sharpen every sidekick.',
      icon: 'neurology',
      onClick: () => setActiveView('ai-training')
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
      case 'ai-card-builder':
        return <AICardBuilderPage />;
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
            onOpenBuilder={(id) => { setSelectedPropertyId(id); setActiveView('edit-listing'); }}
          />
        );
      case 'knowledge-base':
        return <EnhancedAISidekicksHub />;
      case 'ai-training':
        return <AIInteractiveTraining />;
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
      <BlueprintSidebar activeView={activeView} onSelect={setActiveView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
