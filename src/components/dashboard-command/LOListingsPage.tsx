import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import { showToast } from '../../utils/toastService';
import { useDemoMode } from '../../demo/useDemoMode';
import { createListingDraft } from '../../services/listingBuilderService';

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

// ─── Listing card ─────────────────────────────────────────────────────────────

const ListingCard: React.FC<ListingCardProps> = ({ listing, mode, onRemove, onAdd, loading }) => {
  const [showToggles, setShowToggles] = useState(false);
  const [sharingDash, setSharingDash] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const handleShareDashboard = async () => {
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
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${listing.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {listing.status === 'published' ? 'Published' : 'Draft'}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {mode === 'assigned' ? (
            <>
              <button
                onClick={handleShareDashboard}
                disabled={sharingDash}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100 disabled:opacity-40"
              >
                {sharingDash ? 'Creating…' : '📊 Live Dashboard'}
              </button>
              <button
                onClick={() => setShowToggles(v => !v)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${showToggles ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-primary-200 hover:text-primary-600'}`}
              >
                {showToggles ? 'Hide Branding' : '⚙️ Branding'}
              </button>
              {removeConfirm ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setRemoveConfirm(false); onRemove?.(listing.id); }}
                    disabled={loading}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-40"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setRemoveConfirm(false)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRemoveConfirm(true)}
                  disabled={loading}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-red-200 hover:text-red-600 disabled:opacity-40"
                >
                  Remove
                </button>
              )}
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
      {mode === 'assigned' && showToggles && (
        <BrandingTogglePanel listingId={listing.id} />
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
  const [creating, setCreating] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      const payload = await createListingDraft({ status: 'draft', address: 'New Listing' });
      const newId = payload.listing?.id;
      if (!newId) throw new Error('no_listing_id');

      // Co-brand the LO onto their own new listing (best-effort — the builder still opens).
      try {
        const headers = await getApiHeaders();
        await fetch(buildApiUrl(`/api/lo/listings/${newId}/assign`), { method: 'POST', headers });
      } catch {
        // assignment is best-effort; LO can still build and we can assign later
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
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Listings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Co-brand any listing — your info and the agent's appear side by side on every marketing piece.
        </p>
      </div>

      {/* Build your own listing — same builder agents use, co-branded to you */}
      <div className="rounded-2xl border border-primary-200 bg-primary-50/60 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Build a listing</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create your own listing from scratch — the full builder, co-branded to you automatically.
            </p>
          </div>
          <button
            onClick={() => void handleBuildListing()}
            disabled={creating}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-lg">{creating ? 'progress_activity' : 'add_home_work'}</span>
            {creating ? 'Starting…' : 'Build a Listing'}
          </button>
        </div>
      </div>

      {/* Find a listing */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-800">Find a listing</h2>
        <p className="mb-4 text-sm text-slate-500">Or search by address or city to co-brand an existing agent's listing.</p>
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
                loading={removingId === listing.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LOListingsPage;
