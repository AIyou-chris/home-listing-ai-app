export interface EmailTemplate {
    id: string;
    name: string;
    category: 'lead_capture' | 'follow_up' | 'appointment' | 'nurture' | 'market_update';
    subject: string;
    content: string;
    description: string;
    tags: string[];
    useCase: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
    // LEAD CAPTURE TEMPLATES
    {
        id: 'quick_response',
        name: 'Quick Response - Property Inquiry',
        category: 'lead_capture',
        subject: 'Re: Your inquiry about {{property.address}}',
        content: `Hi {{lead.name}},

Thank you for your interest in {{property.address}}! I received your inquiry and wanted to respond quickly.

This {{property.type}} is a fantastic opportunity with:
• {{property.bedrooms}} bedrooms, {{property.bathrooms}} bathrooms
• {{property.squareFeet}} square feet
• {{property.features}}

I'd love to show you this property and answer any questions you might have. Are you available for a showing this week?

You can reach me at {{agent.phone}} or simply reply to this email.

Best regards,
{{agent.name}}
{{agent.title}}
{{agent.company}}`,
        description: 'Immediate response to property inquiries with key details',
        tags: ['quick', 'property', 'inquiry'],
        useCase: 'Send within 5 minutes of lead capture from property listing'
    },
    {
        id: 'welcome_buyer',
        name: 'Welcome New Buyer',
        category: 'lead_capture',
        subject: 'Welcome! Let\'s find your perfect home',
        content: `Hi {{lead.name}},

Welcome! I'm thrilled to help you find your perfect home in {{area}}.

As your dedicated real estate agent, I'll:
✓ Send you new listings that match your criteria
✓ Provide market insights and neighborhood information
✓ Guide you through every step of the buying process
✓ Negotiate the best deal on your behalf

To get started, I'd love to learn more about what you're looking for. Are you available for a quick 15-minute call this week?

Looking forward to working with you!

{{agent.name}}
{{agent.phone}}
{{agent.email}}`,
        description: 'Welcome message for new buyer leads',
        tags: ['welcome', 'buyer', 'onboarding'],
        useCase: 'First contact with new buyer leads'
    },

    // FOLLOW-UP TEMPLATES
    {
        id: 'showing_follow_up',
        name: 'Post-Showing Follow-Up',
        category: 'follow_up',
        subject: 'How did you like {{property.address}}?',
        content: `Hi {{lead.name}},

I hope you enjoyed seeing {{property.address}} today! 

What were your initial thoughts about the property? I'd love to hear your feedback and answer any questions that came up during the showing.

If you're interested in moving forward, I can:
• Provide a comparative market analysis
• Share information about the neighborhood
• Help you prepare and submit an offer
• Connect you with trusted lenders for financing

Also, I have several other properties that might interest you based on what we discussed. Would you like me to send those over?

Feel free to call or text me at {{agent.phone}} anytime.

Best,
{{agent.name}}`,
        description: 'Follow up after property showings',
        tags: ['showing', 'follow-up', 'feedback'],
        useCase: 'Send 2-4 hours after a property showing'
    },
    {
        id: 'no_response_follow_up',
        name: 'Gentle Re-engagement',
        category: 'follow_up',
        subject: 'Just checking in - any questions?',
        content: `Hi {{lead.name}},

I wanted to check in and see if you had any questions about {{property.address}} or your home search in general.

I know how busy life can get, and buying a home is a big decision. I'm here whenever you're ready to continue the conversation.

If your timeline has changed or you're no longer looking, just let me know - no worries at all!

Otherwise, I'm here to help whenever you need it.

{{agent.name}}
{{agent.phone}}`,
        description: 'Gentle re-engagement for non-responsive leads',
        tags: ['re-engagement', 'gentle', 'check-in'],
        useCase: 'Send after 3-5 days of no response'
    },

    // APPOINTMENT TEMPLATES
    {
        id: 'appointment_confirmation',
        name: 'Appointment Confirmation',
        category: 'appointment',
        subject: 'Confirmed: Property showing {{date}} at {{time}}',
        content: `Hi {{lead.name}},

This confirms our appointment to view {{property.address}} on {{date}} at {{time}}.

Meeting Details:
📍 Address: {{property.address}}
🕐 Time: {{time}}
📱 My cell: {{agent.phone}} (call if you're running late)

What to expect:
• The showing will take about 20-30 minutes
• Feel free to take photos and ask questions
• I'll have information about the neighborhood and recent sales

Looking forward to showing you this property!

{{agent.name}}

P.S. If you need to reschedule, just let me know as soon as possible.`,
        description: 'Confirm scheduled property showings',
        tags: ['appointment', 'confirmation', 'showing'],
        useCase: 'Send immediately after booking an appointment'
    },
    {
        id: 'appointment_reminder',
        name: 'Appointment Reminder',
        category: 'appointment',
        subject: 'Reminder: Showing tomorrow at {{time}}',
        content: `Hi {{lead.name}},

Just a friendly reminder about our appointment tomorrow:

🏠 Property: {{property.address}}
🕐 Time: {{time}}
📍 Meet at: The front entrance

I'm really excited to show you this property! If anything comes up and you need to reschedule, please call me at {{agent.phone}}.

See you tomorrow!

{{agent.name}}`,
        description: 'Remind about upcoming appointments',
        tags: ['appointment', 'reminder'],
        useCase: 'Send 24 hours before appointment'
    },

    // NURTURE TEMPLATES
    {
        id: 'market_insight',
        name: 'Monthly Market Update',
        category: 'market_update',
        subject: 'Market Update: What\'s happening in {{area}}',
        content: `Hi {{lead.name}},

I wanted to share some interesting market trends I'm seeing in {{area}}:

📈 Market Highlights:
• Average home price: {{market.averagePrice}}
• Days on market: {{market.averageDays}}
• Interest rates: {{market.interestRate}}

🏠 What this means for buyers:
{{market.buyerInsight}}

📊 What this means for sellers:
{{market.sellerInsight}}

If you're thinking about making a move, now might be a great time to discuss your options. I'm here to help you navigate the current market.

Would you like to schedule a quick call to discuss your situation?

Best regards,
{{agent.name}}
{{agent.title}}`,
        description: 'Monthly market updates to stay top-of-mind',
        tags: ['market', 'update', 'nurture'],
        useCase: 'Send monthly to all contacts'
    },
    {
        id: 'neighborhood_spotlight',
        name: 'Neighborhood Spotlight',
        category: 'nurture',
        subject: 'Spotlight: Why {{neighborhood}} is so popular',
        content: `Hi {{lead.name}},

I thought you'd enjoy learning about {{neighborhood}} - one of the most sought-after areas in {{city}}.

🌟 What makes {{neighborhood}} special:
• {{neighborhood.feature1}}
• {{neighborhood.feature2}}
• {{neighborhood.feature3}}

🏫 Schools: {{neighborhood.schools}}
🛍️ Shopping: {{neighborhood.shopping}}
🍽️ Dining: {{neighborhood.dining}}

Recent Sales:
Recent homes have sold between {{price.low}} and {{price.high}}, with an average of {{price.average}}.

Thinking about this area? I'd love to show you some properties and give you a personal tour of the neighborhood.

{{agent.name}}
{{agent.phone}}`,
        description: 'Educational content about local neighborhoods',
        tags: ['neighborhood', 'education', 'nurture'],
        useCase: 'Monthly neighborhood spotlights for nurturing'
    },

    // SELLER TEMPLATES
    {
        id: 'listing_inquiry',
        name: 'Listing Consultation Invitation',
        category: 'lead_capture',
        subject: 'Get your home\'s current market value',
        content: `Hi {{lead.name}},

Thank you for your interest in learning about your home's value!

As a local market expert, I'd love to provide you with:
✓ A comprehensive market analysis of your property
✓ Recent comparable sales in your neighborhood
✓ Current market trends and timing considerations
✓ A strategic plan to maximize your home's value

This consultation is completely free with no obligation.

I have availability this week for a quick 30-minute meeting at your home. During this time, I'll:
• Walk through your property
• Discuss any improvements that could add value
• Provide you with a detailed market analysis
• Answer all your questions about the selling process

Are you available {{day1}} or {{day2}} this week?

Best regards,
{{agent.name}}
{{agent.title}}
{{agent.phone}}`,
        description: 'Invitation for seller consultation',
        tags: ['seller', 'consultation', 'home-value'],
        useCase: 'Response to seller lead capture forms'
    },

    // SPECIAL SITUATIONS
    {
        id: 'price_reduction',
        name: 'Price Reduction Alert',
        category: 'follow_up',
        subject: 'Price drop alert: {{property.address}}',
        content: `Hi {{lead.name}},

Great news! The property you showed interest in at {{property.address}} just had a price reduction.

Previous price: {{property.oldPrice}}
New price: {{property.newPrice}}
Savings: {{property.savings}}

This creates a great opportunity! Properties with price reductions often generate renewed interest and can move quickly.

Would you like to:
• Schedule another showing?
• Discuss submitting an offer?
• Review the updated market analysis?

Let me know if you'd like to explore this opportunity!

{{agent.name}}
{{agent.phone}}`,
        description: 'Alert about price reductions on properties of interest',
        tags: ['price-drop', 'opportunity', 'urgent'],
        useCase: 'Send when properties of interest reduce price'
    },
    {
        id: 'open_house_invite',
        name: 'Open House Invitation',
        category: 'appointment',
        subject: 'Open House this {{day}}: {{property.address}}',
        content: `Hi {{lead.name}},

You're invited to an exclusive open house!

🏠 Property: {{property.address}}
📅 Date: {{openHouse.date}}
🕐 Time: {{openHouse.startTime}} - {{openHouse.endTime}}

This {{property.type}} features:
• {{property.bedrooms}} bedrooms, {{property.bathrooms}} bathrooms
• {{property.squareFeet}} sq ft
• {{property.highlights}}

Why attend?
✓ See the property without scheduling a private showing
✓ Ask questions and get immediate answers
✓ Meet neighbors and learn about the community
✓ No pressure environment

I'll be there to answer any questions and provide additional information about the neighborhood and market.

Hope to see you there!

{{agent.name}}
{{agent.phone}}

P.S. Can't make it? Let me know and we can schedule a private showing.`,
        description: 'Invitation to open house events',
        tags: ['open-house', 'event', 'invitation'],
        useCase: 'Send 3-5 days before open house events'
    }
];

export const EMAIL_TEMPLATE_CATEGORIES = [
    { id: 'lead_capture', name: 'Lead Capture', description: 'First contact with new leads' },
    { id: 'follow_up', name: 'Follow-Up', description: 'Re-engage and nurture leads' },
    { id: 'appointment', name: 'Appointments', description: 'Schedule and confirm showings' },
    { id: 'nurture', name: 'Nurture', description: 'Stay top-of-mind with valuable content' },
    { id: 'market_update', name: 'Market Updates', description: 'Share market insights and trends' }
];

export const TEMPLATE_VARIABLES = {
    lead: ['name', 'email', 'phone', 'source'],
    property: ['address', 'type', 'bedrooms', 'bathrooms', 'squareFeet', 'price', 'features', 'highlights'],
    agent: ['name', 'title', 'company', 'phone', 'email', 'website'],
    appointment: ['date', 'time', 'location'],
    market: ['averagePrice', 'averageDays', 'interestRate', 'buyerInsight', 'sellerInsight'],
    neighborhood: ['name', 'feature1', 'feature2', 'feature3', 'schools', 'shopping', 'dining'],
    openHouse: ['date', 'startTime', 'endTime']
};
