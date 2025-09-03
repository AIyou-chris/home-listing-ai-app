import { supabase } from './supabase'

export interface KbSearchHit {
  answer: string
  sourceIds?: string[]
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
      .from('ai_listing_kb')
      .select('*')
      .eq('user_id', userId)
      .eq('scope', scope)
      .eq('listing_id', scope === 'listing' ? listingId : null)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    const hay = (data || [])
      .map((r: any) => `${r.title || ''}\n${r.content || ''}`.toLowerCase())
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
) => {
  const { data, error } = await supabase
    .from('ai_listing_kb')
    .insert({ user_id: userId, scope: 'listing', listing_id: listingId, type: 'text', title, content })
    .select('*')
    .single()
  if (error) throw error
  return data
}


