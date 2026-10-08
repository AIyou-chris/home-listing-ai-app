import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { showToast } from '../../utils/toastService';

// The share kit cards (link, QR, flyer, social post), shared by the loan officer's
// co-branded kit and the agent's own kit. Pass `lo` + `onToggle` for the LO version;
// leave both out for the agent version (no co-branding switches, no loan officer).

export interface KitListing {
  id: string; address: string; price: number; bedrooms: number; bathrooms: number; sqft: number;
  photos: string[]; share_url: string; description?: string;
}
export interface KitLo {
  name: string; company: string | null; nmls_number: string | null;
  headshot_url: string | null; logo_url: string | null; phone: string | null; email: string | null;
}
export interface KitRealtor { name: string | null; brokerage: string | null; headshot_url: string | null; phone: string | null; }
export type Toggles = Record<string, boolean>;

const money = (n: number) => (n > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

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

interface ShareKitCardsProps {
  listing: KitListing;
  lo?: KitLo | null;
  realtor?: KitRealtor | null;
  toggles?: Toggles;
  onToggle?: (piece: string, value: boolean) => void;
  utmSource: string;
}

const ShareKitCards: React.FC<ShareKitCardsProps> = ({ listing, lo = null, realtor = null, toggles = {}, onToggle, utmSource }) => {
  const [qr, setQr] = useState('');
  const [flyerHtml, setFlyerHtml] = useState<string | null>(null);
  const flyerFrame = useRef<HTMLIFrameElement>(null);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 816);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const tracked = (url: string, medium: string) => `${url}${url.includes('?') ? '&' : '?'}utm_source=${utmSource}&utm_medium=${medium}`;

  useEffect(() => {
    QRCode.toDataURL(tracked(listing.share_url, 'qr'), { width: 600, margin: 1 }).then(setQr).catch(() => setQr(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.share_url, utmSource]);

  const copy = async (text: string, done: string) => {
    try { await navigator.clipboard.writeText(text); showToast.success(done); } catch { showToast.error('Could not copy. Select and copy it by hand.'); }
  };

  const facts = useMemo(() => [
    listing.bedrooms ? `${listing.bedrooms} bd` : '',
    listing.bathrooms ? `${listing.bathrooms} ba` : '',
    listing.sqft ? `${listing.sqft.toLocaleString('en-US')} sqft` : ''
  ].filter(Boolean).join(' · '), [listing]);

  const caption = useMemo(() => {
    const lines = [`🏡 Just listed: ${listing.address}`, [money(listing.price), facts].filter(Boolean).join(' · '), '', `See it and ask questions 24/7: ${tracked(listing.share_url, 'social')}`];
    if (lo && toggles.social !== false) {
      lines.push('', `Financing questions? ${lo.name}${lo.company ? ` at ${lo.company}` : ''}${lo.nmls_number ? ` (NMLS #${lo.nmls_number})` : ''} can help.`);
    }
    lines.push('', 'Made with HomeListingAI: https://homelistingai.com/for-loan-officers?ref=powered-by');
    return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing, lo, facts, toggles.social, utmSource]);

  const openFlyer = () => {
    const branded = Boolean(lo) && toggles.flyer !== false;
    const photo = listing.photos[0] || '';
    const person = (label: string, name: string, l2: string, l3: string, img: string | null) => `
      <div class="person">
        ${img ? `<img class="head" src="${esc(img)}" />` : ''}
        <div class="ptext"><div class="label">${esc(label)}</div><div class="pname">${esc(name)}</div>${l2 ? `<div class="pline">${esc(l2)}</div>` : ''}${l3 ? `<div class="pline strong">${esc(l3)}</div>` : ''}</div>
      </div>`;
    const people = [
      realtor?.name ? person('Listing agent', realtor.name, realtor.brokerage || '', realtor.phone || '', realtor.headshot_url) : '',
      branded && lo ? person('Loan officer', lo.name, [lo.company, lo.nmls_number ? `NMLS #${lo.nmls_number}` : ''].filter(Boolean).join(' · '), lo.phone || '', lo.headshot_url) : ''
    ].join('');
    const cleaned = (listing.description || '').replace(/\s+/g, ' ').trim()
    const blurb = cleaned.length > 210 ? `${cleaned.slice(0, 207).trimEnd()}…` : cleaned
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
        .price { font-size: 54px; font-weight: 800; line-height: 1; letter-spacing: -1.5px; color: #0b5cd6; margin-top: 6px; }
        .bb { font-size: 22px; font-weight: 800; text-align: right; line-height: 1.25; }
        .rule { height: 2px; background: #101418; margin: 22px 0 14px; }
        .desc { font-size: 14px; font-weight: 500; line-height: 1.45; color: #2a323b; margin: 0 0 18px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
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
          ${blurb ? `<div class="desc">${esc(blurb)}</div>` : ''}
          <div class="bottom">
            <div class="people">${people}</div>
            <div class="qrbox"><img class="qr" src="${qr}" /><div class="scan">Scan to see it &amp; ask our AI</div>${branded && lo?.logo_url ? `<img class="logo" src="${esc(lo.logo_url)}" />` : ''}</div>
          </div>
          <div class="fine">Equal Housing Opportunity.${branded && lo?.nmls_number ? ` NMLS #${esc(lo.nmls_number)}.` : ''}${lo ? ' Not a commitment to lend.' : ''} Powered by HomeListingAI, homelistingai.com</div>
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

  const switchFor = (piece: string, label: string) =>
    onToggle ? <Switch on={toggles[piece] !== false} label={label} onChange={(v) => onToggle(piece, v)} /> : undefined;

  return (
    <>
      <Card title="🔗 Listing link" hint={lo ? 'Send this anywhere. Buyers see the home and chat with your AI.' : 'Send this anywhere. Buyers see the home and chat with the AI.'}
        right={switchFor('listing_page', 'Branding on the listing page')}>
        <div className="flex flex-wrap gap-2">
          <input readOnly value={tracked(listing.share_url, 'link')} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" aria-label="Listing link" />
          <button type="button" onClick={() => void copy(tracked(listing.share_url, 'link'), 'Link copied.')} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700">Copy</button>
        </div>
      </Card>

      <Card title="⬛ QR code" hint="Put it on a sign, a card or a screen. It opens this home.">
        <div className="flex flex-wrap items-center gap-5">
          {qr ? <img src={qr} alt="QR code for this listing" className="h-36 w-36 rounded-lg border border-slate-200" /> : <div className="h-36 w-36 animate-pulse rounded-lg bg-slate-100" />}
          <a href={qr} download={`qr-${listing.id}.png`} className={`rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 ${qr ? '' : 'pointer-events-none opacity-40'}`}>Download QR</a>
        </div>
      </Card>

      <Card title="📄 Flyer" hint={lo ? 'A one-page flyer with your photo, name and NMLS. Tap to see it, then print or save as PDF.' : 'A one-page flyer with your photo, name and brokerage. Tap to see it, then print or save as PDF.'}
        right={switchFor('flyer', 'Branding on the flyer')}>
        <button type="button" onClick={openFlyer} disabled={!qr} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-40">See my flyer</button>
      </Card>

      <Card title="📱 Social post" hint="Copy the words, paste them on Facebook, Instagram or LinkedIn."
        right={switchFor('social', 'Branding on the social post')}>
        <textarea readOnly value={caption} rows={7} className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800" aria-label="Social post text" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => void copy(caption, 'Post copied.')} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700">Copy post</button>
          {listing.photos[0] && <a href={listing.photos[0]} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open main photo</a>}
        </div>
      </Card>

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
    </>
  );
};

export default ShareKitCards;
