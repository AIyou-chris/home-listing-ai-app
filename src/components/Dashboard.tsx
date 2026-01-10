import React from 'react';
import { AgentProfile, Property, Lead, Appointment, AgentTask } from '../types';

interface DashboardProps {
    agentProfile: AgentProfile;
    properties: Property[];
    leads: Lead[];
    appointments: Appointment[];
    tasks: AgentTask[];
    onSelectProperty: (id: string) => void;
    onTaskUpdate: (taskId: string, updates: Partial<AgentTask>) => void;
    onTaskAdd: (task: Partial<AgentTask>) => void;
    onTaskDelete: (id: string) => void;
    onViewLeads: (leadId?: string, action?: string, initialTab?: string) => void;
    onViewLogs: () => void;
    onViewListings: () => void;
    onViewAppointments: () => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string; onClick?: () => void }> = ({ title, value, icon, color, onClick }) => (
    <button
        onClick={onClick}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left w-full group"
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${color} text-white`}>
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-400 transition-colors">arrow_forward</span>
        </div>
        <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</div>
        <div className="text-3xl font-bold text-slate-900 mt-1">{value}</div>
    </button>
);

const Dashboard: React.FC<DashboardProps> = ({
    agentProfile,
    properties,
    leads,
    appointments,
    tasks: _tasks,
    onSelectProperty: _onSelectProperty,
    onViewLeads,
    onViewLogs,
    onViewListings,
    onViewAppointments
}) => {
    const activeListings = properties.length;
    const newLeads = leads.filter(l => l.status === 'New').length;
    const upcomingAppts = appointments.filter(a => new Date(a.date) >= new Date()).length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Pulse</h1>
                    <p className="text-slate-500 mt-1 text-lg">Welcome back, {agentProfile.name}. Here&apos;s what&apos;s happening today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onViewLogs()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-lg">bolt</span>
                        View Activity
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Active Listings"
                    value={activeListings}
                    icon="storefront"
                    color="bg-primary-600"
                    onClick={onViewListings}
                />
                <StatCard
                    title="New Leads"
                    value={newLeads}
                    icon="group_add"
                    color="bg-indigo-600"
                    onClick={() => onViewLeads()}
                />
                <StatCard
                    title="Upcoming Viewings"
                    value={upcomingAppts}
                    icon="event"
                    color="bg-emerald-600"
                    onClick={onViewAppointments}
                />
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Leads */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-600">groups</span>
                            Recent Leads
                        </h3>
                        <button onClick={() => onViewLeads()} className="text-sm font-semibold text-primary-600 hover:text-primary-700">View All</button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {leads.slice(0, 5).map((lead) => (
                            <div key={lead.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase">
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900">{lead.name}</div>
                                        <div className="text-xs text-slate-500">{lead.status} • {lead.source || 'Direct'}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onViewLeads(lead.id, 'view')}
                                    className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined">visibility</span>
                                </button>
                            </div>
                        ))}
                        {leads.length === 0 && (
                            <div className="p-8 text-center text-slate-500 italic">No leads found yet.</div>
                        )}
                    </div>
                </div>

                {/* Upcoming Appointments */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-600">calendar_month</span>
                            Upcoming
                        </h3>
                        <button onClick={onViewAppointments} className="text-sm font-semibold text-primary-600 hover:text-primary-700">Schedule</button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {appointments.slice(0, 5).map((appt) => (
                            <div key={appt.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold text-slate-900">{appt.type} Viewing</div>
                                        <div className="text-sm text-slate-500">{appt.propertyAddress || 'No Address'}</div>
                                        <div className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">schedule</span>
                                            {appt.date} at {appt.time}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-400 uppercase">Client</div>
                                        <div className="text-sm font-medium text-slate-700">{appt.leadName || 'Anonymous'}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {appointments.length === 0 && (
                            <div className="p-8 text-center text-slate-500 italic">No upcoming viewings.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
