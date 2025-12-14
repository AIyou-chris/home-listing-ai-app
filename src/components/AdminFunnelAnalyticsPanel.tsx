import React, { useEffect, useMemo, useRef, useState } from 'react';
import QuickEmailModal from './QuickEmailModal';
import { adminLeadsService, type CreateLeadPayload } from '../services/adminLeadsService';
import { supabase } from '../services/supabase';

// CONSTANTS & TYPES

const UNIVERSAL_FUNNEL_ID = 'universal_sales';

interface FunnelAnalyticsPanelProps {
    onBackToDashboard?: () => void;
    variant?: 'page' | 'embedded';
    title?: string;
    subtitle?: string;
    hideBackButton?: boolean;
}

type EditableStep = {
    id: string;
    title: string;
    description: string;
    icon: string;
    delay: string;
    type: 'Email' | 'SMS' | 'Task' | string;
    subject: string;
    content: string;
    attachments?: Array<{ id: string; name: string; url?: string }>;
};

const splitCsvLine = (line: string): string[] => {
    const matches = line.match(/("([^"]|"")*"|[^,]+)(?=,|$)/g);
    if (!matches) return [];
    return matches.map((value) => value.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
};

const buildDefaultSteps = (): EditableStep[] => ([
    {
        id: `${UNIVERSAL_FUNNEL_ID}-1`,
        title: 'The Market is Changing Fast',
        description: 'Introduce urgency and the need for modern tech',
        icon: 'bolt',
        delay: 'Immediate (Day 0)',
        type: 'Email',
        subject: 'The market is moving fast — here’s how to stay ahead',
        content:
            'Today’s market rewards speed and modern tech. See how AI sidekicks keep you ahead of competitors and close faster.\n\nCTA: Watch our overview video.',
        attachments: []
    },
    {
        id: `${UNIVERSAL_FUNNEL_ID}-2`,
        title: 'You’re Falling Behind (But You Don’t Have To)',
        description: 'Highlight outdated tools vs AI sidekicks',
        icon: 'trending_down',
        delay: '+2 days',
        type: 'Email',
        subject: 'Don’t let outdated tools slow you down',
        content:
            'Most agents are stuck with old workflows. Our AI sidekicks handle follow-ups, scheduling, and responses instantly so you don’t miss a lead.\n\nCTA: Book a demo.',
        attachments: []
    },
    {
        id: `${UNIVERSAL_FUNNEL_ID}-3`,
        title: 'Grow Your Pipeline, Not Just Your To-Do List',
        description: 'Show automation and smarter workflows',
        icon: 'auto_awesome',
        delay: '+4 days',
        type: 'Email',
        subject: 'Grow your pipeline without adding more tasks',
        content:
            'Automations, funnels, and AI sidekicks keep your pipeline active while you focus on high-value conversations.\n\nCTA: Try the lead import tool.',
        attachments: []
    },
    {
        id: `${UNIVERSAL_FUNNEL_ID}-4`,
        title: 'Real Stories, Real Results',
        description: 'Share success stories and optional case study',
        icon: 'insights',
        delay: '+6 days',
        type: 'Email',
        subject: 'How top agents are winning with AI (real results)',
        content:
            'Here’s how teams are booking more appointments and closing faster with our platform. Optional: attach a case study.\n\nCTA: Join our private user group.',
        attachments: []
    },
    {
        id: `${UNIVERSAL_FUNNEL_ID}-5`,
        title: 'Your AI Assistant is Waiting',
        description: 'Urgency to onboard now',
        icon: 'schedule_send',
        delay: '+8 days',
        type: 'Email',
        subject: 'Your AI assistant is ready — don’t let competitors jump ahead',
        content:
            'Every day you wait, someone else gets ahead. Let’s launch your AI sidekick so you never miss another opportunity.\n\nCTA: Schedule your onboarding call now.',
        attachments: []
    }
]);

const parseCsvContent = (content: string): CreateLeadPayload[] => {
    const rows = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (!rows.length) return [];
    const header = splitCsvLine(rows.shift()!);
    if (!header.length) return [];
    return rows
        .map((line) => {
            const values = splitCsvLine(line);
            const record = header.reduce<Record<string, string>>((acc, key, index) => {
                acc[key.toLowerCase()] = values[index] ?? '';
                return acc;
            }, {});
            const payload: CreateLeadPayload = {
                name: record['name'] || record['full name'] || '',
                email: (record['email'] || '').toLowerCase(),
                phone: record['phone'] || record['cell'] || record['mobile'] || undefined,
                notes: record['notes'] || record['description'] || undefined,
                source: record['source'] || 'CSV Import',
                funnelId: UNIVERSAL_FUNNEL_ID,
                funnelType: UNIVERSAL_FUNNEL_ID
            };
            return payload.name && payload.email ? payload : null;
        })
        .filter((entry): entry is CreateLeadPayload => entry !== null);
};

const initPanelState = () => {
    const defaultOpen = typeof window === 'undefined' || window.innerWidth >= 768;
    return {
        universal: defaultOpen
    };
};

const AdminFunnelAnalyticsPanel: React.FC<FunnelAnalyticsPanelProps> = ({
    onBackToDashboard,
    variant = 'page',
    title = 'Admin Sales Funnel',
    subtitle = '5-touch sales sequence to convert agents to the HomeListingAI platform.',
    hideBackButton = false
}) => {
    const isEmbedded = variant === 'embedded';
    const [programSteps, setProgramSteps] = useState<EditableStep[]>(buildDefaultSteps());
    const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);
    const [expandedProgramStepIds, setExpandedProgramStepIds] = useState<string[]>([]);
    const [panelExpanded, setPanelExpanded] = useState(initPanelState);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const [isImportingCsv, setIsImportingCsv] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // const [scoringSummary, setScoringSummary] = useState({
    //     totalLeads: 0,
    //     conversionRate: 0,
    //     appointments: 0,
    //     averageScore: 0
    // });
    // const [activeTab, setActiveTab] = useState<'funnel' | 'automation'>('funnel');
    const [sendingTestId, setSendingTestId] = useState<string | null>(null);

    // ANALYTICS & STATE

    const sampleMergeData = useMemo(() => ({
        lead: {
            name: 'Jamie Carter',
            firstName: 'Jamie',
            company: 'Keller Williams'
        },
        agent: {
            name: 'Admin Team',
            company: 'HomeListingAI'
        }
    }), []);



    const mergeTokens = (template: string) => {
        return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path: string) => {
            const [bucket, key] = path.split('.');
            if (!bucket || !key) return '';
            return (sampleMergeData as any)[bucket]?.[key] ?? '';
        });
    };

    const handleSendTestEmail = async (step: EditableStep) => {
        if (sendingTestId) return;
        setSendingTestId(step.id);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) {
                alert('Could not find your email address.');
                return;
            }
            const subject = mergeTokens(step.subject);
            const body = mergeTokens(step.content).replace(/\n/g, '<br/>');
            const response = await fetch('/api/admin/email/quick-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: user.email,
                    subject: `[TEST] ${subject}`,
                    html: body
                })
            });
            if (response.ok) alert(`Test email sent to ${user.email}`);
            else throw new Error('Failed to send test email');
        } catch (error) {
            console.error(error);
            alert('Failed to send test email.');
        } finally {
            setSendingTestId(null);
        }
    };

    useEffect(() => {
        const fetchFunnel = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Not logged in");

                const response = await fetch(`/api/admin/marketing/sequences/${UNIVERSAL_FUNNEL_ID}`, {
                    headers: { 'x-user-id': user.id }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        setProgramSteps(buildDefaultSteps());
                        return;
                    }
                    throw new Error("Failed to fetch funnel");
                }

                const data = await response.json();
                const steps = (data.sequence?.steps || data.steps || []).map((s: any, i: number) => ({
                    id: s.id || `${UNIVERSAL_FUNNEL_ID}-${i}`,
                    title: s.subject || `Touch ${i + 1}`,
                    description: s.body?.slice(0, 50) || 'Step content',
                    icon: i === 0 ? 'bolt' : 'email',
                    delay: s.delay || '+2 days',
                    type: s.type || 'Email',
                    subject: s.subject || '',
                    content: s.body || s.emailBody || '',
                    attachments: s.attachments || []
                }));

                if (steps.length) setProgramSteps(steps);
                else setProgramSteps(buildDefaultSteps());
            } catch (err) {
                console.warn(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFunnel();
    }, []);

    const togglePanel = (panel: keyof typeof panelExpanded) => {
        setPanelExpanded((prev) => ({ ...prev, [panel]: !prev[panel] }));
    };

    const toggleProgramStep = (id: string) => {
        setExpandedProgramStepIds((prev) =>
            prev.includes(id) ? prev.filter((stepId) => stepId !== id) : [...prev, id]
        );
    };

    const handleUpdateProgramStep = (id: string, field: keyof EditableStep, value: string) => {
        setProgramSteps((prev) =>
            prev.map((step) => (step.id === id ? { ...step, [field]: value } : step))
        );
    };

    const handleAddProgramStep = () => {
        const newStep: EditableStep = {
            id: `${UNIVERSAL_FUNNEL_ID}-${Date.now()}`,
            title: 'New Touch',
            description: 'Next step in potential client journey',
            icon: 'forward_to_inbox',
            delay: '+2 days',
            type: 'Email',
            subject: 'New Message',
            content: 'Hi {{lead.firstName}}, ...'
        };
        setProgramSteps((prev) => [...prev, newStep]);
    };

    const handleRemoveProgramStep = (id: string) => {
        setProgramSteps((prev) => prev.filter((step) => step.id !== id));
    };

    const handleMoveProgramStep = (id: string, direction: 'up' | 'down') => {
        setProgramSteps((prev) => {
            const index = prev.findIndex(s => s.id === id);
            if (index === -1) return prev;
            const target = direction === 'up' ? index - 1 : index + 1;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            const [item] = next.splice(index, 1);
            next.splice(target, 0, item);
            return next;
        });
    };

    const handleSaveProgramSteps = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            await fetch(`/api/admin/marketing/sequences/${UNIVERSAL_FUNNEL_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                body: JSON.stringify({ steps: programSteps })
            });
            alert('Funnel saved!');
        } catch (e) {
            console.error(e);
            alert('Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImportStatus('Processing...');
        try {
            const text = await file.text();
            const parsed = parseCsvContent(text);
            for (const p of parsed) {
                await adminLeadsService.create({ ...p, funnelId: UNIVERSAL_FUNNEL_ID, funnelType: UNIVERSAL_FUNNEL_ID });
            }
            setImportStatus(`Imported ${parsed.length} leads.`);
        } catch (e) {
            setImportStatus('Error importing CSV.');
        } finally {
            event.target.value = '';
        }
    };

    return (
        <div className={isEmbedded ? '' : 'bg-slate-50 min-h-full'}>
            <div className={`${isEmbedded ? '' : 'mx-auto max-w-screen-2xl'} ${isEmbedded ? 'py-6' : 'py-10'} px-4 sm:px-6 lg:px-8`}>
                {!hideBackButton && onBackToDashboard && (
                    <button
                        type="button"
                        onClick={onBackToDashboard}
                        className="mb-6 flex items-center space-x-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-800"
                    >
                        <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                        <span>Back to Dashboard</span>
                    </button>
                )}

                <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                        <p className="text-slate-500">{subtitle}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsQuickEmailOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
                        >
                            Open Email Library
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
                        >
                            Import CSV
                        </button>
                    </div>
                </header>

                <input type="file" ref={fileInputRef} className="hidden" onChange={handleCsvImport} accept=".csv" />
                {importStatus && <div className="mb-4 text-sm text-blue-600">{importStatus}</div>}

                {/* Render Single Funnel Panel */}
                <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
                                Universal Sales Funnel
                            </span>
                            <h2 className="text-xl font-bold text-slate-900 mt-2">Agent Acquisition Sequence</h2>
                            <p className="text-slate-500 text-sm">Automated 5-touch drip to convert real estate agents.</p>
                        </div>
                        <button onClick={() => togglePanel('universal')} className="text-slate-500 hover:text-slate-700">
                            {panelExpanded.universal ? 'Collapse' : 'Expand'}
                        </button>
                    </div>

                    {panelExpanded.universal && (
                        <div className="space-y-4">
                            {programSteps.map((step, index) => (
                                <div key={step.id} className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100"
                                        onClick={() => toggleProgramStep(step.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-slate-400">{step.icon}</span>
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase">Step {index + 1} • {step.delay}</div>
                                                <div className="font-semibold text-slate-900">{step.title}</div>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-400">
                                            {expandedProgramStepIds.includes(step.id) ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </div>

                                    {expandedProgramStepIds.includes(step.id) && (
                                        <div className="p-4 border-t border-slate-200 bg-white space-y-4">
                                            <input
                                                value={step.title}
                                                onChange={(e) => handleUpdateProgramStep(step.id, 'title', e.target.value)}
                                                className="w-full border p-2 rounded"
                                                placeholder="Step Title"
                                            />
                                            <input
                                                value={step.subject}
                                                onChange={(e) => handleUpdateProgramStep(step.id, 'subject', e.target.value)}
                                                className="w-full border p-2 rounded"
                                                placeholder="Email Subject"
                                            />
                                            <textarea
                                                value={step.content}
                                                onChange={(e) => handleUpdateProgramStep(step.id, 'content', e.target.value)}
                                                className="w-full border p-2 rounded h-32"
                                                placeholder="Email Content"
                                            />
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleSendTestEmail(step)} className="text-blue-600 text-sm font-medium">Send Test</button>
                                                    <button onClick={() => handleRemoveProgramStep(step.id)} className="text-red-600 text-sm font-medium">Delete</button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleMoveProgramStep(step.id, 'up')} className="text-slate-500 text-sm">Move Up</button>
                                                    <button onClick={() => handleMoveProgramStep(step.id, 'down')} className="text-slate-500 text-sm">Move Down</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className="flex justify-between pt-4">
                                <button onClick={handleAddProgramStep} className="text-blue-600 font-semibold text-sm">+ Add Step</button>
                                <button onClick={handleSaveProgramSteps} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">Save Changes</button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
            {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} />}
        </div>
    );
};

export default AdminFunnelAnalyticsPanel;
