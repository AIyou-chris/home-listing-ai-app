import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundTechIcons } from './BackgroundTechIcons';

interface PricingProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
    onOpenComparePlans?: () => void;
}

const INCLUDED = [
    '5 active listings across your agent partners',
    '50 WOW Links to agents each month',
    'AI buyer chat on every listing, with your name + NMLS #',
    'Warm lead alerts to you and your agent partner',
    'Your own AI phone line: 100 AI minutes a month',
    '50 text messages a month',
    'Lead inbox, appointments and follow-up',
];

export const PricingSectionNew: React.FC<PricingProps> = ({ onNavigateToSignUp: _onNavigateToSignUp, onEnterDemoMode }) => {
    const navigate = useNavigate();
    return (
        <section id="pricing" className="relative py-24 lg:py-32 bg-[#02050D] overflow-hidden">
            <BackgroundTechIcons />
            <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                <div className="text-center mb-12">
                    <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase mb-3">PRICING</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">One plan. One price.</h2>
                    <p className="text-lg text-slate-300">Try it free for 7 days. No card needed.</p>
                </div>

                <div className="bg-[#0B1121]/80 backdrop-blur-sm border border-cyan-500/40 rounded-3xl p-8 sm:p-10">
                    <h3 className="text-2xl font-bold text-white mb-2">HomeListingAI for Loan Officers</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl font-extrabold text-white">$79</span>
                        <span className="text-slate-400">/ month</span>
                    </div>
                    <p className="inline-block rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-semibold px-3 py-1 mb-6">
                        Founding price: the first 25 loan officers pay $49 a month for as long as they stay subscribed.
                    </p>
                    <ul className="space-y-3 mb-8">
                        {INCLUDED.map((item) => (
                            <li key={item} className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={() => navigate('/lo-signup')}
                        className="w-full py-4 px-6 rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-bold text-lg transition-all"
                    >
                        Start Your 7-Day Free Trial
                    </button>
                    <p className="text-center text-slate-400 text-sm mt-4">No card needed · Month to month · Cancel anytime</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-6 mt-12 text-center sm:text-left">
                    <div>
                        <h4 className="text-white font-semibold mb-1">What counts as a text?</h4>
                        <p className="text-slate-400 text-sm">Only texts we send for you.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-1">What if I use all my minutes?</h4>
                        <p className="text-slate-400 text-sm">Calls ring your cell phone instead.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-1">Can I cancel anytime?</h4>
                        <p className="text-slate-400 text-sm">Yes. No contracts.</p>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 mt-12">
                    <button onClick={onEnterDemoMode} className="px-5 py-3 border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 font-semibold rounded-lg">Agent Demo</button>
                    <button onClick={() => navigate('/lo-demo')} className="px-5 py-3 border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 font-semibold rounded-lg">LO Demo</button>
                </div>
            </div>
        </section>
    );
};
