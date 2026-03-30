import React from 'react'

interface DemoSocialMockupProps {
  format: 'ig_post' | 'ig_story'
  imageUrl: string
  address: string
  priceLabel: string
  beds: number
  baths: number
  sqft: number
}

const DemoSocialMockup: React.FC<DemoSocialMockupProps> = ({
  format,
  imageUrl,
  address,
  priceLabel,
  beds,
  baths,
  sqft
}) => {
  const isStory = format === 'ig_story'
  const badge = isStory ? 'Story Ready' : 'IG Post'
  const headline = isStory ? 'SCAN FOR THE PROPERTY REPORT' : 'JUST LISTED'
  const subline = isStory
    ? 'Property details + showing request'
    : 'DM for pricing, details, and private tour info'

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-2xl ${isStory ? 'aspect-[9/16]' : 'aspect-[4/5]'}`}
    >
      <img
        src={imageUrl}
        alt={address}
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/30 to-black/82" />

      <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-7">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src="/newlogo.png" alt="" className="h-8 w-8 rounded-lg bg-white/90 p-1" />
              <div>
                <div className="text-sm font-black tracking-tight">HomeListingAI</div>
                <div className="mt-1 inline-flex rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                  {badge}
                </div>
              </div>
            </div>
            <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-900">
              {priceLabel}
            </div>
          </div>

          <div className={`mt-5 max-w-[80%] font-black uppercase tracking-tight text-white drop-shadow-2xl ${isStory ? 'text-4xl leading-[0.95] sm:text-5xl' : 'text-3xl leading-[0.95] sm:text-4xl'}`}>
            {headline}
          </div>

          <div className={`mt-4 max-w-[85%] text-white/95 ${isStory ? 'text-xl font-semibold' : 'text-lg font-semibold'}`}>
            {address}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white">{beds} Beds</span>
            <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white">{baths} Baths</span>
            <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white">{sqft.toLocaleString('en-US')} Sq Ft</span>
          </div>
        </div>

        <div className={`grid gap-3 ${isStory ? 'grid-cols-[1.2fr_0.8fr]' : 'grid-cols-1'}`}>
          <div className="rounded-[24px] border border-white/15 bg-black/48 p-4 backdrop-blur-md">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Scan destination</div>
            <div className={`mt-2 font-black leading-[0.95] ${isStory ? 'text-3xl' : 'text-2xl'}`}>
              {subline}
            </div>
            <div className="mt-3 text-xs font-semibold text-white/75">
              https://homelistingai.com/l/demo-listing-oak
            </div>
          </div>

          {isStory ? (
            <div className="rounded-[24px] bg-white/96 p-4 text-slate-950">
              <div className="grid h-full place-items-center rounded-[20px] border border-slate-300 bg-white text-center">
                <div>
                  <div className="text-5xl font-black tracking-[0.18em] text-slate-900">QR</div>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Demo preview</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default DemoSocialMockup
