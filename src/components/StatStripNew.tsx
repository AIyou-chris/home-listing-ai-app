import React from 'react';

export const StatStripNew: React.FC = () => {
    return (
        <section className="relative py-12 bg-[#02050D] border-y border-slate-900/60 overflow-hidden">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">

                    <div className="flex flex-col items-center justify-center p-4">
                        <span className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
                            840k+
                        </span>
                        <span className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                            Leads Captured
                        </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4">
                        <span className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 tracking-tight drop-shadow-sm">
                            120k+
                        </span>
                        <span className="text-sm font-semibold uppercase tracking-widest text-cyan-500/80">
                            Appointments Set
                        </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4">
                        <span className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
                            40%
                        </span>
                        <span className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                            No-Shows Reduced
                        </span>
                    </div>

                </div>
            </div>
        </section>
    );
};
