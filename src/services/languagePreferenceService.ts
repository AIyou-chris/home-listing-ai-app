import { updateAICardProfile } from './aiCardService'
import { detectLanguage } from './languageDetectionService'

export const SUPPORTED_LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  'pt-br': 'Portuguese (Brazil)',
  'pt-pt': 'Portuguese (Portugal)',
  zh: 'Chinese',
  'zh-cn': 'Chinese (Simplified)',
  'zh-tw': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean'
}

const STORAGE_KEY = 'hlai.language'

export const normalizeLanguageCode = (code?: string | null): string => {
  if (!code || typeof code !== 'string') return 'en'
  const lower = code.trim().toLowerCase()
  if (!lower) return 'en'
  if (SUPPORTED_LANGUAGE_LABELS[lower]) return lower

  const base = lower.split('-')[0]
  if (SUPPORTED_LANGUAGE_LABELS[base]) {
    return base
  }

  // Unknown languages fall back to English to avoid broken prompts
  return lower.length === 2 ? lower : 'en'
}

export const getLanguageLabel = (code: string): string => {
  const normalized = normalizeLanguageCode(code)
  return SUPPORTED_LANGUAGE_LABELS[normalized] || 'English'
}

export const getPreferredLanguage = (override?: string): string => {
  if (override) {
    return normalizeLanguageCode(override)
  }

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return normalizeLanguageCode(stored)
    }
  }

  return 'en'
}

export const setPreferredLanguage = async (
  language: string,
  { persist = true }: { persist?: boolean } = {}
): Promise<string> => {
  const normalized = normalizeLanguageCode(language)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, normalized)
  }

  if (persist) {
    try {
      await updateAICardProfile({ language: normalized })
    } catch (error) {
      console.warn('[LanguagePreference] Failed to persist AI card language', error)
    }
  }

  return normalized
}

export const buildLanguageInstruction = (languageCode: string): string | null => {
  const normalized = normalizeLanguageCode(languageCode)
  if (normalized === 'en') return null
  const label = getLanguageLabel(normalized)
  return `Please respond in ${label} for the remainder of this conversation. If the user switches languages, continue replying in ${label} while acknowledging their request.`
}

export const detectAndUpdateLanguage = async (
  text: string,
  options: { confidenceThreshold?: number; persist?: boolean } = {}
): Promise<string | null> => {
  const trimmed = text?.trim()
  if (!trimmed || trimmed.length < 3) return null

  const { confidenceThreshold = 0.6, persist = true } = options

  const detection = await detectLanguage(trimmed)
  if (!detection || !detection.language) {
    return null
  }

  const normalized = normalizeLanguageCode(detection.language)
  const confidence = detection.confidence ?? 0

  if (confidence < confidenceThreshold) {
    return null
  }

  const current = getPreferredLanguage()
  if (normalized === current) {
    return normalized
  }

  await setPreferredLanguage(normalized, { persist })
  return normalized
}



