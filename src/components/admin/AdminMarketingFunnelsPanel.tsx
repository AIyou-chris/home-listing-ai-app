import React, { useEffect, useMemo, useState } from 'react';
import { EditableStep } from '../../types';
import AnalyticsPage from '../AnalyticsPage';
import QuickEmailModal from '../QuickEmailModal';
import SignatureEditorModal from '../SignatureEditorModal';
import { EmailEditor } from '../EmailEditor';
import SequenceFeedbackPanel from '../SequenceFeedbackPanel';
import { funnelService } from '../../services/funnelService';
import { supabase } from '../../services/supabase';
import PageTipBanner from '../PageTipBanner';
import { LeadUploadModal } from '../../components/LeadUploadModal';
import { LeadStatus } from '../../types';
import { leadsService } from '../../services/leadsService';
import { Toast, ToastType } from '../Toast';

interface FunnelAnalyticsPanelProps {
    onBackToDashboard?: () => void;
    variant?: 'page' | 'embedded';
    title?: string;
    subtitle?: string;
    hideBackButton?: boolean;
    isDemoMode?: boolean;
}

const CALL_BOT_OPTIONS = [
    {
        id: 'admin_follow_up',
        name: 'Admin Follow-Up Bot',
        description: 'Uses your prebuilt Hume follow-up configuration.',
        configId: 'd1d4d371-00dd-4ef9-8ab5-36878641b349'
    }
] as const;

const DEFAULT_CALL_BOT_ID = CALL_BOT_OPTIONS[0].id;

const isCallStepType = (type: string) => ['call', 'ai call', 'ai-call', 'voice'].includes((type || '').toLowerCase());

const resolveCallBotId = (value?: string) => {
    const normalized = (value || '').trim();
    return CALL_BOT_OPTIONS.some((bot) => bot.id === normalized) ? normalized : DEFAULT_CALL_BOT_ID;
};

const normalizeCallStep = (step: EditableStep): EditableStep => {
    if (!isCallStepType(step.type)) return step;
    return { ...step, content: resolveCallBotId(step.content) };
};

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



// const initialWelcomeSteps: EditableStep[] = [
//     {
//         id: 'welcome-ai',
//         title: 'Instant AI Welcome',
//         description: 'Chatbot fires a warm intro email + SMS within 2 minutes.',
//         icon: 'thunderstorm',
//         delay: '0 min',
//         type: 'Email',
//         subject: 'Welcome aboard, {{lead.name}}!',
//         content: `Hi {{lead.name}},
//
// Great to meet you! I built a quick concierge just for you — it highlights {{lead.interestAddress || "the homes we're short‑listing"}} and answers questions 24/7.
//
// Take a peek here: {{agent.aiCardUrl || agent.website}}
//
// Talk soon,
// {{agent.name}} · {{agent.phone}}`
//     },
//     {
//         id: 'welcome-checkin',
//         title: 'Day 1 Check-In',
//         description: 'Bot shares quick resources and asks for timeline + budget so you can prioritize.',
//         icon: 'draft',
//         delay: '+24 hrs',
//         type: 'Email',
//         subject: 'Quick check-in + next steps',
//         content: `Hi {{lead.name}},
//
// Want me to line up tours for {{lead.interestAddress || 'any favorite homes'}}?
//
// Drop me your target move-in date + ideal payment range and I’ll tailor alerts that match perfectly.`
//     },
//     {
//         id: 'welcome-task',
//         title: 'Agent Task',
//         description: 'Reminder for a human touch — call/text with next steps.',
//         icon: 'call',
//         delay: '+48 hrs',
//         type: 'Task',
//         subject: 'Agent task',
//         content: `Task: Call {{lead.name}} about {{lead.interestAddress || 'their top picks'}}.
//
// Goal: confirm financing path + invite to a live strategy session.`
//     }
// ];

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

// const initialListingSteps: EditableStep[] = [
//     {
//         id: 'listing-intake',
//         title: 'AI Story Intake',
//         description: 'Seller completes a quick form; AI turns the notes into a lifestyle narrative.',
//         icon: 'stylus',
//         delay: '0 min',
//         type: 'Email',
//         subject: 'Let’s make your home talk',
//         content: `Thanks for the details on {{lead.interestAddress || 'your property'}}.
// I’m feeding them into our AI storyteller so buyers feel the lifestyle on the first touch.`
//     },
//     {
//         id: 'listing-draft',
//         title: 'Interactive Listing Draft',
//         description: 'System builds the AI-powered property page with concierge + talking points.',
//         icon: 'dynamic_feed',
//         delay: '+30 min',
//         type: 'Email',
//         subject: 'Preview your interactive listing',
//         content: `Here’s the first pass of your AI listing experience:
// {{agent.website}}/listing-preview
//
// The concierge already knows how to answer buyer questions 24/7.`
//     },
//     {
//         id: 'listing-voice',
//         title: 'Home Speaks Preview',
//         description: 'Share a preview link so sellers hear how the home “talks” to buyers.',
//         icon: 'record_voice_over',
//         delay: '+2 hrs',
//         type: 'Email',
//         subject: 'Hear your home talk to buyers',
//         content: `Play this preview — our AI concierge walks buyers through every highlight:
// {{agent.aiCardUrl}}/listing-preview
//
// Send me any details you want it to emphasize.`
//     },
//     {
//         id: 'listing-launch',
//         title: 'Launch Boost',
//         description: 'Kick off marketing: QR codes, reels, email nurtures referencing the story.',
//         icon: 'rocket_launch',
//         delay: '+1 day',
//         type: 'Email',
//         subject: 'Launch plan locked',
//         content: `We’re launching with:
// - Interactive listing + AI concierge
// - QR codes for signage
// - Social reels + nurture emails
//
// Go-live date: {{lead.timeline || 'this Friday'}}.`
//     },
//     {
//         id: 'listing-feedback',
//         title: 'Feedback Loop',
//         description: 'AI summarizes buyer questions from the concierge for fine-tuning.',
//         icon: 'insights',
//         delay: '+3 days',
//         type: 'Email',
//         subject: 'Buyer feedback recap',
//         content: `AI pulled the top buyer questions so far:
// - {{lead.questionOne || 'Do utilities include solar credits?'}}
// - {{lead.questionTwo || 'Can we convert the loft?'}}
//
// Let’s adjust staging/pricing based on this intel.`
//     }
// ];

// const initialPostShowingSteps: EditableStep[] = [
//     {
//         id: 'post-thanks',
//         title: 'Immediate Thanks',
//         description: 'AI concierge sends a recap minutes after the showing with highlights and next steps.',
//         icon: 'handshake',
//         delay: '0 min',
//         type: 'Email',
//         subject: 'Thanks for touring {{lead.interestAddress}}',
//         content: `Hi {{lead.name}},
//
// Loved walking you through {{lead.interestAddress}}. Here’s a quick recap + next steps.
//
// Want a second look or details on similar homes? I’m on standby.`
//     },
//     {
//         id: 'post-feedback',
//         title: 'Feedback Pulse',
//         description: 'Ask the buyer to rate interest level and capture objections via chatbot survey.',
//         icon: 'rate_review',
//         delay: '+2 hrs',
//         type: 'Text',
//         subject: 'Mind sharing quick feedback?',
//         content: `Drop a 30-second response so I can tailor our next steps:
// {{agent.aiCardUrl}}/feedback`
//     },
//     {
//         id: 'post-agent-touch',
//         title: 'Agent Touch',
//         description: 'Schedule a personal text or call reminder so the agent can address objections.',
//         icon: 'sms',
//         delay: '+1 day',
//         type: 'Task',
//         subject: 'Agent task',
//         content: `Task: Text {{lead.name}} to address objections + offer alternates.
// Include quick notes from the showing.`
//     },
//     {
//         id: 'post-comps',
//         title: 'Comparables Drop',
//         description: 'Share two similar homes with smart commentary to keep the buyer engaged with you.',
//         icon: 'real_estate_agent',
//         delay: '+2 days',
//         type: 'Email',
//         subject: 'Two smart alternates to compare',
//         content: `Based on what you loved, here are two matches:
// 1. {{lead.matchOne || 'Maple Modern – turnkey + office nook'}}
// 2. {{lead.matchTwo || 'Canyon Ridge – same vibe, bigger yard'}}
//
// Want me to unlock either?`
//     },
//     {
//         id: 'post-nudge',
//         title: 'Offer Nudge',
//         description: 'AI watches market activity and sends a gentle urgency nudge if interest remains high.',
//         icon: 'notifications_active',
//         delay: '+4 days',
//         type: 'Email',
//         subject: 'Market update: pace picked up',
//         content: `Contracts jumped 12% this week for homes like {{lead.interestAddress}}.
// If you’re still interested, I can prep numbers + offer strategy anytime.`
//     }
// ];

// const initPanelState = (isBlueprintMode: boolean = false) => {
//     // If in blueprint mode or mobile, start closed
//     if (isBlueprintMode || (typeof window !== 'undefined' && window.innerWidth < 768)) {
//         return {
//             welcome: false,
//             buyer: false,
//             listing: false,
//             post: false
//         };
//     }
//     // Default open for normal users
//     return {
//         welcome: true,
//         buyer: true,
//         listing: true,
//         post: true
//     };
// };

const AdminMarketingFunnelsPanel: React.FC<FunnelAnalyticsPanelProps> = ({
    onBackToDashboard,
    variant = 'page',
    title = 'Agent Outreach Funnel',
    subtitle = 'Automated sequence for your uploaded leads',
    hideBackButton = false,
    isDemoMode = false,

    isBlueprintMode = false
}: FunnelAnalyticsPanelProps & { isBlueprintMode?: boolean }) => {
    const isEmbedded = variant === 'embedded';
    // Single Main Funnel State (formerly Buyer)
    const [funnelSteps, setFunnelSteps] = useState<EditableStep[]>([]);
    const [availableFunnels, setAvailableFunnels] = useState<Record<string, EditableStep[]>>({});
    const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // UI States
    const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);
    const [expandedStepIds, setExpandedStepIds] = useState<string[]>([]);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [panelExpanded, setPanelExpanded] = useState(true);
    const [userId, setUserId] = useState<string>('');

    // Removed individual toggleSection logic in favor of simplified view
    const [activeSection, setActiveSection] = useState<'funnels' | 'scoring' | 'feedback'>('funnels');

    // Collapsible state for analytics view sections
    const [analyticsExpanded, setAnalyticsExpanded] = useState({ scoring: true, feedback: true });

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
                const callBotId = resolveCallBotId(step.content);
                const callBot = CALL_BOT_OPTIONS.find((bot) => bot.id === callBotId);
                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

                // Call Hume Outbound Endpoint
                const response = await fetch(`${apiUrl}/api/voice/hume/outbound-call`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: testPhone,
                        botType: callBotId,
                        assistantKey: callBotId,
                        humeConfigId: callBot?.configId
                    })
                });

                if (response.ok) {
                    alert(`Test call initiated to ${testPhone} via Hume AI!`);
                } else {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to initiate call');
                }
                return;
            }

            // Handle Email Steps
            const subject = mergeTokens(step.subject);
            // Replace newlines with <br/> for HTML email body
            let body = mergeTokens(step.content).replace(/\n/g, '<br/>');

            // Inject Unsubscribe Preview if enabled
            if (step.includeUnsubscribe !== false) {
                body += `<br/><br/><div style="font-size:11px;color:#888;margin-top:20px;border-top:1px solid #eee;padding-top:10px;">To stop receiving these emails, <a href="#" style="color:#888;">unsubscribe here</a> (Link active in live emails).</div>`;
            }

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
                // UPDATE: Show inline "Sent!" badge instead of alert
                setSendSuccessIds(prev => [...prev, step.id]);
                setTimeout(() => {
                    setSendSuccessIds(prev => prev.filter(id => id !== step.id));
                }, 3000);
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

                // User Request: "Only want a realtor funnel and a broker funnel that's it"
                const allowedFunnels = ['realtor_funnel', 'broker_funnel'];
                const filteredFunnels = Object.fromEntries(
                    Object.entries(funnels).filter(([key]) => allowedFunnels.includes(key))
                );
                const normalizedFunnels = Object.fromEntries(
                    Object.entries(filteredFunnels).map(([key, steps]) => [
                        key,
                        (steps || []).map(normalizeCallStep)
                    ])
                );

                setAvailableFunnels(normalizedFunnels);

                // Priority: Selected -> Realtor -> Broker -> Universal -> First
                if (normalizedFunnels[selectedFunnelId]) {
                    setFunnelSteps(normalizedFunnels[selectedFunnelId]);
                } else if (normalizedFunnels['realtor_funnel']) {
                    setSelectedFunnelId('realtor_funnel');
                    setFunnelSteps(normalizedFunnels['realtor_funnel']);
                } else if (normalizedFunnels['broker_funnel']) {
                    setSelectedFunnelId('broker_funnel');
                    setFunnelSteps(normalizedFunnels['broker_funnel']);
                } else if (normalizedFunnels.universal_sales) {
                    setSelectedFunnelId('universal_sales');
                    setFunnelSteps(normalizedFunnels.universal_sales);
                } else {
                    const keys = Object.keys(normalizedFunnels);
                    if (keys.length > 0) {
                        setSelectedFunnelId(keys[0]);
                        setFunnelSteps(normalizedFunnels[keys[0]]);
                    }
                }
            } catch (error) {
                console.error('Failed to load funnels:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadFunnels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDemoMode]);

    // Update steps when selection changes
    useEffect(() => {
        if (availableFunnels[selectedFunnelId]) {
            setFunnelSteps(availableFunnels[selectedFunnelId]);
        } else if (selectedFunnelId === 'universal_sales' && !availableFunnels['universal_sales']) {
            // Fallback if universal_sales is selected but not yet in availableFunnels (e.g. init)
            setFunnelSteps(initialHomeBuyerSteps);
        }
    }, [selectedFunnelId, availableFunnels]);

    const togglePanel = () => setPanelExpanded(prev => !prev);

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
        setFunnelSteps((prev) =>
            prev.map((step) => {
                if (step.id !== id) return step;
                const updated = { ...step, [field]: value };

                // Auto-update icon based on type for better UX
                if (field === 'type') {
                    switch (value) {
                        case 'Condition': updated.icon = 'alt_route'; break;
                        case 'Wait': updated.icon = 'hourglass_empty'; break;
                        case 'Call':
                        case 'AI Call': updated.icon = 'call'; break;
                        case 'SMS':
                        case 'Text': updated.icon = 'sms'; break;
                        case 'Task': updated.icon = 'assignment_turned_in'; break;
                        default: updated.icon = 'forward_to_inbox';
                    }
                    if (isCallStepType(value)) {
                        updated.content = resolveCallBotId(step.content);
                    }
                }
                return updated;
            })
        );
    };

    const handleAddStep = () => {
        const newStep: EditableStep = {
            id: `step-${Date.now()}`,
            title: 'New Step',
            description: 'Describe what this touchpoint does.',
            icon: 'forward_to_inbox',
            delay: '+1 day',
            type: 'Custom',
            subject: 'Subject line',
            content: 'Write the message here. Use variables like {{lead.name}} and {{agent.name}}.'
        };
        setFunnelSteps((prev) => [...prev, newStep]);
    };

    const handleRemoveStep = (id: string) => {
        setFunnelSteps((prev) => prev.filter((step) => step.id !== id));
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

    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [sendSuccessIds, setSendSuccessIds] = useState<string[]>([]);

    useEffect(() => {
        if (saveStatus === 'success') {
            const timer = setTimeout(() => {
                setSaveStatus('idle');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    const handleSaveSteps = async () => {
        setSaveStatus('saving');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || (isDemoMode ? 'demo-blueprint' : '');

            if (!currentUserId) {
                setToast({ message: 'Please sign in to save funnels.', type: 'error' });
                setSaveStatus('idle');
                return;
            }

            // Prepare steps with delayMinutes
            const stepsWithMinutes = funnelSteps.map(step => ({
                ...step,
                delayMinutes: parseDelay(step.delay)
            }));

            // Saving to selectedFunnelId key
            const result = await funnelService.saveFunnelStep(currentUserId, selectedFunnelId, stepsWithMinutes);
            if (result) {
                setSaveStatus('success');
                // Update local availableFunnels state
                setAvailableFunnels(prev => ({
                    ...prev,
                    [selectedFunnelId]: stepsWithMinutes
                }));
            } else {
                console.error('Save failed');
                setToast({ message: 'Failed to save: Unknown error', type: 'error' });
                setSaveStatus('error');
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Failed to save funnel', err);
            setToast({ message: `Unable to save: ${err.message}`, type: 'error' });
            setSaveStatus('error');
        }
    };

    const handleUploadLeads = async (leads: Array<{ name: string; email: string; phone: string; status: LeadStatus }>) => {
        try {
            console.log('🚀 Initiating Real Lead Import:', leads.length);

            setToast({ message: 'Importing leads...', type: 'info' });

            const result = await leadsService.bulkImport(
                leads,
                {
                    assignee: userId || 'unknown',
                    tag: 'Agent Outreach Import',
                    funnel: 'universal_sales'
                }
            );

            console.log('✅ Import Result:', result);

            if (result.failed > 0) {
                // Show warning if some or all failed
                if (result.imported === 0) {
                    setToast({ message: `Import Failed. ${result.failed} leads were rejected by the database. Check console for details.`, type: 'error' });
                } else {
                    setToast({ message: `Partial Success: ${result.imported} imported, ${result.failed} failed.`, type: 'info' });
                }
            } else {
                setToast({ message: `Successfully imported ${result.imported} leads!`, type: 'success' });
            }

            setIsUploadModalOpen(false);

            // Note: Since this panel doesn't display the lead list directly, 
            // no immediate UI refresh is needed here.
        } catch (error) {
            console.error('❌ Lead Import Failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setToast({ message: `Import failed: ${errorMessage}`, type: 'error' });
        }
    };



    const renderFunnelPanel = (
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
        const isOpen = panelExpanded;

        if (isLoading) {
            return (
                <section key="marketing-funnel-panel" className="bg-white border-y border-slate-200 md:border md:rounded-2xl shadow-sm p-6 space-y-6 min-h-[400px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-500 font-medium">Loading funnel steps...</p>
                    </div>
                </section>
            );
        }

        return (
            <section key="marketing-funnel-panel" className="bg-white border-y border-slate-200 md:border md:rounded-2xl shadow-sm p-6 space-y-6">
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
                            onClick={togglePanel}
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
                                        key={`token-${token}`}
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
                                                            {/* Live Metrics Grid */}
                                                            <div className="grid grid-cols-4 gap-4 mb-6">
                                                                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sent</div>
                                                                    <div className="text-xl font-bold text-slate-700">{step.sent || 0}</div>
                                                                </div>
                                                                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Opened</div>
                                                                    <div className="text-xl font-bold text-indigo-600">{step.opened || 0}</div>
                                                                </div>
                                                                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clicked</div>
                                                                    <div className="text-xl font-bold text-emerald-600">{step.clicked || 0}</div>
                                                                </div>
                                                                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Replied</div>
                                                                    <div className="text-xl font-bold text-blue-600">{step.replied || 0}</div>
                                                                </div>
                                                            </div>

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
                                                                    <select
                                                                        className="w-full bg-transparent text-sm font-bold text-indigo-600 focus:outline-none cursor-pointer"
                                                                        value={step.type}
                                                                        onChange={(e) => onUpdateStep(step.id, 'type', e.target.value)}
                                                                    >
                                                                        <option value="Email">Email</option>
                                                                        <option value="Call">AI Call</option>
                                                                        <option value="Task">Task</option>
                                                                        <option value="SMS">SMS</option>
                                                                        <option value="Condition">Condition (If/Then)</option>
                                                                        <option value="Wait">Wait</option>
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
                                                                                This call step uses a prebuilt Hume assistant. Script editing is disabled here to keep behavior stable.
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-4">
                                                                        <div>
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                                                                    Assistant Profile
                                                                                </label>
                                                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                                                                    Hume Managed
                                                                                </span>
                                                                            </div>
                                                                            <select
                                                                                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                                                value={resolveCallBotId(step.content)}
                                                                                onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
                                                                            >
                                                                                {CALL_BOT_OPTIONS.map((bot) => (
                                                                                    <option key={bot.id} value={bot.id}>
                                                                                        {bot.name}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                            <div className="flex justify-between items-start mt-1.5">
                                                                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                                    <span className="material-symbols-outlined text-[10px]">info</span>
                                                                                    Edit the prompt/script in Hume Config, not in this funnel step.
                                                                                </p>
                                                                                <span className="text-[10px] text-slate-400">
                                                                                    {CALL_BOT_OPTIONS.find((bot) => bot.id === resolveCallBotId(step.content))?.configId}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                                                            <div className="text-xs text-slate-500 font-medium">
                                                                                <span className="font-bold text-slate-700">Test Number:</span> {testPhone || 'Not set'}
                                                                            </div>
                                                                            <button
                                                                                onClick={() => onSendTest(step)}
                                                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 border border-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95"
                                                                            >
                                                                                <span className="material-symbols-outlined text-sm">record_voice_over</span>
                                                                                Test AI Call
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (step.type === 'Text' || step.type === 'sms' || step.type === 'SMS') ? (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                                    {/* Left: Editor */}
                                                                    <div className="space-y-4">
                                                                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="material-symbols-outlined text-slate-500">sms</span>
                                                                                <h4 className="text-sm font-bold text-slate-700">Message Content</h4>
                                                                            </div>

                                                                            <textarea
                                                                                className="w-full h-32 rounded-lg border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm resize-none"
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

                                                                            <div className="mb-4">
                                                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Preview Text (Preheader)</label>
                                                                                <input
                                                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                                    value={step.previewText || ''}
                                                                                    onChange={(e) => onUpdateStep(step.id, 'previewText', e.target.value)}
                                                                                    placeholder="Short summary displayed in inbox list view..."
                                                                                />
                                                                            </div>

                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <label className="block text-xs font-semibold text-slate-500">Email Body</label>
                                                                                {/* Compliance Toggle */}
                                                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="hidden"
                                                                                        checked={step.includeUnsubscribe !== false}
                                                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                                        onChange={(e) => onUpdateStep(step.id, 'includeUnsubscribe', e.target.checked as any)}
                                                                                    />
                                                                                    <div className={`w-8 h-4 rounded-full transition-colors relative ${step.includeUnsubscribe !== false ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                                                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${step.includeUnsubscribe !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                                    </div>
                                                                                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                                                        Include Unsubscribe
                                                                                    </span>
                                                                                </label>
                                                                            </div>

                                                                            <textarea
                                                                                className="w-full h-64 rounded-lg border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm resize-none"
                                                                                placeholder="Write your email here..."
                                                                                value={step.content}
                                                                                onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
                                                                            />
                                                                            <div className="flex justify-between items-center mt-1">
                                                                                <span className="text-[10px] text-slate-400">
                                                                                    {step.content?.length || 0} characters
                                                                                </span>
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
                                                            ) : step.type === 'Condition' ? (
                                                                <div className="space-y-4">
                                                                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-5">
                                                                        <div className="flex items-center gap-2 mb-4">
                                                                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                                                                <span className="material-symbols-outlined">alt_route</span>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-sm font-bold text-amber-900">Logic Condition</h4>
                                                                                <p className="text-xs text-amber-700/80">Branch the funnel based on lead behavior.</p>
                                                                            </div>
                                                                        </div>

                                                                        <label className="block text-xs font-semibold text-amber-800 mb-1">
                                                                            If this happens...
                                                                        </label>
                                                                        <select
                                                                            className="w-full text-sm font-bold text-slate-900 border-amber-200 rounded-lg p-2.5 focus:border-amber-500 bg-white mb-3"
                                                                            value={step.conditionRule || 'opened_email'}
                                                                            onChange={(e) => onUpdateStep(step.id, 'conditionRule', e.target.value)}
                                                                        >
                                                                            <option value="opened_email">Opened Previous Email</option>
                                                                            <option value="clicked_link">Clicked Link</option>
                                                                            <option value="replied">Replied to Email</option>
                                                                            <option value="no_reply">Did Not Reply</option>
                                                                            <option value="tag_added">Tag Added</option>
                                                                        </select>

                                                                        <label className="block text-xs font-semibold text-amber-800 mb-1">
                                                                            Value / Details (Optional)
                                                                        </label>
                                                                        <input
                                                                            className="w-full text-sm text-slate-900 border-amber-200 rounded-lg p-2.5 focus:border-amber-500 bg-white mb-3"
                                                                            placeholder="e.g. specific tag or link..."
                                                                            value={step.conditionValue || ''}
                                                                            onChange={(e) => onUpdateStep(step.id, 'conditionValue', e.target.value)}
                                                                        />

                                                                        <div className="mt-2 p-3 bg-white/50 rounded-lg border border-amber-100 text-xs text-amber-700 italic">
                                                                            Note: Advanced branching logic is maintained by the AI. This step acts as a marker for the decision point.
                                                                        </div>

                                                                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-amber-200/50">
                                                                            <button
                                                                                onClick={onSave}
                                                                                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-amber-700"
                                                                            >
                                                                                Save Changes
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : step.type === 'Wait' ? (
                                                                <div className="space-y-4">
                                                                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
                                                                        <div className="flex items-center gap-2 mb-4">
                                                                            <div className="p-2 bg-slate-200 text-slate-600 rounded-lg">
                                                                                <span className="material-symbols-outlined">hourglass_empty</span>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-sm font-bold text-slate-900">Wait Step</h4>
                                                                                <p className="text-xs text-slate-500">Pause the sequence for a specific time.</p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="p-4 bg-white rounded-lg border border-slate-200 text-sm text-slate-600">
                                                                            Please use the <strong>Timing</strong> dropdown at the top of this card to set the wait duration.
                                                                        </div>

                                                                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                                                                            <button
                                                                                onClick={onSave}
                                                                                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md hover:bg-slate-900"
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

                                                                        <label className="block text-xs font-semibold text-violet-800/90 mb-1">
                                                                            Preview Text <span className="text-violet-400 font-normal">(Preheader)</span>
                                                                        </label>
                                                                        <input
                                                                            className="w-full text-sm text-slate-700 placeholder:text-slate-300 border border-violet-200 rounded-lg p-2.5 focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white shadow-sm mb-4"
                                                                            placeholder="Short summary shown in inbox list view..."
                                                                            value={step.previewText || ''}
                                                                            onChange={(e) => onUpdateStep(step.id, 'previewText', e.target.value)}
                                                                        />

                                                                        <div className="relative">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <label className="text-xs font-semibold text-violet-800/90">Message Body</label>
                                                                                <div className="flex items-center gap-4">
                                                                                    {/* Compliance Toggle */}
                                                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="hidden"
                                                                                            checked={step.includeUnsubscribe !== false}
                                                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                                            onChange={(e) => onUpdateStep(step.id, 'includeUnsubscribe', (e.target.checked as any))}
                                                                                        />
                                                                                        <div className={`w-8 h-4 rounded-full transition-colors relative ${step.includeUnsubscribe !== false ? 'bg-violet-600' : 'bg-slate-300'}`}>
                                                                                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${step.includeUnsubscribe !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                                        </div>
                                                                                        <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-violet-600 transition-colors">
                                                                                            Unsubscribe Footer
                                                                                        </span>
                                                                                    </label>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-bold shadow-sm hover:shadow-md transition-all hover:scale-105"
                                                                                    >
                                                                                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                                                                        AI Magic
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                            <div className="relative border border-violet-200 rounded-lg overflow-hidden shadow-sm bg-white">
                                                                                {saveStatus === 'success' && (
                                                                                    <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                                                                                        <div className="flex flex-col items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl transform scale-100 animate-in zoom-in-50 duration-300">
                                                                                            <span className="material-symbols-outlined text-3xl">check_circle</span>
                                                                                            <span className="font-bold text-lg">Saved!</span>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                                <EmailEditor
                                                                                    value={step.content}
                                                                                    onChange={(val) => onUpdateStep(step.id, 'content', val)}
                                                                                    placeholder="Type your message..."
                                                                                    className="min-h-[300px]"
                                                                                />
                                                                            </div>
                                                                            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-violet-200/50">
                                                                                {sendSuccessIds.includes(step.id) ? (
                                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold animate-in zoom-in spin-in-3 duration-300">
                                                                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                                                        Sent!
                                                                                    </span>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => onSendTest(step)}
                                                                                        disabled={sendingTestId === step.id}
                                                                                        className="px-3 py-1.5 bg-white border border-violet-200 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 shadow-sm disabled:opacity-50"
                                                                                    >
                                                                                        {sendingTestId === step.id ? 'Sending...' : 'Send Test'}
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={onSave}
                                                                                    disabled={saveStatus === 'saving' || saveStatus === 'success'}
                                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all duration-200 ${saveStatus === 'success'
                                                                                        ? 'bg-emerald-500 text-white scale-105'
                                                                                        : saveStatus === 'saving'
                                                                                            ? 'bg-violet-400 cursor-not-allowed'
                                                                                            : 'bg-violet-600 hover:bg-violet-700 text-white'
                                                                                        }`}
                                                                                >
                                                                                    {saveStatus === 'saving' ? (
                                                                                        <span className="flex items-center gap-1">
                                                                                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                                            Saving...
                                                                                        </span>
                                                                                    ) : saveStatus === 'success' ? (
                                                                                        <span className="flex items-center gap-1">
                                                                                            <span className="material-symbols-outlined text-[14px]">check</span>
                                                                                            Saved!
                                                                                        </span>
                                                                                    ) : 'Save Changes'}
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
                                    disabled={saveStatus === 'saving' || saveStatus === 'success'}
                                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 ${saveStatus === 'success'
                                        ? 'bg-emerald-500 scale-105'
                                        : saveStatus === 'saving'
                                            ? 'bg-primary-400 cursor-not-allowed'
                                            : 'bg-primary-600 hover:bg-primary-700'
                                        }`}
                                >
                                    {saveStatus === 'saving' ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : saveStatus === 'success' ? (
                                        <>
                                            <span className="material-symbols-outlined text-base">check_circle</span>
                                            Saved Successfully
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-base">save</span>
                                            {saveLabel}
                                        </>
                                    )}
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                            {Object.keys(availableFunnels).length > 0 && (
                                <div className="relative">
                                    <select
                                        value={selectedFunnelId}
                                        onChange={(e) => setSelectedFunnelId(e.target.value)}
                                        className="appearance-none bg-white border border-slate-300 text-slate-700 font-semibold py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer text-sm"
                                    >
                                        {/* Cleanup: Only showing Realtor/Broker funnels as requested */}
                                        {Object.keys(availableFunnels)
                                            .map(key => (
                                                <option key={key} value={key}>
                                                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                                </option>
                                            ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                        <span className="material-symbols-outlined text-xl">expand_more</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 sm:text-base">
                            {subtitle}
                        </p>
                    </div>
                    {activeSection === 'funnels' && !isAnalyticsOpen && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setIsUploadModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                            >
                                <span className="material-symbols-outlined text-base">upload_file</span>
                                Import Leads
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsQuickEmailOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                                <span className="material-symbols-outlined text-base">outgoing_mail</span>
                                Email Library
                            </button>
                            <button
                                onClick={() => setIsAnalyticsOpen(true)}
                                className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-100 shadow-sm transition-colors"
                            >
                                <span className="material-symbols-outlined">analytics</span>
                                View Scoring & Analytics
                            </button>
                        </div>
                    )}

                    {isAnalyticsOpen && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setIsAnalyticsOpen(false)}
                                className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                                Back to Funnel
                            </button>
                        </div>
                    )}
                </header>

                {isAnalyticsOpen ? (
                    <div className="space-y-8 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Analytics View */}
                        <div className="grid grid-cols-1 gap-8">
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition-all duration-300">
                                <div
                                    className="flex items-center justify-between cursor-pointer select-none mb-4"
                                    onClick={() => setAnalyticsExpanded(prev => ({ ...prev, scoring: !prev.scoring }))}
                                >
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                        <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <span className="material-symbols-outlined">workspace_premium</span>
                                        </span>
                                        Lead Scoring Engine
                                    </h2>
                                    <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                        <span className="material-symbols-outlined">
                                            {analyticsExpanded.scoring ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </button>
                                </div>
                                {analyticsExpanded.scoring && (
                                    <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                                        <AnalyticsPage scope="global" />
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition-all duration-300">
                                <div
                                    className="flex items-center justify-between cursor-pointer select-none mb-4"
                                    onClick={() => setAnalyticsExpanded(prev => ({ ...prev, feedback: !prev.feedback }))}
                                >
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                        <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                            <span className="material-symbols-outlined">auto_fix_high</span>
                                        </span>
                                        Sequence Feedback
                                    </h2>
                                    <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                        <span className="material-symbols-outlined">
                                            {analyticsExpanded.feedback ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </button>
                                </div>
                                {analyticsExpanded.feedback && (
                                    <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                                        <SequenceFeedbackPanel isDemoMode={isDemoMode} userId={userId} isBlueprintMode={isBlueprintMode} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>





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

                                    {/* Main Funnel Panels */}
                                    {renderFunnelPanel({
                                        badgeIcon: 'bolt',
                                        badgeClassName: 'bg-indigo-50 text-indigo-700',
                                        badgeLabel: 'Primary Nurture',
                                        title: 'Marketing Funnel',
                                        description: 'The main automated journey for all new leads.',
                                        iconColorClass: 'text-indigo-600',
                                        steps: funnelSteps,
                                        expandedIds: expandedStepIds,
                                        onToggleStep: toggleStep,
                                        onUpdateStep: handleUpdateStep,
                                        onRemoveStep: handleRemoveStep,
                                        onAddStep: handleAddStep,
                                        onSave: handleSaveSteps,
                                        saveLabel: 'Save Funnel',
                                        onSendTest: handleSendTest
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {/* Modals */}
                {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} isDemoMode={isDemoMode} />}
                <LeadUploadModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    onUpload={handleUploadLeads}
                />

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
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default AdminMarketingFunnelsPanel;
