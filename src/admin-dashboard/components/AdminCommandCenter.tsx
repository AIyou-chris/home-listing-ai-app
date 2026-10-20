import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CampaignStatsWidget } from './CampaignStatsWidget'
import { AuthService } from '../../services/authService'
import Collapsible from '../../components/admin/Collapsible'
import { setAllOpen } from '../../components/admin/collapsibleAll'
import { TodayView, TodayData } from './TodayView'



type HealthResponse = {
  totalApiCalls: number
  failedApiCalls: number
  avgResponseTimeMs: number
  uptimePercent: number
  uptimeSeconds?: number
  lastChecked: string
  alerts?: Array<{ type: string; message: string }>
  recentFailures?: Array<{ id: string; timestamp: string; method: string; path: string; statusCode: number; error: unknown }>
}

type SecurityResponse = {
  openRisks: string[]
  lastLogin: { ip: string; device: string; at?: string } | null
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
    aiLatencyMs: number | null
    emailBounceRate: number | null
    fileQueueStuck: number | null
  }
  recentLeads: Array<{ id: string; name: string; status: string; source: string; at: string }>
  campaignStats?: {
    emailsSent: number
    deliveryRate: number | null
    activeLeads: number
    bounced: number
    opens: number
    clicks: number
    unsubscribed: number
  }
}

// When we do not have a number we say so. We never show a made-up zero.
const NOT_AVAILABLE = 'Not available'

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

const formatUptimeSubtitle = (uptimeSeconds?: number) => {
  if (!uptimeSeconds || uptimeSeconds <= 0) return 'since latest deploy'
  const hours = Math.floor(uptimeSeconds / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m since deploy`
  return `${minutes}m since deploy`
}


const AdminCommandCenter: React.FC = () => {
  const navigate = useNavigate()
  const auth = useMemo(() => AuthService.getInstance(), [])

  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [security, setSecurity] = useState<SecurityResponse | null>(null)
  const [support, setSupport] = useState<SupportResponse | null>(null)
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  // While the first answer is still on its way we say so, instead of flashing "Not available".
  const NA = loading ? 'Loading…' : NOT_AVAILABLE
  const num = (value: number | null | undefined, suffix = ''): React.ReactNode => (value === null || value === undefined ? NA : `${value}${suffix}`)
  const [today, setToday] = useState<TodayData | null>(null)
  const [todayError, setTodayError] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)
  const [selectedLogView, setSelectedLogView] = useState<'failures' | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [h, s, sp, m, td] = await Promise.all([
        auth.makeAuthenticatedRequest('/api/admin/system/health').catch(() => null),
        auth.makeAuthenticatedRequest('/api/admin/security/monitor').catch(() => null),
        auth.makeAuthenticatedRequest('/api/admin/support/summary').catch(() => null),
        auth.makeAuthenticatedRequest('/api/admin/analytics/overview').catch(() => null),
        auth.makeAuthenticatedRequest('/api/admin/today').catch(() => null)
      ])

      if (h?.ok) setHealth(await h.json())
      if (s?.ok) setSecurity(await s.json())
      if (sp?.ok) setSupport(await sp.json())
      if (m?.ok) setMetrics(await m.json())
      if (td?.ok) { setToday(await td.json()); setTodayError(false) } else setTodayError(true)
    } catch (error) {
      console.warn('Admin command center load failed', error)
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    loadAll().catch(() => undefined)
    const t = setInterval(loadAll, 60000)
    return () => clearInterval(t)
  }, [loadAll])

  const anyAlert = health?.alerts && health.alerts.length > 0

  return (
    <div className='space-y-6' ref={pageRef}>
      <div className='flex items-center justify-between'>
        <div>
          <p className='inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700'>
            <span className='material-symbols-outlined text-base'>dashboard</span>
            Admin Command Center
          </p>
          <h1 className='text-3xl font-bold text-slate-900 mt-2'>Today</h1>
          <p className='text-sm text-slate-500'>What went out, what needs you, and how the system is doing.</p>
        </div>
        <div className='flex gap-2'>
        <button type='button' onClick={() => setAllOpen(pageRef.current, true)} className='rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>Open all</button>
        <button type='button' onClick={() => setAllOpen(pageRef.current, false)} className='rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>Close all</button>
        <button
          onClick={loadAll}
          className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
          disabled={loading}
        >
          <span className='material-symbols-outlined text-sm'>refresh</span>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        </div>
      </div>

      <TodayView data={today} error={todayError} onGo={(to) => navigate(to === 'marketing' ? '/admin/marketing-funnels' : '/admin/settings')} />

      <CampaignStatsWidget stats={metrics?.campaignStats ?? null} loading={loading} />


      {/* System Health */}
      <Collapsible title='System Health' hint='API calls, failures, latency, uptime' badge={<>{anyAlert && <Badge tone='error'>Alert</Badge>}</>}>
        <div className='space-y-3'>
        <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
          <Card title='API Calls (Since Deploy)' value={num(health?.totalApiCalls)} />
          <Card
            title='Failed (Since Deploy)'
            value={num(health?.failedApiCalls)}
            tone={(health?.failedApiCalls ?? 0) > 20 ? 'warn' : 'default'}
            onClick={() => setSelectedLogView('failures')}
          />
          <Card title='Avg Response Time' value={num(health?.avgResponseTimeMs, ' ms')} tone={(health?.avgResponseTimeMs ?? 0) > 1000 ? 'warn' : 'default'} />
          <Card title='Process Uptime' value={num(health?.uptimePercent, '%')} subtitle={formatUptimeSubtitle(health?.uptimeSeconds)} />
        </div>
        {health?.alerts && health.alerts.length > 0 && (
          <div className='rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800'>
            <div className='font-semibold mb-1'>System Alerts</div>
            <ul className='list-disc list-inside space-y-1'>
              {health.alerts.map((a, idx) => <li key={idx}>{a.message}</li>)}
            </ul>
          </div>
        )}
        </div>
      </Collapsible>

      {/* Security */}
      <Collapsible title='Security Monitor' hint='Open risks, last login, anomalies' badge={security ? (
        <Badge tone={security.openRisks.length > 0 ? 'warn' : 'success'}>
          {security.openRisks.length > 0 ? 'Action Needed' : 'Secure'}
        </Badge>
      ) : <Badge tone='neutral'>{NA}</Badge>}>
        <div className='space-y-3'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <Card title='Open Risks' value={num(security?.openRisks?.length)} />
          <Card
            title='Last Login'
            value={security ? (security.lastLogin?.at ? new Date(security.lastLogin.at).toLocaleString() : 'Not tracked yet') : NA}
            subtitle={security?.lastLogin ? `${security.lastLogin.ip} · ${security.lastLogin.device}` : 'No real login event found yet'}
          />
          <Card title='Anomalies' value={num(security?.anomalies?.length)} tone={(security?.anomalies?.length ?? 0) > 0 ? 'warn' : 'default'} />
        </div>
        {security?.openRisks?.length ? (
          <ul className='list-disc list-inside text-sm text-slate-700'>
            {security.openRisks.map((risk, idx) => <li key={idx}>{risk}</li>)}
          </ul>
        ) : (
          <p className='text-sm text-slate-500'>{security ? 'No known risks.' : 'Security data is not available right now.'}</p>
        )}
        </div>
      </Collapsible>

      {/* Support */}
      <Collapsible title='Support Snapshot' hint='Chats, tickets, and errors needing attention' badge={support ? (
        <Badge tone={support.openTickets + support.openErrors > 0 ? 'warn' : 'success'}>
          {`${support.openChats + support.openTickets + support.openErrors} open`}
        </Badge>
      ) : <Badge tone='neutral'>{NA}</Badge>}>
        <div className='space-y-3'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <Card title='Open Chats' value={num(support?.openChats)} />
          <Card title='Tickets' value={num(support?.openTickets)} />
          <Card title='Recent API Errors' value={num(support?.openErrors)} tone={(support?.openErrors ?? 0) > 0 ? 'warn' : 'default'} />
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
          {!support?.items?.length && <p className='text-sm text-slate-500'>{support ? 'No open support items.' : 'Support data is not available right now.'}</p>}
        </div>
        </div>
      </Collapsible>

      {/* Operational Metrics */}
      <Collapsible title='Operational Metrics' hint='Lead & appointment KPIs'>
        <div className='space-y-3'>
        <div className='flex gap-2 text-xs text-slate-500'>
          <button type='button' className='text-blue-600 hover:underline' onClick={() => navigate('/admin/leads')}>Leads</button>
          <span>·</span>
          <button type='button' className='text-blue-600 hover:underline' onClick={() => navigate('/admin/leads')}>Appointments</button>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
          <Card title='Leads Today' value={num(metrics?.leadsToday)} />
          <Card title='Leads This Week' value={num(metrics?.leadsThisWeek)} sparkline={metrics?.leadsSpark} />
          <Card title='Appointments (7d)' value={num(metrics?.appointmentsNext7)} sparkline={metrics?.apptSpark} />
          <Card title='Messages Sent' value={num(metrics?.messagesSent)} />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <Card title='AI Latency' value={num(metrics?.statuses.aiLatencyMs, ' ms')} tone={(metrics?.statuses.aiLatencyMs ?? 0) > 900 ? 'warn' : 'default'} />
          <Card title='Email Bounce Rate' value={num(metrics?.statuses.emailBounceRate, '%')} tone={(metrics?.statuses.emailBounceRate ?? 0) > 5 ? 'warn' : 'default'} />
          <Card title='File Queue Stuck' value={num(metrics?.statuses.fileQueueStuck)} tone={(metrics?.statuses.fileQueueStuck ?? 0) > 0 ? 'warn' : 'default'} />
        </div>
        <div className='mt-3'>
          <div className='flex items-center justify-between mb-2'>
            <h4 className='text-sm font-semibold text-slate-800'>Recent Leads</h4>
            <button type='button' className='text-xs text-blue-600 hover:underline' onClick={() => navigate('/admin/leads')}>View all</button>
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
            {!metrics?.recentLeads?.length && <p className='text-sm text-slate-500'>{metrics ? 'No recent leads.' : 'Lead data is not available right now.'}</p>}
          </div>
        </div>
        </div>
      </Collapsible>

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
