import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundTechIcons } from './BackgroundTechIcons';
import { FadeIn } from './FadeIn';

interface FinalCtaProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
}

export const FinalCtaNew: React.FC<FinalCtaProps> = ({ onNavigateToSignUp, onEnterDemoMode }) => {
    const navigate = useNavigate();
    return (
        <section className="relative py-20 lg:py-24 bg-[#02050D] overflow-hidden border-t border-slate-900/60">
            {/* Ambient Background */}
            <BackgroundTechIcons />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 z-10 text-center">
                <FadeIn delay={100}>
                    <p className="text-cyan-400 font-bold tracking-widest text-xs sm:text-sm uppercase mb-4">
                        READY TO TURN LISTINGS INTO LEADS?
                    </p>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                        Stop losing leads after hours.
                    </h2>
                    <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed max-w-2xl mx-auto mb-10">
                        One WOW Link. One agent partner. Warm buyers routed straight to you — every listing, every time.<br className="hidden md:block" />
                        No credit card required. Live in under 3 minutes.
                    </p>
                </FadeIn>

                <FadeIn delay={200} className="flex flex-col items-center">
                    <div className="flex flex-col items-center gap-4 w-full mb-8">
                        {/* Primary — one action, full weight */}
                        <button
                            onClick={onNavigateToSignUp}
                            className="w-full sm:w-auto px-14 py-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl transition-all text-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_45px_rgba(6,182,212,0.6)] hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            Claim Your Free Account
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </button>
                        {/* Secondary demos — equal weight, clearly subordinate */}
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                onClick={onEnterDemoMode}
                                className="flex-1 sm:flex-none px-6 py-3 bg-transparent border border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-slate-400 hover:text-cyan-400 font-semibold rounded-lg transition-all text-sm"
                            >
                                Agent Demo
                            </button>
                            <button
                                onClick={() => navigate('/lo-demo')}
                                className="flex-1 sm:flex-none px-6 py-3 bg-transparent border border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-slate-400 hover:text-cyan-400 font-semibold rounded-lg transition-all text-sm"
                            >
                                LO Demo
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-400 mb-8 font-medium">
                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-cyan-500 text-[20px]">check_circle</span> No credit card required</span>
                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-cyan-500 text-[20px]">check_circle</span> Email alerts live</span>
                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-cyan-500 text-[20px]">check_circle</span> Paid plans include live SMS follow-up</span>
                    </div>

                    <p className="text-slate-600 text-[11px] tracking-wider uppercase font-semibold">
                        Stop losing leads after hours.
                    </p>
                </FadeIn>
            </div>
        </section>
    );
};
