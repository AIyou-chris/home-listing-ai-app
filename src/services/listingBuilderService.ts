import { buildApiUrl } from '../lib/api'
import { isDemoModeActive } from '../demo/useDemoMode'
import { getDemoProperties } from '../demo/demoData'
import { resolveAgentId } from './dashboardCommandService'

export type ListingBrainSourceType = 'text' | 'doc' | 'url'
export type ListingBrainSourceStatus = 'trained' | 'needs_retrain'

export interface ListingBuilderRecord {
  id: string
  status: string
  address: string
  price: number
  beds: number
  baths: number
  sqft: number
  description: string
  photos: string[]
}

export interface ListingBuilderSource {
  id: string
  type: ListingBrainSourceType
  title: string
  status: ListingBrainSourceStatus
  trained_at: string | null
  updated_at: string | null
  content?: string | null
  url?: string | null
}

export interface CreateListingDraftInput {
  status?: string
  address?: string
}

export interface PatchListingInput {
  address?: string
  price?: number
  beds?: number
  baths?: number
  sqft?: number
  description?: string
  photos?: string[]
}

export interface CreateSourceInput {
  type: ListingBrainSourceType
  title: string
  content?: string | null
  url?: string | null
  status?: ListingBrainSourceStatus
  trained_at?: string | null
}

export interface UpdateSourceInput {
  type?: ListingBrainSourceType
  title?: string
  content?: string | null
  url?: string | null
  status?: ListingBrainSourceStatus
  trained_at?: string | null
}

type ListingPayloadResponse = {
  listing: ListingBuilderRecord
  brain_sources?: ListingSourceApi[]
}

type ListingSourceApiType = 'text' | 'file' | 'url'

interface ListingSourceApi {
  id: string
  type: ListingSourceApiType
  title: string
  status: ListingBrainSourceStatus
  trained_at: string | null
  updated_at: string | null
  content?: string | null
  url?: string | null
}

const sourceTypeFromApi = (value: ListingSourceApiType | string): ListingBrainSourceType => {
  if (value === 'file') return 'doc'
  if (value === 'url') return 'url'
  return 'text'
}

const sourceTypeToApi = (value: ListingBrainSourceType): ListingSourceApiType => {
  if (value === 'doc') return 'file'
  if (value === 'url') return 'url'
  return 'text'
}

const withAgentQuery = (path: string, agentId: string | null): string => {
  if (!agentId) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}agentId=${encodeURIComponent(agentId)}`
}

const defaultJsonHeaders = (agentId: string | null): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(agentId ? { 'x-user-id': agentId } : {})
})

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

const mapSource = (source: ListingSourceApi): ListingBuilderSource => ({
  id: source.id,
  type: sourceTypeFromApi(source.type),
  title: source.title || 'Source',
  status: source.status || 'needs_retrain',
  trained_at: source.trained_at || null,
  updated_at: source.updated_at || null,
  content: source.content ?? null,
  url: source.url ?? null
})

const buildDemoListingPayload = (listingId: string): { listing: ListingBuilderRecord; brain_sources: ListingBuilderSource[] } => {
  const property = getDemoProperties().find((entry) => entry.id === listingId) || getDemoProperties()[0]
  const description =
    typeof property.description === 'string'
      ? property.description
      : Array.isArray(property.description?.paragraphs)
        ? property.description.paragraphs.filter((value): value is string => typeof value === 'string').join('\n\n')
        : ''
  const photos = [...(property.heroPhotos || []), ...(property.galleryPhotos || [])].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  )
  return {
    listing: {
      id: property.id,
      status: String(property.status || 'active').toLowerCase(),
      address: property.address || '',
      price: Number(property.price || 0),
      beds: Number(property.bedrooms || 0),
      baths: Number(property.bathrooms || 0),
      sqft: Number(property.squareFeet || 0),
      description,
      photos
    },
    brain_sources: [
      {
        id: `${property.id}-source-description`,
        type: 'text',
        title: 'Listing narrative',
        status: 'trained',
        trained_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: description,
        url: null
      }
    ]
  }
}

const resolveListingAgent = async (agentIdOverride?: string | null): Promise<string | null> => {
  if (agentIdOverride !== undefined) return agentIdOverride
  if (isDemoModeActive()) return null
  return resolveAgentId()
}

export const createListingDraft = async (input: CreateListingDraftInput = {}, agentIdOverride?: string | null) => {
  const agentId = await resolveListingAgent(agentIdOverride)
  const response = await fetch(buildApiUrl(withAgentQuery('/api/dashboard/listings', agentId)), {
    method: 'POST',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify(input)
  })
  return parseResponse<ListingPayloadResponse>(response)
}

export const fetchListingBuilderPayload = async (listingId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return buildDemoListingPayload(listingId)
  }
  const agentId = await resolveListingAgent(agentIdOverride)
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}`, agentId)), {
    headers: defaultJsonHeaders(agentId)
  })
  const payload = await parseResponse<ListingPayloadResponse>(response)
  return {
    listing: payload.listing,
    brain_sources: (payload.brain_sources || []).map(mapSource)
  }
}

export const patchListingBuilder = async (listingId: string, input: PatchListingInput, agentIdOverride?: string | null) => {
  const agentId = await resolveListingAgent(agentIdOverride)
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}`, agentId)), {
    method: 'PATCH',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify(input)
  })
  return parseResponse<{ listing: { id: string; status: string } }>(response)
}

export const listListingBuilderSources = async (listingId: string, agentIdOverride?: string | null) => {
  const agentId = await resolveListingAgent(agentIdOverride)
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/sources`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  )
  const payload = await parseResponse<{ sources: ListingSourceApi[] }>(response)
  return (payload.sources || []).map(mapSource)
}

export const createListingBuilderSource = async (listingId: string, input: CreateSourceInput, agentIdOverride?: string | null) => {
  const agentId = await resolveListingAgent(agentIdOverride)
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/sources`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({
        ...input,
        type: sourceTypeToApi(input.type)
      })
    }
  )
  const payload = await parseResponse<{ source: ListingSourceApi }>(response)
  return mapSource(payload.source)
}

export const updateListingBuilderSource = async (
  listingId: string,
  sourceId: string,
  input: UpdateSourceInput,
  agentIdOverride?: string | null
) => {
  const agentId = await resolveListingAgent(agentIdOverride)
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/sources/${encodeURIComponent(sourceId)}`, agentId)),
    {
      method: 'PATCH',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({
        ...input,
        ...(input.type ? { type: sourceTypeToApi(input.type) } : {})
      })
    }
  )
  const payload = await parseResponse<{ source: ListingSourceApi }>(response)
  return mapSource(payload.source)
}

export const deleteListingBuilderSource = async (listingId: string, sourceId: string, agentIdOverride?: string | null) => {
  const agentId = await resolveListingAgent(agentIdOverride)
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/sources/${encodeURIComponent(sourceId)}`, agentId)),
    {
      method: 'DELETE',
      headers: defaultJsonHeaders(agentId)
    }
  )
  return parseResponse<{ success: boolean }>(response)
}

export const generateListingDescription = async (
  listingId: string,
  fields: { address: string; price: number; beds: number; baths: number; sqft: number },
  agentIdOverride?: string | null
) => {
  const agentId = await resolveListingAgent(agentIdOverride)
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/generate-description`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify(fields)
    }
  )
  const payload = await parseResponse<{ description: string }>(response)
  return payload.description
}

export const uploadListingBrainDoc = async (listingId: string, file: File, agentIdOverride?: string | null) => {
  const agentId = await resolveListingAgent(agentIdOverride)
  const formData = new FormData()
  formData.append('file', file)

  const url = buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/sources/upload`, agentId))
  const headers: HeadersInit = agentId ? { 'x-user-id': agentId } : {}

  const response = await fetch(url, { method: 'POST', headers, body: formData })
  const payload = await parseResponse<{ source: ListingSourceApi }>(response)
  return mapSource(payload.source)
}

export const uploadListingBuilderSourceFile = uploadListingBrainDoc

export const retrainListingBrain = async (listingId: string, agentIdOverride?: string | null) => {
  const agentId = await resolveListingAgent(agentIdOverride)
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/retrain`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({})
    }
  )
  const payload = await parseResponse<{ success?: boolean; message?: string; ai_summary: string | null; sources: ListingSourceApi[] }>(response)
  return {
    ai_summary: payload.ai_summary ?? null,
    sources: (payload.sources || []).map(mapSource)
  }
}
