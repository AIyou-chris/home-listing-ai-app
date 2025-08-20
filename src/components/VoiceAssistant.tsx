import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../types';
import { continueConversation, generateSpeech } from '../services/localAIService';

interface VoiceAssistantProps {
    onClose: () => void;
}

type AssistantStatus = 'idle' | 'listening' | 'processing' | 'speaking';
type VoiceOption = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

// Voice options with descriptions
const voiceOptions: { value: VoiceOption; label: string; description: string }[] = [
    { value: 'alloy', label: 'Alloy', description: 'Neutral, balanced voice' },
    { value: 'echo', label: 'Echo', description: 'Deep, warm voice' },
    { value: 'fable', label: 'Fable', description: 'Bright, energetic voice' },
    { value: 'onyx', label: 'Onyx', description: 'Rich, authoritative voice' },
    { value: 'nova', label: 'Nova', description: 'Clear, professional voice' },
    { value: 'shimmer', label: 'Shimmer', description: 'Soft, friendly voice' }
];

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
    const [selectedVoice, setSelectedVoice] = useState<VoiceOption>('nova');
    const [showVoiceSelector, setShowVoiceSelector] = useState(false);
    
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef(status);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

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

        // Create a properly formatted message
        const newUserMessage: ChatMessage = { sender: 'user', text: text.trim() };
        
        // Create a clean messages array for the API call - ensure simple objects
        const messagesForAPI: ChatMessage[] = [...messages, newUserMessage];
        
        console.log("Sending messages to AI:", messagesForAPI.length, "messages");
        console.log("Messages content:", messagesForAPI.map(m => ({ sender: m.sender, text: m.text.substring(0, 50) })));
        
        // Update UI state immediately
        setMessages(messagesForAPI);
        setUserInput('');
        setStatus('processing');

        try {
            // Validate messages before sending
            if (!messagesForAPI || messagesForAPI.length === 0) {
                throw new Error("No messages to send");
            }
            
            // Create simple objects for Firebase - avoid any potential serialization issues
            const simpleMessages = messagesForAPI.map(msg => ({
                sender: String(msg.sender),
                text: String(msg.text || '')
            })).filter(msg => msg.text.trim() !== '');
            
            if (simpleMessages.length === 0) {
                throw new Error("No valid messages to send");
            }
            
            console.log("Simple messages for Firebase:", simpleMessages);
            
            // Call the AI service with simple messages
            console.log("Calling continueConversation with simple messages:", 
                simpleMessages.map(m => `${m.sender}: ${m.text.substring(0, 20)}...`));
                
            const aiResponse = await continueConversation(simpleMessages);
            console.log("Received AI response:", aiResponse ? aiResponse.substring(0, 50) + "..." : "empty");
            
            // Create AI message and update state
            const newAiMessage: ChatMessage = { sender: 'ai', text: aiResponse };
            setMessages(prev => [...prev, newAiMessage]);
            setStatus('speaking');
            
            // Use OpenAI text-to-speech if not muted
            if (!isMuted) {
                try {
                    // Use our new OpenAI speech service
                    const speechResult = await generateSpeech(aiResponse, selectedVoice);
                    const audioUrl = speechResult.audioUrl;
                    
                    if (audioUrl) {
                        const audio = new Audio(audioUrl);
                        audio.onended = () => setStatus('idle');
                        audio.onerror = (e) => {
                            console.error('Audio playback error:', e);
                            setStatus('idle');
                        };
                        
                        try {
                            await audio.play();
                        } catch (playError) {
                            console.error('Audio play error:', playError);
                            fallbackToSpeechSynthesis(aiResponse);
                        }
                    } else {
                        // Fallback to browser TTS
                        fallbackToSpeechSynthesis(aiResponse);
                    }
                } catch (error) {
                    console.error('OpenAI speech generation error:', error);
                    fallbackToSpeechSynthesis(aiResponse);
                }
            } else {
                setStatus('idle');
            }
        } catch (error) {
            console.error('AI response error:', error);
            let errorMessage = "I'm having trouble connecting right now. Please try again in a moment.";
            
            // Check if it's a Firebase error with a message
            if (error && typeof error === 'object' && 'message' in error) {
                const errorMsg = (error as Error).message;
                if (errorMsg.includes('not properly configured')) {
                    errorMessage = "The AI service is currently unavailable. Please try again later or contact support.";
                } else if (errorMsg.includes('Failed to continue conversation')) {
                    errorMessage = "I couldn't process your request. The AI service might be experiencing issues.";
                } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
                    errorMessage = "The request took too long to process. Please try again with a shorter message.";
                } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
                    errorMessage = "There seems to be a network issue. Please check your internet connection.";
                } else if (errorMsg.includes('Messages must be a non-empty array')) {
                    errorMessage = "There was an issue with the message format. Please try again.";
                }
            }
            
            setMessages(prev => [...prev, { sender: 'ai', text: errorMessage }]);
            setStatus('idle');
        }
    }, [status, messages, isMuted, selectedVoice]);
    
    // Helper function for speech synthesis fallback
    const fallbackToSpeechSynthesis = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            utterance.onend = () => setStatus('idle');
            utterance.onerror = () => setStatus('idle');
            
            speechSynthesis.speak(utterance);
        } else {
            setStatus('idle');
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await processAudioRecording(audioBlob);
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setStatus('listening');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Please allow microphone access to use voice features.');
            setStatus('idle');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const processAudioRecording = async (audioBlob: Blob) => {
        setStatus('processing');
        console.log("Processing audio recording, blob size:", audioBlob.size);
        
        try {
            // Validate audio blob
            if (!audioBlob || audioBlob.size === 0) {
                console.error("Empty audio blob received");
                setStatus('idle');
                return;
            }
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    if (!reader.result) {
                        throw new Error("Failed to read audio data");
                    }
                    
                    const base64Audio = reader.result as string;
                    console.log("Audio converted to base64, length:", base64Audio.length);
                    
                    try {
                        console.log("Using browser speech recognition...");
                        // Use browser speech recognition directly
                        fallbackToBrowserSpeechRecognition();
                    } catch (error) {
                        console.error('Speech recognition error:', error);
                        setStatus('idle');
                    }
                } catch (readError) {
                    console.error("Error processing audio data:", readError);
                    setStatus('idle');
                }
            };
            
            reader.onerror = (error) => {
                console.error("FileReader error:", error);
                setStatus('idle');
            };
            
            reader.readAsDataURL(audioBlob);
        } catch (error) {
            console.error('Audio processing error:', error);
            setStatus('idle');
        }
    };

    const fallbackToBrowserSpeechRecognition = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            setStatus('idle');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        // Add timeout to prevent hanging
        let timeoutId: NodeJS.Timeout;
        
        recognition.onstart = () => {
            setStatus('listening');
            console.log('Speech recognition started - please speak now');
            
            // Set a 10-second timeout
            timeoutId = setTimeout(() => {
                if (recognition.state === 'recording') {
                    recognition.stop();
                    setMessages(prev => [...prev, { 
                        sender: 'ai', 
                        text: '⚠️ No speech detected within 10 seconds. Please try speaking louder or check your microphone.' 
                    }]);
                    setStatus('idle');
                }
            }, 10000);
        };
        
        recognition.onresult = (event) => {
            clearTimeout(timeoutId);
            const transcript = event.results[0][0].transcript;
            console.log('Speech recognized:', transcript);
            setStatus('processing');
            handleSendMessage(transcript);
        };
        
        recognition.onerror = (event) => {
            clearTimeout(timeoutId);
            console.error('Speech recognition error:', event.error);
            
            // Handle specific error types with user-friendly messages
            let errorMessage = '';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try speaking louder or check your microphone.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access blocked. Please allow microphone access in your browser settings.';
                    break;
                case 'network':
                    errorMessage = 'Network error. Please check your internet connection.';
                    break;
                case 'service-not-allowed':
                    errorMessage = 'Speech recognition service not available. Please try again.';
                    break;
                default:
                    errorMessage = 'Speech recognition failed. Please try again.';
            }
            
            // Show error message to user
            setMessages(prev => [...prev, { 
                sender: 'ai', 
                text: `⚠️ ${errorMessage} You can also type your message below.` 
            }]);
            setStatus('idle');
        };
        
        recognition.onend = () => {
            clearTimeout(timeoutId);
            console.log('Speech recognition ended');
            if (status === 'listening') {
                setStatus('idle');
            }
        };
        
        try {
            recognition.start();
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Failed to start speech recognition:', error);
            setMessages(prev => [...prev, { 
                sender: 'ai', 
                text: '⚠️ Failed to start speech recognition. Please try again or type your message.' 
            }]);
            setStatus('idle');
        }
    };

    const handleMicClick = () => {
        if (status === 'idle') {
            startRecording();
        } else if (status === 'listening') {
            stopRecording();
        }
    };

    // Close voice selector when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showVoiceSelector) {
                setShowVoiceSelector(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showVoiceSelector]);

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
                                {status === 'listening' && 'Listening... Speak now!'}
                                {status === 'processing' && 'Processing your request...'}
                                {status === 'speaking' && 'Speaking response...'}
                                {status === 'idle' && 'Ready to Help'}
                            </h3>
                            
                            {/* Visual Indicators */}
                            <div className="h-8 flex items-center justify-center">
                                {status === 'listening' && <ListeningIndicator />}
                                {status === 'processing' && <ProcessingIndicator />}
                                {status === 'speaking' && <SpeakingIndicator />}
                                {status === 'idle' && (
                                    <div className="text-sm text-slate-500">
                                        <p>Click microphone to speak</p>
                                        <p className="text-xs mt-1">or type below</p>
                                    </div>
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
                                <span className="text-slate-600">Voice</span>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                                        className="px-2 py-1 border border-slate-300 rounded text-xs bg-white hover:bg-slate-50 flex items-center gap-1"
                                    >
                                        <span>{voiceOptions.find(v => v.value === selectedVoice)?.label}</span>
                                        <span className="material-symbols-outlined text-xs">expand_more</span>
                                    </button>
                                    
                                    {showVoiceSelector && (
                                        <div className="absolute bottom-full right-0 mb-1 bg-white border border-slate-300 rounded-lg shadow-lg z-10 min-w-[200px]">
                                            {voiceOptions.map((voice) => (
                                                <button
                                                    key={voice.value}
                                                    onClick={() => {
                                                        setSelectedVoice(voice.value);
                                                        setShowVoiceSelector(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                                                        selectedVoice === voice.value ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
                                                    }`}
                                                >
                                                    <div className="font-medium">{voice.label}</div>
                                                    <div className="text-slate-500">{voice.description}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Mute</span>
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`px-2 py-1 rounded text-xs transition-colors ${
                                        isMuted 
                                            ? 'bg-red-100 text-red-700' 
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {isMuted ? 'Unmute' : 'Mute'}
                                </button>
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
