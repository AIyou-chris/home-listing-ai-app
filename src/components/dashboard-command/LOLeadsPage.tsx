import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageGuide from './PageGuide';
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { deleteLoTestLead, markLoLeadContacted, setLoLeadFollowUp } from '../../services/loLeads';
import { CallTextButtons, WaitingBadge } from './LeadActions';
import { showToast } from '../../utils/toastService';
import { LoPageHeader, LoTag, LoIcon, loCard, loSolid, loGhost, loInput } from './loUi';

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
  followUpAt?: string | null;
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
    id: '1', name: 'Jordan Kim', email: 'jordan@email.com', phone: '(512) 900-4421', source: 'chatbot', sourceType: null,
    notes: 'Asked about pre-approval', status: 'New', intent_level: 'Hot', intent_reason: 'Asked about pre-approval and wants to tour this weekend.',
    listing_id: 'l1', listing_address: '4821 Ridgecrest Dr, Austin TX', agent_name: 'Jennifer Walsh', isTest: false, callId: null,
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    followUpAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2', name: 'Maria Santos', email: 'maria@email.com', phone: '(737) 214-8830', source: 'chatbot', sourceType: null,
    notes: 'Asked for a showing', status: 'New', intent_level: 'Warm', intent_reason: 'Asked to see the home.',
    listing_id: 'l2', listing_address: '2203 Barton Hills Dr, Austin TX', agent_name: 'Jennifer Walsh', isTest: false, callId: null,
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: '3', name: 'Derek Okafor', email: 'derek@email.com', phone: null, source: 'chatbot', sourceType: null,
    notes: 'Asked about pre-approval', status: 'Contacted', intent_level: 'Warm', intent_reason: 'Asked about pre-approval.',
    listing_id: 'l1', listing_address: '4821 Ridgecrest Dr, Austin TX', agent_name: 'Jennifer Walsh', isTest: false, callId: null,
    created_at: new Date(Date.now() - 180 * 60000).toISOString(),
  },
  {
    id: '4', name: 'Ashley Chen', email: 'ashley@email.com', phone: '(512) 771-0033', source: 'chatbot', sourceType: null,
    notes: 'Asked about pre-approval', status: 'New', intent_level: 'Hot', intent_reason: 'Asked about pre-approval and monthly payment.',
    listing_id: 'l3', listing_address: '918 Zilker Park Ln, Austin TX', agent_name: 'Jennifer Walsh', isTest: false, callId: null,
    created_at: new Date(Date.now() - 300 * 60000).toISOString(),
  },
  {
    id: '5', name: 'Tom Rivera', email: 'tom@email.com', phone: null, source: 'chatbot', sourceType: null,
    notes: 'General info', status: 'Contacted', intent_level: 'Cold', intent_reason: 'General questions about the area.',
    listing_id: 'l2', listing_address: '2203 Barton Hills Dr, Austin TX', agent_name: 'Jennifer Walsh', isTest: false, callId: null,
    created_at: new Date(Date.now() - 1440 * 60000).toISOString(),
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

  const [followUpAt, setFollowUpAt] = useState<string | null>(lead.followUpAt ?? null);
  useEffect(() => { setFollowUpAt(lead.followUpAt ?? null); }, [lead.followUpAt]);
  const chooseFollowUp = async (days: number | null) => {
    if (demo) { setFollowUpAt(days ? new Date(Date.now() + days * 86400000).toISOString() : null); return; }
    const r = await setLoLeadFollowUp(lead.id, days);
    if (r === false) { showToast.error('Could not set the reminder.'); return; }
    setFollowUpAt(r);
    showToast.success(days ? 'Reminder set. It will show on Today.' : 'Reminder cleared.');
  };

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

  const initials = (lead.name || lead.email || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const statusTone = ({ New: 'blue', Contacted: 'amber', Qualified: 'slate', Closed: 'green' } as const)[status] || 'slate';
  const question = lead.notes || lead.intent_reason || null;
  const chip = 'min-h-[44px] rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-primary-500 hover:text-primary-700';

  return (
    <div id={`lead-${lead.id}`} className={`${loCard} ${expanded ? 'border-primary-300' : ''}`}>
      {/* Who */}
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${lead.intent_level === 'Hot' ? 'bg-rose-100 text-rose-800' : 'bg-primary-50 text-primary-800'}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="break-words text-base font-extrabold text-slate-900">{displayName}</p>
            <LoTag tone={statusTone}>{status}</LoTag>
            {lead.isTest && <LoTag tone="slate">Test</LoTag>}
            {lead.intent_level === 'Hot' && <LoTag tone="red">🔥 Hot</LoTag>}
            {lead.intent_level === 'Warm' && <LoTag tone="amber">Warm</LoTag>}
            {lead.intent_level === 'Cold' && <LoTag tone="slate">Cold</LoTag>}
            <WaitingBadge lead={{ status, created_at: lead.created_at, intent_level: lead.intent_level }} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
            Source: <LoTag><LoIcon name={src.icon} className="mr-1 text-sm" />{src.label}</LoTag>
            <span className="text-xs text-slate-600">· {timeAgo(lead.created_at)}</span>
          </p>
          {lead.listing_address && (
            <p className="mt-1 text-xs text-slate-600">
              <LoIcon name="home_pin" className="mr-0.5 align-middle text-sm" />
              {lead.listing_address}{lead.agent_name ? ` · ${lead.agent_name}'s listing` : ''}
            </p>
          )}
        </div>
      </div>

      {/* The question */}
      {question && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">{isPhoneLead ? 'Call summary' : 'Borrower question'}</p>
          <blockquote className="rounded-xl border-l-4 border-primary-300 bg-slate-50 px-4 py-3 text-sm text-slate-800">“{question}”</blockquote>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onToggle} aria-expanded={expanded} className={loSolid}>
          <LoIcon name={expanded ? 'expand_less' : 'bolt'} className="text-lg" />
          Follow up
        </button>
        {lead.phone && <CallTextButtons phone={lead.phone} big onUsed={handleReached} />}
        {!lead.phone && lead.email && (
          <a href={`mailto:${lead.email}`} onClick={handleReached} className={loGhost}>
            <LoIcon name="mail" className="text-lg" /> Email
          </a>
        )}
        {followUpAt && <LoTag tone="amber">Reminder: {new Date(followUpAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</LoTag>}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Not ready yet? Remind me to check back</p>
            <div className="flex flex-wrap items-center gap-2">
              {[{ d: 7, l: '1 week' }, { d: 30, l: '1 month' }, { d: 90, l: '3 months' }, { d: 180, l: '6 months' }].map((o) => (
                <button key={o.d} type="button" onClick={() => void chooseFollowUp(o.d)} className={chip}>{o.l}</button>
              ))}
              {followUpAt && <button type="button" onClick={() => void chooseFollowUp(null)} className="min-h-[44px] px-2 text-sm font-semibold text-slate-700 underline">Clear</button>}
            </div>
            {followUpAt && <p className="mt-2 text-sm font-semibold text-amber-900">Reminder: {new Date(followUpAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Pipeline status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => void handleStatusChange(opt.value)}
                  disabled={updatingStatus}
                  className={`min-h-[44px] rounded-full px-4 text-sm font-bold transition ${
                    status === opt.value
                      ? `${opt.color} ring-2 ring-current ring-offset-1`
                      : `border border-slate-300 bg-white text-slate-700 ${opt.hover}`
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {lead.phone && !lead.isTest && (
              <button type="button" onClick={() => onBook(lead)} className={loGhost}>
                <LoIcon name="event" className="text-lg" /> Book a call
              </button>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className={loGhost}>
                <LoIcon name="mail" className="text-lg text-primary-600" />{lead.email}
              </a>
            )}
            {lead.phone && (
              <button onClick={() => setShowSms(v => !v)} aria-expanded={showSms} className={loGhost}>
                <LoIcon name="sms" className="text-lg" />
                Send a text from here
              </button>
            )}
          </div>

          {lead.phone && showSms && (
            <div className="space-y-2 rounded-xl border border-primary-200 bg-primary-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary-800">Text {firstName}</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEXTS.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setSmsText(t.replace('{name}', firstName))}
                    className="min-h-[44px] rounded-xl border border-primary-200 bg-white px-3 text-sm font-semibold text-primary-800 hover:bg-primary-100"
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
                className={`${loInput} resize-none`}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs ${smsText.length > 160 ? 'font-semibold text-red-700' : 'text-slate-600'}`}>
                  {smsText.length}/160{smsText.length > 160 ? ' · sends as 2 texts' : ''}
                </span>
                <button
                  onClick={() => void handleSendSms()}
                  disabled={sending || !smsText.trim() || sent}
                  className={loSolid}
                >
                  <LoIcon name={sent ? 'check_circle' : 'send'} className="text-lg" />
                  {sending ? 'Sending…' : sent ? 'Sent!' : 'Send text'}
                </button>
              </div>
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
                className={loGhost}
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
                        <div key={msg.id} className={`rounded-xl px-3 py-2 text-sm ${msg.sender === 'visitor' ? 'bg-primary-50 text-slate-900' : 'border border-slate-200 bg-white text-slate-800'}`}>
                          <p>{msg.text}</p>
                          <p className="mt-1 text-xs opacity-80">
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
            <button onClick={() => void handleDeleteTest()} className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-300 bg-white px-4 text-sm font-bold text-rose-800 hover:bg-rose-50">
              Delete test lead
            </button>
          )}

          <p className="text-xs text-slate-600">Submitted {new Date(lead.created_at).toLocaleString()}</p>
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
    followUpAt: (l.followUpAt as string) || null,
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

  const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
  const dueNow = leads.filter((l) => l.followUpAt && new Date(l.followUpAt).getTime() <= endToday.getTime());
  const moveReminder = async (l: Lead, days: number | null) => {
    if (demoMode) { setLeads((prev) => prev.map((x) => x.id === l.id ? { ...x, followUpAt: days ? new Date(Date.now() + days * 86400000).toISOString() : null } : x)); return; }
    const r = await setLoLeadFollowUp(l.id, days);
    if (r === false) { showToast.error('Could not update the reminder.'); return; }
    setLeads((prev) => prev.map((x) => x.id === l.id ? { ...x, followUpAt: r } : x));
  };

  const filtering = filter !== 'all' || search.trim().length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 pb-28 pt-6 sm:pt-8">
      <LoPageHeader
        title="Leads"
        subtitle="See new borrower conversations, questions, and next steps."
        action={!demoMode ? (
          <button onClick={() => void exportCsv()} className={`${loGhost} mr-10`}>
            <LoIcon name="download" className="text-lg" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        ) : undefined}
      />
      <button
        onClick={() => navigate(buildDashboardPath('/lo-appointments', demoMode))}
        className="-mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary-700 underline"
      >
        See showings and appointments
      </button>

      <PageGuide pageKey="lo-leads" />

      {dueNow.length > 0 && (
        <section className="rounded-2xl border border-primary-200 bg-primary-50 p-4 shadow-sm" aria-label="Follow-ups for today">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary-700">event_available</span>
            <h2 className="text-lg font-extrabold text-slate-900">Today</h2>
            <span className="text-sm text-slate-700">{dueNow.length} follow-up reminder{dueNow.length === 1 ? '' : 's'} for today</span>
          </div>
          <ul className="mt-3 space-y-2">
            {dueNow.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-extrabold text-primary-800">{(l.name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
                <div className="min-w-0 flex-1 basis-40"><p className="text-sm font-extrabold text-slate-900">Follow up with {l.name || 'this buyer'}</p><p className="text-xs text-slate-600">You set a reminder to check back.</p></div>
                <button type="button" onClick={() => void moveReminder(l, 3)} className={loGhost}>Later</button>
                <button type="button" onClick={() => void moveReminder(l, null)} className={loSolid}><span aria-hidden="true" className="material-symbols-outlined text-base">check</span>Done</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filters + search */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter leads">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`min-h-[44px] rounded-full px-4 text-sm font-bold transition ${
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
          className={loInput}
        />
      </div>

      {/* List */}
      {loading && leads.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : loadFailed ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          We couldn't load your leads just now.{' '}
          <button onClick={() => void load(search, filter)} className="font-bold underline">Try again</button>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600" aria-hidden="true">person_search</span>
          <p className="mt-3 text-sm font-semibold text-slate-700">{filtering ? 'No leads match that' : 'No leads yet'}</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-600">
            {filtering
              ? 'Try a different filter, name, email or phone number.'
              : 'Buyers who use your AI chat, call your AI number or fill in the pre-approval form land here. Partner with an agent to get in front of more of them.'}
          </p>
          {!filtering && (
            <button
              onClick={() => navigate(buildDashboardPath('/lo-partners', demoMode))}
              className={`${loSolid} mt-4`}
            >
              Send a WOW link to an agent
            </button>
          )}
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
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
              className={`${loGhost} w-full`}
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
