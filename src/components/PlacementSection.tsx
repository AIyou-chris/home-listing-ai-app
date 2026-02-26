import React from 'react';

interface PlacementSectionProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
}

export const PlacementSection: React.FC<PlacementSectionProps> = ({ onNavigateToSignUp, onEnterDemoMode }) => {
    return (
        <section id="use-cases" className="relative py-24 lg:py-32 bg-[#040814] overflow-hidden border-t border-slate-900">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                <div className="flex flex-col lg:flex-row gap-16 lg:gap-12 items-center lg:items-start">

                    {/* Left Column: Copy */}
                    <div className="w-full lg:w-5/12 text-center lg:text-left pt-4">
                        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                            Where HomeListingAI Prints Leads.
                        </h2>
                        <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed mb-10">
                            Share one link or QR. Use it on signs, open houses, and social.
                            <br className="hidden lg:block" />
                            <span className="text-cyan-400 mt-2 block font-medium">You’re not changing your workflow — you’re upgrading it.</span>
                        </p>

                        <ul className="space-y-5 text-left max-w-md mx-auto lg:mx-0">
                            <li className="flex items-start gap-4 text-slate-200 bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
                                <span className="material-symbols-outlined text-cyan-400 mt-0.5">add_link</span>
                                <span className="font-medium">One link works everywhere</span>
                            </li>
                            <li className="flex items-start gap-4 text-slate-200 bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
                                <span className="material-symbols-outlined text-cyan-400 mt-0.5">ads_click</span>
                                <span className="font-medium">Every click becomes a tracked lead</span>
                            </li>
                            <li className="flex text-sm items-start gap-3 text-slate-400 p-4">
                                <span>
                                    <span className="w-1.5 h-1.5 inline-block rounded-full bg-green-500 mr-2 align-middle"></span>Email alerts live
                                    <span className="mx-2">•</span>
                                    <span className="w-1.5 h-1.5 inline-block rounded-full bg-yellow-500 mr-2 align-middle"></span>SMS coming soon
                                    <br className="sm:hidden" />
                                    <span className="hidden sm:inline mx-2">•</span>
                                    <span className="w-1.5 h-1.5 inline-block rounded-full bg-green-500 mr-2 align-middle mt-2 sm:mt-0"></span>Appointment reminder calls live
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Right Column: Grid of Placement Tiles */}
                    <div className="w-full lg:w-7/12">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                            {/* Tile 1 */}
                            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-900/50 hover:bg-slate-800/80 transition-all rounded-2xl p-5 flex flex-col group">
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-cyan-400">qr_code_scanner</span>
                                </div>
                                <h4 className="text-white font-semibold mb-1">Yard Sign QR</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">Scan → instant answers + report request</p>
                            </div>

                            {/* Tile 2 */}
                            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-900/50 hover:bg-slate-800/80 transition-all rounded-2xl p-5 flex flex-col group">
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-cyan-400">real_estate_agent</span>
                                </div>
                                <h4 className="text-white font-semibold mb-1">Open House Flyer</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">Capture every walk-in with one QR</p>
                            </div>

                            {/* Tile 3 */}
                            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-900/50 hover:bg-slate-800/80 transition-all rounded-2xl p-5 flex flex-col group">
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-cyan-400">smartphone</span>
                                </div>
                                <h4 className="text-white font-semibold mb-1">Instagram / TikTok</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">Link in bio → AI Listing page</p>
                            </div>

                            {/* Tile 4 */}
                            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-900/50 hover:bg-slate-800/80 transition-all rounded-2xl p-5 flex flex-col group">
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-cyan-400">groups</span>
                                </div>
                                <h4 className="text-white font-semibold mb-1">Facebook Groups</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">Drop the link → stop losing DMs</p>
                            </div>

                            {/* Tile 5 */}
                            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-900/50 hover:bg-slate-800/80 transition-all rounded-2xl p-5 flex flex-col group">
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-cyan-400">forward_to_inbox</span>
                                </div>
                                <h4 className="text-white font-semibold mb-1">Follow-up Email</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">Send the report + keep the thread alive</p>
                            </div>

                            {/* Tile 6 */}
                            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-900/50 hover:bg-slate-800/80 transition-all rounded-2xl p-5 flex flex-col group">
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-cyan-400">handshake</span>
                                </div>
                                <h4 className="text-white font-semibold mb-1">Listing Appointment</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">Show the report as your proof-of-work</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Row */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-20 pt-16 border-t border-slate-900/50">
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

            </div>
        </section>
    );
};
