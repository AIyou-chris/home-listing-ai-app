const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g

export type VariableValidationResult = {
  missing: string[]
  malformed: string[]
  used: string[]
}

export const validateMessageVariables = (
  message: string,
  allowedVariables: string[]
): VariableValidationResult => {
  const found = new Set<string>()
  const malformed = new Set<string>()

  message.replace(VARIABLE_REGEX, (_, raw: string) => {
    const key = raw?.trim()
    if (key) {
      found.add(key)
    } else {
      malformed.add(raw)
    }
    return ''
  })

  const used = Array.from(found)
  const missing = allowedVariables.filter((key) => !found.has(key))

  return {
    missing,
    malformed: Array.from(malformed),
    used
  }
}

export const VARIABLE_REGEX_SOURCE = VARIABLE_REGEX

