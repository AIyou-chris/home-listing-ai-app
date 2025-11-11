import { BillingSettings } from '../types'

type BillingResponse = {
  settings?: BillingSettings
  success?: boolean
  error?: string
}

const handleResponse = async (response: Response): Promise<BillingResponse> => {
  const data = (await response.json().catch(() => ({}))) as BillingResponse

  if (!response.ok) {
    const message = data?.error || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return data
}

export const billingSettingsService = {
  async get(userId: string): Promise<BillingSettings> {
    const response = await fetch(`/api/billing/settings/${encodeURIComponent(userId)}`)
    const data = await handleResponse(response)
    return data.settings as BillingSettings
  },

  async update(userId: string, updates: Partial<BillingSettings>): Promise<BillingSettings> {
    const response = await fetch(`/api/billing/settings/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })
    const data = await handleResponse(response)
    return data.settings as BillingSettings
  }
}

export type BillingSettingsService = typeof billingSettingsService

