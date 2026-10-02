import React, { useEffect, useState } from 'react';
import { authHeaders, buildApiUrl } from '../../services/dashboard/utils';
import ShareKitCards, { type KitListing, type KitRealtor } from './ShareKitCards';

// The agent's Share Kit: same link / QR / flyer / social post as the loan officer's kit,
// but with no co-branding (no loan officer, no branding switches).

interface Props {
  listingId: string;
  isPublished: boolean;
  demoMode: boolean;
  onPublish: () => void;
}

const DEMO_LISTING: KitListing = {
  id: 'demo', address: '123 Maple Street', price: 450000, bedrooms: 3, bathrooms: 2, sqft: 1850,
  photos: [], share_url: 'https://homelistingai.com/l/demo', description: 'Welcome to this beautifully updated home with an open floor plan, a gourmet kitchen and a private backyard, minutes from schools, parks and shopping. Move-in ready.'
};

const AgentShareKitSection: React.FC<Props> = ({ listingId, isPublished, demoMode, onPublish }) => {
  const [state, setState] = useState<'loading' | 'ready' | 'no_link' | 'error'>('loading');
  const [listing, setListing] = useState<KitListing | null>(null);
  const [realtor, setRealtor] = useState<KitRealtor | null>(null);

  useEffect(() => {
    if (demoMode) { setListing(DEMO_LISTING); setState('ready'); return; }
    if (!isPublished) return;
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/dashboard/listings/${listingId}/agent-share-kit`), { headers: await authHeaders(null) });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 409) { setState('no_link'); return; }
        if (!res.ok) { setState('error'); return; }
        setListing(data.listing); setRealtor(data.realtor || null); setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [demoMode, isPublished, listingId]);

  if (!demoMode && !isPublished) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-base font-bold text-slate-900">Share Kit</h2>
        <p className="mt-1 text-sm text-amber-900">Publish this listing to get your link, QR code, flyer and social post.</p>
        <button type="button" onClick={onPublish} className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700">Publish listing</button>
      </section>
    );
  }
  if (state === 'loading') return <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your share kit…</div>;
  if (state !== 'ready' || !listing) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        {state === 'no_link' ? "This home doesn't have a public link yet. Try publishing it again." : 'Could not load the share kit. Try again in a minute.'}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Share Kit</h1>
        <p className="text-sm text-slate-500">{listing.address}</p>
      </div>
      <ShareKitCards listing={listing} realtor={realtor} utmSource="agent_share_kit" />
      <p className="text-xs text-slate-400">Your name, photo and brokerage come from your profile in Settings.</p>
    </div>
  );
};

export default AgentShareKitSection;
