import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CampaignStatsWidget } from './CampaignStatsWidget'

type HealthResponse = {
  totalApiCalls: number
  failedApiCalls: number
  avgResponseTimeMs: number
  uptimePercent: number
  lastChecked: string
  alerts?: Array<{ type: string; message: string }>
  recentFailures?: Array<{ id: string; timestamp: string; method: string; path: string; statusCode: number; error: unknown }>
}

type SecurityResponse = {
  openRisks: string[]
  lastLogin: { ip: string; device: string } | null
  anomalies: string[]
}

type SupportResponse = {
  openChats: number
  openTickets: number
  openErrors: number
  items: Array<{ id: string; title: string; type: string; severity: string }>
}

type MetricsResponse = {
  leadsToday: number
  leadsThisWeek: number
  appointmentsNext7: number
  messagesSent: number
  voiceMinutesUsed: number
  leadsSpark: number[]
  apptSpark: number[]
  statuses: {
    aiLatencyMs: number
    emailBounceRate: number
    fileQueueStuck: number
  }
  recentLeads: Array<{ id: string; name: string; status: string; source: string; at: string }>
  campaignStats?: {
    emailsSent: number
    deliveryRate: number
    activeLeads: number
    bounced: number
  }
}

const Card: React.FC<{ title: string; value: React.ReactNode; subtitle?: string; tone?: 'default' | 'warn' | 'error'; sparkline?: number[]; onClick?: () => void }> = ({ title, value, subtitle, tone = 'default', sparkline, onClick }) => {
  const toneClass = tone === 'error' ? 'border-rose-200 bg-rose-50' : tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
  const Component = onClick ? 'button' : 'div'

  // Simple Sparkline Renderer
  const renderSparkline = (data: number[]) => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data, 1);
    const min = 0;
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d - min) / (max - min)) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="h-8 w-24 mt-2 opacity-50">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={tone === 'default' ? 'text-indigo-600' : 'text-slate-600'}
          />
        </svg>
      </div>
    );
  };

  return (
    <Component onClick={onClick} className={`rounded-xl border ${toneClass} p-4 shadow-sm text-left w-full transition-all ${onClick ? 'hover:scale-[1.02] hover:shadow-md cursor-pointer' : ''} flex flex-col justify-between`}>
      <div>
        <div className='text-xs text-slate-500 uppercase tracking-wide'>{title}</div>
        <div className='text-2xl font-semibold text-slate-900 mt-1'>{value}</div>
        {subtitle && <div className='text-xs text-slate-500 mt-1'>{subtitle}</div>}
      </div>
      {sparkline && renderSparkline(sparkline)}
    </Component>
  )
}

const Badge: React.FC<{ tone?: 'success' | 'warn' | 'error' | 'neutral'; children: React.ReactNode }> = ({ tone = 'neutral', children }) => {
  const map = {
    success: 'bg-emerald-100 text-emerald-700',
    warn: 'bg-amber-100 text-amber-700',
    error: 'bg-rose-100 text-rose-700',
    neutral: 'bg-slate-100 text-slate-700'
  }
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${map[tone]}`}>{children}</span>
}

const AdminCommandCenter: React.FC = () => {
  const apiBase = useMemo(() => {
    const base = (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_API_BASE_URL || ''
    return base.replace(/\/$/, '')
  }, [])

  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [security, setSecurity] = useState<SecurityResponse | null>(null)
  const [support, setSupport] = useState<SupportResponse | null>(null)
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedLogView, setSelectedLogView] = useState<'failures' | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [h, s, sp, m] = await Promise.all([
        fetch(`${apiBase}/api/admin/system/health`).catch(() => null),
        fetch(`${apiBase}/api/admin/security/monitor`).catch(() => null),
        fetch(`${apiBase}/api/admin/support/summary`).catch(() => null),
        fetch(`${apiBase}/api/admin/analytics/overview`).catch(() => null)
      ])
      if (h?.ok) setHealth(await h.json())
      if (s?.ok) setSecurity(await s.json())
      if (sp?.ok) setSupport(await sp.json())
      if (m?.ok) setMetrics(await m.json())
    } catch (error) {
      console.warn('Admin command center load failed', error)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    loadAll().catch(() => undefined)
    const t = setInterval(loadAll, 60000)
    return () => clearInterval(t)
  }, [loadAll])

  const anyAlert = health?.alerts && health.alerts.length > 0

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700'>
            <span className='material-symbols-outlined text-base'>dashboard</span>
            Admin Command Center
          </p>
          <h1 className='text-3xl font-bold text-slate-900 mt-2'>Admin System Overview</h1>
          <p className='text-sm text-slate-500'>Live health, security, support, and operations for admins.</p>
        </div>
        <button
          onClick={loadAll}
          className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
          disabled={loading}
        >
          <span className='material-symbols-outlined text-sm'>refresh</span>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <CampaignStatsWidget stats={metrics?.campaignStats ?? null} loading={loading} />

      {/* System Health */}
      <section className='rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-slate-900'>System Health</h3>
            <p className='text-sm text-slate-500'>API calls, failures, latency, uptime</p>
          </div>
          {anyAlert && <Badge tone='error'>Alert</Badge>}
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
          <Card title='API Calls (Today)' value={health?.totalApiCalls ?? '—'} />
          <Card
            title='Failed (24h)'
            value={health?.failedApiCalls ?? '—'}
            tone={(health?.failedApiCalls ?? 0) > 20 ? 'warn' : 'default'}
            onClick={() => setSelectedLogView('failures')}
          />
          <Card title='Avg Response Time' value={health ? `${health.avgResponseTimeMs} ms` : '—'} tone={(health?.avgResponseTimeMs ?? 0) > 1000 ? 'warn' : 'default'} />
          <Card title='Uptime' value={health ? `${health.uptimePercent}%` : '—'} />
        </div>
        {health?.alerts && health.alerts.length > 0 && (
          <div className='rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800'>
            <div className='font-semibold mb-1'>System Alerts</div>
            <ul className='list-disc list-inside space-y-1'>
              {health.alerts.map((a, idx) => <li key={idx}>{a.message}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* Security */}
      <section className='rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-slate-900'>Security Monitor</h3>
            <p className='text-sm text-slate-500'>Open risks, last login, anomalies</p>
          </div>
          <Badge tone={(security?.openRisks?.length ?? 0) > 0 ? 'warn' : 'success'}>
            {(security?.openRisks?.length ?? 0) > 0 ? 'Action Needed' : 'Secure'}
          </Badge>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <Card title='Open Risks' value={security?.openRisks?.length ?? 0} />
          <Card title='Last Login' value={security?.lastLogin ? `${security.lastLogin.ip}` : '—'} subtitle={security?.lastLogin ? `${security.lastLogin.device}` : ''} />
          <Card title='Anomalies' value={security?.anomalies?.length ?? 0} tone={(security?.anomalies?.length ?? 0) > 0 ? 'warn' : 'default'} />
        </div>
        {security?.openRisks?.length ? (
          <ul className='list-disc list-inside text-sm text-slate-700'>
            {security.openRisks.map((risk, idx) => <li key={idx}>{risk}</li>)}
          </ul>
        ) : (
          <p className='text-sm text-slate-500'>No known risks.</p>
        )}
      </section>

      {/* Support */}
      <section className='rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-slate-900'>Support Snapshot</h3>
            <p className='text-sm text-slate-500'>Chats, tickets, and errors needing attention</p>
          </div>
          <Badge tone={(support?.openTickets ?? 0) + (support?.openErrors ?? 0) > 0 ? 'warn' : 'success'}>
            {support ? `${support.openChats + support.openTickets + support.openErrors} open` : '—'}
          </Badge>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <Card title='Open Chats' value={support?.openChats ?? 0} />
          <Card title='Tickets' value={support?.openTickets ?? 0} />
          <Card title='Errors' value={support?.openErrors ?? 0} tone={(support?.openErrors ?? 0) > 0 ? 'warn' : 'default'} />
        </div>
        <div className='space-y-2'>
          {support?.items?.map((item) => (
            <div key={item.id} className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm'>
              <div className='text-slate-800'>{item.title}</div>
              <Badge tone={item.severity === 'high' ? 'error' : item.severity === 'medium' ? 'warn' : 'neutral'}>
                {item.type}
              </Badge>
            </div>
          ))}
          {!support?.items?.length && <p className='text-sm text-slate-500'>No open support items.</p>}
        </div>
      </section>

      {/* Operational Metrics */}
      <section className='rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-slate-900'>Operational Metrics</h3>
            <p className='text-sm text-slate-500'>Lead & appointment KPIs</p>
          </div>
          <div className='flex gap-2 text-xs text-slate-500'>
            <a className='text-blue-600 hover:underline' href='#/admin-dashboard?tab=leads'>Leads</a>
            <span>·</span>
            <a className='text-blue-600 hover:underline' href='#/admin-dashboard?tab=appointments'>Appointments</a>
          </div>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
          <Card title='Leads Today' value={metrics?.leadsToday ?? 0} />
          <Card title='Leads This Week' value={metrics?.leadsThisWeek ?? 0} sparkline={metrics?.leadsSpark} />
          <Card title='Appointments (7d)' value={metrics?.appointmentsNext7 ?? 0} sparkline={metrics?.apptSpark} />
          <Card title='Messages Sent' value={metrics?.messagesSent ?? 0} />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <Card title='AI Latency' value={metrics ? `${metrics.statuses.aiLatencyMs} ms` : '—'} tone={(metrics?.statuses.aiLatencyMs ?? 0) > 900 ? 'warn' : 'default'} />
          <Card title='Email Bounce Rate' value={metrics ? `${metrics.statuses.emailBounceRate}%` : '—'} tone={(metrics?.statuses.emailBounceRate ?? 0) > 5 ? 'warn' : 'default'} />
          <Card title='File Queue Stuck' value={metrics?.statuses.fileQueueStuck ?? 0} tone={(metrics?.statuses.fileQueueStuck ?? 0) > 0 ? 'warn' : 'default'} />
        </div>
        <div className='mt-3'>
          <div className='flex items-center justify-between mb-2'>
            <h4 className='text-sm font-semibold text-slate-800'>Recent Leads</h4>
            <a className='text-xs text-blue-600 hover:underline' href='#/admin-dashboard?tab=leads'>View all</a>
          </div>
          <div className='space-y-2'>
            {metrics?.recentLeads?.map((lead) => (
              <div key={lead.id} className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm'>
                <div className='text-slate-800 font-semibold'>{lead.name}</div>
                <div className='flex items-center gap-3 text-xs text-slate-500'>
                  <Badge tone='neutral'>{lead.status}</Badge>
                  {lead.source && <span>{lead.source}</span>}
                  {lead.at && <span>{new Date(lead.at).toLocaleTimeString()}</span>}
                </div>
              </div>
            ))}
            {!metrics?.recentLeads?.length && <p className='text-sm text-slate-500'>No recent leads.</p>}
          </div>
        </div>
      </section>

      {/* Failure Log Modal */}
      {selectedLogView === 'failures' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Recent API Failures</h3>
              <button
                onClick={() => setSelectedLogView(null)}
                className="rounded-full p-1 hover:bg-slate-100 transition"
              >
                <span className="material-symbols-outlined text-slate-500">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {health?.recentFailures && health.recentFailures.length > 0 ? (
                health.recentFailures.map((fail) => (
                  <div key={fail.id} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-700">{fail.method}</span>
                        <span className="font-mono text-slate-700">{fail.path}</span>
                      </div>
                      <span className="rounded bg-red-200 px-1.5 py-0.5 text-xs font-bold text-red-800">
                        {fail.statusCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-red-600/80 mt-1">
                      <span className="font-mono truncate max-w-[400px]">
                        {typeof fail.error === 'string' ? fail.error : JSON.stringify(fail.error)}
                      </span>
                      <span>{new Date(fail.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">check_circle</span>
                  <p>No recent failures recorded.</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLogView(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCommandCenter
