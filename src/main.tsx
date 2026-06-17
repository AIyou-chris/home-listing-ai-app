import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import PublicApp from './PublicApp'
import ErrorBoundary from './components/ErrorBoundary'
import RouteAnalyticsTracker from './components/RouteAnalyticsTracker'
import { reloadForStaleChunks } from './lib/chunkReload'

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)

// Vite fires this when a lazy chunk fails to preload (stale filename after a
// deploy). Recover by reloading once instead of crashing the whole app.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadForStaleChunks()
})

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // The app is currently web-first. Remove old service workers so stale cached
  // shells cannot trap users on auth handoff routes after deploys.
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      void Promise.all(registrations.map((registration) => registration.unregister()))
    }).catch(() => {
      // no-op
    })
  })
}

root.render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <RouteAnalyticsTracker />
        <ErrorBoundary>
          <PublicApp />
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
)
