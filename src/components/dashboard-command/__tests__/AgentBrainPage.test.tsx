import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AgentBrainPage from '../AgentBrainPage'

const mockFetch = jest.fn()
const toast = { success: jest.fn(), error: jest.fn() }
jest.mock('../../../lib/api', () => ({ buildApiUrl: (p: string) => p }))
jest.mock('../../../services/dashboard/utils', () => ({ authHeaders: async () => ({ Authorization: 'Bearer t', 'Content-Type': 'application/json' }) }))
jest.mock('../../../utils/toastService', () => ({ showToast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }))

const reply = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) })

describe('AgentBrainPage', () => {
  beforeEach(() => { mockFetch.mockReset(); toast.success.mockReset(); toast.error.mockReset(); (global as unknown as { fetch: unknown }).fetch = mockFetch })

  it('loads the saved notes and saves changes with the login token', async () => {
    mockFetch.mockReturnValueOnce(reply({ brain: { about: 'I sell in Wenatchee.', style: '', areas: '', showings: '', neverSay: '', faq: [] } }))
    render(<AgentBrainPage />)
    const about = await screen.findByLabelText('About you')
    expect((about as HTMLTextAreaElement).value).toBe('I sell in Wenatchee.')
    expect(screen.getByText('All saved.')).toBeInTheDocument()
    fireEvent.change(about, { target: { value: 'New text' } })
    mockFetch.mockReturnValueOnce(reply({ brain: { about: 'New text', style: '', areas: '', showings: '', neverSay: '', faq: [] } }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    const put = mockFetch.mock.calls[1]
    expect(put[1].method).toBe('PUT')
    expect(put[1].headers.Authorization).toBe('Bearer t')
    expect(JSON.parse(put[1].body).about).toBe('New text')
  })

  it('adds and removes an approved answer', async () => {
    mockFetch.mockReturnValueOnce(reply({ brain: {} }))
    render(<AgentBrainPage />)
    await screen.findByLabelText('About you')
    fireEvent.click(screen.getByRole('button', { name: '+ Add an answer' }))
    expect(screen.getByLabelText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.queryByLabelText('Question 1')).not.toBeInTheDocument()
  })

  it('shows an error and a retry when it cannot load, and an error when save fails', async () => {
    mockFetch.mockReturnValueOnce(reply({}, false))
    render(<AgentBrainPage />)
    expect(await screen.findByText('Could not load your AI Brain.')).toBeInTheDocument()
    mockFetch.mockReturnValueOnce(reply({ brain: {} }))
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    const about = await screen.findByLabelText('About you')
    fireEvent.change(about, { target: { value: 'x' } })
    mockFetch.mockReturnValueOnce(reply({}, false))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not save. Try again.'))
  })
})
