import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lead } from '../types';
import { getMessages, listConversations } from '../services/chatService';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface LeadDetailDashboardProps {
    leads?: Lead[];
    onRefreshLeads?: () => Promise<void>;
}

const LeadDetailDashboard: React.FC<LeadDetailDashboardProps> = ({ leads = [] }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lead, setLead] = useState<Lead | null>(null);
    const [conversations, setConversations] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLeadData = async () => {
            setIsLoading(true);
            try {
                // Find lead from props or fetch from backend
                const foundLead = leads.find(l => l.id === id);
                if (foundLead) {
                    setLead(foundLead);

                    // Load conversation history
                    try {
                        const convos = await listConversations();
                        const leadConvo = convos.find(c => c.lead_id === id);
                        if (leadConvo) {
                            const messages = await getMessages(leadConvo.id);
                            setConversations(messages.map((msg: any) => ({
                                id: msg.id || Math.random().toString(),
                                role: msg.sender === 'lead' ? 'user' : 'assistant',
                                content: msg.content,
                                timestamp: msg.created_at || new Date().toISOString()
                            })));
                        }
                    } catch (err) {
                        console.error('Failed to load chat history:', err);
                    }
                }
            } catch (error) {
                console.error('Failed to load lead:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            loadLeadData();
        }
    }, [id, leads]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">person_off</span>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Lead Not Found</h2>
                    <p className="text-slate-500 mb-6">The lead you're looking for doesn't exist or has been removed.</p>
                    <button
                        onClick={() => navigate('/admin-dashboard')}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{lead.name}</h1>
                        <p className="text-slate-500 text-sm mt-1">Lead Dashboard</p>
                    </div>
                </div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${lead.status === 'New' ? 'bg-blue-100 text-blue-700' :
                    lead.status === 'Qualified' ? 'bg-green-100 text-green-700' :
                        lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-700'
                    }`}>
                    {lead.status}
                </span>
            </div>

            {/* Lead Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-600">person</span>
                    Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
                        <a href={`mailto:${lead.email}`} className="text-sm text-primary-600 hover:underline">
                            {lead.email}
                        </a>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone</label>
                        <a href={`tel:${lead.phone}`} className="text-sm text-primary-600 hover:underline">
                            {lead.phone || 'Not provided'}
                        </a>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Source</label>
                        <p className="text-sm text-slate-700">{lead.source || 'Unknown'}</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Created</label>
                        <p className="text-sm text-slate-700">{lead.date}</p>
                    </div>
                </div>
                {lead.notes && (
                    <div className="mt-4">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes</label>
                        <p className="text-sm text-slate-700">{lead.notes}</p>
                    </div>
                )}
            </div>

            {/* AI Conversation History */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-600">chat</span>
                    AI Conversation History
                </h2>

                {conversations.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">chat_bubble_outline</span>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Conversations Yet</h3>
                        <p className="text-slate-500">AI conversations will appear here once the lead interacts with your chatbot.</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {conversations.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    <span className="material-symbols-outlined text-base">
                                        {msg.role === 'assistant' ? 'smart_toy' : 'person'}
                                    </span>
                                </div>
                                <div className={`flex-1 max-w-[70%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                                    <div className={`inline-block px-4 py-2 rounded-lg ${msg.role === 'assistant'
                                        ? 'bg-primary-50 text-slate-900'
                                        : 'bg-slate-100 text-slate-900'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {new Date(msg.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lead Score (if exists) */}
            {lead.score && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-600">trending_up</span>
                        Lead Score
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-3xl font-bold text-primary-600">{lead.score.totalScore}</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-600">
                                This lead has been scored based on engagement, intent, and response time.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadDetailDashboard;
