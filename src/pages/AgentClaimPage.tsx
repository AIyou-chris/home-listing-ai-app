import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buildApiUrl } from '../lib/api'
import { supabase } from '../services/supabase'

interface InviteInfo {
  email: string
  name: string | null
  claimed: boolean
  lo: {
    name: string
    company: string
    headshotUrl: string | null
    nmlsNumber: string | null
  }
}

const AgentClaimPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return }

    // Demo bypass — show a preview of the claim flow without hitting the DB
    if (token === 'demo') {
      setInvite({
        email: 'you@youragency.com',
        name: 'Sarah Johnson',
        claimed: false,
        lo: {
          name: 'Alex Rivera',
          company: 'Summit Mortgage',
          headshotUrl: null,
          nmlsNumber: '1234567',
        }
      })
      setLoading(false)
      return
    }

    fetch(buildApiUrl(`/api/agent/claim/${token}`))
      .then(r => r.json())
      .then((data: { success?: boolean; invite?: InviteInfo; error?: string }) => {
        if (data.success && data.invite) {
          if (data.invite.claimed) setError('This invite has already been claimed. Please sign in.')
          else setInvite(data.invite)
        } else {
          setError(data.error === 'token_expired' ? 'This invite link has expired. Ask your loan officer to send a new one.' : 'Invalid or expired invite link.')
        }
      })
      .catch(() => setError('Unable to load invite. Check your internet connection.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleClaim = async () => {
    setFormError('')
    if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setFormError('Passwords do not match.'); return }

    // Demo — just show success without hitting the API
    if (token === 'demo') {
      setSubmitting(true)
      await new Promise(r => setTimeout(r, 800))
      setSuccess(true)
      setSubmitting(false)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(buildApiUrl(`/api/agent/claim/${token}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, name: invite?.name })
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        if (data.error === 'email_already_registered') setFormError('This email is already registered. Try signing in instead.')
        else if (data.error === 'already_claimed') setError('This invite has already been claimed.')
        else setFormError('Something went wrong. Try again.')
        return
      }
      setSuccess(true)
      // Sign out any existing session so the LO (or anyone) isn't auto-redirected
      // back to their own dashboard — the new agent must sign in fresh.
      await supabase.auth.signOut().catch(() => {})
      setTimeout(() => navigate('/signin'), 3000)
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#02050D] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#02050D] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-white font-bold text-xl mb-2">Link Issue</h1>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/signin')} className="text-blue-400 text-sm hover:underline">Go to sign in →</button>
      </div>
    </div>
  )

  if (success) return (
    <div className="min-h-screen bg-[#02050D] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-white font-bold text-2xl mb-2">You're in!</h1>
        <p className="text-slate-300 text-sm mb-2">Your account is ready.</p>
        <p className="text-slate-400 text-sm">Sign in with <strong className="text-white">{invite?.email}</strong></p>
        <p className="text-slate-500 text-xs mt-3">Redirecting to sign in…</p>
      </div>
    </div>
  )

  const lo = invite!.lo

  return (
    <div className="min-h-screen bg-[#02050D] flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* LO card */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1e1b4b] to-[#0f172a] border border-white/10 p-6 mb-6 text-center">
          {lo.headshotUrl
            ? <img src={lo.headshotUrl} alt={lo.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-white/20" />
            : <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">{lo.name[0]}</div>
          }
          <p className="text-white font-bold text-lg">{lo.name}</p>
          <p className="text-slate-400 text-sm">{lo.company}</p>
          {lo.nmlsNumber && <p className="text-blue-400 text-xs mt-1">NMLS #{lo.nmlsNumber}</p>}

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-white">{lo.name.split(' ')[0]}</strong> set up a listing platform for you — it's already live. Claim your account to take control of it.
            </p>
          </div>
        </div>

        {/* Claim form */}
        <div className="rounded-2xl bg-white p-6">
          <h2 className="text-slate-900 font-bold text-lg mb-1">Claim your account</h2>
          <p className="text-slate-500 text-sm mb-5">
            {invite!.name && <span>Welcome, <strong>{invite!.name}</strong>. </span>}
            Your email: <strong>{invite!.email}</strong>
          </p>

          <div className="space-y-3 mb-4">
            <input
              type="password"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Create a password (8+ characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <input
              type="password"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleClaim()}
            />
          </div>

          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}

          <button
            onClick={handleClaim}
            disabled={submitting || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all"
          >
            {submitting ? 'Creating account…' : 'Claim My Account →'}
          </button>

          <p className="text-xs text-slate-400 text-center mt-4">
            Already have an account?{' '}
            <button onClick={() => navigate('/signin')} className="text-blue-600 font-semibold hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AgentClaimPage
