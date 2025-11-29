import { supabase } from './supabase'

export const getAuthenticatedUserId = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.warn('[SessionUtils] getUser error:', error)
      return null
    }
    return data?.user?.id ?? null
  } catch (error) {
    console.warn('[SessionUtils] Failed to resolve user:', error)
    return null
  }
}

export const hasActiveSession = async (): Promise<boolean> => {
  const id = await getAuthenticatedUserId()
  return Boolean(id)
}


