import React, { useState, useEffect } from 'react';
// Removed unused auth import

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
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newUserForm, setNewUserForm] = useState({
        name: '',
        email: '',
        role: 'agent',
        plan: 'Solo Agent'
    });
    const [editUserForm, setEditUserForm] = useState({
        name: '',
        email: '',
        role: 'agent',
        plan: 'Solo Agent'
    });
    
    // Add leads state and modals
    const [showAddLeadModal, setShowAddLeadModal] = useState(false);
    const [showEditLeadModal, setShowEditLeadModal] = useState(false);
    const [showContactLeadModal, setShowContactLeadModal] = useState(false);
    const [showScheduleLeadModal, setShowScheduleLeadModal] = useState(false);
    const [editingLead, setEditingLead] = useState<any>(null);
    const [contactingLead, setContactingLead] = useState<any>(null);
    const [schedulingLead, setSchedulingLead] = useState<any>(null);
    const [newLeadForm, setNewLeadForm] = useState({
        name: '',
        email: '',
        phone: '',
        status: 'New',
        source: '',
        notes: ''
    });
    const [editLeadForm, setEditLeadForm] = useState({
        name: '',
        email: '',
        phone: '',
        status: 'New',
        source: '',
        notes: ''
    });
    
    const [users, setUsers] = useState(() => {
        // Load users from localStorage or use default
        const savedUsers = localStorage.getItem('adminUsers');
        console.log('Loading users from localStorage:', savedUsers);
        
        if (savedUsers) {
            try {
                const parsed = JSON.parse(savedUsers);
                console.log('Parsed users:', parsed);
                return parsed;
            } catch (error) {
                console.error('Error parsing saved users:', error);
            }
        }
        
        const defaultUsers = [
            { id: 1, name: 'John Doe', email: 'john@example.com', role: 'agent', status: 'Active', dateJoined: '2024-01-15' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'admin', status: 'Active', dateJoined: '2024-01-10' },
            { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'agent', status: 'Trial', dateJoined: '2024-01-20' }
        ];
        console.log('Using default users:', defaultUsers);
        return defaultUsers;
    });

    // Add leads state with localStorage
    const [leads, setLeads] = useState(() => {
        const savedLeads = localStorage.getItem('adminLeads');
        console.log('Loading leads from localStorage:', savedLeads);
        
        if (savedLeads) {
            try {
                const parsed = JSON.parse(savedLeads);
                console.log('Parsed leads:', parsed);
                return parsed;
            } catch (error) {
                console.error('Error parsing saved leads:', error);
            }
        }
        
        const defaultLeads = [
            { id: 'lead-1', name: 'Michael Scott', status: 'New', email: 'm.scott@example.com', phone: '(555) 111-2222', date: '2024-01-15', lastMessage: "Interested in the Miami villa. Is the price negotiable?", source: 'Website', notes: 'High priority lead' },
            { id: 'lead-2', name: 'Pam Beesly', status: 'Qualified', email: 'p.beesly@example.com', phone: '(555) 222-3333', date: '2024-01-14', lastMessage: "Pre-approved for $900k, looking for a condo in Chicago.", source: 'Zillow', notes: 'Ready to buy' },
            { id: 'lead-3', name: 'Jim Halpert', status: 'Contacted', email: 'j.halpert@example.com', phone: '(555) 333-4444', date: '2024-01-13', lastMessage: "Left voicemail regarding the Aspen cabin.", source: 'Referral', notes: 'Follow up needed' },
            { id: 'lead-4', name: 'Dwight Schrute', status: 'Showing', email: 'd.schrute@example.com', phone: '(555) 444-5555', date: '2024-01-12', lastMessage: "Scheduled showing for this weekend.", source: 'Facebook', notes: 'Interested in farm properties' },
            { id: 'lead-5', name: 'Angela Martin', status: 'Lost', email: 'a.martin@example.com', phone: '(555) 555-6666', date: '2024-01-11', lastMessage: "Decided to keep renting for another year.", source: 'Open House', notes: 'May reconsider in 6 months' }
        ];
        console.log('Using default leads:', defaultLeads);
        return defaultLeads;
    });

    useEffect(() => {
        // Simulate loading
        setTimeout(() => {
            setIsLoading(false);
        }, 1000);
    }, []);

    const handleAddUser = async () => {
        if (!newUserForm.name || !newUserForm.email) {
            alert('Please fill in both name and email');
            return;
        }

        // Generate unique ID based on current timestamp and random number
        const newId = Date.now() + Math.floor(Math.random() * 1000);
        
        // Simple local user addition (no Firebase Functions needed)
        const newUser = {
            id: newId,
            name: newUserForm.name,
            email: newUserForm.email,
            role: newUserForm.role,
            status: 'Active',
            dateJoined: new Date().toISOString().split('T')[0]
        };

        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        
        // Save to localStorage with debugging
        console.log('Saving users to localStorage:', updatedUsers);
        localStorage.setItem('adminUsers', JSON.stringify(updatedUsers));
        
        // Verify it was saved
        const saved = localStorage.getItem('adminUsers');
        console.log('Verified saved data:', saved);
        
        alert(`User ${newUserForm.name} added successfully!`);
        
        // Reset form and close modal
        setNewUserForm({
            name: '',
            email: '',
            role: 'agent',
            plan: 'Solo Agent'
        });
        setShowAddUserModal(false);
    };

    const handleLogout = () => {
        window.location.href = '/';
    };

    const handleDeleteUser = (userId: number) => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            const updatedUsers = users.filter((user: any) => user.id !== userId);
            setUsers(updatedUsers);
            localStorage.setItem('adminUsers', JSON.stringify(updatedUsers));
            console.log('User deleted from localStorage:', userId);
        }
    };

    const handleEditUser = (user: any) => {
        console.log('Edit button clicked for user:', user);
        setEditingUser(user);
        setEditUserForm({
            name: user.name,
            email: user.email,
            role: user.role,
            plan: user.plan || 'Solo Agent'
        });
        setShowEditUserModal(true);
        console.log('Edit modal should be open now');
    };

    const handleSaveEdit = () => {
        console.log('Save edit called with:', { editingUser, editUserForm });
        
        if (!editingUser || !editUserForm.name || !editUserForm.email) {
            alert('Please fill in both name and email');
            return;
        }

        const updatedUsers = users.map((user: any) => 
            user.id === editingUser.id 
                ? { ...user, ...editUserForm }
                : user
        );
        
        console.log('Updated users array:', updatedUsers);
        setUsers(updatedUsers);
        localStorage.setItem('adminUsers', JSON.stringify(updatedUsers));
        console.log('User updated in localStorage:', editingUser.id);
        
        alert(`User ${editUserForm.name} updated successfully!`);
        setShowEditUserModal(false);
        setEditingUser(null);
    };

    // Lead management functions
    const handleAddLead = async () => {
        if (!newLeadForm.name || !newLeadForm.email) {
            alert('Please fill in both name and email');
            return;
        }

        const newId = `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const newLead = {
            id: newId,
            name: newLeadForm.name,
            email: newLeadForm.email,
            phone: newLeadForm.phone,
            status: newLeadForm.status,
            source: newLeadForm.source,
            notes: newLeadForm.notes,
            date: new Date().toISOString().split('T')[0],
            lastMessage: newLeadForm.notes || 'New lead added'
        };

        const updatedLeads = [...leads, newLead];
        setLeads(updatedLeads);
        
        console.log('Saving leads to localStorage:', updatedLeads);
        localStorage.setItem('adminLeads', JSON.stringify(updatedLeads));
        
        alert(`Lead ${newLeadForm.name} added successfully!`);
        
        setNewLeadForm({
            name: '',
            email: '',
            phone: '',
            status: 'New',
            source: '',
            notes: ''
        });
        setShowAddLeadModal(false);
    };

    const handleDeleteLead = (leadId: string) => {
        if (confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
            const updatedLeads = leads.filter((lead: any) => lead.id !== leadId);
            setLeads(updatedLeads);
            localStorage.setItem('adminLeads', JSON.stringify(updatedLeads));
            console.log('Lead deleted from localStorage:', leadId);
        }
    };

    const handleEditLead = (lead: any) => {
        console.log('Edit button clicked for lead:', lead);
        setEditingLead(lead);
        setEditLeadForm({
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            status: lead.status,
            source: lead.source || '',
            notes: lead.notes || ''
        });
        setShowEditLeadModal(true);
    };

    const handleSaveLeadEdit = () => {
        console.log('Save lead edit called with:', { editingLead, editLeadForm });
        
        if (!editingLead || !editLeadForm.name || !editLeadForm.email) {
            alert('Please fill in both name and email');
            return;
        }

        const updatedLeads = leads.map((lead: any) => 
            lead.id === editingLead.id 
                ? { ...lead, ...editLeadForm }
                : lead
        );
        
        console.log('Updated leads array:', updatedLeads);
        setLeads(updatedLeads);
        localStorage.setItem('adminLeads', JSON.stringify(updatedLeads));
        console.log('Lead updated in localStorage:', editingLead.id);
        
        alert(`Lead ${editLeadForm.name} updated successfully!`);
        setShowEditLeadModal(false);
        setEditingLead(null);
    };

    const handleContactLead = (lead: any) => {
        setContactingLead(lead);
        setShowContactLeadModal(true);
    };

    const handleScheduleLead = (lead: any) => {
        setSchedulingLead(lead);
        setShowScheduleLeadModal(true);
    };

    if (isLoading) {
        return (
            <div className="bg-slate-900 min-h-full p-4 sm:p-6 lg:p-8 text-slate-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 min-h-full p-4 sm:p-6 lg:p-8 text-slate-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-slate-400 mt-1">Simple and functional admin panel</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowAddUserModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold shadow-sm hover:bg-green-700 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">person_add</span>
                        <span>Add User</span>
                    </button>
                    <button 
                        onClick={() => setShowAddLeadModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">person_search</span>
                        <span>Add Lead</span>
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-600 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">refresh</span>
                        <span>Refresh</span>
                    </button>
                    <button 
                        onClick={() => {
                            localStorage.removeItem('adminUsers');
                            localStorage.removeItem('adminLeads');
                            alert('Storage cleared! Refresh the page to see default data.');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold shadow-sm hover:bg-yellow-700 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">clear_all</span>
                        <span>Clear Storage</span>
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold shadow-sm hover:bg-red-700 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">logout</span>
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Status Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatusWidget serviceName="Api" status="Online" />
                <StatusWidget serviceName="Database" status="Online" />
                <StatusWidget serviceName="AI" status="Online" />
                <StatusWidget serviceName="Email" status="Online" />
            </div>

            {/* Metric Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricWidget title="Total Users" value={users.length.toString()} change="+23%" changeUp={true} icon="group" iconBg="bg-blue-500" />
                <MetricWidget title="Total Leads" value={leads.length.toString()} change="+15%" changeUp={true} icon="person_search" iconBg="bg-green-500" />
                <MetricWidget title="Active Users" value={users.filter((u: any) => u.status === 'Active').length.toString()} change="+12%" changeUp={true} icon="home_work" iconBg="bg-pink-500" />
                <MetricWidget title="Qualified Leads" value={leads.filter((l: any) => l.status === 'Qualified' || l.status === 'Showing').length.toString()} change="+8%" changeUp={true} icon="check_circle" iconBg="bg-purple-500" />
            </div>

            {/* Users Table */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700/50 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">group</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">User Management</h3>
                        <p className="text-slate-400 text-sm">Manage all platform users</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Date Joined</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                    <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                                    <td className="px-6 py-4 text-slate-300">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            user.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                                        }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">{user.dateJoined}</td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleEditUser(user)}
                                            className="text-blue-400 hover:text-blue-300 mr-2"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">person_search</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Lead Management</h3>
                        <p className="text-slate-400 text-sm">Manage all platform leads</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Phone</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Source</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead) => (
                                <tr key={lead.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                    <td className="px-6 py-4 font-medium text-white">{lead.name}</td>
                                    <td className="px-6 py-4 text-slate-300">{lead.email}</td>
                                    <td className="px-6 py-4 text-slate-300">{lead.phone}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            lead.status === 'New' ? 'bg-blue-500/20 text-blue-300' :
                                            lead.status === 'Qualified' ? 'bg-green-500/20 text-green-300' :
                                            lead.status === 'Contacted' ? 'bg-yellow-500/20 text-yellow-300' :
                                            lead.status === 'Showing' ? 'bg-purple-500/20 text-purple-300' :
                                            'bg-red-500/20 text-red-300'
                                        }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">{lead.source || '-'}</td>
                                    <td className="px-6 py-4 text-slate-300">{lead.date}</td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleContactLead(lead)}
                                            className="text-blue-400 hover:text-blue-300 mr-2"
                                        >
                                            Contact
                                        </button>
                                        <button 
                                            onClick={() => handleScheduleLead(lead)}
                                            className="text-green-400 hover:text-green-300 mr-2"
                                        >
                                            Schedule
                                        </button>
                                        <button 
                                            onClick={() => handleEditLead(lead)}
                                            className="text-yellow-400 hover:text-yellow-300 mr-2"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteLead(lead.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddUserModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Add New User</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newUserForm.name}
                                    onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter user name"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={newUserForm.email}
                                    onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter user email"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                                <select
                                    value={newUserForm.role}
                                    onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="agent">Agent</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleAddUser}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                            >
                                Add User
                            </button>
                            <button
                                onClick={() => setShowAddUserModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditUserModal && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Edit User</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={editUserForm.name}
                                    onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter user name"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={editUserForm.email}
                                    onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter user email"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                                <select
                                    value={editUserForm.role}
                                    onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="agent">Agent</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Plan</label>
                                <select
                                    value={editUserForm.plan}
                                    onChange={(e) => setEditUserForm({...editUserForm, plan: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="Solo Agent">Solo Agent</option>
                                    <option value="Team Agent">Team Agent</option>
                                    <option value="Enterprise">Enterprise</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    console.log('Save button clicked!');
                                    handleSaveEdit();
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => {
                                    setShowEditUserModal(false);
                                    setEditingUser(null);
                                }}
                                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Lead Modal */}
            {showAddLeadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Add New Lead</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newLeadForm.name}
                                    onChange={(e) => setNewLeadForm({...newLeadForm, name: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter lead name"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={newLeadForm.email}
                                    onChange={(e) => setNewLeadForm({...newLeadForm, email: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter lead email"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                                <input
                                    type="tel"
                                    value={newLeadForm.phone}
                                    onChange={(e) => setNewLeadForm({...newLeadForm, phone: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter phone number"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                                <select
                                    value={newLeadForm.status}
                                    onChange={(e) => setNewLeadForm({...newLeadForm, status: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="New">New</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Showing">Showing</option>
                                    <option value="Lost">Lost</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Source</label>
                                <input
                                    type="text"
                                    value={newLeadForm.source}
                                    onChange={(e) => setNewLeadForm({...newLeadForm, source: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Website, Zillow, Referral"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                                <textarea
                                    value={newLeadForm.notes}
                                    onChange={(e) => setNewLeadForm({...newLeadForm, notes: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Add any notes about this lead"
                                    rows={3}
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleAddLead}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                            >
                                Add Lead
                            </button>
                            <button
                                onClick={() => setShowAddLeadModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Lead Modal */}
            {showEditLeadModal && editingLead && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Edit Lead</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={editLeadForm.name}
                                    onChange={(e) => setEditLeadForm({...editLeadForm, name: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter lead name"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={editLeadForm.email}
                                    onChange={(e) => setEditLeadForm({...editLeadForm, email: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter lead email"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                                <input
                                    type="tel"
                                    value={editLeadForm.phone}
                                    onChange={(e) => setEditLeadForm({...editLeadForm, phone: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter phone number"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                                <select
                                    value={editLeadForm.status}
                                    onChange={(e) => setEditLeadForm({...editLeadForm, status: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="New">New</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Showing">Showing</option>
                                    <option value="Lost">Lost</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Source</label>
                                <input
                                    type="text"
                                    value={editLeadForm.source}
                                    onChange={(e) => setEditLeadForm({...editLeadForm, source: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Website, Zillow, Referral"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                                <textarea
                                    value={editLeadForm.notes}
                                    onChange={(e) => setEditLeadForm({...editLeadForm, notes: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Add any notes about this lead"
                                    rows={3}
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveLeadEdit}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => {
                                    setShowEditLeadModal(false);
                                    setEditingLead(null);
                                }}
                                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Lead Modal */}
            {showContactLeadModal && contactingLead && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Contact Lead</h3>
                        
                        <div className="space-y-4">
                            <div className="bg-slate-700 rounded-lg p-4">
                                <h4 className="font-semibold text-white mb-2">{contactingLead.name}</h4>
                                <p className="text-slate-300 text-sm">{contactingLead.email}</p>
                                <p className="text-slate-300 text-sm">{contactingLead.phone}</p>
                                <p className="text-slate-300 text-sm">Status: {contactingLead.status}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                                <textarea
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Type your message here..."
                                    rows={4}
                                />
                            </div>
                            
                            <div className="flex gap-2">
                                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                                    Send Email
                                </button>
                                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
                                    Call Now
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => handleScheduleLead(contactingLead)}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                            >
                                Schedule Meeting
                            </button>
                            <button
                                onClick={() => setShowContactLeadModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Lead Modal */}
            {showScheduleLeadModal && schedulingLead && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Schedule Meeting</h3>
                        
                        <div className="space-y-4">
                            <div className="bg-slate-700 rounded-lg p-4">
                                <h4 className="font-semibold text-white mb-2">{schedulingLead.name}</h4>
                                <p className="text-slate-300 text-sm">{schedulingLead.email}</p>
                                <p className="text-slate-300 text-sm">{schedulingLead.phone}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Meeting Type</label>
                                <select className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="showing">Property Showing</option>
                                    <option value="consultation">Consultation</option>
                                    <option value="virtual">Virtual Tour</option>
                                    <option value="followup">Follow-up</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Time</label>
                                <input
                                    type="time"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                                <textarea
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Add meeting notes..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    alert('Meeting scheduled successfully!');
                                    setShowScheduleLeadModal(false);
                                }}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                            >
                                Schedule Meeting
                            </button>
                            <button
                                onClick={() => setShowScheduleLeadModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
