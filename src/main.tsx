import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { SchedulerProvider } from './context/SchedulerContext'
import AgentDashboardBlueprint from './components/AgentDashboardBlueprint'

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)

const rawHash = window.location.hash.replace(/^#/, '')
const hashPath = rawHash.split('?')[0]
const isBlueprintOnlyRoute = hashPath === '/dashboard-blueprint' || hashPath === 'dashboard-blueprint'

const blueprintTree = (
  <StrictMode>
    <SchedulerProvider>
      <AgentDashboardBlueprint />
    </SchedulerProvider>
  </StrictMode>
)

const appTree = (
  <StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <SchedulerProvider>
          <App />
        </SchedulerProvider>
      </ErrorBoundary>
    </HashRouter>
  </StrictMode>
)

root.render(isBlueprintOnlyRoute ? blueprintTree : appTree)
