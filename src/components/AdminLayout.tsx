import React from 'react';
import { View, User, UserStatus, Lead, LeadStatus } from '../types';
import AdminDashboard from './AdminDashboard';

interface AdminLayoutProps {
  currentView: View;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ currentView }) => {
  // Mock user data
  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      status: 'Active',
      role: 'agent',
      dateJoined: '2024-01-15',
      lastActive: '2024-08-09',
      plan: 'Pro Team',
      propertiesCount: 12,
      leadsCount: 45,
      aiInteractions: 234,
      profileImage: '',
      phone: '+1 (555) 123-4567',
      company: 'Smith Real Estate'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      status: 'Active',
      role: 'agent',
      dateJoined: '2024-02-20',
      lastActive: '2024-08-09',
      plan: 'Solo Agent',
      propertiesCount: 8,
      leadsCount: 32,
      aiInteractions: 156,
      profileImage: '',
      phone: '+1 (555) 987-6543',
      company: 'Johnson Properties'
    },
    {
      id: '3',
      name: 'Mike Davis',
      email: 'mike@example.com',
      status: 'Inactive',
      role: 'agent',
      dateJoined: '2024-03-10',
      lastActive: '2024-07-25',
      plan: 'Solo Agent',
      propertiesCount: 5,
      leadsCount: 18,
      aiInteractions: 89,
      profileImage: '',
      phone: '+1 (555) 456-7890',
      company: 'Davis Realty'
    },
    {
      id: '4',
      name: 'Emily Wilson',
      email: 'emily@example.com',
      status: 'Active',
      role: 'agent',
      dateJoined: '2024-04-05',
      lastActive: '2024-08-09',
      plan: 'Brokerage',
      propertiesCount: 25,
      leadsCount: 78,
      aiInteractions: 445,
      profileImage: '',
      phone: '+1 (555) 321-6540',
      company: 'Wilson & Associates'
    },
    {
      id: '5',
      name: 'David Brown',
      email: 'david@example.com',
      status: 'Pending',
      role: 'agent',
      dateJoined: '2024-08-01',
      lastActive: '2024-08-01',
      plan: 'Solo Agent',
      propertiesCount: 0,
      leadsCount: 0,
      aiInteractions: 0,
      profileImage: '',
      phone: '+1 (555) 789-0123',
      company: 'Brown Real Estate'
    }
  ];

  const UserStatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => {
    const statusStyles: Record<UserStatus, string> = {
      'Active': 'bg-green-100 text-green-700',
      'Inactive': 'bg-gray-100 text-gray-700',
      'Suspended': 'bg-red-100 text-red-700',
      'Pending': 'bg-yellow-100 text-yellow-700'
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>;
  };

  const handleUserDashboard = (userId: string) => {
    console.log('Navigate to user dashboard:', userId);
    // TODO: Implement navigation to user dashboard
  };

  // Mock leads data
  const mockLeads: Lead[] = [
    {
      id: '1',
      name: 'Jennifer Martinez',
      status: 'New',
      email: 'jennifer@example.com',
      phone: '+1 (555) 123-4567',
      date: '2024-08-09',
      lastMessage: 'Interested in 3-bedroom homes in the downtown area. Budget around $450k.'
    },
    {
      id: '2',
      name: 'Robert Chen',
      status: 'Qualified',
      email: 'robert@example.com',
      phone: '+1 (555) 987-6543',
      date: '2024-08-08',
      lastMessage: 'Looking for investment properties. Prefer multi-family units.'
    },
    {
      id: '3',
      name: 'Amanda Thompson',
      status: 'Contacted',
      email: 'amanda@example.com',
      phone: '+1 (555) 456-7890',
      date: '2024-08-07',
      lastMessage: 'Scheduled a showing for tomorrow at 2 PM. Very interested in the property.'
    },
    {
      id: '4',
      name: 'Michael Rodriguez',
      status: 'Showing',
      email: 'michael@example.com',
      phone: '+1 (555) 321-6540',
      date: '2024-08-06',
      lastMessage: 'Completed showing. Client loved the property and wants to make an offer.'
    },
    {
      id: '5',
      name: 'Lisa Wang',
      status: 'New',
      email: 'lisa@example.com',
      phone: '+1 (555) 789-0123',
      date: '2024-08-05',
      lastMessage: 'First-time homebuyer. Looking for starter homes under $300k.'
    },
    {
      id: '6',
      name: 'David Kim',
      status: 'Qualified',
      email: 'david@example.com',
      phone: '+1 (555) 654-3210',
      date: '2024-08-04',
      lastMessage: 'Relocating from California. Need a 4-bedroom home with good schools.'
    }
  ];

  const getLeadStatusStyle = (status: LeadStatus) => {
    const statusStyles: Record<LeadStatus, string> = {
      'New': 'bg-blue-100 text-blue-700',
      'Qualified': 'bg-green-100 text-green-700',
      'Contacted': 'bg-yellow-100 text-yellow-700',
      'Showing': 'bg-purple-100 text-purple-700',
      'Lost': 'bg-red-100 text-red-700'
    };
    return statusStyles[status];
  };

  const renderAdminContent = () => {
    switch (currentView) {
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'admin-users':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                <p className="text-slate-500 mt-1">Manage and support your platform users</p>
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105">
                <span className="material-symbols-outlined h-5 w-5">person_add</span>
                <span>Add New User</span>
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <span className="material-symbols-outlined h-6 w-6 text-blue-600">group</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900">{mockUsers.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100">
                    <span className="material-symbols-outlined h-6 w-6 text-green-600">person</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Active Users</p>
                    <p className="text-2xl font-bold text-slate-900">{mockUsers.filter(u => u.status === 'Active').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <span className="material-symbols-outlined h-6 w-6 text-purple-600">person_add</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">New This Month</p>
                    <p className="text-2xl font-bold text-slate-900">2</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-orange-100">
                    <span className="material-symbols-outlined h-6 w-6 text-orange-600">memory</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">AI Interactions</p>
                    <p className="text-2xl font-bold text-slate-900">924</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Users List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">Recent Users</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {mockUsers.map(user => (
                    <div key={user.id} className="p-4 rounded-lg hover:bg-slate-50 transition-colors border border-slate-200">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800">{user.name}</h4>
                            <p className="text-sm text-slate-500">{user.email}</p>
                            <p className="text-xs text-slate-400">{user.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserStatusBadge status={user.status} />
                          <button
                            onClick={() => handleUserDashboard(user.id)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">dashboard</span>
                            Dashboard
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-6 text-sm text-slate-500">
                        <span>Plan: {user.plan}</span>
                        <span>Properties: {user.propertiesCount}</span>
                        <span>Leads: {user.leadsCount}</span>
                        <span>AI: {user.aiInteractions}</span>
                        <span>Joined: {user.dateJoined}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'admin-leads':
        return (
          <>
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
              <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Platform Leads & Appointments</h1>
                  <p className="text-slate-500 mt-1">Manage all platform prospects and appointments.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition"
                  >
                    <span className="material-symbols-outlined w-5 h-5">add</span>
                    <span>Add New Lead</span>
                  </button>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold shadow-sm hover:bg-green-600 transition"
                  >
                    <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                    <span>Schedule Appointment</span>
                  </button>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition"
                  >
                    <span className="material-symbols-outlined w-5 h-5">download</span>
                    <span>Export Data</span>
                  </button>
                </div>
              </header>

              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
                  <div className="rounded-full p-3 bg-blue-100">
                    <span className="material-symbols-outlined w-6 h-6 text-blue-600">group</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">156</p>
                    <p className="text-sm font-medium text-slate-500">Total Leads</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
                  <div className="rounded-full p-3 bg-green-100">
                    <span className="material-symbols-outlined w-6 h-6 text-green-600">calendar_today</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">23</p>
                    <p className="text-sm font-medium text-slate-500">Appointments</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
                  <div className="rounded-full p-3 bg-purple-100">
                    <span className="material-symbols-outlined w-6 h-6 text-purple-600">check</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">12</p>
                    <p className="text-sm font-medium text-slate-500">Converted</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
                  <div className="rounded-full p-3 bg-orange-100">
                    <span className="material-symbols-outlined w-6 h-6 text-orange-600">schedule</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">8</p>
                    <p className="text-sm font-medium text-slate-500">Pending</p>
                  </div>
                </div>
              </section>
              
              <main>
                <div className="border-b border-slate-200 mb-6">
                  <nav className="flex space-x-2">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 border-primary-600 text-primary-600">
                      <span className="material-symbols-outlined w-5 h-5">group</span>
                      <span>Leads</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700">156</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors text-slate-500 hover:text-slate-800">
                      <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                      <span>Appointments</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">23</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors text-slate-500 hover:text-slate-800">
                      <span className="material-symbols-outlined w-5 h-5">analytics</span>
                      <span>Lead Scoring</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">0</span>
                    </button>
                  </nav>
                </div>
                
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

                <div className="space-y-6">
                  {mockLeads.map(lead => (
                    <div key={lead.id} className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 transition-all duration-300 hover:shadow-lg hover:border-slate-300">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
                          {lead.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-800 truncate">{lead.name}</h3>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getLeadStatusStyle(lead.status)}`}>{lead.status}</span>
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
                        <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition">
                          <span className="material-symbols-outlined w-5 h-5">contact_mail</span>
                          <span>Contact</span>
                        </button>
                        <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 transition">
                          <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                          <span>Schedule</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </main>
            </div>
          </>
        );
      case 'admin-ai-content':
        return (
          <div className="max-w-screen-2xl mx-auto py-4 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
            <header className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-slate-900">Platform AI Content Studio</h1>
            </header>
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto">
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap border-primary-600 text-primary-600">
                  <span className="material-symbols-outlined w-5 h-5">chat_bubble</span> 
                  <span>AI Content</span>
                </button>
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap border-transparent text-slate-500 hover:text-slate-700">
                  <span className="material-symbols-outlined w-5 h-5">analytics</span> 
                  <span>Property Reports</span>
                </button>
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap border-transparent text-slate-500 hover:text-slate-700">
                  <span className="material-symbols-outlined w-5 h-5">description</span> 
                  <span>Marketing Proposals</span>
                </button>
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap border-transparent text-slate-500 hover:text-slate-700">
                  <span className="material-symbols-outlined w-5 h-5">edit</span> 
                  <span>Blog & Articles</span>
                </button>
              </nav>
            </div>
            <div className="flex-grow bg-white rounded-b-xl shadow-lg border-x border-b border-slate-200/60 overflow-y-auto min-h-0">
              <div className="flex h-full bg-white">
                <div className="flex w-full md:flex flex-col md:w-1/3 lg:w-1/4 max-w-sm">
                  <div className="bg-slate-50 border-r border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Platform Conversations</h3>
                      <button className="flex items-center gap-1 px-3 py-1 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition">
                        <span className="material-symbols-outlined w-4 h-4">add</span>
                        <span>New Chat</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-primary-100 border-2 border-primary-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-primary-900 text-sm">Platform Overview</h4>
                          <span className="text-xs text-primary-600">2m ago</span>
                        </div>
                        <p className="text-primary-700 text-xs mt-1 truncate">System performance analysis and recommendations</p>
                      </div>
                      <div className="p-3 rounded-lg hover:bg-slate-100 cursor-pointer border-2 border-transparent">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900 text-sm">User Support</h4>
                          <span className="text-xs text-slate-500">1h ago</span>
                        </div>
                        <p className="text-slate-600 text-xs mt-1 truncate">Helping agents with platform features</p>
                      </div>
                      <div className="p-3 rounded-lg hover:bg-slate-100 cursor-pointer border-2 border-transparent">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900 text-sm">Market Analysis</h4>
                          <span className="text-xs text-slate-500">3h ago</span>
                        </div>
                        <p className="text-slate-600 text-xs mt-1 truncate">Regional market trends and insights</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex w-full md:flex flex-col flex-grow">
                  <div className="flex flex-col h-full">
                    <div className="flex-1 p-6 overflow-y-auto">
                      <div className="space-y-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                            AI
                          </div>
                          <div className="flex-1">
                            <div className="bg-slate-50 rounded-lg p-4">
                              <p className="text-slate-800">Hello! I'm your platform AI assistant. I can help you with:</p>
                              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                                <li>• Platform performance analysis</li>
                                <li>• User support and training</li>
                                <li>• Market insights and trends</li>
                                <li>• Content generation for agents</li>
                                <li>• System optimization recommendations</li>
                              </ul>
                              <p className="mt-3 text-slate-800">How can I assist you today?</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">2 minutes ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-200 p-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type your message..."
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2">
                          <span className="material-symbols-outlined w-5 h-5">send</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'admin-knowledge-base':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Knowledge Base Management</h1>
                <p className="text-slate-500 mt-1">Platform-wide knowledge base and AI personality management</p>
              </div>
            </header>
            
            <div className="border-b border-slate-200 mb-6">
              <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto">
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap border-primary-600 text-primary-600">
                  <span className="material-symbols-outlined w-5 h-5">auto_awesome</span> 
                  <span>God</span>
                </button>
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap border-transparent text-slate-500 hover:text-slate-700">
                  <span className="material-symbols-outlined w-5 h-5">trending_up</span> 
                  <span>Sales</span>
                </button>
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap border-transparent text-slate-500 hover:text-slate-700">
                  <span className="material-symbols-outlined w-5 h-5">support_agent</span> 
                  <span>Support</span>
                </button>
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap border-transparent text-slate-500 hover:text-slate-700">
                  <span className="material-symbols-outlined w-5 h-5">campaign</span> 
                  <span>Marketing</span>
                </button>
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap border-transparent text-slate-500 hover:text-slate-700">
                  <span className="material-symbols-outlined w-5 h-5">psychology</span> 
                  <span>AI Personalities</span>
                </button>
              </nav>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">🌟 God Knowledge Base</h2>
                <p className="text-slate-600">
                  Upload divine wisdom, spiritual insights, and transcendent knowledge that will elevate your platform's consciousness and understanding.
                </p>
              </div>

              {/* File Upload Area */}
              <div className="relative p-12 text-center bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border-2 border-dashed border-amber-300">
                <div className="flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-amber-400 mb-4">auto_awesome</span>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Divine Knowledge</h3>
                  <p className="text-slate-500 mb-6">Drag and drop spiritual and divine materials here, or click to browse</p>
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg shadow-sm hover:bg-amber-700 transition">
                    <span className="material-symbols-outlined w-5 h-5">upload</span>
                    Choose Files
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-8 space-y-6">
                <div className="p-6 border border-slate-200 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50">
                  <h4 className="font-semibold text-slate-900 mb-4">📝 Add Divine Content</h4>
                  <p className="text-sm text-slate-600 mb-4">Add spiritual wisdom, divine insights, and transcendent knowledge.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Content Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Divine Sales Wisdom"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Divine Content</label>
                      <textarea 
                        placeholder="Add divine wisdom and spiritual insights here..."
                        rows={6}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <button className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">
                      Add to God Knowledge Base
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'admin-marketing':
        return (
          <div className="bg-slate-50 min-h-full">
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
              <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Platform Marketing Center</h1>
                <p className="text-slate-500 mt-1">Automate platform outreach, create content, and track performance across all agents.</p>
              </header>
              
              <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                  <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap border-primary-600 text-primary-600">
                    <span className="material-symbols-outlined w-5 h-5">monitoring</span>
                    <span>Analytics</span>
                  </button>
                  <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700">
                    <span className="material-symbols-outlined w-5 h-5">lan</span>
                    <span>Follow-up Sequences</span>
                  </button>
                  <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700">
                    <span className="material-symbols-outlined w-5 h-5">group</span>
                    <span>Active Follow-ups</span>
                  </button>
                  <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700">
                    <span className="material-symbols-outlined w-5 h-5">qr_code_2</span>
                    <span>QR Code System</span>
                  </button>
                </nav>
              </div>
              
              <main className="mt-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Platform Analytics Overview</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition whitespace-nowrap">
                      <span className="material-symbols-outlined w-5 h-5">download</span>
                      <span>Export Report</span>
                    </button>
                  </div>
                  
                  {/* Analytics Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Total Leads</p>
                          <p className="text-2xl font-bold text-blue-900">1,247</p>
                          <p className="text-xs text-blue-600">+12% from last month</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-600">person_add</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Conversions</p>
                          <p className="text-2xl font-bold text-green-900">89</p>
                          <p className="text-xs text-green-600">+8% from last month</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-green-600">trending_up</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">QR Scans</p>
                          <p className="text-2xl font-bold text-purple-900">2,341</p>
                          <p className="text-xs text-purple-600">+23% from last month</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-purple-600">qr_code_scanner</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-600">Revenue</p>
                          <p className="text-2xl font-bold text-orange-900">$847K</p>
                          <p className="text-xs text-orange-600">+15% from last month</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-orange-600">payments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Platform Marketing Content */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-4">📊 Platform Marketing Performance</h4>
                      <p className="text-slate-600 mb-4">Monitor and manage marketing performance across all agents and properties.</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-300 transition">
                          <span className="material-symbols-outlined text-primary-600">campaign</span>
                          <div className="text-left">
                            <p className="font-semibold text-slate-900">Campaign Manager</p>
                            <p className="text-sm text-slate-600">Create platform-wide campaigns</p>
                          </div>
                        </button>
                        <button className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-300 transition">
                          <span className="material-symbols-outlined text-primary-600">analytics</span>
                          <div className="text-left">
                            <p className="font-semibold text-slate-900">Performance Analytics</p>
                            <p className="text-sm text-slate-600">Track agent performance</p>
                          </div>
                        </button>
                        <button className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-300 transition">
                          <span className="material-symbols-outlined text-primary-600">auto_awesome</span>
                          <div className="text-left">
                            <p className="font-semibold text-slate-900">AI Marketing</p>
                            <p className="text-sm text-slate-600">AI-powered marketing tools</p>
                          </div>
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="font-bold text-slate-900 mb-4">🚀 Platform Marketing Features</h4>
                      <p className="text-slate-600 mb-4">Advanced marketing tools and automation for platform-wide success.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <h5 className="font-semibold text-slate-900 mb-2">Follow-up Sequences</h5>
                          <p className="text-sm text-slate-600 mb-3">Automated follow-up sequences for all agents</p>
                          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Manage Sequences →</button>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <h5 className="font-semibold text-slate-900 mb-2">QR Code System</h5>
                          <p className="text-sm text-slate-600 mb-3">Generate and track QR codes for properties</p>
                          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Create QR Codes →</button>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <h5 className="font-semibold text-slate-900 mb-2">Lead Follow-ups</h5>
                          <p className="text-sm text-slate-600 mb-3">Track and manage active follow-ups</p>
                          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Follow-ups →</button>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <h5 className="font-semibold text-slate-900 mb-2">Analytics Dashboard</h5>
                          <p className="text-sm text-slate-600 mb-3">Comprehensive analytics and reporting</p>
                          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Analytics →</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        );
      case 'admin-analytics':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Platform Analytics</h1>
                <p className="text-slate-500 mt-1">Comprehensive analytics and performance insights across all agents</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">download</span>
                  Export Data
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">schedule</span>
                  Schedule Report
                </button>
              </div>
            </header>

            {/* Time Range Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-700">Time Range:</span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md font-medium">Last 30 Days</button>
                    <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Last 90 Days</button>
                    <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Last Year</button>
                    <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Custom</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined w-4 h-4">update</span>
                  Last updated: 2 minutes ago
                </div>
              </div>
            </div>

            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">group</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">+12%</span>
                </div>
                <h3 className="text-2xl font-bold text-blue-900 mb-1">1,247</h3>
                <p className="text-sm text-blue-600">Total Active Agents</p>
                <p className="text-xs text-blue-500 mt-2">+134 from last month</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">trending_up</span>
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">+8%</span>
                </div>
                <h3 className="text-2xl font-bold text-green-900 mb-1">$2.4M</h3>
                <p className="text-sm text-green-600">Platform Revenue</p>
                <p className="text-xs text-green-500 mt-2">+$180K from last month</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">home</span>
                  </div>
                  <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">+15%</span>
                </div>
                <h3 className="text-2xl font-bold text-purple-900 mb-1">8,934</h3>
                <p className="text-sm text-purple-600">Active Listings</p>
                <p className="text-xs text-purple-500 mt-2">+1,156 from last month</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600">person_add</span>
                  </div>
                  <span className="text-sm font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">+23%</span>
                </div>
                <h3 className="text-2xl font-bold text-orange-900 mb-1">15,678</h3>
                <p className="text-sm text-orange-600">Total Leads</p>
                <p className="text-xs text-orange-500 mt-2">+2,934 from last month</p>
              </div>
            </div>

            {/* Detailed Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Agent Performance */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Top Performing Agents</h3>
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Sarah Johnson', revenue: '$847K', leads: 234, conversion: '12.3%', avatar: 'SJ' },
                    { name: 'Mike Chen', revenue: '$723K', leads: 198, conversion: '11.8%', avatar: 'MC' },
                    { name: 'Emily Rodriguez', revenue: '$689K', leads: 187, conversion: '10.9%', avatar: 'ER' },
                    { name: 'David Kim', revenue: '$612K', leads: 165, conversion: '9.7%', avatar: 'DK' },
                    { name: 'Lisa Thompson', revenue: '$598K', leads: 142, conversion: '8.9%', avatar: 'LT' }
                  ].map((agent, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-700">{agent.avatar}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{agent.name}</h4>
                          <p className="text-sm text-slate-600">{agent.leads} leads • {agent.conversion} conversion</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{agent.revenue}</p>
                        <p className="text-xs text-slate-500">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Health */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Platform Health</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">System Uptime</span>
                      <span className="text-sm font-bold text-green-600">99.9%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.9%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">AI Response Time</span>
                      <span className="text-sm font-bold text-blue-600">1.2s</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">User Satisfaction</span>
                      <span className="text-sm font-bold text-purple-600">4.8/5</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '96%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Data Accuracy</span>
                      <span className="text-sm font-bold text-orange-600">98.5%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Trends */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Trends</h3>
                <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">show_chart</span>
                    <p className="text-slate-500">Revenue chart visualization</p>
                    <p className="text-sm text-slate-400">Monthly growth: +15%</p>
                  </div>
                </div>
              </div>

              {/* Lead Sources */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Lead Sources</h3>
                <div className="space-y-4">
                  {[
                    { source: 'Website', percentage: 45, color: 'bg-blue-500' },
                    { source: 'Social Media', percentage: 28, color: 'bg-green-500' },
                    { source: 'Referrals', percentage: 15, color: 'bg-purple-500' },
                    { source: 'Direct', percentage: 12, color: 'bg-orange-500' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                        <span className="text-sm font-medium text-slate-700">{item.source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Recent Platform Activity</h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
              </div>
              <div className="space-y-4">
                {[
                  { action: 'New agent registered', user: 'John Smith', time: '2 minutes ago', type: 'registration' },
                  { action: 'Property listing added', user: 'Sarah Johnson', time: '5 minutes ago', type: 'listing' },
                  { action: 'Lead converted', user: 'Mike Chen', time: '12 minutes ago', type: 'conversion' },
                  { action: 'AI interaction completed', user: 'Emily Rodriguez', time: '18 minutes ago', type: 'ai' },
                  { action: 'Payment processed', user: 'David Kim', time: '25 minutes ago', type: 'payment' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'registration' ? 'bg-blue-100' :
                      activity.type === 'listing' ? 'bg-green-100' :
                      activity.type === 'conversion' ? 'bg-purple-100' :
                      activity.type === 'ai' ? 'bg-orange-100' : 'bg-indigo-100'
                    }`}>
                      <span className={`material-symbols-outlined w-4 h-4 ${
                        activity.type === 'registration' ? 'text-blue-600' :
                        activity.type === 'listing' ? 'text-green-600' :
                        activity.type === 'conversion' ? 'text-purple-600' :
                        activity.type === 'ai' ? 'text-orange-600' : 'text-indigo-600'
                      }`}>
                        {activity.type === 'registration' ? 'person_add' :
                         activity.type === 'listing' ? 'home' :
                         activity.type === 'conversion' ? 'trending_up' :
                         activity.type === 'ai' ? 'psychology' : 'payments'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{activity.action}</p>
                      <p className="text-sm text-slate-600">by {activity.user}</p>
                    </div>
                    <span className="text-sm text-slate-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'admin-security':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Platform Security Center</h1>
                <p className="text-slate-500 mt-1">Comprehensive security monitoring, threat detection, and access control</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">security</span>
                  Emergency Lockdown
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">download</span>
                  Security Report
                </button>
              </div>
            </header>

            {/* Security Tab Navigation */}
            <div className="border-b border-slate-200 mb-6">
              <nav className="-mb-px flex space-x-6 overflow-x-auto">
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap border-primary-600 text-primary-600">
                  <span className="material-symbols-outlined w-5 h-5">security</span>
                  <span>Security</span>
                </button>
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700">
                  <span className="material-symbols-outlined w-5 h-5">monitoring</span>
                  <span>System Health</span>
                </button>
              </nav>
            </div>

            {/* Security Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">security</span>
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">Secure</span>
                </div>
                <h3 className="text-2xl font-bold text-green-900 mb-1">99.9%</h3>
                <p className="text-sm text-green-600">System Security</p>
                <p className="text-xs text-green-500 mt-2">All systems operational</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">visibility</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Active</span>
                </div>
                <h3 className="text-2xl font-bold text-blue-900 mb-1">24/7</h3>
                <p className="text-sm text-blue-600">Threat Monitoring</p>
                <p className="text-xs text-blue-500 mt-2">Real-time protection</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600">warning</span>
                  </div>
                  <span className="text-sm font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">3 Alerts</span>
                </div>
                <h3 className="text-2xl font-bold text-orange-900 mb-1">Low Risk</h3>
                <p className="text-sm text-orange-600">Active Threats</p>
                <p className="text-xs text-orange-500 mt-2">Automatically handled</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">verified_user</span>
                  </div>
                  <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">2FA</span>
                </div>
                <h3 className="text-2xl font-bold text-purple-900 mb-1">98.5%</h3>
                <p className="text-sm text-purple-600">Users Protected</p>
                <p className="text-xs text-purple-500 mt-2">Multi-factor enabled</p>
              </div>
            </div>

            {/* Security Monitoring Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Real-time Threat Monitoring */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Real-time Security Events</h3>
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
                </div>
                <div className="space-y-4">
                  {[
                    { event: 'Failed login attempt', user: 'unknown@example.com', time: '2 min ago', severity: 'low', ip: '192.168.1.100' },
                    { event: 'Suspicious file upload', user: 'agent_123', time: '5 min ago', severity: 'medium', ip: '10.0.0.50' },
                    { event: 'Multiple login attempts', user: 'admin@company.com', time: '12 min ago', severity: 'high', ip: '203.0.113.45' },
                    { event: 'Data export request', user: 'manager_456', time: '18 min ago', severity: 'low', ip: '172.16.0.25' },
                    { event: 'API rate limit exceeded', user: 'bot_detected', time: '25 min ago', severity: 'medium', ip: '198.51.100.75' }
                  ].map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          event.severity === 'high' ? 'bg-red-100' :
                          event.severity === 'medium' ? 'bg-orange-100' : 'bg-blue-100'
                        }`}>
                          <span className={`material-symbols-outlined w-4 h-4 ${
                            event.severity === 'high' ? 'text-red-600' :
                            event.severity === 'medium' ? 'text-orange-600' : 'text-blue-600'
                          }`}>
                            {event.severity === 'high' ? 'warning' :
                             event.severity === 'medium' ? 'info' : 'check_circle'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{event.event}</h4>
                          <p className="text-sm text-slate-600">User: {event.user} • IP: {event.ip}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          event.severity === 'high' ? 'bg-red-100 text-red-700' :
                          event.severity === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {event.severity.toUpperCase()}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Controls */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Security Controls</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">lock</span>
                      <span className="text-sm font-medium text-slate-900">SSL/TLS Encryption</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">shield</span>
                      <span className="text-sm font-medium text-slate-900">Firewall Protection</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">verified_user</span>
                      <span className="text-sm font-medium text-slate-900">2FA Enforcement</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">backup</span>
                      <span className="text-sm font-medium text-slate-900">Auto Backup</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">security</span>
                      <span className="text-sm font-medium text-slate-900">Rate Limiting</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Access Control */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Access Control Management</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Role-Based Access</h4>
                      <p className="text-sm text-slate-600">Manage user permissions by role</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      Configure
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">IP Whitelisting</h4>
                      <p className="text-sm text-slate-600">Restrict access to trusted IPs</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      Manage
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Session Management</h4>
                      <p className="text-sm text-slate-600">Control active sessions</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      View
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Password Policies</h4>
                      <p className="text-sm text-slate-600">Enforce strong passwords</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      Configure
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Protection */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Data Protection</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Data Encryption</h4>
                      <p className="text-sm text-slate-600">AES-256 encryption at rest</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Backup Encryption</h4>
                      <p className="text-sm text-slate-600">Encrypted daily backups</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Data Retention</h4>
                      <p className="text-sm text-slate-600">Automated data cleanup</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      Configure
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">GDPR Compliance</h4>
                      <p className="text-sm text-slate-600">Data privacy controls</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">Compliant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Security Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Authentication</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Require 2FA for all users</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Session timeout (30 min)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Password complexity rules</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Monitoring</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Failed login alerts</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Suspicious activity detection</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">API usage monitoring</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Protection</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Rate limiting enabled</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">CSRF protection</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">XSS protection</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'admin-billing':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Billing & Retention Management</h1>
                <p className="text-slate-500 mt-1">Monitor subscriptions, track renewals, and manage retention campaigns</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">download</span>
                  Export Report
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">add</span>
                  Create Campaign
                </button>
              </div>
            </header>

            {/* Billing Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">payments</span>
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">+8%</span>
                </div>
                <h3 className="text-2xl font-bold text-green-900 mb-1">$847K</h3>
                <p className="text-sm text-green-600">Monthly Revenue</p>
                <p className="text-xs text-green-500 mt-2">+$62K from last month</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">group</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">1,247</span>
                </div>
                <h3 className="text-2xl font-bold text-blue-900 mb-1">94.2%</h3>
                <p className="text-sm text-blue-600">Renewal Rate</p>
                <p className="text-xs text-blue-500 mt-2">1,174 active subscriptions</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600">warning</span>
                  </div>
                  <span className="text-sm font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">73</span>
                </div>
                <h3 className="text-2xl font-bold text-orange-900 mb-1">5.8%</h3>
                <p className="text-sm text-orange-600">Churn Rate</p>
                <p className="text-xs text-orange-500 mt-2">73 non-renewals this month</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">schedule</span>
                  </div>
                  <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">156</span>
                </div>
                <h3 className="text-2xl font-bold text-purple-900 mb-1">$23K</h3>
                <p className="text-sm text-purple-600">At Risk Revenue</p>
                <p className="text-xs text-purple-500 mt-2">156 renewals due this week</p>
              </div>
            </div>

            {/* Renewal Tracking & Follow-up Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Upcoming Renewals */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Upcoming Renewals & Follow-ups</h3>
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Sarah Johnson', plan: 'Pro Team', amount: '$299', daysLeft: -2, status: 'overdue', followUp: 'Day 1 Recovery' },
                    { name: 'Mike Chen', plan: 'Solo Agent', amount: '$99', daysLeft: -1, status: 'overdue', followUp: 'Day 1 Recovery' },
                    { name: 'Emily Rodriguez', plan: 'Brokerage', amount: '$599', daysLeft: 0, status: 'due', followUp: 'Renewal Day' },
                    { name: 'David Kim', plan: 'Pro Team', amount: '$299', daysLeft: 1, status: 'upcoming', followUp: 'Pre-renewal' },
                    { name: 'Lisa Thompson', plan: 'Solo Agent', amount: '$99', daysLeft: 2, status: 'upcoming', followUp: 'Pre-renewal' }
                  ].map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-700">{customer.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{customer.name}</h4>
                          <p className="text-sm text-slate-600">{customer.plan} • {customer.amount}/month</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${
                          customer.status === 'overdue' ? 'text-red-600' :
                          customer.status === 'due' ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {customer.daysLeft < 0 ? `${Math.abs(customer.daysLeft)} days overdue` :
                           customer.daysLeft === 0 ? 'Due today' : `${customer.daysLeft} days`}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{customer.followUp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up Campaign Status */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Follow-up Campaign Status</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-900">Pre-renewal (2 days)</h4>
                      <span className="text-sm font-bold text-green-600">Active</span>
                    </div>
                    <p className="text-sm text-green-700 mb-3">Email reminder sent to 23 customers</p>
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Opened: 18 (78%)</span>
                      <span>Clicked: 12 (52%)</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-orange-900">Renewal Day</h4>
                      <span className="text-sm font-bold text-orange-600">Active</span>
                    </div>
                    <p className="text-sm text-orange-700 mb-3">Email sent to 5 customers</p>
                    <div className="flex justify-between text-xs text-orange-600">
                      <span>Delivered: 5 (100%)</span>
                      <span>Responded: 2 (40%)</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-red-900">Day 1 Recovery</h4>
                      <span className="text-sm font-bold text-red-600">Active</span>
                    </div>
                    <p className="text-sm text-red-700 mb-3">Phone call + Email to 2 customers</p>
                    <div className="flex justify-between text-xs text-red-600">
                      <span>Called: 2 (100%)</span>
                      <span>Reconnected: 1 (50%)</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-purple-900">Day 3 Recovery</h4>
                      <span className="text-sm font-bold text-purple-600">Scheduled</span>
                    </div>
                    <p className="text-sm text-purple-700 mb-3">Final offer + Phone call</p>
                    <div className="text-xs text-purple-600">
                      <span>Starts in 2 days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Retention Campaign Management */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Retention Campaign Management</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">add</span>
                  Create New Campaign
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Pre-renewal Campaign */}
                <div className="p-6 border border-slate-200 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600">schedule</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Pre-renewal</h4>
                      <p className="text-sm text-slate-600">2 days before</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trigger:</span>
                      <span className="font-semibold">2 days before</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Channel:</span>
                      <span className="font-semibold">Email</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">78%</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition text-sm font-medium">
                    Edit Campaign
                  </button>
                </div>

                {/* Renewal Day Campaign */}
                <div className="p-6 border border-slate-200 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-600">event</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Renewal Day</h4>
                      <p className="text-sm text-slate-600">Day of renewal</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trigger:</span>
                      <span className="font-semibold">Renewal day</span>
                    </div>
                                         <div className="flex justify-between">
                       <span className="text-slate-600">Channel:</span>
                       <span className="font-semibold">Email</span>
                     </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">85%</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 px-3 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition text-sm font-medium">
                    Edit Campaign
                  </button>
                </div>

                {/* Day 1 Recovery */}
                <div className="p-6 border border-slate-200 rounded-lg bg-gradient-to-br from-red-50 to-rose-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-600">phone</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Day 1 Recovery</h4>
                      <p className="text-sm text-slate-600">1 day after</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trigger:</span>
                      <span className="font-semibold">1 day after</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Channel:</span>
                      <span className="font-semibold">Phone + Email</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">45%</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition text-sm font-medium">
                    Edit Campaign
                  </button>
                </div>

                {/* Day 3 Recovery */}
                <div className="p-6 border border-slate-200 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-purple-600">campaign</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Day 3 Recovery</h4>
                      <p className="text-sm text-slate-600">3 days after</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trigger:</span>
                      <span className="font-semibold">3 days after</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Channel:</span>
                      <span className="font-semibold">Phone + Offer</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">25%</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition text-sm font-medium">
                    Edit Campaign
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Recovery Successes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Recent Recovery Successes</h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'John Smith', plan: 'Pro Team', recovered: '2 days ago', method: 'Phone call', value: '$299/month' },
                  { name: 'Maria Garcia', plan: 'Solo Agent', recovered: '1 day ago', method: 'Email offer', value: '$99/month' },
                                     { name: 'Robert Wilson', plan: 'Brokerage', recovered: '3 days ago', method: 'Email reminder', value: '$599/month' },
                  { name: 'Jennifer Lee', plan: 'Pro Team', recovered: '5 days ago', method: 'Phone call', value: '$299/month' }
                ].map((success, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-green-600">check_circle</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{success.name}</h4>
                        <p className="text-sm text-slate-600">{success.plan} • {success.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{success.value}</p>
                      <p className="text-xs text-slate-500">{success.recovered}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'admin-settings':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">System Settings & Configuration</h1>
                <p className="text-slate-500 mt-1">Centralized control for all platform settings and configurations</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">backup</span>
                  Backup Config
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">save</span>
                  Save All Changes
                </button>
              </div>
            </header>

            {/* Settings Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 mb-8">
              <div className="border-b border-slate-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'general', label: 'General', icon: 'settings' },
                    { id: 'security', label: 'Security', icon: 'security' },
                    { id: 'billing', label: 'Billing', icon: 'payments' },
                    { id: 'ai', label: 'AI Settings', icon: 'smart_toy' },
                    { id: 'email', label: 'Email & Notifications', icon: 'email' },
                    { id: 'integrations', label: 'Integrations', icon: 'integration_instructions' },
                    { id: 'appearance', label: 'Appearance', icon: 'palette' },
                    { id: 'advanced', label: 'Advanced', icon: 'tune' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                        tab.id === 'general' 
                          ? 'border-primary-500 text-primary-600' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined w-5 h-5">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* General Settings */}
              <div className="p-6">
                <div className="space-y-8">
                  {/* Platform Information */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Platform Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Platform Name</label>
                        <input
                          type="text"
                          defaultValue="Home Listing AI"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Platform URL</label>
                        <input
                          type="url"
                          defaultValue="https://homelistingai.com"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Support Email</label>
                        <input
                          type="email"
                          defaultValue="support@homelistingai.com"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                          <option>UTC (Coordinated Universal Time)</option>
                          <option>EST (Eastern Standard Time)</option>
                          <option>PST (Pacific Standard Time)</option>
                          <option>CST (Central Standard Time)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* User Management */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">User Management</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Default User Role</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                          <option>Solo Agent</option>
                          <option>Pro Team</option>
                          <option>Brokerage</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Trial Period (Days)</label>
                        <input
                          type="number"
                          defaultValue="14"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max Properties per User</label>
                        <input
                          type="number"
                          defaultValue="100"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max AI Interactions per Day</label>
                        <input
                          type="number"
                          defaultValue="50"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Feature Toggles</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">AI Content Generation</h4>
                          <p className="text-sm text-slate-600">Enable AI-powered content creation for all users</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">Voice Assistant</h4>
                          <p className="text-sm text-slate-600">Enable voice-based AI interactions</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">QR Code System</h4>
                          <p className="text-sm text-slate-600">Enable QR code generation for properties</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">Analytics Dashboard</h4>
                          <p className="text-sm text-slate-600">Enable advanced analytics for all users</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">Knowledge Base</h4>
                          <p className="text-sm text-slate-600">Enable custom knowledge base creation</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* System Limits */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">System Limits & Performance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max File Upload Size (MB)</label>
                        <input
                          type="number"
                          defaultValue="10"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Session Timeout (Minutes)</label>
                        <input
                          type="number"
                          defaultValue="120"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max Concurrent Users</label>
                        <input
                          type="number"
                          defaultValue="1000"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">API Rate Limit (per minute)</label>
                        <input
                          type="number"
                          defaultValue="100"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Mode */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Maintenance & Updates</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <h4 className="font-semibold text-orange-900">Maintenance Mode</h4>
                          <p className="text-sm text-orange-700">Temporarily disable platform access for maintenance</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <h4 className="font-semibold text-blue-900">Auto Updates</h4>
                          <p className="text-sm text-blue-700">Automatically apply system updates during low traffic</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Alerts & Messaging */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">System Alerts & Messaging</h3>
                  <p className="text-slate-600">Monitor system health and send platform-wide messages</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold hover:bg-yellow-200 transition">
                    <span className="material-symbols-outlined w-5 h-5">notifications</span>
                    View All Alerts
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                    <span className="material-symbols-outlined w-5 h-5">send</span>
                    Send Message
                  </button>
                </div>
              </div>

              {/* Alert Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-600 w-5 h-5">check_circle</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-900">All Systems</p>
                      <p className="text-xs text-green-600">Operational</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-yellow-600 w-5 h-5">warning</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-yellow-900">3 Warnings</p>
                      <p className="text-xs text-yellow-600">Monitor</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-600 w-5 h-5">error</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-orange-900">1 Critical</p>
                      <p className="text-xs text-orange-600">Action Required</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600 w-5 h-5">message</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">2 Messages</p>
                      <p className="text-xs text-blue-600">Pending</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Alerts */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-900 mb-4">Active Alerts (Yellow & Above)</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-600 w-4 h-4">error</span>
                      </div>
                      <div>
                        <p className="font-semibold text-red-900">Database Connection Slow</p>
                                                 <p className="text-sm text-red-700">Response time &gt; 2s for 15 minutes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600">2 min ago</p>
                      <button className="text-xs text-red-600 hover:text-red-800 font-medium">Acknowledge</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-yellow-600 w-4 h-4">warning</span>
                      </div>
                      <div>
                        <p className="font-semibold text-yellow-900">High CPU Usage</p>
                        <p className="text-sm text-yellow-700">Server CPU at 85% for 10 minutes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-600">5 min ago</p>
                      <button className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">Acknowledge</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-yellow-600 w-4 h-4">warning</span>
                      </div>
                      <div>
                        <p className="font-semibold text-yellow-900">AI Service Latency</p>
                        <p className="text-sm text-yellow-700">Average response time 3.2s</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-600">12 min ago</p>
                      <button className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">Acknowledge</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-yellow-600 w-4 h-4">warning</span>
                      </div>
                      <div>
                        <p className="font-semibold text-yellow-900">Storage Space</p>
                        <p className="text-sm text-yellow-700">85% of storage capacity used</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-600">25 min ago</p>
                      <button className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">Acknowledge</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Broadcast Message System */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Send Platform Message</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Message Type</label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                      <option>General Announcement</option>
                      <option>Maintenance Notice</option>
                      <option>Feature Update</option>
                      <option>Emergency Alert</option>
                      <option>System Status</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Priority Level</label>
                    <div className="flex gap-3">
                      <label className="flex items-center">
                        <input type="radio" name="priority" value="low" className="mr-2" />
                        <span className="text-sm text-slate-600">Low</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="priority" value="medium" className="mr-2" defaultChecked />
                        <span className="text-sm text-slate-600">Medium</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="priority" value="high" className="mr-2" />
                        <span className="text-sm text-slate-600">High</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="priority" value="urgent" className="mr-2" />
                        <span className="text-sm text-slate-600">Urgent</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label>
                    <div className="flex gap-3">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-2" />
                        <span className="text-sm text-slate-600">All Users</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm text-slate-600">Solo Agents</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm text-slate-600">Pro Teams</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm text-slate-600">Brokerages</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Message Title</label>
                    <input
                      type="text"
                      placeholder="Enter message title..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Message Content</label>
                    <textarea
                      rows={4}
                      placeholder="Enter your message content..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    ></textarea>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                      <span className="material-symbols-outlined w-5 h-5">schedule</span>
                      Schedule
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                      <span className="material-symbols-outlined w-5 h-5">send</span>
                      Send Now
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-600">warning</span>
                  </div>
                  <h3 className="font-bold text-slate-900">Emergency Actions</h3>
                </div>
                <div className="space-y-3">
                  <button className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition text-sm font-medium">
                    Emergency Lockdown
                  </button>
                  <button className="w-full px-3 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition text-sm font-medium">
                    Force Logout All Users
                  </button>
                  <button className="w-full px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition text-sm font-medium">
                    Disable All AI Services
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">backup</span>
                  </div>
                  <h3 className="font-bold text-slate-900">Data Management</h3>
                </div>
                <div className="space-y-3">
                  <button className="w-full px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition text-sm font-medium">
                    Backup Database
                  </button>
                  <button className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition text-sm font-medium">
                    Export User Data
                  </button>
                  <button className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition text-sm font-medium">
                    Clear Cache
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">monitoring</span>
                  </div>
                  <h3 className="font-bold text-slate-900">System Health</h3>
                </div>
                <div className="space-y-3">
                  <button className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition text-sm font-medium">
                    Run Diagnostics
                  </button>
                  <button className="w-full px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition text-sm font-medium">
                    Check API Status
                  </button>
                  <button className="w-full px-3 py-2 bg-cyan-100 text-cyan-700 rounded-md hover:bg-cyan-200 transition text-sm font-medium">
                    Test Email System
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <AdminDashboard />;
    }
  };

  return renderAdminContent();
};

export default AdminLayout;
