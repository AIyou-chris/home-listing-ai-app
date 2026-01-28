
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lead, Appointment, LeadStatus, LeadFunnelType, Property } from '../types';
import { scheduleAppointment } from '../services/schedulerService';
import { analyticsService } from '../services/analyticsService';
import type { SchedulerResult } from '../services/schedulerService';
import AddLeadModal, { type NewLeadPayload } from './AddLeadModal';
import ScheduleAppointmentModal, { ScheduleAppointmentFormData } from './ScheduleAppointmentModal';
import ContactLeadModal from './ContactLeadModal';
import CalendarView from './CalendarView';
import ExportModal from './ExportModal';
// import { CampaignRunnerModal } from './admin/CampaignRunnerModal'; // Removed
import { LeadUploadModal } from './LeadUploadModal';
import PageTipBanner from './PageTipBanner';

const formatDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};


const LeadStatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
    const statusStyles: Record<LeadStatus, string> = {
        'New': 'bg-indigo-50 text-indigo-600 border-indigo-100',
        'Qualified': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'Contacted': 'bg-amber-50 text-amber-600 border-amber-100',
        'Showing': 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
        'Lost': 'bg-slate-50 text-slate-500 border-slate-100',
        'Bounced': 'bg-red-50 text-red-700 border-red-200',
        'Unsubscribed': 'bg-red-100 text-red-800 border-red-200',
        'Won': 'bg-green-100 text-green-800 border-green-200',
        'Marketing Only': 'bg-sky-50 text-sky-600 border-sky-100' // Added for bulk uploads
    };

    const getIcon = (s: LeadStatus) => {
        if (s === 'Unsubscribed') return 'block'; // 🛑
        if (s === 'Bounced') return 'skull'; // 💀
        if (s === 'Lost') return 'thumb_down';
        return null;
    };

    const icon = getIcon(status);

    return (
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-sm flex items-center gap-1 ${statusStyles[status] || 'bg-gray-100 text-gray-600'}`}>
            {icon && <span className="material-symbols-outlined text-[12px]">{icon}</span>}
            {status}
        </span>
    );
};

const statusColorMap: Record<LeadStatus, string> = {
    'New': 'bg-indigo-500',
    'Qualified': 'bg-emerald-500',
    'Contacted': 'bg-amber-500',
    'Showing': 'bg-fuchsia-500',
    'Lost': 'bg-slate-400',
    'Bounced': 'bg-red-500',
    'Unsubscribed': 'bg-red-800',
    'Won': 'bg-green-600'
};

const funnelOptions: Array<{ id: LeadFunnelType; label: string; description: string; icon: string; accent: string }> = [
    {
        id: 'universal_sales',
        label: 'Universal Welcome Drip',
        description: 'Every new chatbot lead lands here automatically.',
        icon: 'filter_alt',
        accent: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
        id: 'homebuyer',
        label: 'AI-Powered Homebuyer Journey',
        description: 'Guide serious buyers from first chat to offer-ready.',
        icon: 'explore',
        accent: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
        id: 'seller',
        label: 'AI-Powered Seller Funnel',
        description: 'Show clients how the concierge tells their story.',
        icon: 'campaign',
        accent: 'text-orange-600 bg-orange-50 border-orange-200'
    },
    {
        id: 'postShowing',
        label: 'After-Showing Follow-Up',
        description: 'Spin up smart follow-ups with surveys and urgency nudges.',
        icon: 'rate_review',
        accent: 'text-purple-600 bg-purple-50 border-purple-200'
    }
];

const funnelLabelMap = funnelOptions.reduce<Record<LeadFunnelType, string>>((map, option) => {
    map[option.id] = option.label;
    return map;
}, {
    universal_sales: 'Universal Welcome Drip',
    homebuyer: 'AI-Powered Homebuyer Journey',
    seller: 'AI-Powered Seller Funnel',
    postShowing: 'After-Showing Follow-Up'
} as Record<LeadFunnelType, string>);

const LeadsList: React.FC<{
    leads: Lead[];
    onSchedule: (lead: Lead) => void;
    onContact: (lead: Lead) => void;
    leadFunnels: Record<string, LeadFunnelType | null>;
    onAssignFunnel?: (lead: Lead, funnel: LeadFunnelType | null) => void | Promise<void>;
    onEditLead?: (lead: Lead) => void;
    onDeleteLead?: (leadId: string) => void;
}> = ({ leads, onSchedule, onContact, leadFunnels, onAssignFunnel, onEditLead, onDeleteLead }) => {
    const navigate = useNavigate();
    const [expandedLeadIds, setExpandedLeadIds] = useState<string[]>([]);

    // Removed auto-expansion useEffect to ensure cards start closed as requested.

    const toggleLead = (leadId: string) => {
        const expanded = expandedLeadIds.includes(leadId);
        void analyticsService.trackInteraction({
            eventType: 'lead_accordion_toggle',
            eventData: {
                leadId,
                expanded: !expanded,
                timestamp: new Date().toISOString()
            }
        });
        setExpandedLeadIds((prev) =>
            prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
        );
    };

    const handleAssign = (lead: Lead, funnel: LeadFunnelType | null) => {
        if (!onAssignFunnel) return;
        onAssignFunnel(lead, funnel);
    };

    return (
        <div className="space-y-6">
            {leads.map((lead) => {
                const isExpanded = expandedLeadIds.includes(lead.id);
                const selectedFunnel = leadFunnels[lead.id] ?? null;
                return (
                    <div
                        key={lead.id}
                        className="relative bg-white/20 backdrop-blur-3xl rounded-none sm:rounded-[1.5rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border-y sm:border border-white/50 p-5 transition-all duration-500 hover:shadow-[0_20px_40px_-10px_rgba(99,102,241,0.2)] hover:-translate-y-1 hover:bg-white/30 group ring-1 ring-white/40"
                    >
                        {/* Status Accent Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusColorMap[lead.status] || 'bg-slate-200'}`} />

                        <div className="flex items-center gap-4">
                            <div className="relative group-hover:scale-105 transition-transform duration-500">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/60 to-white/30 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg border border-white/60">
                                    {lead.name.charAt(0)}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-white ${statusColorMap[lead.status] || 'bg-slate-400'}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight drop-shadow-sm">{lead.name}</h3>
                                    <LeadStatusBadge status={lead.status} />
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                                    <span className="inline-flex items-center gap-2 font-medium">
                                        <span className="material-symbols-outlined text-indigo-400 text-lg">calendar_today</span>
                                        {formatDate(lead.date)}
                                    </span>
                                    {selectedFunnel && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[11px] uppercase tracking-wide border border-indigo-100">
                                            <span className="material-symbols-outlined text-sm">bolt</span>
                                            {funnelLabelMap[selectedFunnel]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => toggleLead(lead.id)}
                                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-90 shadow-sm border border-white/50 ${isExpanded
                                    ? 'bg-slate-900 text-white shadow-xl'
                                    : 'bg-white/40 text-slate-500 hover:bg-white/60 hover:text-indigo-600'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-2xl transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>
                        </div>

                        {isExpanded && (
                            <>
                                {/* Quick Actions Row */}
                                <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onEditLead?.(lead)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/50 text-slate-600 text-xs font-semibold border border-slate-200 hover:bg-white hover:text-indigo-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                            Edit Lead
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Detect current context to navigate to correct inbox
                                                const currentPath = window.location.pathname;
                                                if (currentPath.includes('agent-blueprint-dashboard')) {
                                                    navigate(`/agent-blueprint-dashboard/inbox?leadId=${encodeURIComponent(lead.email || lead.id)}`);
                                                } else if (currentPath.includes('demo-dashboard')) {
                                                    navigate(`/demo-dashboard/inbox?leadId=${encodeURIComponent(lead.email || lead.id)}`);
                                                } else {
                                                    navigate(`/inbox?leadId=${encodeURIComponent(lead.email || lead.id)}`);
                                                }
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50/50 text-indigo-600 text-xs font-semibold border border-indigo-100/50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">chat</span>
                                            View AI Chat
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to delete this lead?')) {
                                                    onDeleteLead?.(lead.id);
                                                }
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50/50 text-red-600 text-xs font-semibold border border-red-100/50 hover:bg-red-50 hover:border-red-200 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {/* AI Conversation Snippet */}
                                <div className="mt-4">
                                    <div className="p-4 bg-gradient-to-br from-white/60 to-slate-50/60 rounded-xl border border-white/60 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400/50" />
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[12px] text-indigo-600">smart_toy</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">Latest AI Summary</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">2h ago</span>
                                        </div>

                                        <div className="pl-7">
                                            <p className="text-sm text-slate-600 italic leading-relaxed line-clamp-2">
                                                "{lead.lastMessage || "No recent AI interaction recorded. This lead is fresh."}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 border-t border-slate-200/50 pt-4">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 mb-1">Assign to Leads Funnel (v2)</h4>
                                            <p className="text-xs text-slate-500 mb-4">Drop them into the automation that fits their journey.</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:text-slate-300 transition-colors"
                                            onClick={() => handleAssign(lead, null)}
                                            disabled={!selectedFunnel}
                                        >
                                            Clear selection
                                        </button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                        {funnelOptions.map((option) => {
                                            const isActive = selectedFunnel === option.id;
                                            return (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => handleAssign(lead, option.id)}
                                                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${isActive
                                                        ? `${option.accent} shadow-md ring-1 ring-white/50`
                                                        : 'border-white/50 bg-white/30 text-slate-600 hover:border-indigo-200 hover:bg-white/60'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                                        <span className="material-symbols-outlined text-base">{option.icon}</span>
                                                        {option.label}
                                                    </div>
                                                    <p className="mt-1 text-xs opacity-80">{option.description}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-200/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                                    <button
                                        onClick={() => onContact(lead)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-outlined w-5 h-5">contact_mail</span>
                                        <span>Contact Lead</span>
                                    </button>
                                    <button
                                        onClick={() => onSchedule(lead)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold text-emerald-700 bg-emerald-50 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-200"
                                    >
                                        <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                                        <span>Schedule</span>
                                    </button>
                                </div>
                            </>
                        )
                        }
                    </div>
                );
            })}
        </div >
    );
};

const formatReminderLabel = (minutes?: number) => {
    if (!minutes || minutes <= 0) return '';
    if (minutes === 15) return '15 min before';
    if (minutes === 30) return '30 min before';
    if (minutes === 60) return '1 hour before';
    if (minutes === 120) return '2 hours before';
    if (minutes === 180) return '3 hours before';
    if (minutes === 720) return '12 hours before';
    if (minutes === 1440) return '1 day before';
    if (minutes % 60 === 0) return `${minutes / 60} hours before`;
    return `${minutes} min before`;
};

const AppointmentsList: React.FC<{ appointments: Appointment[] }> = ({ appointments }) => {
    const upcoming = [...appointments].sort((a, b) => {
        const aStart = a.startIso ? new Date(a.startIso).getTime() : new Date(a.date).getTime();
        const bStart = b.startIso ? new Date(b.startIso).getTime() : new Date(b.date).getTime();
        return aStart - bStart;
    });

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 pl-2">Upcoming Appointments</h3>
            {upcoming.length > 0 ? (
                <ul className="space-y-6">
                    {upcoming.map(appt => (
                        <li
                            key={appt.id}
                            className="relative bg-white/20 backdrop-blur-3xl rounded-none sm:rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border-y sm:border border-white/50 p-7 transition-all duration-500 hover:shadow-xl hover:bg-white/30 group overflow-hidden ring-1 ring-white/40"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500/80" />
                            <div className="flex items-center justify-between gap-6">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-slate-800 truncate drop-shadow-sm">{appt.leadName || 'Unnamed contact'}</p>
                                        {appt.type && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/40 text-slate-700 border border-white/60 shadow-sm">
                                                {appt.type}
                                            </span>
                                        )}
                                    </div>
                                    {appt.propertyAddress && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.propertyAddress)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-slate-500 mt-0.5 truncate hover:text-indigo-600 hover:underline flex items-center gap-1 group/link"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover/link:text-indigo-500 transition-colors">location_on</span>
                                            {appt.propertyAddress}
                                        </a>
                                    )}
                                    {appt.notes && (
                                        <p className="mt-2 text-sm text-slate-600 max-h-[3.5rem] overflow-hidden">
                                            <span className="font-medium text-slate-500">Notes:</span> {appt.notes}
                                        </p>
                                    )}
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        {appt.remindAgent && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/40 text-slate-600 border border-slate-200/60">
                                                <span className="material-symbols-outlined text-base leading-none">notifications_active</span>
                                                Agent {formatReminderLabel(appt.agentReminderMinutes)}
                                            </span>
                                        )}
                                        {appt.remindClient && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50/50 text-emerald-600 border border-emerald-100">
                                                <span className="material-symbols-outlined text-base leading-none">person</span>
                                                Client {formatReminderLabel(appt.clientReminderMinutes)}
                                            </span>
                                        )}
                                        {appt.meetLink && (
                                            <a
                                                href={appt.meetLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50/50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition"
                                            >
                                                <span className="material-symbols-outlined text-base leading-none">videocam</span>
                                                Join link
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <p className="font-semibold text-slate-800">{appt.time}</p>
                                    <p className="text-sm text-slate-400">{formatDate(appt.date)}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8 text-slate-500">
                    <span className="material-symbols-outlined w-10 h-10 mx-auto text-slate-300 mb-2">calendar_today</span>
                    <p>No upcoming appointments.</p>
                </div>
            )}
        </div>
    );
};

interface LeadsAndAppointmentsPageProps {
    leads: Lead[];
    appointments: Appointment[];
    onAddNewLead: (leadData: NewLeadPayload) => void;
    onBackToDashboard: () => void;
    onNewAppointment?: (appt: Appointment) => void;
    resolvePropertyForLead?: (lead: Lead | null) => Property | undefined;
    onAssignFunnel?: (lead: Lead, funnel: LeadFunnelType | null) => Promise<void> | void;
    onRefreshData?: () => Promise<void> | void;
    onUpdateLead?: (lead: Lead) => void;
    onDeleteLead?: (leadId: string) => void;
}

const LeadsAndAppointmentsPage: React.FC<LeadsAndAppointmentsPageProps> = ({
    leads,
    appointments,
    onAddNewLead,
    onBackToDashboard,
    onNewAppointment,
    resolvePropertyForLead,
    onAssignFunnel,
    onRefreshData,
    onUpdateLead,
    onDeleteLead
}) => {
    // const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const activeTab = (tabParam === 'appointments' || tabParam === 'leads') ? tabParam : 'leads';

    const setActiveTab = (tab: 'leads' | 'appointments') => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('tab', tab);
            return newParams;
        }, { replace: true });
    };
    const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    // const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false); // Removed
    const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
    const [contactingLead, setContactingLead] = useState<Lead | null>(null);
    const [initialContactTab, setInitialContactTab] = useState<'email' | 'call' | 'sms' | 'note' | undefined>(undefined);
    // const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false); // Removed unused state
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [syncAgeSeconds, setSyncAgeSeconds] = useState(0);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [showMarketingLeads, setShowMarketingLeads] = useState(false);
    const [leadFunnels, setLeadFunnels] = useState<Record<string, LeadFunnelType | null>>(() => {
        const initial: Record<string, LeadFunnelType | null> = {};
        leads.forEach((lead) => {
            initial[lead.id] = lead.funnelType ?? null;
        });
        return initial;
    });

    // Handle deep linking for actions
    useEffect(() => {
        const leadId = searchParams.get('id');
        const action = searchParams.get('action');

        if (leadId && leads.length > 0) {
            const lead = leads.find(l => l.id === leadId);
            if (lead) {
                if (action === 'contact') {
                    setContactingLead(lead);
                    const tabParam = searchParams.get('initialTab');
                    if (tabParam === 'email' || tabParam === 'call' || tabParam === 'sms' || tabParam === 'note') {
                        setInitialContactTab(tabParam);
                    } else {
                        setInitialContactTab(undefined);
                    }
                    setIsContactModalOpen(true);
                } else if (action === 'view') {
                    setEditingLead(lead);
                    setIsAddLeadModalOpen(true);
                }

                // Optional: Clear params after processing to avoid reopening on refresh
                // setSearchParams(prev => {
                //      const newParams = new URLSearchParams(prev);
                //      newParams.delete('id');
                //      newParams.delete('action');
                //      return newParams;
                // }, { replace: true });
            }
        }
    }, [searchParams, leads]);

    useEffect(() => {
        setLeadFunnels((prev) => {
            const next: Record<string, LeadFunnelType | null> = {};
            let changed = Object.keys(prev).length !== leads.length;
            leads.forEach((lead) => {
                const normalized = lead.funnelType ?? null;
                next[lead.id] = normalized;
                if (prev[lead.id] !== normalized) {
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [leads]);

    useEffect(() => {
        setLastSyncedAt(new Date());
    }, [leads, appointments]);

    const trackExportEvent = useCallback(() => {
        void analyticsService.trackInteraction({
            eventType: 'leads_export',
            eventData: {
                leadCount: leads.length,
                appointmentCount: appointments.length,
                timestamp: new Date().toISOString()
            }
        });
    }, [appointments.length, leads.length]);

    const handleOpenScheduleModal = (lead: Lead | null = null) => {
        setSchedulingLead(lead);
        setIsScheduleModalOpen(true);
    };

    const handleOpenExportModal = () => {
        trackExportEvent();
        setIsExportModalOpen(true);
    };

    const triggerPeriodicRefresh = useCallback(async () => {
        if (!onRefreshData) return;
        await onRefreshData();
        setLastSyncedAt(new Date());
    }, [onRefreshData]);

    useEffect(() => {
        if (!lastSyncedAt) {
            setSyncAgeSeconds(0);
            return;
        }

        const updateAge = () => {
            const ageSeconds = Math.max(0, Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000));
            setSyncAgeSeconds(ageSeconds);
        };

        updateAge();
        const timer = setInterval(updateAge, 1000);
        return () => clearInterval(timer);
    }, [lastSyncedAt]);

    useEffect(() => {
        const interval = setInterval(() => {
            void triggerPeriodicRefresh();
        }, 60000);
        return () => clearInterval(interval);
    }, [triggerPeriodicRefresh]);

    const handleAssignFunnel = async (lead: Lead, funnel: LeadFunnelType | null) => {
        const previous = leadFunnels[lead.id] ?? null;
        setLeadFunnels((prev) => ({
            ...prev,
            [lead.id]: funnel
        }));
        if (!onAssignFunnel) return;
        try {
            await onAssignFunnel(lead, funnel);
        } catch (error) {
            console.error('Failed to assign funnel', error);
            setLeadFunnels((prev) => ({
                ...prev,
                [lead.id]: previous
            }));
        }
    };

    const handleCloseScheduleModal = () => {
        setIsScheduleModalOpen(false);
        setSchedulingLead(null);
    };

    const handleOpenContactModal = (lead: Lead) => {
        setContactingLead(lead);
        setIsContactModalOpen(true);
    };

    const handleCloseContactModal = () => {
        setIsContactModalOpen(false);
        setContactingLead(null);
    };

    const handleSwitchToSchedule = (lead: Lead) => {
        handleCloseContactModal();
        // Use a slight delay to ensure the first modal has time to close
        // and avoid UI jank from overlapping modals.
        setTimeout(() => {
            handleOpenScheduleModal(lead);
        }, 100);
    };

    const handleEditLead = (lead: Lead) => {
        setEditingLead(lead);
        setIsAddLeadModalOpen(true);
    };

    const handleSaveLead = (leadData: NewLeadPayload) => {
        if (editingLead && onUpdateLead) {
            // ... existing update logic ...
            const updatedLead: Lead = {
                ...editingLead,
                name: leadData.name,
                email: leadData.email,
                phone: leadData.phone,
                lastMessage: leadData.message,
                source: leadData.source,
                funnelType: leadData.funnelType as LeadFunnelType | undefined
            };
            onUpdateLead(updatedLead);
        } else {
            onAddNewLead(leadData);
        }
        setIsAddLeadModalOpen(false);
        setEditingLead(null);
    };

    // Filter leads based on Marketing Status
    const filteredLeads = leads.filter(lead => {
        if (showMarketingLeads) {
            // Show everything (active + marketing)
            return true;
        }
        // Default: Hide 'Marketing Only' leads
        return lead.status !== 'Marketing Only';
    });

    // Derived count
    const marketingLeadCount = leads.filter(l => l.status === 'Marketing Only').length;

    const handleBulkUpload = async (newLeads: Array<any>) => {
        // In a real app, this should be a bulk API call.
        // For now, we simulate serial addition.
        console.log('Processing bulk upload...', newLeads.length);
        for (const lead of newLeads) {
            onAddNewLead({
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                // Cast string to any if types conflict temporarily, 
                // but LeadStatus now includes 'Marketing Only' so it should be fine.
                // @ts-ignore
                status: lead.status,
                source: 'Bulk Import',
                message: 'Imported via CSV'
            });
            // Small delay to prevent UI freeze if many
            if (newLeads.length > 50) await new Promise(r => setTimeout(r, 10));
        }
        alert(`Successfully imported ${newLeads.length} leads!`);
    };


    return (
        <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden font-sans text-slate-900 selection:bg-indigo-500/30">
            {/* Decorative Background Blobs for Glassmorphism Depth - Fixed for Parallax */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px] -z-10 animate-pulse" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-200/40 rounded-full blur-[120px] -z-10 animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="fixed top-[20%] right-[20%] w-[30%] h-[30%] bg-blue-200/30 rounded-full blur-[100px] -z-10 animate-blob" />
            <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[100px] -z-10" />
            <div className="fixed inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-30 -z-10 pointer-events-none" />

            <LeadUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={handleBulkUpload}
            />

            <div className="max-w-screen-2xl mx-auto py-10 px-0 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mb-8 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold group px-4 sm:px-0"
                >
                    <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    Back to Dashboard
                </button>

                <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 px-4 sm:px-0">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Leads & Appointments</h1>
                        <p className="text-slate-500 mt-2 text-lg">Manage your prospects and schedule showings.</p>
                        <div className="flex items-center gap-2 mt-4 text-xs font-bold text-slate-400 bg-white/50 w-fit px-3 py-1.5 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
                            <span className={`w-2 h-2 rounded-full ${syncAgeSeconds < 60 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                            {lastSyncedAt ? `Synced ${formatSyncTime(syncAgeSeconds)}` : 'Syncing...'}
                        </div>
                    </div>
                    <div className="w-full lg:w-auto flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsAddLeadModalOpen(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined text-2xl">person_add</span>
                                <span className="text-lg">Add Lead</span>
                            </button>
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-6 py-5 bg-indigo-50 text-indigo-600 rounded-2xl font-bold border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-[0.98]"
                                title="Bulk Import Leads"
                            >
                                <span className="material-symbols-outlined text-2xl">upload_file</span>
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleOpenScheduleModal()}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined text-slate-400">event</span>
                                <span className="text-sm">Schedule</span>
                            </button>
                            <button
                                onClick={() => setIsExportModalOpen(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined text-slate-400">download</span>
                                <span className="text-sm">Export</span>
                            </button>
                        </div>
                    </div>
                </header>

                <PageTipBanner
                    pageId="leads_appointments"
                    tips={[
                        "Use the 'Active Leads' tab to focus on high-priority prospects.",
                        "Toggle 'Show Marketing Leads' to view bulk imported contacts.",
                        "Drag and drop leads between columns in the Leads view to update their status.",
                        "Click on any appointment to view details or join the video call."
                    ]}
                />

                <main>
                    <div className="border-b border-slate-200 mb-6 px-4 sm:px-0 flex justify-between items-center bg-white/40 backdrop-blur-md rounded-t-2xl p-2">
                        <nav className="flex space-x-2">
                            <TabButton
                                isActive={activeTab === 'leads'}
                                onClick={() => setActiveTab('leads')}
                                icon="group"
                                count={leads.filter(l => l.status !== 'Marketing Only').length}
                            >
                                Active Leads
                            </TabButton>
                            <TabButton
                                isActive={activeTab === 'appointments'}
                                onClick={() => setActiveTab('appointments')}
                                icon="calendar_today"
                                count={appointments.length}
                            >
                                Appointments
                            </TabButton>
                        </nav>

                        {/* Marketing List Toggle */}
                        {marketingLeadCount > 0 && activeTab === 'leads' && (
                            <button
                                onClick={() => setShowMarketingLeads(!showMarketingLeads)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all mr-2 ${showMarketingLeads ? 'bg-indigo-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 shadow-sm'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{showMarketingLeads ? 'visibility' : 'visibility_off'}</span>
                                {showMarketingLeads ? 'Hiding' : 'Show'} {marketingLeadCount} Marketing Leads
                            </button>
                        )}
                    </div>

                    {activeTab === 'leads' ? (
                        <div className="space-y-8 px-4 sm:px-0">
                            {/* Search and Filters could go here */}

                            {filteredLeads.length > 0 ? (
                                <LeadsList
                                    leads={filteredLeads}
                                    onSchedule={handleOpenScheduleModal}
                                    onContact={handleOpenContactModal}
                                    leadFunnels={leadFunnels}
                                    onAssignFunnel={handleAssignFunnel}
                                    onEditLead={handleEditLead}
                                    onDeleteLead={onDeleteLead}
                                />
                            ) : (
                                <div className="text-center py-20 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl">
                                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <span className="material-symbols-outlined text-5xl text-indigo-300">group_off</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900">No leads found</h3>
                                    <p className="text-slate-500 mt-2 max-w-md mx-auto">
                                        {showMarketingLeads ? "Your filters are too strict." : "You don't have any active leads yet. Try adding one or importing a list."}
                                    </p>
                                    {!showMarketingLeads && marketingLeadCount > 0 && (
                                        <button
                                            onClick={() => setShowMarketingLeads(true)}
                                            className="mt-6 px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-lg border border-indigo-50 hover:bg-indigo-50 hover:scale-105 transition-all"
                                        >
                                            View {marketingLeadCount} Marketing Leads
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="space-y-8 mt-12 opacity-50 hover:opacity-100 transition-opacity duration-500">
                                <div className="flex items-center gap-4 before:h-px before:flex-1 before:bg-slate-300 after:h-px after:flex-1 after:bg-slate-300">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calendar Overview</span>
                                </div>
                                <div className="rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white/80 backdrop-blur-xl">
                                    <CalendarView appointments={appointments} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 px-4 sm:px-0">
                            <div className="rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white/80 backdrop-blur-xl">
                                <CalendarView appointments={appointments} />
                            </div>
                            <AppointmentsList appointments={appointments} />
                        </div>
                    )}
                </main>
            </div>

            {isAddLeadModalOpen && (
                <AddLeadModal
                    onClose={() => {
                        setIsAddLeadModalOpen(false);
                        setEditingLead(null);
                    }}
                    onAddLead={handleSaveLead}
                    initialData={editingLead ? {
                        name: editingLead.name,
                        email: editingLead.email,
                        phone: editingLead.phone,
                        message: editingLead.lastMessage,
                        source: editingLead.source,
                        funnelType: editingLead.funnelType
                    } : undefined}
                    isEditing={!!editingLead}
                />
            )}

            {isScheduleModalOpen && (
                <ScheduleAppointmentModal
                    lead={schedulingLead}
                    onClose={handleCloseScheduleModal}
                    onSchedule={async (apptData: ScheduleAppointmentFormData) => {
                        const propertyContext = resolvePropertyForLead?.(schedulingLead ?? null);
                        const linkedPropertyId =
                            propertyContext?.id || schedulingLead?.interestedProperties?.[0] || undefined;
                        const linkedPropertyAddress =
                            apptData.location || propertyContext?.address || propertyContext?.title || undefined;
                        let scheduledResult: SchedulerResult | null = null;
                        try {
                            scheduledResult = await scheduleAppointment({
                                name: apptData.name,
                                email: apptData.email,
                                phone: apptData.phone,
                                date: apptData.date,
                                time: apptData.time,
                                message: apptData.message,
                                kind: apptData.kind,
                                leadId: schedulingLead?.id,
                                propertyId: linkedPropertyId,
                                propertyAddress: linkedPropertyAddress,
                                remindAgent: apptData.remindAgent,
                                remindClient: apptData.remindClient,
                                agentReminderMinutes: apptData.agentReminderMinutes,
                                clientReminderMinutes: apptData.clientReminderMinutes
                            });
                        } catch (error) {
                            console.error('Failed to schedule appointment:', error);
                        }
                        const scheduledAt = scheduledResult?.scheduledAt;
                        const apptId = scheduledResult?.appointmentId || `appt-${Date.now()}`;
                        const appt: Appointment = {
                            id: apptId,
                            type: apptData.kind,
                            date: scheduledAt?.date || apptData.date,
                            time: scheduledAt?.time || apptData.time,
                            leadId: schedulingLead?.id ?? null,
                            propertyId: linkedPropertyId ?? null,
                            propertyAddress: linkedPropertyAddress ?? apptData.location ?? undefined,
                            notes: apptData.message || '',
                            status: 'Scheduled',
                            leadName: schedulingLead?.name ?? apptData.name,
                            email: apptData.email,
                            phone: apptData.phone,
                            remindAgent: apptData.remindAgent,
                            remindClient: apptData.remindClient,
                            agentReminderMinutes: apptData.agentReminderMinutes,
                            clientReminderMinutes: apptData.clientReminderMinutes,
                            meetLink: scheduledResult?.meetLink,
                            startIso: scheduledAt?.startIso,
                            endIso: scheduledAt?.endIso
                        };
                        onNewAppointment?.(appt);
                        handleCloseScheduleModal();
                    }}
                />
            )}

            {isContactModalOpen && contactingLead && (
                <ContactLeadModal
                    lead={contactingLead}
                    onClose={() => {
                        handleCloseContactModal();
                        setInitialContactTab(undefined);
                    }}
                    onSchedule={() => handleSwitchToSchedule(contactingLead)}
                    initialTab={initialContactTab}
                />
            )}

            {isExportModalOpen && (
                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    leads={leads}
                    appointments={appointments}
                />
            )}

        </div>
    );
};

const TabButton: React.FC<{ isActive: boolean; onClick: () => void; icon: string; count: number; children: React.ReactNode }> = ({ isActive, onClick, icon, count, children }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-8 py-4 text-sm font-black rounded-2xl transition-all duration-300 ${isActive
                ? 'bg-white/60 backdrop-blur-lg text-primary-600 shadow-lg shadow-indigo-100/50 scale-105 ring-1 ring-white/80'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/20'
                }`}
        >
            <span className={`material-symbols-outlined text-2xl ${isActive ? 'scale-110' : ''}`}>{icon}</span>
            <span className="tracking-tight">{children}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-black shadow-inner ${isActive ? 'bg-primary-50 text-primary-700' : 'bg-white/40 text-slate-600'}`}>
                {count}
            </span>
        </button>
    );
};

export default LeadsAndAppointmentsPage;
