import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useDemoMode, buildDashboardPath } from '../../demo/useDemoMode'
import { supabase } from '../../services/supabase'
import { buildApiUrl } from '../../lib/api'
import { fetchListingShareKit } from '../../services/dashboardCommandService'
import { subscribeDashboardInvalidation } from '../../services/dashboardInvalidation'
import { createListingDraft } from '../../services/listingBuilderService'
import { listingsService } from '../../services/listingsService'
import { listLocalListingDrafts, saveLocalListingDraft } from '../../services/listingDraftStorage'

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
  statusLabel: 'Draft' | 'Published' | 'Sold'
  shareUrl: string | null
}
const DEFAULT_LISTING_ADDRESS = '123 Main St'

type CelebrationData = {
  address: string
  soldPrice: number | null
  totalLeads: number
  totalViews: number
  listingId: string
}

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

  // LOs have their own listings page — redirect on mount
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.id) return;
      try {
        const res = await fetch(buildApiUrl('/api/onboarding'), {
          headers: { 'x-user-id': data.user.id }
        });
        const json = await res.json();
        if (json?.account_type === 'lo') {
          navigate(buildDashboardPath('/lo-listings'), { replace: true });
        }
      } catch {
        // non-fatal — stay on this page
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [markingSoldId, setMarkingSoldId] = useState<string | null>(null)
  const [soldPriceInput, setSoldPriceInput] = useState<string>('')
  const [soldPromptId, setSoldPromptId] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<CelebrationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ListingRow[]>([])
  const [listingFilter, setListingFilter] = useState<'All' | 'Published' | 'Draft' | 'Sold'>('All')

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

  const loadRows = useCallback(async () => {
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
      const emptyStateRows = demoMode ? DEMO_ROWS : []
      setRows(merged.length > 0 ? merged : emptyStateRows)
    } catch (loadError) {
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
      setLoading(false)
    }
  }, [demoMode])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const sortedRows = useMemo(
    () =>
      rows.slice().sort((a, b) => {
        if (a.isPublished && !b.isPublished) return -1
        if (!a.isPublished && b.isPublished) return 1
        return String(a.title || '').localeCompare(String(b.title || ''))
      }),
    [rows]
  )

  const filteredSortedRows = useMemo(() => {
    if (listingFilter === 'All') return sortedRows
    return sortedRows.filter((r) => r.statusLabel === listingFilter)
  }, [sortedRows, listingFilter])

  const dashboardRoot = useMemo(
    () => (location.pathname.startsWith('/dashboard') ? '/dashboard' : '/demo-dashboard'),
    [location.pathname]
  )

  const appendDemoQuery = useMemo(
    () => (demoMode && dashboardRoot === '/dashboard' ? '?demo=1' : ''),
    [dashboardRoot, demoMode]
  )

  const buildListingPath = (pathSuffix: string) => `${dashboardRoot}${pathSuffix}${appendDemoQuery}`

  useEffect(() => {
    if (demoMode) return
    return subscribeDashboardInvalidation(() => {
      void loadRows()
    })
  }, [demoMode, loadRows])

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
    setDeleteConfirmId(null)
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

  const handleMarkSold = async (listingId: string) => {
    const row = rows.find((r) => r.id === listingId)
    if (!row) return

    const soldPrice = soldPriceInput ? Number(soldPriceInput.replace(/[^0-9.]/g, '')) : null
    setSoldPromptId(null)
    setSoldPriceInput('')

    if (demoMode) {
      setRows((prev) =>
        prev.map((r) => r.id === listingId ? { ...r, statusLabel: 'Sold', isPublished: false } : r)
      )
      setCelebration({
        address: row.address,
        soldPrice,
        totalLeads: 12,
        totalViews: 347,
        listingId,
      })
      return
    }

    setMarkingSoldId(listingId)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(userData.user?.id ? { 'x-user-id': userData.user.id } : {})
      }
      const res = await fetch(buildApiUrl(`/api/listings/${listingId}/sold`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sold_price: soldPrice }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'mark_sold_failed')

      setRows((prev) =>
        prev.map((r) => r.id === listingId ? { ...r, statusLabel: 'Sold', isPublished: false } : r)
      )
      setCelebration({
        address: row.address,
        soldPrice: data.sold_price ?? soldPrice,
        totalLeads: data.total_leads ?? 0,
        totalViews: data.total_views ?? 0,
        listingId,
      })
    } catch {
      toast.error('Could not mark listing as sold. Try again.')
    } finally {
      setMarkingSoldId(null)
    }
  }

  const handleArchive = async (listingId: string) => {
    setCelebration(null)
    if (demoMode) {
      setRows((prev) => prev.filter((r) => r.id !== listingId))
      toast.success('Listing archived.')
      return
    }
    try {
      const { data: userData } = await supabase.auth.getUser()
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(userData.user?.id ? { 'x-user-id': userData.user.id } : {})
      }
      const res = await fetch(buildApiUrl(`/api/listings/${listingId}/archive`), { method: 'PATCH', headers })
      if (!res.ok) throw new Error('archive_failed')
      setRows((prev) => prev.filter((r) => r.id !== listingId))
      toast.success('Listing archived.')
    } catch {
      toast.error('Could not archive listing.')
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

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading listings…</div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      {!loading && sortedRows.length > 0 && (
        <div className="flex items-center gap-5 border-b border-slate-200">
          {(['All', 'Published', 'Draft', 'Sold'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setListingFilter(f)}
              className={`pb-3 text-sm font-semibold transition-colors ${
                listingFilter === f
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {f}
              <span className="ml-1.5 text-xs font-normal text-slate-400">
                ({f === 'All' ? sortedRows.length : sortedRows.filter((r) => r.statusLabel === f).length})
              </span>
            </button>
          ))}
        </div>
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

      {!loading && filteredSortedRows.length === 0 && sortedRows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No {listingFilter.toLowerCase()} listings.
        </div>
      )}

      {!loading && filteredSortedRows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredSortedRows.map((row) => {
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
                        row.statusLabel === 'Sold'
                          ? 'bg-amber-100 text-amber-700'
                          : row.isPublished
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.statusLabel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatPrice(row.price)}</p>
                  <p className="text-xs text-slate-500">
                    {row.bedrooms ? `${row.bedrooms} bd` : '—'} • {row.bathrooms ? `${row.bathrooms} ba` : '—'} • {row.squareFeet ? `${row.squareFeet.toLocaleString()} sqft` : '—'}
                  </p>
                  {row.shareUrl && <p className="truncate text-xs text-slate-500">{row.shareUrl}</p>}
                  <div className="flex flex-wrap gap-2">
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
                    {row.isPublished && row.shareUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(row.shareUrl!, '_blank')}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        View Live ↗
                      </button>
                    )}
                    {row.isPublished && row.statusLabel !== 'Sold' && (
                      <button
                        type="button"
                        onClick={() => setSoldPromptId(row.id)}
                        disabled={markingSoldId === row.id}
                        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {markingSoldId === row.id ? 'Updating…' : '🎉 Mark Sold'}
                      </button>
                    )}
                    {deleteConfirmId === row.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleDeleteListing(row.id)}
                          disabled={deletingId === row.id}
                          className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {deletingId === row.id ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(row.id)}
                        disabled={deletingId === row.id}
                        className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Sold price prompt inline */}
                  {soldPromptId === row.id && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="mb-2 text-xs font-semibold text-amber-800">What did it sell for? (optional)</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 1,250,000"
                          value={soldPriceInput}
                          onChange={(e) => setSoldPriceInput(e.target.value)}
                          className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <button
                          type="button"
                          onClick={() => void handleMarkSold(row.id)}
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSoldPromptId(null); setSoldPriceInput('') }}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ── Celebration modal ──────────────────────────────────────── */}
      {celebration && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setCelebration(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl text-center">
              <div className="text-6xl mb-3">🎉</div>
              <h2 className="text-white font-bold text-xl mb-1">Listing Sold!</h2>
              <p className="text-slate-400 text-sm mb-5 truncate">{celebration.address}</p>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {celebration.soldPrice && (
                  <div className="col-span-3 rounded-xl bg-amber-500/15 border border-amber-500/20 p-3">
                    <p className="text-amber-300 font-bold text-lg">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(celebration.soldPrice)}
                    </p>
                    <p className="text-amber-400/70 text-xs">Sold price</p>
                  </div>
                )}
                <div className="rounded-xl bg-white/6 border border-white/8 p-3">
                  <p className="text-white font-bold text-lg">{celebration.totalLeads}</p>
                  <p className="text-slate-500 text-xs">Leads</p>
                </div>
                <div className="rounded-xl bg-white/6 border border-white/8 p-3">
                  <p className="text-white font-bold text-lg">{celebration.totalViews}</p>
                  <p className="text-slate-500 text-xs">Views</p>
                </div>
                <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/20 p-3">
                  <p className="text-emerald-400 font-bold text-lg">✓</p>
                  <p className="text-slate-500 text-xs">Done</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleArchive(celebration.listingId)}
                  className="flex-1 rounded-xl border border-slate-700 bg-white/5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-all"
                >
                  Archive it
                </button>
                <button
                  type="button"
                  onClick={() => setCelebration(null)}
                  className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-bold text-white hover:bg-primary-700 transition-all"
                >
                  Keep Active
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ListingsCommandPage
