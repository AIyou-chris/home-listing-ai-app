import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminLOPage } from '../components/AdminLOPage'

const mockRequest = jest.fn()
jest.mock('../../services/authService', () => ({ AuthService: { getInstance: () => ({ makeAuthenticatedRequest: (...a: unknown[]) => mockRequest(...a) }) } }))

const reply = (body: unknown, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(body) })
const LO = { id: 'a1', auth_user_id: 'u1', first_name: 'Ana', last_name: 'Lo', email: 'ana@lo.com', company: 'Acme', account_type: 'lo', payment_status: 'comp', nmls_number: '123', created_at: '2026-09-01T00:00:00Z', partnerCount: 2, listingCount: 3, preQualCount: 1 }
const INVITE = { id: 'i1', invited_email: 'ray@agent.com', invited_name: 'Ray', status: 'pending', created_at: '2026-09-02T00:00:00Z', claimed_at: null, view_count: 3, lo: { first_name: 'Ana', last_name: 'Lo', email: 'ana@lo.com' } }

const ok = () => mockRequest.mockImplementation((url: string) => {
  if (url.includes('/users')) return reply({ los: [LO] })
  if (url.includes('/invites')) return reply({ invites: [INVITE] })
  if (url.includes('/pre-quals')) return reply({ preQuals: [] })
  return reply({ offices: [] })
})

describe('AdminLOPage', () => {
  beforeEach(() => mockRequest.mockReset())

  it('shows loan officers with a readable plan', async () => {
    ok()
    render(<AdminLOPage />)
    expect(await screen.findByText('Comped')).toBeInTheDocument()
    expect(screen.getByText('Ana Lo')).toBeInTheDocument()
  })

  it('shows who sent each invite and how many times it was viewed', async () => {
    ok()
    render(<AdminLOPage />)
    await screen.findByText('Ana Lo')
    fireEvent.click(screen.getByRole('button', { name: /WOW Invites/ }))
    expect(await screen.findByText('3 views')).toBeInTheDocument()
    expect(screen.getByText('Ana Lo', { selector: 'td' })).toBeInTheDocument()
  })

  it('says a list failed instead of pretending it is empty, and can retry', async () => {
    mockRequest.mockImplementation((url: string) => (url.includes('/pre-quals') ? reply({}, false, 500) : url.includes('/users') ? reply({ los: [LO] }) : reply({ invites: [], offices: [] })))
    render(<AdminLOPage />)
    expect(await screen.findByText(/Could not load: pre-quals/)).toBeInTheDocument()
    expect(screen.getByText('Ana Lo')).toBeInTheDocument()
    ok()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.queryByText(/Could not load/)).not.toBeInTheDocument())
  })

  it('opens a read-only account check with the problems in plain words', async () => {
    mockRequest.mockImplementation((url: string) => {
      if (url.includes('/support')) return reply({
        lo: { id: 'a1', name: 'Ana Lo', email: 'ana@lo.com', phone: null, company: 'Acme', nmls: '123', joined: '2026-09-01T00:00:00Z', lastSeen: null, slug: 'ana' },
        plan: 'Free trial (no card)', trialDaysLeft: 3,
        stats: { listings: 0, invitesSent: 0, invitesViewed: 0, invitesClaimed: 0, leads: 0, lastLeadAt: null },
        checklist: [{ key: 'brain', label: 'AI Brain has knowledge', ok: false }],
        problems: ['AI Brain is empty, so buyer answers are generic.'],
        recentLeads: [], invites: [], calls: []
      })
      if (url.includes('/users')) return reply({ los: [LO] })
      return reply({ invites: [], preQuals: [], offices: [] })
    })
    render(<AdminLOPage />)
    await screen.findByText('Ana Lo')
    fireEvent.click(screen.getByRole('button', { name: 'Check account' }))
    expect(await screen.findByText('What looks wrong')).toBeInTheDocument()
    expect(screen.getByText(/AI Brain is empty/)).toBeInTheDocument()
    expect(screen.getByText('3 trial days left')).toBeInTheDocument()
    expect(mockRequest.mock.calls.some((c) => String(c[0]).includes('/api/admin/lo/users/a1/support'))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByText('What looks wrong')).not.toBeInTheDocument())
  })
})
