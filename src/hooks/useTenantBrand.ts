// PROTOTYPE — validates pre-auth white-label brand resolution on custom domains.
// If this works cleanly (no flash, fast enough), promote to a real hook.
// If it flashes or is too slow, we need a server-side render or a loading state strategy.
import { useEffect, useState } from 'react'
import { buildApiUrl } from '../lib/api'

export interface TenantBrand {
  companyName: string | null
  brandColor: string
  logoUrl: string | null
}

export const useTenantBrand = (): TenantBrand | null => {
  const [tenant, setTenant] = useState<TenantBrand | null>(null)

  useEffect(() => {
    const hostname = window.location.hostname
    const isTest = new URLSearchParams(window.location.search).has('__tenant_test')
    // localhost and the default app host don't need tenant resolution (unless __tenant_test param present)
    if (!isTest && (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost'))) return

    fetch(buildApiUrl(`/api/public/tenant?hostname=${encodeURIComponent(hostname)}`))
      .then(r => r.ok ? r.json() : null)
      .then((data: { tenant?: TenantBrand | null } | null) => {
        if (data?.tenant) setTenant(data.tenant)
      })
      .catch(() => {})
  }, [])

  return tenant
}
