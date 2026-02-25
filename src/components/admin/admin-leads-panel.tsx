import React from 'react'

import CalendarView from '../CalendarView'
import { Lead, LeadStatus } from '../../types'

type ContactTab = 'email' | 'call' | 'note'
type LeadsTab = 'leads' | 'appointments' | 'scoring'

interface ScheduleForm {
  date: string
  time: string
  type: string
  notes: string
}

interface AdminLeadsPanelProps {
  leads: Lead[]
  isLoading: boolean
  errorMessage?: string | null
  googleConnected: boolean
  onConnectGoogle: () => Promise<void> | void
  onOpenAddLeadModal: () => void
  onOpenEditLeadModal: (lead: Lead) => void
  onDeleteLead: (leadId: string) => void
  openScheduler: (opts?: { name?: string; email?: string; phone?: string; kind?: string }) => void
  onScheduleLead: (lead: Lead) => void
  onRequestExport: () => void
  activeLeadsTab: LeadsTab
  onLeadsTabChange: (tab: LeadsTab) => void
  showContactModal: boolean
  onShowContactModalChange: (value: boolean) => void
  showScheduleModal: boolean
  onShowScheduleModalChange: (value: boolean) => void
  selectedLead: Lead | null
  onSelectedLeadChange: (lead: Lead | null) => void
  activeContactTab: ContactTab
  onContactTabChange: (tab: ContactTab) => void
  noteContent: string
  onNoteContentChange: (value: string) => void
  scheduleForm: ScheduleForm
  onScheduleFormChange: (form: ScheduleForm) => void
  onSendContact: (message: string) => Promise<void> | void
  onLogCall: () => Promise<void> | void
  onAddNote: () => Promise<void> | void
  onSchedule: () => Promise<void> | void
}

const statusStyles: Record<LeadStatus, string> = {
  New: 'bg-blue-100 text-blue-700',
  Qualified: 'bg-green-100 text-green-700',
  Contacted: 'bg-yellow-100 text-yellow-700',
  Showing: 'bg-purple-100 text-purple-700',
  Lost: 'bg-red-100 text-red-700',
  Bounced: 'bg-red-50 text-red-600',
  Unsubscribed: 'bg-slate-100 text-slate-600',
  Won: 'bg-emerald-100 text-emerald-700',
  'Marketing Only': 'bg-indigo-100 text-indigo-700'
}

const getLeadStatusStyle = (status: LeadStatus) => statusStyles[status]

const AdminLeadsPanel: React.FC<AdminLeadsPanelProps> = ({
  leads,
  isLoading,
  errorMessage,
  googleConnected,
  onConnectGoogle,
  onOpenAddLeadModal,
  onOpenEditLeadModal,
  onDeleteLead,
  openScheduler,
  onScheduleLead,
  onRequestExport,
  activeLeadsTab,
  onLeadsTabChange,
  showContactModal,
  onShowContactModalChange,
  showScheduleModal,
  onShowScheduleModalChange,
  selectedLead,
  onSelectedLeadChange,
  activeContactTab,
  onContactTabChange,
  noteContent,
  onNoteContentChange,
  scheduleForm,
  onScheduleFormChange,
  onSendContact,
  onLogCall,
  onAddNote,
  onSchedule
}) => {
  const totalLeads = leads.length
  const appointmentsCount = leads.filter(l => l.status === 'Showing' || l.status === 'Contacted').length
  const convertedCount = leads.filter(l => l.status === 'Showing').length
  const pendingCount = leads.filter(l => l.status === 'New' || l.status === 'Qualified').length

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Platform Leads & Appointments</h1>
          <p className="text-slate-500 mt-1">Manage all platform prospects and appointments.</p>
          {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddLeadModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition"
          >
            <span className="material-symbols-outlined w-5 h-5">add</span>
            <span>Add New Lead</span>
          </button>
          {!googleConnected ? (
            <button
              onClick={onConnectGoogle}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition"
            >
              <span className="material-symbols-outlined w-5 h-5">link</span>
              <span>Connect Google Calendar</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-700 border border-green-200">
              <span className="material-symbols-outlined w-5 h-5">check_circle</span>
              Connected
            </span>
          )}
          <button
            onClick={() => openScheduler({ kind: 'Consultation' })}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold shadow-sm hover:bg-green-600 transition"
          >
            <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
            <span>Schedule Appointment</span>
          </button>
          <button
            onClick={onRequestExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition"
          >
            <span className="material-symbols-outlined w-5 h-5">download</span>
            <span>Export Data</span>
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon="group" value={totalLeads} label="Total Leads" colorClass="bg-blue-100" iconColor="text-blue-600" />
        <StatCard icon="calendar_today" value={appointmentsCount} label="Appointments" colorClass="bg-green-100" iconColor="text-green-600" />
        <StatCard icon="check" value={convertedCount} label="Converted" colorClass="bg-purple-100" iconColor="text-purple-600" />
        <StatCard icon="schedule" value={pendingCount} label="Pending" colorClass="bg-orange-100" iconColor="text-orange-600" />
      </section>

      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarView appointments={[]} />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-5">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Upcoming Appointments</h3>
            <div className="space-y-3">
              <div className="text-center text-slate-500 py-8">
                <span className="material-symbols-outlined text-4xl mb-2 block">event_available</span>
                <p>No appointments scheduled</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main>
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex space-x-2">
            <TabButton
              icon="group"
              label="Leads"
              count={leads.length}
              isActive={activeLeadsTab === 'leads'}
              onClick={() => onLeadsTabChange('leads')}
            />
            <TabButton
              icon="calendar_today"
              label="Appointments"
              count={appointmentsCount}
              isActive={activeLeadsTab === 'appointments'}
              onClick={() => onLeadsTabChange('appointments')}
            />
            <TabButton
              icon="analytics"
              label="Lead Scoring"
              count={0}
              isActive={activeLeadsTab === 'scoring'}
              onClick={() => onLeadsTabChange('scoring')}
            />
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
              <input
                type="text"
                placeholder={activeLeadsTab === 'leads' ? 'Search leads...' : activeLeadsTab === 'appointments' ? 'Search appointments...' : 'Search scoring...'}
                className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-100 transition">
              <span className="material-symbols-outlined w-4 h-4">filter_list</span>
              <span>{activeLeadsTab === 'leads' ? 'All Status' : activeLeadsTab === 'appointments' ? 'All Types' : 'All Scores'}</span>
              <span className="material-symbols-outlined w-4 h-4">expand_more</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-500">Loading leads…</div>
        ) : (
          <div className="space-y-6">
            {activeLeadsTab === 'leads' && (
              <LeadsList
                leads={leads}
                onAddLead={onOpenAddLeadModal}
                onEditLead={onOpenEditLeadModal}
                onDeleteLead={onDeleteLead}
                onContactLead={(lead) => {
                  onSelectedLeadChange(lead)
                  onShowContactModalChange(true)
                }}
                onScheduleLead={onScheduleLead}
              />
            )}

            {activeLeadsTab === 'appointments' && (
              <AppointmentsList
                leads={leads}
                onContactLead={(lead) => {
                  onSelectedLeadChange(lead)
                  onShowContactModalChange(true)
                }}
                onScheduleLead={onScheduleLead}
              />
            )}

            {activeLeadsTab === 'scoring' && <LeadScoringPanel leads={leads} />}
          </div>
        )}
      </main>

      {showContactModal && selectedLead && (
        <ContactLeadModal
          lead={selectedLead}
          activeTab={activeContactTab}
          onChangeTab={onContactTabChange}
          noteContent={noteContent}
          onChangeNote={onNoteContentChange}
          onClose={() => {
            onShowContactModalChange(false)
            onSelectedLeadChange(null)
            onNoteContentChange('')
          }}
          onSendMessage={onSendContact}
          onLogCall={onLogCall}
          onAddNote={onAddNote}
        />
      )}

      {showScheduleModal && selectedLead && (
        <ScheduleLeadModal
          lead={selectedLead}
          form={scheduleForm}
          onChangeForm={onScheduleFormChange}
          onClose={() => {
            onShowScheduleModalChange(false)
            onSelectedLeadChange(null)
          }}
          onSchedule={onSchedule}
        />
      )}
    </div>
  )
}

const StatCard: React.FC<{ icon: string; value: number; label: string; colorClass: string; iconColor: string }> = ({ icon, value, label, colorClass, iconColor }) => (
  <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
    <div className={`rounded-full p-3 ${colorClass}`}>
      <span className={`material-symbols-outlined w-6 h-6 ${iconColor}`}>{icon}</span>
    </div>
    <div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  </div>
)

const TabButton: React.FC<{ icon: string; label: string; count: number; isActive: boolean; onClick: () => void }> = ({ icon, label, count, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${isActive ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
  >
    <span className="material-symbols-outlined w-5 h-5">{icon}</span>
    <span>{label}</span>
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-600'
      }`}
    >
      {count}
    </span>
  </button>
)

interface LeadsListProps {
  leads: Lead[]
  onAddLead: () => void
  onEditLead: (lead: Lead) => void
  onDeleteLead: (leadId: string) => void
  onContactLead: (lead: Lead) => void
  onScheduleLead: (lead: Lead) => void
}

const LeadsList: React.FC<LeadsListProps> = ({ leads, onAddLead, onEditLead, onDeleteLead, onContactLead, onScheduleLead }) => (
  <>
    {leads.length === 0 ? (
      <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-slate-400 text-2xl">group</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Leads Yet</h3>
        <p className="text-slate-500 mb-6">Start by adding your first lead to track prospects and appointments.</p>
        <button
          onClick={onAddLead}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition mx-auto"
        >
          <span className="material-symbols-outlined w-5 h-5">add</span>
          <span>Add New Lead</span>
        </button>
      </div>
    ) : (
      leads.map(lead => (
        <div key={lead.id} className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 transition-all duration-300 hover:shadow-lg hover:border-slate-300">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
              {lead.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-slate-800 truncate">{lead.name}</h3>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getLeadStatusStyle(lead.status)}`}>{lead.status}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <span className="material-symbols-outlined w-5 h-5 text-slate-400">calendar_today</span>
                <span>{lead.date}</span>
              </div>
            </div>
          </div>

          {lead.lastMessage && (
            <div className="mt-4 pt-4 border-t border-slate-200/80">
              <div className="p-4 bg-slate-50/70 rounded-lg border-l-4 border-primary-300">
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="material-symbols-outlined w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5">format_quote</span>
                  <p className="italic">{lead.lastMessage}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              onClick={() => onEditLead(lead)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg shadow-sm hover:bg-slate-200 transition"
            >
              <span className="material-symbols-outlined w-5 h-5">edit</span>
              <span>Edit</span>
            </button>
            <button
              onClick={() => onDeleteLead(lead.id)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600 transition"
              title="Delete lead"
            >
              <span className="material-symbols-outlined w-5 h-5">delete</span>
              <span>Delete</span>
            </button>
            <button
              onClick={() => onContactLead(lead)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition"
            >
              <span className="material-symbols-outlined w-5 h-5">contact_mail</span>
              <span>Contact</span>
            </button>
            <button
              onClick={() => onScheduleLead(lead)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 transition"
            >
              <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
              <span>Schedule</span>
            </button>
          </div>
        </div>
      ))
    )}
  </>
)

const AppointmentsList: React.FC<{
  leads: Lead[]
  onContactLead: (lead: Lead) => void
  onScheduleLead: (lead: Lead) => void
}> = ({ leads, onContactLead, onScheduleLead }) => {
  const relevantLeads = leads.filter(l => l.status === 'Showing' || l.status === 'Contacted')

  if (relevantLeads.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-slate-400 text-2xl">calendar_today</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Appointments Yet</h3>
        <p className="text-slate-500 mb-6">Schedule appointments with your leads to track showings and meetings.</p>
      </div>
    )
  }

  return (
    <>
      {relevantLeads.map(lead => (
        <div key={lead.id} className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 transition-all duration-300 hover:shadow-lg hover:border-slate-300">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xl">
              {lead.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-slate-800 truncate">{lead.name}</h3>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${lead.status === 'Showing' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {lead.status === 'Showing' ? 'Scheduled' : 'Contacted'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <span className="material-symbols-outlined w-5 h-5 text-slate-400">calendar_today</span>
                <span>{lead.date}</span>
              </div>
            </div>
          </div>

          {lead.lastMessage && (
            <div className="mt-4 pt-4 border-t border-slate-200/80">
              <div className="p-4 bg-slate-50/70 rounded-lg border-l-4 border-green-300">
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="material-symbols-outlined w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5">format_quote</span>
                  <p className="italic">{lead.lastMessage}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              onClick={() => onContactLead(lead)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition"
            >
              <span className="material-symbols-outlined w-5 h-5">contact_mail</span>
              <span>Contact</span>
            </button>
            <button
              onClick={() => onScheduleLead(lead)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 transition"
            >
              <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
              <span>Reschedule</span>
            </button>
          </div>
        </div>
      ))}
    </>
  )
}

const LeadScoringPanel: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Lead Scoring Analysis</h3>
        </div>
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-slate-400 text-2xl">analytics</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Leads to Score</h3>
          <p className="text-slate-500">Add leads to see scoring analysis and insights.</p>
        </div>
      </div>
    )
  }

  const averageScore = Math.round(
    leads.reduce((sum, lead) => sum + (typeof lead.score === 'number' ? lead.score : 50), 0) / leads.length || 0
  )
  const highPriority = leads.filter(lead => (typeof lead.score === 'number' ? lead.score : 50) >= 80).length
  const conversionRate = leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Showing').length / leads.length) * 100) : 0

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ScoreCard title="Average Score" value={`${averageScore}`} subtitle="out of 100" icon="analytics" iconColor="text-blue-600" />
        <ScoreCard title="High Priority" value={`${highPriority}`} subtitle="leads need attention" icon="priority_high" iconColor="text-red-600" />
        <ScoreCard title="Conversion Rate" value={`${conversionRate}%`} subtitle="leads to appointments" icon="trending_up" iconColor="text-green-600" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Lead Scoring Analysis</h3>
        </div>
        <div className="p-6 space-y-4">
          {leads.map(lead => {
            const score = typeof lead.score === 'number' ? lead.score : 50
            const scoreColor = score >= 80 ? 'text-red-600 bg-red-100' : score >= 60 ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100'
            const scoreLabel = score >= 80 ? 'High Priority' : score >= 60 ? 'Medium Priority' : 'Low Priority'

            return (
              <div key={lead.id} className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{lead.name}</h4>
                      <p className="text-sm text-slate-500">{lead.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${scoreColor}`}>{scoreLabel}</span>
                        <span className="text-xs text-slate-400">Score: {score}/100</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">{score}</div>
                      <div className="text-xs text-slate-500">points</div>
                    </div>
                    <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <Detail label="Status" value={lead.status} />
                    <Detail label="Source" value={lead.source ?? 'Unknown'} />
                    <Detail label="Created" value={new Date(lead.date).toLocaleDateString()} />
                    <Detail label="Last Contact" value={lead.lastMessage ? 'Yes' : 'No'} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

const ScoreCard: React.FC<{ title: string; value: string; subtitle: string; icon: string; iconColor: string }> = ({ title, value, subtitle, icon, iconColor }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
    </div>
    <div className="text-3xl font-bold text-slate-900 mb-2">{value}</div>
    <p className="text-sm text-slate-500">{subtitle}</p>
  </div>
)

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-slate-500">{label}:</span>
    <span className="ml-1 font-medium text-slate-700">{value}</span>
  </div>
)

interface ContactLeadModalProps {
  lead: Lead
  activeTab: ContactTab
  onChangeTab: (tab: ContactTab) => void
  noteContent: string
  onChangeNote: (value: string) => void
  onClose: () => void
  onSendMessage: (message: string) => Promise<void> | void
  onLogCall: () => Promise<void> | void
  onAddNote: () => Promise<void> | void
}

const ContactLeadModal: React.FC<ContactLeadModalProps> = ({
  lead,
  activeTab,
  onChangeTab,
  noteContent,
  onChangeNote,
  onClose,
  onSendMessage,
  onLogCall,
  onAddNote
}) => {
  const [message, setMessage] = React.useState('')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-primary-600 to-primary-500 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Contact {lead.name}</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-primary-700 transition">
              <span className="material-symbols-outlined text-white">close</span>
            </button>
          </div>
          <p className="text-sm text-primary-50/80 mt-1">Choose how you’d like to follow up with this lead</p>
        </div>

        <div className="px-6">
          <div className="flex gap-2 mt-6">
            <ContactTabButton label="Email" icon="mail" isActive={activeTab === 'email'} onClick={() => onChangeTab('email')} />
            <ContactTabButton label="Call" icon="call" isActive={activeTab === 'call'} onClick={() => onChangeTab('call')} />
            <ContactTabButton label="Note" icon="sticky_note_2" isActive={activeTab === 'note'} onClick={() => onChangeTab('note')} />
          </div>
        </div>

        <div className="px-6 py-6">
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">To</label>
                  <input value={lead.email} readOnly className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-slate-50 text-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Phone</label>
                  <input value={lead.phone} readOnly className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-slate-50 text-slate-700" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  placeholder={`Hi ${lead.name.split(' ')[0]}, I wanted to follow up about your interest...`}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">Last contact: {lead.lastMessage ? new Date().toLocaleDateString() : 'Never'}</div>
                <button
                  onClick={() => onSendMessage(message)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white font-semibold shadow-sm hover:bg-primary-700 transition"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                  Send Message
                </button>
              </div>
            </div>
          )}

          {activeTab === 'call' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Call Script</p>
                <p className="mt-2">Hi {lead.name.split(' ')[0]}, this is {lead.email.split('@')[0]} from Home Listing AI. I wanted to follow up about...</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Call Notes</label>
                <textarea
                  value={noteContent}
                  onChange={event => onChangeNote(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  placeholder={`Log details about your call with ${lead.name}...`}
                />
              </div>
              <button
                onClick={onLogCall}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white font-semibold shadow-sm hover:bg-green-700 transition"
              >
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Log Call
              </button>
            </div>
          )}

          {activeTab === 'note' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Note Guidelines</p>
                <p className="mt-2">Use notes to capture important context, objections, or next steps. Notes are private to your team.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Private Note</label>
                <textarea
                  value={noteContent}
                  onChange={event => onChangeNote(event.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  placeholder={`Add a private note for ${lead.name}...`}
                />
              </div>
              <button
                onClick={onAddNote}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white font-semibold shadow-sm hover:bg-primary-700 transition"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                Save Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ContactTabButton: React.FC<{ label: string; icon: string; isActive: boolean; onClick: () => void }> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${isActive ? 'bg-primary-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
  >
    <span className="material-symbols-outlined text-base">{icon}</span>
    {label}
  </button>
)

const ScheduleLeadModal: React.FC<{
  lead: Lead
  form: ScheduleForm
  onChangeForm: (form: ScheduleForm) => void
  onClose: () => void
  onSchedule: () => Promise<void> | void
}> = ({ lead, form, onChangeForm, onClose, onSchedule }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Schedule Appointment with {lead.name}</h3>
          <p className="text-sm text-slate-500">Set up a showing or follow-up appointment</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition">
          <span className="material-symbols-outlined text-slate-500">close</span>
        </button>
      </div>
      <div className="px-6 py-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={event => onChangeForm({ ...form, date: event.target.value })}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Time</label>
            <input
              type="time"
              value={form.time}
              onChange={event => onChangeForm({ ...form, time: event.target.value })}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Appointment Type</label>
          <select
            value={form.type}
            onChange={event => onChangeForm({ ...form, type: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
          >
            <option value="Showing">Property Showing</option>
            <option value="Consultation">Consultation</option>
            <option value="FollowUp">Follow Up</option>
            <option value="VirtualTour">Virtual Tour</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={event => onChangeForm({ ...form, notes: event.target.value })}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            placeholder="Add any additional details or preparation notes"
          />
        </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 transition">
          Cancel
        </button>
        <button onClick={onSchedule} className="px-5 py-2.5 rounded-lg bg-primary-600 text-white font-semibold shadow-sm hover:bg-primary-700 transition">
          Schedule Appointment
        </button>
      </div>
    </div>
  </div>
)

export default AdminLeadsPanel
