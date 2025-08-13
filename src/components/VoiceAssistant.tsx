import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../types';
import { continueConversation } from '../services/geminiService';

interface VoiceAssistantProps {
    onClose: () => void;
}

type AssistantStatus = 'idle' | 'listening' | 'processing' | 'speaking';

const AIInteractionLoader = () => (
    <div className="flex items-center space-x-2">
        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
    </div>
);

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: 'ai', text: "Hi! I'm your AI assistant. How can I help you today? You can ask about our services, pricing, or even ask me to draft some marketing content for you." }
    ]);
    const [userInput, setUserInput] = useState('');
    const [status, setStatus] = useState<AssistantStatus>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isNoticeVisible, setIsNoticeVisible] = useState(true);
    
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef(status);

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || status === 'processing' || status === 'speaking') return;

        const newUserMessage: ChatMessage = { sender: 'user', text };
        const currentMessages: ChatMessage[] = [...messages, newUserMessage];
        setMessages(currentMessages);
        setUserInput('');
        setStatus('processing');

        const aiResponse = await continueConversation(currentMessages);
        
        const newAiMessage: ChatMessage = { sender: 'ai', text: aiResponse };
        setMessages(prev => [...prev, newAiMessage]);
        setStatus('speaking');
        
        // Simulate speaking time based on response length
        const speakingDuration = Math.max(1500, aiResponse.length * 50);
        setTimeout(() => {
            setStatus('idle');
        }, speakingDuration);

    }, [status, messages]);

    const handleMicClick = () => {
        if (status === 'idle') {
            setStatus('listening');
            // Mock listening: In a real app, you'd start SpeechRecognition here.
            // For this demo, we'll just toggle it off after a few seconds.
            setTimeout(() => {
                if (statusRef.current === 'listening') { // check if it wasn't cancelled
                   setStatus('idle');
                   // If speech was recognized, you'd call handleSendMessage here.
                }
            }, 4000); 
        } else if (status === 'listening') {
            setStatus('idle'); // Cancel listening
        }
    };
    
    const getMicRingClass = () => {
        switch (status) {
            case 'listening': return 'border-green-500 animate-pulse-green';
            case 'processing': return 'border-purple-500 animate-glow-purple';
            case 'speaking': return 'border-blue-500 animate-pulse-blue';
            default: return 'border-slate-200';
        }
    };
    
    const getMicIconColor = () => {
        switch(status) {
            case 'listening': return 'text-green-500';
            case 'processing': return 'text-purple-500';
            case 'speaking': return 'text-blue-500';
            default: return 'text-slate-500';
        }
    }

    return (
        <div className="fixed bottom-28 right-8 z-50 w-[360px] h-[540px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/50">
            {/* Header */}
            <header className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-primary-600 text-white flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined w-6 h-6">mic</span>
                    <h2 className="font-bold text-lg">Voice Assistant</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                        <span className="material-symbols-outlined w-5 h-5">{isMuted ? 'volume_off' : 'volume_up'}</span>
                    </button>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                        <span className="material-symbols-outlined w-5 h-5">close</span>
                    </button>
                </div>
            </header>

            {/* Body */}
            <div className="flex-grow flex flex-col overflow-y-hidden">
                {/* Central Mic Visualizer */}
                <div className="py-4 flex flex-col items-center justify-center text-center bg-slate-50 border-b border-slate-200">
                     <div className={`relative w-20 h-20 flex items-center justify-center rounded-full border-4 transition-colors ${getMicRingClass()}`}>
                        <div className="w-[68px] h-[68px] bg-white rounded-full shadow-md flex items-center justify-center">
                           <span className={`material-symbols-outlined transition-colors ${getMicIconColor()}`} style={{fontSize: '36px'}}>mic</span>
                        </div>
                    </div>
                     {isNoticeVisible && (
                        <div className="mt-3 mx-4 p-2 bg-amber-100/60 text-amber-900 border border-amber-200/80 rounded-lg text-xs">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5">info</span>
                                <p className="text-left">AI Notice: Information for assistance only. Verify with licensed professionals.</p>
                                <button onClick={() => setIsNoticeVisible(false)} className="flex-shrink-0 -mt-1 -mr-1 p-0.5 text-amber-600 hover:text-amber-800"><span className="material-symbols-outlined" style={{fontSize: '12px'}}>close</span></button>
                            </div>
                        </div>
                     )}
                     <p className="mt-2 text-sm font-semibold text-slate-600 h-5">
                        {status === 'listening' && 'Listening...'}
                        {status === 'processing' && 'Thinking...'}
                        {status === 'speaking' && 'Speaking...'}
                        {status === 'idle' && 'Ready to help!'}
                     </p>
                </div>

                {/* Chat History */}
                <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-primary-600 text-white rounded-br-lg' : 'bg-slate-100 text-slate-800 rounded-bl-lg'}`}>
                               {msg.text}
                           </div>
                        </div>
                    ))}
                    {status === 'processing' && (
                        <div className="flex justify-start">
                            <div className="px-4 py-2.5 bg-slate-100 rounded-2xl rounded-bl-lg shadow-sm">
                                <AIInteractionLoader />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Input */}
            <footer className="p-3 bg-slate-100 border-t border-slate-200 flex-shrink-0">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }}
                    className="flex items-center gap-2"
                >
                    <button
                        type="button"
                        onClick={handleMicClick}
                        className={`p-2.5 rounded-full transition-colors ${status === 'listening' ? 'bg-green-100 text-green-600' : 'bg-white hover:bg-slate-200 text-slate-500'}`}
                    >
                        <span className="material-symbols-outlined text-xl">mic</span>
                    </button>
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-grow bg-white border border-slate-300 rounded-full py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        disabled={status !== 'idle'}
                    />
                     <button 
                        type="submit" 
                        disabled={!userInput.trim() || status !== 'idle'} 
                        className="p-2.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default VoiceAssistant;
