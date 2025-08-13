export interface AgentProfile {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  headshotUrl: string;
  socials: { platform: 'Twitter' | 'Pinterest' | 'LinkedIn' | 'YouTube' | 'Facebook' | 'Instagram'; url: string }[];
  brandColor?: string;
  logoUrl?: string;
  website?: string;
  bio?: string;
}

export interface AIDescription {
  title: string;
  paragraphs: string[];
}

export function isAIDescription(description: any): description is AIDescription {
  return description && typeof description === 'object' && typeof description.title === 'string' && Array.isArray(description.paragraphs);
}

export type View = 'dashboard' | 'analytics' | 'listings' | 'leads' | 'property' | 'add-listing' | 'inbox' | 'ai-content' | 'knowledge-base' | 'marketing' | 'settings' | 'demo-dashboard' | 'landing' | 'signup' | 'signin' | 'admin-dashboard';

export interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  status?: 'Active' | 'Pending' | 'Sold';
  listedDate?: string;
  description: string | AIDescription;
  heroPhotos: (string | File)[];
  galleryPhotos?: (string | File)[];
  appFeatures: { [key: string]: boolean };
  agent: AgentProfile;
  propertyType: string;
  features: string[];
  imageUrl: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface School {
  name: string;
  type: 'Public' | 'Private' | 'Charter';
  grades: string;
  rating: number;
  distance: number;
}

export interface MarketData {
    analysisText: string;
    sources: { uri: string; title: string }[];
}

export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin';

export interface AIBlogPost {
    title: string;
    body: string; // HTML content
}

export type LeadStatus = 'New' | 'Qualified' | 'Contacted' | 'Showing' | 'Lost';

export interface Lead {
    id: string;
    name: string;
    status: LeadStatus;
    email: string;
    phone: string;
    date: string;
    lastMessage: string;
}

export interface Appointment {
    id: string;
    type: 'Showing' | 'Consultation' | 'Open House' | 'Virtual Tour' | 'Follow-up';
    date: string;
    time: string;
    leadId: string;
    propertyId: string;
    notes: string;
    status?: 'Scheduled' | 'Completed' | 'Cancelled';
    leadName?: string;
    propertyAddress?: string;
}

export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    lastUpdated: string;
}

export type InteractionSourceType = 'listing-inquiry' | 'marketing-reply' | 'chat-bot-session';

export interface Interaction {
    id: string;
    sourceType: InteractionSourceType;
    sourceName: string;
    contact: { name: string; avatarUrl?: string };
    message: string;
    timestamp: string;
    isRead: boolean;
    relatedPropertyId?: string;
}

export interface AIPersonality {
    id: string;
    name: string;
    // ... other personality fields
}

export interface AIVoice {
    id: string;
    name: string;
}

export type TriggerType = 'Lead Capture' | 'Appointment Scheduled' | 'Property Viewed' | 'Market Update' | 'Custom';

export interface SequenceStep {
    id: string;
    type: 'email' | 'ai-email' | 'task' | 'meeting';
    delay: { value: number; unit: 'minutes' | 'hours' | 'days' };
    content: string;
    subject?: string;
    meetingDetails?: {
        date: string;
        time: string;
        location: string;
    };
}

export interface FollowUpSequence {
    id: string;
    name: string;
    description: string;
    triggerType: TriggerType;
    steps: SequenceStep[];
    isActive: boolean;
}

export interface MarketingVideo {
    id: string;
    propertyId: string;
    propertyAddress: string;
    propertyImageUrl: string;
    title: string;
    script: string;
    music: string;
    videoUrl: string;
    createdAt: string;
}

export interface SocialPost {
    id: string;
    propertyId: string;
    propertyAddress: string;
    platforms: SocialPlatform[];
    content: string;
    imageUrl: string;
    status: 'scheduled' | 'posted';
    postAt: string;
}

export interface NotificationSettings {
    newLead: boolean;
    appointmentScheduled: boolean;
    aiInteraction: boolean;
    weeklySummary: boolean;
}

export type CalendarIntegrationType = 'google' | 'outlook' | 'apple' | null;

export interface CalendarSettings {
    integrationType: CalendarIntegrationType;
    aiScheduling: boolean;
    conflictDetection: boolean;
    emailReminders: boolean;
    autoConfirm: boolean;
}

export interface EmailSettings {
    integrationType: 'forwarding' | 'oauth';
    aiEmailProcessing: boolean;
    autoReply: boolean;
    leadScoring: boolean;
    followUpSequences: boolean;
}

export interface BillingSettings {
    planName: 'Solo Agent' | 'Pro Team' | 'Brokerage';
    history: {
        id: string;
        date: string;
        amount: number;
        status: 'Paid' | 'Pending' | 'Failed';
    }[];
}

export type FollowUpHistoryEventType = 'enroll' | 'email-sent' | 'email-opened' | 'task-created' | 'meeting-set' | 'pause' | 'resume' | 'cancel' | 'complete';

export interface FollowUpHistoryEvent {
    id: string;
    type: FollowUpHistoryEventType;
    description: string;
    date: string;
}

export interface ActiveLeadFollowUp {
    id: string;
    leadId: string;
    sequenceId: string;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    currentStepIndex: number;
    nextStepDate: string;
    history: FollowUpHistoryEvent[];
}

export type LeadSourceIconType = 'app' | 'facebook' | 'zillow' | 'manual';

export interface AnalyticsData {
    performanceOverview: {
        newLeads: number;
        conversionRate: number;
        appointmentsSet: number;
        avgAiResponseTime: string;
        leadFunnel: {
            leadsCaptured: number;
            aiQualified: number;
            contactedByAgent: number;
            appointmentsSet: number;
        };
    };
    leadSourceAnalysis: {
        sourceName: string;
        icon: LeadSourceIconType;
        leadCount: number;
        conversionRate: number;
    }[];
}

export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface AgentTask {
    id: string;
    text: string;
    isCompleted: boolean;
    dueDate: string;
    priority: TaskPriority;
}

export interface AIAssignment {
    id: string;
    personalityId: string;
    propertyId: string;
    description: string;
    status: 'active' | 'paused' | 'completed';
    name?: string;
    voiceId?: string;
}

export interface LocalInfoData {
    summary: string;
    category: string;
    highlights: string[];
    sources?: { uri: string; title: string }[];
    lastUpdated?: string;
}