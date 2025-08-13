import React from 'react';
import { Property, Lead, Appointment } from '../types';
import { DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS } from '../demoConstants';

interface DemoDashboardProps {
  properties: Property[];
  onSelectProperty: (id: string) => void;
  onAddNew: () => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: string, bgColor: string, iconColor: string }> = ({ title, value, icon, bgColor, iconColor }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
        <div className="flex items-center">
            <div className={`p-3 rounded-lg ${bgColor}`}>
                <span className={`material-symbols-outlined h-6 w-6 ${iconColor}`}>{icon}</span>
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">{title}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    </div>
);

const SectionCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 h-full flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
            <span className="material-symbols-outlined w-6 h-6 text-slate-600">{icon}</span>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <div className="p-2 flex-grow">{children}</div>
    </div>
);

const LeadStatusBadge: React.FC<{ status: 'New' | 'Qualified' | 'Contacted' | 'Showing' | 'Lost' }> = ({ status }) => {
    const statusStyles = {
        'New': 'bg-blue-100 text-blue-700',
        'Qualified': 'bg-green-100 text-green-700',
        'Contacted': 'bg-yellow-100 text-yellow-700',
        'Showing': 'bg-purple-100 text-purple-700',
        'Lost': 'bg-red-100 text-red-700'
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const DemoDashboard: React.FC<DemoDashboardProps> = ({ properties, onSelectProperty, onAddNew }) => {
    const leads = DEMO_FAT_LEADS;
    const appointments = DEMO_FAT_APPOINTMENTS;
    const newLeadsCount = leads.filter(l => l.status === 'New').length;

    return (
        <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Demo Dashboard</h1>
                    <p className="text-slate-500 mt-1">Here's a sample of a busy agent's dashboard.</p>
                </div>
                <button
                    onClick={onAddNew}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105"
                >
                    <span className="material-symbols-outlined h-5 w-5">add</span>
                    <span>Add New Listing</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard title="Active Listings" value={String(properties.length)} icon="home_work" bgColor="bg-blue-100" iconColor="text-blue-600" />
                <StatCard title="New Leads" value={String(newLeadsCount)} icon="group" bgColor="bg-green-100" iconColor="text-green-600" />
                <StatCard title="Appointments" value={String(appointments.length)} icon="calendar_today" bgColor="bg-purple-100" iconColor="text-purple-600" />
                <StatCard title="AI Interactions" value="50+" icon="memory" bgColor="bg-orange-100" iconColor="text-orange-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Upcoming Appointments */}
                <SectionCard title="Upcoming Appointments" icon="calendar_today">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {appointments.slice(0, 5).map(appt => {
                            const lead = leads.find(l => l.id === appt.leadId);
                            const property = properties.find(p => p.id === appt.propertyId);
                            return (
                                <div key={appt.id} className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-slate-800">{lead?.name || 'Unknown Lead'}</p>
                                        <p className="text-sm font-bold text-slate-700">{appt.time}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs text-slate-500 truncate pr-4">{property?.address || 'Unknown Property'}</p>
                                        <p className="text-xs text-slate-500">{appt.date}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* Column 2: Recent Leads */}
                <SectionCard title="Recent Leads" icon="group">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {leads.slice(0, 5).map(lead => (
                            <div key={lead.id} className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-slate-800">{lead.name}</h4>
                                    <LeadStatusBadge status={lead.status} />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{lead.lastMessage}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Column 3: Recent Listings */}
                <SectionCard title="Recent Listings" icon="home_work">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {properties.slice(0, 4).map(prop => (
                            <div
                                key={prop.id}
                                onClick={() => onSelectProperty(prop.id)}
                                className="flex items-center p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                <img src={prop.imageUrl} alt={prop.address} className="w-16 h-16 rounded-md object-cover" />
                                <div className="ml-3">
                                    <h4 className="font-semibold text-slate-800 text-sm">{prop.address}</h4>
                                    <p className="text-sm font-bold text-primary-700">${prop.price.toLocaleString()}</p>
                                </div>
                                <span className="material-symbols-outlined w-5 h-5 text-slate-400 ml-auto">chevron_right</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};

export default DemoDashboard;
