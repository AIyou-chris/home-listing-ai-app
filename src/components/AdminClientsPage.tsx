import React, { useState } from 'react';
import { AgentProfile, Property, Lead, Appointment, LeadStatus } from '../types';
import ContactLeadModal from './ContactLeadModal';

interface AdminClientsPageProps {
  agentProfile: AgentProfile;
  properties: Property[];
  leads: Lead[];
  appointments: Appointment[];
  onSelectProperty: (id: string) => void;
  onAddNew: () => void;
  onBackToDashboard: () => void;
}

interface Client {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: 'active' | 'trial' | 'suspended';
  joinDate: string;
  lastLogin: string;
  properties: number;
  leads: number;
  revenue: number;
  dashboardUrl: string;
  lastMessage?: string;
}

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

const ClientStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusStyles: Record<string, string> = {
        'active': 'bg-green-100 text-green-700',
        'trial': 'bg-blue-100 text-blue-700',
        'suspended': 'bg-red-100 text-red-700'
    };
    return (
        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusStyles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

const ClientsList: React.FC<{ 
  clients: Client[]; 
  onContact: (client: Client) => void; 
  onViewDashboard: (client: Client) => void; 
}> = ({ clients, onContact, onViewDashboard }) => (
    <div className="space-y-6">
        {clients.map(client => (
            <div key={client.id} className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 transition-all duration-300 hover:shadow-lg hover:border-slate-300">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
                        {client.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-800 truncate">{client.name}</h3>
                            <ClientStatusBadge status={client.status} />
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                            <span className="material-symbols-outlined w-5 h-5 text-slate-400">calendar_today</span>
                            <span>Joined: {client.joinDate}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                            <span>Plan: {client.plan}</span>
                            <span>Properties: {client.properties}</span>
                            <span>Revenue: ${client.revenue.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {client.lastMessage && (
                    <div className="mt-4 pt-4 border-t border-slate-200/80">
                         <div className="p-4 bg-slate-50/70 rounded-lg border-l-4 border-primary-300">
                             <div className="flex items-start gap-3 text-sm text-slate-600">
                                 <span className="material-symbols-outlined w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5">format_quote</span>
                                <p className="italic">{client.lastMessage}</p>
                            </div>
                         </div>
                    </div>
                )}
                <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-end gap-3">
                    <button
                        onClick={() => onContact(client)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">contact_mail</span>
                        <span>Contact</span>
                    </button>
                    <button
                        onClick={() => onViewDashboard(client)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-500 rounded-lg shadow-sm hover:bg-purple-600 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">dashboard</span>
                        <span>Dashboard</span>
                    </button>
                </div>
            </div>
        ))}
    </div>
);

const BroadcastMessageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSend: (subject: string, message: string) => void;
  clientCount: number;
}> = ({ isOpen, onClose, onSend, clientCount }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    
    setIsSending(true);
    try {
      await onSend(subject, message);
      setSubject('');
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error sending broadcast:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Broadcast Message</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <p className="text-slate-600 mt-2">
            Send a message to all {clientCount} active clients
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., New Feature: AI-Powered Lead Scoring"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              rows={8}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {subject && message && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-medium text-slate-700 mb-2">Preview:</h4>
              <div className="bg-white rounded border border-slate-200 p-4">
                <div className="text-sm text-slate-500 mb-1">Subject: {subject}</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{message}</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              This will be sent to {clientCount} active clients
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!subject.trim() || !message.trim() || isSending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">send</span>
                    Send to All Clients
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const STATUS_OPTIONS = ['all', 'active', 'trial', 'suspended'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const AdminClientsPage: React.FC<AdminClientsPageProps> = ({
  agentProfile: _agentProfile,
  properties: _properties,
  leads: _leads,
  appointments: _appointments,
  onSelectProperty: _onSelectProperty,
  onAddNew: _onAddNew,
  onBackToDashboard
}) => {
  void (_agentProfile, _properties, _leads, _appointments, _onSelectProperty, _onAddNew);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Mock client data - in real app this would come from your database
  const mockClients: Client[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      plan: 'Solo Agent',
      status: 'active',
      joinDate: '2024-01-15',
      lastLogin: '2024-08-16',
      properties: 12,
      leads: 45,
      revenue: 2070,
      dashboardUrl: '/dashboard?client=sarah-johnson',
      lastMessage: 'Having trouble with the AI content generator. Can you help me optimize it for my listings?'
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike.chen@example.com',
      plan: 'Team Agent',
      status: 'active',
      joinDate: '2024-02-20',
      lastLogin: '2024-08-15',
      properties: 8,
      leads: 32,
      revenue: 1840,
      dashboardUrl: '/dashboard?client=mike-chen',
      lastMessage: 'The appointment scheduling feature is working great! My team loves it.'
    },
    {
      id: '3',
      name: 'Lisa Rodriguez',
      email: 'lisa.rodriguez@example.com',
      plan: 'Solo Agent',
      status: 'trial',
      joinDate: '2024-08-10',
      lastLogin: '2024-08-16',
      properties: 3,
      leads: 12,
      revenue: 0,
      dashboardUrl: '/dashboard?client=lisa-rodriguez',
      lastMessage: 'Still exploring the features. The lead scoring is really helpful!'
    },
    {
      id: '4',
      name: 'David Thompson',
      email: 'david.thompson@example.com',
      plan: 'Solo Agent',
      status: 'suspended',
      joinDate: '2024-03-05',
      lastLogin: '2024-08-01',
      properties: 6,
      leads: 28,
      revenue: 920,
      dashboardUrl: '/dashboard?client=david-thompson',
      lastMessage: 'Need help with billing. Payment didn\'t go through this month.'
    }
  ];

  const filteredClients = mockClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeClients = mockClients.filter(client => client.status === 'active');

  const handleContact = (client: Client) => {
    setSelectedClient(client);
    setIsContactModalOpen(true);
  };

  const handleViewDashboard = (client: Client) => {
    window.open(client.dashboardUrl, '_blank');
  };

  const handleCloseContactModal = () => {
    setIsContactModalOpen(false);
    setSelectedClient(null);
  };

  const handleBroadcastMessage = async (subject: string, message: string) => {
    // In a real app, this would send emails to all active clients
    console.log('Broadcasting message to all clients:', { subject, message });
    
    // Simulate sending emails
    const promises = activeClients.map(() =>
      new Promise((resolve) => setTimeout(resolve, Math.random() * 1000))
    );
    
    await Promise.all(promises);
    
    // Show success message
    alert(`✅ Message sent successfully to ${activeClients.length} active clients!`);
  };

  return (
    <div className="min-h-screen bg-green-50">
      <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
            <p className="text-slate-500 mt-1">Manage active paying clients and access their dashboards</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all duration-300"
            >
              <span className="material-symbols-outlined h-5 w-5">campaign</span>
              <span>Broadcast Message</span>
            </button>
            <button
              onClick={onBackToDashboard}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-700 transition-all duration-300"
            >
              <span className="material-symbols-outlined h-5 w-5">arrow_back</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Clients" value={mockClients.length} icon="group" iconBgColor="bg-green-100" />
          <StatCard title="Active Clients" value={mockClients.filter(c => c.status === 'active').length} icon="check_circle" iconBgColor="bg-blue-100" />
          <StatCard title="Total Revenue" value={`$${mockClients.reduce((sum, client) => sum + client.revenue, 0).toLocaleString()}`} icon="trending_up" iconBgColor="bg-purple-100" />
          <StatCard title="Trial Clients" value={mockClients.filter(c => c.status === 'trial').length} icon="schedule" iconBgColor="bg-orange-100" />
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  if (STATUS_OPTIONS.includes(value as StatusFilter)) {
                    setStatusFilter(value as StatusFilter);
                  }
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Clients ({filteredClients.length})</h2>
          </div>
          <ClientsList 
            clients={filteredClients} 
            onContact={handleContact}
            onViewDashboard={handleViewDashboard}
          />
        </div>
      </div>

      {/* Contact Modal */}
      {selectedClient && isContactModalOpen && (
        <ContactLeadModal
          lead={{
            id: selectedClient.id,
            name: selectedClient.name,
            email: selectedClient.email,
            phone: '',
            status: 'New' as LeadStatus,
            date: selectedClient.joinDate,
            lastMessage: selectedClient.lastMessage || ''
          }}
          onClose={handleCloseContactModal}
          onSchedule={() => {}}
        />
      )}

      {/* Broadcast Message Modal */}
      <BroadcastMessageModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSend={handleBroadcastMessage}
        clientCount={activeClients.length}
      />
    </div>
  );
};

export default AdminClientsPage;
