import { renderHook, act, waitFor } from '@testing-library/react'

import { useAdminUsers } from '../use-admin-users'
import { AuthService } from '../../services/authService'

describe('useAdminUsers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('adds a new user to the collection', async () => {
    const makeAuthenticatedRequest = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ users: [] }) })
    jest.spyOn(AuthService, 'getInstance').mockReturnValue({
      makeAuthenticatedRequest
    } as unknown as AuthService)

    const { result } = renderHook(() => useAdminUsers())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.users.length).toBeGreaterThan(0)

    await act(async () => {
      await result.current.addUser({
        name: 'Test User',
        email: 'test@example.com',
        role: 'agent',
        plan: 'Solo Agent'
      })
    })

    expect(result.current.users[0].name).toBe('Test User')
  })

  it('updates an existing user', async () => {
    const makeAuthenticatedRequest = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ users: [] }) })
    jest.spyOn(AuthService, 'getInstance').mockReturnValue({
      makeAuthenticatedRequest
    } as unknown as AuthService)

    const { result } = renderHook(() => useAdminUsers())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const original = result.current.users[0]

    await act(async () => {
      await result.current.updateUser({ id: original.id, name: 'Updated Name' })
    })

    expect(result.current.users[0].name).toBe('Updated Name')
  })
})


