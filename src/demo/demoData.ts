import { SAMPLE_AGENT } from '../constants'
import type { Property } from '../types'
import type {
  AppointmentReminderRow,
  DashboardAppointmentRow,
  DashboardCommandCenterSnapshot,
  DashboardLeadConversationResponse,
  DashboardLeadDetail,
  DashboardLeadItem,
  DashboardRoiSummary,
  ListingPerformanceMetrics,
  ListingShareKitResponse
} from '../services/dashboardCommandService'
import type { DashboardBillingSnapshot, DashboardBillingUsageResponse } from '../services/dashboardBillingService'
import type { OnboardingState } from '../services/onboardingService'

type DemoVideoScenario = 'normal' | 'limit_reached' | 'failed_render'

interface DemoListingVideoRecord {
  id: string
  listingId: string
  title: string
  caption: string
  file_name: string
  mime_type: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  video_url: string | null
  creatomate_url: string | null
  created_at: string
}

interface DemoListingVideoState {
  includedCredits: number
  extraCredits: number
  usedCredits: number
  scenario: DemoVideoScenario
  videos: DemoListingVideoRecord[]
}

interface DemoListingMeta {
  id: string
  title: string
  slug: string
  address: string
  city: string
  state: string
  zip: string
  price: number
  beds: number
  baths: number
  sqft: number
  heroPhoto: string
}

const demoNow = Date.now()
const sampleVideoUrl = '/demo/demo-video.mp4'

const isoMinutesAgo = (minutes: number) => new Date(demoNow - minutes * 60_000).toISOString()
const isoMinutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString()
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const demoListings: DemoListingMeta[] = [
  {
    id: 'demo-listing-oak',
    title: '124 Oak Street, Austin, TX',
    slug: 'demo-124-oak-street-austin',
    address: '124 Oak Street',
    city: 'Austin',
    state: 'TX',
    zip: '78704',
    price: 865000,
    beds: 4,
    baths: 3,
    sqft: 2620,
    heroPhoto: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: 'demo-listing-maple',
    title: '156 Maple Grove Ln, Austin, TX',
    slug: 'demo-156-maple-grove-ln-austin',
    address: '156 Maple Grove Ln',
    city: 'Austin',
    state: 'TX',
    zip: '78737',
    price: 975000,
    beds: 5,
    baths: 4,
    sqft: 3310,
    heroPhoto: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80'
  }
]

const demoProperties: Property[] = demoListings.map((listing) => ({
  id: listing.id,
  title: listing.title,
  address: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
  price: listing.price,
  bedrooms: listing.beds,
  bathrooms: listing.baths,
  squareFeet: listing.sqft,
  status: 'Active',
  listedDate: isoMinutesAgo(60 * 24 * 3),
  description: `Demo listing for ${listing.address}.`,
  heroPhotos: [listing.heroPhoto],
  galleryPhotos: [listing.heroPhoto],
  imageUrl: listing.heroPhoto,
  propertyType: 'Single Family',
  features: ['Open concept', 'Quartz counters', 'Covered patio', 'Smart home'],
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
  },
  agent: {
    ...SAMPLE_AGENT,
    id: 'demo-agent-busy',
    name: 'Chris Potter',
    first_name: 'Chris',
    last_name: 'Potter',
    email: 'chris@homelistingai.com',
    phone: '+15125550123'
  },
  agentId: 'demo-agent-busy'
}))

let demoLeads: DashboardLeadItem[] = [
  {
    id: 'demo-lead-1',
    name: 'Maya Reynolds',
    phone: '+15125550001',
    email: 'maya.reynolds@example.com',
    status: 'New',
    source_type: 'open_house',
    intent_level: 'Hot',
    intent_score: 91,
    timeline: '0-30',
    financing: 'preapproved',
    lead_summary: 'Asked for Saturday showing and lender-friendly timeline.',
    next_best_action: 'Call now and lock showing slot.',
    last_activity_at: isoMinutesAgo(5),
    last_activity_relative: '5m ago',
    last_message_preview: 'Can I tour Saturday morning?',
    created_at: isoMinutesAgo(36),
    listing_id: 'demo-listing-oak',
    listing: { id: 'demo-listing-oak', address: '124 Oak Street, Austin, TX 78704' }
  },
  {
    id: 'demo-lead-2',
    name: 'Grant Bishop',
    phone: '+15125550002',
    email: 'grant.bishop@example.com',
    status: 'New',
    source_type: 'sign',
    intent_level: 'Hot',
    intent_score: 88,
    timeline: '0-30',
    financing: 'cash',
    lead_summary: 'Wants disclosures + roof age before making offer.',
    next_best_action: 'Send disclosures and schedule private walkthrough.',
    last_activity_at: isoMinutesAgo(32),
    last_activity_relative: '32m ago',
    last_message_preview: 'Can you share disclosures and HOA details?',
    created_at: isoMinutesAgo(52),
    listing_id: 'demo-listing-maple',
    listing: { id: 'demo-listing-maple', address: '156 Maple Grove Ln, Austin, TX 78737' }
  },
  {
    id: 'demo-lead-3',
    name: 'Lena Park',
    phone: '+15125550003',
    email: 'lena.park@example.com',
    status: 'New',
    source_type: 'social',
    intent_level: 'Warm',
    intent_score: 74,
    timeline: '1-3mo',
    financing: 'exploring',
    lead_summary: 'Comparing neighborhoods; requested school ratings.',
    next_best_action: 'Email neighborhood summary + open house invite.',
    last_activity_at: isoMinutesAgo(47),
    last_activity_relative: '47m ago',
    last_message_preview: 'Any neighborhood market report available?',
    created_at: isoMinutesAgo(67),
    listing_id: 'demo-listing-oak',
    listing: { id: 'demo-listing-oak', address: '124 Oak Street, Austin, TX 78704' }
  },
  {
    id: 'demo-lead-4',
    name: 'Aiden Cole',
    phone: '+15125550004',
    email: 'aiden.cole@example.com',
    status: 'New',
    source_type: 'link',
    intent_level: 'Warm',
    intent_score: 69,
    timeline: '1-3mo',
    financing: 'preapproved',
    lead_summary: null,
    next_best_action: 'Send report then ask for preferred showing windows.',
    last_activity_at: isoMinutesAgo(78),
    last_activity_relative: '1h ago',
    last_message_preview: 'Can you send me the report?',
    created_at: isoMinutesAgo(96),
    listing_id: 'demo-listing-maple',
    listing: { id: 'demo-listing-maple', address: '156 Maple Grove Ln, Austin, TX 78737' }
  },
  {
    id: 'demo-lead-5',
    name: 'Noah Cruz',
    phone: '+15125550005',
    email: 'noah.cruz@example.com',
    status: 'New',
    source_type: 'open_house',
    intent_level: 'Hot',
    intent_score: 84,
    timeline: '0-30',
    financing: 'cash',
    lead_summary: null,
    next_best_action: 'Confirm intent and push to appointment.',
    last_activity_at: isoMinutesAgo(91),
    last_activity_relative: '1h ago',
    last_message_preview: 'Can I submit an offer this week?',
    created_at: isoMinutesAgo(119),
    listing_id: 'demo-listing-maple',
    listing: { id: 'demo-listing-maple', address: '156 Maple Grove Ln, Austin, TX 78737' }
  },
  {
    id: 'demo-lead-6',
    name: 'Olivia Hart',
    phone: '+15125550006',
    email: 'olivia.hart@example.com',
    status: 'New',
    source_type: 'sign',
    intent_level: 'Warm',
    intent_score: 66,
    timeline: '3+',
    financing: 'exploring',
    lead_summary: null,
    next_best_action: 'Drop into nurture and schedule follow-up in 30 days.',
    last_activity_at: isoMinutesAgo(110),
    last_activity_relative: '2h ago',
    last_message_preview: 'Still early but interested in this floor plan.',
    created_at: isoMinutesAgo(150),
    listing_id: 'demo-listing-oak',
    listing: { id: 'demo-listing-oak', address: '124 Oak Street, Austin, TX 78704' }
  },
  {
    id: 'demo-lead-7',
    name: 'Ethan Blake',
    phone: '+15125550007',
    email: 'ethan.blake@example.com',
    status: 'Contacted',
    source_type: 'social',
    intent_level: 'Warm',
    intent_score: 71,
    timeline: '1-3mo',
    financing: 'preapproved',
    lead_summary: 'Needs evening showing and commute details.',
    next_best_action: 'Share commute map and available weekday times.',
    last_activity_at: isoMinutesAgo(144),
    last_activity_relative: '2h ago',
    last_message_preview: 'Can only tour after 6pm.',
    created_at: isoMinutesAgo(210),
    listing_id: 'demo-listing-oak',
    listing: { id: 'demo-listing-oak', address: '124 Oak Street, Austin, TX 78704' }
  },
  {
    id: 'demo-lead-8',
    name: 'Sofia James',
    phone: '+15125550008',
    email: 'sofia.james@example.com',
    status: 'Contacted',
    source_type: 'open_house',
    intent_level: 'Hot',
    intent_score: 82,
    timeline: '0-30',
    financing: 'cash',
    lead_summary: 'Asked about seller concessions and move-in date.',
    next_best_action: 'Prepare quick offer guidance.',
    last_activity_at: isoMinutesAgo(210),
    last_activity_relative: '3h ago',
    last_message_preview: 'Could seller close in 21 days?',
    created_at: isoMinutesAgo(260),
    listing_id: 'demo-listing-maple',
    listing: { id: 'demo-listing-maple', address: '156 Maple Grove Ln, Austin, TX 78737' }
  },
  {
    id: 'demo-lead-9',
    name: 'Caleb Moore',
    phone: '+15125550009',
    email: 'caleb.moore@example.com',
    status: 'Nurture',
    source_type: 'link',
    intent_level: 'Cold',
    intent_score: 44,
    timeline: '3+',
    financing: 'exploring',
    lead_summary: null,
    next_best_action: 'Send monthly market pulse.',
    last_activity_at: isoMinutesAgo(420),
    last_activity_relative: '7h ago',
    last_message_preview: 'Just browsing neighborhoods.',
    created_at: isoMinutesAgo(500),
    listing_id: 'demo-listing-oak',
    listing: { id: 'demo-listing-oak', address: '124 Oak Street, Austin, TX 78704' }
  },
  {
    id: 'demo-lead-10',
    name: 'Ava Kim',
    phone: '+15125550010',
    email: 'ava.kim@example.com',
    status: 'New',
    source_type: 'social',
    intent_level: 'Warm',
    intent_score: 70,
    timeline: '1-3mo',
    financing: 'preapproved',
    lead_summary: null,
    next_best_action: 'Invite to virtual tour and collect timeline.',
    last_activity_at: isoMinutesAgo(18),
    last_activity_relative: '18m ago',
    last_message_preview: 'Can I get a full photo set?',
    created_at: isoMinutesAgo(26),
    listing_id: 'demo-listing-maple',
    listing: { id: 'demo-listing-maple', address: '156 Maple Grove Ln, Austin, TX 78737' }
  }
]

let demoAppointments: DashboardAppointmentRow[] = [
  {
    id: 'demo-appt-1',
    startsAt: isoMinutesFromNow(90),
    startIso: isoMinutesFromNow(90),
    status: 'scheduled',
    normalizedStatus: 'scheduled',
    location: '124 Oak Street',
    lead: { id: 'demo-lead-1', name: 'Maya Reynolds', phone: '+15125550001', email: 'maya.reynolds@example.com' },
    listing: { id: 'demo-listing-oak', address: '124 Oak Street, Austin, TX 78704' },
    confirmation_status: 'needs_confirmation',
    last_reminder_outcome: { status: 'no_answer', reminder_type: 'voice', scheduled_for: isoMinutesAgo(20), provider_response: null }
  },
  {
    id: 'demo-appt-2',
    startsAt: isoMinutesFromNow(180),
    startIso: isoMinutesFromNow(180),
    status: 'scheduled',
    normalizedStatus: 'scheduled',
    location: '156 Maple Grove Ln',
    lead: { id: 'demo-lead-2', name: 'Grant Bishop', phone: '+15125550002', email: 'grant.bishop@example.com' },
    listing: { id: 'demo-listing-maple', address: '156 Maple Grove Ln, Austin, TX 78737' },
    confirmation_status: 'needs_confirmation',
    last_reminder_outcome: { status: 'failed', reminder_type: 'voice', scheduled_for: isoMinutesAgo(12), provider_response: { reason: 'provider_timeout' } }
  },
  {
    id: 'demo-appt-3',
    startsAt: isoMinutesFromNow(300),
    startIso: isoMinutesFromNow(300),
    status: 'reschedule_requested',
    normalizedStatus: 'reschedule_requested',
    location: 'Virtual tour',
    lead: { id: 'demo-lead-3', name: 'Lena Park', phone: '+15125550003', email: 'lena.park@example.com' },
    listing: { id: 'demo-listing-oak', address: '124 Oak Street, Austin, TX 78704' },
    confirmation_status: 'unknown',
    last_reminder_outcome: { status: 'reschedule_requested', reminder_type: 'voice', scheduled_for: isoMinutesAgo(8), provider_response: null }
  },
  {
    id: 'demo-appt-4',
    startsAt: isoMinutesFromNow(420),
    startIso: isoMinutesFromNow(420),
    status: 'scheduled',
    normalizedStatus: 'scheduled',
    location: '156 Maple Grove Ln',
    lead: { id: 'demo-lead-4', name: 'Aiden Cole', phone: '+15125550004', email: 'aiden.cole@example.com' },
    listing: { id: 'demo-listing-maple', address: '156 Maple Grove Ln, Austin, TX 78737' },
    confirmation_status: 'needs_confirmation',
    last_reminder_outcome: null
  },
  {
    id: 'demo-appt-5',
    startsAt: isoMinutesFromNow(510),
    startIso: isoMinutesFromNow(510),
    status: 'scheduled',
    normalizedStatus: 'scheduled',
    location: '124 Oak Street',
    lead: { id: 'demo-lead-5', name: 'Noah Cruz', phone: '+15125550005', email: 'noah.cruz@example.com' },
    listing: { id: 'demo-listing-oak', address: '124 Oak Street, Austin, TX 78704' },
    confirmation_status: 'needs_confirmation',
    last_reminder_outcome: { status: 'voicemail_left', reminder_type: 'voice', scheduled_for: isoMinutesAgo(5), provider_response: null }
  }
]

const demoAppointmentReminders: Record<string, AppointmentReminderRow[]> = Object.fromEntries(
  demoAppointments.map((appointment) => [
    appointment.id,
    [
      {
        id: `${appointment.id}-r24`,
        appointment_id: appointment.id,
        reminder_type: 'voice',
        scheduled_for: isoMinutesAgo(120),
        status: 'sent',
        provider: 'vapi',
        idempotency_key: `demo:${appointment.id}:24h`,
        normalized_outcome: appointment.last_reminder_outcome?.status || null
      },
      {
        id: `${appointment.id}-r2`,
        appointment_id: appointment.id,
        reminder_type: 'voice',
        scheduled_for: isoMinutesAgo(15),
        status: appointment.last_reminder_outcome?.status === 'failed' ? 'failed' : 'delivered',
        provider: 'vapi',
        idempotency_key: `demo:${appointment.id}:2h`,
        normalized_outcome: appointment.last_reminder_outcome?.status || null
      }
    ]
  ])
)

const demoVideoStateByListing: Record<string, DemoListingVideoState> = {
  'demo-listing-oak': {
    includedCredits: 3,
    extraCredits: 0,
    usedCredits: 0,
    scenario: 'normal',
    videos: []
  },
  'demo-listing-maple': {
    includedCredits: 3,
    extraCredits: 0,
    usedCredits: 0,
    scenario: 'normal',
    videos: []
  }
}

const demoVideoListeners = new Set<(listingId: string) => void>()

const emitDemoVideoUpdate = (listingId: string) => {
  for (const listener of demoVideoListeners) {
    listener(listingId)
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hlai:demo-video-updated', { detail: { listingId } }))
  }
}

const getListingById = (listingId: string) => demoListings.find((listing) => listing.id === listingId) || null
const getListingBySlug = (slug: string) => demoListings.find((listing) => listing.slug === slug) || null

export const getDemoListingMetas = (): DemoListingMeta[] => clone(demoListings)
export const getDemoListingMetaById = (listingId: string): DemoListingMeta | null => {
  const listing = getListingById(listingId)
  return listing ? clone(listing) : null
}
export const getDemoPropertyById = (listingId: string): Property | null => {
  const property = demoProperties.find((item) => item.id === listingId) || null
  return property ? clone(property) : null
}
export const getDemoPropertyBySlug = (slug: string): Property | null => {
  const listing = getListingBySlug(slug)
  if (!listing) return null
  return getDemoPropertyById(listing.id)
}

const getShareUrl = (listing: DemoListingMeta) => `https://homelistingai.com/l/${listing.slug}`
const getQrUrl = (listing: DemoListingMeta, source = 'sign') =>
  `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${getShareUrl(listing)}?src=${source}`)}`

const getLastLeadForListing = (listingId: string) =>
  demoLeads
    .filter((lead) => lead.listing_id === listingId)
    .sort((a, b) => new Date(b.last_activity_at || b.created_at).getTime() - new Date(a.last_activity_at || a.created_at).getTime())[0] || null

const getTopSourceForListing = (listingId: string) => {
  const counts = new Map<string, number>()
  demoLeads
    .filter((lead) => lead.listing_id === listingId)
    .forEach((lead) => {
      const key = lead.source_type || 'unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    })
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]
  return top ? { source_type: top[0], total: top[1] } : { source_type: 'unknown', total: 0 }
}

export const getDemoProperties = (): Property[] => clone(demoProperties)

export const getDemoOnboardingState = (): OnboardingState =>
  clone({
    success: true,
    onboarding_completed: true,
    onboarding_step: 5,
    onboarding_checklist: {
      brand_profile: true,
      first_listing_created: true,
      first_listing_published: true,
      share_kit_copied: true,
      test_lead_sent: true,
      first_appointment_created: true,
      first_listing_id: 'demo-listing-oak',
      last_test_lead_id: 'demo-lead-1'
    },
    first_listing_id: 'demo-listing-oak',
    last_test_lead_id: 'demo-lead-1',
    brand_profile: {
      full_name: 'Chris Potter',
      phone: '+15125550123',
      email: 'chris@homelistingai.com',
      brokerage: 'HomeListingAI Realty',
      headshot_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
    },
    plan_id: 'pro',
    is_pro: true,
    progress: {
      completed_items: 6,
      total_items: 6
    }
  })

export const getDemoBillingSnapshot = (): DashboardBillingSnapshot =>
  clone({
    plan: {
      id: 'pro',
      name: 'Pro',
      status: 'active',
      price_monthly_usd: 79,
      current_period_start: isoMinutesAgo(60 * 24 * 6),
      current_period_end: isoMinutesFromNow(60 * 24 * 24),
      cancel_at_period_end: false
    },
    usage: {
      active_listings: { used: 2, limit: 5 },
      reports_per_month: { used: 7, limit: 10 },
      reminder_calls_per_month: { used: 24, limit: 200 },
      stored_leads_cap: { used: 96, limit: 2000 }
    },
    limits: {
      active_listings: 5,
      reports_per_month: 10,
      reminder_calls_per_month: 200,
      stored_leads_cap: 2000
    },
    warnings: [],
    copy: {
      header: 'Billing',
      subhead: 'Clear limits. No surprise charges.',
      warning_banner: 'You’re close to your limit. Upgrade to keep everything running.'
    }
  })

export const getDemoBillingUsage = (): DashboardBillingUsageResponse => {
  const snapshot = getDemoBillingSnapshot()
  return {
    success: true,
    plan_id: snapshot.plan.id,
    limits: snapshot.limits,
    usage: snapshot.usage,
    percent_used: {
      active_listings: 40,
      reports_per_month: 70,
      reminder_calls_per_month: 12,
      stored_leads_cap: 5
    },
    period_end: snapshot.plan.current_period_end,
    warnings: snapshot.warnings
  }
}

export const getDemoLeads = (): DashboardLeadItem[] => clone(demoLeads)

export const getDemoLeadDetail = (leadId: string): DashboardLeadDetail => {
  const lead = demoLeads.find((item) => item.id === leadId) || demoLeads[0]
  const listing = lead?.listing_id ? getListingById(lead.listing_id) : null
  const relatedAppointments = demoAppointments
    .filter((appointment) => appointment.lead?.id === lead.id)
    .map((appointment) => ({
      id: appointment.id,
      status: appointment.status,
      normalizedStatus: appointment.normalizedStatus,
      startsAt: appointment.startsAt,
      startIso: appointment.startIso,
      location: appointment.location || null,
      reminders: clone(demoAppointmentReminders[appointment.id] || []),
      lastReminderResult: appointment.last_reminder_outcome
        ? {
          status: appointment.last_reminder_outcome.status,
          reminder_type: appointment.last_reminder_outcome.reminder_type,
          scheduled_for: appointment.last_reminder_outcome.scheduled_for,
          provider_response: appointment.last_reminder_outcome.provider_response || null
        }
        : null
    }))

  return clone({
    lead: {
      id: lead.id,
      full_name: lead.name,
      phone_e164: lead.phone,
      email_lower: lead.email,
      status: lead.status,
      timeline: lead.timeline,
      financing: lead.financing,
      working_with_agent: 'unknown',
      notes: lead.lead_summary || '', // Map lead_summary to notes for demo
      source_type: lead.source_type,
      listing_id: lead.listing_id
    },
    listing: listing
      ? {
        id: listing.id,
        address: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
        price: listing.price,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft
      }
      : null,
    intel: {
      intent_score: lead.intent_score,
      intent_level: lead.intent_level,
      intent_tags: ['showing', 'timeline', 'financing'],
      lead_summary: lead.lead_summary,
      next_best_action: lead.next_best_action,
      last_intent_at: lead.last_activity_at
    },
    actionBar: {
      canCall: Boolean(lead.phone),
      canEmail: Boolean(lead.email),
      statusOptions: ['New', 'Contacted', 'Nurture', 'Closed-Lost'],
      appointmentQuickCreate: true
    },
    events: [
      {
        id: `${lead.id}-event-created`,
        type: 'LEAD_CREATED',
        payload: { source_type: lead.source_type },
        created_at: lead.created_at
      },
      {
        id: `${lead.id}-event-captured`,
        type: 'CONTACT_CAPTURED',
        payload: { listing_id: lead.listing_id },
        created_at: lead.last_activity_at || lead.created_at
      }
    ],
    appointments: relatedAppointments,
    upcoming_appointment: relatedAppointments[0] || null,
    transcript: [],
    conversation_summary: {
      summary_bullets: [
        `${lead.name} asked for showing options on ${listing?.address || 'this listing'}.`,
        `Intent is ${lead.intent_level} with ${lead.financing} financing.`,
        `Timeline captured as ${lead.timeline}.`
      ],
      last_question: lead.last_message_preview,
      intent_tags: ['showing', 'pricing'],
      timeline: lead.timeline,
      financing: lead.financing,
      working_with_agent: 'unknown',
      next_best_action: lead.next_best_action,
      updated_at: lead.last_activity_at
    }
  })
}

export const getDemoLeadConversation = (leadId: string): DashboardLeadConversationResponse =>
  clone({
    success: true,
    conversation: {
      id: `conversation-${leadId}`,
      listing_id: demoLeads.find((lead) => lead.id === leadId)?.listing_id || null,
      visitor_id: `visitor-${leadId}`,
      channel: 'web',
      metadata: { source: 'demo' },
      started_at: isoMinutesAgo(45),
      last_activity_at: isoMinutesAgo(5)
    },
    messages: [
      {
        id: `${leadId}-msg-1`,
        sender: 'visitor',
        channel: 'web',
        text: 'Is this home still available?',
        is_capture_event: false,
        intent_tags: ['availability'],
        confidence: 0.92,
        created_at: isoMinutesAgo(41)
      },
      {
        id: `${leadId}-msg-2`,
        sender: 'ai',
        channel: 'web',
        text: 'Yes, this listing is active. Want the report and showing options?',
        is_capture_event: false,
        intent_tags: ['showing'],
        confidence: 0.89,
        created_at: isoMinutesAgo(40)
      }
    ]
  })

export const getDemoAppointments = (view: 'today' | 'week' = 'week') => {
  const rows = clone(demoAppointments)
  if (view === 'today') {
    const nowTs = Date.now()
    const tomorrowTs = nowTs + 24 * 60 * 60 * 1000
    return rows.filter((row) => {
      const startsAt = new Date(row.startsAt || row.startIso || '').getTime()
      return Number.isFinite(startsAt) && startsAt >= nowTs && startsAt <= tomorrowTs
    })
  }
  return rows
}

export const getDemoAppointmentReminders = (appointmentId: string): AppointmentReminderRow[] =>
  clone(demoAppointmentReminders[appointmentId] || [])

export const getDemoRoiSummary = (range: '7d' | '30d' = '7d'): DashboardRoiSummary =>
  clone({
    range,
    leads_captured: range === '7d' ? 34 : 92,
    appointments_set: range === '7d' ? 12 : 31,
    confirmations: range === '7d' ? 9 : 24,
    top_source: {
      label: 'Open House',
      count: range === '7d' ? 18 : 42
    },
    last_lead_at: isoMinutesAgo(5),
    updated_at: new Date().toISOString()
  })

export const getDemoListingPerformance = (
  listingId: string,
  range: '7d' | '30d' = '30d'
): {
  success: boolean
  listing_id: string
  range: string
  metrics: ListingPerformanceMetrics
  breakdown: {
    by_source_type: Array<{ source_type: string; total: number }>
    by_source_key: Array<{ source_key: string; total: number }>
  }
} => {
  const listingLeads = demoLeads.filter((lead) => lead.listing_id === listingId)
  const listingAppointments = demoAppointments.filter((appointment) => appointment.listing?.id === listingId)
  const topSource = getTopSourceForListing(listingId)
  const lastLead = getLastLeadForListing(listingId)
  const sourceCounts = listingLeads.reduce<Record<string, number>>((acc, lead) => {
    const key = lead.source_type || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return clone({
    success: true,
    listing_id: listingId,
    range,
    metrics: {
      leads_count: listingLeads.length,
      appointments_count: listingAppointments.length,
      appointments_confirmed: listingAppointments.filter((appointment) => appointment.status === 'confirmed').length,
      status_breakdown: listingLeads.reduce<Record<string, number>>((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1
        return acc
      }, {}),
      qr_usage: range === '7d' ? 11 : 29,
      leads_by_source: sourceCounts,
      last_lead_captured_at: lastLead?.last_activity_at || null,
      top_source: {
        label: topSource.source_type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        count: topSource.total
      },
      updated_at: new Date().toISOString()
    },
    breakdown: {
      by_source_type: Object.entries(sourceCounts).map(([source_type, total]) => ({ source_type, total })),
      by_source_key: Object.entries(sourceCounts).map(([source_key, total]) => ({ source_key, total }))
    }
  })
}

const getDefaultSourceDefaults = (): ListingShareKitResponse['source_defaults'] => ({
  link: { id: 'demo-source-link', source_type: 'link', source_key: 'link' },
  sign: { id: 'demo-source-sign', source_type: 'qr', source_key: 'sign' },
  open_house: { id: 'demo-source-open-house', source_type: 'open_house', source_key: 'open_house' },
  social: { id: 'demo-source-social', source_type: 'social', source_key: 'social_001' }
})

export const getDemoListingShareKit = (listingId: string): ListingShareKitResponse => {
  const listing = getListingById(listingId) || demoListings[0]
  const latestReadyVideo = [...(demoVideoStateByListing[listing.id]?.videos || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((video) => video.status === 'ready')

  return clone({
    success: true,
    listing_id: listing.id,
    is_published: true,
    published_at: isoMinutesAgo(60 * 24),
    public_slug: listing.slug,
    share_url: getShareUrl(listing),
    qr_code_url: getQrUrl(listing, 'sign'),
    qr_code_svg: null,
    latest_video: latestReadyVideo
      ? {
        id: latestReadyVideo.id,
        title: latestReadyVideo.title,
        caption: latestReadyVideo.caption,
        file_name: latestReadyVideo.file_name,
        mime_type: latestReadyVideo.mime_type,
        status: latestReadyVideo.status,
        created_at: latestReadyVideo.created_at
      }
      : null,
    source_defaults: getDefaultSourceDefaults()
  })
}

export const publishDemoListingShareKit = (listingId: string) => getDemoListingShareKit(listingId)

export const createDemoTestLead = (
  listingId: string,
  payload: {
    full_name?: string
    email?: string
    phone?: string
    context?: 'report_requested' | 'showing_requested'
    source_type?: string
    source_key?: string
  }
) => {
  const listing = getListingById(listingId) || demoListings[0]
  const nextLead: DashboardLeadItem = {
    id: `demo-lead-${Date.now()}`,
    name: payload.full_name || 'Test Lead',
    phone: payload.phone || null,
    email: payload.email || null,
    status: 'New',
    source_type: payload.source_type || 'link',
    intent_level: 'Warm',
    intent_score: 72,
    timeline: '1-3mo',
    financing: 'exploring',
    lead_summary: payload.context === 'showing_requested' ? 'Requested showing from Share Kit test.' : 'Requested market report from Share Kit test.',
    next_best_action: 'Open lead and follow up.',
    last_activity_at: new Date().toISOString(),
    last_activity_relative: 'just now',
    last_message_preview: 'Test lead submitted',
    created_at: new Date().toISOString(),
    listing_id: listing.id,
    listing: { id: listing.id, address: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}` }
  }

  demoLeads = [nextLead, ...demoLeads]
  return clone({
    success: true,
    message: 'Test lead created.',
    lead_id: nextLead.id,
    is_deduped: false,
    status: nextLead.status,
    intent_level: nextLead.intent_level,
    source_key: payload.source_key || 'dashboard_test',
    source_type: nextLead.source_type
  })
}

export const updateDemoLeadStatusById = (
  leadId: string,
  payload: { status: string; timeline?: string; financing?: string; working_with_agent?: string; notes?: string }
) => {
  demoLeads = demoLeads.map((lead) =>
    lead.id === leadId
      ? {
        ...lead,
        status: payload.status,
        timeline: payload.timeline || lead.timeline,
        financing: payload.financing || lead.financing,
        lead_summary: payload.notes || lead.lead_summary, // Using lead_summary as proxy for notes in demo for now
        last_activity_at: new Date().toISOString()
      }
      : lead
  )
  return { success: true }
}

export const createDemoAppointment = (payload: {
  lead_id?: string
  listing_id?: string
  starts_at: string
  location?: string
}) => {
  const lead = demoLeads.find((item) => item.id === payload.lead_id) || demoLeads[0]
  const listingId = payload.listing_id || lead.listing_id || demoListings[0].id
  const listing = getListingById(listingId) || demoListings[0]
  const appointment: DashboardAppointmentRow = {
    id: `demo-appt-${Date.now()}`,
    startsAt: payload.starts_at,
    startIso: payload.starts_at,
    status: 'scheduled',
    normalizedStatus: 'scheduled',
    location: payload.location || null,
    lead: { id: lead.id, name: lead.name, phone: lead.phone, email: lead.email },
    listing: { id: listing.id, address: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}` },
    confirmation_status: 'needs_confirmation',
    last_reminder_outcome: null
  }
  demoAppointments = [appointment, ...demoAppointments]
  demoAppointmentReminders[appointment.id] = []
  return clone({ success: true, appointment })
}

export const updateDemoAppointmentStatus = (appointmentId: string, status: string) => {
  demoAppointments = demoAppointments.map((appointment) =>
    appointment.id === appointmentId
      ? {
        ...appointment,
        status,
        normalizedStatus: status,
        confirmation_status: status === 'confirmed' ? 'confirmed' : appointment.confirmation_status
      }
      : appointment
  )
  return { success: true }
}

export const retryDemoReminderForAppointment = (appointmentId: string) => {
  const appointment = demoAppointments.find((item) => item.id === appointmentId)
  if (!appointment) {
    return {
      success: true,
      queued: false,
      duplicate: false,
      job_id: null,
      idempotency_key: `demo-reminder:${appointmentId}:missing`
    }
  }
  appointment.last_reminder_outcome = {
    status: 'queued',
    reminder_type: 'voice',
    scheduled_for: new Date().toISOString(),
    provider_response: { demo: true }
  }
  return {
    success: true,
    queued: true,
    duplicate: false,
    job_id: `job-${Date.now()}`,
    idempotency_key: `demo-reminder:${appointmentId}:${Date.now()}`
  }
}

export const retryDemoReminder = (appointmentId: string, reminderId: string) => ({
  ...retryDemoReminderForAppointment(appointmentId),
  reminder_id: reminderId
})

export const sendDemoReminderNow = (appointmentId: string) => ({
  ...retryDemoReminderForAppointment(appointmentId),
  reminder_id: `${appointmentId}-send-now`
})

export const disableDemoReminders = (appointmentId: string) => {
  const reminders = demoAppointmentReminders[appointmentId] || []
  demoAppointmentReminders[appointmentId] = reminders.map((row) => ({ ...row, status: 'canceled' }))
  return {
    success: true,
    appointment_id: appointmentId,
    canceled_count: reminders.length
  }
}

export const getDemoCommandCenterSnapshot = (): DashboardCommandCenterSnapshot => {
  const newLeads = demoLeads.filter((lead) => lead.status === 'New')
  const appointmentsComingUp = getDemoAppointments('today')
  const needsAttention = appointmentsComingUp.filter((appointment) => {
    const status = String(appointment.status || '').toLowerCase()
    const lastOutcome = String(appointment.last_reminder_outcome?.status || '').toLowerCase()
    return status === 'reschedule_requested' || lastOutcome === 'failed'
  })

  return clone({
    stats: {
      new_leads_today: newLeads.length,
      unworked_leads: newLeads.length,
      appointments_today: appointmentsComingUp.length,
      confirmations_7d: 9
    },
    queues: {
      new_leads_to_work: newLeads.slice(0, 10).map((lead) => ({
        lead_id: lead.id,
        listing_id: lead.listing_id,
        listing_address: lead.listing?.address || null,
        full_name: lead.name || 'Unknown',
        intent_level: lead.intent_level,
        status: lead.status,
        timeline: lead.timeline,
        financing: lead.financing,
        source_type: lead.source_type,
        last_activity_at: lead.last_activity_at,
        lead_summary_preview: lead.lead_summary || lead.last_message_preview || null,
        phone: lead.phone,
        email: lead.email,
        created_at: lead.created_at,
        last_agent_action_at: lead.last_agent_action_at || null
      })),
      appointments_coming_up: appointmentsComingUp.map((appointment) => ({
        appointment_id: appointment.id,
        lead_id: appointment.lead?.id || null,
        listing_id: appointment.listing?.id || null,
        listing_address: appointment.listing?.address || null,
        starts_at: appointment.startsAt || appointment.startIso || null,
        status: appointment.status,
        lead_name: appointment.lead?.name || 'Unknown',
        lead_phone: appointment.lead?.phone || null,
        lead_email: appointment.lead?.email || null,
        last_reminder_outcome: appointment.last_reminder_outcome?.status || null
      })),
      needs_attention: needsAttention.map((appointment) => ({
        appointment_id: appointment.id,
        lead_id: appointment.lead?.id || null,
        listing_id: appointment.listing?.id || null,
        listing_address: appointment.listing?.address || null,
        starts_at: appointment.startsAt || appointment.startIso || null,
        status: appointment.status,
        lead_name: appointment.lead?.name || 'Unknown',
        lead_phone: appointment.lead?.phone || null,
        lead_email: appointment.lead?.email || null,
        last_reminder_outcome: appointment.last_reminder_outcome?.status || null
      }))
    }
  })
}

export const logDemoAgentAction = (payload: { lead_id: string; action: string }) => {
  demoLeads = demoLeads.map((lead) =>
    lead.id === payload.lead_id
      ? {
        ...lead,
        last_agent_action_at: new Date().toISOString()
      }
      : lead
  )

  return clone({
    success: true,
    action: {
      id: `demo-action-${Date.now()}`,
      lead_id: payload.lead_id,
      action: payload.action,
      created_at: new Date().toISOString()
    }
  })
}

const getVideoState = (listingId: string): DemoListingVideoState => {
  if (!demoVideoStateByListing[listingId]) {
    demoVideoStateByListing[listingId] = {
      includedCredits: 3,
      extraCredits: 0,
      usedCredits: 0,
      scenario: 'normal',
      videos: []
    }
  }
  return demoVideoStateByListing[listingId]
}

export const subscribeDemoVideoUpdates = (listener: (listingId: string) => void) => {
  demoVideoListeners.add(listener)
  return () => {
    demoVideoListeners.delete(listener)
  }
}

export const setDemoListingVideoScenario = (listingId: string, scenario: DemoVideoScenario) => {
  const state = getVideoState(listingId)
  state.scenario = scenario
  emitDemoVideoUpdate(listingId)
}

export const getDemoListingVideos = (listingId: string) => {
  const state = getVideoState(listingId)
  const totalCredits = state.includedCredits + state.extraCredits
  const remaining = Math.max(0, totalCredits - state.usedCredits)
  return clone({
    credits_remaining: remaining,
    credits_total: totalCredits,
    credits_used: state.usedCredits,
    scenario: state.scenario,
    videos: [...state.videos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  })
}

export const getDemoVideoById = (videoId: string): DemoListingVideoRecord | null => {
  for (const state of Object.values(demoVideoStateByListing)) {
    const video = state.videos.find((row) => row.id === videoId)
    if (video) return clone(video)
  }
  return null
}

export const generateDemoListingVideo = (
  listingId: string,
  templateStyle: string
): { queued: boolean; error?: string; credits_remaining: number; video?: DemoListingVideoRecord } => {
  const state = getVideoState(listingId)
  const totalCredits = state.includedCredits + state.extraCredits
  const remaining = Math.max(0, totalCredits - state.usedCredits)

  if (state.scenario === 'limit_reached' || remaining <= 0) {
    return {
      queued: false,
      error: 'Insufficient credits',
      credits_remaining: 0
    }
  }

  const nextVideo: DemoListingVideoRecord = {
    id: `demo-video-${Date.now()}`,
    listingId,
    title: `${templateStyle} social video`,
    caption: 'See this listing in 15 seconds. Tap for report + showing options.',
    file_name: `${listingId}-${templateStyle.toLowerCase()}-15s.mp4`,
    mime_type: 'video/mp4',
    status: 'processing',
    video_url: null,
    creatomate_url: null,
    created_at: new Date().toISOString()
  }

  state.videos = [nextVideo, ...state.videos]
  state.usedCredits += 1
  emitDemoVideoUpdate(listingId)

  window.setTimeout(() => {
    const refreshState = getVideoState(listingId)
    const targetVideo = refreshState.videos.find((video) => video.id === nextVideo.id)
    if (!targetVideo) return

    if (refreshState.scenario === 'failed_render') {
      targetVideo.status = 'failed'
      targetVideo.video_url = null
      targetVideo.creatomate_url = null
      refreshState.usedCredits = Math.max(0, refreshState.usedCredits - 1)
    } else {
      targetVideo.status = 'ready'
      targetVideo.video_url = sampleVideoUrl
      targetVideo.creatomate_url = sampleVideoUrl
    }
    emitDemoVideoUpdate(listingId)
  }, 3500)

  return {
    queued: true,
    credits_remaining: Math.max(0, totalCredits - state.usedCredits),
    video: clone(nextVideo)
  }
}
