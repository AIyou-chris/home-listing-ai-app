import React, { useState } from 'react';
import { Search, Download, Filter, MessageCircle, Phone, Calendar, User, MoreVertical, Eye, Trash2 } from 'lucide-react';

interface Conversation {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  type: 'chat' | 'voice' | 'email';
  lastMessage: string;
  timestamp: string;
  duration?: string; // for voice calls
  status: 'active' | 'archived' | 'important';
  messageCount: number;
  property?: string;
}

const AIConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      contactName: 'John Smith',
      contactEmail: 'john.smith@email.com',
      contactPhone: '(555) 123-4567',
      type: 'chat',
      lastMessage: 'Thanks for the information about the 3-bedroom house. When can we schedule a viewing?',
      timestamp: '2024-01-20 14:30',
      status: 'active',
      messageCount: 12,
      property: '123 Oak Street'
    },
    {
      id: '2',
      contactName: 'Sarah Johnson',
      contactEmail: 'sarah.j@email.com',
      contactPhone: '(555) 987-6543',
      type: 'voice',
      lastMessage: 'Voice conversation about luxury properties',
      timestamp: '2024-01-20 10:15',
      duration: '8:45',
      status: 'important',
      messageCount: 1,
      property: '456 Pine Avenue'
    },
    {
      id: '3',
      contactName: 'Mike Davis',
      contactEmail: 'mike.davis@email.com',
      contactPhone: '(555) 456-7890',
      type: 'chat',
      lastMessage: 'What\'s the price range for condos in downtown?',
      timestamp: '2024-01-19 16:45',
      status: 'active',
      messageCount: 8
    },
    {
      id: '4',
      contactName: 'Emily Chen',
      contactEmail: 'emily.chen@email.com',
      contactPhone: '(555) 321-0987',
      type: 'voice',
      lastMessage: 'Discussed investment opportunities',
      timestamp: '2024-01-19 09:20',
      duration: '15:30',
      status: 'archived',
      messageCount: 1
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'chat' | 'voice' | 'email'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived' | 'important'>('all');

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.property?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || conv.type === filterType;
    const matchesStatus = filterStatus === 'all' || conv.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleExportConversations = () => {
    const csvContent = conversations.map(conv => 
      `"${conv.contactName}","${conv.contactEmail}","${conv.contactPhone}","${conv.type}","${conv.lastMessage}","${conv.timestamp}","${conv.status}","${conv.messageCount}","${conv.property || ''}"`
    ).join('\n');
    
    const blob = new Blob([`"Name","Email","Phone","Type","Last Message","Timestamp","Status","Messages","Property"\n${csvContent}`], 
                         { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-conversations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat': return <MessageCircle className="w-4 h-4" />;
      case 'voice': return <Phone className="w-4 h-4" />;
      case 'email': return <User className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'important': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const ConversationCard: React.FC<{ conversation: Conversation }> = ({ conversation }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${conversation.type === 'chat' ? 'bg-blue-100' : conversation.type === 'voice' ? 'bg-green-100' : 'bg-purple-100'}`}>
            {getTypeIcon(conversation.type)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{conversation.contactName}</h3>
            <p className="text-sm text-gray-500">{conversation.contactEmail}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(conversation.status)}`}>
            {conversation.status}
          </span>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-600 line-clamp-2">{conversation.lastMessage}</p>
        {conversation.property && (
          <p className="text-xs text-blue-600 mt-1">Property: {conversation.property}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(conversation.timestamp).toLocaleDateString()}</span>
          </span>
          <span>{conversation.messageCount} messages</span>
          {conversation.duration && (
            <span className="flex items-center space-x-1">
              <Phone className="w-3 h-3" />
              <span>{conversation.duration}</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <Eye className="w-3 h-3" />
          </button>
          <button className="p-1 hover:bg-red-100 rounded transition-colors text-red-500">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Conversations</h1>
              <p className="text-gray-600 mt-1">Manage all your AI chat and voice interactions</p>
            </div>
            <button
              onClick={handleExportConversations}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations, contacts, or properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="chat">Chat</option>
              <option value="voice">Voice</option>
              <option value="email">Email</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="important">Important</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{conversations.length}</div>
            <div className="text-sm text-gray-600">Total Conversations</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">
              {conversations.filter(c => c.type === 'chat').length}
            </div>
            <div className="text-sm text-gray-600">Chat Interactions</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">
              {conversations.filter(c => c.type === 'voice').length}
            </div>
            <div className="text-sm text-gray-600">Voice Calls</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">
              {conversations.filter(c => c.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active Leads</div>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredConversations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {filteredConversations.map(conversation => (
              <ConversationCard key={conversation.id} conversation={conversation} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
            <p className="text-gray-600">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Start chatting with prospects to see conversations here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIConversationsPage;
