import React, { useEffect, useState } from 'react'
import { useDemoMode } from '../../demo/useDemoMode'
import { useBlueprintMode } from '../../demo/useBlueprintMode'
import { getProfileForDashboard } from '../../services/agentProfileService'
import {
  generateLinkedInAssistantPlan,
  type LinkedInAssistantResponse
} from '../../services/linkedinAutomationService'
import { showToast } from '../../utils/toastService'

const goalOptions = [
  { value: 'book a call', label: 'Book a call' },
  { value: 'qualify the lead', label: 'Qualify lead' },
  { value: 'nurture the conversation', label: 'Nurture lead' },
  { value: 'reconnect and restart the thread', label: 'Reconnect' }
]

const toneOptions = [
  { value: 'professional and warm', label: 'Professional' },
  { value: 'friendly and conversational', label: 'Friendly' },
  { value: 'direct and confident', label: 'Direct' },
  { value: 'helpful and consultative', label: 'Consultative' }
]

const starterThread = `Prospect: Hi, I saw your post about off-market homes in Scottsdale.
Me: Thanks for reaching out. Are you actively looking right now or just exploring?
Prospect: Actively looking. We may need to move in the next 60 days.`

const starterContext =
  'You help buyers and sellers in Phoenix and Scottsdale. Your best next step is usually a short discovery call.'

type LinkedInPreset = {
  key: string
  label: string
  goal: string
  tone: string
  context: string
  threadText: string
}

const presetPlaybooks: LinkedInPreset[] = [
  {
    key: 'buyer',
    label: 'Buyer',
    goal: 'book a call',
    tone: 'helpful and consultative',
    context: 'You help active homebuyers narrow options fast and move them into a short discovery call or showing plan.',
    threadText: `Prospect: Hi, I saw your post about off-market homes in Scottsdale.
Me: Thanks for reaching out. Are you actively looking right now or just exploring?
Prospect: Actively looking. We may need to move in the next 60 days.`
  },
  {
    key: 'seller',
    label: 'Seller',
    goal: 'qualify the lead',
    tone: 'professional and warm',
    context: 'You help homeowners price, prep, and launch listings. Your best next step is a quick pricing call.',
    threadText: `Prospect: Hi, I may be selling my home later this year.
Me: Happy to help. Are you mainly trying to understand price, timing, or what updates matter most?
Prospect: Mostly price and what I should fix before listing.`
  },
  {
    key: 'investor',
    label: 'Investor',
    goal: 'nurture the conversation',
    tone: 'direct and confident',
    context: 'You work with investors who care about speed, deal fit, returns, and repeat opportunities.',
    threadText: `Prospect: I saw your note about investor-friendly deals.
Me: Thanks for reaching out. What kinds of properties are you targeting right now?
Prospect: Small multifamily or fix-and-flip if the numbers make sense.`
  },
  {
    key: 'agent',
    label: 'Recruiting Agent',
    goal: 'book a call',
    tone: 'friendly and conversational',
    context: 'You are recruiting producing agents into your team. Focus on opportunity, support, and a low-pressure intro call.',
    threadText: `Prospect: Thanks for connecting.
Me: Glad we connected. I liked your activity in the market and wanted to say hello.
Prospect: Appreciate that. What made you reach out?`
  },
  {
    key: 'team-leader',
    label: 'Recruiting Team Leader',
    goal: 'reconnect and restart the thread',
    tone: 'direct and confident',
    context: 'You are opening partnership talks with a team leader. Focus on growth, platform leverage, and a strategic conversation.',
    threadText: `Prospect: Thanks for the message.
Me: Happy to connect. I work with growth-minded team leaders and thought it made sense to introduce myself.
Prospect: Open to hearing more. What does that look like?`
  },
  {
    key: 'broker',
    label: 'Recruiting Broker',
    goal: 'book a call',
    tone: 'professional and warm',
    context: 'You are speaking to a broker about platform leverage, recruiting support, and expansion opportunities.',
    threadText: `Prospect: Appreciate you reaching out.
Me: Glad to connect. I thought there could be a fit based on what you are building.
Prospect: Maybe. What kind of fit do you mean?`
  },
  {
    key: 'owner',
    label: 'Recruiting Owner',
    goal: 'qualify the lead',
    tone: 'direct and confident',
    context: 'You are talking to a brokerage owner. Focus on scale, retention, margin, and operator-level outcomes.',
    threadText: `Prospect: Thanks for connecting.
Me: Glad we connected. I work with owners who want stronger recruiting and conversion systems.
Prospect: That is interesting. What are you seeing work right now?`
  }
]

const insightToneMap = {
  hot: 'bg-rose-50 text-rose-700 border-rose-200',
  warm: 'bg-amber-50 text-amber-700 border-amber-200',
  cold: 'bg-slate-100 text-slate-700 border-slate-200'
} as const

const urgencyToneMap = {
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200'
} as const

const copyText = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value)
    showToast.success(`${label} copied.`)
  } catch (_error) {
    showToast.error(`Could not copy ${label.toLowerCase()}.`)
  }
}

const buildDemoResult = (
  threadText: string,
  goal: string,
  context: string
): LinkedInAssistantResponse => {
  const firstProspectLine =
    threadText
      .split('\n')
      .map((line) => line.trim())
      .find((line) => /^prospect\s*:/i.test(line)) || 'Prospect: Thanks for reaching out.'

  const cleanedProspectMessage = firstProspectLine.replace(/^prospect\s*:\s*/i, '').trim()

  return {
    success: true,
    replyDraft: `Thanks for reaching out. ${cleanedProspectMessage ? `You mentioned "${cleanedProspectMessage}". ` : ''}I can help with that. Would a quick 10-minute call this week be the easiest next step?`,
    replyStyleNotes: ['Keep it human.', 'Ask one clear question.', 'Move toward a call or qualification step.'],
    leadInsights: {
      intent: goal,
      urgency: 'medium',
      temperature: 'warm',
      fitScore: 72,
      whyItMatters: 'The prospect started the conversation and gave enough signal to justify a fast follow-up.',
      nextBestAction: 'Send the draft now, then follow up again in 48 hours if they go quiet.'
    },
    automationIdeas: [
      {
        title: 'Fast first reply',
        trigger: 'New LinkedIn DM arrives',
        action: 'Open the assistant, review the draft, and send it manually inside 10 minutes.',
        copy: 'Thanks for reaching out. Happy to help. What are you looking for right now?'
      },
      {
        title: 'CRM handoff',
        trigger: 'Lead asks a real buying, selling, or referral question',
        action: 'Create a lead record and save the thread summary in notes.',
        copy: context || 'Save the main need, timing, and best next step in your CRM.'
      }
    ],
    followUpSequence: [
      {
        step: 1,
        wait: '2 days',
        message: 'Checking back in here in case this is still on your list. Happy to send the next best step.'
      },
      {
        step: 2,
        wait: '5 days',
        message: 'Still happy to help if timing is right. If now is not ideal, I can circle back later.'
      }
    ],
    complianceNotes: [
      'Demo mode is showing a local sample plan.',
      'Keep LinkedIn sending human-approved.',
      'Avoid mass auto-DMs and fake engagement.'
    ]
  }
}

const LinkedInAutomationPage: React.FC = () => {
  const demoMode = useDemoMode()
  const blueprintMode = useBlueprintMode()
  const [selectedPresetKey, setSelectedPresetKey] = useState(presetPlaybooks[0].key)
  const [threadText, setThreadText] = useState(presetPlaybooks[0].threadText || starterThread)
  const [goal, setGoal] = useState(presetPlaybooks[0].goal || goalOptions[0].value)
  const [tone, setTone] = useState(presetPlaybooks[0].tone || toneOptions[0].value)
  const [context, setContext] = useState(presetPlaybooks[0].context || starterContext)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LinkedInAssistantResponse | null>(null)
  const [profileLabel, setProfileLabel] = useState('Using your dashboard voice')
  const [agentProfile, setAgentProfile] = useState<{
    name?: string
    title?: string
    company?: string
    language?: string
  } | null>(null)

  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      try {
        const profile = await getProfileForDashboard()
        if (!active) return
        setAgentProfile(profile)
        const labelParts = [profile.name, profile.company].filter(Boolean)
        setProfileLabel(labelParts.length ? `Using ${labelParts.join(' • ')}` : 'Using your dashboard voice')
      } catch (_error) {
        if (!active) return
        setAgentProfile(null)
        setProfileLabel('Using form context only')
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [])

  const applyPreset = (preset: LinkedInPreset) => {
    setSelectedPresetKey(preset.key)
    setGoal(preset.goal)
    setTone(preset.tone)
    setContext(preset.context)
    setThreadText(preset.threadText)
    setResult(null)
  }

  const handleGenerate = async () => {
    if (!threadText.trim()) {
      showToast.error('Paste a LinkedIn conversation first.')
      return
    }

    setLoading(true)
    try {
      if (demoMode || blueprintMode) {
        setResult(buildDemoResult(threadText, goal, context))
        return
      }

      const nextResult = await generateLinkedInAssistantPlan({
        threadText,
        goal,
        tone,
        context,
        agentProfile: agentProfile || undefined
      })
      setResult(nextResult)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to build LinkedIn plan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              LinkedIn Assistant
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.02em] text-slate-900">Draft replies and build safe LinkedIn automations</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Paste a LinkedIn DM thread, then get a send-ready reply, lead read, and follow-up plan. This stays human-in-the-loop, so it helps you move faster without turning into a risky bot.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Fast reply', 'Draft a response in your voice'],
              ['Lead read', 'See urgency, fit, and next step'],
              ['Follow-up plan', 'Get a short nurture sequence']
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Conversation Input</h2>
              <p className="mt-1 text-xs text-slate-500">{profileLabel}</p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
                {loading ? 'progress_activity' : 'bolt'}
              </span>
              {loading ? 'Building plan...' : 'Build LinkedIn plan'}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Audience preset</span>
              <div className="flex flex-wrap gap-2">
                {presetPlaybooks.map((preset) => {
                  const isActive = preset.key === selectedPresetKey
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Goal</span>
              <select
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                {goalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tone</span>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                {toneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Offer or business context</span>
            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              rows={4}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Example: I help Scottsdale buyers find off-market homes and I like moving leads to a 10-minute discovery call."
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">LinkedIn thread</span>
            <textarea
              value={threadText}
              onChange={(event) => setThreadText(event.target.value)}
              rows={14}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-900"
              placeholder={`Prospect: Hi, saw your post about relocation.\nMe: Thanks for reaching out.\nProspect: We may need to move in June.`}
            />
          </label>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Keep this human-approved. Best use cases: fast first replies, qualification, follow-up reminders, and CRM tasks. Worst use cases: fake engagement, mass auto-DMs, and browser bots pretending to be you.
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Reply Draft</h2>
                <p className="mt-1 text-xs text-slate-500">Short enough to send fast, specific enough to feel human.</p>
              </div>
              {result?.replyDraft ? (
                <button
                  type="button"
                  onClick={() => copyText(result.replyDraft, 'Reply draft')}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Copy reply
                </button>
              ) : null}
            </div>

            {result ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] bg-slate-900 px-5 py-5 text-sm leading-7 text-white whitespace-pre-wrap">
                  {result.replyDraft}
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.replyStyleNotes.map((note) => (
                    <span key={note} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                Paste a conversation, click <strong>Build LinkedIn plan</strong>, and your reply draft shows up here.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Lead Read</h2>
            {result ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Intent</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{result.leadInsights.intent}</div>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${insightToneMap[result.leadInsights.temperature]}`}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em]">Temperature</div>
                    <div className="mt-2 text-sm font-semibold capitalize">{result.leadInsights.temperature}</div>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${urgencyToneMap[result.leadInsights.urgency]}`}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em]">Urgency</div>
                    <div className="mt-2 text-sm font-semibold capitalize">{result.leadInsights.urgency}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">Fit score</div>
                    <div className="text-sm font-bold text-slate-900">{result.leadInsights.fitScore}/100</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.max(6, result.leadInsights.fitScore)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Why it matters</div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{result.leadInsights.whyItMatters}</p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Next best action</div>
                  <p className="mt-2 text-sm leading-6 text-blue-900">{result.leadInsights.nextBestAction}</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-slate-500">Lead intent, urgency, and fit score will show here.</div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Automation Ideas</h2>
              {result?.followUpSequence?.[0]?.message ? (
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      result.followUpSequence
                        .map((step) => `Step ${step.step} • Wait ${step.wait}\n${step.message}`)
                        .join('\n\n'),
                      'Follow-up sequence'
                    )
                  }
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Copy sequence
                </button>
              ) : null}
            </div>

            {result ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4">
                  {result.automationIdeas.map((idea) => (
                    <div key={`${idea.title}-${idea.trigger}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{idea.title}</div>
                          <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{idea.trigger}</div>
                        </div>
                        {idea.copy ? (
                          <button
                            type="button"
                            onClick={() => copyText(idea.copy, idea.title)}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white"
                          >
                            Copy text
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{idea.action}</p>
                      {idea.copy ? (
                        <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                          {idea.copy}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="grid gap-4">
                  {result.followUpSequence.map((step) => (
                    <div key={`${step.step}-${step.wait}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900">Step {step.step}</div>
                        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                          Wait {step.wait}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap">{step.message}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Safety notes</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.complianceNotes.map((note) => (
                      <span key={note} className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-800">
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-slate-500">Follow-up ideas and safe automation plays will show here after generation.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default LinkedInAutomationPage
