import { School, Lead, Appointment, Interaction, Conversation, SocialPost, AgentProfile, AIVoice, KnowledgeBasePriority, PersonalityTest, AIAssignment } from './types';
import type { AgentTask, AIPersonality } from './types';

export const SAMPLE_AGENT: AgentProfile = {
  name: 'Sarah Johnson',
  slug: 'sarah-johnson',
  title: 'Luxury Real Estate Specialist',
  company: 'Prestige Properties',
  phone: '(305) 555-1234',
  email: 'sarah.j@prestigeprop.com',
  headshotUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&auto=format&fit=crop',
  socials: [
    { platform: 'Twitter', url: 'https://twitter.com' },
    { platform: 'LinkedIn', url: 'https://linkedin.com' },
  ],
  brandColor: '#0ea5e9', // a nice sky blue
  language: 'en',
  logoUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?q=80&w=200&h=80&auto=format&fit=crop&crop=center', // Professional real estate logo placeholder
  website: 'https://prestigeproperties.com',
  bio: 'With over 15 years of experience in the luxury market, Sarah Johnson combines deep market knowledge with a passion for client success. Her dedication and expertise make her a trusted advisor for buyers and sellers of distinguished properties.'
};

export const SAMPLE_SCHOOLS: School[] = [
  { name: 'Bayview Elementary School', type: 'Public', grades: 'K-5', rating: 4.5, distance: 1.2 },
  { name: 'Sunset Middle School', type: 'Public', grades: '6-8', rating: 4.2, distance: 2.5 },
  { name: 'Oceanfront High School', type: 'Public', grades: '9-12', rating: 4.8, distance: 3.1 },
  { name: 'St. Mary\'s Preparatory', type: 'Private', grades: 'K-12', rating: 4.9, distance: 4.5 },
];


export const SAMPLE_LEADS: Lead[] = [];

export const SAMPLE_APPOINTMENTS: Appointment[] = [
    { id: 'appt1', type: 'Showing', date: '08/16/2025', time: '10:00 AM', leadId: 'lead1', propertyId: 'prop1', notes: 'Client interested in seeing the master suite and backyard.' },
    { id: 'appt2', type: 'Consultation', date: '08/17/2025', time: '2:00 PM', leadId: 'lead2', propertyId: 'prop2', notes: 'Initial meeting to discuss property requirements.' },
    { id: 'appt3', type: 'Open House', date: '08/18/2025', time: '1:00 PM', leadId: 'lead3', propertyId: 'prop3', notes: 'Multiple parties expected.' },
    { id: 'appt4', type: 'Virtual Tour', date: '08/19/2025', time: '11:30 AM', leadId: 'lead4', propertyId: 'prop4', notes: 'Client is currently overseas, will conduct tour via video call.' },
    { id: 'appt5', type: 'Follow-up', date: '08/20/2025', time: '3:00 PM', leadId: 'lead5', propertyId: 'prop5', notes: 'Discuss offer terms and next steps.' },
];

export const SAMPLE_CONVERSATIONS: Conversation[] = [
    { id: 'convo1', title: 'Generate report for Miami Villa', messages: [{sender: 'user', text: 'Generate a market analysis report for the property at 742 Ocean Drive.'}], lastUpdated: '5m ago'},
    { id: 'convo2', title: 'Blog post ideas', messages: [{sender: 'user', text: 'Give me 5 blog post ideas for first-time homebuyers.'}], lastUpdated: '1h ago'},
    { id: 'convo3', title: 'Draft social media post', messages: [{sender: 'user', text: 'Draft an exciting instagram post for the new listing in Miami.'}], lastUpdated: '3h ago'},
];

export const SAMPLE_INTERACTIONS: Interaction[] = [
     {
        id: 'inter1', sourceType: 'listing-inquiry', sourceName: '742 Ocean Drive',
        contact: { name: 'John Doe', avatarUrl: 'https://i.pravatar.cc/150?img=1' },
        message: "Is the price on the Miami villa negotiable? Also, what are the annual taxes?",
        timestamp: "15m ago", isRead: false, relatedPropertyId: 'prop-demo-1'
    },
    {
        id: 'inter2', sourceType: 'chat-bot-session', sourceName: 'Website Chatbot',
        contact: { name: 'Emily White' }, message: "Hi, I'd like to know more about the amenities at the Chicago loft.",
        timestamp: "1h ago", isRead: false, relatedPropertyId: 'prop-demo-3'
    },
    {
        id: 'inter3', sourceType: 'marketing-reply', sourceName: 'Facebook Ad - Aspen',
        contact: { name: 'Chris Green', avatarUrl: 'https://i.pravatar.cc/150?img=5' },
        message: "Replied to your ad: 'Is the Aspen cabin available for ski season rentals?'",
        timestamp: "8h ago", isRead: true, relatedPropertyId: 'prop-demo-4'
    },
];

export const SAMPLE_SOCIAL_POSTS: SocialPost[] = [
    { id: 'sp1', propertyId: 'prop-demo-1', propertyAddress: '742 Ocean Drive, Miami Beach, FL', platforms: ['instagram', 'facebook'], content: 'Dreaming of ocean views? Your dream is now a reality. ✨ Presenting 742 Ocean Drive, a modern masterpiece in Miami Beach. #miamirealestate #luxuryhomes #oceanfront', imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=800&auto=format&fit=crop', status: 'scheduled', postAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'sp2', propertyId: 'prop-demo-2', propertyAddress: '101 Chestnut Street, San Francisco, CA', platforms: ['linkedin'], content: 'A unique investment opportunity in San Francisco\'s historic district. 101 Chestnut Street combines timeless elegance with modern amenities, offering significant value appreciation potential for discerning buyers.', imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800&auto=format&fit=crop', status: 'posted', postAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

export const SAMPLE_TASKS: AgentTask[] = [
    { id: 'task1', text: 'Follow up with Jane Smith about property viewing', isCompleted: false, dueDate: '2025-08-12', priority: 'High' },
    { id: 'task2', text: 'Prepare CMA for 742 Ocean Drive', isCompleted: false, dueDate: '2025-08-13', priority: 'Medium' },
    { id: 'task3', text: 'Update listing photos for Chicago loft', isCompleted: true, dueDate: '2025-08-11', priority: 'Medium' },
    { id: 'task4', text: 'Schedule home inspection for Aspen cabin', isCompleted: false, dueDate: '2025-08-14', priority: 'High' },
    { id: 'task5', text: 'Send market update newsletter to clients', isCompleted: false, dueDate: '2025-08-15', priority: 'Low' }
];

export const AI_PERSONALITIES: AIPersonality[] = [
    {
        id: 'pers-1',
        name: 'Professional Real Estate Expert',
        description: 'A knowledgeable and authoritative voice with deep market expertise',
        traits: ['Professional', 'Knowledgeable', 'Authoritative', 'Trustworthy', 'Detail-oriented'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'This property offers exceptional value with its prime location, recent upgrades, and strong rental potential. The current market conditions and projected appreciation make it an excellent investment opportunity.'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'Based on recent comparable sales in this neighborhood, this property is priced competitively at 5% below market value. The unique features and upgrades provide additional value not found in similar listings.'
            }
        ]
    },
    {
        id: 'pers-2',
        name: 'Friendly Guide',
        description: 'A warm and approachable assistant who makes clients feel comfortable',
        traits: ['Friendly', 'Approachable', 'Patient', 'Encouraging', 'Supportive'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'I\'m excited to share why this property is such a great find! It\'s in a wonderful neighborhood with excellent schools, and the recent renovations really make it shine. Plus, the investment potential is fantastic!'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'Great question! I\'ve looked at similar homes in the area, and this one really stands out. It\'s priced very competitively, and you\'re getting so much more value for your money. Would you like me to show you the details?'
            }
        ]
    },
    {
        id: 'pers-3',
        name: 'Marketing Specialist',
        description: 'A creative and enthusiastic voice focused on highlighting property benefits',
        traits: ['Creative', 'Enthusiastic', 'Persuasive', 'Innovative', 'Results-driven'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'This property is an absolute GEM! 🏠✨ With its stunning curb appeal, premium finishes, and unbeatable location, it\'s a dream investment that practically sells itself. The ROI potential is off the charts!'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'This property is in a league of its own! 💎 While other homes in the area are just houses, this is a lifestyle upgrade. The attention to detail and premium features make it the clear winner in its price range.'
            }
        ]
    },
    {
        id: 'pers-4',
        name: 'Analytical Advisor',
        description: 'A data-driven expert who provides detailed market insights',
        traits: ['Analytical', 'Data-driven', 'Precise', 'Thorough', 'Objective'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'Based on my analysis of market data, this property shows a 12.3% annual appreciation rate, 8.7% rental yield potential, and is located in a high-growth corridor. The numbers clearly indicate strong investment viability.'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'My comparative market analysis shows this property is priced 7.2% below the median for comparable homes in this area. The price per square foot is $247 vs. the neighborhood average of $267, representing significant value.'
            }
        ]
    },
    {
        id: 'pers-5',
        name: 'Luxury Concierge',
        description: 'A sophisticated and premium service-oriented assistant',
        traits: ['Sophisticated', 'Premium', 'Service-oriented', 'Discrete', 'Exclusive'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'This exceptional property represents the pinnacle of luxury real estate investment. Its prestigious address, unparalleled amenities, and exclusive features create a truly distinguished investment opportunity for discerning clients.'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'This property transcends typical market comparisons. While other properties may offer similar square footage, none can match the level of sophistication, privacy, and exclusivity that this residence provides to its fortunate owners.'
            }
        ]
    }
];

export const AI_VOICES: AIVoice[] = [
    { 
        id: 'jordan', 
        name: 'Jordan (Professional)', 
        description: 'Clear, confident, and authoritative voice perfect for business interactions',
        gender: 'male',
        accent: 'American',
        sampleUrl: '/samples/jordan-sample.mp3'
    },
    { 
        id: 'morgan', 
        name: 'Morgan (Friendly)', 
        description: 'Warm, approachable voice that puts clients at ease',
        gender: 'female',
        accent: 'American',
        sampleUrl: '/samples/morgan-sample.mp3'
    },
    { 
        id: 'cameron', 
        name: 'Cameron (Casual)', 
        description: 'Relaxed and conversational tone for informal interactions',
        gender: 'neutral',
        accent: 'American',
        sampleUrl: '/samples/cameron-sample.mp3'
    },
    { 
        id: 'alex', 
        name: 'Alex (Energetic)', 
        description: 'Dynamic and enthusiastic voice for engaging presentations',
        gender: 'male',
        accent: 'American',
        sampleUrl: '/samples/alex-sample.mp3'
    },
    { 
        id: 'taylor', 
        name: 'Taylor (Warm)', 
        description: 'Gentle and reassuring voice for sensitive conversations',
        gender: 'female',
        accent: 'American',
        sampleUrl: '/samples/taylor-sample.mp3'
    },
    { 
        id: 'sophia', 
        name: 'Sophia (Luxury)', 
        description: 'Sophisticated and refined voice for premium properties',
        gender: 'female',
        accent: 'British',
        sampleUrl: '/samples/sophia-sample.mp3'
    },
    { 
        id: 'marcus', 
        name: 'Marcus (Analytical)', 
        description: 'Clear and precise voice for data-driven discussions',
        gender: 'male',
        accent: 'American',
        sampleUrl: '/samples/marcus-sample.mp3'
    }
];

export const KNOWLEDGE_BASE_PRIORITIES: KnowledgeBasePriority[] = [
    {
        id: 'agent-priority',
        name: 'Agent Knowledge Base',
        description: 'Company policies, scripts, expertise',
        weights: { agent: 0.8, listing: 0.1, marketing: 0.1 }
    },
    {
        id: 'listing-priority',
        name: 'Listing Knowledge Base',
        description: 'Property details, floor plans, features',
        weights: { agent: 0.1, listing: 0.8, marketing: 0.1 }
    },
    {
        id: 'marketing-priority',
        name: 'Market Knowledge Base',
        description: 'Market data, comps, trends',
        weights: { agent: 0.1, listing: 0.1, marketing: 0.8 }
    },
    {
        id: 'balanced-priority',
        name: 'Balanced',
        description: 'Equal weight to all knowledge bases',
        weights: { agent: 0.33, listing: 0.33, marketing: 0.34 }
    },
    {
        id: 'dynamic-priority',
        name: 'Dynamic',
        description: 'Adapts based on conversation context',
        weights: { agent: 0.4, listing: 0.3, marketing: 0.3 }
    }
];

export const PERSONALITY_TEST_QUESTIONS: PersonalityTest[] = [
    {
        id: 'test-1',
        question: 'How would you describe your ideal client interaction?',
        responses: [
            { id: 'resp-1-1', text: 'Professional and data-driven', personalityId: 'pers-1' },
            { id: 'resp-1-2', text: 'Warm and personal', personalityId: 'pers-2' },
            { id: 'resp-1-3', text: 'Creative and exciting', personalityId: 'pers-3' },
            { id: 'resp-1-4', text: 'Analytical and thorough', personalityId: 'pers-4' },
            { id: 'resp-1-5', text: 'Sophisticated and exclusive', personalityId: 'pers-5' }
        ]
    },
    {
        id: 'test-2',
        question: 'What tone should your AI assistant use when discussing properties?',
        responses: [
            { id: 'resp-2-1', text: 'Authoritative and knowledgeable', personalityId: 'pers-1' },
            { id: 'resp-2-2', text: 'Friendly and encouraging', personalityId: 'pers-2' },
            { id: 'resp-2-3', text: 'Enthusiastic and persuasive', personalityId: 'pers-3' },
            { id: 'resp-2-4', text: 'Precise and objective', personalityId: 'pers-4' },
            { id: 'resp-2-5', text: 'Premium and sophisticated', personalityId: 'pers-5' }
        ]
    },
    {
        id: 'test-3',
        question: 'How should your AI handle client objections?',
        responses: [
            { id: 'resp-3-1', text: 'Provide detailed explanations with facts', personalityId: 'pers-1' },
            { id: 'resp-3-2', text: 'Listen empathetically and offer reassurance', personalityId: 'pers-2' },
            { id: 'resp-3-3', text: 'Highlight benefits and create excitement', personalityId: 'pers-3' },
            { id: 'resp-3-4', text: 'Present data and comparative analysis', personalityId: 'pers-4' },
            { id: 'resp-3-5', text: 'Address concerns with discretion and class', personalityId: 'pers-5' }
        ]
    }
];

export const DEFAULT_AI_ASSIGNMENTS: AIAssignment[] = [
    {
        id: 'listing-sidekick',
        name: 'Listing Sidekick',
        type: 'listing',
        description: 'Specializes in home listings and property-specific information',
        knowledgePriority: 'listing',
        status: 'active'
    },
    {
        id: 'agent-sidekick',
        name: 'Agent Sidekick',
        type: 'agent',
        description: 'Represents the real estate agent and handles sales conversations',
        knowledgePriority: 'agent',
        status: 'active'
    },
    {
        id: 'helper-sidekick',
        name: 'Helper Sidekick',
        type: 'helper',
        description: 'Helps agents navigate the dashboard and maximize ROI',
        knowledgePriority: 'balanced',
        status: 'active'
    },
    {
        id: 'marketing-sidekick',
        name: 'Marketing Sidekick',
        type: 'marketing',
        description: 'Creates blogs, social posts, email copy, and campaigns',
        knowledgePriority: 'marketing',
        status: 'active'
    },
    {
        id: 'sales-sidekick',
        name: 'Sales Sidekick',
        type: 'sales',
        description: 'Handles sales scripts, objections, and follow-ups',
        knowledgePriority: 'agent',
        status: 'active'
    },
    {
        id: 'god-sidekick',
        name: 'God Mode Sidekick',
        type: 'god',
        description: 'Meta assistant that coordinates other sidekicks when needed',
        knowledgePriority: 'dynamic',
        status: 'active'
    }
];

