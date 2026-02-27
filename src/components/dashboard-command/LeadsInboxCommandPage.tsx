import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchDashboardLeads,
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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'New' | 'All'>('New')

  const status = 'all'
  const intent = 'all'
  const listingId = 'all'
  const timeframe = 'all' as const

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

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Leads</h1>
        <p className="mt-2 text-lg text-slate-500 font-medium">New leads and listing inquiries—organized by what matters most.</p>
      </div>

      <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('New')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors ${tab === 'New'
            ? 'border-b-2 border-slate-900 text-slate-900'
            : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          New
        </button>
        <button
          onClick={() => setTab('All')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors ${tab === 'All'
            ? 'border-b-2 border-slate-900 text-slate-900'
            : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          All
        </button>
      </div>

      <section className="space-y-4">
        {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">Loading leads...</div>}
        {!loading && error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm font-medium text-rose-700">{error}</div>}

        {!loading && !error && filteredLeads.length === 0 && tab === 'New' && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">All caught up.</h3>
            <p className="text-slate-500 font-medium text-lg">New leads will appear here automatically.</p>
          </div>
        )}

        {!loading && !error && filteredLeads.length === 0 && tab === 'All' && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No leads yet.</h3>
            <p className="text-slate-500 font-medium text-lg mb-8">Let's get your first property published.</p>
            <button
              onClick={() => navigate('/listings')}
              className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors shadow-lg"
            >
              Create your first listing
            </button>
          </div>
        )}

        {!loading && !error && filteredLeads.map((lead) => {

          // Format time ago
          const timeAgo = () => {
            const ms = Date.now() - new Date(lead.last_activity_at || lead.created_at).getTime();
            const mins = Math.floor(ms / 60000);
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            return `${Math.floor(hrs / 24)}d ago`;
          };

          return (
            <div key={lead.id} className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => navigate(`/dashboard/leads/${lead.id}`)}>
              <div className="flex items-start gap-4 flex-1">

                {/* Subtle Avatar */}
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <span className="material-symbols-outlined text-slate-400">person</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-slate-900 truncate">{lead.name || 'Unknown'}</h3>

                    {/* Badges */}
                    <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                      {lead.status === 'New' && <span className="rounded px-1.5 py-0.5 bg-blue-100 text-[10px] font-black uppercase tracking-wider text-blue-700">NEW</span>}
                      {lead.intent_level === 'Hot' && <span className="rounded px-1.5 py-0.5 bg-rose-100 text-[10px] font-black uppercase tracking-wider text-rose-700">HOT</span>}
                    </div>
                  </div>

                  {/* Quick Reason / Summary */}
                  <p className="text-slate-700 font-medium text-sm truncate mb-1">
                    {lead.lead_summary || lead.last_message_preview || 'New lead captured'}
                  </p>

                  {/* Metadata line */}
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                    <span className="truncate max-w-[200px]">{lead.listing?.address || 'No listing attached'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="capitalize">{lead.source_type?.replace(/_/g, ' ') || 'Unknown Source'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{timeAgo()}</span>
                  </div>
                </div>
              </div>

              {/* The ONE action */}
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/leads/${lead.id}`);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-lg transition-colors text-sm"
                >
                  Open
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  )
}

export default LeadsInboxCommandPage
