import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminSettingsPage from '../components/AdminSettingsPage'

const mockRequest = jest.fn()
jest.mock('../../services/authService', () => ({ AuthService: { getInstance: () => ({ makeAuthenticatedRequest: (...a: unknown[]) => mockRequest(...a) }) } }))
jest.mock('../../lib/env', () => ({ getEnvVar: () => '' }))
jest.mock('../components/Admin2FASetup', () => ({ __esModule: true, default: () => <div>2fa</div> }))
jest.mock('../components/AdminChangePassword', () => ({ __esModule: true, default: () => <div>pw</div> }))
const toast = { success: jest.fn(), error: jest.fn() }
jest.mock('../../utils/toastService', () => ({ showToast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }))

const reply = (body: unknown, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(body) })

const route = (over: Record<string, () => Promise<unknown>> = {}) => mockRequest.mockImplementation((url: string, init?: { method?: string }) => {
  const key = `${init?.method || 'GET'} ${url.replace(/^.*\/api\/admin/, '')}`
  for (const [k, v] of Object.entries(over)) if (key.startsWith(k)) return v()
  if (key.startsWith('GET /billing')) return reply({ total: 3, paying: 1, trial: 1, comped: 1, late: 0 })
  if (key.startsWith('GET /users/billing')) return reply([{ email: 'a@x.com', type: 'Loan officer', paymentStatus: 'Comped', isLate: false }])
  if (key.startsWith('GET /security')) return reply({ activityLogs: [{ id: '1', event: 'Admin login', ip: '1.2.3.4', at: '2026-10-05T12:00:00Z' }] })
  if (key.startsWith('GET /coupons')) return reply([])
  if (key.startsWith('GET /analytics/google')) return reply({ error: 'x' }, false, 500)
  return reply({})
})

describe('AdminSettingsPage', () => {
  beforeEach(() => { mockRequest.mockReset(); toast.success.mockReset(); toast.error.mockReset(); jest.restoreAllMocks() })

  it('has only the tabs that do something', async () => {
    route()
    render(<AdminSettingsPage onBack={() => undefined} />)
    expect(await screen.findByText('Customers at a glance')).toBeInTheDocument()
    for (const name of ['Billing', 'Security', 'Analytics']) expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Deliverability/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /System Config/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Update Card/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Retention Alert/)).not.toBeInTheDocument()
  })

  it('shows real customer counts and the customer list', async () => {
    route()
    render(<AdminSettingsPage onBack={() => undefined} />)
    expect(await screen.findByText('Paying')).toBeInTheDocument()
    expect(screen.getByText('a@x.com')).toBeInTheDocument()
    expect(screen.getByText('Comped', { selector: 'td' })).toBeInTheDocument()
  })

  it('tells you when the reminder email is not one of your users', async () => {
    route({ 'POST /billing/send-reminder': () => reply({ error: 'not_a_user' }, false, 404) })
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminSettingsPage onBack={() => undefined} />)
    await screen.findByText('Customers at a glance')
    fireEvent.change(screen.getByLabelText('User email for the reminder'), { target: { value: 'stranger@x.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Send reminder/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('That email is not one of your users.'))
  })

  it('shows the real admin sign-ins on the Security tab', async () => {
    route()
    render(<AdminSettingsPage onBack={() => undefined} />)
    await screen.findByText('Customers at a glance')
    fireEvent.click(screen.getByRole('button', { name: /Security/ }))
    expect(await screen.findByText('Admin login')).toBeInTheDocument()
    expect(screen.getByText(/1\.2\.3\.4/)).toBeInTheDocument()
  })
})
