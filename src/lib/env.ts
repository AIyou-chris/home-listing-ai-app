const asString = (value: string | boolean | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined

const readViteEnvVar = (key: string): string | undefined => {
  switch (key) {
    case 'VITE_API_BASE_URL':
      return asString(import.meta.env.VITE_API_BASE_URL)
    case 'VITE_API_URL':
      return asString(import.meta.env.VITE_API_URL)
    case 'VITE_APP_URL':
      return asString(import.meta.env.VITE_APP_URL)
    case 'VITE_BACKEND_URL':
      return asString(import.meta.env.VITE_BACKEND_URL)
    case 'VITE_VOICE_API_BASE_URL':
      return asString(import.meta.env.VITE_VOICE_API_BASE_URL)
    case 'VITE_SUPABASE_URL':
      return asString(import.meta.env.VITE_SUPABASE_URL)
    case 'VITE_SUPABASE_ANON_KEY':
      return asString(import.meta.env.VITE_SUPABASE_ANON_KEY)
    case 'VITE_ENABLE_GOOGLE_INTEGRATIONS':
      return asString(import.meta.env.VITE_ENABLE_GOOGLE_INTEGRATIONS)
    case 'VITE_GOOGLE_OAUTH_CLIENT_ID':
      return asString(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID)
    case 'VITE_STRIPE_PRO_PRICE_ID':
      return asString(import.meta.env.VITE_STRIPE_PRO_PRICE_ID)
    case 'VITE_DATAFINITI_API_KEY':
      return asString(import.meta.env.VITE_DATAFINITI_API_KEY)
    case 'VITE_TURNSTILE_SITE_KEY':
      return asString(import.meta.env.VITE_TURNSTILE_SITE_KEY)
    default:
      return undefined
  }
}

export const getEnvVar = (key: string): string | undefined => {
  const viteValue = readViteEnvVar(key)
  if (typeof viteValue === 'string') return viteValue

  if (typeof globalThis !== 'undefined') {
    const globalEnv = (globalThis as { __VITE_ENV__?: Record<string, string | undefined> }).__VITE_ENV__
    const globalValue = globalEnv?.[key]
    if (typeof globalValue === 'string') return globalValue
  }

  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    return process.env[key]
  }

  return undefined
}

export const getBooleanEnv = (key: string): boolean => {
  const value = getEnvVar(key)
  return String(value ?? '').trim().toLowerCase() === 'true'
}
