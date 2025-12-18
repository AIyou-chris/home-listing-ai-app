import React, { useEffect, useMemo, useState, useRef } from 'react';
import QuickEmailModal from './QuickEmailModal';
import { EmailEditor } from './EmailEditor';
import SignatureEditorModal from './SignatureEditorModal';
import { supabase } from '../services/supabase';
import { ADMIN_EMAIL_TEMPLATES } from '../constants/adminEmailTemplates';
import { emailService } from '../services/emailService';
import { adminLeadsService } from '../services/adminLeadsService';
import { authService } from '../services/authService';
import { getAICardProfile, AICardProfile } from '../services/aiCardService';

// CONSTANTS & TYPES

// FORCE LIVE BACKEND: The local .env is pointing to localhost:3002 (which is dead), so we must override it here.
const API_BASE = 'https://home-listing-ai-backend.onrender.com';

const UNIVERSAL_FUNNEL_ID = 'universal_sales';

interface FunnelAnalyticsPanelProps {
    onBackToDashboard?: () => void;
    variant?: 'page' | 'embedded';
    title?: string;
    subtitle?: string;
    hideBackButton?: boolean;
}

export type EditableStep = {
    id: string;
    title: string;
    description: string;
    icon: string;
    delay: string;
    type: string;
    subject: string;
    content: string;
    attachments?: Array<{ id: string; name: string; url?: string }>;
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
            'Hi {{lead.firstName}},\n\nToday’s market rewards speed and modern tech. See how AI sidekicks keep you ahead of competitors and close faster.\n\nTake a look here: {{agent.aiCardUrl}}\n\nTalk soon,\n{{agent.signature}}',
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
            'Hi {{lead.firstName}},\n\nMost agents are stuck with old workflows. Our AI sidekicks handle follow-ups, scheduling, and responses instantly so you don’t miss a lead.\n\nCTA: Book a demo.\n\n{{agent.signature}}',
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
            'Hi {{lead.firstName}},\n\nAutomations, funnels, and AI sidekicks keep your pipeline active while you focus on high-value conversations.\n\nCTA: Try the lead import tool.\n\n{{agent.signature}}',
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
            'Hi {{lead.firstName}},\n\nHere’s how teams are booking more appointments and closing faster with our platform. Optional: attach a case study.\n\nCTA: Join our private user group.\n\n{{agent.signature}}',
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
            'Hi {{lead.firstName}},\n\nEvery day you wait, someone else gets ahead. Let’s launch your AI sidekick so you never miss another opportunity.\n\nCTA: Schedule your onboarding call now.\n\n{{agent.signature}}',
        attachments: []
    }
]);

const AdminSalesFunnelPanel: React.FC<FunnelAnalyticsPanelProps> = ({
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
    const [panelExpanded, setPanelExpanded] = useState({ universal: true });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // const [isLoading, setIsLoading] = useState(true); // Removed unused
    const [isSaving, setIsSaving] = useState(false);
    const [debugMsg, setDebugMsg] = useState<string>('');
    const [sendingTestId, setSendingTestId] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const [previewAgent, setPreviewAgent] = useState<AICardProfile | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [customSignature, setCustomSignature] = useState<string>('');

    // Load AI Card Profile for Signature/Preview
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await getAICardProfile();
                console.log("Loaded Profile for Funnel:", profile);
                setPreviewAgent(profile);
            } catch (e) {
                console.error("Failed to load profile for funnel preview", e);
            }
        };
        loadProfile();
    }, []);

    // ANALYTICS & STATE

    // Default sample data for the LIVE PREVIEW
    const sampleMergeData = useMemo(() => {
        // Fallback or Active Agent Data
        const name = previewAgent?.fullName || 'Sarah Smith';
        const title = previewAgent?.professionalTitle || 'Real Estate Agent';
        const company = previewAgent?.company || 'HomeListingAI';
        const phone = previewAgent?.phone || '(555) 987-6543';
        const email = previewAgent?.email || 'sarah@homelistingai.com';
        const website = previewAgent?.website || 'https://homelistingai.com';
        const cardUrl = previewAgent?.id ? `https://homelistingai.com/card/${previewAgent.id}` : 'https://homelistingai.com/card/demo';
        // Add AI Card Link to signature
        const signature = `Best,\n${name}\n${title}\n${company}\n${phone}\n${cardUrl}`;

        return {
            lead: {
                name: 'Jamie Carter',
                firstName: 'Jamie',
                lastName: 'Carter',
                email: 'jamie@example.com',
                phone: '(555) 123-4567',
                interestAddress: '123 Maple Ave',
                company: 'Keller Williams',
                city: 'Austin',
                state: 'TX'
            },
            agent: {
                name: name,
                firstName: name.split(' ')[0],
                lastName: name.split(' ').slice(1).join(' '),
                phone: phone,
                email: email,
                company: company,
                aiCardUrl: website,
                signature: signature
            }
        };
    }, [previewAgent]);

    // Flexible merge function that can take custom data source
    const mergeTokens = (template: string, sourceData: Record<string, unknown> = sampleMergeData) => {
        return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path: string) => {
            // Override agent.signature if custom signature is set
            if (path === 'agent.signature' && customSignature) {
                return customSignature;
            }

            const [bucket, key] = path.split('.');
            if (!bucket || !key) return '';

            const bucketData = sourceData[bucket] as Record<string, string> | undefined;
            const value = bucketData?.[key];
            if (value !== undefined) return value;

            return `{{${path}}}`;
        });
    };

    // Add helper to resolve user email more robustly
    const getActiveUserEmail = async (): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) return user.email;

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) return session.user.email;

        return null;
    };

    const handleSendTestEmail = async (step: EditableStep) => {
        if (sendingTestId) return;
        setSendingTestId(step.id);
        try {
            const email = await getActiveUserEmail();

            if (!email) {
                console.error('Could not resolve user email via getUser or getSession');
                alert('Could not find your email address. Please try refreshing the page.');
                return;
            }

            // Construct REAL data for the test email
            let realAgentData;

            // Need user metadata for fallback
            const { data: { user } } = await supabase.auth.getUser();
            const metadata = user?.user_metadata || {};

            if (previewAgent) {
                const name = previewAgent.fullName || 'Agent';
                realAgentData = {
                    name: name,
                    firstName: name.split(' ')[0],
                    phone: previewAgent.phone,
                    company: previewAgent.company,
                    aiCardUrl: previewAgent.website || `https://homelistingai.com/card/${user?.id || 'default'}`,
                    signature: `Best,\n${name}\n${previewAgent.professionalTitle || ''}\n${previewAgent.company}\n${previewAgent.phone}\n${`https://homelistingai.com/card/${user?.id || 'default'}`}`
                };
            } else {
                realAgentData = {
                    name: metadata.name || email.split('@')[0],
                    firstName: (metadata.name || '').split(' ')[0] || 'Admin',
                    phone: metadata.phone || '',
                    company: metadata.company || 'HomeListingAI',
                    aiCardUrl: `https://homelistingai.com/card/${user?.id || 'default'}`,
                    signature: `Best,\n${metadata.name || 'Admin'}\n${metadata.company || 'HomeListingAI'}\n${metadata.phone || ''}\n${`https://homelistingai.com/card/${user?.id || 'default'}`}`
                };
            }

            const realMergeData = {
                lead: sampleMergeData.lead,
                agent: realAgentData
            };

            const subject = mergeTokens(step.subject, realMergeData);
            const body = mergeTokens(step.content, realMergeData).replace(/\n/g, '<br/>');
            const testSubject = `[TEST] ${subject}`;

            const sent = await emailService.sendEmail(
                email,
                testSubject,
                body,
                { text: mergeTokens(step.content, realMergeData) }
            );

            if (sent) alert(`Test email sent to ${email}`);
            else throw new Error('Email service returned failure');
        } catch (error) {
            console.error('Test email failed:', error);
            alert('Failed to send test email. Check console for details.');
        } finally {
            setSendingTestId(null);
        }
    };

    // CSV IMPORT LOGIC
    const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
            if (lines.length < 2) {
                alert('CSV must have a header row and at least one data row.');
                return;
            }

            const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const dataRows = lines.slice(1);

            let successCount = 0;
            let failCount = 0;

            for (const row of dataRows) {
                const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const record: Record<string, string> = {};

                header.forEach((h, i) => {
                    record[h] = values[i] || '';
                });

                const name = record['name'] || `${record['first'] || ''} ${record['last'] || ''}`.trim() || 'Unknown';
                const email = record['email'] || record['e-mail'] || '';
                const phone = record['phone'] || record['cell'] || '';
                const company = record['company'] || record['brokerage'] || '';

                if (email) {
                    try {
                        await adminLeadsService.create({
                            name,
                            email,
                            phone,
                            status: 'New',
                            source: 'CSV Import',
                            notes: company ? `From ${company}` : '',
                            funnelId: UNIVERSAL_FUNNEL_ID,
                            funnelType: 'universal_sales'
                        });
                        successCount++;
                    } catch (e) {
                        console.error('Failed to import lead', email, e);
                        failCount++;
                    }
                }
            }

            alert(`Import Complete!\n\nSuccess: ${successCount}\nFailed: ${failCount}\n\nThe leads have been added to the funnel sequence.`);

        } catch (error) {
            console.error('CSV Import Error', error);
            alert('Failed to process CSV file.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        const fetchFunnel = async () => {
            try {
                // Use Backend Proxy (Admin Key Support)
                const response = await authService.makeAuthenticatedRequest(`/api/admin/marketing/sequences/${UNIVERSAL_FUNNEL_ID}`);

                if (!response.ok) {
                    // If 404, it just means no funnel exists yet -> Defaults
                    if (response.status === 404) {
                        setProgramSteps(buildDefaultSteps());
                        return;
                    }
                    throw new Error("Failed to fetch funnel");
                }

                const data = await response.json();
                if (data.steps && Array.isArray(data.steps)) {
                    // Extract Metadata Step (Signature)
                    const steps = data.steps as EditableStep[];

                    // Robust find: Check ID OR subject/title in case backend modified IDs
                    const signatureStep = steps.find(s =>
                        s.id === 'meta-signature' ||
                        s.subject === 'METADATA' ||
                        s.title === 'Hidden Signature Metadata'
                    );

                    const visibleSteps = steps.filter(s =>
                        s.id !== 'meta-signature' &&
                        s.subject !== 'METADATA' &&
                        s.title !== 'Hidden Signature Metadata'
                    );

                    setProgramSteps(visibleSteps);

                    if (signatureStep) {
                        console.log('Found custom signature:', signatureStep.content);
                        setCustomSignature(signatureStep.content);
                    } else if (data.signature) {
                        // Fallback to legacy field just in case
                        setCustomSignature(data.signature);
                    }

                    // LocalStorage Override (Browser-side persistence fallback)
                    const localSig = localStorage.getItem('admin_funnel_signature');
                    if (localSig) {
                        setCustomSignature(localSig);
                    }
                } else {
                    setProgramSteps(buildDefaultSteps());
                    // Recover from local storage even if fetch fails/empty
                    const localSig = localStorage.getItem('admin_funnel_signature');
                    if (localSig) setCustomSignature(localSig);
                }
            } catch (err) {
                console.warn('Fetch Funnel Error:', err);
                setProgramSteps(buildDefaultSteps());
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
            description: 'New step in the sequence',
            icon: 'forward_to_inbox',
            delay: '+2 days',
            type: 'Email',
            subject: 'New Message',
            content: 'Hi {{lead.firstName}}, ...\n\n{{agent.signature}}'
        };
        setProgramSteps((prev) => [...prev, newStep]);
    };

    const handleRemoveProgramStep = (id: string) => {
        setProgramSteps((prev) => prev.filter((step) => step.id !== id));
    };

    const handleSaveProgramSteps = async () => {
        setIsSaving(true);
        setDebugMsg('Saving via Admin Proxy...');

        try {
            // Prepare Steps with Metadata (Hidden Signature Step)
            const stepsToSave = [...programSteps];
            if (customSignature) {
                stepsToSave.push({
                    id: 'meta-signature',
                    title: 'Hidden Signature Metadata',
                    description: 'Do not edit',
                    icon: 'lock',
                    delay: '0',
                    type: 'Email', // MUST be a valid type to pass backend validation
                    subject: 'METADATA',
                    content: customSignature
                });
            }

            // Use Backend Proxy to save
            const response = await authService.makeAuthenticatedRequest(`/api/admin/marketing/sequences/${UNIVERSAL_FUNNEL_ID}`, {
                method: 'PUT',
                body: JSON.stringify({
                    steps: stepsToSave
                })
            });

            // Backup to LocalStorage (Immediate persistence reliability)
            if (customSignature) {
                localStorage.setItem('admin_funnel_signature', customSignature);
            } else {
                localStorage.removeItem('admin_funnel_signature');
            }

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Server Save Failed');
            }

            setDebugMsg(`✅ SUCCESS! Saved to DB at ${new Date().toLocaleTimeString()}`);
            alert('Funnel saved successfully!');

        } catch (e: unknown) {
            console.error('Save Funnel Error:', e);
            const msg = e instanceof Error ? e.message : 'Unknown error';
            setDebugMsg(`❌ FAILED: ${msg}`);
            alert(`Save Failed! Details: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const renderFunnelPanel = (
        panelKey: 'universal',
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
                    <div className="space-y-4">
                        {steps.map((step, index) => {
                            const stepIsOpen = expandedIds.includes(step.id);
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
                                        <div className="border-t border-slate-200 bg-white px-6 py-6 transition-all">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                {/* LEFT COL: EDIT */}
                                                <div className="space-y-4">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Editor</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <label className="text-xs font-semibold text-slate-600">
                                                            Title
                                                            <input
                                                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                                value={step.title}
                                                                onChange={(e) => onUpdateStep(step.id, 'title', e.target.value)}
                                                            />
                                                        </label>
                                                        <label className="text-xs font-semibold text-slate-600">
                                                            Delay
                                                            <input
                                                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                                value={step.delay}
                                                                onChange={(e) => onUpdateStep(step.id, 'delay', e.target.value)}
                                                            />
                                                        </label>
                                                    </div>

                                                    <label className="text-xs font-semibold text-slate-600">
                                                        Type
                                                        <select
                                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                                            value={step.type}
                                                            onChange={(event) => onUpdateStep(step.id, 'type', event.target.value)}
                                                        >
                                                            <option value="Email">Email</option>
                                                            <option value="Call">Call</option>
                                                            <option value="Text">Text</option>
                                                            <option value="Wild">Wild</option>
                                                        </select>
                                                    </label>

                                                    <label className="block text-xs font-semibold text-slate-600">
                                                        Subject Line
                                                        <input
                                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                            value={step.subject}
                                                            onChange={(e) => onUpdateStep(step.id, 'subject', e.target.value)}
                                                        />
                                                    </label>
                                                    <label className="block text-xs font-semibold text-slate-600">
                                                        Email Body
                                                        <div className="mt-1">
                                                            <EmailEditor
                                                                value={step.content}
                                                                onChange={(val) => onUpdateStep(step.id, 'content', val)}
                                                                placeholder="Write your email content here..."
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </label>

                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendTestEmail(step)}
                                                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">send</span>
                                                            Send Test
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemoveStep(step.id)}
                                                            className="flex-none rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* RIGHT COL: PREVIEW & HELP */}
                                                <div className="flex flex-col gap-6">
                                                    {/* PREVIEW CARD */}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="material-symbols-outlined text-slate-400 text-sm">visibility</span>
                                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Live Preview</h4>
                                                        </div>
                                                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-full max-h-[500px] overflow-y-auto">
                                                            <div className="border-b border-slate-100 pb-3 mb-3">
                                                                <p className="text-xs text-slate-500">To: <span className="text-slate-900 font-medium">Jamie Carter (Lead)</span></p>
                                                                <p className="text-xs text-slate-500">Subject: <span className="text-slate-900 font-medium">{mergeTokens(step.subject)}</span></p>
                                                            </div>
                                                            <div
                                                                className="prose prose-sm max-w-none text-slate-600"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: mergeTokens(step.content).replace(/\n/g, '<br/>')
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* CHEAT SHEET */}
                                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 border-dashed">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Variables you can drop in</h4>
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs font-mono text-slate-500">
                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="Jamie Carter">{'{{lead.name}}'}</span>
                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="Jamie">{'{{lead.firstName}}'}</span>
                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="Keller Williams">{'{{lead.company}}'}</span>
                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="123 Maple Ave">{'{{lead.interestAddress}}'}</span>
                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="Austin">{'{{lead.city}}'}</span>
                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="TX">{'{{lead.state}}'}</span>

                                                            <div className="col-span-2 h-px bg-slate-200 my-2"></div>

                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="Sarah Smith">{'{{agent.name}}'}</span>
                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="HomeListingAI">{'{{agent.company}}'}</span>
                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="(555) 987-6543">{'{{agent.phone}}'}</span>
                                                            <span className="hover:text-indigo-600 cursor-pointer transition-colors" title="Your AI Card Link">{'{{agent.aiCardUrl}}'}</span>
                                                            <div className="col-span-2 mt-1">
                                                                <span className="hover:text-indigo-600 cursor-pointer transition-colors font-bold text-indigo-500" title="Auto-inserts your full signature">{'{{agent.signature}}'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}

                        <div className="flex items-center justify-between pt-4">
                            <button
                                type="button"
                                onClick={onAddStep}
                                className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Add Step
                            </button>
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-70 transition-all"
                            >
                                {isSaving ? (
                                    <span className="material-symbols-outlined h-4 w-4 animate-spin">refresh</span>
                                ) : (
                                    <span className="material-symbols-outlined h-4 w-4">save</span>
                                )}
                                {saveLabel}
                            </button>
                        </div>
                        {/* DEBUG STATUS ON SCREEN */}
                        <div className="mt-4 p-3 bg-slate-100 rounded text-xs font-mono text-slate-600 break-all">
                            <strong>Debug Status:</strong>
                            <span className={isSaving ? 'text-blue-600' : ''}> {isSaving ? 'Saving...' : 'Idle'} </span>
                            <br />
                            <strong>Target:</strong> {API_BASE}/api/admin/marketing/sequences/{UNIVERSAL_FUNNEL_ID}
                            <br />
                            <strong>Log:</strong> {debugMsg}
                            <br />
                            <button
                                type="button"
                                onClick={async () => {
                                    setDebugMsg('Testing connection...');
                                    try {
                                        // Try a simple GET to the health check or root
                                        const res = await fetch(`${API_BASE}/`, { method: 'GET' });
                                        const text = await res.text();

                                        const isFrontend = text.toLowerCase().includes('<!doctype html') || text.includes('div id="root"');
                                        if (isFrontend) {
                                            setDebugMsg(`⚠️ ERROR: The URL ${API_BASE} seems to be a Frontend (Web App), not a Backend API. It returned HTML. Please check your API URL.`);
                                        } else {
                                            setDebugMsg(`✅ Connection OK! Status: ${res.status}. Response: ${text.slice(0, 50)}`);
                                        }
                                    } catch (err: unknown) {
                                        const message = err instanceof Error ? err.message : String(err);
                                        setDebugMsg(`❌ Connection Failed: ${message}`);
                                    }
                                }}
                                className="mt-2 text-[10px] underline text-indigo-600 hover:text-indigo-800"
                            >
                                Test Server Connection
                            </button>
                        </div>
                    </div>
                )}
            </section>
        );
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
                    <div className="flex flex-wrap gap-2">
                        {/* CSV Upload */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleCsvUpload}
                            accept=".csv"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-green-600">upload_file</span>
                            {importing ? 'Importing...' : 'Upload CSV Leaders'}
                        </button>

                        <button
                            onClick={() => setIsQuickEmailOpen(true)}
                            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors"
                        >
                            <span className="material-symbols-outlined text-blue-600">library_books</span>
                            Open Email Library
                        </button>

                        {/* AI Card Link */}
                        {/* AI Card Link - Hijacked for Signature Editor */}
                        <button
                            onClick={() => setIsSignatureModalOpen(true)}
                            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors"
                        >
                            <span className="material-symbols-outlined text-indigo-600">badge</span>
                            Edit Funnel Signature
                            {customSignature && (
                                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                    Active
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* Render Single Funnel Panel */}
                {renderFunnelPanel('universal', {
                    badgeIcon: 'bolt',
                    badgeClassName: 'bg-indigo-100 text-indigo-700',
                    badgeLabel: 'Universal Sales Funnel',
                    title: 'Agent Acquisition Sequence',
                    description: 'Automated 5-touch drip to convert real estate agents.',
                    iconColorClass: 'text-indigo-600',
                    steps: programSteps,
                    expandedIds: expandedProgramStepIds,
                    onToggleStep: toggleProgramStep,
                    onUpdateStep: handleUpdateProgramStep,
                    onRemoveStep: handleRemoveProgramStep,
                    onAddStep: handleAddProgramStep,
                    onSave: handleSaveProgramSteps,
                    saveLabel: 'Save Changes'
                })}
            </div>
            {isQuickEmailOpen && (
                <QuickEmailModal
                    onClose={() => setIsQuickEmailOpen(false)}
                    templates={ADMIN_EMAIL_TEMPLATES}
                />
            )}

            <SignatureEditorModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                initialSignature={customSignature || sampleMergeData.agent.signature}
                onSave={setCustomSignature}
            />
        </div>
    );
};

export default AdminSalesFunnelPanel;
