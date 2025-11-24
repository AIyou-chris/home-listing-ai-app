const resolveGlobalEnv = (): Record<string, string | undefined> => {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as { __VITE_ENV__?: Record<string, string> }).__VITE_ENV__ !== 'undefined') {
    return (globalThis as { __VITE_ENV__?: Record<string, string> }).__VITE_ENV__ ?? {};
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }

  return {};
};

export const getEnvVar = (key: string): string | undefined => {
  const env = resolveGlobalEnv();
  return env[key];
};

export const getBooleanEnv = (key: string): boolean => {
  const value = getEnvVar(key);
  return String(value ?? '').trim().toLowerCase() === 'true';
};
