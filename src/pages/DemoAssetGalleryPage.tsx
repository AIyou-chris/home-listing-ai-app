import React, { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { buildApiUrl } from '../lib/api'
import {
  getDemoListingMetaById,
  getDemoListingMetas,
  getDemoPropertyById
} from '../demo/demoData'

type AssetCard = {
  key: string
  title: string
  subtitle: string
  kind: 'pdf' | 'image'
  accent: string
  downloadUrl: string
  openUrl: string
}

const DEFAULT_LISTING_ID = 'demo-listing-oak'

const PdfThumbnail: React.FC<{
  title: string
  subtitle: string
  accent: string
  imageUrl: string
  price: number
}> = ({ title, subtitle, accent, imageUrl, price }) => (
  <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[#f8f3ea] text-slate-950 shadow-inner">
    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-[#fff8eb] to-[#f3eadc]" />
    <div className="absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white" style={{ backgroundColor: accent }}>
      {subtitle}
    </div>
    <div className="absolute left-4 top-4 flex items-center gap-2">
      <div className="h-8 w-8 rounded-xl bg-[#0f172a] text-white grid place-items-center text-[10px] font-black">HL</div>
      <div className="text-[12px] font-black tracking-tight">HomeListingAI</div>
    </div>
    <div className="absolute left-4 right-4 top-16 bottom-4 grid grid-cols-[1.15fr_0.85fr] gap-3">
      <div className="flex flex-col gap-3 rounded-[24px] bg-white/85 p-4 shadow-sm">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Demo Preview</div>
          <div className="mt-2 text-[28px] font-black leading-[0.9] text-slate-900">{title}</div>
        </div>
        <div className="overflow-hidden rounded-[20px] bg-slate-200">
          <img src={imageUrl} alt={title} className="h-36 w-full object-cover" loading="eager" referrerPolicy="no-referrer" crossOrigin="anonymous" />
        </div>
        <div className="rounded-[18px] bg-slate-950 px-4 py-3 text-white">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Live Listing</div>
          <div className="mt-1 text-sm font-bold">${price.toLocaleString('en-US')}</div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-[24px] bg-white p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Asset Type</div>
          <div className="mt-2 text-xl font-black leading-tight text-slate-900">{subtitle}</div>
          <div className="mt-3 rounded-[18px] border border-dashed border-slate-200 px-3 py-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">PDF</div>
        </div>
        <div className="flex-1 rounded-[24px] p-4 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${accent}, #0f172a)` }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">Sales Demo</div>
          <div className="mt-2 text-lg font-black leading-tight">Ready to download and show.</div>
        </div>
      </div>
    </div>
  </div>
)

const DemoAssetGalleryPage: React.FC = () => {
  const { listingId: listingIdParam } = useParams<{ listingId?: string }>()
  const listingId = listingIdParam || DEFAULT_LISTING_ID
  const listingMeta = getDemoListingMetaById(listingId)
  const property = getDemoPropertyById(listingId)
  const demoListings = useMemo(() => getDemoListingMetas(), [])

  if (!listingMeta || !property) {
    return <Navigate to={`/demo-dashboard/gallery/${DEFAULT_LISTING_ID}`} replace />
  }

  const previewImageCandidate = property.heroPhotos?.[0] || property.imageUrl || ''
  const previewImage = typeof previewImageCandidate === 'string' ? previewImageCandidate : ''
  const openHouseFlyerUrl = buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingMeta.id)}/open-house-flyer.pdf`)
  const signRiderUrl = buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingMeta.id)}/sign-rider.pdf`)
  const propertyReportUrl = buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingMeta.id)}/property-report.pdf`)
  const lightCmaUrl = buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingMeta.id)}/light-cma.pdf`)
  const igPostUrl = buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingMeta.id)}/social-asset.png?format=ig_post`)
  const igStoryUrl = buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingMeta.id)}/social-asset.png?format=ig_story`)
  const liveListingUrl = `/demo-live/${listingMeta.slug}`
  const crmUrl = `/demo-dashboard/listings/${listingMeta.id}`
  const qrPngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`https://homelistingai.com${liveListingUrl}?src=open_house`)}`
  const withDownload = (url: string) => `${url}${url.includes('?') ? '&' : '?'}download=1`

  const assetCards: AssetCard[] = [
    { key: 'property-report', title: 'Property Report', subtitle: 'Buyer Report', kind: 'pdf', accent: '#ef4444', downloadUrl: withDownload(propertyReportUrl), openUrl: propertyReportUrl },
    { key: 'light-cma', title: 'Light CMA', subtitle: 'Seller Pricing', kind: 'pdf', accent: '#f97316', downloadUrl: withDownload(lightCmaUrl), openUrl: lightCmaUrl },
    { key: 'open-house-flyer', title: 'Open House Flyer', subtitle: 'Print Flyer', kind: 'pdf', accent: '#ec4899', downloadUrl: withDownload(openHouseFlyerUrl), openUrl: openHouseFlyerUrl },
    { key: 'sign-rider', title: 'Sign Rider', subtitle: 'Yard Sign', kind: 'pdf', accent: '#0ea5e9', downloadUrl: withDownload(signRiderUrl), openUrl: signRiderUrl },
    { key: 'ig-post', title: 'IG Post', subtitle: 'Square Social', kind: 'image', accent: '#8b5cf6', downloadUrl: withDownload(igPostUrl), openUrl: igPostUrl },
    { key: 'ig-story', title: 'IG Story', subtitle: 'Story Creative', kind: 'image', accent: '#14b8a6', downloadUrl: withDownload(igStoryUrl), openUrl: igStoryUrl }
  ]

  const startDemoTour = () => {
    const targets = [
      crmUrl,
      `${liveListingUrl}?action=chat`,
      propertyReportUrl
    ]
    targets.forEach((target, index) => {
      window.setTimeout(() => {
        window.open(target, '_blank', 'noopener,noreferrer')
      }, index * 180)
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8">
      <header className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Sales Demo Gallery</div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Show the full listing conversion story in one click.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              This is the polished demo pack for HomeListingAI. Open the live listing, show the CRM, then hand over the reports and social assets without using a real client account.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={liveListingUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Open Demo Live Listing</a>
              <a href={crmUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800">Open Demo CRM</a>
              <a href={openHouseFlyerUrl} download className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800">Download Demo Flyer</a>
              <button
                type="button"
                onClick={startDemoTour}
                className="rounded-2xl border border-[#0f172a] bg-[#0f172a] px-5 py-3 text-sm font-bold text-white"
              >
                Start demo tour
              </button>
            </div>
          </div>
          <div className="rounded-[28px] bg-slate-950 p-5 text-white shadow-xl">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-white/60">Current Demo Listing</div>
            <div className="mt-3 text-2xl font-black">{listingMeta.address}</div>
            <div className="mt-1 text-sm text-white/70">{listingMeta.city}, {listingMeta.state} {listingMeta.zip}</div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-white/60">Price</div><div className="mt-1 font-black">${listingMeta.price.toLocaleString('en-US')}</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-white/60">Layout</div><div className="mt-1 font-black">{listingMeta.beds} bd / {listingMeta.baths} ba</div></div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {demoListings.map((item) => (
                <Link
                  key={item.id}
                  to={`/demo-dashboard/gallery/${item.id}`}
                  className={`min-w-fit rounded-full px-3 py-2 text-xs font-bold ${item.id === listingMeta.id ? 'bg-white text-slate-950' : 'bg-white/10 text-white/80'}`}
                >
                  {item.address}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
            <div className="p-5 md:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Live Listing</div>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Public demo route</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use this route in sales calls, Looms, and onboarding demos. Chat and contact are live inside the demo page.</p>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700">{liveListingUrl}</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={liveListingUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#0f172a] px-4 py-2.5 text-sm font-bold text-white">Open live listing</a>
                <a href={`${liveListingUrl}?action=chat`} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800">Open with chat</a>
                <a href={`${liveListingUrl}?action=contact`} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800">Open with contact</a>
              </div>
            </div>
            <div className="bg-slate-100 p-5 md:p-6">
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <img src={previewImage} alt={listingMeta.title} className="h-52 w-full object-cover" loading="eager" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 p-4">
                  <div>
                    <div className="text-sm font-black text-slate-900">{listingMeta.address}</div>
                    <div className="text-xs text-slate-500">{listingMeta.city}, {listingMeta.state}</div>
                  </div>
                  <img src={qrPngUrl} alt="Demo QR" className="h-20 w-20 rounded-2xl border border-slate-200 bg-white p-2" />
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Sales Sequence</div>
            <ol className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="rounded-2xl bg-slate-50 p-3"><span className="font-black text-slate-950">1.</span> Open the demo CRM and show the Share Kit assets.</li>
              <li className="rounded-2xl bg-slate-50 p-3"><span className="font-black text-slate-950">2.</span> Open the live listing and show chat, contact, and showing request.</li>
              <li className="rounded-2xl bg-slate-50 p-3"><span className="font-black text-slate-950">3.</span> Download the report stack and explain attribution.</li>
            </ol>
          </div>
        </article>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Demo Assets</h2>
            <p className="text-sm text-slate-600">Everything here is download-ready and tied to the same demo listing story.</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {assetCards.map((asset) => (
            <article key={asset.key} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[4/5] border-b border-slate-100 bg-slate-100 p-4">
                {asset.kind === 'image' ? (
                  <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-slate-950">
                    <img src={previewImage} alt={asset.title} className="h-full w-full object-cover" loading="eager" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white" style={{ backgroundColor: asset.accent }}>
                      {asset.subtitle}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="text-lg font-black text-white">{asset.title}</div>
                      <div className="text-xs text-white/80">Ready for social and outbound sharing.</div>
                    </div>
                  </div>
                ) : (
                  <PdfThumbnail title={asset.title} subtitle={asset.subtitle} accent={asset.accent} imageUrl={previewImage} price={listingMeta.price} />
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <div className="text-base font-black text-slate-950">{asset.title}</div>
                  <div className="text-sm text-slate-600">{asset.subtitle}</div>
                </div>
                <div className="flex gap-2">
                  <a href={asset.downloadUrl} className="flex-1 rounded-2xl bg-slate-950 px-4 py-2.5 text-center text-sm font-bold text-white">Download</a>
                  <a href={asset.openUrl} target="_blank" rel="noreferrer" className="flex-1 rounded-2xl border border-slate-300 px-4 py-2.5 text-center text-sm font-bold text-slate-800">Open</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default DemoAssetGalleryPage
