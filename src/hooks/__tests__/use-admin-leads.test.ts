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
      .mockImplementation(async (_url: string, opts?: { method?: string; body?: string }) => {
        const method = opts?.method ?? 'GET'
        if (method === 'POST') {
          const body = JSON.parse(opts?.body ?? '{}')
          return { ok: true, json: async () => ({ lead: { id: 'lead-1', ...body } }) }
        }
        if (method === 'PUT') {
          const body = JSON.parse(opts?.body ?? '{}')
          return { ok: true, json: async () => ({ lead: body }) }
        }
        return { ok: true, json: async () => ({ leads: [] }) }
      })
    // adminLeadsService binds `AuthService.getInstance()` (the singleton) at module
    // load, so spy the singleton instance's method — the same object the service
    // already holds — rather than mocking getInstance.
    jest
      .spyOn(AuthService.getInstance(), 'makeAuthenticatedRequest')
      .mockImplementation(makeAuthenticatedRequest as never)

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


