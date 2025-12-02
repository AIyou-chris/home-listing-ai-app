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
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

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

    // Voice Input State
    const [isListening, setIsListening] = useState(false);
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
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sidekickId: selectedSidekick,
                        sidekickType: selectedSidekick,
                        message: userMessage.content,
                        history: [
                            { sender: 'assistant', text: TRAINING_ARCHITECT_PROMPT },
                            { sender: 'assistant', text: systemPrompts[selectedSidekick] || currentSidekick.systemPrompt },
                            ...conversationHistory
                        ]
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

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden">
            {/* Left Sidebar: Sidekick List */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-800">Sidekicks</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sidekicks.map(sidekick => (
                        <button
                            key={sidekick.id}
                            onClick={() => setSelectedSidekick(sidekick.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${selectedSidekick === sidekick.id
                                ? 'bg-primary-50 text-primary-900 ring-1 ring-primary-200'
                                : 'hover:bg-slate-50 text-slate-700'
                                }`}
                        >
                            <span className="material-symbols-outlined text-xl text-slate-500">{sidekick.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{sidekick.name}</div>
                                <div className="text-xs text-slate-500 truncate">{sidekick.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Center: Chat Interface */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-primary-600 text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                                }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {/* Feedback Buttons for Assistant Messages */}
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-2 mt-1 ml-1">
                                    <button
                                        onClick={() => handleFeedback(msg.id, 'thumbs_up')}
                                        className={`p-1 rounded hover:bg-slate-100 transition-colors ${msg.feedback === 'thumbs_up' ? 'text-green-600' : 'text-slate-400'}`}
                                        title="Good response"
                                    >
                                        <span className="material-symbols-outlined text-lg">thumb_up</span>
                                    </button>
                                    <button
                                        onClick={() => handleFeedback(msg.id, 'thumbs_down')}
                                        className={`p-1 rounded hover:bg-slate-100 transition-colors ${msg.feedback === 'thumbs_down' ? 'text-red-600' : 'text-slate-400'}`}
                                        title="Needs improvement"
                                    >
                                        <span className="material-symbols-outlined text-lg">thumb_down</span>
                                    </button>
                                </div>
                            )}

                            {/* Improvement Input */}
                            {showImprovementInput === msg.id && (
                                <div className="mt-2 w-full max-w-[80%] bg-white border border-orange-200 rounded-lg p-3 shadow-sm animate-in fade-in slide-in-from-top-2">
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

                <div className="p-4 bg-white border-t border-slate-200">
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

            {/* Right Sidebar: Configuration */}
            <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-800">Configuration</h2>
                </div>

                <div className="p-4 space-y-6">
                    {/* System Prompt */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-700">System Prompt</label>
                            <button
                                onClick={handleSavePrompt}
                                disabled={savingPrompt}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                            >
                                {savingPrompt ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                        <textarea
                            value={systemPrompts[selectedSidekick] || currentSidekick.systemPrompt}
                            onChange={e => setSystemPrompts(prev => ({ ...prev, [selectedSidekick]: e.target.value }))}
                            className="w-full h-64 text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                            placeholder="Enter system prompt..."
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
    );
};

export default UnifiedTrainingStudio;
