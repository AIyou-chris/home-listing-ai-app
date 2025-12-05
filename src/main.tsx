import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { SchedulerProvider } from './context/SchedulerContext'
import AgentDashboardBlueprint from './components/AgentDashboardBlueprint'
import { AgentBrandingProvider } from './context/AgentBrandingContext'

import { ImpersonationProvider } from './context/ImpersonationContext'

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)

const rawHash = window.location.hash.replace(/^#/, '')
const hashPath = rawHash.split('?')[0]
const isBlueprintOnlyRoute = hashPath === '/dashboard-blueprint' || hashPath === 'dashboard-blueprint' || hashPath === '/blueprint' || hashPath === 'blueprint'

if (import.meta.env.DEV) {
  console.debug('[main] hash routing', {
    hash: window.location.hash,
    rawHash,
    hashPath,
    isBlueprintOnlyRoute
  })
}

const blueprintTree = (
  <StrictMode>
    <HelmetProvider>
      <HashRouter>
        <ErrorBoundary>
          <SchedulerProvider>
            <ImpersonationProvider>
              <AgentBrandingProvider>
                <AgentDashboardBlueprint />
              </AgentBrandingProvider>
            </ImpersonationProvider>
          </SchedulerProvider>
        </ErrorBoundary>
      </HashRouter>
    </HelmetProvider>
  </StrictMode>
)

const appTree = (
  <StrictMode>
    <HelmetProvider>
      <HashRouter>
        <ErrorBoundary>
          <SchedulerProvider>
            <App />
          </SchedulerProvider>
        </ErrorBoundary>
      </HashRouter>
    </HelmetProvider>
  </StrictMode>
)

root.render(isBlueprintOnlyRoute ? blueprintTree : appTree)
