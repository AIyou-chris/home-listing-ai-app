import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './installProtectedApiFetch'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { SchedulerProvider } from './context/SchedulerContext'
import { ImpersonationProvider } from './context/ImpersonationContext'
import RouteAnalyticsTracker from './components/RouteAnalyticsTracker'

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)

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
          <SchedulerProvider>
            <ImpersonationProvider>
              <App />
            </ImpersonationProvider>
          </SchedulerProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
)
