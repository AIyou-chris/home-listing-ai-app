import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const DEMO_QUERY_FLAG = 'demo'

export const isDemoModePath = (pathname: string) => pathname.startsWith('/demo-dashboard')

export const isDemoModeSearch = (search: string) => {
  const params = new URLSearchParams(search)
  return params.get(DEMO_QUERY_FLAG) === '1'
}

export const isDemoModeActive = (pathname?: string, search?: string) => {
  if (typeof window === 'undefined') return false
  const currentPath = pathname ?? window.location.pathname
  const currentSearch = search ?? window.location.search
  return isDemoModePath(currentPath) || isDemoModeSearch(currentSearch)
}

export const buildDashboardPath = (pathSuffix: string, demoMode?: boolean) => {
  const normalizedSuffix = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`
  const active = typeof demoMode === 'boolean' ? demoMode : isDemoModeActive()
  return `${active ? '/demo-dashboard' : '/dashboard'}${normalizedSuffix}`
}

export const useDemoMode = () => {
  const location = useLocation()
  return useMemo(
    () => isDemoModeActive(location.pathname, location.search),
    [location.pathname, location.search]
  )
}
