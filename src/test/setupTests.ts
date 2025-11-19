import '@testing-library/jest-dom';

if (typeof globalThis !== 'undefined') {
  const existingEnv = (globalThis as { __VITE_ENV__?: Record<string, string> }).__VITE_ENV__ ?? {};
  (globalThis as { __VITE_ENV__?: Record<string, string> }).__VITE_ENV__ = {
    ...existingEnv,
    VITE_ENABLE_GOOGLE_INTEGRATIONS: existingEnv.VITE_ENABLE_GOOGLE_INTEGRATIONS ?? 'true',
    GOOGLE_OAUTH_CLIENT_ID: existingEnv.GOOGLE_OAUTH_CLIENT_ID ?? 'test-client-id'
  };
}


