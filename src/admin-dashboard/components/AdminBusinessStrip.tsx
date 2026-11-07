import React from 'react'

export type BillingSummary = {
  total: number
  paying: number
  trial: number
  comped: number
  late: number
  estMonthly?: number
  founding?: { taken: number; max: number } | null
  signupsByDay?: Array<{ day: string; count: number }>
}

type Item = { kind: string; text: string; count: number; to: string }

const NA = 'Not available'

const Tile: React.FC<{ label: string; value: React.ReactNode; note?: string; tone?: 'default' | 'warn' }> = ({ label, value, note, tone = 'default' }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-slate-600">{label}</p>
    <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value}</p>
    {note && <p className={`text-xs ${tone === 'warn' ? 'font-semibold text-amber-800' : 'text-slate-600'}`}>{note}</p>}
  </div>
)

// The one thing to do first: late payments beat everything, then the first thing waiting on approval.
const pickFirstAction = (billing: BillingSummary | null, items: Item[]): { text: string; to: string; button: string } | null => {
  if (billing && billing.late > 0) {
    return { text: `${billing.late} payment${billing.late === 1 ? '' : 's'} failed`, to: '/admin/users', button: 'See who' }
  }
  const first = items[0]
  return first ? { text: first.text, to: first.to, button: 'Open' } : null
}

export const AdminBusinessStrip: React.FC<{
  billing: BillingSummary | null
  loaded: boolean
  leadsToday: number | null | undefined
  needsItems: Item[]
  onGo: (to: string) => void
}> = ({ billing, loaded, leadsToday, needsItems, onGo }) => {
  const na = loaded ? NA : 'Loading…'
  const action = pickFirstAction(billing, needsItems)
  const founding = billing?.founding
  const foundingLeft = founding ? Math.max(0, founding.max - founding.taken) : null

  return (
    <div className="space-y-3" aria-label="Business today">
      <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${action ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <div className="min-w-0 flex-1 basis-60">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{action ? 'Do this first' : 'All clear'}</p>
          <p className="text-lg font-extrabold text-slate-900">{action ? action.text : 'Nothing is waiting on you right now.'}</p>
        </div>
        {action && (
          <button type="button" onClick={() => onGo(action.to)} className="inline-flex min-h-[44px] items-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-700">{action.button}</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Monthly money (estimate)" value={billing?.estMonthly === undefined ? na : `$${billing.estMonthly.toLocaleString()}`} note="$99 each, $79 for founding" />
        <Tile label="Paying loan officers" value={billing ? billing.paying : na} note={billing ? `${billing.comped} free (comped)` : undefined} />
        <Tile label="In free trial" value={billing ? billing.trial : na} />
        <Tile label="Leads today" value={leadsToday === null || leadsToday === undefined ? NA : leadsToday} note="Across all loan officers" />
      </div>

      {billing && billing.late > 0 && (
        <Tile label="Payments failed" value={billing.late} note="Card declined or unpaid" tone="warn" />
      )}

      {founding && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-extrabold text-slate-900">Founding $79 spots: {founding.taken} of {founding.max} taken</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${founding.taken} of ${founding.max} founding spots taken`}>
            <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, Math.round((founding.taken / Math.max(1, founding.max)) * 100))}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-600">{foundingLeft} left at $79. After that it is $99.</p>
        </div>
      )}
    </div>
  )
}

export default AdminBusinessStrip
