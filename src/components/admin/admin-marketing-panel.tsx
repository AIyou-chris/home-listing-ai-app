import React from 'react'

import {
  MarketingActiveFollowUp,
  MarketingFollowUpSequence,
  MarketingQRCode,
  MarketingTab,
} from '../../hooks/use-admin-marketing'
import { SequenceStep } from '../../types'

interface AdminMarketingPanelProps {
  activeTab: MarketingTab
  onTabChange: (tab: MarketingTab) => void
  followUpSequences: MarketingFollowUpSequence[]
  activeFollowUps: MarketingActiveFollowUp[]
  qrCodes: MarketingQRCode[]
  isLoading: boolean
  hasLoaded: boolean
  errorMessage: string | null
  onRefresh: () => void
  onDeleteSequence: (sequenceId: string) => Promise<void>
  onDeleteQrCode: (qrCodeId: string) => Promise<void>
}

const AdminMarketingPanel: React.FC<AdminMarketingPanelProps> = ({
  activeTab,
  onTabChange,
  followUpSequences,
  activeFollowUps,
  qrCodes,
  isLoading,
  hasLoaded,
  errorMessage,
  onRefresh,
  onDeleteSequence,
  onDeleteQrCode,
}) => {
  const handleEditSequence = (sequence: MarketingFollowUpSequence) => {
    console.log('Edit sequence:', sequence)
  }

  const handleViewAnalytics = (sequence: MarketingFollowUpSequence) => {
    console.log('View analytics for sequence:', sequence)
  }

  const handleDeleteSequence = async (sequenceId: string) => {
    if (!confirm('Are you sure you want to delete this sequence?')) {
      return
    }

    try {
      await onDeleteSequence(sequenceId)
      alert('Sequence deleted successfully!')
    } catch (error) {
      console.error('Failed to delete sequence', error)
      alert('Failed to delete sequence. Please try again.')
    }
  }

  const handleEditQRCode = (qrCode: MarketingQRCode) => {
    console.log('Edit QR code:', qrCode)
  }

  const handleDeleteQRCode = async (qrCodeId: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) {
      return
    }

    try {
      await onDeleteQrCode(qrCodeId)
      alert('QR code deleted successfully!')
    } catch (error) {
      console.error('Failed to delete QR code', error)
      alert('Failed to delete QR code. Please try again.')
    }
  }

  const isLoadingState = !hasLoaded && isLoading

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Marketing Center</h1>
          <p className="text-slate-500 mt-1">
            Automate platform outreach, create content, and track performance across all agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
          >
            <span className="material-symbols-outlined w-5 h-5">refresh</span>
            Refresh Data
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
            <span className="material-symbols-outlined w-5 h-5">download</span>
            Export Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
            <span className="material-symbols-outlined w-5 h-5">add</span>
            Create Campaign
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Marketing Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Leads</p>
              <p className="text-2xl font-bold text-slate-900">1,247</p>
              <p className="text-xs text-green-600">+12% from last month</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">person_add</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Conversions</p>
              <p className="text-2xl font-bold text-slate-900">89</p>
              <p className="text-xs text-green-600">+8% from last month</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">trending_up</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">QR Scans</p>
              <p className="text-2xl font-bold text-slate-900">2,341</p>
              <p className="text-xs text-green-600">+23% from last month</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600">qr_code_scanner</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Revenue</p>
              <p className="text-2xl font-bold text-slate-900">$847K</p>
              <p className="text-xs text-green-600">+15% from last month</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-600">payments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <TabButton
              isActive={activeTab === 'follow-up-sequences'}
              icon="lan"
              label="Follow-up Sequences"
              count={followUpSequences.length}
              onClick={() => onTabChange('follow-up-sequences')}
            />
            <TabButton
              isActive={activeTab === 'active-follow-ups'}
              icon="group"
              label="Active Follow-ups"
              count={activeFollowUps.length}
              onClick={() => onTabChange('active-follow-ups')}
            />
            <TabButton
              isActive={activeTab === 'qr-code-system'}
              icon="qr_code_2"
              label="QR Code System"
              count={qrCodes.length}
              onClick={() => onTabChange('qr-code-system')}
            />
            <TabButton
              isActive={activeTab === 'analytics'}
              icon="monitoring"
              label="Analytics"
              onClick={() => onTabChange('analytics')}
            />
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {isLoadingState ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">loading</span>
              <h3 className="text-2xl font-bold text-slate-600 mb-4">Loading Marketing Data...</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Please wait while we fetch your marketing data from the server.
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'follow-up-sequences' && (
                <FollowUpSequencesTab
                  followUpSequences={followUpSequences}
                  onEditSequence={handleEditSequence}
                  onViewAnalytics={handleViewAnalytics}
                  onDeleteSequence={handleDeleteSequence}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'active-follow-ups' && (
                <ActiveFollowUpsTab activeFollowUps={activeFollowUps} />
              )}

              {activeTab === 'qr-code-system' && (
                <QrCodeSystemTab
                  qrCodes={qrCodes}
                  onDeleteQRCode={handleDeleteQRCode}
                  onEditQRCode={handleEditQRCode}
                />
              )}

              {activeTab === 'analytics' && <MarketingAnalyticsTab />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface TabButtonProps {
  isActive: boolean
  icon: string
  label: string
  count?: number
  onClick: () => void
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, icon, label, count, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-1 py-4 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap ${
      isActive
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
    }`}
  >
    <span className="material-symbols-outlined w-5 h-5">{icon}</span>
    <span>{label}</span>
    {typeof count === 'number' && (
      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
        {count}
      </span>
    )}
  </button>
)

interface FollowUpSequencesTabProps {
  followUpSequences: MarketingFollowUpSequence[]
  onEditSequence: (sequence: MarketingFollowUpSequence) => void
  onViewAnalytics: (sequence: MarketingFollowUpSequence) => void
  onDeleteSequence: (sequenceId: string) => void
  isLoading: boolean
}

const FollowUpSequencesTab: React.FC<FollowUpSequencesTabProps> = ({
  followUpSequences,
  onEditSequence,
  onViewAnalytics,
  onDeleteSequence,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">loading</span>
        <h3 className="text-2xl font-bold text-slate-600 mb-4">Refreshing sequences...</h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Please wait while we update your follow-up sequences.
        </p>
      </div>
    )
  }

  if (followUpSequences.length === 0) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">lan</span>
        <h3 className="text-2xl font-bold text-slate-600 mb-4">No Follow-up Sequences Yet</h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Create your first follow-up sequence to automate lead nurturing and increase conversions.
        </p>
        <button className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
          Create First Sequence
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Follow-up Sequences</h3>
          <p className="text-slate-500 mt-1">Automated follow-up sequences for all agents</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
          <span className="material-symbols-outlined w-5 h-5">add</span>
          Create Sequence
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="text-sm text-yellow-800">
          Custom content placeholder — add your component or markup here.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {followUpSequences.map(sequence => (
          <div
            key={sequence.id}
            className="bg-white rounded-xl shadow-sm border-2 transition-all duration-300 hover:shadow-lg border-slate-200 hover:border-slate-300"
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                      sequence.triggerType === 'Lead Capture'
                        ? 'bg-blue-100 text-blue-600'
                        : sequence.triggerType === 'Appointment Scheduled'
                          ? 'bg-green-100 text-green-600'
                          : sequence.triggerType === 'Property Viewed'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {sequence.triggerType === 'Lead Capture'
                      ? '👥'
                      : sequence.triggerType === 'Appointment Scheduled'
                        ? '📅'
                        : sequence.triggerType === 'Property Viewed'
                          ? '🏠'
                          : '⚡'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{sequence.name}</h3>
                    <p className="text-sm text-slate-600">{sequence.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      sequence.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {sequence.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <KeyValue label="Trigger" value={sequence.triggerType} />
                <KeyValue label="Steps" value={sequence.steps.length} />
                <KeyValue
                  label="Total Duration"
                  value={`${sequence.steps
                    .reduce((total: number, step: SequenceStep) => {
                      const delay = step.delay
                      const days =
                        delay.unit === 'days'
                          ? delay.value
                          : delay.unit === 'hours'
                            ? delay.value / 24
                            : delay.value / 1440
                      return total + days
                    }, 0)
                    .toFixed(1)} days`}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Metric label="Total Leads" value={sequence.analytics?.totalLeads || 0} />
                <Metric label="Open Rate" value={`${sequence.analytics?.openRate || 0}%`} valueClass="text-green-600" />
                <Metric label="Response Rate" value={`${sequence.analytics?.responseRate || 0}%`} valueClass="text-blue-600" />
              </div>

              <div className="flex gap-2">
                <ActionButton icon="edit" label="Edit" onClick={() => onEditSequence(sequence)} />
                <IconButton icon="monitoring" onClick={() => onViewAnalytics(sequence)} />
                <IconButton icon="delete" tone="danger" onClick={() => onDeleteSequence(sequence.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ActiveFollowUpsTabProps {
  activeFollowUps: MarketingActiveFollowUp[]
}

const ActiveFollowUpsTab: React.FC<ActiveFollowUpsTabProps> = ({ activeFollowUps }) => {
  if (activeFollowUps.length === 0) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">group</span>
        <h3 className="text-2xl font-bold text-slate-600 mb-4">No Active Follow-ups</h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          When you create follow-up sequences, active leads will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeFollowUps.map(followUp => (
        <div key={followUp.id} className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{followUp.leadName}</h3>
              <p className="text-sm text-slate-500">{followUp.sequenceName}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <KeyValue label="Stage" value={followUp.currentStage || 'N/A'} />
              <KeyValue label="Last Action" value={followUp.lastAction || 'Unknown'} />
              <KeyValue label="Next Action" value={followUp.nextAction || 'Pending'} />
              <KeyValue label="Engagement" value={`${followUp.engagementScore ?? 0}%`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface QrCodeSystemTabProps {
  qrCodes: MarketingQRCode[]
  onEditQRCode: (qrCode: MarketingQRCode) => void
  onDeleteQRCode: (qrCodeId: string) => void
}

const QrCodeSystemTab: React.FC<QrCodeSystemTabProps> = ({ qrCodes, onEditQRCode, onDeleteQRCode }) => {
  if (qrCodes.length === 0) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">qr_code_2</span>
        <h3 className="text-2xl font-bold text-slate-600 mb-4">No QR Codes Yet</h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Generate QR codes to track marketing campaign performance across channels.
        </p>
        <button className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
          Create QR Code
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {qrCodes.map(qrCode => (
        <div key={qrCode.id} className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{qrCode.name}</h3>
              <p className="text-sm text-slate-500">{qrCode.destinationUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{qrCode.scanCount}</div>
                <div className="text-xs text-slate-500">Scans</div>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-600">qr_code_scanner</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <ActionButton icon="edit" label="Edit" onClick={() => onEditQRCode(qrCode)} />
            <IconButton icon="delete" tone="danger" onClick={() => onDeleteQRCode(qrCode.id)} />
          </div>
        </div>
      ))}
    </div>
  )
}

const MarketingAnalyticsTab: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-4">Channel Performance</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Email Campaigns</h4>
          <p className="text-3xl font-bold text-slate-900">34%</p>
          <p className="text-xs text-slate-500">Conversion Rate</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Social Media</h4>
          <p className="text-3xl font-bold text-slate-900">28%</p>
          <p className="text-xs text-slate-500">Conversion Rate</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">QR Campaigns</h4>
          <p className="text-3xl font-bold text-slate-900">19%</p>
          <p className="text-xs text-slate-500">Conversion Rate</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Paid Ads</h4>
          <p className="text-3xl font-bold text-slate-900">24%</p>
          <p className="text-xs text-slate-500">Conversion Rate</p>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-4">Audience Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Top Audience</h4>
          <p className="text-lg font-semibold text-slate-900">First-time Homebuyers</p>
          <p className="text-xs text-slate-500">43% engagement</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Top Market</h4>
          <p className="text-lg font-semibold text-slate-900">Austin, TX</p>
          <p className="text-xs text-slate-500">32% growth</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Top Campaign</h4>
          <p className="text-lg font-semibold text-slate-900">AI Listing Tours</p>
          <p className="text-xs text-slate-500">+64% conversions</p>
        </div>
      </div>
    </div>
  </div>
)

interface KeyValueProps {
  label: string
  value: React.ReactNode
}

const KeyValue: React.FC<KeyValueProps> = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{label}:</span>
    <span className="font-medium text-slate-700">{value}</span>
  </div>
)

interface MetricProps {
  label: string
  value: React.ReactNode
  valueClass?: string
}

const Metric: React.FC<MetricProps> = ({ label, value, valueClass }) => (
  <div className="text-center">
    <div className={`text-lg font-bold ${valueClass ?? 'text-slate-900'}`}>{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>
)

interface ActionButtonProps {
  icon: string
  label: string
  onClick: () => void
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-primary-600 bg-primary-100 rounded-lg hover:bg-primary-200 transition"
  >
    <span className="material-symbols-outlined w-4 h-4">{icon}</span>
    {label}
  </button>
)

interface IconButtonProps {
  icon: string
  onClick: () => void
  tone?: 'default' | 'danger'
}

const IconButton: React.FC<IconButtonProps> = ({ icon, onClick, tone = 'default' }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg transition ${
      tone === 'danger'
        ? 'text-red-600 bg-red-100 hover:bg-red-200'
        : 'text-blue-600 bg-blue-100 hover:bg-blue-200'
    }`}
  >
    <span className="material-symbols-outlined w-4 h-4">{icon}</span>
  </button>
)

export default AdminMarketingPanel

