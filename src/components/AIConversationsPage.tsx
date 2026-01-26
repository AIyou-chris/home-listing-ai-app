import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  Filter,
  MessageCircle,
  Phone,
  User,
  Eye,
  Trash2,
  Tag,
  Clock,
  Sparkles,
  ClipboardCheck,
  Languages,
  Volume2
} from 'lucide-react';
import {
  listConversations,
  getMessages,
  deleteConversation,
  exportConversationsCSV,
  type ConversationRow,
  type MessageRow
} from '../services/chatService';
import { supabase } from '../services/supabase';
import { DEMO_CONVERSATIONS, DEMO_MESSAGES } from '../demoConstants';

type ConversationType = 'chat' | 'voice' | 'email';
type ConversationStatus = 'active' | 'archived' | 'important' | 'follow-up';

interface ConversationSummary {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  type: ConversationType;
  lastMessage: string;
  timestamp: string;
  duration?: string | null;
  status: ConversationStatus;
  messageCount: number;
  property?: string;
  tags: string[];
  intent?: string;
  language?: string;
  voiceTranscript?: string;
  followUpTask?: string;
  recordingUrl?: string;
}

interface ConversationMessage {
  id: string;
  sender: 'lead' | 'agent' | 'ai';
  channel: ConversationType;
  timestamp: string;
  text: string;
  translation?: {
    language: string;
    text: string;
  };
}

interface ConversationMetadata extends Record<string, unknown> {
  duration?: string | null;
  recordingUrl?: string | null;
}

interface MessageTranslation {
  language: string;
  text: string;
}

const parseConversationMetadata = (metadata: unknown): ConversationMetadata => {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  const record = { ...(metadata as Record<string, unknown>) };

  // Extract known fields
  const duration = typeof record.duration === 'string' ? record.duration : null;
  const recordingUrl = typeof record.recordingUrl === 'string' ? record.recordingUrl :
    (record.call as { recordingUrl?: string })?.recordingUrl;

  return {
    ...record,
    duration,
    recordingUrl: recordingUrl || null
  };
};

const parseMessageTranslation = (translation: unknown): MessageTranslation | undefined => {
  if (!translation || typeof translation !== 'object') {
    return undefined;
  }

  const record = translation as Record<string, unknown>;
  const language = typeof record.language === 'string'
    ? record.language
    : typeof record.lang === 'string'
      ? record.lang
      : 'Translated';

  const textCandidate = record.text ?? record.content;
  if (typeof textCandidate === 'string') {
    return { language, text: textCandidate };
  }

  if (textCandidate !== undefined) {
    try {
      return { language, text: JSON.stringify(textCandidate) };
    } catch (error) {
      console.warn('Failed to stringify translation payload', error);
    }
  }

  return undefined;
};

const mapFilterTypeValue = (value: string): ConversationType | 'all' => {
  const allowed: Array<ConversationType | 'all'> = ['chat', 'voice', 'email', 'all'];
  return allowed.includes(value as ConversationType | 'all') ? (value as ConversationType | 'all') : 'all';
};

const mapFilterStatusValue = (value: string): ConversationStatus | 'all' => {
  const allowed: Array<ConversationStatus | 'all'> = ['active', 'archived', 'important', 'follow-up', 'all'];
  return allowed.includes(value as ConversationStatus | 'all') ? (value as ConversationStatus | 'all') : 'all';
};

const mapConversationRowToSummary = (row: ConversationRow): ConversationSummary => {
  const metadata = parseConversationMetadata(row.metadata);
  return {
    id: row.id,
    contactName: row.contact_name || 'Unknown Contact',
    contactEmail: row.contact_email || '',
    contactPhone: row.contact_phone || '',
    type: (row.type as ConversationType) || 'chat',
    lastMessage: row.last_message || '',
    timestamp: row.last_message_at || row.created_at,
    duration: (typeof metadata.duration === 'string' || metadata.duration === null) ? metadata.duration : null,
    status: (row.status as ConversationStatus) || 'active',
    messageCount: row.message_count || 0,
    property: row.property || undefined,
    tags: row.tags || [],
    intent: row.intent || undefined,
    language: row.language || undefined,
    voiceTranscript: row.voice_transcript || undefined,
    followUpTask: row.follow_up_task || undefined,
    recordingUrl: metadata.recordingUrl || undefined
  };
};

const mapMessageRowToConversationMessage = (row: MessageRow): ConversationMessage => {
  let translation; // derive translation if available
  const parsedTranslation = parseMessageTranslation(row.translation);
  if (parsedTranslation) {
    translation = parsedTranslation;
  }

  return {
    id: row.id,
    sender: row.sender,
    channel: (row.channel as ConversationType) || 'chat',
    timestamp: row.created_at,
    text: row.content,
    translation
  };
};

const parseDurationToMinutes = (duration?: string | null) => {
  if (!duration) return 0;
  const parts = duration.split(':').map(Number);
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes + seconds / 60;
  }
  if (parts.length >= 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 60 + minutes + (seconds || 0) / 60;
  }
  return 0;
};

const AIConversationsPage: React.FC<{ isDemoMode?: boolean }> = ({ isDemoMode = false }) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ConversationMessage[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | ConversationType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ConversationStatus>('all');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncAgeSeconds, setSyncAgeSeconds] = useState(0);

  const loadConversations = useCallback(async () => {
    // FORCE REAL DATA: Only use demo if explicitly passed, otherwise ignore default props if we want live
    if (isDemoMode) {
      setConversations(DEMO_CONVERSATIONS as unknown as ConversationSummary[]);
      if (DEMO_CONVERSATIONS.length && !selectedConversationId) {
        setSelectedConversationId(DEMO_CONVERSATIONS[0].id);
      }
      setLastSyncedAt(new Date());
      setLoadingConversations(false);
      return;
    }

    try {
      setLoadingConversations(true);
      setError(null);

      const rows = await listConversations({
        userId: currentUserId ?? undefined,
        scope: 'agent'
      });
      const mapped = rows.map(mapConversationRowToSummary);
      setConversations(mapped);
      if (mapped.length && !selectedConversationId) {
        setSelectedConversationId(mapped[0].id);
      }
      setLastSyncedAt(new Date());
    } catch (err: unknown) {
      console.error('Failed to load conversations:', err);
      setError('Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, [selectedConversationId, currentUserId, isDemoMode]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setCurrentUserId(data?.user?.id ?? null);
      } catch (error) {
        console.error('Failed to resolve Supabase user for conversations:', error);
        setCurrentUserId(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // --- REAL-TIME UPDATES (PHASE 2) ---
  useEffect(() => {
    if (isDemoMode) return;

    // 1. Live Conversation List Updates
    const convChannel = supabase.channel('public:ai_conversations:list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_conversations' },
        () => {
          console.log('⚡ [Realtime] Conversation list updated');
          loadConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(convChannel); };
  }, [loadConversations, isDemoMode]);

  useEffect(() => {
    if (isDemoMode || !selectedConversationId) return;

    // 2. Live Message Thread Updates
    const msgChannel = supabase.channel(`public:messages:${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_conversation_messages',
          filter: `conversation_id=eq.${selectedConversationId}`
        },
        async (payload) => {
          console.log('⚡ [Realtime] New message received');
          // Fast refresh of just this thread
          try {
            const rows = await getMessages(selectedConversationId);
            setMessagesByConversation((prev) => ({
              ...prev,
              [selectedConversationId]: rows.map(mapMessageRowToConversationMessage)
            }));
          } catch (err) {
            console.error('Realtime sync failed', err);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
  }, [selectedConversationId, isDemoMode]);

  useEffect(() => {
    setIsDetailExpanded(false);
  }, [selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      const matchesSearch =
        !query ||
        conv.contactName.toLowerCase().includes(query) ||
        conv.contactEmail.toLowerCase().includes(query) ||
        conv.contactPhone.toLowerCase().includes(query) ||
        (conv.lastMessage || '').toLowerCase().includes(query) ||
        (conv.property || '').toLowerCase().includes(query) ||
        conv.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesType = filterType === 'all' || conv.type === filterType;
      const matchesStatus = filterStatus === 'all' || conv.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [conversations, searchQuery, filterType, filterStatus]);

  useEffect(() => {
    if (loadingConversations) return;
    if (!selectedConversationId && filteredConversations.length > 0) {
      setSelectedConversationId(filteredConversations[0].id);
      return;
    }

    if (
      selectedConversationId &&
      filteredConversations.every((conv) => conv.id !== selectedConversationId)
    ) {
      setSelectedConversationId(filteredConversations[0]?.id ?? null);
    }
  }, [filteredConversations, selectedConversationId, loadingConversations]);

  useEffect(() => {
    const loadMessagesForConversation = async (conversationId: string) => {
      if (!conversationId) return;
      if (messagesByConversation[conversationId]) return;

      if (isDemoMode) {
        const demoMsgs = DEMO_MESSAGES[conversationId as keyof typeof DEMO_MESSAGES] || [];
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: demoMsgs as unknown as ConversationMessage[]
        }));
        return;
      }

      try {
        setLoadingMessages(true);
        const rows = await getMessages(conversationId);
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: rows.map(mapMessageRowToConversationMessage)
        }));
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError('Failed to load messages for this conversation.');
      } finally {
        setLoadingMessages(false);
      }
    };

    if (selectedConversationId) {
      loadMessagesForConversation(selectedConversationId);
    }
  }, [selectedConversationId, messagesByConversation, isDemoMode]);

  useEffect(() => {
    if (!lastSyncedAt) {
      setSyncAgeSeconds(0);
      return;
    }

    const updateAge = () => {
      setSyncAgeSeconds(Math.max(0, Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000)));
    };

    updateAge();
    const timer = setInterval(updateAge, 1000);
    return () => clearInterval(timer);
  }, [lastSyncedAt]);

  const selectedConversationSummary = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((conv) => conv.id === selectedConversationId) || null;
  }, [selectedConversationId, conversations]);

  const selectedMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messagesByConversation[selectedConversationId] || [];
  }, [messagesByConversation, selectedConversationId]);

  const stats = useMemo(() => {
    const total = conversations.length;
    const voiceMinutes = conversations
      .filter((conv) => conv.type === 'voice')
      .reduce((sum, conv) => sum + parseDurationToMinutes(conv.duration), 0);
    const followUps = conversations.filter((conv) => conv.status === 'follow-up').length;
    const multilingual = conversations.filter((conv) => conv.language && conv.language !== 'English').length;

    return {
      total,
      voiceMinutes: Math.round(voiceMinutes),
      followUps,
      multilingual
    };
  }, [conversations]);

  const handleExportConversations = async () => {
    try {
      setIsExporting(true);
      await exportConversationsCSV({
        scope: 'agent',
        userId: currentUserId ?? undefined
      });
    } catch (err) {
      console.error('Failed to export conversations:', err);
      setError('Failed to export conversations.');
    } finally {
      setIsExporting(false);
    }
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
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-5 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AI Conversations Command Center</h1>
              <p className="text-slate-600 mt-1">
                One hub for every AI chat, voice note, translation, and follow-up.
              </p>
              {lastSyncedAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Last synced {syncAgeSeconds}s ago
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadConversations}
                className="flex items-center gap-2 border border-slate-300 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                disabled={loadingConversations}
              >
                <Sparkles className="w-4 h-4" />
                <span>{loadingConversations ? 'Refreshing…' : 'Refresh'}</span>
              </button>
              <button
                onClick={handleExportConversations}
                className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                disabled={isExporting}
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Exporting…' : 'Export Conversation CSV'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-4">
          <button
            onClick={() => setIsHelpPanelOpen((prev) => !prev)}
            className="flex items-center gap-2 text-primary-700 font-semibold"
          >
            {isHelpPanelOpen ? 'Hide AI Conversation Tips' : 'Show AI Conversation Tips'}
          </button>
          {isHelpPanelOpen && (
            <div className="mt-3 text-sm text-slate-600 space-y-3">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> How to use this inbox
                </h3>
                <p>All admin AI sidekick chats, lead inquiries, and system follow-ups land here.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Languages className="w-4 h-4" /> Translations & Voice
                </h3>
                <p>
                  Voice notes and non-English chats automatically generate transcripts. Use the deep dive panel to review translations and follow-up tasks.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Follow-up Queue
                </h3>
                <p>
                  Filter by “Follow-up” to see conversations that need human attention. Archiving keeps history but removes it from the active list.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Exports & Reporting
                </h3>
                <p>
                  Use the export button to download CSV reports for compliance or team briefings. Filters apply to exports too.
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Active Conversations</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">All time count</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Voice Minutes</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.voiceMinutes}</p>
            <p className="text-xs text-slate-500 mt-1">AI-handled voice notes</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Follow-ups</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.followUps}</p>
            <p className="text-xs text-slate-500 mt-1">Require human touch</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Multilingual</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.multilingual}</p>
            <p className="text-xs text-slate-500 mt-1">AI translated conversations</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations"
                  className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button className="flex items-center gap-1 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors">
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filterType}
                onChange={(event) => setFilterType(mapFilterTypeValue(event.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Channels</option>
                <option value="chat">Chat</option>
                <option value="voice">Voice</option>
                <option value="email">Email</option>
              </select>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(mapFilterStatusValue(event.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="follow-up">Follow-up</option>
                <option value="important">Important</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {loadingConversations ? (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center text-slate-500">
                Loading conversations…
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl shadow-sm p-6 text-center text-slate-500">
                No conversations yet.
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full text-left bg-white border rounded-xl shadow-sm p-4 hover:border-primary-500 transition-colors ${selectedConversationId === conversation.id
                    ? 'border-primary-500 ring-2 ring-primary-100'
                    : 'border-slate-200'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${typeBadgeStyles[conversation.type]}`}>
                          {getTypeIcon(conversation.type)}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBadgeStyles[conversation.status]}`}>
                          {conversation.status === 'follow-up' ? 'Follow-up' : conversation.status.charAt(0).toUpperCase() + conversation.status.slice(1)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 mt-2 truncate">{conversation.contactName}</h3>
                      <p className="text-xs text-slate-500 truncate">{conversation.contactEmail}</p>
                      {conversation.property && (
                        <p className="mt-1 text-xs text-slate-500 truncate">Property: {conversation.property}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {new Date(conversation.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {conversation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-500">
                      {conversation.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-sm text-slate-600 line-clamp-2">{conversation.lastMessage || 'No messages yet.'}</p>
                  <div className="mt-3 text-xs text-slate-500 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {conversation.messageCount}
                    </span>
                    {conversation.intent && (
                      <span className="flex items-center gap-1">
                        <ClipboardCheck className="w-3 h-3" /> {conversation.intent}
                      </span>
                    )}
                    {conversation.language && conversation.language !== 'English' && (
                      <span className="flex items-center gap-1">
                        <Languages className="w-3 h-3" /> {conversation.language}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="lg:col-span-2">
            {loadingMessages && !selectedMessages.length ? (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center text-slate-500">
                Loading conversation…
              </div>
            ) : !selectedConversationSummary ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl shadow-sm p-6 text-center text-slate-500">
                Select a conversation to see details.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">{selectedConversationSummary.contactName}</h2>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBadgeStyles[selectedConversationSummary.status]}`}>
                          {selectedConversationSummary.status === 'follow-up'
                            ? 'Follow-up'
                            : selectedConversationSummary.status.charAt(0).toUpperCase() + selectedConversationSummary.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{selectedConversationSummary.contactEmail}</p>
                      {selectedConversationSummary.contactPhone && (
                        <p className="text-sm text-slate-500">{selectedConversationSummary.contactPhone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsDetailExpanded((prev) => !prev)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        {isDetailExpanded ? 'Hide Deep Dive' : 'Show Deep Dive'}
                      </button>
                      <button
                        className="flex items-center gap-2 border border-slate-300 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Preview Transcript</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (!selectedConversationSummary) return;
                          if (!window.confirm('Delete this conversation? This cannot be undone.')) return;

                          if (isDemoMode) {
                            setConversations((prev) => prev.filter((c) => c.id !== selectedConversationSummary.id));
                            setMessagesByConversation((prev) => {
                              const next = { ...prev };
                              delete next[selectedConversationSummary.id];
                              return next;
                            });
                            setSelectedConversationId(null);
                            return;
                          }

                          try {
                            await deleteConversation(selectedConversationSummary.id);
                            setMessagesByConversation((prev) => {
                              const next = { ...prev };
                              delete next[selectedConversationSummary.id];
                              return next;
                            });
                            setSelectedConversationId(null);
                            await loadConversations();
                          } catch (err) {
                            console.error('Failed to delete conversation:', err);
                            setError('Failed to delete conversation.');
                          }
                        }}
                        className="flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(selectedConversationSummary.timestamp).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {getTypeIcon(selectedConversationSummary.type)}
                      {selectedConversationSummary.type === 'voice' ? 'Voice note' : selectedConversationSummary.type === 'chat' ? 'Chat' : 'Email'}
                    </span>
                    {selectedConversationSummary.property && (
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-4 h-4" /> {selectedConversationSummary.property}
                      </span>
                    )}
                    {selectedConversationSummary.followUpTask && (
                      <span className="inline-flex items-center gap-1 text-orange-600">
                        <ClipboardCheck className="w-4 h-4" /> {selectedConversationSummary.followUpTask}
                      </span>
                    )}
                    {selectedConversationSummary.language && selectedConversationSummary.language !== 'English' && (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Languages className="w-4 h-4" /> {selectedConversationSummary.language}
                      </span>
                    )}
                  </div>
                </div>

                {isDetailExpanded && (
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Conversation Overview</h3>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                      <div>
                        <p className="font-medium text-slate-700">Intent</p>
                        <p>{selectedConversationSummary.intent || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">Total Messages</p>
                        <p>{selectedConversationSummary.messageCount}</p>
                      </div>
                      {selectedConversationSummary.voiceTranscript && (
                        <div className="sm:col-span-2">
                          <p className="font-medium text-slate-700 flex items-center gap-2">
                            <Volume2 className="w-4 h-4" /> Voice Transcript
                          </p>
                          {selectedConversationSummary.recordingUrl && (
                            <div className="mt-2 mb-3">
                              <audio controls className="w-full h-8" src={selectedConversationSummary.recordingUrl}>
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}
                          <p className="mt-1 text-slate-600 whitespace-pre-wrap">
                            {selectedConversationSummary.voiceTranscript}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  {loadingMessages && !selectedMessages.length ? (
                    <div className="text-slate-500 text-sm">Loading messages…</div>
                  ) : selectedMessages.length === 0 ? (
                    <div className="text-slate-500 text-sm">No messages yet in this conversation.</div>
                  ) : (
                    selectedMessages.map((message) => (
                      <div key={message.id} className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${timelineColor(message.sender)}`} />
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{senderLabel(message.sender)}</span>
                            <span>{new Date(message.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{message.text}</p>
                          {message.translation && (
                            <div className="mt-3 text-xs text-slate-500 bg-white border border-slate-200 rounded p-3">
                              <p className="font-semibold flex items-center gap-1 text-slate-600">
                                <Languages className="w-3 h-3" /> Translation ({message.translation.language})
                              </p>
                              <p className="mt-1 text-slate-600">{message.translation.text}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConversationsPage;
