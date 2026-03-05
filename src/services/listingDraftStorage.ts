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
  /** Photo URLs only — base64 data is never stored here to avoid quota errors. */
  photos: string[]
  createdAt: string
}

const STORAGE_KEY = 'dashboard_local_listing_drafts_v1'

/** Strip base64 data URIs from photo arrays before persisting — only keep URLs. */
const sanitizePhotos = (photos: string[]): string[] =>
  photos.filter((p) => typeof p === 'string' && !p.startsWith('data:'))

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
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Quota exceeded — retry with all photos stripped
    try {
      const stripped = records.map((r) => ({ ...r, photos: [] }))
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
    } catch {
      // Still failing — clear stale data and try once more
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  }
}

export const saveLocalListingDraft = (record: LocalListingDraftRecord) => {
  const sanitized = { ...record, photos: sanitizePhotos(record.photos) }
  const existing = readAll().filter((item) => item.id !== sanitized.id)
  writeAll([sanitized, ...existing].slice(0, 20))
}

export const getLocalListingDraft = (id: string): LocalListingDraftRecord | null => {
  return readAll().find((item) => item.id === id) || null
}

export const listLocalListingDrafts = (): LocalListingDraftRecord[] => {
  return readAll()
}
