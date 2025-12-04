
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listTranscripts, deleteTranscript } from '../services/aiTranscriptsService';
import { resolveUserId } from '../services/userId';
import { Property, ChatMessage, isAIDescription } from '../types';
import { generatePropertyDescription, answerPropertyQuestion } from '../services/geminiService';

interface PropertyPageProps {
  property: Property;
  setProperty: (updatedProperty: Property) => void;
  onBack: () => void;
  isDemoMode?: boolean;
}

const getMockAiResponse = (property: Property, question: string): string => {
  const q = question.toLowerCase();

  if (q.includes('kitchen') || q.includes('cooking')) {
    return "The kitchen is a chef's dream! It features custom walnut cabinetry, quartz countertops, and high-end stainless steel appliances. Perfect for culinary enthusiasts.";
  }
  if (q.includes('bedroom') || q.includes('sleep')) {
    return `This home has ${property.bedrooms} spacious bedrooms. The master suite is particularly impressive with its own en-suite bathroom and walk-in closet.`;
  }
  if (q.includes('bath') || q.includes('shower')) {
    return `There are ${property.bathrooms} bathrooms in total. They feature modern fixtures and spa-like finishes.`;
  }
  if (q.includes('pool') || q.includes('swim')) {
    return "Yes! The property features a sparkling private pool surrounded by mature landscaping - your own personal oasis.";
  }
  if (q.includes('school') || q.includes('education')) {
    return "The home is located in a top-rated school district, with excellent elementary, middle, and high schools nearby.";
  }
  if (q.includes('price') || q.includes('cost')) {
    return `The property is currently listed at $${property.price.toLocaleString()}. It's competitively priced for this desirable neighborhood.`;
  }
  if (q.includes('location') || q.includes('where')) {
    return `Located at ${property.address}, this home offers the perfect balance of privacy and convenience, just minutes from local amenities.`;
  }

  return "That's a great question! This home is truly unique with its blend of style and comfort. Would you like to schedule a viewing to see that specific feature in person?";
};

const QuickQRGenerator: React.FC<{ property: Property }> = ({ property }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);

  const generateQR = () => {
    const propertyUrl = `https://homelistingai.app/p/${property.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(propertyUrl)}`;
    setQrCodeUrl(qrUrl);
    setIsGenerated(true);
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-${property.address.split(',')[0].replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined">qr_code</span>
        Quick QR Code
      </h3>

      {!isGenerated ? (
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-4">
            Generate a QR code for this property listing
          </p>
          <button
            onClick={generateQR}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Generate QR Code
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <img src={qrCodeUrl} alt="Property QR Code" className="mx-auto border rounded-lg" />
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Links to: {property.address}
            </p>
            <button
              onClick={downloadQR}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
            >
              Download QR Code
            </button>
            <button
              onClick={() => setIsGenerated(false)}
              className="w-full px-4 py-2 text-primary-600 hover:text-primary-700 transition text-sm"
            >
              Generate New
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PropertyMapWidget: React.FC<{ property: Property }> = ({ property }) => {
  const openInGoogleMaps = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`;
    window.open(mapsUrl, '_blank');
  };

  const openInAppleMaps = () => {
    const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(property.address)}`;
    window.open(appleMapsUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined">map</span>
        Location & Maps
      </h3>

      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm font-medium text-slate-700 mb-1">Address</p>
          <p className="text-slate-600">{property.address}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={openInGoogleMaps}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <span className="material-symbols-outlined text-lg">map</span>
            <span>Google Maps</span>
          </button>
          <button
            onClick={openInAppleMaps}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition"
          >
            <span className="material-symbols-outlined text-lg">location_on</span>
            <span>Apple Maps</span>
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-slate-500">
            Click to view neighborhood, nearby amenities, and directions
          </p>
        </div>
      </div>
    </div>
  );
};

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

const PropertyStats: React.FC<{ bedrooms: number, bathrooms: number, squareFeet: number }> = ({ bedrooms, bathrooms, squareFeet }) => (
  <div className="flex items-center divide-x divide-slate-200 rounded-xl bg-slate-50 border border-slate-200/80 p-4 mt-6">
    <div className="flex-1 flex items-center justify-center space-x-2 text-slate-700"><span className="material-symbols-outlined w-6 h-6 text-primary-500">bed</span> <span className="font-semibold text-lg">{bedrooms}</span> <span className="text-sm">bedrooms</span></div>
    <div className="flex-1 flex items-center justify-center space-x-2 text-slate-700"><span className="material-symbols-outlined w-6 h-6 text-primary-500">bathtub</span> <span className="font-semibold text-lg">{bathrooms}</span> <span className="text-sm">bathrooms</span></div>
    <div className="flex-1 flex items-center justify-center space-x-2 text-slate-700"><span className="material-symbols-outlined w-6 h-6 text-primary-500">fullscreen</span> <span className="font-semibold text-lg">{squareFeet.toLocaleString()}</span> <span className="text-sm">squareFeet</span></div>
  </div>
);

const AIDescriptionSection: React.FC<{ description: Property['description'], onGenerate: () => void, isGenerating: boolean }> = ({ description, onGenerate, isGenerating }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 mt-8">
      <div className="flex justify-between items-center mb-5 gap-4">
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between text-left md:pointer-events-none min-w-0">
          <h3 className="text-2xl font-bold text-slate-900 mr-2">AI-Powered Description</h3>
          <span className="material-symbols-outlined w-6 h-6 text-slate-500 transition-transform duration-300 md:hidden flex-shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            expand_more
          </span>
        </button>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg shadow-md hover:shadow-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 z-10"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          <span className="whitespace-nowrap font-medium">{isGenerating ? 'Generating...' : 'Regenerate'}</span>
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


const AIAssistant: React.FC<{ property: Property; isDemoMode?: boolean }> = ({ property, isDemoMode = false }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerItems, setPickerItems] = useState<Array<{ id: string; title: string; content: string; sidekick: string; created_at: string }>>([]);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerSidekick, setPickerSidekick] = useState<'all' | 'main' | 'sales' | 'marketing' | 'listing' | 'agent' | 'helper' | 'support'>('all');

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

    // Demo mode mock response
    if (isDemoMode) {
      setTimeout(() => {
        const mockResponse = getMockAiResponse(property, text);
        const newAiMessage: ChatMessage = { sender: 'ai', text: mockResponse };
        setMessages(prev => [...prev, newAiMessage]);
        setIsAiReplying(false);
      }, 1000);
      return;
    }

    const aiResponse = await answerPropertyQuestion(property, text);
    const newAiMessage: ChatMessage = { sender: 'ai', text: aiResponse };
    setMessages(prev => [...prev, newAiMessage]);
    setIsAiReplying(false);
  }, [isAiReplying, property, isDemoMode]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(userInput);
  };

  // Insert transcript bridge if present on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem('hlai_transcript_draft');
      if (draft && draft.trim()) {
        setUserInput(draft);
        localStorage.removeItem('hlai_transcript_draft');
      }
    } catch (error) {
      console.warn('Failed to restore transcript draft from storage', error);
    }
  }, []);

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
          <button type="button" onClick={async () => {
            setIsPickerOpen(true);
            setPickerLoading(true);
            try {
              const uid = resolveUserId();
              const rows = await listTranscripts(uid, 50);
              setPickerItems(rows.map(r => ({ id: r.id, title: r.title || r.content.slice(0, 60), content: r.content, sidekick: r.sidekick, created_at: r.created_at })));
            } catch (error) {
              console.warn('Failed to load transcripts for picker', error);
            }
            setPickerLoading(false);
          }} className="p-2.5 rounded-full bg-white text-slate-600 hover:bg-slate-200 border border-slate-300" title="Browse transcripts">
            <span className="material-symbols-outlined w-5 h-5">description</span>
          </button>
          <button type="button" onClick={() => {
            try {
              const draft = localStorage.getItem('hlai_transcript_draft');
              if (draft && draft.trim()) setUserInput(draft);
            } catch (error) {
              console.warn('Failed to insert transcript draft', error);
            }
          }} className="p-2.5 rounded-full bg-white text-slate-600 hover:bg-slate-200 border border-slate-300" title="Insert from transcript">
            <span className="material-symbols-outlined w-5 h-5">content_paste</span>
          </button>
          <button type="submit" disabled={!userInput.trim() || isAiReplying} className="p-2.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
            <span className="material-symbols-outlined w-5 h-5">send</span>
          </button>
        </div>
      </form>
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsPickerOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Transcripts</h3>
              <button onClick={() => setIsPickerOpen(false)} className="p-1 rounded-md hover:bg-slate-100"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-2">
                <input value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} placeholder="Search…" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <select value={pickerSidekick} onChange={e => setPickerSidekick(e.target.value as typeof pickerSidekick)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  {['all', 'main', 'sales', 'marketing', 'listing', 'agent', 'helper', 'support'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {pickerLoading ? (
                <div className="text-sm text-slate-500">Loading…</div>
              ) : (
                <ul className="space-y-2">
                  {pickerItems
                    .filter(i => (pickerSidekick === 'all' || i.sidekick === pickerSidekick) && (pickerQuery.trim() === '' || (i.title + i.content).toLowerCase().includes(pickerQuery.toLowerCase())))
                    .map(i => (
                      <li key={i.id} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-900 truncate pr-2">{i.title}</div>
                          <div className="text-xs text-slate-500">{new Date(i.created_at).toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600 line-clamp-2">{i.content}</div>
                        <div className="mt-3 flex items-center gap-2">
                          <button onClick={() => { setUserInput(prev => prev ? (prev + '\n\n' + i.content) : i.content); setIsPickerOpen(false); }} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs">Insert (Append)</button>
                          <button onClick={() => { setUserInput(i.content); setIsPickerOpen(false); }} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs">Insert (Replace)</button>
                          <button onClick={() => navigator.clipboard.writeText(i.content)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs">Copy</button>
                          <button onClick={async () => { if (await deleteTranscript(i.id)) setPickerItems(prev => prev.filter(x => x.id !== i.id)) }} className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-600 text-xs">Delete</button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const PropertyPage: React.FC<PropertyPageProps> = ({ property, setProperty, onBack, isDemoMode = false }) => {
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
            <PropertyStats bedrooms={property.bedrooms} bathrooms={property.bathrooms} squareFeet={property.squareFeet} />
          </div>
          <AIDescriptionSection
            description={property.description}
            onGenerate={handleGenerateDescription}
            isGenerating={isGeneratingDesc}
          />
          <KeyFeaturesSection features={property.features} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <QuickQRGenerator property={property} />
          <PropertyMapWidget property={property} />
          <AIAssistant property={property} isDemoMode={isDemoMode} />
        </div>
      </div>
    </div>
  );
};

export default PropertyPage;
