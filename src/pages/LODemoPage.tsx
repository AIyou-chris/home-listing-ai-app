import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_PARTNERS = [
  {
    id: 'p1',
    name: 'Sarah Mitchell',
    company: 'Prestige Properties',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    leads: 14,
    views: 203,
    listings: 2,
    rating: '🔥',
    joinedDays: 14,
    listing: '4821 Ridgecrest Dr, Austin TX',
    listingPhoto: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p2',
    name: 'James Torres',
    company: 'Keller Williams',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    leads: 9,
    views: 147,
    listings: 1,
    rating: '👍',
    joinedDays: 28,
    listing: '2203 Barton Hills Dr, Austin TX',
    listingPhoto: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p3',
    name: 'Rachel Kim',
    company: 'Compass',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
    leads: 22,
    views: 318,
    listings: 3,
    rating: '🔥',
    joinedDays: 7,
    listing: '5512 Mesa Verde Blvd, Austin TX',
    listingPhoto: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=400&auto=format&fit=crop',
  },
]

const DEMO_PENDING = [
  { name: 'David Reyes', email: 'david@austinrealty.com', sentDays: 1, opened: true },
  { name: 'Melissa Grant', email: 'mgrant@coldwellbanker.com', sentDays: 2, opened: false },
]

const DEMO_LEADS = [
  { name: 'Tyler Nguyen', property: '4821 Ridgecrest Dr', intent: 'hot', time: '12m ago', question: 'What are rates for a 30-yr fixed?' },
  { name: 'Amanda Clarke', property: '5512 Mesa Verde Blvd', intent: 'warm', time: '1h ago', question: 'How much can I qualify for at $120k income?' },
  { name: 'Marcus Webb', property: '2203 Barton Hills Dr', intent: 'warm', time: '3h ago', question: 'Pre-approval steps?' },
  { name: 'Jennifer Cho', property: '4821 Ridgecrest Dr', intent: 'cold', time: '1d ago', question: 'What is PMI?' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ value, label, sub, accent }: { value: string; label: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className={`text-3xl font-black ${accent || 'text-slate-900'} tabular-nums`}>{value}</p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function PartnerCard({ p, active }: { p: typeof DEMO_PARTNERS[0]; active: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${active ? 'border-primary-300 ring-2 ring-primary-100' : 'border-slate-200'}`}>
      <div className="h-28 overflow-hidden relative">
        <img src={p.listingPhoto} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">● Live</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{p.name} <span className="text-base ml-0.5">{p.rating}</span></p>
            <p className="text-[11px] text-slate-400 truncate">{p.company}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-lg font-black text-slate-900">{p.leads}</p>
            <p className="text-[9px] text-slate-400 uppercase font-bold">Leads</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2">
            <p className="text-lg font-black text-emerald-700">{p.views}</p>
            <p className="text-[9px] text-emerald-500 uppercase font-bold">Views</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-lg font-black text-slate-900">{p.listings}</p>
            <p className="text-[9px] text-slate-400 uppercase font-bold">Listings</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 truncate">🏠 {p.listing}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Joined {p.joinedDays}d ago</p>
      </div>
    </div>
  )
}

function LeadRow({ lead }: { lead: typeof DEMO_LEADS[0] }) {
  const intentColors: Record<string, string> = {
    hot: 'bg-red-100 text-red-700',
    warm: 'bg-amber-100 text-amber-700',
    cold: 'bg-slate-100 text-slate-500',
  }
  const intentLabels: Record<string, string> = { hot: '🔥 Hot', warm: '👍 Warm', cold: '❄️ Cold' }
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
        {lead.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-slate-900 text-sm">{lead.name}</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${intentColors[lead.intent]}`}>
            {intentLabels[lead.intent]}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 truncate">📍 {lead.property}</p>
        <p className="text-xs text-slate-500 mt-0.5 italic">"{lead.question}"</p>
      </div>
      <p className="text-[10px] text-slate-400 flex-shrink-0">{lead.time}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LODemoPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'partners' | 'leads' | 'pipeline'>('partners')
  const [activeParter, setActivePartner] = useState('p3')

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white font-sans">
      {/* Cyan top accent line */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 z-50" />

      <PublicHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="pt-28 pb-10 px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-5">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Live Demo Dashboard</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 max-w-3xl mx-auto">
          This is what you see<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">every morning as an LO</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-8">
          3 agent partners. 45 warm leads this month. All from one WOW link apiece.
          No cold calls. No chasing.
        </p>
        <button
          onClick={() => navigate('/signup')}
          className="bg-[#f86f1b] hover:bg-[#e55e0a] text-white font-black px-8 py-4 rounded-2xl text-base transition-all shadow-[0_0_30px_rgba(248,111,27,0.4)] hover:shadow-[0_0_40px_rgba(248,111,27,0.6)]"
        >
          Start Free — Get Your First Partner Today →
        </button>
      </div>

      {/* ── Dashboard Shell ───────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-24">

        {/* Fake browser chrome */}
        <div className="rounded-2xl overflow-hidden border border-slate-700/50 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">

          {/* Browser top bar */}
          <div className="bg-[#1a1f2e] border-b border-slate-700/50 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
            </div>
            <div className="flex-1 bg-[#0d1117] rounded-md px-3 py-1.5 flex items-center gap-2">
              <span className="text-slate-600 text-xs">🔒</span>
              <span className="text-slate-400 text-xs">homelistingai.com/dashboard/lo-partners</span>
            </div>
            <span className="text-[11px] text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded-full">● Live</span>
          </div>

          {/* Dashboard layout */}
          <div className="bg-slate-50 flex min-h-[600px]">

            {/* Sidebar */}
            <div className="w-56 bg-white border-r border-slate-200 flex-shrink-0 hidden sm:flex flex-col">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-sm font-black">H</div>
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-none">HomeListingAI</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">LO Pro</p>
                  </div>
                </div>
              </div>
              <nav className="p-3 flex-1 space-y-0.5">
                {[
                  { icon: '📊', label: 'Today', active: false },
                  { icon: '🤝', label: 'Partner Agents', active: true },
                  { icon: '🏠', label: 'LO Listings', active: false },
                  { icon: '🤖', label: 'AI Chatbot', active: false },
                  { icon: '🔥', label: 'Lead Inbox', active: false },
                ].map(item => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-default transition-all ${item.active ? 'bg-primary-50 text-primary-700 border border-primary-100' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </nav>
              <div className="p-3 border-t border-slate-100">
                <div className="flex items-center gap-2 px-2 py-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">LO</div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-700">Alex Rivera</p>
                    <p className="text-[9px] text-slate-400">NMLS #284791</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-5 sm:p-6 overflow-auto">

              {/* Page header */}
              <div className="flex items-start justify-between mb-5 gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Partner Agents</h2>
                  <p className="text-slate-500 text-xs mt-0.5">3 active partners · 2 invites pending</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 border border-slate-200 text-slate-600 font-semibold rounded-xl px-3 py-2 text-xs bg-white hover:bg-slate-50 transition-all">
                    <span>👁️</span> Preview Agent View
                  </button>
                  <button className="flex items-center gap-1.5 bg-primary-600 text-white font-bold rounded-xl px-4 py-2 text-xs hover:bg-primary-700 transition-all shadow-sm">
                    + Add Partner
                  </button>
                </div>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <StatCard value="45" label="Leads This Month" sub="+12 this week" accent="text-primary-600" />
                <StatCard value="3" label="Active Partners" sub="2 invites pending" />
                <StatCard value="668" label="Listing Views" sub="Across 6 listings" accent="text-emerald-600" />
                <StatCard value="$2.8M" label="Est. Pipeline" sub="Based on leads" accent="text-amber-600" />
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
                {(['partners', 'leads', 'pipeline'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab === 'partners' ? '🤝 Partners' : tab === 'leads' ? '🔥 Leads' : '📊 Pipeline'}
                  </button>
                ))}
              </div>

              {activeTab === 'partners' && (
                <>
                  {/* Pending invites */}
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">⏳ Pending Invites</p>
                    <div className="space-y-2">
                      {DEMO_PENDING.map(inv => (
                        <div key={inv.email} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-amber-100">
                          <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-xs font-bold">{inv.name[0]}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800">{inv.name}</p>
                            <p className="text-[10px] text-slate-400">{inv.email}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[10px] text-slate-400">Sent {inv.sentDays}d ago</p>
                            <p className={`text-[9px] font-bold ${inv.opened ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {inv.opened ? '✓ Opened' : 'Not opened'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Partner cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DEMO_PARTNERS.map(p => (
                      <div key={p.id} onClick={() => setActivePartner(p.id)} className="cursor-pointer">
                        <PartnerCard p={p} active={activeParter === p.id} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === 'leads' && (
                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-700">All Leads — This Month</p>
                    <div className="flex gap-2">
                      {['🔥 Hot', '👍 Warm', '❄️ Cold'].map(f => (
                        <span key={f} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold cursor-default">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div className="px-4">
                    {DEMO_LEADS.map(lead => <LeadRow key={lead.name} lead={lead} />)}
                  </div>
                </div>
              )}

              {activeTab === 'pipeline' && (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Pipeline by Partner</p>
                    <div className="space-y-4">
                      {DEMO_PARTNERS.map(p => (
                        <div key={p.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <img src={p.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                              <p className="text-xs font-semibold text-slate-700">{p.name}</p>
                              <span>{p.rating}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-900">{p.leads} leads</p>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500 to-cyan-400 rounded-full"
                              style={{ width: `${Math.min((p.leads / 25) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
                      <p className="text-2xl font-black text-red-600">8</p>
                      <p className="text-[10px] font-bold text-red-500 uppercase">Hot Leads</p>
                      <p className="text-[10px] text-red-400 mt-0.5">Ready for pre-approval</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
                      <p className="text-2xl font-black text-amber-600">24</p>
                      <p className="text-[10px] font-bold text-amber-500 uppercase">Warm Leads</p>
                      <p className="text-[10px] text-amber-400 mt-0.5">In research phase</p>
                    </div>
                    <div className="bg-slate-100 rounded-xl border border-slate-200 p-4 text-center">
                      <p className="text-2xl font-black text-slate-600">13</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Cold Leads</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Early stage browsers</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── How It Works strip ────────────────────────────────────────────── */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { n: '1', title: 'Send one WOW link', desc: 'Takes 10 seconds. The agent sees a live listing demo with your chatbot running before they even sign up.', icon: '🔗' },
            { n: '2', title: 'Agent claims their account', desc: 'One tap. Their AI listing pages go live with your branding and lead routing already wired.', icon: '🤝' },
            { n: '3', title: 'Warm leads land in your inbox', desc: 'Every buyer who asks a financing question routes back to you. Scored hot / warm / cold.', icon: '🔥' },
          ].map(step => (
            <div key={step.n} className="bg-[#0B1121] border border-slate-800 rounded-2xl p-6 text-left">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xl mb-4">
                {step.icon}
              </div>
              <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-2">Step {step.n}</p>
              <h3 className="text-base font-black text-white mb-2">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div className="mt-16 text-center bg-gradient-to-br from-[#0d1f3c] to-[#0B1121] border border-slate-700/50 rounded-3xl p-12">
          <h2 className="text-3xl font-black mb-3">Ready to build your lead pipeline?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Free to start. Your first 5 WOW links are on us — no card, no commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="bg-[#f86f1b] hover:bg-[#e55e0a] text-white font-black px-8 py-4 rounded-2xl text-base transition-all shadow-[0_0_30px_rgba(248,111,27,0.4)]"
            >
              Start Free →
            </button>
            <button
              onClick={() => window.open('/partner-invite/demo', '_blank')}
              className="border border-slate-600 hover:border-cyan-500 text-slate-300 hover:text-white font-bold px-8 py-4 rounded-2xl text-base transition-all"
            >
              👁️ Preview Agent View
            </button>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}

export default LODemoPage
