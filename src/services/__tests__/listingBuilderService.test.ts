import {
  createListingDraft,
  fetchListingBuilderPayload,
  patchListingBuilder,
  listListingBuilderSources,
} from '../listingBuilderService'

// --- module mocks ---
jest.mock('../../lib/api', () => ({
  buildApiUrl: (path: string) => `http://localhost:3002${path}`,
}))

jest.mock('../../demo/useDemoMode', () => ({
  isDemoModeActive: jest.fn(() => false),
}))

jest.mock('../../demo/demoData', () => ({
  getDemoProperties: jest.fn(() => [
    {
      id: 'demo-1',
      status: 'active',
      address: '123 Demo St',
      price: 500000,
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1800,
      description: 'A great demo home',
      heroPhotos: ['https://example.com/hero.jpg'],
      galleryPhotos: [],
    },
  ]),
}))

jest.mock('../authSession', () => ({
  waitForAuthenticatedUserId: jest.fn(async () => 'user-auth-id'),
  waitForAuthenticatedSession: jest.fn(async () => ({ userId: 'user-auth-id', accessToken: 'test-token' })),
}))

jest.mock('../dashboardInvalidation', () => ({
  emitDashboardInvalidation: jest.fn(),
}))

// --- helpers ---
import { isDemoModeActive } from '../../demo/useDemoMode'
import { waitForAuthenticatedUserId } from '../authSession'
import { emitDashboardInvalidation } from '../dashboardInvalidation'

const mockIsDemoModeActive = isDemoModeActive as jest.MockedFunction<typeof isDemoModeActive>
const mockWaitForAuthenticatedUserId = waitForAuthenticatedUserId as jest.MockedFunction<typeof waitForAuthenticatedUserId>
const mockEmitDashboardInvalidation = emitDashboardInvalidation as jest.MockedFunction<typeof emitDashboardInvalidation>

const mockFetch = (body: object, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsDemoModeActive.mockReturnValue(false)
  mockWaitForAuthenticatedUserId.mockResolvedValue('user-auth-id')
})

// ---- resolveListingAgent delegation ----

describe('resolveListingAgent delegation', () => {
  test('uses explicit agentIdOverride string — skips waitForAuthenticatedUserId', async () => {
    mockFetch({ listing: { id: 'l1', status: 'draft', address: '', price: 0, beds: 0, baths: 0, sqft: 0, description: '', photos: [] } })
    await createListingDraft({}, 'explicit-agent-id')
    expect(mockWaitForAuthenticatedUserId).not.toHaveBeenCalled()
    const req = (global.fetch as jest.Mock).mock.calls[0]
    expect(req[0]).toContain('agentId=explicit-agent-id')
  })

  test('uses explicit null override — sends no agentId query param', async () => {
    mockFetch({ listing: { id: 'l1', status: 'draft', address: '', price: 0, beds: 0, baths: 0, sqft: 0, description: '', photos: [] } })
    await createListingDraft({}, null)
    expect(mockWaitForAuthenticatedUserId).not.toHaveBeenCalled()
    const req = (global.fetch as jest.Mock).mock.calls[0]
    expect(req[0]).not.toContain('agentId=')
  })

  test('falls through to waitForAuthenticatedUserId when override is undefined and not demo', async () => {
    mockFetch({ listing: { id: 'l1', status: 'draft', address: '', price: 0, beds: 0, baths: 0, sqft: 0, description: '', photos: [] } })
    await createListingDraft({})
    expect(mockWaitForAuthenticatedUserId).toHaveBeenCalledTimes(1)
    const req = (global.fetch as jest.Mock).mock.calls[0]
    expect(req[0]).toContain('agentId=user-auth-id')
  })

  test('returns null in demo mode — skips waitForAuthenticatedUserId', async () => {
    mockIsDemoModeActive.mockReturnValue(true)
    mockFetch({ listing: { id: 'l1', status: 'draft', address: '', price: 0, beds: 0, baths: 0, sqft: 0, description: '', photos: [] } })
    await createListingDraft({})
    expect(mockWaitForAuthenticatedUserId).not.toHaveBeenCalled()
  })
})

// ---- fetchListingBuilderPayload happy paths ----

describe('fetchListingBuilderPayload', () => {
  test('returns demo data when demo mode is active', async () => {
    mockIsDemoModeActive.mockReturnValue(true)
    const result = await fetchListingBuilderPayload('any-id')
    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.listing.address).toBe('123 Demo St')
    expect(result.brain_sources).toHaveLength(1)
    expect(result.brain_sources[0].type).toBe('text')
  })

  test('fetches from API in normal mode and maps sources', async () => {
    mockFetch({
      listing: { id: 'l42', status: 'draft', address: '42 Main St', price: 300000, beds: 2, baths: 1, sqft: 900, description: 'Nice', photos: [] },
      brain_sources: [
        { id: 's1', type: 'file', title: 'Brochure', status: 'trained', trained_at: null, updated_at: null, content: null, url: null },
      ],
    })
    const result = await fetchListingBuilderPayload('l42')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result.listing.address).toBe('42 Main St')
    expect(result.brain_sources[0].type).toBe('doc')
  })

  test('maps url source type correctly', async () => {
    mockFetch({
      listing: { id: 'l1', status: 'draft', address: '', price: 0, beds: 0, baths: 0, sqft: 0, description: '', photos: [] },
      brain_sources: [
        { id: 's2', type: 'url', title: 'MLS', status: 'needs_retrain', trained_at: null, updated_at: null, content: null, url: 'https://mls.example.com' },
      ],
    })
    const result = await fetchListingBuilderPayload('l1')
    expect(result.brain_sources[0].type).toBe('url')
    expect(result.brain_sources[0].url).toBe('https://mls.example.com')
  })
})

// ---- createListingDraft happy path ----

describe('createListingDraft', () => {
  test('POSTs to /api/dashboard/listings and emits invalidation', async () => {
    const listing = { id: 'new-l', status: 'draft', address: '1 New St', price: 0, beds: 0, baths: 0, sqft: 0, description: '', photos: [] }
    mockFetch({ listing })
    const result = await createListingDraft({ address: '1 New St' }, 'agent-99')
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/dashboard/listings')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body as string)).toEqual({ address: '1 New St' })
    expect(result.listing.id).toBe('new-l')
    expect(mockEmitDashboardInvalidation).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'listing_draft_created', listingId: 'new-l' })
    )
  })
})

// ---- patchListingBuilder happy path ----

describe('patchListingBuilder', () => {
  test('PATCHes and emits invalidation', async () => {
    mockFetch({ listing: { id: 'l5', status: 'published' } })
    const result = await patchListingBuilder('l5', { price: 450000 }, 'agent-77')
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/dashboard/listings/l5')
    expect(opts.method).toBe('PATCH')
    expect(JSON.parse(opts.body as string)).toEqual({ price: 450000 })
    expect(result.listing.status).toBe('published')
    expect(mockEmitDashboardInvalidation).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'listing_builder_saved', listingId: 'l5' })
    )
  })
})

// ---- listListingBuilderSources happy path ----

describe('listListingBuilderSources', () => {
  test('fetches and maps sources array', async () => {
    mockFetch({
      sources: [
        { id: 'src-1', type: 'text', title: 'Notes', status: 'trained', trained_at: '2026-01-01', updated_at: '2026-01-01', content: 'hi', url: null },
        { id: 'src-2', type: 'file', title: 'PDF', status: 'needs_retrain', trained_at: null, updated_at: null, content: null, url: null },
      ],
    })
    const sources = await listListingBuilderSources('l7', 'agent-1')
    expect(sources).toHaveLength(2)
    expect(sources[0].type).toBe('text')
    expect(sources[1].type).toBe('doc')
  })

  test('returns empty array when sources is missing from response', async () => {
    mockFetch({})
    const sources = await listListingBuilderSources('l8', 'agent-1')
    expect(sources).toEqual([])
  })
})

// ---- parseResponse error handling ----

describe('parseResponse error handling', () => {
  test('throws error with API error message on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'listing_access_denied' }),
    } as Response)
    await expect(fetchListingBuilderPayload('l-forbidden')).rejects.toThrow('listing_access_denied')
  })

  test('throws generic message when error field is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)
    await expect(fetchListingBuilderPayload('l-bad')).rejects.toThrow('Request failed (500)')
  })
})
