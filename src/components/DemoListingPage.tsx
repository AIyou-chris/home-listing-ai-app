import React, { useState } from 'react'
import PublicPropertyApp from './PublicPropertyApp'
import { SAMPLE_AGENT } from '../constants'
import { Property } from '../types'

const DemoListingPage: React.FC = () => {
  const [open, setOpen] = useState(true)
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
    <div className='min-h-screen bg-slate-50 flex items-center justify-center p-6'>
      <div className='max-w-5xl w-full grid md:grid-cols-2 gap-8 items-start'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900 mb-2'>Demo Listing App</h1>
          <p className='text-slate-600 mb-4'>Preview the end-user experience without creating a listing.</p>
          <button onClick={() => setOpen(true)} className='px-4 py-2 rounded-lg bg-slate-900 text-white'>Open Demo</button>
        </div>
        <div className='hidden md:block'>
          <div className='rounded-2xl border border-slate-200 p-4 bg-white'>
            <div className='text-sm text-slate-600'>This demo uses sample data and your new layout: sticky “Talk to the Home” bar, To Listing/Media buttons, See the house, Map, and Gallery.</div>
          </div>
        </div>
      </div>
      {open && (
        <PublicPropertyApp
          property={demo}
          onExit={() => setOpen(false)}
          showBackButton={false}
        />
      )}
    </div>
  )
}

export default DemoListingPage

