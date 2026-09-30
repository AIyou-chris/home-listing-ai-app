import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import { showToast } from '../../utils/toastService';
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode';

// The LO's co-branded kit for a listing they're on: link, QR, flyer, social caption.
// Each piece has its own "my branding" switch (same switches as the Listings page).

interface KitListing {
  id: string; address: string; price: number; bedrooms: number; bathrooms: number; sqft: number;
  photos: string[]; share_url: string;
}
interface KitLo {
  name: string; company: string | null; nmls_number: string | null;
  headshot_url: string | null; logo_url: string | null; phone: string | null; email: string | null;
}
type Toggles = Record<string, boolean>;

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
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const tracked = (url: string, medium: string) => `${url}${url.includes('?') ? '&' : '?'}utm_source=lo_share_kit&utm_medium=${medium}`;

const DEMO_KIT = {
  listing: { id: 'demo', address: '123 Maple Street', price: 450000, bedrooms: 3, bathrooms: 2, sqft: 1850, photos: [], share_url: 'https://homelistingai.com/l/demo' } as KitListing,
  lo: { name: 'Alex Rivera', company: 'Summit Home Loans', nmls_number: '123456', headshot_url: null, logo_url: null, phone: '(555) 010-0142', email: null } as KitLo,
  toggles: { listing_page: true, qr: true, flyer: true, social: true } as Toggles
};

const Switch: React.FC<{ on: boolean; label: string; onChange: (v: boolean) => void }> = ({ on, label, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className="flex items-center gap-2 text-xs font-semibold text-slate-600"
  >
    <span className={`relative inline-block h-5 w-9 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </span>
    {on ? 'My branding is ON' : 'My branding is OFF'}
  </button>
);

const Card: React.FC<{ title: string; hint: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, hint, children, right }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{hint}</p>
      </div>
      {right}
    </div>
    {children}
  </section>
);

const LOShareKitPage: React.FC = () => {
  const navigate = useNavigate();
  const { listingId = '' } = useParams<{ listingId: string }>();
  const demoMode = useDemoMode();
  const demo = demoMode || listingId === 'demo';

  const [state, setState] = useState<'loading' | 'ready' | 'not_published' | 'no_link' | 'error'>('loading');
  const [listing, setListing] = useState<KitListing | null>(null);
  const [lo, setLo] = useState<KitLo | null>(null);
  const [toggles, setToggles] = useState<Toggles>({});
  const [qr, setQr] = useState('');

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
      setListing(data.listing); setLo(data.lo); setToggles(data.toggles || {}); setState('ready');
    } catch { setState('error'); }
  }, [demo, listingId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!listing) return;
    QRCode.toDataURL(tracked(listing.share_url, 'qr'), { width: 600, margin: 1 }).then(setQr).catch(() => setQr(''));
  }, [listing]);

  const setToggle = async (piece: string, value: boolean) => {
    const next = { ...toggles, [piece]: value };
    setToggles(next);
    if (demo) return;
    try {
      await fetch(buildApiUrl(`/api/lo/listings/${listingId}/branding-toggles`), { method: 'PATCH', headers: await getHeaders(), body: JSON.stringify({ toggles: { [piece]: value } }) });
    } catch { showToast.error('Could not save that switch. Try again.'); }
  };

  const copy = async (text: string, done: string) => {
    try { await navigator.clipboard.writeText(text); showToast.success(done); } catch { showToast.error('Could not copy. Select and copy it by hand.'); }
  };

  const facts = useMemo(() => {
    if (!listing) return '';
    return [listing.bedrooms ? `${listing.bedrooms} bd` : '', listing.bathrooms ? `${listing.bathrooms} ba` : '', listing.sqft ? `${listing.sqft.toLocaleString('en-US')} sqft` : ''].filter(Boolean).join(' · ');
  }, [listing]);

  const caption = useMemo(() => {
    if (!listing || !lo) return '';
    const lines = [`🏡 Just listed: ${listing.address}`, [money(listing.price), facts].filter(Boolean).join(' · '), '', `See it and ask questions 24/7: ${tracked(listing.share_url, 'social')}`];
    if (toggles.social !== false) {
      lines.push('', `Financing questions? ${lo.name}${lo.company ? ` at ${lo.company}` : ''}${lo.nmls_number ? ` (NMLS #${lo.nmls_number})` : ''} can help.`);
    }
    return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim();
  }, [listing, lo, facts, toggles.social]);

  const openFlyer = () => {
    if (!listing || !lo) return;
    const w = window.open('', '_blank');
    if (!w) { showToast.error('Allow pop-ups for this site, then try again.'); return; }
    const branded = toggles.flyer !== false;
    const photo = listing.photos[0] || '';
    const loBlock = branded ? `
      <div class="lo">
        ${lo.headshot_url ? `<img class="head" src="${esc(lo.headshot_url)}" />` : ''}
        <div class="lotext"><b>${esc(lo.name)}</b>${lo.company ? `<br>${esc(lo.company)}` : ''}${lo.nmls_number ? `<br>NMLS #${esc(lo.nmls_number)}` : ''}${lo.phone ? `<br>${esc(lo.phone)}` : ''}</div>
        ${lo.logo_url ? `<img class="logo" src="${esc(lo.logo_url)}" />` : ''}
      </div>` : '';
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Flyer - ${esc(listing.address)}</title>
      <style>
        @page { size: letter; margin: 0.4in; }
        body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; margin: 0; }
        .photo { width: 100%; height: 4.6in; object-fit: cover; border-radius: 12px; background: #e2e8f0; }
        h1 { font-size: 30px; margin: 18px 0 4px; }
        .price { font-size: 26px; font-weight: 800; color: #1d4ed8; }
        .facts { font-size: 16px; color: #475569; margin-top: 4px; }
        .row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 22px; gap: 24px; }
        .qr { width: 1.7in; height: 1.7in; }
        .scan { font-size: 13px; color: #475569; text-align: center; margin-top: 4px; }
        .lo { display: flex; align-items: center; gap: 14px; border-top: 2px solid #e2e8f0; margin-top: 22px; padding-top: 16px; }
        .head { width: 78px; height: 78px; border-radius: 50%; object-fit: cover; }
        .logo { max-height: 56px; max-width: 150px; margin-left: auto; }
        .lotext { font-size: 15px; line-height: 1.45; }
        .fine { font-size: 10px; color: #64748b; margin-top: 14px; }
      </style></head><body>
      ${photo ? `<img class="photo" src="${esc(photo)}" />` : '<div class="photo"></div>'}
      <h1>${esc(listing.address)}</h1>
      <div class="price">${esc(money(listing.price))}</div>
      <div class="facts">${esc(facts)}</div>
      <div class="row"><div style="font-size:17px;max-width:4.6in">Scan to see photos, ask our AI questions any time, and book a showing.</div>
        <div><img class="qr" src="${qr}" /><div class="scan">Scan me</div></div></div>
      ${loBlock}
      <div class="fine">Equal Housing Opportunity.${branded && lo.nmls_number ? ` NMLS #${esc(lo.nmls_number)}.` : ''} Not a commitment to lend.</div>
      <script>window.onload = function () { setTimeout(function () { window.print(); }, 400); };</script>
      </body></html>`);
    w.document.close();
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

      <Card title="🔗 Listing link" hint="Send this anywhere. Buyers see the home and chat with your AI."
        right={<Switch on={toggles.listing_page !== false} label="Branding on the listing page" onChange={(v) => void setToggle('listing_page', v)} />}>
        <div className="flex flex-wrap gap-2">
          <input readOnly value={tracked(listing.share_url, 'link')} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" aria-label="Listing link" />
          <button type="button" onClick={() => void copy(tracked(listing.share_url, 'link'), 'Link copied.')} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700">Copy</button>
        </div>
      </Card>

      <Card title="⬛ QR code" hint="Put it on a sign, a card or a screen. It opens this home."
        right={<Switch on={toggles.qr !== false} label="Branding on the QR" onChange={(v) => void setToggle('qr', v)} />}>
        <div className="flex flex-wrap items-center gap-5">
          {qr ? <img src={qr} alt="QR code for this listing" className="h-36 w-36 rounded-lg border border-slate-200" /> : <div className="h-36 w-36 animate-pulse rounded-lg bg-slate-100" />}
          <a href={qr} download={`qr-${listing.id}.png`} className={`rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 ${qr ? '' : 'pointer-events-none opacity-40'}`}>Download QR</a>
        </div>
      </Card>

      <Card title="📄 Flyer" hint="A one-page flyer with your photo, name and NMLS. Opens ready to print or save as PDF."
        right={<Switch on={toggles.flyer !== false} label="Branding on the flyer" onChange={(v) => void setToggle('flyer', v)} />}>
        <button type="button" onClick={openFlyer} disabled={!qr} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-40">Open flyer</button>
      </Card>

      <Card title="📱 Social post" hint="Copy the words, paste them on Facebook, Instagram or LinkedIn."
        right={<Switch on={toggles.social !== false} label="Branding on the social post" onChange={(v) => void setToggle('social', v)} />}>
        <textarea readOnly value={caption} rows={7} className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800" aria-label="Social post text" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => void copy(caption, 'Post copied.')} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700">Copy post</button>
          {listing.photos[0] && <a href={listing.photos[0]} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open main photo</a>}
        </div>
      </Card>

      <p className="text-xs text-slate-400">Your name, photo, logo and NMLS come from your profile in Settings.</p>
    </div>
  );
};

export default LOShareKitPage;
