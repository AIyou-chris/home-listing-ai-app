import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LOInfo {
  id: string;
  name: string;
  company: string;
  headshotUrl: string | null;
  brandColor: string;
  email: string | null;
  phone: string | null;
  nmlsNumber?: string | null;
}

interface ListingInfo {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  hero_photos: string[];
  gallery_photos: string[];
}

interface BrandInfo {
  companyName: string | null;
  logoUrl: string | null;
  color: string;
  whiteLabel: boolean;
}

interface InviteData {
  token: string;
  claimed: boolean;
  inviteeName: string | null;
  lo: LOInfo;
  brand?: BrandInfo;
  listing: ListingInfo | null;
  chatbot: { bot_name: string; greeting: string; is_active: boolean } | null;
}

interface ChatMessage {
  id: string;
  role: 'visitor' | 'bot';
  text: string;
}

// ─── Demo listing fallback ─────────────────────────────────────────────────────

const DEMO_LISTING: ListingInfo = {
  id: 'demo',
  address: '2847 Sunset Ridge Dr, Austin, TX 78746',
  price: 875000,
  beds: 4,
  baths: 3,
  sqft: 2840,
  description: 'Stunning modern home nestled in the hills of West Austin. Open floor plan, chef\'s kitchen with waterfall island, primary suite with spa bath, and a backyard made for entertaining. Walking distance to top-rated schools.',
  hero_photos: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop',
  ],
  gallery_photos: [],
};

// ─── Mortgage Calculator ───────────────────────────────────────────────────────

const MortgageCalculator: React.FC<{
  price: number;
  brandColor: string;
  onGetPreApproved: () => void;
}> = ({ price, brandColor, onGetPreApproved }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(7.1);
  const [term, setTerm] = useState(30);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const downAmount = Math.round(price * (downPct / 100));
  const loanAmount = price - downAmount;
  const monthlyRate = rate / 100 / 12;
  const numPayments = term * 12;
  const pi = monthlyRate === 0
    ? loanAmount / numPayments
    : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const taxes = Math.round((price * 0.012) / 12);
  const insurance = 150;
  const total = Math.round(pi + taxes + insurance);

  return (
    <div className="m-3.5 overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
      {/* Header — tap to expand/collapse */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 pt-5 pb-4 active:bg-slate-50 transition-colors"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="text-left">
          <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: brandColor }}>Monthly Payment</p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-[36px] font-black leading-none text-slate-900">${total.toLocaleString()}</span>
            <span className="mb-1 text-sm font-semibold text-slate-400">/mo</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">{downPct}% down · {term}yr fixed · {rate.toFixed(1)}% rate</p>
        </div>
        <span
          className="material-symbols-outlined ml-3 flex-shrink-0 text-[22px] text-slate-400 transition-transform duration-300"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >expand_more</span>
      </button>

      {/* Collapsible body */}
      {isOpen && <>

      {/* Term picker */}
      <div className="flex gap-2 px-5 pb-3">
        {[15, 20, 30].map(t => (
          <button
            key={t}
            onClick={() => setTerm(t)}
            className={`flex-1 rounded-xl py-2 text-[13px] font-extrabold transition-all ${term === t ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}
            style={term === t ? { background: brandColor } : {}}
          >
            {t}yr
          </button>
        ))}
      </div>

      {/* Down payment slider */}
      <div className="px-5 pb-3">
        <div className="flex justify-between mb-1.5">
          <span className="text-[12px] font-bold text-slate-600">Down Payment</span>
          <span className="text-[12px] font-extrabold" style={{ color: brandColor }}>{downPct}% · ${downAmount.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={3}
          max={50}
          step={1}
          value={downPct}
          onChange={e => setDownPct(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: brandColor }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-400">3%</span>
          <span className="text-[10px] text-slate-400">50%</span>
        </div>
      </div>

      {/* Rate input */}
      <div className="px-5 pb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-[12px] font-bold text-slate-600">Interest Rate</span>
          <span className="text-[12px] font-extrabold" style={{ color: brandColor }}>{rate.toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min={4.0}
          max={10.0}
          step={0.1}
          value={rate}
          onChange={e => setRate(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: brandColor }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-400">4%</span>
          <span className="text-[10px] text-slate-400">10%</span>
        </div>
      </div>

      {/* Breakdown toggle */}
      <button
        onClick={() => setShowBreakdown(s => !s)}
        className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-[12px] font-bold text-slate-500"
      >
        <span>See full breakdown</span>
        <span className="material-symbols-outlined text-[16px] transition-transform" style={{ transform: showBreakdown ? 'rotate(180deg)' : 'none' }}>expand_more</span>
      </button>

      {showBreakdown && (
        <div className="px-5 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {[
            { label: 'Principal & Interest', value: `$${Math.round(pi).toLocaleString()}` },
            { label: 'Property Taxes (est.)', value: `$${taxes.toLocaleString()}` },
            { label: 'Homeowners Insurance (est.)', value: `$${insurance}` },
          ].map(row => (
            <div key={row.label} className="flex justify-between">
              <span className="text-[12px] text-slate-500">{row.label}</span>
              <span className="text-[12px] font-bold text-slate-800">{row.value}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
            <span className="text-[13px] font-extrabold text-slate-900">Total / month</span>
            <span className="text-[13px] font-extrabold" style={{ color: brandColor }}>${total.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">Estimates only. Does not include HOA, PMI, or utilities. Contact your lender for exact figures.</p>
        </div>
      )}

      {/* Pre-approval CTA */}
      <div className="px-5 pb-5 pt-1">
        <button
          onClick={onGetPreApproved}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-extrabold text-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-transform active:scale-[0.99]"
          style={{ background: `linear-gradient(135deg,#059669,#10b981)` }}
        >
          <span className="text-xl">✅</span>
          Get Pre-Approved in 60 Seconds
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">Talk to the AI — no forms, no hard pull</p>
      </div>

      </>}
    </div>
  );
};

// ─── Chat Component (Financing / Pre-Approval) ─────────────────────────────────

const FINANCING_QUESTIONS = [
  'How much can I qualify for?',
  'What do I need to get pre-approved?',
  'What\'s the minimum down payment?',
  'How fast can I close?',
  'What loan programs are available?',
];

const LiveChat: React.FC<{
  lo: LOInfo;
  listingId: string;
  botName: string;
  greeting: string;
  brandColor: string;
}> = ({ lo, listingId, botName, greeting, brandColor: _brandColor }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'greeting', role: 'bot', text: greeting }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const DEMO_REPLIES: Record<string, string> = {
    'how much can i qualify for?': 'Great question! Most buyers qualify for 3–5x their annual income. With strong credit and steady income, you could be looking at $400k–$700k+. Want to run through your numbers? I can help you get pre-approved without affecting your credit.',
    'what do i need to get pre-approved?': 'Pre-approval is easier than most people think. You\'ll need: 2 months of pay stubs, last 2 years of W-2s, 2 months of bank statements, and a valid ID. The whole process takes about 24 hours. Want to get started?',
    'what\'s the minimum down payment?': 'For a conventional loan, as low as 3% down. FHA loans go as low as 3.5%. VA and USDA loans can be 0% down if you qualify. On this $875k home, 3% would be about $26k. Want me to walk you through the best option for your situation?',
    'how fast can i close?': 'With everything in order, we can close in 21–30 days. If you\'re pre-approved already, we can move even faster. Competitive markets often require speed — that\'s exactly where being pre-approved gives you an edge.',
    'what loan programs are available?': 'Several great options depending on your situation: Conventional (best rates with 20%+ down), FHA (lower credit requirements), VA (0% down for veterans), Jumbo (for loans over $766k). This home would likely qualify for a jumbo loan. Want to talk through what fits you best?'
  };

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending) return;
    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'visitor', text: clean };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);
    historyRef.current = [...historyRef.current, { role: 'user', content: clean }];

    // Demo mode — use canned replies instead of hitting the API
    if (lo.id === 'demo-lo') {
      await new Promise(r => setTimeout(r, 900));
      const demoReply = DEMO_REPLIES[clean.toLowerCase()] || 'Great question! In a real session, Alex\'s AI would answer this instantly using real loan data. This is just a demo — the live version is fully connected.';
      historyRef.current = [...historyRef.current, { role: 'assistant', content: demoReply }];
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: demoReply }]);
      setSending(false);
      return;
    }

    try {
      const res = await fetch(buildApiUrl('/api/public/lo-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lo_agent_id: lo.id, listing_id: listingId, message: clean, history: historyRef.current.slice(-8) })
      });
      const data = await res.json() as { reply?: string };
      const reply = data.reply || 'Happy to answer that — give me a call or send an email and we\'ll get you sorted!';
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: 'Having trouble connecting — reach out directly and I\'ll get back to you fast!' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-100" style={{ background: 'linear-gradient(135deg,#064e3b,#059669)' }}>
        {lo.headshotUrl
          ? <img src={lo.headshotUrl} alt={lo.name} className="w-9 h-9 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
          : <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{lo.name[0]}</div>
        }
        <div className="min-w-0 flex-1">
          <p className="text-white font-bold text-sm leading-tight">{botName}</p>
          <p className="text-emerald-100 text-xs truncate">{lo.name} · {lo.company}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          <span className="text-emerald-100 text-xs font-medium">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'visitor'
                ? 'bg-slate-900 text-white rounded-br-sm'
                : 'bg-emerald-50 text-slate-800 border border-emerald-100 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.filter(m => m.role === 'visitor').length === 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 bg-white">
          {FINANCING_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1.5 hover:bg-emerald-100 transition-colors font-medium"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100 bg-white">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder="Ask about financing or pre-approval…"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-colors flex-shrink-0"
          style={{ background: '#059669' }}
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </div>
    </div>
  );
};

// ─── Property Chat ─────────────────────────────────────────────────────────────

const PROPERTY_QUESTIONS = [
  'Tell me about this neighborhood',
  'What schools are nearby?',
  'What are the standout features?',
  'Is this a good time to make an offer?',
];

const PropertyChat: React.FC<{ listing: ListingInfo; agentName: string; brandColor: string }> = ({ listing, agentName, brandColor }) => {
  const greeting = `Hi! I'm the AI assistant for ${listing.address.split(',')[0]}. Ask me anything about this home — the layout, the neighborhood, schools, features, or what it's like to live here.`;
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'greeting', role: 'bot', text: greeting }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ sender: string; text: string }[]>([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending) return;
    setInput('');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'visitor', text: clean }]);
    setSending(true);
    historyRef.current = [...historyRef.current, { sender: 'user', text: clean }];
    try {
      const res = await fetch(buildApiUrl('/api/ai/property-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: { id: listing.id, address: listing.address, price: listing.price, bedrooms: listing.beds, bathrooms: listing.baths, squareFeet: listing.sqft, description: listing.description, features: [] },
          question: clean,
          history: historyRef.current.slice(-8)
        })
      });
      const data = await res.json() as { success?: boolean; text?: string };
      const reply = data.text || 'Great question — I\'d recommend scheduling a viewing to see this one in person!';
      historyRef.current = [...historyRef.current, { sender: 'bot', text: reply }];
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: 'Try again in a moment!' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-white" style={{ background: `linear-gradient(135deg,#1e3a8a,${brandColor})` }}>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-lg">🏡</div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-white">Talk to the Home</p>
          <p className="truncate text-xs text-white/70">{agentName}'s listing assistant</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
          <span className="text-xs font-medium text-white/80">Live</span>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-white px-4 py-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'visitor' ? 'rounded-br-sm bg-slate-900 text-white' : 'rounded-bl-sm border border-blue-100 bg-blue-50 text-slate-800'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex gap-1">
                {[0, 150, 300].map(d => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.filter(m => m.role === 'visitor').length === 0 && (
        <div className="flex flex-wrap gap-2 bg-white px-4 pb-2">
          {PROPERTY_QUESTIONS.map(q => (
            <button key={q} onClick={() => send(q)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100">{q}</button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder="Ask about this home…"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={() => send(input)} disabled={!input.trim() || sending} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:opacity-40" style={{ background: brandColor }}>
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </div>
    </div>
  );
};

// ─── Bottom Tab Bar ────────────────────────────────────────────────────────────

type Tab = 'home' | 'finance' | 'tour' | 'contact';

const BottomBar: React.FC<{
  active: Tab;
  onTab: (t: Tab) => void;
  brandColor: string;
  onChat: (mode: 'home' | 'financing') => void;
}> = ({ active, onTab, brandColor, onChat }) => {
  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'home', icon: 'home', label: 'Home' },
    { key: 'finance', icon: 'calculate', label: 'Finance' },
    { key: 'tour', icon: 'calendar_month', label: 'Tour' },
    { key: 'contact', icon: 'call', label: 'Contact' },
  ];

  const handleTab = (key: Tab) => {
    if (key === 'home') { onTab(key); return; }
    if (key === 'finance') { onTab(key); return; }
    if (key === 'tour') { onChat('home'); return; }
    if (key === 'contact') { onChat('financing'); return; }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-slate-200 bg-white/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => handleTab(t.key)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors"
          style={{ color: active === t.key ? brandColor : '#94a3b8' }}
        >
          <span className="material-symbols-outlined text-[22px]">{t.icon}</span>
          <span className="text-[10px] font-bold">{t.label}</span>
        </button>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PartnerInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'home' | 'financing' | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const listingRef = useRef<HTMLDivElement>(null);
  const financeRef = useRef<HTMLDivElement>(null);

  const scrollToListing = () => listingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleTab = (t: Tab) => {
    setActiveTab(t);
    if (t === 'finance') financeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (t === 'home') listingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

    // Demo mode — bypass API
    if (token === 'demo') {
      setData({
        token: 'demo',
        claimed: false,
        inviteeName: 'Sarah Johnson',
        lo: {
          id: 'demo-lo',
          name: 'Alex Rivera',
          company: 'Summit Mortgage',
          headshotUrl: null,
          brandColor: '#2563eb',
          email: 'alex@summitmortgage.com',
          phone: '(512) 555-0192',
        },
        listing: DEMO_LISTING,
        chatbot: {
          bot_name: "Alex's Finance Assistant",
          greeting: "Hi! I'm Alex's AI mortgage assistant. Ask me anything — how much you can qualify for, pre-approval steps, down payment options, loan programs. I'm here 24/7 and it won't affect your credit.",
          is_active: true,
        },
      });
      document.title = 'Alex Rivera built something for your listings';
      setLoading(false);
      return;
    }

    fetch(buildApiUrl(`/api/public/partner-invite/${token}`))
      .then(r => r.json())
      .then((d: { success?: boolean; error?: string } & Partial<InviteData>) => {
        if (d.success && d.lo) {
          setData(d as InviteData);
          document.title = `${d.lo!.name} built something for your listings`;
        } else {
          setError(d.error === 'invite_expired' ? 'This invite link has expired.' : 'Invalid or expired invite link.');
        }
      })
      .catch(() => setError('Unable to load invite. Check your connection.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <LoadingSpinner size="xl" text="Loading your demo…" />
    </div>
  );

  if (error || !data) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">link_off</span>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Unavailable</h1>
      <p className="text-slate-500">{error || 'This invite link is invalid or has expired.'}</p>
    </div>
  );

  const { lo, listing, chatbot, inviteeName, brand } = data;
  const agentName = inviteeName?.trim() || 'Your Name Here';
  const agentInitial = agentName[0]?.toUpperCase() || 'A';
  // Demo WOW Link (no real listing attached) → promote the LO.
  // Live agent listing → contact the agent.
  const isDemo = !listing;
  const displayListing = listing || DEMO_LISTING;
  const botName = chatbot?.bot_name || `${lo.name.split(' ')[0]}'s Finance Assistant`;
  const greeting = chatbot?.greeting || `Hi! I'm ${lo.name}'s AI mortgage assistant. Ask me anything — how much you can qualify for, pre-approval steps, down payment options, loan programs. I'm here 24/7 and it won't affect your credit.`;
  const brandColor = brand?.color || lo.brandColor || '#2563eb';
  const officeLogo = brand?.logoUrl || null;
  const officeName = brand?.companyName || lo.company;

  const photos = displayListing.hero_photos.length ? displayListing.hero_photos : DEMO_LISTING.hero_photos;
  const heroPhoto = photos[photoIndex] || photos[0];
  const market = displayListing.address.split(',').slice(-2).join(',').trim() || 'Your market';

  return (
    // Outer shell: treat as phone app — constrained width, native feel
    <div className="min-h-screen bg-[#f1f5f9]" style={{ WebkitTapHighlightColor: 'transparent' }}>
      <div className="mx-auto max-w-[480px] bg-[#f1f5f9]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}>

        {/* ── Status-bar-style invite strip ── */}
        <div
          className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 text-white shadow-sm"
          style={{ background: 'rgba(15,23,42,0.97)', paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        >
          {officeLogo
            ? <img src={officeLogo} alt={officeName || 'logo'} className="h-8 max-w-[100px] flex-shrink-0 object-contain" />
            : lo.headshotUrl
              ? <img src={lo.headshotUrl} alt={lo.name} className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-white/20" />
              : <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ background: brandColor }}>{lo.name[0]}</div>
          }
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-white">{lo.name}{officeName ? ` · ${officeName}` : ''}</p>
            <p className="text-[11px] text-slate-400">
              {lo.nmlsNumber ? `NMLS #${lo.nmlsNumber} · ` : ''}made you something 👇
            </p>
          </div>
          <button
            onClick={scrollToListing}
            className="flex-shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-bold text-white transition-all active:scale-95"
          >
            Take a Look
          </button>
        </div>

        {/* ── Hero pitch ── */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-[#1e3a5f] px-6 pb-10 pt-8 text-center text-white">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/10" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-blue-400/10" />
          <span className="inline-block rounded-full bg-cyan-400/15 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-cyan-300">
            A new way to show listings
          </span>
          <h1 className="mx-auto mt-4 max-w-[340px] text-[26px] font-black leading-[1.22] tracking-tight">
            What if your listings could <span className="text-[#28a7e8]">answer buyers</span> for you?
          </h1>
          <p className="mx-auto mt-3 max-w-[340px] text-sm leading-relaxed text-slate-300">
            A real, live AI concierge built into every listing — answers questions 24/7 and quietly flags the serious buyers. Nothing to sign up for. Just look around.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['🤖 Answers 24/7', '🔥 Warm leads, automatically', '📱 Feels like an app'].map(c => (
              <span key={c} className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-2 text-[11px] text-slate-300">{c}</span>
            ))}
          </div>
          <p className="mt-5 text-[12px] font-semibold tracking-wide text-slate-500">↓ Here's yours — scroll through it ↓</p>
        </div>

        {/* ── Listing card ── */}
        <div ref={listingRef} className="-mt-4 scroll-mt-4 px-3.5">
          <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.12)]">

            {/* Photo with swipe dots */}
            <div className="relative h-64 bg-cover bg-center" style={{ backgroundImage: `url('${heroPhoto}')` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/65" />
              <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[10px] font-black" style={{ color: brandColor }}>LIVE PREVIEW</span>

              {/* Photo nav dots */}
              {photos.length > 1 && (
                <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${i === photoIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                    />
                  ))}
                </div>
              )}

              <div className="absolute bottom-3.5 left-4 z-10 text-white">
                <p className="text-[28px] font-black leading-none">${displayListing.price.toLocaleString()}</p>
                <p className="mt-1 text-[12px] opacity-85">{displayListing.address}</p>
              </div>
            </div>

            {/* Talk to the Home CTA */}
            <button
              onClick={() => setChatMode('home')}
              className="m-3.5 flex w-[calc(100%-1.75rem)] items-center justify-center gap-2.5 rounded-2xl py-4 text-[15px] font-extrabold text-white shadow-[0_8px_22px_rgba(40,167,232,0.35)] transition-transform active:scale-[0.99]"
              style={{ background: '#28a7e8' }}
            >
              💬 Talk to the Home
            </button>
            <p className="-mt-1.5 mb-3 px-3.5 text-center text-[11px] font-semibold text-slate-400">Ask this listing anything — like you would a person</p>

            {/* Stats */}
            <div className="mb-1 flex justify-around border-y border-slate-100 py-4">
              {[[displayListing.beds, 'BEDS'], [displayListing.baths, 'BATHS'], [displayListing.sqft.toLocaleString(), 'SQFT']].map(([v, l]) => (
                <div key={l} className="text-center">
                  <b className="block text-[20px] font-extrabold text-slate-900">{v}</b>
                  <span className="text-[10px] tracking-widest text-slate-400">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Agent card ── */}
        <div className="m-3.5 overflow-hidden rounded-[20px] p-[18px] text-white shadow-[0_8px_24px_rgba(30,58,138,0.25)]" style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)' }}>
          <div className="flex items-center gap-3.5">
            <div className="flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-2xl font-black">
              {agentInitial}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-black leading-none">{agentName}</p>
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">Listing Agent</span>
              </div>
              <p className="mt-1 text-xs opacity-75">{market}</p>
              <p className="mt-2 text-xs font-bold opacity-90">👋 This is your page — your name, your brand, front and center.</p>
            </div>
          </div>
          {isDemo ? (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setChatMode('financing'); handleTab('finance'); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-[13px] font-extrabold text-[#1e3a8a] transition-all active:scale-95"
              >
                💬 Contact the LO
              </button>
              <button
                onClick={() => setShowHowItWorks(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/15 py-2.5 text-[13px] font-extrabold text-white transition-all active:scale-95"
              >
                ✨ See How It Works
              </button>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-[13px] font-extrabold text-[#1e3a8a] transition-all active:scale-95">
                📞 Call Agent
              </button>
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/15 py-2.5 text-[13px] font-extrabold text-white transition-all active:scale-95">
                ✉️ Message Agent
              </button>
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/15 py-2.5 text-[13px] font-extrabold text-white transition-all active:scale-95">
                📅 Tour
              </button>
            </div>
          )}
        </div>

        {/* ── Description ── */}
        <div className="m-3.5 rounded-[18px] bg-white p-[18px] text-sm leading-relaxed text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
          {displayListing.description}
        </div>

        {/* ── Mortgage Calculator ── */}
        <div ref={financeRef} className="scroll-mt-4">
          <MortgageCalculator
            price={displayListing.price}
            brandColor={brandColor}
            onGetPreApproved={() => setChatMode('financing')}
          />
        </div>

        {/* ── Pre-approval nudge card ── */}
        <div className="m-3.5 overflow-hidden rounded-[20px] shadow-[0_4px_20px_rgba(5,150,105,0.15)]">
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 px-5 py-5 text-white">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">Financing</p>
            <h3 className="mt-1 text-[18px] font-black leading-snug">Ready to know your number?</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-emerald-100">
              Chat with {lo.name.split(' ')[0]}'s AI financing assistant — ask about rates, programs, or what you qualify for. No forms. No hard credit pull.
            </p>
          </div>
          <div className="bg-white px-5 pb-5 pt-4 space-y-2.5">
            {['💬 What can I qualify for?', '📋 How do I get pre-approved?', '💰 Minimum down payment options'].map(q => (
              <button
                key={q}
                onClick={() => { setChatMode('financing'); }}
                className="flex w-full items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left text-[13px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                {q}
              </button>
            ))}
            <button
              onClick={() => setChatMode('financing')}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-extrabold text-white transition-all active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}
            >
              Start Pre-Approval Chat →
            </button>
          </div>
        </div>

        {/* ── Soft pitch block ── */}
        <div className="m-3.5 rounded-[18px] bg-gradient-to-br from-slate-900 to-[#1e3a5f] p-[22px] text-center text-white shadow-[0_8px_24px_rgba(15,23,42,0.15)]">
          <p className="text-lg font-black leading-snug">This took 5 minutes to build.<br />Yours could too.</p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
            No tech setup, no contracts, no catch. Curious how it works? Have a look — it's all yours to explore.
          </p>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="mt-4 w-full rounded-xl border border-cyan-400/40 bg-cyan-400/15 py-3.5 text-[15px] font-extrabold text-cyan-300 transition-colors active:scale-[0.99]"
          >
            See How It Works →
          </button>
          <p className="mt-2.5 text-[11px] text-slate-500">No account needed · Nothing happens until you decide</p>
        </div>

        {/* ── Financing by ── */}
        <div className="m-3.5 flex items-center gap-2.5 rounded-[13px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Financing by</span>
          {lo.headshotUrl
            ? <img src={lo.headshotUrl} alt={lo.name} className="h-[30px] w-[30px] flex-shrink-0 rounded-full object-cover" />
            : <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">{lo.name[0]}</div>
          }
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-slate-600">{lo.name}</p>
            <p className="truncate text-[11px] text-slate-400">{lo.company}</p>
          </div>
          <span className="flex-shrink-0 text-[11px] text-slate-400">Powers the AI →</span>
        </div>

        {!brand?.whiteLabel && <p className="mt-4 mb-6 text-center text-[10px] text-slate-400">Powered by HomeListingAI</p>}
      </div>

      {/* ── Bottom Tab Bar ── */}
      <BottomBar
        active={activeTab}
        onTab={handleTab}
        brandColor={brandColor}
        onChat={(mode) => setChatMode(mode)}
      />

      {/* ── Chat overlay ── */}
      {chatMode && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setChatMode(null)}
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <div
            className="flex w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-2xl"
            style={{
              height: '88vh',
              borderRadius: '22px 22px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom)',
              animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <div className="h-1 w-10 rounded-full bg-slate-200 mx-auto" />
            </div>
            <button
              onClick={() => setChatMode(null)}
              className="absolute right-4 top-14 z-10 rounded-full bg-white/90 p-1.5 text-slate-400 shadow-sm hover:bg-slate-100"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="min-h-0 flex-1">
              {chatMode === 'home'
                ? <PropertyChat listing={displayListing} agentName={agentName} brandColor={brandColor} />
                : <LiveChat lo={lo} listingId={displayListing.id} botName={botName} greeting={greeting} brandColor={brandColor} />
              }
            </div>
          </div>
        </div>
      )}

      {/* ── How It Works ── */}
      {showHowItWorks && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setShowHowItWorks(false)}
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-[440px] overflow-hidden bg-white shadow-2xl"
            style={{ borderRadius: '22px 22px 0 0', animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-slate-900 to-[#1e3a5f] px-6 pb-6 pt-7 text-center text-white">
              <button onClick={() => setShowHowItWorks(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 hover:bg-white/10">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-300">How it works</p>
              <h2 className="mt-2 text-xl font-black leading-snug">Your own AI listing — in 3 steps</h2>
            </div>
            <div className="space-y-4 px-6 py-6">
              {[
                { n: '1', t: 'Claim your free account', d: `${lo.name.split(' ')[0]} already set it up — just confirm your details. Takes a minute.` },
                { n: '2', t: 'Add your listing', d: 'Drop in the address and photos. The AI reads it and is ready to answer buyers instantly.' },
                { n: '3', t: 'Share the link', d: 'Every buyer who opens it gets answers 24/7 — and the warm ones come straight to you.' },
              ].map(s => (
                <div key={s.n} className="flex gap-3.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: brandColor }}>{s.n}</div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-900">{s.t}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{s.d}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => navigate(`/agent/claim/${token}`)}
                className="mt-2 w-full rounded-xl py-3.5 text-[15px] font-extrabold text-white shadow-md transition-all active:scale-[0.99]"
                style={{ background: brandColor }}
              >
                Start Free →
              </button>
              <p className="text-center text-[11px] text-slate-400">Free for agents · No card · Cancel anytime</p>
            </div>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PartnerInvitePage;
