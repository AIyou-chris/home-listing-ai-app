import { useCallback, useEffect, useState } from 'react'

import { AuthService } from '../services/authService'
import { ActiveLeadFollowUp, FollowUpSequence } from '../types'

export type MarketingTab = 'follow-up-sequences' | 'active-follow-ups' | 'qr-code-system' | 'analytics'

export interface MarketingQRCode {
  id: string
  name: string
  destinationUrl: string
  scanCount: number
  createdAt: string
  status?: string
}

export type MarketingFollowUpSequence = FollowUpSequence

export type MarketingActiveFollowUp = ActiveLeadFollowUp & {
  leadName: string
  sequenceName: string
}

interface UseAdminMarketingOptions {
  autoFetch?: boolean
}

const DEMO_SEQUENCES: MarketingFollowUpSequence[] = [
  {
    id: 'demo-sequence-1',
    name: 'New Lead Warm-Up',
    description: 'Five-day welcome sequence that pairs AI emails with personal touches.',
    triggerType: 'Lead Created',
    isActive: true,
    steps: [
      {
        id: 'demo-step-1',
        type: 'ai-email',
        delay: { value: 0, unit: 'hours' },
        subject: 'Quick intro + property highlights',
        content: 'Welcome email generated with neighborhood talking points and lead-specific CTA.'
      },
      {
        id: 'demo-step-2',
        type: 'task',
        delay: { value: 1, unit: 'days' },
        content: 'Call lead to qualify timeline and financing readiness.'
      },
      {
        id: 'demo-step-3',
        type: 'ai-email',
        delay: { value: 2, unit: 'days' },
        subject: 'Market snapshot + recommended listings',
        content: 'AI-curated update referencing MLS activity, pricing trends, and matching homes.'
      }
    ],
    analytics: {
      totalLeads: 128,
      emailsSent: 384,
      emailsOpened: 302,
      emailsClicked: 186,
      responsesReceived: 74,
      openRate: 0.79,
      clickRate: 0.49,
      responseRate: 0.58,
      lastUpdated: '2025-10-28T13:00:00Z'
    }
  },
  {
    id: 'demo-sequence-2',
    name: 'Past Client Re-Engagement',
    description: 'Quarterly nurture dripping testimonials, market updates, and referrals.',
    triggerType: 'Past Client / Sphere',
    isActive: true,
    steps: [
      {
        id: 'demo-step-4',
        type: 'ai-email',
        delay: { value: 0, unit: 'days' },
        subject: 'Checking in + updated home value snapshot',
        content: 'Friendly AI-written check-in that references MLS comps and upsell opportunities.'
      },
      {
        id: 'demo-step-5',
        type: 'meeting',
        delay: { value: 7, unit: 'days' },
        content: 'Invite past client to strategy session or annual review.',
        meetingDetails: {
          date: '2025-11-15',
          time: '14:00',
          location: 'Zoom – Personal Meeting Room'
        }
      }
    ],
    analytics: {
      totalLeads: 62,
      emailsSent: 124,
      emailsOpened: 93,
      responsesReceived: 27,
      openRate: 0.75,
      responseRate: 0.43,
      lastUpdated: '2025-10-22T09:30:00Z'
    },
    smartTriggers: [
      {
        id: 'trigger-open',
        name: 'Engaged Past Client',
        description: 'Follow up when a past client clicks any property update email.',
        eventType: 'email_click',
        conditions: [
          { field: 'emailType', operator: 'equals', value: 'past-client-update' },
          { field: 'clickCount', operator: 'greater_than', value: 0 }
        ],
        isActive: true,
        priority: 6,
        cooldownPeriod: 24
      }
    ]
  }
]

const DEMO_ACTIVE_FOLLOWUPS: MarketingActiveFollowUp[] = [
  {
    id: 'active-followup-1',
    leadId: 'lead-98341',
    leadName: 'Jamie Carter',
    sequenceId: 'demo-sequence-1',
    sequenceName: 'New Lead Warm-Up',
    status: 'active',
    currentStepIndex: 1,
    nextStepDate: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    history: [
      {
        id: 'history-1',
        type: 'email_sent',
        description: 'AI intro email sent automatically',
        date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'history-2',
        type: 'email_opened',
        description: 'Lead opened intro email (mobile)',
        date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: 'active-followup-2',
    leadId: 'lead-44221',
    leadName: 'Priya Shah',
    sequenceId: 'demo-sequence-2',
    sequenceName: 'Past Client Re-Engagement',
    status: 'paused',
    currentStepIndex: 0,
    nextStepDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    history: [
      {
        id: 'history-3',
        type: 'email_clicked',
        description: 'Lead clicked valuation link',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ]
  }
]

const DEMO_QR_CODES: MarketingQRCode[] = [
  {
    id: 'qr-heritage-lofts',
    name: 'Heritage Lofts Open House',
    destinationUrl: 'https://homelistingai.com/listings/heritage-lofts',
    scanCount: 186,
    createdAt: '2025-09-12',
    status: 'active'
  },
  {
    id: 'qr-buyer-guide',
    name: '2025 Buyer Guide Download',
    destinationUrl: 'https://homelistingai.com/resources/buyer-guide',
    scanCount: 402,
    createdAt: '2025-08-03',
    status: 'active'
  },
  {
    id: 'qr-coaching',
    name: 'Agent Coaching Landing Page',
    destinationUrl: 'https://homelistingai.com/coaching',
    scanCount: 91,
    createdAt: '2025-10-19',
    status: 'draft'
  }
]

const loadWithFallback = async <T,>(
  label: string,
  loader: () => Promise<T>,
  onSuccess: (data: T) => void,
  fallback: () => T
): Promise<boolean> => {
  try {
    const data = await loader()
    onSuccess(data)
    return true
  } catch (error) {
    console.warn(`useAdminMarketing: ${label} request failed, using demo data`, error)
    onSuccess(fallback())
    return false
  }
}

const parseSequences = (payload: unknown): MarketingFollowUpSequence[] => {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const sequences = Array.isArray((payload as Record<string, unknown>).sequences)
    ? (payload as Record<string, unknown>).sequences
    : []

  return sequences as MarketingFollowUpSequence[]
}

const parseActiveFollowUps = (payload: unknown): MarketingActiveFollowUp[] => {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const followUps = Array.isArray((payload as Record<string, unknown>).activeFollowUps)
    ? (payload as Record<string, unknown>).activeFollowUps
    : []

  return followUps as MarketingActiveFollowUp[]
}

const parseQrCodes = (payload: unknown): MarketingQRCode[] => {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const qrCodes = Array.isArray((payload as Record<string, unknown>).qrCodes)
    ? (payload as Record<string, unknown>).qrCodes
    : []

  return qrCodes as MarketingQRCode[]
}

export const useAdminMarketing = ({ autoFetch = false }: UseAdminMarketingOptions = {}) => {
  const [activeTab, setActiveTab] = useState<MarketingTab>('follow-up-sequences')
  const [followUpSequences, setFollowUpSequences] = useState<MarketingFollowUpSequence[]>([])
  const [activeFollowUps, setActiveFollowUps] = useState<MarketingActiveFollowUp[]>([])
  const [qrCodes, setQrCodes] = useState<MarketingQRCode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const refreshMarketingData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const auth = AuthService.getInstance()

      const [sequenceSuccess, activeFollowUpsSuccess, qrCodeSuccess] = await Promise.all([
        loadWithFallback(
          'marketing sequences',
          async () => {
            const response = await auth.makeAuthenticatedRequest('/api/admin/marketing/sequences')
            if (!response.ok) {
              throw new Error(`Failed to load sequences (${response.status})`)
            }
            const payload = await response.json()
            return parseSequences(payload)
          },
          data => setFollowUpSequences(data),
          () => DEMO_SEQUENCES
        ),
        loadWithFallback(
          'active follow-ups',
          async () => {
            const response = await auth.makeAuthenticatedRequest('/api/admin/marketing/active-followups')
            if (!response.ok) {
              throw new Error(`Failed to load active follow-ups (${response.status})`)
            }
            const payload = await response.json()
            return parseActiveFollowUps(payload)
          },
          data => setActiveFollowUps(data),
          () => DEMO_ACTIVE_FOLLOWUPS
        ),
        loadWithFallback(
          'marketing QR codes',
          async () => {
            const response = await auth.makeAuthenticatedRequest('/api/admin/marketing/qr-codes')
            if (!response.ok) {
              throw new Error(`Failed to load QR codes (${response.status})`)
            }
            const payload = await response.json()
            return parseQrCodes(payload)
          },
          data => setQrCodes(data),
          () => DEMO_QR_CODES
        )
      ])

      if (!sequenceSuccess || !activeFollowUpsSuccess || !qrCodeSuccess) {
        setErrorMessage('Showing live demo marketing data while the API is offline.')
      }

      setHasLoaded(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoFetch) {
      refreshMarketingData()
    }
  }, [autoFetch, refreshMarketingData])

  const deleteSequence = useCallback(async (sequenceId: string) => {
    try {
      const auth = AuthService.getInstance()
      const response = await auth.makeAuthenticatedRequest(
        `/api/admin/marketing/sequences/${sequenceId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete sequence (${response.status})`)
      }
    } catch (error) {
      console.warn('useAdminMarketing: delete sequence fallback', error)
    } finally {
      setFollowUpSequences(prev => prev.filter(sequence => sequence.id !== sequenceId))
    }
  }, [])

  const deleteQrCode = useCallback(async (qrCodeId: string) => {
    try {
      const auth = AuthService.getInstance()
      const response = await auth.makeAuthenticatedRequest(
        `/api/admin/marketing/qr-codes/${qrCodeId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete QR code (${response.status})`)
      }
    } catch (error) {
      console.warn('useAdminMarketing: delete QR code fallback', error)
    } finally {
      setQrCodes(prev => prev.filter(qrCode => qrCode.id !== qrCodeId))
    }
  }, [])

  return {
    activeMarketingTab: activeTab,
    setActiveMarketingTab: setActiveTab,
    followUpSequences,
    activeFollowUps,
    qrCodes,
    isLoading,
    hasLoaded,
    errorMessage,
    refreshMarketingData,
    deleteSequence,
    deleteQrCode,
  }
}

