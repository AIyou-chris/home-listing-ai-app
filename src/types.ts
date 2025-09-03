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

// Expanded View union to include additional development/test routes used in the app
export type View =
    | 'dashboard'
    | 'analytics'
    | 'listings'
    | 'leads'
    | 'ai-conversations'
    | 'property'
    | 'add-listing'
    | 'inbox'
    | 'knowledge-base'
    | 'marketing'
    | 'settings'
    | 'demo-dashboard'
    | 'landing'
    | 'new-landing'
    | 'signup'
    | 'signin'
    | 'admin-dashboard'
    | 'admin-users'
    | 'admin-leads'
    | 'admin-contacts'
    | 'admin-knowledge-base'
    | 'admin-ai-personalities'
    | 'admin-ai-content'
    | 'admin-marketing'
    | 'admin-analytics'
    | 'admin-security'
    | 'admin-billing'
    | 'admin-settings'
    | 'admin-setup'
    | 'admin-blog-writer'
    | 'blog'
    | 'blog-post'

    // App routes used during development and feature flags
    | 'ai-content'
    | 'openai-test'
    | 'demo-listing'
    | 'vapi-test'
    | 'test'
    ;

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
  ctaListingUrl?: string;
  ctaMediaUrl?: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai' | 'assistant';
  text: string;
  timestamp?: Date;
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

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    author: string;
    publishedAt: string;
    status: 'draft' | 'published' | 'scheduled';
    tags: string[];
    imageUrl: string;
    readTime: string;
    // AIO Optimization fields
    metaDescription?: string;
    focusKeyword?: string;
    semanticKeywords?: string[];
    aioScore?: number;
    structuredData?: {
        type: 'Article' | 'NewsArticle' | 'BlogPosting';
        headline: string;
        description: string;
        author: string;
        publisher: string;
        datePublished: string;
        dateModified: string;
        wordCount: number;
        readingTime: string;
        categories: string[];
        keywords: string[];
    };
    socialMeta?: {
        ogTitle?: string;
        ogDescription?: string;
        ogImage?: string;
        twitterTitle?: string;
        twitterDescription?: string;
        twitterImage?: string;
        linkedinTitle?: string;
        linkedinDescription?: string;
    };
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
    source?: string;
    notes?: string;
    score?: LeadScore;
    behaviors?: LeadBehavior[];
}

export interface LeadBehavior {
    id: string;
    eventType: TriggerEventType;
    description: string;
    timestamp: string;
    metadata?: { [key: string]: any };
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
    description: string;
    traits: string[];
    sampleResponses: {
        question: string;
        response: string;
    }[];
}

export interface AIVoice {
    id: string;
    name: string;
    description: string;
    gender: 'male' | 'female' | 'neutral';
    accent?: string;
    sampleUrl?: string;
}

export interface KnowledgeBasePriority {
    id: string;
    name: string;
    description: string;
    weights: {
        agent: number;
        listing: number;
        marketing: number;
    };
}

export interface PersonalityTest {
    id: string;
    question: string;
    responses: {
        id: string;
        text: string;
        personalityId: string;
    }[];
}

export type TriggerType = 'Lead Capture' | 'Appointment Scheduled' | 'Property Viewed' | 'Market Update' | 'Custom' | 'Account Created';

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
    analytics?: SequenceAnalytics;
    smartTriggers?: SmartTrigger[];
}

// Sequence Performance Analytics
export interface SequenceAnalytics {
    totalLeads: number;
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    tasksCompleted: number;
    meetingsScheduled: number;
    appointmentsBooked: number;
    responsesReceived: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
    appointmentRate: number;
    avgResponseTime: number; // in hours
    lastUpdated: string;
}

// Smart Triggers
export interface SmartTrigger {
    id: string;
    name: string;
    description: string;
    eventType: TriggerEventType;
    conditions: TriggerCondition[];
    isActive: boolean;
    priority: number; // 1-10, higher = more priority
    cooldownPeriod: number; // hours before trigger can fire again for same lead
}

export type TriggerEventType = 
    | 'website_visit'
    | 'email_open' 
    | 'email_click'
    | 'property_view'
    | 'form_submission'
    | 'phone_call'
    | 'appointment_scheduled'
    | 'document_download'
    | 'video_watched'
    | 'lead_score_change';

export interface TriggerCondition {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
    value: string | number;
}

// Lead Scoring
export interface LeadScore {
    leadId: string;
    totalScore: number;
    scoreHistory: ScoreEvent[];
    lastUpdated: string;
    tier: 'Cold' | 'Warm' | 'Hot' | 'Qualified';
}

export interface ScoreEvent {
    id: string;
    eventType: string;
    points: number;
    description: string;
    timestamp: string;
    sequenceId?: string;
    stepId?: string;
}

export interface ScoringRule {
    id: string;
    name: string;
    eventType: string;
    points: number;
    description: string;
    isActive: boolean;
    maxOccurrences?: number; // max times this rule can award points per lead
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
    appointmentReminders: boolean;
    taskReminders: boolean;
    marketingUpdates: boolean;
    propertyInquiries: boolean;
    showingConfirmations: boolean;
    hotLeads: boolean;
    priceChanges: boolean;
    contractMilestones: boolean;
    browserNotifications: boolean;
    weekendNotifications: boolean;
    weeklyReport: boolean;
    monthlyInsights: boolean;
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
    fromEmail?: string;
    fromName?: string;
    signature?: string;
    trackOpens?: boolean;
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
    name: string;
    type: 'listing' | 'agent' | 'helper' | 'marketing' | 'sales' | 'god';
    description: string;
    personalityId?: string;
    voiceId?: string;
    knowledgePriority: 'agent' | 'listing' | 'marketing' | 'balanced' | 'dynamic';
    status: 'active' | 'paused' | 'completed';
}

export interface LocalInfoData {
    summary: string;
    category: string;
    highlights: string[];
    sources?: { uri: string; title: string }[];
    lastUpdated?: string;
}

export type UserStatus = 'Active' | 'Inactive' | 'Suspended' | 'Pending';

export interface User {
    id: string;
    name: string;
    email: string;
    status: UserStatus;
    role: 'agent' | 'admin' | 'user';
    dateJoined: string;
    lastActive: string;
    plan: 'Solo Agent' | 'Pro Team' | 'Brokerage';
    propertiesCount: number;
    leadsCount: number;
    aiInteractions: number;
    profileImage?: string;
    phone?: string;
    company?: string;
    subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
    renewalDate: string;
}

// Admin Settings Collection
export interface AdminSettings {
    id: string;
    platformName: string;
    platformUrl: string;
    supportEmail: string;
    timezone: string;
    featureToggles: {
        aiContentGeneration: boolean;
        voiceAssistant: boolean;
        qrCodeSystem: boolean;
        analyticsDashboard: boolean;
        knowledgeBase: boolean;
    };
    systemLimits: {
        maxFileUploadSize: number;
        sessionTimeout: number;
        maxConcurrentUsers: number;
        apiRateLimit: number;
    };
    maintenanceMode: boolean;
    autoUpdates: boolean;
}

// Broadcast Messages Collection
export interface BroadcastMessage {
    id: string;
    title: string;
    content: string;
    messageType: 'General' | 'Maintenance' | 'Feature' | 'Emergency' | 'System' | 'Welcome';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    targetAudience: string[];
    sentBy: string; // admin ID
    sentAt: string;
    scheduledFor?: string;
    status: 'draft' | 'scheduled' | 'sent' | 'failed';
    deliveryStats: {
        totalRecipients: number;
        delivered: number;
        read: number;
        failed: number;
    };
}

// System Alerts Collection
export interface SystemAlert {
    id: string;
    type: 'warning' | 'error' | 'critical' | 'info';
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string; // 'database' | 'api' | 'ai' | 'email' | 'storage'
    createdAt: string;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
    status: 'active' | 'acknowledged' | 'resolved';
}

// Retention Campaigns Collection
export interface RetentionCampaign {
    id: string;
    name: string;
    trigger: 'pre-renewal' | 'renewal-day' | 'day-1-recovery' | 'day-3-recovery';
    triggerDays: number;
    channels: string[]; // 'email' | 'phone' | 'sms'
    messageTemplate: string;
    successRate: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// User Notifications Collection
export interface UserNotification {
    id: string;
    userId: string;
    title: string;
    content: string;
    type: 'broadcast' | 'system' | 'billing' | 'feature';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    read: boolean;
    readAt?: string;
    createdAt: string;
    expiresAt?: string;
}