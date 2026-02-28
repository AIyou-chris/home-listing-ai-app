import React, { useMemo, useState } from 'react'
import EmptyStateCard from './EmptyStateCard'
import { useRoiMetrics } from '../../hooks/dashboard/useRoiMetrics'
import { useRealtimeRoiUpdates } from '../../hooks/dashboard/useRealtimeRoiUpdates'

const metricCardClass = 'rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm'

const TodayROIStrip: React.FC = () => {
  const [range, setRange] = useState<'7d' | '30d'>('7d')
  const { data, loading, error, reload } = useRoiMetrics(range)

  useRealtimeRoiUpdates(() => {
    void reload()
  })

  const hasData = useMemo(() => {
    if (!data) return false
    return (
      Number(data.leads_captured || 0) > 0 ||
      Number(data.appointments_set || 0) > 0 ||
      Number(data.confirmations || 0) > 0 ||
      Number(data.top_source?.count || 0) > 0
    )
  }, [data])

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Today ROI</h2>
          <p className="text-xs text-slate-500">Leads captured, appointments set, and confirmations in one view.</p>
        </div>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className={`${metricCardClass} h-20 animate-pulse bg-slate-100`} />
          ))}
        </div>
      ) : !hasData ? (
        <EmptyStateCard />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-500">Leads captured</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Number(data?.leads_captured || 0).toLocaleString()}</p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-500">Appointments set</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Number(data?.appointments_set || 0).toLocaleString()}</p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-500">Confirmations</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Number(data?.confirmations || 0).toLocaleString()}</p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-500">Top source</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {data?.top_source?.label || 'None'}
              <span className="ml-1 text-xs font-medium text-slate-500">({Number(data?.top_source?.count || 0).toLocaleString()})</span>
            </p>
          </article>
        </div>
      )}
    </section>
  )
}

export default TodayROIStrip
