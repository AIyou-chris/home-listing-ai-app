import React from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { buildApiUrl } from '../lib/api'
import DemoSocialMockup from '../components/demo/DemoSocialMockup'
import { isAIDescription } from '../types'
import { getDemoListingMetaById, getDemoPropertyById } from '../demo/demoData'

type DemoAssetKey =
  | 'property-report'
  | 'light-cma'
  | 'open-house-flyer'
  | 'sign-rider'
  | 'ig-post'
  | 'ig-story'

const DEFAULT_LISTING_ID = 'demo-listing-oak'

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const DemoAssetPreviewPage: React.FC = () => {
  const { listingId: listingIdParam, assetKey: assetKeyParam } = useParams<{ listingId?: string; assetKey?: string }>()
  const listingId = listingIdParam || DEFAULT_LISTING_ID
  const assetKey = String(assetKeyParam || '').trim() as DemoAssetKey
  const listingMeta = getDemoListingMetaById(listingId)
  const property = getDemoPropertyById(listingId)

  if (!listingMeta || !property) {
    return <Navigate to={`/demo-dashboard/gallery/${DEFAULT_LISTING_ID}`} replace />
  }

  const previewImageCandidate = property.heroPhotos?.[0] || property.imageUrl || ''
  const previewImage = typeof previewImageCandidate === 'string' ? previewImageCandidate : ''
  const demoDescription = isAIDescription(property.description)
    ? property.description.paragraphs.join(' ')
    : (typeof property.description === 'string' ? property.description : 'Demo listing preview.')

  const downloadUrls: Record<DemoAssetKey, string> = {
    'property-report': buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/property-report.pdf`),
    'light-cma': buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/light-cma.pdf`),
    'open-house-flyer': buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/open-house-flyer.pdf`),
    'sign-rider': buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/sign-rider.pdf`),
    'ig-post': buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/social-asset.png?format=ig_post`),
    'ig-story': buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/social-asset.png?format=ig_story`)
  }

  const meta: Record<DemoAssetKey, {
    title: string
    subtitle: string
    badge: string
    accent: string
    description: string
    bullets: string[]
  }> = {
    'property-report': {
      title: 'Property Report',
      subtitle: 'Buyer Report',
      badge: 'Buyer Report',
      accent: '#ef4444',
      description: 'Clean buyer-facing report for sales calls and PDF handoff.',
      bullets: [
        'Shows the listing story in one polished buyer document',
        'Pairs with the same live listing and showing path',
        'Built for download during demos without using a real account'
      ]
    },
    'light-cma': {
      title: 'Light CMA',
      subtitle: 'Seller Pricing',
      badge: 'Seller Pricing',
      accent: '#f97316',
      description: 'Fast pricing conversation starter with a demo-ready seller story.',
      bullets: [
        'Shows pricing range and seller narrative',
        'Lets you explain the AI pricing story quickly',
        'Matches the rest of the share kit pack'
      ]
    },
    'open-house-flyer': {
      title: 'Open House Flyer',
      subtitle: 'Print Flyer',
      badge: 'Print Flyer',
      accent: '#ec4899',
      description: 'Open-house handout that drives report views and showing requests.',
      bullets: [
        'Pushes visitors into the tracked listing flow',
        'Looks finished enough for live demos and walk-throughs',
        'Matches the branding of the rest of the asset stack'
      ]
    },
    'sign-rider': {
      title: 'Sign Rider',
      subtitle: 'Yard Sign',
      badge: 'Yard Sign',
      accent: '#0ea5e9',
      description: 'Simple sign companion that points buyers to the live listing path.',
      bullets: [
        'Works as a fast QR conversion example',
        'Shows the bridge from sign to live listing',
        'Easy handoff piece in a sales demo'
      ]
    },
    'ig-post': {
      title: 'IG Post',
      subtitle: 'Square Social',
      badge: 'Social Ready',
      accent: '#8b5cf6',
      description: 'Fake, polished social post for the demo gallery.',
      bullets: [
        'Just-listed square creative for feed posting',
        'Keeps the property details and CTA visible',
        'Gives sales demos a concrete social asset to show'
      ]
    },
    'ig-story': {
      title: 'IG Story',
      subtitle: 'Story Creative',
      badge: 'Story Ready',
      accent: '#14b8a6',
      description: 'Fake vertical story creative that feels ready to post.',
      bullets: [
        'Built for quick scan-and-show walkthroughs',
        'Matches the property report CTA path',
        'Good visual proof that the listing brain feeds marketing'
      ]
    }
  }

  const socialCaptions: Record<'ig-post' | 'ig-story', string> = {
    'ig-post': `Just listed in ${listingMeta.city}. ${listingMeta.beds} bed, ${listingMeta.baths} bath, ${listingMeta.sqft.toLocaleString('en-US')} sq ft, and priced at ${formatPrice(listingMeta.price)}. DM for the property report, private showing times, and the full buyer details.`,
    'ig-story': `New in ${listingMeta.city}. Tap through for the property report, showing request, and full listing details. ${formatPrice(listingMeta.price)} | ${listingMeta.beds} bd | ${listingMeta.baths} ba.`
  }

  const currentMeta = meta[assetKey]
  if (!currentMeta) {
    return <Navigate to={`/demo-dashboard/gallery/${listingId}`} replace />
  }

  const isSocial = assetKey === 'ig-post' || assetKey === 'ig-story'

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/demo-dashboard/gallery/${listingId}`}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800"
        >
          Back to Demo Gallery
        </Link>
        <a
          href={downloadUrls[assetKey]}
          download
          className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
        >
          Download {currentMeta.title}
        </a>
        <a
          href={`/demo-live/${listingMeta.slug}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800"
        >
          Open Demo Live Listing
        </a>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">{currentMeta.badge}</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{currentMeta.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{currentMeta.description}</p>
          </div>

          <div className="p-6">
            {isSocial ? (
              <div className="space-y-5">
                <DemoSocialMockup
                  format={assetKey === 'ig-story' ? 'ig_story' : 'ig_post'}
                  imageUrl={previewImage}
                  address={`${listingMeta.address}, ${listingMeta.city}, ${listingMeta.state}`}
                  priceLabel={formatPrice(listingMeta.price)}
                  beds={listingMeta.beds}
                  baths={listingMeta.baths}
                  sqft={listingMeta.sqft}
                />
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Copy-ready caption</div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{socialCaptions[assetKey]}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#f8f3ea] shadow-inner">
                  <div className="grid gap-5 p-5 lg:grid-cols-[1.05fr_0.95fr]">
                    <div>
                      <div className="inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white" style={{ backgroundColor: currentMeta.accent }}>
                        Demo Preview
                      </div>
                      <div className="mt-4 text-4xl font-black leading-[0.92] tracking-tight text-slate-950">
                        {currentMeta.title}
                      </div>
                      <div className="mt-4 text-base font-semibold text-slate-700">
                        {listingMeta.address}, {listingMeta.city}, {listingMeta.state}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">{formatPrice(listingMeta.price)}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900">{listingMeta.beds} bd</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900">{listingMeta.baths} ba</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900">{listingMeta.sqft.toLocaleString('en-US')} sq ft</span>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-sm">
                      <img
                        src={previewImage}
                        alt={listingMeta.title}
                        className="h-full min-h-[280px] w-full object-cover"
                        loading="eager"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">What this piece shows</div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {currentMeta.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-1 h-2 w-2 flex-none rounded-full bg-slate-900" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </article>

        <aside className="space-y-5">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Updated marketing material</div>
            <div className="mt-3 text-2xl font-black tracking-tight text-slate-950">Use this as a live sales-demo handoff.</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              These preview pages are intentionally light and stable. They show the finished asset story without making the demo depend on a heavy backend PDF render every time someone clicks Open.
            </p>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Current demo listing</div>
            <div className="mt-3 text-2xl font-black text-slate-950">{listingMeta.title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{demoDescription}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Price</div>
                <div className="mt-1 font-black text-slate-950">{formatPrice(listingMeta.price)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Layout</div>
                <div className="mt-1 font-black text-slate-950">{listingMeta.beds} bd / {listingMeta.baths} ba</div>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </div>
  )
}

export default DemoAssetPreviewPage
