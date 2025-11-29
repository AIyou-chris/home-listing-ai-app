

import React, { useEffect, useState, useMemo } from 'react';
import Modal from './Modal';
import { Lead } from '../types';
import { leadsService, PhoneLogPayload } from '../services/leadsService';
import { logLeadContact } from '../services/aiFunnelService';

type FollowUpSequenceSummary = {
    id: string;
    name: string;
    description?: string;
};

type CallOutcome = 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'other';

type MarketingSequencesResponse = {
    sequences?: FollowUpSequenceSummary[];
};

type ActiveFollowUpSummary = {
    leadId: string;
    sequenceId: string;
};

type ActiveFollowUpsResponse = {
    activeFollowUps?: ActiveFollowUpSummary[];
};

const TabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    icon: string;
    children: React.ReactNode;
}> = ({ isActive, onClick, icon, children }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            isActive 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
        }`}
    >
        <span className="material-symbols-outlined w-5 h-5">{icon}</span>
        <span>{children}</span>
    </button>
);

interface ContactLeadModalProps {
    lead: Lead;
    onClose: () => void;
    onSchedule: (lead: Lead) => void;
    onSendEmail?: (payload: { subject: string; body: string }) => void;
    onAddNote?: (note: string) => void;
}

const FormRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mb-4">{children}</div>
);

const Label: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 mb-1.5">
        {children}
    </label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
    />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea
        {...props}
        rows={6}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
    />
);

const defaultDateTimeValue = () => {
    const now = new Date();
    const offset = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return offset.toISOString().slice(0, 16);
};

const ContactLeadModal: React.FC<ContactLeadModalProps> = ({ lead, onClose, onSchedule, onSendEmail, onAddNote }) => {
    const [activeTab, setActiveTab] = useState<'email' | 'call' | 'note'>('email');
    const [emailSubject, setEmailSubject] = useState(`Re: Your inquiry`);
    const [emailMessage, setEmailMessage] = useState(
`Hi ${lead.name.split(' ')[0]},

Thank you for your interest. I'd love to discuss this property with you and answer any questions you may have.

Would you be available for a quick call or showing?

Best regards,`
    );
    const [noteContent, setNoteContent] = useState('');
    const [callNotes, setCallNotes] = useState('');
    const [callOutcome, setCallOutcome] = useState<CallOutcome>('connected');
    const [callStartedAt, setCallStartedAt] = useState(defaultDateTimeValue());
    const [isSavingCall, setIsSavingCall] = useState(false);
    const [callLogs, setCallLogs] = useState<
        Array<{ id: string; callStartedAt: string; callOutcome: string; callNotes?: string }>
    >([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [logsError, setLogsError] = useState<string | null>(null);
    const [availableSequences, setAvailableSequences] = useState<FollowUpSequenceSummary[]>([]);
    const [isLoadingSequences, setIsLoadingSequences] = useState(false);
    const [selectedSequenceId, setSelectedSequenceId] = useState('');
    const [enrollMessage, setEnrollMessage] = useState<string | null>(null);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [enrolledSequenceIds, setEnrolledSequenceIds] = useState<string[]>([]);

    const availableSequenceOptions = useMemo(() => {
        if (!availableSequences.length) return [];
        return availableSequences.map(seq => ({ ...seq, disabled: enrolledSequenceIds.includes(seq.id) }));
    }, [availableSequences, enrolledSequenceIds]);

    useEffect(() => {
        let isMounted = true;
        const loadLogs = async () => {
            try {
                setIsLoadingLogs(true);
                const payload = await leadsService.listPhoneLogs(lead.id);
                if (isMounted && payload?.logs) {
                    setCallLogs(payload.logs);
                }
            } catch (error) {
                if (isMounted) {
                    const message = error instanceof Error ? error.message : 'Could not load phone logs';
                    setLogsError(message);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingLogs(false);
                }
            }
        };

        loadLogs();
        return () => {
            isMounted = false;
        };
    }, [lead.id]);

    useEffect(() => {
        let isMounted = true;
        const loadSequences = async () => {
            try {
                setIsLoadingSequences(true);
                const res = await fetch('/api/admin/marketing/sequences');
                if (res.ok) {
                    const data: MarketingSequencesResponse = await res.json();
                    if (isMounted && Array.isArray(data?.sequences)) {
                        setAvailableSequences(data.sequences.map(seq => ({ id: seq.id, name: seq.name, description: seq.description })));
                    }
                }
            } catch (error) {
                console.error('Failed to load sequences', error);
            } finally {
                if (isMounted) setIsLoadingSequences(false);
            }
        };

        const loadExistingEnrollments = async () => {
            try {
                const res = await fetch('/api/admin/marketing/active-followups');
                if (res.ok) {
                    const data: ActiveFollowUpsResponse = await res.json();
                    if (isMounted && Array.isArray(data?.activeFollowUps)) {
                        const ids = data.activeFollowUps
                            .filter((followUp) => followUp.leadId === lead.id)
                            .map((followUp) => followUp.sequenceId);
                        setEnrolledSequenceIds(ids);
                    }
                }
            } catch (error) {
                console.error('Failed to load active follow-ups', error);
            }
        };

        loadSequences();
        loadExistingEnrollments();

        return () => {
            isMounted = false;
        };
    }, [lead.id]);

    useEffect(() => {
        if (!selectedSequenceId && availableSequenceOptions.length) {
            const firstAvailable = availableSequenceOptions.find(option => !option.disabled);
            if (firstAvailable) setSelectedSequenceId(firstAvailable.id);
        }
    }, [availableSequenceOptions, selectedSequenceId]);

    const handleEnrollSequence = async () => {
        if (!selectedSequenceId || enrolledSequenceIds.includes(selectedSequenceId)) return;
        setIsEnrolling(true);
        setEnrollMessage(null);
        try {
            const res = await fetch('/api/admin/marketing/active-followups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: lead.id, sequenceId: selectedSequenceId })
            });
            if (!res.ok) {
                const data = (await res.json().catch(() => null)) as { error?: string } | null;
                throw new Error(data?.error || 'Could not enroll lead in sequence');
            }
            setEnrolledSequenceIds(prev => [...prev, selectedSequenceId]);
            setEnrollMessage('Lead enrolled in the selected sequence successfully.');
        } catch (error) {
            console.error('Failed to enroll in sequence', error);
            const message = error instanceof Error ? error.message : 'Could not enroll lead in sequence.';
            setEnrollMessage(message);
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleSaveCallLog = async () => {
        const payload: PhoneLogPayload = {
            callOutcome,
            callNotes,
            callStartedAt: callStartedAt ? new Date(callStartedAt).toISOString() : undefined
        };

        setIsSavingCall(true);
        try {
            const result = await leadsService.createPhoneLog(lead.id, payload);
            if (result?.log) {
                setCallLogs(prev => [result.log, ...prev]);
            }
            void logLeadContact(lead, {
                method: 'call',
                outcome: callOutcome,
                notes: callNotes
            });
            setCallNotes('');
            setCallOutcome('connected');
            setCallStartedAt(defaultDateTimeValue());
            alert('Call log saved!');
            onClose();
        } catch (error) {
            console.error('Failed to save call log', error);
            const message = error instanceof Error ? error.message : 'Could not save call log right now.';
            alert(message);
        } finally {
            setIsSavingCall(false);
        }
    };

    const handleTabClick = (tab: 'email' | 'call' | 'note' | 'schedule') => {
        if (tab === 'schedule') {
            onSchedule(lead);
        } else {
            setActiveTab(tab);
            if (tab === 'note') {
                setNoteContent('');
            }
            if (tab === 'call') {
                setCallNotes('');
                setCallOutcome('connected');
                setCallStartedAt(defaultDateTimeValue());
            }
        }
    }

    const titleNode = (
        <div>
            <h3 className="text-xl font-bold text-slate-800">Contact {lead.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5">Log an interaction or schedule a follow-up</p>
        </div>
    );
    
    return (
        <Modal title={titleNode} onClose={onClose}>
            <div className="border-b border-slate-200">
                <nav className="flex items-center">
                    <TabButton isActive={activeTab === 'email'} onClick={() => handleTabClick('email')} icon='mail'>Email</TabButton>
                    <TabButton isActive={activeTab === 'call'} onClick={() => handleTabClick('call')} icon='call'>Log Call</TabButton>
                    <TabButton isActive={activeTab === 'note'} onClick={() => handleTabClick('note')} icon='edit_note'>Add Note</TabButton>
                    <TabButton isActive={false} onClick={() => handleTabClick('schedule')} icon='calendar_today'>Schedule</TabButton>
                </nav>
            </div>
            
            <div className="p-6">
                <FormRow>
                    <Label htmlFor="sequence-select">Enroll in follow-up sequence</Label>
                    {isLoadingSequences ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            Loading sequences...
                        </div>
                    ) : availableSequenceOptions.length === 0 ? (
                        <p className="text-sm text-slate-500">No sequences available yet. Build your first follow-up flow in the AI Funnel tab.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    id="sequence-select"
                                    value={selectedSequenceId}
                                    onChange={(e) => setSelectedSequenceId(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                >
                                    {availableSequenceOptions.map(option => (
                                        <option key={option.id} value={option.id} disabled={option.disabled}>
                                            {option.name} {option.disabled ? '(already enrolled)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleEnrollSequence}
                                    disabled={!selectedSequenceId || enrolledSequenceIds.includes(selectedSequenceId) || isEnrolling}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${enrolledSequenceIds.includes(selectedSequenceId) ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'} transition`}
                                >
                                    {isEnrolling ? 'Enrolling...' : 'Enroll'}
                                </button>
                            </div>
                            {availableSequenceOptions.find(opt => opt.id === selectedSequenceId)?.description && (
                                <p className="text-xs text-slate-500">{availableSequenceOptions.find(opt => opt.id === selectedSequenceId)?.description}</p>
                            )}
                            {enrollMessage && (
                                <p className="text-xs text-slate-600">{enrollMessage}</p>
                            )}
                        </div>
                    )}
                </FormRow>
                {activeTab === 'email' && (
                    <>
                        <FormRow>
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                        </FormRow>
                        <FormRow>
                            <Label htmlFor="message">Message</Label>
                            <Textarea id="message" value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} />
                        </FormRow>
                    </>
                )}
                 {activeTab === 'call' && (
                    <>
                        <FormRow>
                            <Label htmlFor="call-started-at">Call Time</Label>
                            <Input
                                id="call-started-at"
                                type="datetime-local"
                                value={callStartedAt}
                                onChange={(e) => setCallStartedAt(e.target.value)}
                            />
                        </FormRow>
                        <FormRow>
                            <Label htmlFor="call-outcome">Outcome</Label>
                            <select
                                id="call-outcome"
                                value={callOutcome}
                                onChange={(e) => setCallOutcome(e.target.value as CallOutcome)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                            >
                                <option value="connected">Connected</option>
                                <option value="voicemail">Voicemail</option>
                                <option value="no_answer">No Answer</option>
                                <option value="busy">Busy</option>
                                <option value="other">Other</option>
                            </select>
                        </FormRow>
                        <FormRow>
                            <Label htmlFor="call-notes">Log Call Details</Label>
                            <Textarea
                                id="call-notes"
                                value={callNotes}
                                onChange={(e) => setCallNotes(e.target.value)}
                                placeholder={`Log details about your call with ${lead.name}... e.g., "Left voicemail, will try again tomorrow."`}
                            />
                        </FormRow>
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-700">Recent Phone Logs</h4>
                            {isLoadingLogs && <p className="text-sm text-slate-500">Loading phone logs...</p>}
                            {logsError && <p className="text-sm text-red-600">{logsError}</p>}
                            {!isLoadingLogs && !logsError && callLogs.length === 0 && (
                                <p className="text-sm text-slate-500">No phone logs yet.</p>
                            )}
                            {!isLoadingLogs && !logsError && callLogs.length > 0 && (
                                <ul className="space-y-2 max-h-40 overflow-y-auto">
                                    {callLogs.map(log => (
                                        <li key={log.id} className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm">
                                            <p className="text-sm font-semibold text-slate-700 flex items-center justify-between gap-3">
                                                <span className="capitalize">{log.callOutcome.replace('_', ' ')}</span>
                                                <span className="text-xs text-slate-500">
                                                    {log.callStartedAt ? new Date(log.callStartedAt).toLocaleString() : ''}
                                                </span>
                                            </p>
                                            {log.callNotes && (
                                                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                                                    {log.callNotes}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                 )}
                 {activeTab === 'note' && (
                    <FormRow>
                        <Label htmlFor="note-content">Add a Note</Label>
                        <Textarea 
                            id="note-content" 
                            value={noteContent} 
                            onChange={(e) => setNoteContent(e.target.value)} 
                            placeholder={`Add a private note for ${lead.name}...`}
                        />
                    </FormRow>
                 )}
            </div>

            <div className="flex justify-end items-center px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2">
                        Cancel
                    </button>
                    {activeTab === 'email' && (
                        <button
                            type="button"
                            onClick={() => {
                                const body = emailMessage.trim();
                                const subject = emailSubject.trim() || `Message for ${lead.name}`;
                                if (!body) {
                                    alert('Please enter a message before sending.');
                                    return;
                                }
                                onSendEmail?.({ subject, body });
                                alert('Email queued for sending!');
                                onClose();
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition"
                        >
                            <span className="material-symbols-outlined w-5 h-5">send</span>
                            <span>Send Email</span>
                        </button>
                    )}
                    {(activeTab === 'call' || activeTab === 'note') && (
                         <button
                            type="button"
                            disabled={activeTab === 'call' ? isSavingCall : false}
                            onClick={() => {
                                if (activeTab === 'call') {
                                    handleSaveCallLog();
                                } else {
                                    const trimmed = noteContent.trim();
                                    if (!trimmed) {
                                        alert('Please enter a note before saving.');
                                        return;
                                    }
                                    onAddNote?.(trimmed);
                                    alert('Note saved!');
                                    onClose();
                                }
                            }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition ${isSavingCall ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <span className="material-symbols-outlined w-5 h-5">save</span>
                            <span>{activeTab === 'call' ? (isSavingCall ? 'Saving...' : 'Save Call Log') : 'Save Note'}</span>
                        </button>
                    )}
                </div>
        </Modal>
    );
};

export default ContactLeadModal;
