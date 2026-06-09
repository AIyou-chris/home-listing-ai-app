import React, { useEffect, useState } from 'react'
import { buildApiUrl } from '../lib/api'
import { supabase } from '../services/supabase'
import { DEFAULT_OFFICE_BRAND, OfficeBrand, OfficeBrandContext } from './officeBrand'

export const OfficeBrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<OfficeBrand>(DEFAULT_OFFICE_BRAND)

  useEffect(() => {
    const loadBrand = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const r = await fetch(buildApiUrl('/api/me/brand'), { headers: { 'x-user-id': user.id } })
        if (!r.ok) return
        const data = await r.json() as { brand?: OfficeBrand }
        if (data?.brand?.whiteLabel) setBrand(data.brand)
      } catch { /* non-critical — default brand is always safe */ }
    }

    void loadBrand()

    // Re-resolve brand whenever auth state changes (sign-in / token refresh / sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void loadBrand()
      }
      if (event === 'SIGNED_OUT') {
        setBrand(DEFAULT_OFFICE_BRAND)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <OfficeBrandContext.Provider value={brand}>
      <div style={{ '--brand-primary': brand.brandColor } as React.CSSProperties}>
        {children}
      </div>
    </OfficeBrandContext.Provider>
  )
}
