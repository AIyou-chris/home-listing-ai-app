export const getEnvVar = (key: string): string | undefined => process.env[key]
export const getBooleanEnv = (key: string): boolean =>
  String(process.env[key] ?? '').trim().toLowerCase() === 'true'
