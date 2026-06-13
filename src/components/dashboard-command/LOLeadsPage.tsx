import React, { useEffect, useState } from 'react';
import PageGuide from './PageGuide';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import { useDemoMode } from '../../demo/useDemoMode';
import { showToast } from '../../utils/toastService';

type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Closed';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  notes: string | null;
  status: LeadStatus;
  intent_level: 'Hot' | 'Warm' | 'Cold';
  listing_id: string | null;
  listing_address: string | null;
  agent_name: string | null;
  created_at: string;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'New', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'Contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-700' },
  { value: 'Qualified', label: 'Qualified', color: 'bg-violet-100 text-violet-700' },
  { value: 'Closed', label: 'Closed', color: 'bg-emerald-100 text-emerald-700' },
];

const getApiHeaders = async (): Promise<HeadersInit> => {
  const { data } = await supabase.auth.getUser();
  return {
    'Content-Type': 'application/json',
    ...(data.user?.id ? { 'x-user-id': data.user.id } : {})
  };
};

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

const sourceLabel = (source: string) => {
  if (source === 'pre_qual') return { label: '🔥 Pre-Qual', color: 'bg-emerald-100 text-emerald-700' };
  if (source === 'chatbot' || source === 'general_info') return { label: '💬 Chat', color: 'bg-blue-100 text-blue-700' };
  if (source === 'pre_approval') return { label: '✅ Pre-Approval', color: 'bg-violet-100 text-violet-700' };
  if (source === 'form') return { label: 'Form', color: 'bg-blue-100 text-blue-700' };
  return { label: source, color: 'bg-slate-100 text-slate-600' };
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_LEADS: Lead[] = [
  {
    id: 'demo-1',
    name: 'Sarah Mitchell',
    email: 'sarah.m@email.com',
    phone: '(512) 555-0142',
    source: 'chatbot',
    notes: 'Asked about monthly payments on FHA loan',
    status: 'New',
    intent_level: 'Hot',
    listing_id: 'demo-listing-1',
    listing_address: '1280 Sunset Blvd, Santa Monica, CA',
    agent_name: 'Jennifer Walsh',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'demo-2',
    name: 'James Torres',
    email: 'jtorres@gmail.com',
    phone: '(310) 555-0187',
    source: 'chatbot',
    notes: 'Interested in down payment assistance programs',
    status: 'Contacted',
    listing_id: 'demo-listing-1',
    listing_address: '1280 Sunset Blvd, Santa Monica, CA',
    agent_name: 'Jennifer Walsh',
    intent_level: 'Warm',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'demo-3',
    name: 'Priya Nair',
    email: 'priya.nair@work.com',
    phone: null,
    source: 'chatbot',
    notes: 'Wants to know about VA loan eligibility',
    status: 'Qualified',
    intent_level: 'Warm',
    listing_id: 'demo-listing-2',
    listing_address: '742 Evergreen Terrace, Springfield, IL',
    agent_name: 'Marcus Lee',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

// ─── Lead card ────────────────────────────────────────────────────────────────

const QUICK_TEXTS = [
  'Hi {name}, this is {lo} — thanks for your interest! Would love to connect and walk you through your financing options. When\'s a good time to chat?',
  'Hi {name}! I saw you had some questions about the listing. I\'d love to help — give me a call or reply here anytime.',
  'Hey {name}, just following up from the listing page. I have some great loan options that might work for you. Let\'s talk!',
];

const LeadCard: React.FC<{ lead: Lead; expanded: boolean; onToggle: () => void; onStatusChange: (id: string, status: LeadStatus) => void; demo?: boolean }> = ({ lead, expanded, onToggle, onStatusChange, demo = false }) => {
  const src = sourceLabel(lead.source);
  const displayName = lead.name || lead.email || 'Unknown visitor';
  const firstName = lead.name ? lead.name.split(' ')[0] : 'there';

  const [status, setStatus] = useState<LeadStatus>(lead.status || 'New');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (newStatus === status) return;
    setUpdatingStatus(true);
    try {
      if (demo) {
        await new Promise(r => setTimeout(r, 300));
        setStatus(newStatus);
        onStatusChange(lead.id, newStatus);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch(buildApiUrl(`/api/lo/leads/${lead.id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'update_failed');
      setStatus(newStatus);
      onStatusChange(lead.id, newStatus);
    } catch {
      showToast.error('Could not update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fillQuickText = (template: string) => {
    setSmsText(template.replace('{name}', firstName).replace('{lo}', 'your loan officer'));
    setShowSms(true);
  };

  const handleSendSms = async () => {
    if (!smsText.trim()) return;
    setSending(true);
    try {
      if (demo) {
        await new Promise(r => setTimeout(r, 700));
        setSent(true);
        showToast.success(`Text sent to ${firstName}!`);
        setTimeout(() => { setSent(false); setShowSms(false); setSmsText(''); }, 2500);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch(buildApiUrl(`/api/lo/leads/${lead.id}/sms`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ message: smsText.trim() })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'send_failed');
      }
      setSent(true);
      showToast.success(`Text sent to ${firstName}!`);
      setTimeout(() => { setSent(false); setShowSms(false); setSmsText(''); }, 2500);
    } catch {
      showToast.error('Could not send text. Check the number and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Avatar */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
          {displayName.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
            {lead.intent_level === 'Hot' && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide bg-rose-100 text-rose-700">🔥 Hot</span>
            )}
            {lead.intent_level === 'Warm' && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-700">Warm</span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${src.color}`}>{src.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-500'}`}>
              {status}
            </span>
          </div>
          {lead.listing_address && (
            <p className="text-xs text-slate-500 truncate mt-0.5">
              <span className="material-symbols-outlined text-[11px] align-middle mr-0.5">home_pin</span>
              {lead.listing_address}
            </p>
          )}
          {lead.agent_name && (
            <p className="text-[11px] font-semibold text-primary-600 truncate mt-0.5">
              <span className="material-symbols-outlined text-[11px] align-middle mr-0.5">real_estate_agent</span>
              {lead.agent_name}'s listing
            </p>
          )}
        </div>

        {/* Time + chevron */}
        <div className="flex flex-shrink-0 items-center gap-2 text-right">
          <span className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(lead.created_at)}</span>
          <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
          {/* Pipeline status selector */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pipeline Status</p>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => void handleStatusChange(opt.value)}
                  disabled={updatingStatus}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                    status === opt.value
                      ? opt.color + ' ring-2 ring-offset-1 ring-current'
                      : 'bg-white border border-slate-200 text-slate-500 hover:' + opt.color
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact buttons */}
          <div className="flex flex-wrap gap-2">
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span className="material-symbols-outlined text-sm text-primary-500">mail</span>
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span className="material-symbols-outlined text-sm text-emerald-500">call</span>
                {lead.phone}
              </a>
            )}
            {lead.phone && (
              <button
                onClick={() => setShowSms(v => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  showSms
                    ? 'border-violet-300 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm">sms</span>
                Text
              </button>
            )}
          </div>

          {/* SMS Compose Panel */}
          {lead.phone && showSms && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Send a text to {firstName}</p>

              {/* Quick text buttons */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEXTS.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => fillQuickText(t)}
                    className="rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 transition"
                  >
                    Quick {i + 1}
                  </button>
                ))}
              </div>

              <textarea
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
                placeholder={`Hi ${firstName}, this is your loan officer…`}
                rows={3}
                className="w-full resize-none rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />

              <div className="flex items-center justify-between">
                <span className={`text-[10px] ${smsText.length > 160 ? 'text-red-500 font-semibold' : smsText.length > 140 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {smsText.length}/160 chars{smsText.length > 160 ? ' — will split into 2 messages' : ''}
                </span>
                <button
                  onClick={() => void handleSendSms()}
                  disabled={sending || !smsText.trim() || sent}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">{sent ? 'check_circle' : 'send'}</span>
                  {sending ? 'Sending…' : sent ? 'Sent!' : 'Send Text'}
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">What they asked</p>
              <p className="text-xs text-slate-700">{lead.notes}</p>
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            Submitted {new Date(lead.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const LOLeadsPage: React.FC = () => {
  const demoMode = useDemoMode();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) {
      setLeads(DEMO_LEADS);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const headers = await getApiHeaders();
        const res = await fetch(buildApiUrl('/api/lo/leads'), { headers });
        const data = await res.json();
        if (data.success) {
          // Merge pre-quals + chat leads into a unified list
          const preQuals = (data.preQuals || []).map((p: Record<string, unknown>) => ({
            id: p.id,
            name: p.name as string || null,
            email: p.email as string || null,
            phone: p.phone as string || null,
            source: 'pre_qual',
            notes: (p.notes as string) || [(p.timeline as string) && `Timeline: ${p.timeline}`, (p.creditRange as string) && `Credit: ${p.creditRange}`, (p.incomeRange as string) && `Income: ${p.incomeRange}`, (p.downPayment as string) && `Down: ${p.downPayment}`].filter(Boolean).join(' · ') || null,
            status: 'New' as LeadStatus,
            intent_level: 'Hot' as const,
            listing_id: p.listingId as string || null,
            listing_address: p.listingAddress as string || null,
            agent_name: p.agentName as string || null,
            created_at: p.createdAt as string,
          }));
          const chatLeads = (data.chatLeads || []).map((l: Record<string, unknown>) => ({
            id: l.id,
            name: l.name as string || null,
            email: l.email as string || null,
            phone: l.phone as string || null,
            source: l.context as string || 'chatbot',
            notes: null,
            status: (l.status as LeadStatus) || 'New',
            intent_level: ((l.intentLevel as string) || 'Warm') as 'Hot' | 'Warm' | 'Cold',
            listing_id: l.listingId as string || null,
            listing_address: l.listingAddress as string || null,
            agent_name: l.agentName as string || null,
            created_at: l.createdAt as string,
          }));
          // Merge and sort newest first
          setLeads([...preQuals, ...chatLeads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    })();
  }, [demoMode]);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const handleStatusChange = (id: string, status: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Buyers who connected through your AI financing bot or pre-approval form.
          </p>
        </div>
        <button
          onClick={async () => {
            try {
              const headers = await getApiHeaders();
              const res = await fetch(buildApiUrl('/api/lo/leads/export.csv'), { headers });
              if (!res.ok) throw new Error();
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            } catch { showToast.error('Export failed. Try again.'); }
          }}
          className="flex-shrink-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
        >
          ↓ Export CSV
        </button>
      </div>

      <PageGuide pageKey="lo-leads" />

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300">person_search</span>
          <p className="mt-3 text-sm font-semibold text-slate-600">No leads yet</p>
          <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
            When buyers chat with your AI bot and share their contact info, they'll show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              expanded={expandedId === lead.id}
              onToggle={() => toggle(lead.id)}
              onStatusChange={handleStatusChange}
              demo={demoMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LOLeadsPage;
