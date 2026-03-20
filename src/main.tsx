import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './installProtectedApiFetch'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { SchedulerProvider } from './context/SchedulerContext'
import { ImpersonationProvider } from './context/ImpersonationContext'

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload()
    },
    onOfflineReady() {
      // no-op
    }
  })
}

root.render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
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
