import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Property, ChatMessage } from '../types';
import { SAMPLE_SCHOOLS } from '../constants';
import { answerPropertyQuestion } from '../services/geminiService';
import ShareModal from './ShareModal';
import ShareService from '../services/shareService';

// --- Reusable Modal Component ---
const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode; }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-slate-200">
                <div className="flex-1">{typeof title === 'string' ? <h3 className="text-xl font-bold text-slate-800">{title}</h3> : title}</div>
                <button onClick={onClose} className="p-1 -mt-1 -mr-1 rounded-full text-slate-400 hover:bg-slate-200"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div>{children}</div>
        </div>
    </div>
);

// --- Individual Modal Implementations ---

export const SchoolsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const schools = SAMPLE_SCHOOLS;
    return (
        <Modal title="Nearby Schools" onClose={onClose}>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
                <ul className="space-y-4">
                    {schools.map(school => (
                        <li key={school.name} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-800">{school.name}</h4>
                                    <p className="text-sm text-slate-500">{school.type} • Grades {school.grades}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <p className="font-bold text-primary-600">{school.rating}/5.0</p>
                                    <p className="text-xs text-slate-500">{school.distance} mi away</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </Modal>
    );
};

export const FinancingModal: React.FC<{ propertyPrice: number; onClose: () => void }> = ({ propertyPrice, onClose }) => {
    const [price, setPrice] = useState(propertyPrice);
    const [downPayment, setDownPayment] = useState(propertyPrice * 0.2);
    const [interestRate, setInterestRate] = useState(6.5);
    const [loanTerm, setLoanTerm] = useState(30);
    const [monthlyPayment, setMonthlyPayment] = useState(0);

    useEffect(() => {
        const principal = price - downPayment;
        const monthlyRate = interestRate / 100 / 12;
        const numberOfPayments = loanTerm * 12;

        if (principal > 0 && monthlyRate > 0) {
            const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
            setMonthlyPayment(payment);
        } else {
            setMonthlyPayment(0);
        }
    }, [price, downPayment, interestRate, loanTerm]);

    return (
        <Modal title="Mortgage Calculator" onClose={onClose}>
            <div className="p-6">
                <div className="text-center mb-6 p-4 bg-primary-50 rounded-lg">
                    <p className="text-sm text-primary-800">Estimated Monthly Payment</p>
                    <p className="text-4xl font-extrabold text-primary-700">${monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-slate-500 mt-1">Excludes taxes, insurance, and HOA fees.</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold">Home Price</label>
                        <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold">Down Payment</label>
                        <input type="number" value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold">Interest Rate (%)</label>
                        <input type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold">Loan Term (Years)</label>
                        <select value={loanTerm} onChange={e => setLoanTerm(Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md bg-white">
                            <option value={30}>30 Years</option>
                            <option value={20}>20 Years</option>
                            <option value={15}>15 Years</option>
                        </select>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export const ScheduleModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal title="Schedule a Showing" onClose={onClose}>
        <div className="p-6">
            <p className="text-center text-slate-600">This feature would connect to the agent's calendar. For now, please use the "Contact Agent" buttons.</p>
            <div className="mt-4 flex justify-center">
                <button onClick={onClose} className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg">Got it</button>
            </div>
        </div>
    </Modal>
);

export const SaveModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal title="Save to Home Screen" onClose={onClose}>
        <div className="p-6 text-center">
            <h3 className="font-bold text-lg">How to Add to Home Screen</h3>
            <p className="text-slate-600 mt-2">For quick access, you can add this listing app to your phone's home screen.</p>
            <div className="mt-4 text-left p-4 bg-slate-50 rounded-lg">
                <p><strong>On iOS (Safari):</strong> Tap the "Share" button, then scroll down and tap "Add to Home Screen".</p>
                <p className="mt-2"><strong>On Android (Chrome):</strong> Tap the three-dot menu, then tap "Add to Home screen".</p>
            </div>
        </div>
    </Modal>
);

export const VoiceAssistantModal: React.FC<{ property: Property, onClose: () => void }> = ({ property, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: 'ai', text: `Hi! I'm the AI assistant for ${property.address}. How can I help you today?` }
    ]);
    const [userInput, setUserInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing'>('idle');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || status === 'processing') return;
        const newUserMessage: ChatMessage = { sender: 'user', text };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setStatus('processing');
        const aiResponseText = await answerPropertyQuestion(property, text);
        const newAiMessage: ChatMessage = { sender: 'ai', text: aiResponseText };
        setMessages(prev => [...prev, newAiMessage]);
        setStatus('idle');
    }, [status, property]);
    
    const handleMicClick = () => {
        if (status === 'idle') {
            setStatus('listening');
            // Mock listening for 3 seconds, then send a sample message
            setTimeout(() => {
                setStatus('idle');
                handleSendMessage("Tell me more about the kitchen.");
            }, 3000);
        } else if (status === 'listening') {
            setStatus('idle');
        }
    };

    return (
        <Modal title="AI Voice Assistant" onClose={onClose}>
            <div className="flex flex-col h-[70vh] max-h-[500px]">
                <main ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto bg-slate-50">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${msg.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                               {msg.text}
                           </div>
                        </div>
                    ))}
                    {status === 'processing' && <div className="px-4 py-2.5 bg-slate-200 rounded-2xl w-fit"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div></div>}
                </main>
                 <footer className="p-3 bg-slate-100 border-t">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleMicClick}
                            className={`p-2.5 rounded-full transition-colors ${status === 'listening' ? 'bg-green-100 text-green-600' : 'bg-white hover:bg-slate-200 text-slate-500'}`}
                            disabled={status === 'processing'}
                            aria-label="Use voice input"
                        >
                            <span className="material-symbols-outlined text-xl">mic</span>
                        </button>
                        <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type or tap mic..." className="w-full bg-white border rounded-full py-2 px-4" disabled={status !== 'idle'}/>
                        <button type="submit" className="p-2.5 rounded-full bg-primary-600 text-white disabled:bg-slate-300" disabled={!userInput.trim() || status !== 'idle'} aria-label="Send message">
                            <span className="material-symbols-outlined text-xl">send</span>
                        </button>
                    </form>
                </footer>
            </div>
        </Modal>
    );
};


// --- Main Modals Component ---

type ActiveModalType = 'schools' | 'financing' | 'schedule' | 'save' | 'share' | 'voice' | null;

interface ListingAppModalsProps {
  activeModal: ActiveModalType;
  onClose: () => void;
  property: Property;
}

export const ListingAppModals: React.FC<ListingAppModalsProps> = ({ activeModal, onClose, property }) => {
  if (!activeModal) {
    return null;
  }

  switch (activeModal) {
    case 'schools':
      return <SchoolsModal onClose={onClose} />;
    case 'financing':
      return <FinancingModal propertyPrice={property.price} onClose={onClose} />;
    case 'schedule':
      return <ScheduleModal onClose={onClose} />;
    case 'save':
      return <SaveModal onClose={onClose} />;
    case 'share':
      return (
        <ShareModal
          isOpen={true}
          onClose={onClose}
          content={ShareService.generatePropertyShareContent(property, 'description')}
        />
      );
    case 'voice':
      // Voice chat disabled
      return null;
    default:
      return null;
  }
};