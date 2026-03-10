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
    // Strip any base64 photos that were persisted by older code versions
    return parsed
      .filter((item): item is LocalListingDraftRecord =>
        Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
      )
      .map((item) => ({ ...item, photos: sanitizePhotos(item.photos ?? []) }))
  } catch {
    return []
  }
}

const writeAll = (records: LocalListingDraftRecord[]) => {
  if (typeof window === 'undefined') return
  // Sanitize ALL records (not just the incoming one) so old bloated entries
  // already in sessionStorage don't re-bloat the payload on the next write.
  const safe = records.map((r) => ({ ...r, photos: sanitizePhotos(r.photos) }))
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  } catch {
    // Still over quota (e.g. huge descriptions) — strip photos entirely
    try {
      const stripped = safe.map((r) => ({ ...r, photos: [] }))
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
    } catch {
      // Nuclear option: clear the key so the next save succeeds
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
