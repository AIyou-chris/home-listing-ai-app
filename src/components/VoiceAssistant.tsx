import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../types';
import { continueConversation } from '../services/geminiService';

interface VoiceAssistantProps {
    onClose: () => void;
}

type AssistantStatus = 'idle' | 'listening' | 'processing' | 'speaking';

const AIInteractionLoader = () => (
    <div className="flex items-center space-x-2">
        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse"></div>
    </div>
);

// Enhanced Visual Indicators
const ListeningIndicator = () => (
    <div className="flex items-center justify-center space-x-1">
        <div className="w-2 h-8 bg-red-500 rounded-full animate-pulse [animation-delay:-0.4s] transform scale-y-75"></div>
        <div className="w-2 h-12 bg-red-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-6 bg-red-500 rounded-full animate-pulse [animation-delay:-0.2s] transform scale-y-50"></div>
        <div className="w-2 h-10 bg-red-500 rounded-full animate-pulse [animation-delay:-0.1s]"></div>
        <div className="w-2 h-4 bg-red-500 rounded-full animate-pulse transform scale-y-25"></div>
    </div>
);

const SpeakingIndicator = () => (
    <div className="flex items-center justify-center space-x-1">
        <div className="w-2 h-6 bg-green-500 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        <div className="w-2 h-8 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-4 bg-green-500 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
        <div className="w-2 h-10 bg-green-500 rounded-full animate-bounce [animation-delay:-0.1s]"></div>
        <div className="w-2 h-6 bg-green-500 rounded-full animate-bounce"></div>
    </div>
);

const ProcessingIndicator = () => (
    <div className="flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
);

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<(ChatMessage & { feedback?: 'helpful' | 'not-helpful' | null })[]>([
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
        
        // Use text-to-speech if not muted
        if (!isMuted && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(aiResponse);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            utterance.onend = () => {
                setStatus('idle');
            };
            
            utterance.onerror = () => {
                setStatus('idle');
            };
            
            speechSynthesis.speak(utterance);
        } else {
            // Fallback to simulated speaking time
            const speakingDuration = Math.max(1500, aiResponse.length * 50);
            setTimeout(() => {
                setStatus('idle');
            }, speakingDuration);
        }

    }, [status, messages]);

    const handleMicClick = () => {
        if (status === 'idle') {
            startSpeechRecognition();
        } else if (status === 'listening') {
            stopSpeechRecognition();
        }
    };

    const startSpeechRecognition = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            setStatus('listening');
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setStatus('processing');
            handleSendMessage(transcript);
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setStatus('idle');
        };
        
        recognition.onend = () => {
            if (status === 'listening') {
                setStatus('idle');
            }
        };
        
        recognition.start();
        
        // Store recognition instance to stop it later
        (window as any).currentRecognition = recognition;
    };

    const stopSpeechRecognition = () => {
        if ((window as any).currentRecognition) {
            (window as any).currentRecognition.stop();
            setStatus('idle');
        }
    };

    const handleFeedback = (messageIndex: number, feedback: 'helpful' | 'not-helpful') => {
        setMessages(prev => prev.map((msg, index) => 
            index === messageIndex ? { ...msg, feedback } : msg
        ));
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
        <div className="fixed inset-4 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/50 max-w-4xl max-h-[90vh] mx-auto">
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
            <div className="flex-grow flex overflow-hidden">
                {/* Left Panel - Controls */}
                <div className="w-80 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 p-6 flex flex-col">
                    {/* Voice Visualizer */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        {/* Large Voice Orb */}
                        <div className={`relative w-32 h-32 flex items-center justify-center rounded-full transition-all duration-500 ${getMicRingClass()}`}>
                            <div className="w-[120px] h-[120px] bg-white rounded-full shadow-xl flex items-center justify-center">
                                <div className={`text-5xl transition-all duration-300 ${getMicIconColor()}`}>
                                    {status === 'listening' && '🎤'}
                                    {status === 'processing' && '🧠'}
                                    {status === 'speaking' && '🗣️'}
                                    {status === 'idle' && '💬'}
                                </div>
                            </div>
                            
                            {/* Animated rings */}
                            {(status === 'listening' || status === 'speaking') && (
                                <>
                                    <div className="absolute inset-0 rounded-full border-2 border-current opacity-20 animate-ping"></div>
                                    <div className="absolute inset-[-12px] rounded-full border-2 border-current opacity-15 animate-ping [animation-delay:0.5s]"></div>
                                    <div className="absolute inset-[-24px] rounded-full border-2 border-current opacity-10 animate-ping [animation-delay:1s]"></div>
                                </>
                            )}
                        </div>
                        
                        {/* Status Text */}
                        <div className="mt-6 text-center">
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                {status === 'listening' && 'Listening...'}
                                {status === 'processing' && 'Processing...'}
                                {status === 'speaking' && 'Speaking...'}
                                {status === 'idle' && 'Ready to Help'}
                            </h3>
                            
                            {/* Visual Indicators */}
                            <div className="h-8 flex items-center justify-center">
                                {status === 'listening' && <ListeningIndicator />}
                                {status === 'processing' && <ProcessingIndicator />}
                                {status === 'speaking' && <SpeakingIndicator />}
                                {status === 'idle' && (
                                    <p className="text-sm text-slate-500">Click the button below to start</p>
                                )}
                            </div>
                        </div>
                        
                        {/* Voice Control Button */}
                        <div className="mt-8">
                            <button
                                onClick={handleMicClick}
                                className={`w-16 h-16 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg ${
                                    status === 'listening' 
                                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                                }`}
                            >
                                <span className="material-symbols-outlined text-2xl">
                                    {status === 'listening' ? 'stop' : 'mic'}
                                </span>
                            </button>
                        </div>
                        
                        {/* Settings */}
                        <div className="mt-6 space-y-3 w-full">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Voice Style</span>
                                <select className="px-2 py-1 border border-slate-300 rounded text-xs">
                                    <option>Professional</option>
                                    <option>Friendly</option>
                                    <option>Casual</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Response Speed</span>
                                <select className="px-2 py-1 border border-slate-300 rounded text-xs">
                                    <option>Normal</option>
                                    <option>Fast</option>
                                    <option>Slow</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Chat */}
                <div className="flex-1 flex flex-col">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Conversation</h3>
                        <p className="text-sm text-slate-500">Ask questions or give commands using voice or text</p>
                    </div>

                    {/* Chat History */}
                    <div ref={chatContainerRef} className="flex-grow p-6 space-y-4 overflow-y-auto bg-white">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[80%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                               <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-primary-600 text-white rounded-br-lg' : 'bg-slate-100 text-slate-800 rounded-bl-lg'}`}>
                                   {msg.text}
                               </div>
                               
                               {/* Feedback buttons for AI responses */}
                               {msg.sender === 'ai' && (
                                   <div className="flex items-center gap-2 mt-2 justify-start">
                                       <button
                                           onClick={() => handleFeedback(index, 'helpful')}
                                           className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                               msg.feedback === 'helpful' 
                                                   ? 'bg-green-100 text-green-700' 
                                                   : 'hover:bg-green-50 text-slate-500'
                                           }`}
                                       >
                                           <span className="material-symbols-outlined text-sm">thumb_up</span>
                                           <span>Helpful</span>
                                       </button>
                                       <button
                                           onClick={() => handleFeedback(index, 'not-helpful')}
                                           className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                               msg.feedback === 'not-helpful' 
                                                   ? 'bg-red-100 text-red-700' 
                                                   : 'hover:bg-red-50 text-slate-500'
                                           }`}
                                       >
                                           <span className="material-symbols-outlined text-sm">thumb_down</span>
                                           <span>Not helpful</span>
                                       </button>
                                   </div>
                               )}
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

                    {/* Text Input Area */}
                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }}
                            className="flex items-center gap-3"
                        >
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Type your message here..."
                                className="flex-grow bg-white border border-slate-300 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                                disabled={status === 'processing' || status === 'speaking'}
                            />
                            <button
                                type="submit"
                                disabled={!userInput.trim() || status === 'processing' || status === 'speaking'}
                                className="p-3 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceAssistant;
