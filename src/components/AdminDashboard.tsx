import React, { useState, useEffect } from 'react';
import { AdminModals } from './AdminModals';
import AddContactModal from './AddContactModal';
import { supabase } from '../services/supabase';
import { SystemMonitoringService, HealthStatus } from '../services/systemMonitoringService';
import { User, Lead } from '../types';
import FunnelAnalyticsPanel from './FunnelAnalyticsPanel';

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
                        <p className="text-xs text-slate-500 mt-1">
                            Tracking {contacts.length} contacts and {users.length} users across leads & agents.
                        </p>
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

                {/* System Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatusWidget serviceName="API Server" healthStatus={apiHealth} isLoading={healthLoading} />
                    <StatusWidget serviceName="Database" healthStatus={dbHealth} isLoading={healthLoading} />
                    <StatusWidget serviceName="AI Services" healthStatus={aiHealth} isLoading={healthLoading} />
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl">
                    <FunnelAnalyticsPanel
                        variant="embedded"
                        hideBackButton
                        title="Leads Funnel Control Center"
                        subtitle="Monitor lead scoring, funnel health, and sequence feedback without leaving the admin cockpit."
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
