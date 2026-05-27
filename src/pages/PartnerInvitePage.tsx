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
    <div>
      {/* Tap to expand/collapse */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-4 active:bg-slate-50 transition-colors"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="text-left">
          <div className="flex items-end gap-1.5">
            <span className="text-[32px] font-black leading-none text-slate-900">${total.toLocaleString()}</span>
            <span className="mb-1.5 text-sm font-semibold text-slate-400">/mo</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">{downPct}% down · {term}yr fixed · {rate.toFixed(1)}% rate</p>
        </div>
        <span
          className="material-symbols-outlined text-[24px] text-slate-300 transition-transform duration-300"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >expand_more</span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-4 pt-4 pb-5 space-y-4">
          {/* Term picker */}
          <div className="flex gap-2">
            {[15, 20, 30].map(t => (
              <button
                key={t}
                onClick={() => setTerm(t)}
                className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-all ${term === t ? 'text-white' : 'bg-slate-100 text-slate-500'}`}
                style={term === t ? { background: brandColor } : {}}
              >
                {t}yr
              </button>
            ))}
          </div>

          {/* Down payment */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-[12px] font-semibold text-slate-600">Down Payment</span>
              <span className="text-[12px] font-bold" style={{ color: brandColor }}>{downPct}% · ${downAmount.toLocaleString()}</span>
            </div>
            <input
              type="range" min={3} max={50} step={1} value={downPct}
              onChange={e => setDownPct(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: brandColor }}
            />
          </div>

          {/* Rate */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-[12px] font-semibold text-slate-600">Interest Rate</span>
              <span className="text-[12px] font-bold" style={{ color: brandColor }}>{rate.toFixed(1)}%</span>
            </div>
            <input
              type="range" min={4.0} max={10.0} step={0.1} value={rate}
              onChange={e => setRate(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: brandColor }}
            />
          </div>

          {/* Breakdown toggle */}
          <button
            onClick={() => setShowBreakdown(s => !s)}
            className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-500"
          >
            <span>See payment breakdown</span>
            <span className="material-symbols-outlined text-[16px] transition-transform" style={{ transform: showBreakdown ? 'rotate(180deg)' : 'none' }}>expand_more</span>
          </button>

          {showBreakdown && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-2">
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
              <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                <span className="text-[13px] font-bold text-slate-900">Total / month</span>
                <span className="text-[13px] font-bold" style={{ color: brandColor }}>${total.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">Estimates only. Does not include HOA, PMI, or utilities.</p>
            </div>
          )}

          {/* Pre-approval CTA */}
          <button
            onClick={onGetPreApproved}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-extrabold text-white transition-transform active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}
          >
            <span className="text-lg">✅</span>
            Get Pre-Approved in 60 Seconds
          </button>
          <p className="text-center text-[11px] text-slate-400">AI-powered · No forms · No hard credit pull</p>
        </div>
      )}
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

    if (lo.id === 'demo-lo') {
      await new Promise(r => setTimeout(r, 900));
      const demoReply = DEMO_REPLIES[clean.toLowerCase()] || 'Great question! In a real session, the AI would answer this instantly using real loan data. This is just a demo — the live version is fully connected.';
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

// Note: no fixed positioning — parent (phone shell) handles layout via flex-none
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
    if (key === 'tour') { onChat('home'); return; }
    if (key === 'contact') { onChat('financing'); return; }
    onTab(key);
  };

  return (
    <div
      className="flex justify-around border-t border-slate-200/80 bg-white/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
    >
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => handleTab(t.key)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors"
          style={{ color: active === t.key ? brandColor : '#94a3b8' }}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: active === t.key ? "'FILL' 1" : "'FILL' 0" } as React.CSSProperties}
          >{t.icon}</span>
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
  const [showConnectSheet, setShowConnectSheet] = useState(false);
  const [connectName, setConnectName] = useState('');
  const [connectPhone, setConnectPhone] = useState('');
  const [connectSending, setConnectSending] = useState(false);
  const [connectDone, setConnectDone] = useState(false);
  const [connectCountdown, setConnectCountdown] = useState(3);
  const [photoIndex, setPhotoIndex] = useState(0);
  const listingRef = useRef<HTMLDivElement>(null);
  const financeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    const scroller = scrollRef.current;
    const target = ref.current;
    if (!scroller || !target) return;
    const offset = target.offsetTop - scroller.offsetTop - 56; // 56px for sticky header
    scroller.scrollTo({ top: offset, behavior: 'smooth' });
  };

  const handleConnect = async () => {
    if (!token || connectSending) return;
    setConnectSending(true);
    try {
      if (token === 'demo') {
        await new Promise(r => setTimeout(r, 700));
        setConnectDone(true);
        return;
      }
      await fetch(buildApiUrl(`/api/public/partner-invite/${token}/connect`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: connectName.trim() || undefined, agentPhone: connectPhone.trim() || undefined }),
      });
      setConnectDone(true);
    } catch {
      setConnectDone(true);
    } finally {
      setConnectSending(false);
    }
  };

  // After connect success, count down then navigate to the claim page.
  // Demo token stays put — can't claim a demo invite.
  useEffect(() => {
    if (!connectDone || token === 'demo') return;
    setConnectCountdown(3);
    const interval = setInterval(() => {
      setConnectCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          navigate(`/agent/claim/${token}`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [connectDone, token, navigate]);

  const handleTab = (t: Tab) => {
    setActiveTab(t);
    if (t === 'finance') scrollToSection(financeRef);
    if (t === 'home') scrollToSection(listingRef);
  };

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

    if (token === 'demo') {
      setData({
        token: 'demo',
        claimed: false,
        inviteeName: 'Sarah Johnson',
        lo: {
          id: 'demo-lo',
          name: 'Alex Rivera',
          company: 'Summit Mortgage',
          headshotUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop&crop=face',
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
    // Desktop: dark ambient bg with phone centered
    // Mobile: transparent, phone shell IS the viewport
    <div
      className="flex items-start justify-center sm:min-h-screen sm:items-center sm:bg-[radial-gradient(ellipse_80%_80%_at_50%_40%,_#1e3a5f_0%,_#0a1628_50%,_#000_100%)] sm:p-8"
      style={{ WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
    >
      {/* ── Phone shell ──────────────────────────────────────────────────────── */}
      {/* Mobile: fills screen | Desktop: phone frame with bezel */}
      <div
        className={[
          'relative flex flex-col overflow-hidden bg-[#f2f2f7]',
          'w-full h-screen', // mobile: full screen
          'sm:w-[393px] sm:h-[852px]', // desktop: iPhone 15 Pro dimensions
          'sm:rounded-[55px]',
          // Bezel: inner black ring + thin titanium edge + ambient shadow
          'sm:shadow-[0_0_0_10px_#1c1c1e,0_0_0_12px_#48484a,0_80px_160px_rgba(0,0,0,0.85),0_0_60px_rgba(30,58,95,0.4)]',
        ].join(' ')}
      >

        {/* ── Dynamic Island + Status Bar (desktop only) ── */}
        <div className="pointer-events-none absolute top-0 inset-x-0 z-50 hidden sm:block">
          <div className="relative h-[54px] bg-[#f2f2f7]">
            {/* Time */}
            <span className="absolute left-7 top-[16px] text-[14px] font-semibold text-slate-800 tabular-nums">9:41</span>
            {/* Dynamic Island pill */}
            <div className="absolute top-[9px] left-1/2 -translate-x-1/2 w-[128px] h-[36px] bg-black rounded-full" />
            {/* Status icons */}
            <div className="absolute right-6 top-[17px] flex items-center gap-[6px]">
              {/* Signal bars */}
              <div className="flex items-end gap-[2px]">
                {[3, 5, 7, 9].map((h, i) => (
                  <div key={i} className="w-[3px] rounded-[1px] bg-slate-800" style={{ height: h }} />
                ))}
              </div>
              {/* WiFi */}
              <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                <circle cx="7.5" cy="10" r="1.2" fill="#1e293b" />
                <path d="M4 7a5 5 0 017 0" stroke="#1e293b" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M1 4a9 9 0 0113 0" stroke="#1e293b" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {/* Battery */}
              <div className="flex items-center gap-[1.5px]">
                <div className="h-[11px] w-[22px] rounded-[3px] border-[1.5px] border-slate-800 p-[1.5px]">
                  <div className="h-full w-full rounded-[1px] bg-slate-800" />
                </div>
                <div className="h-[5px] w-[2px] rounded-r-sm bg-slate-800" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable content area ── */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {/* Spacer for dynamic island on desktop */}
          <div className="hidden sm:block h-[54px]" />

          {/* ── Sticky LO header ── */}
          <div
            className="sticky top-0 z-40 flex items-center gap-3 bg-white/95 px-4 py-3 border-b border-slate-100/80"
            style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as React.CSSProperties}
          >
            {officeLogo
              ? <img src={officeLogo} alt={officeName || 'logo'} className="h-8 max-w-[90px] flex-shrink-0 object-contain" />
              : lo.headshotUrl
                ? <img src={lo.headshotUrl} alt={lo.name} className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
                : <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ background: brandColor }}>{lo.name[0]}</div>
            }
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-slate-900">
                {lo.name}{officeName && officeName !== lo.name ? ` · ${officeName}` : ''}
              </p>
              <p className="text-[11px] text-slate-400">
                {lo.nmlsNumber ? `NMLS #${lo.nmlsNumber} · ` : ''}built this for you 👇
              </p>
            </div>
            <button
              onClick={() => scrollToSection(listingRef)}
              className="flex-shrink-0 rounded-full px-3.5 py-2 text-[12px] font-extrabold text-white transition-all active:scale-95"
              style={{ background: brandColor }}
            >
              View
            </button>
          </div>

          {/* ── Hero photo ── */}
          <div ref={listingRef} className="relative bg-slate-900" style={{ height: 264 }}>
            <img
              src={heroPhoto}
              alt={displayListing.address}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/75" />

            {/* Live badge */}
            <span
              className="absolute left-4 top-4 rounded-full bg-white px-2.5 py-1 text-[10px] font-black shadow-md"
              style={{ color: brandColor }}
            >
              LIVE PREVIEW
            </span>

            {/* Photo nav dots */}
            {photos.length > 1 && (
              <div className="absolute bottom-[68px] left-0 right-0 flex justify-center gap-1.5 z-10">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === photoIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/55'}`}
                  />
                ))}
              </div>
            )}

            {/* Price overlay */}
            <div className="absolute bottom-4 left-4">
              <p className="text-[28px] font-black text-white leading-none">${displayListing.price.toLocaleString()}</p>
            </div>
          </div>

          {/* ── Property details ── */}
          <div className="bg-white px-4 pt-4 pb-5">
            <p className="text-[13px] text-slate-500 leading-snug">{displayListing.address}</p>
            <div className="mt-2 flex items-center gap-5">
              {([[displayListing.beds, 'bd'], [displayListing.baths, 'ba'], [displayListing.sqft.toLocaleString(), 'sqft']] as [number | string, string][]).map(([v, l]) => (
                <div key={l} className="flex items-baseline gap-1">
                  <span className="text-[17px] font-black text-slate-900">{v}</span>
                  <span className="text-[12px] text-slate-400">{l}</span>
                </div>
              ))}
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => setChatMode('home')}
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl py-[14px] text-[15px] font-extrabold text-white shadow-[0_4px_20px_rgba(0,0,0,0.18)] transition-transform active:scale-[0.99]"
              style={{ background: brandColor }}
            >
              <span className="text-[18px]">💬</span>
              Talk to this Home
            </button>
            <p className="mt-1.5 text-center text-[11px] text-slate-400">AI answers buyer questions 24/7 — try it</p>
          </div>

          {/* ── Separator ── */}
          <div className="h-2.5 bg-[#f2f2f7]" />

          {/* ── About ── */}
          <div className="bg-white px-4 py-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">About this home</p>
            <p className="text-[14px] leading-relaxed text-slate-700">{displayListing.description}</p>
          </div>

          {/* ── Separator ── */}
          <div className="h-2.5 bg-[#f2f2f7]" />

          {/* ── Listing Agent card ── */}
          <div className="bg-white px-4 py-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Listing Agent</p>
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop&crop=face"
                alt={agentName}
                className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">{agentName}</p>
                <p className="text-[12px] text-slate-400">Keller Williams Realty</p>
                <p className="text-[11px] text-slate-400">DRE #02198773 · (512) 555-0148</p>
              </div>
              <div className="flex gap-2">
                <a href="tel:5125550148" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                  <span className="material-symbols-outlined text-[18px] text-slate-600">call</span>
                </a>
                <a href="mailto:sarah@kwrealty.com" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                  <span className="material-symbols-outlined text-[18px] text-slate-600">mail</span>
                </a>
              </div>
            </div>
          </div>

          {/* ── Separator ── */}
          <div className="h-2.5 bg-[#f2f2f7]" />

          {/* ── Mortgage calculator ── */}
          <div ref={financeRef} className="bg-white">
            <div className="px-4 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly Payment</p>
            </div>
            <MortgageCalculator
              price={displayListing.price}
              brandColor={brandColor}
              onGetPreApproved={() => setChatMode('financing')}
            />
          </div>

          {/* ── Separator ── */}
          <div className="h-2.5 bg-[#f2f2f7]" />

          {/* ── Financing expert ── */}
          <div className="bg-white px-4 py-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Your Financing Expert</p>

            {/* LO card */}
            <div className="mb-4 flex items-center gap-3">
              {lo.headshotUrl
                ? <img src={lo.headshotUrl} alt={lo.name} className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
                : <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-black text-white" style={{ background: brandColor }}>{lo.name[0]}</div>
              }
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">{lo.name}</p>
                <p className="text-[12px] text-slate-400">{lo.company}{lo.nmlsNumber ? ` · NMLS #${lo.nmlsNumber}` : ''}</p>
              </div>
              <div className="flex gap-2">
                {lo.phone && (
                  <a href={`tel:${lo.phone}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                    <span className="material-symbols-outlined text-[18px] text-slate-600">call</span>
                  </a>
                )}
                {lo.email && (
                  <a href={`mailto:${lo.email}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                    <span className="material-symbols-outlined text-[18px] text-slate-600">mail</span>
                  </a>
                )}
              </div>
            </div>

            {/* Quick questions */}
            <div className="mb-3 space-y-2">
              {['💬 What can I qualify for?', '📋 How does pre-approval work?', '💰 What are current rates?'].map(q => (
                <button
                  key={q}
                  onClick={() => setChatMode('financing')}
                  className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-left text-[13px] font-medium text-slate-700 active:bg-slate-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            <button
              onClick={() => setChatMode('financing')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-extrabold text-white shadow-sm transition-all active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}
            >
              ✅ Get Pre-Approved — Free, No Hard Pull
            </button>
          </div>

          {/* ── Separator ── */}
          <div className="h-2.5 bg-[#f2f2f7]" />

          {/* ── Partner CTA ── */}
          <div className="bg-[#eff6ff] px-4 py-5">
            {/* Agent card */}
            <div className="mb-4 flex items-center gap-3">
              {lo.id === 'demo-lo' ? (
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop&crop=face"
                  alt={agentName}
                  className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-black text-blue-400">
                  {agentInitial}
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900">{agentName}</p>
                <p className="text-[12px] text-slate-500">Listing Agent · {market}</p>
              </div>
            </div>

            <h3 className="text-[17px] font-black text-slate-900 mb-1.5">This could be your listing page</h3>
            <p className="text-[13px] leading-relaxed text-slate-500 mb-4">
              {lo.name.split(' ')[0]} already set this up for you — explore it first, then let them know if you're in. No commitment, no contracts.
            </p>

            <button
              onClick={() => setShowConnectSheet(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-extrabold text-white shadow-md transition-all active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg,#f86f1b,#fb8c3a)' }}
            >
              <span className="material-symbols-outlined text-[20px]">handshake</span>
              I'm In — Let's Work Together
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">Free for agents · 30 seconds · No commitment</p>

            <button
              onClick={() => setShowHowItWorks(true)}
              className="mt-3 w-full rounded-2xl border border-slate-200 py-3.5 text-[14px] font-bold text-slate-600 transition-all active:bg-slate-50"
            >
              See How It Works →
            </button>
          </div>

          {/* ── Footer ── */}
          <div className="h-2.5 bg-[#f2f2f7]" />
          <div className="flex items-center gap-2.5 bg-white px-4 py-4">
            {lo.headshotUrl
              ? <img src={lo.headshotUrl} alt={lo.name} className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
              : <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: brandColor }}>{lo.name[0]}</div>
            }
            <p className="flex-1 text-[12px] text-slate-500">
              Financing by <span className="font-semibold text-slate-700">{lo.name}</span> · {lo.company}
            </p>
            <span className="flex-shrink-0 text-[10px] text-slate-300">HomeListingAI</span>
          </div>
          <div className="h-4 bg-[#f2f2f7]" />
        </div>

        {/* ── Bottom Tab Bar — flex-none, sticks to bottom of shell ── */}
        <div className="flex-none">
          <BottomBar active={activeTab} onTab={handleTab} brandColor={brandColor} onChat={setChatMode} />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OVERLAYS — absolute inside phone shell so they stay inside frame  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* ── Chat overlay ── */}
        {chatMode && (
          <div
            className="absolute inset-0 z-50 flex items-end bg-black/60"
            onClick={() => setChatMode(null)}
            style={{ backdropFilter: 'blur(4px)' }}
          >
            <div
              className="flex w-full flex-col overflow-hidden bg-white"
              style={{
                height: '88%',
                borderRadius: '22px 22px 0 0',
                paddingBottom: 'env(safe-area-inset-bottom)',
                animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle + close */}
              <div className="relative flex items-center justify-center border-b border-slate-100 px-4 py-2.5 flex-shrink-0">
                <div className="h-1 w-10 rounded-full bg-slate-200" />
                <button
                  onClick={() => setChatMode(null)}
                  className="absolute right-4 rounded-full bg-slate-100 p-1.5 text-slate-500"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="min-h-0 flex-1">
                {chatMode === 'home'
                  ? <PropertyChat listing={displayListing} agentName={agentName} brandColor={brandColor} />
                  : <LiveChat lo={lo} listingId={displayListing.id} botName={botName} greeting={greeting} brandColor={brandColor} />
                }
              </div>
            </div>
          </div>
        )}

        {/* ── Connect sheet ── */}
        {showConnectSheet && (
          <div
            className="absolute inset-0 z-50 flex items-end bg-black/60"
            onClick={() => !connectSending && setShowConnectSheet(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          >
            <div
              className="w-full overflow-hidden bg-white"
              style={{
                borderRadius: '22px 22px 0 0',
                paddingBottom: 'env(safe-area-inset-bottom)',
                animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {connectDone ? (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <span className="material-symbols-outlined text-3xl text-emerald-600">check_circle</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">You're in! 🎉</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
                    {lo.name.split(' ')[0]} has been notified. One last step — create your password to access your dashboard.
                  </p>
                  {token === 'demo' ? (
                    <>
                      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                        <p className="text-[12px] text-slate-500">
                          <span className="font-bold text-slate-700">Demo mode</span> — in the live app you'd set a password here and get instant access to your listing dashboard.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowConnectSheet(false)}
                        className="mt-5 w-full rounded-2xl py-3.5 text-[15px] font-extrabold text-white"
                        style={{ background: brandColor }}
                      >
                        Got it
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate(`/agent/claim/${token}`)}
                        className="mt-6 w-full rounded-2xl py-3.5 text-[15px] font-extrabold text-white shadow-md transition-all active:scale-[0.99]"
                        style={{ background: 'linear-gradient(135deg,#f86f1b,#fb8c3a)' }}
                      >
                        Create My Account →
                      </button>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Redirecting in {connectCountdown}s…
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 pt-5 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-[17px] font-black text-slate-900">Connect with {lo.name.split(' ')[0]}</h2>
                      <p className="text-[12px] text-slate-400 mt-0.5">They'll reach out within 1 business day</p>
                    </div>
                    <button
                      onClick={() => setShowConnectSheet(false)}
                      className="rounded-full bg-slate-100 p-2 text-slate-500"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Your Name</label>
                      <input
                        value={connectName}
                        onChange={e => setConnectName(e.target.value)}
                        placeholder={data?.inviteeName || 'Your full name'}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone (optional)</label>
                      <input
                        value={connectPhone}
                        onChange={e => setConnectPhone(e.target.value)}
                        placeholder="(555) 000-0000"
                        type="tel"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <button
                      onClick={() => void handleConnect()}
                      disabled={connectSending}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-extrabold text-white shadow-md transition-all active:scale-[0.99] disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}
                    >
                      {connectSending
                        ? 'Sending…'
                        : <><span className="material-symbols-outlined text-[20px]">send</span> Let's Do This!</>
                      }
                    </button>
                    <p className="text-center text-[11px] text-slate-400">No commitment · Free for agents</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── How It Works sheet ── */}
        {showHowItWorks && (
          <div
            className="absolute inset-0 z-50 flex items-end bg-black/60"
            onClick={() => setShowHowItWorks(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          >
            <div
              className="w-full overflow-hidden bg-white"
              style={{
                borderRadius: '22px 22px 0 0',
                paddingBottom: 'env(safe-area-inset-bottom)',
                animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                <div>
                  <h2 className="text-[17px] font-black text-slate-900">How it works</h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">Your AI listing — in 3 steps</p>
                </div>
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="space-y-5 px-4 py-5">
                {[
                  { n: '1', t: 'Claim your free account', d: `${lo.name.split(' ')[0]} already set it up — just confirm your details. Takes a minute.` },
                  { n: '2', t: 'Add your listing', d: 'Drop in the address and photos. The AI reads it and answers buyers instantly.' },
                  { n: '3', t: 'Share the link', d: 'Every buyer who opens it gets answers 24/7 — and the warm ones come straight to you.' },
                ].map(s => (
                  <div key={s.n} className="flex gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: brandColor }}>
                      {s.n}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{s.t}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{s.d}</p>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    if (token === 'demo') {
                      setShowHowItWorks(false);
                      setShowConnectSheet(true);
                    } else {
                      navigate(`/agent/claim/${token}`);
                    }
                  }}
                  className="w-full rounded-2xl py-4 text-[15px] font-extrabold text-white shadow-md transition-all active:scale-[0.99]"
                  style={{ background: brandColor }}
                >
                  Start Free →
                </button>
                <p className="text-center text-[11px] text-slate-400">Free for agents · No card · Cancel anytime</p>
              </div>
            </div>
          </div>
        )}

      </div>

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
