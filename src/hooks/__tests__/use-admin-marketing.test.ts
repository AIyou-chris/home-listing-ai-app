import { renderHook, act } from '@testing-library/react'

import { useAdminMarketing } from '../use-admin-marketing'
import { AuthService } from '../../services/authService'

const createResponse = (payload: unknown) => ({ ok: true, json: async () => payload })

describe('useAdminMarketing', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads marketing data and supports deletions', async () => {
    const makeAuthenticatedRequest = jest.fn()
    const mockAuth = { makeAuthenticatedRequest } as unknown as AuthService
    jest.spyOn(AuthService, 'getInstance').mockReturnValue(mockAuth)

    const sequence = {
      id: 'seq-1',
      name: 'Welcome Series',
      description: 'Initial onboarding touch points',
      triggerType: 'Lead Capture' as const,
      steps: [
        {
          id: 'step-1',
          type: 'email' as const,
          delay: { value: 1, unit: 'days' as const },
          content: 'Hello there!'
        }
      ],
      isActive: true
    }

    const followUp = {
      id: 'follow-1',
      leadId: 'lead-1',
      sequenceId: 'seq-1',
      status: 'active' as const,
      currentStepIndex: 0,
      nextStepDate: '2024-01-01',
      history: []
    }

    const qrCode = {
      id: 'qr-1',
      name: 'Open House QR',
      destinationUrl: 'https://example.com/open-house',
      scanCount: 12,
      createdAt: '2024-01-01'
    }

    makeAuthenticatedRequest
      .mockResolvedValueOnce(createResponse({ sequences: [sequence] }))
      .mockResolvedValueOnce(createResponse({ activeFollowUps: [followUp] }))
      .mockResolvedValueOnce(createResponse({ qrCodes: [qrCode] }))

    const { result } = renderHook(() => useAdminMarketing())

    await act(async () => {
      await result.current.refreshMarketingData()
    })

    expect(result.current.followUpSequences).toHaveLength(1)
    expect(result.current.activeFollowUps).toHaveLength(1)
    expect(result.current.qrCodes).toHaveLength(1)

    makeAuthenticatedRequest.mockResolvedValueOnce({ ok: true })
    await act(async () => {
      await result.current.deleteSequence(sequence.id)
    })
    expect(result.current.followUpSequences).toHaveLength(0)

    makeAuthenticatedRequest.mockResolvedValueOnce({ ok: true })
    await act(async () => {
      await result.current.deleteQrCode(qrCode.id)
    })
    expect(result.current.qrCodes).toHaveLength(0)
  })
})


