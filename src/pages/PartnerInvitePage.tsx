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

const SUGGESTED_QUESTIONS = [
  'What would my monthly payment be?',
  'How much do I need for a down payment?',
  'What loan programs are available?',
  'How fast can we close?',
];

// ─── Demo listing fallback (used when LO has no listing attached) ─────────────

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

// ─── Chat Component ───────────────────────────────────────────────────────────

const LiveChat: React.FC<{ lo: LOInfo; listingId: string; botName: string; greeting: string }> = ({ lo, listingId, botName, greeting }) => {
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

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending) return;
    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'visitor', text: clean };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);
    historyRef.current = [...historyRef.current, { role: 'user', content: clean }];
    try {
      const res = await fetch(buildApiUrl('/api/public/lo-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lo_agent_id: lo.id, listing_id: listingId, message: clean, history: historyRef.current.slice(-8) })
      });
      const data = await res.json() as { reply?: string };
      const reply = data.reply || 'I\'d be happy to answer that — give me a call or email to discuss your specific situation!';
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: 'Sorry, I\'m having trouble connecting right now. Feel free to reach out directly!' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-700 to-teal-600">
        {lo.headshotUrl
          ? <img src={lo.headshotUrl} alt={lo.name} className="w-9 h-9 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
          : <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{lo.name[0]}</div>
        }
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">{botName}</p>
          <p className="text-emerald-100 text-xs truncate">{lo.name} · {lo.company}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          <span className="text-emerald-100 text-xs font-medium">Live</span>
        </div>
      </div>

      {/* Messages */}
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
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions — shown until first visitor message */}
      {messages.filter(m => m.role === 'visitor').length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2 bg-white">
          {SUGGESTED_QUESTIONS.map(q => (
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

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100 bg-white">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder="Ask about financing…"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-emerald-700 transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </div>
    </div>
  );
};

// ─── Property Chat — the REAL ESTATE AI (agent's bot, trained via ai_kb) ──────

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
          property: {
            id: listing.id,
            address: listing.address,
            price: listing.price,
            bedrooms: listing.beds,
            bathrooms: listing.baths,
            squareFeet: listing.sqft,
            description: listing.description,
            features: []
          },
          question: clean,
          history: historyRef.current.slice(-8)
        })
      });
      const data = await res.json() as { success?: boolean; text?: string };
      const reply = data.text || 'Great question — I\'d recommend scheduling a viewing to see this one in person!';
      historyRef.current = [...historyRef.current, { sender: 'bot', text: reply }];
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: 'Sorry, I\'m having trouble connecting right now. Try again in a moment!' }]);
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const PartnerInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'home' | 'financing' | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const listingRef = useRef<HTMLDivElement>(null);

  const scrollToListing = () => listingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }
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
  const greeting = chatbot?.greeting || `Hi! I'm ${lo.name}'s AI assistant. Ask me anything about financing this home — rates, payments, programs, whatever's on your mind.`;
  const brandColor = brand?.color || lo.brandColor || '#2563eb';
  const officeLogo = brand?.logoUrl || null;
  const officeName = brand?.companyName || lo.company;

  const monthlyPayment = Math.round(displayListing.price * 0.8 * 0.00716).toLocaleString();
  const market = displayListing.address.split(',').slice(-2).join(',').trim() || 'Your market';
  const heroPhoto = displayListing.hero_photos[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop';

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="mx-auto max-w-[480px] bg-[#eef2f7] pb-10">

        {/* ── Invite bar (soft, no pressure) ── */}
        <div className="sticky top-0 z-40 flex items-center gap-3 bg-slate-900 px-4 py-3 text-white">
          {officeLogo
            ? <img src={officeLogo} alt={officeName || 'logo'} className="h-9 max-w-[120px] flex-shrink-0 object-contain" />
            : lo.headshotUrl
              ? <img src={lo.headshotUrl} alt={lo.name} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
              : <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ background: brandColor }}>{lo.name[0]}</div>
          }
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-slate-300">{lo.name}{officeName ? ` · ${officeName}` : ''}</p>
            <p className="text-[11px] text-slate-500">made you something — take a look 👇</p>
          </div>
          <button
            onClick={scrollToListing}
            className="flex-shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold text-slate-100 transition-colors hover:bg-white/20"
          >
            Take a Look
          </button>
        </div>

        {/* ── Bigger pitch hero ── */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-[#1e3a5f] px-6 pb-9 pt-8 text-center text-white">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/10" />
          <span className="inline-block rounded-full bg-cyan-400/15 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-cyan-300">
            A new way to show listings
          </span>
          <h1 className="mx-auto mt-4 max-w-[340px] text-[26px] font-black leading-[1.22] tracking-tight">
            What if your listings could <span className="text-[#28a7e8]">answer buyers</span> for you?
          </h1>
          <p className="mx-auto mt-3 max-w-[340px] text-sm leading-relaxed text-slate-300">
            This is a real, live preview — an AI concierge built into the page that answers questions any hour and quietly flags the serious buyers for you. Nothing to sign up for. Just look around.
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
          <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.10)]">
            <div className="relative h-60 bg-cover bg-center" style={{ backgroundImage: `url('${heroPhoto}')` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
              <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[10px] font-black" style={{ color: brandColor }}>LIVE PREVIEW</span>
              <div className="absolute bottom-3.5 left-4 z-10 text-white">
                <p className="text-[26px] font-black leading-none">${displayListing.price.toLocaleString()}</p>
                <p className="mt-1 text-[12px] opacity-85">{displayListing.address}</p>
              </div>
            </div>
            <button
              onClick={() => setChatMode('home')}
              className="m-3.5 flex w-[calc(100%-1.75rem)] items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white shadow-[0_8px_22px_rgba(40,167,232,0.4)] transition-transform active:scale-[0.99]"
              style={{ background: '#28a7e8' }}
            >
              💬 Talk to the Home
            </button>
            <p className="-mt-1.5 mb-2 px-3.5 text-center text-[11px] font-semibold text-slate-500">Tap it — ask this listing anything, like you would a person</p>
            <div className="mb-1 flex justify-around border-y border-slate-100 py-3.5">
              {[[displayListing.beds, 'BEDS'], [displayListing.baths, 'BATHS'], [displayListing.sqft.toLocaleString(), 'SQFT']].map(([v, l]) => (
                <div key={l} className="text-center">
                  <b className="block text-[17px] font-extrabold text-slate-900">{v}</b>
                  <span className="text-[10px] tracking-wide text-slate-400">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Agent card (the star) ── */}
        <div className="m-3.5 overflow-hidden rounded-[18px] p-[18px] text-white" style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)' }}>
          <div className="flex items-center gap-3.5">
            <div className="flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-2xl font-black">
              {agentInitial}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-black leading-none">{agentName}</p>
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">Listing Agent</span>
              </div>
              <p className="mt-1 text-xs opacity-80">{market}</p>
              <p className="mt-2 text-xs font-bold opacity-95">👋 This is your page — your name, your brand, front and center.</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="flex-1 rounded-xl bg-white py-2.5 text-[13px] font-extrabold text-[#1e3a8a]">📞 Call {agentName.split(' ')[0]}</button>
            <button className="flex-1 rounded-xl border border-white/30 bg-white/15 py-2.5 text-[13px] font-extrabold text-white">✉️ Message</button>
            <button className="flex-1 rounded-xl border border-white/30 bg-white/15 py-2.5 text-[13px] font-extrabold text-white">📅 Tour</button>
          </div>
        </div>

        {/* ── Description ── */}
        <div className="m-3.5 rounded-[18px] bg-white p-[18px] text-sm leading-relaxed text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
          {displayListing.description}
        </div>

        {/* ── Payment ── */}
        <div className="m-3.5 rounded-[18px] bg-white p-[18px] shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-600">Est. Monthly Payment</p>
              <p className="text-2xl font-black text-emerald-800">${monthlyPayment}<span className="text-sm font-semibold">/mo</span></p>
              <p className="mt-0.5 text-[11px] text-emerald-500">20% down · 30yr fixed · est. 7.1% rate</p>
            </div>
            <button
              onClick={() => setChatMode('financing')}
              className="rounded-xl border-2 border-emerald-200 bg-white px-4 py-2.5 text-[13px] font-extrabold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              Ask the AI
            </button>
          </div>
        </div>

        {/* ── Soft pitch block ── */}
        <div className="m-3.5 rounded-[18px] bg-gradient-to-br from-slate-900 to-[#1e3a5f] p-[22px] text-center text-white">
          <p className="text-lg font-black leading-snug">This took 5 minutes to build.<br />Yours could too.</p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
            No tech setup, no contracts, no catch. Curious how it works? Have a look — it's all yours to explore.
          </p>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="mt-4 w-full rounded-xl border border-cyan-400/40 bg-cyan-400/15 py-3.5 text-[15px] font-extrabold text-cyan-300 transition-colors hover:bg-cyan-400/25"
          >
            See How It Works →
          </button>
          <p className="mt-2.5 text-[11px] text-slate-500">No account needed · Nothing happens until you decide</p>
        </div>

        {/* ── Financing by (small, secondary) ── */}
        <div className="m-3.5 flex items-center gap-2.5 rounded-[13px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Financing&nbsp;by</span>
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

        {/* Subtle attribution */}
        <p className="mt-4 text-center text-[10px] text-slate-400">Powered by HomeListingAI</p>
      </div>

      {/* ── Chat overlay — Talk to the Home (real estate AI) OR Financing (LO AI) ── */}
      {chatMode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setChatMode(null)}>
          <div
            className="flex h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[22px] bg-white shadow-2xl sm:h-[600px] sm:rounded-[22px]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-end border-b border-slate-100 px-3 py-2">
              <button onClick={() => setChatMode(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close chat">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {chatMode === 'home'
                ? <PropertyChat listing={displayListing} agentName={agentName} brandColor={brandColor} />
                : <LiveChat lo={lo} listingId={displayListing.id} botName={botName} greeting={greeting} />
              }
            </div>
          </div>
        </div>
      )}

      {/* ── How It Works explainer (soft, then signup) ── */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setShowHowItWorks(false)}>
          <div
            className="w-full max-w-[440px] overflow-hidden rounded-t-[22px] bg-white shadow-2xl sm:rounded-[22px]"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-slate-900 to-[#1e3a5f] px-6 pb-6 pt-7 text-center text-white">
              <button onClick={() => setShowHowItWorks(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 hover:bg-white/10" aria-label="Close">
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
                className="mt-2 w-full rounded-xl py-3.5 text-[15px] font-extrabold text-white shadow-md transition-all hover:brightness-110"
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
  );
};

export default PartnerInvitePage;
