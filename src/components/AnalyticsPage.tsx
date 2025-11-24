import React, { useEffect, useState } from 'react'
import {
  useLeadAnalyticsStore,
  LeadSourceBreakdownItem,
  LeadStatsResponse,
  ScoringRuleResponse,
  ScoreTierResponse
} from '../state/useLeadAnalyticsStore'

const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path>
  </svg>
)

const StatCard: React.FC<{ title: string; value: string; icon: string; iconBgColor: string; iconColor: string }> = ({
  title,
  value,
  icon,
  iconBgColor,
  iconColor
}) => (
  <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4 border border-slate-200/60">
    <div className={`rounded-full p-3 ${iconBgColor}`}>
      <span className={`material-symbols-outlined w-6 h-6 ${iconColor}`}>{icon}</span>
    </div>
    <div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-500">{title}</p>
    </div>
  </div>
)

const FunnelStep: React.FC<{ icon: string; title: string; value: number; color: string; isFirst?: boolean; iconColor: string }> = ({
  icon,
  title,
  value,
  color,
  isFirst = false,
  iconColor
}) => (
  <div className="relative flex items-center">
    {!isFirst && <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-px h-8 bg-slate-300" />}
    <div className={`relative z-10 w-full p-4 rounded-lg border-2 ${color} flex items-center gap-4`}>
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner">
        <span className={`material-symbols-outlined w-6 h-6 ${iconColor}`}>{icon}</span>
      </div>
      <div>
        <p className="text-lg font-bold text-slate-800">{value.toLocaleString()}</p>
        <p className="text-sm font-medium text-slate-600">{title}</p>
      </div>
    </div>
  </div>
)

const PerformanceOverview: React.FC<{ stats?: LeadStatsResponse }> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-10 text-center text-slate-500">
        Loading lead stats…
      </div>
    )
  }

  const totalLeads = stats.total
  const conversionRate = Number(stats.conversionRate) || 0
  const appointments = stats.showing
  const averageScore = Number(stats.scoreStats.averageScore) || 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-slate-800">Performance Overview</h3>
        <span className="text-xs text-slate-400">Stats refresh when leads update</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Leads" value={totalLeads.toString()} icon="group" iconBgColor="bg-blue-100" iconColor="text-blue-600" />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate.toFixed(1)}%`}
          icon="trending_up"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Appointments Set"
          value={appointments.toString()}
          icon="calendar_today"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Average Score"
          value={averageScore.toFixed(1)}
          icon="grade"
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      <div className="pt-6 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-bold text-slate-800 mb-4">Lead Funnel</h4>
          <div className="space-y-6">
            <FunnelStep icon="group" title="Leads Captured" value={stats.total} color="border-blue-300 bg-blue-50" iconColor="text-blue-500" isFirst />
            <FunnelStep
              icon="mail"
              title="Contacted"
              value={stats.contacted}
              color="border-indigo-300 bg-indigo-50"
              iconColor="text-indigo-500"
            />
            <FunnelStep
              icon="rocket"
              title="Qualified"
              value={stats.qualified}
              color="border-orange-300 bg-orange-50"
              iconColor="text-orange-500"
            />
            <FunnelStep
              icon="check_circle"
              title="Appointments"
              value={stats.showing}
              color="border-green-300 bg-green-50"
              iconColor="text-green-500"
            />
          </div>
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-800 mb-4">Score Distribution</h4>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Qualified"
              value={stats.scoreStats.qualified.toString()}
              icon="verified"
              iconBgColor="bg-emerald-100"
              iconColor="text-emerald-600"
            />
            <StatCard
              title="Hot"
              value={stats.scoreStats.hot.toString()}
              icon="whatshot"
              iconBgColor="bg-red-100"
              iconColor="text-red-600"
            />
            <StatCard
              title="Warm"
              value={stats.scoreStats.warm.toString()}
              icon="sunny"
              iconBgColor="bg-yellow-100"
              iconColor="text-yellow-600"
            />
            <StatCard
              title="Cold"
              value={stats.scoreStats.cold.toString()}
              icon="ac_unit"
              iconBgColor="bg-slate-100"
              iconColor="text-slate-600"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const LeadSourceBreakdown: React.FC<{ data: LeadSourceBreakdownItem[] }> = ({ data }) => {
  const iconMapping: Record<string, React.ReactElement> = {
    app: <span className="material-symbols-outlined w-5 h-5 text-blue-600">smartphone</span>,
    facebook: <FacebookIcon className="w-5 h-5 text-blue-800" />,
    zillow: <span className="material-symbols-outlined w-5 h-5 text-teal-600">home_work</span>,
    manual: <span className="material-symbols-outlined w-5 h-5 text-slate-600">edit</span>,
    unknown: <span className="material-symbols-outlined w-5 h-5 text-slate-500">help</span>
  }

  const totalLeads = data.reduce((sum, source) => sum + source.leadCount, 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-xl font-bold text-slate-800 mb-4">Lead Source Breakdown</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No leads yet. As contacts roll in, you’ll see which channels deliver the hottest prospects.</p>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-3 font-semibold">Source</th>
                  <th className="py-3 px-3 font-semibold text-center">Leads</th>
                  <th className="py-3 px-3 font-semibold text-center">Hot/Qualified</th>
                  <th className="py-3 px-3 font-semibold text-center">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {data.map((source) => {
                  const iconKey = source.sourceName.toLowerCase().includes('facebook')
                    ? 'facebook'
                    : source.sourceName.toLowerCase().includes('zillow')
                    ? 'zillow'
                    : source.sourceName.toLowerCase().includes('manual')
                    ? 'manual'
                    : source.sourceName.toLowerCase().includes('app')
                    ? 'app'
                    : 'unknown'

                  return (
                    <tr key={source.sourceName} className="border-b border-slate-100 hover:bg-white">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm">
                            {iconMapping[iconKey]}
                          </div>
                          <span className="font-medium text-slate-700">{source.sourceName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800 text-center">{source.leadCount}</td>
                      <td className="py-3 px-3 font-bold text-primary-700 text-center">{source.hotCount}</td>
                      <td className="py-3 px-3 text-slate-600 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {source.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {totalLeads > 0 && (
        <p className="mt-3 text-xs text-slate-400 text-right">Total leads: {totalLeads}</p>
      )}
    </div>
  )
}

const ScoringRulesPanel: React.FC<{ rules: ScoringRuleResponse[]; tiers: ScoreTierResponse[] }> = ({ rules, tiers }) => {
  if (rules.length === 0 && tiers.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4">Score Tiers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <div key={tier.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <h4 className="text-sm font-semibold text-slate-800">{tier.id}</h4>
              <p className="text-xs text-slate-500">{tier.min} – {tier.max} pts</p>
              <p className="text-sm text-slate-600 mt-2">{tier.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4">Scoring Rules</h3>
        {rules.length === 0 ? (
          <p className="text-sm text-slate-500">No scoring rules found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div key={rule.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-white transition">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-slate-800">{rule.name}</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                    +{rule.points} pts
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wide text-slate-400 mt-1">{rule.category}</p>
                <p className="text-sm text-slate-600 mt-2">{rule.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const AnalyticsPage: React.FC = () => {
  const { stats, leadSources, scoringRules, scoreTiers, isLoading, error, hasHydrated, refresh } = useLeadAnalyticsStore()
  const [showTips, setShowTips] = useState(true)

  useEffect(() => {
    if (!hasHydrated) {
      refresh()
    }
  }, [hasHydrated, refresh])

  if (isLoading && !hasHydrated) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-10 text-center text-slate-500">
        Loading lead scoring analytics…
      </div>
    )
  }

  if (error && !hasHydrated) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Unable to load lead scoring data</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-6">
        <button
          type="button"
          onClick={() => setShowTips((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
          aria-expanded={showTips}
        >
          <span className="material-symbols-outlined text-xl">{showTips ? 'psychiatry' : 'lightbulb'}</span>
          {showTips ? 'Hide Scoring Tips' : 'Show Scoring Tips'}
          <span className="material-symbols-outlined text-base ml-auto">{showTips ? 'expand_less' : 'expand_more'}</span>
        </button>
        {showTips && (
          <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
            <div>
              <h4 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-lg">insights</span>
                Reading The Dashboard
              </h4>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong>Conversion Rate:</strong> Track if qualified leads are moving to appointments. Spikes can indicate a strong campaign.</li>
                <li><strong>Score Distribution:</strong> Hot + Qualified totals should steadily grow; if Warm dominates, revisit your follow-up cadence.</li>
                <li><strong>Source Breakdown:</strong> Double down on sources that convert to Hot/Qualified, and route low converters into nurture drips.</li>
              </ul>
            </div>
            <div>
              <h4 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-lg">grade</span>
                Boosting Lead Scores
              </h4>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong>Automate enrichments:</strong> Capture timeline, budget, and preferences on intake forms to trigger more scoring rules.</li>
                <li><strong>Log touchpoints:</strong> Every call or text should hit the manual touch log—those events power your engagement points.</li>
                <li><strong>Sync with sequences:</strong> Promote Hot leads into fast response sequences; keep Cold leads in slower nurture arcs.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <PerformanceOverview stats={stats} />
      <LeadSourceBreakdown data={leadSources} />
      <ScoringRulesPanel rules={scoringRules} tiers={scoreTiers} />
    </div>
  )
}

export default AnalyticsPage
