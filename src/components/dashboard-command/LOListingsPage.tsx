import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import { showToast } from '../../utils/toastService';
import { useDemoMode } from '../../demo/useDemoMode';

// ─── Branding toggle types ────────────────────────────────────────────────────

const PIECE_LABELS: Record<string, { label: string; icon: string }> = {
  listing_page:  { label: 'Listing Page',  icon: '🏠' },
  share_kit:     { label: 'Share Kit',     icon: '📤' },
  qr:            { label: 'QR Code',       icon: '⬛' },
  social:        { label: 'Social Export', icon: '📱' },
  flyer:         { label: 'Flyer',         icon: '📄' },
  open_house:    { label: 'Open House',    icon: '🚪' },
};
type Toggles = Record<string, boolean>;

type Listing = {
  id: string;
  address: string;
  title: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  status: string;
  heroPhoto: string | null;
  brandingEnabled?: boolean;
  assignedAt?: string | null;
  leadCount?: number;
};

const getApiHeaders = async (): Promise<HeadersInit> => {
  const { data } = await supabase.auth.getUser();
  return {
    'Content-Type': 'application/json',
    ...(data.user?.id ? { 'x-user-id': data.user.id } : {})
  };
};

const fmt = (price: number) =>
  price > 0
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)
    : '—';

const DEMO_ASSIGNED: Listing[] = [
  {
    id: 'demo-1',
    address: '1280 Sunset Blvd, Santa Monica, CA',
    title: 'Oceanview Condo',
    price: 1285000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1480,
    status: 'published',
    heroPhoto: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=800&auto=format&fit=crop',
    brandingEnabled: true,
    assignedAt: new Date().toISOString(),
    leadCount: 5,
  },
];

const DEMO_SEARCH: Listing[] = [
  {
    id: 'demo-2',
    address: '742 Evergreen Terrace, Springfield, IL',
    title: 'Modern Craftsman',
    price: 489000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 2100,
    status: 'published',
    heroPhoto: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800&auto=format&fit=crop',
  },
];

// ─── Listing card ─────────────────────────────────────────────────────────────

type ListingCardProps = {
  listing: Listing;
  mode: 'assigned' | 'search';
  onRemove?: (id: string) => void;
  onAdd?: (id: string) => void;
  onSendWow?: (listing: Listing) => void;
  loading?: boolean;
  demo?: boolean;
};

// ─── Send WOW Link Modal ──────────────────────────────────────────────────────

const SendWowModal: React.FC<{ listing: Listing; onClose: () => void }> = ({ listing, onClose }) => {
  const demoMode = useDemoMode();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [wowLink, setWowLink] = useState('');

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      if (demoMode) {
        await new Promise(r => setTimeout(r, 700));
        setWowLink('https://homelistingai.com/partner-invite/demo-token');
        setDone(true);
        showToast.success('WOW Link sent!');
        setTimeout(onClose, 3000);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch(buildApiUrl('/api/lo/partners/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, listingId: listing.id })
      });
      const json = await res.json() as { success?: boolean; wowLink?: string };
      if (!res.ok) throw new Error('send_failed');
      setWowLink(json.wowLink || '');
      setDone(true);
      showToast.success('WOW Link sent!');
      setTimeout(onClose, 3000);
    } catch {
      showToast.error('Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-base font-bold text-slate-900 mb-1">WOW Link sent!</h3>
            <p className="text-slate-500 text-sm mb-4">They'll see a live demo of <span className="font-semibold text-slate-700">{listing.address}</span> with your chatbot running.</p>
            {wowLink && (
              <button
                onClick={() => { navigator.clipboard.writeText(wowLink); showToast.success('Link copied!'); }}
                className="w-full border border-slate-200 rounded-xl py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition-all"
              >
                📋 Copy WOW Link
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900">Send WOW Link</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Sending for: <span className="font-semibold text-slate-700 truncate">{listing.address}</span>
            </p>
            <div className="space-y-2.5 mb-4">
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Agent name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Agent email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                autoFocus
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all"
            >
              {sending ? 'Sending…' : '🚀 Send WOW Link →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Branding Toggle Panel ────────────────────────────────────────────────────

const BrandingTogglePanel: React.FC<{ listingId: string; demo?: boolean }> = ({ listingId, demo = false }) => {
  const [toggles, setToggles] = useState<Toggles | null>(null);
  const [saving, setSaving] = useState(false);

  const loadToggles = useCallback(async () => {
    if (demo) {
      setToggles(Object.fromEntries(Object.keys(PIECE_LABELS).map(k => [k, true])));
      return;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      const headers: HeadersInit = userData.user?.id ? { 'x-user-id': userData.user.id } : {};
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/branding-toggles`), { headers });
      const json = await res.json();
      if (json.success) setToggles(json.toggles);
    } catch { /* non-fatal */ }
  }, [listingId, demo]);

  useEffect(() => { void loadToggles(); }, [loadToggles]);

  const handleToggle = async (piece: string, value: boolean) => {
    const next = { ...toggles, [piece]: value };
    setToggles(next);
    if (demo) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const headers: HeadersInit = { 'Content-Type': 'application/json', ...(userData.user?.id ? { 'x-user-id': userData.user.id } : {}) };
      await fetch(buildApiUrl(`/api/lo/listings/${listingId}/branding-toggles`), { method: 'PATCH', headers, body: JSON.stringify({ toggles: next }) });
    } catch { /* non-fatal */ } finally { setSaving(false); }
  };

  if (!toggles) return <div className="mt-3 h-16 animate-pulse rounded-lg bg-slate-100" />;

  return (
    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Where your co-brand shows {saving && <span className="text-primary-500">· Saving…</span>}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(PIECE_LABELS).map(([piece, { label, icon }]) => {
          const on = toggles[piece] !== false;
          return (
            <button
              key={piece}
              type="button"
              onClick={() => void handleToggle(piece, !on)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                on
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              <span>{icon}</span>
              <span className="flex-1 text-left">{label}</span>
              <span className={`h-2 w-2 rounded-full ${on ? 'bg-primary-500' : 'bg-slate-300'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Financing Details Panel ──────────────────────────────────────────────────

const LOAN_PROGRAMS = ['FHA', 'VA', 'Conventional', 'USDA', 'Jumbo', 'Other'];

type FinancingDoc = {
  id: string;
  address: string;
  label: string | null;
  content: string;
};

type FinancingForm = {
  loanProgram: string;
  rate: string;
  apr: string;
  downPct: string;
  monthlyPayment: string;
  notes: string;
};

const EMPTY_FIN: FinancingForm = { loanProgram: '', rate: '', apr: '', downPct: '', monthlyPayment: '', notes: '' };

const parseFinancingContent = (content: string): FinancingForm => {
  const get = (label: string) => {
    const m = content.match(new RegExp(`${label}:\\s*([^\\n]+)`));
    return m ? m[1].trim().replace('%', '').replace('$', '') : '';
  };
  return {
    loanProgram: get('Loan Program'),
    rate: get('Interest Rate'),
    apr: get('APR'),
    downPct: get('Down Payment'),
    monthlyPayment: get('Est\\. Monthly Payment \\(PITI\\)')
      .replace(/\/mo.*/, '').trim(),
    notes: content.replace(/---.*?---\n[\s\S]*?\n\n?/g, '').trim(),
  };
};

const buildFinancingContent = (f: FinancingForm): string => {
  const lines: string[] = ['--- Payment Details ---'];
  if (f.loanProgram) lines.push(`Loan Program: ${f.loanProgram}`);
  if (f.rate) lines.push(`Interest Rate: ${f.rate}%`);
  if (f.apr) lines.push(`APR: ${f.apr}%`);
  if (f.downPct) lines.push(`Down Payment: ${f.downPct}%`);
  if (f.monthlyPayment) lines.push(`Est. Monthly Payment (PITI): $${f.monthlyPayment}/mo`);
  const block = lines.length > 1 ? lines.join('\n') : '';
  const notesPart = f.notes.trim();
  return [block, notesPart].filter(Boolean).join('\n\n');
};

const FinancingDetailsPanel: React.FC<{ listing: Listing; demo?: boolean }> = ({ listing, demo = false }) => {
  const [doc, setDoc] = useState<FinancingDoc | null | 'none'>('none');
  const [form, setForm] = useState<FinancingForm>(EMPTY_FIN);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load on first open
  useEffect(() => {
    if (demo) { setDoc(null); return; }
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const streetPart = listing.address.split(',')[0].trim();
        const res = await fetch(buildApiUrl(`/api/lo/chatbot/listing-docs?address=${encodeURIComponent(streetPart)}`), {
          headers: { 'x-user-id': user?.id || '' }
        });
        const json = await res.json() as { docs?: FinancingDoc[] };
        const match = (json.docs || [])[0] || null;
        if (match) {
          setDoc(match);
          setForm(parseFinancingContent(match.content));
        } else {
          setDoc(null);
        }
      } catch { setDoc(null); }
    })();
  }, [listing.address, demo]);

  const handleSave = async () => {
    const content = buildFinancingContent(form);
    if (!content.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' };
      const body = JSON.stringify({ address: listing.address, label: form.loanProgram || null, content });
      let res: Response;
      if (doc && doc !== 'none' && (doc as FinancingDoc).id) {
        res = await fetch(buildApiUrl(`/api/lo/chatbot/listing-docs/${(doc as FinancingDoc).id}`), { method: 'PATCH', headers, body });
      } else {
        res = await fetch(buildApiUrl('/api/lo/chatbot/listing-docs'), { method: 'POST', headers, body });
      }
      const json = await res.json() as { doc?: FinancingDoc };
      if (!res.ok) throw new Error('save_failed');
      if (json.doc) setDoc(json.doc);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      showToast.success('Financing details saved!');
    } catch {
      showToast.error('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (doc === 'none') return <div className="mt-3 h-20 animate-pulse rounded-xl bg-slate-100" />;

  const hasData = form.loanProgram || form.rate || form.apr || form.downPct || form.monthlyPayment || form.notes;

  return (
    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
        Financing Details
        {hasData && <span className="ml-2 rounded-full bg-emerald-200 px-1.5 py-0.5 text-[9px] text-emerald-800">Saved to bot ✓</span>}
      </p>

      {/* Loan Program */}
      <div className="mb-2">
        <select
          value={form.loanProgram}
          onChange={e => setForm(f => ({ ...f, loanProgram: e.target.value }))}
          className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          <option value="">Loan Program (FHA, VA, Conventional…)</option>
          {LOAN_PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Rate / APR / Down / Payment */}
      <div className="mb-2 grid grid-cols-2 gap-2">
        {[
          { key: 'rate', label: 'Rate %', placeholder: '6.875' },
          { key: 'apr', label: 'APR %', placeholder: '7.12' },
          { key: 'downPct', label: 'Down %', placeholder: '3.5' },
          { key: 'monthlyPayment', label: 'Mo. Payment $', placeholder: '2847' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="relative">
            <input
              type="number"
              value={form[key as keyof FinancingForm]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <span className="absolute right-2 top-1.5 text-[9px] text-slate-400 pointer-events-none">{label}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      <textarea
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        placeholder="HOA $220/mo, seller paying 2 pts, FHA approved, special programs available…"
        rows={2}
        className="mb-2 w-full resize-none rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />

      <button
        onClick={() => void handleSave()}
        disabled={saving || !hasData}
        className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : '💾 Save to Bot'}
      </button>
    </div>
  );
};

// ─── Listing card ─────────────────────────────────────────────────────────────

const ListingCard: React.FC<ListingCardProps> = ({ listing, mode, onRemove, onAdd, onSendWow, loading, demo = false }) => {
  const [showToggles, setShowToggles] = useState(false);
  const [showFinancing, setShowFinancing] = useState(false);
  const [sharingDash, setSharingDash] = useState(false);

  const handleShareDashboard = async () => {
    if (demo) {
      showToast.success('Live dashboard link copied!');
      return;
    }
    setSharingDash(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch(buildApiUrl(`/api/listing/${listing.id}/dashboard-link`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' }
      });
      const json = await res.json() as { success?: boolean; url?: string };
      if (!res.ok || !json.url) throw new Error('failed');
      await navigator.clipboard.writeText(json.url);
      showToast.success('Live dashboard link copied!');
    } catch {
      showToast.error('Could not create the dashboard link. Try again.');
    } finally {
      setSharingDash(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        {listing.heroPhoto ? (
          <img src={listing.heroPhoto} alt={listing.address} className="h-16 w-24 flex-shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 text-2xl">🏠</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{listing.address}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            {fmt(listing.price)}
            {listing.bedrooms > 0 && ` · ${listing.bedrooms}bd`}
            {listing.bathrooms > 0 && ` ${listing.bathrooms}ba`}
            {listing.sqft > 0 && ` · ${listing.sqft.toLocaleString()} sqft`}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${listing.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {listing.status === 'published' ? 'Published' : 'Draft'}
            </span>
            {mode === 'assigned' && typeof listing.leadCount === 'number' && listing.leadCount > 0 && (
              <span className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                {listing.leadCount} lead{listing.leadCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {mode === 'assigned' ? (
            <>
              <button
                onClick={() => onSendWow?.(listing)}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-all hover:bg-violet-100"
              >
                🌟 Send to Agent
              </button>
              <button
                onClick={handleShareDashboard}
                disabled={sharingDash}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100 disabled:opacity-40"
              >
                {sharingDash ? 'Creating…' : '📊 Live Dashboard'}
              </button>
              <button
                onClick={() => { setShowFinancing(v => !v); setShowToggles(false); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${showFinancing ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200 hover:text-emerald-600'}`}
              >
                {showFinancing ? 'Hide Financing' : '💰 Financing'}
              </button>
              <button
                onClick={() => { setShowToggles(v => !v); setShowFinancing(false); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${showToggles ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-primary-200 hover:text-primary-600'}`}
              >
                {showToggles ? 'Hide Branding' : '⚙️ Branding'}
              </button>
              <button
                onClick={() => onRemove?.(listing.id)}
                disabled={loading}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-red-200 hover:text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            </>
          ) : (
            <button
              onClick={() => onAdd?.(listing.id)}
              disabled={loading}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
            >
              {loading ? 'Adding…' : 'Add me'}
            </button>
          )}
        </div>
      </div>
      {mode === 'assigned' && showFinancing && (
        <FinancingDetailsPanel listing={listing} demo={demo} />
      )}
      {mode === 'assigned' && showToggles && (
        <BrandingTogglePanel listingId={listing.id} demo={demo} />
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const LOListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const demoMode = useDemoMode();

  const [assigned, setAssigned] = useState<Listing[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [wowListing, setWowListing] = useState<Listing | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load assigned listings on mount
  useEffect(() => {
    if (demoMode) {
      setAssigned(DEMO_ASSIGNED);
      setLoadingAssigned(false);
      return;
    }
    (async () => {
      try {
        const headers = await getApiHeaders();
        const res = await fetch(buildApiUrl('/api/lo/listings'), { headers });
        const data = await res.json();
        if (data.success) setAssigned(data.listings || []);
      } catch {
        // non-fatal
      } finally {
        setLoadingAssigned(false);
      }
    })();
  }, [demoMode]);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (demoMode) {
      setSearchResults(DEMO_SEARCH);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const headers = await getApiHeaders();
        const res = await fetch(buildApiUrl(`/api/listings/search?q=${encodeURIComponent(query.trim())}`), { headers });
        const data = await res.json();
        if (data.success) {
          const assignedIds = new Set(assigned.map((a) => a.id));
          setSearchResults((data.listings || []).filter((l: Listing) => !assignedIds.has(l.id)));
        }
      } catch {
        // non-fatal
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, assigned, demoMode]);

  const handleAdd = async (listingId: string) => {
    if (demoMode) {
      const found = searchResults.find((l) => l.id === listingId);
      if (found) {
        setAssigned((prev) => [{ ...found, brandingEnabled: true, assignedAt: new Date().toISOString() }, ...prev]);
        setSearchResults((prev) => prev.filter((l) => l.id !== listingId));
        showToast.success('Listing added — you\'re now co-branding this property.');
      }
      return;
    }
    setAddingId(listingId);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/assign`), {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'assign_failed');
      const found = searchResults.find((l) => l.id === listingId);
      if (found) {
        setAssigned((prev) => [{ ...found, brandingEnabled: true, assignedAt: new Date().toISOString() }, ...prev]);
        setSearchResults((prev) => prev.filter((l) => l.id !== listingId));
      }
      showToast.success('Listing added — you\'re now co-branding this property.');
    } catch {
      showToast.error('Failed to add listing. Try again.');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (listingId: string) => {
    if (demoMode) {
      setAssigned((prev) => prev.filter((l) => l.id !== listingId));
      showToast.success('Removed from listing.');
      return;
    }
    setRemovingId(listingId);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/assign`), {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'remove_failed');
      setAssigned((prev) => prev.filter((l) => l.id !== listingId));
      showToast.success('Removed from listing.');
    } catch {
      showToast.error('Failed to remove listing. Try again.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {wowListing && (
        <SendWowModal listing={wowListing} onClose={() => setWowListing(null)} />
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Listings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Co-brand agent listings or create your own — your info appears on every marketing piece.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/listings')}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <span className="text-base leading-none">+</span>
          Create Listing
        </button>
      </div>

      {/* Find a listing */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-800">Find a listing</h2>
        <p className="mb-4 text-sm text-slate-500">Search by address or city to find a property to co-brand.</p>
        <div className="relative">
          <input
            type="text"
            placeholder="123 Main St, Austin…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Searching…</span>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            {searchResults.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                mode="search"
                onAdd={handleAdd}
                loading={addingId === listing.id}
              />
            ))}
          </div>
        )}

        {query.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">No listings found for "{query}".</p>
        )}
      </div>

      {/* Assigned listings */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-800">
          Listings I'm on{' '}
          {!loadingAssigned && assigned.length > 0 && (
            <span className="ml-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
              {assigned.length}
            </span>
          )}
        </h2>

        {loadingAssigned ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : assigned.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-3xl">🏠</p>
            <p className="mt-2 text-sm font-medium text-slate-600">No listings yet</p>
            <p className="mt-1 text-sm text-slate-400">Search above to find a listing and add yourself.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assigned.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                mode="assigned"
                onRemove={handleRemove}
                onSendWow={setWowListing}
                loading={removingId === listing.id}
                demo={demoMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LOListingsPage;
