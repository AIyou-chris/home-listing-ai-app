import { Property, Lead, Appointment, Interaction, FollowUpSequence, ActiveLeadFollowUp, AnalyticsData, AgentProfile } from '../types';
import { SAMPLE_AGENT } from '../constants';
import { DEMO_FAT_PROPERTIES, DEMO_SEQUENCES } from '../demoConstants';

// --- AGENT BLUEPRINT CONSTANTS ---
// This file defines the clean slate state for new agents or the "Blueprint Dashboard".

export const BLUEPRINT_AGENT: AgentProfile = {
    ...SAMPLE_AGENT,
    id: 'blueprint-agent',
    name: 'Your Name',
    title: 'Real Estate Agent',
    company: 'Your Agency',
    headshotUrl: '', // No headshot
    bio: 'This is where your professional bio will appear.',
    phone: '(555) 000-0000',
    email: 'agent@example.com',
    website: 'www.yourwebsite.com',
    brandColor: '#0ea5e9', // Default Blue
    slug: 'blueprint'
};


// 1. Listings: Keep 1 Example Home
// 1. Listings: Demo Listing to show capabilities
export const BLUEPRINT_PROPERTIES: Property[] = [
    {
        id: 'blueprint-demo-listing',
        title: 'Example AI Listing (Start Here!)',
        address: '123 Inspiration Way, Future City, CA 90210',
        price: 1250000,
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2800,
        propertyType: 'Single Family',
        status: 'Active',
        description: {
            title: 'Experience the Future of Real Estate 🚀',
            paragraphs: [
                "This is a demo listing designed to show you what's possible with HomeListingAI.",
                "Click 'Edit' to customize this property, or click 'View Live' to see the public AI microsite.",
                "The 'Talk to the Home' button on the public page uses the details you enter here to answer buyer questions instantly."
            ]
        },
        features: ['Smart Home System', 'AI Concierge', 'Modern Architecture', 'Pool'],
        heroPhotos: ['https://images.unsplash.com/photo-1600596542815-27b5c0c8aa0b?auto=format&fit=crop&w=1600&q=80'],
        imageUrl: 'https://images.unsplash.com/photo-1600596542815-27b5c0c8aa0b?auto=format&fit=crop&w=1600&q=80', // Legacy fallback
        galleryPhotos: [
            'https://images.unsplash.com/photo-1600596542815-27b5c0c8aa0b?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80'
        ],
        agent: BLUEPRINT_AGENT,
        ctaContactMode: 'sidekick', // Enables AI Chat
        ctaListingUrl: 'https://example.com/property/123',
        agentId: 'blueprint-agent',
        appFeatures: {
            gallery: true,
            schools: true,
            financing: true,
            virtualTour: true,
            amenities: true,
            schedule: true,
            map: true,
            history: true,
            neighborhood: true,
            reports: true,
            messaging: true
        }
    }
];

// 2. Leads: Clear out (0 leads)
export const BLUEPRINT_LEADS: Lead[] = [];

// 3. Appointments: Clear out (0 appointments)
export const BLUEPRINT_APPOINTMENTS: Appointment[] = [];

// 4. Interactions: Clear out
export const BLUEPRINT_INTERACTIONS: Interaction[] = [];

// 5. Funnels: Keep as is (Full automation ready to go)
export const BLUEPRINT_SEQUENCES: FollowUpSequence[] = DEMO_SEQUENCES;

// 6. Active Follow-ups: Clear
export const BLUEPRINT_ACTIVE_FOLLOWUPS: ActiveLeadFollowUp[] = [];

// 7. Analytics: Reset to Zero state
export const BLUEPRINT_ANALYTICS_DATA: AnalyticsData = {
    performanceOverview: {
        newLeads: 0,
        conversionRate: 0,
        appointmentsSet: 0,
        avgAiResponseTime: "0s",
        leadFunnel: {
            leadsCaptured: 0,
            aiQualified: 0,
            contactedByAgent: 0,
            appointmentsSet: 0,
        },
    },
    leadSourceAnalysis: [],
};

// 8. Conversations: Keep only the Welcome Message
export const BLUEPRINT_CONVERSATIONS = [
    {
        id: 'conv-blueprint-welcome',
        contactName: 'AI Concierge',
        contactEmail: 'concierge@homelistingai.com',
        contactPhone: '',
        type: 'chat',
        lastMessage: 'Welcome to your AI Conversations Inbox! 🚀\n\nHere you can see how I interact with your leads, handle objections, and schedule appointments.\n\nTry exporting a CSV, filtering by "Voice", or check the "Deep Dive" panel to see transcripts and translations.\n\nYou can delete this message when you are ready to start!',
        timestamp: new Date().toISOString(),
        duration: null,
        status: 'active',
        messageCount: 1,
        property: 'Dashboard',
        tags: ['Welcome', 'System'],
        intent: 'Onboarding',
        language: 'English',
        followUpTask: null
    }
];

export const BLUEPRINT_MESSAGES = {
    'conv-blueprint-welcome': [
        {
            id: 'msg-welcome-1',
            sender: 'ai',
            channel: 'chat',
            timestamp: new Date().toISOString(),
            text: 'Welcome to your AI Conversations Inbox! 🚀\n\nHere you can see how I interact with your leads, handle objections, and schedule appointments.\n\nTry exporting a CSV, filtering by "Voice", or check the "Deep Dive" panel to see transcripts and translations.\n\nYou can delete this message when you are ready to start!'
        }
    ]
};
