import { listingsService } from '../services/listingsService'
import { AgentProfile, Property } from '../types'

export async function seedSampleProperty(agent: AgentProfile, agentId?: string): Promise<Property> {
  const now = new Date()
  const title = 'Stunning Mid‑Century Modern in Silver Lake'
  const address = '2847 Sunset Boulevard, Los Angeles, CA 90026'

  const created = await listingsService.createProperty({
    title,
    address,
    price: 1250000,
    bedrooms: 3,
    bathrooms: 2.5 as unknown as number, // keep numeric; UI formats half bath
    squareFeet: 2100,
    propertyType: 'Single-Family Home',
    status: 'Active',
    description: {
      title: 'Architectural Gem with Pool & City Views',
      paragraphs: [
        `Welcome to this stunning mid‑century modern home nestled in the heart of Silver Lake! This architectural gem blends vintage charm with contemporary luxury.`,
        `Open‑concept living features soaring ceilings, floor‑to‑ceiling windows, natural light, and original hardwood floors meticulously restored.`,
        `Gourmet kitchen boasts custom walnut cabinetry, quartz countertops, and high‑end stainless steel appliances perfect for the culinary enthusiast.`,
      ],
    },
    features: [
      'Pool with city skyline views',
      'Custom walnut cabinetry',
      'Quartz countertops',
      'Restored hardwood floors',
      'Primary suite with balcony',
      'Two‑car garage',
    ],
    heroPhotos: [
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1600&auto=format&fit=crop',
    ],
    galleryPhotos: [
      'https://images.unsplash.com/photo-1560185008-b033106af2da?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop',
    ],
    ctaListingUrl: 'https://example.com/listing/stunning-mid-century',
    ctaMediaUrl: 'https://example.com/media/tour',
    appFeatures: {
      gallery: true,
      schools: true,
      financing: true,
      virtualTour: true,
      amenities: true,
      schedule: true,
      map: true,
      history: true,
      neighborhood: true,
      reports: true,
      messaging: true,
    },
    agentSnapshot: agent,
    agentId: agentId ?? null,
  })

  // Ensure a hero image is available for UI cards
  if (!created.imageUrl) {
    const hero = created.heroPhotos?.[0]
    created.imageUrl =
      typeof hero === 'string'
        ? hero
        : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1600&auto=format&fit=crop'
  }

  // Stamp a listed date if missing for sorting in some views
  if (!created.listedDate) {
    created.listedDate = now.toISOString()
  }

  return created
}



