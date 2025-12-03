import React, { useState, useRef, useEffect } from 'react';
import { AgentProfile } from '../../context/AgentBrandingContext';
import { generatePdf } from './PdfGenerator';

export interface ReportContent {
    title: string;
    subtitle: string;
    themeColor?: 'blue' | 'slate' | 'emerald' | 'purple' | 'amber' | 'brand';
    layout?: 'modern' | 'classic' | 'minimal';
    backgroundStyle?: 'solid' | 'gradient' | 'image';
    customImageUrl?: string;
    coverImage?: string;
    sections: {
        title: string;
        content: string;
    }[];
    propertyDetails?: {
        price: string;
        specs: string;
        features: string[];
    };
}

interface ReportPreviewEditorProps {
    content: ReportContent;
    agentProfile: AgentProfile;
    onBack: () => void;
}

const THEMES = [
    { id: 'brand', hex: '' },
    { id: 'blue', hex: '#1e3a8a' },
    { id: 'slate', hex: '#0f172a' },
    { id: 'emerald', hex: '#064e3b' },
    { id: 'purple', hex: '#581c87' },
    { id: 'amber', hex: '#78350f' },
] as const;

const ReportPreviewEditor: React.FC<ReportPreviewEditorProps> = ({ content: initialContent, agentProfile, onBack }) => {
    const [content, setContent] = useState<ReportContent>(initialContent);
    const [isExporting, setIsExporting] = useState(false);
    const [rewritingSection, setRewritingSection] = useState<number | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // Update local state when prop changes
    useEffect(() => {
        setContent(initialContent);
    }, [initialContent]);

    const getBaseColor = () => {
        if (content.themeColor === 'brand') return agentProfile.brandColor || '#1e293b';
        const theme = THEMES.find(t => t.id === content.themeColor);
        return theme?.hex || '#0f172a';
    };

    const getCoverStyle = () => {
        const baseColor = getBaseColor();

        if (content.backgroundStyle === 'image') {
            return {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${content.customImageUrl || 'https://images.unsplash.com/photo-1600596542815-2495db98dada?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            };
        }

        if (content.backgroundStyle === 'gradient') {
            return { background: `linear-gradient(135deg, ${baseColor} 0%, #0f172a 100%)` };
        }

        return { backgroundColor: baseColor };
    };

    const handleSectionChange = (index: number, newText: string) => {
        const newSections = [...content.sections];
        newSections[index] = { ...newSections[index], content: newText };
        setContent({ ...content, sections: newSections });
    };

    const handleRewrite = async (index: number, mode: 'professional' | 'persuasive' | 'shorter' | 'longer') => {
        setRewritingSection(index);

        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const currentText = content.sections[index].content;
        let newText = currentText;

        // Mock AI transformations
        if (mode === 'professional') {
            newText = "Utilizing a data-driven approach, we ensure maximum market penetration. Our strategy is designed to attract qualified buyers and secure optimal terms for your property transaction.";
        } else if (mode === 'persuasive') {
            newText = "Imagine the possibilities! We don't just sell homes; we craft compelling stories that resonate with buyers. Let us turn your property into the must-have listing of the season.";
        } else if (mode === 'shorter') {
            newText = "We use data to find buyers and get you the best price. Our strategy works.";
        } else if (mode === 'longer') {
            newText = currentText + "\n\nFurthermore, our commitment to excellence extends beyond the initial listing. We provide continuous feedback, market updates, and strategic adjustments to ensure we stay ahead of the curve. Your success is our top priority, and we leave no stone unturned in our pursuit of the perfect sale.";
        }

        handleSectionChange(index, newText);
        setRewritingSection(null);
    };

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // Pass both IDs to generatePdf to create a multi-page PDF
            await generatePdf(['report-cover-page', 'report-content-page'], `${content.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
        } catch (error) {
            console.error('Failed to export PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-4 border-b border-slate-200 mb-6 rounded-t-xl">
                <button
                    onClick={onBack}
                    className="flex items-center text-slate-600 hover:text-slate-900 font-medium"
                >
                    <span className="material-symbols-outlined mr-1">arrow_back</span>
                    Back to Edit
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                        <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                        Click any text below to edit before exporting
                    </span>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                        {isExporting ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">picture_as_pdf</span>
                                Download PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Preview Area - Scrollable */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center"
            >
                <div
                    id="report-preview-container"
                    ref={reportRef}
                    className="bg-white shadow-xl w-[210mm] min-h-[297mm] flex flex-col relative"
                    style={{ transform: 'scale(1)', transformOrigin: 'top center' }}
                >
                    {/* COVER PAGE */}
                    <div
                        id="report-cover-page"
                        className="h-[297mm] flex flex-col p-[20mm] relative overflow-hidden text-white"
                        style={getCoverStyle()}
                    >
                        {/* Decorative Background Elements (Only for non-image backgrounds) */}
                        {content.backgroundStyle !== 'image' && (
                            <>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2"></div>
                            </>
                        )}

                        {/* MODERN LAYOUT (Default) */}
                        {(!content.layout || content.layout === 'modern') && (
                            <>
                                <div className="relative z-10 flex flex-col items-center mt-20">
                                    {agentProfile.headshotUrl && (
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-white/20 rounded-full blur-md transform scale-110"></div>
                                            <img
                                                src={agentProfile.headshotUrl}
                                                alt={agentProfile.name}
                                                className="w-48 h-48 rounded-full object-cover border-4 border-white/90 shadow-2xl mb-8 relative z-10"
                                            />
                                        </div>
                                    )}
                                    {agentProfile.logoUrl && (
                                        <img src={agentProfile.logoUrl} alt="Company Logo" className="h-16 object-contain mb-8 opacity-90" />
                                    )}
                                </div>

                                <div className="relative z-10 text-center mt-auto mb-32 px-12">
                                    <div className="w-24 h-1 bg-white/30 mx-auto mb-8 rounded-full"></div>
                                    <h1
                                        className="text-5xl font-bold mb-6 leading-tight tracking-tight drop-shadow-sm outline-none border border-transparent hover:border-white/20 rounded p-2 transition-colors"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => setContent({ ...content, title: e.currentTarget.textContent || '' })}
                                    >
                                        {content.title}
                                    </h1>
                                    <p
                                        className="text-2xl opacity-90 font-light tracking-wide outline-none border border-transparent hover:border-white/20 rounded p-2 transition-colors"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => setContent({ ...content, subtitle: e.currentTarget.textContent || '' })}
                                    >
                                        {content.subtitle}
                                    </p>
                                </div>
                            </>
                        )}

                        {/* CLASSIC LAYOUT */}
                        {content.layout === 'classic' && (
                            <div className="h-full border-[12px] border-white/10 m-4 flex flex-col p-12 absolute inset-0">
                                <div className="text-center mt-20 relative z-10">
                                    <h1
                                        className="text-6xl font-serif font-bold mb-6 leading-tight outline-none border border-transparent hover:border-white/20 rounded p-2 transition-colors"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => setContent({ ...content, title: e.currentTarget.textContent || '' })}
                                    >
                                        {content.title}
                                    </h1>
                                    <div className="w-full h-px bg-white/40 my-10"></div>
                                    <p
                                        className="text-3xl font-serif italic opacity-90 outline-none border border-transparent hover:border-white/20 rounded p-2 transition-colors"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => setContent({ ...content, subtitle: e.currentTarget.textContent || '' })}
                                    >
                                        {content.subtitle}
                                    </p>
                                </div>

                                <div className="mt-auto flex flex-col items-center relative z-10 mb-20">
                                    {agentProfile.headshotUrl && (
                                        <img
                                            src={agentProfile.headshotUrl}
                                            alt={agentProfile.name}
                                            className="w-40 h-40 rounded-full object-cover border-2 border-white shadow-lg mb-6"
                                        />
                                    )}
                                    <p className="text-xl font-bold uppercase tracking-widest">{agentProfile.name}</p>
                                    <p className="opacity-80 text-lg">{agentProfile.company}</p>
                                </div>
                            </div>
                        )}

                        {/* MINIMAL LAYOUT */}
                        {content.layout === 'minimal' && (
                            <div className="h-full flex flex-col p-16 text-left relative z-10">
                                <div className="mt-20">
                                    {agentProfile.logoUrl && (
                                        <img src={agentProfile.logoUrl} alt="Company Logo" className="h-16 object-contain mb-16 brightness-0 invert opacity-100" />
                                    )}
                                    <h1
                                        className="text-7xl font-bold mb-8 leading-none tracking-tighter outline-none border border-transparent hover:border-white/20 rounded p-2 transition-colors"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => setContent({ ...content, title: e.currentTarget.textContent || '' })}
                                    >
                                        {content.title}
                                    </h1>
                                    <p
                                        className="text-3xl opacity-80 font-light border-l-4 border-white/30 pl-8 outline-none border-r border-y border-transparent hover:border-white/20 rounded p-2 transition-colors"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => setContent({ ...content, subtitle: e.currentTarget.textContent || '' })}
                                    >
                                        {content.subtitle}
                                    </p>
                                </div>

                                <div className="mt-auto mb-20">
                                    <div className="flex items-center gap-6">
                                        {agentProfile.headshotUrl && (
                                            <img
                                                src={agentProfile.headshotUrl}
                                                alt={agentProfile.name}
                                                className="w-20 h-20 rounded-full object-cover border border-white/50"
                                            />
                                        )}
                                        <div>
                                            <p className="font-bold text-2xl">{agentProfile.name}</p>
                                            <p className="opacity-70 text-lg">{agentProfile.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer (Common) */}
                        {content.layout !== 'minimal' && (
                            <div className="relative z-10 text-center border-t border-white/10 pt-8">
                                <p className="text-lg font-semibold">{agentProfile.name}</p>
                                <p className="text-slate-400">{agentProfile.title} | {agentProfile.company}</p>
                                <p className="text-slate-400 text-sm mt-2">{agentProfile.email} • {agentProfile.phone}</p>
                            </div>
                        )}
                    </div>

                    {/* CONTENT PAGES */}
                    <div id="report-content-page" className="min-h-[297mm] p-[20mm] bg-white text-slate-900">
                        {/* Header for Content Pages */}
                        <div
                            className="relative flex justify-between items-center px-6 h-16 -mx-[20mm] -mt-[20mm] mb-6 text-white overflow-hidden"
                            style={{ backgroundColor: getBaseColor() }}
                        >
                            <div className="flex items-center gap-3 pl-[20mm] relative z-10">
                                {agentProfile.headshotUrl && (
                                    <img
                                        src={agentProfile.headshotUrl}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-md"
                                    />
                                )}
                                <div>
                                    <p className="font-bold text-sm leading-tight">{agentProfile.name}</p>
                                    <p className="text-[10px] opacity-90 font-medium mb-0.5">{agentProfile.company}</p>
                                    <div className="flex items-center gap-3 text-[9px] opacity-90 font-medium">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">phone</span>
                                            {agentProfile.phone}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">mail</span>
                                            {agentProfile.email}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right pr-[20mm] relative z-10">
                                <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest mb-0.5">Prepared For</p>
                                <p className="font-semibold text-xs">{content.subtitle}</p>
                            </div>
                        </div>

                        {/* Property Details Grid (if applicable) */}
                        {content.propertyDetails && (
                            <div className="bg-slate-50 rounded-xl p-8 mb-12 border border-slate-100">
                                <div className="grid grid-cols-2 gap-10">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Suggested List Price</p>
                                        <p className="text-4xl font-bold text-slate-900 tracking-tight">{content.propertyDetails.price}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Property Specs</p>
                                        <p className="text-xl font-medium text-slate-800">{content.propertyDetails.specs}</p>
                                    </div>
                                </div>
                                {content.propertyDetails.features.length > 0 && (
                                    <div className="mt-8 pt-8 border-t border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-4">Key Highlights</p>
                                        <div className="flex flex-wrap gap-2">
                                            {content.propertyDetails.features.map((feature, i) => (
                                                <span key={i} className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Dynamic Sections */}
                        <div className="space-y-8 flex-1">
                            {content.sections.map((section, index) => (
                                <div key={index} className="group/section relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3
                                            className="text-lg font-bold text-slate-900 border-l-4 pl-3"
                                            style={{ borderColor: getBaseColor() }}
                                        >
                                            {section.title}
                                        </h3>

                                        {/* AI Rewrite Tools */}
                                        <div className="opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-2">
                                            <div className="relative group/dropdown">
                                                <button
                                                    className="flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-md transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                                                    AI Rewrite
                                                </button>

                                                {/* Dropdown Menu */}
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-50 hidden group-hover/dropdown:block transform origin-top-right transition-all">
                                                    <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">Transform Text</div>
                                                    <button
                                                        onClick={() => handleRewrite(index, 'professional')}
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-base text-blue-500">business_center</span>
                                                        Make Professional
                                                    </button>
                                                    <button
                                                        onClick={() => handleRewrite(index, 'persuasive')}
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-base text-purple-500">psychology</span>
                                                        Make Persuasive
                                                    </button>
                                                    <button
                                                        onClick={() => handleRewrite(index, 'shorter')}
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-base text-emerald-500">compress</span>
                                                        Shorten Text
                                                    </button>
                                                    <button
                                                        onClick={() => handleRewrite(index, 'longer')}
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-base text-amber-500">expand</span>
                                                        Expand Text
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="text-slate-700 leading-relaxed whitespace-pre-wrap outline-none hover:bg-slate-50 rounded p-2 border border-transparent hover:border-slate-200 transition-colors relative"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => handleSectionChange(index, e.currentTarget.innerText)}
                                    >
                                        {section.content}
                                    </div>

                                    {/* Loading Overlay for specific section */}
                                    {rewritingSection === index && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm">
                                            <div className="flex items-center gap-2 text-primary-600 font-medium animate-pulse">
                                                <span className="material-symbols-outlined animate-spin">auto_mode</span>
                                                Rewriting...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="mt-auto pt-8 border-t border-slate-200 text-center text-sm text-slate-400">
                            <p>Prepared exclusively for the property owner. {new Date().getFullYear()} {agentProfile.company}.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportPreviewEditor;
