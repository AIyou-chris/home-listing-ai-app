import { waitForAuthenticatedSession } from './authSession'
import { isDemoModeActive } from '../demo/useDemoMode'

// fetch() that also sends the signed-in user's Bearer token. The owner-scoped
// /api routes (email, security, conversations, sidekicks, listings...) reject calls
// without it, so use this instead of a bare fetch() for any of them.
export const authedFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const session = isDemoModeActive() ? { accessToken: null } : await waitForAuthenticatedSession()
  const headers = new Headers(init.headers || {})
  if (session.accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }
  return fetch(input, { ...init, headers })
}
