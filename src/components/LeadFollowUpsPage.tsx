
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
    const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(activeFollowUps[0]?.id || null);

    const handleStatusChange = (id: string, newStatus: 'active' | 'paused' | 'cancelled') => {
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
    };

    const selectedFollowUp = useMemo(() => activeFollowUps.find(f => f.id === selectedFollowUpId), [activeFollowUps, selectedFollowUpId]);
    const selectedLead = useMemo(() => leads.find(l => l.id === selectedFollowUp?.leadId), [leads, selectedFollowUp]);
    const selectedSequence = useMemo(() => sequences.find(s => s.id === selectedFollowUp?.sequenceId), [sequences, selectedFollowUp]);

    const isDetailView = selectedFollowUpId !== null;

    return (
        <div className="flex h-full bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden">
            {/* Lead List Pane */}
            <aside className={`
                ${isDetailView ? 'hidden' : 'flex'} w-full
                md:flex flex-col md:w-2/5 lg:w-1/3 max-w-sm h-full border-r border-slate-200
            `}>
                <div className="p-4 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">Active Follow-ups</h2>
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
                               {selectedFollowUp.status === 'active' &&
                                    <button onClick={() => handleStatusChange(selectedFollowUp.id, 'paused')} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition">Pause Sequence</button>
                                }
                                {selectedFollowUp.status === 'paused' &&
                                     <button onClick={() => handleStatusChange(selectedFollowUp.id, 'active')} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 transition">Resume Sequence</button>
                                }
                                <button onClick={() => handleStatusChange(selectedFollowUp.id, 'cancelled')} className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">Cancel Sequence</button>
                                <button className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">Contact Manually</button>
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
    );
};

export default LeadFollowUpsPage;