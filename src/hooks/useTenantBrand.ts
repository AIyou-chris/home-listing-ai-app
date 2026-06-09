// Resolves the white-label brand for the current hostname before the user authenticates.
// Returns null while loading (no data yet) or when running on the default app domain.
// Used by the sign-in page to show the right logo and color on custom domains.
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

    // Skip on localhost unless explicitly testing
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
