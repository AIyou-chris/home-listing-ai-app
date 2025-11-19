export {}

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string
    readonly VITE_API_URL?: string
    readonly VITE_BACKEND_URL?: string
    readonly VITE_SUPABASE_URL?: string
    readonly VITE_SUPABASE_ANON_KEY?: string
    readonly VITE_DATAFINITI_API_KEY?: string
    readonly VITE_OPENAI_API_KEY?: string
    readonly VITE_GEMINI_API_KEY?: string
    readonly VITE_ENABLE_GOOGLE_INTEGRATIONS?: string
    readonly VITE_DASHBOARD_BASE_URL?: string
    readonly VITE_MAILGUN_API_KEY?: string
    readonly VITE_MAILGUN_DOMAIN?: string
    readonly VITE_MAILGUN_FROM?: string
    readonly VITE_TURNSTILE_SITE_KEY?: string
    readonly MODE?: string
    readonly BASE_URL?: string
    readonly DEV?: boolean
    readonly PROD?: boolean
    readonly SSR?: boolean
    readonly [key: string]: string | boolean | undefined
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  const __VITE_ENV__: Record<string, string | undefined>
}
