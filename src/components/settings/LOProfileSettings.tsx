import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../services/supabase'
import { buildApiUrl } from '../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type LOProfile = {
  first_name: string
  last_name: string
  email: string
  phone: string
  headshot_url: string
  logo_url: string
  company: string
  nmls_number: string
  title: string
}

const empty = (): LOProfile => ({
  first_name: '', last_name: '', email: '', phone: '',
  headshot_url: '', logo_url: '', company: '', nmls_number: '', title: ''
})

const fieldCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-slate-400'

const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400'

// ─── Component ─────────────────────────────────────────────────────────────────

const LOProfileSettings: React.FC = () => {
  const [profile, setProfile] = useState<LOProfile>(empty())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const logoRef = useRef<HTMLInputElement | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const res = await fetch(buildApiUrl('/api/agent/profile'), {
          headers: { 'x-user-id': user.id }
        })
        if (!res.ok) throw new Error('fetch_failed')
        const j = await res.json()
        if (!cancelled && j.profile) {
          setProfile({
            first_name: j.profile.first_name || '',
            last_name: j.profile.last_name || '',
            email: j.profile.email || '',
            phone: j.profile.phone || '',
            headshot_url: j.profile.headshot_url || '',
            logo_url: j.profile.logo_url || '',
            company: j.profile.company || '',
            nmls_number: j.profile.nmls_number || '',
            title: j.profile.title || ''
          })
        }
      } catch {
        // silently fail — blank form still usable
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    setSaved(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('unauthenticated')
      const res = await fetch(buildApiUrl('/api/agent/profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(profile)
      })
      if (!res.ok) throw new Error('save_failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Could not save profile. Try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Headshot upload ────────────────────────────────────────────────────────

  const handleHeadshotFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('unauthenticated')
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `lo-headshots/${user.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = urlData?.publicUrl || ''
      setProfile(p => ({ ...p, headshot_url: url }))
    } catch {
      // Fallback to base64 local preview
      const reader = new FileReader()
      reader.onload = () => {
        setProfile(p => ({ ...p, headshot_url: String(reader.result || '') }))
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingLogo(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('unauthenticated')
      const ext = file.name.split('.').pop() || 'png'
      const path = `lo-logos/${user.id}-logo.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      setProfile(p => ({ ...p, logo_url: urlData?.publicUrl || '' }))
    } catch {
      // Fallback to base64 local preview
      const reader = new FileReader()
      reader.onload = () => {
        setProfile(p => ({ ...p, logo_url: String(reader.result || '') }))
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingLogo(false)
    }
  }

  const up = (key: keyof LOProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile(p => ({ ...p, [key]: e.target.value }))

  // ── Missing fields check ───────────────────────────────────────────────────

  const missing: string[] = []
  if (!profile.headshot_url) missing.push('headshot')
  if (!profile.company) missing.push('company')
  if (!profile.nmls_number) missing.push('NMLS #')

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Incomplete profile warning */}
      {missing.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="material-symbols-outlined text-base text-amber-500 mt-0.5 shrink-0">warning</span>
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Your profile is incomplete.</span>{' '}
            Add your {missing.join(', ')} so buyers see your full info on every listing you're co-branded on.
          </p>
        </div>
      )}

      {/* Headshot */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex flex-col items-center gap-2">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 transition hover:border-primary-400"
          >
            {profile.headshot_url ? (
              <img src={profile.headshot_url} alt="Headshot" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                <span className="material-symbols-outlined text-4xl text-slate-300">person</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/75">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs font-semibold text-primary-600 hover:underline"
          >
            {uploading ? 'Uploading…' : profile.headshot_url ? 'Change photo' : 'Upload photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleHeadshotFile} />
        </div>

        <div className="flex-1 space-y-1 text-center sm:text-left">
          <p className="text-lg font-bold text-slate-900">
            {[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Your Name'}
          </p>
          <p className="text-sm text-slate-500">{profile.title || 'Loan Officer'}</p>
          <p className="text-sm text-slate-500">{profile.company || 'Your Company'}</p>
          {profile.nmls_number && (
            <p className="text-xs text-slate-400">NMLS #{profile.nmls_number}</p>
          )}
        </div>
      </div>

      {/* Brokerage Logo */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Brokerage Logo</p>
        <p className="mt-0.5 text-xs text-slate-500">Your lender or team logo — shown alongside your headshot on co-branded listings.</p>
        <div className="mt-3 flex items-center gap-4">
          <div
            onClick={() => logoRef.current?.click()}
            className="relative h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-slate-200 bg-white transition hover:border-primary-400"
          >
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="h-full w-full object-contain p-1" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                <span className="material-symbols-outlined text-2xl text-slate-300">image</span>
              </div>
            )}
            {uploadingLogo && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/75">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              className="text-xs font-semibold text-primary-600 hover:underline"
            >
              {uploadingLogo ? 'Uploading…' : profile.logo_url ? 'Change logo' : 'Upload logo'}
            </button>
            {profile.logo_url && (
              <button
                type="button"
                onClick={() => setProfile(p => ({ ...p, logo_url: '' }))}
                className="text-xs text-slate-400 hover:text-rose-500 transition-colors text-left"
              >
                Remove
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
          </div>
        </div>
        <div className="mt-3">
          <input
            type="url"
            value={profile.logo_url}
            onChange={e => setProfile(p => ({ ...p, logo_url: e.target.value }))}
            className={fieldCls}
            placeholder="https://... (or upload above)"
          />
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Name row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>First Name</label>
          <input value={profile.first_name} onChange={up('first_name')} placeholder="Jane" className={fieldCls} />
        </div>
        <div>
          <label className={label}>Last Name</label>
          <input value={profile.last_name} onChange={up('last_name')} placeholder="Smith" className={fieldCls} />
        </div>
      </div>

      {/* Title + Company */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Title</label>
          <input value={profile.title} onChange={up('title')} placeholder="Loan Officer" className={fieldCls} />
        </div>
        <div>
          <label className={label}>Company / Lender</label>
          <input value={profile.company} onChange={up('company')} placeholder="Rocket Mortgage" className={fieldCls} />
        </div>
      </div>

      {/* NMLS + Phone + Email */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>NMLS #</label>
          <input
            value={profile.nmls_number}
            onChange={up('nmls_number')}
            placeholder="12345678"
            inputMode="numeric"
            className={fieldCls}
          />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input value={profile.phone} onChange={up('phone')} placeholder="(555) 000-0000" className={fieldCls} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input value={profile.email} onChange={up('email')} type="email" placeholder="you@lender.com" className={fieldCls} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm font-medium text-rose-600">{error}</p>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || uploading || uploadingLogo}
          className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Saved!
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        This profile shows on every listing you're co-branded on and in your AI financing bot. Keep it current so buyers see the real you.
      </p>

    </div>
  )
}

export default LOProfileSettings
