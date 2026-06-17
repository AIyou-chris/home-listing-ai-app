import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PageGuide from './PageGuide';
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  fetchDashboardLeads,
  fetchLeadConversationsForExport,
  logDashboardAgentAction,
  deleteDashboardLead,
  type DashboardLeadItem
} from '../../services/dashboardCommandService'
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode'
import { useBlueprintMode } from '../../demo/useBlueprintMode'
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

const timeAgo = (dateStr: string | null | undefined) => {
  if (!dateStr) return ''
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const exportConversationsCSV = async () => {
  const leads = await fetchLeadConversationsForExport()
  if (!leads.length) return

  const escape = (val: unknown) => {
    const s = String(val ?? '').replace(/"/g, '""')
    return `"${s}"`
  }

  const headers = ['Lead Name', 'Phone', 'Email', 'Listing Address', 'Sender', 'Message', 'Timestamp']
  const rows: string[] = []

  for (const lead of leads) {
    if (!lead.messages.length) {
      // Lead with no messages — one row just to capture the contact
      rows.push([
        escape(lead.name),
        escape(lead.phone),
        escape(lead.email),
        escape(lead.listing_address),
        escape(''),
        escape('(no messages)'),
        escape(lead.conversation_started_at ? new Date(lead.conversation_started_at).toLocaleString() : '')
      ].join(','))
    } else {
      for (const msg of lead.messages) {
        rows.push([
          escape(lead.name),
          escape(lead.phone),
          escape(lead.email),
          escape(lead.listing_address),
          escape(msg.sender === 'visitor' ? 'Buyer' : 'AI'),
          escape(msg.text),
          escape(new Date(msg.created_at).toLocaleString())
        ].join(','))
      }
    }
  }

  const csv = [headers.map(escape).join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `conversations-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const exportLeadsCSV = (leads: DashboardLeadItem[]) => {
  const headers = [
    'Name', 'Phone', 'Email', 'Status', 'Intent', 'Timeline',
    'Financing', 'Source', 'Listing Address', 'Summary', 'Created', 'Last Activity'
  ]

  const escape = (val: unknown) => {
    const s = String(val ?? '').replace(/"/g, '""')
    return `"${s}"`
  }

  const rows = leads.map((lead) => [
    escape(lead.name),
    escape(lead.phone),
    escape(lead.email),
    escape(lead.status),
    escape(lead.intent_level),
    escape(lead.timeline),
    escape(lead.financing),
    escape(lead.source_type?.replace(/_/g, ' ')),
    escape(lead.listing?.address),
    escape(lead.lead_summary || lead.last_message_preview),
    escape(lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''),
    escape(lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleDateString() : '')
  ].join(','))

  const csv = [headers.map(escape).join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const LeadsInboxCommandPage: React.FC = () => {
  const navigate = useNavigate()
  const demoMode = useDemoMode()
  const blueprintMode = useBlueprintMode()
  const leadsById = useDashboardRealtimeStore((state) => state.leadsById)
  const setInitialLeads = useDashboardRealtimeStore((state) => state.setInitialLeads)
  const removeLead = useDashboardRealtimeStore((state) => state.removeLead)

  const [loading, setLoading] = useState(!blueprintMode)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'New' | 'All'>('New')
  const [search, setSearch] = useState('')
  const [intentFilter, setIntentFilter] = useState<'All' | 'Hot' | 'Warm' | 'Cold'>('All')
  const [exportingConversations, setExportingConversations] = useState(false)
  const [leadPendingDelete, setLeadPendingDelete] = useState<DashboardLeadItem | null>(null)
  const [deletingLead, setDeletingLead] = useState(false)

  const load = useCallback(async () => {
    if (blueprintMode) { setLoading(false); return }
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
  }, [setInitialLeads, blueprintMode])

  useEffect(() => { void load() }, [load])

  const allLeads = useMemo(() => Object.values(leadsById), [leadsById])

  // Tab counts
  const newCount = useMemo(() => allLeads.filter(l => l.status === 'New').length, [allLeads])
  const allCount = allLeads.length

  // Whether any filter is active (used for empty-state messaging)
  const isFiltering = search.trim().length > 0 || intentFilter !== 'All'

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = allLeads.filter((lead) => {
      if (tab === 'New' && lead.status !== 'New') return false
      if (intentFilter !== 'All' && lead.intent_level !== intentFilter) return false
      if (q) {
        const name = String(lead.name || '').toLowerCase()
        const addr = String(lead.listing?.address || '').toLowerCase()
        const phone = String(lead.phone || '').toLowerCase()
        const email = String(lead.email || '').toLowerCase()
        if (!name.includes(q) && !addr.includes(q) && !phone.includes(q) && !email.includes(q)) return false
      }
      return true
    })
    return sortLeadsForInbox(rows)
  }, [allLeads, tab, search, intentFilter])

  const logOpen = async (leadId: string) => {
    if (blueprintMode || demoMode) return
    await logDashboardAgentAction({
      lead_id: leadId,
      action: 'lead_opened',
      metadata: { source: 'leads_inbox' }
    }).catch(() => undefined)
  }

  const confirmDeleteLead = async () => {
    if (!leadPendingDelete) return
    setDeletingLead(true)
    try {
      await deleteDashboardLead(leadPendingDelete.id)
      removeLead(leadPendingDelete.id)
      toast.success('Lead deleted.')
      setLeadPendingDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lead.')
    } finally {
      setDeletingLead(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8 font-sans">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Leads</h1>
          <p className="mt-2 text-lg text-slate-500 font-medium text-center sm:text-left">New leads and listing inquiries—organized by what matters most.</p>
        </div>
        {!loading && allCount > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => exportLeadsCSV(filteredLeads)}
              disabled={filteredLeads.length === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export CSV{filteredLeads.length > 0 ? ` (${filteredLeads.length})` : ''}
            </button>
            <button
              type="button"
              onClick={async () => {
                setExportingConversations(true)
                try { await exportConversationsCSV() } finally { setExportingConversations(false) }
              }}
              disabled={exportingConversations}
              className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">forum</span>
              {exportingConversations ? 'Exporting…' : 'Export Conversations'}
            </button>
          </div>
        )}
      </div>

      <PageGuide pageKey="leads" />

      <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('New')}
          className={`flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-widest transition-colors ${tab === 'New'
            ? 'border-b-2 border-slate-900 text-slate-900'
            : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          New
          {newCount > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${tab === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {newCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('All')}
          className={`flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-widest transition-colors ${tab === 'All'
            ? 'border-b-2 border-slate-900 text-slate-900'
            : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          All
          {allCount > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${tab === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {allCount}
            </span>
          )}
        </button>
      </div>

      {/* Search + intent filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
          <input
            type="text"
            placeholder="Search by name, address, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['All', 'Hot', 'Warm', 'Cold'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setIntentFilter(level)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                intentFilter === level
                  ? level === 'Hot'
                    ? 'bg-rose-100 text-rose-700'
                    : level === 'Warm'
                    ? 'bg-amber-100 text-amber-700'
                    : level === 'Cold'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {level === 'Hot' ? '🔥' : level === 'Warm' ? '☀️' : level === 'Cold' ? '❄️' : ''} {level}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-4">
        {loading && (
          <>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-9 w-20 bg-slate-100 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </>
        )}
        {!loading && error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm font-medium text-rose-700">{error}</div>}

        {!loading && !error && filteredLeads.length === 0 && isFiltering && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No leads match your search.</h3>
            <p className="text-slate-500 font-medium text-lg">Try a different name, address, or remove the filter.</p>
          </div>
        )}

        {!loading && !error && filteredLeads.length === 0 && !isFiltering && tab === 'New' && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">All caught up.</h3>
            <p className="text-slate-500 font-medium text-lg">New leads will appear here automatically.</p>
          </div>
        )}

        {!loading && !error && filteredLeads.length === 0 && !isFiltering && tab === 'All' && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No leads yet.</h3>
            <p className="text-slate-500 font-medium text-lg mb-8">Let's get your first property published.</p>
            <button
              onClick={() => navigate(buildDashboardPath('/listings', demoMode))}
              className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors shadow-lg"
            >
              Create your first listing
            </button>
          </div>
        )}

        {!loading && !error && filteredLeads.map((lead) => (
            <div key={lead.id} className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => {
              void logOpen(lead.id)
              navigate(buildDashboardPath(`/leads/${lead.id}`, demoMode))
            }}>
              <div className="flex items-start gap-4 flex-1">

                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <span className="material-symbols-outlined text-slate-400">person</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-slate-900 truncate">{lead.name || 'Unknown'}</h3>

                    {/* Badges */}
                    <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                      {lead.status === 'New' && <span className="rounded px-1.5 py-0.5 bg-blue-100 text-[10px] font-black uppercase tracking-wider text-blue-700">NEW</span>}
                      {lead.intent_level === 'Hot' && <span className="rounded px-1.5 py-0.5 bg-rose-100 text-[10px] font-black uppercase tracking-wider text-rose-700">🔥 HOT</span>}
                      {lead.intent_level === 'Warm' && <span className="rounded px-1.5 py-0.5 bg-amber-100 text-[10px] font-black uppercase tracking-wider text-amber-700">☀️ WARM</span>}
                      {lead.intent_level === 'Cold' && <span className="rounded px-1.5 py-0.5 bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">❄️ COLD</span>}
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-slate-700 font-medium text-sm truncate mb-1">
                    {lead.lead_summary || lead.last_message_preview || 'New lead captured'}
                  </p>

                  {/* Metadata line */}
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                    <span className="truncate max-w-[200px]">{lead.listing?.address || 'No listing attached'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="capitalize">{lead.source_type?.replace(/_/g, ' ') || 'Unknown Source'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{timeAgo(lead.last_activity_at || lead.created_at)}</span>
                  </div>
                  {lead.lo_name && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary-600">
                      <span className="material-symbols-outlined text-[13px]">handshake</span>
                      Shared with {lead.lo_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
                    title={lead.phone}
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void logOpen(lead.id)
                    navigate(buildDashboardPath(`/leads/${lead.id}`, demoMode));
                  }}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-lg transition-colors text-sm"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLeadPendingDelete(lead)
                  }}
                  title="Delete lead"
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
      </section>

      {leadPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !deletingLead && setLeadPendingDelete(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Delete this lead?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete <span className="font-semibold">{leadPendingDelete.name || 'this lead'}</span> along with their conversation history and any scheduled appointments. This can't be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setLeadPendingDelete(null)}
                disabled={deletingLead}
                className="px-4 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteLead()}
                disabled={deletingLead}
                className="px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deletingLead ? 'Deleting…' : 'Delete Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeadsInboxCommandPage
