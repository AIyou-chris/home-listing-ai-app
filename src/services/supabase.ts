import { createClient } from '@supabase/supabase-js'

// Safe environment access for both Vite and Node contexts
const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key] as string
    }
  } catch (e) { /* ignore */ }

  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key]
    }
  } catch (e) { /* ignore */ }

  return undefined
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  role: 'lead' | 'client'
  stage: string
  avatar?: string
  sequences?: string[]
  pipeline_note?: string
  user_id: string
  created_at: string
  updated_at: string
  // Lead Scoring V2
  score?: number
  score_tier?: string
  score_breakdown?: unknown[]
  last_behavior_at?: string
}

export interface ContactNote {
  id: string
  contact_id: string
  content: string
  user_id: string
  created_at: string
}

export interface ContactFile {
  id: string
  contact_id: string
  name: string
  url: string
  user_id: string
  created_at: string
}
