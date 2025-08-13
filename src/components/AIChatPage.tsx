
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, ChatMessage, Property, AgentProfile, AIBlogPost } from '../types';
import { 
    continueConversation, 
    generatePropertyReport, 
    generateBlogPost,
    generateSocialPostText
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

// --- Reusable Components ---

const AIInteractionLoader: React.FC<{className?: string}> = ({ className }) => (
    <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
    </div>
);

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
                <form onSubmit={handleFormSubmit} className="flex items-center space-x-2">
                    <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Ask your AI assistant..." className="w-full bg-white border-2 border-slate-200 rounded-full py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" disabled={isAiReplying}/>
                    <button type="submit" disabled={!userInput.trim() || isAiReplying} className="p-2.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:bg-slate-300">
                        <span className="material-symbols-outlined w-5 h-5">send</span>
                    </button>
                </form>
            </footer>
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
type ActiveTab = 'chat' | 'reports' | 'blog' | 'social';

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

    // State for Social Posts Tab
    const [socialPropId, setSocialPropId] = useState<string>(properties[0]?.id || '');
    const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
    const [socialContent, setSocialContent] = useState('');

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
    
    const handleGenerateSocial = async () => {
        const prop = properties.find(p => p.id === socialPropId);
        if (!prop) return;
        setIsGeneratingSocial(true);
        setSocialContent('');
        // Using a generic platform array for now
        const content = await generateSocialPostText(prop, ['facebook', 'instagram']);
        setSocialContent(content);
        setIsGeneratingSocial(false);
    };

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const selectedPropertyForReport = properties.find(p => p.id === reportPropId);

    const tabs: { id: ActiveTab; label: string; icon: string }[] = [
        { id: 'chat', label: 'AI Content', icon: 'chat_bubble' },
        { id: 'reports', label: 'Property Reports', icon: 'analytics' },
        { id: 'blog', label: 'Blog & Articles', icon: 'edit' },
        { id: 'social', label: 'Social Posts', icon: 'rss_feed' },
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
            case 'social': return (
                <div className="p-4 sm:p-6 lg:p-8">
                    <h3 className="text-xl font-bold text-slate-800">Generate Social Media Post</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 items-end">
                        <div className="md:col-span-2">
                            <label htmlFor="social-prop" className="block text-sm font-semibold text-slate-700 mb-1.5">Select Property</label>
                            <div className="relative"><select id="social-prop" value={socialPropId} onChange={e => setSocialPropId(e.target.value)} className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="" disabled>Select a property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}</select><span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span></div>
                        </div>
                        <button onClick={handleGenerateSocial} disabled={isGeneratingSocial || !socialPropId} className="w-full md:w-auto px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 disabled:bg-slate-400 flex items-center justify-center gap-2"><span className="material-symbols-outlined w-5 h-5">auto_awesome</span>{isGeneratingSocial ? 'Generating...' : 'Generate Post'}</button>
                    </div>
                    {isGeneratingSocial && <div className="mt-6 flex justify-center"><AIInteractionLoader className="text-2xl" /></div>}
                    {socialContent && <GeneratedContentDisplay content={socialContent} title="Generated Social Post" icon="rss_feed" />}
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
