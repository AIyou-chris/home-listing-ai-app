import React, { useCallback, useEffect, useState } from 'react'
import Collapsible from '../../marketing-engine/screens/Collapsible'
import { AuthService } from '../../services/authService'

export type SpendRow = { key: string; label: string; used: number; limit: number }

export const SpendTodayView: React.FC<{ rows: SpendRow[] | null; error?: boolean }> = ({ rows, error }) => {
  if (error || !rows) return <p className="text-sm text-slate-700">Not available right now.</p>
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const pct = r.limit > 0 ? Math.min(100, Math.round((r.used / r.limit) * 100)) : 0
          const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
          return (
            <li key={r.key} className="rounded-xl border border-slate-200 p-3">
              <div className="flex justify-between text-sm text-slate-900">
                <span className="font-semibold">{r.label}</span>
                <span>{r.used} of {r.limit}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-slate-600">Counts today. They restart at zero when the server restarts. Each one stops on its own at the limit.</p>
    </div>
  )
}

export const SpendTodayCard: React.FC = () => {
  const [rows, setRows] = useState<SpendRow[] | null>(null)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    try {
      const res = await AuthService.getInstance().makeAuthenticatedRequest('/api/admin/spend-today')
      if (res?.ok) { setRows((await res.json()).rows); setError(false) } else setError(true)
    } catch { setError(true) }
  }, [])
  useEffect(() => { void load() }, [load])
  return (
    <Collapsible title="Paid services today" hint="AI, texts, email, calls: used versus the daily stop">
      <SpendTodayView rows={rows} error={error} />
    </Collapsible>
  )
}
