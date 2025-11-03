
import React, { useState } from 'react';
import { Lead, Appointment, LeadStatus } from '../types';
import { scheduleAppointment } from '../services/schedulerService';
import AddLeadModal, { type NewLeadPayload } from './AddLeadModal';
import ScheduleAppointmentModal, { ScheduleAppointmentFormData } from './ScheduleAppointmentModal';
import ContactLeadModal from './ContactLeadModal';
import CalendarView from './CalendarView';
import ExportModal from './ExportModal';

const StatCard: React.FC<{ title: string; value: string | number; icon: string, iconBgColor: string }> = ({ title, value, icon, iconBgColor }) => (
  <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
    <div className={`rounded-full p-3 ${iconBgColor}`}>
        <span className="material-symbols-outlined w-6 h-6">{icon}</span>
    </div>
    <div>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-500">{title}</p>
    </div>
  </div>
);

const LeadStatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
    const statusStyles: Record<LeadStatus, string> = {
        'New': 'bg-blue-100 text-blue-700',
        'Qualified': 'bg-green-100 text-green-700',
        'Contacted': 'bg-yellow-100 text-yellow-700',
        'Showing': 'bg-purple-100 text-purple-700',
        'Lost': 'bg-red-100 text-red-700'
    };
    return (
        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>
    );
};

const LeadsList: React.FC<{ leads: Lead[]; onSchedule: (lead: Lead) => void; onContact: (lead: Lead) => void; }> = ({ leads, onSchedule, onContact }) => (
    <div className="space-y-6">
        {leads.map(lead => (
            <div key={lead.id} className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 transition-all duration-300 hover:shadow-lg hover:border-slate-300">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
                        {lead.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-800 truncate">{lead.name}</h3>
                            <LeadStatusBadge status={lead.status} />
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                            <span className="material-symbols-outlined w-5 h-5 text-slate-400">calendar_today</span>
                            <span>{lead.date}</span>
                        </div>
                    </div>
                </div>

                {lead.lastMessage && (
                    <div className="mt-4 pt-4 border-t border-slate-200/80">
                         <div className="p-4 bg-slate-50/70 rounded-lg border-l-4 border-primary-300">
                             <div className="flex items-start gap-3 text-sm text-slate-600">
                                 <span className="material-symbols-outlined w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5">format_quote</span>
                                <p className="italic">{lead.lastMessage}</p>
                            </div>
                         </div>
                    </div>
                )}
                <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-end gap-3">
                    <button
                        onClick={() => onContact(lead)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">contact_mail</span>
                        <span>Contact</span>
                    </button>
                    <button
                        onClick={() => onSchedule(lead)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                        <span>Schedule</span>
                    </button>
                </div>
            </div>
        ))}
    </div>
);

const formatReminderLabel = (minutes?: number) => {
    if (!minutes || minutes <= 0) return '';
    if (minutes === 15) return '15 min before';
    if (minutes === 30) return '30 min before';
    if (minutes === 60) return '1 hour before';
    if (minutes === 120) return '2 hours before';
    if (minutes === 180) return '3 hours before';
    if (minutes === 720) return '12 hours before';
    if (minutes === 1440) return '1 day before';
    if (minutes % 60 === 0) return `${minutes / 60} hours before`;
    return `${minutes} min before`;
};

const AppointmentsList: React.FC<{ appointments: Appointment[] }> = ({ appointments }) => {
    const upcoming = [...appointments].sort((a, b) => {
        const aStart = a.startIso ? new Date(a.startIso).getTime() : new Date(a.date).getTime();
        const bStart = b.startIso ? new Date(b.startIso).getTime() : new Date(b.date).getTime();
        return aStart - bStart;
    });

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-5">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Upcoming Appointments</h3>
            {upcoming.length > 0 ? (
                <ul className="divide-y divide-slate-200">
                    {upcoming.map(appt => (
                        <li key={appt.id} className="py-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-slate-700 truncate">{appt.leadName || 'Unnamed contact'}</p>
                                        {appt.type && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                                                {appt.type}
                                            </span>
                                        )}
                                    </div>
                                    {appt.propertyAddress && (
                                        <p className="text-sm text-slate-500 mt-0.5 truncate">{appt.propertyAddress}</p>
                                    )}
                                    {appt.notes && (
                                        <p className="mt-2 text-sm text-slate-600 max-h-[3.5rem] overflow-hidden">
                                            <span className="font-medium text-slate-500">Notes:</span> {appt.notes}
                                        </p>
                                    )}
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        {appt.remindAgent && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                <span className="material-symbols-outlined text-base leading-none">notifications_active</span>
                                                Agent {formatReminderLabel(appt.agentReminderMinutes)}
                                            </span>
                                        )}
                                        {appt.remindClient && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                <span className="material-symbols-outlined text-base leading-none">person</span>
                                                Client {formatReminderLabel(appt.clientReminderMinutes)}
                                            </span>
                                        )}
                                        {appt.meetLink && (
                                            <a
                                                href={appt.meetLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition"
                                            >
                                                <span className="material-symbols-outlined text-base leading-none">videocam</span>
                                                Join link
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <p className="font-semibold text-slate-700">{appt.time}</p>
                                    <p className="text-sm text-slate-500">{appt.date}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8 text-slate-500">
                    <span className="material-symbols-outlined w-10 h-10 mx-auto text-slate-300 mb-2">calendar_today</span>
                    <p>No upcoming appointments.</p>
                </div>
            )}
        </div>
    );
};

interface LeadsAndAppointmentsPageProps {
    leads: Lead[];
    appointments: Appointment[];
    onAddNewLead: (leadData: NewLeadPayload) => void;
    onBackToDashboard: () => void;
    onNewAppointment?: (appt: Appointment) => void;
}

const LeadsAndAppointmentsPage: React.FC<LeadsAndAppointmentsPageProps> = ({ leads, appointments, onAddNewLead, onBackToDashboard, onNewAppointment }) => {
    const [activeTab, setActiveTab] = useState<'leads' | 'appointments'>('leads');
    const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
    const [contactingLead, setContactingLead] = useState<Lead | null>(null);
    const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);


    const handleOpenScheduleModal = (lead: Lead | null = null) => {
        setSchedulingLead(lead);
        setIsScheduleModalOpen(true);
    };

    const handleCloseScheduleModal = () => {
        setIsScheduleModalOpen(false);
        setSchedulingLead(null);
    };

    const handleOpenContactModal = (lead: Lead) => {
        setContactingLead(lead);
        setIsContactModalOpen(true);
    };
    
    const handleCloseContactModal = () => {
        setIsContactModalOpen(false);
        setContactingLead(null);
    };

    const handleSwitchToSchedule = (lead: Lead) => {
        handleCloseContactModal();
        // Use a slight delay to ensure the first modal has time to close
        // and avoid UI jank from overlapping modals.
        setTimeout(() => {
            handleOpenScheduleModal(lead);
        }, 100);
    };


    return (
        <>
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                 <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-6">
                    <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
                    <span>Back to Dashboard</span>
                </button>
                <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Leads & Appointments</h1>
                        <p className="text-slate-500 mt-1">Manage your prospects and schedule showings.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsAddLeadModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition"
                        >
                            <span className="material-symbols-outlined w-5 h-5">add</span>
                            <span>Add New Lead</span>
                        </button>
                        <button 
                            onClick={() => handleOpenScheduleModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold shadow-sm hover:bg-green-600 transition"
                        >
                            <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                            <span>Schedule Appointment</span>
                        </button>
                        <button 
                            onClick={() => setIsExportModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition"
                        >
                            <span className="material-symbols-outlined w-5 h-5">download</span>
                            <span>Export Data</span>
                        </button>
                    </div>
                </header>

                <div className="mb-8">
                    <button
                        type="button"
                        onClick={() => setIsHelpPanelOpen(prev => !prev)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
                        aria-expanded={isHelpPanelOpen}
                    >
                        <span className="material-symbols-outlined text-xl">{isHelpPanelOpen ? 'psychiatry' : 'help'}</span>
                        {isHelpPanelOpen ? 'Hide Leads & Appointments Tips' : 'Show Leads & Appointments Tips'}
                        <span className="material-symbols-outlined text-base ml-auto">{isHelpPanelOpen ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {isHelpPanelOpen && (
                        <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
                            <div>
                                <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-lg">diversity_3</span>
                                    Leads Hub
                                </h2>
                                <ul className="space-y-1.5 list-disc list-inside">
                                    <li><strong>Segment by status:</strong> Use the filters to surface hot or stalled prospects for focused follow-up.</li>
                                    <li><strong>Conversation history:</strong> Open a lead to keep notes tight and add next steps while the context is fresh.</li>
                                    <li><strong>Quick actions:</strong> Use “Contact” for emails/calls or “Schedule” to instantly drop a meeting on the calendar.</li>
                                </ul>
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-lg">calendar_month</span>
                                    Appointments
                                </h2>
                                <ul className="space-y-1.5 list-disc list-inside">
                                    <li><strong>Calendar view:</strong> Click any slot to add a showing, inspection, or follow-up touch.</li>
                                    <li><strong>Auto confirmations:</strong> Appointments triggered here send reminders if your notification settings allow it.</li>
                                    <li><strong>Need to reschedule?</strong> Edit from the timeline and the system re-syncs reminders for you.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Total Leads" value={leads.length} icon="group" iconBgColor="bg-blue-100" />
                    <StatCard title="Appointments" value={appointments.length} icon="calendar_today" iconBgColor="bg-green-100" />
                    <StatCard title="Converted" value={1} icon="check" iconBgColor="bg-purple-100" />
                    <StatCard title="Pending" value={0} icon="schedule" iconBgColor="bg-orange-100" />
                </section>
                
                <main>
                    <div className="border-b border-slate-200 mb-6">
                        <nav className="flex space-x-2">
                            <TabButton 
                                isActive={activeTab === 'leads'}
                                onClick={() => setActiveTab('leads')}
                                icon="group"
                                count={leads.length}
                            >
                                Leads
                            </TabButton>
                             <TabButton 
                                isActive={activeTab === 'appointments'}
                                onClick={() => setActiveTab('appointments')}
                                icon="calendar_today"
                                count={appointments.length}
                            >
                                Appointments
                            </TabButton>
                        </nav>
                    </div>
                    
                    {activeTab === 'leads' &&
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="relative w-full max-w-sm">
                                    <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                                    <input type="text" placeholder="Search leads..." className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
                                </div>
                                <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-100 transition">
                                    <span className="material-symbols-outlined w-4 h-4">filter_list</span>
                                    <span>All Status</span>
                                    <span className="material-symbols-outlined w-4 h-4">expand_more</span>
                                </button>
                            </div>
                        </div>
                    }

                    {activeTab === 'leads' ? (
                        <div className="space-y-8">
                            <LeadsList leads={leads} onSchedule={handleOpenScheduleModal} onContact={handleOpenContactModal} />
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <div className="rounded-lg overflow-hidden border border-slate-200">
                                        <CalendarView appointments={appointments} />
                                    </div>
                                </div>
                                <div className="lg:col-span-1">
                                    <AppointmentsList appointments={appointments} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <div className="scale-95 origin-top rounded-lg overflow-hidden border border-slate-200">
                                    <CalendarView appointments={appointments} />
                                </div>
                            </div>
                            <div className="lg:col-span-1">
                                <AppointmentsList appointments={appointments} />
                            </div>
                        </div>
                    )}
                </main>
            </div>
            {isAddLeadModalOpen && (
                <AddLeadModal 
                    onClose={() => setIsAddLeadModalOpen(false)}
                    onAddLead={(leadData) => {
                        onAddNewLead(leadData);
                        setIsAddLeadModalOpen(false);
                    }}
                />
            )}
             {isScheduleModalOpen && (
                <ScheduleAppointmentModal 
                    lead={schedulingLead}
                    onClose={handleCloseScheduleModal}
                    onSchedule={async (apptData: ScheduleAppointmentFormData) => {
                        const linkedPropertyId = schedulingLead?.interestedProperties?.[0] || '';
                        try {
                            await scheduleAppointment({
                                name: apptData.name,
                                email: apptData.email,
                                phone: apptData.phone,
                                date: apptData.date,
                                time: apptData.time,
                                message: apptData.message,
                                kind: apptData.kind,
                                leadId: schedulingLead?.id,
                                propertyId: linkedPropertyId,
                                remindAgent: apptData.remindAgent,
                                remindClient: apptData.remindClient,
                                agentReminderMinutes: apptData.agentReminderMinutes,
                                clientReminderMinutes: apptData.clientReminderMinutes
                            });
                        } catch (error) {
                            console.error('Failed to schedule appointment:', error);
                        }
                        const appt: Appointment = {
                            id: `appt-${Date.now()}`,
                            type: apptData.kind,
                            date: apptData.date,
                            time: apptData.time,
                            leadId: schedulingLead?.id || 'manual',
                            propertyId: linkedPropertyId,
                            notes: apptData.message || '',
                            status: 'Scheduled',
                            leadName: apptData.name,
                            email: apptData.email,
                            phone: apptData.phone,
                            remindAgent: apptData.remindAgent,
                            remindClient: apptData.remindClient,
                            agentReminderMinutes: apptData.agentReminderMinutes,
                            clientReminderMinutes: apptData.clientReminderMinutes
                        };
                        onNewAppointment?.(appt);
                        handleCloseScheduleModal();
                    }}
                />
            )}
              {isContactModalOpen && contactingLead && (
                 <ContactLeadModal
                     lead={contactingLead}
                     onClose={handleCloseContactModal}
                     onSchedule={() => handleSwitchToSchedule(contactingLead)}
                 />
             )}
             {isExportModalOpen && (
                 <ExportModal
                     isOpen={isExportModalOpen}
                     onClose={() => setIsExportModalOpen(false)}
                     leads={leads}
                     appointments={appointments}
                 />
             )}
         </>
     );
 }
 
 const TabButton: React.FC<{ isActive: boolean; onClick: () => void; icon: string; count: number; children: React.ReactNode }> = ({ isActive, onClick, icon, count, children }) => {
     return (
         <button
             onClick={onClick}
             className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                 isActive
                     ? 'border-b-2 border-primary-600 text-primary-600'
                     : 'text-slate-500 hover:text-slate-800'
             }`}
         >
             <span className="material-symbols-outlined w-5 h-5">{icon}</span>
             <span>{children}</span>
             <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-600'}`}>
                 {count}
             </span>
         </button>
     );
 };
 
 export default LeadsAndAppointmentsPage;