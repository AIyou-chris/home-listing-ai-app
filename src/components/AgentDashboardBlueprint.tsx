import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
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
import AnalyticsDashboard from './AnalyticsDashboard';
import AICardPage from './AICardPage';
import { LogoWithName } from './LogoWithName';
import { DEMO_FAT_PROPERTIES } from '../demoConstants';
import { listingsService } from '../services/listingsService';
import { leadsService, LeadPayload } from '../services/leadsService';
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

const AgentDashboardBlueprint: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDemoMode] = useState(false);

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
    amount: 139,
    currency: 'USD',
    managedBy: 'paypal',
    renewalDate: null,
    cancellationRequestedAt: null,
    history: [
      { id: 'inv-123', date: '2024-07-15', amount: 139, status: 'Paid', description: 'Complete AI Solution - Monthly' }
    ]
  });

  useEffect(() => {
    setAgentProfile(uiProfile);
  }, [uiProfile]);

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

  const leadsMountedRef = useRef(true);

  const refreshLeads = useCallback(async () => {
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
  }, [notifyApiError]);

  useEffect(() => {
    leadsMountedRef.current = true;
    refreshLeads();
    return () => {
      leadsMountedRef.current = false;
    };
  }, [refreshLeads]);

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
        return <EnhancedAISidekicksHub isDemoMode={isDemoMode} />;
      case 'ai-training':
        return <AIInteractiveTraining demoMode={isDemoMode} />;
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
