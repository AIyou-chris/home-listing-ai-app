import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const GA_MEASUREMENT_ID = 'G-V8NWQPFF6C'

const RouteAnalyticsTracker = () => {
  const location = useLocation()

  useEffect(() => {
    const analyticsWindow = window as typeof window & { gtag?: (...args: unknown[]) => void }
    if (typeof window === 'undefined' || typeof analyticsWindow.gtag !== 'function') {
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
