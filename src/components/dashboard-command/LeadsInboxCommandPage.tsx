import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchDashboardLeads,
  logDashboardAgentAction,
  updateDashboardLeadStatus,
  type DashboardLeadItem
} from '../../services/dashboardCommandService'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'

const sortLeadsForInbox = (rows: DashboardLeadItem[]) => {
  const rank = (lead: DashboardLeadItem) => {
    if (lead.intent_level === 'Hot' && lead.status === 'New') return 1
    if (lead.status === 'New') return 2
    if (lead.intent_level === 'Warm') return 3
    if (lead.intent_level === 'Cold') return 4
    return 5
  }

  return rows
    .slice()
    .sort((a, b) => {
      const rankA = rank(a)
      const rankB = rank(b)
      if (rankA !== rankB) return rankA - rankB
      return new Date(b.last_activity_at || b.created_at).getTime() - new Date(a.last_activity_at || a.created_at).getTime()
    })
}

const LeadsInboxCommandPage: React.FC = () => {
  const navigate = useNavigate()
  const leadsById = useDashboardRealtimeStore((state) => state.leadsById)
  const setInitialLeads = useDashboardRealtimeStore((state) => state.setInitialLeads)
  const applyRealtimeEvent = useDashboardRealtimeStore((state) => state.applyRealtimeEvent)
  const patchLeadAction = useDashboardRealtimeStore((state) => state.patchLeadAction)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'New' | 'All'>('New')
  const [status, setStatus] = useState('all')
  const [intent, setIntent] = useState('all')
  const [listingId, setListingId] = useState('all')
  const [timeframe, setTimeframe] = useState<'all' | '24h' | '7d' | '30d'>('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchDashboardLeads({ tab: 'All', sort: 'hot_first' })
        setInitialLeads(response.leads || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leads.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [setInitialLeads])

  const allLeads = useMemo(() => Object.values(leadsById), [leadsById])

  const listingOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const lead of allLeads) {
      if (!lead.listing_id) continue
      const label = lead.listing?.address || lead.listing_id
      map.set(lead.listing_id, label)
    }
    return Array.from(map.entries())
  }, [allLeads])

  const filteredLeads = useMemo(() => {
    const now = Date.now()
    const minTs =
      timeframe === '24h'
        ? now - 24 * 60 * 60 * 1000
        : timeframe === '7d'
          ? now - 7 * 24 * 60 * 60 * 1000
          : timeframe === '30d'
            ? now - 30 * 24 * 60 * 60 * 1000
            : null

    const rows = allLeads.filter((lead) => {
      if (tab === 'New' && lead.status !== 'New') return false
      if (status !== 'all' && lead.status !== status) return false
      if (intent !== 'all' && lead.intent_level !== intent) return false
      if (listingId !== 'all' && lead.listing_id !== listingId) return false
      if (minTs) {
        const ts = new Date(lead.last_activity_at || lead.created_at).getTime()
        if (!Number.isFinite(ts) || ts < minTs) return false
      }
      return true
    })

    return sortLeadsForInbox(rows)
  }, [allLeads, tab, status, intent, listingId, timeframe])

  const runActionLog = async (leadId: string, action: 'call_clicked' | 'email_clicked' | 'status_changed' | 'appointment_created' | 'appointment_updated', metadata?: Record<string, unknown>) => {
    const nowIso = new Date().toISOString()
    patchLeadAction(leadId, nowIso)
    await logDashboardAgentAction({ lead_id: leadId, action, metadata }).catch(() => undefined)
  }

  const handleMarkContacted = async (lead: DashboardLeadItem) => {
    try {
      await updateDashboardLeadStatus(lead.id, { status: 'Contacted' })
      await runActionLog(lead.id, 'status_changed', { status: 'Contacted' })
      applyRealtimeEvent({
        type: 'lead.status_changed',
        v: 1,
        ts: new Date().toISOString(),
        agent_id: 'local',
        payload: {
          lead_id: lead.id,
          full_name: lead.name,
          listing_id: lead.listing_id,
          listing_address: lead.listing?.address || null,
          status: 'Contacted',
          intent_level: lead.intent_level,
          timeline: lead.timeline,
          financing: lead.financing,
          last_activity_at: new Date().toISOString(),
          lead_summary_preview: lead.lead_summary || lead.last_message_preview || 'No summary yet.',
          source_type: lead.source_type,
          phone: lead.phone,
          email: lead.email
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark contacted.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
        <p className="mt-1 text-sm text-slate-600">New leads and listing inquiries—organized by what matters most.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-2 md:grid-cols-6">
          <button
            type="button"
            onClick={() => setTab('New')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tab === 'New' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
          >
            New
          </button>
          <button
            type="button"
            onClick={() => setTab('All')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tab === 'All' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
          >
            All
          </button>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">Status: All</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Nurture">Nurture</option>
            <option value="Closed-Lost">Closed-Lost</option>
          </select>
          <select value={intent} onChange={(event) => setIntent(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">Intent: All</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
          <select value={listingId} onChange={(event) => setListingId(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">Listing: All</option>
            {listingOptions.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <select value={timeframe} onChange={(event) => setTimeframe(event.target.value as 'all' | '24h' | '7d' | '30d')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">Any time</option>
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
          </select>
        </div>
      </section>

      <section className="space-y-3">
        {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading leads...</div>}
        {!loading && error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {!loading && !error && filteredLeads.length === 0 && tab === 'New' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            <p className="text-base font-semibold text-slate-900">All caught up.</p>
            <p className="mt-1">New leads will appear here automatically.</p>
          </div>
        )}

        {!loading && !error && filteredLeads.length === 0 && tab === 'All' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No leads match these filters.</div>
        )}

        {!loading && !error && filteredLeads.map((lead) => (
          <div key={lead.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{lead.name || 'Unknown'}</p>
                <p className="text-xs text-slate-500">{lead.listing?.address || 'No listing attached'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {lead.status === 'New' && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">NEW</span>}
                {lead.intent_level === 'Hot' && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">HOT</span>}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{lead.status}</span>
              </div>
            </div>

            <p className="mt-2 text-sm text-slate-700 line-clamp-1">{lead.lead_summary || lead.last_message_preview || 'No summary yet.'}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>From: {lead.source_type || 'unknown'}</span>
              {lead.phone && <span>{lead.phone}</span>}
              {lead.email && <span>{lead.email}</span>}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (lead.phone) {
                    void runActionLog(lead.id, 'call_clicked')
                    window.location.href = `tel:${lead.phone}`
                  }
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Call
              </button>
              <button
                type="button"
                onClick={() => {
                  if (lead.email) {
                    void runActionLog(lead.id, 'email_clicked')
                    window.location.href = `mailto:${lead.email}`
                  }
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
                className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => void handleMarkContacted(lead)}
                className="ml-1 text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2"
              >
                Mark contacted
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

export default LeadsInboxCommandPage
