import { Property, Lead, Appointment, Interaction, AgentProfile, FollowUpSequence, ActiveLeadFollowUp, AnalyticsData } from './types';
import { SAMPLE_AGENT } from './constants';

export const DEMO_FAT_PROPERTIES: Property[] = [
  {
    id: 'demo-1',
    title: 'Stunning Mid-Century Modern in Silver Lake',
    address: '2847 Sunset Boulevard, Los Angeles, CA 90026',
    price: 1250000,
    bedrooms: 3,
    bathrooms: 2.5,
    squareFeet: 2100,
    status: 'Active',
    listedDate: '2024-01-20',
    description: {
      title: 'Architectural Gem with Pool & City Views',
      paragraphs: [
        'Welcome to this stunning mid-century modern home nestled in the heart of Silver Lake! This architectural gem seamlessly blends vintage charm with contemporary luxury.',
        'The open-concept living space features soaring ceilings, floor-to-ceiling windows that flood the home with natural light, and original hardwood floors that have been meticulously restored.',
        'The gourmet kitchen boasts custom walnut cabinetry, quartz countertops, and high-end stainless steel appliances perfect for the culinary enthusiast.',
        'Step outside to your own private oasis with a sparkling pool, mature landscaping, and breathtaking city views. Located just minutes from trendy cafes, boutique shopping, and the vibrant arts scene that Silver Lake is known for.'
      ]
    },
    heroPhotos: ['/demo/home-1.png'],
    galleryPhotos: ['/demo/home-1.png'],
    imageUrl: '/demo/home-1.png',
    propertyType: 'Single Family',
    features: [
      'Swimming Pool',
      'City Views', 
      'Hardwood Floors',
      'Updated Kitchen',
      'Mid-Century Architecture',
      'Private Yard'
    ],
    appFeatures: {
      aiChatbot: true,
      virtualTour: true,
      scheduleShowing: true,
      contactAgent: true
    },
    agent: SAMPLE_AGENT
  },
  {
    id: 'demo-2',
    title: 'Contemporary Family Home in South Austin',
    address: '156 Maple Grove Lane, Austin, TX 78704',
    price: 875000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2650,
    status: 'Active',
    listedDate: '2024-01-19',
    description: {
      title: 'Perfect Blend of Modern Living & Natural Tranquility',
      paragraphs: [
        'Discover your dream home in the coveted South Austin neighborhood! This beautiful two-story contemporary home sits on a quiet tree-lined street.',
        'The open floor plan creates seamless flow between the spacious living areas, while the chef\'s kitchen features granite countertops, a large island with breakfast bar, and premium appliances.',
        'The master bedroom retreat includes a walk-in closet and en-suite bathroom with dual vanities and walk-in shower. Three additional well-appointed bedrooms provide flexibility for family, guests, or home office space.',
        'The private backyard is an entertainer\'s paradise with a covered patio, mature oak trees, and plenty of space for outdoor activities. Excellent schools and easy access to downtown Austin make this the ideal place to call home.'
      ]
    },
    heroPhotos: ['/demo/home-2.png'],
    galleryPhotos: ['/demo/home-2.png'],
    imageUrl: '/demo/home-2.png',
    propertyType: 'Single Family',
    features: [
      'Open Floor Plan',
      'Chef\'s Kitchen',
      'Master Suite',
      'Covered Patio', 
      'Mature Trees',
      'Great Schools'
    ],
    appFeatures: {
      aiChatbot: true,
      virtualTour: true,
      scheduleShowing: true,
      contactAgent: true
    },
    agent: SAMPLE_AGENT
  }
];

export const DEMO_FAT_LEADS: Lead[] = [
  {
    id: 'lead-demo-1',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '(555) 123-4567',
    source: 'Website Chat',
    status: 'New',
    interestedProperties: ['demo-1'],
    notes: 'Interested in mid-century homes with pools. First-time buyer, pre-approved up to $1.3M.',
    lastContact: '2024-01-20T09:15:00Z',
    createdAt: '2024-01-20T09:15:00Z',
    aiInteractions: [
      {
        timestamp: '2024-01-20T09:15:00Z',
        type: 'chat',
        summary: 'Inquired about pool maintenance and neighborhood safety. Showed strong interest in architectural features.'
      }
    ]
  },
  {
    id: 'lead-demo-2',
    name: 'Marcus Chen',
    email: 'marcus.chen@techcorp.com',
    phone: '(555) 987-6543',
    source: 'Property Listings',
    status: 'Contacted',
    interestedProperties: ['demo-2'],
    notes: 'Tech professional relocating from SF. Needs quick closing, cash buyer.',
    lastContact: '2024-01-19T16:30:00Z',
    createdAt: '2024-01-19T14:15:00Z',
    aiInteractions: [
      {
        timestamp: '2024-01-19T16:30:00Z',
        type: 'voice',
        summary: 'Discussed school ratings and commute times to downtown Austin. Ready to schedule viewing.'
      }
    ]
  }
];

export const DEMO_FAT_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-demo-1',
    leadId: 'lead-demo-2',
    leadName: 'Marcus Chen',
    propertyId: 'demo-2',
    propertyAddress: '156 Maple Grove Lane, Austin, TX',
    date: '2024-01-22',
    time: '10:00',
    type: 'Showing',
    status: 'Scheduled',
    notes: 'Client specifically interested in outdoor space and school district.',
    email: 'marcus.chen@techcorp.com',
    phone: '(555) 987-6543',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 60,
    clientReminderMinutes: 1440
  },
  {
    id: 'appt-demo-2', 
    leadId: 'lead-demo-1',
    leadName: 'Emily Rodriguez',
    propertyId: 'demo-1',
    propertyAddress: '2847 Sunset Boulevard, Los Angeles, CA',
    date: '2024-01-21',
    time: '14:30',
    type: 'Showing',
    status: 'Scheduled',
    notes: 'First-time buyer, wants to see pool area and architectural details.',
    email: 'emily.r@email.com',
    phone: '(555) 123-4567',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 60,
    clientReminderMinutes: 720
  }
];

export const DEMO_FAT_INTERACTIONS: Interaction[] = [];

export const DEMO_SEQUENCES: FollowUpSequence[] = [
    {
        id: 'welcome-sequence',
        name: 'Welcome & AI Card Intro',
        description: 'Send new contacts a polished welcome and showcase your AI business card.',
        triggerType: 'Lead Capture',
        isActive: true,
        steps: [
            {
                id: 'welcome-email-1',
                type: 'email',
                delay: { value: 2, unit: 'minutes' },
                subject: 'Welcome! Meet Your AI Concierge ✨',
                content: `Hi {{lead.name}},

Great to meet you! I built a personalized AI concierge that answers questions 24/7 and highlights my services.

👉 Explore it here: {{agent.aiCardUrl || agent.website}}

Inside you'll find:
• Property insights tailored to your interests
• My contact details and instant scheduling
• AI answers to common buying and selling questions

Let me know the best time to connect live—I’m ready when you are!

{{agent.name}}
{{agent.phone}}`
            },
            {
                id: 'welcome-email-2',
                type: 'email',
                delay: { value: 1, unit: 'days' },
                subject: 'Tour Your AI Card & Quick Next Steps',
                content: `Hi {{lead.name}},

Just checking in after you received the AI card yesterday. The concierge has quick links to:
• Schedule a property tour or consult
• Browse saved listings
• Ask questions about financing or timelines

If you'd prefer I walk you through it over a quick call, reply with a good time. I love giving clients the VIP tour!

Talk soon,
{{agent.name}}`
            },
            {
                id: 'welcome-task-call',
                type: 'task',
                delay: { value: 2, unit: 'days' },
                content: 'Call {{lead.name}} to confirm their goals and highlight key AI card features they should explore.'
            }
        ]
    },
    {
        id: 'buyer-journey-sequence',
        name: 'Home Buyer Journey',
        description: 'Guide active buyers from first inquiry to scheduled tours.',
        triggerType: 'Buyer Lead',
        isActive: true,
        steps: [
            {
                id: 'buyer-email-1',
                type: 'email',
                delay: { value: 1, unit: 'days' },
                subject: 'Let’s Lock In Your Wishlist 🔑',
                content: `Hi {{lead.name}},

Thanks for reaching out about {{property.address}}. I built a short checklist so I can curate the best options for you:

• Ideal budget range?
• Must-have features?
• Preferred timing to move?

Reply with those details and I’ll match homes you’ll love. I can also set you up with instant alerts the moment something new hits the market.

{{agent.name}}`
            },
            {
                id: 'buyer-email-2',
                type: 'email',
                delay: { value: 3, unit: 'days' },
                subject: 'Fresh Matches You Should See',
                content: `Hi {{lead.name}},

I hand-picked a few properties that match your wishlist:

{{personalized.matches}}

Ready for a preview tour? I can arrange back-to-back showings this week. Let me know which ones excite you the most!

{{agent.name}}`
            },
            {
                id: 'buyer-task-checkin',
                type: 'task',
                delay: { value: 5, unit: 'days' },
                content: 'Call or text {{lead.name}} to confirm interest level and schedule tours based on shared matches.'
            },
            {
                id: 'buyer-email-3',
                type: 'email',
                delay: { value: 10, unit: 'days' },
                subject: 'Market Watch: Opportunities Not to Miss',
                content: `Hi {{lead.name}},

The market shifted this week—here’s what matters:
• Average list-to-sale price in {{market.area}} is now {{market.listToSale}}%
• New financing incentives may lower payments
• Two listings similar to {{property.address}} just went under contract

I’d love to keep you ahead of the curve. Want me to set real-time alerts or line up a weekend tour?

{{agent.name}}`
            }
        ]
    },
    {
        id: 'seller-journey-sequence',
        name: 'Home Seller Warm-Up',
        description: 'Educate potential sellers and lead them toward a listing consultation.',
        triggerType: 'Seller Lead',
        isActive: true,
        steps: [
            {
                id: 'seller-email-1',
                type: 'email',
                delay: { value: 30, unit: 'minutes' },
                subject: 'Your Selling Game Plan Starts Here',
                content: `Hi {{lead.name}},

Thanks for reaching out about {{property.address}}. I’m preparing a quick value snapshot for you. In the meantime, here are the three levers that help my clients sell above asking:
1. Strategic pricing based on micro-neighborhood data
2. Story-driven marketing (photos, video, AI card concierge)
3. Launch plan that builds urgency pre-market

Let’s book a 15-minute consultation so I can tailor the plan to your goals. What works for you this week?

{{agent.name}}
{{agent.phone}}`
            },
            {
                id: 'seller-email-2',
                type: 'email',
                delay: { value: 3, unit: 'days' },
                subject: 'See What Homes Like Yours Are Selling For',
                content: `Hi {{lead.name}},

Here are three recent sales near {{property.address}} that show the momentum in your neighborhood:
{{market.comparables}}

I’ll bring a full pricing model to our consultation, including recommended upgrades (if any) and projected net proceeds. Ready to review it together?

{{agent.name}}`
            },
            {
                id: 'seller-task-appointment',
                type: 'task',
                delay: { value: 5, unit: 'days' },
                content: 'Call {{lead.name}} to confirm CMA delivery and schedule an in-person or virtual listing consultation.'
            },
            {
                id: 'seller-email-3',
                type: 'email',
                delay: { value: 8, unit: 'days' },
                subject: 'Marketing Preview: How We Spotlight Your Home',
                content: `Hi {{lead.name}},

I wanted to share how your home will shine when we go to market:
• Custom landing page with AI concierge and QR codes
• Social + email launch plan to generate buzz before day one
• Professional staging and photography schedule

Let me know if you’d like to review the full launch checklist—I’m excited to help you capture top dollar.

{{agent.name}}`
            }
        ]
    },
    {
        id: 'long-touch-sequence',
        name: 'Long-Term Touchpoints',
        description: 'Stay in front of past leads or sphere with thoughtful check-ins over time.',
        triggerType: 'Past Client / Sphere',
        isActive: true,
        steps: [
            {
                id: 'longtouch-email-1',
                type: 'email',
                delay: { value: 30, unit: 'days' },
                subject: 'Monthly Market Snapshot for {{market.area}}',
                content: `Hi {{lead.name}},

Sending a quick snapshot of what’s happening in {{market.area}} this month. Even if you’re not ready to move, it’s helpful to know how your equity is performing.

Highlights:
• Median sale price: $\${market.median_price}
• Average days on market: {{market.dom}}
• Buyer demand indicator: {{market.demand}}

If you ever want a personalized update, I’m just a reply away.

{{agent.name}}`
            },
            {
                id: 'longtouch-task-call',
                type: 'task',
                delay: { value: 60, unit: 'days' },
                content: 'Reach out to {{lead.name}} with a quick voicemail or text—offer value (market update, contractor referral, neighborhood news).'
            },
            {
                id: 'longtouch-email-2',
                type: 'email',
                delay: { value: 90, unit: 'days' },
                subject: 'Checking In—Anything I Can Help With?',
                content: `Hi {{lead.name}},

Just dropping in to say hello. Many of my clients lean on me for:
• Vendor recommendations (contractors, painters, lenders)
• Questions about property values or investment ideas
• Connecting family or friends who are starting their search

If something is on your mind—or you just want to talk real estate trends—reply anytime. I’m here for the long haul.

{{agent.name}}`
            }
        ]
    }
];

export const DEMO_ACTIVE_FOLLOWUPS: ActiveLeadFollowUp[] = [];

export const DEMO_ANALYTICS_DATA: AnalyticsData = {
  performanceOverview: {
    newLeads: 8,
    conversionRate: 32,
    appointmentsSet: 12,
    avgAiResponseTime: "1.2s",
    leadFunnel: {
      leadsCaptured: 25,
      aiQualified: 18,
      contactedByAgent: 12,
      appointmentsSet: 8,
    },
  },
  leadSourceAnalysis: [
    { sourceName: 'Website Chat', icon: 'app', leadCount: 12, conversionRate: 35 },
    { sourceName: 'Property Listings', icon: 'zillow', leadCount: 8, conversionRate: 28 },
    { sourceName: 'Social Media', icon: 'facebook', leadCount: 5, conversionRate: 20 },
    { sourceName: 'Manual Entry', icon: 'manual', leadCount: 3, conversionRate: 15 }
  ],
};
