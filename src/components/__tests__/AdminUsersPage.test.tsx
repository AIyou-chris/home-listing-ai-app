import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminUsersPage from '../AdminUsersPage'

const mockRequest = jest.fn()
jest.mock('../../services/authService', () => ({ AuthService: { getInstance: () => ({ makeAuthenticatedRequest: (...a: unknown[]) => mockRequest(...a) }) } }))

const reply = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) })
const USERS = [
  { id: 'a1', auth_user_id: 'u1', first_name: 'Ana', last_name: 'Lo', email: 'ana@lo.com', status: 'active', created_at: '2026-09-01T00:00:00Z', account_type: 'lo', payment_status: 'comp' },
  { id: 'a2', auth_user_id: 'u2', first_name: 'Ray', last_name: 'Agent', email: 'ray@agent.com', status: 'active', created_at: '2026-09-02T00:00:00Z', account_type: 'realtor', payment_status: 'awaiting_payment' }
]

describe('AdminUsersPage', () => {
  beforeEach(() => mockRequest.mockReset())

  it('shows who is a loan officer or agent and what plan they are on, with no fake Impersonate button', async () => {
    mockRequest.mockReturnValue(reply(USERS))
    render(<AdminUsersPage />)
    expect(await screen.findByText('Loan officer')).toBeInTheDocument()
    expect(screen.getByText('Agent (free)')).toBeInTheDocument()
    expect(screen.getByText('Comped')).toBeInTheDocument()
    expect(screen.queryByText('Impersonate')).not.toBeInTheDocument()
  })

  it('names the person before deleting, and deletes nothing if you say no', async () => {
    mockRequest.mockReturnValue(reply(USERS))
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminUsersPage />)
    await screen.findByText('Loan officer')
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(confirmSpy.mock.calls[0][0]).toMatch(/Delete Ana Lo \(ana@lo.com\)/)
    expect(mockRequest.mock.calls.some((c) => c[1]?.method === 'DELETE')).toBe(false)
  })

  it('puts the person back and shows an error when the server refuses the delete', async () => {
    mockRequest.mockImplementation((_url: string, init?: { method?: string }) => (init?.method === 'DELETE' ? reply({ error: 'cannot_delete_admin' }, false) : reply(USERS)))
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminUsersPage />)
    await screen.findByText('Loan officer')
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(await screen.findByText(/cannot_delete_admin/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('ana@lo.com')).toBeInTheDocument())
  })

  it('lets you set a custom domain on an office account only', async () => {
    const office = { id: 'o1', auth_user_id: 'u3', first_name: 'Big', last_name: 'Office', email: 'o@x.com', status: 'active', created_at: '2026-09-03T00:00:00Z', account_type: 'office', payment_status: 'comp' }
    mockRequest.mockImplementation((_url: string, init?: { method?: string }) => (init?.method === 'PUT' ? reply({ success: true, customDomain: 'homes.big.com' }) : reply([...USERS, office])))
    jest.spyOn(window, 'prompt').mockReturnValue('homes.big.com')
    render(<AdminUsersPage />)
    expect(await screen.findAllByText('Set domain')).toHaveLength(1)
    fireEvent.click(screen.getByText('Set domain'))
    expect(await screen.findByText('Domain: homes.big.com')).toBeInTheDocument()
  })
})
