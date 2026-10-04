import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminBusinessBrainPage from '../components/AdminBusinessBrainPage'

jest.mock('../../lib/api', () => ({ buildApiUrl: (p: string) => p }))
jest.mock('react-hot-toast', () => ({ __esModule: true, default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }) }))
const mockFetch = jest.fn()
jest.mock('../../services/authedFetch', () => ({ authedFetch: (...a: unknown[]) => mockFetch(...a) }))

const reply = (body: unknown, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(body) })

describe('AdminBusinessBrainPage', () => {
  beforeEach(() => mockFetch.mockReset())

  it('shows an error with Try again when loading fails', async () => {
    mockFetch.mockReturnValueOnce(reply({}, false, 500))
    render(<AdminBusinessBrainPage />)
    expect(await screen.findByText(/Could not load \(500\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('warns when the table is missing and saves changes', async () => {
    mockFetch.mockReturnValueOnce(reply({ tableReady: false, config: { aiName: 'Bot', sources: [] } }))
    render(<AdminBusinessBrainPage />)
    expect(await screen.findByText(/platform-brain-migration.sql/)).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('Bot'), { target: { value: 'Helper' } })
    mockFetch.mockReturnValueOnce(reply({ success: true, config: { aiName: 'Helper', sources: [] } }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    expect(mockFetch.mock.calls[1][1].method).toBe('PUT')
  })

  it('adds a pasted source to the library', async () => {
    mockFetch.mockReturnValueOnce(reply({ tableReady: true, config: { sources: [] } }))
    render(<AdminBusinessBrainPage />)
    await screen.findByText('Knowledge library')
    fireEvent.click(screen.getAllByRole('button', { name: /Add source|Add knowledge/ })[0])
    fireEvent.change(screen.getByLabelText('Source name'), { target: { value: 'Pricing' } })
    fireEvent.change(screen.getByLabelText('Text to add'), { target: { value: 'LO Lite is $79' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('Pricing')).toBeInTheDocument()
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
  })
})
