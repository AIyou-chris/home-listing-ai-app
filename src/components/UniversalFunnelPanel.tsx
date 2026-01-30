import React, { useEffect, useMemo, useState } from 'react';
import AnalyticsPage from './AnalyticsPage';
import QuickEmailModal from './QuickEmailModal';
import SignatureEditorModal from './SignatureEditorModal';
import { EmailEditor } from './EmailEditor';
import SequenceFeedbackPanel from './SequenceFeedbackPanel';
import { funnelService } from '../services/funnelService';
import { supabase } from '../services/supabase';
import PageTipBanner from './PageTipBanner';
import LeadImportModal from './admin/LeadImportModal';
import OutreachTemplatesModal from './admin/OutreachTemplatesModal';

// --- Types ---

export type EditableStep = {
    id: string;
    title: string;
    description: string;
    icon: string;
    delay: string;
    type: string;
    subject: string;
    content: string;
    mediaUrl?: string;
    conditionRule?: string;
    conditionValue?: string | number;
    includeUnsubscribe?: boolean;
    trackOpens?: boolean;
};

export interface FunnelSectionConfig {
    key: string;
    badgeIcon: string;
    badgeClassName: string;
    badgeLabel: string;
    title: string;
    description: string;
    iconColorClass: string;
    initialSteps: EditableStep[];
    saveLabel: string;
}

export interface UniversalFunnelPanelProps {
    userId: string;
    funnelSections: FunnelSectionConfig[];
    onBackToDashboard?: () => void;
    variant?: 'page' | 'embedded';
    title?: string;
    subtitle?: string;
    hideBackButton?: boolean;
    isDemoMode?: boolean;
    isBlueprintMode?: boolean;
    showLeadScoring?: boolean;
    showSequenceFeedback?: boolean;
}

// --- Constants ---

const highlightCards = [
    {
        id: 'health',
        icon: 'insights',
        title: 'AI Funnel',
        body: 'Track how many leads are captured, contacted, qualified, and booked straight from the dashboard.',
        targetSection: 'funnels' as const,
        bgClass: 'bg-sky-50',
        borderClass: 'border-sky-200',
        iconClass: 'text-sky-600 bg-white'
    },
    {
        id: 'scoring',
        icon: 'workspace_premium',
        title: 'Lead Scoring Engine',
        body: 'See the rules, tiers, and point gains that determine which prospects graduate to Hot or stay in nurture.',
        targetSection: 'scoring' as const,
        bgClass: 'bg-indigo-50',
        borderClass: 'border-indigo-200',
        iconClass: 'text-indigo-600 bg-white'
    },
    {
        id: 'sequence',
        icon: 'auto_fix_high',
        title: 'Sequence Feedback',
        body: 'Compare which automations spark responses so you know when to duplicate, pause, or remix a funnel.',
        targetSection: 'feedback' as const,
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
        iconClass: 'text-emerald-600 bg-white'
    }
] as const;

const VOICE_TEMPLATES = [
    {
        id: 'new_lead_qualifier',
        name: 'New Lead Qualifier',
        content: "Hi {{lead.name}}, this is {{agent.name}}'s assistant calling. I saw you were looking at a few homes in {{lead.city}}. Are you just browsing or looking to make a move soon?"
    },
    {
        id: 'appointment_reminder',
        name: 'Appointment Reminder',
        content: "Hi {{lead.name}}, just a quick reminder about your appointment with {{agent.name}} tomorrow. Does that time still work for you?"
    },
    {
        id: 'open_house_invite',
        name: 'Open House Invite',
        content: "Hi {{lead.name}}, we're hosting an open house for a property you might love at {{lead.interestAddress}}. It's this Sunday from 2 to 4 PM. Would you like me to send you the details?"
    },
    {
        id: 'post_showing_feedback',
        name: 'Post-Showing Feedback',
        content: "Hi {{lead.name}}, asking for feedback on the property you saw today. What did you think of the kitchen? {{agent.name}} would love to know if it's a contender."
    },
    {
        id: 'custom',
        name: 'Custom Script (Advanced)',
        content: ''
    }
] as const;

// --- Component ---

const UniversalFunnelPanel: React.FC<UniversalFunnelPanelProps> = ({
    userId,
    funnelSections,
    onBackToDashboard,
    variant = 'page',
    title = 'AI Funnels',
    subtitle = 'AI-powered marketing campaigns',
    hideBackButton = false,
    isDemoMode = false,
    isBlueprintMode = false,
    showLeadScoring = true,
    showSequenceFeedback = true,
}) => {
    const isEmbedded = variant === 'embedded';

    // State: Map of funnelKey -> steps array
    const [funnelSteps, setFunnelSteps] = useState<Record<string, EditableStep[]>>({});

    // State: Map of funnelKey -> boolean (is panel expanded)
    const [panelExpanded, setPanelExpanded] = useState<Record<string, boolean>>({});

    // State: Map of funnelKey -> array of expanded step IDs
    const [expandedStepIds, setExpandedStepIds] = useState<Record<string, string[]>>({});

    // UI Helpers
    const [activeSection, setActiveSection] = useState<'funnels' | 'scoring' | 'feedback'>('funnels');
    const [sendingTestId, setSendingTestId] = useState<string | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [customSignature, setCustomSignature] = useState<string>('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
    const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);

    const [testPhone, setTestPhone] = useState<string>('');
    const [testEmail, setTestEmail] = useState<string>('');
    const [isTestPhoneValid, setIsTestPhoneValid] = useState(true);

    // Validate phone on change
    useEffect(() => {
        if (!testPhone) {
            setIsTestPhoneValid(true);
            return;
        }
        // E.164 basic validation (+12125551212)
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        setIsTestPhoneValid(e164Regex.test(testPhone));
    }, [testPhone]);

    // Initialize state from config
    useEffect(() => {
        const initialStepsMap: Record<string, EditableStep[]> = {};
        const initialPanelState: Record<string, boolean> = {};
        const initialExpandedIds: Record<string, string[]> = {};

        funnelSections.forEach(section => {
            initialStepsMap[section.key] = section.initialSteps;
            // Default first panel open or all open depending on preference. 
            // Let's default all open for desktop, closed for mobile? 
            // Or just open first one.
            initialPanelState[section.key] = true;
            initialExpandedIds[section.key] = [];
        });

        setFunnelSteps(prev => ({ ...initialStepsMap, ...prev })); // Preserve loaded if any
        setPanelExpanded(prev => ({ ...initialPanelState, ...prev }));
        setExpandedStepIds(prev => ({ ...initialExpandedIds, ...prev }));
    }, [funnelSections]); // Only runs if config changes (or on mount)

    // Load Data
    useEffect(() => {
        const loadFunnels = async () => {
            if (!userId) return;
            try {
                const fetchedFunnels = await funnelService.fetchFunnels(userId);

                // Update state for each known section
                const updates: Record<string, EditableStep[]> = {};
                funnelSections.forEach(section => {
                    if (fetchedFunnels[section.key] && fetchedFunnels[section.key].length > 0) {
                        updates[section.key] = fetchedFunnels[section.key];
                    }
                });

                if (Object.keys(updates).length > 0) {
                    setFunnelSteps(prev => ({ ...prev, ...updates }));
                }

                // Load saved signature
                if (fetchedFunnels.settings && fetchedFunnels.settings.length > 0) {
                    const sigStep = fetchedFunnels.settings.find(s => s.id === 'signature');
                    if (sigStep && sigStep.content) setCustomSignature(sigStep.content);
                }
            } catch (error) {
                console.error('Failed to load funnels:', error);
            }
        };
        loadFunnels();
    }, [userId, funnelSections]);

    // Handlers

    const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'success' | 'error'>>({});

    const handleSaveFunnel = async (key: string) => {
        try {
            setSaveStatus(prev => ({ ...prev, [key]: 'saving' }));
            const steps = funnelSteps[key] || [];

            // Artificial delay to show 'Saving...' state if operation is too fast
            const start = Date.now();
            const success = await funnelService.saveFunnelStep(userId, key, steps);

            if (Date.now() - start < 500) await new Promise(r => setTimeout(r, 500));

            if (success) {
                setSaveStatus(prev => ({ ...prev, [key]: 'success' }));
                setTimeout(() => setSaveStatus(prev => ({ ...prev, [key]: 'idle' })), 3000);
            } else {
                setSaveStatus(prev => ({ ...prev, [key]: 'error' }));
                setTimeout(() => setSaveStatus(prev => ({ ...prev, [key]: 'idle' })), 5000);
            }
        } catch (error) {
            console.error(`Failed to save funnel ${key}`, error);
            setSaveStatus(prev => ({ ...prev, [key]: 'error' }));
            setTimeout(() => setSaveStatus(prev => ({ ...prev, [key]: 'idle' })), 5000);
        }
    };

    const handleTogglePanel = (key: string) => {
        setPanelExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleToggleStep = (funnelKey: string, stepId: string) => {
        setExpandedStepIds(prev => {
            const current = prev[funnelKey] || [];
            const updated = current.includes(stepId)
                ? current.filter(id => id !== stepId)
                : [...current, stepId];
            return { ...prev, [funnelKey]: updated };
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdateStep = (funnelKey: string, stepId: string, field: keyof EditableStep, value: any) => {
        setFunnelSteps(prev => ({
            ...prev,
            [funnelKey]: prev[funnelKey].map(s => s.id === stepId ? { ...s, [field]: value } : s)
        }));
    };

    const handleRemoveStep = (funnelKey: string, stepId: string) => {
        if (window.confirm('Remove this step?')) {
            setFunnelSteps(prev => ({
                ...prev,
                [funnelKey]: prev[funnelKey].filter(s => s.id !== stepId)
            }));
            // Also cleanup expanded ids
            setExpandedStepIds(prev => ({
                ...prev,
                [funnelKey]: prev[funnelKey].filter(id => id !== stepId)
            }));
        }
    };

    const handleAddStep = (funnelKey: string) => {
        const newId = Date.now().toString();
        const newStep: EditableStep = {
            id: newId,
            delay: '+1 day',
            type: 'Email',
            title: 'New Step',
            description: 'New touchpoint',
            icon: 'mail',
            content: '',
            subject: 'New Subject'
        };

        setFunnelSteps(prev => ({
            ...prev,
            [funnelKey]: [...(prev[funnelKey] || []), newStep]
        }));
        setExpandedStepIds(prev => ({
            ...prev,
            [funnelKey]: [...(prev[funnelKey] || []), newId]
        }));
    };

    const handleSendTestEmail = async (step: EditableStep) => {
        if (sendingTestId) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Handle CALL steps
            if (step.type === 'Call' || step.type === 'AI Call' || step.type === 'Voice') {
                if (!testPhone) {
                    alert('Please enter a Test Phone Number above first.');
                    return;
                }
                setSendingTestId(step.id);
                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

                const response = await fetch(`${apiUrl}/api/admin/voice/quick-send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: testPhone,
                        script: step.content
                    })
                });

                if (response.ok) alert(`Test call initiated to ${testPhone}`);
                else throw new Error('Failed to initiate test call');
                return;
            }

            // Handle SMS steps
            if (step.type === 'Text' || step.type === 'sms' || step.type === 'SMS') {
                const targetPhone = testPhone || window.prompt('Where should we send the test SMS? (e.g. +1555...)', '');
                if (!targetPhone) return;

                setSendingTestId(step.id);
                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

                const response = await fetch(`${apiUrl}/api/admin/sms/quick-send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: targetPhone,
                        message: mergeTokens(step.content),
                        mediaUrls: step.mediaUrl ? [step.mediaUrl] : []
                    })
                });

                if (response.ok) alert(`Test SMS sent to ${targetPhone}`);
                else throw new Error('Failed to send test SMS');
                return;
            }

            const targetEmail = testEmail || user?.email || 'test@example.com';
            if (!targetEmail) return; // User cancelled

            setSendingTestId(step.id);

            const subject = mergeTokens(step.subject);
            // Replace newlines with <br/> for HTML email body
            const body = mergeTokens(step.content).replace(/\n/g, '<br/>');
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
            const response = await fetch(`${apiUrl}/api/admin/email/quick-send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: targetEmail,
                    subject: `[TEST] ${subject}`,
                    html: body,
                    text: mergeTokens(step.content)
                })
            });
            if (response.ok) alert(`Test email sent to ${targetEmail}`);
            else throw new Error('Failed to send test email');
        } catch (error) {
            console.error(error);
            alert('Failed to send test email. Check console for details.');
        } finally {
            setSendingTestId(null);
        }
    };

    // --- Token Logic ---

    const sampleMergeData = useMemo(() => ({
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
    }), []);

    // const COMMON_TOKEN_HINTS = ['{{lead.name}}', '{{lead.interestAddress}}', '{{agent.name}}', '{{agent.phone}}', '{{agent.aiCardUrl}}', '{{agent.signature}}'];

    const mergeTokens = (template: string) => {
        return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path: string) => {
            if (path === 'agent.signature' && customSignature) {
                return customSignature;
            }
            const [bucket, key] = path.split('.');
            if (!bucket || !key || !(bucket in sampleMergeData)) return '';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (sampleMergeData as any)[bucket]?.[key] || '';
        });
    };

    // --- Render Helpers ---

    return (
        <div className={isEmbedded ? '' : 'bg-slate-50 min-h-full pb-24 md:pb-0'}>
            <div className={`${isEmbedded ? '' : 'mx-auto max-w-screen-2xl'} ${isEmbedded ? 'py-6' : 'py-10'} px-0 md:px-6 lg:px-8`}>
                {!hideBackButton && onBackToDashboard && (
                    <button
                        type="button"
                        onClick={onBackToDashboard}
                        className="mb-6 flex items-center space-x-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-800 px-4 md:px-0"
                    >
                        <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                        <span>Back to Dashboard</span>
                    </button>
                )}

                <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-4 md:px-0">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                        <p className="text-sm text-slate-500 sm:text-base">
                            {subtitle}
                        </p>
                    </div>
                    {activeSection === 'funnels' && (
                        <div className="flex flex-wrap gap-2">


                            <button
                                type="button"
                                onClick={() => setIsTemplatesModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
                            >
                                <span className="material-symbols-outlined text-base">library_books</span>
                                Templates
                            </button>

                            <button
                                onClick={() => setIsSignatureModalOpen(true)}
                                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors"
                            >
                                <span className="material-symbols-outlined text-indigo-600">badge</span>
                                Edit Signature
                                {customSignature && (
                                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                        Active
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </header>

                <div className="mb-8 px-4 md:px-0">
                    <PageTipBanner
                        pageKey={`ai-funnels-${activeSection}`}
                        expandedContent={
                            <div className="space-y-4">
                                {activeSection === 'funnels' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="font-bold text-indigo-900 mb-3 text-lg">🚀 Mastering Your AI Funnels</h4>
                                            <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                                                These funnels are your 24/7 sales team. They automatically nurture every new lead so you never miss an opportunity while you're busy closing deals.
                                            </p>

                                            <div className="space-y-4">
                                                <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1">How It Works</h5>
                                                <ul className="space-y-3 text-slate-700 text-sm">
                                                    <li className="flex items-start gap-3">
                                                        <div className="mt-0.5 p-1 bg-indigo-50 rounded text-indigo-600">
                                                            <span className="material-symbols-outlined text-sm">bolt</span>
                                                        </div>
                                                        <span><strong>Triggers Instantly:</strong> Funnels start automatically when a lead enters the system (from Zillow, your website, or manual import).</span>
                                                    </li>
                                                    <li className="flex items-start gap-3">
                                                        <div className="mt-0.5 p-1 bg-indigo-50 rounded text-indigo-600">
                                                            <span className="material-symbols-outlined text-sm">account_tree</span>
                                                        </div>
                                                        <span><strong>Smart Branching:</strong> Use "Conditions" to change the path. <em>Example: If they open an email, text them 10 mins later. If not, wait 2 days.</em></span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="bg-white/50 rounded-xl p-4 border border-indigo-50">
                                            <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1 mb-3">Workflow Success Tips</h5>
                                            <ul className="space-y-3 text-slate-700 text-sm">
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">✨</span>
                                                    <span><strong>Personalize It:</strong> The default templates are effective, but adding your own voice makes them unstoppable. Click any step to edit the script.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">🔄</span>
                                                    <span><strong>Mix Your Media:</strong> Don't just email. A sequence of <em>Email → Wait 1 Day → SMS → Wait 2 Days → Task (Call)</em> converts 3x better.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">🎯</span>
                                                    <span><strong>Set It & Forget It:</strong> Once active, this funnel runs for every new lead. You only step in when they reply or book a meeting.</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                                {activeSection === 'scoring' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="font-bold text-indigo-900 mb-3 text-lg">🏆 The Science of Lead Scoring</h4>
                                            <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                                                Stop guessing who to call. We assign a "Temperature" to every lead based on their behavior, so you wake up knowing exactly who is ready to buy.
                                            </p>

                                            <div className="space-y-4">
                                                <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1">How It Works</h5>
                                                <ul className="space-y-3 text-slate-700 text-sm">
                                                    <li className="flex items-start gap-3">
                                                        <div className="mt-0.5 p-1 bg-indigo-50 rounded text-indigo-600">
                                                            <span className="material-symbols-outlined text-sm">visibility</span>
                                                        </div>
                                                        <span><strong>Tracks Invisible Signals:</strong> We log every email open, link click, and property view.</span>
                                                    </li>
                                                    <li className="flex items-start gap-3">
                                                        <div className="mt-0.5 p-1 bg-indigo-50 rounded text-indigo-600">
                                                            <span className="material-symbols-outlined text-sm">functions</span>
                                                        </div>
                                                        <span><strong>Points & Decay:</strong> Recent actions add points. Inactivity subtracts them. This keeps your "Hot List" fresh.</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="bg-white/50 rounded-xl p-4 border border-indigo-50">
                                            <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1 mb-3">Workflow Success Tips</h5>
                                            <ul className="space-y-3 text-slate-700 text-sm">
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">🔥</span>
                                                    <span><strong>Call Your "Hot" Leads First:</strong> Start your day by checking the "Hot" list. These people are active <em>right now</em>.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">🔔</span>
                                                    <span><strong>Respect the Alert:</strong> When you get a "Hot Lead Alert" on your phone, call within 5 minutes. Your conversion rate will skyrocket.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">🧹</span>
                                                    <span><strong>Prune the Cold:</strong> Don't waste energy on "Cold" leads. Let the automated "Re-engagement Funnel" handle them until they warm up.</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                                {activeSection === 'feedback' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="font-bold text-indigo-900 mb-3 text-lg">📊 Continuous Improvement Engine</h4>
                                            <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                                                Marketing isn't a "set it and forget it" task—it's an experiment. Use this feedback loop to see what messaging resonates with your market.
                                            </p>

                                            <div className="space-y-4">
                                                <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1">How It Works</h5>
                                                <ul className="space-y-3 text-slate-700 text-sm">
                                                    <li className="flex items-start gap-3">
                                                        <div className="mt-0.5 p-1 bg-indigo-50 rounded text-indigo-600">
                                                            <span className="material-symbols-outlined text-sm">analytics</span>
                                                        </div>
                                                        <span><strong>Real-Time Stats:</strong> We aggregate opens, clicks, and replies for every single email in your sequence.</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="bg-white/50 rounded-xl p-4 border border-indigo-50">
                                            <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1 mb-3">Workflow Success Tips</h5>
                                            <ul className="space-y-3 text-slate-700 text-sm">
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">✂️</span>
                                                    <span><strong>Cut the Losers:</strong> If an email has less than 20% open rate, rewrite the subject line immediately.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">✍️</span>
                                                    <span><strong>Emulate the Winners:</strong> Look at your top-performing email. Why did it work? Was it short? Did it ask a question? Do more of that.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">📅</span>
                                                    <span><strong>Weekly Check-in:</strong> Spend 5 minutes here every Friday. Small tweaks every week compound into massive results over a year.</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        }
                    />
                </div>

                <div className="hidden md:grid mb-8 grid-cols-1 gap-4 md:grid-cols-3">
                    {highlightCards.map((card) => {
                        // Skip logic if features disabled
                        if (card.targetSection === 'scoring' && !showLeadScoring) return null;
                        if (card.targetSection === 'feedback' && !showSequenceFeedback) return null;

                        const isActive = activeSection === card.targetSection;
                        return (
                            <button
                                key={card.title}
                                type="button"
                                onClick={() => setActiveSection(card.targetSection)}
                                className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${card.bgClass
                                    } ${card.borderClass} ${isActive ? 'ring-2 ring-offset-1 ring-blue-200' : 'hover:border-blue-200'} `}
                            >
                                <div className={`rounded-full p-2 shadow-sm ${card.iconClass}`}>
                                    <span className="material-symbols-outlined text-xl">{card.icon}</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800">{card.title}</h3>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{card.body}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {activeSection === 'funnels' && (
                    <div className="space-y-8">
                        <div className="mb-0 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-indigo-600">science</span>
                                <h3 className="text-sm font-bold text-slate-800">Test Configuration</h3>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 max-w-md">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Test Phone Number (for SMS & Voice)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="+15550000000"
                                            className={`w-full text-sm border rounded-lg pl-9 p-2.5 ${!isTestPhoneValid && testPhone ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}
                                            value={testPhone}
                                            onChange={(e) => setTestPhone(e.target.value)}
                                        />
                                        <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-[18px]">smartphone</span>
                                    </div>
                                    {!isTestPhoneValid && testPhone && (
                                        <p className="text-[10px] text-red-500 mt-1">
                                            Please use E.164 format (e.g. +12125551212)
                                        </p>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Enter your mobile number to receive test calls and texts from your AI.
                                    </p>
                                </div>
                                <div className="flex-1 max-w-md">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Test Email Address</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            placeholder="you@example.com"
                                            className="w-full text-sm border border-slate-200 rounded-lg pl-9 p-2.5 focus:ring-indigo-200 focus:border-indigo-500"
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                        />
                                        <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-[18px]">email</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Enter an email to receive your test blasts (defaults to your login email).
                                    </p>
                                </div>
                            </div>
                        </div>
                        {funnelSections.map((section) => (
                            <FunnelSectionRenderer
                                key={section.key}
                                config={section}
                                steps={funnelSteps[section.key] || section.initialSteps}
                                isOpen={panelExpanded[section.key]}
                                expandedStepIds={expandedStepIds[section.key] || []}
                                onTogglePanel={() => handleTogglePanel(section.key)}
                                onToggleStep={(stepId) => handleToggleStep(section.key, stepId)}
                                onUpdateStep={(stepId, field, val) => handleUpdateStep(section.key, stepId, field, val)}
                                onRemoveStep={(stepId) => handleRemoveStep(section.key, stepId)}
                                onAddStep={() => handleAddStep(section.key)}
                                onSave={() => handleSaveFunnel(section.key)}
                                onSendTest={handleSendTestEmail}
                                sampleMergeData={sampleMergeData}
                                saveStatus={saveStatus[section.key] || 'idle'}
                            />
                        ))}
                    </div>
                )}

                {activeSection === 'scoring' && showLeadScoring && (
                    <div className="bg-white border-y border-slate-200 md:border md:rounded-2xl p-6 shadow-sm">
                        <div className="mb-6 space-y-2">
                            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                                <span className="material-symbols-outlined text-base">workspace_premium</span>
                                Lead Scoring Engine
                            </p>
                            <h2 className="text-2xl font-bold text-slate-900">Scoring Rules & Tiers</h2>
                        </div>
                        <AnalyticsPage isDemoMode={isDemoMode} />
                    </div>
                )}

                {activeSection === 'feedback' && showSequenceFeedback && (
                    <div className="bg-white border-y border-slate-200 md:border md::rounded-2xl p-6 shadow-sm">
                        <div className="mb-6 space-y-2">
                            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                <span className="material-symbols-outlined text-base">auto_fix_high</span>
                                Sequence Feedback
                            </p>
                            <h2 className="text-2xl font-bold text-slate-900">Automation Performance</h2>
                        </div>
                        <SequenceFeedbackPanel isDemoMode={isDemoMode} userId={userId} isBlueprintMode={isBlueprintMode} />
                    </div>
                )}
            </div>

            {/* Modals */}
            <LeadImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={(leads, assignment) => {
                    alert(`Successfully queued ${leads.length} leads for import to ${assignment.funnel}!`);
                }}
            />

            <OutreachTemplatesModal
                isOpen={isTemplatesModalOpen}
                onClose={() => setIsTemplatesModalOpen(false)}
                type="real-estate"
            />

            {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} isDemoMode={isDemoMode} />}

            <SignatureEditorModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                initialSignature={customSignature || `Best regards,<br/><strong>${sampleMergeData.agent.name}</strong><br/>${sampleMergeData.agent.phone}`}
                onSave={(newSig) => {
                    setCustomSignature(newSig);
                    funnelService.saveSignature(userId, newSig)
                        .then(ok => ok ? console.log('Signature saved') : alert('Failed to save signature'));
                }}
            />
        </div>
    );
};

// --- Sub-Components ---

const FunnelSectionRenderer: React.FC<{
    config: FunnelSectionConfig;
    steps: EditableStep[];
    isOpen: boolean;
    expandedStepIds: string[];
    onTogglePanel: () => void;
    onToggleStep: (id: string) => void;
    onUpdateStep: (id: string, field: keyof EditableStep, value: string | number | boolean) => void;
    onRemoveStep: (id: string) => void;
    onAddStep: () => void;
    onSave: () => void;
    onSendTest: (step: EditableStep) => void;
    sampleMergeData: Record<string, Record<string, string>>;
    saveStatus?: 'idle' | 'saving' | 'success' | 'error';
}> = ({
    config, steps, isOpen, expandedStepIds,
    onTogglePanel, onToggleStep, onUpdateStep, onRemoveStep,
    onAddStep, onSave, onSendTest, sampleMergeData, saveStatus = 'idle'
}) => {
        return (
            <section className="bg-white border-y border-slate-200 md:border md:rounded-2xl shadow-sm p-6 space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${config.badgeClassName}`}>
                            <span className="material-symbols-outlined text-base">{config.badgeIcon}</span>
                            {config.badgeLabel}
                        </p>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900">{config.title}</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">{config.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(); }}
                            disabled={saveStatus === 'saving'}
                            className={`
                                inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold shadow-md transition-all
                                ${saveStatus === 'success' ? 'bg-green-600 text-white hover:bg-green-700' :
                                    saveStatus === 'error' ? 'bg-red-600 text-white hover:bg-red-700' :
                                        'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'}
                                disabled:opacity-75 disabled:cursor-not-allowed
                            `}
                        >
                            {saveStatus === 'saving' ? (
                                <>
                                    <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
                                    Saving...
                                </>
                            ) : saveStatus === 'success' ? (
                                <>
                                    <span className="material-symbols-outlined text-sm">check</span>
                                    Saved!
                                </>
                            ) : saveStatus === 'error' ? (
                                <>
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    Failed
                                </>
                            ) : (
                                config.saveLabel || 'Save Changes'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onTogglePanel}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                        >
                            <span className="material-symbols-outlined text-base">
                                {isOpen ? 'expand_less' : 'expand_more'}
                            </span>
                            {isOpen ? 'Collapse' : 'Expand'}
                        </button>
                    </div>
                </div>

                {isOpen && (
                    <>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-slate-500">
                            <span className="font-semibold text-slate-600">Tokens:</span>
                            {['{{lead.name}}', '{{lead.interestAddress}}', '{{agent.name}}'].map((token) => (
                                <span key={token} className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{token}</span>
                            ))}
                        </div>

                        <div className="space-y-0 relative">
                            {steps.map((step, index) => {
                                const stepIsOpen = expandedStepIds.includes(step.id);
                                const isLast = index === steps.length - 1;

                                return (
                                    <div key={step.id} className="relative pl-8 pb-6">
                                        {/* Timeline Line */}
                                        {!isLast && (
                                            <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-indigo-100" />
                                        )}

                                        {/* Timeline Dot */}
                                        <div className={`absolute left-0 top-3 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-white ${stepIsOpen ? 'border-indigo-600 text-indigo-600' : 'border-slate-300 text-slate-400'}`}>
                                            <div className={`w-2 h-2 rounded-full ${stepIsOpen ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                        </div>

                                        <article className={`transition-all duration-200 border rounded-2xl ${stepIsOpen ? 'bg-white border-indigo-200 shadow-lg ring-1 ring-indigo-50/50' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md cursor-pointer'}`}>
                                            {/* Header */}
                                            <div role="button" onClick={() => onToggleStep(step.id)} className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl ${stepIsOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined">{step.icon}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h3 className={`text-sm font-bold ${stepIsOpen ? 'text-indigo-900' : 'text-slate-700'}`}>{step.title}</h3>
                                                            {!stepIsOpen && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{step.delay}</span>}
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium max-w-[300px] truncate">{step.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {stepIsOpen ? (
                                                        <span className="material-symbols-outlined text-indigo-400">expand_less</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">{step.type}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            {stepIsOpen && (
                                                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="pt-4 border-t border-slate-100">
                                                        {/* Step Label & Description Editor */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                            <div>
                                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Step Name</label>
                                                                <input
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                                    value={step.title}
                                                                    onChange={(e) => onUpdateStep(step.id, 'title', e.target.value)}
                                                                    placeholder="e.g. Instant AI Welcome"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
                                                                <input
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                                    value={step.description}
                                                                    onChange={(e) => onUpdateStep(step.id, 'description', e.target.value)}
                                                                    placeholder="Briefly describe this step..."
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Quick Config Row */}
                                                        <div className="flex items-center gap-4 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                            <div className="flex-1">
                                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Timing (Since Previous Step)</label>
                                                                <select
                                                                    className="w-full bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                                                                    value={step.delay}
                                                                    onChange={(e) => onUpdateStep(step.id, 'delay', e.target.value)}
                                                                >
                                                                    <option value="0 min">0 min (Immediate)</option>
                                                                    <option value="1 hour">1 hour later</option>
                                                                    <option value="12 hours">12 hours later</option>
                                                                    <option value="1 day">+1 day later</option>
                                                                    <option value="2 days">+2 days later</option>
                                                                    <option value="3 days">+3 days later</option>
                                                                </select>
                                                            </div>
                                                            <div className="w-px h-8 bg-slate-200" />
                                                            <div className="flex-1">
                                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Action Type</label>
                                                                <select className="w-full bg-transparent text-sm font-bold text-indigo-600 focus:outline-none cursor-pointer" value={step.type} onChange={(e) => onUpdateStep(step.id, 'type', e.target.value)}>
                                                                    <option value="Email">Email</option>
                                                                    <option value="Call">AI Call</option>
                                                                    <option value="Task">Task</option>
                                                                    <option value="Wait">Wait</option>
                                                                    <option value="Condition">Condition</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Editors based on Type */}
                                                        {(step.type === 'Text' || step.type === 'sms' || step.type === 'SMS') ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                                <div className="space-y-4">
                                                                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                                                        <textarea
                                                                            className="w-full h-32 rounded-lg border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                                                                            placeholder="Type your text message here..."
                                                                            value={step.content}
                                                                            onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
                                                                        />
                                                                        <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-200">
                                                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSendTest(step); }} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">Send Test</button>
                                                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(); }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700">Save Changes</button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Phone Preview */}
                                                                <div className="flex flex-col items-center">
                                                                    <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Lead's Phone Preview</h4>
                                                                    <div className="relative w-[280px] h-[500px] bg-slate-900 rounded-[3rem] shadow-2xl p-3 ring-4 ring-slate-100">
                                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20"></div>
                                                                        <div className="w-full h-full bg-slate-50 rounded-[2.2rem] overflow-hidden flex flex-col relative z-10">
                                                                            {/* Mock UI */}
                                                                            <div className="h-10 w-full bg-slate-100/80 backdrop-blur flex justify-between items-end px-6 pb-2 text-[10px] font-bold text-slate-900">
                                                                                <span>9:41</span>
                                                                            </div>
                                                                            <div className="h-12 border-b border-slate-200 bg-slate-50/80 backdrop-blur flex flex-col items-center justify-center">
                                                                                <span className="text-[10px] text-slate-500 font-medium">{sampleMergeData['agent']?.['name']}</span>
                                                                            </div>
                                                                            <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-white">
                                                                                <div className="flex justify-end">
                                                                                    <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] text-xs leading-relaxed shadow-sm">
                                                                                        {step.content || <span className="opacity-50 italic">Typing...</span>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (step.type === 'Call' || step.type === 'AI Call' || step.type === 'Voice') ? (
                                                            <div className="space-y-4">
                                                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Voice Template</label>
                                                                    <select
                                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 capitalize mb-4 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                                                                        onChange={(e) => {
                                                                            const template = VOICE_TEMPLATES.find(t => t.id === e.target.value);
                                                                            if (template) {
                                                                                if (template.id !== 'custom') {
                                                                                    onUpdateStep(step.id, 'content', template.content);
                                                                                }
                                                                            }
                                                                        }}
                                                                        defaultValue={VOICE_TEMPLATES.find(t => t.content === step.content)?.id || 'custom'}
                                                                    >
                                                                        {VOICE_TEMPLATES.map(t => (
                                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                                        ))}
                                                                    </select>

                                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Call Script</label>
                                                                    <div className="relative">
                                                                        <textarea
                                                                            className={`w-full h-32 rounded-lg border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm ${(!VOICE_TEMPLATES.find(t => t.content === step.content) && step.content) || (VOICE_TEMPLATES.find(t => t.content === step.content)?.id === 'custom') ? 'bg-white' : 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                                                                            placeholder="Select a template or choose Custom to write your own..."
                                                                            value={step.content}
                                                                            onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
                                                                            readOnly={!!VOICE_TEMPLATES.find(t => t.content === step.content) && VOICE_TEMPLATES.find(t => t.content === step.content)?.id !== 'custom'}
                                                                        />
                                                                        {!!VOICE_TEMPLATES.find(t => t.content === step.content) && VOICE_TEMPLATES.find(t => t.content === step.content)?.id !== 'custom' && (
                                                                            <div className="absolute top-2 right-2">
                                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-200/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest backdrop-blur-sm">
                                                                                    <span className="material-symbols-outlined text-[10px]">lock</span>
                                                                                    Template Locked
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-200">
                                                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSendTest(step); }} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">Test Call</button>
                                                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(); }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700">Save Changes</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : step.type === 'Condition' ? (
                                                            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-6">
                                                                <div className="flex items-start gap-4 mb-4">
                                                                    <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600">
                                                                        <span className="material-symbols-outlined text-2xl">call_split</span>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-indigo-900 font-bold text-sm mb-1">Decision Diamond</h4>
                                                                        <p className="text-indigo-700/80 text-xs leading-relaxed max-w-md">
                                                                            Branch the funnel based on lead behavior. If the condition is met (True), we proceed to the next step. If not (False), we skip one step.
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-xs font-semibold text-indigo-800 mb-1">Condition Rule</label>
                                                                        <select
                                                                            className="w-full bg-white border-indigo-200 rounded-lg p-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                            value={step.conditionRule || 'email_opened'}
                                                                            onChange={(e) => onUpdateStep(step.id, 'conditionRule', e.target.value)}
                                                                        >
                                                                            <option value="email_opened">Has Opened Email</option>
                                                                            <option value="link_clicked">Has Clicked Link</option>
                                                                            <option value="replied">Has Replied</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-semibold text-indigo-800 mb-1">Threshold Value</label>
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                className="w-full bg-white border-indigo-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                                placeholder="1"
                                                                                value={step.conditionValue || '1'}
                                                                                onChange={(e) => onUpdateStep(step.id, 'conditionValue', e.target.value)}
                                                                            />
                                                                            <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">times</div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-4 p-3 bg-white/50 rounded-lg border border-indigo-100 flex items-center gap-3">
                                                                    <span className="material-symbols-outlined text-indigo-400">info</span>
                                                                    <p className="text-xs text-indigo-700/70 font-medium">
                                                                        <strong>Logic:</strong> If <code>{step.conditionRule || 'Opened'}</code> &ge; <code>{step.conditionValue || '1'}</code> &rarr; Go to Next Step. Else &rarr; Skip Next Step.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : step.type === 'Wait' ? (
                                                            <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-6 flex items-start gap-4">
                                                                <div className="p-3 bg-white rounded-full shadow-sm text-yellow-600">
                                                                    <span className="material-symbols-outlined text-2xl">timer</span>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-yellow-900 font-bold text-sm mb-1">Wait Step Configured</h4>
                                                                    <p className="text-yellow-700/80 text-xs leading-relaxed max-w-md">
                                                                        This step will pause the funnel for the specified duration before proceeding.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // Fallback for Email/Task/etc (simplified for brevity, can duplicate full EmailEditor if needed)
                                                            <div className="space-y-4">
                                                                <div className="rounded-xl bg-violet-50 border border-violet-100 p-5">
                                                                    <div className="flex flex-wrap gap-4 mb-4">
                                                                        <label className="flex items-center gap-2 cursor-pointer bg-white border border-violet-200 px-3 py-1.5 rounded-lg shadow-sm hover:border-violet-300">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={step.includeUnsubscribe !== false} // Default true
                                                                                onChange={(e) => onUpdateStep(step.id, 'includeUnsubscribe', e.target.checked)}
                                                                                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                                                            />
                                                                            <span className="text-xs font-semibold text-slate-700">Include Unsubscribe Link</span>
                                                                        </label>
                                                                        <label className="flex items-center gap-2 cursor-pointer bg-white border border-violet-200 px-3 py-1.5 rounded-lg shadow-sm hover:border-violet-300">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={step.trackOpens !== false} // Default true
                                                                                onChange={(e) => onUpdateStep(step.id, 'trackOpens', e.target.checked)}
                                                                                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                                                            />
                                                                            <span className="text-xs font-semibold text-slate-700">Track Opens & Clicks</span>
                                                                        </label>
                                                                    </div>
                                                                    <input
                                                                        className="w-full text-base font-bold text-slate-900 placeholder:text-slate-300 border border-violet-200 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white shadow-sm mb-4"
                                                                        placeholder="Subject Line"
                                                                        value={step.subject}
                                                                        onChange={(e) => onUpdateStep(step.id, 'subject', e.target.value)}
                                                                    />
                                                                    <div className="border border-violet-200 rounded-lg overflow-hidden shadow-sm bg-white">
                                                                        <EmailEditor
                                                                            value={step.content}
                                                                            onChange={(val) => onUpdateStep(step.id, 'content', val)}
                                                                            placeholder="Type your message..."
                                                                            className="min-h-[300px]"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-violet-200/50">
                                                                        <button type="button" onClick={() => onSendTest(step)} className="px-3 py-1.5 bg-white border border-violet-200 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 shadow-sm">Send Test</button>
                                                                        <button type="button" onClick={onSave} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-violet-700">Save Changes</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="mt-4 flex justify-between items-end">
                                                            <button type="button" onClick={() => onRemoveStep(step.id)} className="text-xs text-red-400 hover:text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">Remove Step</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    </div >
                                );
                            })}
                        </div >

                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <button type="button" onClick={onAddStep} className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                <span className="material-symbols-outlined text-base">add</span>
                                Add Step
                            </button>
                            <button type="button" onClick={onSave} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
                                <span className="material-symbols-outlined text-base">save</span>
                                {config.saveLabel}
                            </button>
                        </div>
                    </>
                )}
            </section >
        );
    };

export default UniversalFunnelPanel;
