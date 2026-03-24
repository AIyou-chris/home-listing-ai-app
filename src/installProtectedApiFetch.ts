import { supabase } from './services/supabase'

const PATCH_FLAG = '__hlaiProtectedApiFetchInstalled'
const API_PATH_PREFIX = '/api/'

const resolveAllowedOrigins = (): Set<string> => {
  const origins = new Set<string>()

  if (typeof window !== 'undefined' && window.location?.origin) {
    origins.add(window.location.origin)
  }

  const configuredApiBase = import.meta.env.VITE_API_BASE_URL
  if (typeof configuredApiBase === 'string' && configuredApiBase.trim()) {
    try {
      origins.add(new URL(configuredApiBase).origin)
    } catch (_error) {
      // Ignore malformed optional config.
    }
  }

  return origins
}

const isProtectedRequest = (input: RequestInfo | URL): URL | null => {
  if (typeof window === 'undefined') return null

  const currentOrigin = window.location.origin
  const url =
    input instanceof URL
      ? input
      : input instanceof Request
        ? new URL(input.url, currentOrigin)
        : new URL(String(input), currentOrigin)

  if (!resolveAllowedOrigins().has(url.origin)) {
    return null
  }

  return url.pathname.startsWith(API_PATH_PREFIX) ? url : null
}

const installProtectedApiFetch = () => {
  if (typeof window === 'undefined') return
  if ((window as Window & { [PATCH_FLAG]?: boolean })[PATCH_FLAG]) return

  const originalFetch = window.fetch.bind(window)
  ;(window as Window & { [PATCH_FLAG]?: boolean })[PATCH_FLAG] = true

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const protectedUrl = isProtectedRequest(input)
    if (!protectedUrl) {
      return originalFetch(input, init)
    }

    const request = input instanceof Request ? input : null
    const headers = new Headers(init?.headers || request?.headers || {})
    if (headers.has('Authorization')) {
      return originalFetch(input, init)
    }

    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    const token = data.session?.access_token
    if (!token) {
      return originalFetch(input, init)
    }

    headers.set('Authorization', `Bearer ${token}`)

    if (request) {
      return originalFetch(
        new Request(request, {
          ...init,
          headers
        })
      )
    }

    return originalFetch(input, {
      ...init,
      headers
    })
  }
}

installProtectedApiFetch()
