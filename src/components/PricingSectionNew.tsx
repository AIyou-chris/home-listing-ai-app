import React from 'react';
import { StripeLogo } from './StripeLogo';
import { BackgroundTechIcons } from './BackgroundTechIcons';

interface PricingProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
}

export const PricingSectionNew: React.FC<PricingProps> = ({ onNavigateToSignUp, onEnterDemoMode }) => {
    return (
        <section id="pricing" className="relative py-24 lg:py-32 bg-[#02050D] overflow-hidden">

            {/* Ambient Background */}
            <BackgroundTechIcons />
            <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[700px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik02MCAwaC0xdjYwaDFWMHptLTYwIDYwaDYwdi0xSDB2MXoiIGZpbGw9IiMzMzQxNTUiIGZpbGwtb3BhY2l0eT0iMC4yNCIvPjwvZz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent,transparent)] opacity-[0.15] mix-blend-overlay pointer-events-none"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
                    <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase mb-3">PRICING</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                        Pricing
                    </h2>
                    <h3 className="text-xl md:text-2xl text-slate-300 font-medium leading-relaxed mb-6">
                        Start free. Upgrade when you want more listings, more reports, and appointment reminders.
                    </h3>
                    <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed">
                        Built for agents who want more leads without more apps.
                        Email alerts are live now. SMS turns on as soon as approval lands.
                    </p>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid lg:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">

                    {/* Free Card */}
                    <div className="bg-[#0B1121]/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 flex flex-col hover:border-slate-600 transition-colors h-full">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-5xl font-extrabold text-white">$0</span>
                                <span className="text-slate-400">/ month</span>
                            </div>
                            <p className="text-slate-400 text-sm h-10">Try it on one listing today.</p>
                        </div>

                        <div className="flex-grow">
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-slate-500 text-xl font-light shrink-0">check</span>
                                    1 Active AI Listing
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-slate-500 text-xl font-light shrink-0">check</span>
                                    1 Market Report / month
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-slate-500 text-xl font-light shrink-0">check</span>
                                    Lead Inbox (basic)
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-slate-500 text-xl font-light shrink-0">check</span>
                                    Instant Email Alerts (live)
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-slate-500 text-xl font-light shrink-0">check</span>
                                    Shareable link + QR
                                </li>
                            </ul>
                        </div>

                        <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                            <p className="text-xs text-slate-400">
                                25 lead cap • "Made with HomeListingAI" badge
                            </p>
                        </div>

                        <button onClick={onNavigateToSignUp} className="w-full py-3.5 px-6 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-white font-semibold transition-all text-center mb-4">
                            Start Free
                        </button>
                        <p className="text-center text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-auto">
                            Best for: testing on one listing
                        </p>
                    </div>

                    {/* Starter Card */}
                    <div className="bg-[#0B1121]/80 backdrop-blur-sm border border-slate-700 rounded-3xl p-8 flex flex-col hover:border-cyan-900/50 transition-colors h-full">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-5xl font-extrabold text-white">$34</span>
                                <span className="text-slate-400">/ month</span>
                            </div>
                            <p className="text-slate-400 text-sm h-10">For agents running a handful of listings.</p>
                        </div>

                        <div className="flex-grow">
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    5 Active AI Listings
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    10 Market Reports / month
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    Lead Inbox + Status Tracking
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    Email Alerts + Lead Summary
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    Open House QR Pack (flyer + sign QR)
                                </li>
                            </ul>
                        </div>

                        <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                            <p className="text-[11px] text-slate-400 leading-snug">
                                Extra listings $6/mo • Extra reports $1 • Lead storage add-on $10/mo
                            </p>
                        </div>

                        <button onClick={onNavigateToSignUp} className="w-full py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold transition-all text-center mb-4">
                            Get Starter
                        </button>
                        <p className="text-center text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-auto">
                            Best for: active listings + open houses
                        </p>
                    </div>

                    {/* Pro Card (Highlighted) */}
                    <div className="relative bg-gradient-to-b from-[#0F172A] to-[#0B1121] backdrop-blur-sm border-2 border-cyan-500/50 rounded-3xl p-8 flex flex-col shadow-[0_0_30px_rgba(6,182,212,0.15)] transform md:-translate-y-2 h-full z-10 transition-transform hover:scale-[1.02]">

                        {/* Most Popular Badge */}
                        <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-1/2">
                            <span className="bg-cyan-500 text-[#02050D] text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg shadow-cyan-500/40">
                                MOST POPULAR
                            </span>
                        </div>

                        <div className="mb-8 mt-2">
                            <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200">$79</span>
                                <span className="text-slate-400">/ month</span>
                            </div>
                            <p className="text-cyan-100/70 text-sm h-10">The "holy sh*t" version. Built to reduce no-shows.</p>
                        </div>

                        <div className="flex-grow">
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    25 Active AI Listings
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    50 Market Reports / month
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Lead Inbox + Activity Timeline
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Email Alerts + Priority Routing
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Appointments Panel
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Appointment Reminder Call Bot (200 calls/mo)
                                </li>
                            </ul>
                        </div>

                        <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                            <p className="text-[11px] text-slate-400 leading-snug">
                                Extra reminder calls $0.25 each
                            </p>
                        </div>

                        <button onClick={onNavigateToSignUp} className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all text-center shadow-[0_0_20px_rgba(6,182,212,0.3)] mb-4">
                            Go Pro
                        </button>
                        <p className="text-center text-[11px] text-cyan-500/80 uppercase tracking-widest font-semibold mt-auto">
                            Best for: teams + appointment reminders
                        </p>
                    </div>
                </div>

                {/* SMS Call-Out Strip */}
                <div className="max-w-6xl mx-auto mb-16">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 lg:p-10 flex flex-col md:flex-row gap-8 items-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0iIzMzNDE1NSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')]">
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-2xl font-bold text-white mb-3">SMS is coming soon.</h3>
                            <p className="text-slate-400 leading-relaxed max-w-lg mb-0 text-sm">
                                Your system is already wired for SMS. We'll flip it on the moment approval lands.
                                SMS counts sent + received.
                            </p>
                        </div>
                        <div className="flex-1 w-full bg-slate-950 rounded-xl border border-slate-800 p-6 shadow-inner">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Add-On Preview</p>
                            <ul className="space-y-4">
                                <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/60 pb-3">
                                    <span className="text-white font-medium text-sm">Starter SMS Add-On</span>
                                    <span className="text-slate-400 text-xs">$9/mo (250 SMS) • $0.04 per extra SMS</span>
                                </li>
                                <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <span className="text-white font-medium text-sm">Pro SMS Add-On</span>
                                    <span className="text-slate-400 text-xs">$19/mo (1,000 SMS) • $0.03 per extra SMS</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* FAQ Mini Row */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20 border-t border-slate-800/60 pt-16">
                    <div className="text-center md:text-left">
                        <h4 className="text-white font-semibold mb-2">
                            What counts as an SMS?
                        </h4>
                        <p className="text-slate-400 text-sm">Sent + received messages both count.</p>
                    </div>
                    <div className="text-center md:text-left">
                        <h4 className="text-white font-semibold mb-2">
                            Will I get billed for overages?
                        </h4>
                        <p className="text-slate-400 text-sm">Only if you go past your included limits — and it's transparent.</p>
                    </div>
                    <div className="text-center md:text-left">
                        <h4 className="text-white font-semibold mb-2">
                            Can I cancel anytime?
                        </h4>
                        <p className="text-slate-400 text-sm">Yes. No contracts.</p>
                    </div>
                </div>

                {/* Bottom CTA Row */}
                <div className="flex flex-col items-center justify-center pt-8 border-t border-slate-900 pt-16">
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-4">
                        <button
                            onClick={onEnterDemoMode}
                            className="w-full sm:w-auto px-8 py-4 bg-transparent border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 font-semibold rounded-lg transition-all text-lg flex items-center justify-center gap-2"
                        >
                            See a Live Example
                        </button>
                        <button
                            onClick={onNavigateToSignUp}
                            className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-lg transition-all text-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        >
                            Start Free Trial
                        </button>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">
                        No credit card required to start.
                    </p>
                </div>

            </div>
        </section>
    );
};
