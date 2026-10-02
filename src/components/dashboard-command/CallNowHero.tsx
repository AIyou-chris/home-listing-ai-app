import React from 'react'
import type { DashboardLeadItem } from '../../services/dashboardCommandService'
import { AskLoButton, CallTextButtons, LeadReason, WaitingBadge } from './LeadActions'

// The ONE thing to do right now: call the best lead. Big, thumb-sized, no menus.
const CallNowHero: React.FC<{ lead: DashboardLeadItem; onOpen: (leadId: string) => void; onCalled: (leadId: string) => void }> = ({ lead, onOpen, onCalled }) => {
  const hot = lead.intent_level === 'Hot'
  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${hot ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-white' : 'border-primary-200 bg-gradient-to-br from-primary-50 to-white'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${hot ? 'bg-rose-600 text-white' : 'bg-primary-600 text-white'}`}>
          {hot ? '🔥 Call this one first' : 'Newest lead'}
        </span>
        <WaitingBadge lead={lead} />
      </div>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">{lead.name || 'New lead'}</h2>
      <p className="text-sm text-slate-500">{lead.listing?.address || 'No listing address'}</p>
      <LeadReason lead={lead} className="mt-2 text-sm" />
      <div className="mt-4 flex flex-wrap gap-2">
        <CallTextButtons phone={lead.phone} big onUsed={() => onCalled(lead.id)} />
        <AskLoButton lead={lead} big />
        <button
          type="button"
          onClick={() => onOpen(lead.id)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          See details
        </button>
      </div>
      {!lead.phone && lead.email && (
        <a href={`mailto:${lead.email}`} className="mt-3 inline-block text-sm font-semibold text-primary-700 underline">No phone yet. Email {lead.email}</a>
      )}
    </section>
  )
}

export default CallNowHero
