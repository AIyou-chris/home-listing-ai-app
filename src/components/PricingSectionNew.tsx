import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StripeLogo as _StripeLogo } from './StripeLogo';
import { BackgroundTechIcons } from './BackgroundTechIcons';

interface PricingProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
    onOpenComparePlans?: () => void;
}

export const PricingSectionNew: React.FC<PricingProps> = ({ onNavigateToSignUp: _onNavigateToSignUp, onEnterDemoMode, onOpenComparePlans }) => {
    const navigate = useNavigate();
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
                        One Listing Can Pay for This Forever.
                    </h2>
                    <h3 className="text-xl md:text-2xl text-slate-300 font-medium leading-relaxed mb-6">
                        Start free on one listing. Upgrade when your pipeline — and your partnerships — demand more.
                    </h3>
                    <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed">
                        Built for loan officers and their agent partners. Email and SMS alerts included.
                        LO includes 250 texts/month. LO Pro includes unlimited.
                    </p>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid lg:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">

                    {/* LO Card */}
                    <div className="bg-[#0B1121]/80 backdrop-blur-sm border border-slate-700 rounded-3xl p-8 flex flex-col hover:border-cyan-900/50 transition-colors h-full">
                        <div className="mb-8">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
                                <span className="material-symbols-outlined text-[14px]">person</span> Loan Officer
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">LO</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-5xl font-extrabold text-white">$149</span>
                                <span className="text-slate-400">/ month</span>
                            </div>
                            <p className="text-slate-400 text-sm h-10">For the LO building their agent partner network and filling their pipeline.</p>
                        </div>

                        <div className="flex-grow">
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    20 active listings across your partner network
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    Full marketing package per listing
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    AI buyer chatbot on every listing page
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    Co-branded with your name + NMLS #
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    Warm lead alerts to you + your agent partner
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    Preapproval request capture built in
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    Lead inbox + activity timeline
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                    250 SMS / month included
                                </li>
                            </ul>
                        </div>

                        <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                            <p className="text-[11px] text-slate-400 leading-snug">
                                +$7/listing over 20 • No contracts • Cancel anytime
                            </p>
                        </div>

                        <button onClick={() => navigate('/lo-signup?plan=lo')} className="w-full py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold transition-all text-center mb-4">
                            Start LO — Free 3 Days
                        </button>
                        <p className="text-center text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-auto">
                            Best for: solo LOs building partnerships
                        </p>
                    </div>

                    {/* LO Pro Card (Highlighted) */}
                    <div className="relative bg-gradient-to-b from-[#0F172A] to-[#0B1121] backdrop-blur-sm border-2 border-cyan-500/50 rounded-3xl p-8 flex flex-col shadow-[0_0_30px_rgba(6,182,212,0.15)] transform md:-translate-y-2 h-full z-10 transition-transform hover:scale-[1.02]">

                        <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-1/2">
                            <span className="bg-cyan-500 text-[#02050D] text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg shadow-cyan-500/40">
                                MOST POPULAR
                            </span>
                        </div>

                        <div className="mb-8 mt-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-xs font-semibold uppercase tracking-wide mb-3">
                                <span className="material-symbols-outlined text-[14px]">trending_up</span> High Volume
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">LO Pro</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200">$299</span>
                                <span className="text-slate-400">/ month</span>
                            </div>
                            <p className="text-cyan-100/70 text-sm h-10">For the high-volume LO running a serious agent network and a pipeline that never stops.</p>
                        </div>

                        <div className="flex-grow">
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    50 active listings across your partner network
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Everything in LO — all features included
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Unlimited SMS / month
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Priority lead routing + instant alerts
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Appointments panel + reminder automation
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    ROI dashboard — see your pipeline value
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Agent partner management dashboard
                                </li>
                                <li className="flex items-start gap-3 text-white font-medium">
                                    <span className="material-symbols-outlined text-cyan-400 text-xl shrink-0">check</span>
                                    Co-branded assets with your LO branding
                                </li>
                            </ul>
                        </div>

                        <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                            <p className="text-[11px] text-slate-400 leading-snug">
                                +$5/listing over 50 • No contracts • Cancel anytime
                            </p>
                        </div>

                        <button onClick={() => navigate('/lo-signup?plan=lo_pro')} className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all text-center shadow-[0_0_20px_rgba(6,182,212,0.3)] mb-4">
                            Go Pro — Free 3 Days
                        </button>
                        <p className="text-center text-[11px] text-cyan-500/80 uppercase tracking-widest font-semibold mt-auto">
                            Best for: high-volume LOs + growing networks
                        </p>
                    </div>

                    {/* LO Office / White Label Card */}
                    <div className="relative bg-gradient-to-b from-[#0F0F1A] to-[#0B1121] backdrop-blur-sm border border-slate-700 rounded-3xl p-8 flex flex-col hover:border-slate-500 transition-colors h-full overflow-hidden">
                        {/* Subtle gold shimmer top line */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"></div>

                        <div className="mb-8">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-700/30 text-amber-400 text-xs font-semibold uppercase tracking-wide mb-3">
                                <span className="material-symbols-outlined text-[14px]">business</span> Office / Branch
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">LO Office</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-3xl font-extrabold text-white">Custom Pricing</span>
                            </div>
                            <p className="text-slate-400 text-sm h-10">Full white-label build for your branch or lending team. Your brand. Your domain. Your buyers.</p>
                        </div>

                        <div className="flex-grow">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Everything in LO Pro, plus:</p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">check</span>
                                    Custom domain — <span className="text-slate-400">app.yourbrand.com</span>
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">check</span>
                                    Full office branding on every listing page
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">check</span>
                                    Office NMLS # on all assets + disclosures
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">check</span>
                                    Unlimited listings across your LO team
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">check</span>
                                    Branch manager oversight dashboard
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">check</span>
                                    LO leaderboard + performance tracking
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">check</span>
                                    Lead webhook to your CRM
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">check</span>
                                    Dedicated onboarding + priority support
                                </li>
                            </ul>
                        </div>

                        <div className="mb-6 p-4 bg-amber-950/20 rounded-xl border border-amber-900/30">
                            <p className="text-[11px] text-amber-400/80 leading-snug">
                                Priced per office based on LO count and listing volume
                            </p>
                        </div>

                        <a href="mailto:hello@homelistingai.com" className="w-full py-3.5 px-6 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-amber-400 font-semibold transition-all text-center mb-4 block">
                            Get a Custom Quote
                        </a>
                        <p className="text-center text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-auto">
                            Best for: branches, teams &amp; enterprise lenders
                        </p>
                    </div>
                </div>

                {/* SMS Call-Out Strip */}
                <div className="max-w-6xl mx-auto mb-16">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 lg:p-10 flex flex-col md:flex-row gap-8 items-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0iIzMzNDE1NSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')]">
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-2xl font-bold text-white mb-3">Live SMS follow-up is included.</h3>
                            <p className="text-slate-400 leading-relaxed max-w-lg mb-0 text-sm">
                                Use SMS for first-touch, showing confirmations, reminders, and open house follow-up.
                                Only automated outbound texts count toward your plan.
                            </p>
                        </div>
                        <div className="flex-1 w-full bg-slate-950 rounded-xl border border-slate-800 p-6 shadow-inner">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Included Each Month</p>
                            <ul className="space-y-4">
                                <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/60 pb-3">
                                    <span className="text-white font-medium text-sm">LO</span>
                                    <span className="text-slate-400 text-xs">250 outbound SMS / month included</span>
                                </li>
                                <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <span className="text-white font-medium text-sm">LO Pro</span>
                                    <span className="text-slate-400 text-xs">Unlimited outbound SMS / month</span>
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
                        <p className="text-slate-400 text-sm">Only automated outbound texts count.</p>
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
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={onEnterDemoMode}
                                className="flex-1 sm:flex-none px-5 py-4 bg-transparent border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 font-semibold rounded-lg transition-all text-sm flex flex-col items-center justify-center gap-0.5"
                            >
                                <span>Agent Demo</span>
                                <span className="text-[10px] text-cyan-600 font-normal">Dashboard view</span>
                            </button>
                            <button
                                onClick={() => navigate('/lo-demo')}
                                className="flex-1 sm:flex-none px-5 py-4 bg-transparent border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 font-semibold rounded-lg transition-all text-sm flex flex-col items-center justify-center gap-0.5"
                            >
                                <span>LO Demo</span>
                                <span className="text-[10px] text-cyan-600 font-normal">Loan officer view</span>
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/lo-signup')}
                            className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-lg transition-all text-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        >
                            Create Free Account
                        </button>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">
                        No credit card required to start.
                    </p>
                    {onOpenComparePlans && (
                        <button
                            onClick={onOpenComparePlans}
                            className="mt-4 text-sm text-slate-500 hover:text-cyan-400 transition-colors underline underline-offset-4"
                        >
                            See full feature comparison →
                        </button>
                    )}
                </div>

            </div>
        </section>
    );
};
