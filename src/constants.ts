import { School, Lead, Appointment, Interaction, Conversation, SocialPost, AgentProfile } from './types';
import type { AgentTask, AIPersonality } from './types';

export const SAMPLE_AGENT: AgentProfile = {
  name: 'Sarah Johnson',
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
  logoUrl: '', // Let's leave this empty to avoid finding a fake logo
  website: 'https://prestigeproperties.com',
  bio: 'With over 15 years of experience in the luxury market, Sarah Johnson combines deep market knowledge with a passion for client success. Her dedication and expertise make her a trusted advisor for buyers and sellers of distinguished properties.'
};

export const SAMPLE_SCHOOLS: School[] = [
  { name: 'Bayview Elementary School', type: 'Public', grades: 'K-5', rating: 4.5, distance: 1.2 },
  { name: 'Sunset Middle School', type: 'Public', grades: '6-8', rating: 4.2, distance: 2.5 },
  { name: 'Oceanfront High School', type: 'Public', grades: '9-12', rating: 4.8, distance: 3.1 },
  { name: 'St. Mary\'s Preparatory', type: 'Private', grades: 'K-12', rating: 4.9, distance: 4.5 },
];


export const SAMPLE_LEADS: Lead[] = [
    { id: 'lead1', name: 'John Doe', status: 'New', email: 'john.d@example.com', phone: '(555) 123-4567', date: '08/15/2025', lastMessage: 'Interested in the property on Ocean Drive. What is the HOA fee?' },
    { id: 'lead2', name: 'Jane Smith', status: 'Qualified', email: 'jane.s@example.com', phone: '(555) 987-6543', date: '08/14/2025', lastMessage: 'Pre-approved for $3M, looking for ocean views.' },
    { id: 'lead3', name: 'Sam Wilson', status: 'Contacted', email: 'sam.w@example.com', phone: '(555) 555-5555', date: '08/14/2025', lastMessage: 'Left a voicemail. Seems interested in scheduling a tour this weekend.' },
    { id: 'lead4', name: 'Maria Garcia', status: 'Showing', email: 'maria.g@example.com', phone: '(555) 111-2222', date: '08/13/2025', lastMessage: 'Showing scheduled for Saturday at 2 PM.' },
    { id: 'lead5', name: 'Alex Thompson', status: 'Lost', email: 'alex.t@example.com', phone: '(555) 333-4444', date: '08/12/2025', lastMessage: 'Decided to buy in a different neighborhood.' },
];

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
        name: 'Professional Real Estate Expert'
    },
    {
        id: 'pers-2',
        name: 'Friendly Guide'
    },
    {
        id: 'pers-3',
        name: 'Marketing Specialist'
    }
];

export const AI_VOICES = [
  { id: 'jordan', name: 'Jordan (Professional)' },
  { id: 'morgan', name: 'Morgan (Friendly)' },
  { id: 'cameron', name: 'Cameron (Casual)' },
  { id: 'alex', name: 'Alex (Energetic)' },
  { id: 'taylor', name: 'Taylor (Warm)' }
];

