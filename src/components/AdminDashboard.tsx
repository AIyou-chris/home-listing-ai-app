import React, { useState, useEffect } from 'react';
import { useAdminModal } from '../context/AdminModalContext';
import { AdminModals } from './AdminModals';
import AddContactModal from './AddContactModal';
import { supabase } from '../services/supabase';
import { SystemMonitoringService, HealthStatus } from '../services/systemMonitoringService';

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
                color: 'text-gray-400',
                dotClass: 'bg-gray-500 animate-pulse'
            };
        }

        if (!healthStatus) {
            return {
                text: 'Unknown',
                color: 'text-gray-400',
                dotClass: 'bg-gray-500'
            };
        }

        switch (healthStatus.status) {
            case 'healthy':
                return {
                    text: 'Online',
                    color: 'text-green-400',
                    dotClass: 'bg-green-500 animate-pulse'
                };
            case 'warning':
                return {
                    text: 'Warning',
                    color: 'text-yellow-400',
                    dotClass: 'bg-yellow-500 animate-pulse'
                };
            case 'error':
                return {
                    text: 'Error',
                    color: 'text-red-400',
                    dotClass: 'bg-red-500'
                };
            default:
                return {
                    text: 'Unknown',
                    color: 'text-gray-400',
                    dotClass: 'bg-gray-500'
                };
        }
    };

    const statusInfo = getStatusInfo();
    const responseTime = healthStatus?.responseTime;

    return (
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700/50">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-sm font-medium text-slate-400">{serviceName}</p>
                    <p className={`text-xl font-bold ${statusInfo.color}`}>{statusInfo.text}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${statusInfo.dotClass}`}></div>
            </div>
            {responseTime !== undefined && (
                <div className="text-xs text-slate-500 mt-1">
                    Response: {responseTime.toFixed(0)}ms
                </div>
            )}
            {healthStatus?.message && healthStatus.status !== 'healthy' && (
                <div className="text-xs text-slate-400 mt-2 line-clamp-2" title={healthStatus.message}>
                    {healthStatus.message}
                </div>
            )}
        </div>
    );
};

// Simple metric widget
const MetricWidget: React.FC<{ title: string; value: string; change: string; icon: string; iconBg: string; changeUp: boolean }> = ({ title, value, change, icon, iconBg, changeUp }) => {
    const changeColor = changeUp ? 'text-green-400' : 'text-red-400';
    const changeIcon = changeUp ? 'trending_up' : 'trending_down';

    return (
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700/50 flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-400">{title}</p>
                <p className="text-3xl font-bold text-white mt-2">{value}</p>
                <div className={`flex items-center gap-1 mt-1 text-sm ${changeColor}`}>
                    <span className="material-symbols-outlined text-base">{changeIcon}</span>
                    <span>{change}</span>
                </div>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
                <span className="material-symbols-outlined text-white text-2xl">{icon}</span>
            </div>
        </div>
    );
};

// Main AdminDashboard component
interface AdminDashboardProps {
  users?: any[];
  leads?: any[];
  onDeleteUser?: (userId: string) => void;
  onDeleteLead?: (leadId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    users: propUsers = [], 
    leads: propLeads = [], 
    onDeleteUser,
    onDeleteLead 
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);
    
    // System monitoring states
    const [apiHealth, setApiHealth] = useState<HealthStatus | null>(null);
    const [dbHealth, setDbHealth] = useState<HealthStatus | null>(null);
    const [aiHealth, setAiHealth] = useState<HealthStatus | null>(null);
    const [healthLoading, setHealthLoading] = useState(true);
    
    // Use centralized modal context instead of local state
    const {
        setShowAddUserModal,
        setShowAddLeadModal,
        setEditingUser,
        setEditUserForm,
        setEditingLead,
        setEditLeadForm
    } = useAdminModal();

    // Use the users and leads directly from props - no local state needed
    const users = propUsers;
    const leads = propLeads;

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
                        .from('contacts')
                        .select('*')
                        .eq('user_id', user.id);
                    
                    if (error) {
                        console.error('Error loading contacts:', error);
                    } else {
                        setContacts(data || []);
                    }
                }
            } catch (error) {
                console.error('Error loading contacts:', error);
            }
            
            setIsLoading(false);
        };

        loadContacts();
    }, []);

    const handleEditUserClick = (user: any) => {
        setEditingUser(user);
        setEditUserForm({
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'agent',
            plan: user.plan || 'Solo Agent'
        });
    };

    const handleEditLeadClick = (lead: any) => {
        setEditingLead(lead);
        setEditLeadForm({
            name: lead.name || '',
            email: lead.email || '',
            phone: lead.phone || '',
            status: lead.status || 'new',
            source: lead.source || '',
            notes: lead.notes || ''
        });
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            onDeleteUser?.(userId);
        }
    };

    const handleDeleteLead = (leadId: string) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            onDeleteLead?.(leadId);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                        <p className="text-slate-400 mt-1">Monitor and manage your platform</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowAddContactModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 transition"
                        >
                            <span className="material-symbols-outlined h-5 w-5">person_add</span>
                            Add Contact
                        </button>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricWidget 
                        title="Total Users" 
                        value={users.length.toString()} 
                        change="+12%" 
                        icon="group" 
                        iconBg="bg-blue-500" 
                        changeUp={true} 
                    />
                    <MetricWidget 
                        title="Active Leads" 
                        value={contacts.filter(c => c.role === 'lead').length.toString()} 
                        change="Live" 
                        icon="trending_up" 
                        iconBg="bg-green-500" 
                        changeUp={true} 
                    />
                    <MetricWidget 
                        title="Total Contacts" 
                        value={contacts.length.toString()} 
                        change="Live" 
                        icon="contacts" 
                        iconBg="bg-purple-500" 
                        changeUp={true} 
                    />
                    <MetricWidget 
                        title="Revenue" 
                        value="$12.4K" 
                        change="+23%" 
                        icon="attach_money" 
                        iconBg="bg-yellow-500" 
                        changeUp={true} 
                    />
                </div>

                {/* System Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatusWidget serviceName="API Server" healthStatus={apiHealth} isLoading={healthLoading} />
                    <StatusWidget serviceName="Database" healthStatus={dbHealth} isLoading={healthLoading} />
                    <StatusWidget serviceName="AI Services" healthStatus={aiHealth} isLoading={healthLoading} />
                </div>

                {/* Recent Contacts Table */}
                <div className="bg-slate-800 rounded-lg border border-slate-700/50 mb-8">
                    <div className="px-6 py-4 border-b border-slate-700/50">
                        <h3 className="text-lg font-semibold text-white">Recent Contacts</h3>
                        <p className="text-sm text-slate-400">Manage your leads and clients</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-700/30">
                                <tr>
                                    <th className="px-6 py-3">Contact</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Stage</th>
                                    <th className="px-6 py-3">Contact Info</th>
                                    <th className="px-6 py-3">Created</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.slice(0, 5).map((contact) => (
                                    <tr key={contact.id} className="bg-slate-800 border-b border-slate-700/50 hover:bg-slate-700/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                                                    <span className="text-white text-sm font-semibold">
                                                        {contact.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{contact.name}</div>
                                                    <div className="text-slate-400 text-xs">{contact.pipeline_note || 'No notes'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                contact.role === 'lead' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {contact.role === 'lead' ? 'Lead' : 'Client'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                                {contact.stage}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-300">{contact.email}</div>
                                            <div className="text-slate-400 text-xs">{contact.phone || 'No phone'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {new Date(contact.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => console.log('Edit contact:', contact.id)}
                                                    className="text-blue-400 hover:text-blue-300 transition"
                                                    title="Edit contact"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => console.log('Delete contact:', contact.id)}
                                                    className="text-red-400 hover:text-red-300 transition"
                                                    title="Delete contact"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {contacts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                            No contacts found. Add your first contact to get started!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>


            </div>

            {/* Centralized Modals - handlers are managed by AdminLayout */}
            <AdminModals
                users={users}
                leads={leads}
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
                                .from('contacts')
                                .select('*')
                                .eq('user_id', user.id);
                            
                            if (!error) {
                                setContacts(data || []);
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
