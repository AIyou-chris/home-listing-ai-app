import React, { useState, useEffect } from 'react';
// import Head from 'react-helmet';
import { ChatBotContext, ChatBotMode, createHelpSalesChatBot } from '../services/helpSalesChatBot';
import { ChatMessage } from '../types';

interface AIContactOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    context?: ChatBotContext;
    onLeadGenerated?: (lead: unknown) => void;
}

export const AIContactOverlay: React.FC<AIContactOverlayProps> = ({
    isOpen,
    onClose,
    context = {
        userType: 'visitor',
        currentPage: 'landing',
        previousInteractions: 0
    },
    onLeadGenerated: _onLeadGenerated
}) => {
    const [chatBot] = useState(() => createHelpSalesChatBot(context));
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    // Initialize chat when opened
    useEffect(() => {
        if (isOpen && !hasStarted) {
            setHasStarted(true);
            // Brief delay for natural feel
            setTimeout(() => {
                handleAIResponse("Hi there! 👋 I'm the AI assistant for HomeListingAI. I can answer questions, schedule a 1-on-1 consultation, or get you set up with a free trial immediately. How can I help you today?", 'sales');
            }, 500);
        }
    }, [isOpen, hasStarted]);

    const handleAIResponse = async (text: string, _mode: ChatBotMode) => {
        setIsTyping(true);
        // Simulate typing delay based on length
        // const _delay = Math.min(1000 + text.length * 20, 3000);

        // In a real implementation, we'd add the message after delay
        // For now, we'll just add it immediately for responsiveness in this demo
        setMessages(prev => [...prev, {
            sender: 'assistant',
            text: text,
            timestamp: new Date()
        }]);
        setIsTyping(false);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        const userMsg = inputText;
        setInputText('');

        // ---------------------------------------------------------
        // AUTO-CAPTURE LEADS: Detect Email in chat
        // ---------------------------------------------------------
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const emailMatch = userMsg.match(emailRegex);
        if (emailMatch) {
            const capturedEmail = emailMatch[0];
            console.log('🎯 Chatbot detected email:', capturedEmail);

            // Fire-and-forget capture to backend
            const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
            fetch(`${apiBase}/api/leads/public`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: capturedEmail,
                    message: `Context: "${userMsg}"`,
                    source: 'Landing Page Chatbot',
                    notifyAdmin: true
                })
            }).catch(err => console.error('Background lead capture failed:', err));
        }
        // ---------------------------------------------------------

        // Add user message
        setMessages(prev => [...prev, {
            sender: 'user',
            text: userMsg,
            timestamp: new Date()
        }]);

        setIsTyping(true);

        try {
            // Process with chatbot service
            const response = await chatBot.processMessage(userMsg, 'sales');

            setMessages(prev => [...prev, {
                sender: 'assistant',
                text: response.message,
                timestamp: new Date()
            }]);

            // Check for lead capture or actions
            if (response.suggestedActions.includes('Schedule demo') || response.suggestedActions.includes('Contact sales')) {
                // In a full implementation, we might trigger a specific form or action here
                // For now, the chat handles the flow
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                sender: 'assistant',
                text: "I apologize, I'm having a moment of trouble connecting. Please try again in a few seconds.",
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop with Blue Blur Effect */}
            <div
                className="absolute inset-0 bg-slate-900/40"
                style={{
                    backdropFilter: 'blur(12px) brightness(0.6) sepia(0.2) hue-rotate(190deg)',
                    WebkitBackdropFilter: 'blur(12px) brightness(0.6) sepia(0.2) hue-rotate(190deg)'
                }}
                onClick={onClose}
            />

            {/* Glass Modal */}
            <div
                className="relative w-full max-w-2xl h-[600px] max-h-[90vh] mx-4 rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-white/20"
                style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white">smart_toy</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">HomeListingAI Assistant</h3>
                            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Premium Sales Concierge</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-4 rounded-2xl backdrop-blur-sm text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                    ? 'bg-blue-600/90 text-white rounded-br-none'
                                    : 'bg-white/10 text-white border border-white/10 rounded-bl-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white/10 text-white border border-white/10 p-4 rounded-2xl rounded-bl-none flex gap-1 items-center">
                                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-md">
                    <form
                        onSubmit={handleSendMessage}
                        className="relative flex items-center gap-3"
                    >
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type your message..."
                            className="w-full bg-black/20 border border-white/10 text-white placeholder-white/40 rounded-xl px-4 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="absolute right-2 p-2 bg-blue-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                    </form>
                    <div className="text-center mt-3">
                        <p className="text-white/30 text-[10px]">Powered by HomeListingAI • 24/7 Sales Support</p>
                    </div>
                </div>

            </div>
        </div>
    );
};
