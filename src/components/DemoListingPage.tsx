import React, { useState } from 'react'
import PublicPropertyApp from './PublicPropertyApp'
import PublicListingChatModule from './public/PublicListingChatModule'
import { SAMPLE_AGENT } from '../constants'
import { Property } from '../types'

const DemoListingPage: React.FC = () => {
  const [open, setOpen] = useState(true)
  const [talkToHomeOpen, setTalkToHomeOpen] = useState(false)
  const demo: Property = {
    id: 'demo-1',
    title: 'Modern Family Home',
    address: '123 Palm Drive, San Diego, CA 92101',
    price: 985000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2450,
    status: 'Active',
    listedDate: new Date().toISOString().slice(0,10),
    description: {
      title: 'Stylish comfort in a prime location',
      paragraphs: [
        'This light-filled home features an open concept layout, chef’s kitchen, and a serene primary suite.',
        'Enjoy the private backyard with covered patio perfect for entertaining.'
      ]
    },
    heroPhotos: [
      '/demo/home-1.png',
      '/demo/home-2.png',
      '/demo/home-3.png'
    ],
    galleryPhotos: [
      '/demo/home-1.png',
      '/demo/home-2.png',
      '/demo/home-3.png'
    ],
    appFeatures: {},
    agent: SAMPLE_AGENT,
    propertyType: 'Single-Family Home',
    features: ['Hardwood Floors','Quartz Counters','Backyard','Two-Car Garage'],
    imageUrl: '/demo/home-1.png',
    ctaListingUrl: 'https://example.com/listing/123',
    ctaMediaUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
  }

  return (
    <>
      {open && (
        <>
          <PublicPropertyApp
            property={demo}
            onExit={() => setOpen(false)}
            showBackButton={false}
            onTalkToHome={() => setTalkToHomeOpen(true)}
          />
          <PublicListingChatModule
            property={demo}
            open={talkToHomeOpen}
            hideLauncher
            demoMode
            onOpenChange={setTalkToHomeOpen}
          />
        </>
      )}
    </>
  )
}

export default DemoListingPage
