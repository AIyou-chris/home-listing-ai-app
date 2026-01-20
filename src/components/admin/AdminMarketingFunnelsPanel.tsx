import React, { useEffect, useMemo, useState } from 'react';
import { EditableStep } from '../../types';
import AnalyticsPage from '../AnalyticsPage';
import QuickEmailModal from '../QuickEmailModal';
import SignatureEditorModal from '../SignatureEditorModal';
import SequenceFeedbackPanel from '../SequenceFeedbackPanel';
import { funnelService } from '../../services/funnelService';
import { authService } from '../../services/authService';
import { supabase } from '../../services/supabase';
import PageTipBanner from '../PageTipBanner';
import LeadImportModal from './LeadImportModal';
import OutreachTemplatesModal from './OutreachTemplatesModal';
import { FunnelPanel } from './FunnelPanel';

interface FunnelAnalyticsPanelProps {
    onBackToDashboard?: () => void;
    variant?: 'page' | 'embedded';
    title?: string;
    subtitle?: string;
    hideBackButton?: boolean;
    isDemoMode?: boolean;
}

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



const initialBlankSteps: EditableStep[] = [
    {
        id: '1',
        title: 'Draft Step',
        description: 'Start building your sequence.',
        icon: 'edit',
        delay: '0 min',
        type: 'Email',
        subject: 'Subject Line',
        content: 'Your content here...'
    }
];

const initialAgentSalesSteps: EditableStep[] = [
    {
        id: 'sales-reality',
        delay: '0 min',
        type: 'Email',
        title: 'The Reality Check',
        description: 'Hard-hitting problem awareness to snap them out of denial.',
        icon: 'warning',
        subject: 'Is your pipeline leaking?',
        content: `Hi {{lead.name}},

The market isn't what it was two years ago. Every buyer is gold.

If a warm lead texts you about a listing while you're at dinner, and you don't reply for 2 hours... they're gone.

Our AI replies in 5 seconds. 24/7. It answers questions, handles objections, and books appointments.

Don't let the next commission slip through your fingers.

---
To stop receiving these emails, please reply UNSUBSCRIBE.`
    },
    {
        id: 'sales-identity',
        delay: '+1 day',
        type: 'Email',
        title: 'Stop Being an Admin',
        description: 'Challenges their self-image to force a perspective shift.',
        icon: 'psychology',
        subject: 'Stop being a glorified assistant',
        content: `You got into real estate to close deals, not to sit at a laptop writing follow-up emails until midnight.

Stop doing $15/hr work.

Let the AI handle the grunt work (nurture, qualification, scheduling) so you can do the $500/hr work (negotiating and closing).

---
To stop receiving these emails, please reply UNSUBSCRIBE.`
    },
    {
        id: 'sales-roi',
        delay: '+2 days',
        type: 'SMS',
        title: 'The ROI Math',
        description: 'Simple logic punch delivered via text for high open rate.',
        icon: 'calculate',
        subject: 'Quick math',
        content: `Quick math {{lead.name}}:
One closed deal = $15k commission.
Our AI Sidekick = $69/mo.

If it saves you just ONE deal a year, it paid for itself for the next 20 years.
Ready to stop losing money? {{agent.website}}

(Reply STOP to opt out)`
    },
    {
        id: 'sales-2am',
        delay: '+3 days',
        type: 'Email',
        title: 'The 2 AM Test',
        description: 'Proof of capability that humans cannot match.',
        icon: 'nightlight',
        subject: 'Can you do this?',
        content: `It's 2:14 AM. A buyer just found your listing on Zillow. They have a question.

You're asleep.
Our AI is awake.

It greets them, answers their question about the school district, and schedules a viewing for Tuesday at 10 AM.

By the time you wake up, the appointment is on your calendar.
That is the difference between "hustling" and "scaling".

---
To stop receiving these emails, please reply UNSUBSCRIBE.`
    },
    {
        id: 'sales-ultimatum',
        delay: '+5 days',
        type: 'Email',
        title: 'Sink or Swim',
        description: 'Final urgency push. The market is moving on.',
        icon: 'directions_boat',
        subject: 'The market doesn\'t care',
        content: `Your competitors are already using AI. They are responding faster, nurturing better, and closing more.

You can cling to the old ways and "hope" for referrals, or you can arm yourself with the best tools on the planet.

7-Day Free Trial. No risk.
If it doesn't blow your mind, cancel it.

Start here: {{agent.website}}

---
To stop receiving these emails, please reply UNSUBSCRIBE.`
    }
];

const initPanelState = () => {
    return {
        agentSales: true,
        custom1: true,
        custom2: true,
        custom3: true
    };
};

const AdminMarketingFunnelsPanel: React.FC<FunnelAnalyticsPanelProps> = ({
    onBackToDashboard,
    variant = 'page',
    title = 'Marketing Funnels',
    subtitle = 'AI-powered marketing campaigns for HomeListingAI program',
    hideBackButton = false,
    isDemoMode = false
}) => {
    // Admin-only: Use real user ID (so DB foreign key works) or fallback to 'admin-marketing' if testing
    const [userId, setUserId] = useState('admin-marketing');

    useEffect(() => {
        // Initial check
        authService.getCurrentAgentProfile().then(profile => {
            if (profile?.id) setUserId(profile.id);
        });

        // Reactive listener for race conditions
        const unsubscribe = authService.addAuthStateListener((state) => {
            if (state.user?.uid) {
                setUserId(state.user.uid);
            }
        });

        return () => unsubscribe();
    }, []);

    const ADMIN_MARKETING_USER_ID = userId;
    const isEmbedded = variant === 'embedded';

    const [agentSalesSteps, setAgentSalesSteps] = useState<EditableStep[]>(initialAgentSalesSteps);
    const [custom1Steps, setCustom1Steps] = useState<EditableStep[]>(initialBlankSteps);
    const [custom2Steps, setCustom2Steps] = useState<EditableStep[]>(initialBlankSteps);
    const [custom3Steps, setCustom3Steps] = useState<EditableStep[]>(initialBlankSteps);

    const [expandedAgentSalesStepIds, setExpandedAgentSalesStepIds] = useState<string[]>([]);
    const [expandedCustom1Ids, setExpandedCustom1Ids] = useState<string[]>([]);
    const [expandedCustom2Ids, setExpandedCustom2Ids] = useState<string[]>([]);
    const [expandedCustom3Ids, setExpandedCustom3Ids] = useState<string[]>([]);

    // Remaining Helpers
    const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);
    const [panelExpanded, setPanelExpanded] = useState(initPanelState);
    const [activeSection, setActiveSection] = useState<'funnels' | 'scoring' | 'feedback'>('funnels');
    const [sendingTestId, setSendingTestId] = useState<string | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [customSignature, setCustomSignature] = useState<string>('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

    // Test Config State
    const [testPhone, setTestPhone] = useState('');
    const [testEmail, setTestEmail] = useState('');

    const handleSendTestEmail = async (step: EditableStep) => {
        console.log('handleSendTestEmail called for step:', step);
        if (sendingTestId) {
            console.log('Already sending test, ignoring click.');
            return;
        }

        try {
            let targetEmail = testEmail;
            let targetPhone = testPhone;

            // If no test config, try to get user session as fallback (but this is what was hanging)
            if (!targetEmail && !targetPhone) {
                console.log('No test config found, attempting to get session...');
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                if (user?.email) targetEmail = user.email;
                console.log('User session retrieved (or failed), default email:', targetEmail);
            }

            // Handle Voice Call steps
            if (step.type === 'Call' || step.type === 'AI Call') {
                console.log('Handling Call step...');

                if (!targetPhone) {
                    targetPhone = window.prompt('Where should we send the test call? (e.g. +1555...)', '') || '';
                }

                if (!targetPhone) {
                    console.log('No phone number provided.');
                    return;
                }

                setSendingTestId(step.id);
                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

                const scriptToSend = mergeTokens(step.content || "This is a test call from your AI assistant.");

                const response = await fetch(`${apiUrl}/api/admin/voice/quick-send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: targetPhone,
                        script: scriptToSend
                    })
                });

                if (response.ok) alert(`Test call initiated to ${targetPhone}`);
                else throw new Error('Failed to initiate test call');
                return;
            }

            // Handle SMS steps
            if (step.type === 'Text' || step.type === 'sms' || step.type === 'SMS') {
                console.log('Handling SMS step...');

                if (!targetPhone) {
                    targetPhone = window.prompt('Where should we send the test SMS? (e.g. +1555...)', '') || '';
                }

                if (!targetPhone) {
                    console.log('No phone number provided.');
                    return;
                }

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

            // Handle Email steps
            if (!targetEmail) {
                targetEmail = window.prompt('Where should we send the test email?', '') || '';
            }

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
            alert('Failed to send test. Check console for details.');
        } finally {
            setSendingTestId(null);
        }
    };

    type MergeBuckets = {
        lead: Record<string, string>;
        agent: Record<string, string>;
    };

    useEffect(() => {
        const loadFunnels = async () => {
            try {
                // Admin-only: Use hardcoded marketing user ID
                const funnels = await funnelService.fetchFunnels(ADMIN_MARKETING_USER_ID);

                if (funnels.agentSales && funnels.agentSales.length > 0) setAgentSalesSteps(funnels.agentSales);
                if (funnels.custom1 && funnels.custom1.length > 0) setCustom1Steps(funnels.custom1);
                if (funnels.custom2 && funnels.custom2.length > 0) setCustom2Steps(funnels.custom2);
                if (funnels.custom3 && funnels.custom3.length > 0) setCustom3Steps(funnels.custom3);

                // Load saved signature
                if (funnels.settings && funnels.settings.length > 0) {
                    const sigStep = funnels.settings.find(s => s.id === 'signature');
                    if (sigStep && sigStep.content) setCustomSignature(sigStep.content);
                }
            } catch (error) {
                console.error('Failed to load funnels:', error);
            }
        };
        loadFunnels();
    }, [ADMIN_MARKETING_USER_ID]);

    const handleSaveCustomFunnel = async (funnelId: string, steps: EditableStep[]) => {
        try {
            // Prepare steps with delayMinutes
            const stepsWithMinutes = steps.map(step => ({
                ...step,
                delayMinutes: parseDelay(step.delay)
            }));

            const result = await funnelService.saveFunnelStep(ADMIN_MARKETING_USER_ID, funnelId, stepsWithMinutes);
            if (result.success) {
                alert('Custom funnel saved!');
            } else {
                console.error('Save failed:', result);
                alert(`Failed to save: ${JSON.stringify(result.details || result.error || 'Unknown error')}`);
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Failed to save custom funnel', err);
            alert(`Unable to save: ${err.message}`);
        }
    };

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
    const COMMON_TOKEN_HINTS = ['{{lead.name}}', '{{lead.interestAddress}}', '{{agent.name}}', '{{agent.phone}}', '{{agent.aiCardUrl}}', '{{agent.signature}}'];

    const mergeTokens = (template: string) => {
        if (!template) return '';
        return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path: string) => {
            // Special handling for signature override
            if (path === 'agent.signature' && customSignature) {
                return customSignature;
            }

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







    const parseDelay = (delayStr: string): number => {
        if (!delayStr) return 0;
        const normalized = delayStr.toLowerCase().trim();
        if (normalized.includes('min')) return parseInt(normalized) || 0;
        if (normalized.includes('hour')) return (parseInt(normalized) || 0) * 60;
        if (normalized.includes('day')) return (parseInt(normalized) || 0) * 1440;
        return parseInt(normalized) || 0;
    };

    const handleSaveAgentSalesSteps = async () => {
        try {
            // Prepare steps with delayMinutes
            const stepsWithMinutes = agentSalesSteps.map(step => ({
                ...step,
                delayMinutes: parseDelay(step.delay)
            }));

            const result = await funnelService.saveFunnelStep(ADMIN_MARKETING_USER_ID, 'agentSales', stepsWithMinutes);
            if (result.success) {
                alert('Recruitment funnel saved!');
            } else {
                console.error('Save failed:', result);
                alert(`Failed to save: ${JSON.stringify(result.details || result.error || 'Unknown error')}`);
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Failed to save recruitment funnel', err);
            alert(`Unable to save: ${err.message}`);
        }
    };

    // Generic Handlers (Agent Sales)
    const toggleAgentSalesStep = (id: string) => {
        setExpandedAgentSalesStepIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const handleUpdateAgentSalesStep = (id: string, field: keyof EditableStep, value: string) => {
        setAgentSalesSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };
    const handleRemoveAgentSalesStep = (id: string) => {
        if (window.confirm('Remove this step?')) setAgentSalesSteps(prev => prev.filter(s => s.id !== id));
    };
    const handleAddAgentSalesStep = () => {
        const newId = Date.now().toString();
        setAgentSalesSteps(prev => [...prev, { id: newId, delay: '+1 day', type: 'Email', title: 'New Sales Step', description: 'Persuasion point', icon: 'campaign', content: '', subject: 'New Subject' }]);
        setExpandedAgentSalesStepIds(prev => [...prev, newId]);
    };



    // QR Code Generator



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
                        <span>Back to Blueprint Overview</span>
                    </button>
                )}

                <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-4 md:px-0">
                    <div className="space-y-2">
                        <p className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                            <span className="material-symbols-outlined text-base">monitoring</span>
                            AI Funnel
                        </p>
                        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                        <p className="text-sm text-slate-500 sm:text-base">
                            {subtitle}
                        </p>
                    </div>
                    {activeSection === 'funnels' && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                            >
                                <span className="material-symbols-outlined text-base">upload_file</span>
                                Import Leads
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsTemplatesModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
                            >
                                <span className="material-symbols-outlined text-base">library_books</span>
                                Agent Templates
                            </button>

                            {/* REMOVED: Open House QR & Email Library for Admin */}
                            <button
                                onClick={() => setIsSignatureModalOpen(true)}
                                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors"
                            >
                                <span className="material-symbols-outlined text-indigo-600">badge</span>
                                Edit Global Signature
                                {customSignature && (
                                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                        Active
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </header>

                {/* Test Configuration Card */}
                <div className="mb-8 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-indigo-600">science</span>
                        <h3 className="text-sm font-bold text-slate-800">Test Configuration</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Test Phone Number (for SMS & Voice)</label>
                            <input
                                type="text"
                                placeholder="+15550000000"
                                className="w-full text-sm border-slate-200 rounded-lg"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                                Format: E.164 (e.g. +12125551212)
                            </p>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Test Email Address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                className="w-full text-sm border-slate-200 rounded-lg"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                        * Enter details here to skip prompts when clicking "Send Test".
                    </p>
                </div>

                <div className="mb-8 px-4 md:px-0">
                    <PageTipBanner
                        pageKey="ai-funnels"
                        expandedContent={
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-2">🚀 Power Up Your AI Funnels:</h4>
                                    <ul className="space-y-2 text-slate-700">
                                        <li className="flex items-start">
                                            <span className="mr-2">✏️</span>
                                            <span><strong>Complete Control:</strong> Edit any step to customize the voice. You can mix emails, texts, and task reminders to build the perfect nurturing journey.</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2">💬</span>
                                            <span><strong>Multi-Channel Magic:</strong> Don't just email. Set up automated text sequences that feel personal, triggering real conversations that the AI takes over instantly.</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2">🔄</span>
                                            <span><strong>Smart Follow-Ups:</strong> Configure specific time delays (2 days, 1 week) so your leads hear from you exactly when it counts, running 24/7 in the background.</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="font-semibold text-blue-900 mb-2">💎 Why It Works:</h4>
                                    <p className="text-blue-800">
                                        Most agents give up after 2 attempts. These AI funnels persist indefinitely, turning cold leads warm and booking appointments automatically so you wake up to a booked calendar.
                                    </p>
                                </div>
                            </div>
                        }
                    />
                </div>

                <div className="hidden md:grid mb-8 grid-cols-1 gap-4 md:grid-cols-3">
                    {highlightCards.map((card) => {
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
                        <FunnelPanel
                            panelKey="agentSales"
                            isOpen={panelExpanded.agentSales}
                            onTogglePanel={() => togglePanel('agentSales')}
                            badgeIcon="rocket_launch"
                            badgeClassName="bg-rose-50 text-rose-700"
                            badgeLabel="Recruitment & Sales"
                            title="The &quot;In Your Face&quot; Closer"
                            description="A 5-step aggressive campaign to convert Realtors into paid subscribers. Uses the &quot;Leak-Proof Bucket&quot; strategy."
                            iconColorClass="text-rose-600"
                            steps={agentSalesSteps}
                            expandedIds={expandedAgentSalesStepIds}
                            onToggleStep={toggleAgentSalesStep}
                            onUpdateStep={handleUpdateAgentSalesStep}
                            onRemoveStep={handleRemoveAgentSalesStep}
                            onAddStep={handleAddAgentSalesStep}
                            onSave={handleSaveAgentSalesSteps}
                            saveLabel="Save Recruitment Funnel"
                            onSendTest={handleSendTestEmail}
                            mergeTokens={mergeTokens}
                            COMMON_TOKEN_HINTS={COMMON_TOKEN_HINTS}
                        />

                        {/* Custom Funnel 1 */}
                        <FunnelPanel
                            panelKey="custom1"
                            isOpen={panelExpanded.custom1}
                            onTogglePanel={() => togglePanel('custom1')}
                            badgeIcon="edit_square"
                            badgeClassName="bg-slate-100 text-slate-600"
                            badgeLabel="Draft"
                            title="Custom Funnel #1"
                            description="Empty canvas for a new marketing sequence."
                            iconColorClass="text-slate-500"
                            steps={custom1Steps}
                            expandedIds={expandedCustom1Ids}
                            onToggleStep={(id) => setExpandedCustom1Ids(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                            onUpdateStep={(id, field, val) => setCustom1Steps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s))}
                            onRemoveStep={(id) => setCustom1Steps(prev => prev.filter(s => s.id !== id))}
                            onAddStep={() => {
                                const newId = Date.now().toString();
                                setCustom1Steps(prev => [...prev, { id: newId, delay: '+1 day', type: 'Email', title: 'New Step', description: 'Step description...', icon: 'mail', content: '', subject: 'New Subject' }]);
                                setExpandedCustom1Ids(prev => [...prev, newId]);
                            }}
                            onSave={() => handleSaveCustomFunnel('custom1', custom1Steps)}
                            saveLabel="Save Custom Funnel 1"
                            onSendTest={handleSendTestEmail}
                            mergeTokens={mergeTokens}
                            COMMON_TOKEN_HINTS={COMMON_TOKEN_HINTS}
                        />

                        {/* Custom Funnel 2 */}
                        <FunnelPanel
                            panelKey="custom2"
                            isOpen={panelExpanded.custom2}
                            onTogglePanel={() => togglePanel('custom2')}
                            badgeIcon="edit_square"
                            badgeClassName="bg-slate-100 text-slate-600"
                            badgeLabel="Draft"
                            title="Custom Funnel #2"
                            description="Empty canvas for a new marketing sequence."
                            iconColorClass="text-slate-500"
                            steps={custom2Steps}
                            expandedIds={expandedCustom2Ids}
                            onToggleStep={(id) => setExpandedCustom2Ids(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                            onUpdateStep={(id, field, val) => setCustom2Steps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s))}
                            onRemoveStep={(id) => setCustom2Steps(prev => prev.filter(s => s.id !== id))}
                            onAddStep={() => {
                                const newId = Date.now().toString();
                                setCustom2Steps(prev => [...prev, { id: newId, delay: '+1 day', type: 'Email', title: 'New Step', description: 'Step description...', icon: 'mail', content: '', subject: 'New Subject' }]);
                                setExpandedCustom2Ids(prev => [...prev, newId]);
                            }}
                            onSave={() => handleSaveCustomFunnel('custom2', custom2Steps)}
                            saveLabel="Save Custom Funnel 2"
                            onSendTest={handleSendTestEmail}
                            mergeTokens={mergeTokens}
                            COMMON_TOKEN_HINTS={COMMON_TOKEN_HINTS}
                        />

                        {/* Custom Funnel 3 */}
                        <FunnelPanel
                            panelKey="custom3"
                            isOpen={panelExpanded.custom3}
                            onTogglePanel={() => togglePanel('custom3')}
                            badgeIcon="edit_square"
                            badgeClassName="bg-slate-100 text-slate-600"
                            badgeLabel="Draft"
                            title="Custom Funnel #3"
                            description="Empty canvas for a new marketing sequence."
                            iconColorClass="text-slate-500"
                            steps={custom3Steps}
                            expandedIds={expandedCustom3Ids}
                            onToggleStep={(id) => setExpandedCustom3Ids(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                            onUpdateStep={(id, field, val) => setCustom3Steps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s))}
                            onRemoveStep={(id) => setCustom3Steps(prev => prev.filter(s => s.id !== id))}
                            onAddStep={() => {
                                const newId = Date.now().toString();
                                setCustom3Steps(prev => [...prev, { id: newId, delay: '+1 day', type: 'Email', title: 'New Step', description: 'Step description...', icon: 'mail', content: '', subject: 'New Subject' }]);
                                setExpandedCustom3Ids(prev => [...prev, newId]);
                            }}
                            onSave={() => handleSaveCustomFunnel('custom3', custom3Steps)}
                            saveLabel="Save Custom Funnel 3"
                            onSendTest={handleSendTestEmail}
                            mergeTokens={mergeTokens}
                            COMMON_TOKEN_HINTS={COMMON_TOKEN_HINTS}
                        />
                    </div>
                )}

                {activeSection === 'scoring' && (
                    <div className="bg-white border-y border-slate-200 md:border md:rounded-2xl p-6 shadow-sm">
                        <div className="mb-6 space-y-2">
                            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                                <span className="material-symbols-outlined text-base">workspace_premium</span>
                                Lead Scoring Engine
                            </p>
                            <h2 className="text-2xl font-bold text-slate-900">Scoring Rules & Tiers</h2>
                            <p className="text-sm text-slate-500">
                                See the rules, tiers, and point gains that determine which prospects graduate to Hot or stay in nurture.
                            </p>
                        </div>
                        <AnalyticsPage isDemoMode={isDemoMode} />
                    </div>
                )}

                {activeSection === 'feedback' && (
                    <div className="bg-white border-y border-slate-200 md:border md:rounded-2xl p-6 shadow-sm">
                        <div className="mb-6 space-y-2">
                            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                <span className="material-symbols-outlined text-base">auto_fix_high</span>
                                Sequence Feedback
                            </p>
                            <h2 className="text-2xl font-bold text-slate-900">Automation Performance</h2>
                            <p className="text-sm text-slate-500">
                                Compare reply rates, openings, and meeting bookings for every drip so you know where to iterate next.
                            </p>
                        </div>
                        <SequenceFeedbackPanel isDemoMode={isDemoMode} />
                    </div>
                )}
            </div>
            {/* Modals */}
            <LeadImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={(leads, assignment) => {
                    console.log('Importing leads:', leads, assignment);
                    alert(`Successfully queued ${leads.length} leads for import to ${assignment.funnel}!`);
                }}
            />

            <OutreachTemplatesModal
                isOpen={isTemplatesModalOpen}
                onClose={() => setIsTemplatesModalOpen(false)}
            />

            {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} isDemoMode={isDemoMode} />}

            <SignatureEditorModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                initialSignature={customSignature || `Best regards,<br/><strong>${sampleMergeData.agent.name}</strong><br/>${sampleMergeData.agent.phone}`}
                onSave={(newSig) => {
                    setCustomSignature(newSig);
                    funnelService.saveSignature(ADMIN_MARKETING_USER_ID, newSig)
                        .then(ok => ok ? console.log('Signature saved') : alert('Failed to save signature'));
                }}
            />
            {/* Mobile Fixed Navigation Bar */}
            {
                !isEmbedded && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 md:hidden flex justify-around items-center px-2 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        {highlightCards.map((card) => {
                            const isActive = activeSection === card.targetSection;
                            return (
                                <button
                                    key={card.id}
                                    onClick={() => setActiveSection(card.targetSection)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <span className={`material-symbols-outlined text-2xl mb-0.5 ${isActive ? 'filled' : ''}`}>
                                        {card.icon}
                                    </span>
                                    <span className="text-[10px] font-medium leading-none">
                                        {card.title.replace('Live ', '').replace('Engine', '').replace('Sequence ', '')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )
            }
        </div >
    );
};

export default AdminMarketingFunnelsPanel;
