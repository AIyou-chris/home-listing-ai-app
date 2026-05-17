import { createContext } from 'react'

export interface OfficeBrand {
  companyName: string | null
  brandColor: string
  logoUrl: string | null
  whiteLabel: boolean
}

export const DEFAULT_OFFICE_BRAND: OfficeBrand = {
  companyName: null,
  brandColor: '#2563eb',
  logoUrl: null,
  whiteLabel: false
}

export const OfficeBrandContext = createContext<OfficeBrand>(DEFAULT_OFFICE_BRAND)
