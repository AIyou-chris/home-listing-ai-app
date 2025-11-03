import { renderHook, act, waitFor } from '@testing-library/react'

import { useAdminLeads } from '../use-admin-leads'
import { AuthService } from '../../services/authService'

describe('useAdminLeads', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('adds and updates a lead', async () => {
    const makeAuthenticatedRequest = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ leads: [] }) })
    jest.spyOn(AuthService, 'getInstance').mockReturnValue({
      makeAuthenticatedRequest
    } as unknown as AuthService)

    const { result } = renderHook(() => useAdminLeads())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.addLead({
        name: 'Test Lead',
        email: 'lead@example.com',
        phone: '555-0000',
        status: 'New',
        source: 'Website',
        notes: 'Interested in downtown listings'
      })
    })

    expect(result.current.leads[0].name).toBe('Test Lead')

    const leadId = result.current.leads[0].id
    await act(async () => {
      await result.current.updateLead({ id: leadId, status: 'Qualified' })
    })

    expect(result.current.leads[0].status).toBe('Qualified')
  })
})


