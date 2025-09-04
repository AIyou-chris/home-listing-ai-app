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
    status: 'new',
    score: 85,
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
    status: 'contacted',
    score: 92,
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
    type: 'showing',
    status: 'confirmed',
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
    type: 'showing',
    status: 'confirmed',
    notes: 'First-time buyer, wants to see pool area and architectural details.'
  }
];

export const DEMO_FAT_INTERACTIONS: Interaction[] = [];

export const DEMO_SEQUENCES: FollowUpSequence[] = [];

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
    { source: 'Website Chat', leads: 12, conversion: 35 },
    { source: 'Property Listings', leads: 8, conversion: 28 },
    { source: 'Social Media', leads: 5, conversion: 20 }
  ],
};
