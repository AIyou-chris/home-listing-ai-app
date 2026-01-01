const normalizeBase = (): string => {
  const raw = import.meta.env?.VITE_API_BASE_URL
  // Fallback to production backend if env var is missing (Safety Net)
  if (typeof raw !== 'string' || !raw.trim().length) {
    return 'https://home-listing-ai-backend.onrender.com'
  }
  const trimmed = raw.trim()
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

const API_BASE_URL = normalizeBase()

export const buildApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error(`buildApiUrl: path must start with '/'. Received "${path}"`)
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

export const getApiBaseUrl = (): string => API_BASE_URL



