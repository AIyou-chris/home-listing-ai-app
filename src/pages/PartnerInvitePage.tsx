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

interface AgentInfo {
  name: string | null;
  company: string | null;
  headshotUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

interface ScheduleRow {
  label: string;
  payment: string;
}

interface InviteData {
  token: string;
  agent?: AgentInfo;
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
  schedule?: ScheduleRow[];
}

// Colors: agent = blue, loan officer = green (same everywhere in the app).
const BLUE = '#1d4ed8';
const GREEN = '#146c36';
const HI = 'inset 0 1px 0 rgba(255,255,255,0.95)';

// Illustrative principal + interest at a fixed example rate. Real numbers come from the LO.
const EXAMPLE_RATE = 0.071;
const monthlyPI = (price: number, downPct: number) => {
  const loan = price * (1 - downPct);
  const r = EXAMPLE_RATE / 12;
  const n = 360;
  return (loan * r) / (1 - Math.pow(1 + r, -n));
};
const buildExampleSchedule = (price: number): ScheduleRow[] =>
  [0.1, 0.15, 0.2].map(d => ({
    label: `${Math.round(d * 100)}% down`,
    payment: `$${Math.round(monthlyPI(price, d)).toLocaleString('en-US')} /mo`
  }));

const downloadSchedule = (rows: ScheduleRow[], address: string) => {
  const csv = ['Down payment,Estimated monthly payment (principal and interest)', ...rows.map(r => `"${r.label}","${r.payment}"`), `"Example only: ${(EXAMPLE_RATE * 100).toFixed(1)}% rate, 30-year term, principal and interest only. Not a quote.",""`].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `payment-schedule-${address.split(',')[0].replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Headshot: the photo when we have one, a clean silhouette when we don't.
const Headshot: React.FC<{ url?: string | null; name: string; size: number; bg: string; ring?: boolean }> = ({ url, name, size, bg, ring }) => (
  <div
    className="flex-shrink-0 overflow-hidden rounded-full"
    style={{ width: size, height: size, background: bg, border: ring ? '2px solid rgba(255,255,255,0.9)' : undefined }}
  >
    {url
      ? <img src={url} alt={name} className="h-full w-full object-cover" />
      : (
        <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="19" r="8.5" fill="#fff" opacity="0.92" />
          <path d="M6 48c0-11 8-17 18-17s18 6 18 17z" fill="#fff" opacity="0.92" />
        </svg>
      )}
  </div>
);

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

// ─── Chat Component (Financing / Pre-Approval) ─────────────────────────────────

const SCHEDULE_PROMPT = 'Show me the payment schedule';
const FINANCING_QUESTIONS = [
  SCHEDULE_PROMPT,
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
  price: number;
  address: string;
  schedule: ScheduleRow[] | null;
}> = ({ lo, listingId, botName, greeting, price, address, schedule }) => {
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

    // Payment schedule: show the LO's schedule as a card with a download button
    if (clean === SCHEDULE_PROMPT && ((schedule && schedule.length) || lo.id === 'demo-lo')) {
      const rows = schedule && schedule.length ? schedule : buildExampleSchedule(price);
      await new Promise(r => setTimeout(r, 500));
      const note = schedule && schedule.length
        ? 'Here is the payment schedule for this home.'
        : `Example only: principal and interest at ${(EXAMPLE_RATE * 100).toFixed(1)}% over 30 years. Not a quote.`;
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: note, schedule: rows }]);
      setSending(false);
      return;
    }

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
      <div className="flex items-center gap-3 py-3 pl-4 pr-14 border-b border-emerald-100" style={{ background: GREEN }}>
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
                ? 'bg-blue-700 text-white rounded-br-sm'
                : 'bg-emerald-50 text-slate-800 border border-emerald-100 rounded-bl-sm'
            }`}>
              {msg.text}
              {msg.schedule && (
                <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="px-3 py-2 text-[11px] font-extrabold tracking-widest text-white" style={{ background: GREEN }}>PAYMENT SCHEDULE</div>
                  {msg.schedule.map(r => (
                    <div key={r.label} className="flex justify-between border-b border-slate-100 px-3 py-2 text-[13px]">
                      <span className="font-semibold text-slate-600">{r.label}</span>
                      <span className="font-extrabold text-slate-900">{r.payment}</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => downloadSchedule(msg.schedule || [], address)}
                    className="flex w-full items-center justify-center gap-1.5 bg-emerald-50 py-2.5 text-[13px] font-extrabold text-emerald-800"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>Download schedule
                  </button>
                </div>
              )}
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
          style={{ background: GREEN }}
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

const PropertyChat: React.FC<{ listing: ListingInfo; agentName: string }> = ({ listing, agentName }) => {
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
      <div className="flex items-center gap-3 border-b border-slate-100 py-3 pl-4 pr-14 text-white" style={{ background: BLUE }}>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20"><span className="material-symbols-outlined text-[20px] text-white">home</span></div>
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
        <button onClick={() => send(input)} disabled={!input.trim() || sending} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:opacity-40" style={{ background: BLUE }}>
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </div>
    </div>
  );
};

// ─── Glass tab bar ─────────────────────────────────────────────────────────────

type Sheet = 'home' | 'loan' | 'contact' | 'tour' | 'how' | null;


// Tour booking: pick a day and a time, leave a name and number. On the demo and on
// unclaimed invites this is a preview of what buyers will see; it saves nothing.
const TOUR_TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const tourStart = (day: Date, time: string) => {
  const [hm, ap] = time.split(' ');
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(day);
  d.setHours((h % 12) + (ap === 'PM' ? 12 : 0), m, 0, 0);
  return d;
};

const downloadTourIcs = (start: Date, address: string, agentName: string) => {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HomeListingAI//Tour//EN', 'BEGIN:VEVENT',
    `UID:tour-${start.getTime()}@homelistingai.com`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:Home tour with ${agentName}`, `LOCATION:${address.replace(/[,;]/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'home-tour.ics';
  a.click();
  URL.revokeObjectURL(url);
};

const TourSheet: React.FC<{ address: string; agentName: string; agentFirst: string; preview: boolean }> = ({ address, agentName, agentFirst, preview }) => {
  const days = React.useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); d.setHours(0, 0, 0, 0); return d; }), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [who, setWho] = useState('');
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState<Date | null>(null);
  const ready = !!time && who.trim().length > 1 && phone.replace(/\D/g, '').length >= 10;
  const fieldCls = 'w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 text-[15px] text-slate-900 outline-none focus:border-blue-500';

  if (done) {
    return (
      <div className="px-5 pb-6 pt-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ background: BLUE }}>
          <span className="material-symbols-outlined">event_available</span>
        </div>
        <h2 className="mt-3 text-[20px] font-black text-slate-900">Tour requested</h2>
        <p className="mt-1 text-[15px] text-slate-600">{done.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {done.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
        <p className="mt-1 text-[13px] text-slate-500">{address}</p>
        <button type="button" onClick={() => downloadTourIcs(done, address, agentName)} className="mt-4 w-full rounded-2xl py-3.5 text-[16px] font-extrabold text-white" style={{ background: `linear-gradient(180deg,#3b73f0,${BLUE})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 18px rgba(29,78,216,0.32)' }}>
          Add to my calendar
        </button>
        <p className="mt-3 text-[12px] leading-relaxed text-slate-500">{preview ? `Preview only. Once ${agentFirst} claims the free account, this lands on their calendar and they get a text.` : `${agentFirst} will confirm by text.`}</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-6 pt-3">
      <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: BLUE }}>Book a tour</p>
      <h2 className="mt-1 pr-8 text-[19px] font-black leading-snug text-slate-900">Pick a day and time</h2>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((d, i) => (
          <button key={i} type="button" onClick={() => setDayIdx(i)} className="flex h-16 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl text-[12px] font-bold"
            style={i === dayIdx ? { background: BLUE, color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' } : { background: 'rgba(37,99,235,0.08)', color: BLUE }}>
            <span>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <span className="text-[20px] font-black leading-none">{d.getDate()}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {TOUR_TIMES.map(t => (
          <button key={t} type="button" onClick={() => setTime(t)} className="rounded-xl py-2.5 text-[13px] font-bold"
            style={t === time ? { background: BLUE, color: '#fff' } : { background: 'rgba(37,99,235,0.08)', color: BLUE }}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <input className={fieldCls} placeholder="Your name" value={who} onChange={e => setWho(e.target.value)} autoComplete="name" />
        <input className={fieldCls} placeholder="Your phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" />
      </div>
      <button type="button" disabled={!ready} onClick={() => time && setDone(tourStart(days[dayIdx], time))} className="mt-4 w-full rounded-2xl py-3.5 text-[16px] font-extrabold text-white disabled:opacity-40"
        style={{ background: `linear-gradient(180deg,#3b73f0,${BLUE})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 18px rgba(29,78,216,0.32)' }}>
        Request this tour
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-500">{preview ? 'Preview of what buyers will see.' : `${agentFirst} confirms by text.`}</p>
    </div>
  );
};

const GlassTabBar: React.FC<{ onHome: () => void; onTour: () => void; onContact: () => void }> = ({ onHome, onTour, onContact }) => {
  const tabs = [
    { key: 'home', icon: 'home', label: 'Home', color: BLUE, rgb: '37,99,235', on: true, onClick: onHome },
    { key: 'tour', icon: 'pin_drop', label: 'Tour the Home', color: '#c2410c', rgb: '234,88,12', on: false, onClick: onTour },
    { key: 'contact', icon: 'call', label: 'Contact', color: '#6d28d9', rgb: '109,40,217', on: false, onClick: onContact },
  ];
  return (
    <div
      className="absolute left-3.5 right-3.5 z-30 flex rounded-[34px] px-1.5 pb-[7px] pt-2"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 18px)',
        background: 'rgba(255,255,255,0.58)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.85)',
        boxShadow: `${HI}, inset 0 -1px 0 rgba(255,255,255,0.4), 0 12px 32px rgba(30,45,100,0.22)`,
      }}
    >
      {tabs.map(t => (
        <button key={t.key} type="button" onClick={t.onClick} aria-label={t.label} className="flex flex-1 flex-col items-center gap-[3px]" style={{ color: t.color }}>
          <span
            className="flex h-8 w-16 items-center justify-center rounded-2xl"
            style={{
              background: `linear-gradient(160deg, rgba(255,255,255,0.75), rgba(${t.rgb},${t.on ? 0.45 : 0.3}))`,
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow: `${HI}, 0 4px 10px rgba(${t.rgb},0.22)`,
            }}
          >
            <span className="material-symbols-outlined text-[24px]">{t.icon}</span>
          </span>
          <span className="text-[12px] font-extrabold">{t.label}</span>
        </button>
      ))}
    </div>
  );
};

// ─── Sheets ────────────────────────────────────────────────────────────────────

const SheetShell: React.FC<{ onClose: () => void; full?: boolean; children: React.ReactNode }> = ({ onClose, full, children }) => (
  <>
    <div className="absolute inset-0 z-40 bg-black/40" onClick={onClose} />
    <div
      className="absolute bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden rounded-t-[28px]"
      style={{
        top: full ? 96 : undefined,
        background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: `${HI}, 0 -10px 40px rgba(20,30,70,0.2)`,
        animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="mx-auto mb-2 mt-2.5 h-[5px] w-10 flex-shrink-0 rounded-full bg-slate-300" />
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
      {children}
    </div>
  </>
);

const ContactRow: React.FC<{ icon: string; label: string; value: string; href?: string }> = ({ icon, label, value, href }) => {
  const inner = (
    <>
      <span
        className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.75), rgba(37,99,235,0.38))', border: '1px solid rgba(255,255,255,0.85)', boxShadow: `${HI}, 0 4px 10px rgba(37,99,235,0.22)`, color: BLUE }}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-bold text-slate-500">{label}</span>
        <span className="block truncate text-[16px] font-bold text-slate-900">{value}</span>
      </span>
    </>
  );
  const cls = 'flex items-center gap-3.5 border-b border-slate-200 px-4 py-3';
  return href ? <a href={href} className={cls}>{inner}</a> : <div className={cls}>{inner}</div>;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

// Fire-and-forget engagement event — never blocks the page
const fireInviteEvent = (token: string, event: 'opened' | 'cta_clicked') => {
  if (token === 'demo') return; // never track demo
  fetch(buildApiUrl(`/api/public/partner-invite/${token}/event`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  }).catch(() => { /* silent */ });
};

const DEMO_AGENT: AgentInfo = {
  name: 'Sarah Johnson',
  company: 'Lone Star Realty',
  headshotUrl: null,
  phone: '(512) 555-0147',
  email: 'sarah@lonestarrealty.example',
  website: null,
};

const DEMO_SOCIALS = ['Instagram', 'Facebook', 'LinkedIn'];

const PartnerInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const openedFired = useRef(false);

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

    // Demo mode — bypass API
    if (token === 'demo') {
      setData({
        token: 'demo',
        claimed: false,
        inviteeName: 'Sarah Johnson',
        agent: DEMO_AGENT,
        lo: {
          id: 'demo-lo',
          name: 'Alex Rivera',
          company: 'Summit Mortgage',
          headshotUrl: null,
          brandColor: '#2563eb',
          email: 'alex@summitmortgage.com',
          phone: '(512) 555-0192',
          nmlsNumber: '123456',
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
          // Record first open — fire once, never again
          if (!openedFired.current) {
            openedFired.current = true;
            fireInviteEvent(token, 'opened');
          }
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

  const { lo, listing, chatbot, brand } = data;
  const isDemoToken = token === 'demo';
  const agent: AgentInfo = data.agent || { name: data.inviteeName, company: null, headshotUrl: null, phone: null, email: null, website: null };
  const hasAgentName = Boolean(agent.name?.trim());
  const agentName = hasAgentName ? agent.name!.trim() : 'Your Name Here';
  const agentFirst = hasAgentName ? agentName.split(' ')[0] : 'you';
  const displayListing = listing || DEMO_LISTING;
  const botName = chatbot?.bot_name || `${lo.name.split(' ')[0]}'s Finance Assistant`;
  const greeting = chatbot?.greeting || `Hi! I'm ${lo.name}'s AI mortgage assistant. Ask me anything — how much you can qualify for, pre-approval steps, down payment options, loan programs. I'm here 24/7 and it won't affect your credit.`;
  const officeName = brand?.companyName || lo.company;

  const photos = displayListing.hero_photos.length ? displayListing.hero_photos : DEMO_LISTING.hero_photos;
  const heroPhoto = photos[photoIndex] || photos[0];
  const closeSheet = () => setSheet(null);
  const openHowItWorks = () => { if (token) fireInviteEvent(token, 'cta_clicked'); setSheet('how'); };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${displayListing.address}`, url });
      else await navigator.clipboard.writeText(url);
    } catch { /* cancelled */ }
  };

  const cardShadow = `${HI}, 0 8px 20px rgba(30,45,100,0.22)`;

  return (
    <div className="flex min-h-screen items-center justify-center sm:bg-[#d5d9df] sm:py-6" style={{ WebkitTapHighlightColor: 'transparent' }}>
      {/* Phone frame on desktop, full screen on a real phone */}
      <div className="relative h-[100dvh] w-full max-w-[430px] sm:h-[868px] sm:max-w-[406px] sm:rounded-[58px] sm:bg-[#111113] sm:p-2 sm:shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#e6ecfa] sm:rounded-[50px]">
          <div className="hidden sm:block absolute left-1/2 top-[11px] z-50 h-8 w-[110px] -translate-x-1/2 rounded-2xl bg-black" />

          <div className="flex-1 overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="hidden h-[54px] sm:block" />

            {/* From the loan officer */}
            <div className="flex items-center gap-2.5 px-4 pb-2 pt-3 sm:pt-0">
              <Headshot url={lo.headshotUrl} name={lo.name} size={36} bg={GREEN} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold text-slate-900">From {lo.name}</p>
                <p className="truncate text-[12px] text-slate-500">Made for {agentFirst}{officeName ? ` · ${officeName}` : ''}</p>
              </div>
              <button type="button" onClick={() => void share()} aria-label="Share" className="flex h-9 w-9 items-center justify-center" style={{ color: BLUE }}>
                <span className="material-symbols-outlined text-[22px]">ios_share</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5 px-4 pb-36">
              {/* Listing card: letterboxed photo, price, facts */}
              <div className="overflow-hidden rounded-[20px] bg-white" style={{ border: '1px solid rgba(255,255,255,0.95)', boxShadow: `${HI}, 0 8px 24px rgba(40,60,120,0.10)` }}>
                <div className="relative flex h-[196px] items-center justify-center bg-black">
                  <img src={heroPhoto} alt={displayListing.address} className="h-full w-full object-contain" />
                  {photos.length > 1 && (
                    <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
                      {photos.map((_, i) => (
                        <button key={i} type="button" aria-label={`Photo ${i + 1}`} onClick={() => setPhotoIndex(i)} className={`h-1.5 rounded-full transition-all ${i === photoIndex ? 'w-[18px] bg-white' : 'w-1.5 bg-white/55'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-4 pb-3.5 pt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[28px] font-extrabold tracking-tight text-slate-900">${displayListing.price.toLocaleString()}</p>
                    <p className="text-[13px] font-bold text-slate-500">{displayListing.beds} bd · {displayListing.baths} ba · {displayListing.sqft.toLocaleString()} sqft</p>
                  </div>
                  <p className="text-[14px] text-slate-500">{displayListing.address}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSheet('home')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[16px] font-extrabold text-white"
                style={{ background: `linear-gradient(180deg,#3b73f0,${BLUE})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -3px 8px rgba(0,0,0,0.14), 0 8px 18px rgba(29,78,216,0.32)' }}
              >
                <span className="material-symbols-outlined text-[22px]">chat_bubble</span>Ask this home anything
              </button>

              {/* Listing agent — blue */}
              <div className="flex items-center gap-3 rounded-[20px] px-3.5 py-3 text-white" style={{ background: `linear-gradient(160deg,#3a6cf0,${BLUE})`, border: '1px solid rgba(255,255,255,0.35)', boxShadow: cardShadow }}>
                <Headshot url={agent.headshotUrl} name={agentName} size={52} bg="#6f93f5" ring />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold tracking-widest text-blue-100">LISTING AGENT</p>
                  <p className="truncate text-[17px] font-extrabold">{agentName}</p>
                  {agent.company && <p className="truncate text-[13px] text-blue-100">{agent.company}</p>}
                </div>
                <button type="button" onClick={() => setSheet('contact')} className="rounded-full bg-white/95 px-4 py-2.5 text-[14px] font-extrabold" style={{ color: BLUE, boxShadow: `${HI}, 0 4px 10px rgba(0,0,0,0.18)` }}>
                  Contact
                </button>
              </div>

              {/* Loan officer — green */}
              <div className="flex items-center gap-3 rounded-[20px] px-3.5 py-3 text-white" style={{ background: `linear-gradient(160deg,#1b8346,${GREEN})`, border: '1px solid rgba(255,255,255,0.35)', boxShadow: cardShadow }}>
                <Headshot url={lo.headshotUrl} name={lo.name} size={52} bg="#4aa56b" ring />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold tracking-widest text-emerald-100">LOAN OFFICER</p>
                  <p className="truncate text-[17px] font-extrabold">{lo.name}</p>
                  <p className="truncate text-[13px] text-emerald-100">{[officeName, lo.nmlsNumber ? `NMLS #${lo.nmlsNumber}` : ''].filter(Boolean).join(' · ')}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSheet('loan')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[16px] font-extrabold text-white"
                style={{ background: `linear-gradient(180deg,#1b8346,${GREEN})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -3px 8px rgba(0,0,0,0.14), 0 8px 18px rgba(20,108,54,0.32)' }}
              >
                <span className="material-symbols-outlined text-[22px]">chat_bubble</span>Loan questions
              </button>

              <button type="button" onClick={openHowItWorks} className="mx-auto text-[13px] font-extrabold" style={{ color: BLUE }}>
                Want this on every listing? Make this mine →
              </button>
              <p className="px-2 text-center text-[11px] leading-snug text-slate-600">
                Equal Housing Opportunity. Not a commitment to lend.
              </p>
            </div>
          </div>

          <GlassTabBar onHome={closeSheet} onTour={() => setSheet('tour')} onContact={() => setSheet('contact')} />
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-30 hidden h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-slate-900 sm:block" />

          {/* Ask this home */}
          {sheet === 'home' && (
            <SheetShell onClose={closeSheet} full>
              <div className="min-h-0 flex-1"><PropertyChat listing={displayListing} agentName={agentName} /></div>
            </SheetShell>
          )}

          {/* Loan questions */}
          {sheet === 'loan' && (
            <SheetShell onClose={closeSheet} full>
              <div className="min-h-0 flex-1">
                <LiveChat lo={lo} listingId={displayListing.id} botName={botName} greeting={greeting} price={displayListing.price} address={displayListing.address} schedule={null} />
              </div>
            </SheetShell>
          )}

          {/* Contact + tour */}
          {sheet === 'tour' && (
            <SheetShell onClose={closeSheet}>
              <TourSheet address={displayListing.address} agentName={agentName} agentFirst={agentFirst} preview />
            </SheetShell>
          )}

          {sheet === 'contact' && (
            <SheetShell onClose={closeSheet}>
              <div className="flex items-center gap-3.5 border-b border-slate-200 px-4 pb-3.5 pr-14">
                <Headshot url={agent.headshotUrl} name={agentName} size={56} bg="#2f63e6" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[20px] font-extrabold text-slate-900">{agentName}</p>
                  <p className="truncate text-[14px] text-slate-500">{agent.company || 'Listing agent'}</p>
                </div>
              </div>
              {agent.phone && <ContactRow icon="call" label="Call" value={agent.phone} href={`tel:${agent.phone.replace(/[^+\d]/g, '')}`} />}
              {agent.phone && <ContactRow icon="sms" label="Text" value={agent.phone} href={`sms:${agent.phone.replace(/[^+\d]/g, '')}`} />}
              {agent.email && <ContactRow icon="mail" label="Email" value={agent.email} href={`mailto:${agent.email}`} />}
              {agent.website && <ContactRow icon="language" label="Website" value={agent.website.replace(/^https?:\/\//, '')} href={agent.website.startsWith('http') ? agent.website : `https://${agent.website}`} />}
              {!agent.phone && !agent.email && !agent.website && (
                <p className="px-4 py-5 text-[14px] text-slate-500">Contact details show here once the agent claims the free account.</p>
              )}
              {isDemoToken && (
                <div className="px-4 pb-6 pt-4">
                  <p className="mb-2.5 text-[12px] font-extrabold tracking-widest text-slate-500">FOLLOW</p>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_SOCIALS.map(n => (
                      <span key={n} className="rounded-full px-4 py-2.5 text-[14px] font-extrabold" style={{ background: 'rgba(37,99,235,0.1)', color: BLUE }}>{n}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="pb-5" />
            </SheetShell>
          )}

          {/* How it works */}
          {sheet === 'how' && (
            <SheetShell onClose={closeSheet}>
              <div className="px-6 pb-6 pt-3">
                <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: BLUE }}>How it works</p>
                <h2 className="mt-1.5 pr-8 text-xl font-black leading-snug text-slate-900">Your own AI listing, in 3 steps</h2>
                <div className="mt-4 space-y-4">
                  {[
                    { n: '1', t: 'Claim your free account', d: `${lo.name.split(' ')[0]} already set it up. Just confirm your details.` },
                    { n: '2', t: 'Add your listing', d: 'Drop in the address and photos. The AI reads it and is ready to answer buyers.' },
                    { n: '3', t: 'Share the link', d: 'Buyers get answers 24/7, and the serious ones come to you first.' },
                  ].map(step => (
                    <div key={step.n} className="flex gap-3.5">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: BLUE }}>{step.n}</div>
                      <div>
                        <p className="text-[15px] font-bold text-slate-900">{step.t}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{step.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/agent/claim/${token}`)}
                  className="mt-5 w-full rounded-2xl py-3.5 text-[16px] font-extrabold text-white"
                  style={{ background: `linear-gradient(180deg,#3b73f0,${BLUE})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 18px rgba(29,78,216,0.32)' }}
                >
                  Start free
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-500">Free for agents · Cancel anytime</p>
              </div>
            </SheetShell>
          )}
        </div>
      </div>

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
