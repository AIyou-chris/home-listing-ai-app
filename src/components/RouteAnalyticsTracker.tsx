import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const GA_MEASUREMENT_ID = 'G-V8NWQPFF6C'

const isPublicAnalyticsRoute = (pathname: string) => {
  return (
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/signin' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/store/') ||
    pathname.startsWith('/checkout') ||
    pathname.includes('/demo-') ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/listing/') ||
    pathname.startsWith('/l/') ||
    pathname.startsWith('/card/') ||
    pathname === '/compliance' ||
    pathname === '/dmca' ||
    pathname === '/agent-blueprint-dashboard' ||
    pathname.startsWith('/agent-blueprint-dashboard') ||
    pathname === '/white-label'
  )
}

const RouteAnalyticsTracker = () => {
  const location = useLocation()

  useEffect(() => {
    const analyticsWindow = window as typeof window & { gtag?: (...args: unknown[]) => void }
    if (typeof window === 'undefined' || typeof analyticsWindow.gtag !== 'function') {
      return
    }

    if (!isPublicAnalyticsRoute(location.pathname)) {
      return
    }

    const pagePath = `${location.pathname}${location.search}${location.hash}`
    analyticsWindow.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
      send_to: GA_MEASUREMENT_ID
    })
  }, [location])

  return null
}

export default RouteAnalyticsTracker
