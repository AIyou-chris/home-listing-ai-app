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

interface InviteData {
  token: string;
  claimed: boolean;
  inviteeName: string | null;
  lo: LOInfo;
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
        body: JSON.stringify({ loAgentId: lo.id, listingId, message: clean, history: historyRef.current.slice(-8) })
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

// ─── Listing Hero ─────────────────────────────────────────────────────────────

const ListingHero: React.FC<{ listing: ListingInfo }> = ({ listing }) => {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = listing.hero_photos.length > 0 ? listing.hero_photos : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop'];

  return (
    <div className="relative">
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={photos[photoIdx]}
          alt={listing.address}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setPhotoIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? 'bg-white scale-125' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </>
        )}
        <div className="absolute bottom-4 left-4 text-white">
          <p className="text-2xl font-black">${listing.price.toLocaleString()}</p>
          <p className="text-sm text-white/80">{listing.address}</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-slate-100 text-sm font-semibold text-slate-700">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-slate-400">bed</span>
          {listing.beds} beds
        </span>
        <span className="text-slate-200">|</span>
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-slate-400">bathtub</span>
          {listing.baths} baths
        </span>
        <span className="text-slate-200">|</span>
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-slate-400">straighten</span>
          {listing.sqft.toLocaleString()} sqft
        </span>
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
  const [chatOpen, setChatOpen] = useState(false);

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

  const { lo, listing, chatbot } = data;
  const displayListing = listing || DEMO_LISTING;
  const botName = chatbot?.bot_name || `${lo.name.split(' ')[0]}'s Finance Assistant`;
  const greeting = chatbot?.greeting || `Hi! I'm ${lo.name}'s AI assistant. Ask me anything about financing this home — rates, payments, programs, whatever's on your mind.`;
  const brandColor = lo.brandColor || '#2563eb';

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Invitation Banner ── */}
      <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {lo.headshotUrl
            ? <img src={lo.headshotUrl} alt={lo.name} className="w-9 h-9 rounded-full object-cover border-2 border-white/20 flex-shrink-0" />
            : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: brandColor }}>{lo.name[0]}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              <span className="text-slate-300">{lo.name}</span>
              <span className="text-slate-500 mx-1">·</span>
              <span className="text-slate-400 text-xs">{lo.company}</span>
            </p>
            <p className="text-xs text-slate-400 leading-tight">built this for your listings. The chatbot is live — try it. 👇</p>
          </div>
          <button
            onClick={() => navigate(`/agent/claim/${token}`)}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all shadow-sm hover:brightness-110"
            style={{ background: brandColor }}
          >
            Get This on My Listings →
          </button>
        </div>
      </div>

      {/* ── Main layout: listing + chat ── */}
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 items-start">

        {/* Left — listing detail */}
        <div className="w-full lg:flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <ListingHero listing={displayListing} />

          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">{displayListing.description}</p>

            {/* Mortgage estimate teaser */}
            <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Est. Monthly Payment</p>
                  <p className="text-2xl font-black text-emerald-800">
                    ${Math.round((displayListing.price * 0.8 * 0.00716)).toLocaleString()}<span className="text-base font-semibold text-emerald-600">/mo</span>
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">20% down · 30yr fixed · est. 7.1% rate</p>
                </div>
                <button
                  onClick={() => setChatOpen(true)}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all shadow-sm hover:brightness-110"
                  style={{ background: brandColor }}
                >
                  Ask About Rates
                </button>
              </div>
            </div>

            {/* LO contact card */}
            <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              {lo.headshotUrl
                ? <img src={lo.headshotUrl} alt={lo.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 flex-shrink-0" />
                : <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ background: brandColor }}>{lo.name[0]}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{lo.name}</p>
                <p className="text-sm text-slate-500">{lo.company}</p>
                {lo.email && <p className="text-xs text-slate-400 truncate">{lo.email}</p>}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {lo.phone && (
                  <a href={`tel:${lo.phone}`} className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                    📞 Call
                  </a>
                )}
                {lo.email && (
                  <a href={`mailto:${lo.email}`} className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                    ✉️ Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right — live chat (always visible on desktop, toggle on mobile) */}
        <div className="w-full lg:w-[380px] lg:sticky lg:top-[72px]">
          {/* Mobile chat toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="w-full flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-emerald-800 text-sm">{botName} — Ask anything about financing</span>
              </div>
              <span className="material-symbols-outlined text-emerald-600">{chatOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>

          <div className={`rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white ${chatOpen ? 'block' : 'hidden'} lg:block`} style={{ height: '520px' }}>
            <LiveChat
              lo={lo}
              listingId={displayListing.id}
              botName={botName}
              greeting={greeting}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="rounded-2xl p-8 text-center shadow-sm" style={{ background: `linear-gradient(135deg, ${brandColor}15, ${brandColor}08)`, border: `1px solid ${brandColor}30` }}>
          <p className="text-xl font-black text-slate-900 mb-2">Want this on every one of your listings?</p>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            {lo.name.split(' ')[0]} will power your listings with AI — buyers get instant answers to financing questions, and you get warm leads automatically.
          </p>
          <button
            onClick={() => navigate(`/agent/claim/${token}`)}
            className="rounded-xl px-8 py-4 text-base font-bold text-white shadow-md hover:brightness-110 transition-all"
            style={{ background: brandColor }}
          >
            Accept Partnership & Claim Your Account →
          </button>
          <p className="text-xs text-slate-400 mt-3">Free to agents · Powered by {lo.company}</p>
        </div>
      </div>
    </div>
  );
};

export default PartnerInvitePage;
