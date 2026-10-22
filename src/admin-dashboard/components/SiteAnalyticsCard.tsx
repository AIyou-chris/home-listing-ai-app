import React, { useCallback, useEffect, useState } from 'react'
import Collapsible from '../../components/admin/Collapsible'
import { AuthService } from '../../services/authService'

export type SiteAnalytics = {
  days: number; visitors: number; views: number; clicks: number; clickRate: number
  daily: Array<{ day: string; views: number; visitors: number }>
  topPages: Array<{ path: string; count: number }>
  topClicks: Array<{ label: string; count: number }>
  topReferrers: Array<{ host: string; count: number }>
  devices: Array<{ device: string; count: number }>
}

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-3">
    <p className="text-xs font-semibold text-slate-600">{label}</p>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
)

const List: React.FC<{ title: string; rows: Array<{ name: string; count: number }>; empty: string }> = ({ title, rows, empty }) => (
  <div>
    <p className="mb-1 text-sm font-semibold text-slate-900">{title}</p>
    {rows.length === 0 ? <p className="text-sm text-slate-700">{empty}</p> : (
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.name} className="flex justify-between gap-3 text-sm text-slate-800"><span className="truncate">{r.name}</span><span className="font-semibold">{r.count}</span></li>
        ))}
      </ul>
    )}
  </div>
)

export const SiteAnalyticsView: React.FC<{ data: SiteAnalytics | null; error?: boolean }> = ({ data, error }) => {
  if (error || !data) return <p className="text-sm text-slate-700">Not available yet. The tracking table may not be set up.</p>
  const max = Math.max(1, ...data.daily.map((d) => d.views))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="People who visited" value={data.visitors} />
        <Stat label="Pages viewed" value={data.views} />
        <Stat label="Clicks" value={data.clicks} />
        <Stat label="Clicked something" value={`${data.clickRate}%`} />
      </div>
      <div className="flex h-16 items-end gap-1" aria-label="Views per day">
        {data.daily.map((d) => (
          <div key={d.day} title={`${d.day}: ${d.views} views, ${d.visitors} people`} className="flex-1 rounded-t bg-primary-500" style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <List title="Pages people look at" rows={data.topPages.map((r) => ({ name: r.path, count: r.count }))} empty="No visits yet." />
        <List title="What they click" rows={data.topClicks.map((r) => ({ name: r.label, count: r.count }))} empty="No clicks yet." />
        <List title="Where they come from" rows={data.topReferrers.map((r) => ({ name: r.host, count: r.count }))} empty="Mostly direct." />
        <List title="Phone or computer" rows={data.devices.map((r) => ({ name: r.device, count: r.count }))} empty="No visits yet." />
      </div>
    </div>
  )
}

export const SiteAnalyticsCard: React.FC = () => {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<SiteAnalytics | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await AuthService.getInstance().makeAuthenticatedRequest(`/api/admin/site-analytics?days=${days}`)
      if (res?.ok) { setData(await res.json()); setError(false) } else setError(true)
    } catch { setError(true) }
  }, [days])

  useEffect(() => { void load() }, [load])

  return (
    <Collapsible
      title="Website visits"
      hint={`Last ${days} days · counted on our own site`}
      badge={
        <select aria-label="Time range" value={days} onClick={(e) => e.stopPropagation()} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
          <option value={1}>Today</option>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
        </select>
      }
    >
      <SiteAnalyticsView data={data} error={error} />
    </Collapsible>
  )
}
