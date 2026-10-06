import React, { useEffect, useMemo, useState } from 'react'
import { getEnvVar } from '../../lib/env'
import { AuthService } from '../../services/authService'
import Admin2FASetup from './Admin2FASetup'
import AdminChangePassword from './AdminChangePassword'
import { showToast } from '../../utils/toastService'

type BillingSummary = {
  total: number
  paying: number
  trial: number
  comped: number
  late: number
}

type BillingUser = {
  email: string
  type: string
  paymentStatus: string
  isLate?: boolean
}

type SecurityState = {
  twoFactorEnabled: boolean
  activityLogs: Array<{ id: string; event: string; ip: string; at: string }>
}

type AnalyticsSummary = {
  totalLeads: number
  activeFunnels: number
  appointments: number
  messagesSent: number
  voiceMinutesUsed: number
}

type Coupon = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  amount: number
  duration: 'once' | 'repeating' | 'forever'
  usage_limit: number | null
  usage_count: number
  expires_at: string | null
}

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className='rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4'>
    <div>
      <h3 className='text-lg font-semibold text-slate-900'>{title}</h3>
      {subtitle && <p className='text-sm text-slate-500'>{subtitle}</p>}
    </div>
    {children}
  </section>
)

const AdminSettingsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const auth = useMemo(() => AuthService.getInstance(), [])
  const [activeTab, setActiveTab] = useState<'billing' | 'security' | 'analytics'>('billing')
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null)
  const [billingUsers, setBillingUsers] = useState<BillingUser[]>([])
  const [loaded, setLoaded] = useState(false)
  const [security, setSecurity] = useState<SecurityState>({ twoFactorEnabled: false, activityLogs: [] })
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({ totalLeads: 0, activeFunnels: 0, appointments: 0, messagesSent: 0, voiceMinutesUsed: 0 })
  const [analyticsRange, setAnalyticsRange] = useState<'7' | '30' | '90'>('30')
  const [webTraffic, setWebTraffic] = useState<{ configured: boolean; reason: string; activeUsers: number; newUsers: number; sessions: number; screenPageViews: number }>({ configured: false, reason: '', activeUsers: 0, newUsers: 0, sessions: 0, screenPageViews: 0 })
  const [reminderEmail, setReminderEmail] = useState('')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [newCoupon, setNewCoupon] = useState<{
    code: string
    discount_type: 'percent' | 'fixed'
    amount: string
    duration: 'once' | 'repeating' | 'forever'
    usage_limit: string
  }>({ code: '', discount_type: 'percent', amount: '', duration: 'once', usage_limit: '' })

  const apiBase = useMemo(() => {
    const base = getEnvVar('VITE_API_BASE_URL') || ''
    return base.replace(/\/$/, '')
  }, [])

  useEffect(() => {
    const load = async () => {
      const fetchJson = async (url: string) => {
        const response = await auth.makeAuthenticatedRequest(url)
        if (!response.ok) return null
        return response.json()
      }
      try {
        const [billingRes, usersRes, securityRes, analyticsRes] = await Promise.all([
          fetchJson(`${apiBase}/api/admin/billing`).catch(() => null),
          fetchJson(`${apiBase}/api/admin/users/billing`).catch(() => null),
          fetchJson(`${apiBase}/api/admin/security`).catch(() => null),
          fetchJson(`${apiBase}/api/admin/analytics/overview?range=${analyticsRange}`).catch(() => null)
        ])

        // Google Analytics: read the body even on non-200 so we can surface the real reason.
        try {
          const gaResp = await auth.makeAuthenticatedRequest(`${apiBase}/api/admin/analytics/google`)
          const gaBody = await gaResp.json().catch(() => null)
          if (gaResp.ok && gaBody?.success && gaBody?.stats) {
            setWebTraffic({
              configured: true,
              reason: '',
              activeUsers: gaBody.stats.activeUsers || 0,
              newUsers: gaBody.stats.newUsers || 0,
              sessions: gaBody.stats.sessions || 0,
              screenPageViews: gaBody.stats.screenPageViews || 0
            })
          } else {
            setWebTraffic({
              configured: false,
              reason: gaBody?.error || `Request failed (HTTP ${gaResp.status})`,
              activeUsers: 0, newUsers: 0, sessions: 0, screenPageViews: 0
            })
          }
        } catch (gaErr) {
          setWebTraffic({ configured: false, reason: 'Could not reach the analytics endpoint.', activeUsers: 0, newUsers: 0, sessions: 0, screenPageViews: 0 })
        }

        if (billingRes) setBillingSummary(billingRes)
        if (usersRes) setBillingUsers(usersRes)
        if (securityRes) setSecurity(securityRes)
        if (analyticsRes) {
          // Map backend keys to frontend state
          setAnalytics({
            totalLeads: analyticsRes.leadsThisWeek || 0,
            activeFunnels: analyticsRes.campaignStats?.activeLeads || 0,
            appointments: analyticsRes.appointmentsNext7 || 0,
            messagesSent: analyticsRes.messagesSent || 0,
            voiceMinutesUsed: analyticsRes.voiceMinutesUsed || 0
          })
        }

        const couponsRes = await fetchJson(`${apiBase}/api/admin/coupons`).catch(() => null)
        if (couponsRes) setCoupons(couponsRes)
      } catch (error) {
        console.warn('Failed to load admin settings', error)
      } finally {
        setLoaded(true)
      }
    }
    void load()
  }, [apiBase, analyticsRange, auth])

  const handleSendReminder = async () => {
    const email = reminderEmail.trim()
    if (!email) return
    if (!window.confirm(`Email ${email} a "your payment is late" reminder?`)) return
    try {
      const res = await auth.makeAuthenticatedRequest(`${apiBase}/api/admin/billing/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const body = await res.json().catch(() => ({} as { error?: string }))
      if (!res.ok) throw new Error(body.error === 'not_a_user' ? 'That email is not one of your users.' : 'Could not send the reminder.')
      showToast.success(`Reminder sent to ${email}`)
      setReminderEmail('')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Could not send the reminder.')
    }
  }

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.amount) return
    try {
      const res = await auth.makeAuthenticatedRequest(`${apiBase}/api/admin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCoupon,
          amount: Number(newCoupon.amount),
          usage_limit: newCoupon.usage_limit ? Number(newCoupon.usage_limit) : null
        })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }))
        throw new Error(body.error === 'invalid_coupon' ? 'Check the code and amount. Percent must be 1 to 100.' : body.error === 'coupon_exists' ? 'That code already exists.' : 'Could not create the coupon.')
      }
      const created = await res.json()
      setCoupons(prev => [created, ...prev])
      setNewCoupon({ code: '', discount_type: 'percent', amount: '', duration: 'once', usage_limit: '' })
      showToast.success('Coupon created')
    } catch (error) {
      console.error('Failed to create coupon', error)
      showToast.error(error instanceof Error ? error.message : 'Could not create the coupon.')
    }
  }

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Delete this coupon?')) return
    try {
      const res = await auth.makeAuthenticatedRequest(`${apiBase}/api/admin/coupons/${id}`, { method: 'DELETE' })
      // Only drop it from the list if the server really deleted it.
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setCoupons(prev => prev.filter(c => c.id !== id))
      showToast.success('Coupon deleted')
    } catch (error) {
      console.error('Failed to delete coupon', error)
      showToast.error('Could not delete the coupon.')
    }
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <div className='max-w-6xl mx-auto px-4 py-8 space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700'>
              <span className='material-symbols-outlined text-base'>settings</span>
              Admin Settings
            </p>
            <h1 className='text-3xl font-bold text-slate-900 mt-2'>Control Panel</h1>
            <p className='text-sm text-slate-500'>Billing, security, analytics, and system toggles for admins.</p>
          </div>
          <button onClick={onBack} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'>
            <span className='material-symbols-outlined text-base'>chevron_left</span>
            Back
          </button>
        </div>

        <div className='flex flex-wrap gap-2'>
          {[
            { id: 'billing', label: 'Billing', icon: 'credit_card' },
            { id: 'security', label: 'Security', icon: 'shield_lock' },
            { id: 'analytics', label: 'Analytics', icon: 'insights' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border ${activeTab === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <span className='material-symbols-outlined text-base'>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'billing' && (
          <div className='space-y-5'>
            <Section title='Customers at a glance' subtitle='Everyone on the platform (demo accounts left out)'>
              {billingSummary ? (
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                  {([['Paying', billingSummary.paying], ['On free trial', billingSummary.trial], ['Comped', billingSummary.comped], ['Late', billingSummary.late]] as const).map(([label, value]) => (
                    <div key={label} className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <div className='text-xs text-slate-500 uppercase'>{label}</div>
                      <div className='text-2xl font-semibold text-slate-900 mt-1'>{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-slate-500'>{loaded ? 'Could not load the customer counts.' : 'Loading…'}</p>
              )}
            </Section>

            <Section title='Customers' subtitle='Who is on which plan, and who is late'>
              <div className='overflow-auto'>
                <table className='min-w-full text-sm'>
                  <thead className='text-left text-slate-500'>
                    <tr>
                      <th className='py-2 pr-4'>Email</th>
                      <th className='py-2 pr-4'>Type</th>
                      <th className='py-2 pr-4'>Plan</th>
                      <th className='py-2'>Late?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingUsers.map((u) => (
                      <tr key={u.email} className='border-t border-slate-100'>
                        <td className='py-2 pr-4 font-medium text-slate-800'>{u.email}</td>
                        <td className='py-2 pr-4'>{u.type}</td>
                        <td className='py-2 pr-4'>{u.paymentStatus}</td>
                        <td className='py-2'>
                          {u.isLate ? (
                            <span className='px-2 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700'>Late</span>
                          ) : (
                            <span className='text-xs text-slate-500'>OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {billingUsers.length === 0 && <p className='text-sm text-slate-500 mt-2'>{loaded ? 'No customers yet.' : 'Loading…'}</p>}
              </div>
            </Section>

            <Section title='Late payment reminder' subtitle='Emails one of your users a "please update your card" note. Payments themselves are handled by Stripe.'>
              <div className='flex items-center gap-2'>
                <input
                  value={reminderEmail}
                  onChange={(e) => setReminderEmail(e.target.value)}
                  placeholder='user@email.com'
                  aria-label='User email for the reminder'
                  className='flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                />
                <button
                  onClick={handleSendReminder}
                  disabled={!reminderEmail.trim()}
                  className='inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-3 py-2 text-sm hover:bg-amber-700 disabled:opacity-50'
                >
                  <span className='material-symbols-outlined text-sm'>send</span>
                  Send reminder
                </button>
              </div>
            </Section>

            <Section title='Coupons & Discounts' subtitle='Manage promo codes'>
              <div className='flex items-end gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4'>
                <div className='flex-1'>
                  <label className='text-xs font-semibold text-slate-500 uppercase'>Code</label>
                  <input
                    value={newCoupon.code}
                    onChange={e => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder='SUMMER25'
                    className='w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  />
                </div>
                <div className='w-28'>
                  <label className='text-xs font-semibold text-slate-500 uppercase'>Type</label>
                  <select
                    value={newCoupon.discount_type}
                    onChange={e => setNewCoupon(prev => ({ ...prev, discount_type: e.target.value as 'percent' | 'fixed' }))}
                    className='w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  >
                    <option value='percent'>Percent (%)</option>
                    <option value='fixed'>Fixed ($)</option>
                  </select>
                </div>
                <div className='w-28'>
                  <label className='text-xs font-semibold text-slate-500 uppercase'>Duration</label>
                  <select
                    value={newCoupon.duration}
                    onChange={e => setNewCoupon(prev => ({ ...prev, duration: e.target.value as 'once' | 'repeating' | 'forever' }))}
                    className='w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  >
                    <option value='once'>One Time</option>
                    <option value='repeating'>Monthly</option>
                    <option value='forever'>Lifetime</option>
                  </select>
                </div>
                <div className='w-24'>
                  <label className='text-xs font-semibold text-slate-500 uppercase'>Amount</label>
                  <input
                    type='number'
                    value={newCoupon.amount}
                    onChange={e => setNewCoupon(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder='20'
                    className='w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  />
                </div>
                <div className='w-20'>
                  <label className='text-xs font-semibold text-slate-500 uppercase'>Limit</label>
                  <input
                    type='number'
                    value={newCoupon.usage_limit}
                    onChange={e => setNewCoupon(prev => ({ ...prev, usage_limit: e.target.value }))}
                    placeholder='∞'
                    className='w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  />
                </div>
                <button
                  onClick={handleCreateCoupon}
                  disabled={!newCoupon.code || !newCoupon.amount}
                  className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed h-[38px]'
                >
                  <span className='material-symbols-outlined text-sm'>add</span>
                  Add
                </button>
              </div>

              <div className='overflow-auto'>
                <table className='min-w-full text-sm'>
                  <thead className='text-left text-slate-500 bg-slate-50'>
                    <tr>
                      <th className='py-2 px-3 rounded-l-lg'>Code</th>
                      <th className='py-2 px-3'>Discount</th>
                      <th className='py-2 px-3'>Duration</th>
                      <th className='py-2 px-3'>Usage</th>
                      <th className='py-2 px-3 rounded-r-lg text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(c => (
                      <tr key={c.id} className='border-b border-slate-50 last:border-0 hover:bg-slate-50'>
                        <td className='py-3 px-3 font-mono font-medium text-slate-800'>{c.code}</td>
                        <td className='py-3 px-3'>
                          {c.discount_type === 'percent' ? `${c.amount}% off` : `$${c.amount} off`}
                        </td>
                        <td className='py-3 px-3'>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${c.duration === 'forever' ? 'bg-indigo-100 text-indigo-700' :
                            c.duration === 'repeating' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                            {c.duration === 'forever' ? 'Lifetime' : c.duration === 'repeating' ? 'Monthly' : 'One Time'}
                          </span>
                        </td>
                        <td className='py-3 px-3'>
                          <span className='inline-flex items-center gap-1'>
                            <span className='font-semibold'>{c.usage_count}</span>
                            <span className='text-slate-400'>/</span>
                            <span>{c.usage_limit ?? '∞'}</span>
                          </span>
                        </td>
                        <td className='py-3 px-3 text-right'>
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            className='text-slate-400 hover:text-rose-600 transition-colors'
                          >
                            <span className='material-symbols-outlined text-lg'>delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={5} className='py-4 text-center text-slate-500 italic'>
                          No active coupons. Create one above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {activeTab === 'security' && (
          <div className='space-y-5'>
            <Section title='Security Controls' subtitle='Password, 2FA, and access keys'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <AdminChangePassword />
                <Admin2FASetup />
              </div>

              {/* API Keys section hidden — no real integration auth wired yet.
                  Re-add when programmatic API access (real, validated keys) is built. */}

              <div className='p-4 rounded-xl border border-slate-200 bg-white space-y-2'>
                <h4 className='font-semibold text-slate-900'>Activity Logs</h4>
                <p className='text-sm text-slate-600'>Recent logins, config changes, funnel edits.</p>
                <div className='space-y-2 max-h-60 overflow-auto'>
                  {security.activityLogs.map((log) => (
                    <div key={log.id} className='rounded-lg border border-slate-200 px-3 py-2 text-sm flex items-center justify-between'>
                      <div className='text-slate-700'>{log.event}</div>
                      <div className='text-xs text-slate-500'>{log.ip} · {new Date(log.at).toLocaleString()}</div>
                    </div>
                  ))}
                  {security.activityLogs.length === 0 && <p className='text-sm text-slate-500'>No activity recorded.</p>}
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className='space-y-5'>
            <Section title='Admin Analytics' subtitle='Key funnel KPIs'>
              <div className='flex items-center gap-3'>
                <label className='text-sm text-slate-600'>Range:</label>
                <select
                  className='rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  value={analyticsRange}
                  onChange={(e) => setAnalyticsRange(e.target.value as '7' | '30' | '90')}
                >
                  <option value='7'>Last 7 days</option>
                  <option value='30'>Last 30 days</option>
                  <option value='90'>Last 90 days</option>
                </select>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='text-xs text-slate-500 uppercase'>Total Leads</div>
                  <div className='text-2xl font-semibold text-slate-900 mt-1'>{analytics.totalLeads}</div>
                </div>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='text-xs text-slate-500 uppercase'>Active Funnels</div>
                  <div className='text-2xl font-semibold text-slate-900 mt-1'>{analytics.activeFunnels}</div>
                </div>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='text-xs text-slate-500 uppercase'>Appointments</div>
                  <div className='text-2xl font-semibold text-slate-900 mt-1'>{analytics.appointments}</div>
                </div>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='text-xs text-slate-500 uppercase'>Messages Sent</div>
                  <div className='text-2xl font-semibold text-slate-900 mt-1'>{analytics.messagesSent}</div>
                </div>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='text-xs text-slate-500 uppercase'>Voice Minutes Used</div>
                  <div className='text-2xl font-semibold text-slate-900 mt-1'>{analytics.voiceMinutesUsed}</div>
                </div>
              </div>
            </Section>

            <Section title='Website Traffic' subtitle='Visitors & clicks from Google Analytics · last 30 days'>
              {webTraffic.configured ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
                  <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <div className='text-xs text-slate-500 uppercase'>Visitors</div>
                    <div className='text-2xl font-semibold text-slate-900 mt-1'>{webTraffic.activeUsers.toLocaleString()}</div>
                  </div>
                  <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <div className='text-xs text-slate-500 uppercase'>New Visitors</div>
                    <div className='text-2xl font-semibold text-slate-900 mt-1'>{webTraffic.newUsers.toLocaleString()}</div>
                  </div>
                  <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <div className='text-xs text-slate-500 uppercase'>Sessions</div>
                    <div className='text-2xl font-semibold text-slate-900 mt-1'>{webTraffic.sessions.toLocaleString()}</div>
                  </div>
                  <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <div className='text-xs text-slate-500 uppercase'>Page Views (Clicks)</div>
                    <div className='text-2xl font-semibold text-slate-900 mt-1'>{webTraffic.screenPageViews.toLocaleString()}</div>
                  </div>
                </div>
              ) : (
                <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
                  <p className='font-semibold'>Google Analytics isn't returning data yet.</p>
                  {webTraffic.reason && (
                    <p className='mt-1 text-amber-700'>Reason from Google: <span className='font-mono'>{webTraffic.reason}</span></p>
                  )}
                  <p className='mt-2 text-amber-700'>Common fixes: enable the <strong>Google Analytics Data API</strong> for the service account's project, confirm the service account has <strong>Viewer</strong> access to the property, and make sure the GA tag is installed on the site (a brand-new property with no traffic returns no data).</p>
                </div>
              )}
            </Section>
          </div>
        )}

      </div>
    </div>
  )
}

export default AdminSettingsPage
