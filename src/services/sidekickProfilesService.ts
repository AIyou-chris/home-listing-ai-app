import { supabase } from './supabase'

export interface SidekickProfile {
  id: string
  user_id: string
  scope: 'agent' | 'listing'
  listing_id: string | null
  voice_label: string | null
  persona_preset: string | null
  description: string | null
  traits: string[] | null
  created_at: string
}

export const getListingProfile = async (
  userId: string,
  listingId: string
): Promise<SidekickProfile | null> => {
  // Skip network calls in preview/local modes
  if (!userId || userId === 'admin_local' || listingId === 'preview-id') {
    return null
  }
  // 1) try per-listing profile
  try {
    const { data: listing, error: e1 } = await supabase
      .from('ai_sidekick_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('scope', 'listing')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (!e1 && listing && listing.length > 0) return listing[0] as any
  } catch {}
  // 2) fallback to agent default listing persona
  try {
    const { data: agent, error: e2 } = await supabase
      .from('ai_sidekick_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('scope', 'agent')
      .is('listing_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
    if (!e2 && agent && agent.length > 0) return agent[0] as any
  } catch {}
  return null
}

export const upsertAgentProfile = async (
  userId: string,
  profile: { voice_label?: string | null; persona_preset?: string | null; description?: string | null; traits?: string[] | null }
): Promise<SidekickProfile> => {
  const payload = {
    user_id: userId,
    scope: 'agent' as const,
    listing_id: null as const,
    voice_label: profile.voice_label ?? null,
    persona_preset: profile.persona_preset ?? 'custom',
    description: profile.description ?? null,
    traits: profile.traits ?? null
  }
  const { data, error } = await supabase
    .from('ai_sidekick_profiles')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data as unknown as SidekickProfile
}


