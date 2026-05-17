import { getAICardProfile } from '../aiCardService'

jest.mock('../authSession', () => ({
  waitForAuthenticatedUserId: jest.fn().mockResolvedValue(null)
}))

jest.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: null })
      })
    }
  }
}))

jest.mock('../../lib/api', () => ({
  buildApiUrl: (path: string) => `http://localhost:3000${path}`
}))

import { waitForAuthenticatedUserId } from '../authSession'

const mockWaitForAuthenticatedUserId = waitForAuthenticatedUserId as jest.Mock

const mockProfile = {
  id: 'profile-1',
  fullName: 'Jane Agent',
  professionalTitle: 'Realtor',
  company: 'Acme Realty',
  phone: '',
  email: '',
  website: '',
  bio: '',
  brandColor: '#000',
  language: 'en',
  socialMedia: { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' },
  headshot: null,
  logo: null
}

describe('aiCardService — resolveUserId delegation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProfile)
    })
  })

  it('uses the explicit userId when provided — does not call waitForAuthenticatedUserId', async () => {
    await getAICardProfile('explicit-user-99')
    expect(mockWaitForAuthenticatedUserId).not.toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('userId=explicit-user-99'),
      expect.any(Object)
    )
  })

  it('falls back to waitForAuthenticatedUserId when no userId is given', async () => {
    mockWaitForAuthenticatedUserId.mockResolvedValue('auth-user-42')
    await getAICardProfile()
    expect(mockWaitForAuthenticatedUserId).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('userId=auth-user-42'),
      expect.any(Object)
    )
  })

  it('omits userId query param when both explicit and auth resolve to null', async () => {
    mockWaitForAuthenticatedUserId.mockResolvedValue(null)
    await getAICardProfile(undefined)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.not.stringContaining('userId='),
      expect.any(Object)
    )
  })
})
