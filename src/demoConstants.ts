import { Property, Lead, Appointment, Interaction, AgentProfile, FollowUpSequence, ActiveLeadFollowUp, AnalyticsData } from './types';
import { SAMPLE_AGENT } from './constants';

export const DEMO_FAT_PROPERTIES: Property[] = [
  {
    id: 'prop-demo-1',
    title: 'Stunning Modern Villa with Ocean Views',
    address: '742 Ocean Drive, Miami Beach, FL 33139',
    propertyType: 'Single-Family Home',
    price: 3250000,
    beds: 5,
    baths: 5.5,
    sqft: 4800,
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=800&auto=format&fit=crop',
    description: "Experience luxury living in this breathtaking modern villa. Featuring floor-to-ceiling windows with panoramic ocean views, an infinity pool, and state-of-the-art amenities. Perfect for entertaining.",
    features: ['Infinity Pool', 'Ocean Views', 'Gourmet Kitchen', 'Home Theater', 'Rooftop Terrace', '3-Car Garage'],
    heroPhotos: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=800&auto=format&fit=crop'],
    appFeatures: { gallery: true, videoTour: true, droneFootage: true, amenities: true, neighborhood: true, schedule: true, financing: true, history: true, schools: true, virtualTour: true },
    agent: SAMPLE_AGENT,
  },
  {
    id: 'prop-demo-2',
    title: 'Charming Victorian in Historic District',
    address: '101 Chestnut Street, San Francisco, CA 94133',
    propertyType: 'Single-Family Home',
    price: 2100000,
    beds: 4,
    baths: 3,
    sqft: 2600,
    imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800&auto=format&fit=crop',
    description: "A beautifully preserved Victorian home in the heart of the historic district. This property blends classic charm with modern conveniences, featuring original woodwork, a remodeled kitchen, and a lovely garden.",
    features: ['Historic Charm', 'Remodeled Kitchen', 'Private Garden', 'Bay Windows', 'Walkable Location', 'Hardwood Floors'],
    heroPhotos: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800&auto=format&fit=crop'],
    appFeatures: { gallery: true, videoTour: false, droneFootage: false, amenities: true, neighborhood: true, schedule: true, financing: true, history: true, schools: true, virtualTour: true },
    agent: SAMPLE_AGENT,
  },
  {
    id: 'prop-demo-3',
    title: 'Sleek Downtown Loft',
    address: '33 W Hubbard St, Chicago, IL 60654',
    propertyType: 'Condo',
    price: 850000,
    beds: 2,
    baths: 2,
    sqft: 1750,
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800&auto=format&fit=crop',
    description: "Live in the center of it all in this stylish downtown loft. With an open floor plan, exposed brick walls, and massive windows, this space is perfect for urban living. Building amenities include a gym and rooftop deck.",
    features: ['Open Floor Plan', 'Exposed Brick', 'City Views', 'Fitness Center', 'Rooftop Deck', 'Walk-in Closets'],
    heroPhotos: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800&auto=format&fit=crop'],
    appFeatures: { gallery: true, videoTour: true, droneFootage: false, amenities: true, neighborhood: true, schedule: true, financing: true, history: false, schools: false, virtualTour: true },
    agent: SAMPLE_AGENT,
  },
  {
    id: 'prop-demo-4',
    title: 'Cozy Mountain Cabin Retreat',
    address: '45 Wishing Well Lane, Aspen, CO 81611',
    propertyType: 'Single-Family Home',
    price: 1500000,
    beds: 3,
    baths: 2,
    sqft: 2200,
    imageUrl: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=800&auto=format&fit=crop',
    description: "Escape to this cozy mountain cabin, your perfect year-round retreat. Enjoy stunning mountain views from the large deck, a stone fireplace, and easy access to skiing and hiking trails.",
    features: ['Mountain Views', 'Stone Fireplace', 'Large Deck', 'Ski-in/Ski-out Access', 'Hot Tub', 'Vaulted Ceilings'],
    heroPhotos: ['https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=800&auto=format&fit=crop'],
    appFeatures: { gallery: true, videoTour: true, droneFootage: true, amenities: true, neighborhood: true, schedule: true, financing: false, history: false, schools: true, virtualTour: false },
    agent: SAMPLE_AGENT,
  },
  {
    id: 'prop-demo-5',
    title: 'Suburban Family Home with Great Schools',
    address: '1234 Maple Avenue, Plano, TX 75075',
    propertyType: 'Single-Family Home',
    price: 675000,
    beds: 4,
    baths: 3.5,
    sqft: 3200,
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
    description: "The perfect family home in a top-rated school district. This spacious home features a large backyard with a pool, a game room, and an updated kitchen. Located on a quiet, tree-lined street.",
    features: ['Swimming Pool', 'Game Room', 'Top School District', 'Updated Kitchen', 'Large Backyard', '3-Car Garage'],
    heroPhotos: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop'],
    appFeatures: { gallery: true, videoTour: false, droneFootage: false, amenities: true, neighborhood: true, schedule: true, financing: true, history: true, schools: true, virtualTour: true },
    agent: SAMPLE_AGENT,
  },
  {
    id: 'prop-demo-6',
    title: 'Eco-Friendly Modern Farmhouse',
    address: '987 Sustainable Way, Austin, TX 78704',
    propertyType: 'Single-Family Home',
    price: 980000,
    beds: 3,
    baths: 2.5,
    sqft: 2400,
    imageUrl: 'https://images.unsplash.com/photo-1600585152225-358EA60c75a6?q=80&w=800&auto=format&fit=crop',
    description: "A stunning example of sustainable living. This modern farmhouse boasts solar panels, a rainwater collection system, and reclaimed materials, all without sacrificing style or comfort. Features a chef's kitchen and a screened-in porch.",
    features: ['Solar Panels', 'Rainwater Collection', 'Reclaimed Materials', "Chef's Kitchen", 'Screened-in Porch', 'Energy Efficient'],
    heroPhotos: ['https://images.unsplash.com/photo-1600585152225-358EA60c75a6?q=80&w=800&auto=format&fit=crop'],
    appFeatures: { gallery: true, videoTour: true, droneFootage: false, amenities: true, neighborhood: true, schedule: true, financing: true, history: false, schools: true, virtualTour: false },
    agent: SAMPLE_AGENT,
  }
];

export const DEMO_FAT_LEADS: Lead[] = [
    { id: 'lead-d1', name: 'Michael Scott', status: 'New', email: 'm.scott@example.com', phone: '(555) 111-2222', date: '8/5/2025', lastMessage: "Interested in the Miami villa. Is the price negotiable?" },
    { id: 'lead-d2', name: 'Pam Beesly', status: 'Qualified', email: 'p.beesly@example.com', phone: '(555) 222-3333', date: '8/5/2025', lastMessage: "Pre-approved for $900k, looking for a condo in Chicago." },
    { id: 'lead-d3', name: 'Jim Halpert', status: 'Contacted', email: 'j.halpert@example.com', phone: '(555) 333-4444', date: '8/4/2025', lastMessage: "Left voicemail regarding the Aspen cabin." },
    { id: 'lead-d4', name: 'Dwight Schrute', status: 'New', email: 'd.schrute@example.com', phone: '(555) 444-5555', date: '8/4/2025', lastMessage: "Does the farmhouse have sufficient acreage for beet farming?" },
    { id: 'lead-d5', name: 'Angela Martin', status: 'Showing', email: 'a.martin@example.com', phone: '(555) 555-6666', date: '8/3/2025', lastMessage: "Scheduled a showing for the Victorian home for this Saturday." },
    { id: 'lead-d6', name: 'Kevin Malone', status: 'Lost', email: 'k.malone@example.com', phone: '(555) 666-7777', date: '8/3/2025', lastMessage: "Decided to keep renting for another year." },
    { id: 'lead-d7', name: 'Andy Bernard', status: 'New', email: 'a.bernard@example.com', phone: '(555) 777-8888', date: '8/2/2025', lastMessage: "Looking for a property with good acoustics for my acapella group." },
    { id: 'lead-d8', name: 'Stanley Hudson', status: 'Qualified', email: 's.hudson@example.com', phone: '(555) 888-9999', date: '8/2/2025', lastMessage: "Only interested in properties with a short commute." },
];

export const DEMO_FAT_APPOINTMENTS: Appointment[] = [
    { id: 'appt-d1', type: 'Showing', date: 'August 9, 2025', time: '10:00 AM', leadId: 'lead-d1', propertyId: 'prop1', notes: 'Interested in seeing the master suite' },
    { id: 'appt-d2', type: 'Virtual Tour', date: 'August 9, 2025', time: '2:00 PM', leadId: 'lead-d2', propertyId: 'prop2', notes: 'International buyer - virtual tour scheduled' },
    { id: 'appt-d3', type: 'Consultation', date: 'August 10, 2025', time: '11:30 AM', leadId: 'lead-d3', propertyId: 'prop3', notes: 'Initial consultation to discuss requirements' },
    { id: 'appt-d4', type: 'Open House', date: 'August 11, 2025', time: '1:00 PM', leadId: 'lead-d4', propertyId: 'prop4', notes: 'Open house event - multiple interested parties' },
    { id: 'appt-d5', type: 'Follow-up', date: 'August 12, 2025', time: '4:00 PM', leadId: 'lead-d5', propertyId: 'prop5', notes: 'Follow-up meeting to discuss offer terms' },
];

export const DEMO_FAT_INTERACTIONS: Interaction[] = [
    {
        id: 'inter-d1', sourceType: 'listing-inquiry', sourceName: '742 Ocean Drive',
        contact: { name: 'Michael Scott', avatarUrl: 'https://i.pravatar.cc/150?img=3' },
        message: "Is the price on the Miami villa negotiable? Also, what are the annual taxes?",
        timestamp: "15m ago", isRead: false, relatedPropertyId: 'prop-demo-1'
    },
    {
        id: 'inter-d2', sourceType: 'chat-bot-session', sourceName: 'Website Chatbot',
        contact: { name: 'Pam Beesly' }, message: "Hi, I'd like to know more about the amenities at the Chicago loft.",
        timestamp: "1h ago", isRead: false, relatedPropertyId: 'prop-demo-3'
    },
    {
        id: 'inter-d3', sourceType: 'marketing-reply', sourceName: 'Facebook Ad - Aspen',
        contact: { name: 'Jim Halpert', avatarUrl: 'https://i.pravatar.cc/150?img=5' },
        message: "Replied to your ad: 'Is the Aspen cabin available for ski season rentals?'",
        timestamp: "8h ago", isRead: true, relatedPropertyId: 'prop-demo-4'
    },
    {
        id: 'inter-d4', sourceType: 'listing-inquiry', sourceName: '987 Sustainable Way',
        contact: { name: 'Dwight Schrute', avatarUrl: 'https://i.pravatar.cc/150?img=7' },
        message: "Inquiry about soil quality and water rights for the Austin farmhouse.",
        timestamp: "1d ago", isRead: true, relatedPropertyId: 'prop-demo-6'
    }
];

export const DEMO_SEQUENCES: FollowUpSequence[] = [
    {
        id: 'seq-1',
        name: 'New Online Lead (Aggressive)',
        description: 'A fast-paced sequence to engage new online leads from sources like Zillow or Realtor.com.',
        triggerType: 'Lead Capture',
        isActive: true,
        steps: [
            { id: 'step-1-1', type: 'email', delay: { value: 5, unit: 'minutes' }, subject: 'Regarding your inquiry for {{property.address}}', content: 'Hi {{lead.name}},\n\nThanks for your interest in {{property.address}}. Are you available for a quick chat about it sometime today?' },
            { id: 'step-1-2', type: 'task', delay: { value: 1, unit: 'hours' }, content: 'Call {{lead.name}} at {{lead.phone}} regarding their inquiry for {{property.address}}.' },
            { id: 'step-1-3', type: 'ai-email', delay: { value: 1, unit: 'days' }, content: 'Follow up on their interest in the kitchen and suggest a showing.' },
            { id: 'step-1-4', type: 'email', delay: { value: 2, unit: 'days' }, subject: 'Following up on {{property.address}}', content: 'Hi {{lead.name}},\n\nJust wanted to follow up on the beautiful property at {{property.address}}. It has some amazing features. Would you be interested in a private showing this week?' },
        ]
    },
    {
        id: 'seq-2',
        name: 'Open House Guest Follow-Up',
        description: 'A friendly sequence to nurture leads who attended an open house.',
        triggerType: 'Custom',
        isActive: true,
        steps: [
            { id: 'step-2-1', type: 'email', delay: { value: 2, unit: 'hours' }, subject: 'Thanks for visiting the open house!', content: 'Hi {{lead.name}},\n\nIt was great to meet you today at {{property.address}}. What were your thoughts on the home? I\'d be happy to answer any questions you might have.' },
            { id: 'step-2-2', type: 'email', delay: { value: 2, unit: 'days' }, subject: 'Other properties you might like', content: 'Hi {{lead.name}},\n\nBased on your interest in {{property.address}}, I thought you might also like these other listings in the area. [Link to other listings]. Let me know if any catch your eye!' },
            {
                id: 'step-2-3',
                type: 'meeting',
                delay: { value: 5, unit: 'days' },
                content: 'Discuss their property search and financing options. Prepare CMA.',
                meetingDetails: { date: '2025-08-15', time: '14:00', location: '123 Main St Office' },
            },
        ]
    },
    {
        id: 'seq-3',
        name: 'Long-Term Nurture (6 Months)',
        description: 'A slow-drip campaign for cold leads to keep you top-of-mind over the long term.',
        triggerType: 'Custom',
        isActive: false,
        steps: [
            { id: 'step-3-1', type: 'email', delay: { value: 30, unit: 'days' }, subject: 'Local Market Update', content: 'Hi {{lead.name}},\n\nJust wanted to share a quick update on the local real estate market...' },
            { id: 'step-3-2', type: 'email', delay: { value: 30, unit: 'days' }, subject: 'Helpful Homeowner Tip', content: 'Hi {{lead.name}},\n\nHere is a useful tip for maintaining your home this season...' },
        ]
    }
];

export const DEMO_ACTIVE_FOLLOWUPS: ActiveLeadFollowUp[] = [
    {
        id: 'afu-1',
        leadId: 'lead-d1',
        sequenceId: 'seq-1',
        status: 'active',
        currentStepIndex: 1,
        nextStepDate: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        history: [
            { id: 'h-1-1', type: 'enroll', description: 'Enrolled in "New Online Lead (Aggressive)"', date: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
            { id: 'h-1-2', type: 'email-sent', description: 'Email 1 Sent: "Regarding your inquiry..."', date: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
            { id: 'h-1-3', type: 'email-opened', description: 'Email 1 Opened', date: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
        ],
    },
    {
        id: 'afu-2',
        leadId: 'lead-d3',
        sequenceId: 'seq-2',
        status: 'paused',
        currentStepIndex: 0,
        nextStepDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        history: [
            { id: 'h-2-1', type: 'enroll', description: 'Enrolled in "Open House Guest Follow-Up"', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'h-2-2', type: 'pause', description: 'Sequence paused by agent.', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        ],
    },
    {
        id: 'afu-3',
        leadId: 'lead-d4',
        sequenceId: 'seq-1',
        status: 'active',
        currentStepIndex: 2,
        nextStepDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        history: [
            { id: 'h-3-1', type: 'enroll', description: 'Enrolled in "New Online Lead (Aggressive)"', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'h-3-2', type: 'email-sent', description: 'Email 1 Sent: "Regarding your inquiry..."', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 5 * 60000).toISOString() },
            { id: 'h-3-3', type: 'task-created', description: 'Task created: Call Dwight Schrute', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 60 * 60000).toISOString() },
        ],
    },
];

export const DEMO_ANALYTICS_DATA: AnalyticsData = {
  performanceOverview: {
    newLeads: 124,
    conversionRate: 18.5,
    appointmentsSet: 23,
    avgAiResponseTime: "32s",
    leadFunnel: {
      leadsCaptured: 124,
      aiQualified: 88,
      contactedByAgent: 52,
      appointmentsSet: 23,
    },
  },
  leadSourceAnalysis: [
    { sourceName: 'AI App: 742 Ocean Drive', icon: 'app', leadCount: 45, conversionRate: 22.2 },
    { sourceName: 'AI App: 101 Chestnut St', icon: 'app', leadCount: 28, conversionRate: 14.3 },
    { sourceName: 'Facebook Ad - Summer Campaign', icon: 'facebook', leadCount: 22, conversionRate: 9.1 },
    { sourceName: 'Zillow Import', icon: 'zillow', leadCount: 18, conversionRate: 27.8 },
    { sourceName: 'Manual Entry (Open House)', icon: 'manual', leadCount: 11, conversionRate: 36.4 },
  ],
};
