import { BillingSettings } from '../types'
import { AuthService } from './authService'
import { getEnvVar } from '../lib/env'

type BillingResponse = {
  settings?: BillingSettings
  url?: string
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
    const response = await AuthService.getInstance().makeAuthenticatedRequest(
      `/api/billing/settings/${encodeURIComponent(userId)}`
    )
    const data = await handleResponse(response)
    return data.settings as BillingSettings
  },

  async update(userId: string, updates: Partial<BillingSettings>): Promise<BillingSettings> {
    const response = await AuthService.getInstance().makeAuthenticatedRequest(
      `/api/billing/settings/${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }
    )
    const data = await handleResponse(response)
    return data.settings as BillingSettings
  },

  async createCheckoutSession(_userId: string, email?: string, plan: 'starter' | 'pro' = 'pro'): Promise<{ url: string }> {
    const appBase = getEnvVar('VITE_APP_URL')
    const baseUrl = typeof appBase === 'string' && appBase.trim() ? appBase : window.location.origin

    const response = await AuthService.getInstance().makeAuthenticatedRequest('/api/billing/checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: plan,
        email,
        success_url: `${baseUrl}/dashboard/settings/billing?checkout=success`,
        cancel_url: `${baseUrl}/dashboard/settings/billing?checkout=cancelled`
      })
    })

    const data = await handleResponse(response)
    if (!data.url) {
      throw new Error('Missing checkout URL')
    }
    return { url: data.url }
  }
}

export type BillingSettingsService = typeof billingSettingsService
