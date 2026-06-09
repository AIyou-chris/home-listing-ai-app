import React, { useCallback, useEffect, useRef, useState } from 'react'
import { buildApiUrl } from '../../lib/api'
import { supabase } from '../../services/supabase'
import { showToast } from '../../utils/toastService'

interface LoanOfficer {
  id: string
  name: string
  email: string | null
  headshotUrl: string | null
  joinedAt: string
  partnerships: number
  leads: number
  listings: number
}

interface PendingInvite {
  id: string
  email: string
  name: string | null
  sentAt: string
}

interface OverviewData {
  office: { name: string }
  totals: { loCount: number; partnerships: number; leads: number; listings: number }
  loanOfficers: LoanOfficer[]
  pendingInvites: PendingInvite[]
}

const toRelative = (v: string) => {
  const mins = Math.round((Date.now() - new Date(v).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  if (src) return <img src={src} alt={name} className="rounded-full object-cover flex-shrink-0 border-2 border-white shadow" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full bg-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

const InviteLOModal: React.FC<{ onClose: () => void; onSent: () => void }> = ({ onClose, onSent }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!email.trim()) return
    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(buildApiUrl('/api/office/invite-lo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined })
      })
      if (!res.ok) throw new Error('failed')
      setSent(true)
      showToast.success('Invite sent!')
      setTimeout(() => { onSent(); onClose() }, 1800)
    } catch {
      showToast.error('Failed to send invite. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        {sent ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">📨</div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Invite sent!</h3>
            <p className="text-slate-500 text-sm">They'll get a link to claim their account — already linked to your office.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">Add a Loan Officer</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Enter their email. They'll get a magic link — when they claim it, they're on your team automatically.
            </p>
            <div className="space-y-3 mb-5">
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Loan officer name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Loan officer email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all"
            >
              {sending ? 'Sending…' : 'Send Invite →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

interface Branding {
  companyName: string
  brandColor: string
  logoUrl: string
  leadWebhookUrl: string
  customDomain: string
}

const WhiteLabelCard: React.FC = () => {
  const [b, setB] = useState<Branding>({ companyName: '', brandColor: '#2563eb', logoUrl: '', leadWebhookUrl: '', customDomain: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Convenience: update a field and mark as dirty
  const updateB = (partial: Partial<Branding>) => {
    setB(prev => ({ ...prev, ...partial }))
    setIsDirty(true)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      fetch(buildApiUrl('/api/office/branding'), { headers: { 'x-user-id': user?.id || '' } })
        .then(r => r.json())
        .then((d: { success?: boolean; branding?: Branding }) => { if (d.success && d.branding) setB(d.branding) })
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(buildApiUrl('/api/office/branding'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify(b)
      })
      const j = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !j.success) throw new Error(j.error || 'failed')
      setIsDirty(false)
      showToast.success('Branding saved — live on all your LO pages')
    } catch (e) {
      showToast.error(e instanceof Error && e.message === 'webhook_must_be_https' ? 'Webhook URL must start with https://' : 'Save failed. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const testWebhook = async () => {
    setTesting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(buildApiUrl('/api/office/branding/test-webhook'), {
        method: 'POST', headers: { 'x-user-id': user?.id || '' }
      })
      const j = await res.json() as { success?: boolean; status?: number; error?: string }
      if (j.success) showToast.success(`Webhook OK (HTTP ${j.status})`)
      else showToast.error(j.error === 'no_webhook_configured' ? 'Save a webhook URL first' : `Webhook failed${j.status ? ` (HTTP ${j.status})` : ''}`)
    } catch {
      showToast.error('Webhook test failed')
    } finally {
      setTesting(false)
    }
  }

  if (loading) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">White Label</h2>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-600">Premium</span>
      </div>
      <p className="mb-5 text-sm text-slate-500">Your brand flows to every loan officer's WOW Links, listing dashboards, and chatbots automatically.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Company Name</label>
          <input value={b.companyName} onChange={e => updateB({ companyName: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Summit Mortgage Group" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Brand Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(b.brandColor) ? b.brandColor : '#2563eb'}
              onChange={e => updateB({ brandColor: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200" />
            <input value={b.brandColor} onChange={e => updateB({ brandColor: e.target.value })}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="#2563eb" />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Logo URL</label>
          <input value={b.logoUrl} onChange={e => updateB({ logoUrl: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="https://yourdomain.com/logo.png" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Lead Webhook URL <span className="font-normal text-slate-400">— warm leads POST here (CRM / Zapier / Make)</span>
          </label>
          <div className="flex gap-2">
            <input value={b.leadWebhookUrl} onChange={e => updateB({ leadWebhookUrl: e.target.value })}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://hooks.zapier.com/…" />
            <button onClick={testWebhook} disabled={testing}
              className="flex-shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              {testing ? 'Testing…' : 'Send Test'}
            </button>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Custom Domain <span className="font-normal text-slate-400">— your LOs' public pages load on your domain</span>
          </label>
          <input value={b.customDomain} onChange={e => updateB({ customDomain: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="app.summitmortgage.com" />
          <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600">DNS setup (one-time):</p>
            <p>1. In your DNS provider, add a <strong className="text-slate-700">CNAME</strong> record:</p>
            <p className="pl-3 font-mono text-slate-600">Name: <span className="text-primary-600">app</span> (or your chosen subdomain)</p>
            <p className="pl-3 font-mono text-slate-600">Value: <span className="text-primary-600">homelistingai.com</span></p>
            <p>2. Enter the full hostname above (e.g. <span className="font-mono">app.summitmortgage.com</span>) and save.</p>
            <p>3. DNS propagation takes 5–30 minutes. Your brand loads instantly once it resolves.</p>
          </div>
        </div>
      </div>

      {b.logoUrl && /^https?:\/\//.test(b.logoUrl) && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <span className="text-[11px] font-bold uppercase text-slate-400">Preview</span>
          <img src={b.logoUrl} alt="logo" className="h-8 max-w-[160px] object-contain" />
          <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: /^#[0-9a-fA-F]{6}$/.test(b.brandColor) ? b.brandColor : '#2563eb' }}>
            {b.companyName || 'Your Brand'}
          </span>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button onClick={save} disabled={saving}
          className="relative rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50">
          {isDirty && !saving && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
          )}
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
      </div>
    </div>
  )
}

const OfficeDashboardPage: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(buildApiUrl('/api/office/overview'), { headers: { 'x-user-id': user?.id || '' } })
      const json = await res.json() as { success?: boolean } & OverviewData
      if (!mountedRef.current) return
      if (json.success) setData(json)
    } catch {
      showToast.error('Failed to load office overview')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [load])

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
    </div>
  )

  const totals = data?.totals
  const los = data?.loanOfficers || []
  const pending = data?.pendingInvites || []

  return (
    <div className="space-y-6 p-4 pb-12 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{data?.office.name || 'Office'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totals?.loCount || 0} loan officer{totals?.loCount === 1 ? '' : 's'}
            {pending.length > 0 && ` · ${pending.length} pending`}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700"
        >
          + Add Loan Officer
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { v: totals?.loCount ?? 0, l: 'Loan Officers', i: '👥' },
          { v: totals?.partnerships ?? 0, l: 'Agent Partners', i: '🤝' },
          { v: totals?.leads ?? 0, l: 'Total Leads', i: '🔥' },
          { v: totals?.listings ?? 0, l: 'Listings', i: '🏠' },
        ].map(k => (
          <div key={k.l} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-2xl">{k.i}</div>
            <p className="mt-2 text-3xl font-black text-slate-900">{k.v.toLocaleString()}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.l}</p>
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-amber-700">Pending Invites</p>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.name || p.email}</p>
                  <p className="text-xs text-slate-500">{p.email} · sent {toRelative(p.sentAt)}</p>
                </div>
                <span className="text-xs font-semibold text-amber-600">Awaiting claim</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LO leaderboard */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Loan Officer Performance</h2>
          <span className="text-[11px] text-slate-400">Ranked by leads</span>
        </div>

        {los.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-14 text-center">
            <div className="mb-3 text-5xl">🏢</div>
            <h3 className="font-bold text-slate-700">No loan officers yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">Add your first loan officer — they'll get a link to claim their account, already on your team.</p>
            <button onClick={() => setShowInvite(true)} className="mt-5 rounded-xl bg-primary-600 px-7 py-3 text-sm font-bold text-white hover:bg-primary-700">
              + Add Loan Officer
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {los.map((lo, i) => (
              <div key={lo.id} className={`flex items-center gap-4 p-4 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                <span className="w-5 text-center text-sm font-black text-slate-300">{i + 1}</span>
                <Avatar src={lo.headshotUrl} name={lo.name} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{lo.name}</p>
                  <p className="truncate text-xs text-slate-400">{lo.email || '—'} · joined {new Date(lo.joinedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-shrink-0 gap-5 text-center">
                  <div><p className="text-lg font-black text-slate-900">{lo.partnerships}</p><p className="text-[10px] uppercase text-slate-400">Partners</p></div>
                  <div><p className="text-lg font-black text-red-600">{lo.leads}</p><p className="text-[10px] uppercase text-slate-400">Leads</p></div>
                  <div><p className="text-lg font-black text-slate-900">{lo.listings}</p><p className="text-[10px] uppercase text-slate-400">Listings</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <WhiteLabelCard />

      {showInvite && <InviteLOModal onClose={() => setShowInvite(false)} onSent={load} />}
    </div>
  )
}

export default OfficeDashboardPage
