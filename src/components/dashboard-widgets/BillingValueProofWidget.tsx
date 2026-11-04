import React, { useMemo, useState } from 'react'
import { LoIconTile } from '../dashboard-command/loUi'
import EmptyStateCard from './EmptyStateCard'
import { fetchBillingValueProof, type BillingValueProofSnapshot } from '../../services/dashboardCommandService'
import { useRealtimeRoiUpdates } from '../../hooks/dashboard/useRealtimeRoiUpdates'

const metricCardClass = 'rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm'

const BillingValueProofWidget: React.FC = () => {
  const [range, setRange] = useState<'7d' | '30d'>('30d')
  const [snapshot, setSnapshot] = useState<BillingValueProofSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchBillingValueProof(range)
      setSnapshot(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing value proof.')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  useRealtimeRoiUpdates(() => {
    void load()
  })

  const hasData = useMemo(() => {
    const roi = snapshot?.roi
    if (!roi) return false
    return (
      Number(roi.leads_captured || 0) > 0 ||
      Number(roi.appointments_set || 0) > 0 ||
      Number(roi.confirmations || 0) > 0
    )
  }, [snapshot?.roi])

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Billing Value Proof</h2>
          <p className="text-sm text-slate-600">Your results, tied to real activity.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm font-semibold text-slate-700">
          <button
            type="button"
            onClick={() => setRange('7d')}
            className={`inline-flex min-h-[44px] items-center rounded-md px-3 ${range === '7d' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
          >
            7 days
          </button>
          <button
            type="button"
            onClick={() => setRange('30d')}
            className={`inline-flex min-h-[44px] items-center rounded-md px-3 ${range === '30d' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
          >
            30 days
          </button>
        </div>
      </div>

      {error && !snapshot && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <LoIconTile name="insights" tone="slate" />
          <p className="text-sm text-slate-700">Your results will show here once leads start coming in.</p>
        </div>
      )}

      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className={`${metricCardClass} h-20 animate-pulse bg-slate-100`} />
          ))}
        </div>
      ) : error && !snapshot ? null : !hasData ? (
        <EmptyStateCard />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-600">Leads captured</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Number(snapshot?.roi?.leads_captured || 0).toLocaleString()}</p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-600">Appointments set</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Number(snapshot?.roi?.appointments_set || 0).toLocaleString()}</p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-600">Confirmations</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Number(snapshot?.roi?.confirmations || 0).toLocaleString()}</p>
          </article>
          <article className={metricCardClass}>
            <p className="text-xs font-medium text-slate-600">Top source</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {snapshot?.roi?.top_source?.label || 'None'}
              <span className="ml-1 text-xs font-medium text-slate-600">({Number(snapshot?.roi?.top_source?.count || 0).toLocaleString()})</span>
            </p>
          </article>
        </div>
      )}
    </section>
  )
}

export default BillingValueProofWidget
