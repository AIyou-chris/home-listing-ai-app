import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import LeadsAndAppointmentsPage from './LeadsAndAppointmentsPage';
import ListingsPage from './ListingsPage';
import AddListingPage from './AddListingPage';
import PropertyPage from './PropertyPage';
import AIInteractionHubPage from './AIInteractionHubPage';
import AgentAISidekicksPage from './AgentAISidekicksPage';
import SettingsPage from './SettingsPage';
import AnalyticsDashboard from './AnalyticsDashboard';
import AICardPage from './AICardPage';
import MarketingReportsPage from './MarketingReportsPage';
import PaymentsAndStorePage from './PaymentsAndStorePage';
import { MarketingHub } from './MarketingHub';

import { DEMO_FAT_PROPERTIES, DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS } from '../demoConstants';
import {
  BLUEPRINT_PROPERTIES,
  BLUEPRINT_LEADS,
  BLUEPRINT_APPOINTMENTS,
  BLUEPRINT_SEQUENCES
} from '../constants/agentBlueprintData';
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
  Interaction,
  LeadFunnelType
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

interface AgentDashboardProps {
  isDemoMode?: boolean;
  isBlueprintMode?: boolean;
  demoListingCount?: number;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ isDemoMode: propIsDemoMode = false, isBlueprintMode: propIsBlueprintMode = false, demoListingCount = 2 }) => {
  // Setup Failsafe: Force Demo Mode if URL implies it
  const isDemoMode = propIsDemoMode || window.location.pathname.includes('blueprint') || window.location.pathname.includes('demo');
  const isBlueprintMode = propIsBlueprintMode || window.location.pathname.includes('blueprint');

  const navigate = useNavigate();

  // --- SUPER ADMN FAILSAFE ---
  // If us@homelistingai.com somehow lands here, KICK THEM OUT to admin dashboard.
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (user.email?.toLowerCase() === 'us@homelistingai.com' || user.email?.toLowerCase() === 'admin@homelistingai.com')) {
        console.log("👮 AgentDashboard Bouncer: Redirecting admin...");
        navigate('/admin-dashboard', { replace: true });
      }
    };
    if (!isDemoMode) checkUser();
  }, [isDemoMode, navigate]);

  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    amount: 49,
    currency: 'USD',
    managedBy: 'paypal',
    renewalDate: null,
    cancellationRequestedAt: null,
    history: [
      { id: 'inv-123', date: '2024-07-15', amount: 49, status: 'Paid', description: 'Complete AI Solution - Monthly' }
    ]
  });

  const [isSetupDismissed, setIsSetupDismissed] = useState(false);

  useEffect(() => {
    // Only set profile from UI context, never force Sarah Johnson
    setAgentProfile(uiProfile);
  }, [uiProfile]);

  useEffect(() => {
    let isMounted = true;

    const loadProperties = async () => {
      setIsLoadingProperties(true);
      try {
        console.log('DEBUG: loadProperties', { isDemoMode, demoListingCount, demoPropsLength: DEMO_FAT_PROPERTIES.length });
        if (isDemoMode) {
          if (isBlueprintMode) {
            setProperties(BLUEPRINT_PROPERTIES);
            return;
          }
          const sliced = DEMO_FAT_PROPERTIES.slice(0, demoListingCount);
          console.log('DEBUG: sliced properties', sliced.length);
          setProperties(sliced.map((property, index) => cloneDemoProperty(property, index)));
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
  }, [isDemoMode, isBlueprintMode, notifyApiError, demoListingCount]);

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

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
  };

  const refreshLeads = useCallback(async () => {
    if (isDemoMode) {
      if (isBlueprintMode) {
        setLeads(BLUEPRINT_LEADS);
      } else {
        setLeads(DEMO_FAT_LEADS);
      }
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
  }, [notifyApiError, isDemoMode, isBlueprintMode]);

  useEffect(() => {
    leadsMountedRef.current = true;
    refreshLeads();
    return () => {
      leadsMountedRef.current = false;
    };
  }, [refreshLeads]);

  const refreshAppointments = useCallback(async () => {
    if (isDemoMode) {
      if (isBlueprintMode) {
        setAppointments(BLUEPRINT_APPOINTMENTS);
      } else {
        setAppointments(DEMO_FAT_APPOINTMENTS);
      }
      return;
    }
    try {
      const list = await listAppointments();
      if (leadsMountedRef.current) {
        const mapped: Appointment[] = list.map(row => ({
          id: row.id,
          type: row.kind,
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
          leadName: row.name
        }));
        setAppointments(mapped);
      }
    } catch (error) {
      console.warn('Failed to load appointments', error);
    }
  }, [isDemoMode, isBlueprintMode]);

  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  useEffect(() => {
    let isMounted = true;

    const loadSequences = async () => {
      if (isDemoMode) {
        if (isBlueprintMode) {
          if (isMounted) setSequences(BLUEPRINT_SEQUENCES);
        } else {
          if (isMounted) setSequences([]);
        }
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
    return () => {
      isMounted = false;
    };
  }, [isDemoMode, isBlueprintMode, sequences.length, notifyApiError]);

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
      label: 'AI Agent Buddy',
      description: 'Your all-in-one operations partner. Handles marketing, lead follow-up, and admin tasks.',
      type: 'agent',
      icon: 'smart_toy',
      color: '#4F46E5',
      defaultName: 'AI Agent Buddy',
      defaultVoice: 'nova',
      personality: {
        description: 'You are the Agent’s primary Buddy. You are a world-class real estate assistant, marketer, and operations specialist. You can draft emails, summarize conversations, provide pricing insights, and manage the agent’s daily pulse. Your tone is professional yet friendly, and always highly efficient.',
        traits: ['all-in-one', 'efficient', 'professional'],
        preset: 'professional'
      }
    }
  ]

  const handleAddNewLead = async (leadData: { name: string; email: string; phone: string; message: string; source: string; funnelType?: string }) => {
    const payload: LeadPayload = {
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      source: leadData.source || 'Website',
      lastMessage: leadData.message,
      funnelType: (leadData.funnelType as LeadFunnelType) || null
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

  const handleBackToListings = () => {
    setActiveView('listings');
    setSelectedPropertyId(null);
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Welcome Setup Widget */}
            {!isSetupDismissed && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                  <svg width="300" height="300" viewBox="0 0 100 100" fill="white">
                    <circle cx="80" cy="20" r="40" />
                    <circle cx="10" cy="90" r="30" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Welcome to your AI Command Center, {agentProfile.name ? agentProfile.name.split(' ')[0] : 'Agent'}! 🚀</h2>
                      <p className="text-indigo-100 max-w-2xl">
                        Let's get your AI Agent fully trained and operational. Complete these 5 steps to unlock your "AI-Ready" badge.
                      </p>
                    </div>
                    <div className="absolute top-6 right-6">
                      <button
                        onClick={() => setIsSetupDismissed(true)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        title="Dismiss Setup Guide"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Step 1: AI Card */}
                    <button
                      onClick={() => setActiveView('ai-card')}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          1
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">5 min</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">1. AI Business Card</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Fill out your bio & upload your headshot so your AI knows who you are.</p>
                    </button>

                    {/* Step 2: Train Brain */}
                    <button
                      onClick={() => setActiveView('knowledge-base')}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          2
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">15 min</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">2. Train Your Brain</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Upload PDFs or add text to train your "Personal GPT" on your business.</p>
                    </button>

                    {/* Step 3: Connect Email */}
                    <button
                      onClick={() => setActiveView('settings')}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          3
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">2 min</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">3. Connect Email</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Sync your Gmail so your AI can draft replies and book meetings.</p>
                    </button>

                    {/* Step 4: First Listing */}
                    <button
                      onClick={() => setActiveView('add-listing')}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          4
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">10 min</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">4. Add Listing</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Create your first AI-powered property listing to see the magic.</p>
                    </button>

                    {/* Step 5: Funnels */}
                    <button
                      onClick={() => setActiveView('funnel-analytics')}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          5
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">5 min</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">5. Review Funnels</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Check your automated follow-up sequences and customize them.</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                onViewLeads={(leadId, action, initialTab) => {
                  setActiveView('leads');
                  if (leadId) {
                    const params = new URLSearchParams();
                    params.set('tab', 'leads');
                    params.set('id', leadId);
                    if (action) params.set('action', action);
                    if (initialTab) params.set('initialTab', initialTab);
                    navigate(`?${params.toString()}`, { replace: true });
                  }
                }}
                onViewLogs={() => setActiveView('ai-interaction-hub')}
                onViewListings={() => setActiveView('listings')}
                onViewAppointments={() => setActiveView('leads')}
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
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
          />
        );
      case 'ai-card':
        return <AICardPage isDemoMode={isDemoMode} isBlueprintMode={isBlueprintMode} />;
      case 'ai-conversations':
      case 'inbox':
      case 'ai-interaction-hub':
        return (
          <AIInteractionHubPage
            properties={properties}
            interactions={interactions}
            setInteractions={setInteractions}
            onAddNewLead={handleAddNewLead}
            onBackToDashboard={resetToDashboard}
            isDemoMode={isDemoMode}
          />
        );
      case 'listings':
        return (
          <ListingsPage
            properties={properties}
            onSelectProperty={(id, action) => {
              if (action === 'edit') {
                setSelectedPropertyId(id);
                setActiveView('edit-listing');
              } else {
                handleSelectProperty(id);
              }
            }}
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
            onCancel={handleBackToListings}
            onSave={handleSaveNewProperty}
            agentProfile={agentProfile}
          />
        );
      case 'edit-listing':
        return selectedProperty ? (
          <AddListingPage
            onCancel={handleBackToListings}
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
          <PropertyPage property={selectedProperty} setProperty={handleSetProperty} onBack={() => setActiveView('listings')} isDemoMode={isDemoMode} leadCount={leads.filter(l => l.interestedProperties?.includes(selectedProperty.id)).length} />
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
        return (
          <FunnelAnalyticsPanel
            onBackToDashboard={resetToDashboard}
            title="AI Funnel"
            subtitle="Homebuyer, Seller, and Showing funnels for every lead"
            variant="page"
            isDemoMode={isDemoMode}
            hideBackButton={true}
          />
        );
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
            isDemoMode={isDemoMode}
          />
        );
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'marketing-reports':
        return <MarketingReportsPage isDemoMode={isDemoMode} />;
      case 'marketing':
        return (
          <MarketingHub
            agentProfile={agentProfile}
            properties={properties}
          />
        );
      case 'payments':
        return (
          <PaymentsAndStorePage
            agentProfile={agentProfile}
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

  const isIntegrated = !isDemoMode;


  // Navigation handlers that adapt to mode
  const handleViewLeads = (leadId?: string, action?: 'view' | 'contact') => {
    if (isIntegrated) {
      const p = new URLSearchParams();
      if (leadId) p.set('id', leadId);
      if (action) p.set('action', action);
      navigate(`/leads?${p.toString()}`);
    }
    else setActiveView('leads');
  };

  const handleViewLogs = () => {
    if (isIntegrated) navigate('/inbox');
    else setActiveView('ai-interaction-hub');
  };

  const handleViewListings = () => {
    if (isIntegrated) navigate('/listings');
    else setActiveView('listings');
  };

  const handleViewAppointments = () => {
    if (isIntegrated) navigate('/leads?tab=appointments');
    else setActiveView('leads');
  };

  return (
    <div className={`flex ${isIntegrated ? 'flex-col min-h-full' : 'h-screen overflow-hidden'} bg-slate-50`}>
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


      {/* Only render Sidebar in Demo/Standalone mode */}
      {!isIntegrated && (
        <Sidebar
          activeView={activeView}
          setView={setActiveView}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(!isSidebarOpen)}
          isDemoMode={isDemoMode}
          isBlueprintMode={isBlueprintMode}
        />
      )}

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isImpersonating ? 'mt-10' : ''}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isIntegrated && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 text-slate-500 hover:text-slate-700 lg:hidden"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
            )}
            <h1 className="text-2xl font-bold text-slate-800">
              {activeView === 'dashboard' ? 'My Daily Pulse' :
                activeView === 'leads' ? 'Leads & Appointments' :
                  activeView === 'listings' ? 'AI Listings' :
                    activeView === 'add-listing' ? 'Add Listing' :
                      activeView === 'ai-interaction-hub' ? 'AI Interaction Hub' :
                        activeView === 'ai-conversations' ? 'AI Conversations' :
                          activeView === 'ai-sidekicks' ? 'AI Agent' :
                            activeView === 'knowledge-base' ? 'AI Agent' :
                              activeView === 'marketing' ? 'Marketing Hub' :
                                activeView === 'payments' ? 'Payments & Store' :
                                  activeView === 'marketing-reports' ? 'Marketing Reports' :
                                    activeView === 'funnel-analytics' ? 'Leads Funnel' :
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
                <p className="text-sm font-medium text-slate-900">{agentProfile.name || 'Agent'}</p>
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
        <main className="flex-1 overflow-y-auto p-0 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' ? (
              <div className="space-y-6">
                {/* Welcome Setup Widget */}
                {!isSetupDismissed && (
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-none md:rounded-2xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                      <svg width="300" height="300" viewBox="0 0 100 100" fill="white">
                        <circle cx="80" cy="20" r="40" />
                        <circle cx="10" cy="90" r="30" />
                      </svg>
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold mb-2">Welcome to your AI Command Center, {agentProfile.name ? agentProfile.name.split(' ')[0] : 'Agent'}! 🚀</h2>
                          <p className="text-indigo-100 max-w-2xl">
                            Let's get your AI Agent fully trained and operational. Complete these 5 steps to unlock your "AI-Ready" badge.
                          </p>
                        </div>
                        <div className="absolute top-6 right-6">
                          <button
                            onClick={() => setIsSetupDismissed(true)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            title="Dismiss Setup Guide"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {/* Step 1: AI Card */}
                        <button
                          onClick={() => isIntegrated ? navigate('/ai-card') : setActiveView('ai-card')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              1
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">5 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">1. AI Business Card</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Fill out your bio & upload your headshot so your AI knows who you are.</p>
                        </button>

                        {/* Step 2: Train Brain */}
                        <button
                          onClick={() => isIntegrated ? navigate('/knowledge-base') : setActiveView('knowledge-base')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              2
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">15 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">2. Train Your Brain</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Upload PDFs or add text to train your "Personal GPT" on your business.</p>
                        </button>

                        {/* Step 3: Connect Email */}
                        <button
                          onClick={() => isIntegrated ? navigate('/settings') : setActiveView('settings')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              3
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">2 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">3. Connect Email</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Sync your Gmail so your AI can draft replies and book meetings.</p>
                        </button>

                        {/* Step 4: First Listing */}
                        <button
                          onClick={() => isIntegrated ? navigate('/add-listing') : setActiveView('add-listing')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              4
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">10 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">4. Add Listing</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Create your first AI-powered property listing to see the magic.</p>
                        </button>

                        {/* Step 5: Funnels */}
                        <button
                          onClick={() => isIntegrated ? navigate('/funnel-analytics') : setActiveView('funnel-analytics')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              5
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">5 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">5. Review Funnels</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Check your automated follow-up sequences and customize them.</p>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
                    onViewLeads={handleViewLeads}
                    onViewLogs={handleViewLogs}
                    onViewListings={handleViewListings}
                    onViewAppointments={handleViewAppointments}
                  />
                )}
              </div>
            ) : (
              /* Only render other views if NOT integrated. If integrated, we should have navigated away. 
                 However, for safety / demo mode, we keep this fallback */
              renderMainContent()
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentDashboard;
