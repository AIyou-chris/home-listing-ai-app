import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    ChatMessage,
    SidekickOption as BaseSidekickOption,
    ADMIN_SIDEKICKS,
    TRAINING_ARCHITECT_PROMPT
} from './AIInteractiveTraining';

interface SidekickOption extends BaseSidekickOption {
    suggestedQuestions?: string[];
}

interface UnifiedTrainingStudioProps {
    mode: 'admin' | 'blueprint';
    sidekicks?: SidekickOption[];
    demoMode?: boolean;
}

// Extend Window interface for Web Speech API
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webkitSpeechRecognition: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        SpeechRecognition: any;
    }
}

import { supabase } from '../services/supabase';

// ... (existing helper function / variable if any) ...

const UnifiedTrainingStudio: React.FC<UnifiedTrainingStudioProps> = ({
    mode,
    sidekicks = ADMIN_SIDEKICKS,
    demoMode = false
}) => {
    const [selectedSidekick, setSelectedSidekick] = useState<string>(sidekicks[0]?.id || '');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [systemPrompts, setSystemPrompts] = useState<Record<string, string>>({});
    const [savingPrompt, setSavingPrompt] = useState(false);
    const [trainingNotification, setTrainingNotification] = useState<string | null>(null);
    const [trainingError, setTrainingError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Fetch User ID
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        };
        getUser();
    }, []);

    // Voice Input State
    const [isListening, setIsListening] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    // Feedback State
    const [feedbackInFlight, setFeedbackInFlight] = useState<string | null>(null);
    const [showImprovementInput, setShowImprovementInput] = useState<string | null>(null);
    const [improvementText, setImprovementText] = useState('');
    const [improvementLoadingId, setImprovementLoadingId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const currentSidekick = sidekicks.find(s => s.id === selectedSidekick) || sidekicks[0];

    // Load System Prompt
    useEffect(() => {
        const loadPrompt = async () => {
            if (demoMode || !selectedSidekick) return;
            try {


                // For blueprint, let's try fetching the sidekick details first if the prompt endpoint is POST only
                // Actually, let's assume GET /api/blueprint/ai-sidekicks/:id works similar to admin
                const fetchUrl = mode === 'admin'
                    ? `/api/admin/ai-sidekicks/${selectedSidekick}`
                    : `/api/blueprint/ai-sidekicks/${selectedSidekick}`;

                const res = await fetch(fetchUrl);
                if (!res.ok) return;
                const data = await res.json();
                if (typeof data?.systemPrompt === 'string') {
                    setSystemPrompts(prev => ({ ...prev, [selectedSidekick]: data.systemPrompt }));
                }
            } catch (error) {
                console.warn('Failed to load system prompt', error);
            }
        };
        void loadPrompt();
    }, [selectedSidekick, demoMode, mode]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showImprovementInput]);

    // Voice Input Logic
    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice input is not supported in this browser. Please try Chrome or Safari.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputMessage(prev => (prev ? `${prev} ${transcript}` : transcript));
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [isListening]);

    // Send Message
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const conversationHistory = messages.map(msg => ({
                sender: msg.role === 'assistant' ? 'assistant' : 'user',
                text: msg.content
            }));

            let res;
            if (mode === 'admin') {
                res = await fetch('/api/admin/ai-chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': currentUserId || ''
                    },
                    body: JSON.stringify({
                        sidekickId: selectedSidekick,
                        sidekickType: selectedSidekick,
                        message: userMessage.content,
                        systemPrompt: systemPrompts[selectedSidekick] || currentSidekick.systemPrompt, // Pass the edited prompt!
                        history: conversationHistory
                    })
                });
            } else {
                // Blueprint mode
                res = await fetch(`/api/blueprint/ai-sidekicks/${selectedSidekick}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: userMessage.content,
                        history: conversationHistory // Blueprint chat endpoint might handle history differently, but passing it is safe
                    })
                });
            }

            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            const responseText = (data?.response || data?.reply || 'I am still thinking about that.').toString();

            const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: responseText,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Feedback Logic
    const handleFeedback = async (messageId: string, feedback: 'thumbs_up' | 'thumbs_down') => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, feedback } : msg
        ));

        if (feedbackInFlight === messageId) return;
        setFeedbackInFlight(messageId);
        setTrainingNotification(null);

        if (demoMode) {
            setFeedbackInFlight(null);
            if (feedback === 'thumbs_down') setShowImprovementInput(messageId);
            return;
        }

        try {
            const message = messages.find(m => m.id === messageId);
            const userMessage = messages[messages.findIndex(m => m.id === messageId) - 1];

            const endpoint = mode === 'admin'
                ? `/api/admin/ai-sidekicks/${selectedSidekick}/feedback`
                : `/api/blueprint/ai-sidekicks/${selectedSidekick}/feedback`;

            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId,
                    feedback,
                    userMessage: userMessage?.content || '',
                    assistantMessage: message?.content || ''
                })
            });
            setTrainingNotification('Feedback saved.');
        } catch (error) {
            console.error('Failed to send feedback', error);
            setTrainingError('Could not save feedback.');
        } finally {
            setFeedbackInFlight(null);
        }

        if (feedback === 'thumbs_down') {
            setShowImprovementInput(messageId);
        }
    };

    const handleImprovement = async (messageId: string) => {
        if (!improvementText.trim() || improvementLoadingId === messageId) return;

        setImprovementLoadingId(messageId);
        setTrainingNotification(null);

        if (demoMode) {
            setImprovementText('');
            setShowImprovementInput(null);
            setImprovementLoadingId(null);
            return;
        }

        try {
            const message = messages.find(m => m.id === messageId);
            const userMessage = messages[messages.findIndex(m => m.id === messageId) - 1];

            const endpoint = mode === 'admin'
                ? `/api/admin/ai-sidekicks/${selectedSidekick}/feedback`
                : `/api/blueprint/ai-sidekicks/${selectedSidekick}/feedback`;

            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId,
                    feedback: 'thumbs_down',
                    improvement: improvementText.trim(),
                    userMessage: userMessage?.content || '',
                    assistantMessage: message?.content || ''
                })
            });
            setTrainingNotification('Improvement saved.');
        } catch (error) {
            console.error('Failed to save improvement', error);
            setTrainingError('Could not save improvement.');
        } finally {
            setImprovementText('');
            setShowImprovementInput(null);
            setImprovementLoadingId(null);
        }
    };

    // Mobile View State
    const [mobileView, setMobileView] = useState<'analytics' | 'chat' | 'config'>('chat');

    // Desktop Slide-over State
    const [showConfig, setShowConfig] = useState(false);

    // Copy to Clipboard
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setTrainingNotification('Copied to clipboard!');
        setTimeout(() => setTrainingNotification(null), 2000);
    };

    // Save System Prompt
    const handleSavePrompt = async () => {
        if (savingPrompt) return;
        setSavingPrompt(true);
        setTrainingNotification(null);
        setTrainingError(null);
        try {
            if (!demoMode) {
                const endpoint = mode === 'admin'
                    ? `/api/admin/ai-sidekicks/${selectedSidekick}/system-prompt`
                    : `/api/blueprint/ai-sidekicks/${selectedSidekick}/prompt`;

                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ systemPrompt: systemPrompts[selectedSidekick] || '' })
                });
            }
            setTrainingNotification('System prompt saved.');
        } catch (error) {
            console.error('Failed to save system prompt', error);
            setTrainingError('Could not save system prompt.');
        } finally {
            setSavingPrompt(false);
        }
    };

    // Analytics State
    const [analytics, setAnalytics] = useState<{
        accuracy: number;
        positive: number;
        negative: number;
        recent: any[];
    }>({ accuracy: 0, positive: 0, negative: 0, recent: [] });

    // Fetch Analytics
    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!selectedSidekick) return;
            try {
                // Determine endpoint based on mode? 
                // Currently server has /api/training/feedback/:sidekick (publicly accessible or protected?)
                // Let's use the one we just patched.
                const res = await fetch(`/api/training/feedback/${selectedSidekick}`, {
                    headers: { 'x-user-id': currentUserId || '' }
                });
                if (!res.ok) return;
                const data = await res.json();

                const total = data.positiveCount + data.negativeCount;
                const accuracy = total > 0 ? Math.round((data.positiveCount / total) * 100) : 0;

                setAnalytics({
                    accuracy,
                    positive: data.positiveCount,
                    negative: data.negativeCount,
                    recent: data.recentFeedback || []
                });
            } catch (e) {
                console.error('Failed to load training analytics', e);
            }
        };
        fetchAnalytics();
    }, [selectedSidekick, trainingNotification, currentUserId]); // Reload when feedback is given

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative min-h-[500px]">
            <div className="flex-1 flex overflow-hidden relative">
                {/* ... Left Sidebar ... */}

                {/* Mobile Analytics View */}
                <div className={`${mobileView === 'analytics' ? 'flex' : 'hidden'} md:hidden flex-1 flex-col min-w-0 bg-slate-50 h-full relative overflow-y-auto`}>
                    <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                        <h2 className="font-semibold text-slate-800">Training Analytics</h2>
                    </div>
                    <div className="p-4 space-y-4 pb-24">
                        {/* Accuracy Score */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="56" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                                    <circle
                                        cx="64" cy="64" r="56"
                                        stroke={analytics.accuracy >= 70 ? "#22c55e" : (analytics.accuracy >= 40 ? "#eab308" : "#ef4444")}
                                        strokeWidth="12" fill="none"
                                        strokeDasharray="351.86"
                                        strokeDashoffset={351.86 - (351.86 * analytics.accuracy) / 100}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-bold text-slate-800">{analytics.accuracy}%</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wide">Accuracy</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mt-4 text-center">
                                {analytics.accuracy === 0 ? 'Start training to see your score!' :
                                    (analytics.accuracy > 80 ? 'Your AI is doing great! Keep it up.' : 'Keep refining to improve accuracy.')}
                            </p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-2 mb-2 text-green-600">
                                    <span className="material-symbols-outlined">thumb_up</span>
                                    <span className="font-semibold">Good</span>
                                </div>
                                <span className="text-2xl font-bold text-slate-800">{analytics.positive}</span>
                                <span className="text-xs text-slate-500 ml-1">responses</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-2 mb-2 text-red-600">
                                    <span className="material-symbols-outlined">thumb_down</span>
                                    <span className="font-semibold">Needs Fix</span>
                                </div>
                                <span className="text-2xl font-bold text-slate-800">{analytics.negative}</span>
                                <span className="text-xs text-slate-500 ml-1">responses</span>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <h3 className="font-semibold text-slate-800 mb-3">Recent Improvements</h3>
                            <div className="space-y-3">
                                {analytics.recent.length === 0 ? (
                                    <p className="text-xs text-slate-400">No recent feedback recorded.</p>
                                ) : (
                                    analytics.recent.map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3 text-sm border-b border-slate-50 pb-2 last:border-0">
                                            <span className={`material-symbols-outlined mt-0.5 text-xs ${item.feedback === 'thumbs_up' ? 'text-green-500' : 'text-red-500'}`}>
                                                {item.feedback === 'thumbs_up' ? 'thumb_up' : 'thumb_down'}
                                            </span>
                                            <div>
                                                <p className="font-medium text-slate-800 truncate w-48">{item.userMessage || 'Interaction'}</p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(item.timestamp || item.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: Chat Interface */}
                <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-slate-50 h-full relative`}>
                    {/* Chat Header */}
                    <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: currentSidekick.color + '20', color: currentSidekick.color }}>
                                <span className="material-symbols-outlined">{currentSidekick.icon}</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 text-sm">{currentSidekick.name}</h3>
                                <p className="text-xs text-slate-500">Training Mode</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className={`p-2 rounded-lg transition-colors hidden md:flex items-center gap-2 text-sm font-medium ${showConfig ? 'bg-primary-50 text-primary-600' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined">tune</span>
                            {showConfig ? 'Hide Config' : 'Configuration'}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-48 md:pb-4">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-4xl mb-2">chat</span>
                                <p className="mb-6">Select a sidekick and start training</p>

                                {(currentSidekick as SidekickOption).suggestedQuestions && (currentSidekick as SidekickOption).suggestedQuestions!.length > 0 && (
                                    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                                        {(currentSidekick as SidekickOption).suggestedQuestions!.map((question, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setInputMessage(question)}
                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors shadow-sm"
                                            >
                                                {question}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-4`}>
                                <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-primary-600 text-white rounded-br-none'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                                    }`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>

                                {/* Feedback Buttons for Assistant Messages */}
                                {msg.role === 'assistant' && (
                                    <div className="flex flex-wrap items-center gap-2 mt-2 ml-1">
                                        <button
                                            onClick={() => handleCopy(msg.content)}
                                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                            title="Copy response"
                                        >
                                            <span className="material-symbols-outlined text-lg">content_copy</span>
                                        </button>
                                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                        <button
                                            onClick={() => handleFeedback(msg.id, 'thumbs_up')}
                                            className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${msg.feedback === 'thumbs_up' ? 'bg-green-50 text-green-600 ring-1 ring-green-200' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Good response"
                                        >
                                            <span className="material-symbols-outlined text-lg">thumb_up</span>
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(msg.id, 'thumbs_down')}
                                            className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${msg.feedback === 'thumbs_down' ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Needs improvement"
                                        >
                                            <span className="material-symbols-outlined text-lg">thumb_down</span>
                                        </button>
                                    </div>
                                )}

                                {/* Improvement Input */}
                                {showImprovementInput === msg.id && (
                                    <div className="mt-2 w-full max-w-[90%] md:max-w-[80%] bg-white border border-orange-200 rounded-lg p-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-medium text-orange-800 mb-1">
                                            How should I have answered?
                                        </label>
                                        <textarea
                                            value={improvementText}
                                            onChange={e => setImprovementText(e.target.value)}
                                            className="w-full text-sm border border-slate-300 rounded-md p-2 mb-2 focus:ring-2 focus:ring-orange-500 outline-none"
                                            rows={2}
                                            placeholder="Type the ideal response..."
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setShowImprovementInput(null)}
                                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleImprovement(msg.id)}
                                                disabled={!improvementText.trim() || improvementLoadingId === msg.id}
                                                className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                                            >
                                                {improvementLoadingId === msg.id ? 'Saving...' : 'Save Improvement'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white border-t border-slate-200 fixed bottom-[60px] md:bottom-0 left-0 right-0 md:static z-20">
                        <div className="flex gap-2 max-w-4xl mx-auto">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={e => setInputMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder={`Message ${currentSidekick.name}...`}
                                    className="w-full border border-slate-300 rounded-lg pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    disabled={isLoading}
                                />
                                {/* Mic Button */}
                                <button
                                    onClick={toggleListening}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${isListening
                                        ? 'bg-red-100 text-red-600 animate-pulse'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                        }`}
                                    title="Voice Input"
                                >
                                    <span className="material-symbols-outlined text-xl">mic</span>
                                </button>
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !inputMessage.trim()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Configuration (Slide-over on Desktop, Tab on Mobile) */}
                <div
                    className={`
                        ${mobileView === 'config' ? 'flex' : 'hidden'} 
                        md:flex w-full md:w-80 bg-white border-l border-slate-200 flex-col overflow-y-auto 
                        absolute inset-0 z-20 
                        md:left-auto md:right-0 md:top-0 md:bottom-0 md:border-l md:shadow-2xl 
                        transform transition-transform duration-300 ease-in-out
                        ${showConfig ? 'md:translate-x-0' : 'md:translate-x-full'}
                    `}
                >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800">Configuration</h2>
                        {/* Mobile Close Button */}
                        <button onClick={() => setMobileView('chat')} className="md:hidden p-2 text-slate-500">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        {/* Desktop Close Button */}
                        <button onClick={() => setShowConfig(false)} className="hidden md:block p-2 text-slate-500 hover:text-slate-700">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="p-4 space-y-6">
                        {/* System Prompt */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-slate-700">System Prompt</label>
                                <button
                                    onClick={handleSavePrompt}
                                    disabled={savingPrompt || demoMode}
                                    className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                                >
                                    {savingPrompt ? 'Saving...' : (demoMode ? 'Save (Disabled)' : 'Save')}
                                </button>
                            </div>
                            <textarea
                                value={systemPrompts[selectedSidekick] || currentSidekick.systemPrompt}
                                onChange={e => setSystemPrompts(prev => ({ ...prev, [selectedSidekick]: e.target.value }))}
                                className="w-full h-64 text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="Enter system prompt..."
                                disabled={demoMode}
                            />
                            {trainingNotification && (
                                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    {trainingNotification}
                                </p>
                            )}
                            {trainingError && (
                                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    {trainingError}
                                </p>
                            )}
                        </div>

                        {/* Quick Tips */}
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                            <h3 className="text-sm font-medium text-slate-800 mb-2">Training Tips</h3>
                            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                                <li><strong>Speak naturally:</strong> Use the mic to test how the AI handles conversational speech.</li>
                                <li><strong>Rate responses:</strong> Use 👍/👎 to flag good or bad answers.</li>
                                <li><strong>Teach it:</strong> When you thumbs-down, tell it exactly what it <em>should</em> have said.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Tab Bar */}
            <div className="md:hidden bg-white border-t border-slate-200 flex items-center justify-around h-[60px] fixed bottom-0 left-0 right-0 z-30">
                <button
                    onClick={() => setMobileView('chat')}
                    className={`flex flex-col items-center justify-center w-full h-full ${mobileView === 'chat' ? 'text-primary-600' : 'text-slate-500'}`}
                >
                    <span className="material-symbols-outlined">chat</span>
                    <span className="text-[10px] font-medium mt-1">Chat</span>
                </button>
                <button
                    onClick={() => setMobileView('analytics')}
                    className={`flex flex-col items-center justify-center w-full h-full ${mobileView === 'analytics' ? 'text-primary-600' : 'text-slate-500'}`}
                >
                    <span className="material-symbols-outlined">analytics</span>
                    <span className="text-[10px] font-medium mt-1">Analytics</span>
                </button>
                <button
                    onClick={() => setMobileView('config')}
                    className={`flex flex-col items-center justify-center w-full h-full ${mobileView === 'config' ? 'text-primary-600' : 'text-slate-500'}`}
                >
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-[10px] font-medium mt-1">Config</span>
                </button>
            </div>
        </div>
    );
};

export default UnifiedTrainingStudio;
