import { Property, AgentProfile } from '../types';
import { SAMPLE_AGENT } from '../constants';

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
