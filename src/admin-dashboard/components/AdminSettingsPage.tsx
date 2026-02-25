import React, { useEffect, useMemo, useState } from 'react'
import { AdminDeliverabilitySettings } from './AdminDeliverabilitySettings'
import { AuthService } from '../../services/authService'

type BillingSummary = {
  plan: string
  status: 'active' | 'trial' | 'past_due' | 'canceled'
  nextBillingDate?: string
}

type BillingUser = {
  email: string
  plan: string
  paymentStatus: 'paid' | 'late' | 'failed' | 'trial'
  lastInvoice?: string
  isLate?: boolean
}

type Invoice = {
  id: string
  date: string
  amount: string
  status: string
  url?: string
}

type SecurityState = {
  twoFactorEnabled: boolean
  apiKeys: Array<{ id: string; label: string; scope: string; lastUsed?: string }>
  activityLogs: Array<{ id: string; event: string; ip: string; at: string }>
}

type AnalyticsSummary = {
  totalLeads: number
  activeFunnels: number
  appointments: number
  messagesSent: number
  voiceMinutesUsed: number
}

type SystemSettings = {
  appName: string
  brandingColor: string
  onboardingEnabled: boolean
  aiLoggingEnabled: boolean
  betaFeaturesEnabled: boolean
  notificationEmail: string
  notificationPhone: string
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

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2'>
    <span className='text-sm font-medium text-slate-700'>{label}</span>
    <div className='text-sm text-slate-800'>{children}</div>
  </div>
)

const Toggle: React.FC<{ value: boolean; onChange: (val: boolean) => void }> = ({ value, onChange }) => (
  <button
    type='button'
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
)

const AdminSettingsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const auth = useMemo(() => AuthService.getInstance(), [])
  const [activeTab, setActiveTab] = useState<'billing' | 'security' | 'analytics' | 'system' | 'deliverability'>('billing')
  const [billingSummary, setBillingSummary] = useState<BillingSummary>({ plan: 'Pro', status: 'active', nextBillingDate: '' })
  const [billingUsers, setBillingUsers] = useState<BillingUser[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [security, setSecurity] = useState<SecurityState>({ twoFactorEnabled: false, apiKeys: [], activityLogs: [] })
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({ totalLeads: 0, activeFunnels: 0, appointments: 0, messagesSent: 0, voiceMinutesUsed: 0 })
  const [analyticsRange, setAnalyticsRange] = useState<'7' | '30' | '90'>('30')
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    appName: 'HomeListingAI (Admin)',
    brandingColor: '#0ea5e9',
    onboardingEnabled: true,
    aiLoggingEnabled: true,
    betaFeaturesEnabled: false,
    notificationEmail: 'admin@homelistingai.app',
    notificationPhone: ''
  })
  const [cancellingEmail, setCancellingEmail] = useState('')
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
    const base = (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_API_BASE_URL || ''
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
        const [billingRes, usersRes, invoicesRes, securityRes, analyticsRes, systemRes] = await Promise.all([
          fetchJson(`${apiBase}/api/admin/billing`).catch(() => null),
          fetchJson(`${apiBase}/api/admin/users/billing`).catch(() => null),
          fetchJson(`${apiBase}/api/admin/billing/invoices`).catch(() => null),
          fetchJson(`${apiBase}/api/admin/security`).catch(() => null),
          fetchJson(`${apiBase}/api/admin/analytics/overview?range=${analyticsRange}`).catch(() => null),
          fetchJson(`${apiBase}/api/admin/system-settings`).catch(() => null)
        ])

        if (billingRes) setBillingSummary(billingRes)
        if (usersRes) setBillingUsers(usersRes)
        if (invoicesRes) setInvoices(invoicesRes)
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
        if (systemRes) setSystemSettings(systemRes)

        const couponsRes = await fetchJson(`${apiBase}/api/admin/coupons`).catch(() => null)
        if (couponsRes) setCoupons(couponsRes)
      } catch (error) {
        console.warn('Failed to load admin settings', error)
      }
    }
    void load()
  }, [apiBase, analyticsRange, auth])

  const handleSaveSystem = async () => {
    try {
      await fetch(`${apiBase}/api/admin/system-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemSettings)
      })
    } catch (error) {
      console.warn('Failed to save system settings', error)
    }
  }

  const handleRegenerateKey = async (scope: string) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/security/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope })
      })
      if (res.ok) {
        const payload = await res.json()
        if (Array.isArray(payload?.keys)) setSecurity((prev) => ({ ...prev, apiKeys: payload.keys }))
      }
    } catch (error) {
      console.warn('Failed to regenerate key', error)
    }
  }

  const handleSendReminder = async () => {
    if (!reminderEmail.trim()) return
    await fetch(`${apiBase}/api/admin/billing/send-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: reminderEmail })
    }).catch(() => undefined)
    setReminderEmail('')
  }

  const handleCancelAlert = async () => {
    if (!cancellingEmail.trim()) return
    await fetch(`${apiBase}/api/admin/billing/cancel-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cancellingEmail })
    }).catch(() => undefined)
    setCancellingEmail('')
  }

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.amount) return
    try {
      const res = await fetch(`${apiBase}/api/admin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCoupon,
          amount: Number(newCoupon.amount),
          usage_limit: newCoupon.usage_limit ? Number(newCoupon.usage_limit) : null
        })
      })
      if (res.ok) {
        const created = await res.json()
        setCoupons(prev => [created, ...prev])
        setNewCoupon({ code: '', discount_type: 'percent', amount: '', duration: 'once', usage_limit: '' })
      }
    } catch (error) {
      console.error('Failed to create coupon', error)
    }
  }

  const handleDeleteCoupon = async (id: string) => {
    try {
      await fetch(`${apiBase}/api/admin/coupons/${id}`, { method: 'DELETE' })
      setCoupons(prev => prev.filter(c => c.id !== id))
    } catch (error) {
      console.error('Failed to delete coupon', error)
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
            { id: 'analytics', label: 'Analytics', icon: 'insights' },
            { id: 'deliverability', label: 'Deliverability', icon: 'mark_email_read' },
            { id: 'system', label: 'System Config', icon: 'tune' }
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
            <Section title='Billing Overview' subtitle='Plan, status, and next renewal'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <Row label='Plan'>{billingSummary.plan}</Row>
                <Row label='Status'>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${billingSummary.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : billingSummary.status === 'past_due'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                    }`}>
                    {billingSummary.status}
                  </span>
                </Row>
                <Row label='Next Billing'>{billingSummary.nextBillingDate || '—'}</Row>
              </div>
            </Section>

            <Section title='Subscribers' subtitle='User-level billing state and dunning flags'>
              <div className='overflow-auto'>
                <table className='min-w-full text-sm'>
                  <thead className='text-left text-slate-500'>
                    <tr>
                      <th className='py-2 pr-4'>Email</th>
                      <th className='py-2 pr-4'>Plan</th>
                      <th className='py-2 pr-4'>Payment</th>
                      <th className='py-2 pr-4'>Last Invoice</th>
                      <th className='py-2'>Late?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingUsers.map((u) => (
                      <tr key={u.email} className='border-t border-slate-100'>
                        <td className='py-2 pr-4 font-medium text-slate-800'>{u.email}</td>
                        <td className='py-2 pr-4'>{u.plan}</td>
                        <td className='py-2 pr-4'>{u.paymentStatus}</td>
                        <td className='py-2 pr-4'>{u.lastInvoice || '—'}</td>
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
                {billingUsers.length === 0 && <p className='text-sm text-slate-500 mt-2'>No billing users loaded.</p>}
              </div>
            </Section>

            <Section title='Dunning & Cancellation'>
              <div className='grid sm:grid-cols-2 gap-4'>
                <div className='p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2'>
                  <h4 className='font-semibold text-slate-900'>Reminder to pay</h4>
                  <p className='text-sm text-slate-600'>Send automated email/SMS when user is late.</p>
                  <div className='flex items-center gap-2'>
                    <input
                      value={reminderEmail}
                      onChange={(e) => setReminderEmail(e.target.value)}
                      placeholder='user@email.com'
                      className='flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                    />
                    <button
                      onClick={handleSendReminder}
                      className='inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-3 py-2 text-sm hover:bg-amber-700'
                    >
                      <span className='material-symbols-outlined text-sm'>send</span>
                      Trigger Reminder
                    </button>
                  </div>
                </div>
                <div className='p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2'>
                  <h4 className='font-semibold text-slate-900'>Cancellation interception</h4>
                  <p className='text-sm text-slate-600'>Show retention alert and notify admin.</p>
                  <div className='flex items-center gap-2'>
                    <input
                      value={cancellingEmail}
                      onChange={(e) => setCancellingEmail(e.target.value)}
                      placeholder='user@email.com'
                      className='flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                    />
                    <button
                      onClick={handleCancelAlert}
                      className='inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-3 py-2 text-sm hover:bg-rose-700'
                    >
                      <span className='material-symbols-outlined text-sm'>report</span>
                      Send Retention Alert
                    </button>
                  </div>
                </div>
              </div>
            </Section>

            <Section title='Payment Methods & Invoices'>
              <div className='flex flex-wrap gap-3'>
                <button className='inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700'>
                  <span className='material-symbols-outlined text-sm'>credit_card</span>
                  Update Card
                </button>
                <button className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
                  <span className='material-symbols-outlined text-sm'>receipt_long</span>
                  Download Invoices
                </button>
              </div>
              <div className='mt-4 space-y-2'>
                {invoices.map((inv) => (
                  <div key={inv.id} className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2'>
                    <div className='text-sm text-slate-700'>
                      <div className='font-semibold'>{inv.amount}</div>
                      <div className='text-xs text-slate-500'>{inv.date}</div>
                    </div>
                    <div className='flex items-center gap-3 text-xs text-slate-600'>
                      <span>{inv.status}</span>
                      {inv.url && <a className='text-blue-600 hover:underline' href={inv.url} target='_blank' rel='noreferrer'>View</a>}
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && <p className='text-sm text-slate-500'>No invoices found.</p>}
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
                <div className='p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3'>
                  <h4 className='font-semibold text-slate-900'>Change Password</h4>
                  <input type='password' placeholder='Current password' className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' />
                  <input type='password' placeholder='New password' className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' />
                  <input type='password' placeholder='Confirm new password' className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' />
                  <button className='inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-3 py-2 text-sm hover:bg-slate-800'>Update</button>
                </div>
                <div className='p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='font-semibold text-slate-900'>Two-Factor Authentication</h4>
                      <p className='text-sm text-slate-600'>Add an extra layer for admin logins.</p>
                    </div>
                    <Toggle value={security.twoFactorEnabled} onChange={(val) => setSecurity((prev) => ({ ...prev, twoFactorEnabled: val }))} />
                  </div>
                  <p className='text-xs text-slate-500'>Recommend enabling 2FA for all admins.</p>
                </div>
              </div>

              <div className='p-4 rounded-xl border border-slate-200 bg-white space-y-3'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='font-semibold text-slate-900'>API Keys</h4>
                    <p className='text-sm text-slate-600'>Scope keys for funnels or AI chat.</p>
                  </div>
                  <button
                    className='inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700'
                    onClick={() => handleRegenerateKey('funnel')}
                  >
                    <span className='material-symbols-outlined text-sm'>cached</span>
                    Regenerate Key
                  </button>
                </div>
                <div className='space-y-2'>
                  {security.apiKeys.map((k) => (
                    <div key={k.id} className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2'>
                      <div>
                        <div className='font-semibold text-sm text-slate-800'>{k.label}</div>
                        <div className='text-xs text-slate-500'>Scope: {k.scope}</div>
                      </div>
                      <div className='text-xs text-slate-500'>Last used: {k.lastUsed || 'n/a'}</div>
                    </div>
                  ))}
                  {security.apiKeys.length === 0 && <p className='text-sm text-slate-500'>No keys yet.</p>}
                </div>
              </div>

              <div className='p-4 rounded-xl border border-slate-200 bg-white space-y-2'>
                <h4 className='font-semibold text-slate-900'>Activity Logs</h4>
                <p className='text-sm text-slate-600'>Recent logins, config changes, funnel edits.</p>
                <div className='space-y-2 max-h-60 overflow-auto'>
                  {security.activityLogs.map((log) => (
                    <div key={log.id} className='rounded-lg border border-slate-200 px-3 py-2 text-sm flex items-center justify-between'>
                      <div className='text-slate-700'>{log.event}</div>
                      <div className='text-xs text-slate-500'>{log.ip} — {log.at}</div>
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
          </div>
        )}

        {activeTab === 'deliverability' && (
          <AdminDeliverabilitySettings />
        )}

        {activeTab === 'system' && (
          <div className='space-y-5'>
            <Section title='Branding & Identity'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <label className='text-sm font-medium text-slate-700'>App Name</label>
                  <input
                    value={systemSettings.appName}
                    onChange={(e) => setSystemSettings((prev) => ({ ...prev, appName: e.target.value }))}
                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-slate-700'>Brand Color</label>
                  <input
                    type='color'
                    value={systemSettings.brandingColor}
                    onChange={(e) => setSystemSettings((prev) => ({ ...prev, brandingColor: e.target.value }))}
                    className='mt-1 h-10 w-full rounded-lg border border-slate-300'
                  />
                </div>
              </div>
            </Section>

            <Section title='Feature Toggles & Notifications'>
              <div className='space-y-3'>
                <Row label='Enable Onboarding Flows'>
                  <Toggle value={systemSettings.onboardingEnabled} onChange={(val) => setSystemSettings((prev) => ({ ...prev, onboardingEnabled: val }))} />
                </Row>
                <Row label='Enable AI Response Logging'>
                  <Toggle value={systemSettings.aiLoggingEnabled} onChange={(val) => setSystemSettings((prev) => ({ ...prev, aiLoggingEnabled: val }))} />
                </Row>
                <Row label='Enable Beta Features'>
                  <Toggle value={systemSettings.betaFeaturesEnabled} onChange={(val) => setSystemSettings((prev) => ({ ...prev, betaFeaturesEnabled: val }))} />
                </Row>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div>
                    <label className='text-sm font-medium text-slate-700'>Notification Email</label>
                    <input
                      value={systemSettings.notificationEmail}
                      onChange={(e) => setSystemSettings((prev) => ({ ...prev, notificationEmail: e.target.value }))}
                      className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
                    />
                  </div>
                  <div>
                    <label className='text-sm font-medium text-slate-700'>Notification Phone</label>
                    <input
                      value={systemSettings.notificationPhone}
                      onChange={(e) => setSystemSettings((prev) => ({ ...prev, notificationPhone: e.target.value }))}
                      className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
                    />
                  </div>
                </div>
                <div className='flex justify-end'>
                  <button onClick={handleSaveSystem} className='inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700'>
                    <span className='material-symbols-outlined text-sm'>save</span>
                    Save Settings
                  </button>
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSettingsPage
