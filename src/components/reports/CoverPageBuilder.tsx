import React from 'react';
import { AgentProfile } from '../../context/AgentBrandingContext';

export interface CoverConfig {
    title: string;
    subtitle: string;
    themeColor: 'blue' | 'slate' | 'emerald' | 'purple' | 'amber' | 'brand';
    layout: 'modern' | 'classic' | 'minimal';
    backgroundStyle: 'solid' | 'gradient' | 'image';
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
    { id: 'brand', label: 'My Brand', class: 'bg-slate-900', accent: 'bg-slate-600', hex: '' }, // Dynamic
    { id: 'blue', label: 'Trust Blue', class: 'bg-blue-900', accent: 'bg-blue-600', hex: '#1e3a8a' },
    { id: 'slate', label: 'Modern Slate', class: 'bg-slate-900', accent: 'bg-slate-600', hex: '#0f172a' },
    { id: 'emerald', label: 'Fresh Emerald', class: 'bg-emerald-900', accent: 'bg-emerald-600', hex: '#064e3b' },
    { id: 'purple', label: 'Royal Purple', class: 'bg-purple-900', accent: 'bg-purple-600', hex: '#581c87' },
    { id: 'amber', label: 'Warm Amber', class: 'bg-amber-900', accent: 'bg-amber-600', hex: '#78350f' },
] as const;

const LAYOUTS = [
    { id: 'modern', label: 'Modern', icon: 'grid_view' },
    { id: 'classic', label: 'Classic', icon: 'article' },
    { id: 'minimal', label: 'Minimal', icon: 'crop_portrait' },
] as const;

const BACKGROUNDS = [
    { id: 'solid', label: 'Solid Color', icon: 'format_paint' },
    { id: 'gradient', label: 'Gradient', icon: 'gradient' },
    { id: 'image', label: 'Photo Bg', icon: 'image' },
] as const;

const CoverPageBuilder: React.FC<CoverPageBuilderProps> = ({ config, onChange, onNext, onBack, agentProfile }) => {
    const activeTheme = THEMES.find(t => t.id === config.themeColor) || THEMES[1];

    // Helper to get background style
    const getBackgroundStyle = () => {
        const baseColor = config.themeColor === 'brand' ? (agentProfile.brandColor || '#1e293b') : activeTheme.hex;

        if (config.backgroundStyle === 'image') {
            return {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${config.customImageUrl || 'https://images.unsplash.com/photo-1600596542815-2495db98dada?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            };
        }

        if (config.backgroundStyle === 'gradient') {
            if (baseColor) {
                return { background: `linear-gradient(135deg, ${baseColor} 0%, #0f172a 100%)` };
            }
            return {};
        }

        if (baseColor) {
            return { backgroundColor: baseColor };
        }

        return {};
    };

    const getThemeClass = () => {
        if (config.themeColor === 'brand') return ''; // Use inline style
        if (config.backgroundStyle === 'gradient') return `bg-gradient-to-br from-${config.themeColor}-800 to-slate-900`;
        return activeTheme.class;
    };

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
                        <div className="grid grid-cols-6 gap-2">
                            {THEMES.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => onChange({ ...config, themeColor: theme.id as CoverConfig['themeColor'] })}
                                    className={`h-10 rounded-full border-2 transition-all relative overflow-hidden ${config.themeColor === theme.id ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                                    title={theme.label}
                                    style={theme.id === 'brand' ? { backgroundColor: agentProfile.brandColor || '#000' } : undefined}
                                >
                                    {theme.id !== 'brand' && <div className={`absolute inset-0 ${theme.class}`}></div>}
                                    {theme.id === 'brand' && !agentProfile.brandColor && <span className="text-[8px] text-white font-bold flex items-center justify-center h-full">BRAND</span>}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center font-medium">{activeTheme.label}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Layout</label>
                            <div className="flex gap-2">
                                {LAYOUTS.map((layout) => (
                                    <button
                                        key={layout.id}
                                        onClick={() => onChange({ ...config, layout: layout.id as CoverConfig['layout'] })}
                                        className={`flex-1 py-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${config.layout === layout.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'}`}
                                        title={layout.label}
                                    >
                                        <span className="material-symbols-outlined text-xl">{layout.icon}</span>
                                        <span className="text-[10px] font-medium">{layout.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Background</label>
                            <div className="flex gap-2 mb-4">
                                {BACKGROUNDS.map((bg) => (
                                    <button
                                        key={bg.id}
                                        onClick={() => onChange({ ...config, backgroundStyle: bg.id as CoverConfig['backgroundStyle'] })}
                                        className={`flex-1 py-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${config.backgroundStyle === bg.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'}`}
                                        title={bg.label}
                                    >
                                        <span className="material-symbols-outlined text-xl">{bg.icon}</span>
                                        <span className="text-[10px] font-medium">{bg.label}</span>
                                    </button>
                                ))}
                            </div>

                            {config.backgroundStyle === 'image' && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors w-full justify-center border border-slate-200 border-dashed">
                                            <span className="material-symbols-outlined text-lg">cloud_upload</span>
                                            Upload Photo
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            onChange({ ...config, customImageUrl: reader.result as string });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {config.customImageUrl && (
                                            <button
                                                onClick={() => onChange({ ...config, customImageUrl: undefined })}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                title="Remove Image"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">Recommended: High resolution landscape photo.</p>
                                </div>
                            )}
                        </div>
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
            <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center p-12 overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>

                {/* Scaled Preview of Cover Page */}
                <div
                    className={`bg-white shadow-2xl w-[148mm] h-[210mm] flex flex-col relative overflow-hidden transition-all duration-500 text-white ${getThemeClass()}`}
                    style={{
                        transform: 'scale(0.9)',
                        ...getBackgroundStyle()
                    }}
                >
                    {/* Decorative Background Elements (Only for non-image backgrounds) */}
                    {config.backgroundStyle !== 'image' && (
                        <>
                            <div className={`absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2`}></div>
                            <div className={`absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2`}></div>
                        </>
                    )}

                    {/* MODERN LAYOUT */}
                    {config.layout === 'modern' && (
                        <>
                            <div className="relative z-10 flex flex-col items-center mt-24">
                                {agentProfile.headshotUrl && (
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-white/20 rounded-full blur-md transform scale-110"></div>
                                        <img
                                            src={agentProfile.headshotUrl}
                                            alt={agentProfile.name}
                                            className="w-40 h-40 rounded-full object-cover border-4 border-white/90 shadow-2xl mb-8 relative z-10"
                                        />
                                    </div>
                                )}
                                {agentProfile.logoUrl && (
                                    <img src={agentProfile.logoUrl} alt="Company Logo" className="h-16 object-contain mb-8 opacity-90" />
                                )}
                            </div>

                            <div className="relative z-10 text-center mt-auto mb-32 px-12">
                                <div className="w-20 h-1 bg-white/30 mx-auto mb-8 rounded-full"></div>
                                <h1 className="text-4xl font-bold mb-6 leading-tight tracking-tight drop-shadow-sm">
                                    {config.title || 'Report Title'}
                                </h1>
                                <p className="text-xl opacity-90 font-light tracking-wide">
                                    {config.subtitle || 'Subtitle'}
                                </p>
                            </div>
                        </>
                    )}

                    {/* CLASSIC LAYOUT */}
                    {config.layout === 'classic' && (
                        <div className="h-full border-[12px] border-white/10 m-4 flex flex-col p-12">
                            <div className="text-center mt-12">
                                <h1 className="text-5xl font-serif font-bold mb-6 leading-tight">
                                    {config.title || 'Report Title'}
                                </h1>
                                <div className="w-full h-px bg-white/40 my-8"></div>
                                <p className="text-2xl font-serif italic opacity-90">
                                    {config.subtitle || 'Subtitle'}
                                </p>
                            </div>

                            <div className="mt-auto flex flex-col items-center">
                                {agentProfile.headshotUrl && (
                                    <img
                                        src={agentProfile.headshotUrl}
                                        alt={agentProfile.name}
                                        className="w-32 h-32 rounded-full object-cover border-2 border-white shadow-lg mb-6"
                                    />
                                )}
                                <p className="text-lg font-bold uppercase tracking-widest">{agentProfile.name}</p>
                                <p className="opacity-80">{agentProfile.company}</p>
                            </div>
                        </div>
                    )}

                    {/* MINIMAL LAYOUT */}
                    {config.layout === 'minimal' && (
                        <div className="h-full flex flex-col p-16 text-left">
                            <div className="mt-20">
                                {agentProfile.logoUrl && (
                                    <img src={agentProfile.logoUrl} alt="Company Logo" className="h-12 object-contain mb-12 brightness-0 invert opacity-100" />
                                )}
                                <h1 className="text-6xl font-bold mb-8 leading-none tracking-tighter">
                                    {config.title || 'Report Title'}
                                </h1>
                                <p className="text-2xl opacity-80 font-light border-l-4 border-white/30 pl-6">
                                    {config.subtitle || 'Subtitle'}
                                </p>
                            </div>

                            <div className="mt-auto">
                                <div className="flex items-center gap-4">
                                    {agentProfile.headshotUrl && (
                                        <img
                                            src={agentProfile.headshotUrl}
                                            alt={agentProfile.name}
                                            className="w-16 h-16 rounded-full object-cover border border-white/50"
                                        />
                                    )}
                                    <div>
                                        <p className="font-bold text-lg">{agentProfile.name}</p>
                                        <p className="opacity-70 text-sm">{agentProfile.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer (Common) */}
                    {config.layout !== 'minimal' && (
                        <div className="relative z-10 text-center border-t border-white/10 pt-6 pb-8 mx-8">
                            <p className="text-base font-semibold">{agentProfile.name}</p>
                            <p className="text-sm opacity-70">{agentProfile.title} | {agentProfile.company}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoverPageBuilder;
