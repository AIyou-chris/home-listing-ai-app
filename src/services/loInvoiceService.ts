import { buildApiUrl } from '../lib/api'
import { authHeaders } from './dashboard/utils'

// Loan officer -> agent invoices. We create, email and track them. We never handle the payment.

export type InvoiceStatus = 'sent' | 'overdue' | 'paid' | 'void'

export interface InvoiceLine {
  description: string
  amountCents: number
}

export interface Invoice {
  id?: string
  invoiceNumber: string
  agentName: string | null
  agentEmail: string
  listingId: string | null
  listingAddress: string | null
  lineItems: InvoiceLine[]
  totalCents: number
  dueDate: string | null
  paymentInstructions: string | null
  note: string | null
  status: InvoiceStatus
  sentAt: string
  paidAt: string | null
  loName: string | null
  loCompany: string | null
  loNmls: string | null
  loEmail: string | null
  loPhone: string | null
  link: string
  emailSent?: boolean
  firstViewedAt?: string | null
  viewCount?: number
  reminderCount?: number
  lastReminderAt?: string | null
}

export interface InvoiceSummary {
  outstandingCents: number
  overdueCents: number
  paidCents: number
}

export interface NewInvoiceInput {
  agentEmail: string
  agentName?: string
  listingId?: string | null
  lines: Array<{ description: string; amount: string }>
  dueDate?: string
  paymentInstructions?: string
  note?: string
}

export const formatCents = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const ERROR_TEXT: Record<string, string> = {
  invalid_agent_email: 'Enter a valid email for the agent.',
  lines_required: 'Add at least one line.',
  too_many_lines: 'An invoice can have up to 20 lines.',
  line_description_required: 'Every line needs a description.',
  invalid_line_amount: 'Every line needs an amount, like 125 or 125.50.',
  line_amount_too_large: 'One of the amounts is too large.',
  invoice_total_too_large: 'The total is too large.',
  invalid_due_date: 'Pick a valid due date.',
  cannot_invoice_yourself: 'That is your own email address.',
  daily_invoice_limit: 'You have reached today’s limit of 30 invoices.',
  listing_not_assigned: 'That listing is not co-branded with you.',
  too_soon: 'You can send one reminder a day.',
  reminder_limit_reached: 'You have already sent the maximum number of reminders.',
  not_open: 'Only open invoices can get a reminder.',
  email_not_sent: 'The email could not be sent. Copy the link and send it yourself.',
  invoice_voided: 'This invoice was voided.',
  already_paid: 'A paid invoice cannot be voided. Mark it unpaid first.'
}

const toError = async (res: Response, fallback: string) => {
  const payload = (await res.json().catch(() => ({}))) as { error?: string }
  return new Error(ERROR_TEXT[String(payload.error || '')] || fallback)
}

const jsonHeaders = async () => authHeaders(null)

export const fetchInvoices = async (): Promise<{ invoices: Invoice[]; summary: InvoiceSummary }> => {
  const res = await fetch(buildApiUrl('/api/lo/invoices'), { headers: await jsonHeaders() })
  if (!res.ok) throw await toError(res, 'Could not load invoices.')
  return res.json()
}

export const createInvoice = async (input: NewInvoiceInput): Promise<{ invoice: Invoice; emailSent: boolean }> => {
  const res = await fetch(buildApiUrl('/api/lo/invoices'), {
    method: 'POST',
    headers: await jsonHeaders(),
    body: JSON.stringify(input)
  })
  if (!res.ok) throw await toError(res, 'Could not send the invoice.')
  return res.json()
}

const post = async (path: string, body: unknown, fallback: string): Promise<Invoice> => {
  const res = await fetch(buildApiUrl(path), { method: 'POST', headers: await jsonHeaders(), body: JSON.stringify(body ?? {}) })
  if (!res.ok) throw await toError(res, fallback)
  const payload = (await res.json()) as { invoice: Invoice }
  return payload.invoice
}

export const setInvoicePaid = (id: string, paid: boolean) =>
  post(`/api/lo/invoices/${encodeURIComponent(id)}/paid`, { paid }, 'Could not update the invoice.')

export const voidInvoice = (id: string) =>
  post(`/api/lo/invoices/${encodeURIComponent(id)}/void`, {}, 'Could not void the invoice.')

export const remindInvoice = (id: string) =>
  post(`/api/lo/invoices/${encodeURIComponent(id)}/remind`, {}, 'Could not send the reminder.')

export const downloadInvoicesCsv = async () => {
  const res = await fetch(buildApiUrl('/api/lo/invoices/export.csv'), { headers: await jsonHeaders() })
  if (!res.ok) throw await toError(res, 'Could not export invoices.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Public invoice page (no login, token in the link).
export const fetchPublicInvoice = async (token: string): Promise<{ invoice: Invoice; disclaimer: string }> => {
  const res = await fetch(buildApiUrl(`/api/public/invoice/${encodeURIComponent(token)}`))
  if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : 'failed')
  return res.json()
}

// The agent's own list (read only).
export const fetchMyInvoices = async (): Promise<Invoice[]> => {
  const res = await fetch(buildApiUrl('/api/dashboard/my-invoices'), { headers: await jsonHeaders() })
  if (!res.ok) return []
  const payload = (await res.json()) as { invoices?: Invoice[] }
  return payload.invoices || []
}
