type RuntimeEnv = Record<string, unknown>

declare global {
  interface Window {
    __VITE_ENV__?: RuntimeEnv
  }
}

let cachedEnv: RuntimeEnv | undefined

const computeRuntimeEnv = (): RuntimeEnv => {
  const globalObject = globalThis as typeof globalThis & { __VITE_ENV__?: RuntimeEnv }
  if (globalObject.__VITE_ENV__ && typeof globalObject.__VITE_ENV__ === 'object') {
    return globalObject.__VITE_ENV__
  }

  if (typeof process !== 'undefined' && typeof process.env === 'object') {
    const entries = Object.entries(process.env).filter(([, value]) => value !== undefined) as [string, string][]
    const env: RuntimeEnv = Object.fromEntries(entries)

    if (!env.MODE) {
      env.MODE = process.env.NODE_ENV ?? 'production'
    }

    if (typeof env.DEV !== 'boolean') {
      env.DEV = (env.MODE as string) !== 'production'
    }

    if (typeof env.PROD !== 'boolean') {
      env.PROD = (env.MODE as string) === 'production'
    }

    if (typeof env.SSR !== 'boolean') {
      env.SSR = false
    }

    if (!env.BASE_URL) {
      env.BASE_URL = process.env.BASE_URL ?? ''
    }

    return env
  }

  return {}
}

const getRuntimeEnv = (): RuntimeEnv => {
  if (!cachedEnv) {
    cachedEnv = computeRuntimeEnv()
  }
  return cachedEnv
}

export const getEnvValue = (key: string): string | undefined => {
  const env = getRuntimeEnv()
  const value = env[key]
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

export const getBooleanEnvValue = (key: string): boolean | undefined => {
  const env = getRuntimeEnv()
  const value = env[key]
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return undefined
}

export const getEnvObject = (): RuntimeEnv => ({ ...getRuntimeEnv() })

export const isDevEnv = (): boolean => {
  const devFlag = getBooleanEnvValue('DEV')
  if (typeof devFlag === 'boolean') {
    return devFlag
  }
  const mode = getEnvValue('MODE')
  if (mode) {
    return mode !== 'production'
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production'
  }
  return false
}
