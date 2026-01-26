import React, { useEffect, useMemo, useState } from 'react';
import { EditableStep } from '../types';
import AnalyticsPage from './AnalyticsPage';
import QuickEmailModal from './QuickEmailModal';
import SignatureEditorModal from './SignatureEditorModal';
import { EmailEditor } from './EmailEditor';
import SequenceFeedbackPanel from './SequenceFeedbackPanel';
import { funnelService } from '../services/funnelService';
import { supabase } from '../services/supabase';
import PageTipBanner from './PageTipBanner';

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



const initialWelcomeSteps: EditableStep[] = [
    {
        id: 'welcome-ai',
        title: 'Instant AI Welcome',
        description: 'Chatbot fires a warm intro email + SMS within 2 minutes.',
        icon: 'thunderstorm',
        delay: '0 min',
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Email',
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
        type: 'Text',
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
        type: 'Email',
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
        type: 'Email',
        subject: 'Market update: pace picked up',
        content: `Contracts jumped 12% this week for homes like {{lead.interestAddress}}.
If you’re still interested, I can prep numbers + offer strategy anytime.`
    }
];

const initPanelState = (isBlueprintMode: boolean = false) => {
    // If in blueprint mode or mobile, start closed
    if (isBlueprintMode || (typeof window !== 'undefined' && window.innerWidth < 768)) {
        return {
            welcome: false,
            buyer: false,
            listing: false,
            post: false
        };
    }
    // Default open for normal users
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
    isDemoMode = false,
    isBlueprintMode = false
}: FunnelAnalyticsPanelProps & { isBlueprintMode?: boolean }) => {
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
    const [panelExpanded, setPanelExpanded] = useState(() => initPanelState(isBlueprintMode));
    const [userId, setUserId] = useState<string>('');

    // Collapsible states for highlight cards (Scoring, Feedback)
    // Uses sectionExpanded to track these.
    const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({
        funnels: true, // Keep main funnels open container, but individual panels closed
        scoring: false,
        feedback: false
    });

    const toggleSection = (section: string) => {
        setSectionExpanded(prev => ({ ...prev, [section]: !prev[section] }));
    };
    const [activeSection, setActiveSection] = useState<'funnels' | 'scoring' | 'feedback'>('funnels');
    const [sendingTestId, setSendingTestId] = useState<string | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [customSignature, setCustomSignature] = useState<string>('');

    const [testPhone, setTestPhone] = useState<string>('');
    const [testEmail, setTestEmail] = useState<string>('');
    const [isTestPhoneValid, setIsTestPhoneValid] = useState(true);

    // Validate phone on change
    useEffect(() => {
        const phoneRegex = /^\+[1-9]\d{10,14}$/;
        setIsTestPhoneValid(testPhone === '' || phoneRegex.test(testPhone));
    }, [testPhone]);

    const handleSendTest = async (step: EditableStep) => {
        if (sendingTestId) return;
        setSendingTestId(step.id);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || (!user.email && !isDemoMode)) {
                alert('Could not find your email address to send the test to.');
                return;
            }

            // Handle Voice/Call Steps
            if (step.type === 'Call' || step.type === 'AI Call' || step.type === 'Voice') {
                if (!testPhone) {
                    alert('Please enter a test phone number first.');
                    return;
                }
                if (!isTestPhoneValid) {
                    alert('Please enter a valid E.164 phone number (e.g. +14155552671).');
                    return;
                }

                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
                const response = await fetch(`${apiUrl}/api/admin/voice/quick-send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.id}` // Pass ID if needed by generic middleware
                    },
                    body: JSON.stringify({
                        to: testPhone,
                        script: step.content // Send the script template
                    })
                });

                if (response.ok) {
                    alert(`Test call initiated to ${testPhone}`);
                } else {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to initiate call');
                }
                return;
            }

            // Handle Email Steps
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
                    to: testEmail || user?.email || 'test@example.com',
                    subject: `[TEST] ${subject}`,
                    html: body,
                    text: mergeTokens(step.content)
                })
            });

            if (response.ok) {
                alert(`Test email sent to ${testEmail || user?.email || 'test@example.com'}`);
            } else {
                throw new Error('Failed to send test email');
            }
        } catch (error) {
            console.error(error);
            alert(`Failed to send test: ${(error as Error).message}`);
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
                // Get the real user ID from Supabase auth
                const { data: { user } } = await supabase.auth.getUser();
                const currentUserId = user?.id || (isDemoMode ? 'demo-blueprint' : '');

                if (!currentUserId) {
                    console.warn('No user ID found, using defaults');
                    return;
                }
                setUserId(currentUserId);

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
    }, [isDemoMode]);

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

    const parseDelay = (delayStr: string): number => {
        if (!delayStr) return 0;
        const normalized = delayStr.toLowerCase().trim();
        if (normalized.includes('min')) return parseInt(normalized) || 0;
        if (normalized.includes('hour')) return (parseInt(normalized) || 0) * 60;
        if (normalized.includes('day')) return (parseInt(normalized) || 0) * 1440;
        return parseInt(normalized) || 0;
    };

    const handleSaveWelcomeSteps = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || (isDemoMode ? 'demo-blueprint' : '');

            if (!currentUserId) {
                alert('Please sign in to save funnels.');
                return;
            }

            // Prepare steps with delayMinutes
            const stepsWithMinutes = welcomeSteps.map(step => ({
                ...step,
                delayMinutes: parseDelay(step.delay)
            }));

            const result = await funnelService.saveFunnelStep(currentUserId, 'welcome', stepsWithMinutes);
            if (result.success) {
                alert('Welcome drip saved to cloud.');
            } else {
                console.error('Save failed:', result);
                alert(`Failed to save: ${JSON.stringify(result.details || result.error || 'Unknown error')}`);
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Failed to save welcome funnel', err);
            alert(`Unable to save: ${err.message}`);
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
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || (isDemoMode ? 'demo-blueprint' : '');

            if (!currentUserId) {
                alert('Please sign in to save funnels.');
                return;
            }

            const stepsWithMinutes = homeBuyerSteps.map(step => ({
                ...step,
                delayMinutes: parseDelay(step.delay)
            }));

            const result = await funnelService.saveFunnelStep(currentUserId, 'buyer', stepsWithMinutes);
            if (result.success) {
                alert('Homebuyer journey saved to cloud.');
            } else {
                console.error('Save failed:', result);
                alert(`Failed to save: ${JSON.stringify(result.details || result.error || 'Unknown error')}`);
            }
        } catch (error) {
            const err = error as Error;
            console.error('Failed to save homebuyer funnel', err);
            alert(`Unable to save: ${err.message}`);
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
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || (isDemoMode ? 'demo-blueprint' : '');

            if (!currentUserId) {
                alert('Please sign in to save funnels.');
                return;
            }

            const stepsWithMinutes = listingSteps.map(step => ({
                ...step,
                delayMinutes: parseDelay(step.delay)
            }));

            const result = await funnelService.saveFunnelStep(currentUserId, 'listing', stepsWithMinutes);
            if (result.success) {
                alert('Listing funnel saved to cloud.');
            } else {
                console.error('Save failed:', result);
                alert(`Failed to save: ${JSON.stringify(result.details || result.error || 'Unknown error')}`);
            }
        } catch (error) {
            const err = error as Error;
            console.error('Failed to save listing funnel', err);
            alert(`Unable to save: ${err.message}`);
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
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || (isDemoMode ? 'demo-blueprint' : '');

            if (!currentUserId) {
                alert('Please sign in to save funnels.');
                return;
            }

            const stepsWithMinutes = postShowingSteps.map(step => ({
                ...step,
                delayMinutes: parseDelay(step.delay)
            }));

            const result = await funnelService.saveFunnelStep(currentUserId, 'post-showing', stepsWithMinutes);
            if (result.success) {
                alert('Post-showing follow-up saved to cloud.');
            } else {
                console.error('Save failed:', result);
                alert(`Failed to save: ${JSON.stringify(result.details || result.error || 'Unknown error')}`);
            }
        } catch (error) {
            const err = error as Error;
            console.error('Failed to save post-showing funnel', err);
            alert(`Unable to save: ${err.message}`);
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
                                                            {step.type === 'Call' || step.type === 'AI Call' || step.type === 'Voice' ? (
                                                                <div className="space-y-4">
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

                                                                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Voice Script Preview</label>
                                                                            <p className="text-sm text-slate-700 font-medium italic">"{step.content || "Standard admission script..."}"</p>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => onSendTest(step)}
                                                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-50 transition-colors"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">call</span>
                                                                            Send Test Call
                                                                        </button>
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

                <div className="space-y-8">
                    <div className="mb-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
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

                    {/* Highlight Cards - Now Collapsible Sections */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* AI Funnels Section */}
                        <div id="section-funnels" className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                                        <span className="material-symbols-outlined">insights</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">AI Funnels</h2>
                                        <p className="text-sm text-slate-500">Manage your automated conversion paths.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleSection('funnels')}
                                    className={`p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-transform duration-200 ${sectionExpanded['funnels'] ? 'rotate-180' : ''}`}
                                >
                                    <span className="material-symbols-outlined">expand_more</span>
                                </button>
                            </div>

                            {sectionExpanded['funnels'] && (
                                <div className="space-y-8">
                                    {/* Funnel Panels */}
                                    {renderFunnelPanel('welcome', {
                                        badgeIcon: 'thunderstorm',
                                        badgeClassName: 'bg-teal-50 text-teal-700',
                                        badgeLabel: 'New Lead Welcome',
                                        title: 'Instant AI Welcome',
                                        description: 'Chatbot fires a warm intro email + SMS within 2 minutes.',
                                        iconColorClass: 'text-teal-600',
                                        steps: welcomeSteps,
                                        expandedIds: expandedStepIds,
                                        onToggleStep: toggleStep,
                                        onUpdateStep: handleUpdateStep,
                                        onRemoveStep: handleRemoveWelcomeStep,
                                        onAddStep: handleAddWelcomeStep,
                                        onSave: handleSaveWelcomeSteps,
                                        saveLabel: 'Save Welcome Sequence',
                                        onSendTest: handleSendTest
                                    })}

                                    {renderFunnelPanel('buyer', {
                                        badgeIcon: 'bolt',
                                        badgeClassName: 'bg-indigo-50 text-indigo-700',
                                        badgeLabel: 'Buyer Nurture',
                                        title: 'Buyer Journey',
                                        description: 'Automated check-ins to qualify buyers and book tours.',
                                        iconColorClass: 'text-indigo-600',
                                        steps: homeBuyerSteps,
                                        expandedIds: expandedBuyerStepIds,
                                        onToggleStep: toggleBuyerStep,
                                        onUpdateStep: handleUpdateBuyerStep,
                                        onRemoveStep: handleRemoveBuyerStep,
                                        onAddStep: handleAddBuyerStep,
                                        onSave: handleSaveBuyerSteps,
                                        saveLabel: 'Save Buyer Journey',
                                        onSendTest: handleSendTest
                                    })}

                                    {renderFunnelPanel('listing', {
                                        badgeIcon: 'auto_fix_high',
                                        badgeClassName: 'bg-purple-50 text-purple-700',
                                        badgeLabel: 'Seller Nurture',
                                        title: 'Listing Prep & Story',
                                        description: 'Guide sellers through the "Home Story" process.',
                                        iconColorClass: 'text-purple-600',
                                        steps: listingSteps,
                                        expandedIds: expandedListingStepIds,
                                        onToggleStep: toggleListingStep,
                                        onUpdateStep: handleUpdateListingStep,
                                        onRemoveStep: handleRemoveListingStep,
                                        onAddStep: handleAddListingStep,
                                        onSave: handleSaveListingSteps,
                                        saveLabel: 'Save Seller Flow',
                                        onSendTest: handleSendTest
                                    })}

                                    {renderFunnelPanel('post', {
                                        badgeIcon: 'mail',
                                        badgeClassName: 'bg-amber-50 text-amber-700',
                                        badgeLabel: 'Showing Follow-Up',
                                        title: 'Post-Showing Feedback',
                                        description: 'Auto-chase buyers for feedback after a tour.',
                                        iconColorClass: 'text-amber-600',
                                        steps: postShowingSteps,
                                        expandedIds: expandedPostStepIds,
                                        onToggleStep: togglePostStep,
                                        onUpdateStep: handleUpdatePostStep,
                                        onRemoveStep: handleRemovePostStep,
                                        onAddStep: handleAddPostStep,
                                        onSave: handleSavePostSteps,
                                        saveLabel: 'Save Follow-Up',
                                        onSendTest: handleSendTest
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Lead Scoring Section */}
                        <div id="section-scoring" className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div
                                className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => toggleSection('scoring')}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <span className="material-symbols-outlined text-2xl">workspace_premium</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Lead Scoring Engine</h2>
                                        <p className="text-sm text-slate-500">Rules & tiers for qualifying prospects</p>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 ${sectionExpanded['scoring'] ? 'rotate-180' : ''}`}>
                                    <span className="material-symbols-outlined">expand_more</span>
                                </div>
                            </div>

                            {sectionExpanded['scoring'] && (
                                <div className="border-t border-slate-200">
                                    <AnalyticsPage variant="embedded" />
                                </div>
                            )}
                        </div>

                        {/* Sequence Feedback Section */}
                        <div id="section-feedback" className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div
                                className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => toggleSection('feedback')}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <span className="material-symbols-outlined text-2xl">auto_fix_high</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Sequence Feedback</h2>
                                        <p className="text-sm text-slate-500">Automation performance & reply rates</p>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 ${sectionExpanded['feedback'] ? 'rotate-180' : ''}`}>
                                    <span className="material-symbols-outlined">expand_more</span>
                                </div>
                            </div>

                            {sectionExpanded['feedback'] && (
                                <div className="p-6 border-t border-slate-200">
                                    <SequenceFeedbackPanel isDemoMode={isDemoMode} userId={userId} isBlueprintMode={isBlueprintMode} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} isDemoMode={isDemoMode} />}

                <SignatureEditorModal
                    isOpen={isSignatureModalOpen}
                    onClose={() => setIsSignatureModalOpen(false)}
                    initialSignature={customSignature || `Best regards,<br/><strong>${sampleMergeData.agent.name}</strong><br/>${sampleMergeData.agent.phone}`}
                    onSave={setCustomSignature}
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
            </div>
        </div>
    );
};

export default FunnelAnalyticsPanel;
