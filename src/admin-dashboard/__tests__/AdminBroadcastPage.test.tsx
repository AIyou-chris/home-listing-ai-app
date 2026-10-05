import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminBroadcastPage from '../components/AdminBroadcastPage'

const mockRequest = jest.fn()
jest.mock('../../services/authService', () => ({ AuthService: { getInstance: () => ({ makeAuthenticatedRequest: (...a: unknown[]) => mockRequest(...a) }) } }))

const reply = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) })

describe('AdminBroadcastPage', () => {
  beforeEach(() => {
    mockRequest.mockReset()
    mockRequest.mockImplementation((url: string) => (url.includes('/users') ? reply([{ id: '1' }, { id: '2' }]) : reply({ sent: 2 })))
  })

  const fill = () => {
    fireEvent.change(screen.getByPlaceholderText(/New AI Features/), { target: { value: 'Hello' } })
    fireEvent.change(screen.getByPlaceholderText(/Write your message/), { target: { value: 'World' } })
  }

  it('asks before sending and sends nothing if you say no', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminBroadcastPage />)
    await waitFor(() => expect(screen.getByText(/Est. Reach/)).toBeInTheDocument())
    fill()
    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/ }))
    expect(window.confirm).toHaveBeenCalled()
    expect(mockRequest.mock.calls.some((c) => String(c[0]).includes('notifications/broadcast'))).toBe(false)
  })

  it('sends once you confirm and shows how many got it', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminBroadcastPage />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/ }))
    expect(await screen.findByText(/sent successfully to 2 users/)).toBeInTheDocument()
  })

  it('shows an error when the server refuses', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    mockRequest.mockImplementation((url: string) => (url.includes('/users') ? reply([]) : reply({ error: 'x' }, false)))
    render(<AdminBroadcastPage />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/ }))
    expect(await screen.findByText(/Failed to send broadcast/)).toBeInTheDocument()
  })
})
