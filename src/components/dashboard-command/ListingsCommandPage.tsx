import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useDemoMode } from '../../demo/useDemoMode'
import { fetchListingShareKit } from '../../services/dashboardCommandService'
import { createListingDraft } from '../../services/listingBuilderService'
import { listingsService } from '../../services/listingsService'
import { listLocalListingDrafts, saveLocalListingDraft } from '../../services/listingDraftStorage'
import { getLiveExampleUrl, openInNewTab } from '../../utils/ctaLinks'

type ListingRow = {
  id: string
  title: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  heroPhoto: string | null
  isPublished: boolean
  statusLabel: 'Draft' | 'Published'
  shareUrl: string | null
}
const DEFAULT_LISTING_ADDRESS = '123 Main St'

const DEMO_ROWS: ListingRow[] = [
  {
    id: 'demo-published',
    title: 'Oceanview Condo',
    address: '1280 Sunset Blvd, Santa Monica, CA',
    price: 1285000,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1480,
    heroPhoto: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop',
    isPublished: true,
    statusLabel: 'Published',
    shareUrl: 'https://homelistingai.app/l/oceanview-condo'
  },
  {
    id: 'demo-draft',
    title: 'Draft Listing',
    address: DEFAULT_LISTING_ADDRESS,
    price: 0,
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    heroPhoto: null,
    isPublished: false,
    statusLabel: 'Draft',
    shareUrl: null
  }
]

const formatPrice = (value?: number) => {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

const ListingsCommandPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const demoMode = useDemoMode()
  const [loading, setLoading] = useState(true)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ListingRow[]>([])

  const saveDraftAndNavigate = () => {
    const draftId = `draft-${Date.now()}`
    saveLocalListingDraft({
      id: draftId,
      title: 'Draft Listing',
      address: DEFAULT_LISTING_ADDRESS,
      price: 0,
      bedrooms: 0,
      bathrooms: 0,
      squareFeet: 0,
      description: '',
      amenities: [],
      photos: [],
      createdAt: new Date().toISOString()
    })
    setRows((prev) => [
      {
        id: draftId,
        title: 'Draft Listing',
        address: DEFAULT_LISTING_ADDRESS,
        price: 0,
        bedrooms: 0,
        bathrooms: 0,
        squareFeet: 0,
        heroPhoto: null,
        isPublished: false,
        statusLabel: 'Draft',
        shareUrl: null
      },
      ...prev.filter((row) => row.id !== draftId)
    ])
    navigate(buildListingPath(`/listings/${draftId}/edit`))
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const properties = await listingsService.listProperties()
        const preview = properties.slice(0, 20)
        const kits = await Promise.all(
          preview.map(async (property): Promise<ListingRow> => {
            const shareKit = await fetchListingShareKit(property.id).catch(() => null)
            const heroPhoto = property.heroPhotos.find((photo): photo is string => typeof photo === 'string') || null
            const statusValue = String(property.status || '').toLowerCase()
            const isPublished = Boolean(shareKit?.is_published) || ['active', 'published', 'sold'].includes(statusValue)
            const statusLabel: ListingRow['statusLabel'] = isPublished ? 'Published' : 'Draft'
            return {
              id: property.id,
              title: property.title || 'Draft Listing',
              address: property.address || property.title || 'Listing',
              price: Number(property.price) || 0,
              bedrooms: Number(property.bedrooms) || 0,
              bathrooms: Number(property.bathrooms) || 0,
              squareFeet: Number(property.squareFeet) || 0,
              heroPhoto,
              isPublished,
              statusLabel,
              shareUrl: shareKit?.share_url || null
            }
          })
        )
        const localDraftRows: ListingRow[] = listLocalListingDrafts().map((draft) => ({
          id: draft.id,
          title: draft.title || 'Draft Listing',
          address: draft.address || DEFAULT_LISTING_ADDRESS,
          price: draft.price,
          bedrooms: draft.bedrooms,
          bathrooms: draft.bathrooms,
          squareFeet: draft.squareFeet,
          heroPhoto: draft.photos[0] || null,
          isPublished: false,
          statusLabel: 'Draft',
          shareUrl: null
        }))
        const merged = [...localDraftRows, ...kits].reduce<ListingRow[]>((acc, row) => {
          if (acc.some((item) => item.id === row.id)) return acc
          acc.push(row)
          return acc
        }, [])
        if (!cancelled) {
          const emptyStateRows = demoMode ? DEMO_ROWS : []
          setRows(merged.length > 0 ? merged : emptyStateRows)
        }
      } catch (loadError) {
        if (cancelled) return
        const fallbackRows: ListingRow[] = listLocalListingDrafts().map((draft) => ({
          id: draft.id,
          title: draft.title || 'Draft Listing',
          address: draft.address || DEFAULT_LISTING_ADDRESS,
          price: draft.price,
          bedrooms: draft.bedrooms,
          bathrooms: draft.bathrooms,
          squareFeet: draft.squareFeet,
          heroPhoto: draft.photos[0] || null,
          isPublished: false,
          statusLabel: 'Draft',
          shareUrl: null
        }))
        const emergencyFallbackRows = fallbackRows.length > 0
          ? fallbackRows
          : (demoMode ? DEMO_ROWS : [])
        setRows(emergencyFallbackRows)
        setError(
          demoMode
            ? 'Live listings are unavailable right now. Showing local demo data.'
            : 'Live listings are unavailable right now. Please try again in a moment.'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [demoMode])

  const sortedRows = useMemo(
    () =>
      rows.slice().sort((a, b) => {
        if (a.isPublished && !b.isPublished) return -1
        if (!a.isPublished && b.isPublished) return 1
        return String(a.title || '').localeCompare(String(b.title || ''))
      }),
    [rows]
  )

  const dashboardRoot = useMemo(
    () => (location.pathname.startsWith('/dashboard') ? '/dashboard' : '/demo-dashboard'),
    [location.pathname]
  )

  const appendDemoQuery = useMemo(
    () => (demoMode && dashboardRoot === '/dashboard' ? '?demo=1' : ''),
    [dashboardRoot, demoMode]
  )

  const buildListingPath = (pathSuffix: string) => `${dashboardRoot}${pathSuffix}${appendDemoQuery}`

  const handleCreateDraft = async () => {
    setCreatingDraft(true)
    try {
      if (demoMode) {
        saveDraftAndNavigate()
        return
      }

      const response = await createListingDraft({
        status: 'draft',
        address: DEFAULT_LISTING_ADDRESS
      })
      navigate(buildListingPath(`/listings/${response.listing.id}/edit`))
    } catch (createError) {
      saveDraftAndNavigate()
      toast.error('API create failed, so a local draft was created for now.')
    } finally {
      setCreatingDraft(false)
    }
  }

  const handleDeleteListing = async (listingId: string) => {
    const confirmed = window.confirm('Delete this listing? This cannot be undone.')
    if (!confirmed) return

    setDeletingId(listingId)
    try {
      await listingsService.deleteProperty(listingId)
      setRows((prev) => prev.filter((row) => row.id !== listingId))
      toast.success('Listing deleted.')
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete listing.'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Listings</h1>
          <p className="mt-1 text-sm text-slate-600">Build and manage AI listings from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!demoMode && (
            <button
              type="button"
              onClick={() => navigate('/demo-dashboard/gallery/demo-listing-oak')}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Use this as sales demo
            </button>
          )}
          <button
            type="button"
            onClick={handleCreateDraft}
            disabled={creatingDraft}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingDraft ? 'Creating…' : 'New Listing'}
          </button>
        </div>
      </header>

      {!demoMode && (
        <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#eef2ff_100%)] p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-600">See the finished version</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Show clients and brokers what one listing turns into.</h2>
              <p className="mt-2 text-sm text-slate-600">
                Open the sales demo to show the live listing, tracked QR, buyer report, seller pricing report, flyer, sign rider, and social assets in one place.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/demo-dashboard/gallery/demo-listing-oak')}
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open Sales Demo
              </button>
              <button
                type="button"
                onClick={() => openInNewTab(getLiveExampleUrl())}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open Demo Live Listing
              </button>
            </div>
          </div>
        </section>
      )}

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading listings…</div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      {!loading && sortedRows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-base font-semibold text-slate-900">No listings yet</p>
          <button
            type="button"
            onClick={handleCreateDraft}
            disabled={creatingDraft}
            className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {creatingDraft ? 'Creating…' : 'Create your first listing'}
          </button>
        </div>
      )}

      {!loading && sortedRows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedRows.map((row) => {
            const address = row.address || row.title || 'Listing'
            return (
              <article key={row.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {row.heroPhoto && (
                  <img
                    src={row.heroPhoto}
                    alt={address}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-semibold text-slate-900">{address}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        row.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.statusLabel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatPrice(row.price)}</p>
                  <p className="text-xs text-slate-500">
                    {row.bedrooms || 0} bd • {row.bathrooms || 0} ba • {row.squareFeet || 0} sqft
                  </p>
                  {row.shareUrl && <p className="truncate text-xs text-slate-500">{row.shareUrl}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(buildListingPath(`/listings/${row.id}/edit`))}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Edit Listing
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(buildListingPath(`/listings/${row.id}`))}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Share Kit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteListing(row.id)}
                      disabled={deletingId === row.id}
                      className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === row.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ListingsCommandPage
