export interface DashboardInvalidationDetail {
  reason: string
  listingId?: string | null
  at: string
}

const DASHBOARD_INVALIDATION_EVENT = 'hlai:dashboard-data-invalidated'

export const emitDashboardInvalidation = (detail: { reason: string; listingId?: string | null }) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<DashboardInvalidationDetail>(DASHBOARD_INVALIDATION_EVENT, {
      detail: {
        reason: detail.reason,
        listingId: detail.listingId || null,
        at: new Date().toISOString()
      }
    })
  )
}

export const subscribeDashboardInvalidation = (
  callback: (detail: DashboardInvalidationDetail) => void
) => {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<DashboardInvalidationDetail>
    if (!customEvent.detail) return
    callback(customEvent.detail)
  }

  window.addEventListener(DASHBOARD_INVALIDATION_EVENT, listener as EventListener)
  return () => window.removeEventListener(DASHBOARD_INVALIDATION_EVENT, listener as EventListener)
}
