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
  const { data: listingProfiles, error: listingError } = await supabase
    .from('ai_sidekick_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('scope', 'listing')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (listingError) {
    console.error('Failed to fetch listing sidekick profile', listingError)
  } else if (listingProfiles && listingProfiles.length > 0) {
    return listingProfiles[0]
  }

  // 2) fallback to agent default listing persona
  const { data: agentProfiles, error: agentError } = await supabase
    .from('ai_sidekick_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('scope', 'agent')
    .is('listing_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (agentError) {
    console.error('Failed to fetch agent sidekick profile', agentError)
  } else if (agentProfiles && agentProfiles.length > 0) {
    return agentProfiles[0]
  }
  return null
}

export const upsertAgentProfile = async (
  userId: string,
  profile: { voice_label?: string | null; persona_preset?: string | null; description?: string | null; traits?: string[] | null }
): Promise<SidekickProfile> => {
  const payload = {
    user_id: userId,
    scope: 'agent' as const,
    listing_id: null,
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
  return data
}

export const upsertListingProfile = async (
  userId: string,
  listingId: string,
  profile: { description?: string | null; traits?: string[] | null; persona_preset?: string | null }
): Promise<SidekickProfile> => {
  const payload = {
    user_id: userId,
    scope: 'listing' as const,
    listing_id: listingId,
    description: profile.description ?? null,
    traits: profile.traits ?? null,
    persona_preset: profile.persona_preset ?? 'custom'
  }

  const { data, error } = await supabase
    .from('ai_sidekick_profiles')
    .upsert(payload, { onConflict: 'user_id,scope,listing_id' })
    .select('*')
    .single()

  if (error) throw error
  return data
}
