import React, { useEffect, useState } from 'react'
import { buildApiUrl } from '../../lib/api'
import { showToast } from '../../utils/toastService'
import { supabase } from '../../services/supabase'

interface OfficeRow {
  id: string
  company: string | null
  email: string | null
  brandColor: string | null
  logoUrl: string | null
  customDomain: string | null
  loCount: number
}

const AdminWhiteLabelPage: React.FC = () => {
  const [offices, setOffices] = useState<OfficeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(buildApiUrl('/api/admin/white-label/offices'), {
        headers: { 'x-user-id': user?.id || '' }
      })
      const j = await res.json() as { success?: boolean; offices?: OfficeRow[] }
      if (j.success && j.offices) setOffices(j.offices)
    } catch {
      showToast.error('Failed to load offices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const saveDomain = async (officeId: string) => {
    const domain = (editing[officeId] ?? '').trim()
    setSaving(officeId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(buildApiUrl(`/api/admin/white-label/offices/${officeId}/domain`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ customDomain: domain || null })
      })
      const j = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !j.success) throw new Error(j.error || 'failed')
      setOffices(prev => prev.map(o => o.id === officeId ? { ...o, customDomain: domain || null } : o))
      setEditing(prev => { const n = { ...prev }; delete n[officeId]; return n })
      showToast.success(domain ? `Domain set: ${domain}` : 'Domain cleared')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'failed'
      if (msg === 'domain_in_use') showToast.error('That domain is already assigned to another office.')
      else showToast.error('Save failed. Try again.')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">White Label — Office Domains</h2>
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-600">{offices.length} offices</span>
        </div>
        <p className="mb-5 text-sm text-slate-500">
          Assign a custom domain to any office account. The office and all its LOs will resolve under that hostname.
        </p>

        {offices.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <div className="mb-2 text-4xl">🏢</div>
            <p className="font-bold text-slate-700">No office accounts yet</p>
            <p className="mt-1 text-sm text-slate-400">Office accounts appear here once created.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {offices.map((o, i) => {
              const currentDomain = editing[o.id] !== undefined ? editing[o.id] : (o.customDomain || '')
              const isDirty = editing[o.id] !== undefined && editing[o.id] !== (o.customDomain || '')
              return (
                <div key={o.id} className={`p-4 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    {/* Office identity */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {o.logoUrl ? (
                        <img src={o.logoUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-contain" />
                      ) : (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: o.brandColor || '#2563eb' }}>
                          {(o.company || 'O')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{o.company || '(no name)'}</p>
                        <p className="truncate text-xs text-slate-400">{o.email || '—'} · {o.loCount} LO{o.loCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Domain input + save */}
                    <div className="flex items-center gap-2 sm:w-80">
                      <input
                        value={currentDomain}
                        onChange={e => setEditing(prev => ({ ...prev, [o.id]: e.target.value }))}
                        placeholder="app.theirsite.com"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        onKeyDown={e => e.key === 'Enter' && isDirty && saveDomain(o.id)}
                      />
                      {isDirty && (
                        <button
                          onClick={() => saveDomain(o.id)}
                          disabled={saving === o.id}
                          className="flex-shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
                        >
                          {saving === o.id ? '…' : 'Save'}
                        </button>
                      )}
                      {!isDirty && o.customDomain && (
                        <span className="flex-shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">Live</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">DNS Setup Instructions</h3>
        <ol className="space-y-1.5 text-sm text-slate-600 list-decimal list-inside">
          <li>Add a <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">CNAME</code> record pointing your subdomain at <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{window.location.hostname}</code></li>
          <li>Enter the subdomain in the field above and click Save</li>
          <li>Allow up to 5 minutes for DNS to propagate</li>
          <li>The office's LOs will automatically resolve under the custom hostname</li>
        </ol>
      </div>
    </div>
  )
}

export default AdminWhiteLabelPage
