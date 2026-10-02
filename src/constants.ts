import { AgentProfile } from './types';
import type { AIPersonality } from './types';

export const EMPTY_AGENT: AgentProfile = {
    name: '',
    slug: '',
    title: '',
    company: '',
    phone: '',
    email: '',
    headshotUrl: undefined,
    socials: [],
    brandColor: '#0ea5e9',
    language: 'en',
    logoUrl: undefined,
    website: '',
    bio: ''
};

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

export const DEMO_AI_CARD_PROFILE = {
    id: 'demo-ai-card',
    fullName: 'Sarah Johnson',
    professionalTitle: 'Luxury Real Estate Specialist',
    company: 'Prestige Properties',
    phone: '(305) 555-1234',
    email: 'sarah.j@prestigeprop.com',
    website: 'https://prestigeproperties.com',
    bio: 'With over 15 years of experience in the luxury market, Sarah Johnson combines deep market knowledge with a passion for client success. Her dedication and expertise make her a trusted advisor for buyers and sellers of distinguished properties.',
    brandColor: '#0ea5e9',
    language: 'en',
    socialMedia: {
        facebook: 'https://facebook.com/sarahjohnsonrealestate',
        instagram: 'https://instagram.com/sarahjohnson_realtor',
        twitter: 'https://twitter.com/sarahjrealtor',
        linkedin: 'https://linkedin.com/in/sarah-johnson-realtor',
        youtube: 'https://youtube.com/@sarahjohnsonhomes'
    },
    headshot: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&h=400&auto=format&fit=crop',
    logo: '/newlogo.png'
};

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

