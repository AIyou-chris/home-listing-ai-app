import React, { useEffect, useMemo, useRef, useState } from 'react';
import QuickEmailModal from './QuickEmailModal';
import { leadsService, LeadPayload } from '../services/leadsService';
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
    type: string;
    subject: string;
    content: string;
};

const splitCsvLine = (line: string): string[] => {
    const matches = line.match(/("([^"]|"")*"|[^,]+)(?=,|$)/g);
    if (!matches) return [];
    return matches.map((value) => value.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
};

const parseCsvContent = (content: string): LeadPayload[] => {
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
            const payload: LeadPayload = {
                name: record['name'] || record['full name'] || '',
                email: (record['email'] || '').toLowerCase(),
                phone: record['phone'] || record['cell'] || record['mobile'] || undefined,
                notes: record['notes'] || record['description'] || undefined,
                source: record['source'] || 'CSV Import',
                funnelType: 'homebuyer'
            };
            return payload.name && payload.email ? payload : null;
        })
        .filter((entry): entry is LeadPayload => entry !== null);
};

const initPanelState = () => {
    const defaultOpen = typeof window === 'undefined' || window.innerWidth >= 768;
    return {
        program: defaultOpen
    };
};

const FunnelAnalyticsPanel: React.FC<FunnelAnalyticsPanelProps> = ({
    onBackToDashboard,
    variant = 'page',
    title = 'Lead Scoring & Leads Funnel',
    subtitle = 'Monitor the five-touch program funnel, training tasks, and dashboard story for every interested buyer.',
    hideBackButton = false
}) => {
    const isEmbedded = variant === 'embedded';
    const [programSteps, setProgramSteps] = useState<EditableStep[]>([]);
    const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);
    const [expandedProgramStepIds, setExpandedProgramStepIds] = useState<string[]>([]);
    const [panelExpanded, setPanelExpanded] = useState(initPanelState);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const [isImportingCsv, setIsImportingCsv] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                const response = await fetch(`${apiUrl}/api/admin/marketing/sequences/program-sales-funnel`, {
                    headers: { 'x-user-id': user.id }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn('⚠️ Funnel not found, using empty data');
                        setProgramSteps([]);
                        return;
                    }
                    throw new Error(`Failed to fetch funnel: ${response.statusText}`);
                }

                const data = await response.json();
                
                // Transform API data to match component structure
                const transformedSteps = (data.sequence?.steps || []).map((step: { id: string; subject?: string; delayDays: number; delayHours: number; emailBody?: string; ctaText?: string; ctaLink?: string; metrics?: unknown }, index: number) => ({
                    id: step.id,
                    title: step.subject || `Touch ${index + 1}`,
                    description: `Email ${index + 1} - ${step.delayDays}d ${step.delayHours}h delay`,
                    icon: index === 0 ? 'mail' : index === 4 ? 'campaign' : 'forward_to_inbox',
                    delay: step.delayDays > 0 ? `+${step.delayDays} day${step.delayDays > 1 ? 's' : ''}` : 'Immediate',
                    type: 'Email',
                    subject: step.subject,
                    content: step.emailBody,
                    ctaText: step.ctaText,
                    ctaLink: step.ctaLink,
                    metrics: step.metrics
                }));
                
                setProgramSteps(transformedSteps);

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
            id: `program-${Date.now()}`,
            title: 'New Step',
            description: 'Describe the next program touchpoint.',
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

    const handleSaveProgramSteps = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("You must be logged in to save funnels.");
            }

            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
            const response = await fetch(`${apiUrl}/api/marketing/sequences/program-sales-funnel`, {
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
            
            alert('Program funnel saved successfully!');

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
                await leadsService.create(payload);
            }
            setImportStatus(`Imported ${parsed.length} leads into the funnel.`);
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
            saveLabel
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
            saveLabel: string;
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
                                                        <input
                                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                                            value={step.type}
                                                            onChange={(event) => onUpdateStep(step.id, 'type', event.target.value)}
                                                        />
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
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveStep(step.id)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                        Delete Step
                                                    </button>
                                                    <div className="text-xs text-slate-500">
                                                        Auto preview updates with your edits.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                )}
            </section>
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
                        <span>Back to Blueprint Overview</span>
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

                {renderFunnelPanel('program', {
                    badgeIcon: 'rocket_launch',
                    badgeClassName: 'bg-sky-50 text-sky-700',
                    badgeLabel: 'Program Funnel',
                    title: 'Five-Touch Sales Welcome',
                    description:
                        'Nurture every program lead with a single five-touch sequence focused on features, benefits, and strong CTAs.',
                    iconColorClass: 'text-primary-600',
                    steps: programSteps,
                    expandedIds: expandedProgramStepIds,
                    onToggleStep: toggleProgramStep,
                    onUpdateStep: handleUpdateProgramStep,
                    onRemoveStep: handleRemoveProgramStep,
                    onAddStep: handleAddProgramStep,
                    onSave: handleSaveProgramSteps,
                    saveLabel: 'Save Program Funnel'
                })}
            </div>
            {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} />}
        </div>
    );
};

export default FunnelAnalyticsPanel;
