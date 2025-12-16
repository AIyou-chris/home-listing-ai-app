import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
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

const path = window.location.pathname;
const isBlueprintOnlyRoute = path === '/dashboard-blueprint' || path === '/blueprint';

if (import.meta.env.DEV) {
  console.debug('[main] routing', {
    path,
    isBlueprintOnlyRoute
  })
}

const blueprintTree = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <SchedulerProvider>
            <ImpersonationProvider>
              <AgentBrandingProvider>
                <AgentDashboardBlueprint />
              </AgentBrandingProvider>
            </ImpersonationProvider>
          </SchedulerProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
)

const appTree = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <SchedulerProvider>
            <App />
          </SchedulerProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
)

root.render(isBlueprintOnlyRoute ? blueprintTree : appTree)
