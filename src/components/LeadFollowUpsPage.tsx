
import React, { useState, useMemo } from 'react';
import { Lead, FollowUpSequence, ActiveLeadFollowUp, FollowUpHistoryEvent, FollowUpHistoryEventType } from '../types';

interface LeadFollowUpsPageProps {
    leads: Lead[];
    sequences: FollowUpSequence[];
    activeFollowUps: ActiveLeadFollowUp[];
}

const FollowUpStatusBadge: React.FC<{ status: 'active' | 'paused' | 'completed' | 'cancelled' }> = ({ status }) => {
    const statusStyles = {
        active: 'bg-green-100 text-green-700 ring-green-600/20',
        paused: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
        completed: 'bg-blue-100 text-blue-700 ring-blue-600/20',
        cancelled: 'bg-red-100 text-red-700 ring-red-600/20'
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ring-1 ring-inset ${statusStyles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

const LeadListItem: React.FC<{
    followUp: ActiveLeadFollowUp;
    lead?: Lead;
    sequence?: FollowUpSequence;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ followUp, lead, sequence, isSelected, onSelect }) => {
    if (!lead || !sequence) return null;

    const progress = sequence.steps.length > 0 ? ((followUp.currentStepIndex + 1) / sequence.steps.length) * 100 : 0;

    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-4 border-l-4 transition-colors ${isSelected ? 'border-primary-500 bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}
        >
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800">{lead.name}</h3>
                <FollowUpStatusBadge status={followUp.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">{sequence.name}</p>
            <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>Step {followUp.currentStepIndex + 1} of {sequence.steps.length}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </button>
    );
};

const TimelineItem: React.FC<{ event: FollowUpHistoryEvent }> = ({ event }) => {
    const icons: Record<FollowUpHistoryEventType, { icon: string; color: string; }> = {
        enroll: { icon: 'auto_awesome', color: 'text-purple-600' },
        'email-sent': { icon: 'mail', color: 'text-blue-600' },
        'email-opened': { icon: 'drafts', color: 'text-green-600' },
        'task-created': { icon: 'edit', color: 'text-yellow-600' },
        'meeting-set': { icon: 'calendar_month', color: 'text-indigo-600' },
        pause: { icon: 'pause_circle', color: 'text-orange-600' },
        resume: { icon: 'play_circle', color: 'text-green-600' },
        cancel: { icon: 'cancel', color: 'text-red-600' },
        complete: { icon: 'check_circle', color: 'text-blue-600' },
    };
    const { icon, color } = icons[event.type];

    return (
        <li className="relative flex gap-x-4">
            <div className="absolute left-0 top-0 flex w-8 justify-center -bottom-2">
                <div className="w-px bg-slate-200"></div>
            </div>
            <div className="relative flex h-8 w-8 flex-none items-center justify-center bg-white">
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-white">
                    <span className={`material-symbols-outlined w-5 h-5 ${color}`}>{icon}</span>
                </div>
            </div>
            <div className="flex-auto py-1.5">
                <p className="text-sm text-slate-600">{event.description}</p>
                <time className="mt-1 text-xs text-slate-400">
                    {new Date(event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </time>
            </div>
        </li>
    );
};


const LeadFollowUpsPage: React.FC<LeadFollowUpsPageProps> = ({ leads, sequences, activeFollowUps: initialActiveFollowUps }) => {
    const [activeFollowUps, setActiveFollowUps] = useState(initialActiveFollowUps);
    const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showTips, setShowTips] = useState(true);

    // Update local state when props change
    React.useEffect(() => {
        setActiveFollowUps(initialActiveFollowUps);
        if (initialActiveFollowUps.length > 0 && !selectedFollowUpId) {
            setSelectedFollowUpId(initialActiveFollowUps[0].id);
        }
    }, [initialActiveFollowUps, selectedFollowUpId]);

    const handleStatusChange = async (id: string, newStatus: 'active' | 'paused' | 'cancelled') => {
        setIsUpdating(true);
        try {
            const response = await fetch(`/api/admin/marketing/active-followups/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                const data = await response.json();
                setActiveFollowUps(prev => prev.map(f => 
                    f.id === id ? data.followUp : f
                ));
                console.log(`✅ Follow-up ${newStatus}: ${id}`);
            } else {
                console.error('Failed to update follow-up status');
                // Fallback to local update
                setActiveFollowUps(prev => prev.map(f => {
                    if (f.id === id) {
                        const historyEvent: FollowUpHistoryEvent = {
                            id: `h-${Date.now()}`,
                            type: newStatus === 'active' ? 'resume' : newStatus === 'paused' ? 'pause' : 'cancel',
                            description: `Sequence ${newStatus}.`,
                            date: new Date().toISOString(),
                        };
                        return { ...f, status: newStatus, history: [historyEvent, ...f.history] };
                    }
                    return f;
                }));
            }
        } catch (error) {
            console.error('Error updating follow-up:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const selectedFollowUp = useMemo(() => activeFollowUps.find(f => f.id === selectedFollowUpId), [activeFollowUps, selectedFollowUpId]);
    const selectedLead = useMemo(() => leads.find(l => l.id === selectedFollowUp?.leadId), [leads, selectedFollowUp]);
    const selectedSequence = useMemo(() => sequences.find(s => s.id === selectedFollowUp?.sequenceId), [sequences, selectedFollowUp]);

    const isDetailView = selectedFollowUpId !== null;

    // Calculate stats
    const stats = {
        total: activeFollowUps.length,
        active: activeFollowUps.filter(f => f.status === 'active').length,
        paused: activeFollowUps.filter(f => f.status === 'paused').length,
        completed: activeFollowUps.filter(f => f.status === 'completed').length,
        cancelled: activeFollowUps.filter(f => f.status === 'cancelled').length,
    };

    if (activeFollowUps.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-8">
                <div className="text-center">
                    <span className="material-symbols-outlined w-16 h-16 text-slate-300 mx-auto mb-4 block">group</span>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Active Follow-ups</h3>
                    <p className="text-slate-500 mb-4">
                        Leads will appear here when they're enrolled in follow-up sequences.
                    </p>
                    <div className="text-sm text-slate-400">
                        💡 Tip: Create sequences in the "Lead Sequences" tab and enroll leads to start automated follow-ups.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tips Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-6">
                <button
                    type="button"
                    onClick={() => setShowTips(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
                    aria-expanded={showTips}
                >
                    <span className="material-symbols-outlined text-xl">{showTips ? 'psychiatry' : 'help'}</span>
                    {showTips ? 'Hide Follow-up Tips' : 'Show Follow-up Tips'}
                    <span className="material-symbols-outlined text-base ml-auto">{showTips ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showTips && (
                    <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
                        <div>
                            <h4 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-lg">timeline</span>
                                Staying On Track
                            </h4>
                            <ul className="space-y-1.5 list-disc list-inside">
                                <li><strong>Work the nearest deadlines:</strong> Sort by the next step date and clear today’s tasks before moving on.</li>
                                <li><strong>Log the personal touches:</strong> Use the “Contact Manually” button then add a quick note so the timeline stays accurate.</li>
                                <li><strong>Pause with a plan:</strong> Paused follow-ups should include a note about what you’re waiting on—schedule a reminder.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-lg">outgoing_mail</span>
                                When To Use Quick Email
                            </h4>
                            <ul className="space-y-1.5 list-disc list-inside">
                                <li><strong>Hot intel drops:</strong> Send new property details or pricing updates instantly without editing the automation.</li>
                                <li><strong>Personal check-ins:</strong> Fire off a Mailgun-powered note between automated touchpoints to keep momentum.</li>
                                <li><strong>Keep sequences clean:</strong> Let the automation handle the cadence—use Quick Email for the human moments.</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Follow-up Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                        <div className="text-sm text-slate-500">Total</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                        <div className="text-sm text-slate-500">Active</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
                        <div className="text-sm text-slate-500">Paused</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                        <div className="text-sm text-slate-500">Completed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                        <div className="text-sm text-slate-500">Cancelled</div>
                    </div>
                </div>
            </div>

            {/* Main Follow-ups Interface */}
            <div className="flex h-96 bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden">
                {/* Lead List Pane */}
                <aside className={`
                    ${isDetailView ? 'hidden' : 'flex'} w-full
                    md:flex flex-col md:w-2/5 lg:w-1/3 max-w-sm h-full border-r border-slate-200
                `}>
                    <div className="p-4 border-b border-slate-200 flex-shrink-0">
                        <h3 className="text-lg font-bold text-slate-800">Active Follow-ups</h3>
                        <p className="text-sm text-slate-500">({activeFollowUps.length} leads in sequences)</p>
                    </div>
                <div className="flex-grow overflow-y-auto">
                    <div className="divide-y divide-slate-200">
                        {activeFollowUps.map(followUp => (
                            <LeadListItem
                                key={followUp.id}
                                followUp={followUp}
                                lead={leads.find(l => l.id === followUp.leadId)}
                                sequence={sequences.find(s => s.id === followUp.sequenceId)}
                                isSelected={selectedFollowUpId === followUp.id}
                                onSelect={() => setSelectedFollowUpId(followUp.id)}
                            />
                        ))}
                    </div>
                </div>
            </aside>

            {/* Detail Pane */}
            <main className={`
                ${isDetailView ? 'flex' : 'hidden'} w-full
                md:flex flex-col flex-grow h-full
            `}>
                {selectedFollowUp && selectedLead && selectedSequence ? (
                    <div className="flex flex-col h-full">
                        <header className="p-4 border-b border-slate-200 flex-shrink-0">
                             <div className="flex items-center justify-between">
                                <div>
                                    <button onClick={() => setSelectedFollowUpId(null)} className="md:hidden flex items-center gap-1 text-sm font-semibold text-primary-600 mb-2">
                                        <span className="material-symbols-outlined w-4 h-4">chevron_left</span>
                                        Back to List
                                    </button>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedLead.name}</h2>
                                    <p className="text-sm text-slate-500">In sequence: <span className="font-semibold">{selectedSequence.name}</span></p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FollowUpStatusBadge status={selectedFollowUp.status} />
                                </div>
                            </div>
                        </header>
                        <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Timeline</h3>
                            <ul role="list" className="">
                                {selectedFollowUp.history.map((event) => <TimelineItem key={event.id} event={event} />)}
                            </ul>
                        </div>
                        <footer className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
                            <div className="flex items-center justify-end gap-2">
                               {selectedFollowUp.status === 'active' && (
                                    <button 
                                        onClick={() => handleStatusChange(selectedFollowUp.id, 'paused')} 
                                        disabled={isUpdating}
                                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUpdating ? 'Updating...' : 'Pause Sequence'}
                                    </button>
                                )}
                                {selectedFollowUp.status === 'paused' && (
                                     <button 
                                        onClick={() => handleStatusChange(selectedFollowUp.id, 'active')} 
                                        disabled={isUpdating}
                                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUpdating ? 'Updating...' : 'Resume Sequence'}
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleStatusChange(selectedFollowUp.id, 'cancelled')} 
                                    disabled={isUpdating}
                                    className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUpdating ? 'Updating...' : 'Cancel Sequence'}
                                </button>
                                <button className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                                    Contact Manually
                                </button>
                            </div>
                        </footer>
                    </div>
                ) : (
                    <div className="hidden md:flex items-center justify-center h-full flex-col text-slate-500 bg-slate-50">
                        <span className="material-symbols-outlined w-16 h-16 mb-4">group</span>
                        <h2 className="text-2xl font-bold">Lead Follow-ups</h2>
                        <p className="mt-2">Select a lead to see their sequence timeline.</p>
                    </div>
                )}
            </main>
            </div>
        </div>
    );
};

export default LeadFollowUpsPage;
