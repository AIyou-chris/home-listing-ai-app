const normalizeBase = (): string => {
  const raw = import.meta.env?.VITE_API_BASE_URL
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed.length) return ''
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



