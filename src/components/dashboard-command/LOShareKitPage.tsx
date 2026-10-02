import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import { showToast } from '../../utils/toastService';
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode';
import ShareKitCards, { type KitListing, type KitLo, type KitRealtor, type Toggles } from './ShareKitCards';

// The LO's co-branded kit for a listing they're on: link, QR, flyer, social caption.
// Each piece has its own "my branding" switch (same switches as the Listings page).

const getHeaders = async (): Promise<HeadersInit> => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data } = await supabase.auth.getUser();
  return {
    'Content-Type': 'application/json',
    ...(data.user?.id ? { 'x-user-id': data.user.id } : {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  };
};

const money = (n: number) => (n > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '');

const DEMO_KIT = {
  listing: { id: 'demo', address: '123 Maple Street', price: 450000, bedrooms: 3, bathrooms: 2, sqft: 1850, photos: [], share_url: 'https://homelistingai.com/l/demo', description: 'Welcome to this beautifully updated home with an open floor plan, a gourmet kitchen and a private backyard, minutes from schools, parks and shopping. Move-in ready.' } as KitListing,
  lo: { name: 'Alex Rivera', company: 'Summit Home Loans', nmls_number: '123456', headshot_url: null, logo_url: null, phone: '(555) 010-0142', email: null } as KitLo,
  toggles: { listing_page: true, qr: true, flyer: true, social: true } as Toggles
};

const LOShareKitPage: React.FC = () => {
  const navigate = useNavigate();
  const { listingId = '' } = useParams<{ listingId: string }>();
  const demoMode = useDemoMode();
  const demo = demoMode || listingId === 'demo';

  const [state, setState] = useState<'loading' | 'ready' | 'not_published' | 'no_link' | 'error'>('loading');
  const [listing, setListing] = useState<KitListing | null>(null);
  const [lo, setLo] = useState<KitLo | null>(null);
  const [realtor, setRealtor] = useState<KitRealtor | null>(null);
  const [toggles, setToggles] = useState<Toggles>({});

  const load = useCallback(async () => {
    if (demo) {
      setListing(DEMO_KIT.listing); setLo(DEMO_KIT.lo); setToggles(DEMO_KIT.toggles); setState('ready');
      return;
    }
    try {
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/share-kit`), { headers: await getHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) { setState(data.error === 'NO_SHARE_LINK' ? 'no_link' : 'not_published'); return; }
      if (!res.ok) { setState('error'); return; }
      setListing(data.listing); setLo(data.lo); setRealtor(data.realtor || null); setToggles(data.toggles || {}); setState('ready');
    } catch { setState('error'); }
  }, [demo, listingId]);

  useEffect(() => { void load(); }, [load]);

  const setToggle = async (piece: string, value: boolean) => {
    const next = { ...toggles, [piece]: value };
    setToggles(next);
    if (demo) return;
    try {
      await fetch(buildApiUrl(`/api/lo/listings/${listingId}/branding-toggles`), { method: 'PATCH', headers: await getHeaders(), body: JSON.stringify({ toggles: { [piece]: value } }) });
    } catch { showToast.error('Could not save that switch. Try again.'); }
  };

  if (state === 'loading') return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-500">Loading your share kit…</div>;

  const back = (
    <button type="button" onClick={() => navigate(buildDashboardPath('/lo-listings', demoMode))} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
      <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Listings
    </button>
  );

  if (state !== 'ready' || !listing || !lo) {
    const msg = state === 'not_published'
      ? "This home isn't published yet. Once the agent publishes it, your share kit shows up here."
      : state === 'no_link'
        ? "This home doesn't have a public link yet. Ask the agent to open its Share Kit once."
        : 'Could not load the share kit. Try again in a minute.';
    return <div className="mx-auto max-w-3xl px-4 py-8">{back}<div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{msg}</div></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 pr-12 md:px-8">
      {back}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Share Kit</h1>
        <p className="text-sm text-slate-500">{listing.address}{listing.price ? ` · ${money(listing.price)}` : ''}</p>
      </div>

      <ShareKitCards listing={listing} lo={lo} realtor={realtor} toggles={toggles} onToggle={(piece, v) => void setToggle(piece, v)} utmSource="lo_share_kit" />

      <p className="text-xs text-slate-400">Your name, photo, logo and NMLS come from your profile in Settings.</p>
    </div>
  );
};

export default LOShareKitPage;
