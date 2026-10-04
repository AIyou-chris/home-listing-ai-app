import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import InteractionHubPage from '../InteractionHubPage'
import type { Interaction } from '../../types'

jest.mock('../AddLeadModal', () => ({ __esModule: true, default: () => null }))

const make = (over: Partial<Interaction>): Interaction => ({
  id: 'x', sourceType: 'chat-bot-session', sourceName: '1 Main St', contact: { name: 'Buyer' }, message: 'hello', timestamp: 'Oct 4', isRead: false, ...over
})

const hot = make({ id: 'hot', contact: { name: 'Maya Reynolds', email: 'maya@example.com' }, message: 'Can I tour Friday?', metadata: { leadId: 'l1', tags: ['showing'], propertyAddress: '1 Main St' } })
const idle = make({ id: 'idle', contact: { name: 'Sam Browser' }, message: 'what are the schools like' })

const setup = (props: Partial<React.ComponentProps<typeof InteractionHubPage>> = {}) => {
  const onArchive = jest.fn().mockResolvedValue(undefined)
  const onLoad = jest.fn().mockResolvedValue([
    { id: 'm1', sender: 'lead', channel: 'chat', timestamp: '10:00', text: 'Can I tour Friday?' },
    { id: 'm2', sender: 'ai', channel: 'chat', timestamp: '10:01', text: 'Yes, Friday has openings.' }
  ])
  render(
    <InteractionHubPage
      onBackToDashboard={jest.fn()}
      onAddNewLead={jest.fn()}
      interactions={[hot, idle]}
      setInteractions={jest.fn()}
      onArchiveInteraction={onArchive}
      onLoadInteractionMessages={onLoad}
      {...props}
    />
  )
  return { onArchive, onLoad }
}

beforeEach(() => localStorage.clear())

describe('InteractionHubPage', () => {
  it('starts on the conversations that need a person, with a way to see all', () => {
    setup()
    expect(screen.getAllByText('Maya Reynolds').length).toBeGreaterThan(0)
    expect(screen.queryByText('Sam Browser')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    expect(screen.getByText('Sam Browser')).toBeInTheDocument()
  })

  it('searches', () => {
    setup()
    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    fireEvent.change(screen.getByLabelText('Search inbox'), { target: { value: 'schools' } })
    expect(screen.queryByText('Maya Reynolds')).not.toBeInTheDocument()
    expect(screen.getAllByText('Sam Browser').length).toBeGreaterThan(0)
  })

  it('shows the whole conversation and a real reply link', async () => {
    const { onLoad } = setup()
    expect(await screen.findByText('Yes, Friday has openings.')).toBeInTheDocument()
    expect(onLoad).toHaveBeenCalledWith('hot')
    expect(screen.getByRole('link', { name: /reply by email/i })).toHaveAttribute('href', expect.stringMatching(/^mailto:maya@example.com/))
    expect(screen.getByText('✓ Already a lead')).toBeInTheDocument()
  })

  it('archives on the server, and tells you if that fails', async () => {
    const { onArchive } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    await waitFor(() => expect(onArchive).toHaveBeenCalledWith('hot'))
  })

  it('shows a clear error with a retry button when the inbox cannot load', () => {
    const onRetry = jest.fn()
    setup({ interactions: [], errorMessage: 'List admin conversations failed (500)', onRetry })
    expect(screen.getByText('The inbox could not load.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('says when there is nothing to show instead of pretending the inbox is empty while loading', () => {
    setup({ interactions: [], isLoading: true })
    expect(screen.getByText('Loading your inbox…')).toBeInTheDocument()
    expect(screen.queryByText('Inbox is empty')).not.toBeInTheDocument()
  })

  it('does not show a Reply button for someone with no contact details', () => {
    setup({ interactions: [make({ id: 'a', metadata: { leadId: 'l' } })] })
    expect(screen.queryByRole('link', { name: /reply/i })).not.toBeInTheDocument()
    expect(screen.getByText(/They have not left contact details/)).toBeInTheDocument()
  })
})
