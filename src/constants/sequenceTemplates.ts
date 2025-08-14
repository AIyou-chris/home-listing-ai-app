import { FollowUpSequence, SequenceStep, TriggerType } from '../types';

export interface SequenceTemplate {
    id: string;
    name: string;
    description: string;
    category: 'buyer' | 'seller' | 'nurture' | 'followup';
    triggerType: TriggerType;
    steps: Omit<SequenceStep, 'id'>[];
    tags: string[];
    estimatedDuration: string;
    conversionRate?: number;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export const SEQUENCE_TEMPLATES: SequenceTemplate[] = [
    // BUYER SEQUENCES
    {
        id: 'new-buyer-aggressive',
        name: 'New Buyer - Aggressive Follow-Up',
        description: 'Fast-paced sequence for hot buyer leads who need immediate attention',
        category: 'buyer',
        triggerType: 'Lead Capture',
        estimatedDuration: '3 days',
        conversionRate: 24,
        difficulty: 'Beginner',
        tags: ['buyer', 'aggressive', 'fast'],
        steps: [
            {
                type: 'email',
                delay: { value: 5, unit: 'minutes' },
                subject: 'Quick question about {{property.address}}',
                content: `Hi {{lead.name}},\n\nI just saw your inquiry about {{property.address}}. This is a fantastic property and I'd love to chat about it.\n\nAre you available for a quick 5-minute call today?\n\nBest regards,\n{{agent.name}}\n{{agent.phone}}`
            },
            {
                type: 'task',
                delay: { value: 30, unit: 'minutes' },
                content: 'Call {{lead.name}} at {{lead.phone}} about their inquiry for {{property.address}}. Be ready to schedule a showing.'
            },
            {
                type: 'email',
                delay: { value: 4, unit: 'hours' },
                subject: 'Available for a showing this week?',
                content: `Hi {{lead.name}},\n\nI tried calling but wanted to follow up via email as well.\n\n{{property.address}} has some amazing features:\n• {{property.bedrooms}} bedrooms, {{property.bathrooms}} bathrooms\n• {{property.squareFeet}} sq ft of living space\n• Recently updated kitchen and bathrooms\n\nWould you be interested in a private showing this week? I have availability tomorrow and Friday.\n\n{{agent.name}}`
            },
            {
                type: 'ai-email',
                delay: { value: 1, unit: 'days' },
                content: 'Send a follow-up highlighting the best features of the property and create urgency around scheduling a viewing.'
            },
            {
                type: 'task',
                delay: { value: 2, unit: 'days' },
                content: 'Final follow-up call to {{lead.name}}. If no response, move to nurture sequence.'
            }
        ]
    },
    {
        id: 'buyer-showing-followup',
        name: 'Post-Showing Follow-Up',
        description: 'Perfect sequence for after property showings to gauge interest and next steps',
        category: 'followup',
        triggerType: 'Property Viewed',
        estimatedDuration: '1 week',
        conversionRate: 31,
        difficulty: 'Beginner',
        tags: ['showing', 'followup', 'buyer'],
        steps: [
            {
                type: 'email',
                delay: { value: 2, unit: 'hours' },
                subject: 'How did you like {{property.address}}?',
                content: `Hi {{lead.name}},\n\nI hope you enjoyed seeing {{property.address}} today! \n\nWhat were your initial thoughts? Did it meet your expectations?\n\nI'd love to hear your feedback and answer any questions that came up during the showing.\n\nFeel free to call or text me at {{agent.phone}}.\n\nBest,\n{{agent.name}}`
            },
            {
                type: 'task',
                delay: { value: 1, unit: 'days' },
                content: 'Call {{lead.name}} to discuss their thoughts on the showing and gauge interest level.'
            },
            {
                type: 'email',
                delay: { value: 2, unit: 'days' },
                subject: 'Other properties you might love',
                content: `Hi {{lead.name}},\n\nBased on your interest in {{property.address}}, I found some other properties that might catch your eye.\n\nWould you like me to send over a few similar options in the area? I can also set up showings for this weekend if any interest you.\n\nLet me know what you think!\n\n{{agent.name}}`
            },
            {
                type: 'meeting',
                delay: { value: 5, unit: 'days' },
                content: 'Buyer consultation meeting to discuss their search criteria and financing options.',
                meetingDetails: {
                    date: '',
                    time: '14:00',
                    location: 'Office or Coffee Shop'
                }
            }
        ]
    },

    // SELLER SEQUENCES
    {
        id: 'seller-consultation',
        name: 'Seller Consultation Sequence',
        description: 'Convert seller inquiries into listing appointments with this proven sequence',
        category: 'seller',
        triggerType: 'Custom',
        estimatedDuration: '1 week',
        conversionRate: 18,
        difficulty: 'Intermediate',
        tags: ['seller', 'listing', 'consultation'],
        steps: [
            {
                type: 'email',
                delay: { value: 10, unit: 'minutes' },
                subject: 'Your home valuation request',
                content: `Hi {{lead.name}},\n\nThank you for your interest in learning about your home's current market value!\n\nI'd love to provide you with a comprehensive market analysis that includes:\n✓ Recent comparable sales in your neighborhood\n✓ Current market trends affecting your home's value\n✓ Strategic recommendations to maximize your sale price\n\nWhen would be a good time for a quick 15-minute call to discuss your situation?\n\nBest regards,\n{{agent.name}}\n{{agent.title}}`
            },
            {
                type: 'task',
                delay: { value: 2, unit: 'hours' },
                content: 'Prepare CMA (Comparative Market Analysis) for {{lead.name}} and call to schedule consultation.'
            },
            {
                type: 'email',
                delay: { value: 1, unit: 'days' },
                subject: 'Market update for your neighborhood',
                content: `Hi {{lead.name}},\n\nI wanted to share some interesting market trends I'm seeing in your area:\n\n📈 Homes are selling 15% faster than last year\n💰 Average sale price has increased by 8% in the last 6 months\n🏠 Inventory is still low, creating great opportunities for sellers\n\nThis could be an excellent time to consider selling. Would you like to schedule a consultation to discuss your specific situation?\n\nI can come to your home at your convenience.\n\n{{agent.name}}`
            },
            {
                type: 'ai-email',
                delay: { value: 3, unit: 'days' },
                content: 'Send a personalized email highlighting the benefits of working with our team and include testimonials from recent sellers.'
            },
            {
                type: 'task',
                delay: { value: 5, unit: 'days' },
                content: 'Final outreach call to {{lead.name}}. If interested, schedule listing presentation.'
            }
        ]
    },

    // NURTURE SEQUENCES
    {
        id: 'long-term-nurture',
        name: 'Long-Term Nurture Campaign',
        description: 'Stay top-of-mind with leads who aren\'t ready to buy or sell yet',
        category: 'nurture',
        triggerType: 'Custom',
        estimatedDuration: '6 months',
        conversionRate: 12,
        difficulty: 'Advanced',
        tags: ['nurture', 'long-term', 'education'],
        steps: [
            {
                type: 'email',
                delay: { value: 1, unit: 'days' },
                subject: 'Welcome to my VIP list!',
                content: `Hi {{lead.name}},\n\nWelcome! I'm excited to help you with your real estate journey.\n\nI'll be sending you valuable market insights, home tips, and exclusive property previews to keep you informed.\n\nIf you ever have questions or want to chat about real estate, just reply to any email!\n\nLooking forward to working with you,\n{{agent.name}}`
            },
            {
                type: 'email',
                delay: { value: 14, unit: 'days' },
                subject: 'Monthly market update for {{area}}',
                content: `Hi {{lead.name}},\n\nHere's your monthly market update:\n\n🏠 Market Highlights:\n• Average home price: {{market.averagePrice}}\n• Days on market: {{market.averageDays}}\n• Interest rates: {{market.interestRate}}\n\n📊 What this means for you:\nThis is still a great time for both buyers and sellers in our market.\n\nLet me know if you'd like to discuss any opportunities!\n\n{{agent.name}}`
            },
            {
                type: 'email',
                delay: { value: 30, unit: 'days' },
                subject: 'Home maintenance tip of the month',
                content: `Hi {{lead.name}},\n\nQuick home tip for this month:\n\n🔧 Check and replace your HVAC filters\n\nThis simple task can:\n• Improve air quality\n• Reduce energy bills\n• Extend your system's life\n\nTaking care of these small things now can save thousands later!\n\nHave a great month,\n{{agent.name}}`
            },
            {
                type: 'email',
                delay: { value: 60, unit: 'days' },
                subject: 'Exclusive preview: New listings',
                content: `Hi {{lead.name}},\n\nI wanted to give you an exclusive preview of some beautiful new listings coming to market this week.\n\nThese properties match your previous interests and will likely move quickly.\n\nWould you like me to schedule private showings before they hit the public market?\n\nLet me know!\n{{agent.name}}`
            }
        ]
    },

    // APPOINTMENT FOLLOW-UP
    {
        id: 'appointment-no-show',
        name: 'Appointment No-Show Recovery',
        description: 'Recover leads who missed their scheduled appointments',
        category: 'followup',
        triggerType: 'Custom',
        estimatedDuration: '3 days',
        conversionRate: 22,
        difficulty: 'Beginner',
        tags: ['appointment', 'no-show', 'recovery'],
        steps: [
            {
                type: 'email',
                delay: { value: 30, unit: 'minutes' },
                subject: 'We missed you today',
                content: `Hi {{lead.name}},\n\nI waited for you at {{property.address}} but it looks like we missed each other.\n\nNo worries - things come up! \n\nWould you like to reschedule? I have availability tomorrow or this weekend.\n\nJust reply with a good time for you.\n\nBest,\n{{agent.name}}`
            },
            {
                type: 'task',
                delay: { value: 2, unit: 'hours' },
                content: 'Call {{lead.name}} to check if everything is okay and offer to reschedule the showing.'
            },
            {
                type: 'email',
                delay: { value: 1, unit: 'days' },
                subject: 'Still interested in {{property.address}}?',
                content: `Hi {{lead.name}},\n\nI wanted to follow up about {{property.address}}.\n\nI know life gets busy, but I don't want you to miss out on this property if you're still interested.\n\nIt's getting a lot of attention, so if you'd like to see it, let's get something scheduled soon.\n\nWhat works better for you - weekday evenings or weekends?\n\n{{agent.name}}`
            },
            {
                type: 'ai-email',
                delay: { value: 2, unit: 'days' },
                content: 'Send a gentle follow-up focusing on other similar properties they might be interested in.'
            }
        ]
    }
];

export const SEQUENCE_CATEGORIES = [
    { id: 'buyer', name: 'Buyer Sequences', description: 'Convert buyer leads into showings and sales', icon: 'home', color: 'blue' },
    { id: 'seller', name: 'Seller Sequences', description: 'Convert seller inquiries into listings', icon: 'sell', color: 'green' },
    { id: 'nurture', name: 'Nurture Campaigns', description: 'Stay top-of-mind with long-term leads', icon: 'favorite', color: 'purple' },
    { id: 'followup', name: 'Follow-Up Sequences', description: 'Re-engage and recover leads', icon: 'replay', color: 'orange' }
];

// Convert template to actual sequence
export const convertTemplateToSequence = (template: SequenceTemplate): Omit<FollowUpSequence, 'id'> => {
    return {
        name: template.name,
        description: template.description,
        triggerType: template.triggerType,
        steps: template.steps.map((step, index) => ({
            ...step,
            id: `step-${Date.now()}-${index}`
        })),
        isActive: true
    };
};
