import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
interface KitRealtor { name: string | null; brokerage: string | null; headshot_url: string | null; phone: string | null; }
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
  const [realtor, setRealtor] = useState<KitRealtor | null>(null);
  const [toggles, setToggles] = useState<Toggles>({});
  const [qr, setQr] = useState('');
  const [flyerHtml, setFlyerHtml] = useState<string | null>(null);
  const flyerFrame = useRef<HTMLIFrameElement>(null);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 816);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
    const branded = toggles.flyer !== false;
    const photo = listing.photos[0] || '';
    const person = (label: string, name: string, l2: string, l3: string, img: string | null) => `
      <div class="person">
        ${img ? `<img class="head" src="${esc(img)}" />` : ''}
        <div class="ptext"><div class="label">${esc(label)}</div><div class="pname">${esc(name)}</div>${l2 ? `<div class="pline">${esc(l2)}</div>` : ''}${l3 ? `<div class="pline strong">${esc(l3)}</div>` : ''}</div>
      </div>`;
    const people = [
      realtor?.name ? person('Listing agent', realtor.name, realtor.brokerage || '', realtor.phone || '', realtor.headshot_url) : '',
      branded ? person('Loan officer', lo.name, [lo.company, lo.nmls_number ? `NMLS #${lo.nmls_number}` : ''].filter(Boolean).join(' · '), lo.phone || '', lo.headshot_url) : ''
    ].join('');
    const bedBath = [listing.bedrooms ? `${listing.bedrooms} bed` : '', listing.bathrooms ? `${listing.bathrooms} bath` : ''].filter(Boolean).join('<br>');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Flyer - ${esc(listing.address)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&display=swap" rel="stylesheet">
      <style>
        @page { size: letter; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { font-family: 'Bricolage Grotesque', -apple-system, Segoe UI, sans-serif; color: #101418; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: 8.5in; height: 11in; overflow: hidden; background: #101418; }
        .photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .tag { position: absolute; left: 0.42in; top: 0.42in; background: #fff; font-weight: 800; font-size: 14px; letter-spacing: 3px; padding: 10px 16px; }
        .card { position: absolute; left: 0.42in; right: 0.42in; bottom: 0.42in; background: #fff; padding: 0.36in; }
        .top { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
        .addr { font-size: 26px; font-weight: 500; }
        .price { font-size: 72px; font-weight: 800; line-height: 1; letter-spacing: -2px; color: #0b5cd6; margin-top: 6px; }
        .bb { font-size: 22px; font-weight: 800; text-align: right; line-height: 1.25; }
        .rule { height: 2px; background: #101418; margin: 22px 0; }
        .bottom { display: flex; align-items: center; gap: 22px; }
        .people { flex: 1; display: flex; gap: 22px; }
        .person { flex: 1; display: flex; align-items: center; gap: 12px; min-width: 0; }
        .head { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .label { font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #0b5cd6; }
        .pname { font-size: 20px; font-weight: 800; }
        .pline { font-size: 13px; font-weight: 500; }
        .pline.strong { font-weight: 800; }
        .qrbox { text-align: center; flex-shrink: 0; }
        .qr { width: 1.25in; height: 1.25in; display: block; }
        .scan { font-size: 13px; font-weight: 800; margin-top: 4px; }
        .logo { max-height: 40px; max-width: 130px; margin-top: 8px; }
        .fine { font-size: 10px; color: #4a5560; margin-top: 16px; }
      </style></head><body>
      <div class="page">
        ${photo ? `<img class="photo" src="${esc(photo)}" />` : ''}
        <div class="tag">JUST LISTED</div>
        <div class="card">
          <div class="top">
            <div><div class="addr">${esc(listing.address)}</div><div class="price">${esc(money(listing.price))}</div></div>
            <div class="bb">${bedBath}</div>
          </div>
          <div class="rule"></div>
          <div class="bottom">
            <div class="people">${people}</div>
            <div class="qrbox"><img class="qr" src="${qr}" /><div class="scan">Scan to see it &amp; ask our AI</div>${branded && lo.logo_url ? `<img class="logo" src="${esc(lo.logo_url)}" />` : ''}</div>
          </div>
          <div class="fine">Equal Housing Opportunity.${branded && lo.nmls_number ? ` NMLS #${esc(lo.nmls_number)}.` : ''} Not a commitment to lend.</div>
        </div>
      </div>
      </body></html>`;
    setFlyerHtml(html);
  };

  const printFlyer = () => {
    const win = flyerFrame.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
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

      <Card title="📄 Flyer" hint="A one-page flyer with your photo, name and NMLS. Tap to see it, then print or save as PDF."
        right={<Switch on={toggles.flyer !== false} label="Branding on the flyer" onChange={(v) => void setToggle('flyer', v)} />}>
        <button type="button" onClick={openFlyer} disabled={!qr} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-40">See my flyer</button>
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
      {flyerHtml && (() => {
        const scale = Math.min(1, (vw - 32) / 816);
        return (
          <div className="fixed inset-0 z-[70] flex flex-col bg-slate-900/80" role="dialog" aria-modal="true" aria-label="Flyer">
            <div className="flex items-center justify-between gap-2 bg-white px-4 py-3">
              <button type="button" onClick={() => setFlyerHtml(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Close</button>
              <button type="button" onClick={printFlyer} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white">Print / Save as PDF</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div style={{ width: 816 * scale, height: 1056 * scale, margin: '0 auto' }}>
                <iframe
                  ref={flyerFrame}
                  title="Flyer preview"
                  srcDoc={flyerHtml}
                  style={{ width: 816, height: 1056, border: 0, background: '#fff', transform: `scale(${scale})`, transformOrigin: 'top left' }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default LOShareKitPage;
