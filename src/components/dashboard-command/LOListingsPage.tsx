import React, { useCallback, useEffect, useRef, useState } from 'react';
import PageGuide from './PageGuide';
import AiPowerSwitch from './AiPowerSwitch';
import ListingPhonePanel, { ListingPhoneLine } from './ListingPhonePanel';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { showToast } from '../../utils/toastService';
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode';
import { createListingDraft } from '../../services/listingBuilderService';
import { LoPageHeader, LoIconTile, LoTag, LoIcon, loCard, loSolid, loGhost, loInput } from './loUi';

// ─── Branding toggle types ────────────────────────────────────────────────────

// Only the pieces your name actually shows on. (QR, Share Kit and Open House never changed anything.)
const PIECE_LABELS: Record<string, { label: string; icon: string }> = {
  listing_page:  { label: 'Public listing page', icon: 'home' },
  flyer:         { label: 'Flyer',               icon: 'description' },
  social:        { label: 'Social post',         icon: 'smartphone' },
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
  canEdit?: boolean;
};

const prettyPhone = (e164: string | null) => {
  const d = String(e164 || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(e164 || '');
};

const getApiHeaders = async (): Promise<HeadersInit> => authHeaders(null);

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
  loading?: boolean;
  phoneEnabled?: boolean;
  phoneLine?: ListingPhoneLine | null;
  onPhoneLine?: (listingId: string, line: ListingPhoneLine | null) => void;
  demo?: boolean;
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
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/branding-toggles`), { headers });
      const json = await res.json();
      if (json.success) setToggles(json.toggles);
      else throw new Error('load_failed');
    } catch {
      // Show every piece as on (the backend default) rather than spinning forever.
      setToggles(Object.fromEntries(Object.keys(PIECE_LABELS).map((k) => [k, true])));
    }
  }, [listingId, demo]);

  useEffect(() => { void loadToggles(); }, [loadToggles]);

  const handleToggle = async (piece: string, value: boolean) => {
    const previous = toggles;
    const next = { ...toggles, [piece]: value };
    setToggles(next);
    if (demo) return;
    setSaving(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/branding-toggles`), { method: 'PATCH', headers, body: JSON.stringify({ toggles: next }) });
      if (!res.ok) throw new Error('save_failed');
    } catch {
      // Never leave a switch showing a setting that did not save — the LO would
      // believe their name is on the flyer when it isn't.
      setToggles(previous);
      showToast.error("Couldn't save that switch. Check your connection and try again.");
    } finally { setSaving(false); }
  };

  if (!toggles) return <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100" />;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
        Where your co-brand shows {saving && <span className="text-primary-500">· Saving…</span>}
      </p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {Object.entries(PIECE_LABELS).map(([piece, { label, icon }]) => {
          const on = toggles[piece] !== false;
          return (
            <button
              key={piece}
              type="button"
              onClick={() => void handleToggle(piece, !on)}
              className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${
                on
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <LoIcon name={icon} className="text-xl" />
              <span className="flex-1 text-left">{label}</span>
              <span className={`h-2 w-2 rounded-full ${on ? 'bg-primary-500' : 'bg-slate-300'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Listing card ─────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, { label: string; tone: 'green' | 'slate' | 'amber' }> = {
  published: { label: 'Live', tone: 'green' },
  draft: { label: 'Draft', tone: 'slate' },
  sold: { label: 'Sold', tone: 'amber' },
  archived: { label: 'Archived', tone: 'slate' },
};

// Per-listing phone numbers are hidden at launch: they are not part of the single plan.
const SHOW_LISTING_NUMBERS = false;

const ListingCard: React.FC<ListingCardProps> = ({ listing, mode, onRemove, onAdd, loading, phoneEnabled, phoneLine, onPhoneLine, demo }) => {
  const [showToggles, setShowToggles] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sharingDash, setSharingDash] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const chip = STATUS_CHIP[listing.status] || STATUS_CHIP.draft;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);

  const handleShareDashboard = async () => {
    if (demo) { showToast.success('In your account this opens the live lead dashboard you can send to the agent.'); return; }
    setSharingDash(true);
    // Open the tab right away (browsers block pop-ups that open after a wait), then point it at the dashboard.
    const tab = window.open('', '_blank');
    try {
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl(`/api/listing/${listing.id}/dashboard-link`), {
        method: 'POST',
        headers
      });
      const json = await res.json() as { success?: boolean; url?: string };
      if (!res.ok || !json.url) throw new Error('failed');
      if (tab) tab.location.href = json.url;
      let copied = false;
      try { await navigator.clipboard.writeText(json.url); copied = true; } catch { /* copy is a bonus */ }
      if (tab) showToast.success(copied ? 'Opened. Link copied so you can send it to the agent.' : 'Opened.');
      else showToast.success(copied ? 'Link copied. Paste it in a new tab to view it.' : 'Could not open a new tab. Allow pop-ups and try again.');
    } catch {
      tab?.close();
      showToast.error('Could not open the dashboard. Try again.');
    } finally {
      setSharingDash(false);
    }
  };

  const menuItem = 'flex w-full min-h-[44px] items-center gap-2.5 px-4 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        {listing.heroPhoto ? (
          <img src={listing.heroPhoto} alt="" className="h-44 w-full flex-shrink-0 rounded-t-2xl object-cover sm:h-auto sm:w-48 sm:rounded-l-2xl sm:rounded-tr-none" />
        ) : (
          <div className="flex h-32 w-full flex-shrink-0 items-center justify-center rounded-t-2xl bg-primary-50 text-primary-700 sm:h-auto sm:w-48 sm:rounded-l-2xl sm:rounded-tr-none" aria-hidden="true">
            <span className="material-symbols-outlined text-5xl">home</span>
          </div>
        )}
        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <LoTag tone={chip.tone}>{chip.label}</LoTag>
            {listing.title && <span className="truncate text-xs font-semibold text-slate-600">{listing.title}</span>}
          </div>
          <p className="mt-2 break-words text-lg font-extrabold leading-snug text-slate-900">{listing.address}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {fmt(listing.price)}
            {listing.bedrooms > 0 && ` · ${listing.bedrooms}bd`}
            {listing.bathrooms > 0 && ` ${listing.bathrooms}ba`}
            {listing.sqft > 0 && ` · ${listing.sqft.toLocaleString()} sqft`}
          </p>

          {mode === 'assigned' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* The one main thing to do with a listing */}
          <button
            onClick={() => navigate(buildDashboardPath(`/lo-listings/${listing.id}/share-kit`, Boolean(demo)))}
            className={`${loSolid} flex-1 sm:flex-none`}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">ios_share</span> Share Kit
          </button>
          <button
            onClick={handleShareDashboard}
            disabled={sharingDash}
            className={loGhost}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">monitoring</span>
            <span>{sharingDash ? 'Opening…' : 'Live dashboard'}</span>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More actions"
              className={`${loGhost} min-w-[44px] !px-0`}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">more_horiz</span>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                {listing.canEdit && (
                  <button role="menuitem" className={menuItem} onClick={() => { setMenuOpen(false); navigate(buildDashboardPath(`/listings/${listing.id}/edit`, Boolean(demo))); }}>
                    <span className="material-symbols-outlined text-xl text-slate-600" aria-hidden="true">edit</span> Edit listing
                  </button>
                )}
                {phoneEnabled && (
                  <button role="menuitem" className={menuItem} onClick={() => { setMenuOpen(false); setShowPhone(true); }}>
                    <span className="material-symbols-outlined text-xl text-slate-600" aria-hidden="true">call</span>
                    {phoneLine?.phoneNumber ? prettyPhone(phoneLine.phoneNumber) : 'AI phone number'}
                  </button>
                )}
                <button role="menuitem" className={menuItem} onClick={() => { setMenuOpen(false); setShowToggles(true); }}>
                  <span className="material-symbols-outlined text-xl text-slate-600" aria-hidden="true">brush</span> Branding
                </button>
                <button role="menuitem" className={`${menuItem} text-rose-700 hover:bg-rose-50`} onClick={() => { setMenuOpen(false); setRemoveConfirm(true); }}>
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">remove_circle</span> Remove from my listings
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <button
            onClick={() => onAdd?.(listing.id)}
            disabled={loading}
            className={`${loSolid} w-full sm:w-auto`}
          >
            {loading ? 'Adding…' : 'Add me to this listing'}
          </button>
        </div>
          )}
        </div>
      </div>
      <div className="px-5 empty:hidden [&>*:last-child]:mb-5">
      {mode === 'assigned' && removeConfirm && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="min-w-0 flex-1 text-sm font-semibold text-rose-900">Take your name off this listing?</p>
          <button
            onClick={() => { setRemoveConfirm(false); onRemove?.(listing.id); }}
            disabled={loading}
            className="min-h-[44px] rounded-xl bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-40"
          >
            Yes, remove
          </button>
          <button onClick={() => setRemoveConfirm(false)} className={loGhost}>Keep it</button>
        </div>
      )}
      {mode === 'assigned' && phoneEnabled && showPhone && (
        <div>
          <ListingPhonePanel listingId={listing.id} line={phoneLine || null} demo={demo} onChange={(l) => onPhoneLine?.(listing.id, l)} />
          <button onClick={() => setShowPhone(false)} className={`${loGhost} mt-2`}>Hide phone settings</button>
        </div>
      )}
      {mode === 'assigned' && showToggles && (
        <div>
          <BrandingTogglePanel listingId={listing.id} demo={demo} />
          <button onClick={() => setShowToggles(false)} className={`${loGhost} mt-2`}>Hide branding</button>
        </div>
      )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const LOListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const demoMode = useDemoMode();

  const [assigned, setAssigned] = useState<Listing[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [phoneEnabled, setPhoneEnabled] = useState(false);
  const [phoneLines, setPhoneLines] = useState<Record<string, ListingPhoneLine>>({});

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Which listings already have their own AI phone number
  useEffect(() => {
    if (demoMode) { setPhoneEnabled(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(buildApiUrl('/api/lo/listing-phone-lines'), { headers: await getApiHeaders() });
        if (!res.ok) return;
        const data = await res.json() as { enabled?: boolean; lines?: Record<string, ListingPhoneLine> };
        if (!cancelled) { setPhoneEnabled(Boolean(data.enabled)); setPhoneLines(data.lines || {}); }
      } catch { /* the button just stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, [demoMode]);

  const handlePhoneLine = (listingId: string, line: ListingPhoneLine | null) => {
    setPhoneLines((prev) => {
      const next = { ...prev };
      if (line) next[listingId] = line; else delete next[listingId];
      return next;
    });
  };

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
        if (!res.ok) throw new Error('load_failed');
        const data = await res.json();
        if (!data.success) throw new Error('load_failed');
        setAssigned(data.listings || []);
        setLoadFailed(false);
      } catch {
        setLoadFailed(true);
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
        if (!res.ok) throw new Error('search_failed');
        const data = await res.json();
        if (!data.success) throw new Error('search_failed');
        const assignedIds = new Set(assigned.map((a) => a.id));
        setSearchResults((data.listings || []).filter((l: Listing) => !assignedIds.has(l.id)));
        setSearchFailed(false);
      } catch {
        setSearchFailed(true);
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
      const data = await res.json().catch(() => ({} as { success?: boolean; error?: string; message?: string }));
      if (!data.success) {
        const reason = data.error === 'not_partnered_with_listing_owner'
          ? 'You need to be partnered with this agent first. Send them a WOW Link.'
          : data.error === 'listing_limit_reached'
            ? (data.message || 'You have reached your plan’s listing limit.')
            : 'Failed to add listing. Try again.';
        showToast.error(reason);
        return;
      }
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

  // Build your own listing — reuses the EXACT same builder backend agents use
  // (createListingDraft → POST /api/dashboard/listings, which inserts into `properties`).
  // Then auto-assign the LO so the listing is co-branded to them and shows under
  // "Listings I'm on", and open the shared ListingEditorPage builder.
  const handleBuildListing = async () => {
    if (demoMode) {
      showToast.success("Demo mode — the listing builder is disabled in the demo.");
      return;
    }
    setCreating(true);
    try {
      // Check the plan first, so we never build a listing the plan won't let you keep.
      try {
        const limitRes = await fetch(buildApiUrl('/api/lo/listing-limit'), { headers: await getApiHeaders() });
        const limit = await limitRes.json().catch(() => null) as { atLimit?: boolean; limit?: number; tier?: string } | null;
        if (limit?.atLimit) {
          showToast.error(limit.tier === 'none'
            ? 'Your free trial has ended. Choose a plan to add more listings.'
            : `Your plan includes ${limit.limit} listings. Upgrade to add more.`);
          return;
        }
      } catch { /* if the check can't run, the server still enforces the limit on assign */ }
      const payload = await createListingDraft({ status: 'draft', address: 'New Listing' });
      const newId = payload.listing?.id;
      if (!newId) throw new Error('no_listing_id');

      // Co-brand the LO onto their own new listing (best-effort — the builder still opens).
      try {
        const headers = await getApiHeaders();
        const assignRes = await fetch(buildApiUrl(`/api/lo/listings/${newId}/assign`), { method: 'POST', headers });
        if (!assignRes.ok) throw new Error('assign_failed');
      } catch {
        // The listing is still created and the builder still opens — say so plainly
        // rather than letting the LO think they are co-branded when they are not.
        showToast.error("Listing created, but your co-branding didn't attach. Add it from Find a listing.");
      }

      navigate(`/dashboard/listings/${newId}/edit`);
    } catch {
      showToast.error('Could not start a new listing. Please try again.');
    } finally {
      setCreating(false);
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
    <div className="mx-auto max-w-6xl space-y-6 px-3 pb-28 pt-4 md:px-6">
      {/* AI on/off — the first thing on the page */}
      <div className="pr-10">
        <AiPowerSwitch demo={demoMode} />
      </div>

      <LoPageHeader
        title="My Listings"
        subtitle="Co-brand any listing. Your info and the agent's appear side by side on every marketing piece."
      />

      <PageGuide pageKey="lo-listings" />

      {/* Assigned listings */}
      <section aria-label="Listings I'm on">
        <div className="mb-3 flex items-center gap-3">
          <LoIconTile name="home_work" />
          <h2 className="text-lg font-extrabold text-slate-900">
            Listings I'm on{' '}
            {!loadingAssigned && assigned.length > 0 && <LoTag>{assigned.length}</LoTag>}
          </h2>
        </div>

        {loadingAssigned ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : loadFailed ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            We couldn't load your listings just now.{' '}
            <button onClick={() => window.location.reload()} className={`${loGhost} mt-2`}>Reload the page</button>
          </div>
        ) : assigned.length === 0 ? (
          <div className={`${loCard} border-dashed p-8 text-center`}>
            <div className="flex justify-center"><LoIconTile name="home" /></div>
            <p className="mt-3 text-base font-extrabold text-slate-900">No listings yet. They come from your agent partners.</p>
            <p className="mt-1 text-sm text-slate-600">Send your first WOW Link and your agent's listings show up here with your AI on them.</p>
            <button
              onClick={() => navigate(buildDashboardPath('/lo-partners', demoMode))}
              className={`${loSolid} mt-4`}
            >
              <LoIcon name="rocket_launch" className="text-xl" /> Send my first WOW Link
            </button>
            <p className="mt-3 text-xs text-slate-600">Already partnered? Open “Add a listing” below to find one and add yourself.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assigned.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                mode="assigned"
                onRemove={handleRemove}
                loading={removingId === listing.id}
                phoneEnabled={SHOW_LISTING_NUMBERS && phoneEnabled}
                phoneLine={phoneLines[listing.id] || null}
                onPhoneLine={handlePhoneLine}
                demo={demoMode}
              />
            ))}
          </div>
        )}
      </section>

      {/* Add a listing: build your own, or co-brand an agent's. Closed once you have listings. */}
      <details open={!loadingAssigned && assigned.length === 0} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-5 py-3 text-lg font-extrabold text-slate-900">
          <LoIconTile name="add_home" tone="slate" />
          <span className="flex-1">＋ Add a listing</span>
          <span className="text-sm font-semibold text-primary-700 group-open:hidden">Open ▾</span>
        </summary>
        <div className="space-y-4 border-t border-slate-100 p-5">
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Build a listing</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Create your own listing from scratch — the full builder, co-branded to you automatically.
                </p>
              </div>
              <button
                onClick={() => void handleBuildListing()}
                disabled={creating}
                className={`${assigned.length === 0 ? loGhost : loSolid} shrink-0`}
              >
                <span className="material-symbols-outlined text-lg">{creating ? 'progress_activity' : 'add_home_work'}</span>
                {creating ? 'Starting…' : 'Build a Listing'}
              </button>
            </div>
          </div>

          {/* Find a listing */}
          <div className={loCard}>
            <h2 className="mb-1 text-lg font-extrabold text-slate-900">Find a listing</h2>
            <p className="mb-4 text-sm text-slate-600">Or search by address or city to co-brand an existing agent's listing.</p>
            <div className="relative">
              <input
                type="text"
                placeholder="123 Main St, Austin…"
                aria-label="Search listings by address or city"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${loInput} min-h-[44px]`}
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">Searching…</span>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-4">
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

            {searchFailed && !searching && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                Search didn't work just now. Try typing it again.
              </p>
            )}

            {query.trim().length >= 2 && !searching && !searchFailed && searchResults.length === 0 && (
              <p className="mt-4 text-sm text-slate-600">No listings found for "{query}".</p>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};

export default LOListingsPage;
