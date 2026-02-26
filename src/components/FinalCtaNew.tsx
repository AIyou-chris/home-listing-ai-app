import React from 'react';
import { BackgroundTechIcons } from './BackgroundTechIcons';
import { FadeIn } from './FadeIn';

interface FinalCtaProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
}

export const FinalCtaNew: React.FC<FinalCtaProps> = ({ onNavigateToSignUp, onEnterDemoMode }) => {
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
                        Launch your first AI Listing in minutes.
                    </h2>
                    <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed max-w-2xl mx-auto mb-10">
                        Share one link or QR. Capture leads automatically. Get instant email alerts today.<br className="hidden md:block" />
                        SMS turns on as soon as approval lands. No credit card required to start.
                    </p>
                </FadeIn>

                <FadeIn delay={200} className="flex flex-col items-center">
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8">
                        <button
                            onClick={onNavigateToSignUp}
                            className="w-full sm:w-auto px-10 py-4 bg-white text-slate-950 hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] font-bold rounded-lg transition-all text-lg flex items-center justify-center gap-2"
                        >
                            Start Free Trial
                        </button>
                        <button
                            onClick={onEnterDemoMode}
                            className="w-full sm:w-auto px-10 py-4 bg-transparent border border-cyan-500/50 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] text-cyan-400 font-semibold rounded-lg transition-all text-lg flex items-center justify-center gap-2"
                        >
                            See a Live Example
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-400 mb-8 font-medium">
                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-cyan-500 text-[20px]">check_circle</span> No credit card required</span>
                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-cyan-500 text-[20px]">check_circle</span> Email alerts live</span>
                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-cyan-500 text-[20px]">check_circle</span> Pro includes appointment reminder calls</span>
                    </div>

                    <p className="text-slate-600 text-[11px] tracking-wider uppercase font-semibold">
                        Stop losing leads after hours.
                    </p>
                </FadeIn>
            </div>
        </section>
    );
};
