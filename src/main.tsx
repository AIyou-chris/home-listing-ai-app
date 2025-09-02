import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { SchedulerProvider } from './context/SchedulerContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    	<ErrorBoundary>
		<SchedulerProvider>
			<App />
		</SchedulerProvider>
	</ErrorBoundary>
  </StrictMode>
)