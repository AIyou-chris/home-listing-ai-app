import React from 'react'

import type { AgentProfile } from '../../types'

type QuickLink = {
  label: string
  description: string
  href?: string
  onClick?: () => void
  icon: string
}

type OnboardingStep = {
  label: string
  isComplete: boolean
}

type HeroStat = {
  label: string
  value: string
  change?: string
  href?: string
}

interface AgentBlueprintHeroProps {
  agent: AgentProfile
  heroStats: HeroStat[]
  quickLinks: QuickLink[]
  onboarding: {
    percentage: number
    label: string
    steps: OnboardingStep[]
  }
}

const AgentBlueprintHero: React.FC<AgentBlueprintHeroProps> = ({ agent, heroStats, quickLinks, onboarding }) => {
  const firstName = agent.name.split(' ')[0] || agent.name

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-sm">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-primary-200 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-200 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col gap-8 p-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700">
            <span className="material-symbols-outlined text-sm text-primary-600">magic_button</span>
            Blueprint Command Center
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Welcome back, {firstName}. Let&apos;s keep the momentum.
          </h1>
          <p className="mt-4 text-base text-slate-600">
            This workspace mirrors the live agent dashboard so we can tighten every touch point before shipping to production. Review your onboarding
            checklist, polish your automations, and give marketing-ready teammates a single source of truth.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
              <span className="material-symbols-outlined text-lg text-primary-500">link</span>
              Agent slug
              <span className="text-slate-900">{agent.slug ?? agent.email?.split('@')[0] ?? 'agent'}</span>
            </div>
            {agent.company && (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                <span className="material-symbols-outlined text-lg text-emerald-500">workspace_premium</span>
                {agent.company}
              </div>
            )}
            {agent.website && (
              <a
                href={agent.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-primary-600 transition hover:border-primary-200 hover:bg-primary-50"
              >
                <span className="material-symbols-outlined text-lg">open_in_new</span>
                Preview public site
              </a>
            )}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {quickLinks.map((link) =>
              link.onClick ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={link.onClick}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                      <span className="material-symbols-outlined text-lg">{link.icon}</span>
                    </div>
                    <span className="material-symbols-outlined text-base text-slate-300 transition group-hover:text-primary-400">
                      arrow_forward
                    </span>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-slate-900">{link.label}</div>
                  <p className="mt-1 text-xs text-slate-500">{link.description}</p>
                </button>
              ) : (
                <a
                  key={link.label}
                  href={link.href ?? '#'}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                      <span className="material-symbols-outlined text-lg">{link.icon}</span>
                    </div>
                    <span className="material-symbols-outlined text-base text-slate-300 transition group-hover:text-primary-400">
                      arrow_forward
                    </span>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-slate-900">{link.label}</div>
                  <p className="mt-1 text-xs text-slate-500">{link.description}</p>
                </a>
              )
            )}
          </div>
        </div>

        <aside className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
            <span>Onboarding progress</span>
            <span>{onboarding.percentage}%</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(onboarding.percentage, 100)}%` }} />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{onboarding.label}</p>
          <ul className="mt-4 space-y-2">
            {onboarding.steps.map((step) => (
              <li
                key={step.label}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              >
                <span
                  className={`material-symbols-outlined text-base ${step.isComplete ? 'text-emerald-500' : 'text-slate-300'}`}
                >
                  {step.isComplete ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                {step.label}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {heroStats.length > 0 && (
        <div className="relative z-10 border-t border-slate-200 bg-white/80 px-8 py-6">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                  {stat.change && <span className="text-xs font-semibold text-emerald-600">{stat.change}</span>}
                </div>
                {stat.href && (
                  <a
                    href={stat.href}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    View details
                    <span className="material-symbols-outlined text-sm">arrow_outward</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default AgentBlueprintHero

