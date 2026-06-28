import React, { useState } from 'react';

/**
 * HomeListingAI — Living Design System
 *
 * Public route: /design-system  (no login required)
 *
 * This page documents the app's REAL design language, extracted from the
 * existing codebase — not invented. Colors come from tailwind.config.js,
 * the button/card/input patterns are the de-facto ones used across
 * src/components/dashboard-command/*. Keep this page in sync when those
 * change so it stays a source of truth, not a stale mockup.
 */

const Section: React.FC<{ id: string; title: string; subtitle?: string; children: React.ReactNode }> = ({
  id,
  title,
  subtitle,
  children,
}) => (
  <section id={id} className="scroll-mt-24">
    <div className="mb-5 border-b border-slate-200 pb-3">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const Swatch: React.FC<{ name: string; hex: string; dark?: boolean }> = ({ name, hex, dark }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
    <div className="h-16 w-full" style={{ backgroundColor: hex }} />
    <div className={`px-3 py-2 ${dark ? 'bg-slate-900 text-white' : 'bg-white'}`}>
      <div className="text-xs font-semibold text-slate-700">{name}</div>
      <div className="font-mono text-[11px] uppercase text-slate-400">{hex}</div>
    </div>
  </div>
);

const ColorRow: React.FC<{ label: string; scale: Record<string, string> }> = ({ label, scale }) => (
  <div>
    <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
      {Object.entries(scale).map(([k, v]) => (
        <Swatch key={k} name={`${label.toLowerCase()}-${k}`} hex={v} />
      ))}
    </div>
  </div>
);

// ── Tokens (mirror tailwind.config.js) ──────────────────────────────
const SLATE = {
  '50': '#f8fafc',
  '100': '#f1f5f9',
  '200': '#e2e8f0',
  '300': '#cbd5e1',
  '400': '#94a3b8',
  '500': '#64748b',
  '600': '#475569',
  '700': '#334155',
  '800': '#1e293b',
  '900': '#0f172a',
  '950': '#020617',
};
const PRIMARY = {
  '50': '#eff6ff',
  '100': '#dbeafe',
  '200': '#bfdbfe',
  '300': '#93c5fd',
  '400': '#60a5fa',
  '500': '#3b82f6',
  '600': '#2563eb',
  '700': '#1d4ed8',
  '800': '#1e40af',
  '900': '#1e3a8a',
  '950': '#172554',
};
const ACCENTS = {
  'purple-600': '#9333ea',
  'green-400': '#4ade80',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
};

const NAV = [
  ['colors', 'Colors'],
  ['type', 'Typography'],
  ['buttons', 'Buttons'],
  ['cards', 'Cards'],
  ['inputs', 'Inputs'],
  ['badges', 'Badges'],
  ['effects', 'Effects'],
];

const CodeTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="mt-2 block rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-500">
    {children}
  </code>
);

const DesignSystemPage: React.FC = () => {
  const [inputVal, setInputVal] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary-600">
            HomeListingAI
          </div>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Design System</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            The living style reference for HomeListingAI. Every token and component below is rendered
            live from the app's real Tailwind theme and shared patterns.
          </p>
        </div>
      </header>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-6 py-2">
          {NAV.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl space-y-14 px-6 py-12">
        {/* COLORS */}
        <Section id="colors" title="Colors" subtitle="Source of truth: tailwind.config.js">
          <div className="space-y-6">
            <ColorRow label="Slate" scale={SLATE} />
            <ColorRow label="Primary" scale={PRIMARY} />
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-700">Accents</div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
                {Object.entries(ACCENTS).map(([k, v]) => (
                  <Swatch key={k} name={k} hex={v} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* TYPOGRAPHY */}
        <Section id="type" title="Typography" subtitle="Inter — the only typeface">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-3xl font-bold text-slate-900">Heading 1 · text-3xl font-bold</p>
            <p className="text-xl font-bold text-slate-900">Heading 2 · text-xl font-bold</p>
            <p className="text-base font-semibold text-slate-800">Subhead · text-base font-semibold</p>
            <p className="text-sm text-slate-600">
              Body · text-sm text-slate-600 — the workhorse size across dashboards.
            </p>
            <p className="text-xs text-slate-400">Caption · text-xs text-slate-400</p>
            <p className="gradient-text text-2xl font-bold">Gradient text · .gradient-text</p>
          </div>
        </Section>

        {/* BUTTONS */}
        <Section id="buttons" title="Buttons" subtitle="The de-facto patterns used across the app">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50">
                Primary action
              </button>
              <CodeTag>bg-primary-600 · rounded-xl · text-white</CodeTag>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                Secondary
              </button>
              <CodeTag>border-slate-300 · bg-white</CodeTag>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
                Ghost / nav
              </button>
              <CodeTag>text-slate-600 · hover:bg-slate-100</CodeTag>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700">
                Success
              </button>
              <CodeTag>bg-green-600</CodeTag>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white">
                Small
              </button>
              <CodeTag>px-3 py-1.5 · text-xs</CodeTag>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button
                disabled
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Disabled
              </button>
              <CodeTag>disabled:opacity-50</CodeTag>
            </div>
          </div>
        </Section>

        {/* CARDS */}
        <Section id="cards" title="Cards" subtitle="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Warm leads
              </div>
              <div className="mt-1 text-3xl font-bold text-slate-900">128</div>
              <div className="mt-1 text-sm text-green-600">▲ 12% this week</div>
            </div>
            <div className="hover-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-800">Hover-lift card</div>
              <p className="mt-1 text-sm text-slate-500">Hover me — uses the shared .hover-lift class.</p>
            </div>
            <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary-800">Highlight card</div>
              <p className="mt-1 text-sm text-primary-700">primary-50 fill for emphasis.</p>
            </div>
          </div>
        </Section>

        {/* INPUTS */}
        <Section id="inputs" title="Inputs" subtitle="Forms across the app">
          <div className="grid max-w-xl gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Text input</span>
              <input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Type here…"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Select</span>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
                <option>Option one</option>
                <option>Option two</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Textarea</span>
              <textarea
                rows={3}
                placeholder="Notes…"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>
          </div>
        </Section>

        {/* BADGES */}
        <Section id="badges" title="Badges & Pills" subtitle="Status and category tags">
          <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Warm
            </span>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
              New
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Draft
            </span>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              Premium
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              Overdue
            </span>
          </div>
        </Section>

        {/* EFFECTS */}
        <Section id="effects" title="Effects" subtitle="Shared utility classes in public.css">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glow rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-700 shadow-sm">
              .glow
            </div>
            <div className="animate-float rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-700 shadow-sm">
              .animate-float
            </div>
            <div className="animate-pulse-subtle rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-700 shadow-sm">
              .animate-pulse-subtle
            </div>
          </div>
        </Section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        HomeListingAI Design System · rendered live from the app theme
      </footer>
    </div>
  );
};

export default DesignSystemPage;
