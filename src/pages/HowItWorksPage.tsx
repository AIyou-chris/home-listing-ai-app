import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import SEO from '../components/SEO';

const HOW_IT_WORKS_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://homelistingai.com/how-it-works',
      'url': 'https://homelistingai.com/how-it-works',
      'name': 'How HomeListingAI Works for Loan Officers',
      'description': 'See how loan officers use HomeListingAI to send WOW links to real estate agents, capture warm mortgage leads automatically, and close more loans without cold outreach.',
      'isPartOf': { '@id': 'https://homelistingai.com' }
    },
    {
      '@type': 'HowTo',
      'name': 'How Loan Officers Get Warm Leads With HomeListingAI',
      'description': 'A 4-step system that turns agent partnerships into a steady stream of pre-qualified mortgage leads — no cold calls required.',
      'totalTime': 'PT2M',
      'estimatedCost': { '@type': 'MonetaryAmount', 'currency': 'USD', 'value': '0' },
      'step': [
        {
          '@type': 'HowToStep',
          'position': 1,
          'name': 'Send a WOW link to a real estate agent',
          'text': 'The loan officer sends a personalized WOW link to any real estate agent. The agent receives an email with a live AI listing demo — your mortgage chatbot is already built in. Takes 10 seconds to send. If the agent doesn\'t open it within 24 hours, an automated reminder fires. Another reminder goes out at 72 hours.',
          'url': 'https://homelistingai.com/how-it-works#step-1'
        },
        {
          '@type': 'HowToStep',
          'position': 2,
          'name': 'Agent claims their account and sets up their dashboard',
          'text': 'The agent clicks the link and sees a live demo of their listing page with the loan officer\'s AI mortgage assistant running on it. One tap claims their account. Their dashboard is pre-loaded with the loan officer\'s branding. The loan officer receives a text and email the moment the agent signs up.',
          'url': 'https://homelistingai.com/how-it-works#step-2'
        },
        {
          '@type': 'HowToStep',
          'position': 3,
          'name': 'Agent publishes their listing — share kit and lead capture go live',
          'text': 'The agent publishes their listing and instantly has a tracked QR code for their yard sign, a social media asset, and an open house flyer — all linked back to the loan officer. Every buyer who scans the QR code or asks a question is captured as a lead. The AI chatbot pre-qualifies buyers automatically.',
          'url': 'https://homelistingai.com/how-it-works#step-3'
        },
        {
          '@type': 'HowToStep',
          'position': 4,
          'name': 'Loan officer receives warm leads and closes loans',
          'text': 'Every lead from the agent\'s listing routes directly to the loan officer — pre-qualified, with real financing intent. The agent sees the loan officer as their competitive advantage, creating a lasting partnership that generates consistent mortgage pipeline.',
          'url': 'https://homelistingai.com/how-it-works#step-4'
        }
      ]
    },
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://homelistingai.com' },
        { '@type': 'ListItem', 'position': 2, 'name': 'How It Works', 'item': 'https://homelistingai.com/how-it-works' }
      ]
    }
  ]
};

const steps = [
  {
    number: '01',
    tag: 'Step One',
    anchor: 'step-1',
    accent: 'from-cyan-400 to-blue-500',
    accentSolid: '#06b6d4',
    glow: 'rgba(6,182,212,0.15)',
    icon: '🔗',
    heading: 'Loan officer sends one WOW link to any agent',
    subheading: 'One link. Instant impression.',
    body: 'You send a personalized WOW link to any agent — takes 10 seconds. They get a live demo of their listing page with your AI mortgage assistant already built in. No setup required on their end.',
    pill: '24hr + 72hr auto-reminders if they don\'t open',
    phone: {
      topBar: 'WOW Link Email',
      screen: (
        <div className="p-3 space-y-2">
          <div className="rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] p-3">
            <p className="text-white text-[9px] font-bold mb-1">📬 Your LO sent you something</p>
            <p className="text-cyan-300 text-[8px] leading-relaxed">"I built a live demo for your listings — see it here"</p>
          </div>
          <div className="rounded-xl bg-white p-2.5 text-center">
            <div className="text-xl mb-1">🏡</div>
            <p className="text-slate-900 text-[9px] font-extrabold mb-0.5">Your listing demo is live</p>
            <p className="text-slate-400 text-[7px] mb-2">AI answers buyer questions 24/7</p>
            <div className="rounded-lg bg-[#f86f1b] py-1.5">
              <span className="text-white text-[9px] font-bold">See My Listing →</span>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    number: '02',
    tag: 'Step Two',
    anchor: 'step-2',
    accent: 'from-violet-400 to-blue-500',
    accentSolid: '#7c3aed',
    glow: 'rgba(124,58,237,0.15)',
    icon: '⚡',
    heading: 'Real estate agent claims their account in one tap',
    subheading: 'Zero friction. No sales call.',
    body: 'The agent sees the live demo with your chatbot running. One tap claims their account. Their dashboard comes pre-loaded with your branding. You get a text + email the second they\'re in.',
    pill: 'LO notified instantly via text + email',
    phone: {
      topBar: 'Agent Dashboard',
      screen: (
        <div className="p-3 space-y-2">
          <div className="rounded-xl bg-violet-50 border border-violet-100 p-2.5">
            <p className="text-violet-900 text-[9px] font-bold">✅ Account ready</p>
            <p className="text-violet-600 text-[8px] mt-0.5">Your dashboard is live. Time to list.</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-100 p-2.5">
            <p className="text-[8px] text-slate-400 uppercase font-semibold tracking-wide mb-1.5">Your Listings</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-sm">🏠</div>
              <div>
                <p className="text-slate-900 text-[9px] font-bold">Add your first listing</p>
                <p className="text-slate-400 text-[7px]">Takes 2 minutes</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    number: '03',
    tag: 'Step Three',
    anchor: 'step-3',
    accent: 'from-emerald-400 to-cyan-500',
    accentSolid: '#059669',
    glow: 'rgba(5,150,105,0.15)',
    icon: '🔥',
    heading: 'AI listing share kit goes live — buyer leads start flowing',
    subheading: 'Every listing becomes a mortgage lead machine.',
    body: 'Agent publishes their listing. Instantly they have a tracked QR code, social asset, and open house flyer. Every buyer who scans or asks a question is captured. Your AI pre-qualifies them automatically.',
    pill: 'Sign QR · Social post · Open house flyer — all tracked',
    phone: {
      topBar: 'Share Kit Live',
      screen: (
        <div className="p-3 space-y-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
            <p className="text-emerald-800 text-[9px] font-bold mb-1.5">📲 3 leads captured today</p>
            {['Sarah M. — Hot 🔥', 'James K. — Warm', 'Mike T. — Warm'].map((l, i) => (
              <div key={i} className="flex justify-between items-center mb-0.5">
                <span className="text-emerald-700 text-[8px]">{l}</span>
                <span className="text-emerald-400 text-[7px]">via QR</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white border border-slate-100 p-2 text-center">
            <p className="text-slate-900 text-[9px] font-bold">💬 Buyer asked:</p>
            <p className="text-slate-500 text-[8px] italic">"What's the monthly payment?"</p>
            <p className="text-blue-600 text-[8px] font-semibold mt-0.5">AI answered instantly ✓</p>
          </div>
        </div>
      )
    }
  },
  {
    number: '04',
    tag: 'Step Four',
    anchor: 'step-4',
    accent: 'from-orange-400 to-rose-500',
    accentSolid: '#f86f1b',
    glow: 'rgba(248,111,27,0.15)',
    icon: '💰',
    heading: 'Loan officer gets pre-qualified mortgage leads and closes loans',
    subheading: 'Warm leads. No cold calls.',
    body: 'Every lead from that agent\'s listing routes straight to you. Pre-qualified, with real financing intent. Not cold leads — warm conversations from buyers already curious about the property.',
    pill: 'Agent sees you as their unfair advantage',
    phone: {
      topBar: 'LO Dashboard',
      screen: (
        <div className="p-3 space-y-2">
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-2.5">
            <p className="text-orange-800 text-[9px] font-bold mb-0.5">🔔 New warm lead</p>
            <p className="text-orange-600 text-[8px]">Sarah M. pre-qualified on 247 Oak St</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[['14', 'leads / month'], ['3', 'agents linked'], ['7', 'listings live'], ['4', 'in pipeline']].map(([val, lbl], i) => (
              <div key={i} className="rounded-lg bg-white border border-slate-100 p-1.5 text-center">
                <p className="text-slate-900 text-[12px] font-extrabold">{val}</p>
                <p className="text-slate-400 text-[7px]">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }
];

const HowItWorksPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <SEO
        title="How It Works — Loan Officer Lead System"
        description="See how loan officers use HomeListingAI to send WOW links to agents, capture warm mortgage leads automatically, and close more loans. Free to start. No cold calls."
        url="https://homelistingai.com/how-it-works"
        image="https://homelistingai.com/og-image.png"
        schema={HOW_IT_WORKS_SCHEMA}
      />

      {/* Cyan top accent line — matches landing page */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_15px_rgba(6,182,212,0.6)]" />

      {/* Ambient gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0B0F19] via-[#0B1528] to-[#040814] pointer-events-none -z-10" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-1/4 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <PublicHeader />

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-36 pb-16 text-center">
        <div className="inline-flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs text-cyan-400 font-semibold tracking-wide uppercase">For Loan Officers</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-5">
          Turn every agent partner into a{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            warm lead machine
          </span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          One WOW link. The agent gets a live AI listing demo with your name on it.
          Every buyer they attract becomes your lead. Here's exactly how it works.
        </p>

        {/* Quick stat strip */}
        <div className="flex flex-wrap justify-center gap-6 mt-10">
          {[
            ['10 sec', 'to send a WOW link'],
            ['24 / 72hr', 'auto-reminders'],
            ['instant', 'LO notification on signup'],
            ['100%', 'leads route to you'],
          ].map(([val, lbl]) => (
            <div key={val} className="text-center">
              <p className="text-2xl font-extrabold text-white">{val}</p>
              <p className="text-xs text-slate-500">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-5xl mx-auto px-6 space-y-24 pb-24">
        {steps.map((step, index) => (
          <div
            key={step.number}
            id={step.anchor}
            className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-14`}
          >

            {/* Text side */}
            <div className="flex-1 min-w-0">
              {/* Step tag */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`text-xs font-black bg-gradient-to-r ${step.accent} bg-clip-text text-transparent uppercase tracking-widest`}>
                  {step.tag}
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent" />
              </div>

              {/* Heading */}
              <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight mb-2">
                {step.heading}
              </h2>
              <p className={`text-base font-semibold bg-gradient-to-r ${step.accent} bg-clip-text text-transparent mb-4`}>
                {step.subheading}
              </p>
              <p className="text-slate-400 text-base leading-relaxed mb-6">{step.body}</p>

              {/* Pill */}
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border"
                style={{
                  borderColor: `${step.accentSolid}40`,
                  backgroundColor: `${step.accentSolid}10`,
                  color: step.accentSolid
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: step.accentSolid }} />
                {step.pill}
              </div>
            </div>

            {/* Phone side */}
            <div className="flex-shrink-0 flex justify-center">
              <div className="relative">
                {/* Glow */}
                <div
                  className="absolute inset-[-20px] rounded-full blur-3xl"
                  style={{ backgroundColor: step.glow }}
                />
                {/* Phone shell — iPhone 15 Pro style */}
                <div className="relative w-[210px] rounded-[36px] border-[8px] border-[#1c1c1e] bg-[#f2f2f7] shadow-2xl overflow-hidden">
                  {/* Status bar */}
                  <div className="bg-[#f2f2f7] px-3 pt-2 pb-1 flex items-center justify-between">
                    <span className="text-[8px] font-bold text-slate-900">9:41</span>
                    <div className="w-12 h-[14px] bg-black rounded-full" />
                    <span className="text-[7px] text-slate-700 font-mono">▌▌▌⚡</span>
                  </div>
                  {/* App bar */}
                  <div className="bg-white border-b border-slate-100 px-2.5 py-1.5 flex items-center gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${step.accent}`}
                    />
                    <span className="text-[8px] font-bold text-slate-800 flex-1">HomeListingAI</span>
                    <span className="text-[6px] text-slate-400 truncate max-w-[70px]">{step.phone.topBar}</span>
                  </div>
                  {/* Screen */}
                  <div className="bg-[#f2f2f7] min-h-[190px]">
                    {step.phone.screen}
                  </div>
                  {/* Home bar */}
                  <div className="bg-[#f2f2f7] flex justify-center pb-2 pt-1">
                    <div className="w-10 h-1 rounded-full bg-slate-400/60" />
                  </div>
                </div>

                {/* Step number badge */}
                <div
                  className={`absolute -top-3 -right-3 w-9 h-9 rounded-xl bg-gradient-to-br ${step.accent} flex items-center justify-center text-white font-black text-xs shadow-lg`}
                >
                  {step.number}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Flow at a glance */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-800 bg-[#0B1121] p-8">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">The full picture</p>
            <h3 className="text-xl font-bold text-white">From one link to closed loans</h3>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {[
              { icon: '🔗', label: 'LO sends WOW link', color: '#06b6d4' },
              null,
              { icon: '⚡', label: 'Agent claims account', color: '#7c3aed' },
              null,
              { icon: '🔥', label: 'Share kit live', color: '#059669' },
              null,
              { icon: '💰', label: 'LO gets warm leads', color: '#f86f1b' },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="hidden md:block text-slate-700 text-lg font-bold">→</div>
              ) : (
                <div key={i} className="flex flex-col items-center gap-2 text-center">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}30` }}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium max-w-[72px] leading-tight">{item.label}</span>
                </div>
              )
            )}
          </div>

          {/* Automation callouts */}
          <div className="mt-8 pt-6 border-t border-slate-800 grid md:grid-cols-3 gap-4">
            {[
              { icon: '⏰', label: '24hr auto-reminder', desc: 'If agent doesn\'t open the link' },
              { icon: '⏰', label: '72hr auto-reminder', desc: 'If still no action at 3 days' },
              { icon: '📲', label: 'LO instant alert', desc: 'Text + email on account claim' },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg">{a.icon}</span>
                <div>
                  <p className="text-white text-xs font-bold">{a.label}</p>
                  <p className="text-slate-500 text-xs">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-6 pb-28 text-center">
        <div className="rounded-2xl border border-slate-800 bg-[#0B1121] p-10">
          {/* Cyan top accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent mb-8" />
          <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
            Ready to send your first WOW link?
          </h2>
          <p className="text-slate-400 mb-8 text-base">
            Sign up free. Send your first link in under 2 minutes. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="bg-[#f86f1b] hover:bg-[#e5631a] text-white font-extrabold text-base px-8 py-4 rounded-2xl transition-all shadow-lg shadow-orange-900/30"
            >
              Get Started Free →
            </button>
            <button
              onClick={() => navigate('/signin')}
              className="border border-slate-700 text-slate-300 font-semibold text-base px-8 py-4 rounded-2xl hover:border-slate-500 hover:text-white transition-all"
            >
              Sign In
            </button>
          </div>
          <p className="text-slate-600 text-xs mt-6">
            Already working with agents?{' '}
            <button onClick={() => navigate('/signin')} className="text-cyan-500 hover:text-cyan-400 transition-colors">
              Sign in and send your first link →
            </button>
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default HowItWorksPage;
