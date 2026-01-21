import React, { useEffect, useMemo, useState } from 'react';

import AddLeadModal from '../components/AddLeadModal';
import CalendarView from '../components/CalendarView';
import ContactLeadModal from '../components/ContactLeadModal';
import ExportModal from '../components/ExportModal';
import ScheduleAppointmentModal, { type ScheduleAppointmentFormData } from '../components/ScheduleAppointmentModal';
import type { Lead, Appointment, LeadStatus } from '../types';
import { type LeadNote } from '../services/adminLeadsService';
import type { AppointmentKind } from '../services/schedulerService';

type LeadsTab = 'leads' | 'appointments';

interface AdminLeadsPageProps {
  leads: Lead[];
  appointments: Appointment[];
  isLoading: boolean;
  error?: string | null;
  onRefreshLeads: () => Promise<void>;
  onAddLead: (payload: { name: string; email: string; phone: string; message: string; source: string }) => Promise<Lead>;
  onUpdateLead: (leadId: string, payload: { name: string; email: string; phone: string; message: string; source: string }) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
  onCreateAppointment: (payload: ScheduleAppointmentFormData, lead?: Lead | null) => Promise<Appointment | null>;
  onUpdateAppointment: (id: string, payload: ScheduleAppointmentFormData, lead?: Lead | null) => Promise<Appointment | null>;
  onDeleteAppointment: (id: string) => Promise<void>;
  notesByLeadId: Record<string, LeadNote[]>;
  onAddNote: (leadId: string, content: string) => Promise<LeadNote>;
  onFetchNotes: (leadId: string) => Promise<LeadNote[]>;
  agentOptions: Array<{ id: string; name: string }>;
}

const statusStyles: Record<LeadStatus, string> = {
  New: 'bg-blue-100 text-blue-700',
  Qualified: 'bg-green-100 text-green-700',
  Contacted: 'bg-yellow-100 text-yellow-700',
  Showing: 'bg-purple-100 text-purple-700',
  Lost: 'bg-red-100 text-red-700',
  Won: 'bg-teal-100 text-teal-700',
  Bounced: 'bg-red-100 text-red-700',
  Unsubscribed: 'bg-slate-100 text-slate-700'
};

const StatCard: React.FC<{ icon: string; value: number; label: string; colorClass: string; iconColor: string }> = ({
  icon,
  value,
  label,
  colorClass,
  iconColor
}) => (
  <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
    <div className={`rounded-full p-3 ${colorClass}`}>
      <span className={`material-symbols-outlined w-6 h-6 ${iconColor}`}>{icon}</span>
    </div>
    <div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  </div>
);

const AdminLeadsPage: React.FC<AdminLeadsPageProps> = ({
  leads,
  appointments,
  isLoading,
  error,
  onRefreshLeads,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onCreateAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  notesByLeadId,
  onAddNote,
  onFetchNotes,
  agentOptions
}) => {
  const [activeTab, setActiveTab] = useState<LeadsTab>('leads');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isCreateAppointmentOpen, setIsCreateAppointmentOpen] = useState(false);

  const [appointmentFilters, setAppointmentFilters] = useState<{ query: string; date: string }>({ query: '', date: '' });
  const [expandedLeadIds, setExpandedLeadIds] = useState<Set<string>>(new Set());

  const toggleLeadExpanded = (leadId: string) => {
    setExpandedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  useEffect(() => {
    onRefreshLeads().catch((err) => console.error('Failed to refresh admin leads', err));
  }, [onRefreshLeads]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const q = searchTerm.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        (lead.phone ?? '').toLowerCase().includes(q) ||
        (lead.source ?? '').toLowerCase().includes(q)
    );
  }, [leads, searchTerm]);

  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const appointmentsCount = appointments.length;
    const converted = leads.filter((l) => l.status === 'Showing').length;
    const pending = leads.filter((l) => l.status === 'New' || l.status === 'Qualified').length;
    return { totalLeads, appointmentsCount, converted, pending };
  }, [leads, appointments]);

  const filteredAppointments = useMemo(() => {
    const query = appointmentFilters.query.toLowerCase();
    return appointments.filter((appt) => {
      const matchesQuery =
        !query ||
        (appt.leadName ?? '').toLowerCase().includes(query) ||
        (appt.propertyAddress ?? '').toLowerCase().includes(query);
      const matchesDate = !appointmentFilters.date || appt.date === appointmentFilters.date;
      return matchesQuery && matchesDate;
    });
  }, [appointments, appointmentFilters]);

  const handleAddNote = async (leadId: string) => {
    const content = noteDrafts[leadId]?.trim();
    if (!content) return;
    await onAddNote(leadId, content);
    setNoteDrafts((prev) => ({ ...prev, [leadId]: '' }));
  };

  const loadNotesIfMissing = async (leadId: string) => {
    if (notesByLeadId[leadId]) return;
    await onFetchNotes(leadId);
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    const confirmed = window.confirm(`Delete lead "${leadName}"? This cannot be undone.`);
    if (!confirmed) return;
    setIsDeleting(leadId);
    try {
      await onDeleteLead(leadId);
    } finally {
      setIsDeleting(null);
    }
  };

  const appointmentToFormData = (appt: Appointment): ScheduleAppointmentFormData => ({
    name: appt.leadName ?? '',
    email: appt.email ?? '',
    phone: appt.phone ?? '',
    date: appt.date ?? '',
    time: appt.time ?? '',
    message: appt.notes ?? '',
    kind: (appt.type as AppointmentKind) ?? 'Consultation',
    remindAgent: appt.remindAgent ?? true,
    remindClient: appt.remindClient ?? true,
    agentReminderMinutes: appt.agentReminderMinutes ?? 60,
    clientReminderMinutes: appt.clientReminderMinutes ?? 1440,
    location: 'Phone'
  });

  return (
    <>
      <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Leads & Appointments</h1>
            <p className="text-slate-500 mt-1">Live admin workspace for managing platform leads.</p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddLeadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition"
            >
              <span className="material-symbols-outlined w-5 h-5">add</span>
              <span>Add Lead</span>
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition"
            >
              <span className="material-symbols-outlined w-5 h-5">download</span>
              <span>Export</span>
            </button>
            <button
              onClick={() => onRefreshLeads().catch(() => undefined)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
            >
              <span className="material-symbols-outlined w-5 h-5">refresh</span>
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <div className="border-b border-slate-200">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('leads')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'leads' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <span className="material-symbols-outlined w-5 h-5">group</span>
              <span>Leads</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'leads' ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-600'
                  }`}
              >
                {leads.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'appointments' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
              <span>Appointments</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'appointments' ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-600'
                  }`}
              >
                {stats.appointmentsCount}
              </span>
            </button>
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-full max-w-sm">
              <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search leads..."
                className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-100 transition"
                onClick={() => onRefreshLeads().catch(() => undefined)}
              >
                <span className="material-symbols-outlined w-4 h-4">refresh</span>
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>

        <main className="space-y-6">
          {activeTab === 'leads' && (
            <div className="space-y-6">
              {isLoading && <div className="py-6 text-slate-500 text-sm">Loading leads…</div>}
              {!isLoading && filteredLeads.length === 0 && (
                <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-slate-400 text-2xl">group</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Leads Yet</h3>
                  <p className="text-slate-500 mb-6">Start by adding your first lead to track prospects and appointments.</p>
                  <button
                    onClick={() => setIsAddLeadModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition mx-auto"
                  >
                    <span className="material-symbols-outlined w-5 h-5">add</span>
                    <span>Add Lead</span>
                  </button>
                </div>
              )}

              {filteredLeads.map((lead) => {
                const notes = notesByLeadId[lead.id] ?? [];
                // COLLAPSIBLE STATE: Check if this specific lead is expanded
                const isExpanded = expandedLeadIds.has(lead.id);

                return (
                  <div key={lead.id} className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 transition-all duration-300 hover:shadow-lg hover:border-slate-300">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
                        {lead.name.charAt(0)}
                      </div>

                      {/* Basic Info (Always Visible) */}
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleLeadExpanded(lead.id)}>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-slate-800 truncate">{lead.name}</h3>
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusStyles[lead.status]}`}>{lead.status}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="material-symbols-outlined w-5 h-5 text-slate-400">calendar_today</span>
                            <span>{lead.date}</span>
                          </span>
                          {lead.source && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              <span className="material-symbols-outlined text-sm">link</span>
                              {lead.source}
                            </span>
                          )}
                          {lead.funnelType && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                              <span className="material-symbols-outlined text-sm">auto_fix</span>
                              {lead.funnelType.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Toggle Button */}
                        <button
                          onClick={() => toggleLeadExpanded(lead.id)}
                          className={`p-2 rounded-lg border transition-colors ${isExpanded ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          <span className="material-symbols-outlined">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                        </button>

                        <a
                          href={`/admin/leads/${lead.id}/dashboard`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hidden sm:inline-flex"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          View
                        </a>
                        <button
                          onClick={() => setEditingLead(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsContactModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                        >
                          <span className="material-symbols-outlined text-sm">contact_mail</span>
                          Contact
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsScheduleModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700"
                        >
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          Schedule
                        </button>
                        <button
                          disabled={isDeleting === lead.id}
                          onClick={() => handleDeleteLead(lead.id, lead.name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          {isDeleting === lead.id ? '...' : 'Del'}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</p>
                          <div className="mt-2 space-y-2">
                            {notes.length === 0 && (
                              <button
                                type="button"
                                onClick={() => loadNotesIfMissing(lead.id)}
                                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                              >
                                Load notes
                              </button>
                            )}
                            {notes.map((note) => (
                              <div key={note.id} className="rounded-md bg-white border border-slate-200 p-3">
                                <p className="text-sm text-slate-700">{note.content}</p>
                                <p className="mt-1 text-[11px] text-slate-400">Added {new Date(note.createdAt).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3">
                            <textarea
                              value={noteDrafts[lead.id] ?? ''}
                              onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                              placeholder="Add an internal note…"
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              rows={2}
                            />
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={() => void handleAddNote(lead.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Add Note
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</p>
                          <div className="mt-2 text-sm text-slate-700 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-base text-slate-400">mail</span>
                              <span>{lead.email}</span>
                            </div>
                            {lead.phone && (
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-slate-400">call</span>
                                <span>{lead.phone}</span>
                              </div>
                            )}
                            {lead.notes && <p className="text-slate-600">{lead.notes}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full max-w-sm">
                    <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                    <input
                      type="text"
                      value={appointmentFilters.query}
                      onChange={(e) => setAppointmentFilters((prev) => ({ ...prev, query: e.target.value }))}
                      placeholder="Search appointments by lead, name, or address..."
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <input
                    type="date"
                    value={appointmentFilters.date}
                    onChange={(e) => setAppointmentFilters((prev) => ({ ...prev, date: e.target.value }))}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setIsCreateAppointmentOpen(true)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      New Appointment
                    </button>
                    <button
                      onClick={() => setAppointmentFilters({ query: '', date: '' })}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {filteredAppointments.length === 0 && <div className="text-sm text-slate-500 py-6">No appointments found.</div>}
              {filteredAppointments.map((appt) => (
                <div key={appt.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary-500">event</span>
                      {appt.leadName ?? 'Appointment'}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-slate-400">calendar_today</span>
                      <span>{appt.date}</span>
                      <span className="material-symbols-outlined text-base text-slate-400">schedule</span>
                      <span>{appt.time}</span>
                      {appt.type && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">{appt.type}</span>}
                      {appt.agentName && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">{appt.agentName}</span>}
                    </p>
                    {appt.notes && <p className="text-xs text-slate-600">Notes: {appt.notes}</p>}
                    {appt.leadId && (
                      <a
                        href={`/admin/leads/${appt.leadId}/dashboard`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        View lead dashboard
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{appt.status ?? 'Scheduled'}</span>
                    <button
                      onClick={() => setEditingAppointment(appt)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Cancel this appointment?')) {
                          await onDeleteAppointment(appt.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon="group" value={stats.totalLeads} label="Total Leads" colorClass="bg-blue-100" iconColor="text-blue-600" />
          <StatCard icon="calendar_today" value={stats.appointmentsCount} label="Appointments" colorClass="bg-green-100" iconColor="text-green-600" />
          <StatCard icon="check" value={stats.converted} label="Converted" colorClass="bg-purple-100" iconColor="text-purple-600" />
          <StatCard icon="schedule" value={stats.pending} label="Pending" colorClass="bg-orange-100" iconColor="text-orange-600" />
        </section>

        <section>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CalendarView appointments={appointments} />
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Upcoming Appointments</h3>
              <div className="space-y-3">
                {appointments.length === 0 && (
                  <div className="text-center text-slate-500 py-8">
                    <span className="material-symbols-outlined text-4xl mb-2 block">event_available</span>
                    <p>No appointments scheduled</p>
                  </div>
                )}
                {appointments.map((appt) => (
                  <div key={appt.id} className="rounded-lg border border-slate-200 px-4 py-3 bg-slate-50">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                      <span>{appt.leadName ?? 'Appointment'}</span>
                      <span className="text-xs text-slate-500">{appt.status ?? 'Scheduled'}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                      <span className="material-symbols-outlined text-base text-slate-400">calendar_today</span>
                      <span>{appt.date}</span>
                      <span className="material-symbols-outlined text-base text-slate-400">schedule</span>
                      <span>{appt.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {isAddLeadModalOpen && (
        <AddLeadModal
          onClose={() => setIsAddLeadModalOpen(false)}
          onAddLead={async (leadData) => {
            const lead = await onAddLead(leadData);
            setSelectedLead(lead);
            setIsAddLeadModalOpen(false);
          }}
        />
      )}

      {editingLead && (
        <AddLeadModal
          isEditing
          initialData={{
            name: editingLead.name,
            email: editingLead.email,
            phone: editingLead.phone || '',
            message: editingLead.notes || '',
            source: editingLead.source || 'Manual Entry'
          }}
          onClose={() => setEditingLead(null)}
          onAddLead={async (leadData) => {
            await onUpdateLead(editingLead.id, leadData);
            setEditingLead(null);
          }}
        />
      )}

      {isScheduleModalOpen && selectedLead && (
        <ScheduleAppointmentModal
          lead={selectedLead}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setSelectedLead(null);
          }}
          onSchedule={async (apptData) => {
            await onCreateAppointment(apptData, selectedLead);
            setIsScheduleModalOpen(false);
            setSelectedLead(null);
          }}
          agentOptions={agentOptions}
        />
      )}

      {isCreateAppointmentOpen && (
        <ScheduleAppointmentModal
          onClose={() => setIsCreateAppointmentOpen(false)}
          onSchedule={async (apptData) => {
            await onCreateAppointment(apptData, null);
            setIsCreateAppointmentOpen(false);
          }}
          title="Create Appointment"
          submitLabel="Create Appointment"
          agentOptions={agentOptions}
        />
      )}

      {editingAppointment && (
        <ScheduleAppointmentModal
          lead={leads.find((l) => l.id === editingAppointment.leadId) ?? null}
          onClose={() => setEditingAppointment(null)}
          onSchedule={async (apptData) => {
            await onUpdateAppointment(editingAppointment.id, apptData, leads.find((l) => l.id === editingAppointment.leadId) ?? null);
            setEditingAppointment(null);
          }}
          initialData={appointmentToFormData(editingAppointment)}
          title="Edit Appointment"
          submitLabel="Update Appointment"
          agentOptions={agentOptions}
        />
      )}

      {isContactModalOpen && selectedLead && (
        <ContactLeadModal
          lead={selectedLead}
          onClose={() => {
            setIsContactModalOpen(false);
            setSelectedLead(null);
          }}
          onSchedule={() => {
            setIsContactModalOpen(false);
            setIsScheduleModalOpen(true);
          }}
        />
      )}

      {isExportModalOpen && (
        <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} leads={leads} appointments={appointments} />
      )}
    </>
  );
};

export default AdminLeadsPage;
