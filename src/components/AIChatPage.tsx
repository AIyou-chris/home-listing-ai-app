
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, ChatMessage, Property, AgentProfile, AIBlogPost } from '../types';
import { 
    continueConversation, 
    generatePropertyReport, 
    generateBlogPost
} from '../services/geminiService';

// Add declarations for CDN libraries
declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
    jspdf: {
      jsPDF: new (orientation?: 'p' | 'l', unit?: string, format?: string) => any;
    };
  }
}

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
}>(({ agent, property, reportContent, personalNote }, ref) => (
    <div ref={ref} className="p-8 bg-white border-2 border-slate-200 font-sans max-w-4xl mx-auto">
        {/* Header */}
        <header style={{ borderBottomColor: agent.brandColor || '#E2E8F0' }} className="flex justify-between items-start pb-6 border-b-2">
            <div className="text-left">
                <h1 style={{ color: agent.brandColor || '#1E293B' }} className="text-2xl font-extrabold">{agent.name}</h1>
                <p className="text-slate-600 font-medium">{agent.title}</p>
                <p className="text-slate-600 font-medium">{agent.company}</p>
            </div>
            {agent.logoUrl && (
                <img src={agent.logoUrl} alt={`${agent.company} logo`} className="h-16 max-w-[150px] object-contain" />
            )}
        </header>

        {/* Agent Info & Property Title */}
        <div className="mt-8 flex justify-between items-start">
             <div className="text-left">
                <h2 className="text-xl font-bold text-slate-800">Market Analysis Report</h2>
                <p className="text-slate-600 font-medium">{property.address}</p>
                <p className="text-sm text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
            </div>
            {agent.headshotUrl && (
                <div className="flex items-center gap-4">
                    <img src={agent.headshotUrl} alt={agent.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md" />
                </div>
            )}
        </div>
        
        {/* Personal Note */}
        {personalNote && (
            <div className="mt-8 p-4 bg-slate-50 rounded-lg border-l-4" style={{ borderColor: agent.brandColor || '#64748B' }}>
                <p className="text-slate-700 italic">{personalNote}</p>
            </div>
        )}

        {/* AI Generated Content */}
        <div className="mt-8">
            <div
                className="prose prose-slate max-w-none prose-headings:font-bold prose-p:text-slate-600"
                dangerouslySetInnerHTML={{ __html: reportContent.replace(/\n/g, '<br />').replace(/## (.*)/g, `<h3 style="color:${agent.brandColor || '#1E293B'}; border-bottom: 2px solid ${agent.brandColor || '#E2E8F0'}; padding-bottom: 4px;">$1</h3>`).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
        </div>
        
         {/* Footer */}
        <footer style={{ borderTopColor: agent.brandColor || '#E2E8F0' }} className="mt-12 pt-6 border-t-2 text-center text-sm text-slate-500">
            <p><strong>{agent.name}</strong> | {agent.company}</p>
            <div className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined w-4 h-4">call</span> {agent.phone}</span>
                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined w-4 h-4">mail</span> {agent.email}</span>
            </div>
             <p className="mt-1">{agent.website}</p>
        </footer>
    </div>
));

const BrandedBlogPost = React.forwardRef<HTMLDivElement, {
    agent: AgentProfile;
    post: AIBlogPost;
    includeBio: boolean;
}>(({ agent, post, includeBio }, ref) => (
    <div ref={ref} className="p-8 bg-white border-2 border-slate-200 font-sans max-w-4xl mx-auto">
        {/* Byline */}
        <div className="flex items-center gap-4 mb-6">
            {agent.headshotUrl && (
                <img src={agent.headshotUrl} alt={agent.name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-200" />
            )}
            <div>
                <p className="font-bold text-slate-800 text-lg">{agent.name}</p>
                <p className="text-slate-500 text-sm">Published on {new Date().toLocaleDateString()}</p>
            </div>
        </div>

        {/* AI Generated Content */}
        <article className="prose prose-slate max-w-none prose-headings:font-extrabold prose-headings:text-slate-800 prose-p:leading-relaxed prose-p:text-slate-700">
            <h1>{post.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: post.body }} />
        </article>

        {/* Agent Bio */}
        {includeBio && agent.bio && (
            <footer className="mt-12 pt-8 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center gap-6">
                {agent.headshotUrl && (
                     <img src={agent.headshotUrl} alt={agent.name} className="w-24 h-24 rounded-full object-cover flex-shrink-0 border-4 border-white shadow-lg" />
                )}
                <div>
                    <h4 className="text-xl font-bold text-slate-800">About the Author</h4>
                    <p className="mt-2 text-slate-600">{agent.bio}</p>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-slate-600"><span className="material-symbols-outlined w-4 h-4 text-slate-400">mail</span> {agent.email}</span>
                        <span className="flex items-center gap-1.5 text-slate-600"><span className="material-symbols-outlined w-4 h-4 text-slate-400">call</span> {agent.phone}</span>
                    </div>
                </div>
            </footer>
        )}
    </div>
));


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
type ActiveTab = 'chat' | 'reports' | 'blog';

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



    // Refs for PDF generation
    const reportRef = useRef<HTMLDivElement>(null);
    const blogRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = (ref: React.RefObject<HTMLDivElement>, filename: string) => {
        if (!ref.current || !window.html2canvas || !window.jspdf) {
            alert("PDF generation library not found.");
            return;
        }
        
        const { jsPDF } = window.jspdf;
        window.html2canvas(ref.current, { scale: 2 }).then(canvas => {
          const imgData = canvas.toDataURL('image/png');
          const pdfWidth = 210; // A4 width in mm
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          const pdf = new jsPDF('p', 'mm', 'a4');
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${filename}.pdf`);
        });
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

    const handleGenerateReport = async () => {
        const prop = properties.find(p => p.id === reportPropId);
        if (!prop) return;
        setIsGeneratingReport(true);
        setReportContent('');
        const content = await generatePropertyReport(prop, reportOptions);
        setReportContent(content);
        setIsGeneratingReport(false);
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
    const selectedPropertyForReport = properties.find(p => p.id === reportPropId);

    const tabs: { id: ActiveTab; label: string; icon: string }[] = [
        { id: 'chat', label: 'AI Content', icon: 'chat_bubble' },
        { id: 'reports', label: 'Property Reports', icon: 'analytics' },
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
                    <h3 className="text-xl font-bold text-slate-800">Generate Agent-Branded Property Report</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                        {/* Left side: Controls */}
                        <div>
                            <div>
                                <label htmlFor="report-prop" className="block text-sm font-semibold text-slate-700 mb-1.5">1. Select Property</label>
                                <div className="relative">
                                    <select id="report-prop" value={reportPropId} onChange={e => setReportPropId(e.target.value)} className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="" disabled>Select a property</option>
                                        {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <h4 className="text-sm font-semibold text-slate-700">2. Customize Report Content</h4>
                                <ReportOptionToggle label="Market Analysis" description="Current market trends and positioning." enabled={reportOptions.marketAnalysis} onChange={(val) => handleReportOptionChange('marketAnalysis', val)} />
                                <ReportOptionToggle label="Comparable Properties" description="Recent sales of similar nearby properties." enabled={reportOptions.comparableProperties} onChange={(val) => handleReportOptionChange('comparableProperties', val)} />
                                <ReportOptionToggle label="Neighborhood Info" description="Key amenities, schools, and points of interest." enabled={reportOptions.neighborhoodInfo} onChange={(val) => handleReportOptionChange('neighborhoodInfo', val)} />
                            </div>

                             <div className="mt-6 space-y-3">
                                <h4 className="text-sm font-semibold text-slate-700">3. Branding & Layout</h4>
                                <ReportOptionToggle label="Include Agent Header" description="Add your headshot, name, and contact info." enabled={brandingOptions.includeHeader} onChange={(val) => handleBrandingOptionChange('includeHeader', val)} />
                                <ReportOptionToggle label="Include Company Logo" description="Display your company logo in the header." enabled={brandingOptions.includeLogo} onChange={(val) => handleBrandingOptionChange('includeLogo', val)} />
                            </div>
                            
                             <div className="mt-6">
                                <label htmlFor="personal-note" className="block text-sm font-semibold text-slate-700 mb-1.5">4. Add a Personal Note (Optional)</label>
                                <textarea id="personal-note" rows={3} value={personalNote} onChange={e => setPersonalNote(e.target.value)} placeholder="e.g., Hi John, as promised, here is the detailed market analysis..." className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>

                            <div className="mt-6">
                                <button onClick={handleGenerateReport} disabled={isGeneratingReport || !reportPropId} className="w-full px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 disabled:bg-slate-400 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined w-5 h-5">auto_awesome</span>
                                    {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                                </button>
                            </div>
                        </div>
                        {/* Right side: Preview */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <h4 className="text-lg font-bold text-slate-800 text-center mb-4">Report Preview</h4>
                            {isGeneratingReport && <div className="mt-6 flex justify-center"><AIInteractionLoader className="text-2xl" /></div>}
                            {reportContent && selectedPropertyForReport ? (
                                <div className="mt-4">
                                    <div className="flex justify-center gap-4 mb-4">
                                        <button onClick={() => handleCopyText(reportRef)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition">
                                            <span className="material-symbols-outlined w-4 h-4">content_paste</span> Copy Text
                                        </button>
                                        <button onClick={() => handleDownloadPdf(reportRef, `Report-${selectedPropertyForReport.address.replace(/, /g, '-')}`)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition">
                                            <span className="material-symbols-outlined w-4 h-4">download</span> Download as PDF
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto" style={{maxHeight: '60vh'}}>
                                         <BrandedReport ref={reportRef} agent={agentProfile} property={selectedPropertyForReport} reportContent={reportContent} personalNote={personalNote} />
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
                                        <button onClick={() => handleDownloadPdf(blogRef, `Blog-${blogContent.title.replace(/\s+/g, '-')}`)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition">
                                            <span className="material-symbols-outlined w-4 h-4">download</span> Download as PDF
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
