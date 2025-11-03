import { supabase } from './supabase'

export interface KbSearchHit {
  answer: string
  sourceIds?: string[]
}

interface ListingKbRow {
  id: string
  user_id: string
  scope: 'agent' | 'listing'
  listing_id: string | null
  type: string | null
  title: string | null
  content: string | null
  created_at: string
}

// Placeholder search: try exact matches by listing or agent scope
export const searchListingKb = async (
  userId: string,
  listingId: string | 'agent',
  query: string
): Promise<KbSearchHit | null> => {
  try {
    const scope = listingId === 'agent' ? 'agent' : 'listing'
    const { data, error } = await supabase
      .from<ListingKbRow>('ai_listing_kb')
      .select('*')
      .eq('user_id', userId)
      .eq('scope', scope)
      .eq('listing_id', scope === 'listing' ? listingId : null)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    const hay = (data || [])
      .map(record => `${record.title ?? ''}\n${record.content ?? ''}`.toLowerCase())
      .join('\n\n')
    const q = query.toLowerCase()
    if (hay.includes(q)) {
      // naive answer: clip around first occurrence
      const idx = hay.indexOf(q)
      const snippet = hay.slice(Math.max(0, idx - 160), idx + q.length + 240)
      return { answer: snippet.trim() }
    }
    return null
  } catch {
    return null
  }
}

export const addListingText = async (
  userId: string,
  listingId: string,
  title: string,
  content: string
): Promise<ListingKbRow> => {
  const { data, error } = await supabase
    .from<ListingKbRow>('ai_listing_kb')
    .insert({ user_id: userId, scope: 'listing', listing_id: listingId, type: 'text', title, content })
    .select('*')
    .single()
  if (error) throw error
  return data
}


