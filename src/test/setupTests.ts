import '@testing-library/jest-dom'

;(globalThis as Record<string, unknown> & { __VITE_ENV__?: Record<string, unknown> }).__VITE_ENV__ = {}

if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({})
  })) as unknown as typeof fetch
}
