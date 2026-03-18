import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PublicPropertyApp from '../components/PublicPropertyApp'
import PublicListingChatModule from '../components/public/PublicListingChatModule'
import { getDemoPropertyBySlug } from '../demo/demoData'

const DemoPublicListingPage: React.FC = () => {
  const { publicSlug } = useParams<{ publicSlug?: string }>()
  const property = publicSlug ? getDemoPropertyBySlug(publicSlug) : null
  const [talkToHomeOpen, setTalkToHomeOpen] = useState(false)

  useEffect(() => {
    document.body.classList.add('public-listing-fullscreen')
    return () => {
      document.body.classList.remove('public-listing-fullscreen')
    }
  }, [])

  if (!publicSlug || !property) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#02050D] px-6 text-center text-slate-300">
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-900/20 blur-[90px]" />
        <div className="relative z-10 max-w-lg">
          <div className="text-4xl font-black text-white">Demo listing not found</div>
          <p className="mt-3 text-sm leading-6 text-slate-400">Use the sales demo gallery to open one of the finished demo listings.</p>
          <Link to="/demo-dashboard/gallery/demo-listing-oak" className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950">
            Go to demo gallery
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <PublicPropertyApp
        property={property}
        onExit={() => undefined}
        showBackButton={false}
        onTalkToHome={() => setTalkToHomeOpen(true)}
        publicSlug={publicSlug}
        isDemo
      />
      <PublicListingChatModule
        property={property}
        listingSlug={publicSlug}
        open={talkToHomeOpen}
        hideLauncher
        demoMode
        onOpenChange={setTalkToHomeOpen}
      />
    </>
  )
}

export default DemoPublicListingPage
