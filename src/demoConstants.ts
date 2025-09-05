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
    notes: 'Client specifically interested in outdoor space and school district.'
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
    notes: 'First-time buyer, wants to see pool area and architectural details.'
  }
];

export const DEMO_FAT_INTERACTIONS: Interaction[] = [];

export const DEMO_SEQUENCES: FollowUpSequence[] = [
    {
        id: 'demo-buyer-sequence',
        name: 'New Buyer Lead Nurture',
        description: 'Convert buyer inquiries into property showings and sales',
        triggerType: 'Lead Capture',
        isActive: true,
        steps: [
            {
                id: 'step-1',
                type: 'email',
                delay: { value: 5, unit: 'minutes' },
                subject: 'Welcome! Let\'s Find Your Dream Home 🏠',
                content: `Hi {{lead.name}},

Thank you for your interest in {{property.address}}! I'm excited to help you find the perfect home.

I noticed you were looking at properties in the {{property.neighborhood}} area. This is a fantastic location with:
• Top-rated schools nearby
• Easy access to shopping and dining
• Strong property value growth

I'd love to show you this property and a few others that match your criteria. When would be a good time for a quick 15-minute call to discuss your needs?

Best regards,
{{agent.name}}
{{agent.phone}}`
            },
            {
                id: 'step-2',
                type: 'email',
                delay: { value: 2, unit: 'days' },
                subject: 'Market Update: New Listings in {{property.neighborhood}}',
                content: `Hi {{lead.name}},

I wanted to share some exciting news! We have 3 new listings that just came on the market in {{property.neighborhood}} that might interest you:

🏡 Similar Properties Available:
• 3BR/2BA - $\${property.price} range
• Move-in ready condition
• Great school district

The market is moving quickly, and these types of properties typically receive multiple offers within the first week.

Would you like to schedule a private showing this weekend? I can show you all the properties in one tour.

Let me know what works for your schedule!

{{agent.name}}`
            },
            {
                id: 'step-3',
                type: 'task',
                delay: { value: 5, unit: 'days' },
                content: 'Follow up with {{lead.name}} via phone call to schedule showing'
            }
        ]
    },
    {
        id: 'demo-seller-sequence',
        name: 'Seller Consultation Follow-up',
        description: 'Convert seller inquiries into listing appointments',
        triggerType: 'Property Inquiry',
        isActive: true,
        steps: [
            {
                id: 'step-1',
                type: 'email',
                delay: { value: 10, unit: 'minutes' },
                subject: 'Your Home Value Estimate + Next Steps',
                content: `Hi {{lead.name}},

Thank you for requesting information about selling your home at {{property.address}}. 

Based on recent market activity in your area, I estimate your home value at approximately $\${estimated.value}. Here's what's driving this estimate:

📈 Market Factors:
• Recent comparable sales: $\${comps.average}
• Current inventory levels: {{market.inventory}} months
• Average days on market: {{market.dom}} days

🎯 To Maximize Your Sale Price:
• Professional staging consultation
• Strategic pricing based on current market
• Comprehensive marketing plan
• High-quality photography and virtual tours

I'd love to provide a detailed Comparative Market Analysis (CMA) and discuss our proven selling strategy. Are you available for a brief consultation this week?

Best regards,
{{agent.name}}
{{agent.phone}}`
            },
            {
                id: 'step-2',
                type: 'email',
                delay: { value: 3, unit: 'days' },
                subject: 'Market Alert: Homes Like Yours Selling Fast!',
                content: `Hi {{lead.name}},

Great news! The market conditions are excellent for sellers right now. In your neighborhood:

🔥 Recent Market Activity:
• 3 homes sold above asking price this month
• Average time on market: only {{market.dom}} days
• Buyer demand is high with limited inventory

This creates a perfect opportunity to maximize your home's value. Many sellers are seeing:
• Multiple offers within the first week
• Sale prices 2-5% above asking
• Quick closings with motivated buyers

I have a proven marketing system that's helped my clients achieve these results. Would you like to see how we can position your home to attract top dollar?

I'm available for a no-obligation consultation this week.

{{agent.name}}`
            },
            {
                id: 'step-3',
                type: 'meeting',
                delay: { value: 7, unit: 'days' },
                content: 'Schedule listing consultation with {{lead.name}}',
                location: '{{property.address}}'
            }
        ]
    },
    {
        id: 'demo-nurture-sequence',
        name: 'Long-term Lead Nurture',
        description: 'Stay top-of-mind with leads not ready to buy/sell immediately',
        triggerType: 'Lead Capture',
        isActive: true,
        steps: [
            {
                id: 'step-1',
                type: 'email',
                delay: { value: 1, unit: 'weeks' },
                subject: 'Market Insights: What\'s Happening in {{market.area}}',
                content: `Hi {{lead.name}},

I hope you're doing well! I wanted to share some interesting market trends I'm seeing in {{market.area}}:

📊 This Month's Market Snapshot:
• Median home price: $\${market.median_price}
• Inventory levels: {{market.inventory}} months
• Interest rates: {{market.rates}}%

🏠 What This Means for You:
Whether you're thinking about buying or selling, these trends create opportunities. I'm here to help you understand how they might affect your real estate goals.

I'll continue to send you valuable market updates and insights. If you ever have questions or want to discuss your options, just reply to this email!

Best regards,
{{agent.name}}`
            },
            {
                id: 'step-2',
                type: 'email',
                delay: { value: 1, unit: 'months' },
                subject: 'Neighborhood Spotlight: {{property.neighborhood}}',
                content: `Hi {{lead.name}},

I thought you'd be interested in this spotlight on {{property.neighborhood}}:

🌟 Why People Love This Area:
• Excellent schools (rated {{schools.rating}}/10)
• {{amenities.count}} parks and recreational facilities
• Growing dining and shopping scene
• {{transit.access}} to downtown

💰 Investment Perspective:
• Property values up {{appreciation.rate}}% this year
• Strong rental demand
• Planned community improvements

If you're still considering this area, I'd be happy to show you around and share more insights about what makes it special.

Stay in touch!
{{agent.name}}`
            },
            {
                id: 'step-3',
                type: 'ai-email',
                delay: { value: 3, unit: 'months' },
                content: 'Generate personalized market update based on {{lead.preferences}} and current market conditions'
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
