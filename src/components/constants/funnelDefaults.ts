
import { EditableStep } from '../UniversalFunnelPanel';

export const initialWelcomeSteps: EditableStep[] = [
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
    }
];

export const initialListingSteps: EditableStep[] = [
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
    }
];

export const initialPostShowingSteps: EditableStep[] = [
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
    }
];
