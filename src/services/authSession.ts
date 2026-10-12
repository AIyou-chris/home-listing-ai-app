import { isDemoModeActive } from '../demo/useDemoMode'
import { supabase } from './supabase'

export const resolveUserId = (): string => {
  if (typeof window === 'undefined' || !window.localStorage) return 'local'
  try {
    const explicit = window.localStorage.getItem('hlai_user_id')
    if (explicit && typeof explicit === 'string') return explicit
    const admin = window.localStorage.getItem('adminUser')
    if (admin) return 'admin_local'
  } catch (error) {
    console.warn('[userId] Failed to read stored user id', error)
  }
  return 'local'
}

export interface AuthSessionSnapshot {
  userId: string | null
  accessToken: string | null
}

const AUTH_WAIT_TIMEOUT_MS = 4000
const AUTH_WAIT_INTERVAL_MS = 150

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

export const isInvalidAuthSessionError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const code = String((error as { code?: unknown }).code || '')
  return ['user_not_found', 'session_not_found', 'bad_jwt', 'refresh_token_not_found', 'refresh_token_already_used'].includes(code)
}

const readAuthSnapshot = async (): Promise<AuthSessionSnapshot> => {
  const [{ data: sessionData }, userResult] = await Promise.all([
    supabase.auth.getSession().catch(() => ({ data: { session: null } })),
    supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }))
  ])

  if (isInvalidAuthSessionError(userResult.error)) {
    // A persisted token can outlive a deleted account. Clear only this browser's
    // session; never sign out healthy sessions because of a network outage.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    return { userId: null, accessToken: null }
  }
  return {
    userId: userResult.data?.user?.id || sessionData?.session?.user?.id || null,
    accessToken: sessionData?.session?.access_token || null
  }
}

export const waitForAuthenticatedSession = async (): Promise<AuthSessionSnapshot> => {
  if (isDemoModeActive()) {
    return {
      userId: 'demo-agent-busy',
      accessToken: null
    }
  }

  let snapshot = await readAuthSnapshot()
  if (snapshot.userId) return snapshot
  if (typeof window === 'undefined') return snapshot

  const deadline = Date.now() + AUTH_WAIT_TIMEOUT_MS
  while (Date.now() < deadline) {
    await sleep(AUTH_WAIT_INTERVAL_MS)
    snapshot = await readAuthSnapshot()
    if (snapshot.userId) return snapshot
  }

  return snapshot
}

export const waitForAuthenticatedUserId = async (): Promise<string | null> => {
  const snapshot = await waitForAuthenticatedSession()
  return snapshot.userId
}
