import React, { useMemo } from 'react'
import type { Lead } from '../types'
import { DROPPED_BALL_HOURS, selectCallFirst, selectDroppedBall, waitingLabel } from './leadInsights'

interface AdminLeadInsightsProps {
  leads: Lead[]
  onPickOwner: (ownerKey: string) => void
}

const ownerChip = (lead: Lead) =>
  lead.ownerName ? `${lead.ownerType === 'lo' ? 'LO' : 'Agent'}: ${lead.ownerName}` : 'No owner'

const actionCls = 'inline-flex min-h-[40px] items-center justify-center rounded-lg px-3 text-sm font-bold'

// Two small cards above the lead list: who needs a call right now, and whose leads are going cold.
const AdminLeadInsights: React.FC<AdminLeadInsightsProps> = ({ leads, onPickOwner }) => {
  const callFirst = useMemo(() => selectCallFirst(leads), [leads])
  const dropped = useMemo(() => selectDroppedBall(leads), [leads])
  const droppedTotal = dropped.reduce((sum, g) => sum + g.count, 0)

  if (callFirst.length === 0 && droppedTotal === 0) return null

  return (
    <div className="space-y-3">
      {callFirst.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50/60 p-4" aria-label="Call these first">
          <h2 className="text-base font-black text-slate-900">🔥 Call these first</h2>
          <p className="text-xs text-slate-600">Hot and warm leads nobody has contacted yet. The longest wait is first.</p>
          <ul className="mt-3 space-y-2">
            {callFirst.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{lead.name}</p>
                  <p className="text-xs text-slate-500">
                    Waiting {waitingLabel(lead)} · {ownerChip(lead)}
                    {lead.intentLevel ? ` · ${lead.intentLevel}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {lead.phone ? (
                    <>
                      <a href={`tel:${lead.phone}`} className={`${actionCls} bg-green-600 text-white`}>Call</a>
                      <a href={`sms:${lead.phone}`} className={`${actionCls} border border-slate-300 text-slate-700`}>Text</a>
                    </>
                  ) : lead.email ? (
                    <a href={`mailto:${lead.email}`} className={`${actionCls} border border-slate-300 text-slate-700`}>Email</a>
                  ) : (
                    <span className="text-xs text-slate-400">No contact info</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {droppedTotal > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50/60 p-4" aria-label="Dropped ball">
          <summary className="cursor-pointer text-base font-black text-slate-900">
            ⏰ {droppedTotal} lead{droppedTotal === 1 ? '' : 's'} waiting more than {DROPPED_BALL_HOURS} hours
          </summary>
          <ul className="mt-3 space-y-2">
            {dropped.map((group) => (
              <li key={group.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 shadow-sm">
                <p className="text-sm text-slate-800">
                  <span className="font-bold">{group.label}</span>: {group.count} lead{group.count === 1 ? '' : 's'}, oldest {group.oldestLabel}
                </p>
                <button type="button" onClick={() => onPickOwner(group.key)} className={`${actionCls} border border-slate-300 text-slate-700`}>
                  Show them
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export default AdminLeadInsights
