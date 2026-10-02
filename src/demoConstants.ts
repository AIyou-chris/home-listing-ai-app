

export const DEMO_CONVERSATIONS = [
  {
    id: 'conv-demo-welcome',
    contactName: 'AI Concierge',
    contactEmail: 'concierge@homelistingai.com',
    contactPhone: '',
    type: 'chat',
    lastMessage: 'Welcome! I am here to help you manage your conversations.',
    timestamp: new Date().toISOString(),
    duration: null,
    status: 'active',
    messageCount: 1,
    property: 'Dashboard',
    tags: ['Welcome', 'System'],
    intent: 'Onboarding',
    language: 'English',
    followUpTask: null
  },
  {
    id: 'conv-demo-1',
    contactName: 'Marcus Chen',
    contactEmail: 'marcus.chen@techcorp.com',
    contactPhone: '(555) 987-6543',
    type: 'voice',
    lastMessage: 'Discussed school ratings and commute times to downtown Austin.',
    timestamp: '2025-11-23T16:30:00Z',
    duration: '12:45',
    status: 'active',
    messageCount: 1,
    property: '156 Maple Grove Lane',
    tags: ['High Intent', 'Relocation', 'Cash Buyer'],
    intent: 'Schedule Viewing',
    language: 'English',
    voiceTranscript: "Agent: Hi Marcus, thanks for calling about the Maple Grove property. How can I help you today?\nMarcus: Hi, I'm moving from SF and looking for a place with good schools and an easy commute to downtown.\nAgent: Great! Maple Grove is in the top-rated Barton Hills school district and just a 15-minute drive to downtown. It also has a fantastic backyard.\nMarcus: That sounds perfect. I'm a cash buyer and need to move quickly. Can we set up a viewing?\nAgent: Absolutely. I can get you in tomorrow at 10 AM. Does that work?\nMarcus: Yes, 10 AM works. See you then.",
    followUpTask: 'Send school district report'
  },
  {
    id: 'conv-demo-2',
    contactName: 'Emily Rodriguez',
    contactEmail: 'emily.r@email.com',
    contactPhone: '(555) 123-4567',
    type: 'chat',
    lastMessage: 'Inquired about pool maintenance and neighborhood safety.',
    timestamp: '2025-11-24T09:15:00Z',
    duration: null,
    status: 'active',
    messageCount: 5,
    property: '2847 Sunset Boulevard',
    tags: ['First-time Buyer', 'Pool'],
    intent: 'Property Inquiry',
    language: 'Spanish',
    followUpTask: 'Send pool maintenance guide'
  },
  {
    id: 'conv-demo-3',
    contactName: 'Sarah Thompson',
    contactEmail: 'thompson.family@gmail.com',
    contactPhone: '(555) 234-8901',
    type: 'email',
    lastMessage: 'Sent information on top-rated schools and community amenities.',
    timestamp: '2025-11-23T10:00:00Z',
    duration: null,
    status: 'follow-up',
    messageCount: 3,
    property: '156 Maple Grove Lane',
    tags: ['Family', 'Schools'],
    intent: 'Information Request',
    language: 'English',
    followUpTask: 'Check if they received the email'
  }
];

export const DEMO_MESSAGES = {
  'conv-demo-welcome': [
    {
      id: 'msg-welcome-1',
      sender: 'ai',
      channel: 'chat',
      timestamp: new Date().toISOString(),
      text: 'Welcome to your AI Conversations Inbox! 🚀\n\nHere you can see how I interact with your leads, handle objections, and schedule appointments.\n\nTry exporting a CSV, filtering by "Voice", or check the "Deep Dive" panel to see transcripts and translations.\n\nYou can delete this message when you are ready to start!'
    }
  ],
  'conv-demo-1': [
    {
      id: 'msg-1',
      sender: 'lead',
      channel: 'voice',
      timestamp: '2025-11-23T16:30:00Z',
      text: 'Voice call transcript available in details.',
      metadata: {
        recordingUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'
      }
    }
  ],
  'conv-demo-2': [
    {
      id: 'msg-2-1',
      sender: 'lead',
      channel: 'chat',
      timestamp: '2025-11-24T09:10:00Z',
      text: 'Hola, me encanta esta casa. ¿El mantenimiento de la piscina es costoso?',
      translation: { language: 'English', text: 'Hi, I love this house. Is the pool maintenance expensive?' }
    },
    {
      id: 'msg-2-2',
      sender: 'ai',
      channel: 'chat',
      timestamp: '2025-11-24T09:10:30Z',
      text: 'Hola Emily! Gracias por tu interés. El mantenimiento de la piscina es bastante estándar, alrededor de $150 al mes. La casa tiene un sistema de filtración nuevo que ayuda a reducir costos. ¿Te gustaría verla en persona?',
      translation: { language: 'English', text: 'Hi Emily! Thanks for your interest. Pool maintenance is pretty standard, around $150 a month. The house has a new filtration system that helps reduce costs. Would you like to see it in person?' }
    },
    {
      id: 'msg-2-3',
      sender: 'lead',
      channel: 'chat',
      timestamp: '2025-11-24T09:12:00Z',
      text: 'Eso suena bien. ¿Y qué tal es el vecindario? ¿Es seguro?',
      translation: { language: 'English', text: 'That sounds good. How is the neighborhood? Is it safe?' }
    },
    {
      id: 'msg-2-4',
      sender: 'ai',
      channel: 'chat',
      timestamp: '2025-11-24T09:12:45Z',
      text: 'Silver Lake es una zona muy deseada y tranquila. Esta calle en particular es muy segura y tiene poco tráfico. Muchos vecinos caminan por las tardes.',
      translation: { language: 'English', text: 'Silver Lake is a very desirable and quiet area. This street in particular is very safe and has little traffic. Many neighbors walk in the evenings.' }
    },
    {
      id: 'msg-2-5',
      sender: 'lead',
      channel: 'chat',
      timestamp: '2025-11-24T09:15:00Z',
      text: 'Perfecto, gracias por la información.',
      translation: { language: 'English', text: 'Perfect, thanks for the info.' }
    }
  ],
  'conv-demo-3': [
    {
      id: 'msg-3-1',
      sender: 'lead',
      channel: 'email',
      timestamp: '2025-11-22T15:20:00Z',
      text: 'Hi, we are moving from out of state and have two kids. Can you tell us more about the schools near the Maple Grove property?'
    },
    {
      id: 'msg-3-2',
      sender: 'ai',
      channel: 'email',
      timestamp: '2025-11-22T15:25:00Z',
      text: 'Hi Sarah, welcome to Austin! The Maple Grove home is in the Barton Hills Elementary district, which is rated 9/10. It feeds into O. Henry Middle School and Austin High. I can send you a detailed report on the schools and nearby parks if you like.'
    },
    {
      id: 'msg-3-3',
      sender: 'agent',
      channel: 'email',
      timestamp: '2025-11-23T10:00:00Z',
      text: 'Hi Sarah, following up on the AI\'s message. I\'ve attached a PDF with detailed school ratings, extracurriculars, and a map of family-friendly amenities in South Austin. Let me know if you have any other questions!'
    }
  ]
};

import { LeadStatsResponse } from './state/useLeadAnalyticsStore';

export const DEMO_ANALYTICS_STATS: LeadStatsResponse = {
  total: 6,
  new: 3,
  qualified: 2,
  contacted: 3,
  showing: 1,
  lost: 0,
  conversionRate: 16.7,
  scoreStats: {
    averageScore: 71.7,
    qualified: 2,
    hot: 1,
    warm: 2,
    cold: 1,
    highestScore: 95
  }
};

export const DEMO_LEAD_SOURCES = [
  { sourceName: 'Website Chat', leadCount: 2, conversionRate: 50.0, hotCount: 1 },
  { sourceName: 'Property Listings', leadCount: 1, conversionRate: 100.0, hotCount: 1 },
  { sourceName: 'Facebook Ads', leadCount: 1, conversionRate: 0.0, hotCount: 0 },
  { sourceName: 'Direct', leadCount: 1, conversionRate: 0.0, hotCount: 0 },
  { sourceName: 'Zillow', leadCount: 1, conversionRate: 0.0, hotCount: 0 }
];

export const DEMO_SCORE_TIERS = [
  {
    id: 'Hot',
    min: 90,
    max: 120,
    description: 'Ready for fast-track follow up; has timeline, budget, and a scheduled touchpoint.'
  },
  {
    id: 'Qualified',
    min: 70,
    max: 89,
    description: 'Shared key buying signals and engaged with AI concierge at least twice.'
  },
  {
    id: 'Warm',
    min: 40,
    max: 69,
    description: 'Provided preferences but still needs nurturing automation to progress.'
  },
  {
    id: 'Cold',
    min: 0,
    max: 39,
    description: 'Minimal activity captured. Keep inside the long-term nurture sequence.'
  }
];

export const DEMO_SCORING_RULES = [
  {
    id: 'intake-form',
    name: 'Completed AI Intake Form',
    description: 'Lead filled out the AI concierge questionnaire with move timeline + budget.',
    points: 25,
    category: 'Intent Signals'
  },
  {
    id: 'home-save',
    name: 'Saved A Property',
    description: 'Lead favorited or shared at least one listing inside the AI card.',
    points: 15,
    category: 'Engagement'
  },
  {
    id: 'tour-request',
    name: 'Requested A Tour',
    description: 'Lead tapped “Book A Tour” or proposed times for an in-person/virtual walkthrough.',
    points: 30,
    category: 'Transaction Ready'
  },
  {
    id: 'funds-verified',
    name: 'Uploaded Pre-Approval Or Proof Of Funds',
    description: 'Lead confirmed buying power via lender letter or cash verification.',
    points: 35,
    category: 'Qualification'
  },
  {
    id: 'agent-call',
    name: 'Agent Logged Live Call',
    description: 'Team member logged a voice conversation with detailed notes.',
    points: 20,
    category: 'Manual Touch'
  }
];

export const DEMO_SEQUENCE_SNAPSHOTS = [
  {
    id: 'welcome',
    name: 'Universal Welcome Drip',
    goal: 'Capture intent in first 48h',
    replyRate: 32,
    openRate: 68,
    meetings: 5,
    trend: 'up',
    lastAdjust: '2 days ago',
    bestStep: 'Day 1 Check-In'
  },
  {
    id: 'buyer',
    name: 'Homebuyer Journey',
    goal: 'Move buyers to tour requests',
    replyRate: 24,
    openRate: 45,
    meetings: 3,
    trend: 'flat',
    lastAdjust: '5 days ago',
    bestStep: 'Curated Matches'
  },
  {
    id: 'listing',
    name: 'AI-Powered Seller Funnel',
    goal: 'Convert CMAs to listings',
    replyRate: 18,
    openRate: 52,
    meetings: 2,
    trend: 'down',
    lastAdjust: 'Yesterday',
    bestStep: 'Interactive Listing Draft'
  },
  {
    id: 'post',
    name: 'After-Showing Follow-Up',
    goal: 'Secure second tours',
    replyRate: 41,
    openRate: 73,
    meetings: 8,
    trend: 'up',
    lastAdjust: '9 days ago',
    bestStep: 'Comparables Drop'
  }
];
