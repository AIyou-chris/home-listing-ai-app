import React, { useState, useEffect } from 'react';
import { useAdminModal } from '../context/AdminModalContext';
import { AdminModals } from './AdminModals';

// Simple status widget
const StatusWidget: React.FC<{ serviceName: string; status: 'Online' | 'Offline' | 'Error' }> = ({ serviceName, status }) => {
    const statusInfo = {
        Online: { text: 'Online', color: 'text-green-400', dotClass: 'bg-green-500 animate-pulse' },
        Offline: { text: 'Offline', color: 'text-red-400', dotClass: 'bg-red-500' },
        Error: { text: 'Error', color: 'text-yellow-400', dotClass: 'bg-yellow-500' },
    };
    const currentStatus = statusInfo[status];

    return (
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700/50 flex justify-between items-center">
            <div>
                <p className="text-sm font-medium text-slate-400">{serviceName}</p>
                <p className={`text-xl font-bold ${currentStatus.color}`}>{currentStatus.text}</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${currentStatus.dotClass}`}></div>
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
const AdminDashboard: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    
    // Use centralized modal context instead of local state
    const {
        setShowAddUserModal,
        setShowAddLeadModal,
        setEditingUser,
        setEditUserForm,
        setEditingLead,
        setEditLeadForm
    } = useAdminModal();

    const [users, setUsers] = useState(() => {
        // Load users from localStorage or use default
        const savedUsers = localStorage.getItem('adminUsers');
        console.log('Loading users from localStorage:', savedUsers);
        
        const defaultUsers = [
            { id: '1', name: 'John Smith', email: 'john@example.com', role: 'agent', plan: 'Solo Agent', status: 'active', lastLogin: '2024-01-15' },
            { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'manager', plan: 'Team Leader', status: 'active', lastLogin: '2024-01-14' },
            { id: '3', name: 'Mike Davis', email: 'mike@example.com', role: 'agent', plan: 'Solo Agent', status: 'inactive', lastLogin: '2024-01-10' }
        ];
        
        if (savedUsers) {
            try {
                return JSON.parse(savedUsers);
            } catch (error) {
                console.error('Error parsing saved users:', error);
                return defaultUsers;
            }
        }
        
        return defaultUsers;
    });

    // Add leads state with localStorage
    const [leads, setLeads] = useState(() => {
        const savedLeads = localStorage.getItem('adminLeads');
        console.log('Loading leads from localStorage:', savedLeads);
        
        const defaultLeads = [
            { id: '1', name: 'Alice Cooper', email: 'alice@example.com', phone: '(555) 123-4567', status: 'new', source: 'Website', notes: 'Interested in downtown properties', createdAt: '2024-01-15' },
            { id: '2', name: 'Bob Wilson', email: 'bob@example.com', phone: '(555) 987-6543', status: 'contacted', source: 'Referral', notes: 'Looking for family home', createdAt: '2024-01-14' },
            { id: '3', name: 'Carol Brown', email: 'carol@example.com', phone: '(555) 456-7890', status: 'qualified', source: 'Social Media', notes: 'First-time buyer', createdAt: '2024-01-13' }
        ];
        
        if (savedLeads) {
            try {
                return JSON.parse(savedLeads);
            } catch (error) {
                console.error('Error parsing saved leads:', error);
                return defaultLeads;
            }
        }
        
        return defaultLeads;
    });

    // Save users to localStorage whenever users change
    useEffect(() => {
        console.log('Saving users to localStorage:', users);
        localStorage.setItem('adminUsers', JSON.stringify(users));
    }, [users]);

    // Save leads to localStorage whenever leads change
    useEffect(() => {
        console.log('Saving leads to localStorage:', leads);
        localStorage.setItem('adminLeads', JSON.stringify(leads));
    }, [leads]);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const handleAddUser = async (userData: any) => {
        const newUser = {
            id: Date.now().toString(),
            ...userData,
            status: 'active',
            lastLogin: new Date().toISOString().split('T')[0]
        };
        
        setUsers(prev => [...prev, newUser]);
        console.log(`User ${userData.name} added successfully!`);
    };

    const handleEditUser = async (userData: any) => {
        setUsers(prev => prev.map(user => 
            user.id === userData.id ? { ...user, ...userData } : user
        ));
        console.log(`User ${userData.name} updated successfully!`);
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsers(prev => prev.filter(user => user.id !== userId));
            console.log('User deleted successfully!');
        }
    };

    const handleEditUserClick = (user: any) => {
        setEditingUser(user);
        setEditUserForm({
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'agent',
            plan: user.plan || 'Solo Agent'
        });
    };

    const handleAddLead = async (leadData: any) => {
        const newLead = {
            id: Date.now().toString(),
            ...leadData,
            createdAt: new Date().toISOString().split('T')[0]
        };
        
        setLeads(prev => [...prev, newLead]);
        console.log(`Lead ${leadData.name} added successfully!`);
    };

    const handleEditLead = async (leadData: any) => {
        setLeads(prev => prev.map(lead => 
            lead.id === leadData.id ? { ...lead, ...leadData } : lead
        ));
        console.log(`Lead ${leadData.name} updated successfully!`);
    };

    const handleDeleteLead = (leadId: string) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            setLeads(prev => prev.filter(lead => lead.id !== leadId));
            console.log('Lead deleted successfully!');
        }
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
                            onClick={() => setShowAddUserModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold shadow-sm hover:bg-green-700 transition"
                        >
                            <span className="material-symbols-outlined h-5 w-5">person_add</span>
                            Add User
                        </button>
                        <button 
                            onClick={() => setShowAddLeadModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 transition"
                        >
                            <span className="material-symbols-outlined h-5 w-5">person_add</span>
                            Add Lead
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
                        value={leads.length.toString()} 
                        change="+8%" 
                        icon="trending_up" 
                        iconBg="bg-green-500" 
                        changeUp={true} 
                    />
                    <MetricWidget 
                        title="Properties Listed" 
                        value="47" 
                        change="+15%" 
                        icon="home" 
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
                    <StatusWidget serviceName="API Server" status="Online" />
                    <StatusWidget serviceName="Database" status="Online" />
                    <StatusWidget serviceName="AI Services" status="Online" />
                </div>

                {/* Users Table */}
                <div className="bg-slate-800 rounded-lg border border-slate-700/50 mb-8">
                    <div className="px-6 py-4 border-b border-slate-700/50">
                        <h3 className="text-lg font-semibold text-white">Recent Users</h3>
                        <p className="text-sm text-slate-400">Manage platform users and their access</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-700/30">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Plan</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Last Login</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="bg-slate-800 border-b border-slate-700/50 hover:bg-slate-700/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                                                    <span className="text-white text-sm font-semibold">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{user.name}</div>
                                                    <div className="text-slate-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                                user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">{user.plan}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">{user.lastLogin}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditUserClick(user)}
                                                    className="text-blue-400 hover:text-blue-300 transition"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="text-red-400 hover:text-red-300 transition"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Leads Table */}
                <div className="bg-slate-800 rounded-lg border border-slate-700/50">
                    <div className="px-6 py-4 border-b border-slate-700/50">
                        <h3 className="text-lg font-semibold text-white">Recent Leads</h3>
                        <p className="text-sm text-slate-400">Track and manage potential clients</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-700/30">
                                <tr>
                                    <th className="px-6 py-3">Lead</th>
                                    <th className="px-6 py-3">Contact</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Source</th>
                                    <th className="px-6 py-3">Created</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <tr key={lead.id} className="bg-slate-800 border-b border-slate-700/50 hover:bg-slate-700/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                                                    <span className="text-white text-sm font-semibold">
                                                        {lead.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{lead.name}</div>
                                                    <div className="text-slate-400 text-xs">{lead.notes}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-300">{lead.email}</div>
                                            <div className="text-slate-400 text-xs">{lead.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                                lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                                lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">{lead.source}</td>
                                        <td className="px-6 py-4 text-slate-300">{lead.createdAt}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditLeadClick(lead)}
                                                    className="text-blue-400 hover:text-blue-300 transition"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLead(lead.id)}
                                                    className="text-red-400 hover:text-red-300 transition"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Centralized Modals */}
            <AdminModals
                users={users}
                leads={leads}
                onAddUser={handleAddUser}
                onEditUser={handleEditUser}
                onAddLead={handleAddLead}
                onEditLead={handleEditLead}
            />
        </div>
    );
};

export default AdminDashboard;
