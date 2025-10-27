import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Download,
  Filter,
  MessageCircle,
  Phone,
  Calendar,
  User,
  Eye,
  Trash2,
  Tag,
  Clock,
  Mic,
  ClipboardCheck,
  Share2,
  Volume2,
  Languages,
  Sparkles
} from 'lucide-react';

type ConversationType = 'chat' | 'voice' | 'email';
type ConversationStatus = 'active' | 'archived' | 'important' | 'follow-up';

interface ConversationMessage {
  id: string;
  sender: 'lead' | 'agent' | 'ai';
  timestamp: string;
  channel: ConversationType;
  text: string;
  translation?: {
    language: string;
    text: string;
  };
}

interface Conversation {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  type: ConversationType;
  lastMessage: string;
  timestamp: string;
  duration?: string;
  status: ConversationStatus;
  messageCount: number;
  property?: string;
  tags: string[];
  intent: 'Buyer' | 'Seller' | 'Investor' | 'Renter';
  language?: string;
  voiceTranscript?: string;
  followUpTask?: string;
  messages: ConversationMessage[];
}

const conversationSeed: Conversation[] = [
  {
    id: '1',
    contactName: 'John Smith',
    contactEmail: 'john.smith@email.com',
    contactPhone: '(555) 123-4567',
    type: 'chat',
    lastMessage: 'Thanks for the information about the 3-bedroom house. When can we schedule a viewing?',
    timestamp: '2024-01-20T14:30:00Z',
    status: 'follow-up',
    messageCount: 12,
    property: '742 Ocean Drive',
    tags: ['Hot Lead', 'Website Chat'],
    intent: 'Buyer',
    language: 'English',
    followUpTask: 'Confirm viewing availability for Saturday afternoon.',
    messages: [
      {
        id: '1',
        sender: 'lead',
        channel: 'chat',
        timestamp: '2024-01-20T14:12:00Z',
        text: 'Hi! I saw the listing at 742 Ocean Drive. Is it still available?'
      },
      {
        id: '2',
        sender: 'ai',
        channel: 'chat',
        timestamp: '2024-01-20T14:12:45Z',
        text: 'Yes, 742 Ocean Drive is currently active. Would you like to schedule a private showing?'
      },
      {
        id: '3',
        sender: 'lead',
        channel: 'chat',
        timestamp: '2024-01-20T14:13:05Z',
        text: 'Absolutely. Saturdays work best for me.'
      },
      {
        id: '4',
        sender: 'ai',
        channel: 'chat',
        timestamp: '2024-01-20T14:13:26Z',
        text: 'Great! I’ll alert your agent and they’ll confirm a Saturday slot shortly. Anything else I can share about the home?'
      },
      {
        id: '5',
        sender: 'lead',
        channel: 'chat',
        timestamp: '2024-01-20T14:29:18Z',
        text: 'No, that’s all. Thanks for the information about the 3-bedroom house. When can we schedule a viewing?'
      }
    ]
  },
  {
    id: '2',
    contactName: 'Sarah Johnson',
    contactEmail: 'sarah.j@email.com',
    contactPhone: '(555) 987-6543',
    type: 'voice',
    lastMessage: 'Voice conversation about luxury properties',
    timestamp: '2024-01-20T10:15:00Z',
    duration: '08:45',
    status: 'important',
    messageCount: 1,
    property: 'Skyline Penthouse',
    tags: ['Luxury Buyer', 'Voice Call'],
    intent: 'Buyer',
    language: 'Spanish',
    voiceTranscript:
      'Hola, me interesa la propiedad Skyline Penthouse. ¿Puedes enviarme más detalles y agendar un recorrido virtual?',
    messages: [
      {
        id: '1',
        sender: 'lead',
        channel: 'voice',
        timestamp: '2024-01-20T10:15:00Z',
        text: 'Voice memo received (8m45s)',
        translation: {
          language: 'Spanish',
          text: 'Hola, me interesa la propiedad Skyline Penthouse. ¿Puedes enviarme más detalles y agendar un recorrido virtual?'
        }
      },
      {
        id: '2',
        sender: 'ai',
        channel: 'voice',
        timestamp: '2024-01-20T10:24:00Z',
        text: 'Transcript and summary generated. Suggested follow-up email drafted.'
      }
    ]
  },
  {
    id: '3',
    contactName: 'Mike Davis',
    contactEmail: 'mike.davis@email.com',
    contactPhone: '(555) 456-7890',
    type: 'chat',
    lastMessage: "What's the price range for condos in downtown?",
    timestamp: '2024-01-19T16:45:00Z',
    status: 'active',
    messageCount: 8,
    tags: ['New Lead', 'Website Chat'],
    intent: 'Buyer',
    language: 'English',
    messages: [
      {
        id: '1',
        sender: 'lead',
        channel: 'chat',
        timestamp: '2024-01-19T16:40:00Z',
        text: "What's the price range for condos in downtown?"
      },
      {
        id: '2',
        sender: 'ai',
        channel: 'chat',
        timestamp: '2024-01-19T16:40:24Z',
        text: 'Downtown condos currently range from $480K to $1.2M. Do you prefer modern high-rises or historic lofts?'
      },
      {
        id: '3',
        sender: 'lead',
        channel: 'chat',
        timestamp: '2024-01-19T16:41:09Z',
        text: 'Modern high-rises ideally. I want amenities.'
      },
      {
        id: '4',
        sender: 'ai',
        channel: 'chat',
        timestamp: '2024-01-19T16:41:37Z',
        text: 'Great choice! I’ll prepare three high-rise options with amenities and ping your agent to follow up.'
      }
    ]
  },
  {
    id: '4',
    contactName: 'Emily Chen',
    contactEmail: 'emily.chen@email.com',
    contactPhone: '(555) 321-0987',
    type: 'voice',
    lastMessage: 'Discussed investment opportunities',
    timestamp: '2024-01-19T09:20:00Z',
    duration: '15:30',
    status: 'archived',
    messageCount: 1,
    tags: ['Investor', 'Voice Call'],
    intent: 'Investor',
    language: 'Mandarin',
    voiceTranscript:
      '你好，我正在寻找新的投资机会。对商业地产感兴趣，特别是有长期租户的写字楼。',
    messages: [
      {
        id: '1',
        sender: 'lead',
        channel: 'voice',
        timestamp: '2024-01-19T09:20:00Z',
        text: 'Voice memo received (15m30s)',
        translation: {
          language: 'Mandarin',
          text: '你好，我正在寻找新的投资机会。对商业地产感兴趣，特别是有长期租户的写字楼。'
        }
      },
      {
        id: '2',
        sender: 'ai',
        channel: 'voice',
        timestamp: '2024-01-19T09:38:00Z',
        text: 'Investment summary created. Suggested next step: share cap rate analysis PDF.'
      }
    ]
  }
];

const AIConversationsPage: React.FC = () => {
  const [conversations] = useState<Conversation[]>(conversationSeed);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | ConversationType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ConversationStatus>('all');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationSeed[0]?.id ?? null);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.property?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = filterType === 'all' || conv.type === filterType;
      const matchesStatus = filterStatus === 'all' || conv.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [conversations, searchQuery, filterType, filterStatus]);

  useEffect(() => {
    if (!selectedConversationId && filteredConversations.length > 0) {
      setSelectedConversationId(filteredConversations[0].id);
      setIsDetailExpanded(false);
    } else if (
      selectedConversationId &&
      filteredConversations.every(conv => conv.id !== selectedConversationId)
    ) {
      setSelectedConversationId(filteredConversations[0]?.id ?? null);
      setIsDetailExpanded(false);
    }
  }, [filteredConversations, selectedConversationId]);

  useEffect(() => {
    // Whenever we switch to a new conversation, collapse the deep dive panel
    setIsDetailExpanded(false);
  }, [selectedConversationId]);

  const selectedConversation = filteredConversations.find(conv => conv.id === selectedConversationId) ?? null;

  const stats = useMemo(() => {
    const total = conversations.length;
    const voiceMinutes = conversations
      .filter(conv => conv.type === 'voice')
      .reduce((sum, conv) => {
        if (!conv.duration) return sum;
        const [minutes, seconds] = conv.duration.split(':').map(Number);
        return sum + minutes + seconds / 60;
      }, 0);

    const followUps = conversations.filter(conv => conv.status === 'follow-up').length;
    const multilingual = conversations.filter(conv => conv.language && conv.language !== 'English').length;

    return {
      total,
      voiceMinutes: Math.round(voiceMinutes),
      followUps,
      multilingual
    };
  }, [conversations]);

  const handleExportConversations = () => {
    const csvContent = conversations
      .map(
        conv =>
          `"${conv.contactName}","${conv.contactEmail}","${conv.contactPhone}","${conv.type}","${conv.lastMessage}","${conv.timestamp}","${conv.status}","${conv.messageCount}","${conv.property || ''}","${conv.language || ''}","${conv.intent}"`
      )
      .join('\n');

    const blob = new Blob(
      [
        '"Name","Email","Phone","Type","Last Message","Timestamp","Status","Message Count","Property","Language","Intent"\n' +
          csvContent
      ],
      { type: 'text/csv' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-conversations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: ConversationType) => {
    switch (type) {
      case 'chat':
        return <MessageCircle className="w-4 h-4" />;
      case 'voice':
        return <Phone className="w-4 h-4" />;
      case 'email':
        return <User className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const typeBadgeStyles: Record<ConversationType, string> = {
    chat: 'bg-blue-50 text-blue-600 border border-blue-100',
    voice: 'bg-green-50 text-green-600 border border-green-100',
    email: 'bg-purple-50 text-purple-600 border border-purple-100'
  };

  const statusBadgeStyles: Record<ConversationStatus, string> = {
    active: 'bg-green-100 text-green-800',
    important: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
    'follow-up': 'bg-orange-100 text-orange-700'
  };

  const timelineColor = (sender: ConversationMessage['sender']) => {
    switch (sender) {
      case 'lead':
        return 'bg-blue-500';
      case 'agent':
        return 'bg-green-500';
      case 'ai':
      default:
        return 'bg-violet-500';
    }
  };

  const senderLabel = (sender: ConversationMessage['sender']) => {
    switch (sender) {
      case 'lead':
        return 'Lead';
      case 'agent':
        return 'Agent';
      case 'ai':
      default:
        return 'AI Sidekick';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-5 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AI Conversations Command Center</h1>
              <p className="text-slate-600 mt-1">
                One hub for every AI chat, voice note, translation, and follow-up.
              </p>
            </div>
            <button
              onClick={handleExportConversations}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Conversation CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Active Conversations</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</p>
            <p className="text-xs text-slate-400 mt-2">Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Voice Minutes Logged</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.voiceMinutes}</p>
            <p className="text-xs text-slate-400 mt-2">Automatic transcripts available for review</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Follow-ups Required</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">{stats.followUps}</p>
            <p className="text-xs text-slate-400 mt-2">Create tasks directly from the detail panel</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Multilingual Conversations</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.multilingual}</p>
            <p className="text-xs text-slate-400 mt-2">Auto-translated transcripts ready to share</p>
          </div>
        </div>
      </div>

      {/* Help panel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setIsHelpPanelOpen(prev => !prev)}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
          aria-expanded={isHelpPanelOpen}
        >
          <Sparkles className="w-4 h-4" />
          {isHelpPanelOpen ? 'Hide AI Conversation Tips' : 'Show AI Conversation Tips'}
          <span className="material-symbols-outlined text-base ml-auto">{isHelpPanelOpen ? 'expand_less' : 'expand_more'}</span>
        </button>
        {isHelpPanelOpen && (
          <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4" />
                Conversation Strategy
              </h2>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Focus on intent:</strong> Use the intent and tags to route warm leads to the right nurture path instantly.
                </li>
                <li>
                  <strong>Promote clarity:</strong> Translate voice notes automatically and share with collaborators in one click.
                </li>
                <li>
                  <strong>Keep history handy:</strong> Everything—chat, voice, follow-up—is archived under the same record for compliance.
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4" />
                Voice + Translation Workflow
              </h2>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Instant transcripts:</strong> Voice notes become searchable text, with original language preserved.
                </li>
                <li>
                  <strong>Share confidently:</strong> Download transcripts, send recaps, or generate tasks without leaving the page.
                </li>
                <li>
                  <strong>Pro tip:</strong> Pair your AI card QR with the conversation hub link so leads can pick up where they left off.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, property, or tag"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-500">Filter by</span>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Channels</option>
                <option value="chat">Chat</option>
                <option value="voice">Voice</option>
                <option value="email">Email</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="follow-up">Needs Follow-up</option>
                <option value="important">Important</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-6">
          {/* Conversation list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Inbox</h2>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
              {filteredConversations.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-500">
                  No conversations match your filters yet. Try adjusting your search.
                </div>
              )}
              {filteredConversations.map(conversation => {
                const isSelected = conversation.id === selectedConversationId;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full text-left px-4 sm:px-5 py-4 transition-all ${
                      isSelected ? 'bg-primary-50 border-l-4 border-primary-500 shadow-inner' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-lg ${typeBadgeStyles[conversation.type]}`}>
                          {getTypeIcon(conversation.type)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{conversation.contactName}</h3>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadgeStyles[conversation.status]}`}
                            >
                              {conversation.status.replace('-', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{conversation.contactEmail}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(conversation.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 line-clamp-2">{conversation.lastMessage}</p>
                    <div className="mt-3 flex items-center flex-wrap gap-2">
                      {conversation.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                      {conversation.property && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                          <Calendar className="w-3 h-3" />
                          {conversation.property}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 ml-auto">
                        <MessageCircle className="w-3 h-3" />
                        {conversation.messageCount}
                      </span>
                      {conversation.duration && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {conversation.duration}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {selectedConversation ? (
              <>
                <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{selectedConversation.contactName}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {selectedConversation.contactEmail}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedConversation.contactPhone}
                      </span>
                      {selectedConversation.property && (
                        <span className="inline-flex items-center gap-1 text-blue-600">
                          <Calendar className="w-3 h-3" />
                          {selectedConversation.property}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-violet-600">
                        <Tag className="w-3 h-3" />
                        {selectedConversation.intent} Intent
                      </span>
                      {selectedConversation.language && (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Languages className="w-3 h-3" />
                          {selectedConversation.language}
                        </span>
                      )}
                    </div>
                  </div>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                        <ClipboardCheck className="w-3 h-3" />
                        Create Task
                      </button>
                    <button className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                      <Share2 className="w-3 h-3" />
                      Share Recap
                    </button>
                      <button className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition">
                        <Trash2 className="w-3 h-3" />
                        Archive
                      </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 p-6">
                  {/* Timeline */}
                  <div className="space-y-6">
                    {!isDetailExpanded && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-600">
                        <p className="font-semibold text-slate-800 mb-2">Conversation Snapshot</p>
                        <p className="mb-2">{selectedConversation.lastMessage}</p>
                        <p className="text-xs text-slate-500">
                          Latest touch {new Date(selectedConversation.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. Expand to see the full message history,
                          translated transcripts, and action items.
                        </p>
                      </div>
                    )}

                    {isDetailExpanded && (
                      <>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Conversation Timeline
                          </h3>
                          <div className="space-y-4">
                            {selectedConversation.messages.map(message => (
                              <div key={message.id} className="flex items-start gap-3">
                                <div className="relative h-full">
                                  <div className={`w-2 h-2 rounded-full mt-2 ${timelineColor(message.sender)}`} />
                                  <div className="absolute left-[3px] top-4 bottom-0 w-[1px] bg-slate-200" />
                                </div>
                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-slate-600">
                                        {senderLabel(message.sender)}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {new Date(message.timestamp).toLocaleString([], {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${typeBadgeStyles[message.channel]}`}>
                                        {getTypeIcon(message.channel)}
                                        {message.channel.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">{message.text}</p>
                                  {message.translation && (
                                    <div className="mt-3 p-3 bg-white border border-amber-200 rounded-lg text-xs text-amber-700">
                                      <p className="font-semibold flex items-center gap-1 mb-1">
                                        <Languages className="w-3 h-3" />
                                        Translation ({message.translation.language})
                                      </p>
                                      <p className="text-slate-600">{message.translation.text}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedConversation.voiceTranscript && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <Mic className="w-4 h-4 text-slate-500" />
                              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Voice Transcript</h3>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{selectedConversation.voiceTranscript}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <button className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                                <Volume2 className="w-3 h-3" />
                                Play Audio
                              </button>
                              <button className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                                <Download className="w-3 h-3" />
                                Download Transcript
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Insights & Actions */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                        Highlights
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li>
                          <strong>Intent:</strong> {selectedConversation.intent}
                        </li>
                        <li>
                          <strong>Last activity:</strong>{' '}
                          {new Date(selectedConversation.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </li>
                        <li>
                          <strong>Preferred language:</strong>{' '}
                          {selectedConversation.language ?? 'English'}
                        </li>
                        <li>
                          <strong>Follow-up task:</strong>{' '}
                          {selectedConversation.followUpTask ?? 'No task assigned yet'}
                        </li>
                      </ul>
                      <button className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-100 rounded-lg hover:bg-primary-100 transition">
                        <ClipboardCheck className="w-3 h-3" />
                        Assign to Smart Task Manager
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                          Quick Actions
                        </h3>
                        <button
                          onClick={() => setIsDetailExpanded(prev => !prev)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 border border-primary-100 rounded-lg hover:bg-primary-50 transition"
                        >
                          {isDetailExpanded ? 'Hide Deep Dive' : 'Show Full Conversation'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Keep high level summary visible. Expand for the full timeline, transcripts, and workflow tools.
                      </p>
                      <div className="space-y-2">
                        <button className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                          <span>Send recap email to lead</span>
                          <Share2 className="w-3 h-3" />
                        </button>
                        <button className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                          <span>Log next touchpoint</span>
                          <Calendar className="w-3 h-3" />
                        </button>
                        <button className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                          <span>Create Smart Sequence</span>
                          <Sparkles className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {isDetailExpanded && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                          Voice Translation
                        </h3>
                        <p className="text-xs text-slate-500 mb-3">
                          Our AI automatically translates non-English voice notes so your team can respond without delay.
                        </p>
                        <div className="space-y-2">
                          <button className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                            <span>Generate English summary</span>
                            <Languages className="w-3 h-3" />
                          </button>
                          <button className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                            <span>Forward transcript to lender</span>
                            <Share2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-10 text-center text-slate-500 text-sm">
                Select a conversation to see its summary, transcript, and follow-up actions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConversationsPage;
