
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, ChatMessage, Property, AgentProfile, AIBlogPost } from '../types';
import { 
    generatePropertyReport, 
    generateBlogPost
} from '../services/geminiService';
import { continueConversation } from '../services/openaiService';
import { datafiniti, DatafinitiProperty } from '../services/datafiniti';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import AIMarketingProposalPage from './AIMarketingProposalPage';

// PDF generation utilities

// --- Chat Templates Data ---

interface ChatTemplate {
    id: string;
    title: string;
    description: string;
    category: 'lead-followup' | 'property-analysis' | 'market-research' | 'client-communication' | 'marketing';
    prompt: string;
    icon: string;
}

const CHAT_TEMPLATES: ChatTemplate[] = [
    // Lead Follow-up Templates
    {
        id: 'new-lead-followup',
        title: 'New Lead Follow-up',
        description: 'Professional follow-up for new leads',
        category: 'lead-followup',
        icon: 'person_add',
        prompt: 'Help me write a professional follow-up message for a new lead who just inquired about a property. Include: thanking them for their interest, offering to schedule a showing, providing my contact information, and asking about their timeline and preferences.'
    },
    {
        id: 'post-showing-followup',
        title: 'Post-Showing Follow-up',
        description: 'Follow-up after property showing',
        category: 'lead-followup',
        icon: 'home',
        prompt: 'Create a follow-up message for after showing a property. Include: thanking them for their time, asking for their thoughts and feedback, addressing any concerns they might have, and next steps if they\'re interested.'
    },
    {
        id: 'offer-submission',
        title: 'Offer Submission Guide',
        description: 'Guide clients through making an offer',
        category: 'client-communication',
        icon: 'handshake',
        prompt: 'Help me explain to my client the process of submitting an offer on a property. Include: required documents, typical timeline, negotiation strategies, and what to expect during the process.'
    },
    
    // Property Analysis Templates
    {
        id: 'property-valuation',
        title: 'Property Valuation Analysis',
        description: 'Analyze property value and market position',
        category: 'property-analysis',
        icon: 'assessment',
        prompt: 'Analyze this property\'s value and market position. Consider: recent comparable sales, current market conditions, unique features and upgrades, neighborhood trends, and provide a suggested listing/offer price range.'
    },
    {
        id: 'investment-analysis',
        title: 'Investment Property Analysis',
        description: 'Evaluate rental income potential',
        category: 'property-analysis',
        icon: 'trending_up',
        prompt: 'Provide an investment analysis for this property including: estimated rental income, cash flow projections, cap rate calculations, appreciation potential, and overall investment viability.'
    },
    
    // Market Research Templates
    {
        id: 'neighborhood-analysis',
        title: 'Neighborhood Analysis',
        description: 'Comprehensive area overview',
        category: 'market-research',
        icon: 'location_city',
        prompt: 'Create a comprehensive neighborhood analysis including: demographics, school ratings, amenities, transportation, safety statistics, recent sales trends, and future development plans.'
    },
    {
        id: 'market-trends',
        title: 'Market Trends Report',
        description: 'Current market conditions and trends',
        category: 'market-research',
        icon: 'analytics',
        prompt: 'Generate a market trends report covering: current inventory levels, average days on market, price trends over the last 6 months, buyer/seller market conditions, and predictions for the next quarter.'
    },
    
    // Client Communication Templates
    {
        id: 'first-time-buyer',
        title: 'First-Time Buyer Guide',
        description: 'Comprehensive guide for new buyers',
        category: 'client-communication',
        icon: 'school',
        prompt: 'Create a comprehensive guide for first-time homebuyers covering: the buying process step-by-step, financing options, what to look for in a home, common mistakes to avoid, and timeline expectations.'
    },
    {
        id: 'seller-consultation',
        title: 'Seller Consultation Prep',
        description: 'Prepare for listing consultation',
        category: 'client-communication',
        icon: 'sell',
        prompt: 'Help me prepare talking points for a seller consultation including: current market conditions, pricing strategy, marketing plan, staging recommendations, and timeline to sell.'
    },
    
    // Marketing Templates
    {
        id: 'listing-description',
        title: 'Compelling Listing Description',
        description: 'Write engaging property descriptions',
        category: 'marketing',
        icon: 'edit',
        prompt: 'Write a compelling listing description that highlights the property\'s best features, uses emotional language to help buyers envision living there, includes key details and amenities, and creates urgency without being pushy.'
    },
    {
        id: 'social-media-strategy',
        title: 'Social Media Strategy',
        description: 'Plan social media content',
        category: 'marketing',
        icon: 'share',
        prompt: 'Create a social media marketing strategy for this listing including: platform-specific content ideas, posting schedule, hashtag recommendations, and engagement tactics to reach potential buyers.'
    }
];

// --- Reusable Components ---

const AIInteractionLoader: React.FC<{className?: string}> = ({ className }) => (
    <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
    </div>
);

const ChatTemplatesPanel: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (template: ChatTemplate) => void;
}> = ({ isOpen, onClose, onSelectTemplate }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    
    const categories = [
        { id: 'all', label: 'All Templates', icon: 'grid_view' },
        { id: 'lead-followup', label: 'Lead Follow-up', icon: 'person_add' },
        { id: 'property-analysis', label: 'Property Analysis', icon: 'assessment' },
        { id: 'market-research', label: 'Market Research', icon: 'analytics' },
        { id: 'client-communication', label: 'Client Communication', icon: 'chat' },
        { id: 'marketing', label: 'Marketing', icon: 'campaign' }
    ];
    
    const filteredTemplates = selectedCategory === 'all' 
        ? CHAT_TEMPLATES 
        : CHAT_TEMPLATES.filter(t => t.category === selectedCategory);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-primary-500 to-purple-600 text-white">
                    <div>
                        <h2 className="text-2xl font-bold">AI Chat Templates</h2>
                        <p className="text-primary-100 mt-1">Pre-built prompts for common real estate tasks</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-primary-100 transition-colors p-2 rounded-lg hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                <div className="flex h-[calc(90vh-120px)]">
                    {/* Categories Sidebar */}
                    <div className="w-72 bg-slate-50 border-r border-slate-200 p-4">
                        <h3 className="font-semibold text-slate-900 mb-4">Categories</h3>
                        <div className="space-y-2">
                            {categories.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 ${
                                        selectedCategory === category.id
                                            ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                                            : 'hover:bg-slate-200 text-slate-700 border-2 border-transparent'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-xl">{category.icon}</span>
                                    <div>
                                        <div className="font-semibold">{category.label}</div>
                                        <div className="text-xs opacity-75">
                                            {category.id === 'all' 
                                                ? `${CHAT_TEMPLATES.length} templates`
                                                : `${CHAT_TEMPLATES.filter(t => t.category === category.id).length} templates`
                                            }
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Templates Grid */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredTemplates.map(template => (
                                <div
                                    key={template.id}
                                    className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer group"
                                    onClick={() => {
                                        onSelectTemplate(template);
                                        onClose();
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                                            <span className="material-symbols-outlined text-primary-600 text-xl">{template.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 mb-2 group-hover:text-primary-700 transition-colors">
                                                {template.title}
                                            </h4>
                                            <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                                {template.description}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                                                    {template.category.replace('-', ' ')}
                                                </span>
                                                <span className="text-xs text-primary-600 font-semibold group-hover:text-primary-700">
                                                    Use Template →
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VoiceRecorder: React.FC<{
    onTranscript: (text: string) => void;
    isDisabled?: boolean;
}> = ({ onTranscript, isDisabled }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
                setIsProcessing(true);
                
                // Here you would typically send the audio to your speech-to-text service
                // For now, we'll simulate it with a timeout
                setTimeout(() => {
                    onTranscript("Voice recording processed! This would contain the transcribed text from your speech.");
                    setIsProcessing(false);
                }, 2000);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            
            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isProcessing) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-primary-700">Processing speech...</span>
                </div>
            </div>
        );
    }

    if (isRecording) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-700">
                        Recording... {formatTime(recordingTime)}
                    </span>
                </div>
                <button
                    onClick={stopRecording}
                    className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors"
                >
                    Stop
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={startRecording}
            disabled={isDisabled}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            title="Record voice message"
        >
            <span className="material-symbols-outlined w-4 h-4 text-slate-600">mic</span>
        </button>
    );
};

const GeneratedContentDisplay: React.FC<{ content: string; title: string; icon: string }> = ({ content, title, icon }) => (
    <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined w-6 h-6 text-primary-600">{icon}</span>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <div 
            className="prose prose-slate max-w-none prose-headings:font-bold prose-p:text-slate-600"
            dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />').replace(/## (.*)/g, '<h3>$1</h3>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
        />
    </div>
);

const ReportOptionToggle: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}> = ({ label, description, enabled, onChange }) => (
    <div className="flex justify-between items-center p-3 bg-slate-50/70 rounded-lg border border-slate-200">
        <div>
            <h4 className="font-semibold text-slate-800">{label}</h4>
            <p className="text-sm text-slate-500">{description}</p>
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex flex-shrink-0 items-center h-6 rounded-full w-11 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                enabled ? 'bg-primary-600' : 'bg-slate-300'
            }`}
        >
            <span
                aria-hidden="true"
                className={`inline-block w-4 h-4 transform bg-white rounded-full shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    </div>
);

const BrandedReport = React.forwardRef<HTMLDivElement, {
    agent: AgentProfile;
    property: Property;
    reportContent: string;
    personalNote: string;
}>(({ agent, property, reportContent, personalNote }, ref) => {
    const brandColor = agent.brandColor || '#1e40af'; // Blue theme
    
    return (
        <div ref={ref} className="bg-white font-sans mx-auto relative">
            {/* PAGE 1 - COVER PAGE */}
            <div className="page-container cover-page" style={{ 
                minHeight: '297mm', 
                width: '210mm', 
                background: `linear-gradient(135deg, ${brandColor} 0%, #1e3a8a 100%)`,
                position: 'relative',
                overflow: 'hidden',
                pageBreakAfter: 'always',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Geometric Background Elements */}
                <div className="absolute top-0 right-0 w-80 h-80 opacity-20">
                    <div style={{ 
                        width: '300px', 
                        height: '200px', 
                        background: '#fbbf24',
                        clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                        position: 'absolute',
                        top: '-50px',
                        right: '-100px'
                    }}></div>
            </div>
                
                <div className="absolute bottom-0 right-0 w-64 h-64 opacity-20">
                    <div style={{ 
                        width: '200px', 
                        height: '150px', 
                        background: '#fbbf24',
                        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                        position: 'absolute',
                        bottom: '0',
                        right: '0'
                    }}></div>
            </div>
                
                <div className="absolute bottom-20 right-20">
                    <div className="grid grid-cols-4 gap-2">
                        {[...Array(16)].map((_, i) => (
                            <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: brandColor, opacity: 0.6 }}></div>
                        ))}
                    </div>
                </div>
                
                {/* Header with Agent Info */}
                <div className="flex justify-between items-start p-8 relative z-10">
                    <div className="flex items-center gap-3">
                        {agent.logoUrl ? (
                            <img src={agent.logoUrl} alt="Logo" className="h-8 w-auto filter brightness-0 invert" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-white rounded" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                                <div className="w-4 h-4 bg-white rounded" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                </div>
            )}
                        <div className="text-white">
                            <h3 className="font-bold text-sm">{agent.company.toUpperCase()}</h3>
                        </div>
                    </div>
                </div>
                
                {/* Main Title - Centered and Better Spaced */}
                <div className="flex flex-col justify-center items-start px-12 flex-1">
                    <div className="text-white">
                        <div className="text-7xl font-bold mb-6" style={{ color: '#fbbf24' }}>
                            {new Date().getFullYear()}
                        </div>
                        <h1 className="text-6xl font-bold mb-12 leading-none">
                            MARKET<br />
                            ANALYSIS<br />
                            REPORT
                        </h1>
                        
                        <div className="mt-8">
                            <h2 className="text-xl font-medium mb-3 text-gray-300">Property Analysis Report</h2>
                            <p className="text-gray-300 leading-relaxed max-w-lg text-sm">
                                Comprehensive market analysis and valuation report for residential property 
                                providing detailed insights into current market conditions and property value assessment.
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Bottom Section - Better Positioned */}
                <div className="absolute bottom-8 left-12 right-12">
                    <div className="flex justify-between items-end">
                        <div className="text-white space-y-3">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Prepared For:</p>
                                <p className="font-medium text-sm">Property Owner</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Prepared By:</p>
                                <p className="font-medium text-sm">{agent.name}</p>
                                <p className="text-xs text-gray-400">{agent.company}</p>
                            </div>
                        </div>
                        
                        <div className="text-right text-white">
                            <p className="text-xs text-gray-400">{agent.website}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAGE 2 - EXECUTIVE SUMMARY */}
            <div className="page-container" style={{ 
                minHeight: '297mm', 
                width: '210mm', 
                position: 'relative',
                pageBreakAfter: 'always',
                background: 'white'
            }}>
                {/* Background Image/Pattern */}
                <div className="absolute top-0 left-0 right-0 h-64 opacity-10" 
                     style={{ 
                         backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%)',
                         backgroundSize: '20px 20px'
                     }}>
                </div>
                
                {/* Header */}
                <div className="p-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 flex items-center justify-center text-white font-bold text-2xl" 
                             style={{ backgroundColor: '#fbbf24' }}>01</div>
                        <div>
                            <h1 className="text-4xl font-bold" style={{ color: brandColor }}>Executive Summary</h1>
                            <div className="w-20 h-1 mt-2" style={{ backgroundColor: '#fbbf24' }}></div>
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-semibold text-gray-700 mb-8">Property Overview</h2>
                    
                    {/* Property Details Card */}
                    <div className="bg-gray-50 rounded-lg p-8 mb-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-lg mb-4" style={{ color: brandColor }}>Property Details</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Address:</span>
                                        <span className="font-semibold">{property.address}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Bedrooms:</span>
                                        <span className="font-semibold">{property.bedrooms || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Bathrooms:</span>
                                        <span className="font-semibold">{property.bathrooms || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Square Footage:</span>
                                        <span className="font-semibold">{property.squareFeet ? property.squareFeet.toLocaleString() + ' sq ft' : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Estimated Value:</span>
                                        <span className="font-semibold text-green-600">${property.price ? property.price.toLocaleString() : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="font-bold text-lg mb-4" style={{ color: brandColor }}>Key Insights</h3>
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded border-l-4" style={{ borderColor: '#10b981' }}>
                                        <div className="font-semibold text-green-700">Market Position</div>
                                        <div className="text-sm text-gray-600">Competitively priced within market range</div>
                                    </div>
                                    <div className="bg-white p-4 rounded border-l-4" style={{ borderColor: '#3b82f6' }}>
                                        <div className="font-semibold text-blue-700">Investment Potential</div>
                                        <div className="text-sm text-gray-600">Strong appreciation potential in area</div>
                                    </div>
                                    <div className="bg-white p-4 rounded border-l-4" style={{ borderColor: '#f59e0b' }}>
                                        <div className="font-semibold text-yellow-700">Market Conditions</div>
                                        <div className="text-sm text-gray-600">Favorable buyer/seller market balance</div>
                                    </div>
                                </div>
                            </div>
                        </div>
        </div>
        
        {/* Personal Note */}
        {personalNote && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                            <div className="flex items-start gap-4">
                                {agent.headshotUrl && (
                                    <img src={agent.headshotUrl} alt={agent.name} className="w-16 h-16 rounded-full object-cover" />
                                )}
                                <div>
                                    <h3 className="font-bold text-blue-900 mb-2">Personal Note from {agent.name}</h3>
                                    <p className="text-blue-800 italic leading-relaxed">{personalNote}</p>
                                </div>
                            </div>
            </div>
        )}

                    {/* Market Assessment - Moved from Page 3 */}
                    <h2 className="text-xl font-semibold text-gray-700 mb-6">Comprehensive Property Assessment</h2>
                    
                    {/* Charts and Data */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="font-bold text-lg mb-4" style={{ color: brandColor }}>Market Trends</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white rounded">
                                    <span className="text-gray-600">Avg. Price/Sq Ft</span>
                                    <span className="font-bold text-green-600">$245</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white rounded">
                                    <span className="text-gray-600">Days on Market</span>
                                    <span className="font-bold">28 days</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white rounded">
                                    <span className="text-gray-600">Price Trend</span>
                                    <span className="font-bold text-green-600">↗ +5.2%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="font-bold text-lg mb-4" style={{ color: brandColor }}>Neighborhood Score</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Schools</span>
                                    <div className="flex gap-1">
                                        {[1,2,3,4].map(i => <span key={i} className="text-yellow-400">★</span>)}
                                        <span className="text-gray-300">★</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Transportation</span>
                                    <div className="flex gap-1">
                                        {[1,2,3].map(i => <span key={i} className="text-yellow-400">★</span>)}
                                        <span className="text-gray-300">★★</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Shopping</span>
                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Safety</span>
                                    <div className="flex gap-1">
                                        {[1,2,3,4].map(i => <span key={i} className="text-yellow-400">★</span>)}
                                        <span className="text-gray-300">★</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="absolute bottom-8 left-12 right-12 flex justify-between items-center text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-2xl" style={{ color: brandColor }}>02</span>
                        <span>Market Analysis Report {new Date().getFullYear()}</span>
                    </div>
                </div>
            </div>

            {/* PAGE 3 - DETAILED ANALYSIS */}
            <div className="page-container" style={{ 
                minHeight: '297mm', 
                width: '210mm', 
                position: 'relative',
                background: 'white'
            }}>
                {/* Header */}
                <div className="p-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 flex items-center justify-center text-white font-bold text-2xl" 
                             style={{ backgroundColor: '#fbbf24' }}>02</div>
                        <div>
                            <h1 className="text-4xl font-bold" style={{ color: brandColor }}>Market Analysis</h1>
                            <div className="w-20 h-1 mt-2" style={{ backgroundColor: '#fbbf24' }}></div>
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-semibold text-gray-700 mb-8">Detailed Market Analysis</h2>
                    
                    {/* Report Content */}
                    <div className="space-y-6 mb-24">
                        <div
                            className="report-text-content prose prose-lg max-w-none"
                            dangerouslySetInnerHTML={{ 
                                __html: reportContent
                                    .replace(/## (.*)/g, '<h3 style="color: #1e40af; font-weight: bold; font-size: 1.25rem; margin: 1.5rem 0 0.75rem 0; border-bottom: 2px solid #fbbf24; padding-bottom: 0.25rem;">$1</h3>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e40af;">$1</strong>')
                                    .replace(/• /g, '<span style="color: #fbbf24; font-weight: bold;">▸</span> ')
                                    .replace(/\n/g, '<br />')
                            }}
                        />
                    </div>
        </div>
        
                {/* Footer with Agent Info */}
                <div className="absolute bottom-8 left-12 right-12">
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-2xl" style={{ color: brandColor }}>03</span>
                                <span className="text-gray-500">Market Analysis Report {new Date().getFullYear()}</span>
            </div>
                            <div className="text-right text-sm text-gray-600">
                                <div className="font-semibold">{agent.name}</div>
                                <div>{agent.phone} | {agent.email}</div>
    </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const BrandedBlogPost = React.forwardRef<HTMLDivElement, {
    agent: AgentProfile;
    post: AIBlogPost;
    includeBio: boolean;
}>(({ agent, post, includeBio }, ref) => {
    const brandColor = agent.brandColor || '#1e40af';
    
    // Get dynamic feature image based on content
    const getFeatureImage = (content: string) => {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('market') || lowerContent.includes('trend')) {
            return 'https://images.unsplash.com/photo-1560472355-536de3962603?q=80&w=1200&h=600&auto=format&fit=crop';
        } else if (lowerContent.includes('home') || lowerContent.includes('house') || lowerContent.includes('property')) {
            return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200&h=600&auto=format&fit=crop';
        } else if (lowerContent.includes('investment') || lowerContent.includes('finance')) {
            return 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200&h=600&auto=format&fit=crop';
        } else if (lowerContent.includes('neighborhood') || lowerContent.includes('community')) {
            return 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1200&h=600&auto=format&fit=crop';
        } else if (lowerContent.includes('sell') || lowerContent.includes('selling')) {
            return 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&h=600&auto=format&fit=crop';
        } else if (lowerContent.includes('buy') || lowerContent.includes('buying')) {
            return 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=1200&h=600&auto=format&fit=crop';
        } else {
            return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&h=600&auto=format&fit=crop';
        }
    };

    const getInlineImages = (content: string) => {
        const images = [];
        const lowerContent = content.toLowerCase();
        
        // Add relevant inline images based on content
        if (lowerContent.includes('first-time') || lowerContent.includes('beginner')) {
            images.push('https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?q=80&w=800&h=400&auto=format&fit=crop');
        }
        if (lowerContent.includes('luxury') || lowerContent.includes('premium')) {
            images.push('https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=800&h=400&auto=format&fit=crop');
        }
        if (lowerContent.includes('tip') || lowerContent.includes('advice')) {
            images.push('https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=800&h=400&auto=format&fit=crop');
        }
        
        return images;
    };

    const featureImage = getFeatureImage(post.body);
    const inlineImages = getInlineImages(post.body);
    
    return (
        <div ref={ref} className="bg-white font-sans mx-auto relative">
            {/* PAGE 1 - MAGAZINE COVER */}
            <div className="page-container" style={{ 
                minHeight: '297mm', 
                width: '210mm', 
                position: 'relative',
                overflow: 'hidden',
                pageBreakAfter: 'always'
            }}>
                {/* Hero Feature Image */}
                <div className="relative h-64 overflow-hidden">
                    <img 
                        src={featureImage} 
                        alt="Article featured image" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    {/* Agent Badge */}
                    <div className="absolute top-6 left-6">
                        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            {agent.headshotUrl && (
                                <img src={agent.headshotUrl} alt={agent.name} className="w-8 h-8 rounded-full object-cover" />
            )}
            <div>
                                <p className="font-bold text-sm text-slate-800">{agent.name}</p>
                                <p className="text-xs text-slate-600">{agent.company}</p>
                            </div>
            </div>
        </div>

                    {/* Date Badge */}
                    <div className="absolute top-6 right-6">
                        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs font-medium text-slate-600">Published</p>
                            <p className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>
                
                {/* Title Section */}
                <div className="px-8 py-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 flex items-center justify-center text-white font-bold text-lg rounded-lg" 
                             style={{ backgroundColor: brandColor }}>
                            <span className="material-symbols-outlined">article</span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">REAL ESTATE INSIGHTS</p>
                            <div className="w-16 h-0.5 mt-1" style={{ backgroundColor: brandColor }}></div>
                        </div>
                    </div>
                    
                    <h1 className="text-4xl font-bold leading-tight text-slate-900 mb-6">{post.title}</h1>
                    
                    {/* Article Stats */}
                    <div className="flex items-center gap-6 text-sm text-slate-500 mb-8">
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined w-4 h-4">schedule</span>
                            {Math.ceil(post.body.split(' ').length / 200)} min read
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined w-4 h-4">visibility</span>
                            Expert Insights
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined w-4 h-4">verified</span>
                            Professional Content
                        </span>
                    </div>
                    
                    {/* Content Preview */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-3">Article Preview</h3>
                        <p className="text-slate-600 leading-relaxed">
                            {post.body.replace(/<[^>]*>/g, '').substring(0, 200)}...
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: brandColor }}>
                            <span>Continue reading inside</span>
                            <span className="material-symbols-outlined w-4 h-4">arrow_forward</span>
                        </div>
                    </div>
                </div>
                
                {/* Footer with Agent Info */}
                <div className="absolute bottom-6 left-8 right-8">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-slate-200">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                {agent.logoUrl && (
                                    <img src={agent.logoUrl} alt="Company logo" className="h-8 w-auto" />
                                )}
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{agent.company}</p>
                                    <p className="text-xs text-slate-500">{agent.website}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500">Contact</p>
                                <p className="text-sm font-medium text-slate-700">{agent.phone}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAGE 2 - ARTICLE CONTENT */}
            <div className="page-container" style={{ 
                minHeight: '297mm', 
                width: '210mm', 
                position: 'relative',
                background: 'white',
                pageBreakAfter: includeBio ? 'always' : 'auto'
            }}>
                <div className="p-8">
                    {/* Article Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 flex items-center justify-center text-white font-bold text-lg rounded-lg" 
                             style={{ backgroundColor: '#fbbf24' }}>01</div>
                        <div>
                            <h2 className="text-2xl font-bold" style={{ color: brandColor }}>Article Content</h2>
                            <div className="w-16 h-0.5 mt-1" style={{ backgroundColor: '#fbbf24' }}></div>
                        </div>
                    </div>
                    
                    {/* Main Article Content */}
                    <article className="prose prose-lg max-w-none">
                        <div
                            className="article-content"
                            dangerouslySetInnerHTML={{ 
                                __html: (() => {
                                    let content = post.body;
                                    
                                    // Enhanced formatting
                                    content = content.replace(/## (.*)/g, `<h3 style="color: ${brandColor}; font-weight: bold; font-size: 1.5rem; margin: 2rem 0 1rem 0; border-bottom: 2px solid #fbbf24; padding-bottom: 0.5rem;">$1</h3>`);
                                    content = content.replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${brandColor}; font-weight: 700;">$1</strong>`);
                                    content = content.replace(/• /g, '<span style="color: #fbbf24; font-weight: bold; margin-right: 0.5rem;">▸</span> ');
                                    
                                    // Add inline images at strategic points
                                    const sentences = content.split('</p>');
                                    if (sentences.length > 3 && inlineImages.length > 0) {
                                        const midPoint = Math.floor(sentences.length / 2);
                                        sentences.splice(midPoint, 0, `
                                            <div style="margin: 2rem 0; text-align: center;">
                                                <img src="${inlineImages[0]}" alt="Article illustration" style="width: 100%; max-width: 600px; height: 300px; object-fit: cover; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);" />
                                                <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b; font-style: italic;">Professional real estate insights</p>
                                            </div>
                                        `);
                                    }
                                    
                                    return sentences.join('</p>');
                                })()
                            }}
                        />
        </article>
                </div>
                
                {/* Page Footer */}
                <div className="absolute bottom-6 left-8 right-8 flex justify-between items-center text-sm text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-lg" style={{ color: brandColor }}>02</span>
                        <span>Real Estate Article {new Date().getFullYear()}</span>
                    </div>
                    <span>{agent.name} • {agent.company}</span>
                </div>
            </div>

            {/* PAGE 3 - AUTHOR BIO & CONTACT (if includeBio) */}
        {includeBio && agent.bio && (
                <div className="page-container" style={{ 
                    minHeight: '297mm', 
                    width: '210mm', 
                    position: 'relative',
                    background: 'white'
                }}>
                    <div className="p-8">
                        {/* Bio Header */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 flex items-center justify-center text-white font-bold text-lg rounded-lg" 
                                 style={{ backgroundColor: '#fbbf24' }}>02</div>
                            <div>
                                <h2 className="text-2xl font-bold" style={{ color: brandColor }}>About the Author</h2>
                                <div className="w-16 h-0.5 mt-1" style={{ backgroundColor: '#fbbf24' }}></div>
                            </div>
                        </div>
                        
                        {/* Author Profile */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 mb-8">
                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                {agent.headshotUrl && (
                                    <div className="relative">
                                        <img src={agent.headshotUrl} alt={agent.name} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" 
                                             style={{ backgroundColor: brandColor }}>
                                            <span className="material-symbols-outlined w-5 h-5">verified</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">{agent.name}</h3>
                                    <p className="text-lg font-medium mb-3" style={{ color: brandColor }}>{agent.title}</p>
                                    <p className="text-slate-600 leading-relaxed mb-4">{agent.bio}</p>
                                    
                                    {/* Contact Info */}
                                    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                        <a href={`tel:${agent.phone}`} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                            <span className="material-symbols-outlined w-4 h-4" style={{ color: brandColor }}>call</span>
                                            <span className="text-sm font-medium text-slate-700">{agent.phone}</span>
                                        </a>
                                        <a href={`mailto:${agent.email}`} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                            <span className="material-symbols-outlined w-4 h-4" style={{ color: brandColor }}>mail</span>
                                            <span className="text-sm font-medium text-slate-700">{agent.email}</span>
                                        </a>
                                        <a href={agent.website} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                            <span className="material-symbols-outlined w-4 h-4" style={{ color: brandColor }}>language</span>
                                            <span className="text-sm font-medium text-slate-700">Visit Website</span>
                                        </a>
                    </div>
                </div>
                            </div>
                        </div>
                        
                        {/* Call to Action */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white text-center">
                            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
                            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                                Whether you're buying, selling, or investing in real estate, I'm here to guide you through every step of the process with expert knowledge and personalized service.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a href={`tel:${agent.phone}`} className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors">
                                    Call Now: {agent.phone}
                                </a>
                                <a href={`mailto:${agent.email}`} className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-400 transition-colors">
                                    Send Email
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    {/* Final Page Footer */}
                    <div className="absolute bottom-6 left-8 right-8 flex justify-between items-center text-sm text-slate-500">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-lg" style={{ color: brandColor }}>03</span>
                            <span>Real Estate Article {new Date().getFullYear()}</span>
                        </div>
                        <span>© {agent.company}</span>
                    </div>
                </div>
        )}
    </div>
    );
});


// --- AI Chat Tab Components ---

const ConversationList: React.FC<{
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
}> = ({ conversations, activeConversationId, onSelectConversation, onNewConversation }) => (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-bold text-slate-800">Conversations</h2>
            <button onClick={onNewConversation} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200" aria-label="New Conversation">
                <span className="material-symbols-outlined w-6 h-6">add</span>
            </button>
        </div>
        <div className="p-4 flex-shrink-0">
            <div className="relative">
                <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                <input type="text" placeholder="Search chats..." className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
        </div>
        <div className="flex-grow overflow-y-auto p-2 space-y-1">
            {conversations.map(convo => (
                <button
                    key={convo.id}
                    onClick={() => onSelectConversation(convo.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${activeConversationId === convo.id ? 'bg-primary-100' : 'hover:bg-slate-200/60'}`}
                >
                    <h3 className={`font-semibold ${activeConversationId === convo.id ? 'text-primary-700' : 'text-slate-800'}`}>{convo.title}</h3>
                    <p className="text-sm text-slate-500 truncate mt-1">{convo.messages.slice(-1)[0]?.text || 'No messages'}</p>
                </button>
            ))}
        </div>
    </div>
);

const ChatWindow: React.FC<{
    conversation: Conversation;
    onSendMessage: (text: string) => void;
    isAiReplying: boolean;
    onBack: () => void;
}> = ({ conversation, onSendMessage, isAiReplying, onBack }) => {
    const [userInput, setUserInput] = useState('');
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [conversation.messages, isAiReplying]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userInput.trim()) {
            onSendMessage(userInput);
            setUserInput('');
        }
    };

    const handleTemplateSelect = (template: ChatTemplate) => {
        setUserInput(template.prompt);
    };

    const handleVoiceTranscript = (transcript: string) => {
        setUserInput(prev => prev + ' ' + transcript);
    };
    
    return (
        <div className="flex flex-col h-full bg-white">
            <header className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100">
                        <span className="material-symbols-outlined w-6 h-6">arrow_back</span>
                    </button>
                    <h2 className="text-xl font-bold text-slate-800 truncate">{conversation.title}</h2>
                </div>
            </header>
            <main ref={chatContainerRef} className="flex-grow p-6 space-y-6 overflow-y-auto">
                {conversation.messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {msg.sender === 'ai' && <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm"><span className="material-symbols-outlined w-5 h-5">sparkles</span></div>}
                       <div className="prose prose-slate max-w-md px-4 py-3 rounded-2xl shadow-sm"
                            dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}
                       ></div>
                    </div>
                ))}
                {isAiReplying && (
                    <div className="flex justify-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm"><span className="material-symbols-outlined w-5 h-5">sparkles</span></div>
                        <div className="px-4 py-3 bg-slate-100 rounded-2xl rounded-bl-lg shadow-sm"><AIInteractionLoader /></div>
                    </div>
                )}
            </main>
            <footer className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
                {/* Templates Button */}
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={() => setIsTemplatesOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors text-sm font-medium flex-shrink-0"
                    >
                        <span className="material-symbols-outlined text-base leading-none">library_books</span>
                        <span>Templates</span>
                    </button>
                    <div className="text-xs text-slate-500 hidden sm:block">
                        💡 Use templates for common tasks or record voice messages
                    </div>
                </div>
                
                {/* Chat Input with Voice Recorder Inside */}
                <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
                    <div className="flex-1 relative">
                        <textarea 
                            value={userInput} 
                            onChange={e => setUserInput(e.target.value)} 
                            placeholder="Ask your AI assistant anything, use a template, or record a voice message..." 
                            className="w-full bg-white border-2 border-slate-200 rounded-lg py-2.5 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" 
                            disabled={isAiReplying}
                            rows={userInput.length > 100 ? 3 : 1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleFormSubmit(e);
                                }
                            }}
                        />
                        {/* Voice Recorder positioned inside textarea */}
                        <div className="absolute right-2 bottom-2">
                            <VoiceRecorder onTranscript={handleVoiceTranscript} isDisabled={isAiReplying} />
                        </div>
                    </div>
                    <button type="submit" disabled={!userInput.trim() || isAiReplying} className="p-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:bg-slate-300 flex-shrink-0">
                        <span className="material-symbols-outlined w-5 h-5">send</span>
                    </button>
                </form>
            </footer>
            
            {/* Templates Modal */}
            <ChatTemplatesPanel 
                isOpen={isTemplatesOpen}
                onClose={() => setIsTemplatesOpen(false)}
                onSelectTemplate={handleTemplateSelect}
            />
        </div>
    );
};


// --- Main Page Component ---

interface AIChatPageProps {
    properties: Property[];
    agentProfile: AgentProfile;
    conversations: Conversation[];
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
    onBackToDashboard: () => void;
}
type ActiveTab = 'chat' | 'reports' | 'proposals' | 'blog';

const AIChatPage: React.FC<AIChatPageProps> = ({ properties, agentProfile, conversations, setConversations, onBackToDashboard }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    
    // State for AI Chat Tab
    const [activeConversationId, setActiveConversationId] = useState<string | null>(conversations[0]?.id || null);
    const [isAiReplying, setIsAiReplying] = useState(false);

    // State for Property Reports Tab
    const [reportPropId, setReportPropId] = useState<string>(properties[0]?.id || '');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [reportContent, setReportContent] = useState('');
    const [personalNote, setPersonalNote] = useState('');
    const [reportOptions, setReportOptions] = useState({
        marketAnalysis: true,
        comparableProperties: true,
        neighborhoodInfo: false,
    });
    const [brandingOptions, setBrandingOptions] = useState({
        includeHeader: true,
        includeLogo: true,
    });
    
    // Address Lookup State
    const [addressSearch, setAddressSearch] = useState('');
    const [isLookingUpProperty, setIsLookingUpProperty] = useState(false);
    const [lookupProperty, setLookupProperty] = useState<DatafinitiProperty | null>(null);
    const [useAddressLookup, setUseAddressLookup] = useState(false);
    
    // State for Blog Tab
    const [blogTopic, setBlogTopic] = useState('');
    const [blogKeywords, setBlogKeywords] = useState('');
    const [blogTone, setBlogTone] = useState('Professional');
    const [blogStyle] = useState('Informative');
    const [blogAudience, setBlogAudience] = useState('First-Time Homebuyers');
    const [blogCTA, setBlogCTA] = useState('Contact me for a free consultation.');
    const [includeBio, setIncludeBio] = useState(true);
    const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
    const [blogContent, setBlogContent] = useState<AIBlogPost | null>(null);

    // PDF generation state
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    




    // Refs for PDF generation
    const reportRef = useRef<HTMLDivElement>(null);
    const blogRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
        if (!ref.current) {
            alert("Report content not found. Please generate a report first.");
            return;
        }
        
        setIsGeneratingPdf(true);
        
        try {
            console.log('📄 Starting PDF generation...', ref.current);
            console.log('Element dimensions:', {
                offsetWidth: ref.current.offsetWidth,
                offsetHeight: ref.current.offsetHeight,
                scrollWidth: ref.current.scrollWidth,
                scrollHeight: ref.current.scrollHeight
            });
            
            // Wait a moment for any animations/renders to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Generate PDF from multi-page report
            console.log('📄 Starting multi-page PDF generation...');
            
            // Get all page containers
            const pageContainers = ref.current.querySelectorAll('.page-container');
            console.log(`🔢 Found ${pageContainers.length} pages to process`);
            
            if (pageContainers.length === 0) {
                throw new Error('No page containers found');
            }
            
            // Create PDF
          const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Process each page
            for (let i = 0; i < pageContainers.length; i++) {
                const pageElement = pageContainers[i] as HTMLElement;
                console.log(`🎨 Processing page ${i + 1}/${pageContainers.length}`);
                
                // Generate canvas for this page
                const canvas = await html2canvas(pageElement, { 
                    scale: 1.5,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    width: 794, // A4 width in pixels at 96 DPI
                    height: 1123 // A4 height in pixels at 96 DPI
                });
                
                if (canvas.width === 0 || canvas.height === 0) {
                    console.warn(`⚠️ Page ${i + 1} has no dimensions, skipping`);
                    continue;
                }
                
                // Convert to image
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                
                if (imgData === 'data:,' || imgData.length < 100) {
                    console.warn(`⚠️ Page ${i + 1} generated empty image, skipping`);
                    continue;
                }
                
                // Add new page for subsequent pages
                if (i > 0) {
                    pdf.addPage();
                }
                
                // Add full-page image
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297); // Full A4 page
                
                console.log(`✅ Added page ${i + 1} to PDF`);
            }
            
            // Save the PDF
            pdf.save(`${filename}.pdf`);
            
            console.log('✅ PDF saved successfully');
            
            // Show success message
            setTimeout(() => {
                alert('✅ PDF downloaded successfully!');
            }, 500);
            
        } catch (err) {
            console.error('❌ Error generating PDF:', err);
            alert(`❌ Error generating PDF: ${err.message}`);
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    const handleCopyText = (ref: React.RefObject<HTMLDivElement>) => {
        if (ref.current) {
            navigator.clipboard.writeText(ref.current.innerText)
                .then(() => alert('Content copied to clipboard!'))
                .catch(err => console.error('Failed to copy text: ', err));
        }
    };

    const handleNewConversation = () => {
        const newConvo: Conversation = { id: `convo-${Date.now()}`, title: "New Chat", messages: [], lastUpdated: "Just now" };
        setConversations(prev => [newConvo, ...prev]);
        setActiveConversationId(newConvo.id);
    };

    const handleSendMessage = useCallback(async (text: string) => {
        if (!activeConversationId) return;
        const newUserMessage: ChatMessage = { sender: 'user', text };
        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: [...c.messages, newUserMessage] } : c));
        setIsAiReplying(true);
        const currentConvo = conversations.find(c => c.id === activeConversationId);
        if (currentConvo) {
            const aiResponseText = await continueConversation([...currentConvo.messages, newUserMessage]);
            const newAiMessage: ChatMessage = { sender: 'ai', text: aiResponseText };
            setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: [...c.messages, newAiMessage], lastUpdated: "Just now" } : c));
        }
        setIsAiReplying(false);
    }, [activeConversationId, conversations, setConversations]);

    const handleReportOptionChange = (option: keyof typeof reportOptions, value: boolean) => {
        setReportOptions(prev => ({ ...prev, [option]: value }));
    };
    
    const handleBrandingOptionChange = (option: keyof typeof brandingOptions, value: boolean) => {
        setBrandingOptions(prev => ({ ...prev, [option]: value }));
    };

    const handleAddressLookup = async () => {
        if (!addressSearch.trim()) return;
        
        setIsLookingUpProperty(true);
        try {
            const propertyData = await datafiniti.getPropertyByAddress(addressSearch);
            if (propertyData) {
                setLookupProperty(propertyData);
                setUseAddressLookup(true);
                setReportPropId(''); // Clear selected property
            } else {
                alert('Property not found. Please try a different address.');
            }
        } catch (error) {
            console.error('Address lookup error:', error);
            alert('Failed to lookup property. Please try again.');
        } finally {
            setIsLookingUpProperty(false);
        }
    };

    const handleGenerateReport = async () => {
        console.log('🚀 Starting report generation...');
        console.log('📋 useAddressLookup:', useAddressLookup);
        console.log('🏠 lookupProperty:', lookupProperty);
        console.log('📝 reportPropId:', reportPropId);
        
        let prop: Property | undefined;
        
        if (useAddressLookup && lookupProperty) {
            console.log('🔄 Converting DatafinitiProperty to Property...');
            // Convert DatafinitiProperty to Property for report generation
            prop = {
                id: lookupProperty.id,
                title: lookupProperty.address,
                address: lookupProperty.address,
                price: lookupProperty.estimatedValue || 0,
                bedrooms: lookupProperty.bedrooms || 0,
                bathrooms: lookupProperty.bathrooms || 0,
                squareFeet: lookupProperty.squareFeet || 0,
                description: lookupProperty.description || `${lookupProperty.bedrooms || 0} bed, ${lookupProperty.bathrooms || 0} bath home`,
                heroPhotos: lookupProperty.photos || [],
                appFeatures: { 'virtual-tours': true, 'ai-descriptions': true },
                agent: agentProfile,
                propertyType: lookupProperty.propertyType || 'residential',
                features: lookupProperty.features || [],
                imageUrl: lookupProperty.photos?.[0] || ''
            };
            console.log('✅ Converted property:', prop);
        } else {
            console.log('📋 Finding property from existing listings...');
            prop = properties.find(p => p.id === reportPropId);
            console.log('📋 Found property:', prop);
        }
        
        if (!prop) {
            console.error('❌ No property selected for report generation');
            alert('Please select a property or search for an address first.');
            return;
        }
        
        setIsGeneratingReport(true);
        setReportContent('');
        
        try {
            console.log('📊 Building enhanced options...');
            // Enhanced report options with real property data
            const enhancedOptions = {
                ...reportOptions,
                realPropertyData: useAddressLookup && lookupProperty ? {
                    estimatedValue: lookupProperty.estimatedValue,
                    rentEstimate: lookupProperty.rentEstimate,
                    walkScore: lookupProperty.walkScore,
                    crimeScore: lookupProperty.crimeScore,
                    schoolDistrict: lookupProperty.schoolDistrict,
                    neighborhood: lookupProperty.neighborhood,
                    yearBuilt: lookupProperty.yearBuilt,
                    lotSize: lookupProperty.lotSize
                } : undefined
            };
            
            console.log('📊 Enhanced options:', enhancedOptions);
            console.log('🤖 Calling generatePropertyReport...');
            
            const content = await generatePropertyReport(prop, enhancedOptions);
            
            console.log('✅ Report content received, length:', content.length);
            console.log('📄 Report preview:', content.substring(0, 200) + '...');
            
        setReportContent(content);
        } catch (error) {
            console.error('❌ Error in handleGenerateReport:', error);
            alert('Failed to generate report. Check console for details.');
        } finally {
        setIsGeneratingReport(false);
        }
    };

    const handleGenerateBlog = async () => {
        if (!blogTopic.trim()) return;
        setIsGeneratingBlog(true);
        setBlogContent(null);
        const content = await generateBlogPost({
            topic: blogTopic,
            keywords: blogKeywords,
            tone: blogTone,
            style: blogStyle,
            audience: blogAudience,
            cta: blogCTA,
        });
        if ('title' in content) {
            setBlogContent(content);
        }
        setIsGeneratingBlog(false);
    };

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const selectedPropertyForReport = useAddressLookup && lookupProperty 
        ? {
            id: lookupProperty.id,
            title: lookupProperty.address,
            address: lookupProperty.address,
            price: lookupProperty.estimatedValue || 0,
            bedrooms: lookupProperty.bedrooms || 0,
            bathrooms: lookupProperty.bathrooms || 0,
            squareFeet: lookupProperty.squareFeet || 0,
            description: lookupProperty.description || `${lookupProperty.bedrooms || 0} bed, ${lookupProperty.bathrooms || 0} bath home`,
            heroPhotos: lookupProperty.photos || [],
            appFeatures: { 'virtual-tours': true, 'ai-descriptions': true },
            agent: agentProfile,
            propertyType: lookupProperty.propertyType || 'residential',
            features: lookupProperty.features || [],
            imageUrl: lookupProperty.photos?.[0] || ''
        }
        : properties.find(p => p.id === reportPropId);

    const tabs: { id: ActiveTab; label: string; icon: string }[] = [
        { id: 'chat', label: 'AI Content', icon: 'chat_bubble' },
        { id: 'reports', label: 'Property Reports', icon: 'analytics' },
        { id: 'proposals', label: 'Marketing Proposals', icon: 'description' },
        { id: 'blog', label: 'Blog & Articles', icon: 'edit' },
    ];

    const renderContent = () => {
        switch(activeTab) {
            case 'chat': return (
                <div className="flex h-full bg-white">
                    <div className={`${activeConversationId ? 'hidden' : 'flex'} w-full md:flex flex-col md:w-1/3 lg:w-1/4 max-w-sm`}>
                        <ConversationList conversations={conversations} activeConversationId={activeConversationId} onSelectConversation={setActiveConversationId} onNewConversation={handleNewConversation}/>
                    </div>
                    <div className={`${activeConversationId ? 'flex' : 'hidden'} w-full md:flex flex-col flex-grow`}>
                        {activeConversation ? <ChatWindow conversation={activeConversation} onSendMessage={handleSendMessage} isAiReplying={isAiReplying} onBack={() => setActiveConversationId(null)} /> : <div className="hidden md:flex items-center justify-center h-full flex-col text-slate-500 bg-slate-50"><span className="material-symbols-outlined w-16 h-16 mb-4">memory</span><h2 className="text-2xl font-bold">Select a conversation</h2></div>}
                    </div>
                </div>
            );
            case 'reports': return (
                <div className="p-4 sm:p-6 lg:p-8">
                    <h3 className="text-xl font-bold text-slate-800">🏠 AI Property Report Generator</h3>
                    <p className="text-slate-600 mt-1">Create professional marketing reports with real property data</p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                        {/* Left side: Controls */}
                        <div>
                            {/* Property Source Selection */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">📍 Step 1: Choose Property Source</h4>
                                <div className="space-y-3">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="propertySource"
                                            checked={!useAddressLookup}
                                            onChange={() => {
                                                setUseAddressLookup(false);
                                                setLookupProperty(null);
                                            }}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                                        />
                                        <span className="ml-3 text-sm text-slate-700">📋 Use existing listing</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="propertySource"
                                            checked={useAddressLookup}
                                            onChange={() => setUseAddressLookup(true)}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                                        />
                                        <span className="ml-3 text-sm text-slate-700">🔍 Lookup any address (with real market data)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Address Lookup or Property Selection */}
                            {useAddressLookup ? (
                                <div className="mb-6">
                                    <label htmlFor="address-search" className="block text-sm font-semibold text-slate-700 mb-2">
                                        🏡 Enter Property Address
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            id="address-search"
                                            type="text"
                                            value={addressSearch}
                                            onChange={(e) => setAddressSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddressLookup()}
                                            placeholder="e.g., 123 Main Street, Springfield, IL"
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            disabled={isLookingUpProperty}
                                        />
                                        <button
                                            onClick={handleAddressLookup}
                                            disabled={isLookingUpProperty || !addressSearch.trim()}
                                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                                        >
                                            {isLookingUpProperty ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Looking up...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">search</span>
                                                    Lookup
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    
                                    {/* Property Found Display */}
                                    {lookupProperty && (
                                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <span className="text-green-600 material-symbols-outlined">check_circle</span>
                                                <div className="flex-1">
                                                    <h5 className="font-semibold text-green-800">{lookupProperty.address}</h5>
                                                    <p className="text-sm text-green-700">
                                                        {lookupProperty.bedrooms} bed • {lookupProperty.bathrooms} bath • {lookupProperty.squareFeet?.toLocaleString()} sq ft
                                                    </p>
                                                    <p className="text-sm text-green-600 font-semibold">
                                                        Est. Value: ${lookupProperty.estimatedValue?.toLocaleString() || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-6">
                                    <label htmlFor="report-prop" className="block text-sm font-semibold text-slate-700 mb-2">📋 Select Existing Property</label>
                                <div className="relative">
                                        <select 
                                            id="report-prop" 
                                            value={reportPropId} 
                                            onChange={e => setReportPropId(e.target.value)} 
                                            className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        >
                                        <option value="" disabled>Select a property</option>
                                        {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                </div>
                            </div>
                            )}

                            <div className="mt-6 space-y-3">
                                <h4 className="text-sm font-semibold text-slate-700">📊 Step 2: Customize Report Content</h4>
                                <ReportOptionToggle label="Market Analysis" description="Current market trends and positioning." enabled={reportOptions.marketAnalysis} onChange={(val) => handleReportOptionChange('marketAnalysis', val)} />
                                <ReportOptionToggle label="Comparable Properties" description="Recent sales of similar nearby properties." enabled={reportOptions.comparableProperties} onChange={(val) => handleReportOptionChange('comparableProperties', val)} />
                                <ReportOptionToggle label="Neighborhood Info" description="Key amenities, schools, and points of interest." enabled={reportOptions.neighborhoodInfo} onChange={(val) => handleReportOptionChange('neighborhoodInfo', val)} />
                            </div>

                             <div className="mt-6 space-y-3">
                                <h4 className="text-sm font-semibold text-slate-700">🎨 Step 3: Branding & Layout</h4>
                                <ReportOptionToggle label="Include Agent Header" description="Add your headshot, name, and contact info." enabled={brandingOptions.includeHeader} onChange={(val) => handleBrandingOptionChange('includeHeader', val)} />
                                <ReportOptionToggle label="Include Company Logo" description="Display your company logo in the header." enabled={brandingOptions.includeLogo} onChange={(val) => handleBrandingOptionChange('includeLogo', val)} />
                            </div>
                            
                             <div className="mt-6">
                                <label htmlFor="personal-note" className="block text-sm font-semibold text-slate-700 mb-1.5">✏️ Step 4: Add a Personal Note (Optional)</label>
                                <textarea id="personal-note" rows={3} value={personalNote} onChange={e => setPersonalNote(e.target.value)} placeholder="e.g., Hi John, as promised, here is the detailed market analysis..." className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>

                            <div className="mt-8">
                                <div className="space-y-3">
                                    <button 
                                        onClick={handleGenerateReport} 
                                        disabled={isGeneratingReport || (!reportPropId && !lookupProperty)} 
                                        className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:from-primary-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                                    >
                                    <span className="material-symbols-outlined w-5 h-5">auto_awesome</span>
                                        {isGeneratingReport ? 'Generating Professional Report...' : '🚀 Generate AI Report'}
                                    </button>
                                    
                                    {/* Debug Test Button */}
                                    <button 
                                        onClick={() => {
                                            console.log('🧪 Debug test button clicked');
                                            console.log('📊 Current report options:', reportOptions);
                                            console.log('🏠 Current lookup property:', lookupProperty);
                                            console.log('📝 Current reportPropId:', reportPropId);
                                            console.log('🔄 Use address lookup:', useAddressLookup);
                                            setReportContent('# Test Report\n\nThis is a test report to verify the display is working.\n\n## Test Section\nIf you can see this, the report display mechanism is working correctly.');
                                        }}
                                        className="w-full px-3 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-all"
                                    >
                                        🧪 Test Report Display (Debug)
                                </button>
                                </div>
                                {useAddressLookup && lookupProperty && (
                                    <p className="text-xs text-green-600 mt-2 text-center font-medium">
                                        ✨ Enhanced with real property data from Datafiniti
                                    </p>
                                )}
                            </div>
                        </div>
                        {/* Right side: Preview */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <h4 className="text-lg font-bold text-slate-800 text-center mb-4">Report Preview</h4>
                            {isGeneratingReport && <div className="mt-6 flex justify-center"><AIInteractionLoader className="text-2xl" /></div>}
                            {reportContent ? (
                                <div className="mt-4">
                                    <div className="flex justify-center gap-4 mb-4">
                                        <button onClick={() => handleCopyText(reportRef)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition">
                                            <span className="material-symbols-outlined w-4 h-4">content_paste</span> Copy Text
                                        </button>

                                        {selectedPropertyForReport && (
                                            <button 
                                                onClick={() => handleDownloadPdf(reportRef, `Report-${selectedPropertyForReport.address.replace(/, /g, '-')}`)} 
                                                disabled={isGeneratingPdf}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
                                                    isGeneratingPdf 
                                                        ? 'text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed' 
                                                        : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-100'
                                                }`}
                                            >
                                                {isGeneratingPdf ? (
                                                    <>
                                                        <span className="material-symbols-outlined w-4 h-4 animate-spin">refresh</span> 
                                                        Generating PDF...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined w-4 h-4">download</span> 
                                                        Download as PDF
                                                    </>
                                                )}
                                        </button>
                                        )}
                                    </div>
                                    <div className="overflow-y-auto" style={{maxHeight: '60vh'}}>
                                        {selectedPropertyForReport ? (
                                         <BrandedReport ref={reportRef} agent={agentProfile} property={selectedPropertyForReport} reportContent={reportContent} personalNote={personalNote} />
                                        ) : (
                                            <div className="p-6 bg-white rounded-lg border border-slate-200">
                                                <div className="prose prose-slate max-w-none">
                                                    <div dangerouslySetInnerHTML={{ __html: reportContent.replace(/\n/g, '<br />').replace(/## (.*)/g, '<h3>$1</h3>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
                                    <span className="material-symbols-outlined w-12 h-12 text-slate-300 mb-2">analytics</span>
                                    <p>Your client-ready report will be generated here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
            case 'proposals': return (
                <div className="p-4 sm:p-6 lg:p-8">
                    <h3 className="text-xl font-bold text-slate-800">📋 AI Marketing Proposals</h3>
                    <p className="text-slate-600 mt-1">Generate professional marketing proposals with AI</p>
                    
                    <div className="mt-6">
                        <AIMarketingProposalPage />
                    </div>
                </div>
            );
            case 'blog': return (
                <div className="p-4 sm:p-6 lg:p-8">
                    <h3 className="text-xl font-bold text-slate-800">AI Content Studio: Blog & Articles</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                        {/* Left side: Controls */}
                        <div>
                            <div>
                                <label htmlFor="blog-topic" className="block text-sm font-semibold text-slate-700 mb-1.5">1. Topic</label>
                                <input id="blog-topic" type="text" value={blogTopic} onChange={e => setBlogTopic(e.target.value)} placeholder="e.g., 5 Tips for First-Time Homebuyers" className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                            </div>
                            <div className="mt-4">
                                <label htmlFor="blog-keywords" className="block text-sm font-semibold text-slate-700 mb-1.5">2. Keywords (comma-separated)</label>
                                <input id="blog-keywords" type="text" value={blogKeywords} onChange={e => setBlogKeywords(e.target.value)} placeholder="e.g., mortgage, inspection, real estate" className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                            </div>

                            <div className="mt-6">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">3. Fine-Tune AI</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="blog-tone" className="block text-xs font-medium text-slate-600 mb-1">Tone & Style</label>
                                        <select id="blog-tone" value={blogTone} onChange={e => setBlogTone(e.target.value)} className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                                            <option>Professional</option>
                                            <option>Casual & Friendly</option>
                                            <option>Story-driven</option>
                                            <option>Humorous</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="blog-audience" className="block text-xs font-medium text-slate-600 mb-1">Target Audience</label>
                                        <select id="blog-audience" value={blogAudience} onChange={e => setBlogAudience(e.target.value)} className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                                            <option>First-Time Homebuyers</option>
                                            <option>Luxury Clients</option>
                                            <option>Property Investors</option>
                                            <option>Downsizers</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                             <div className="mt-4">
                                <label htmlFor="blog-cta" className="block text-sm font-semibold text-slate-700 mb-1.5">4. Call to Action</label>
                                <input id="blog-cta" type="text" value={blogCTA} onChange={e => setBlogCTA(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                            </div>
                            
                             <div className="mt-6">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">5. Branding</h4>
                                <ReportOptionToggle label="Include Agent Bio" description="Add your profile bio at the end of the post." enabled={includeBio} onChange={setIncludeBio} />
                            </div>

                            <div className="mt-6">
                                <button onClick={handleGenerateBlog} disabled={isGeneratingBlog || !blogTopic.trim()} className="w-full px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 disabled:bg-slate-400 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined w-5 h-5">auto_awesome</span>
                                    {isGeneratingBlog ? 'Generating...' : 'Generate Article'}
                                </button>
                            </div>
                        </div>

                        {/* Right side: Preview */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <h4 className="text-lg font-bold text-slate-800 text-center mb-4">Article Preview</h4>
                             {isGeneratingBlog && <div className="mt-6 flex justify-center"><AIInteractionLoader className="text-2xl" /></div>}
                             {blogContent ? (
                                <div className="mt-4">
                                    <div className="flex justify-center gap-4 mb-4">
                                        <button onClick={() => handleCopyText(blogRef)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition">
                                            <span className="material-symbols-outlined w-4 h-4">content_paste</span> Copy Text
                                        </button>
                                        <button 
                                            onClick={() => handleDownloadPdf(blogRef, `Blog-${blogContent.title.replace(/\s+/g, '-')}`)} 
                                            disabled={isGeneratingPdf}
                                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
                                                isGeneratingPdf 
                                                    ? 'text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed' 
                                                    : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-100'
                                            }`}
                                        >
                                            {isGeneratingPdf ? (
                                                <>
                                                    <span className="material-symbols-outlined w-4 h-4 animate-spin">refresh</span> 
                                                    Generating PDF...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined w-4 h-4">download</span> 
                                                    Download as PDF
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto" style={{maxHeight: '60vh'}}>
                                        <BrandedBlogPost ref={blogRef} agent={agentProfile} post={blogContent} includeBio={includeBio} />
                                    </div>
                                </div>
                             ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
                                    <span className="material-symbols-outlined w-12 h-12 text-slate-300 mb-2">edit</span>
                                    <p>Your ready-to-publish article will be generated here.</p>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="max-w-screen-2xl mx-auto py-4 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
            <header className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-slate-900">AI Content Studio</h1>
                <button onClick={onBackToDashboard} className="flex-shrink-0 flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors p-2 rounded-lg hover:bg-slate-100">
                    <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
                    <span>Back to Dashboard</span>
                </button>
            </header>
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                           <span className="material-symbols-outlined w-5 h-5">{tab.icon}</span> <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow bg-white rounded-b-xl shadow-lg border-x border-b border-slate-200/60 overflow-y-auto min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default AIChatPage;
