import React, { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// PageGuide — a per-page "how to use this page + pro tips" helper.
//
// Three states, remembered per page in localStorage:
//   • expanded   — full card with steps + pro tips
//   • collapsed  — just the header bar (click to re-expand)
//   • dismissed  — shrinks to a small "Page guide" pill that restores it
//
// Matches the dashboard design system: white rounded-2xl card, slate text,
// primary-600 brand accent. Drop onto any page with <PageGuide pageKey="..." />;
// all copy lives in PAGE_GUIDES below so adding/editing a guide is one place.
// ─────────────────────────────────────────────────────────────────────────────

type GuideState = 'expanded' | 'collapsed' | 'dismissed'

interface GuideContent {
  title: string
  subtitle: string
  steps: string[]
  proTips: string[]
}

const PAGE_GUIDES: Record<string, GuideContent> = {
  // ── Agent pages ──
  today: {
    title: 'How to use Today',
    subtitle: 'Your daily command center — start here every morning.',
    steps: [
      'Scan the top cards for what needs you right now: new warm leads, today’s appointments, and anything overdue.',
      'Tap any lead or appointment to jump straight into it — no hunting through menus.',
      'Work the hot leads first. Speed of first contact is the single biggest driver of whether a lead converts.'
    ],
    proTips: [
      'Make this your first tab every morning. Two minutes here sets up your whole day.',
      'A lead that came in overnight and gets a call before 9am closes far more often than one you reach at noon.'
    ]
  },
  'command-center': {
    title: 'How to use the Command Center',
    subtitle: 'The big-picture view of your pipeline health.',
    steps: [
      'Read the top-line numbers to see how your leads, listings, and conversions are trending.',
      'Use the charts to spot where buyers drop off — that’s where a small fix wins the most deals.',
      'Compare time ranges (7 vs 30 days) to tell a real trend apart from a slow week.'
    ],
    proTips: [
      'Check this weekly, not daily — trends matter more than any single day’s numbers.',
      'If one listing is pulling most of your leads, make more share kits for it. Double down on what’s working.'
    ]
  },
  leads: {
    title: 'How to use Leads',
    subtitle: 'Every buyer who raised their hand, sorted by what matters most.',
    steps: [
      'Leads are auto-sorted: Hot and New float to the top so you never miss a live one.',
      'Open a lead to see the full chat history — you’ll know exactly what they asked before you call.',
      'Update the status as you work them (contacted, booked, etc.) so your pipeline stays honest.',
      'Use Export CSV any time you want to pull leads into another tool.'
    ],
    proTips: [
      'Call Hot leads within the hour — within 5 minutes if you can. It can 10x your conversion.',
      'These aren’t cold lists. Every lead already engaged with a real listing, so lead with the home they were looking at.'
    ]
  },
  appointments: {
    title: 'How to use Appointments',
    subtitle: 'Showings and calls, all in one place.',
    steps: [
      'See every upcoming appointment at a glance, with the buyer and listing attached.',
      'Confirm or reschedule right from the card — the buyer gets the update automatically.',
      'Reminders go out before each appointment so fewer people no-show.'
    ],
    proTips: [
      'Send a quick personal text the morning of a showing — confirmed buyers show up far more often.',
      'Block your own prep time around back-to-back showings so you’re never rushing in cold.'
    ]
  },
  listings: {
    title: 'How to use Listings',
    subtitle: 'Build, manage, and share your AI-powered listings.',
    steps: [
      'Click New Listing and enter an address — the AI writes the description and builds the page for you.',
      'Open any listing to edit details, photos, and the People tab (you + your loan officer).',
      'Use Share Kit to grab a QR code, flyer, and social assets — every share routes leads back to you.',
      'Mark a listing Sold when it closes to keep your active list clean.'
    ],
    proTips: [
      'Post your listing link in local Facebook groups — the built-in chatbot captures buyers 24/7.',
      'Attach your loan officer to every listing. Co-branding makes you both look like a full-service team.'
    ]
  },
  // ── Loan-officer pages ──
  'lo-today': {
    title: 'How to use Today',
    subtitle: 'Your daily snapshot — warm leads and partner activity.',
    steps: [
      'Check new warm leads first — these are buyers who engaged with your partner agents’ listings.',
      'Review partner and listing activity to see which agents are driving the most buyers.',
      'Jump straight into any lead to call or text while they’re still hot.'
    ],
    proTips: [
      'Start your day here. The LOs who win are the ones who call warm leads first.',
      'Notice which agent sends you the most leads, and invest more in that partnership.'
    ]
  },
  'lo-listings': {
    title: 'How to use My Listings',
    subtitle: 'Listings you’re co-branded on, plus your financing info.',
    steps: [
      'When a partner agent builds a listing, it appears here automatically — co-branded to you.',
      'Open a listing and add your financing info (rate sheet + notes) so the bot quotes your numbers.',
      'Use “Build a Listing” to create your own from scratch, co-branded to you automatically.',
      'Search any agent’s listing to add yourself and start capturing its buyers.'
    ],
    proTips: [
      'Upload a fresh rate sheet whenever rates change — buyers always see current numbers.',
      'Share a listing’s Live Dashboard link with the agent. When they see the leads you generate, you’re indispensable.'
    ]
  },
  'lo-partners': {
    title: 'How to use Partners',
    subtitle: 'The agent relationships that fill your pipeline.',
    steps: [
      'Invite an agent and send them a WOW Link — a live, co-branded listing demo, not a cold pitch.',
      'Track who’s opened their invite; auto-reminders nudge the ones who haven’t.',
      'Once they claim their account, every listing they build feeds warm buyers back to you.'
    ],
    proTips: [
      'Start with the one agent you already talk to most. One “yes” shows you exactly how this works.',
      'Warm partnerships convert 10x faster than cold outreach — same rule as leads.'
    ]
  },
  'lo-chatbot': {
    title: 'How to set up your AI Bot',
    subtitle: 'Your 24/7 financing assistant on every listing.',
    steps: [
      'Set your bot’s name, greeting, and tone so it sounds like you.',
      'Upload your compliance rules — the bot follows them in every conversation.',
      'Add your most common buyer FAQs so it answers them perfectly while you sleep.',
      'Toggle it active and it goes live on every listing you’re co-branded on.'
    ],
    proTips: [
      'Spend five minutes here once — it pays you back on every midnight “can I afford this?” question.',
      'The bot never quotes rates you didn’t give it. Keep your rate sheet current and it stays accurate.'
    ]
  },
  'lo-leads': {
    title: 'How to use Leads',
    subtitle: 'Warm buyer leads from your partner agents’ listings.',
    steps: [
      'Leads are scored by intent — Hot and New rise to the top.',
      'Open a lead to read the full chat so you know what they asked before you reach out.',
      'Update status as you work them to keep your pipeline accurate.'
    ],
    proTips: [
      'First contact within minutes wins the loan. Turn on alerts so you never miss a hot one.',
      'Reference the specific listing they were viewing — it instantly makes the call feel personal.'
    ]
  },
  'lo-appointments': {
    title: 'How to use Appointments',
    subtitle: 'Your booked calls and consultations.',
    steps: [
      'See every upcoming appointment with the buyer and listing attached.',
      'Confirm or reschedule from the card — the buyer is notified automatically.',
      'Reminders go out before each one to cut down on no-shows.'
    ],
    proTips: [
      'A quick confirmation text the morning of dramatically improves show rates.',
      'Have the buyer’s listing and financing scenario open before the call — preparation closes loans.'
    ]
  },
  office: {
    title: 'How to use the Office dashboard',
    subtitle: 'Branch oversight — your loan officers and their results.',
    steps: [
      'Review branch KPIs to see total leads, listings, and partnerships across your LOs.',
      'Use the leaderboard to spot your top performers and who needs support.',
      'Invite new loan officers — they’re auto-linked to your office when they claim their account.'
    ],
    proTips: [
      'Pair a new LO with your leaderboard leader for a week — fastest way to ramp them.',
      'Watch partnership counts, not just leads. More agent partners today means more pipeline next quarter.'
    ]
  }
}

const storageKey = (pageKey: string) => `hlai_pageguide_${pageKey}`

const readState = (pageKey: string): GuideState => {
  if (typeof window === 'undefined') return 'expanded'
  const v = localStorage.getItem(storageKey(pageKey))
  return v === 'collapsed' || v === 'dismissed' ? v : 'expanded'
}

const PageGuide: React.FC<{ pageKey: string }> = ({ pageKey }) => {
  const guide = PAGE_GUIDES[pageKey]
  const [state, setState] = useState<GuideState>(() => readState(pageKey))

  const persist = (next: GuideState) => {
    setState(next)
    try { localStorage.setItem(storageKey(pageKey), next) } catch { /* ignore */ }
  }

  if (!guide) return null

  // ── Dismissed: small restore pill ──
  if (state === 'dismissed') {
    return (
      <button
        type="button"
        onClick={() => persist('expanded')}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
      >
        <span className="material-symbols-outlined text-[16px] text-primary-600">help</span>
        Page guide
      </button>
    )
  }

  const expanded = state === 'expanded'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header — click anywhere to toggle collapse */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => persist(expanded ? 'collapsed' : 'expanded')}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <span className="material-symbols-outlined text-[20px]">tips_and_updates</span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold text-slate-900">{guide.title}</span>
            <span className="block truncate text-xs text-slate-500">{guide.subtitle}</span>
          </span>
        </button>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => persist(expanded ? 'collapsed' : 'expanded')}
            aria-label={expanded ? 'Collapse guide' : 'Expand guide'}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          <button
            type="button"
            onClick={() => persist('dismissed')}
            aria-label="Dismiss guide"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="space-y-4 px-5 pb-5">
          <ol className="space-y-2.5">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">{i + 1}</span>
                <span className="text-sm leading-relaxed text-slate-600">{step}</span>
              </li>
            ))}
          </ol>

          <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary-600">lightbulb</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700">Pro tips</span>
            </div>
            <ul className="space-y-1.5">
              {guide.proTips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                  <span className="text-primary-400">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default PageGuide
