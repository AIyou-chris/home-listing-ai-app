import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminListingsPage from '../AdminListingsPage'

const mockList = jest.fn()
const mockCreate = jest.fn()
const mockRemove = jest.fn()
jest.mock('../../services/adminListingsService', () => ({
  adminListingsService: { list: (...a: unknown[]) => mockList(...a), create: (...a: unknown[]) => mockCreate(...a), remove: (...a: unknown[]) => mockRemove(...a) }
}))

const LISTINGS = [
  { listing_id: 'p1', address: '12 Oak St', price: 500000, status: 'published', published: true, public_slug: 'oak-st', hero_image: 'https://x.test/a.jpg', agent: { first_name: 'Ana', last_name: 'Lo', email: 'ana@lo.com' } },
  { listing_id: 'p2', address: '9 Pine Rd', price: 300000, status: 'draft', published: false, public_slug: null, hero_image: null, agent: null }
]

describe('AdminListingsPage', () => {
  beforeEach(() => { mockList.mockReset(); mockCreate.mockReset(); mockRemove.mockReset(); mockList.mockResolvedValue(LISTINGS) })

  it('shows Published or Draft, the owner, and only gives a share link to a published listing', async () => {
    render(<AdminListingsPage />)
    expect((await screen.findAllByText('12 Oak St')).length).toBeGreaterThan(0)
    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Owner: Ana Lo')).toBeInTheDocument()
    expect(screen.getByText(/\/l\/oak-st$/)).toBeInTheDocument()
    expect(screen.queryByText(/demo\/listings/)).not.toBeInTheDocument()
    expect(screen.getByText(/Not public yet/)).toBeInTheDocument()
    expect(screen.getByText('No photo yet')).toBeInTheDocument()
  })

  it('names the listing and its owner before deleting, and deletes nothing on cancel', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminListingsPage />)
    await screen.findAllByText('12 Oak St')
    fireEvent.click(screen.getAllByRole('button', { name: /Delete/ })[0])
    expect(confirmSpy.mock.calls[0][0]).toMatch(/Delete "12 Oak St"[\s\S]*Ana Lo/)
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('will not create a listing without an address', async () => {
    render(<AdminListingsPage />)
    await screen.findAllByText('12 Oak St')
    fireEvent.click(screen.getByRole('button', { name: /Add New Listing/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('Type an address first.')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('shows an error when loading fails', async () => {
    mockList.mockRejectedValue(new Error('Failed to load listings (500)'))
    render(<AdminListingsPage />)
    await waitFor(() => expect(screen.getByText('Failed to load listings (500)')).toBeInTheDocument())
  })
})
