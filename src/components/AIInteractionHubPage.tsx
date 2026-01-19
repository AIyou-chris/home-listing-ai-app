import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Search, MessageCircle, Phone, User, Trash2,
    Clock, Sparkles, Home, Megaphone,
    Cpu, ChevronLeft, Download, Send, Plus, Check, CheckCheck, AlertCircle
} from 'lucide-react';
import { Interaction, Property } from '../types';
import AddLeadModal, { type NewLeadPayload } from './AddLeadModal';
import {
    listConversations,
    getMessages,
    exportConversationsCSV,
} from '../services/chatService';

import PageTipBanner from './PageTipBanner';
import { DEMO_CONVERSATIONS, DEMO_MESSAGES } from '../demoConstants';

// Unified types for the hub
type HubItemType = 'inquiry' | 'conversation';

interface HubItem {
    id: string;
    type: HubItemType;
    sourceType: string;
    sourceName: string;
    contact: { name: string; email: string; phone?: string; avatarUrl?: string };
    message: string;
    timestamp: string;
    isRead: boolean;
    status: string;
    // Data specific to inquiries
    relatedPropertyId?: string;
    // Data specific to conversations
    conversationType?: 'chat' | 'voice' | 'email';
    intent?: string;
    messageCount?: number;
    property?: string;
}

interface AIInteractionHubPageProps {
    properties: Property[];
    onBackToDashboard: () => void;
    onAddNewLead: (leadData: NewLeadPayload) => void;
    interactions: Interaction[];
    setInteractions: React.Dispatch<React.SetStateAction<Interaction[]>>;
    isDemoMode?: boolean;
}

const AIInteractionHubPage: React.FC<AIInteractionHubPageProps> = ({
    properties,
    onBackToDashboard,
    onAddNewLead,
    interactions,
    setInteractions,
    isDemoMode = false
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    // State
    // State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [selectedItemType, setSelectedItemType] = useState<HubItemType>('inquiry');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'inquiry' | 'conversation'>('all');
    const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
    const [leadInitialData, setLeadInitialData] = useState<{ name: string; message: string } | undefined>(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [newMessage, setNewMessage] = useState(''); // State for reply input

    // Load Conversations (from chatService)
    const loadConversations = useCallback(async () => {
        if (isDemoMode) {
            setConversations(DEMO_CONVERSATIONS);
            return;
        }
        try {
            const rows = await listConversations({ scope: 'agent' });
            setConversations(rows);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        }
    }, [isDemoMode]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadConversations();
            setLoading(false);
        };
        init();
    }, [loadConversations]);

    // Unified List Projection
    const hubItems = useMemo(() => {
        const inquiryItems: HubItem[] = interactions.map(i => ({
            id: i.id,
            type: 'inquiry',
            sourceType: i.sourceType,
            sourceName: i.sourceName,
            contact: { name: i.contact.name, email: '', avatarUrl: i.contact.avatarUrl },
            message: i.message,
            timestamp: i.timestamp,
            isRead: i.isRead,
            status: 'New',
            relatedPropertyId: i.relatedPropertyId
        }));

        const conversationItems: HubItem[] = conversations.map(c => ({
            id: c.id,
            type: 'conversation',
            sourceType: c.type || 'chat',
            sourceName: c.type === 'voice' ? 'AI Voice Call' : 'AI Assistant Chat',
            contact: { name: c.contact_name || 'Anonymous', email: c.contact_email || '', phone: c.contact_phone },
            message: c.last_message || 'Multi-message conversation',
            timestamp: c.last_message_at || c.created_at,
            isRead: true, // Conversations are usually "official" logs
            status: c.status || 'Active',
            conversationType: c.type,
            intent: c.intent,
            messageCount: c.message_count,
            property: c.property
        }));

        const combined = [...inquiryItems, ...conversationItems].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return combined.filter(item => {
            const matchesSearch = item.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.message.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || item.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [interactions, conversations, searchQuery, filterType]);

    const handleSelectItem = useCallback((id: string, type: HubItemType) => {
        setSelectedItemId(id);
        setSelectedItemType(type);
        if (type === 'inquiry') {
            setInteractions(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i));
        }
    }, [setInteractions]);

    // Auto-select first item or handle deep link
    useEffect(() => {
        if (!loading && hubItems.length > 0) {
            const leadIdParam = searchParams.get('leadId');

            // Strategy 1: Match by ID (if conversation ID matches)
            let targetItem = hubItems.find(item => item.id === leadIdParam);

            // Strategy 2: Match by Email (if passed)
            if (!targetItem && leadIdParam && leadIdParam.includes('@')) {
                targetItem = hubItems.find(item => item.contact?.email === leadIdParam);
            }

            // Strategy 3: Match by "context" (if we add a leadId field to interactions later)
            // For now, let's assume the button passes the CONTACT EMAIL if known, or ID.

            if (targetItem) {
                if (selectedItemId !== targetItem.id) {
                    handleSelectItem(targetItem.id, targetItem.type);
                }
            } else if (!selectedItemId && window.innerWidth >= 768) {
                // Default fallback ONLY on desktop.
                // On mobile, we want to show the list first.
                setSelectedItemId(hubItems[0].id);
                setSelectedItemType(hubItems[0].type);
            }
        }
    }, [hubItems, selectedItemId, loading, searchParams, handleSelectItem]);

    // Load Messages for Conversations
    useEffect(() => {
        if (selectedItemId && selectedItemType === 'conversation') {
            const fetchMessages = async () => {
                setLoadingMessages(true);
                if (isDemoMode) {
                    setMessages(DEMO_MESSAGES[selectedItemId as keyof typeof DEMO_MESSAGES] || []);
                } else {
                    try {
                        const rows = await getMessages(selectedItemId);
                        setMessages(rows);
                    } catch (err) {
                        console.error('Error loading messages:', err);
                    }
                }
                setLoadingMessages(false);
            };
            fetchMessages();
        }
    }, [selectedItemId, selectedItemType, isDemoMode]);



    const handleCreateLead = () => {
        const item = hubItems.find(i => i.id === selectedItemId);
        if (!item) return;
        setLeadInitialData({
            name: item.contact.name,
            message: `Originally from Hub (${item.sourceName}):\n${item.message}`
        });
        setIsAddLeadModalOpen(true);
    };

    const handleArchive = (id: string) => {
        if (selectedItemType === 'inquiry') {
            setInteractions(prev => prev.filter(i => i.id !== id));
        } else {
            alert("Conversations are permanently logged.");
        }
        setSelectedItemId(null);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedItemId) return;

        try {
            // Determine best channel
            const item = hubItems.find(i => i.id === selectedItemId);
            const targetChannel = item?.conversationType === 'voice' || item?.contact.phone ? 'sms' : 'chat'; // Default to SMS if phone avl

            // Optimistic UI update? No, wait for server to confirm (esp for Red Light)
            const { appendMessage } = await import('../services/chatService');

            await appendMessage({
                conversationId: selectedItemId,
                role: 'user', // Agent
                content: newMessage,
                channel: targetChannel,
                userId: 'agent' // explicit agent sender
            });

            // Refresh messages logic? (Requires pulling again or returning msg)
            // Ideally we re-fetch messages
            if (selectedItemId && selectedItemType === 'conversation') {
                const { getMessages } = await import('../services/chatService');
                const rows = await getMessages(selectedItemId);
                setMessages(rows);
            }

            setNewMessage('');

        } catch (error: unknown) {
            console.error("Send failed:", error);
            const msg = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to send: ${msg}`);
        }
    };

    const selectedItem = hubItems.find(i => i.id === selectedItemId);
    const relatedProperty = selectedItem?.relatedPropertyId
        ? properties.find(p => p.id === selectedItem.relatedPropertyId)
        : undefined;

    const sourceIcons: Record<string, React.ElementType> = {
        'listing-inquiry': Home,
        'marketing-reply': Megaphone,
        'chat-bot-session': Sparkles,
        'voice': Phone,
        'chat': MessageCircle,
        'email': User
    };

    const getIcon = (type: string) => {
        const IconComp = sourceIcons[type] || MessageCircle;
        return <IconComp className="w-4 h-4" />;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <div className="hidden md:flex bg-white border-b border-slate-200 px-6 py-4 flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBackToDashboard} className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-2">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">AI Interaction Hub</h1>
                        <p className="text-sm text-slate-500">Every AI chat, phone call, and inquiry in one feed.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <div className="hidden sm:flex items-center gap-6 px-4 py-2 bg-slate-50 rounded-xl">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Total</p>
                            <p className="text-lg font-black text-indigo-600 leading-none">{hubItems.length}</p>
                        </div>
                        <div className="hidden sm:block h-8 w-px bg-slate-200" />
                        <div className="hidden sm:block text-center">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">AI Mins</p>
                            <p className="text-lg font-black text-indigo-600 leading-none">42</p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            setIsExporting(true);
                            await exportConversationsCSV({ scope: 'agent' });
                            setIsExporting(false);
                        }}
                        className="hidden md:flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                    >
                        <Download className="w-5 h-5 text-indigo-400" />
                        {isExporting ? 'Exporting...' : 'Export Logs'}
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-6 pb-4 bg-white border-b border-slate-200">
                <PageTipBanner
                    pageKey="ai-hub"
                    expandedContent={
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-indigo-900 mb-3 text-lg">🧠 Omnichannel Command Center</h4>
                                <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                                    Every conversation your AI generates—across SMS, email, and web chat—lands here. It's your single source of truth for what's happening in your business.
                                </p>

                                <div className="space-y-4">
                                    <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1">How It Works</h5>
                                    <ul className="space-y-3 text-slate-700 text-sm">
                                        <li className="flex items-start gap-3">
                                            <div className="mt-0.5 p-1 bg-indigo-50 rounded text-indigo-600">
                                                <span className="material-symbols-outlined text-sm">visibility</span>
                                            </div>
                                            <span><strong>Active Monitoring:</strong> Watch conversations unfold in real-time. The list updates instantly when a lead replies to your AI.</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <div className="mt-0.5 p-1 bg-indigo-50 rounded text-indigo-600">
                                                <span className="material-symbols-outlined text-sm">hand_gesture</span>
                                            </div>
                                            <span><strong>Human Handoff:</strong> If a lead asks a complex question, type a reply yourself. The AI will pause and let you drive, then pick back up when you're done.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-white/50 rounded-xl p-4 border border-indigo-50">
                                <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1 mb-3">Workflow Success Tips</h5>
                                <ul className="space-y-3 text-slate-700 text-sm">
                                    <li className="flex items-start gap-3">
                                        <span className="mr-1 text-lg">🕵️</span>
                                        <span><strong>Context is King:</strong> Before you call a lead, read their chat history here to see exactly what they told the AI about their budget and timeline.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="mr-1 text-lg">📣</span>
                                        <span><strong>The "Create Lead" Hack:</strong> See an anonymous inquiry that looks promising? Click "Create Lead" to instantly move them into your main CRM pipeline.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="mr-1 text-lg">📥</span>
                                        <span><strong>Export Weekly:</strong> Use the "Export Logs" button to download a CSV of all conversations for your compliance records or team review.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    }
                />
            </div>

            <div className={`flex flex-1 overflow-hidden relative w-full ${!selectedItemId ? 'bg-white' : ''}`}>
                {/* List View - Hidden on mobile if item selected */}
                <aside className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-white ${selectedItemId ? 'hidden md:flex' : 'flex'} h-full`}>
                    <div className="p-4 border-b border-slate-200 space-y-3">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-inner"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl border transition-all active:scale-95 ${filterType === 'all' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterType('inquiry')}
                                className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl border transition-all active:scale-95 ${filterType === 'inquiry' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                Inquiries
                            </button>
                            <button
                                onClick={() => setFilterType('conversation')}
                                className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl border transition-all active:scale-95 ${filterType === 'conversation' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                AI Chats
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {hubItems.length > 0 ? hubItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSelectItem(item.id, item.type)}
                                className={`w-full text-left p-4 transition-all relative ${selectedItemId === item.id ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-slate-50'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${item.type === 'inquiry' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                            {getIcon(item.sourceType)}
                                        </div>
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                            {item.type === 'inquiry' ? 'Inquiry' : item.conversationType?.toUpperCase() || 'CHAT'}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                                        {(() => {
                                            if (!item.timestamp) return '';
                                            const d = new Date(item.timestamp);
                                            if (isNaN(d.getTime())) return '';
                                            return d.toLocaleDateString() === new Date().toLocaleDateString()
                                                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                        })()}
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 truncate">{item.contact.name}</h3>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{item.message}</p>
                            </button>
                        )) : (
                            <div className="p-8 text-center space-y-3">
                                <Search className="w-12 h-12 text-slate-300 mx-auto" />
                                <p className="text-sm text-slate-500 font-medium">No interactions found</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Detail View - Hidden on mobile if NO item selected */}
                <main className={`flex-1 flex flex-col bg-white overflow-hidden w-full ${!selectedItemId ? 'hidden md:flex' : 'flex'} h-full`}>
                    {selectedItem ? (
                        <div className="flex flex-col h-full">
                            <header className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <button
                                        onClick={() => {
                                            setSelectedItemId(null);
                                            setSearchParams((prev) => {
                                                const newParams = new URLSearchParams(prev);
                                                newParams.delete('leadId');
                                                return newParams;
                                            });
                                        }}
                                        className="md:hidden flex items-center gap-1 text-slate-500 font-medium mb-3 hover:text-slate-800"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Back to list
                                    </button>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold text-slate-900">{selectedItem.contact.name}</h2>
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                            {selectedItem.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" />
                                            {(() => {
                                                if (!selectedItem.timestamp) return '';
                                                const d = new Date(selectedItem.timestamp);
                                                return isNaN(d.getTime()) ? '' : d.toLocaleString();
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleCreateLead} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-sm">
                                        <Plus className="w-4 h-4" />Create Lead
                                    </button>
                                    <button onClick={() => handleArchive(selectedItem.id)} className="p-2 border border-slate-200 text-slate-400 rounded-lg hover:bg-slate-50">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                                {selectedItemType === 'inquiry' ? (
                                    <div className="space-y-6 max-w-3xl mx-auto">
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">Message</h4>
                                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedItem.message}</p>
                                        </div>
                                        {relatedProperty && (
                                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
                                                <img src={relatedProperty.imageUrl} className="w-24 h-24 rounded-xl object-cover" alt="" />
                                                <div>
                                                    <h5 className="font-bold text-slate-900">{relatedProperty.address}</h5>
                                                    <p className="text-sm text-slate-500">{relatedProperty.propertyType}</p>
                                                    <p className="text-lg font-black text-indigo-600 mt-2">${relatedProperty.price.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-w-3xl mx-auto">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                            <div className="bg-white p-4 rounded-xl border border-slate-100 text-center shadow-sm">
                                                <p className="text-[10px] font-extrabold text-slate-400 mb-1">INTENT</p>
                                                <p className="font-bold">{selectedItem.intent || 'General'}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-100 text-center shadow-sm">
                                                <p className="text-[10px] font-extrabold text-slate-400 mb-1">MESSAGES</p>
                                                <p className="font-bold">{selectedItem.messageCount || 0}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {loadingMessages ? <div>Loading...</div> : messages.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.sender === 'lead' ? 'justify-start' : 'justify-end'}`}>
                                                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.sender === 'lead' ? 'bg-white border border-slate-100 text-slate-700' : 'bg-indigo-600 text-white'}`}>
                                                        <div className="text-[10px] font-bold opacity-50 mb-1 uppercase tracking-wider">{msg.sender === 'lead' ? selectedItem.contact.name : 'AI Buddy'}</div>
                                                        {msg.content || msg.text}
                                                        {msg.sender === 'ai' && (
                                                            <div className="flex justify-end mt-1">
                                                                {msg.metadata?.status === 'delivered' ? (
                                                                    <span title="Delivered"><CheckCheck className="w-3 h-3 text-indigo-200" /></span>
                                                                ) : msg.metadata?.status === 'failed' ? (
                                                                    <span title="Failed"><AlertCircle className="w-3 h-3 text-red-300" /></span>
                                                                ) : (
                                                                    <span title="Sent"><Check className="w-3 h-3 text-indigo-300 opacity-70" /></span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <footer className="p-4 bg-white border-t border-slate-100">
                                <div className="flex items-center gap-4 max-w-3xl mx-auto">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder={`Reply to ${selectedItem.contact.name}...`}
                                            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!newMessage.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </footer>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <Cpu className="w-16 h-16 text-slate-200 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900">Select an Interaction</h3>
                        </div>
                    )}
                </main>
            </div>
            {isAddLeadModalOpen && <AddLeadModal onClose={() => setIsAddLeadModalOpen(false)} onAddLead={(d) => { onAddNewLead(d); setIsAddLeadModalOpen(false); }} initialData={leadInitialData} />}
        </div>
    );
};

export default AIInteractionHubPage;
