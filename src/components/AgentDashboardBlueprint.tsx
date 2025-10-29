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
import { leadsService, LeadPayload } from '../services/leadsService';
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

const AgentDashboardBlueprint: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
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
  const [isLeadsLoading, setIsLeadsLoading] = useState<boolean>(false);

  const [agentProfile, setAgentProfile] = useState<AgentProfile>({
    ...SAMPLE_AGENT,
    name: 'Blueprint Agent',
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

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    setActiveView('property');
  };

  const handleSetProperty = (updated: Property) => {
    setProperties((prev) => prev.map((property) => (property.id === updated.id ? updated : property)));
  };

  const handleSaveNewProperty = (newProperty: Omit<Property, 'id'>) => {
    const propertyWithId: Property = {
      ...newProperty,
      id: `prop-blueprint-${Date.now()}`
    };
    setProperties((prev) => [propertyWithId, ...prev]);
    setSelectedPropertyId(propertyWithId.id);
    setActiveView('property');
  };

  const handleDeleteProperty = (id: string) => {
    setProperties((prev) => prev.filter((property) => property.id !== id));
    if (selectedPropertyId === id) {
      setSelectedPropertyId(null);
      setActiveView('listings');
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
      const result = await leadsService.create(payload);
      const createdLead: Lead | undefined = result?.lead;
      if (createdLead) {
        setLeads((prev) => [createdLead, ...prev]);
      }
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

  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
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
          <div className="p-8">
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">{renderMainContent()}</main>
      </div>
    </div>
  );
};

export default AgentDashboardBlueprint;
