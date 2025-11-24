import {
  buildLanguageInstruction,
  getLanguageLabel,
  getPreferredLanguage,
  normalizeLanguageCode,
  setPreferredLanguage
} from '../languagePreferenceService'

jest.mock('../aiCardService', () => ({
  updateAICardProfile: jest.fn().mockResolvedValue({})
}))

describe('languagePreferenceService', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
    jest.clearAllMocks()
  })

  it('normalizes language codes and labels', () => {
    expect(normalizeLanguageCode('ES')).toBe('es')
    expect(normalizeLanguageCode('pt-BR')).toBe('pt-br')
    expect(getLanguageLabel('zh-cn')).toContain('Chinese')
  })

  it('returns stored language preference', async () => {
    await setPreferredLanguage('es', { persist: false })
    expect(getPreferredLanguage()).toBe('es')
    expect(buildLanguageInstruction('es')).toContain('Spanish')
  })
})

