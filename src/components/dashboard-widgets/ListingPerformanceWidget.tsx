import React, { useMemo, useState } from 'react'
import EmptyStateCard from './EmptyStateCard'
import { useListingPerformance } from '../../hooks/dashboard/useListingPerformance'
import { useRealtimeRoiUpdates } from '../../hooks/dashboard/useRealtimeRoiUpdates'

interface ListingPerformanceWidgetProps {
  listingId: string
}

const metricCardClass = 'rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm'

const prettifySourceLabel = (value?: string | null) => {
  const normalized = String(value || '').toLowerCase()
  if (!normalized) return 'None'
  if (normalized === 'open_house') return 'Open House'
  if (normalized === 'qr' || normalized === 'sign') return 'Sign'
  if (normalized === 'social') return 'Social'
  if (normalized === 'link') return 'Link'
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatLastLead = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

const ListingPerformanceWidget: React.FC<ListingPerformanceWidgetProps> = ({ listingId }) => {
  const [range, setRange] = useState<'7d' | '30d'>('30d')
  const { data, loading, error, reload } = useListingPerformance(listingId, range)

  useRealtimeRoiUpdates(
    () => {
      void reload()
    },
    {
      listingId,
      eventTypes: [
        'listing.performance.updated',
        'appointment.updated',
        'appointment.created',
        'lead.created',
        'lead.updated',
        'reminder.outcome'
      ]
    }
  )

  const topSource = useMemo(() => {
    const explicit = data?.metrics?.top_source
    if (explicit?.label) return explicit

    const bySource = data?.breakdown?.by_source_type || []
    const top = [...bySource].sort((a, b) => Number(b.total || 0) - Number(a.total || 0))[0]
    return {
      label: top ? prettifySourceLabel(top.source_type) : 'None',
      count: top ? Number(top.total || 0) : 0
    }
  }, [data?.breakdown?.by_source_type, data?.metrics?.top_source])

  const hasData = useMemo(() => {
    const metrics = data?.metrics
    if (!metrics) return false
    return (
      Number(metrics.leads_count || 0) > 0 ||
      Number(metrics.appointments_count || 0) > 0 ||
      Number(metrics.appointments_confirmed || 0) > 0
    )
  }, [data?.metrics])

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Listing Performance</h2>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setRange('7d')}
            className={`rounded-md px-2.5 py-1 ${range === '7d' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
          >
            7 days
          </button>
          <button
            type="button"
            onClick={() => setRange('30d')}
            className={`rounded-md px-2.5 py-1 ${range === '30d' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
          >
            30 days
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
      )}

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className={`${metricCardClass} h-20 animate-pulse bg-slate-100`} />
          ))}
        </div>
      ) : !hasData ? (
        <EmptyStateCard />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-500">Leads captured</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Number(data?.metrics?.leads_count || 0).toLocaleString()}</p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-500">Appointments set</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Number(data?.metrics?.appointments_count || 0).toLocaleString()}</p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-500">Confirmations</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Number(data?.metrics?.appointments_confirmed || 0).toLocaleString()}</p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-500">Top source</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {topSource.label}
              <span className="ml-1 text-xs font-medium text-slate-500">({topSource.count.toLocaleString()})</span>
            </p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-500">Last lead</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatLastLead(data?.metrics?.last_lead_captured_at)}</p>
          </article>
        </div>
      )}
    </section>
  )
}

export default ListingPerformanceWidget
