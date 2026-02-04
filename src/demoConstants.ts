import { Property, Lead, Appointment, Interaction, FollowUpSequence, ActiveLeadFollowUp, AnalyticsData } from './types';
import { SAMPLE_AGENT } from './constants';

const getRelDate = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
};

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
  },
  {
    id: 'demo-3',
    title: 'Luxury Waterfront Condo in Miami',
    address: '450 Ocean Drive, Miami, FL 33139',
    price: 2450000,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1800,
    status: 'Active',
    listedDate: '2024-02-01',
    description: {
      title: 'Oceanfront Living at its Finest',
      paragraphs: [
        'Experience the ultimate Miami lifestyle in this breathtaking oceanfront condo. Floor-to-ceiling windows offer panoramic views of the Atlantic Ocean and the Miami skyline.',
        'The wrap-around balcony is perfect for enjoying the sea breeze and stunning sunsets.'
      ]
    },
    heroPhotos: ['/demo/home-1.png'],
    galleryPhotos: ['/demo/home-1.png'],
    imageUrl: '/demo/home-1.png',
    propertyType: 'Condo',
    features: ['Ocean View', 'Balcony', 'Concierge', 'Gym'],
    appFeatures: { aiChatbot: true, virtualTour: true, scheduleShowing: true },
    agent: SAMPLE_AGENT
  },
  {
    id: 'demo-4',
    title: 'Modern Farmhouse in Nashville',
    address: '892 Heritage Way, Nashville, TN 37205',
    price: 1100000,
    bedrooms: 4,
    bathrooms: 3.5,
    squareFeet: 3200,
    status: 'Active',
    listedDate: '2024-01-25',
    description: {
      title: 'Timeless Charm Meets Modern Luxury',
      paragraphs: [
        'Beautifully crafted modern farmhouse in the desirable West Meade area. High-end finishes throughout.'
      ]
    },
    heroPhotos: ['/demo/home-2.png'],
    galleryPhotos: ['/demo/home-2.png'],
    imageUrl: '/demo/home-2.png',
    propertyType: 'Single Family',
    features: ['Modern Farmhouse', 'Porch', 'Gourmet Kitchen'],
    appFeatures: { aiChatbot: true, virtualTour: true, scheduleShowing: true },
    agent: SAMPLE_AGENT
  }
];

export const DEMO_FAT_LEADS: Lead[] = [
  {
    id: 'lead-demo-1',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '(555) 123-4567',
    status: 'Qualified',
    source: 'Website Chat',
    interestedProperties: ['demo-1'],
    createdAt: getRelDate(-2),
    score: {
      leadId: 'lead-demo-1',
      totalScore: 85,
      scoreHistory: [
        { id: 'se1', eventType: 'Lead Created', points: 10, timestamp: getRelDate(-2), description: 'Initial contact via website' },
        { id: 'se2', eventType: 'Property View', points: 15, timestamp: getRelDate(-2), description: 'Viewed demo-1 listing for 4m 32s' },
        { id: 'se3', eventType: 'Chat Interaction', points: 20, timestamp: getRelDate(-1), description: 'Asked 8 detailed questions about property features' },
        { id: 'se4', eventType: 'Return Visit', points: 10, timestamp: getRelDate(-1), description: 'Returned to view listing 3 more times' },
        { id: 'se5', eventType: 'Virtual Tour Completed', points: 15, timestamp: getRelDate(-1), description: 'Completed full 360° virtual tour' },
        { id: 'se6', eventType: 'Email Opened', points: 5, timestamp: getRelDate(0), description: 'Opened follow-up email within 2 hours' },
        { id: 'se7', eventType: 'Email Link Clicked', points: 10, timestamp: getRelDate(0), description: 'Clicked "Schedule Showing" CTA' }
      ],
      lastUpdated: getRelDate(0),
      tier: 'Qualified'
    },
    lastContact: getRelDate(0),
    lastMessage: 'I love the pool area!',
    date: getRelDate(-2),
    notes: 'Looking for a pool, specifically interested in mid-century architecture.'
  },
  {
    id: 'lead-demo-2',
    name: 'Marcus Chen',
    email: 'marcus.chen@techcorp.com',
    phone: '(555) 987-6543',
    status: 'New',
    source: 'Property Listings',
    interestedProperties: ['demo-2'],
    createdAt: getRelDate(0),
    score: {
      leadId: 'lead-demo-2',
      totalScore: 95,
      scoreHistory: [
        { id: 'se8', eventType: 'Lead Created', points: 10, timestamp: getRelDate(0), description: 'High-intent inquiry via listing page' },
        { id: 'se9', eventType: 'Property View', points: 20, timestamp: getRelDate(0), description: 'Engaged viewing session - 8m 15s' },
        { id: 'se10', eventType: 'Chat Interaction', points: 25, timestamp: getRelDate(0), description: 'Initiated chat immediately, asked about cash offers' },
        { id: 'se11', eventType: 'Form Submission', points: 15, timestamp: getRelDate(0), description: 'Submitted contact form with urgency note' },
        { id: 'se12', eventType: 'Financial Qualification', points: 25, timestamp: getRelDate(0), description: 'Indicated cash buyer, no contingencies' }
      ],
      lastUpdated: getRelDate(0),
      tier: 'Hot'
    },
    lastContact: getRelDate(0),
    lastMessage: 'Is the property still available?',
    date: getRelDate(0),
    notes: 'Moving from SF, cash buyer, needs to move quickly.'
  },
  {
    id: 'lead-demo-3',
    name: 'Sarah Thompson',
    email: 'thompson.family@gmail.com',
    phone: '(555) 234-8901',
    status: 'New',
    source: 'Facebook Ads',
    interestedProperties: ['demo-2'],
    createdAt: getRelDate(-1),
    score: {
      leadId: 'lead-demo-3',
      totalScore: 72,
      scoreHistory: [
        { id: 'se13', eventType: 'Lead Created', points: 10, timestamp: getRelDate(-1), description: 'Facebook ad click-through' },
        { id: 'se14', eventType: 'Property View', points: 12, timestamp: getRelDate(-1), description: 'Browsed listing for 3m 20s' },
        { id: 'se15', eventType: 'Chat Interaction', points: 15, timestamp: getRelDate(-1), description: 'Asked specific questions about schools and neighborhood' },
        { id: 'se16', eventType: 'Research Activity', points: 10, timestamp: getRelDate(-1), description: 'Clicked school ratings and neighborhood insights' },
        { id: 'se17', eventType: 'Return Visit', points: 15, timestamp: getRelDate(0), description: 'Came back to view listing again today' },
        { id: 'se18', eventType: 'Email Opened', points: 10, timestamp: getRelDate(0), description: 'Opened follow-up email with comparable listings' }
      ],
      lastUpdated: getRelDate(0),
      tier: 'Qualified'
    },
    lastContact: getRelDate(-1),
    lastMessage: 'How are the schools in this area?',
    date: getRelDate(-1),
    notes: 'Interested in school ratings and local parks.'
  },
  {
    id: 'lead-demo-4',
    name: 'David Park',
    email: 'd.park@investco.com',
    phone: '(555) 345-6789',
    status: 'Showing',
    source: 'Direct',
    interestedProperties: ['demo-1'],
    createdAt: getRelDate(-5),
    score: {
      leadId: 'lead-demo-4',
      totalScore: 88,
      scoreHistory: [
        { id: 'se19', eventType: 'Lead Created', points: 10, timestamp: getRelDate(-5), description: 'Direct referral from past client' },
        { id: 'se20', eventType: 'Property View', points: 15, timestamp: getRelDate(-5), description: 'Reviewed listing thoroughly - 6m 45s' },
        { id: 'se21', eventType: 'Appointment Scheduled', points: 20, timestamp: getRelDate(-4), description: 'Booked property showing within 24 hours' },
        { id: 'se22', eventType: 'Showing Attended', points: 20, timestamp: getRelDate(-3), description: 'Attended showing, asked detailed questions about ROI' },
        { id: 'se23', eventType: 'Follow-Up Request', points: 13, timestamp: getRelDate(-3), description: 'Requested second viewing and rental comps' },
        { id: 'se24', eventType: 'Research Activity', points: 10, timestamp: getRelDate(-1), description: 'Downloaded property documents and neighborhood report' }
      ],
      lastUpdated: getRelDate(0),
      tier: 'Qualified'
    },
    lastContact: getRelDate(-3),
    lastMessage: 'Can we schedule a second viewing?',
    date: getRelDate(-5),
    notes: 'Investor focus, rental potential is key.'
  },
  {
    id: 'lead-demo-5',
    name: 'Jennifer Martinez',
    email: 'jmartinez@designer.com',
    phone: '(555) 456-7890',
    status: 'New',
    source: 'Zillow',
    interestedProperties: ['demo-1'],
    createdAt: getRelDate(0),
    score: {
      leadId: 'lead-demo-5',
      totalScore: 65,
      scoreHistory: [
        { id: 'se25', eventType: 'Lead Created', points: 10, timestamp: getRelDate(0), description: 'Zillow inquiry' },
        { id: 'se26', eventType: 'Property View', points: 15, timestamp: getRelDate(0), description: 'Browsed listing gallery for 5m 12s' },
        { id: 'se27', eventType: 'Chat Interaction', points: 20, timestamp: getRelDate(0), description: 'Asked about renovation potential and vintage features' },
        { id: 'se28', eventType: 'Document Download', points: 10, timestamp: getRelDate(0), description: 'Downloaded floor plans and property specs' },
        { id: 'se29', eventType: 'Social Share', points: 10, timestamp: getRelDate(0), description: 'Shared listing on Pinterest' }
      ],
      lastUpdated: getRelDate(0),
      tier: 'Warm'
    },
    lastContact: getRelDate(0),
    lastMessage: 'Talk soon!',
    date: getRelDate(0),
    notes: 'Designer looking for a project home with character.'
  },
  {
    id: 'lead-demo-6',
    name: 'Robert Wilson',
    email: 'rwilson@corp.com',
    phone: '(555) 567-8901',
    status: 'New',
    source: 'Website Chat',
    interestedProperties: ['demo-2'],
    createdAt: getRelDate(-1),
    score: {
      leadId: 'lead-demo-6',
      totalScore: 45,
      scoreHistory: [
        { id: 'se30', eventType: 'Lead Created', points: 10, timestamp: getRelDate(-1), description: 'Website chat initiated' },
        { id: 'se31', eventType: 'Property View', points: 10, timestamp: getRelDate(-1), description: 'Brief viewing session - 1m 38s' },
        { id: 'se32', eventType: 'Chat Interaction', points: 15, timestamp: getRelDate(-1), description: 'Asked basic questions about price and location' },
        { id: 'se33', eventType: 'Email Opened', points: 5, timestamp: getRelDate(0), description: 'Opened initial welcome email' },
        { id: 'se34', eventType: 'Return Visit', points: 5, timestamp: getRelDate(0), description: 'Returned to view listing briefly' }
      ],
      lastUpdated: getRelDate(0),
      tier: 'Warm'
    },
    lastContact: getRelDate(-1),
    lastMessage: 'Thanks for the info.',
    date: getRelDate(-1),
    notes: 'Checking out South Austin listings for relocation.'
  }
];

export const DEMO_FAT_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-demo-1',
    leadId: 'lead-demo-2',
    leadName: 'Marcus Chen',
    propertyId: 'demo-2',
    propertyAddress: '156 Maple Grove Lane, Austin, TX',
    date: getRelDate(1),
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
    date: getRelDate(0),
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
    id: 'appt-demo-bb-1',
    leadId: 'lead-demo-5',
    leadName: 'Jennifer Martinez',
    propertyId: 'demo-1',
    propertyAddress: '2847 Sunset Boulevard, Los Angeles, CA',
    date: getRelDate(1),
    time: '11:00',
    type: 'Consultation',
    status: 'Scheduled',
    notes: 'Initial meeting to discuss design vision for her new home.',
    email: 'jmartinez@designer.com',
    phone: '(555) 456-7890',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 120,
    clientReminderMinutes: 1440
  },
  {
    id: 'appt-demo-bb-2',
    leadId: 'lead-demo-6',
    leadName: 'Robert Wilson',
    propertyId: 'demo-2',
    propertyAddress: '156 Maple Grove Lane, Austin, TX',
    date: getRelDate(2),
    time: '13:30',
    type: 'Showing',
    status: 'Scheduled',
    notes: 'Relocation tour - focusing on South Austin vibe.',
    email: 'rwilson@corp.com',
    phone: '(555) 567-8901',
    remindAgent: true,
    remindClient: true,
    agentReminderMinutes: 60,
    clientReminderMinutes: 1440
  },
  {
    id: 'appt-demo-3',
    leadId: 'lead-demo-4',
    leadName: 'David Park',
    propertyId: 'demo-1',
    propertyAddress: '2847 Sunset Boulevard, Los Angeles, CA',
    date: getRelDate(2),
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
    date: getRelDate(2),
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
    date: getRelDate(3),
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
    date: getRelDate(4),
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
    date: getRelDate(1),
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
    date: getRelDate(3),
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
    date: getRelDate(2),
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
    date: getRelDate(5),
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

export const DEMO_FAT_INTERACTIONS: Interaction[] = [
  {
    id: 'int-demo-1',
    sourceType: 'chat-bot-session',
    sourceName: 'Website Chat',
    contact: { name: 'Marcus Chen' },
    message: 'Marcus is asking about local school ratings for the Maple Grove property.',
    timestamp: new Date().toISOString(),
    isRead: false,
    relatedPropertyId: 'demo-2'
  },
  {
    id: 'int-demo-2',
    sourceType: 'listing-inquiry',
    sourceName: 'Zillow',
    contact: { name: 'Emily Rodriguez' },
    message: 'New inquiry for 2847 Sunset Boulevard: "Does the pool have a heater?"',
    timestamp: getRelDate(0) + 'T14:30:00Z',
    isRead: true,
    relatedPropertyId: 'demo-1'
  },
  {
    id: 'int-demo-3',
    sourceType: 'marketing-reply',
    sourceName: 'Email Campaign',
    contact: { name: 'David Park' },
    message: 'David replied to the "Market Watch" email: "Interested in the rental yield for Silver Lake."',
    timestamp: getRelDate(-1) + 'T09:15:00Z',
    isRead: false,
    relatedPropertyId: 'demo-1'
  },
  {
    id: 'int-demo-4',
    sourceType: 'chat-bot-session',
    sourceName: 'Lead Capture Form',
    contact: { name: 'Jennifer Martinez' },
    message: 'Jennifer completed the "Home Story" questionnaire for Nashville.',
    timestamp: getRelDate(0) + 'T16:45:00Z',
    isRead: false,
    relatedPropertyId: 'demo-4'
  }
];

export const DEMO_SEQUENCES: FollowUpSequence[] = [
  {
    id: 'welcome-new-leads',
    name: 'Welcome New Leads',
    description: 'Instant welcome + AI concierge hand-off for every brand-new inquiry.',
    triggerType: 'Lead Capture',
    isActive: true,
    analytics: {
      totalLeads: 247,
      emailsSent: 494,
      emailsOpened: 383,
      emailsClicked: 241,
      tasksCompleted: 172,
      meetingsScheduled: 89,
      appointmentsBooked: 67,
      responsesReceived: 198,
      openRate: 77.5,
      clickRate: 48.8,
      responseRate: 40.1,
      appointmentRate: 27.1,
      avgResponseTime: 4.2,
      lastUpdated: new Date().toISOString()
    },
    steps: [
      {
        id: 'welcome-email-1',
        type: 'email',
        delay: { value: 2, unit: 'minutes' },
        subject: 'Welcome to Your Personal Real Estate Concierge ✨',
        content: `Hi {{lead.name}},

Thanks for reaching out! I'm excited to help you navigate your real estate journey.

🤖 **Meet Your 24/7 AI Concierge**
I've built a personalized AI assistant just for you that can answer questions instantly, share property insights, and help you explore listings at your own pace—even at 2 AM!

👉 **Access Your AI Card Here:** {{agent.aiCardUrl || agent.website}}

**What You Can Do Inside:**
✅ Browse handpicked properties matched to your interests
✅ Get instant answers to buying/selling questions  
✅ Schedule a consultation with me directly
✅ Explore neighborhood insights, schools, and market trends
✅ Save your favorite listings and get instant alerts

**Pro Tip:** Try asking the AI about mortgage rates, closing costs, or what makes a neighborhood great. It's trained on my expertise and local market knowledge!

I'm here whenever you need me—reply to this email, call {{agent.phone}}, or chat with the AI concierge anytime.

Looking forward to finding your perfect home!

Best,  
{{agent.name}}  
{{agent.title}}  
{{agent.company}}  
📱 {{agent.phone}}  
🌐 {{agent.website}}

---
*P.S. Your AI card also has a QR code you can share with friends—help them find their dream home too!*`
      },
      {
        id: 'welcome-email-2',
        type: 'email',
        delay: { value: 1, unit: 'days' },
        subject: '🏡 Quick Tour of Your AI Tools + Next Steps',
        content: `Hi {{lead.name}},

Hope you had a chance to explore your AI concierge! I wanted to highlight a few features clients love:

**🎯 Smart Property Matching**  
The AI learns what you like and suggests new listings automatically. Just tell it your must-haves (bedrooms, location, budget) and it curates a personalized feed.

**📅 Instant Scheduling**  
No more phone tag! Book property tours, virtual walkthroughs, or consultation calls directly through your AI card—syncs right to my calendar.

**💡 Ask Anything**  
"What's the average price per square foot in [neighborhood]?"  
"How much should I budget for closing costs?"  
"What's the market like for first-time buyers?"  
The AI has answers based on current market data and my local expertise.

**📲 Mobile-Friendly**  
Save your AI card to your phone's home screen for instant access. It works like an app!

**Ready to dive deeper?** Reply with a good time this week for a quick call—I love walking clients through the features and creating a custom home search plan.

Or just keep exploring on your own. Either way, I'm here!

Cheers,  
{{agent.name}}

---
*Quick Question: What's your #1 priority right now? (Finding the right neighborhood, understanding financing, timeline planning, etc.) Hit reply and let me know!*`
      },
      {
        id: 'welcome-task-call',
        type: 'task',
        delay: { value: 2, unit: 'days' },
        content: 'Call {{lead.name}} to confirm their goals and highlight key AI card features they should explore. Ask about timeline, budget range, and must-haves.'
      }
    ]
  },
  {
    id: 'new-homebuyer-sprint',
    name: 'New Homebuyer Sprint',
    description: 'Four-touch buyer nurture that moves prospects from wishlist to scheduled tours.',
    triggerType: 'Buyer Lead',
    isActive: true,
    analytics: {
      totalLeads: 189,
      emailsSent: 756,
      emailsOpened: 612,
      emailsClicked: 445,
      tasksCompleted: 156,
      meetingsScheduled: 102,
      appointmentsBooked: 84,
      responsesReceived: 167,
      openRate: 81.0,
      clickRate: 58.9,
      responseRate: 44.4,
      appointmentRate: 44.4,
      avgResponseTime: 6.8,
      lastUpdated: new Date().toISOString()
    },
    steps: [
      {
        id: 'buyer-email-1',
        type: 'email',
        delay: { value: 1, unit: 'days' },
        subject: '🔑 Let\'s Build Your Dream Home Wishlist',
        content: `Hi {{lead.name}},

I loved hearing about your interest in {{property.address}}! To make sure I find you the perfect match, let's dial in your wishlist.

**Quick Wishlist Builder:**  
Just reply with these details (or chat with your AI concierge to save them automatically):

🏠 **Budget Range:** What's comfortable for you?  
🛏️ **Bedrooms/Bathrooms:** Minimum you need?  
📍 **Neighborhoods:** Any must-have areas or areas to avoid?  
⭐ **Must-Haves:** Pool? Updated kitchen? Large yard? Home office?  
⏰ **Timeline:** Looking to move ASAP or exploring for later?

**🎯 Why This Matters:**  
Once I have your wishlist, I can:
• Set up **instant alerts** for new listings that match (you'll know before they hit Zillow!)
• **Pre-screen properties** so we only tour the best fits
• **Negotiate smarter** because I know exactly what you value
• **Track market trends** in your target neighborhoods

**Bonus:** I'm running comparative market analysis on {{property.address}} right now. I'll send over pricing insights, recent sales, and whether it's a good deal in tomorrow's email.

Reply here or update your preferences in your AI concierge—it's already learning what you like!

Let's find your dream home,  
{{agent.name}}  
📱 {{agent.phone}}

---
*P.S. Know anyone else house hunting? Forward them your AI card—it's designed to help!*`
      },
      {
        id: 'buyer-email-2',
        type: 'email',
        delay: { value: 3, unit: 'days' },
        subject: '🏡 Fresh Matches + Market Insights You Should See',
        content: `Hi {{lead.name}},

Great news! I found a few properties that check your boxes. Here's what I handpicked for you:

**🎯 Your Personalized Matches:**

**1. {{personalized.match1.address}}** *(Just listed!)*  
• {{personalized.match1.beds}} bed, {{personalized.match1.baths}} bath | {{personalized.match1.sqft}} sq ft  
• \${{personalized.match1.price}} | {{personalized.match1.pricePerSqFt}}/sq ft  
• Why it's a match: {{personalized.match1.reason}}  
👉 View interactive listing: {{personalized.match1.url}}

**2. {{personalized.match2.address}}** *(Open house this weekend)*  
• {{personalized.match2.beds}} bed, {{personalized.match2.baths}} bath | {{personalized.match2.sqft}} sq ft  
• \${{personalized.match2.price}} | {{personalized.match2.pricePerSqFt}}/sq ft  
• Why it's a match: {{personalized.match2.reason}}  
👉 View interactive listing: {{personalized.match2.url}}

**3. {{personalized.match3.address}}** *(Price just reduced!)*  
• {{personalized.match3.beds}} bed, {{personalized.match3.baths}} bath | {{personalized.match3.sqft}} sq ft  
• \${{personalized.match3.price}} | {{personalized.match3.pricePerSqFt}}/sq ft  
• Why it's a match: {{personalized.match3.reason}}  
👉 View interactive listing: {{personalized.match3.url}}

**📊 Market Intel:**  
• Average days on market: {{market.avgDaysOnMarket}} days (moving fast!)  
• Homes in your range: {{market.activeListings}} active listings  
• Competition level: {{market.competitionLevel}}  
• Trend: Prices {{market.priceDirection}} by {{market.priceChange}}% this month

**Ready to tour?** I can arrange back-to-back showings this week. Just reply with which properties excite you most, or pick times in your AI card scheduler.

**Not quite right?** Let me know what to adjust and I'll refine the search!

Your dream home is out there,  
{{agent.name}}

---
*💡 Pro Tip: Each listing has an AI assistant that can answer specific questions about the property, neighborhood, schools, and more. Click the links above to try it!*`
      },
      {
        id: 'buyer-task-checkin',
        type: 'task',
        delay: { value: 5, unit: 'days' },
        content: 'Call or text {{lead.name}} to confirm interest level and schedule tours based on shared matches. Ask if they\'ve explored the interactive listings and if criteria needs adjustment.'
      },
      {
        id: 'buyer-email-3',
        type: 'email',
        delay: { value: 10, unit: 'days' },
        subject: '🚨 Market Alert: Opportunities You Can\'t Miss',
        content: `Hi {{lead.name}},

The market shifted this week in your favor—here's the insider scoop:

**📈 Market Update for {{market.area}}:**  
• **List-to-Sale Ratio:** {{market.listToSale}}% (sellers getting {{market.listToSaleDirection}})  
• **New Listings This Week:** {{market.newListings}} properties hit the market  
• **Under Contract:** {{market.underContract}} homes (including 2 similar to {{property.address}})  
• **Inventory Trend:** {{market.inventoryTrend}}

**💰 What This Means for You:**  
{{#if market.buyerAdvantage}}
✅ **Buyer's market conditions** — More negotiating power  
✅ **New financing incentives** may lower your monthly payments by \${{market.paymentSavings}}  
✅ **Less competition** on well-priced homes  
{{else}}
⚠️ **Competitive market** — Good homes are moving in {{market.avgDaysOnMarket}} days  
⚠️ **Act fast** on properties you love  
⚠️ **Strong offers win** — pre-approval is essential  
{{/if}}

**🔥 Hot Picks That Just Dropped:**  
I'm tracking {{market.watchlistCount}} new properties that match your criteria. Want me to send the top 3, or should we line up tours this weekend?

**📅 Next Steps:**  
1. **Get pre-approved** (if you haven't already) — I can connect you with a great lender  
2. **Tour your top choices** before someone else does  
3. **Set real-time alerts** so you never miss a new listing

Reply with "SEND PICKS" and I'll share this week's best opportunities. Or click here to schedule your tours: {{agent.schedulingUrl}}

Staying ahead of the market with you,  
{{agent.name}}  
📱 {{agent.phone}}  
🌐 {{agent.aiCardUrl}}

---
*📊 Want deeper market insights? Ask your AI concierge: "What's the forecast for [your target neighborhood]?" It pulls live MLS data and trends!*`
      }
    ]
  },
  {
    id: 'listing-prospecting',
    name: 'Listing Prospecting Push',
    description: 'Seller-focused drip that tees up a pricing review and listing consultation.',
    triggerType: 'Seller Lead',
    isActive: true,
    analytics: {
      totalLeads: 134,
      emailsSent: 536,
      emailsOpened: 461,
      emailsClicked: 312,
      tasksCompleted: 98,
      meetingsScheduled: 67,
      appointmentsBooked: 52,
      responsesReceived: 109,
      openRate: 86.0,
      clickRate: 58.2,
      responseRate: 81.3,
      appointmentRate: 38.8,
      avgResponseTime: 8.3,
      lastUpdated: new Date().toISOString()
    },
    steps: [
      {
        id: 'seller-email-1',
        type: 'email',
        delay: { value: 30, unit: 'minutes' },
        subject: '💎 Your Home\'s Selling Game Plan Starts Here',
        content: `Hi {{lead.name}},

Thanks for reaching out about {{property.address}}! I'm already pulling together a value snapshot for you.

**🎯 The 3 Levers That Help My Sellers Get Above Asking:**

**1. Strategic Pricing** 📊  
Not just a guess—I use micro-neighborhood data, recent comps, and buyer behavior trends to price your home where it'll attract multiple offers (not sit on the market).

**2. Story-Driven Marketing** 📸  
Your home deserves more than generic MLS photos:
• Professional photography & twilight shots
• Cinematic property video & virtual tour
• Custom AI listing page with 24/7 concierge for buyers
• QR code campaigns for open houses
• Social media blitz to my 10K+ local followers

**3. Pre-Market Buzz** 🚀  
I launch homes strategically:
• VIP preview to my buyer network before going live
• Coming soon campaigns that build urgency
• Private showings to pre-qualified buyers
• Launch day designed to create competition

**📅 Let's Talk Strategy:**  
I'd love to walk you through how this would work for {{property.address}}. I can also share what similar homes sold for and the net proceeds you'd walk away with.

**Book a 15-minute consultation here:** {{agent.schedulingUrl}}  
Or just reply with a good time this week!

**Quick Question:** What's your ideal timeline? Selling ASAP or exploring options for later?

Looking forward to helping you maximize your sale,  
{{agent.name}}  
{{agent.title}}  
📱 {{agent.phone}}  
🌐 {{agent.website}}

---
*P.S. I'm sending you a personalized market report in 2-3 days. It'll show exactly what homes like yours are selling for in your neighborhood.*`
      },
      {
        id: 'seller-email-2',
        type: 'email',
        delay: { value: 3, unit: 'days' },
        subject: '📊 See What Homes Like Yours Are Selling For',
        content: `Hi {{lead.name}},

As promised, here's your personalized market report for {{property.address}}!

**🏘️ Recent Sales in Your Neighborhood:**

**Comparable #1:** {{market.comp1.address}}  
• Sold {{market.comp1.daysAgo}} days ago for **\${{market.comp1.price}}**  
• {{market.comp1.beds}} bed, {{market.comp1.baths}} bath | {{market.comp1.sqft}} sq ft  
• Price per sq ft: \${{market.comp1.pricePerSqFt}}  
• Days on market: {{market.comp1.dom}} days  
• Why it matters: {{market.comp1.notes}}

**Comparable #2:** {{market.comp2.address}}  
• Sold {{market.comp2.daysAgo}} days ago for **\${{market.comp2.price}}**  
• {{market.comp2.beds}} bed, {{market.comp2.baths}} bath | {{market.comp2.sqft}} sq ft  
• Price per sq ft: \${{market.comp2.pricePerSqFt}}  
• Days on market: {{market.comp2.dom}} days  
• Why it matters: {{market.comp2.notes}}

**Comparable #3:** {{market.comp3.address}}  
• Sold {{market.comp3.daysAgo}} days ago for **\${{market.comp3.price}}**  
• {{market.comp3.beds}} bed, {{market.comp3.baths}} bath | {{market.comp3.sqft}} sq ft  
• Price per sq ft: \${{market.comp3.pricePerSqFt}}  
• Days on market: {{market.comp3.dom}} days  
• Why it matters: {{market.comp3.notes}}

**📈 Market Momentum:**  
• Average sale price: {{market.avgPrice}}% of list price  
• Average days on market: {{market.avgDOM}} days  
• Seller's market strength: {{market.sellerStrength}}/10  
• Current demand for {{market.propertyType}}: {{market.demandLevel}}

**💰 Estimated Value Range for {{property.address}}:**  
Based on current comps and condition: **\${{market.estimatedLow}} - \${{market.estimatedHigh}}**

*(This is a preliminary range. I'll bring a full pricing model with recommended list price, upgrades to consider, and net proceeds calculator to our consultation.)*

**💡 What Could Maximize Your Sale Price:**  
• {{market.upgrade1}} — Potential ROI: {{market.upgrade1ROI}}  
• {{market.upgrade2}} — Potential ROI: {{market.upgrade2ROI}}  
• {{market.upgrade3}} — Potential ROI: {{market.upgrade3ROI}}

**Ready to review the full strategy?**  
Let's schedule a consultation so I can tailor the plan to your goals and timeline.

📅 **Book here:** {{agent.schedulingUrl}}  
📱 **Or call/text:** {{agent.phone}}

Excited to help you capture top dollar!  
{{agent.name}}

---
*🤖 Questions? Ask my AI concierge at {{agent.aiCardUrl}} — it can answer common selling questions 24/7!*`
      },
      {
        id: 'seller-task-appointment',
        type: 'task',
        delay: { value: 5, unit: 'days' },
        content: 'Call {{lead.name}} to confirm CMA delivery and schedule an in-person or virtual listing consultation. Bring updated comps, pricing strategy, and marketing preview.'
      },
      {
        id: 'seller-email-3',
        type: 'email',
        delay: { value: 8, unit: 'days' },
        subject: '🚀 Marketing Preview: How We\'ll Spotlight Your Home',
        content: `Hi {{lead.name}},

I wanted to give you a sneak peek at how {{property.address}} will shine when we go to market!

**📸 Visual Storytelling Package:**  
✅ **Professional Photography** — Bright, magazine-quality shots that make buyers stop scrolling  
✅ **Twilight Photos** — That golden-hour magic that sells luxury  
✅ **Cinematic Video Tour** — 60-90 second highlight reel for social media  
✅ **3D Virtual Tour** — Let buyers explore every room from their couch  
✅ **Drone Aerial Shots** — Showcase the property, yard, and neighborhood (if applicable)

**🤖 AI-Powered Listing Page:**  
Your home gets a custom landing page with:
• Interactive photo gallery & virtual tour
• 24/7 AI concierge that answers buyer questions instantly
• One-click scheduling for private showings
• QR code for yard signs, flyers, and open houses
• Tracks buyer engagement (who viewed, how long, what they asked)

**📱 Social & Digital Blitz:**  
• **Facebook/Instagram Ads** — Targeted to qualified buyers in your price range  
• **Email Campaign** — Sent to my 500+ active buyer database  
• **Coming Soon Teasers** — Build buzz before we go live  
• **Stories & Reels** — Behind-the-scenes content leading up to launch  
• **Influencer Network** — Shared with local real estate influencers

**🏠 Open House Strategy:**  
• **Pre-Launch VIP Preview** — Private showings for pre-qualified buyers  
• **Launch Weekend Blitz** — Multiple open houses to create urgency  
• **QR Code Check-In** — Every visitor gets instant access to the AI listing page  
• **Follow-Up Automation** — AI nurtures leads + I follow up personally

**📊 What This Actually Does:**  
• Attracts **3-5x more qualified buyers** than standard MLS listings  
• Creates **competition** that drives up offers  
• Reduces days on market by **40% on average**  
• Increases final sale price by **2-7%** compared to traditional marketing

**📅 Ready to launch?**  
Let's review the full checklist together:
• Staging recommendations (if any)
• Photography schedule
• Pricing strategy
• Launch timeline

**Book your listing consultation:** {{agent.schedulingUrl}}  
Or reply with questions!

Can't wait to showcase your home,  
{{agent.name}}  
📱 {{agent.phone}}  
🌐 {{agent.website}}

---
*💡 Want to see examples? Ask my AI concierge to "Show me your recent listings" — it'll pull up live examples with all the bells and whistles!*`
      }
    ]
  },
  {
    id: 'post-showing-follow-up',
    name: 'Post-Showing Follow Up',
    description: 'High-touch follow up once a lead has toured a home so nothing falls through the cracks.',
    triggerType: 'Property Viewed',
    isActive: true,
    analytics: {
      totalLeads: 312,
      emailsSent: 624,
      emailsOpened: 543,
      emailsClicked: 398,
      tasksCompleted: 287,
      meetingsScheduled: 156,
      appointmentsBooked: 134,
      responsesReceived: 276,
      openRate: 87.0,
      clickRate: 63.8,
      responseRate: 88.5,
      appointmentRate: 42.9,
      avgResponseTime: 2.1,
      lastUpdated: new Date().toISOString()
    },
    steps: [
      {
        id: 'postshowing-email-1',
        type: 'email',
        delay: { value: 1, unit: 'hours' },
        subject: '🏡 Thanks for Touring {{property.address}} Today!',
        content: `Hi {{lead.name}},

Loved walking through {{property.address}} with you today! Here's everything we discussed (plus a few extras I thought you'd find helpful):

**🏠 Property Highlights You Reacted To:**  
✓ {{showing.highlight1}}  
✓ {{showing.highlight2}}  
✓ {{showing.highlight3}}

**📋 Info You Asked Me to Pull:**  
• **School ratings:** {{showing.schools}}  
• **Neighborhood insights:** {{showing.neighborhood}}  
• **Recent comps:** {{showing.comps}}  
• **HOA details:** {{showing.hoa}}  
• **Property history:** {{showing.history}}

**📸 Quick Recap Gallery:**  
I snapped a few photos during our tour to help you remember the space—check them out here: {{showing.galleryUrl}}

**💰 Offer Strategy (If You're Interested):**  
• **List price:** \${{property.price}}  
• **Estimated competitive offer range:** \${{showing.offerLow}} - \${{showing.offerHigh}}  
• **Seller motivation:** {{showing.sellerMotivation}}  
• **Days on market:** {{showing.dom}} days  
• **Other interest:** {{showing.otherInterest}}

If you want to move forward, I can:
1. Run updated comps to validate the price
2. Prep a competitive offer with strategic terms
3. Coordinate inspection and appraisal timeline
4. Negotiate on your behalf to get the best deal

**🤔 Still Deciding?**  
No pressure! Take your time. If another property caught your eye during our conversation, just drop the address here and I'll add it to our tour list.

**Next Steps:**  
Just reply with one of these:
• "LET'S MAKE AN OFFER" — I'll prep the paperwork today  
• "SEND MORE INFO" — I'll pull additional research  
• "KEEP LOOKING" — I'll line up more showings  
• "NEED TIME" — No problem, I'm here when you're ready

Looking forward to finding your perfect home!  
{{agent.name}}  
📱 {{agent.phone}}

---
*P.S. Your AI concierge has all this info saved too—ask it anything about {{property.address}} anytime!*`
      },
      {
        id: 'postshowing-reminder',
        type: 'reminder',
        delay: { value: 1, unit: 'days' },
        content: 'Text {{lead.name}} with the highlight reel from {{property.address}} plus financing or comps they asked about. Check if they want to see more properties or discuss offer strategy.'
      },
      {
        id: 'postshowing-email-2',
        type: 'email',
        delay: { value: 2, unit: 'days' },
        subject: '🔍 Next Showing Ideas + Offer Strategy',
        content: `Hi {{lead.name}},

Hope you've had time to think about {{property.address}}! Based on what stood out to you during the tour, I queued up a few alternatives that check the same boxes:

**🎯 Properties You Might Also Love:**

**Option 1:** {{showing.alt1.address}}  
• Similar vibe: {{showing.alt1.similarity}}  
• Better: {{showing.alt1.pros}}  
• Trade-off: {{showing.alt1.cons}}  
• Price: \${{showing.alt1.price}}  
👉 View listing: {{showing.alt1.url}}

**Option 2:** {{showing.alt2.address}}  
• Similar vibe: {{showing.alt2.similarity}}  
• Better: {{showing.alt2.pros}}  
• Trade-off: {{showing.alt2.cons}}  
• Price: \${{showing.alt2.price}}  
👉 View listing: {{showing.alt2.url}}

**Option 3:** {{showing.alt3.address}}  
• Similar vibe: {{showing.alt3.similarity}}  
• Better: {{showing.alt3.pros}}  
• Trade-off: {{showing.alt3.cons}}  
• Price: \${{showing.alt3.price}}  
👉 View listing: {{showing.alt3.url}}

**Want to tour them this week?** I can line up back-to-back showings. Just reply with which ones interest you!

**Still thinking about {{property.address}}?**  
I'm happy to walk you through offer strategy anytime. I can prep numbers, discuss contingencies, and show you what a competitive offer looks like.

**📊 Market Update:**  
• {{showing.marketUpdate1}}  
• {{showing.marketUpdate2}}  
• {{showing.marketUpdate3}}

**Ready to move forward?**  
📅 Schedule your next tour: {{agent.schedulingUrl}}  
💬 Or just reply—I'm here!

Finding your perfect match,  
{{agent.name}}

---
*💡 Not sure which property is the best fit? Ask your AI concierge to "Compare {{property.address}} with [other address]" — it'll show side-by-side analysis!*`
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
    id: 'conv-demo-welcome',
    contactName: 'AI Concierge',
    contactEmail: 'concierge@homelisting.ai',
    contactPhone: '',
    type: 'chat',
    lastMessage: 'Welcome! I am here to help you manage your conversations.',
    timestamp: new Date().toISOString(),
    duration: null,
    status: 'active',
    messageCount: 1,
    property: 'Dashboard',
    tags: ['Welcome', 'System'],
    intent: 'Onboarding',
    language: 'English',
    followUpTask: null
  },
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
  'conv-demo-welcome': [
    {
      id: 'msg-welcome-1',
      sender: 'ai',
      channel: 'chat',
      timestamp: new Date().toISOString(),
      text: 'Welcome to your AI Conversations Inbox! 🚀\n\nHere you can see how I interact with your leads, handle objections, and schedule appointments.\n\nTry exporting a CSV, filtering by "Voice", or check the "Deep Dive" panel to see transcripts and translations.\n\nYou can delete this message when you are ready to start!'
    }
  ],
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

import { LeadStatsResponse } from './state/useLeadAnalyticsStore';

export const DEMO_ANALYTICS_STATS: LeadStatsResponse = {
  total: 6,
  new: 3,
  qualified: 2,
  contacted: 3,
  showing: 1,
  lost: 0,
  conversionRate: 16.7,
  scoreStats: {
    averageScore: 71.7,
    qualified: 2,
    hot: 1,
    warm: 2,
    cold: 1,
    highestScore: 95
  }
};

export const DEMO_LEAD_SOURCES = [
  { sourceName: 'Website Chat', leadCount: 2, conversionRate: 50.0, hotCount: 1 },
  { sourceName: 'Property Listings', leadCount: 1, conversionRate: 100.0, hotCount: 1 },
  { sourceName: 'Facebook Ads', leadCount: 1, conversionRate: 0.0, hotCount: 0 },
  { sourceName: 'Direct', leadCount: 1, conversionRate: 0.0, hotCount: 0 },
  { sourceName: 'Zillow', leadCount: 1, conversionRate: 0.0, hotCount: 0 }
];

export const DEMO_SCORE_TIERS = [
  {
    id: 'Hot',
    min: 90,
    max: 120,
    description: 'Ready for fast-track follow up; has timeline, budget, and a scheduled touchpoint.'
  },
  {
    id: 'Qualified',
    min: 70,
    max: 89,
    description: 'Shared key buying signals and engaged with AI concierge at least twice.'
  },
  {
    id: 'Warm',
    min: 40,
    max: 69,
    description: 'Provided preferences but still needs nurturing automation to progress.'
  },
  {
    id: 'Cold',
    min: 0,
    max: 39,
    description: 'Minimal activity captured. Keep inside the long-term nurture sequence.'
  }
];

export const DEMO_SCORING_RULES = [
  {
    id: 'intake-form',
    name: 'Completed AI Intake Form',
    description: 'Lead filled out the AI concierge questionnaire with move timeline + budget.',
    points: 25,
    category: 'Intent Signals'
  },
  {
    id: 'home-save',
    name: 'Saved A Property',
    description: 'Lead favorited or shared at least one listing inside the AI card.',
    points: 15,
    category: 'Engagement'
  },
  {
    id: 'tour-request',
    name: 'Requested A Tour',
    description: 'Lead tapped “Book A Tour” or proposed times for an in-person/virtual walkthrough.',
    points: 30,
    category: 'Transaction Ready'
  },
  {
    id: 'funds-verified',
    name: 'Uploaded Pre-Approval Or Proof Of Funds',
    description: 'Lead confirmed buying power via lender letter or cash verification.',
    points: 35,
    category: 'Qualification'
  },
  {
    id: 'agent-call',
    name: 'Agent Logged Live Call',
    description: 'Team member logged a voice conversation with detailed notes.',
    points: 20,
    category: 'Manual Touch'
  }
];

export const DEMO_SEQUENCE_SNAPSHOTS = [
  {
    id: 'welcome',
    name: 'Universal Welcome Drip',
    goal: 'Capture intent in first 48h',
    replyRate: 32,
    openRate: 68,
    meetings: 5,
    trend: 'up',
    lastAdjust: '2 days ago',
    bestStep: 'Day 1 Check-In'
  },
  {
    id: 'buyer',
    name: 'Homebuyer Journey',
    goal: 'Move buyers to tour requests',
    replyRate: 24,
    openRate: 45,
    meetings: 3,
    trend: 'flat',
    lastAdjust: '5 days ago',
    bestStep: 'Curated Matches'
  },
  {
    id: 'listing',
    name: 'AI-Powered Seller Funnel',
    goal: 'Convert CMAs to listings',
    replyRate: 18,
    openRate: 52,
    meetings: 2,
    trend: 'down',
    lastAdjust: 'Yesterday',
    bestStep: 'Interactive Listing Draft'
  },
  {
    id: 'post',
    name: 'After-Showing Follow-Up',
    goal: 'Secure second tours',
    replyRate: 41,
    openRate: 73,
    meetings: 8,
    trend: 'up',
    lastAdjust: '9 days ago',
    bestStep: 'Comparables Drop'
  }
];
