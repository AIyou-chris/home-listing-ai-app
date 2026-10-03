import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageGuide from './PageGuide';
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { deleteLoTestLead, markLoLeadContacted } from '../../services/loLeads';
import { CallTextButtons, WaitingBadge } from './LeadActions';
import { showToast } from '../../utils/toastService';

type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Closed';
type Filter = 'all' | 'hot' | 'new' | 'contacted';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  sourceType: string | null;
  notes: string | null;
  status: LeadStatus;
  intent_level: 'Hot' | 'Warm' | 'Cold';
  intent_reason?: string | null;
  listing_id: string | null;
  listing_address: string | null;
  agent_name: string | null;
  isTest: boolean;
  callId: string | null;
  created_at: string;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string; hover: string }[] = [
  { value: 'New', label: 'New', color: 'bg-blue-100 text-blue-800', hover: 'hover:bg-blue-100' },
  { value: 'Contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-900', hover: 'hover:bg-amber-100' },
  { value: 'Qualified', label: 'Qualified', color: 'bg-violet-100 text-violet-800', hover: 'hover:bg-violet-100' },
  { value: 'Closed', label: 'Closed', color: 'bg-emerald-100 text-emerald-800', hover: 'hover:bg-emerald-100' },
];

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hot', label: '🔥 Hot' },
  { key: 'new', label: 'Needs a call' },
  { key: 'contacted', label: 'Contacted' },
];

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

// Where did this lead come from? The channel wins (phone, email, text), then what they asked for.
const sourceLabel = (lead: Pick<Lead, 'source' | 'sourceType'>) => {
  const st = String(lead.sourceType || '').toLowerCase();
  if (st === 'phone') return { label: 'AI call', icon: 'call', color: 'bg-sky-100 text-sky-800' };
  if (st === 'email') return { label: 'Email', icon: 'mail', color: 'bg-slate-100 text-slate-700' };
  if (st === 'sms' || st === 'text') return { label: 'Text', icon: 'sms', color: 'bg-slate-100 text-slate-700' };
  const s = String(lead.source || '').toLowerCase();
  if (s === 'pre_qual' || s === 'pre_approval') return { label: 'Pre-approval', icon: 'verified', color: 'bg-emerald-100 text-emerald-800' };
  if (s === 'showing_request') return { label: 'Showing', icon: 'door_front', color: 'bg-violet-100 text-violet-800' };
  if (s === 'chatbot' || s === 'general_info') return { label: 'Chat', icon: 'chat', color: 'bg-blue-100 text-blue-800' };
  if (s === 'form') return { label: 'Form', icon: 'description', color: 'bg-blue-100 text-blue-800' };
  const pretty = s.replace(/_/g, ' ').trim();
  return { label: pretty ? pretty.charAt(0).toUpperCase() + pretty.slice(1) : 'Lead', icon: 'person', color: 'bg-slate-100 text-slate-700' };
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_LEADS: Lead[] = [
  {
    id: 'demo-1', name: 'Sarah Mitchell', email: 'sarah.m@email.com', phone: '(512) 555-0142', source: 'chatbot', sourceType: null,
    notes: 'Asked about monthly payments on FHA loan', status: 'New', intent_level: 'Hot', intent_reason: 'Asked for a payment estimate and wants to tour this weekend.',
    listing_id: 'demo-listing-1', listing_address: '1280 Sunset Blvd, Santa Monica, CA', agent_name: 'Jennifer Walsh', isTest: false, callId: null,
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'demo-2', name: 'James Torres', email: 'jtorres@gmail.com', phone: '(310) 555-0187', source: 'chatbot', sourceType: 'phone',
    notes: 'Interested in down payment assistance programs', status: 'Contacted', intent_level: 'Warm', intent_reason: 'Called the AI line and asked about down payment help.',
    listing_id: 'demo-listing-1', listing_address: '1280 Sunset Blvd, Santa Monica, CA', agent_name: 'Jennifer Walsh', isTest: false, callId: 'demo-call',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'demo-3', name: 'Priya Nair', email: 'priya.nair@work.com', phone: null, source: 'chatbot', sourceType: null,
    notes: 'Wants to know about VA loan eligibility', status: 'Qualified', intent_level: 'Warm',
    listing_id: 'demo-listing-2', listing_address: '742 Evergreen Terrace, Springfield, IL', agent_name: 'Marcus Lee', isTest: false, callId: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

// ─── Lead card ────────────────────────────────────────────────────────────────

const QUICK_TEXTS = [
  'Hi {name}, thanks for your interest! I would love to walk you through your financing options. When is a good time to chat?',
  'Hi {name}! I saw you had some questions about the home. Call or text me anytime and I will help.',
  'Hey {name}, following up from the listing page. I have some loan options that could work for you. Want to talk?',
];

const LeadCard: React.FC<{
  lead: Lead;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onRemoved: (id: string) => void;
  onBook: (lead: Lead) => void;
  demo?: boolean;
}> = ({ lead, expanded, onToggle, onStatusChange, onRemoved, onBook, demo = false }) => {
  const src = sourceLabel(lead);
  const displayName = lead.name || lead.email || 'Unknown visitor';
  const firstName = lead.name ? lead.name.split(' ')[0] : 'there';
  const isPhoneLead = String(lead.sourceType || '').toLowerCase() === 'phone';

  const [status, setStatus] = useState<LeadStatus>(lead.status || 'New');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [convLoading, setConvLoading] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [convMessages, setConvMessages] = useState<Array<{ id: string; sender: string; text: string; created_at: string }>>([]);

  // Keep the badge honest when the list is refreshed from the server.
  useEffect(() => { setStatus(lead.status || 'New'); }, [lead.status]);

  const canShowConversation = !demo && lead.source !== 'pre_qual';

  const loadConversation = async () => {
    setConvLoading(true);
    setConvError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/lo/leads/${lead.id}/conversation`), { headers: await authHeaders(null) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'fetch_failed');
      setConvMessages(data.messages || []);
    } catch {
      setConvError('Could not load the conversation.');
    } finally {
      setConvLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (newStatus === status) return;
    setUpdatingStatus(true);
    try {
      if (!demo) {
        const res = await fetch(buildApiUrl(`/api/lo/leads/${lead.id}/status`), {
          method: 'PATCH',
          headers: await authHeaders(null),
          body: JSON.stringify({ status: newStatus }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 409 && json.error === 'legacy_pre_qual_no_status') {
          showToast.error('This older pre-approval can’t be moved through the pipeline.');
          return;
        }
        if (!res.ok) throw new Error(json.error || 'update_failed');
      }
      setStatus(newStatus);
      onStatusChange(lead.id, newStatus);
    } catch {
      showToast.error('Could not update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Tapping Call or Text means the lead is no longer waiting.
  const handleReached = () => {
    if (String(status).toLowerCase() !== 'new') return;
    setStatus('Contacted');
    onStatusChange(lead.id, 'Contacted');
    if (!demo && !lead.isTest) void markLoLeadContacted(lead.id);
  };

  const handleSendSms = async () => {
    if (!smsText.trim()) return;
    setSending(true);
    try {
      if (demo) {
        await new Promise(r => setTimeout(r, 700));
      } else {
        const res = await fetch(buildApiUrl(`/api/lo/leads/${lead.id}/sms`), {
          method: 'POST',
          headers: await authHeaders(null),
          body: JSON.stringify({ message: smsText.trim() })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (json.error === 'lead_opted_out') { showToast.error(`${firstName} replied STOP, so we can’t text them.`); return; }
          throw new Error(json.error || 'send_failed');
        }
      }
      setSent(true);
      handleReached();
      showToast.success(`Text sent to ${firstName}!`);
      setTimeout(() => { setSent(false); setShowSms(false); setSmsText(''); }, 2500);
    } catch {
      showToast.error('Could not send text. Check the number and try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteTest = async () => {
    if (demo) { onRemoved(lead.id); return; }
    if (await deleteLoTestLead(lead.id)) { onRemoved(lead.id); showToast.success('Test lead deleted.'); }
    else showToast.error('Could not delete the test lead.');
  };

  return (
    <div id={`lead-${lead.id}`} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${expanded ? 'border-primary-300' : 'border-slate-200'}`}>
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${lead.intent_level === 'Hot' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
            {lead.isTest && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">Test</span>}
            {lead.intent_level === 'Hot' && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-rose-800">🔥 Hot</span>}
            {lead.intent_level === 'Warm' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-900">Warm</span>}
            {lead.intent_level === 'Cold' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-slate-700">Cold</span>}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${src.color}`}>
              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{src.icon}</span>{src.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-700'}`}>{status}</span>
            <WaitingBadge lead={{ status, created_at: lead.created_at, intent_level: lead.intent_level }} />
          </div>
          {lead.intent_reason && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{lead.intent_reason}</p>
          )}
          {lead.listing_address && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              <span className="material-symbols-outlined mr-0.5 align-middle text-[12px]" aria-hidden="true">home_pin</span>
              {lead.listing_address}{lead.agent_name ? ` · ${lead.agent_name}'s listing` : ''}
            </p>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 pt-0.5 text-right">
          <span className="whitespace-nowrap text-xs text-slate-500">{timeAgo(lead.created_at)}</span>
          <span className={`material-symbols-outlined text-base text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">expand_more</span>
        </div>
      </button>

      {/* One-tap actions, always visible */}
      {(lead.phone || lead.email) && (
        <div className="flex flex-wrap gap-2 px-4 pb-3 pl-[68px]">
          {lead.phone && <CallTextButtons phone={lead.phone} onUsed={handleReached} />}
          {lead.phone && !lead.isTest && (
            <button
              type="button"
              onClick={() => onBook(lead)}
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">event</span> Book a call
            </button>
          )}
          {!lead.phone && lead.email && (
            <a href={`mailto:${lead.email}`} onClick={handleReached} className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">mail</span> Email
            </a>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Pipeline status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => void handleStatusChange(opt.value)}
                  disabled={updatingStatus}
                  className={`min-h-[36px] rounded-full px-3.5 text-xs font-bold transition ${
                    status === opt.value
                      ? `${opt.color} ring-2 ring-current ring-offset-1`
                      : `border border-slate-200 bg-white text-slate-600 ${opt.hover}`
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <span className="material-symbols-outlined text-sm text-primary-600" aria-hidden="true">mail</span>{lead.email}
              </a>
            )}
            {lead.phone && (
              <button
                onClick={() => setShowSms(v => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  showSms ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">sms</span>
                Send a text from here
              </button>
            )}
          </div>

          {lead.phone && showSms && (
            <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Text {firstName}</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEXTS.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setSmsText(t.replace('{name}', firstName))}
                    className="min-h-[32px] rounded-lg border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                  >
                    Quick {i + 1}
                  </button>
                ))}
              </div>
              <textarea
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
                placeholder={`Hi ${firstName}…`}
                rows={3}
                aria-label={`Text message to ${firstName}`}
                className="w-full resize-none rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs ${smsText.length > 160 ? 'font-semibold text-red-700' : 'text-slate-600'}`}>
                  {smsText.length}/160{smsText.length > 160 ? ' · sends as 2 texts' : ''}
                </span>
                <button
                  onClick={() => void handleSendSms()}
                  disabled={sending || !smsText.trim() || sent}
                  className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-violet-700 px-4 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">{sent ? 'check_circle' : 'send'}</span>
                  {sending ? 'Sending…' : sent ? 'Sent!' : 'Send text'}
                </button>
              </div>
            </div>
          )}

          {lead.notes && (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{isPhoneLead ? 'Call summary' : 'What they asked'}</p>
              <p className="text-sm text-slate-800">{lead.notes}</p>
            </div>
          )}

          {canShowConversation && (
            <div>
              <button
                type="button"
                onClick={() => {
                  const next = !showConversation;
                  setShowConversation(next);
                  if (next && convMessages.length === 0 && !convLoading) void loadConversation();
                }}
                className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                {showConversation ? 'Hide' : 'View'} {isPhoneLead ? 'call transcript' : 'conversation'}
              </button>
              {showConversation && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                  {convLoading ? (
                    <p className="text-xs text-slate-600">Loading…</p>
                  ) : convError ? (
                    <p className="text-xs text-rose-700">{convError}</p>
                  ) : convMessages.length === 0 ? (
                    <p className="text-xs text-slate-600">Nothing recorded for this lead yet.</p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {convMessages.map((msg) => (
                        <div key={msg.id} className={`rounded-lg px-3 py-2 text-sm ${msg.sender === 'visitor' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                          <p>{msg.text}</p>
                          <p className="mt-1 text-[11px] opacity-80">
                            {msg.sender === 'visitor' ? 'Buyer' : 'Your AI'} · {new Date(msg.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {lead.isTest && (
            <button onClick={() => void handleDeleteTest()} className="min-h-[36px] rounded-lg border border-rose-300 bg-white px-3 text-xs font-bold text-rose-800 hover:bg-rose-50">
              Delete test lead
            </button>
          )}

          <p className="text-[11px] text-slate-500">Submitted {new Date(lead.created_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

const mapRow = (l: Record<string, unknown>, isPreQual: boolean): Lead => {
  const bits = [
    (l.timeline as string) && `Timeline: ${l.timeline}`,
    (l.creditRange as string) && `Credit: ${l.creditRange}`,
    (l.incomeRange as string) && `Income: ${l.incomeRange}`,
    (l.downPayment as string) && `Down: ${l.downPayment}`
  ].filter(Boolean).join(' · ');
  return {
    id: l.id as string,
    name: (l.name as string) || null,
    email: (l.email as string) || null,
    phone: (l.phone as string) || null,
    source: isPreQual ? 'pre_qual' : ((l.context as string) || 'chatbot'),
    sourceType: (l.sourceType as string) || null,
    notes: ((l.notes as string) || bits) || null,
    status: ((l.status as LeadStatus) || 'New'),
    intent_level: (((l.intentLevel as string) || 'Warm') as 'Hot' | 'Warm' | 'Cold'),
    intent_reason: (l.intentReason as string) || null,
    listing_id: (l.listingId as string) || null,
    listing_address: (l.listingAddress as string) || null,
    agent_name: (l.agentName as string) || null,
    isTest: Boolean(l.isTest),
    callId: (l.callId as string) || null,
    created_at: l.createdAt as string,
  };
};

const LOLeadsPage: React.FC = () => {
  const demoMode = useDemoMode();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusLeadId = searchParams.get('lead');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(focusLeadId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestRef = useRef(0);
  const scrolledRef = useRef<string | null>(null);

  const fetchPage = useCallback(async (offset: number, q: string, f: Filter) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (q.trim()) params.set('search', q.trim());
    if (f === 'hot') params.set('intent', 'Hot');
    if (f === 'new') params.set('status', 'New');
    if (f === 'contacted') params.set('status', 'Contacted');
    const res = await fetch(buildApiUrl(`/api/lo/leads?${params.toString()}`), { headers: await authHeaders(null) });
    if (!res.ok) throw new Error('leads_load_failed');
    const data = await res.json();
    if (!data.success) throw new Error('leads_load_failed');
    const rows = [
      ...(data.preQuals || []).map((p: Record<string, unknown>) => mapRow(p, true)),
      ...(data.chatLeads || []).map((l: Record<string, unknown>) => mapRow(l, (l.type as string) === 'pre_qual'))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rows, hasMore: Boolean(data.hasMore), nextOffset: Number(data.nextOffset) || 0 };
  }, []);

  // One loader for first load, search and filters. Only the newest request may update the screen.
  const load = useCallback(async (q: string, f: Filter) => {
    if (demoMode) {
      const demo = DEMO_LEADS.filter((l) => (f === 'hot' ? l.intent_level === 'Hot' : f === 'new' ? l.status === 'New' : f === 'contacted' ? l.status === 'Contacted' : true))
        .filter((l) => !q.trim() || `${l.name} ${l.email} ${l.phone}`.toLowerCase().includes(q.trim().toLowerCase()));
      setLeads(demo);
      setLoading(false);
      return;
    }
    const mine = ++requestRef.current;
    setLoading(true);
    try {
      const page = await fetchPage(0, q, f);
      if (mine !== requestRef.current) return;
      setLeads(page.rows);
      setHasMore(page.hasMore);
      setNextOffset(page.nextOffset);
      setLoadFailed(false);
    } catch {
      if (mine === requestRef.current) setLoadFailed(true);
    } finally {
      if (mine === requestRef.current) setLoading(false);
    }
  }, [demoMode, fetchPage]);

  // Filters load right away; typing waits a moment.
  const firstRun = useRef(true);
  useEffect(() => {
    const wait = firstRun.current || !search ? 0 : 350;
    firstRun.current = false;
    const t = setTimeout(() => { void load(search, filter); }, wait);
    return () => clearTimeout(t);
  }, [search, filter, load]);

  // Arrived from Today with ?lead=<id>: open that lead and bring it into view.
  useEffect(() => {
    if (!focusLeadId || loading || scrolledRef.current === focusLeadId) return;
    const el = document.getElementById(`lead-${focusLeadId}`);
    if (el) {
      scrolledRef.current = focusLeadId;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusLeadId, loading, leads]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextOffset, search, filter);
      setLeads(prev => {
        const seen = new Set(prev.map(l => l.id));
        return [...prev, ...page.rows.filter(r => !seen.has(r.id))];
      });
      setHasMore(page.hasMore);
      setNextOffset(page.nextOffset);
    } catch {
      showToast.error('Could not load more leads.');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (focusLeadId) setSearchParams({}, { replace: true });
  };

  const handleStatusChange = (id: string, status: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const handleRemoved = (id: string) => setLeads(prev => prev.filter(l => l.id !== id));

  const handleBook = (lead: Lead) => {
    const q = new URLSearchParams({ name: lead.name || lead.email || '', kind: 'Borrower Call' });
    if (lead.email) q.set('email', lead.email);
    if (lead.phone) q.set('phone', lead.phone);
    navigate(`${buildDashboardPath('/lo-appointments', demoMode)}?${q.toString()}`);
  };

  const exportCsv = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/lo/leads/export.csv'), { headers: await authHeaders(null) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { showToast.error('Export failed. Try again.'); }
  };

  const filtering = filter !== 'all' || search.trim().length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-28 pt-6 sm:pt-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pr-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">My Leads</h1>
          <p className="mt-1 text-sm text-slate-600">
            Buyers who reached you through your AI chat, your AI phone line or a pre-approval form.
          </p>
        </div>
        {!demoMode && (
          <button
            onClick={() => void exportCsv()}
            className="flex min-h-[40px] flex-shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">download</span>
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        )}
      </div>

      <PageGuide pageKey="lo-leads" />

      {/* Filters + search */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter leads">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`min-h-[40px] rounded-full px-4 text-sm font-bold transition ${
                filter === f.key ? 'bg-primary-600 text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone"
          aria-label="Search leads"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-500"
        />
      </div>

      {/* List */}
      {loading && leads.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : loadFailed ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          We couldn't load your leads just now.{' '}
          <button onClick={() => void load(search, filter)} className="font-bold underline">Try again</button>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-400" aria-hidden="true">person_search</span>
          <p className="mt-3 text-sm font-semibold text-slate-700">{filtering ? 'No leads match that' : 'No leads yet'}</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-600">
            {filtering
              ? 'Try a different filter, name, email or phone number.'
              : 'Buyers who use your AI chat, call your AI number or fill in the pre-approval form land here. Partner with an agent to get in front of more of them.'}
          </p>
          {!filtering && (
            <button
              onClick={() => navigate(buildDashboardPath('/lo-partners', demoMode))}
              className="mt-4 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
            >
              Send a WOW link to an agent
            </button>
          )}
        </div>
      ) : (
        <div className={`space-y-2 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              expanded={expandedId === lead.id}
              onToggle={() => toggle(lead.id)}
              onStatusChange={handleStatusChange}
              onRemoved={handleRemoved}
              onBook={handleBook}
              demo={demoMode}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : 'Load more leads'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LOLeadsPage;
