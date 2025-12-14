import { EmailTemplate } from './emailTemplates';

// We map admin concepts to existing categories to satisfy the type definition
// outreach -> lead_capture
// value -> nurture
// closing -> follow_up

export const ADMIN_TEMPLATE_CATEGORIES = [
    { id: 'lead_capture', name: 'Cold Outreach' },
    { id: 'nurture', name: 'Value Prop & Education' },
    { id: 'follow_up', name: 'Closing & Urgency' }
];

export const ADMIN_EMAIL_TEMPLATES: EmailTemplate[] = [
    {
        id: 'outreach-intro',
        name: 'The "Modern Agent" Intro',
        description: 'Introduction focusing on speed and AI advantage.',
        category: 'lead_capture',
        tags: ['intro', 'ai', 'speed'],
        subject: 'Real estate is moving faster (are you?)',
        content: `Hi {{lead.firstName}},

The market is shifting, and speed is the new currency. While other agents are manually drafting emails, top producers are using AI to respond in seconds.

I’d love to show you how HomeListingAI acts as your 24/7 sidekick—drafting listings, answering buyer questions, and nurturing leads while you sleep.

Do you have 10 minutes this week for a quick demo?

Best,
{{agent.name}}`,
        useCase: 'Initial cold outreach to a tech-curious agent.'
    },
    {
        id: 'outreach-pain',
        name: 'Stop Losing Leads',
        description: 'Focuses on the pain of missed follow-ups.',
        category: 'lead_capture',
        tags: ['pain-point', 'follow-up'],
        subject: 'How many leads slipped through the cracks last month?',
        content: `Hi {{lead.firstName}},

We've all been there—you get a lead, but you're at a showing, and by the time you reply, they've moved on.

HomeListingAI fixes this instantly. Our AI sidekick engages every lead within 2 minutes, qualifying them and booking appointments directly on your calendar.

Stop leaving money on the table. Let’s get your AI assistant set up today.

Cheers,
{{agent.name}}`,
        useCase: 'Re-engaging an agent who has expressed frustration with workload.'
    },
    {
        id: 'value-features',
        name: 'Feature Highlight: AI Lister',
        description: 'Showcases the listing description and microsite generator.',
        category: 'nurture',
        tags: ['features', 'listing'],
        subject: 'Write a listing description in 3 seconds',
        content: `Hi {{lead.firstName}},

Writing listing descriptions is a chore. Let HomeListingAI do it for you.

Just upload your property photos or type a few bullets, and our AI crafts a compelling, SEO-optimized story for your listing. Plus, it builds a dedicated microsite that "talks" to buyers.

See it in action here: {{agent.website}}/demo

Best,
{{agent.name}}`,
        useCase: 'Educating an agent on specific time-saving features.'
    },
    {
        id: 'value-nurture',
        name: 'Automated Nurture Explained',
        description: 'Explains how the 5-touch funnel works.',
        category: 'nurture',
        tags: ['nurture', 'automation'],
        subject: 'Your database is a goldmine (if you mine it)',
        content: `Hi {{lead.firstName}},

Most agents have hundreds of leads just sitting there. HomeListingAI wakes them up.

Our automated 5-touch funnel re-engages past clients and cold leads with value-driven content—not "just checking in" spam.

Imagine waking up to 3 new appointments from leads you haven't spoken to in months. That's the power of AI nurture.

Ready to turn your database into paychecks?

{{agent.name}}`,
        useCase: 'Selling the value of the automated funnels.'
    },
    {
        id: 'closing-offer',
        name: 'Limited Time Founder Offer',
        description: 'Urgency driven offer to close the sale.',
        category: 'follow_up',
        tags: ['offer', 'urgency'],
        subject: 'Inviting you to our Founder’s Circle',
        content: `Hi {{lead.firstName}},

We’re opening up a few more spots in our Founder’s Circle this week. This gives you lifetime access to HomeListingAI at our lowest locked-in rate, plus priority support.

If you’re ready to modernize your business and reclaim 10+ hours a week, now is the time.

Click here to claim your spot: {{agent.website}}/join

See you on the inside,
{{agent.name}}`,
        useCase: 'Closing a warm lead with a special offer.'
    }
];
