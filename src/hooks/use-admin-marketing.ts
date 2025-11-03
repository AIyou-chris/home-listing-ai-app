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

export const useAdminMarketing = ({ autoFetch = false }: UseAdminMarketingOptions = {}) => {
  const [activeTab, setActiveTab] = useState<MarketingTab>('follow-up-sequences')
  const [followUpSequences, setFollowUpSequences] = useState<MarketingFollowUpSequence[]>([])
  const [activeFollowUps, setActiveFollowUps] = useState<MarketingActiveFollowUp[]>([])
  const [qrCodes, setQrCodes] = useState<MarketingQRCode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchSequences = useCallback(async (auth: AuthService) => {
    const response = await auth.makeAuthenticatedRequest(
      'http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/sequences'
    )
    if (!response.ok) {
      throw new Error(`Failed to load follow-up sequences: ${response.statusText}`)
    }
    const data = await response.json()
    const sequences = Array.isArray(data?.sequences) ? data.sequences : []
    setFollowUpSequences(sequences as MarketingFollowUpSequence[])
  }, [])

  const fetchActiveFollowUps = useCallback(async (auth: AuthService) => {
    const response = await auth.makeAuthenticatedRequest(
      'http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/active-followups'
    )
    if (!response.ok) {
      throw new Error(`Failed to load active follow-ups: ${response.statusText}`)
    }
    const data = await response.json()
    const followUps = Array.isArray(data?.activeFollowUps) ? data.activeFollowUps : []
    setActiveFollowUps(followUps as MarketingActiveFollowUp[])
  }, [])

  const fetchQrCodes = useCallback(async (auth: AuthService) => {
    const response = await auth.makeAuthenticatedRequest(
      'http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/qr-codes'
    )
    if (!response.ok) {
      throw new Error(`Failed to load QR codes: ${response.statusText}`)
    }
    const data = await response.json()
    const codes = Array.isArray(data?.qrCodes) ? data.qrCodes : []
    setQrCodes(codes as MarketingQRCode[])
  }, [])

  const refreshMarketingData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const auth = AuthService.getInstance()
      await Promise.all([fetchSequences(auth), fetchActiveFollowUps(auth), fetchQrCodes(auth)])
      setHasLoaded(true)
    } catch (error) {
      console.error('useAdminMarketing: failed to refresh data', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load marketing data')
    } finally {
      setIsLoading(false)
    }
  }, [fetchActiveFollowUps, fetchQrCodes, fetchSequences])

  useEffect(() => {
    if (autoFetch) {
      refreshMarketingData()
    }
  }, [autoFetch, refreshMarketingData])

  const deleteSequence = useCallback(
    async (sequenceId: string) => {
      const auth = AuthService.getInstance()
      const response = await auth.makeAuthenticatedRequest(
        `http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/sequences/${sequenceId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete sequence')
      }

      setFollowUpSequences(prev => prev.filter(sequence => sequence.id !== sequenceId))
    },
    []
  )

  const deleteQrCode = useCallback(
    async (qrCodeId: string) => {
      const auth = AuthService.getInstance()
      const response = await auth.makeAuthenticatedRequest(
        `http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/qr-codes/${qrCodeId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete QR code')
      }

      setQrCodes(prev => prev.filter(qrCode => qrCode.id !== qrCodeId))
    },
    []
  )

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

