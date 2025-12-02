import React from 'react';
import { AgentProfile } from '../../context/AgentBrandingContext';

export interface CoverConfig {
    title: string;
    subtitle: string;
    themeColor: 'blue' | 'slate' | 'emerald' | 'purple' | 'amber';
    customImageUrl?: string;
}

interface CoverPageBuilderProps {
    config: CoverConfig;
    onChange: (config: CoverConfig) => void;
    onNext: () => void;
    onBack: () => void;
    agentProfile: AgentProfile;
}

const THEMES = [
    { id: 'blue', label: 'Trust Blue', class: 'bg-blue-900', accent: 'bg-blue-600' },
    { id: 'slate', label: 'Modern Slate', class: 'bg-slate-900', accent: 'bg-slate-600' },
    { id: 'emerald', label: 'Fresh Emerald', class: 'bg-emerald-900', accent: 'bg-emerald-600' },
    { id: 'purple', label: 'Royal Purple', class: 'bg-purple-900', accent: 'bg-purple-600' },
    { id: 'amber', label: 'Warm Amber', class: 'bg-amber-900', accent: 'bg-amber-600' },
] as const;

const CoverPageBuilder: React.FC<CoverPageBuilderProps> = ({ config, onChange, onNext, onBack, agentProfile }) => {
    const activeTheme = THEMES.find(t => t.id === config.themeColor) || THEMES[0];

    return (
        <div className="max-w-6xl mx-auto py-8 px-6 flex gap-8 h-[calc(100vh-100px)]">
            {/* Left Panel: Controls */}
            <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col overflow-y-auto">
                <div className="mb-6">
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium mb-4">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Back
                    </button>
                    <h2 className="text-2xl font-bold text-slate-900">Customize Cover</h2>
                    <p className="text-slate-500 text-sm mt-1">Make a great first impression.</p>
                </div>

                <div className="space-y-6 flex-1">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Report Title</label>
                        <input
                            type="text"
                            value={config.title}
                            onChange={(e) => onChange({ ...config, title: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            placeholder="e.g. Strategic Marketing Plan"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Subtitle / Prepared For</label>
                        <input
                            type="text"
                            value={config.subtitle}
                            onChange={(e) => onChange({ ...config, subtitle: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            placeholder="e.g. Prepared for John & Jane Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">Color Theme</label>
                        <div className="grid grid-cols-5 gap-2">
                            {THEMES.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => onChange({ ...config, themeColor: theme.id as any })}
                                    className={`h-10 rounded-full border-2 transition-all ${theme.class} ${config.themeColor === theme.id ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                                    title={theme.label}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center font-medium">{activeTheme.label}</p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <button
                        onClick={onNext}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        Generate Report
                        <span className="material-symbols-outlined">auto_awesome</span>
                    </button>
                </div>
            </div>

            {/* Right Panel: Live Preview */}
            <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center p-8 overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>

                {/* Scaled Preview of Cover Page */}
                <div
                    className={`bg-white shadow-2xl w-[148mm] h-[210mm] flex flex-col relative overflow-hidden transition-all duration-500 ${activeTheme.class} text-white`}
                    style={{ transform: 'scale(1)' }} // Adjust scale if needed for smaller screens
                >
                    {/* Decorative Background Elements */}
                    <div className={`absolute top-0 right-0 w-64 h-64 ${activeTheme.accent} rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2`}></div>
                    <div className={`absolute bottom-0 left-0 w-64 h-64 ${activeTheme.accent} rounded-full blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2`}></div>

                    {/* Agent Branding */}
                    <div className="relative z-10 flex flex-col items-center mt-16">
                        {agentProfile.headshotUrl && (
                            <img
                                src={agentProfile.headshotUrl}
                                alt={agentProfile.name}
                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl mb-6"
                            />
                        )}
                        {agentProfile.logoUrl && (
                            <img src={agentProfile.logoUrl} alt="Company Logo" className="h-12 object-contain mb-6 brightness-0 invert opacity-80" />
                        )}
                    </div>

                    {/* Title Section */}
                    <div className="relative z-10 text-center mt-auto mb-24 px-8">
                        <h1 className="text-3xl font-bold mb-4 leading-tight">
                            {config.title || 'Report Title'}
                        </h1>
                        <p className="text-xl opacity-90 font-light">
                            {config.subtitle || 'Subtitle'}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="relative z-10 text-center border-t border-white/10 pt-6 pb-8 mx-8">
                        <p className="text-base font-semibold">{agentProfile.name}</p>
                        <p className="text-sm opacity-70">{agentProfile.title} | {agentProfile.company}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoverPageBuilder;
