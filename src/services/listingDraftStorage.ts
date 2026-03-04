export interface LocalListingDraftRecord {
  id: string
  title: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  description: string
  amenities: string[]
  photos: string[]
  createdAt: string
}

const STORAGE_KEY = 'dashboard_local_listing_drafts_v1'

const readAll = (): LocalListingDraftRecord[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is LocalListingDraftRecord =>
      Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
    )
  } catch {
    return []
  }
}

const writeAll = (records: LocalListingDraftRecord[]) => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export const saveLocalListingDraft = (record: LocalListingDraftRecord) => {
  const existing = readAll().filter((item) => item.id !== record.id)
  writeAll([record, ...existing].slice(0, 20))
}

export const getLocalListingDraft = (id: string): LocalListingDraftRecord | null => {
  return readAll().find((item) => item.id === id) || null
}

export const listLocalListingDrafts = (): LocalListingDraftRecord[] => {
  return readAll()
}
