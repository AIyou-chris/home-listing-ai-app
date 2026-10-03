import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LOInvoicesPage from '../dashboard-command/LOInvoicesPage'

jest.mock('../../services/dashboard/utils', () => ({
  authHeaders: jest.fn(async () => ({ 'Content-Type': 'application/json' }))
}))

jest.mock('../../lib/api', () => ({ buildApiUrl: (p: string) => p }))

jest.mock('../dashboard-command/PageGuide', () => ({ __esModule: true, default: () => null }))

jest.mock('../../utils/toastService', () => ({
  showToast: { success: jest.fn(), error: jest.fn() }
}))

jest.mock('../../services/loInvoiceService', () => ({
  fetchInvoices: jest.fn(),
  createInvoice: jest.fn(),
  setInvoicePaid: jest.fn(),
  remindInvoice: jest.fn(),
  voidInvoice: jest.fn(),
  downloadInvoicesCsv: jest.fn(),
  formatCents: (cents: number) => `$${(cents / 100).toFixed(2)}`
}))

const svc = jest.requireMock('../../services/loInvoiceService') as Record<string, jest.Mock>

const invoice = (over: Record<string, unknown> = {}) => ({
  id: 'i1', invoiceNumber: 'INV-0001', agentName: 'Maya Reynolds', agentEmail: 'maya@example.com',
  listingId: null, listingAddress: '1 Main St', lineItems: [{ description: 'Flyers', amountCents: 12550 }], totalCents: 12550,
  dueDate: null, paymentInstructions: null, note: null, status: 'sent', sentAt: '2026-10-01T12:00:00Z', paidAt: null,
  loName: 'Pat', loCompany: null, loNmls: null, loEmail: null, loPhone: null, link: 'https://x/invoice/abc',
  emailSent: true, firstViewedAt: null, viewCount: 0, reminderCount: 0, lastReminderAt: null,
  ...over
})

const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ partners: [{ agentId: 'a1', name: 'Maya Reynolds', email: 'maya@example.com', listings: [{ listingId: 'l1', address: '1 Main St' }] }] })
  })) as unknown as typeof fetch
  svc.fetchInvoices.mockResolvedValue({
    invoices: [invoice(), invoice({ id: 'i2', invoiceNumber: 'INV-0002', status: 'paid', paidAt: '2026-10-02T12:00:00Z', totalCents: 5000 })],
    summary: { outstandingCents: 12550, overdueCents: 0, paidCents: 5000 }
  })
})

afterEach(() => {
  jest.clearAllMocks()
  global.fetch = originalFetch
})

const renderPage = (url = '/dashboard/lo-invoices') =>
  render(<MemoryRouter initialEntries={[url]}><LOInvoicesPage /></MemoryRouter>)

describe('LOInvoicesPage', () => {
  it('lists invoices with the money summary and filters them', async () => {
    renderPage()
    expect(await screen.findByText('INV-0001 · 1 Main St')).toBeInTheDocument()
    expect(screen.getByText('INV-0002 · 1 Main St')).toBeInTheDocument()
    expect(screen.getByText('Waiting on payment')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'paid' }))
    expect(screen.queryByText('INV-0001 · 1 Main St')).not.toBeInTheDocument()
    expect(screen.getByText('INV-0002 · 1 Main St')).toBeInTheDocument()
  })

  it('marks an open invoice paid', async () => {
    svc.setInvoicePaid.mockResolvedValue(invoice({ status: 'paid', paidAt: '2026-10-03T12:00:00Z' }))
    renderPage()
    await screen.findByText('INV-0001 · 1 Main St')
    fireEvent.click(screen.getByRole('button', { name: 'Mark paid' }))
    await waitFor(() => expect(svc.setInvoicePaid).toHaveBeenCalledWith('i1', true))
  })

  it('opens the form pre-filled from the Partners page and sends the invoice', async () => {
    svc.createInvoice.mockResolvedValue({ invoice: invoice({ id: 'i3', invoiceNumber: 'INV-0003' }), emailSent: true })
    renderPage('/dashboard/lo-invoices?new=1&email=maya%40example.com&name=Maya%20Reynolds')

    const dialog = await screen.findByRole('dialog', { name: /new invoice/i })
    expect(within(dialog).getByLabelText('Agent email')).toHaveValue('maya@example.com')
    expect(within(dialog).getByLabelText('Agent name')).toHaveValue('Maya Reynolds')

    const send = within(dialog).getByRole('button', { name: /send invoice/i })
    expect(send).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText('Line 1 description'), { target: { value: 'Share of flyers' } })
    fireEvent.change(within(dialog).getByLabelText('Line 1 amount'), { target: { value: '125.50' } })
    expect(within(dialog).getByRole('button', { name: /send invoice · \$125\.50/i })).toBeEnabled()
    expect(within(dialog).getByText(/does not process or hold payments/i)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: /send invoice/i }))
    await waitFor(() => expect(svc.createInvoice).toHaveBeenCalledTimes(1))
    expect(svc.createInvoice.mock.calls[0][0]).toMatchObject({
      agentEmail: 'maya@example.com',
      lines: [{ description: 'Share of flyers', amount: '125.50' }]
    })
    expect(await screen.findByText(/INV-0003 sent/)).toBeInTheDocument()
  })

  it('shows a plain error when the server refuses the invoice', async () => {
    svc.createInvoice.mockRejectedValue(new Error('Enter a valid email for the agent.'))
    renderPage('/dashboard/lo-invoices?new=1&email=bad&name=X')
    const dialog = await screen.findByRole('dialog', { name: /new invoice/i })
    fireEvent.change(within(dialog).getByLabelText('Line 1 description'), { target: { value: 'x' } })
    fireEvent.change(within(dialog).getByLabelText('Line 1 amount'), { target: { value: '5' } })
    fireEvent.submit(within(dialog).getByRole('button', { name: /send invoice/i }).closest('form') as HTMLFormElement)
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Enter a valid email for the agent.')
  })
})
