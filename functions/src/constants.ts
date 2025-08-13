
// A simplified version of constants for the backend.
export const SAMPLE_AGENT_DEFAULTS = {
  title: 'Luxury Real Estate Specialist',
  company: 'Prestige Properties',
  phone: '(305) 555-1234',
  socials: [
    { platform: 'Twitter', url: 'https://twitter.com' },
    { platform: 'LinkedIn', url: 'https://linkedin.com' },
  ],
  brandColor: '#0ea5e9',
  logoUrl: '',
  website: 'https://prestigeproperties.com',
  bio: 'With over 15 years of experience in the luxury market, this agent combines deep market knowledge with a passion for client success.',
  mediaLinks: [],
};


export const INITIAL_USER_PROPERTIES_DATA = [
  {
    id: 'prop-demo-1', // This ID is irrelevant on creation
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
    appFeatures: { gallery: true, schools: true, financing: true, virtualTour: true, amenities: true, schedule: true, map: true, history: true, neighborhood: true, reports: true, messaging: true },
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
    appFeatures: { gallery: true, schools: true, financing: true, virtualTour: true, amenities: true, schedule: true, map: true, history: true, neighborhood: true, reports: true, messaging: true },
  },
];
