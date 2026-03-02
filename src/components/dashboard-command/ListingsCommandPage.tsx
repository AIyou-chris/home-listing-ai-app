import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode'
import { fetchListingShareKit } from '../../services/dashboardCommandService'
import { listingsService } from '../../services/listingsService'
import type { Property } from '../../types'

type ListingRow = {
  property: Property
  isPublished: boolean
  shareUrl: string | null
}

const formatPrice = (value?: number) => {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

const ListingsCommandPage: React.FC = () => {
  const navigate = useNavigate()
  const demoMode = useDemoMode()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ListingRow[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const properties = await listingsService.listProperties()
        const preview = properties.slice(0, 20)
        const kits = await Promise.all(
          preview.map(async (property) => {
            const shareKit = await fetchListingShareKit(property.id).catch(() => null)
            return {
              property,
              isPublished: Boolean(shareKit?.is_published),
              shareUrl: shareKit?.share_url || null
            }
          })
        )
        if (!cancelled) setRows(kits)
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Failed to load listings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const sortedRows = useMemo(
    () =>
      rows.slice().sort((a, b) => {
        if (a.isPublished && !b.isPublished) return -1
        if (!a.isPublished && b.isPublished) return 1
        return String(a.property.title || '').localeCompare(String(b.property.title || ''))
      }),
    [rows]
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Listings</h1>
        <p className="mt-1 text-sm text-slate-600">Published AI listings and share-ready pages.</p>
      </header>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading listings…</div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {!loading && !error && sortedRows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-base font-semibold text-slate-900">No listings yet</p>
          <button
            type="button"
            onClick={() => navigate(demoMode ? buildDashboardPath('/listings', demoMode) : '/add-listing')}
            className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Create your first listing
          </button>
        </div>
      )}

      {!loading && !error && sortedRows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedRows.map((row) => {
            const property = row.property
            const address = property.address || property.title || 'Listing'
            const heroPhoto = property.heroPhotos?.find((photo): photo is string => typeof photo === 'string') || null
            return (
              <article key={property.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {heroPhoto && (
                  <img
                    src={heroPhoto}
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
                      {row.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatPrice(property.price)}</p>
                  <p className="text-xs text-slate-500">
                    {property.bedrooms || 0} bd • {property.bathrooms || 0} ba • {property.squareFeet || 0} sqft
                  </p>
                  {row.shareUrl && <p className="truncate text-xs text-slate-500">{row.shareUrl}</p>}
                  <button
                    type="button"
                    onClick={() => navigate(buildDashboardPath(`/listings/${property.id}`, demoMode))}
                    className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open Share Kit
                  </button>
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
