import React, { useEffect, useRef, useState } from 'react'
import { buildApiUrl } from '../lib/api'
import { DEFAULT_OFFICE_BRAND, OfficeBrand, OfficeBrandContext } from './officeBrand'

export const OfficeBrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<OfficeBrand>(DEFAULT_OFFICE_BRAND)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    fetch(buildApiUrl('/api/me/brand'))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.brand?.whiteLabel) setBrand(data.brand)
      })
      .catch(() => {})
  }, [])

  return (
    <OfficeBrandContext.Provider value={brand}>
      <div style={{ '--brand-primary': brand.brandColor } as React.CSSProperties}>
        {children}
      </div>
    </OfficeBrandContext.Provider>
  )
}
