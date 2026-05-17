import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buildApiUrl } from '../lib/api'

interface InviteInfo {
  email: string
  name: string | null
  claimed: boolean
  office: { name: string; headshotUrl: string | null }
}

const OfficeInviteClaimPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return }
    fetch(buildApiUrl(`/api/public/office-invite/${token}`))
      .then(r => r.json())
      .then((d: { success?: boolean; error?: string } & Partial<InviteInfo>) => {
        if (d.success && d.office) {
          if (d.claimed) setError('This invite has already been claimed. Please sign in.')
          else setInvite(d as InviteInfo)
        } else {
          setError(d.error === 'invite_expired' ? 'This invite has expired. Ask your office to send a new one.' : 'Invalid or expired invite link.')
        }
      })
      .catch(() => setError('Unable to load invite. Check your connection.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleClaim = async () => {
    setFormError('')
    if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setFormError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      const res = await fetch(buildApiUrl(`/api/public/office-invite/${token}/claim`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        if (data.error === 'email_already_registered') setFormError('This email is already registered. Try signing in instead.')
        else if (data.error === 'already_claimed') setError('This invite has already been claimed.')
        else setFormError('Something went wrong. Try again.')
        return
      }
      setSuccess(true)
      setTimeout(() => navigate('/signin'), 3000)
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#02050D]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-[#02050D] p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 text-5xl">⚠️</div>
        <h1 className="mb-2 text-xl font-bold text-white">Link Issue</h1>
        <p className="mb-6 text-sm text-slate-400">{error}</p>
        <button onClick={() => navigate('/signin')} className="text-sm text-blue-400 hover:underline">Go to sign in →</button>
      </div>
    </div>
  )

  if (success) return (
    <div className="flex min-h-screen items-center justify-center bg-[#02050D] p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="mb-2 text-xl font-bold text-white">You're on the team!</h1>
        <p className="text-sm text-slate-400">Account created. Taking you to sign in…</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#02050D] p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <div className="mb-6 text-center">
          {invite?.office.headshotUrl
            ? <img src={invite.office.headshotUrl} alt={invite.office.name} className="mx-auto mb-3 h-14 w-14 rounded-full object-cover" />
            : <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl">🏢</div>}
          <p className="text-xs font-bold uppercase tracking-widest text-blue-400">{invite?.office.name}</p>
          <h1 className="mt-2 text-2xl font-black text-white">Claim your account</h1>
          <p className="mt-1 text-sm text-slate-400">You've been added as a loan officer. Set a password to get started.</p>
        </div>
        <div className="space-y-3">
          <input
            value={invite?.email || ''}
            disabled
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400"
          />
          <input
            type="password"
            placeholder="Create a password (8+ characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleClaim()}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <button
            onClick={handleClaim}
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Claim Account →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OfficeInviteClaimPage
