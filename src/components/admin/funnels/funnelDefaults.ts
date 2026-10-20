import { CallBot, EditableStep } from '../../../types';

export const isCallStepType = (type: string) => ['call', 'ai call', 'ai-call', 'voice'].includes((type || '').toLowerCase());
export const DEFAULT_CALL_BOT_KEY = 'admin_follow_up';

export const slugifyBotKey = (value: string) => value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const resolveCallBotId = (value: string | undefined, bots: CallBot[]) => {
    const normalized = (value || '').trim();
    const defaultBot = bots.find((bot) => bot.isDefault && bot.isActive) || bots.find((bot) => bot.isActive) || bots[0];
    const defaultKey = defaultBot?.key || DEFAULT_CALL_BOT_KEY;
    return bots.some((bot) => bot.key === normalized) ? normalized : defaultKey;
};

export const normalizeCallStep = (step: EditableStep, bots: CallBot[]): EditableStep => {
    if (!isCallStepType(step.type)) return step;
    return { ...step, content: resolveCallBotId(step.content, bots) };
};

export const highlightCards = [
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

export const initialHomeBuyerSteps: EditableStep[] = [
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

export const COMMON_TOKEN_HINTS = ['{{lead.name}}', '{{lead.interestAddress}}', '{{agent.name}}', '{{agent.phone}}', '{{agent.aiCardUrl}}'];
