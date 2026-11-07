import React, { useCallback, useEffect, useState } from 'react'
import Collapsible from '../../marketing-engine/screens/Collapsible'
import { AuthService } from '../../services/authService'

export type SiteAnalytics = {
  days: number; visitors: number; views: number; clicks: number; clickRate: number
  daily: Array<{ day: string; views: number; visitors: number }>
  topPages: Array<{ path: string; count: number }>
  topClicks: Array<{ label: string; count: number }>
  topReferrers: Array<{ host: string; count: number }>
  devices: Array<{ device: string; count: number }>
}

// Two lines on one graph: people who visited (blue) and people who signed up (green). Signups only show for the days we have them.
const VisitorsGraph: React.FC<{ daily: SiteAnalytics['daily']; signupsByDay?: Array<{ day: string; count: number }> }> = ({ daily, signupsByDay }) => {
  const W = 420, H = 110
  const signups = new Map((signupsByDay || []).map((s) => [s.day, s.count]))
  const hasSignups = daily.some((d) => signups.has(d.day))
  const max = Math.max(1, ...daily.map((d) => d.visitors), ...daily.map((d) => signups.get(d.day) || 0))
  const x = (i: number) => (daily.length <= 1 ? W / 2 : (i / (daily.length - 1)) * W)
  const y = (v: number) => H - 8 - (v / max) * (H - 24)
  const line = (get: (d: SiteAnalytics['daily'][number]) => number) => daily.map((d, i) => `${x(i)},${y(get(d))}`).join(' ')
  const visitorsLine = line((d) => d.visitors)
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" role="img" aria-label="Visitors per day, with signups when known">
        <g stroke="currentColor" className="text-slate-200" strokeWidth="0.5">
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H - 8 - f * (H - 24)} y2={H - 8 - f * (H - 24)} />)}
        </g>
        {daily.length > 1 && <polygon points={`0,${H - 8} ${visitorsLine} ${W},${H - 8}`} className="fill-primary-500" opacity="0.15" />}
        <polyline points={visitorsLine} fill="none" className="stroke-primary-600" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {hasSignups && <polyline points={line((d) => signups.get(d.day) || 0)} fill="none" className="stroke-emerald-600" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {daily.map((d, i) => <circle key={d.day} cx={x(i)} cy={y(d.visitors)} r="3" className="fill-primary-600"><title>{`${d.day}: ${d.visitors} people, ${d.views} views`}</title></circle>)}
      </svg>
      <div className="flex justify-between text-xs text-slate-600">
        <span>{daily[0]?.day.slice(5)}</span>
        <span className="flex gap-3"><span><b className="text-primary-700">●</b> People who visited</span>{hasSignups && <span><b className="text-emerald-700">●</b> Signed up</span>}</span>
        <span>{daily[daily.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  )
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

export const SiteAnalyticsView: React.FC<{ data: SiteAnalytics | null; error?: boolean; signupsByDay?: Array<{ day: string; count: number }> }> = ({ data, error, signupsByDay }) => {
  if (error || !data) return <p className="text-sm text-slate-700">Not available yet. The tracking table may not be set up.</p>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="People who visited" value={data.visitors} />
        <Stat label="Pages viewed" value={data.views} />
        <Stat label="Clicks" value={data.clicks} />
        <Stat label="Clicked something" value={`${data.clickRate}%`} />
      </div>
      <VisitorsGraph daily={data.daily} signupsByDay={signupsByDay} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <List title="Pages people look at" rows={data.topPages.map((r) => ({ name: r.path, count: r.count }))} empty="No visits yet." />
        <List title="What they click" rows={data.topClicks.map((r) => ({ name: r.label, count: r.count }))} empty="No clicks yet." />
        <List title="Where they come from" rows={data.topReferrers.map((r) => ({ name: r.host, count: r.count }))} empty="Mostly direct." />
        <List title="Phone or computer" rows={data.devices.map((r) => ({ name: r.device, count: r.count }))} empty="No visits yet." />
      </div>
    </div>
  )
}

export const SiteAnalyticsCard: React.FC<{ signupsByDay?: Array<{ day: string; count: number }> }> = ({ signupsByDay }) => {
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
      <SiteAnalyticsView data={data} error={error} signupsByDay={signupsByDay} />
    </Collapsible>
  )
}
