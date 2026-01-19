import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AICardPage from '../components/AICardPage';
import AIConversationsPage from '../components/AIConversationsPage';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import AdminCommandCenter from './components/AdminCommandCenter';
import AdminAISidekicksPage from './components/AdminAISidekicksPage';
// import EnhancedAISidekicksHub from '../components/EnhancedAISidekicksHub'; // Kept for reference if needed, but unused in new flow
import AdminMarketingFunnelsPanel from '../components/admin/AdminMarketingFunnelsPanel';
import InteractionHubPage from '../components/InteractionHubPage';
import AddListingPage from '../components/AddListingPage';
import AdminListingsPage from './AdminListingsPage';
import PropertyPage from '../components/PropertyPage';
import AdminSettingsPage from './components/AdminSettingsPage';
import AdminUsersPage from '../components/AdminUsersPage';
import { LogoWithName } from '../components/LogoWithName';
import ListingsPage from '../components/ListingsPage';
import AdminDashboardSidebar from './AdminDashboardSidebar';
import { DEMO_FAT_PROPERTIES } from '../demoConstants';
import { SAMPLE_AGENT, SAMPLE_INTERACTIONS } from '../constants';
import {
  AgentProfile,
  Appointment,
  Property,
  Interaction
} from '../types';
import { useAdminLeads } from '../hooks/use-admin-leads';
import AdminLeadsPage from './AdminLeadsPage';
import { adminAppointmentsService } from '../services/adminAppointmentsService';
import type { ScheduleAppointmentFormData } from '../components/ScheduleAppointmentModal';

export type DashboardView =
  | 'dashboard'
  | 'leads'
  | 'ai-card'
  | 'ai-conversations'
  | 'listings'
  | 'knowledge-base'
  | 'settings'
  | 'analytics'
  | 'inbox'
  | 'property'
  | 'add-listing'
  | 'ai-card-builder'
  | 'add-listing'
  | 'ai-card-builder'
  | 'marketing-funnels'
  | 'users'
  | 'broadcast';

import AdminBroadcastPage from './components/AdminBroadcastPage';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeAppointment = (appt: any): Appointment => ({
  id: (appt.id as string) ?? `appt-${Date.now()}`,
  type: (appt.type as Appointment['type']) ?? (appt as { kind?: Appointment['type'] }).kind ?? 'Showing',
  date: (appt.date as string) ?? (appt.startIso as string)?.slice(0, 10) ?? '',
  time: (appt.time as string) ?? (appt as { time_label?: string }).time_label ?? '',
  leadId: (appt.leadId as string | null | undefined) ?? (appt as { lead_id?: string | null }).lead_id ?? null,
  agentId: (appt.agentId as string | null | undefined) ?? (appt as { assigned_agent_id?: string | null }).assigned_agent_id ?? null,
  agentName: (appt.agentName as string | null | undefined) ?? (appt as { assigned_agent_name?: string | null }).assigned_agent_name ?? null,
  propertyId: (appt.propertyId as string | null | undefined) ?? (appt as { property_id?: string | null }).property_id ?? null,
  propertyAddress:
    (appt.propertyAddress as string | null | undefined) ?? (appt as { property_address?: string | null }).property_address ?? null,
  notes: (appt.notes as string) ?? '',
  status: (appt.status as Appointment['status']) ?? 'Scheduled',
  leadName: (appt.leadName as string) ?? (appt as { name?: string }).name,
  email: (appt.email as string) ?? (appt as { email?: string | null }).email ?? null,
  phone: (appt.phone as string) ?? (appt as { phone?: string | null }).phone ?? null,
  meetLink: (appt.meetLink as string) ?? (appt as { meet_link?: string | null }).meet_link ?? null,
  remindAgent: (appt.remindAgent as boolean) ?? (appt as { remind_agent?: boolean }).remind_agent ?? false,
  remindClient: (appt.remindClient as boolean) ?? (appt as { remind_client?: boolean }).remind_client ?? false,
  agentReminderMinutes:
    (appt.agentReminderMinutes as number | undefined) ?? (appt as { agent_reminder_minutes_before?: number }).agent_reminder_minutes_before,
  clientReminderMinutes:
    (appt.clientReminderMinutes as number | undefined) ?? (appt as { client_reminder_minutes_before?: number }).client_reminder_minutes_before,
  startIso: (appt.startIso as string) ?? (appt as { start_iso?: string }).start_iso,
  endIso: (appt.endIso as string) ?? (appt as { end_iso?: string }).end_iso,
  createdAt: (appt.createdAt as string) ?? (appt as { created_at?: string }).created_at,
  updatedAt: (appt.updatedAt as string) ?? (appt as { updated_at?: string }).updated_at
});

interface AdminDashboardProps {
  initialTab?: DashboardView;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab = 'dashboard' }) => {
  const agentOptions = [{ id: 'admin-agent', name: 'Admin Team' }, { id: 'system-admin', name: 'System Admin' }];
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  // Use URL tab if available, otherwise fall back to initialTab
  const activeView = (tab as DashboardView) || initialTab;

  const handleSetView = (newView: DashboardView) => {
    navigate(`/admin/${newView}`);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDemoMode] = useState(false);

  const [properties, setProperties] = useState<Property[]>(() =>
    DEMO_FAT_PROPERTIES.map((property, index) => cloneDemoProperty(property, index))
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  const { leads, isLoading: isLeadsLoading, error: leadsError, refreshLeads, addLead, deleteLead, addNote, fetchNotesForLead, notesByLeadId } =
    useAdminLeads();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>(SAMPLE_INTERACTIONS);

  const [agentProfile] = useState<AgentProfile>(SAMPLE_AGENT);

  const handleSelectProperty = (propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
    if (propertyId) {
      handleSetView('property');
    }
  };

  const handleSetProperty = (property: Property) => {
    setProperties((prev) => prev.map((p) => (p.id === property.id ? property : p)));
  };

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const data = await adminAppointmentsService.list();
        setAppointments(data.map((appt) => normalizeAppointment(appt)));
      } catch (error) {
        console.error('Failed to load admin appointments', error);
        setAppointments([]);
      }
    };
    void loadAppointments();
  }, []);

  const handleSaveNewProperty = async (propertyData: Property) => {
    const newProperty: Property = {
      ...propertyData,
      id: `prop-${Date.now()}`,
      agent: agentProfile
    };
    setProperties((prev) => [newProperty, ...prev]);
    handleSetView('listings');
  };

  const handleDeleteProperty = (propertyId: string) => {
    setProperties((prev) => prev.filter((property) => property.id !== propertyId));
    if (selectedPropertyId === propertyId) {
      setSelectedPropertyId(null);
    }
  };

  const handleAddNewLead = async (leadData: { name: string; email: string; phone: string; message: string; source: string }) => {
    try {
      const lead = await addLead({
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        source: leadData.source,
        status: 'New',
        notes: leadData.message
      });
      return lead;
    } catch (error) {
      console.error('Failed to create admin lead, falling back locally', error);
      const fallbackLead = {
        id: `lead-${Date.now()}`,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        status: 'New' as const,
        date: new Date().toISOString(),
        lastMessage: leadData.message
      };
      await refreshLeads().catch(() => undefined);
      return fallbackLead;
    }
  };

  const handleCreateAdminAppointment = async (
    apptData: ScheduleAppointmentFormData,
    lead?: { id?: string | null; name?: string; email?: string | null; phone?: string | null }
  ): Promise<Appointment | null> => {
    const payload = {
      leadId: lead?.id ?? null,
      assignedAgentId: apptData.agentId ?? agentOptions[0]?.id ?? null,
      assignedAgentName: apptData.agentName ?? (agentOptions[0]?.name ?? null),
      propertyId: null,
      propertyAddress: undefined,
      kind: apptData.kind,
      name: apptData.name || lead?.name || 'Lead',
      email: apptData.email || lead?.email || null,
      phone: apptData.phone || lead?.phone || null,
      date: apptData.date,
      time: apptData.time,
      notes: apptData.message,
      remindAgent: apptData.remindAgent,
      remindClient: apptData.remindClient,
      agentReminderMinutes: apptData.agentReminderMinutes,
      clientReminderMinutes: apptData.clientReminderMinutes,
      meetLink: null
    };

    try {
      const created = await adminAppointmentsService.create(payload);
      const normalized = normalizeAppointment(created);
      setAppointments((prev) => [normalized, ...prev]);
      return normalized;
    } catch (error) {
      console.error('Failed to create admin appointment, falling back locally', error);
      const fallback: Appointment = {
        id: `appt-${Date.now()}`,
        type: apptData.kind,
        date: apptData.date,
        time: apptData.time,
        leadId: lead?.id ?? null,
        propertyId: null,
        notes: apptData.message,
        status: 'Scheduled',
        leadName: lead?.name,
        email: apptData.email || lead?.email,
        phone: apptData.phone || lead?.phone
      };
      setAppointments((prev) => [fallback, ...prev]);
      return fallback;
    }
  };

  const handleUpdateAdminAppointment = async (id: string, apptData: ScheduleAppointmentFormData, lead?: { id?: string | null }) => {
    try {
      const updated = await adminAppointmentsService.update({
        id,
        leadId: lead?.id ?? null,
        kind: apptData.kind,
        name: apptData.name,
        email: apptData.email,
        phone: apptData.phone,
        date: apptData.date,
        time: apptData.time,
        notes: apptData.message,
        remindAgent: apptData.remindAgent,
        remindClient: apptData.remindClient,
        agentReminderMinutes: apptData.agentReminderMinutes,
        clientReminderMinutes: apptData.clientReminderMinutes,
        assignedAgentId: apptData.agentId ?? null,
        assignedAgentName: apptData.agentName ?? null
      });
      const normalized = normalizeAppointment(updated);
      setAppointments((prev) => prev.map((appt) => (appt.id === id ? normalized : appt)));
      // placeholder for future funnel integration
      return normalized;
    } catch (error) {
      console.error('Failed to update admin appointment', error);
      return null;
    }
  };

  const handleDeleteAdminAppointment = async (id: string) => {
    try {
      await adminAppointmentsService.remove(id);
      setAppointments((prev) => prev.filter((appt) => appt.id !== id));
    } catch (error) {
      console.error('Failed to delete appointment', error);
    }
  };

  const resetToDashboard = () => {
    handleSetView('dashboard');
    setSelectedPropertyId(null);
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <AdminCommandCenter />;
      case 'leads':
        return (
          <AdminLeadsPage
            leads={leads}
            appointments={appointments}
            isLoading={isLeadsLoading}
            error={leadsError}
            onRefreshLeads={refreshLeads}
            onAddLead={handleAddNewLead}
            onDeleteLead={deleteLead}
            onCreateAppointment={(payload, lead) => handleCreateAdminAppointment(payload, lead)}
            onUpdateAppointment={(id, payload, lead) => handleUpdateAdminAppointment(id, payload, lead)}
            onDeleteAppointment={handleDeleteAdminAppointment}
            notesByLeadId={notesByLeadId}
            onAddNote={addNote}
            onFetchNotes={fetchNotesForLead}
            agentOptions={agentOptions}
          />
        );
      case 'ai-card':
        return <AICardPage isDemoMode={isDemoMode} />;
      case 'ai-conversations':
        return <AIConversationsPage isDemoMode={isDemoMode} />;
      case 'listings':
        return (
          <AdminListingsPage />
        );
      case 'add-listing':
        return (
          <AddListingPage
            onCancel={resetToDashboard}
            onSave={handleSaveNewProperty}
            agentProfile={agentProfile}
          />
        );
      case 'property':
        return selectedProperty ? (
          <PropertyPage property={selectedProperty} setProperty={handleSetProperty} onBack={() => handleSetView('listings')} />
        ) : (
          <ListingsPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onAddNew={() => handleSetView('add-listing')}
            onDeleteProperty={handleDeleteProperty}
            onBackToDashboard={resetToDashboard}
            onOpenMarketing={(id) => {
              setSelectedPropertyId(id);
              handleSetView('property');
            }}
            onOpenBuilder={(id) => {
              setSelectedPropertyId(id);
              handleSetView('property');
            }}
          />
        );
      case 'knowledge-base':
        return <AdminAISidekicksPage initialTab="overview" />;

      case 'marketing-funnels':
        return (
          <AdminMarketingFunnelsPanel
            onBackToDashboard={resetToDashboard}
            title="Marketing Funnels"
            subtitle="AI-powered marketing campaigns for HomeListingAI program"
            variant="page"
          />
        );
      case 'settings':
        return (
          <AdminSettingsPage
            onBack={resetToDashboard}
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
      case 'users':
        return <AdminUsersPage />;
      case 'broadcast':
        return <AdminBroadcastPage />;
      default:
        return (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8">
            <h2 className="text-xl font-semibold text-slate-800">Blueprint View Placeholder</h2>
            <p className="text-slate-500 mt-2">
              We haven&apos;t mapped this tab yet inside the admin blueprint clone. Pick another tab from the sidebar.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminDashboardSidebar activeView={activeView} setView={handleSetView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Open menu">
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <div className="flex-1 flex justify-center">
            <LogoWithName />
          </div>
          <div className="w-10" />
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          <div className="min-h-full space-y-6 p-6">{renderMainContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
