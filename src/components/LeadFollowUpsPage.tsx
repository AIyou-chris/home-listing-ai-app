
import React, { useEffect, useMemo, useState, FormEvent } from 'react'
import {
  Lead,
  FollowUpSequence,
  ActiveLeadFollowUp,
  FollowUpHistoryEvent,
  FollowUpHistoryEventType
} from '../types'
import {
  useFollowUpsStore,
  FollowUpFilters as FollowUpFiltersState,
  FollowUpAISuggestion
} from '../state/useFollowUpsStore'

interface LeadFollowUpsPageProps {
  leads: Lead[]
  sequences: FollowUpSequence[]
}

const FollowUpStatusBadge: React.FC<{ status: ActiveLeadFollowUp['status'] }> = ({ status }) => {
    const statusStyles = {
        active: 'bg-green-100 text-green-700 ring-green-600/20',
        paused: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
        completed: 'bg-blue-100 text-blue-700 ring-blue-600/20',
        cancelled: 'bg-red-100 text-red-700 ring-red-600/20'
  }
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ring-1 ring-inset ${statusStyles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

const LeadListItem: React.FC<{
  followUp: ActiveLeadFollowUp
  lead?: Lead
  sequence?: FollowUpSequence
  isSelected: boolean
  onSelect: () => void
  isUpdating: boolean
}> = ({ followUp, lead, sequence, isSelected, onSelect, isUpdating }) => {
  if (!lead || !sequence) return null
  const progress = sequence.steps.length > 0 ? ((followUp.currentStepIndex + 1) / sequence.steps.length) * 100 : 0

    return (
        <button
            onClick={onSelect}
      className={`w-full text-left p-4 border-l-4 transition-colors ${
        isSelected ? 'border-primary-500 bg-slate-50' : 'border-transparent hover:bg-slate-50'
      }`}
        >
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800">{lead.name}</h3>
        <div className="flex items-center gap-2">
                <FollowUpStatusBadge status={followUp.status} />
          {isUpdating && <span className="material-symbols-outlined w-4 h-4 animate-spin text-primary-500">progress_activity</span>}
        </div>
            </div>
            <p className="text-sm text-slate-500 mt-1">{sequence.name}</p>
            <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progress</span>
          <span>
            Step {followUp.currentStepIndex + 1} of {sequence.steps.length}
          </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </button>
  )
}

const TimelineItem: React.FC<{ event: FollowUpHistoryEvent }> = ({ event }) => {
  const icons: Record<FollowUpHistoryEventType, { icon: string; color: string }> = {
        enroll: { icon: 'auto_awesome', color: 'text-purple-600' },
        'email-sent': { icon: 'mail', color: 'text-blue-600' },
        'email-opened': { icon: 'drafts', color: 'text-green-600' },
        'email-clicked': { icon: 'ads_click', color: 'text-purple-600' },
        'task-created': { icon: 'edit', color: 'text-yellow-600' },
        'meeting-set': { icon: 'calendar_month', color: 'text-indigo-600' },
        pause: { icon: 'pause_circle', color: 'text-orange-600' },
        resume: { icon: 'play_circle', color: 'text-green-600' },
        cancel: { icon: 'cancel', color: 'text-red-600' },
        complete: { icon: 'check_circle', color: 'text-blue-600' },
    'manual-touch': { icon: 'edit_note', color: 'text-primary-600' }
  }
  const { icon, color } = icons[event.type]

    return (
        <li className="relative flex gap-x-4">
            <div className="absolute left-0 top-0 flex w-8 justify-center -bottom-2">
                <div className="w-px bg-slate-200"></div>
            </div>
            <div className="relative flex h-8 w-8 flex-none items-center justify-center bg-white">
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-white">
                    <span className={`material-symbols-outlined w-5 h-5 ${color}`}>{icon}</span>
                </div>
            </div>
            <div className="flex-auto py-1.5">
                <p className="text-sm text-slate-600">{event.description}</p>
                <time className="mt-1 text-xs text-slate-400">
                    {new Date(event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </time>
            </div>
        </li>
  )
}

const AISuggestionList: React.FC<{ suggestions: FollowUpAISuggestion[] }> = ({ suggestions }) => {
  if (suggestions.length === 0) return null
  return (
    <div className="mt-3 rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 space-y-3">
      {suggestions.map((suggestion) => (
        <div key={suggestion.id} className="text-sm text-primary-900">
          <p className="font-semibold">
            {suggestion.title}
            {suggestion.severity === 'critical' && <span className="ml-2 text-xs text-red-600">Critical</span>}
            {suggestion.severity === 'warning' && <span className="ml-2 text-xs text-orange-600">Warning</span>}
          </p>
          <p className="mt-1 text-primary-800">{suggestion.message}</p>
          {suggestion.actionLabel && (
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-primary-700 hover:text-primary-800"
              onClick={() => alert('Automated action coming soon!')}
            >
              {suggestion.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

const FiltersBar: React.FC<{
  filters: FollowUpFiltersState
  onChange: (updates: Partial<FollowUpFiltersState>) => void
  sequences: FollowUpSequence[]
}> = ({ filters, onChange, sequences }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <input
        type="search"
        value={filters.search}
        onChange={(event) => onChange({ search: event.target.value })}
        placeholder="Search by lead or sequence"
        className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value as FollowUpFiltersState['status'] })}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filters.sequenceId ?? ''}
          onChange={(event) => onChange({ sequenceId: event.target.value || undefined })}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="">All sequences</option>
          {sequences.map((sequence) => (
            <option key={sequence.id} value={sequence.id}>
              {sequence.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

const LeadFollowUpsPage: React.FC<LeadFollowUpsPageProps> = ({ leads, sequences }) => {
  const [showTips, setShowTips] = useState(true)
  const [manualNote, setManualNote] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [showAiPrompt, setShowAiPrompt] = useState(false)

  const {
    activeFollowUps,
    fetchFollowUps,
    isLoading,
    isUpdatingId,
    error,
    selectedId,
    selectFollowUp,
    updateStatus,
    logManualTouch,
    filters,
    setFilters,
    suggestionMap,
    analyzeFollowUp,
    isAnalyzingId,
    analyzeError
  } = useFollowUpsStore()

  useEffect(() => {
    fetchFollowUps()
  }, [fetchFollowUps])

  const filteredFollowUps = useMemo(() => {
    return activeFollowUps.filter((followUp) => {
      const lead = leads.find((candidate) => candidate.id === followUp.leadId)
      const sequence = sequences.find((candidate) => candidate.id === followUp.sequenceId)

      if (filters.status !== 'all' && followUp.status !== filters.status) return false
      if (filters.sequenceId && followUp.sequenceId !== filters.sequenceId) return false
      if (filters.search) {
        const haystack = `${lead?.name ?? ''} ${sequence?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(filters.search.toLowerCase())) return false
      }
      return true
    })
  }, [activeFollowUps, filters.search, filters.sequenceId, filters.status, leads, sequences])

  useEffect(() => {
    if (filteredFollowUps.length === 0) return
    if (selectedId && filteredFollowUps.some((followUp) => followUp.id === selectedId)) return
    selectFollowUp(filteredFollowUps[0].id)
  }, [filteredFollowUps, selectFollowUp, selectedId])

  const selectedFollowUp = useMemo(
    () => activeFollowUps.find((followUp) => followUp.id === selectedId),
    [activeFollowUps, selectedId]
  )
  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedFollowUp?.leadId), [leads, selectedFollowUp])
  const selectedSequence = useMemo(
    () => sequences.find((sequence) => sequence.id === selectedFollowUp?.sequenceId),
    [sequences, selectedFollowUp]
  )

  const isDetailView = selectedId !== null

    const stats = {
    total: filteredFollowUps.length,
    active: filteredFollowUps.filter((followUp) => followUp.status === 'active').length,
    paused: filteredFollowUps.filter((followUp) => followUp.status === 'paused').length,
    completed: filteredFollowUps.filter((followUp) => followUp.status === 'completed').length,
    cancelled: filteredFollowUps.filter((followUp) => followUp.status === 'cancelled').length
  }

  const handleManualTouchSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedFollowUp || !manualNote.trim()) return
    await logManualTouch(selectedFollowUp.id, manualNote.trim())
    setManualNote('')
    setShowManualForm(false)
  }

  const handleStatusChange = (status: ActiveLeadFollowUp['status']) => {
    if (!selectedFollowUp) return
    updateStatus(selectedFollowUp.id, status)
  }

  const handleFilterChange = (updates: Partial<FollowUpFiltersState>) => {
    setFilters(updates)
  }

  const handleToggleAi = async () => {
    if (!selectedFollowUp) return
    const next = !showAiPrompt
    setShowAiPrompt(next)
    if (next && !suggestionMap[selectedFollowUp.id]) {
      await analyzeFollowUp(selectedFollowUp.id)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-20 text-center text-slate-500">
        <div className="flex items-center justify-center gap-3 text-sm">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          Loading active follow-ups...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Unable to load follow-ups</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={fetchFollowUps}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (filteredFollowUps.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-8">
                <div className="text-center">
                    <span className="material-symbols-outlined w-16 h-16 text-slate-300 mx-auto mb-4 block">group</span>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Follow-ups Found</h3>
          <p className="text-slate-500 mb-4">Adjust your filters or enroll a lead in a sequence to see activity here.</p>
                    </div>
                </div>
    )
    }

  const currentSuggestions = selectedFollowUp ? suggestionMap[selectedFollowUp.id] ?? [] : []

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-6">
                <button
                    type="button"
          onClick={() => setShowTips((prev) => !prev)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
                    aria-expanded={showTips}
                >
                    <span className="material-symbols-outlined text-xl">{showTips ? 'psychiatry' : 'help'}</span>
                    {showTips ? 'Hide Follow-up Tips' : 'Show Follow-up Tips'}
                    <span className="material-symbols-outlined text-base ml-auto">{showTips ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showTips && (
                    <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
                        <div>
                            <h4 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-lg">timeline</span>
                                Staying On Track
                            </h4>
                            <ul className="space-y-1.5 list-disc list-inside">
                <li>Work the nearest deadlines first and clear today’s tasks before moving on.</li>
                <li>Log the personal touches so the timeline stays accurate for your team.</li>
                <li>Pause with a plan—note why it’s paused and when to resume.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-lg">outgoing_mail</span>
                                When To Use Quick Email
                            </h4>
                            <ul className="space-y-1.5 list-disc list-inside">
                <li>Send hot intel (price drops, new comps) instantly.</li>
                <li>Drop personal check-ins between automated steps.</li>
                <li>Keep the automation clean; let Quick Email cover human moments.</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

      <FiltersBar filters={filters} onChange={handleFilterChange} sequences={sequences} />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Follow-up Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                        <div className="text-sm text-slate-500">Total</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                        <div className="text-sm text-slate-500">Active</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
                        <div className="text-sm text-slate-500">Paused</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                        <div className="text-sm text-slate-500">Completed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                        <div className="text-sm text-slate-500">Cancelled</div>
                    </div>
                </div>
            </div>

            <div className="flex h-96 bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden">
        <aside
          className={`${isDetailView ? 'hidden' : 'flex'} w-full md:flex flex-col md:w-2/5 lg:w-1/3 max-w-sm h-full border-r border-slate-200`}
        >
                    <div className="p-4 border-b border-slate-200 flex-shrink-0">
                        <h3 className="text-lg font-bold text-slate-800">Active Follow-ups</h3>
            <p className="text-sm text-slate-500">({filteredFollowUps.length} leads in sequences)</p>
                    </div>
                <div className="flex-grow overflow-y-auto">
                    <div className="divide-y divide-slate-200">
              {filteredFollowUps.map((followUp) => (
                            <LeadListItem
                                key={followUp.id}
                                followUp={followUp}
                  lead={leads.find((lead) => lead.id === followUp.leadId)}
                  sequence={sequences.find((sequence) => sequence.id === followUp.sequenceId)}
                  isSelected={selectedId === followUp.id}
                  onSelect={() => selectFollowUp(followUp.id)}
                  isUpdating={isUpdatingId === followUp.id}
                            />
                        ))}
                    </div>
                </div>
            </aside>

        <main className={`${isDetailView ? 'flex' : 'hidden'} w-full md:flex flex-col flex-grow h-full`}>
                {selectedFollowUp && selectedLead && selectedSequence ? (
                    <div className="flex flex-col h-full">
                        <header className="p-4 border-b border-slate-200 flex-shrink-0">
                             <div className="flex items-center justify-between">
                                <div>
                    <button
                      onClick={() => selectFollowUp(null)}
                      className="md:hidden flex items-center gap-1 text-sm font-semibold text-primary-600 mb-2"
                    >
                                        <span className="material-symbols-outlined w-4 h-4">chevron_left</span>
                                        Back to List
                                    </button>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedLead.name}</h2>
                    <p className="text-sm text-slate-500">
                      In sequence: <span className="font-semibold">{selectedSequence.name}</span>
                    </p>
                                </div>
                                    <FollowUpStatusBadge status={selectedFollowUp.status} />
                                </div>
              </header>
              <div className="flex-shrink-0 border-b border-slate-200 px-4 py-3 bg-slate-50">
                <button
                  type="button"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                  onClick={handleToggleAi}
                >
                  {showAiPrompt ? 'Hide AI insights' : 'AI Improve this follow-up'}
                </button>
                {showAiPrompt && (
                  <div className="mt-3">
                    {isAnalyzingId === selectedFollowUp.id ? (
                      <div className="flex items-center gap-2 text-xs text-primary-700">
                        <span className="material-symbols-outlined w-4 h-4 animate-spin">progress_activity</span>
                        Analyzing sequence activity…
                      </div>
                    ) : currentSuggestions.length > 0 ? (
                      <AISuggestionList suggestions={currentSuggestions} />
                    ) : analyzeError ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-center justify-between">
                        <span>{analyzeError}</span>
                        <button
                          type="button"
                          className="text-amber-700 font-semibold hover:text-amber-800"
                          onClick={() => analyzeFollowUp(selectedFollowUp.id)}
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                        No suggestions yet. Try sending a manual touch or re-running the analyzer.
                      </div>
                    )}
                  </div>
                )}
                            </div>
                        <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Timeline</h3>
                <ul role="list" className="space-y-3">
                  {selectedFollowUp.history.map((event) => (
                    <TimelineItem key={event.id} event={event} />
                  ))}
                            </ul>
                        </div>
                        <footer className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
                <div className="flex flex-col gap-4">
                  {showManualForm ? (
                    <form onSubmit={handleManualTouchSubmit} className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-600" htmlFor="manual-note">
                        Log a manual touch
                      </label>
                      <textarea
                        id="manual-note"
                        value={manualNote}
                        onChange={(event) => setManualNote(event.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        rows={3}
                        placeholder="e.g., Sent a personal text about next steps"
                      />
                            <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowManualForm(false)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                        >
                          Log touch
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowManualForm(true)}
                      className="self-start px-3 py-1.5 text-xs font-semibold text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
                    >
                      + Log manual touch
                    </button>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2">
                               {selectedFollowUp.status === 'active' && (
                                    <button 
                        onClick={() => handleStatusChange('paused')}
                        disabled={isUpdatingId === selectedFollowUp.id}
                                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                        {isUpdatingId === selectedFollowUp.id ? 'Updating...' : 'Pause Sequence'}
                                    </button>
                                )}
                                {selectedFollowUp.status === 'paused' && (
                                     <button 
                        onClick={() => handleStatusChange('active')}
                        disabled={isUpdatingId === selectedFollowUp.id}
                                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                        {isUpdatingId === selectedFollowUp.id ? 'Updating...' : 'Resume Sequence'}
                                    </button>
                                )}
                                <button 
                      onClick={() => handleStatusChange('cancelled')}
                      disabled={isUpdatingId === selectedFollowUp.id}
                                    className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                      {isUpdatingId === selectedFollowUp.id ? 'Updating...' : 'Cancel Sequence'}
                                </button>
                                <button className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                                    Contact Manually
                                </button>
                  </div>
                            </div>
                        </footer>
                    </div>
                ) : (
                    <div className="hidden md:flex items-center justify-center h-full flex-col text-slate-500 bg-slate-50">
                        <span className="material-symbols-outlined w-16 h-16 mb-4">group</span>
                        <h2 className="text-2xl font-bold">Lead Follow-ups</h2>
                        <p className="mt-2">Select a lead to see their sequence timeline.</p>
                    </div>
                )}
            </main>
            </div>
        </div>
  )
}

export default LeadFollowUpsPage
