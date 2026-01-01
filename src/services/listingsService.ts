import { supabase } from './supabase'
import { Property, AIDescription, AgentProfile } from '../types'
import { SAMPLE_AGENT } from '../constants'
import { buildApiUrl } from '../lib/api'

const PROPERTIES_TABLE = 'properties'

interface PropertyRow {
  id: string
  agent_id: string | null
  title: string | null
  address: string | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  square_feet: number | null
  property_type: string | null
  status: string | null
  description: unknown
  features: string[] | null
  hero_photos: string[] | null
  gallery_photos: string[] | null
  cta_listing_url: string | null
  cta_media_url: string | null
  app_features: Record<string, boolean> | null
  agent_snapshot: unknown
  created_at: string | null
  updated_at: string | null
}

export interface CreatePropertyInput {
  title: string
  address: string
  price: number
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  propertyType?: string
  status?: string
  description?: Property['description']
  features?: string[]
  heroPhotos?: (string | File)[]
  galleryPhotos?: (string | File)[]
  ctaListingUrl?: string
  ctaMediaUrl?: string
  appFeatures?: Record<string, boolean>
  agentId?: string | null
  agentSnapshot?: AgentProfile
}

export type UpdatePropertyInput = Partial<CreatePropertyInput> & { id: string }

const DEFAULT_IMAGE_PLACEHOLDER = 'https://images.unsplash.com/photo-1599809275671-55822c1f6a12?q=80&w=800&auto=format&fit=crop'

const DEFAULT_APP_FEATURES: Record<string, boolean> = {
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
  messaging: true
}

const toArrayOfStrings = (value?: (string | File)[] | null): string[] | null => {
  if (!Array.isArray(value)) return null
  const typed = value.filter((item): item is string => typeof item === 'string')
  return typed.length > 0 ? typed : null
}

const normalizeStatusForStorage = (status?: string | null) => {
  if (!status) return undefined
  const normalized = status.toLowerCase()
  if (['active', 'pending', 'sold'].includes(normalized)) {
    return normalized
  }
  return status
}

const mapStatusFromRow = (status?: string | null): Property['status'] => {
  if (!status) return undefined
  const normalized = status.toLowerCase()
  if (normalized === 'active') return 'Active'
  if (normalized === 'pending') return 'Pending'
  if (normalized === 'sold') return 'Sold'
  return status as Property['status']
}

const serializeDescription = (description?: Property['description']) => {
  if (description === undefined) return undefined
  if (description === null) return null
  if (typeof description === 'string') return description
  if (description && typeof description === 'object') {
    const parsed: AIDescription = {
      title: description.title,
      paragraphs: Array.isArray(description.paragraphs) ? [...description.paragraphs] : []
    }
    return parsed
  }
  return null
}

const ensureAgentSnapshot = (snapshot: unknown): AgentProfile => {
  if (!snapshot || typeof snapshot !== 'object') {
    return { ...SAMPLE_AGENT }
  }

  const candidate = snapshot as Partial<AgentProfile>
  return {
    ...SAMPLE_AGENT,
    ...candidate,
    language: candidate.language ?? SAMPLE_AGENT.language ?? 'en',
    socials: Array.isArray(candidate.socials) ? (candidate.socials as AgentProfile['socials']) : [...SAMPLE_AGENT.socials]
  }
}

const serializeAgentSnapshot = (snapshot?: AgentProfile | null) => {
  if (!snapshot) return null
  return {
    ...snapshot,
    language: snapshot.language ?? SAMPLE_AGENT.language ?? 'en',
    socials: Array.isArray(snapshot.socials) ? snapshot.socials : [...SAMPLE_AGENT.socials]
  }
}

const ensureAppFeatures = (value?: Record<string, boolean> | null) => {
  if (!value) return { ...DEFAULT_APP_FEATURES }
  return { ...DEFAULT_APP_FEATURES, ...value }
}

const mapRowToProperty = (row: PropertyRow): Property => {
  const heroPhotos = Array.isArray(row.hero_photos) ? row.hero_photos : []
  const galleryPhotos = Array.isArray(row.gallery_photos) ? row.gallery_photos : []
  const imageUrl = heroPhotos[0] || galleryPhotos[0] || DEFAULT_IMAGE_PLACEHOLDER

  let description: Property['description'] = ''
  if (row.description && typeof row.description === 'object' && 'title' in (row.description as Record<string, unknown>)) {
    description = row.description as AIDescription
  } else if (typeof row.description === 'string') {
    description = row.description
  }

  const agent = ensureAgentSnapshot(row.agent_snapshot)

  return {
    id: row.id,
    title: row.title ?? '',
    address: row.address ?? '',
    price: Number(row.price) || 0,
    bedrooms: row.bedrooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    squareFeet: row.square_feet ?? 0,
    status: mapStatusFromRow(row.status),
    listedDate: row.created_at ?? undefined,
    description,
    heroPhotos,
    galleryPhotos,
    propertyType: row.property_type ?? 'Single Family',
    features: row.features ?? [],
    appFeatures: ensureAppFeatures(row.app_features),
    agent,
    agentId: row.agent_id ?? undefined,
    imageUrl,
    ctaListingUrl: row.cta_listing_url ?? undefined,
    ctaMediaUrl: row.cta_media_url ?? undefined
  }
}

const buildRowPayload = (input: Partial<CreatePropertyInput>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {}

  if (input.title !== undefined) payload.title = input.title
  if (input.address !== undefined) payload.address = input.address
  if (input.price !== undefined) payload.price = input.price
  if (input.bedrooms !== undefined) payload.bedrooms = input.bedrooms
  if (input.bathrooms !== undefined) payload.bathrooms = input.bathrooms
  if (input.squareFeet !== undefined) payload.square_feet = input.squareFeet
  if (input.propertyType !== undefined) payload.property_type = input.propertyType
  if (input.status !== undefined) payload.status = normalizeStatusForStorage(input.status)

  if (input.description !== undefined) payload.description = serializeDescription(input.description)
  if (input.features !== undefined) payload.features = input.features ?? []

  if (input.heroPhotos !== undefined) payload.hero_photos = toArrayOfStrings(input.heroPhotos)
  if (input.galleryPhotos !== undefined) payload.gallery_photos = toArrayOfStrings(input.galleryPhotos)

  if (input.ctaListingUrl !== undefined) payload.cta_listing_url = input.ctaListingUrl || null
  if (input.ctaMediaUrl !== undefined) payload.cta_media_url = input.ctaMediaUrl || null

  if (input.appFeatures !== undefined) payload.app_features = input.appFeatures ?? null
  if (input.agentId !== undefined) payload.agent_id = input.agentId
  if (input.agentSnapshot !== undefined) payload.agent_snapshot = serializeAgentSnapshot(input.agentSnapshot)

  payload.updated_at = new Date().toISOString()

  return payload
}

export const listingsService = {
  async listProperties(agentId?: string): Promise<Property[]> {
    let effectiveAgentId = agentId
    if (!effectiveAgentId) {
      const { data } = await supabase.auth.getUser()
      effectiveAgentId = data?.user?.id ?? undefined
    }

    if (!effectiveAgentId) {
      return []
    }

    const query = supabase
      .from(PROPERTIES_TABLE)
      .select('*')
      .eq('agent_id', effectiveAgentId)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to load properties: ${error.message}`)
    }

    return (data ?? []).map((row) => mapRowToProperty(row as PropertyRow))
  },

  async getPropertyById(id: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from(PROPERTIES_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load property: ${error.message}`)
    }

    if (!data) return null
    return mapRowToProperty(data as PropertyRow)
  },

  async createProperty(input: CreatePropertyInput): Promise<Property> {
    const heroPhotos = toArrayOfStrings(input.heroPhotos) || [DEFAULT_IMAGE_PLACEHOLDER]
    const galleryPhotos = toArrayOfStrings(input.galleryPhotos)

    const payload = buildRowPayload({
      ...input,
      heroPhotos,
      galleryPhotos,
      appFeatures: ensureAppFeatures(input.appFeatures),
      agentSnapshot: input.agentSnapshot ?? SAMPLE_AGENT,
      status: input.status ?? 'active'
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()
    const agentId = userData?.user?.id
    if (userError || !agentId) {
      throw new Error('Agent must be signed in to create a property')
    }

    const response = await fetch(buildApiUrl('/api/properties'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-id': agentId
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Failed to create property: ${errorBody || response.statusText}`)
    }

    const result = await response.json()
    if (!result?.property) {
      throw new Error('Failed to create property: missing response data')
    }

    return mapRowToProperty(result.property as PropertyRow)
  },

  async updateProperty(id: string, input: CreatePropertyInput | Property): Promise<Property> {
    const payload = buildRowPayload({
      ...input,
      heroPhotos: 'heroPhotos' in input ? input.heroPhotos : undefined,
      galleryPhotos: 'galleryPhotos' in input ? input.galleryPhotos : undefined,
      appFeatures: 'appFeatures' in input ? input.appFeatures : undefined,
      agentSnapshot: 'agent' in input ? input.agent : (input as CreatePropertyInput).agentSnapshot
    })

    const { data, error } = await supabase
      .from(PROPERTIES_TABLE)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to update property: ${error.message}`)
    }

    return mapRowToProperty(data as PropertyRow)
  },

  async deleteProperty(id: string): Promise<void> {
    const { error } = await supabase
      .from(PROPERTIES_TABLE)
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete property: ${error.message}`)
    }
  },

  async generateDescription(input: {
    address: string;
    beds?: string | number;
    baths?: string | number;
    sqft?: string | number;
    features?: string;
    title?: string;
  }): Promise<AIDescription> {
    const { data: userData } = await supabase.auth.getUser();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userData?.user?.id) {
      headers['x-agent-id'] = userData.user.id;
    }

    // Parse features string
    const featuresList = typeof input.features === 'string'
      ? input.features.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const response = await fetch(buildApiUrl('/api/ai/generate-listing'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        address: input.address,
        beds: input.beds,
        baths: input.baths,
        sqft: input.sqft,
        features: featuresList,
        title: input.title
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate description');
    }

    const data = await response.json();
    return data as AIDescription;
  }
}
