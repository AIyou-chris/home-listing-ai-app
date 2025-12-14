import React, { useState, useEffect } from 'react';
import { AdminModals } from './AdminModals';
import AddContactModal from './AddContactModal';
import { supabase } from '../services/supabase';
import { SystemMonitoringService, HealthStatus } from '../services/systemMonitoringService';
import { User, Lead } from '../types';
import AdminSalesFunnelPanel from './AdminSalesFunnelPanel';

interface ContactRecord {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role: 'lead' | 'client' | 'agent';
    stage?: string | null;
    pipeline_note?: string | null;
    created_at?: string;
}

// Enhanced status widget with real-time monitoring
const StatusWidget: React.FC<{
    serviceName: string;
    healthStatus: HealthStatus | null;
    isLoading?: boolean;
}> = ({ serviceName, healthStatus, isLoading = false }) => {
    const getStatusInfo = () => {
        if (isLoading) {
            return {
                text: 'Checking...',
                color: 'text-slate-500',
                dotClass: 'bg-slate-300 animate-pulse'
            };
        }

        if (!healthStatus) {
            return {
                text: 'Unknown',
                color: 'text-slate-500',
                dotClass: 'bg-slate-300'
            };
        }

        switch (healthStatus.status) {
            case 'healthy':
                return {
                    text: 'Online',
                    color: 'text-emerald-600',
                    dotClass: 'bg-emerald-500 animate-pulse'
                };
            case 'warning':
                return {
                    text: 'Warning',
                    color: 'text-amber-600',
                    dotClass: 'bg-amber-500 animate-pulse'
                };
            case 'error':
                return {
                    text: 'Error',
                    color: 'text-rose-600',
                    dotClass: 'bg-rose-500'
                };
            default:
                return {
                    text: 'Unknown',
                    color: 'text-slate-500',
                    dotClass: 'bg-slate-300'
                };
        }
    };

    const statusInfo = getStatusInfo();
    const responseTime = healthStatus?.responseTime;

    return (
        <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{serviceName}</p>
                    <p className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.text}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${statusInfo.dotClass}`}></div>
            </div>
            {responseTime !== undefined && (
                <div className="text-xs text-slate-500">
                    Response: {responseTime.toFixed(0)}ms
                </div>
            )}
            {healthStatus?.message && healthStatus.status !== 'healthy' && (
                <div className="text-xs text-amber-600 mt-2 line-clamp-2" title={healthStatus.message}>
                    {healthStatus.message}
                </div>
            )}
        </div>
    );
};

// Main AdminDashboard component
interface AdminDashboardProps {
    users?: User[];
    leads?: Lead[];
    onDeleteUser?: (userId: string) => void;
    onDeleteLead?: (leadId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
    users: propUsers = [],
    leads: _propLeads = [],
    onDeleteUser: _onDeleteUser,
    onDeleteLead: _onDeleteLead
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [contacts, setContacts] = useState<ContactRecord[]>([]);

    // System monitoring states
    const [apiHealth, setApiHealth] = useState<HealthStatus | null>(null);
    const [dbHealth, setDbHealth] = useState<HealthStatus | null>(null);
    const [aiHealth, setAiHealth] = useState<HealthStatus | null>(null);
    const [healthLoading, setHealthLoading] = useState(true);

    // Use the users and leads directly from props - no local state needed
    const users = propUsers;
    const leads = _propLeads;

    // Load system health status
    useEffect(() => {
        const loadHealthStatus = async () => {
            try {
                const monitoring = SystemMonitoringService.getInstance();

                // Check API health
                const apiStatus = await monitoring.checkSystemHealth();
                setApiHealth(apiStatus);

                // Check database health
                const dbStatus = await monitoring.checkDatabaseHealth();
                setDbHealth(dbStatus);

                // Check AI services health
                const aiStatus = await monitoring.checkAIServicesHealth();
                setAiHealth(aiStatus);
            } catch (error) {
                console.error('Error loading health status:', error);
            } finally {
                setHealthLoading(false);
            }
        };

        loadHealthStatus();

        // Refresh health status every 30 seconds
        const interval = setInterval(loadHealthStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const loadContacts = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data, error } = await supabase
                        .from<ContactRecord>('contacts')
                        .select('*')
                        .eq('user_id', user.id);

                    if (error) {
                        console.error('Error loading contacts:', error);
                    } else {
                        setContacts(data ?? []);
                    }
                }
            } catch (error) {
                console.error('Error loading contacts:', error);
            }

            setIsLoading(false);
        };

        loadContacts();
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-600">
                        <div className="h-6 w-6 rounded-full border-b-2 border-primary-500 animate-spin" />
                        <p className="font-semibold">Loading admin dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-primary-50 shadow-sm">
                <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-primary-200/60 blur-3xl" />
                <div className="absolute right-0 bottom-0 h-48 w-48 rounded-full bg-emerald-200/50 blur-3xl" />

                <div className="relative p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3 max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                            <span className="material-symbols-outlined text-sm">verified_user</span>
                            Admin Control Center
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                        <p className="text-slate-700">
                            Monitor platform health, funnels, and AI systems using the blueprint layout while keeping admin logic isolated.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => setShowAddContactModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition"
                            >
                                <span className="material-symbols-outlined h-5 w-5">person_add</span>
                                Add Contact
                            </button>
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                                <span className="material-symbols-outlined text-base text-primary-500">database</span>
                                Tracking {contacts.length} contacts, {users.length} users, {leads.length} leads
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacts</p>
                            <p className="text-2xl font-bold text-slate-900">{contacts.length}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Users</p>
                            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leads</p>
                            <p className="text-2xl font-bold text-slate-900">{leads.length}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Services</p>
                            <p className="text-lg font-semibold text-slate-900 capitalize">
                                {aiHealth?.status ?? 'Unknown'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatusWidget serviceName="API Server" healthStatus={apiHealth} isLoading={healthLoading} />
                <StatusWidget serviceName="Database" healthStatus={dbHealth} isLoading={healthLoading} />
                <StatusWidget serviceName="AI Services" healthStatus={aiHealth} isLoading={healthLoading} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Funnels & Sequences</h2>
                        <p className="text-sm text-slate-600">Admin-only view with blueprint-style card framing.</p>
                    </div>
                </div>
                <div className="p-2 sm:p-4">
                    <AdminSalesFunnelPanel
                        variant="embedded"
                        hideBackButton
                        title="Admin Sales Funnel"
                        subtitle="5-touch sales sequence to convert agents to the HomeListingAI platform."
                    />
                </div>
            </div>

            {/* Centralized Modals - handlers are managed by AdminLayout */}
            <AdminModals
                onAddUser={async () => { console.log('Add user handled by AdminLayout') }}
                onEditUser={async () => { console.log('Edit user handled by AdminLayout') }}
                onAddLead={async () => { console.log('Add lead handled by AdminLayout') }}
                onEditLead={async () => { console.log('Edit lead handled by AdminLayout') }}
            />

            {/* Add Contact Modal */}
            <AddContactModal
                isOpen={showAddContactModal}
                onClose={() => setShowAddContactModal(false)}
                onContactAdded={async () => {
                    // Refresh contacts data
                    try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            const { data, error } = await supabase
                                .from<ContactRecord>('contacts')
                                .select('*')
                                .eq('user_id', user.id);

                            if (!error) {
                                setContacts(data ?? []);
                            }
                        }
                    } catch (error) {
                        console.error('Error refreshing contacts:', error);
                    }
                    console.log('Contact added successfully');
                }}
            />
        </div>
    );
};

export default AdminDashboard;
