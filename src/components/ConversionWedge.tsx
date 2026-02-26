import React from 'react';

interface ConversionWedgeProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
}

export const ConversionWedge: React.FC<ConversionWedgeProps> = ({ onNavigateToSignUp, onEnterDemoMode }) => {
    return (
        <section id="how-it-works" className="relative py-24 lg:py-32 bg-slate-950 overflow-hidden border-t border-slate-900">
            {/* Background Gradients & Glows */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-10">

                {/* 1) Headline + Subhead (Centered) */}
                <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                        Your Listing Becomes the Funnel.
                    </h2>
                    <p className="text-xl md:text-2xl text-slate-300 font-light leading-relaxed mb-4">
                        Share one link or QR. Buyers get instant answers + the 1-page market report.
                        <br className="hidden md:block" />
                        <span className="text-cyan-400 font-medium tracking-wide">You get the lead, the context, and the next step — automatically.</span>
                    </p>
                    <div className="inline-block mt-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                        <p className="text-xs md:text-sm text-slate-400 font-medium tracking-wide flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> SMS coming soon
                            <span className="text-slate-700 mx-1">•</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Email alerts live
                            <span className="text-slate-700 mx-1">•</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Appointment reminder calls live
                        </p>
                    </div>
                </div>

                {/* 2) Two Visual Cards Side-By-Side */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">

                    {/* Visual Card 1: AI Listing Page */}
                    <div className="bg-[#0B1121] rounded-2xl border border-slate-800 p-8 shadow-xl shadow-black/50 hover:border-cyan-900/50 transition-colors group relative overflow-hidden">
                        {/* Glow effect on hover */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/0 to-transparent group-hover:via-cyan-500/50 transition-all duration-700"></div>

                        <div className="flex flex-col h-full">
                            <div className="mb-8">
                                <h3 className="text-2xl font-semibold text-white mb-2 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-cyan-400">phone_iphone</span>
                                    AI Listing Page
                                </h3>
                                <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">What buyers interact with</p>
                            </div>

                            {/* Placeholder UI block representing phone screen */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8 flex-1 relative flex flex-col gap-3">
                                <div className="w-full h-32 bg-slate-800/50 rounded-lg animate-pulse"></div>
                                <div className="w-3/4 h-4 bg-slate-800 rounded"></div>
                                <div className="w-1/2 h-4 bg-slate-800 rounded"></div>
                                <div className="mt-auto pt-4 flex gap-2">
                                    <div className="h-10 flex-1 bg-cyan-600/20 border border-cyan-500/30 rounded-lg"></div>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check_circle</span>
                                    Answers questions 24/7
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check_circle</span>
                                    "Request a showing" built in
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check_circle</span>
                                    "Get the report" CTA included
                                </li>
                            </ul>

                            <div className="mt-auto">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400">
                                    <span className="material-symbols-outlined text-[14px]">qr_code_2</span> Shareable link + QR
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Card 2: 1-Page Market Report */}
                    <div className="bg-[#0B1121] rounded-2xl border border-slate-800 p-8 shadow-xl shadow-black/50 hover:border-blue-900/50 transition-colors group relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/50 transition-all duration-700"></div>
                        <div className="flex flex-col h-full">
                            <div className="mb-8">
                                <h3 className="text-2xl font-semibold text-white mb-2 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-blue-400">description</span>
                                    1-Page Market Report
                                </h3>
                                <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">What makes you look like the pro</p>
                            </div>

                            {/* Placeholder UI block representing report document */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8 flex-1 relative flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="w-1/3 h-6 bg-slate-800 rounded"></div>
                                    <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-sm"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <div className="h-16 bg-slate-800/50 rounded-lg"></div>
                                    <div className="h-16 bg-slate-800/50 rounded-lg"></div>
                                </div>
                                <div className="w-full h-20 bg-slate-800/30 rounded-lg mt-auto border border-slate-800/50"></div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-blue-500 text-xl shrink-0">check_circle</span>
                                    Market snapshot + pricing context
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-blue-500 text-xl shrink-0">check_circle</span>
                                    Clean, send-worthy layout
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-blue-500 text-xl shrink-0">check_circle</span>
                                    QR lead capture embedded
                                </li>
                            </ul>

                            <div className="mt-auto">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400">
                                    <span className="material-symbols-outlined text-[14px]">bolt</span> Generated in minutes
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* 3) Three Outcome Cards Underneath */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {/* Capture Card */}
                    <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl hover:bg-slate-900/80 transition-colors">
                        <div className="w-12 h-12 bg-cyan-950 border border-cyan-900 rounded-xl flex items-center justify-center mb-5 shadow-inner shadow-cyan-500/20">
                            <span className="material-symbols-outlined text-cyan-400">person_add</span>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Capture</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-5">
                            Turn "Is it available?" into a saved lead in seconds.
                        </p>
                        <ul className="space-y-2.5">
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-cyan-500 mt-2 shrink-0"></span> Name + phone/email captured
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-cyan-500 mt-2 shrink-0"></span> Auto-deduped per listing
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-cyan-500 mt-2 shrink-0"></span> Source tracked (link/QR/social)
                            </li>
                        </ul>
                    </div>

                    {/* Alert Card */}
                    <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl hover:bg-slate-900/80 transition-colors">
                        <div className="w-12 h-12 bg-blue-950 border border-blue-900 rounded-xl flex items-center justify-center mb-5 shadow-inner shadow-blue-500/20">
                            <span className="material-symbols-outlined text-blue-400">notifications_active</span>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Alert</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-5">
                            Know the moment someone raises their hand.
                        </p>
                        <ul className="space-y-2.5">
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span> Instant email notification
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span> Lead shows in your inbox
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span> Appointment reminder calls (no-show killer)
                            </li>
                        </ul>
                    </div>

                    {/* Convert Card */}
                    <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl hover:bg-slate-900/80 transition-colors">
                        <div className="w-12 h-12 bg-green-950 border border-green-900 rounded-xl flex items-center justify-center mb-5 shadow-inner shadow-green-500/20">
                            <span className="material-symbols-outlined text-green-400">check_circle</span>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Convert</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-5">
                            Follow-up stays organized without extra work.
                        </p>
                        <ul className="space-y-2.5">
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0"></span> Lead status + activity timeline
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0"></span> Appointment panel (set once, reminders auto)
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0"></span> Clean handoff to the agent
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 4) CTA Row */}
                <div className="flex flex-col items-center justify-center border-t border-slate-800/50 pt-12">
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-4">
                        <button
                            onClick={onEnterDemoMode}
                            className="px-8 py-4 bg-transparent border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 font-semibold rounded-lg transition-all text-lg flex items-center justify-center gap-2"
                        >
                            See the AI Listing + Report
                        </button>
                        <button
                            onClick={onNavigateToSignUp}
                            className="px-8 py-4 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-lg transition-all text-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        >
                            Start Free Trial
                        </button>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">
                        Built for agents who want more leads without more apps.
                    </p>
                </div>

            </div>
        </section>
    );
};
