import { getEnvVar } from './env'

const normalizeBase = (): string => {
  const raw =
    getEnvVar('VITE_BACKEND_URL') ||
    getEnvVar('VITE_API_BASE_URL') ||
    getEnvVar('VITE_API_URL') ||
    getEnvVar('VITE_VOICE_API_BASE_URL')

  if (typeof raw === 'string' && raw.trim().length) {
    const trimmed = raw.trim()
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  }

  // In production/staging, default to same-origin API host when no explicit env is set.
  if (typeof window !== 'undefined') {
    const host = String(window.location.hostname || '').toLowerCase()
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
    if (!isLocalHost) {
      return window.location.origin.replace(/\/+$/, '')
    }
  }

  // Local development fallback.
  return 'http://localhost:3002'
}

const API_BASE_URL = normalizeBase()

export const buildApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error(`buildApiUrl: path must start with '/'. Received "${path}"`)
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

export const getApiBaseUrl = (): string => API_BASE_URL

