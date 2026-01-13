import React, { useEffect, useMemo, useState } from 'react';
import AnalyticsPage from '../AnalyticsPage';
import QuickEmailModal from '../QuickEmailModal';
import SignatureEditorModal from '../SignatureEditorModal';
import { EmailEditor } from '../EmailEditor';
import SequenceFeedbackPanel from '../SequenceFeedbackPanel';
import { funnelService } from '../../services/funnelService';
import { supabase } from '../../services/supabase';
import PageTipBanner from '../PageTipBanner';
import LeadImportModal from './LeadImportModal';
import OutreachTemplatesModal from './OutreachTemplatesModal';

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
};

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
    // Admin-only: Hardcode userId for marketing funnels
    const ADMIN_MARKETING_USER_ID = 'admin-marketing';
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: user.email,
                    subject: `[TEST] ${subject}`,
                    html: body,
                    text: mergeTokens(step.content)
                })
            });
            if (response.ok) alert(`Test email sent to ${user.email}`);
            else throw new Error('Failed to send test email');
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

    const handleSaveCustomFunnel = async (type: string, steps: EditableStep[]) => {
        try {
            const success = await funnelService.saveFunnelStep(ADMIN_MARKETING_USER_ID, type, steps);
            if (success) alert('Funnel saved!');
            else alert('Failed to save.');
        } catch (error) {
            console.error('Failed to save funnel', error);
            alert('Unable to save right now.');
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







    const handleSaveAgentSalesSteps = async () => {
        try {
            const success = await funnelService.saveFunnelStep(ADMIN_MARKETING_USER_ID, 'agentSales', agentSalesSteps);
            if (success) alert('Recruitment funnel saved!');
            else alert('Failed to save.');
        } catch (error) {
            console.error('Failed to save recruitment funnel', error);
            alert('Unable to save right now.');
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


    const renderFunnelPanel = (
        panelKey: keyof typeof panelExpanded,
        {
            badgeIcon,
            badgeClassName,
            badgeLabel,
            title,
            description,
            iconColorClass: _iconColorClass,
            steps,
            expandedIds,
            onToggleStep,
            onUpdateStep,
            onRemoveStep,
            onAddStep,
            onSave,
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
            saveLabel: string;
            onSendTest: (step: EditableStep) => void;
        }
    ) => {
        const isOpen = panelExpanded[panelKey];
        return (
            <section key={`panel-${panelKey}`} className="bg-white border-y border-slate-200 md:border md:rounded-2xl shadow-sm p-6 space-y-6">
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
                    <div className="flex items-center gap-2 self-start">

                        <button
                            type="button"
                            onClick={() => togglePanel(panelKey)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                        >
                            <span className="material-symbols-outlined text-base">
                                {isOpen ? 'expand_less' : 'expand_more'}
                            </span>
                            {isOpen ? 'Collapse' : 'Expand'}
                        </button>
                    </div>
                </div>
                {
                    isOpen && (
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
                            <div className="space-y-0 relative">
                                {steps.map((step, index) => {
                                    const stepIsOpen = expandedIds.includes(step.id);

                                    // Timeline connector logic
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

                                            <article
                                                className={`transition-all duration-200 border rounded-2xl ${stepIsOpen
                                                    ? 'bg-white border-indigo-200 shadow-lg ring-1 ring-indigo-50/50'
                                                    : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md cursor-pointer'
                                                    }`}
                                            >
                                                {/* Header (Always Visible) */}
                                                <div
                                                    role="button"
                                                    onClick={() => onToggleStep(step.id)}
                                                    className="flex items-center justify-between p-4"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-xl ${stepIsOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                                            <span className="material-symbols-outlined">{step.icon}</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h3 className={`text-sm font-bold ${stepIsOpen ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                                    {step.title}
                                                                </h3>
                                                                {!stepIsOpen && (
                                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                                                        {step.delay}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 font-medium max-w-[300px] truncate">
                                                                {step.description}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {stepIsOpen ? (
                                                            <span className="material-symbols-outlined text-indigo-400">expand_less</span>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                                                    {step.type}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {stepIsOpen && (
                                                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="pt-4 border-t border-slate-100">
                                                            {/* Quick Config Row */}
                                                            <div className="flex items-center gap-4 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                                <div className="flex-1">
                                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Timing</label>
                                                                    <input
                                                                        className="w-full bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
                                                                        value={step.delay}
                                                                        onChange={(e) => onUpdateStep(step.id, 'delay', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="w-px h-8 bg-slate-200" />
                                                                <div className="flex-1">
                                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Action Type</label>
                                                                    <select
                                                                        className="w-full bg-transparent text-sm font-bold text-indigo-600 focus:outline-none cursor-pointer"
                                                                        value={step.type}
                                                                        onChange={(e) => onUpdateStep(step.id, 'type', e.target.value)}
                                                                    >
                                                                        <option value="Email">Email</option>
                                                                        <option value="Call">AI Call</option>
                                                                        <option value="Task">Task</option>
                                                                        <option value="SMS">SMS</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            {/* Condition: AI Call vs Text vs Standard Editor */}
                                                            {step.type === 'Call' || step.type === 'AI Call' ? (
                                                                <div className="rounded-xl bg-blue-50 border border-blue-100 p-6 flex items-start gap-4">
                                                                    <div className="p-3 bg-white rounded-full shadow-sm text-blue-600">
                                                                        <span className="material-symbols-outlined text-2xl">support_agent</span>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-blue-900 font-bold text-lg mb-1">AI Call Configured</h4>
                                                                        <p className="text-blue-700/80 text-sm leading-relaxed max-w-md">
                                                                            Your AI Agent will give them a friendly call to remind them about the appointment. You'll get the transcript right here in your dashboard.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (step.type === 'Text' || step.type === 'sms' || step.type === 'SMS') ? (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                                    {/* Left: Editor */}
                                                                    <div className="space-y-4">
                                                                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="material-symbols-outlined text-slate-500">sms</span>
                                                                                <h4 className="text-sm font-bold text-slate-700">SMS Content</h4>
                                                                            </div>
                                                                            <textarea
                                                                                className="w-full h-32 rounded-lg border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                                                                                placeholder="Type your text message here... (e.g. Hi {{lead.name}})"
                                                                                value={step.content}
                                                                                onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
                                                                            />
                                                                            <div className="flex justify-between items-center mt-1">
                                                                                <span className="text-[10px] text-slate-400">
                                                                                    {step.content?.length || 0} characters
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-3">
                                                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                                                    Attach Image URL (MMS)
                                                                                </label>
                                                                                <div className="flex gap-2">
                                                                                    <input
                                                                                        className="flex-1 rounded-lg border-slate-200 text-xs text-slate-700 bg-white"
                                                                                        placeholder="https://..."
                                                                                        value={step.mediaUrl || ''}
                                                                                        onChange={(e) => onUpdateStep(step.id, 'mediaUrl', e.target.value)}
                                                                                    />
                                                                                    {step.mediaUrl && <div className="w-8 h-8 rounded bg-slate-100 bg-cover bg-center border border-slate-200 shrink-0" style={{ backgroundImage: `url(${step.mediaUrl})` }}></div>}
                                                                                </div>
                                                                            </div>

                                                                            <p className="text-xs text-slate-400 mt-2">
                                                                                Tokens like <code className="bg-slate-200 px-1 rounded text-slate-600">{'{{lead.name}}'}</code> are supported.
                                                                            </p>
                                                                            <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-200">
                                                                                <button
                                                                                    onClick={() => onSendTest(step)}
                                                                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
                                                                                >
                                                                                    Send Test
                                                                                </button>
                                                                                <button
                                                                                    onClick={onSave}
                                                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700"
                                                                                >
                                                                                    Save Changes
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Right: Phone Preview (WYSIWYG) */}
                                                                    <div className="flex flex-col items-center">
                                                                        <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Lead's Phone Preview</h4>
                                                                        <div className="relative w-[280px] h-[500px] bg-slate-900 rounded-[3rem] shadow-2xl p-3 ring-4 ring-slate-100">
                                                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20"></div>
                                                                            <div className="w-full h-full bg-slate-50 rounded-[2.2rem] overflow-hidden flex flex-col relative z-10">
                                                                                {/* Status Bar */}
                                                                                <div className="h-10 w-full bg-slate-100/80 backdrop-blur flex justify-between items-end px-6 pb-2 text-[10px] font-bold text-slate-900">
                                                                                    <span>9:41</span>
                                                                                    <div className="flex gap-1">
                                                                                        <span className="material-symbols-outlined text-[12px]">signal_cellular_alt</span>
                                                                                        <span className="material-symbols-outlined text-[12px]">wifi</span>
                                                                                        <span className="material-symbols-outlined text-[12px]">battery_full</span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Header */}
                                                                                <div className="h-12 border-b border-slate-200 bg-slate-50/80 backdrop-blur flex flex-col items-center justify-center">
                                                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-bold mb-0.5">
                                                                                        {sampleMergeData.agent.name.split(' ').map(n => n[0]).join('')}
                                                                                    </div>
                                                                                    <span className="text-[10px] text-slate-500 font-medium">{sampleMergeData.agent.name}</span>
                                                                                </div>

                                                                                {/* Messages */}
                                                                                <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-white">
                                                                                    <div className="text-[10px] text-center text-slate-400 font-medium">Today 9:41 AM</div>

                                                                                    {step.mediaUrl && (
                                                                                        <div className="flex justify-end">
                                                                                            <div className="bg-blue-500 p-1 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                                                                                                <img src={step.mediaUrl} alt="MMS" className="rounded-xl w-full h-auto object-cover" />
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    <div className="flex justify-end">
                                                                                        <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] text-xs leading-relaxed shadow-sm">
                                                                                            {step.content || <span className="opacity-50 italic">Typing...</span>}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Delivery Status */}
                                                                                    <div className="flex justify-end">
                                                                                        <span className="text-[9px] text-slate-400 font-medium">Delivered</span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Input Area (Mock) */}
                                                                                <div className="h-12 border-t border-slate-200 bg-slate-50 px-2 flex items-center gap-2">
                                                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                                                                        <span className="material-symbols-outlined text-[14px]">add</span>
                                                                                    </div>
                                                                                    <div className="flex-1 h-8 rounded-full border border-slate-300 bg-white"></div>
                                                                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                                                                        <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : step.type === 'Task' ? (
                                                                <div className="space-y-4">
                                                                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5">
                                                                        <div className="flex items-center gap-2 mb-4">
                                                                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                                                                <span className="material-symbols-outlined">assignment_turned_in</span>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-sm font-bold text-emerald-900">Agent Task</h4>
                                                                                <p className="text-xs text-emerald-700/80">A dedicated reminder for you to take action.</p>
                                                                            </div>
                                                                        </div>

                                                                        <label className="block text-xs font-semibold text-emerald-800 mb-1">
                                                                            Task Title
                                                                        </label>
                                                                        <input
                                                                            className="w-full text-sm font-bold text-slate-900 placeholder:text-slate-400 border-emerald-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white mb-3"
                                                                            placeholder="e.g. Call Lead..."
                                                                            value={step.subject}
                                                                            onChange={(e) => onUpdateStep(step.id, 'subject', e.target.value)}
                                                                        />

                                                                        <label className="block text-xs font-semibold text-emerald-800 mb-1">
                                                                            Instructions / Details
                                                                        </label>
                                                                        <textarea
                                                                            className="w-full h-24 rounded-lg border-emerald-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                                                            placeholder="Describe what needs to be done..."
                                                                            value={step.content}
                                                                            onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
                                                                        />

                                                                        <div className="mt-4">
                                                                            <label className="block text-[10px] uppercase font-bold text-emerald-600/70 mb-2 tracking-wide">
                                                                                Quick Ideas
                                                                            </label>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {[
                                                                                    { emoji: '📞', label: 'Call Lead', title: 'Call Lead', desc: 'Call {{lead.name}} and ask about their timeline.' },
                                                                                    { emoji: '📝', label: 'Personal Note', title: 'Send Handwritten Note', desc: 'Write a personal card thanking {{lead.name}}.' },
                                                                                    { emoji: '📊', label: 'Prepare CMA', title: 'Prepare CMA', desc: 'Run comps for {{lead.interestAddress}} and send video review.' },
                                                                                    { emoji: '🤝', label: 'Social Connect', title: 'Connect on Social', desc: 'Find {{lead.name}} on LinkedIn/IG and follow up.' }
                                                                                ].map((idea) => (
                                                                                    <button
                                                                                        key={idea.label}
                                                                                        onClick={() => {
                                                                                            onUpdateStep(step.id, 'subject', idea.title);
                                                                                            onUpdateStep(step.id, 'content', idea.desc);
                                                                                        }}
                                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all hover:scale-105 shadow-sm"
                                                                                    >
                                                                                        <span>{idea.emoji}</span>
                                                                                        {idea.label}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-emerald-200/50">
                                                                            <button
                                                                                onClick={onSave}
                                                                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-emerald-700"
                                                                            >
                                                                                Save Changes
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4">
                                                                    <div className="rounded-xl bg-violet-50 border border-violet-100 p-5">
                                                                        <div className="flex items-center gap-2 mb-4">
                                                                            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                                                                                <span className="material-symbols-outlined">mail</span>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-sm font-bold text-violet-900">Email Content</h4>
                                                                                <p className="text-xs text-violet-700/80">Design your automated email message.</p>
                                                                            </div>
                                                                        </div>

                                                                        <label className="block text-xs font-semibold text-violet-800/90 mb-1">
                                                                            Subject Line
                                                                        </label>
                                                                        <input
                                                                            className="w-full text-base font-bold text-slate-900 placeholder:text-slate-300 border border-violet-200 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white shadow-sm mb-4"
                                                                            placeholder="e.g. following up on our chat..."
                                                                            value={step.subject}
                                                                            onChange={(e) => onUpdateStep(step.id, 'subject', e.target.value)}
                                                                        />

                                                                        <div className="relative">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <label className="text-xs font-semibold text-violet-800/90">Message Body</label>
                                                                                <button
                                                                                    type="button"
                                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-bold shadow-sm hover:shadow-md transition-all hover:scale-105"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                                                                    AI Magic
                                                                                </button>
                                                                            </div>
                                                                            <div className="border border-violet-200 rounded-lg overflow-hidden shadow-sm bg-white">
                                                                                <EmailEditor
                                                                                    value={step.content}
                                                                                    onChange={(val) => onUpdateStep(step.id, 'content', val)}
                                                                                    placeholder="Type your message..."
                                                                                    className="min-h-[300px]"
                                                                                />
                                                                            </div>
                                                                            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-violet-200/50">
                                                                                <button
                                                                                    onClick={() => onSendTest(step)}
                                                                                    className="px-3 py-1.5 bg-white border border-violet-200 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 shadow-sm"
                                                                                >
                                                                                    Send Test
                                                                                </button>
                                                                                <button
                                                                                    onClick={onSave}
                                                                                    className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-violet-700"
                                                                                >
                                                                                    Save Changes
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                            )}
                                                        </div>

                                                        <div className="mt-4 flex justify-between items-end">
                                                            <button
                                                                onClick={() => onRemoveStep(step.id)}
                                                                className="text-xs text-red-400 hover:text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                                            >
                                                                Remove Step
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        </div>
                                    );
                                })}

                            </div >
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
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                                >
                                    <span className="material-symbols-outlined text-base">save</span>
                                    {saveLabel}
                                </button>
                            </div>
                        </>
                    )
                }
            </section >
        );
    };

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
                        {renderFunnelPanel('agentSales', {
                            badgeIcon: 'rocket_launch',
                            badgeClassName: 'bg-rose-50 text-rose-700',
                            badgeLabel: 'Recruitment & Sales',
                            title: 'The "In Your Face" Closer',
                            description: 'A 5-step aggressive campaign to convert Realtors into paid subscribers. Uses the "Leak-Proof Bucket" strategy.',
                            iconColorClass: 'text-rose-600',
                            steps: agentSalesSteps,
                            expandedIds: expandedAgentSalesStepIds,
                            onToggleStep: toggleAgentSalesStep,
                            onUpdateStep: handleUpdateAgentSalesStep,
                            onRemoveStep: handleRemoveAgentSalesStep,
                            onAddStep: handleAddAgentSalesStep,
                            onSave: handleSaveAgentSalesSteps,
                            saveLabel: 'Save Recruitment Funnel',
                            onSendTest: handleSendTestEmail
                        })}

                        {/* Custom Funnel 1 */}
                        {renderFunnelPanel('custom1', {
                            badgeIcon: 'edit_square',
                            badgeClassName: 'bg-slate-100 text-slate-600',
                            badgeLabel: 'Draft',
                            title: 'Custom Funnel #1',
                            description: 'Empty canvas for a new marketing sequence.',
                            iconColorClass: 'text-slate-500',
                            steps: custom1Steps,
                            expandedIds: expandedCustom1Ids,
                            onToggleStep: (id) => setExpandedCustom1Ids(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
                            onUpdateStep: (id, field, val) => setCustom1Steps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s)),
                            onRemoveStep: (id) => setCustom1Steps(prev => prev.filter(s => s.id !== id)),
                            onAddStep: () => {
                                const newId = Date.now().toString();
                                setCustom1Steps(prev => [...prev, { id: newId, delay: '+1 day', type: 'Email', title: 'New Step', description: 'Step description...', icon: 'mail', content: '', subject: 'New Subject' }]);
                                setExpandedCustom1Ids(prev => [...prev, newId]);
                            },
                            onSave: () => handleSaveCustomFunnel('custom1', custom1Steps),
                            saveLabel: 'Save Custom Funnel 1',
                            onSendTest: handleSendTestEmail
                        })}

                        {/* Custom Funnel 2 */}
                        {renderFunnelPanel('custom2', {
                            badgeIcon: 'edit_square',
                            badgeClassName: 'bg-slate-100 text-slate-600',
                            badgeLabel: 'Draft',
                            title: 'Custom Funnel #2',
                            description: 'Empty canvas for a new marketing sequence.',
                            iconColorClass: 'text-slate-500',
                            steps: custom2Steps,
                            expandedIds: expandedCustom2Ids,
                            onToggleStep: (id) => setExpandedCustom2Ids(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
                            onUpdateStep: (id, field, val) => setCustom2Steps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s)),
                            onRemoveStep: (id) => setCustom2Steps(prev => prev.filter(s => s.id !== id)),
                            onAddStep: () => {
                                const newId = Date.now().toString();
                                setCustom2Steps(prev => [...prev, { id: newId, delay: '+1 day', type: 'Email', title: 'New Step', description: 'Step description...', icon: 'mail', content: '', subject: 'New Subject' }]);
                                setExpandedCustom2Ids(prev => [...prev, newId]);
                            },
                            onSave: () => handleSaveCustomFunnel('custom2', custom2Steps),
                            saveLabel: 'Save Custom Funnel 2',
                            onSendTest: handleSendTestEmail
                        })}

                        {/* Custom Funnel 3 */}
                        {renderFunnelPanel('custom3', {
                            badgeIcon: 'edit_square',
                            badgeClassName: 'bg-slate-100 text-slate-600',
                            badgeLabel: 'Draft',
                            title: 'Custom Funnel #3',
                            description: 'Empty canvas for a new marketing sequence.',
                            iconColorClass: 'text-slate-500',
                            steps: custom3Steps,
                            expandedIds: expandedCustom3Ids,
                            onToggleStep: (id) => setExpandedCustom3Ids(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
                            onUpdateStep: (id, field, val) => setCustom3Steps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s)),
                            onRemoveStep: (id) => setCustom3Steps(prev => prev.filter(s => s.id !== id)),
                            onAddStep: () => {
                                const newId = Date.now().toString();
                                setCustom3Steps(prev => [...prev, { id: newId, delay: '+1 day', type: 'Email', title: 'New Step', description: 'Step description...', icon: 'mail', content: '', subject: 'New Subject' }]);
                                setExpandedCustom3Ids(prev => [...prev, newId]);
                            },
                            onSave: () => handleSaveCustomFunnel('custom3', custom3Steps),
                            saveLabel: 'Save Custom Funnel 3',
                            onSendTest: handleSendTestEmail
                        })}
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
