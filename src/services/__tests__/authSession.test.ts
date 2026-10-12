import { resolveUserId, waitForAuthenticatedUserId, waitForAuthenticatedSession } from '../authSession'

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      signOut: jest.fn().mockResolvedValue({ error: null })
    }
  }
}))

jest.mock('../../demo/useDemoMode', () => ({
  isDemoModeActive: jest.fn().mockReturnValue(false)
}))

import { isDemoModeActive } from '../../demo/useDemoMode'
import { supabase } from '../supabase'

const mockIsDemoModeActive = isDemoModeActive as jest.Mock
const mockGetSession = supabase.auth.getSession as jest.Mock
const mockGetUser = supabase.auth.getUser as jest.Mock

describe('resolveUserId', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.clearAllMocks()
  })

  it('returns stored hlai_user_id when present', () => {
    window.localStorage.setItem('hlai_user_id', 'user-abc-123')
    expect(resolveUserId()).toBe('user-abc-123')
  })

  it('returns admin_local when adminUser key is set but no hlai_user_id', () => {
    window.localStorage.setItem('adminUser', JSON.stringify({ email: 'admin@test.com' }))
    expect(resolveUserId()).toBe('admin_local')
  })

  it('hlai_user_id takes precedence over adminUser', () => {
    window.localStorage.setItem('hlai_user_id', 'real-user-id')
    window.localStorage.setItem('adminUser', JSON.stringify({ email: 'admin@test.com' }))
    expect(resolveUserId()).toBe('real-user-id')
  })

  it('returns local as fallback when no keys set', () => {
    expect(resolveUserId()).toBe('local')
  })
})

describe('waitForAuthenticatedUserId', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.clearAllMocks()
    mockIsDemoModeActive.mockReturnValue(false)
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  it('returns demo-agent-busy in demo mode', async () => {
    mockIsDemoModeActive.mockReturnValue(true)
    const userId = await waitForAuthenticatedUserId()
    expect(userId).toBe('demo-agent-busy')
  })

  it('returns userId from Supabase session when authenticated', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'supabase-user-99' }, access_token: 'tok' } }
    })
    const userId = await waitForAuthenticatedUserId()
    expect(userId).toBe('supabase-user-99')
  })

  it('returns userId from getUser when session lacks user id', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-from-getUser' } } })
    const userId = await waitForAuthenticatedUserId()
    expect(userId).toBe('user-from-getUser')
  })

  it('returns null when no session and not authenticated', async () => {
    jest.useFakeTimers()
    const promise = waitForAuthenticatedUserId()
    jest.runAllTimersAsync()
    const userId = await promise
    jest.useRealTimers()
    expect(userId).toBeNull()
  })
})

describe('waitForAuthenticatedSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsDemoModeActive.mockReturnValue(false)
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  it('returns snapshot with userId and accessToken when session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'sess-user-1' }, access_token: 'tok-xyz' } }
    })
    const snapshot = await waitForAuthenticatedSession()
    expect(snapshot.userId).toBe('sess-user-1')
    expect(snapshot.accessToken).toBe('tok-xyz')
  })

  it('returns demo snapshot in demo mode', async () => {
    mockIsDemoModeActive.mockReturnValue(true)
    const snapshot = await waitForAuthenticatedSession()
    expect(snapshot.userId).toBe('demo-agent-busy')
    expect(snapshot.accessToken).toBeNull()
  })

  it('returns null snapshot when unauthenticated', async () => {
    jest.useFakeTimers()
    const promise = waitForAuthenticatedSession()
    jest.runAllTimersAsync()
    const snapshot = await promise
    jest.useRealTimers()
    expect(snapshot.userId).toBeNull()
    expect(snapshot.accessToken).toBeNull()
  })
})


it('discards a cached session after the server says the user was deleted', async () => {
  jest.useFakeTimers();
  mockIsDemoModeActive.mockReturnValue(false);
  mockGetSession.mockResolvedValue({data:{session:{user:{id:'deleted'},access_token:'stale'}}});
  mockGetUser.mockResolvedValue({data:{user:null},error:{code:'user_not_found'}});
  const promise=waitForAuthenticatedSession();
  await jest.runAllTimersAsync();
  expect(await promise).toEqual({userId:null,accessToken:null});
  expect(supabase.auth.signOut).toHaveBeenCalledWith({scope:'local'});
  jest.useRealTimers();
});

it('does not erase a session during a temporary auth-server failure', async () => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({data:{session:{user:{id:'valid'},access_token:'token'}}});
  mockGetUser.mockResolvedValue({data:{user:null},error:{code:'unexpected_failure',status:503}});
  expect(await waitForAuthenticatedSession()).toEqual({userId:'valid',accessToken:'token'});
  expect(supabase.auth.signOut).not.toHaveBeenCalled();
});
