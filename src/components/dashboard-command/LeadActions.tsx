import React, { useState } from 'react'
import { askLoanOfficerAboutLead, type DashboardLeadItem } from '../../services/dashboardCommandService'
import { useNow } from '../../hooks/useNow'
import { showToast } from '../../utils/toastService'

// Small, reusable lead pieces shared by Today, the Leads inbox and the lead page:
// the "waiting" timer, one-tap call/text, Jev's reason, and "ask my loan officer".

const formatWait = (minutes: number) => {
  if (minutes < 1) return 'Just came in'
  if (minutes < 60) return `Waiting ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Waiting ${hours}h ${minutes % 60}m`
  return `Waiting ${Math.floor(hours / 24)}d`
}

export const WaitingBadge: React.FC<{ lead: Pick<DashboardLeadItem, 'status' | 'created_at' | 'intent_level' | 'last_agent_action_at'>; className?: string }> = ({ lead, className = '' }) => {
  const now = useNow()
  if (String(lead.status || '').toLowerCase() !== 'new' || lead.last_agent_action_at) return null
  const created = new Date(lead.created_at || '').getTime()
  if (Number.isNaN(created)) return null
  const minutes = Math.max(0, Math.floor((now - created) / 60000))
  const urgent = minutes >= 5
  const hot = lead.intent_level === 'Hot'
  const tone = urgent && hot
    ? 'bg-rose-600 text-white animate-pulse'
    : urgent
      ? 'bg-amber-100 text-amber-800'
      : 'bg-emerald-100 text-emerald-800'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone} ${className}`}>
      <span className="material-symbols-outlined text-[13px]">timer</span>
      {formatWait(minutes)}{urgent && hot ? ' · call now' : ''}
    </span>
  )
}

// Jev's one-line reason (or the lead summary), so a Hot badge is never a mystery.
export const LeadReason: React.FC<{ lead: DashboardLeadItem; className?: string }> = ({ lead, className = '' }) => {
  const text = lead.intent_reason || lead.next_best_action || lead.lead_summary
  if (!text) return null
  return <p className={`text-xs text-slate-600 ${className}`}><span className="font-semibold text-slate-700">Why: </span>{text}</p>
}

export const CallTextButtons: React.FC<{ phone: string | null; big?: boolean; onUsed?: () => void }> = ({ phone, big = false, onUsed }) => {
  if (!phone) return null
  const size = big ? 'min-h-[44px] px-5 text-sm' : 'min-h-[36px] px-3 text-xs'
  return (
    <>
      <a href={`tel:${phone}`} onClick={onUsed} className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 font-bold text-white hover:bg-emerald-700 ${size}`}>
        <span className="material-symbols-outlined text-[18px]">call</span> Call
      </a>
      <a href={`sms:${phone}`} onClick={onUsed} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 hover:bg-slate-50 ${size}`}>
        <span className="material-symbols-outlined text-[18px]">sms</span> Text
      </a>
    </>
  )
}

export const AskLoButton: React.FC<{ lead: Pick<DashboardLeadItem, 'id' | 'name' | 'can_ask_lo' | 'lo_name'>; big?: boolean }> = ({ lead, big = false }) => {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  if (!lead.can_ask_lo) return null
  const size = big ? 'min-h-[44px] px-5 text-sm' : 'min-h-[36px] px-3 text-xs'
  const who = lead.lo_name || 'my loan officer'
  const send = async () => {
    setState('sending')
    try {
      const res = await askLoanOfficerAboutLead(lead.id)
      setState('sent')
      showToast.success(res.already ? `${res.lo?.name || who} was already asked.` : `Sent. ${res.lo?.name || who} will call ${lead.name || 'them'}.`)
    } catch (error) {
      setState('idle')
      showToast.error(error instanceof Error && error.message !== 'no_loan_officer' ? 'Could not reach your loan officer. Try again.' : 'No loan officer is linked to this lead yet.')
    }
  }
  return (
    <button
      type="button"
      onClick={() => void send()}
      disabled={state !== 'idle'}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-70 ${size}`}
    >
      <span className="material-symbols-outlined text-[18px]">{state === 'sent' ? 'check_circle' : 'support_agent'}</span>
      {state === 'sent' ? 'Asked ✓' : state === 'sending' ? 'Sending…' : `Ask ${who} to call`}
    </button>
  )
}
