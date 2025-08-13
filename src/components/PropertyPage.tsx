
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Property, ChatMessage, AIDescription, isAIDescription } from '../types';
import { generatePropertyDescription, answerPropertyQuestion } from '../services/geminiService';

interface PropertyPageProps {
  property: Property;
  setProperty: (updatedProperty: Property) => void;
  onBack: () => void;
}

const AIInteractionLoader = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
    </div>
);

const PropertyImage: React.FC<{ imageUrl: string, address: string }> = ({ imageUrl, address }) => (
    <div className="rounded-2xl shadow-2xl shadow-slate-400/30 overflow-hidden">
        <img src={imageUrl} alt={`View of ${address}`} className="w-full h-auto object-cover" />
    </div>
);

const PropertyHeaderDetails: React.FC<{ address: string, price: number }> = ({ address, price }) => (
    <div>
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{address}</h2>
        <p className="text-primary-600 font-bold text-3xl mt-2">${price.toLocaleString()}</p>
    </div>
);

const PropertyStats: React.FC<{ beds: number, baths: number, sqft: number }> = ({ beds, baths, sqft }) => (
    <div className="flex items-center divide-x divide-slate-200 rounded-xl bg-slate-50 border border-slate-200/80 p-4 mt-6">
        <div className="flex-1 flex items-center justify-center space-x-2 text-slate-700"><span className="material-symbols-outlined w-6 h-6 text-primary-500">bed</span> <span className="font-semibold text-lg">{beds}</span> <span className="text-sm">beds</span></div>
        <div className="flex-1 flex items-center justify-center space-x-2 text-slate-700"><span className="material-symbols-outlined w-6 h-6 text-primary-500">bathtub</span> <span className="font-semibold text-lg">{baths}</span> <span className="text-sm">baths</span></div>
        <div className="flex-1 flex items-center justify-center space-x-2 text-slate-700"><span className="material-symbols-outlined w-6 h-6 text-primary-500">fullscreen</span> <span className="font-semibold text-lg">{sqft.toLocaleString()}</span> <span className="text-sm">sqft</span></div>
    </div>
);

const AIDescriptionSection: React.FC<{ description: Property['description'], onGenerate: () => void, isGenerating: boolean }> = ({ description, onGenerate, isGenerating }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 mt-8">
            <div className="flex justify-between items-center mb-5">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex-grow flex items-center justify-between text-left md:pointer-events-none pr-4">
                    <h3 className="text-2xl font-bold text-slate-900">AI-Powered Description</h3>
                     <span className="material-symbols-outlined w-6 h-6 text-slate-500 transition-transform duration-300 md:hidden" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                    </span>
                </button>
                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="flex-shrink-0 flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg shadow-md hover:shadow-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    <span className="material-symbols-outlined w-5 h-5">sparkles</span>
                    <span>{isGenerating ? 'Generating...' : 'Regenerate'}</span>
                </button>
            </div>
            <div className={`${isOpen ? 'block' : 'hidden'} md:block`}>
                {isGenerating && !isAIDescription(description) ? (
                    <div className="space-y-3 animate-pulse"><div className="h-6 bg-slate-200 rounded w-3/4"></div><div className="h-4 bg-slate-200 rounded w-full"></div><div className="h-4 bg-slate-200 rounded w-5/6"></div></div>
                ) : isAIDescription(description) ? (
                    <div className="prose prose-slate max-w-none">
                        <h4 className="text-2xl font-bold !mb-3">{description.title}</h4>
                        {description.paragraphs.map((p, i) =>
                            // Defensively check if 'p' is a string to prevent rendering errors from malformed API responses.
                            (typeof p === 'string') && <p key={i} className="text-slate-600 leading-relaxed">{p}</p>
                        )}
                    </div>
                ) : (
                    <p className="text-slate-500 leading-relaxed">
                        {typeof description === 'string'
                            ? (description || 'Click "Generate" to create a stunning property description with AI.')
                            : 'An unexpected description format was received. Please regenerate.'
                        }
                    </p>
                )}
            </div>
        </div>
    );
};


const KeyFeaturesSection: React.FC<{ features: string[] }> = ({ features }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 mt-8">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-left mb-5 md:pointer-events-none"
            >
                <h3 className="text-2xl font-bold text-slate-900">Key Features</h3>
                 <span className="material-symbols-outlined w-6 h-6 text-slate-500 transition-transform duration-300 md:hidden" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    expand_more
                </span>
            </button>
            <div className={`${isOpen ? 'block' : 'hidden'} md:block`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    {features.map(feature => (
                        <div key={feature} className="flex items-center space-x-3">
                            <span className="material-symbols-outlined w-6 h-6 text-green-500 flex-shrink-0">check_circle</span>
                            <span className="text-slate-700">{feature}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const AIAssistant: React.FC<{ property: Property }> = ({ property }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isAiReplying, setIsAiReplying] = useState(false);
    
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const starterPrompts = ["What's the kitchen like?", "Tell me about the outdoor space.", "Are pets allowed?"];

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);
    
    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isAiReplying) return;
        const newUserMessage: ChatMessage = { sender: 'user', text };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsAiReplying(true);

        const aiResponse = await answerPropertyQuestion(property, text);
        const newAiMessage: ChatMessage = { sender: 'ai', text: aiResponse };
        setMessages(prev => [...prev, newAiMessage]);
        setIsAiReplying(false);
    }, [isAiReplying, property]);
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(userInput);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 h-full flex flex-col lg:sticky lg:top-24">
            <div className="p-6 border-b border-slate-200">
                <h3 className="text-2xl font-bold text-slate-900">AI Property Assistant</h3>
                <p className="text-sm text-slate-500 mt-1">Ask me anything about this home!</p>
            </div>
            <div ref={chatContainerRef} className="flex-grow p-4 sm:p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)', minHeight: '300px' }}>
                {messages.length === 0 && (
                    <div className="text-center text-slate-400 p-4">
                        <p className="text-sm">Try asking a question, or use a suggestion:</p>
                        <div className="mt-3 flex flex-col sm:flex-row sm:justify-center gap-2">
                          {starterPrompts.map(prompt => (
                            <button key={prompt} onClick={() => handleSendMessage(prompt)} className="text-sm border border-slate-300 rounded-full px-3 py-1 hover:bg-slate-100 hover:border-slate-400 transition-colors">
                                "{prompt}"
                            </button>
                          ))}
                        </div>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow">AI</div>}
                       <div className={`max-w-xs md:max-w-sm px-4 py-3 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-primary-600 text-white rounded-br-lg' : 'bg-slate-100 text-slate-800 rounded-bl-lg'}`}>
                           <p className="text-sm leading-relaxed">{msg.text}</p>
                       </div>
                    </div>
                ))}
                {isAiReplying && <div className="flex justify-start gap-2"><div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow">AI</div><div className="px-4 py-3 bg-slate-100 rounded-2xl rounded-bl-lg shadow-sm"><AIInteractionLoader /></div></div>}
            </div>
            <form onSubmit={handleFormSubmit} className="p-4 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center space-x-2">
                    <input
                        type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-grow bg-white border border-slate-300 rounded-full py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        disabled={isAiReplying}
                    />
                     <button type="submit" disabled={!userInput.trim() || isAiReplying} className="p-2.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
                        <span className="material-symbols-outlined w-5 h-5">send</span>
                    </button>
                </div>
            </form>
        </div>
    );
};


const PropertyPage: React.FC<PropertyPageProps> = ({ property, setProperty, onBack }) => {
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  const handleGenerateDescription = useCallback(async () => {
    setIsGeneratingDesc(true);
    const generatedDesc = await generatePropertyDescription(property);
    setProperty({ ...property, description: generatedDesc });
    setIsGeneratingDesc(false);
  }, [property, setProperty]);
  
  // Auto-generate description on first load if it's empty
  useEffect(() => {
    if (!property.description || (typeof property.description === 'string' && property.description.trim() === '')) {
        handleGenerateDescription();
    }
  }, [property.id, property.description, handleGenerateDescription]); // Add property.id to re-trigger on new property

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button onClick={onBack} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
          <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
          <span>Back to Listings</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        <div className="lg:col-span-3">
            <PropertyImage imageUrl={property.imageUrl} address={property.address} />
            <div className="mt-8">
                <PropertyHeaderDetails address={property.address} price={property.price} />
                <PropertyStats beds={property.beds} baths={property.baths} sqft={property.sqft} />
            </div>
            <AIDescriptionSection 
                description={property.description}
                onGenerate={handleGenerateDescription}
                isGenerating={isGeneratingDesc}
            />
            <KeyFeaturesSection features={property.features} />
        </div>

        <div className="lg:col-span-2">
            <AIAssistant property={property} />
        </div>
      </div>
    </div>
  );
};

export default PropertyPage;
