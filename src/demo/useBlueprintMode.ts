import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Returns true when the current route is the new blueprint dashboard (/blueprint-dashboard/*).
 * Blueprint mode = same UI as demo but with zero fake data + one example listing.
 * This is separate from the legacy /agent-blueprint-dashboard route.
 */
export function useBlueprintMode(): boolean {
  const location = useLocation()
  return useMemo(() => location.pathname.startsWith('/blueprint-dashboard'), [location.pathname])
}

/**
 * Builds a full path inside the blueprint dashboard.
 * e.g. buildBlueprintPath('/leads') → '/blueprint-dashboard/leads'
 */
export function buildBlueprintPath(path: string): string {
  return `/blueprint-dashboard${path}`
}
