import { isDemoModeActive } from '../demo/useDemoMode'
import { supabase } from './supabase'

export interface AuthSessionSnapshot {
  userId: string | null
  accessToken: string | null
}

const AUTH_WAIT_TIMEOUT_MS = 4000
const AUTH_WAIT_INTERVAL_MS = 150

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const readAuthSnapshot = async (): Promise<AuthSessionSnapshot> => {
  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession().catch(() => ({ data: { session: null } })),
    supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  ])

  return {
    userId: sessionData?.session?.user?.id || userData?.user?.id || null,
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
