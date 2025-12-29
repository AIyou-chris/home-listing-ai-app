import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Property, Lead, Appointment, LeadStatus, AgentTask, TaskPriority, AgentProfile } from '../types';
import { SAMPLE_AGENT } from '../constants';
import SmartTaskManager from './SmartTaskManager';
import { LeadScoringService, getScoreTierInfo, getScoreColor, getScoreBadgeColor, type LeadScore } from '../services/leadScoringService';
// Hidden for launch - notification service will be re-enabled post-launch
// import { notificationService } from '../services/notificationService';
// import { useAgentBranding } from '../hooks/useAgentBranding';
import { MarketingHub } from './MarketingHub';
import { ConnectOnboarding } from './ConnectOnboarding';
import { ProductManager } from './ProductManager';
import { PlatformSubscriptionUI } from './PlatformSubscriptionUI';

interface DashboardProps {
    agentProfile?: AgentProfile;
    properties: Property[];
    leads: Lead[];
    appointments: Appointment[];
    tasks: AgentTask[];
    onSelectProperty: (id: string) => void;
    onTaskUpdate?: (taskId: string, updates: Partial<AgentTask>) => void;
    onTaskAdd?: (task: AgentTask) => void;
    onTaskDelete?: (taskId: string) => void;
    onViewLeads?: (leadId?: string, action?: 'view' | 'contact', initialTab?: 'email' | 'call' | 'sms' | 'note') => void;
    onViewLogs?: () => void;
    onViewListings?: () => void;
    onViewAppointments?: () => void;
    hideWelcome?: boolean;
    hideAvatar?: boolean;
}

type Tab = 'overview' | 'listings' | 'leads' | 'marketing' | 'payments';

const StatCard: React.FC<{ title: string; value: string; icon: string, bgColor: string, iconColor: string, onClick?: () => void }> = ({ title, value, icon, bgColor, iconColor, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
        <div className="flex items-center">
            <div className={`p-3 rounded-lg ${bgColor}`}>
                <span className={`material-symbols-outlined h-6 w-6 ${iconColor}`}>{icon}</span>
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">{title}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    </div>
);

const SectionCard: React.FC<{ title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 h-full flex flex-col">
            <button
                type="button"
                className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 w-full text-left md:pointer-events-none"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">{icon}</span>
                    <h3 className="font-bold text-slate-800">{title}</h3>
                </div>
                <span className="material-symbols-outlined md:hidden text-slate-400">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>
            <div className={`${isOpen ? 'block' : 'hidden'} md:block flex-1`}>
                {children}
            </div>
        </div>
    );
};

const LeadStatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
    const statusStyles: Record<LeadStatus, string> = {
        'New': 'bg-blue-100 text-blue-700',
        'Qualified': 'bg-green-100 text-green-700',
        'Contacted': 'bg-yellow-100 text-yellow-700',
        'Showing': 'bg-purple-100 text-purple-700',
        'Lost': 'bg-red-100 text-red-700'
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const TaskPriorityIndicator: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
    const priorityStyles: Record<TaskPriority, string> = {
        'High': 'bg-red-500',
        'Medium': 'bg-yellow-400',
        'Low': 'bg-sky-500'
    };
    return <div className={`w-2.5 h-2.5 rounded-full ${priorityStyles[priority]}`} title={`Priority: ${priority}`}></div>;
};


const Dashboard: React.FC<DashboardProps> = ({
    agentProfile: agentProfileOverride,
    properties,
    leads,
    appointments,
    tasks,
    onSelectProperty,
    onTaskUpdate,
    onTaskAdd,
    onTaskDelete,
    onViewLeads,
    onViewLogs,
    onViewListings,
    onViewAppointments,
    hideWelcome,
    hideAvatar
}) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    // Security Check: Ensure user is on their own dashboard
    // If slug is present in URL but doesn't match profile, redirect to correct one
    useEffect(() => {
        if (slug && agentProfileOverride?.slug && slug !== agentProfileOverride.slug) {
            console.warn(`Redirecting from ${slug} to ${agentProfileOverride.slug}`);
            navigate(`/dashboard/${agentProfileOverride.slug}`, { replace: true });
        }
    }, [slug, agentProfileOverride?.slug, navigate]);

    const agentProfile = agentProfileOverride || {
        ...SAMPLE_AGENT,
        // Fallbacks for optional fields ensuring type safety
        id: agentProfileOverride?.id ?? 'unknown',
        stripe_account_id: agentProfileOverride?.stripe_account_id,
        plan: agentProfileOverride?.plan
    } as AgentProfile;

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
    const [isLoadingScores, setIsLoadingScores] = useState(true);

    const firstName = agentProfile.name?.trim() ? agentProfile.name.split(' ')[0] : 'there';
    const fullName = agentProfile.name?.trim() ? agentProfile.name : 'Real Estate Agent';
    // const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
    // const [isHelpPanelOpen, _setIsHelpPanelOpen] = useState(false); // Unused setter prefixed

    // Hidden for launch - notification states will be re-enabled post-launch
    // const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    // const notificationDropdownRef = useRef<HTMLDivElement>(null);

    // const newLeadsCount = leads.filter(l => l.status === 'New').length;
    const hotLeadsCount = leadScores.filter(s => s.tier === 'Hot' || s.tier === 'Qualified').length;
    const averageScore = leadScores.length > 0 ?
        Math.round(leadScores.reduce((sum, s) => sum + s.totalScore, 0) / leadScores.length) : 0;

    // Load lead scores on component mount and when leads change
    useEffect(() => {
        const loadLeadScores = async () => {
            if (leads.length === 0) return;

            setIsLoadingScores(true);
            try {
                const scores = await LeadScoringService.calculateBulkScores(leads);
                setLeadScores(scores);
            } catch (error) {
                console.warn('Failed to load lead scores:', error);
                // Fallback to client-side scoring
                const fallbackScores = leads.map(lead => LeadScoringService.calculateLeadScoreClientSide(lead));
                setLeadScores(fallbackScores);
            } finally {
                setIsLoadingScores(false);
            }
        };

        loadLeadScores();
    }, [leads]);

    const handleReviewSarah = () => {
        if (!onViewLeads) return;

        // Try to find Sarah Jenkins or just Sarah
        const sarah = leads.find(l => l.name.toLowerCase().includes('sarah'));
        if (sarah) {
            onViewLeads(sarah.id);
        } else {
            // Find finding the top scoring lead as a fallback if no Sarah
            const topLeadScore = [...leadScores].sort((a, b) => b.totalScore - a.totalScore)[0];
            const topLead = topLeadScore ? leads.find(l => l.id === topLeadScore.leadId) : null;
            onViewLeads(topLead?.id);
        }
    };

    // Hidden for launch - notification functions will be re-enabled post-launch
    // const handleSendTestNotification = async () => { ... };
    // const handleSendNewLeadNotification = async () => { ... };
    // const handleSendAppointmentReminder = async () => { ... };

    return (
        <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            {/* Daily Pulse Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Live Status</span>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Daily Pulse</h1>
                    <p className="text-slate-500 mt-2 text-base max-w-2xl">
                        Hi {firstName}, here is exactly what needs your attention right now.
                    </p>
                </div>
                {!hideAvatar && (
                    <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-full shadow-sm border border-slate-200 self-start sm:self-center">
                        {agentProfile.headshotUrl ? (
                            <img src={agentProfile.headshotUrl} alt={fullName} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-50 shadow-sm" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border-2 border-white shadow-sm">
                                <span className="material-symbols-outlined text-2xl">person</span>
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-bold text-slate-900 leading-none">{fullName}</p>
                            <p className="text-xs text-slate-500 mt-1">AI Concierge Active</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 🤖 AI Agent Buddy / Pro Tips */}
            <div className="mb-10">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl shadow-xl shadow-indigo-100 p-1">
                    <div className="bg-white/95 backdrop-blur-sm rounded-[calc(1rem-1px)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-indigo-600">smart_toy</span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-4 border-white flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-center md:justify-start gap-2">
                                Good Afternoon, {firstName}!
                                <span className="text-2xl">👋</span>
                            </h2>
                            <p className="text-slate-600 leading-relaxed max-w-2xl mb-4 text-sm sm:text-base">
                                "I've been busy while you were away. I handled 12 new inquiries and pre-qualified Sarah Jenkins—she looks like a serious buyer. Want to review her profile?"
                            </p>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-start gap-3">
                                <button
                                    onClick={handleReviewSarah}
                                    className="flex-1 sm:flex-none px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">visibility</span>
                                    Review Sarah
                                </button>
                                <button
                                    onClick={() => onViewLogs?.()}
                                    className="flex-1 sm:flex-none px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center"
                                >
                                    Show All AI Logs
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Three Column Pulse Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                {/* 1. Who Needs Me? */}
                <SectionCard title="Who Needs Me?" icon="priority_high" defaultOpen={true}>
                    <div className="p-2 space-y-4">
                        {leads.filter(l => l.status === 'New' || l.status === 'Qualified').slice(0, 4).map(lead => {
                            const leadScore = leadScores.find(s => s.leadId === lead.id);
                            const score = leadScore?.totalScore || 75; // Default score for mockup
                            const tier = leadScore?.tier || 'Hot';

                            return (
                                <div key={lead.id} className="group relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{lead.name}</h4>
                                            <p className="text-xs text-slate-500">{lead.source} • {lead.date}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getScoreBadgeColor(tier)}`}>
                                                {tier}
                                            </span>
                                            <span className={`text-base font-black ${getScoreColor(score)}`}>{score}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2 mb-3">
                                        <p className="text-xs text-slate-600 italic line-clamp-2">"{lead.lastMessage || 'Checking new listings in your area...'}"</p>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button
                                            onClick={() => lead.phone ? window.location.href = `tel:${lead.phone}` : onViewLeads?.(lead.id, 'contact', 'call')}
                                            className="col-span-1 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-all flex flex-col items-center justify-center gap-1"
                                            title="Call Lead"
                                        >
                                            <span className="material-symbols-outlined text-lg">call</span>
                                            <span className="hidden sm:inline">Call</span>
                                        </button>
                                        <button
                                            onClick={() => onViewLeads?.(lead.id, 'contact', 'note')}
                                            className="col-span-1 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-all flex flex-col items-center justify-center gap-1"
                                            title="Add Note"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit_note</span>
                                            <span className="hidden sm:inline">Note</span>
                                        </button>
                                        <button
                                            onClick={() => onViewLeads?.(lead.id, 'contact', 'email')}
                                            className="col-span-1 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1"
                                            title="Send Email"
                                        >
                                            <span className="material-symbols-outlined text-lg">mail</span>
                                            <span className="hidden sm:inline">Email</span>
                                        </button>
                                        <button
                                            onClick={() => onViewLeads?.(lead.id, 'view')}
                                            className="col-span-1 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1"
                                            title="View Profile"
                                        >
                                            <span className="material-symbols-outlined text-lg">person</span>
                                            <span className="hidden sm:inline">Profile</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {leads.length === 0 && (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <span className="material-symbols-outlined text-3xl">inbox</span>
                                </div>
                                <p className="text-slate-500 font-medium">No leads requiring attention right now.</p>
                                <p className="text-sm text-slate-400">Time to generate some buzz! 🐝</p>
                            </div>
                        )}

                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                            <button
                                onClick={() => onViewLeads?.()}
                                className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1"
                            >
                                See all leads
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </SectionCard>

                {/* My Day (Appointments & Tasks) */}
                <SectionCard title="My Day" icon="calendar_month" defaultOpen={true}>
                    <div className="p-5">
                        <div className="space-y-4">
                            {/* Next Appointment */}
                            {appointments.length > 0 ? (
                                <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-white rounded-lg text-violet-600 shadow-sm">
                                            <span className="material-symbols-outlined">event</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-violet-600 uppercase tracking-wider">Next Up</p>
                                            <h4 className="font-bold text-slate-900 text-sm">
                                                {new Date(appointments[0].date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {' - '}{appointments[0].type || 'Appointment'}
                                            </h4>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 pl-[3.25rem]">
                                        With {appointments[0].leadName || 'Client'}
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center py-6">
                                    <p className="text-slate-500 text-sm font-medium">No appointments today</p>
                                    <p className="text-xs text-slate-400">Enjoy the focus time!</p>
                                </div>
                            )}

                            {/* Top 3 Tasks */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Priority Tasks</h4>
                                    <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800" onClick={() => setIsTaskManagerOpen(true)}>Manage</button>
                                </div>

                                {tasks.filter(t => !t.isCompleted).slice(0, 3).map(task => (
                                    <div key={task.id} className="flex items-center gap-3 group">
                                        <button
                                            onClick={() => onTaskUpdate && onTaskUpdate(task.id, { isCompleted: !task.isCompleted })}
                                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-500'}`}
                                        >
                                            {task.isCompleted && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                        </button>
                                        <span className={`text-sm ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.text}</span>
                                        <TaskPriorityIndicator priority={task.priority} />
                                    </div>
                                ))}

                                {tasks.filter(t => !t.isCompleted).length === 0 && (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-slate-400 italic">All caught up!</p>
                                    </div>
                                )}

                            </div>

                            <button
                                onClick={() => onViewAppointments?.()}
                                className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">edit_calendar</span>
                                Manage Calendar
                            </button>
                        </div>
                    </div>
                </SectionCard>
            </div>



            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <StatCard
                    title="Active Listings"
                    value={properties.length.toString()}
                    icon="home"
                    bgColor="bg-blue-50"
                    iconColor="text-blue-600"
                    onClick={() => onViewListings?.()}
                />
                <StatCard
                    title="Total Leads"
                    value={leads.length.toString()}
                    icon="group"
                    bgColor="bg-indigo-50"
                    iconColor="text-indigo-600"
                    onClick={() => onViewLeads?.()}
                />
                <StatCard
                    title="Hot Leads"
                    value={hotLeadsCount.toString()}
                    icon="local_fire_department"
                    bgColor="bg-orange-50"
                    iconColor="text-orange-600"
                    onClick={() => onViewLeads?.()}
                />
                <StatCard
                    title="Avg Lead Score"
                    value={averageScore.toString()}
                    icon="speed"
                    bgColor="bg-green-50"
                    iconColor="text-green-600"
                    onClick={() => onViewLeads?.()}
                />
            </div>

            {/* Lead Scoring Overview */}
            {leads.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <SectionCard title="Lead Score Distribution" icon="analytics">
                        <div className="space-y-3">
                            {isLoadingScores ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                                    <span className="ml-2 text-sm text-slate-500">Loading scores...</span>
                                </div>
                            ) : (
                                <>
                                    {(['Qualified', 'Hot', 'Warm', 'Cold'] as const).map(tier => {
                                        const count = leadScores.filter(s => s.tier === tier).length;
                                        const percentage = leadScores.length > 0 ? Math.round((count / leadScores.length) * 100) : 0;
                                        const tierInfo = getScoreTierInfo(tier);
                                        const tierEmoji = typeof tierInfo === 'object' && tierInfo !== null && 'emoji' in tierInfo && typeof tierInfo.emoji === 'string'
                                            ? tierInfo.emoji
                                            : '📊';

                                        return (
                                            <div key={tier} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{tierEmoji}</span>
                                                    <span className="font-medium text-slate-700">{tier} Leads</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-slate-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${tier === 'Qualified' ? 'bg-green-500' :
                                                                tier === 'Hot' ? 'bg-orange-500' :
                                                                    tier === 'Warm' ? 'bg-blue-500' : 'bg-slate-400'
                                                                }`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-600 w-8">{count}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard title="Top Scoring Leads" icon="star">
                        <div className="space-y-2">
                            {isLoadingScores ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                                    <span className="ml-2 text-sm text-slate-500">Loading scores...</span>
                                </div>
                            ) : (
                                leadScores
                                    .sort((a, b) => b.totalScore - a.totalScore)
                                    .slice(0, 3)
                                    .map(score => {
                                        const lead = leads.find(l => l.id === score.leadId);
                                        if (!lead) return null;

                                        return (
                                            <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{lead.name}</h4>
                                                    <p className="text-xs text-slate-500">{lead.email}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadgeColor(score.tier)}`}>
                                                        {score.tier}
                                                    </span>
                                                    <span className={`text-lg font-bold ${getScoreColor(score.totalScore)}`}>
                                                        {score.totalScore}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                            {!isLoadingScores && leadScores.length === 0 && (
                                <p className="text-center text-sm text-slate-400 py-4">No scored leads yet</p>
                            )}
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* Recent Listings - Full Width */}
            <div className="grid grid-cols-1 gap-6">
                <SectionCard title="Recent Listings" icon="domain">
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {properties.length > 0 ? properties.slice(0, 4).map(prop => (
                            <div
                                key={prop.id}
                                onClick={() => onSelectProperty(prop.id)}
                                className="flex items-center p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                <img src={prop.imageUrl} alt={prop.address} className="w-16 h-16 rounded-md object-cover" />
                                <div className="ml-3">
                                    <h4 className="font-semibold text-slate-800 text-sm">{prop.address}</h4>
                                    <p className="text-sm font-bold text-primary-700">${prop.price.toLocaleString()}</p>
                                </div>
                                <span className="material-symbols-outlined w-5 h-5 text-slate-400 ml-auto">chevron_right</span>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-slate-500">
                                <p>No listings found. Add one to get started!</p>
                            </div>
                        )}
                    </div>
                </SectionCard>
            </div>

            {/* Smart Task Manager Modal */}
            {isTaskManagerOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900">Smart Task Manager</h2>
                            <button
                                onClick={() => setIsTaskManagerOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <SmartTaskManager
                                tasks={tasks}
                                leads={leads}
                                appointments={appointments}
                                properties={properties}
                                onTaskUpdate={onTaskUpdate || (() => { })}
                                onTaskAdd={onTaskAdd || (() => { })}
                                onTaskDelete={onTaskDelete || (() => { })}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Dashboard;
