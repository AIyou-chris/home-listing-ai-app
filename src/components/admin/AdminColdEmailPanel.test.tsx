import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminColdEmailPanel from './AdminColdEmailPanel'
import { parseProspectCsv } from '../../services/adminColdEmailService'

jest.mock('react-hot-toast', () => ({ __esModule: true, default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }) }))
const mockFetch = jest.fn()
jest.mock('../../lib/api', () => ({ buildApiUrl: (p: string) => p }))
jest.mock('../../services/authedFetch', () => ({ authedFetch: (...a: unknown[]) => mockFetch(...a) }))

const reply = (body: unknown, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(body) })

describe('parseProspectCsv', () => {
  it('reads a header row, quotes and commas inside quotes', () => {
    const rows = parseProspectCsv('Email,First Name,Company\nsam@x.com,Sam,"Acme, Inc"\r\nann@y.com,Ann,Beta')
    expect(rows).toEqual([
      { email: 'sam@x.com', first_name: 'Sam', company: 'Acme, Inc' },
      { email: 'ann@y.com', first_name: 'Ann', company: 'Beta' }
    ])
  })
  it('returns nothing without data rows', () => {
    expect(parseProspectCsv('email')).toEqual([])
  })
})

const SWITCH_OFF = { enabled: false, setupBlockers: [], waiting: 0 }
// The master switch loads right away; everything else loads when the panel is opened.
const routed = (overview: unknown, sw: unknown = SWITCH_OFF) => mockFetch.mockImplementation((url: string) => reply(String(url).includes('/switch') ? sw : overview))

describe('AdminColdEmailPanel', () => {
  beforeEach(() => mockFetch.mockReset())

  it('stays closed until opened, then shows what still blocks sending', async () => {
    routed({
      tablesReady: true, blockers: ['Set COLD_EMAIL_DOMAIN to a separate sending domain.'],
      config: { domain: null, mailboxes: 0, enabled: false, postalAddress: '1 Main St', replyWebhook: false }, counts: {}
    })
    render(<AdminColdEmailPanel />)
    expect(mockFetch).not.toHaveBeenCalledWith('/api/admin/cold-email/overview', expect.anything())
    fireEvent.click(screen.getByRole('button', { name: /Cold email to loan officers/ }))
    expect(await screen.findByText(/Set COLD_EMAIL_DOMAIN to a separate sending domain/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send a test to me' })).toBeDisabled()
  })

  it('tells you when the database tables are missing', async () => {
    routed({ tablesReady: false, blockers: [], config: { domain: null, mailboxes: 0, enabled: false, postalAddress: '', replyWebhook: false }, counts: {} })
    render(<AdminColdEmailPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Cold email to loan officers/ }))
    expect((await screen.findAllByText(/cold-email-migration.sql/)).length).toBeGreaterThan(0)
  })

  it('shows a load error with Try again', async () => {
    mockFetch.mockReturnValueOnce(reply({ error: 'cold_email_failed' }, false, 500))
    render(<AdminColdEmailPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Cold email to loan officers/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument())
  })

  it('starts OFF and cannot be turned on until the sending setup is finished', async () => {
    routed({}, { enabled: false, setupBlockers: ['Set COLD_EMAIL_DOMAIN to a separate sending domain.'], waiting: 0 })
    render(<AdminColdEmailPanel />)
    expect(await screen.findByText('Email sending is OFF')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Email sending' })).toBeDisabled()
    expect(screen.getByText(/Not ready to turn on/)).toBeInTheDocument()
  })

  it('asks before turning ON, and turns OFF without asking', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true)
    let enabled = false
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') { enabled = JSON.parse(String(init.body)).enabled; return reply({ enabled }) }
      return reply({ enabled, setupBlockers: [], waiting: 3 })
    })
    render(<AdminColdEmailPanel />)
    fireEvent.click(await screen.findByRole('switch', { name: 'Email sending' }))
    await waitFor(() => expect(screen.getByText('Email sending is ON')).toBeInTheDocument())
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('3 approved emails'))
    confirm.mockClear()
    fireEvent.click(screen.getByRole('switch', { name: 'Email sending' }))
    await waitFor(() => expect(screen.getByText('Email sending is OFF')).toBeInTheDocument())
    expect(confirm).not.toHaveBeenCalled()
    confirm.mockRestore()
  })
})
