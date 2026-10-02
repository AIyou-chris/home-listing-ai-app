import React, { useEffect, useState } from 'react'
import { fetchMyLoanOfficer, type MyLoanOfficer } from '../../services/dashboardCommandService'

// Shows the agent what their loan officer partner is doing for them. Hidden if they have none.
const MyLoanOfficerCard: React.FC = () => {
  const [data, setData] = useState<MyLoanOfficer | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchMyLoanOfficer().then((res) => { if (!cancelled) setData(res) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  if (!data?.lo) return null
  const { lo, week } = data
  const initials = lo.name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  const sent = week?.leads || 0
  const pre = week?.pre_approvals || 0
  return (
    <article className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {lo.headshot_url
          ? <img src={lo.headshot_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">{initials}</span>}
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Your loan officer</p>
          <p className="truncate text-base font-bold text-slate-900">{lo.name}</p>
          <p className="truncate text-xs text-slate-500">{[lo.company, lo.nmls_number ? `NMLS #${lo.nmls_number}` : ''].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {sent > 0
          ? <>This week: <span className="font-bold">{sent} buyer{sent === 1 ? '' : 's'}</span> sent to you{pre > 0 ? <>, <span className="font-bold">{pre} pre-approval{pre === 1 ? '' : 's'}</span></> : ''}.</>
          : 'Every buyer who asks about financing goes to them. Nothing yet this week.'}
      </p>
      {(lo.phone || lo.email) && (
        <div className="mt-3 flex gap-2">
          {lo.phone && <a href={`tel:${lo.phone}`} className="inline-flex min-h-[36px] items-center rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700">Call</a>}
          {lo.phone && <a href={`sms:${lo.phone}`} className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50">Text</a>}
          {lo.email && <a href={`mailto:${lo.email}`} className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50">Email</a>}
        </div>
      )}
    </article>
  )
}

export default MyLoanOfficerCard
