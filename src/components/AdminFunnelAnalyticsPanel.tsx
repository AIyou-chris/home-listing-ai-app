import React, { useEffect, useMemo, useRef, useState } from 'react';
import QuickEmailModal from './QuickEmailModal';
import { adminLeadsService, type CreateLeadPayload } from '../services/adminLeadsService';
import { supabase } from '../services/supabase';

// Note: The blueprint for the funnel now lives on the backend server.
// The server will automatically "seed" the database with the default funnel if it doesn't exist for a user.

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

const UNIVERSAL_FUNNEL_ID = 'universal_sales';

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

const FunnelAnalyticsPanel: React.FC<FunnelAnalyticsPanelProps> = ({
    onBackToDashboard,
    variant = 'page',
    title = 'Lead Scoring & Universal Sales Funnel',
    subtitle = 'Single 5-touch universal funnel for every admin lead with urgency, benefits, and strong CTAs.',
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
    const [scoringSummary, setScoringSummary] = useState({
        totalLeads: 0,
        conversionRate: 0,
        appointments: 0,
        averageScore: 0
    });
    const [sequenceCards, setSequenceCards] = useState<Array<{ id: string; title: string; replies: number; opens: number; meetings: number; tag: string }>>([]);
    const [topSteps, setTopSteps] = useState<Array<{ title: string; replyRate: number; meetingRate: number }>>([]);
    const [weakSteps, setWeakSteps] = useState<Array<{ title: string; replyRate: number; meetingRate: number }>>([]);
    const [activeTab, setActiveTab] = useState<'funnel' | 'automation'>('funnel');
    const [sendingTestId, setSendingTestId] = useState<string | null>(null);

    const handleSendTestEmail = async (step: EditableStep) => {
        if (sendingTestId) return;
        setSendingTestId(step.id);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) {
                alert('Could not find your email address to send the test to.');
                return;
            }

            const subject = mergeTokens(step.subject);
            // Replace newlines with <br/> for HTML email body
            const body = mergeTokens(step.content).replace(/\n/g, '<br/>');

            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
            const response = await fetch(`${apiUrl}/api/admin/email/quick-send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: user.email,
                    subject: `[TEST] ${subject}`,
                    html: body,
                    text: mergeTokens(step.content)
                })
            });

            if (response.ok) {
                alert(`Test email sent to ${user.email}`);
            } else {
                throw new Error('Failed to send test email');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to send test email. Check console for details.');
        } finally {
            setSendingTestId(null);
        }
    };

    type MergeBuckets = {
        lead: Record<string, string>;
        agent: Record<string, string>;
    };

    useEffect(() => {
        const fetchFunnel = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error("You must be logged in to view funnels.");
                }

                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
                const response = await fetch(`${apiUrl}/api/admin/marketing/sequences/${UNIVERSAL_FUNNEL_ID}`, {
                    headers: { 'x-user-id': user.id }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn('⚠️ Funnel not found, using default universal funnel');
                        setProgramSteps(buildDefaultSteps());
                        return;
                    }
                    throw new Error(`Failed to fetch funnel: ${response.statusText}`);
                }

                const data = await response.json();

                // Transform API data to match component structure
                const transformedSteps = (data.sequence?.steps || data.steps || []).map(
                    (step: { id: string; subject?: string; delayDays?: number; delayHours?: number; delay?: string; emailBody?: string; body?: string; type?: string; attachments?: Array<{ id: string; name: string; url?: string }> }, index: number) => ({
                        id: step.id || `${UNIVERSAL_FUNNEL_ID}-${index + 1}`,
                        title: step.subject || `Touch ${index + 1}`,
                        description: step.body?.slice(0, 80) || step.emailBody?.slice(0, 80) || `Step ${index + 1}`,
                        icon: index === 0 ? 'bolt' : 'forward_to_inbox',
                        delay: step.delay
                            ? step.delay
                            : (step.delayDays ?? 0) > 0
                                ? `+${step.delayDays} day${(step.delayDays ?? 0) > 1 ? 's' : ''}`
                                : 'Immediate',
                        type: (step.type as EditableStep['type']) || 'Email',
                        subject: step.subject || `Touch ${index + 1}`,
                        content: step.body || step.emailBody || '',
                        attachments: Array.isArray(step.attachments) ? step.attachments : []
                    })
                );

                setProgramSteps(transformedSteps.length ? transformedSteps : buildDefaultSteps());

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                // Don't set error state for 404s, just log a warning
                if (!errorMessage.includes('404') && !errorMessage.includes('Not Found')) {
                    setError(errorMessage);
                    console.error(err);
                } else {
                    console.warn('⚠️ Funnel endpoint not available:', errorMessage);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchFunnel();
    }, []);

    useEffect(() => {
        const loadAnalytics = async () => {
            setIsLoading(true);
            try {
                const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
                const summaryRes = await fetch(`${apiUrl}/api/admin/analytics/funnel-summary`);
                const perfRes = await fetch(`${apiUrl}/api/admin/analytics/funnel-performance`);
                const summary = summaryRes.ok ? await summaryRes.json() : null;
                const perf = perfRes.ok ? await perfRes.json() : null;

                if (summary) {
                    setScoringSummary({
                        totalLeads: summary.totalLeads ?? 0,
                        conversionRate: summary.conversionRate ?? 0,
                        appointments: summary.appointments ?? 0,
                        averageScore: summary.avgScore ?? 0
                    });
                }
                if (perf) {
                    setTopSteps(Array.isArray(perf.topSteps) ? perf.topSteps : []);
                    setWeakSteps(Array.isArray(perf.weakSteps) ? perf.weakSteps : []);
                    setSequenceCards(Array.isArray(perf.sequences) ? perf.sequences : []);
                }
            } catch (err) {
                console.warn('Failed to load admin funnel analytics', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadAnalytics();
    }, []);

    const togglePanel = (panel: keyof typeof panelExpanded) => {
        setPanelExpanded((prev) => ({ ...prev, [panel]: !prev[panel] }));
    };

    const sampleMergeData = useMemo<MergeBuckets>(
        () => ({
            lead: {
                name: 'Jamie Carter',
                interestAddress: '123 Palm Ave',
                timeline: '45 days',
                matchOne: 'Palm Oasis · $890k · Pool + ADU',
                matchTwo: 'Vista Row · $815k · Walkable lifestyle',
                matchThree: 'Sierra Modern · $925k · Canyon views',
                questionOne: 'Does the solar system transfer?',
                questionTwo: 'Can we convert the loft into a 4th bedroom?'
            },
            agent: {
                name: 'Jordan Lee',
                phone: '(555) 987-6543',
                website: 'https://homelistingai.app/jordan',
                aiCardUrl: 'https://homelistingai.app/card/jordan'
            }
        }),
        []
    );
    const COMMON_TOKEN_HINTS = ['{{lead.name}}', '{{lead.interestAddress}}', '{{agent.name}}', '{{agent.phone}}', '{{agent.aiCardUrl}}'];

    const mergeTokens = (template: string) => {
        return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path: string) => {
            const [bucket, key] = path.split('.');
            if (!bucket || !key) return '';
            if (!(bucket in sampleMergeData)) return '';
            const bucketData = sampleMergeData[bucket as keyof MergeBuckets];
            if (key in bucketData) {
                return bucketData[key as keyof typeof bucketData] ?? '';
            }
            return '';
        });
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
            title: 'New Step',
            description: 'Describe the next universal touchpoint.',
            icon: 'auto_fix_high',
            delay: '+1 day',
            type: 'Custom',
            subject: 'Subject line',
            content: 'Message body with {{lead.name}} tokens describing the benefit + CTA.'
        };
        setProgramSteps((prev) => [...prev, newStep]);
    };

    const handleRemoveProgramStep = (id: string) => {
        setProgramSteps((prev) => prev.filter((step) => step.id !== id));
        setExpandedProgramStepIds((prev) => prev.filter((stepId) => stepId !== id));
    };

    const handleMoveProgramStep = (id: string, direction: 'up' | 'down') => {
        setProgramSteps((prev) => {
            const index = prev.findIndex(step => step.id === id);
            if (index === -1) return prev;
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= prev.length) return prev;
            const next = [...prev];
            const [removed] = next.splice(index, 1);
            next.splice(targetIndex, 0, removed);
            return next;
        });
    };

    const handleAttachFile = async (stepId: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        try {
            const file = files[0];
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
            const formData = new FormData();
            formData.append('file', file);
            formData.append('stepId', stepId);
            const { data: { user } } = await supabase.auth.getUser();
            const headers: HeadersInit | undefined = user ? { 'x-user-id': user.id } : undefined;
            const response = await fetch(`${apiUrl}/api/admin/marketing/sequences/${UNIVERSAL_FUNNEL_ID}/attachments`, {
                method: 'POST',
                body: formData,
                headers
            });
            const data = response.ok ? await response.json().catch(() => ({})) : null;
            const attachment = {
                id: data?.id || `${stepId}-file-${Date.now()}`,
                name: data?.name || file.name,
                url: data?.url
            };
            setProgramSteps(prev => prev.map(step => step.id === stepId
                ? { ...step, attachments: [...(step.attachments || []), attachment] }
                : step));
        } catch (error) {
            console.error('Failed to upload attachment', error);
            alert('Could not upload attachment. Please try again.');
        }
    };

    const handleSaveProgramSteps = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("You must be logged in to save funnels.");
            }

            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
            const response = await fetch(`${apiUrl}/api/admin/marketing/sequences/${UNIVERSAL_FUNNEL_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({ steps: programSteps })
            });

            if (!response.ok) {
                throw new Error(`Failed to save funnel: ${response.statusText}`);
            }

            alert('Universal Sales Funnel saved successfully!');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            alert(`Error saving: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImportStatus(null);
        try {
            const text = await file.text();
            const parsed = parseCsvContent(text);
            if (!parsed.length) {
                setImportStatus('No valid rows were found in that CSV.');
                return;
            }
            setIsImportingCsv(true);
            for (const payload of parsed) {
                await adminLeadsService.create({ ...payload, funnelId: UNIVERSAL_FUNNEL_ID, funnelType: UNIVERSAL_FUNNEL_ID });
            }
            setImportStatus(`Imported ${parsed.length} leads into the universal funnel.`);
        } catch (error) {
            console.error('CSV import failed', error);
            setImportStatus('There was an error processing that CSV. Try again?');
        } finally {
            setIsImportingCsv(false);
            event.target.value = '';
        }
    };

    const triggerCsvUpload = () => {
        fileInputRef.current?.click();
    };

    const renderFunnelPanel = (
        panelKey: keyof typeof panelExpanded,
        {
            badgeIcon,
            badgeClassName,
            badgeLabel,
            title,
            description,
            iconColorClass,
            steps,
            expandedIds,
            onToggleStep,
            onUpdateStep,
            onRemoveStep,
            onAddStep,
            onSave,
            onMoveStep,
            onAttachFile,
            saveLabel,
            onSendTest
        }: {
            badgeIcon: string;
            badgeClassName: string;
            badgeLabel: string;
            title: string;
            description: string;
            iconColorClass: string;
            steps: EditableStep[];
            expandedIds: string[];
            onToggleStep: (id: string) => void;
            onUpdateStep: (id: string, field: keyof EditableStep, value: string) => void;
            onRemoveStep: (id: string) => void;
            onAddStep: () => void;
            onSave: () => void;
            onMoveStep: (id: string, direction: 'up' | 'down') => void;
            onAttachFile: (id: string, files: FileList | null) => void;
            saveLabel: string;
            onSendTest: (step: EditableStep) => void;
        }
    ) => {
        const isOpen = panelExpanded[panelKey];
        return (
            <section key={`panel-${panelKey}`} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>
                            <span className="material-symbols-outlined text-base">{badgeIcon}</span>
                            {badgeLabel}
                        </p>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => togglePanel(panelKey)}
                        className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                    >
                        <span className="material-symbols-outlined text-base">
                            {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                        {isOpen ? 'Collapse' : 'Expand'}
                    </button>
                </div>
                {isOpen && (
                    <>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-slate-500">
                            <span className="font-semibold text-slate-600">Tokens:</span>
                            {COMMON_TOKEN_HINTS.map((token) => (
                                <span
                                    key={`${panelKey}-${token}`}
                                    className="rounded-full bg-slate-100 px-2 py-1 text-slate-600"
                                >
                                    {token}
                                </span>
                            ))}
                        </div>
                        <div className="space-y-4">
                            {steps.map((step, index) => {
                                const stepIsOpen = expandedIds.includes(step.id);
                                const previewSubject = mergeTokens(step.subject);
                                const previewBody = mergeTokens(step.content);
                                return (
                                    <article key={step.id} className="rounded-2xl border border-slate-200 bg-slate-50">
                                        <button
                                            type="button"
                                            onClick={() => onToggleStep(step.id)}
                                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`rounded-full bg-white p-2 shadow-sm ${iconColorClass}`}>
                                                    <span className="material-symbols-outlined text-base">{step.icon}</span>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                        Step {index + 1}
                                                    </p>
                                                    <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{step.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="font-semibold">{step.delay}</span>
                                                <span className="hidden rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold sm:inline">
                                                    {step.type}
                                                </span>
                                                <span className="material-symbols-outlined text-base">
                                                    {stepIsOpen ? 'expand_less' : 'expand_more'}
                                                </span>
                                            </div>
                                        </button>
                                        {stepIsOpen && (
                                            <div className="space-y-4 border-t border-slate-200 bg-white px-4 py-4">
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <label className="text-xs font-semibold text-slate-600">
                                                        Title
                                                        <input
                                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                                            value={step.title}
                                                            onChange={(event) => onUpdateStep(step.id, 'title', event.target.value)}
                                                        />
                                                    </label>
                                                    <label className="text-xs font-semibold text-slate-600">
                                                        Delay
                                                        <input
                                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                                            value={step.delay}
                                                            onChange={(event) => onUpdateStep(step.id, 'delay', event.target.value)}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <label className="text-xs font-semibold text-slate-600">
                                                        Description
                                                        <input
                                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                                            value={step.description}
                                                            onChange={(event) => onUpdateStep(step.id, 'description', event.target.value)}
                                                        />
                                                    </label>
                                                    <label className="text-xs font-semibold text-slate-600">
                                                        Type
                                                        <select
                                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                                            value={step.type}
                                                            onChange={(event) => onUpdateStep(step.id, 'type', event.target.value)}
                                                        >
                                                            <option value="Email">Email</option>
                                                            <option value="SMS">SMS</option>
                                                            <option value="Task">Task</option>
                                                        </select>
                                                    </label>
                                                </div>
                                                <label className="text-xs font-semibold text-slate-600">
                                                    Subject
                                                    <input
                                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                                        value={step.subject}
                                                        onChange={(event) => onUpdateStep(step.id, 'subject', event.target.value)}
                                                    />
                                                </label>
                                                <label className="text-xs font-semibold text-slate-600">
                                                    Message Body
                                                    <textarea
                                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                                        rows={5}
                                                        value={step.content}
                                                        onChange={(event) => onUpdateStep(step.id, 'content', event.target.value)}
                                                    />
                                                </label>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                                                        <p className="mt-1 text-sm font-semibold text-slate-900">{previewSubject}</p>
                                                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{previewBody}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
                                                        <p className="font-semibold uppercase tracking-wide text-slate-600">Variables you can drop in</p>
                                                        <ul className="mt-2 space-y-1">
                                                            {COMMON_TOKEN_HINTS.map((token) => (
                                                                <li key={`${step.id}-${token}`} className="font-mono text-[11px]">
                                                                    {token}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => onSendTest(step)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-base">send</span>
                                                        Send Test to Me
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveStep(step.id)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                        Delete Step
                                                    </button>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <button
                                                            type="button"
                                                            onClick={() => onMoveStep(step.id, 'up')}
                                                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">arrow_upward</span> Up
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => onMoveStep(step.id, 'down')}
                                                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">arrow_downward</span> Down
                                                        </button>
                                                        <span className="ml-2">Auto preview updates with your edits.</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <label className="text-xs font-semibold text-slate-600">
                                                        Attachments
                                                        <div className="mt-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                                                            <input
                                                                type="file"
                                                                onChange={(e) => onAttachFile(step.id, e.target.files)}
                                                                className="text-xs"
                                                            />
                                                            <div className="mt-2 space-y-1">
                                                                {(step.attachments || []).map((file) => (
                                                                    <div key={file.id} className="text-xs text-slate-700 flex items-center gap-2">
                                                                        <span className="material-symbols-outlined text-sm">attach_file</span>
                                                                        <span className="truncate">{file.name}</span>
                                                                    </div>
                                                                ))}
                                                                {(step.attachments || []).length === 0 && (
                                                                    <p className="text-xs text-slate-500">No attachments yet.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )
                                        }
                                    </article>
                                );
                            })}
                        </div>
                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={onAddStep}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <span className="material-symbols-outlined text-base">add</span>
                                Add Step
                            </button>
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={isSaving}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-base">save</span>
                                {isSaving ? 'Saving...' : saveLabel}
                            </button>
                        </div>
                    </>
                )
                }
            </section >
        );
    };

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error) {
        return <div className="rounded-lg bg-rose-50 p-4 text-center text-rose-700">{error}</div>;
    }

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
                        <span>Back to Admin Overview</span>
                    </button>
                )}

                <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <p className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                            <span className="material-symbols-outlined text-base">monitoring</span>
                            Leads Funnel
                        </p>
                        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                        <p className="text-sm text-slate-500 sm:text-base">
                            {subtitle}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setIsQuickEmailOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                        >
                            <span className="material-symbols-outlined text-base">outgoing_mail</span>
                            Open Email Library
                        </button>
                        <button
                            type="button"
                            onClick={triggerCsvUpload}
                            disabled={isImportingCsv}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
                        >
                            <span className="material-symbols-outlined text-base">upload_file</span>
                            Upload Leads CSV
                        </button>
                    </div>
                </header>
                <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleCsvImport}
                />
                {importStatus && (
                    <div className="text-sm text-slate-600 mb-4">
                        {isImportingCsv ? 'Importing leads…' : importStatus}
                    </div>
                )}

                {/* Lead Scoring Engine / Performance Overview */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setActiveTab('funnel')}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border ${activeTab === 'funnel'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <span className="material-symbols-outlined text-base">rocket_launch</span>
                        Universal Funnel
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('automation')}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border ${activeTab === 'automation'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <span className="material-symbols-outlined text-base">insights</span>
                        Automation Performance
                    </button>
                </div>

                {activeTab === 'funnel' && (
                    <section className="mb-8 space-y-4">
                        <div className="flex flex-col gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                <span className="material-symbols-outlined text-base">insights</span>
                                Lead Scoring Engine
                            </div>
                            <div className="flex flex-col gap-2">
                                <h2 className="text-2xl font-bold text-slate-900">Scoring Rules &amp; Tiers</h2>
                                <p className="text-sm text-slate-500">
                                    See the rules, tiers, and point gains that determine which prospects graduate to Hot or stay in nurture.
                                </p>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <span className="material-symbols-outlined text-base">tips_and_updates</span>
                                    Show Scoring Tips
                                    <span className="material-symbols-outlined text-sm">expand_more</span>
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                                <span className="uppercase tracking-wide font-semibold text-slate-600">Performance Overview</span>
                                <span>Stats refresh when leads update</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
                                    <div className="rounded-full bg-blue-100 text-blue-700 p-2"><span className="material-symbols-outlined">groups</span></div>
                                    <div>
                                        <div className="text-xs text-slate-500">Total Leads</div>
                                        <div className="text-xl font-semibold text-slate-900">{scoringSummary.totalLeads}</div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
                                    <div className="rounded-full bg-green-100 text-green-700 p-2"><span className="material-symbols-outlined">trending_up</span></div>
                                    <div>
                                        <div className="text-xs text-slate-500">Conversion Rate</div>
                                        <div className="text-xl font-semibold text-slate-900">{scoringSummary.conversionRate.toFixed(1)}%</div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
                                    <div className="rounded-full bg-purple-100 text-purple-700 p-2"><span className="material-symbols-outlined">event_available</span></div>
                                    <div>
                                        <div className="text-xs text-slate-500">Appointments Set</div>
                                        <div className="text-xl font-semibold text-slate-900">{scoringSummary.appointments}</div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
                                    <div className="rounded-full bg-amber-100 text-amber-700 p-2"><span className="material-symbols-outlined">stars</span></div>
                                    <div>
                                        <div className="text-xs text-slate-500">Average Score</div>
                                        <div className="text-xl font-semibold text-slate-900">{scoringSummary.averageScore.toFixed(1)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'funnel' && renderFunnelPanel('universal', {
                    badgeIcon: 'rocket_launch',
                    badgeClassName: 'bg-sky-50 text-sky-700',
                    badgeLabel: 'Universal Sales Funnel',
                    title: 'Universal Sales Funnel (5-Touch)',
                    description:
                        'Admin-only 5-touch sequence with urgency, modern challenges, benefits, and CTAs. Auto-assigned to every new lead.',
                    iconColorClass: 'text-primary-600',
                    steps: programSteps,
                    expandedIds: expandedProgramStepIds,
                    onToggleStep: toggleProgramStep,
                    onUpdateStep: handleUpdateProgramStep,
                    onRemoveStep: handleRemoveProgramStep,
                    onAddStep: handleAddProgramStep,
                    onMoveStep: handleMoveProgramStep,
                    onAttachFile: handleAttachFile,
                    onSave: handleSaveProgramSteps,
                    saveLabel: 'Save Program Funnel',
                    onSendTest: handleSendTestEmail
                })}

                {activeTab === 'automation' && (
                    <section className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <span className="material-symbols-outlined text-base">track_changes</span>
                                Sequence Feedback
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Automation Performance</h2>
                            <p className="text-sm text-slate-500">Compare reply rates, openings, and meetings across the universal funnel.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Top Performing Step</p>
                                <h3 className="mt-1 text-base font-semibold text-slate-900">{topSteps[0]?.title || 'Curated step'}</h3>
                                <p className="text-sm text-slate-600">
                                    {(topSteps[0]?.replyRate ?? 0)}% reply · {(topSteps[0]?.meetingRate ?? 0)}% meetings
                                </p>
                                <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, topSteps[0]?.replyRate ?? 0)}%` }} />
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sequences Needing Love</p>
                                <h3 className="mt-1 text-base font-semibold text-rose-700">{weakSteps[0]?.title || 'Follow-up touch'}</h3>
                                <p className="text-sm text-slate-600">
                                    Reply rate trending down; review copy and delay.
                                </p>
                                <button className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    Review step copy
                                </button>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fastest Replies</p>
                                <h3 className="mt-1 text-base font-semibold text-slate-900">Task: Live Call</h3>
                                <p className="text-sm text-slate-600">Average reply in 12 minutes once you log a call touch.</p>
                                <button className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    <span className="material-symbols-outlined text-sm">call</span>
                                    Keep human touches
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sequence Overview</p>
                                    <h3 className="text-lg font-semibold text-slate-900">Health &amp; Reply Rates</h3>
                                </div>
                                <span className="text-xs text-slate-500">Rolling 14 day window</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                {sequenceCards.map((seq) => (
                                    <div key={seq.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900">{seq.title}</h4>
                                                <p className="text-[11px] text-slate-500 uppercase tracking-wide">Reply health</p>
                                            </div>
                                            <span className="text-xs text-slate-500">↑</span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <div className="text-xs text-slate-500">Replies</div>
                                                <div className="text-lg font-semibold text-slate-900">{seq.replies}%</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">Opens</div>
                                                <div className="text-lg font-semibold text-slate-900">{seq.opens}%</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">Meetings</div>
                                                <div className="text-lg font-semibold text-slate-900">{seq.meetings}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-xs text-slate-600">{seq.tag}</div>
                                    </div>
                                ))}
                                {sequenceCards.length === 0 && (
                                    <div className="text-sm text-slate-500">No sequence analytics available yet.</div>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </div>
            {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} />}
        </div>
    );
};

export default FunnelAnalyticsPanel;
