import React, { useEffect, useMemo, useState } from 'react';
import AnalyticsPage from './AnalyticsPage';
import QuickEmailModal from './QuickEmailModal';
import SignatureEditorModal from './SignatureEditorModal';
import { EmailEditor } from './EmailEditor';
import SequenceFeedbackPanel from './SequenceFeedbackPanel';
import { funnelService } from '../services/funnelService';
import { supabase } from '../services/supabase';

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
        title: 'Live Funnel Health',
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
};

const initialWelcomeSteps: EditableStep[] = [
    {
        id: 'welcome-ai',
        title: 'Instant AI Welcome',
        description: 'Chatbot fires a warm intro email + SMS within 2 minutes.',
        icon: 'thunderstorm',
        delay: '0 min',
        type: 'AI Email',
        subject: 'Welcome aboard, {{lead.name}}!',
        content: `Hi {{lead.name}},

Great to meet you! I built a quick concierge just for you — it highlights {{lead.interestAddress || "the homes we're short‑listing"}} and answers questions 24/7.

Take a peek here: {{agent.aiCardUrl || agent.website}}

Talk soon,
{{agent.name}} · {{agent.phone}}`
    },
    {
        id: 'welcome-checkin',
        title: 'Day 1 Check-In',
        description: 'Bot shares quick resources and asks for timeline + budget so you can prioritize.',
        icon: 'draft',
        delay: '+24 hrs',
        type: 'Follow-up',
        subject: 'Quick check-in + next steps',
        content: `Hi {{lead.name}},

Want me to line up tours for {{lead.interestAddress || 'any favorite homes'}}?

Drop me your target move-in date + ideal payment range and I’ll tailor alerts that match perfectly.`
    },
    {
        id: 'welcome-task',
        title: 'Agent Task',
        description: 'Reminder for a human touch — call/text with next steps.',
        icon: 'call',
        delay: '+48 hrs',
        type: 'Task',
        subject: 'Agent task',
        content: `Task: Call {{lead.name}} about {{lead.interestAddress || 'their top picks'}}.

Goal: confirm financing path + invite to a live strategy session.`
    }
];

const initialHomeBuyerSteps: EditableStep[] = [
    {
        id: 'buyer-intake',
        title: 'Lead Qualification',
        description: 'AI concierge confirms price range, move timeline, and pre-approval status.',
        icon: 'assignment',
        delay: '0 min',
        type: 'AI Intake',
        subject: 'Let’s dial in your wishlist',
        content: `Hey {{lead.name}},

Quick lightning round so I can curate listings for you:
- Ideal price range?
- Must-haves (beds, neighborhood, vibes)?
- Target move date?

Reply here and I’ll handle the rest.`
    },
    {
        id: 'buyer-matches',
        title: 'Curated Matches',
        description: 'Send 3 tailored MLS matches that fit the captured wishlist.',
        icon: 'home',
        delay: '+6 hrs',
        type: 'AI Email',
        subject: 'Hand-picked homes to preview',
        content: `Based on your wishlist, here are three homes that hit the mark:
1. {{lead.matchOne || 'Palm Oasis · $890k · Pool + ADU'}}
2. {{lead.matchTwo || 'Vista Row · $815k · Walkable to everything'}}
3. {{lead.matchThree || 'Sierra Modern · $925k · Views for days'}}

Want me to unlock more details or line up a private tour?`
    },
    {
        id: 'buyer-tour',
        title: 'Tour Offer',
        description: 'Invite the buyer to pick a tour window or book a virtual walk-through.',
        icon: 'calendar_add_on',
        delay: '+1 day',
        type: 'CTA',
        subject: 'Ready to tour this week?',
        content: `I can stack back-to-back showings or drop you into a private FaceTime walk-through.

Tap a window that works: {{agent.aiCardUrl}}/schedule`
    },
    {
        id: 'buyer-checkin',
        title: 'Agent Check-In',
        description: 'Task reminder for the agent to text/call with additional recommendations.',
        icon: 'phone_in_talk',
        delay: '+2 days',
        type: 'Task',
        subject: 'Agent task',
        content: `Task: Text {{lead.name}} with 2 fresh ideas + invite to co-build a shortlist.
Mention {{lead.interestAddress || 'their top property'}} and confirm financing route.`
    },
    {
        id: 'buyer-finance',
        title: 'Financing Boost',
        description: 'Share lender resources or payment calculators to keep momentum.',
        icon: 'savings',
        delay: '+4 days',
        type: 'Follow-up',
        subject: 'Lower payment options?',
        content: `Here’s a calculator tuned to the neighborhoods you like: {{agent.website}}/payments

Need a warm intro to my lender partners? Happy to connect you.`
    }
];

const initialListingSteps: EditableStep[] = [
    {
        id: 'listing-intake',
        title: 'AI Story Intake',
        description: 'Seller completes a quick form; AI turns the notes into a lifestyle narrative.',
        icon: 'stylus',
        delay: '0 min',
        type: 'AI Intake',
        subject: 'Let’s make your home talk',
        content: `Thanks for the details on {{lead.interestAddress || 'your property'}}.
I’m feeding them into our AI storyteller so buyers feel the lifestyle on the first touch.`
    },
    {
        id: 'listing-draft',
        title: 'Interactive Listing Draft',
        description: 'System builds the AI-powered property page with concierge + talking points.',
        icon: 'dynamic_feed',
        delay: '+30 min',
        type: 'AI Builder',
        subject: 'Preview your interactive listing',
        content: `Here’s the first pass of your AI listing experience:
{{agent.website}}/listing-preview

The concierge already knows how to answer buyer questions 24/7.`
    },
    {
        id: 'listing-voice',
        title: 'Home Speaks Preview',
        description: 'Share a preview link so sellers hear how the home “talks” to buyers.',
        icon: 'record_voice_over',
        delay: '+2 hrs',
        type: 'Showcase',
        subject: 'Hear your home talk to buyers',
        content: `Play this preview — our AI concierge walks buyers through every highlight:
{{agent.aiCardUrl}}/listing-preview

Send me any details you want it to emphasize.`
    },
    {
        id: 'listing-launch',
        title: 'Launch Boost',
        description: 'Kick off marketing: QR codes, reels, email nurtures referencing the story.',
        icon: 'rocket_launch',
        delay: '+1 day',
        type: 'Campaign',
        subject: 'Launch plan locked',
        content: `We’re launching with:
- Interactive listing + AI concierge
- QR codes for signage
- Social reels + nurture emails

Go-live date: {{lead.timeline || 'this Friday'}}.`
    },
    {
        id: 'listing-feedback',
        title: 'Feedback Loop',
        description: 'AI summarizes buyer questions from the concierge for fine-tuning.',
        icon: 'insights',
        delay: '+3 days',
        type: 'Analytics',
        subject: 'Buyer feedback recap',
        content: `AI pulled the top buyer questions so far:
- {{lead.questionOne || 'Do utilities include solar credits?'}}
- {{lead.questionTwo || 'Can we convert the loft?'}}

Let’s adjust staging/pricing based on this intel.`
    }
];

const initialPostShowingSteps: EditableStep[] = [
    {
        id: 'post-thanks',
        title: 'Immediate Thanks',
        description: 'AI concierge sends a recap minutes after the showing with highlights and next steps.',
        icon: 'handshake',
        delay: '0 min',
        type: 'AI Email',
        subject: 'Thanks for touring {{lead.interestAddress}}',
        content: `Hi {{lead.name}},

Loved walking you through {{lead.interestAddress}}. Here’s a quick recap + next steps.

Want a second look or details on similar homes? I’m on standby.`
    },
    {
        id: 'post-feedback',
        title: 'Feedback Pulse',
        description: 'Ask the buyer to rate interest level and capture objections via chatbot survey.',
        icon: 'rate_review',
        delay: '+2 hrs',
        type: 'Survey',
        subject: 'Mind sharing quick feedback?',
        content: `Drop a 30-second response so I can tailor our next steps:
{{agent.aiCardUrl}}/feedback`
    },
    {
        id: 'post-agent-touch',
        title: 'Agent Touch',
        description: 'Schedule a personal text or call reminder so the agent can address objections.',
        icon: 'sms',
        delay: '+1 day',
        type: 'Task',
        subject: 'Agent task',
        content: `Task: Text {{lead.name}} to address objections + offer alternates.
Include quick notes from the showing.`
    },
    {
        id: 'post-comps',
        title: 'Comparables Drop',
        description: 'Share two similar homes with smart commentary to keep the buyer engaged with you.',
        icon: 'real_estate_agent',
        delay: '+2 days',
        type: 'Follow-up',
        subject: 'Two smart alternates to compare',
        content: `Based on what you loved, here are two matches:
1. {{lead.matchOne || 'Maple Modern – turnkey + office nook'}}
2. {{lead.matchTwo || 'Canyon Ridge – same vibe, bigger yard'}}

Want me to unlock either?`
    },
    {
        id: 'post-nudge',
        title: 'Offer Nudge',
        description: 'AI watches market activity and sends a gentle urgency nudge if interest remains high.',
        icon: 'notifications_active',
        delay: '+4 days',
        type: 'Automation',
        subject: 'Market update: pace picked up',
        content: `Contracts jumped 12% this week for homes like {{lead.interestAddress}}.
If you’re still interested, I can prep numbers + offer strategy anytime.`
    }
];

const initPanelState = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return {
            welcome: false,
            buyer: false,
            listing: false,
            post: false
        };
    }
    return {
        welcome: true,
        buyer: true,
        listing: true,
        post: true
    };
};

const FunnelAnalyticsPanel: React.FC<FunnelAnalyticsPanelProps> = ({
    onBackToDashboard,
    variant = 'page',
    title = 'Leads Funnel',
    subtitle = 'Homebuyer, Seller, and Showing funnels for every lead',
    hideBackButton = false,
    isDemoMode = false
}) => {
    const isEmbedded = variant === 'embedded';
    const [welcomeSteps, setWelcomeSteps] = useState<EditableStep[]>(initialWelcomeSteps);
    const [homeBuyerSteps, setHomeBuyerSteps] = useState<EditableStep[]>(initialHomeBuyerSteps);
    const [listingSteps, setListingSteps] = useState<EditableStep[]>(initialListingSteps);
    const [postShowingSteps, setPostShowingSteps] = useState<EditableStep[]>(initialPostShowingSteps);
    const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);
    const [expandedStepIds, setExpandedStepIds] = useState<string[]>([]);
    const [expandedBuyerStepIds, setExpandedBuyerStepIds] = useState<string[]>([]);
    const [expandedListingStepIds, setExpandedListingStepIds] = useState<string[]>([]);
    const [expandedPostStepIds, setExpandedPostStepIds] = useState<string[]>([]);
    const [panelExpanded, setPanelExpanded] = useState(initPanelState);
    const [activeSection, setActiveSection] = useState<'funnels' | 'scoring' | 'feedback'>('funnels');
    const [sendingTestId, setSendingTestId] = useState<string | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [customSignature, setCustomSignature] = useState<string>('');

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
        const loadFunnels = async () => {
            try {
                // Use a default user ID if none provided (e.g. 'demo-blueprint')
                // In a real app, this would come from auth context
                const currentUserId = 'demo-blueprint';
                const funnels = await funnelService.fetchFunnels(currentUserId);

                if (funnels.welcome && funnels.welcome.length > 0) setWelcomeSteps(funnels.welcome);
                if (funnels.buyer && funnels.buyer.length > 0) setHomeBuyerSteps(funnels.buyer);
                if (funnels.listing && funnels.listing.length > 0) setListingSteps(funnels.listing);
                if (funnels['post-showing'] && funnels['post-showing'].length > 0) setPostShowingSteps(funnels['post-showing']);
            } catch (error) {
                console.error('Failed to load funnels:', error);
            }
        };
        loadFunnels();
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

    const handleUpdateStep = (id: string, field: keyof EditableStep, value: string) => {
        setWelcomeSteps((prev) =>
            prev.map((step) => (step.id === id ? { ...step, [field]: value } : step))
        );
    };

    const handleAddWelcomeStep = () => {
        const newStep: EditableStep = {
            id: `welcome-${Date.now()}`,
            title: 'New Step',
            description: 'Describe what this touchpoint does.',
            icon: 'forward_to_inbox',
            delay: '+1 day',
            type: 'Custom',
            subject: 'Subject line',
            content: 'Write the message here. Use variables like {{lead.name}} and {{agent.name}}.'
        };
        setWelcomeSteps((prev) => [...prev, newStep]);
    };

    const handleRemoveWelcomeStep = (id: string) => {
        setWelcomeSteps((prev) => prev.filter((step) => step.id !== id));
        setExpandedStepIds((prev) => prev.filter((stepId) => stepId !== id));
    };

    const toggleStep = (id: string) => {
        setExpandedStepIds((prev) =>
            prev.includes(id) ? prev.filter((stepId) => stepId !== id) : [...prev, id]
        );
    };

    const handleSaveWelcomeSteps = async () => {
        if (isDemoMode) {
            alert('Saving is disabled in demo mode.');
            return;
        }
        try {
            const success = await funnelService.saveFunnelStep('demo-blueprint', 'welcome', welcomeSteps);
            if (success) alert('Welcome drip saved to cloud.');
            else alert('Failed to save. Please try again.');
        } catch (error) {
            console.error('Failed to save welcome funnel', error);
            alert('Unable to save right now.');
        }
    };

    const handleUpdateBuyerStep = (id: string, field: keyof EditableStep, value: string) => {
        setHomeBuyerSteps((prev) =>
            prev.map((step) => (step.id === id ? { ...step, [field]: value } : step))
        );
    };

    const handleAddBuyerStep = () => {
        const newStep: EditableStep = {
            id: `buyer-${Date.now()}`,
            title: 'New Step',
            description: 'Describe what this touchpoint does.',
            icon: 'bolt',
            delay: '+1 day',
            type: 'Custom',
            subject: 'Subject line',
            content: 'Write the message here. Use tokens like {{lead.name}}.'
        };
        setHomeBuyerSteps((prev) => [...prev, newStep]);
    };

    const handleRemoveBuyerStep = (id: string) => {
        setHomeBuyerSteps((prev) => prev.filter((step) => step.id !== id));
        setExpandedBuyerStepIds((prev) => prev.filter((stepId) => stepId !== id));
    };

    const toggleBuyerStep = (id: string) => {
        setExpandedBuyerStepIds((prev) =>
            prev.includes(id) ? prev.filter((stepId) => stepId !== id) : [...prev, id]
        );
    };

    const handleSaveBuyerSteps = async () => {
        if (isDemoMode) {
            alert('Saving is disabled in demo mode.');
            return;
        }
        try {
            const success = await funnelService.saveFunnelStep('demo-blueprint', 'buyer', homeBuyerSteps);
            if (success) alert('Homebuyer journey saved to cloud.');
            else alert('Failed to save.');
        } catch (error) {
            console.error('Failed to save homebuyer funnel', error);
            alert('Unable to save right now.');
        }
    };

    const handleUpdateListingStep = (id: string, field: keyof EditableStep, value: string) => {
        setListingSteps((prev) =>
            prev.map((step) => (step.id === id ? { ...step, [field]: value } : step))
        );
    };

    const handleAddListingStep = () => {
        const newStep: EditableStep = {
            id: `listing-${Date.now()}`,
            title: 'New Step',
            description: 'Describe how this seller touchpoint works.',
            icon: 'auto_fix_high',
            delay: '+1 day',
            type: 'Custom',
            subject: 'Subject line',
            content: 'Message body with {{lead.name}} / {{agent.name}} tokens.'
        };
        setListingSteps((prev) => [...prev, newStep]);
    };

    const handleRemoveListingStep = (id: string) => {
        setListingSteps((prev) => prev.filter((step) => step.id !== id));
        setExpandedListingStepIds((prev) => prev.filter((stepId) => stepId !== id));
    };

    const toggleListingStep = (id: string) => {
        setExpandedListingStepIds((prev) =>
            prev.includes(id) ? prev.filter((stepId) => stepId !== id) : [...prev, id]
        );
    };

    const handleSaveListingSteps = async () => {
        if (isDemoMode) {
            alert('Saving is disabled in demo mode.');
            return;
        }
        try {
            const success = await funnelService.saveFunnelStep('demo-blueprint', 'listing', listingSteps);
            if (success) alert('Listing funnel saved to cloud.');
            else alert('Failed to save.');
        } catch (error) {
            console.error('Failed to save listing funnel', error);
            alert('Unable to save right now.');
        }
    };

    const handleUpdatePostStep = (id: string, field: keyof EditableStep, value: string) => {
        setPostShowingSteps((prev) =>
            prev.map((step) => (step.id === id ? { ...step, [field]: value } : step))
        );
    };

    const handleAddPostStep = () => {
        const newStep: EditableStep = {
            id: `post-${Date.now()}`,
            title: 'New Step',
            description: 'Describe the follow-up touch.',
            icon: 'mail',
            delay: '+1 day',
            type: 'Custom',
            subject: 'Subject line',
            content: 'Message body with {{lead.name}} tokens.'
        };
        setPostShowingSteps((prev) => [...prev, newStep]);
    };

    const handleRemovePostStep = (id: string) => {
        setPostShowingSteps((prev) => prev.filter((step) => step.id !== id));
        setExpandedPostStepIds((prev) => prev.filter((stepId) => stepId !== id));
    };

    const togglePostStep = (id: string) => {
        setExpandedPostStepIds((prev) =>
            prev.includes(id) ? prev.filter((stepId) => stepId !== id) : [...prev, id]
        );
    };

    const handleSavePostSteps = async () => {
        if (isDemoMode) {
            alert('Saving is disabled in demo mode.');
            return;
        }
        try {
            const success = await funnelService.saveFunnelStep('demo-blueprint', 'post-showing', postShowingSteps);
            if (success) alert('Post-showing follow-up saved to cloud.');
            else alert('Failed to save.');
        } catch (error) {
            console.error('Failed to save post-showing funnel', error);
            alert('Unable to save right now.');
        }
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
                                                                <option value="AI Email">AI Email</option>
                                                                <option value="Call">AI Call</option>
                                                                <option value="Task">Task</option>
                                                                <option value="Text">Text</option>
                                                                <option value="AI Intake">AI Intake</option>
                                                                <option value="Follow-up">Follow-up</option>
                                                                <option value="CTA">CTA</option>
                                                                <option value="AI Builder">AI Builder</option>
                                                                <option value="Showcase">Showcase</option>
                                                                <option value="Campaign">Campaign</option>
                                                                <option value="Analytics">Analytics</option>
                                                                <option value="Survey">Survey</option>
                                                                <option value="Automation">Automation</option>
                                                                <option value="Custom">Custom</option>
                                                            </select>
                                                        </label>
                                                    </div>
                                                    <label className="text-xs font-semibold text-slate-600">
                                                        Subject
                                                        <input
                                                            className={`mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 ${step.type === 'Call' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                                                            value={step.type === 'Call' ? '' : step.subject}
                                                            onChange={(event) => onUpdateStep(step.id, 'subject', event.target.value)}
                                                            disabled={step.type === 'Call'}
                                                            placeholder={step.type === 'Call' ? 'Not used for AI Calls' : ''}
                                                        />
                                                    </label>
                                                    <label className="text-xs font-semibold text-slate-600 block">
                                                        Message Body
                                                        <EmailEditor
                                                            value={step.content}
                                                            onChange={(val) => onUpdateStep(step.id, 'content', val)}
                                                            className="mt-1"
                                                            placeholder="Draft your email..."
                                                        />
                                                    </label>
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                                                            <p className="mt-1 text-sm font-semibold text-slate-900">{previewSubject}</p>
                                                            <div
                                                                className="mt-2 text-sm leading-relaxed text-slate-600 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                                                                dangerouslySetInnerHTML={{ __html: previewBody.replace(/\n/g, '<br/>') }}
                                                            />
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
                    {activeSection === 'funnels' && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setIsQuickEmailOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                            >
                                <span className="material-symbols-outlined text-base">outgoing_mail</span>
                                Open Email Library
                            </button>
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

                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                        {renderFunnelPanel('welcome', {
                            badgeIcon: 'filter_alt',
                            badgeClassName: 'bg-emerald-50 text-emerald-700',
                            badgeLabel: 'Default Funnel',
                            title: 'Universal Welcome Drip',
                            description:
                                'Every new chatbot lead lands here automatically. Edit the copy, delays, or add extra steps whenever you’re ready.',
                            iconColorClass: 'text-primary-600',
                            steps: welcomeSteps,
                            expandedIds: expandedStepIds,
                            onToggleStep: toggleStep,
                            onUpdateStep: handleUpdateStep,
                            onRemoveStep: handleRemoveWelcomeStep,
                            onAddStep: handleAddWelcomeStep,
                            onSave: handleSaveWelcomeSteps,
                            saveLabel: 'Save Welcome Drip',
                            onSendTest: handleSendTestEmail
                        })}

                        {renderFunnelPanel('buyer', {
                            badgeIcon: 'hub',
                            badgeClassName: 'bg-blue-50 text-blue-700',
                            badgeLabel: '5-Step Journey',
                            title: 'AI-Powered Homebuyer Journey',
                            description:
                                'Guide serious buyers from first chat to offer-ready with schedulers, automations, and personal touches.',
                            iconColorClass: 'text-blue-600',
                            steps: homeBuyerSteps,
                            expandedIds: expandedBuyerStepIds,
                            onToggleStep: toggleBuyerStep,
                            onUpdateStep: handleUpdateBuyerStep,
                            onRemoveStep: handleRemoveBuyerStep,
                            onAddStep: handleAddBuyerStep,
                            onSave: handleSaveBuyerSteps,
                            saveLabel: 'Save Buyer Journey',
                            onSendTest: handleSendTestEmail
                        })}

                        {renderFunnelPanel('listing', {
                            badgeIcon: 'campaign',
                            badgeClassName: 'bg-orange-50 text-orange-700',
                            badgeLabel: 'Seller Storytelling',
                            title: 'AI-Powered Seller Funnel',
                            description:
                                'Show clients how the concierge tells their story, tracks interest, and keeps the listing talking all week.',
                            iconColorClass: 'text-orange-600',
                            steps: listingSteps,
                            expandedIds: expandedListingStepIds,
                            onToggleStep: toggleListingStep,
                            onUpdateStep: handleUpdateListingStep,
                            onRemoveStep: handleRemoveListingStep,
                            onAddStep: handleAddListingStep,
                            onSave: handleSaveListingSteps,
                            saveLabel: 'Save Seller Funnel',
                            onSendTest: handleSendTestEmail
                        })}

                        {renderFunnelPanel('post', {
                            badgeIcon: 'mail',
                            badgeClassName: 'bg-purple-50 text-purple-700',
                            badgeLabel: 'Post-Showing',
                            title: 'After-Showing Follow-Up',
                            description: 'Spin up smart follow-ups with surveys, urgency nudges, and agent reminders in one place.',
                            iconColorClass: 'text-purple-600',
                            steps: postShowingSteps,
                            expandedIds: expandedPostStepIds,
                            onToggleStep: togglePostStep,
                            onUpdateStep: handleUpdatePostStep,
                            onRemoveStep: handleRemovePostStep,
                            onAddStep: handleAddPostStep,
                            onSave: handleSavePostSteps,
                            saveLabel: 'Save Follow-Up',
                            onSendTest: handleSendTestEmail
                        })}
                    </div>
                )}

                {activeSection === 'scoring' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
            {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} isDemoMode={isDemoMode} />}

            <SignatureEditorModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                initialSignature={customSignature || `Best regards,<br/><strong>${sampleMergeData.agent.name}</strong><br/>${sampleMergeData.agent.phone}`}
                onSave={setCustomSignature}
            />
        </div>
    );
};

export default FunnelAnalyticsPanel;
