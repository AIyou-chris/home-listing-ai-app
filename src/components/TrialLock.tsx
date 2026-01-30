import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Lock,
    Settings,
    HelpCircle,
    Rocket,
    ShieldCheck,
    Zap
} from 'lucide-react';
import { AppUser } from '../App';

interface TrialLockProps {
    _user: AppUser;
}

const TrialLock: React.FC<TrialLockProps> = ({ _user }) => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-500">
            <div className="w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10">
                <div className="flex flex-col md:flex-row h-full">
                    {/* Left Side: Visual/Context */}
                    <div className="md:w-5/12 bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-6">
                                <Rocket className="w-6 h-6 text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 italic tracking-tight">Time's Up!</h2>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Your trial adventure has ended. Your AI sidekick is currently in "Sleep Mode."
                            </p>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center gap-3 group">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <span className="text-xs text-slate-300">Data is safe and secure</span>
                            </div>
                            <div className="flex items-center gap-3 group">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <span className="text-xs text-slate-300">Reactivate in 1-click</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Action/Upsell */}
                    <div className="md:w-7/12 p-8 bg-[#0F172A]">
                        <div className="flex items-center gap-2 mb-6 text-xs font-semibold text-blue-400 uppercase tracking-widest bg-blue-500/10 w-fit px-3 py-1 rounded-full border border-blue-500/20">
                            <Lock className="w-3 h-3" />
                            Trial Membership Expired
                        </div>

                        <h3 className="text-xl font-semibold text-white mb-4">You're one step away from unlimited potential.</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                            Unlock the full power of HomeListingAI. Create unlimited smart listings, export your leads, and keep your AI Agent working for you 24/7.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/billing')}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 flex items-center justify-center gap-2"
                            >
                                Join the Pro Club
                                <Rocket className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => navigate('/settings')}
                                className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-medium py-3 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                Manage Account
                            </button>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Need help?</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <a href="mailto:support@homelistingai.com" className="hover:text-white transition-colors">Support</a>
                                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                <a href="#" className="hover:text-white transition-colors">Documentation</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrialLock;
