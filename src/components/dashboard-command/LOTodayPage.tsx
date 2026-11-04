import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode'
import { buildApiUrl } from '../../lib/api'
import { authHeaders } from '../../services/dashboard/utils'
import CallNowHero from './CallNowHero'
import { CallTextButtons, WaitingBadge } from './LeadActions'
import type { DashboardLeadItem } from '../../services/dashboardCommandService'
import { markLoLeadContacted, setLoLeadFollowUp } from '../../services/loLeads'
import { LoIcon, LoIconTile, LoPageHeader, LoSectionCard, LoStat, LoTag, loGhost, loInput, loSolid } from './loUi'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LOStats {
  totalLeads: number
  newToday: number
  newThisWeek: number
  newThisMonth: number
  preApprovalLeads: number
  showingLeads: number
  assignedListings: number
  partnersReached: number
  partnersOpened?: number
  hotLeads?: number
}

const toIntentLevel = (value: string): 'Hot' | 'Warm' | 'Cold' => {
  const v = String(value || '').toLowerCase()
  return v === 'hot' ? 'Hot' : v === 'cold' ? 'Cold' : 'Warm'
}

interface RecentLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  intentLevel: string
  intentReason?: string | null
  context: string
  sourceType: string
  listingId: string | null
  createdAt: string
}

interface AssignedListing {
  listingId: string
  brandingEnabled: boolean
  assignedAt: string
  address: string
  price: number | null
  status: string
  heroPhoto: string | null
  leadCount: number
}

interface AiCallSummary {
  id: string
  name: string | null
  from: string | null
  summary: string | null
  intent: string | null
  leadId: string | null
  startedAt: string
}

interface FollowUp { id: string; name: string; phone: string | null; dueAt: string | null }

interface LODashboardData {
  followUps?: FollowUp[]
  followUpsUpcoming?: number
  stats: LOStats
  recentLeads: RecentLead[]
  assignedListings: AssignedListing[]
  aiCalls?: { today: number; week: number; recent: AiCallSummary[] }
  brain?: { active: boolean; hasKnowledge: boolean }
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_DATA: LODashboardData = {
  followUps: [{ id: 'f1', name: 'Tom Rivera', phone: '(512) 555-0142', dueAt: new Date().toISOString() }],
  followUpsUpcoming: 3,
  stats: {
    totalLeads: 24,
    newToday: 3,
    newThisWeek: 9,
    newThisMonth: 24,
    preApprovalLeads: 14,
    showingLeads: 10,
    assignedListings: 4,
    partnersReached: 7,
    partnersOpened: 5,
    hotLeads: 6
  },
  recentLeads: [
    { id: '1', name: 'Jordan Kim', email: 'jordan@email.com', phone: '(512) 900-4421', status: 'New', intentLevel: 'Hot', context: 'pre_approval', sourceType: 'listing_page', listingId: 'l1', createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
    { id: '2', name: 'Maria Santos', email: 'maria@email.com', phone: '(737) 214-8830', status: 'New', intentLevel: 'Warm', context: 'showing_request', sourceType: 'listing_page', listingId: 'l2', createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: '3', name: 'Derek Okafor', email: 'derek@email.com', phone: null, status: 'Contacted', intentLevel: 'Warm', context: 'pre_approval', sourceType: 'listing_page', listingId: 'l1', createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: '4', name: 'Ashley Chen', email: 'ashley@email.com', phone: '(512) 771-0033', status: 'New', intentLevel: 'Hot', context: 'pre_approval', sourceType: 'listing_page', listingId: 'l3', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: '5', name: 'Tom Rivera', email: 'tom@email.com', phone: null, status: 'Nurturing', intentLevel: 'Cold', context: 'general_info', sourceType: 'listing_page', listingId: 'l2', createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
  ],
  aiCalls: {
    today: 2,
    week: 7,
    recent: [
      { id: 'c1', name: 'Priya Nair', from: '(512) 555-0188', summary: 'Asked about VA loan eligibility and wants a call back about a $450k home.', intent: 'hot', leadId: null, startedAt: new Date(Date.now() - 55 * 60000).toISOString() },
      { id: 'c2', name: null, from: '(737) 555-0114', summary: 'Wanted to know the down payment on the Barton Hills home.', intent: 'warm', leadId: null, startedAt: new Date(Date.now() - 4 * 3600000).toISOString() }
    ]
  },
  brain: { active: true, hasKnowledge: true },
  assignedListings: [
    { listingId: 'l1', brandingEnabled: true, assignedAt: new Date().toISOString(), address: '4821 Ridgecrest Dr, Austin TX', price: 875000, status: 'published', heroPhoto: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=400&auto=format&fit=crop', leadCount: 14 },
    { listingId: 'l2', brandingEnabled: true, assignedAt: new Date().toISOString(), address: '2203 Barton Hills Dr, Austin TX', price: 1150000, status: 'published', heroPhoto: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=400&auto=format&fit=crop', leadCount: 7 },
    { listingId: 'l3', brandingEnabled: false, assignedAt: new Date().toISOString(), address: '908 W 12th St, Austin TX', price: 620000, status: 'published', heroPhoto: null, leadCount: 3 },
    { listingId: 'l4', brandingEnabled: true, assignedAt: new Date().toISOString(), address: '1407 Travis Heights Blvd, Austin TX', price: 490000, status: 'draft', heroPhoto: null, leadCount: 0 },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toRelativeTime = (value?: string | null) => {
  if (!value) return 'just now'
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

const formatPrice = (price: number | null) => {
  if (!price) return '—'
  return `$${(price / 1000).toFixed(0)}k`
}

const contextLabel = (context: string) => {
  if (context === 'pre_approval') return { label: 'Pre-Approval', color: 'text-emerald-800 bg-emerald-50 border-emerald-200' }
  if (context === 'showing_request') return { label: 'Showing', color: 'text-sky-800 bg-sky-50 border-sky-200' }
  return { label: 'General', color: 'text-slate-700 bg-slate-50 border-slate-200' }
}

const intentColor = (level: string) => {
  if (level === 'Hot') return 'bg-red-500'
  if (level === 'Warm') return 'bg-amber-400'
  return 'bg-slate-500'
}

const dayPart = () => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

// ─── Testimonial ask ──────────────────────────────────────────────────────────
// Shown once the LO has real leads (totalLeads >= 2 at the render site).
// One-time: submitting or dismissing sets a localStorage flag. Quotes land
// unapproved in lo_testimonials + email the founder.
const TESTIMONIAL_FLAG = 'hlai_testimonial_prompt';

const LoTestimonialAsk: React.FC = () => {
  const [state, setState] = useState<'idle' | 'open' | 'sending' | 'done' | 'hidden'>(() => {
    try { return localStorage.getItem(TESTIMONIAL_FLAG) ? 'hidden' : 'idle'; } catch { return 'idle'; }
  });
  const [quote, setQuote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const remember = (v: string) => { try { localStorage.setItem(TESTIMONIAL_FLAG, v); } catch { /* private mode */ } };

  const submit = async () => {
    if (quote.trim().length < 10) { setError('Give us at least a sentence.'); return; }
    setState('sending');
    setError(null);
    try {
      const headers = await authHeaders(null);
      const res = await fetch(buildApiUrl('/api/lo/testimonial'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ quote: quote.trim() })
      });
      if (!res.ok) throw new Error('save_failed');
      remember('submitted');
      setState('done');
    } catch {
      setState('open');
      setError("Couldn't save — try again in a minute.");
    }
  };

  if (state === 'hidden') return null;
  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
        <span className="inline-flex items-center gap-2"><LoIcon name="favorite" className="text-xl" />Thank you! We'll check with you before using your quote anywhere.</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <LoIconTile name="reviews" tone="amber" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-slate-900">You're getting leads. Mind sharing a sentence about it?</p>
          <p className="mt-0.5 text-sm text-slate-600">Real words from real LOs are the only marketing we'll ever run. We'll ask before quoting you.</p>
        </div>
        <button
          onClick={() => { remember('dismissed'); setState('hidden'); }}
          className={`${loGhost} flex-shrink-0 !px-3 text-xs`}
        >
          No thanks
        </button>
      </div>
      {state === 'idle' ? (
        <button
          onClick={() => setState('open')}
          className={`${loGhost} mt-4`}
        >
          Sure, I'll say something
        </button>
      ) : (
        <div className="mt-4">
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            maxLength={600}
            rows={3}
            placeholder='e.g. "Two warm leads in my first week — from listings I didn&apos;t pay a dime to advertise."'
            className={loInput}
          />
          {error && <p className="mt-1 text-xs font-semibold text-red-700">{error}</p>}
          <button
            onClick={submit}
            disabled={state === 'sending'}
            className={`${loGhost} mt-2`}
          >
            {state === 'sending' ? 'Sending…' : 'Send it'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── AI activity ──────────────────────────────────────────────────────────────
// Shows the LO what their AI did for them: calls it answered, and a nudge if it is off or untrained.

const AiActivityCard: React.FC<{ data: LODashboardData; navTo: (p: string) => void }> = ({ data, navTo }) => {
  const calls = data.aiCalls
  const brain = data.brain
  const recent = calls?.recent ?? []
  if (!calls && !brain) return null
  return (
    <LoSectionCard icon="psychology" title="Your AI" description="What your AI did while you were busy.">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {brain && <LoTag tone={brain.active ? 'green' : 'red'}>{brain.active ? 'ON' : 'OFF'}</LoTag>}
          <button onClick={() => navTo('/lo-chatbot')} className={`${loGhost} ml-auto`}>Open AI Brain<LoIcon name="arrow_forward" className="text-base" /></button>
        </div>
        {brain && !brain.active && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-800">
            Your AI is off. Buyers are sent to you and calls ring your cell. Turn it on from the Listings page.
          </p>
        )}
        {brain && brain.active && !brain.hasKnowledge && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900">
            Your AI has nothing to read yet. Add your rate sheet and loan programs so it answers like you.{' '}
            <button onClick={() => navTo('/lo-chatbot')} className={`${loGhost} mt-2 !bg-white`}>Teach it now</button>
          </p>
        )}
        {calls && (
          <p className="text-sm text-slate-700">
            <span className="text-2xl font-black text-slate-900">{calls.today}</span>{' '}
            call{calls.today === 1 ? '' : 's'} answered today
            <span className="text-slate-600"> · {calls.week} this week</span>
          </p>
        )}
        {recent.length > 0 ? (
          <ul className="grid gap-2">
            {recent.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => navTo(c.leadId ? `/lo-leads?lead=${c.leadId}` : '/lo-chatbot')}
                  className="flex min-h-[44px] w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-primary-400"
                >
                  <span className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700" aria-hidden="true">call</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-slate-900">{c.name || c.from || 'Unknown caller'}</span>
                    <span className="line-clamp-2 text-xs text-slate-600">{c.summary || 'No summary yet'}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs text-slate-600">{toRelativeTime(c.startedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          calls && <p className="text-sm text-slate-600">No calls yet. When a buyer calls your AI number, the summary shows up here.</p>
        )}
      </div>
    </LoSectionCard>
  )
}

// ─── Setup Checklist ──────────────────────────────────────────────────────────

interface LOSetupState {
  profileDone: boolean
  partnerInvited: boolean
  onboardingCompleted: boolean
}

const LOSetupChecklist: React.FC<{ setup: LOSetupState; onDismiss: () => void; navTo: (p: string) => void }> = ({ setup, onDismiss, navTo }) => {
  const steps = [
    {
      label: 'Complete your LO profile',
      sub: 'Add your name, NMLS #, company, and headshot',
      done: setup.profileDone,
      action: () => navTo('/lo-onboarding'),
    },
    {
      label: 'Invite your first agent partner',
      sub: 'Send a WOW Link — give an agent\'s listing an AI upgrade',
      done: setup.partnerInvited,
      action: () => navTo('/lo-partners'),
    },
    {
      label: 'You\'re live — start capturing leads',
      sub: 'Your AI financing chatbot is active on every listing',
      done: setup.onboardingCompleted,
      action: () => navTo('/lo-listings'),
    },
  ]
  const doneCount = steps.filter(s => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <LoSectionCard icon="rocket_launch" title={`Get set up: ${doneCount} of ${steps.length} done`} description="Finish these steps to start getting warm leads from your agent partners.">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary-100">
          <div className="h-full rounded-full bg-primary-600 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <button onClick={onDismiss} className={`${loGhost} !px-3 text-xs`} title="Dismiss" aria-label="Dismiss">Dismiss</button>
      </div>
      <ul className="grid gap-2" aria-label="Setup checks">
        {steps.map((step, i) => (
          <li key={i}>
            <div
              className={`flex min-h-[44px] flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 ${!step.done ? 'cursor-pointer transition hover:border-primary-400' : ''}`}
              onClick={!step.done ? step.action : undefined}
            >
              <LoIcon name={step.done ? 'check_circle' : 'radio_button_unchecked'} className={`text-2xl ${step.done ? 'text-green-600' : 'text-amber-500'}`} />
              <div className="min-w-0 flex-1 basis-48">
                <p className={`text-sm font-extrabold ${step.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{step.label}</p>
                <p className="text-xs text-slate-600">{step.sub}</p>
              </div>
              {step.done ? <LoTag tone="green">Done</LoTag> : <span className="text-xs font-semibold text-primary-700">Start →</span>}
            </div>
          </li>
        ))}
      </ul>
    </LoSectionCard>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const LOTodayPage: React.FC = () => {
  const navigate = useNavigate()
  const demoMode = useDemoMode()
  const [data, setData] = useState<LODashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [setup, setSetup] = useState<LOSetupState | null>(null)
  const [setupDismissed, setSetupDismissed] = useState(false)
  const mountedRef = useRef(true)

  const navTo = useCallback((path: string) => {
    navigate(buildDashboardPath(path, demoMode))
  }, [navigate, demoMode])

  const load = useCallback(async () => {
    if (demoMode) {
      setData(DEMO_DATA)
      setLoading(false)
      return
    }

    try {
      const headers = await authHeaders(null)

      // Fetch dashboard + onboarding state in parallel
      const [res, onboardingRes] = await Promise.all([
        fetch(buildApiUrl('/api/lo/dashboard/today'), { headers }),
        fetch(buildApiUrl('/api/dashboard/onboarding'), { headers }).catch(() => null),
      ])

      if (!res.ok) throw new Error('fetch_failed')
      const json = await res.json() as { success: boolean; loProfileComplete?: boolean; partnerInvited?: boolean } & LODashboardData
      if (!mountedRef.current) return
      setData(json)

      // Parse onboarding completed flag (we only need this one field from onboarding)
      let obCompleted = false
      if (onboardingRes?.ok) {
        const ob = await onboardingRes.json().catch(() => null) as { onboarding_completed?: boolean } | null
        obCompleted = Boolean(ob?.onboarding_completed)
      }

      // Use authoritative flags from the dashboard API:
      //   loProfileComplete = checks lo_chatbot_configs.full_name (not the signup name, which was a false positive)
      //   partnerInvited    = checks agent_invites count > 0
      const profileDone = Boolean(json.loProfileComplete)
      const partnerInvited = Boolean(json.partnerInvited || (json.stats?.partnersReached ?? 0) > 0)
      const allDone = profileDone && partnerInvited && obCompleted

      setSetup({ profileDone, partnerInvited, onboardingCompleted: obCompleted })
      if (allDone) setSetupDismissed(true)
    } catch (err) {
      console.error('[LOToday] load failed', err)
      if (mountedRef.current) setError('Failed to load dashboard')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [demoMode])

  // Call/Text tapped: the lead is no longer waiting. Update the screen now, tell the server in the background.
  const handleCalled = useCallback((leadId: string) => {
    setData((prev) => prev ? {
      ...prev,
      recentLeads: prev.recentLeads.map((l) => (l.id === leadId && String(l.status).toLowerCase() === 'new') ? { ...l, status: 'Contacted' } : l)
    } : prev)
    if (!demoMode) void markLoLeadContacted(leadId)
  }, [demoMode])

  // "Time to check back" row: done or snooze 1 month. Updates the screen now, tells the server in the background.
  const handleFollowUp = useCallback((leadId: string, days: number | null) => {
    setData((prev) => prev ? { ...prev, followUps: (prev.followUps || []).filter((f) => f.id !== leadId), followUpsUpcoming: (prev.followUpsUpcoming || 0) + (days ? 1 : 0) } : prev)
    if (!demoMode) void setLoLeadFollowUp(leadId, days)
  }, [demoMode])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [load])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-slate-600">
        <p>{error || 'No data available'}</p>
        <button
          onClick={() => { setError(null); setLoading(true); void load() }}
          className={loSolid}
        >
          Try again
        </button>
      </div>
    )
  }

  const { stats, recentLeads } = data
  // The one lead to call right now: a new one, Hot first, then newest.
  const heroSource = recentLeads
    .filter((l) => String(l.status).toLowerCase() === 'new')
    .sort((a, b) => (toIntentLevel(a.intentLevel) === 'Hot' ? 0 : 1) - (toIntentLevel(b.intentLevel) === 'Hot' ? 0 : 1) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  const heroListing = data.assignedListings.find((listing) => listing.listingId === heroSource?.listingId)
  const heroLead: DashboardLeadItem | null = heroSource ? {
    id: heroSource.id, name: heroSource.name, phone: heroSource.phone, email: heroSource.email, status: heroSource.status,
    source_type: heroSource.sourceType, intent_level: toIntentLevel(heroSource.intentLevel), intent_score: 0, timeline: 'unknown', financing: 'unknown',
    lead_summary: null, next_best_action: null, intent_reason: heroSource.intentReason || null, can_ask_lo: false,
    last_activity_at: heroSource.createdAt, last_activity_relative: '', last_message_preview: null, created_at: heroSource.createdAt,
    listing_id: heroSource.listingId, listing: heroListing ? { id: heroListing.listingId, address: heroListing.address } : null
  } : null
  // Live homes first. Unfinished drafts collapse into one line instead of cluttering the list.
  const assignedListings = data.assignedListings.filter((l) => l.status === 'published')
  // Only real drafts count as "not live yet". Sold and archived homes are simply finished.
  const draftCount = data.assignedListings.filter((l) => l.status === 'draft').length

  const wowCard = (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-primary-200 bg-primary-50 p-5 shadow-sm sm:flex-row sm:items-center">
      <LoIconTile name="send" />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-extrabold text-slate-900">Get your next warm lead</h2>
        <p className="text-sm text-slate-600">Send an agent a WOW link. Their buyers chat with your AI, and you get the lead.</p>
      </div>
      <button onClick={() => navTo('/lo-partners')} className={`${heroLead ? loGhost : loSolid} shrink-0`}>
        <LoIcon name="send" className="text-lg" />Send a WOW link
      </button>
    </div>
  )

  const followUps = data.followUps || []

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-24">

      {/* ── Greeting ─────────────────────────────────────────────────────────── */}
      <LoPageHeader
        title="Today"
        subtitle={`Good ${dayPart()}. Here is your pipeline across ${stats.assignedListings} listing${stats.assignedListings !== 1 ? 's' : ''}.`}
      />

      {heroLead && <CallNowHero lead={heroLead} onOpen={(id) => navTo(`/lo-leads?lead=${id}`)} onCalled={handleCalled} />}
      {!heroLead && wowCard}

      {/* ── Numbers ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        <LoStat value={stats.newToday} label="New today" />
        <LoStat value={<span className="text-rose-700">{stats.hotLeads ?? 0}</span>} label="Hot leads" />
        <LoStat value={stats.partnersReached ?? 0} label="Agents reached" />
      </div>

      {/* ── Setup Checklist (shown until onboarding complete or dismissed) ────── */}
      {setup && !setupDismissed && (
        <LOSetupChecklist
          setup={setup}
          onDismiss={() => setSetupDismissed(true)}
          navTo={navTo}
        />
      )}

      {/* ── Buyers who said "not yet" and are due for a check-in ─────────────── */}
      {followUps.length > 0 && (
        <LoSectionCard icon="schedule" title={`Time to check back (${followUps.length})`} description="You said you would follow up with these people." tone="amber">
          <div className="grid gap-2">
            {followUps.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <button type="button" onClick={() => navTo(`/lo-leads?lead=${f.id}`)} className="min-h-[44px] min-w-0 flex-1 basis-40 truncate text-left text-sm font-extrabold text-slate-900 hover:text-primary-700">{f.name}</button>
                <CallTextButtons phone={f.phone} onUsed={() => handleCalled(f.id)} />
                <button type="button" onClick={() => handleFollowUp(f.id, 30)} className={loGhost}>Later</button>
                <button type="button" onClick={() => handleFollowUp(f.id, null)} className={loGhost}>Done</button>
              </div>
            ))}
          </div>
        </LoSectionCard>
      )}

      {/* ── What the AI did while you were busy ──────────────────────────────── */}
      {data.brain && (!data.brain.active || !data.brain.hasKnowledge) && <AiActivityCard data={data} navTo={navTo} />}

      {/* ── Testimonial ask (once they're getting real leads) ─────────────────── */}
      {stats.totalLeads >= 2 && <LoTestimonialAsk />}

      {!demoMode && (
        <button type="button" onClick={() => navTo('/lo-promote')} className="flex min-h-[44px] w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-400">
          <LoIconTile name="share" />
          <span className="min-w-0 flex-1"><span className="block text-lg font-extrabold text-slate-900">Your personal link</span><span className="block text-sm text-slate-600">Get requests without an agent. Copy it, share the QR, post it.</span></span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-primary-700">Open<LoIcon name="arrow_forward" className="text-base" /></span>
        </button>
      )}

      {/* ── Two column layout ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Recent leads — wider col */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3" aria-label="Recent leads">
          <div className="flex items-center gap-3 px-5 pt-5">
            <LoIconTile name="group" />
            <h2 className="min-w-0 flex-1 text-lg font-extrabold text-slate-900">Recent Leads</h2>
            <button onClick={() => navTo('/lo-leads')} className={loGhost}>View all<LoIcon name="arrow_forward" className="text-base" /></button>
          </div>

          {recentLeads.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-600">
              <p>No leads yet. The fastest way to get one:</p>
              <button onClick={() => navTo('/lo-partners')} className={`${heroLead ? loGhost : loSolid} mt-4`}>
                <LoIcon name="send" className="text-lg" />Send a WOW link to an agent
              </button>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {recentLeads.map(lead => {
                const ctx = contextLabel(lead.context)
                const subline = lead.intentReason || lead.email || lead.phone || 'No contact info'
                return (
                  <li
                    key={lead.id}
                    className="cursor-pointer px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5"
                    onClick={() => navTo(`/lo-leads?lead=${lead.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${intentColor(lead.intentLevel)}`} title={`${toIntentLevel(lead.intentLevel)} lead`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-sm font-extrabold text-slate-900">{lead.name}</p>
                          <span className={`flex-shrink-0 rounded-md border px-2 py-0.5 text-xs font-bold ${ctx.color}`}>{ctx.label}</span>
                          <WaitingBadge lead={{ status: lead.status, created_at: lead.createdAt, intent_level: toIntentLevel(lead.intentLevel) }} />
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{subline}</p>
                      </div>
                      <span className="flex-shrink-0 pt-0.5 text-xs text-slate-600">{toRelativeTime(lead.createdAt)}</span>
                    </div>
                    {lead.phone && (
                      <div className="mt-2.5 flex gap-2 pl-[22px]" onClick={(e) => e.stopPropagation()}>
                        <CallTextButtons phone={lead.phone} onUsed={() => handleCalled(lead.id)} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Assigned listings — narrower col */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2" aria-label="My listings">
          <div className="flex items-center gap-3 px-5 pt-5">
            <LoIconTile name="home" tone="green" />
            <h2 className="min-w-0 flex-1 text-lg font-extrabold text-slate-900">My Listings</h2>
            <button onClick={() => navTo('/lo-listings')} className={loGhost}>Manage<LoIcon name="arrow_forward" className="text-base" /></button>
          </div>

          {assignedListings.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-600">
              {draftCount > 0 ? `No live listings yet (${draftCount} in draft) — ` : 'No listings yet — '}{' '}
              <button onClick={() => navTo('/lo-listings')} className="font-bold text-primary-700 hover:underline">
                {draftCount > 0 ? 'finish one' : 'add one'}
              </button>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {assignedListings.map(listing => (
                <li
                  key={listing.listingId}
                  className="flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                  onClick={() => navTo('/lo-listings')}
                >
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {listing.heroPhoto
                      ? <img src={listing.heroPhoto} alt="" className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center bg-primary-50 text-primary-700"><LoIcon name="home" className="text-xl" /></div>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold leading-snug text-slate-900">{listing.address}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-slate-600">{formatPrice(listing.price)}</span>
                      {listing.status === 'published'
                        ? <LoTag tone="green">● Live</LoTag>
                        : <LoTag tone="slate">Draft</LoTag>
                      }
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-black text-slate-900">{listing.leadCount}</p>
                    <p className="text-xs text-slate-600">leads</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {assignedListings.length > 0 && draftCount > 0 && (
            <button
              onClick={() => navTo('/lo-listings')}
              className="min-h-[44px] w-full border-t border-slate-100 px-4 py-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {draftCount} draft{draftCount !== 1 ? 's' : ''} not live yet — finish →
            </button>
          )}
        </section>
      </div>

      {heroLead && wowCard}

    </div>
  )
}

export default LOTodayPage
