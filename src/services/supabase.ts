import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yocchddxdsaldgsibmmc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvY2NoZGR4ZHNhbGRnc2libW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1ODEwNDgsImV4cCI6MjA3MjE1NzA0OH0.02jE3WPLnb-DDexNqSnfIPfmPZldsby1dPOu5-BlSDw'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
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
