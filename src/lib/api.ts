const normalizeBase = (): string => {
  // Check common env vars, prioritizing standard VITE_BACKEND_URL
  const raw = import.meta.env?.VITE_BACKEND_URL || import.meta.env?.VITE_API_BASE_URL

  // Default to local backend for development reliability
  if (typeof raw !== 'string' || !raw.trim().length) {
    return 'http://localhost:3002'
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



