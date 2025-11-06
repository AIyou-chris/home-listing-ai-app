export interface LanguageDetectionResult {
  language: string
  confidence: number
  isReliable?: boolean
}

export const detectLanguage = async (text: string): Promise<LanguageDetectionResult | null> => {
  const trimmed = text?.trim()
  if (!trimmed) return null

  try {
    const response = await fetch('/api/language/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: trimmed })
    })

    if (response.status === 503) {
      // Translation service not configured – silently skip
      return null
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Language detection failed (${response.status}): ${errorText}`)
    }

    const payload = (await response.json()) as LanguageDetectionResult
    if (!payload?.language) {
      return null
    }

    return {
      language: payload.language.toLowerCase(),
      confidence: Number.isFinite(payload.confidence) ? payload.confidence : 0,
      isReliable: payload.isReliable
    }
  } catch (error) {
    console.warn('[LanguageDetection] detectLanguage error', error)
    return null
  }
}

