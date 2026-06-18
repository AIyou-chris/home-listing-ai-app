import '@testing-library/jest-dom';

// Vite exposes config via `import.meta.env`. Under ts-jest (CommonJS) `import.meta`
// is rewritten to `__importMeta__` by src/test/importMetaTransformer.cjs — provide
// that global here so env reads resolve in tests.
(globalThis as { __importMeta__?: { env: Record<string, unknown> } }).__importMeta__ = {
  env: {
    DEV: false,
    PROD: true,
    SSR: false,
    MODE: 'test',
    BASE_URL: '/',
    VITE_API_BASE_URL: '',
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key'
  }
};

// The env module mock (src/lib/__mocks__/env.ts) reads process.env, so seed the
// vars that throw at module load when missing (e.g. src/services/supabase.ts).
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';

// jsdom has no global fetch; provide a default so code paths that call it (e.g.
// scheduler SMS) don't throw ReferenceError. Individual tests can override.
if (typeof (globalThis as { fetch?: unknown }).fetch === 'undefined') {
  (globalThis as { fetch?: unknown }).fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => ''
  })) as unknown as typeof fetch;
}

if (typeof globalThis !== 'undefined') {
  const existingEnv = (globalThis as { __VITE_ENV__?: Record<string, string> }).__VITE_ENV__ ?? {};
  (globalThis as { __VITE_ENV__?: Record<string, string> }).__VITE_ENV__ = {
    ...existingEnv,
    VITE_ENABLE_GOOGLE_INTEGRATIONS: existingEnv.VITE_ENABLE_GOOGLE_INTEGRATIONS ?? 'true',
    GOOGLE_OAUTH_CLIENT_ID: existingEnv.GOOGLE_OAUTH_CLIENT_ID ?? 'test-client-id'
  };
}


