import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import AdminLeadInsights from '../AdminLeadInsights'
import type { Lead } from '../../types'

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString()

const lead = (over: Partial<Lead>): Lead => ({
  id: 'l', name: 'Lead', status: 'New', email: '', phone: '', date: hoursAgo(1), lastMessage: '', createdAt: hoursAgo(1), ...over
}) as Lead

describe('AdminLeadInsights', () => {
  it('shows nothing when there is nothing to chase', () => {
    const { container } = render(<AdminLeadInsights leads={[lead({ intentLevel: 'Cold' })]} onPickOwner={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lists hot leads with Call and Text links and the owner', () => {
    render(
      <AdminLeadInsights
        leads={[lead({ id: 'a', name: 'Maya Reynolds', intentLevel: 'Hot', phone: '+15125550001', ownerName: 'Fred Agent', ownerType: 'agent' })]}
        onPickOwner={jest.fn()}
      />
    )
    expect(screen.getByText('Maya Reynolds')).toBeInTheDocument()
    expect(screen.getByText(/Agent: Fred Agent/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+15125550001')
    expect(screen.getByRole('link', { name: 'Text' })).toHaveAttribute('href', 'sms:+15125550001')
  })

  it('falls back to Email when there is no phone', () => {
    render(<AdminLeadInsights leads={[lead({ intentLevel: 'Warm', email: 'a@b.com' })]} onPickOwner={jest.fn()} />)
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:a@b.com')
  })

  it('counts leads waiting over 24 hours by owner and lets the admin jump to them', () => {
    const onPickOwner = jest.fn()
    render(
      <AdminLeadInsights
        leads={[
          lead({ id: '1', ownerId: 'o1', ownerName: 'Fred', createdAt: hoursAgo(30) }),
          lead({ id: '2', ownerId: 'o1', ownerName: 'Fred', createdAt: hoursAgo(50) })
        ]}
        onPickOwner={onPickOwner}
      />
    )
    expect(screen.getByText(/2 leads waiting more than 24 hours/)).toBeInTheDocument()
    expect(screen.getByText(/Fred/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show them' }))
    expect(onPickOwner).toHaveBeenCalledWith('o1')
  })
})
