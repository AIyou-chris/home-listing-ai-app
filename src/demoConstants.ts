import { Property, Lead, Appointment, Interaction, FollowUpSequence, ActiveLeadFollowUp, AnalyticsData } from './types';
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
    date: '2025-11-24T09:15:00Z',
    lastMessage: 'Asked about pool maintenance and neighborhood safety.',
    interestedProperties: ['demo-1'],
    notes: 'Interested in mid-century homes with pools. First-time buyer, pre-approved up to $1.3M.',
    lastContact: '2025-11-24T09:15:00Z',
    createdAt: '2025-11-24T09:15:00Z',
    aiInteractions: [
      {
        timestamp: '2025-11-24T09:15:00Z',
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
    date: '2025-11-23T14:15:00Z',
    lastMessage: 'Discussed school ratings and commute times to downtown Austin.',
    interestedProperties: ['demo-2'],
    notes: 'Tech professional relocating from SF. Needs quick closing, cash buyer.',
    lastContact: '2025-11-23T16:30:00Z',
    createdAt: '2025-11-23T14:15:00Z',
    aiInteractions: [
      {
        timestamp: '2025-11-23T16:30:00Z',
        type: 'voice',
        summary: 'Discussed school ratings and commute times to downtown Austin. Ready to schedule viewing.'
      }
    ]
  },
  {
    id: 'lead-demo-3',
    name: 'Sarah & James Thompson',
    email: 'thompson.family@gmail.com',
    phone: '(555) 234-8901',
    source: 'Referral',
    status: 'Qualified',
    date: '2025-11-22T11:00:00Z',
    lastMessage: 'Looking for family-friendly neighborhoods with good schools.',
    interestedProperties: ['demo-2'],
    notes: 'Young family with two kids (ages 5 & 8). Moving from out of state for job relocation. Budget: $800K-$950K.',
    lastContact: '2025-11-23T10:00:00Z',
    createdAt: '2025-11-22T11:00:00Z',
    aiInteractions: [
      {
        timestamp: '2025-11-22T15:20:00Z',
        type: 'chat',
        summary: 'Asked about school districts, parks, and family activities in the area.'
      },
      {
        timestamp: '2025-11-23T10:00:00Z',
        type: 'email',
        summary: 'Sent information on top-rated schools and community amenities. Very engaged.'
      }
    ]
  },
  {
    id: 'lead-demo-4',
    name: 'David Park',
    email: 'd.park@investco.com',
    phone: '(555) 345-6789',
    source: 'Website Form',
    status: 'Showing',
    date: '2025-11-21T08:30:00Z',
    lastMessage: 'Interested in investment properties with rental potential.',
    interestedProperties: ['demo-1', 'demo-2'],
    notes: 'Real estate investor looking for properties in appreciating markets. Cash buyer, quick close preferred.',
    lastContact: '2025-11-24T14:00:00Z',
    createdAt: '2025-11-21T08:30:00Z',
    aiInteractions: [
      {
        timestamp: '2025-11-21T08:30:00Z',
        type: 'chat',
        summary: 'Discussed ROI potential and rental market trends in LA and Austin.'
      },
      {
        timestamp: '2025-11-24T14:00:00Z',
        type: 'voice',
        summary: 'Scheduled showings for both properties. Very interested in closing within 30 days.'
      }
    ]
  },
  {
    id: 'lead-demo-5',
    name: 'Jennifer Martinez',
    email: 'jmartinez.design@email.com',
    phone: '(555) 456-7890',
    source: 'Instagram',
    status: 'Contacted',
    date: '2025-11-20T13:45:00Z',
    lastMessage: 'Love the modern aesthetic! Looking for something similar in my price range.',
    interestedProperties: ['demo-1'],
    notes: 'Interior designer with great eye for unique homes. Pre-approved $900K-$1.2M. Flexible timeline.',
    lastContact: '2025-11-22T09:30:00Z',
    createdAt: '2025-11-20T13:45:00Z',
    aiInteractions: [
      {
        timestamp: '2025-11-20T13:45:00Z',
        type: 'chat',
        summary: 'Expressed love for mid-century modern architecture and outdoor spaces.'
      },
      {
        timestamp: '2025-11-22T09:30:00Z',
        type: 'email',
        summary: 'Sent curated list of architectural gems in the area. High engagement.'
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
    date: '2025-11-26',
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
    date: '2025-11-25',
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
  },
  {
    id: 'appt-demo-3',
    leadId: 'lead-demo-4',
    leadName: 'David Park',
    propertyId: 'demo-1',
    propertyAddress: '2847 Sunset Boulevard, Los Angeles, CA',
    date: '2025-11-27',
    time: '09:00',
    type: 'Showing',
    status: 'Scheduled',
    notes: 'Investor viewing - focus on rental potential and ROI.',
    email: 'd.park@investco.com',
    phone: '(555) 345-6789',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 60,
    clientReminderMinutes: 1440
  },
  {
    id: 'appt-demo-4',
    leadId: 'lead-demo-4',
    leadName: 'David Park',
    propertyId: 'demo-2',
    propertyAddress: '156 Maple Grove Lane, Austin, TX',
    date: '2025-11-27',
    time: '15:00',
    type: 'Showing',
    status: 'Scheduled',
    notes: 'Second property viewing same day. Client is very motivated.',
    email: 'd.park@investco.com',
    phone: '(555) 345-6789',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 60,
    clientReminderMinutes: 1440
  },
  {
    id: 'appt-demo-5',
    leadId: 'lead-demo-3',
    leadName: 'Sarah & James Thompson',
    propertyId: 'demo-2',
    propertyAddress: '156 Maple Grove Lane, Austin, TX',
    date: '2025-11-28',
    time: '11:00',
    type: 'Showing',
    status: 'Scheduled',
    notes: 'Family viewing - bring info on local schools and parks.',
    email: 'thompson.family@gmail.com',
    phone: '(555) 234-8901',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 60,
    clientReminderMinutes: 1440
  },
  {
    id: 'appt-demo-6',
    leadId: 'lead-demo-5',
    leadName: 'Jennifer Martinez',
    propertyId: 'demo-1',
    propertyAddress: '2847 Sunset Boulevard, Los Angeles, CA',
    date: '2025-11-29',
    time: '13:00',
    type: 'Showing',
    status: 'Scheduled',
    notes: 'Virtual showing via video call - client is relocating from NYC.',
    email: 'jmartinez@designer.com',
    phone: '(555) 456-7890',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 60,
    clientReminderMinutes: 1440
  },
  {
    id: 'appt-demo-7',
    leadId: 'lead-demo-2',
    leadName: 'Marcus Chen',
    propertyId: 'demo-1',
    propertyAddress: '2847 Sunset Boulevard, Los Angeles, CA',
    date: '2025-11-26',
    time: '16:00',
    type: 'Open House',
    status: 'Scheduled',
    notes: 'Open house event - expecting multiple attendees. Marcus confirmed attendance.',
    email: 'marcus.chen@techcorp.com',
    phone: '(555) 987-6543',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 120,
    clientReminderMinutes: 1440
  },
  {
    id: 'appt-demo-8',
    leadId: 'lead-demo-1',
    leadName: 'Emily Rodriguez',
    propertyId: 'demo-2',
    propertyAddress: '156 Maple Grove Lane, Austin, TX',
    date: '2025-11-28',
    time: '10:30',
    type: 'Consultation',
    status: 'Scheduled',
    notes: 'Initial consultation to discuss financing options and budget.',
    email: 'emily.r@email.com',
    phone: '(555) 123-4567',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 60,
    clientReminderMinutes: 1440
  },
  {
    id: 'appt-demo-9',
    leadId: 'lead-demo-3',
    leadName: 'Sarah & James Thompson',
    propertyId: 'demo-1',
    propertyAddress: '2847 Sunset Boulevard, Los Angeles, CA',
    date: '2025-11-27',
    time: '14:00',
    type: 'Showing',
    status: 'Scheduled',
    notes: 'Follow-up showing - clients want to bring their parents to see the property.',
    email: 'thompson.family@gmail.com',
    phone: '(555) 234-8901',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 60,
    clientReminderMinutes: 720
  },
  {
    id: 'appt-demo-10',
    leadId: 'lead-demo-4',
    leadName: 'David Park',
    propertyId: 'demo-2',
    propertyAddress: '156 Maple Grove Lane, Austin, TX',
    date: '2025-11-29',
    time: '09:30',
    type: 'Consultation',
    status: 'Scheduled',
    notes: 'Final walkthrough before closing next week. Bring inspection checklist.',
    email: 'd.park@investco.com',
    phone: '(555) 345-6789',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 120,
    clientReminderMinutes: 2880
  }
];

export const DEMO_FAT_INTERACTIONS: Interaction[] = [];

export const DEMO_SEQUENCES: FollowUpSequence[] = [
  {
    id: 'welcome-new-leads',
    name: 'Welcome New Leads',
    description: 'Instant welcome + AI concierge hand-off for every brand-new inquiry.',
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
    id: 'new-homebuyer-sprint',
    name: 'New Homebuyer Sprint',
    description: 'Four-touch buyer nurture that moves prospects from wishlist to scheduled tours.',
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
    id: 'listing-prospecting',
    name: 'Listing Prospecting Push',
    description: 'Seller-focused drip that tees up a pricing review and listing consultation.',
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
    id: 'post-showing-follow-up',
    name: 'Post-Showing Follow Up',
    description: 'High-touch follow up once a lead has toured a home so nothing falls through the cracks.',
    triggerType: 'Property Viewed',
    isActive: true,
    steps: [
      {
        id: 'postshowing-email-1',
        type: 'email',
        delay: { value: 1, unit: 'hours' },
        subject: 'Thank You for Touring {{property.address}}',
        content: `Hi {{lead.name}},

Loved walking through {{property.address}} with you today. Here’s a quick recap plus anything you asked me to pull:
• Standout features you reacted to
• Notes on neighborhood or schools
• Next steps if you want to move forward

If another property jumped out while we were chatting, drop it here and I’ll get it on the calendar.

{{agent.name}}`
      },
      {
        id: 'postshowing-reminder',
        type: 'reminder',
        delay: { value: 1, unit: 'days' },
        content: 'Reminder: text {{lead.name}} with the highlight reel from {{property.address}} plus financing or comps they asked about.'
      },
      {
        id: 'postshowing-email-2',
        type: 'email',
        delay: { value: 2, unit: 'days' },
        subject: 'Next Showing Ideas + Offer Timeline',
        content: `Hi {{lead.name}},

Based on what stood out at {{property.address}}, I queued up a few alternates that check the same boxes. Want me to line up a second tour or walk you through offer strategy? I can prep numbers anytime.

Talk soon,
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

export const DEMO_CONVERSATIONS = [
  {
    id: 'conv-demo-1',
    contactName: 'Marcus Chen',
    contactEmail: 'marcus.chen@techcorp.com',
    contactPhone: '(555) 987-6543',
    type: 'voice',
    lastMessage: 'Discussed school ratings and commute times to downtown Austin.',
    timestamp: '2025-11-23T16:30:00Z',
    duration: '12:45',
    status: 'active',
    messageCount: 1,
    property: '156 Maple Grove Lane',
    tags: ['High Intent', 'Relocation', 'Cash Buyer'],
    intent: 'Schedule Viewing',
    language: 'English',
    voiceTranscript: "Agent: Hi Marcus, thanks for calling about the Maple Grove property. How can I help you today?\nMarcus: Hi, I'm moving from SF and looking for a place with good schools and an easy commute to downtown.\nAgent: Great! Maple Grove is in the top-rated Barton Hills school district and just a 15-minute drive to downtown. It also has a fantastic backyard.\nMarcus: That sounds perfect. I'm a cash buyer and need to move quickly. Can we set up a viewing?\nAgent: Absolutely. I can get you in tomorrow at 10 AM. Does that work?\nMarcus: Yes, 10 AM works. See you then.",
    followUpTask: 'Send school district report'
  },
  {
    id: 'conv-demo-2',
    contactName: 'Emily Rodriguez',
    contactEmail: 'emily.r@email.com',
    contactPhone: '(555) 123-4567',
    type: 'chat',
    lastMessage: 'Inquired about pool maintenance and neighborhood safety.',
    timestamp: '2025-11-24T09:15:00Z',
    duration: null,
    status: 'active',
    messageCount: 5,
    property: '2847 Sunset Boulevard',
    tags: ['First-time Buyer', 'Pool'],
    intent: 'Property Inquiry',
    language: 'Spanish',
    followUpTask: 'Send pool maintenance guide'
  },
  {
    id: 'conv-demo-3',
    contactName: 'Sarah Thompson',
    contactEmail: 'thompson.family@gmail.com',
    contactPhone: '(555) 234-8901',
    type: 'email',
    lastMessage: 'Sent information on top-rated schools and community amenities.',
    timestamp: '2025-11-23T10:00:00Z',
    duration: null,
    status: 'follow-up',
    messageCount: 3,
    property: '156 Maple Grove Lane',
    tags: ['Family', 'Schools'],
    intent: 'Information Request',
    language: 'English',
    followUpTask: 'Check if they received the email'
  }
];

export const DEMO_MESSAGES = {
  'conv-demo-1': [
    {
      id: 'msg-1',
      sender: 'lead',
      channel: 'voice',
      timestamp: '2025-11-23T16:30:00Z',
      text: 'Voice call transcript available in details.'
    }
  ],
  'conv-demo-2': [
    {
      id: 'msg-2-1',
      sender: 'lead',
      channel: 'chat',
      timestamp: '2025-11-24T09:10:00Z',
      text: 'Hola, me encanta esta casa. ¿El mantenimiento de la piscina es costoso?',
      translation: { language: 'English', text: 'Hi, I love this house. Is the pool maintenance expensive?' }
    },
    {
      id: 'msg-2-2',
      sender: 'ai',
      channel: 'chat',
      timestamp: '2025-11-24T09:10:30Z',
      text: 'Hola Emily! Gracias por tu interés. El mantenimiento de la piscina es bastante estándar, alrededor de $150 al mes. La casa tiene un sistema de filtración nuevo que ayuda a reducir costos. ¿Te gustaría verla en persona?',
      translation: { language: 'English', text: 'Hi Emily! Thanks for your interest. Pool maintenance is pretty standard, around $150 a month. The house has a new filtration system that helps reduce costs. Would you like to see it in person?' }
    },
    {
      id: 'msg-2-3',
      sender: 'lead',
      channel: 'chat',
      timestamp: '2025-11-24T09:12:00Z',
      text: 'Eso suena bien. ¿Y qué tal es el vecindario? ¿Es seguro?',
      translation: { language: 'English', text: 'That sounds good. How is the neighborhood? Is it safe?' }
    },
    {
      id: 'msg-2-4',
      sender: 'ai',
      channel: 'chat',
      timestamp: '2025-11-24T09:12:45Z',
      text: 'Silver Lake es una zona muy deseada y tranquila. Esta calle en particular es muy segura y tiene poco tráfico. Muchos vecinos caminan por las tardes.',
      translation: { language: 'English', text: 'Silver Lake is a very desirable and quiet area. This street in particular is very safe and has little traffic. Many neighbors walk in the evenings.' }
    },
    {
      id: 'msg-2-5',
      sender: 'lead',
      channel: 'chat',
      timestamp: '2025-11-24T09:15:00Z',
      text: 'Perfecto, gracias por la información.',
      translation: { language: 'English', text: 'Perfect, thanks for the info.' }
    }
  ],
  'conv-demo-3': [
    {
      id: 'msg-3-1',
      sender: 'lead',
      channel: 'email',
      timestamp: '2025-11-22T15:20:00Z',
      text: 'Hi, we are moving from out of state and have two kids. Can you tell us more about the schools near the Maple Grove property?'
    },
    {
      id: 'msg-3-2',
      sender: 'ai',
      channel: 'email',
      timestamp: '2025-11-22T15:25:00Z',
      text: 'Hi Sarah, welcome to Austin! The Maple Grove home is in the Barton Hills Elementary district, which is rated 9/10. It feeds into O. Henry Middle School and Austin High. I can send you a detailed report on the schools and nearby parks if you like.'
    },
    {
      id: 'msg-3-3',
      sender: 'agent',
      channel: 'email',
      timestamp: '2025-11-23T10:00:00Z',
      text: 'Hi Sarah, following up on the AI\'s message. I\'ve attached a PDF with detailed school ratings, extracurriculars, and a map of family-friendly amenities in South Austin. Let me know if you have any other questions!'
    }
  ]
};
