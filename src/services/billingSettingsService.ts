import { BillingSettings } from '../types'

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
  },

  async createCheckoutSession(userId: string, email?: string): Promise<{ url: string }> {
    const fallbackPriceId = 'price_1SeMLsGtlY59RT0yAVUe2vTJ'
    const rawPriceId = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_STRIPE_PRO_PRICE_ID
    const priceId = typeof rawPriceId === 'string' && rawPriceId.trim() ? rawPriceId : fallbackPriceId
    const appBase = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_APP_URL
    const baseUrl = typeof appBase === 'string' && appBase.trim() ? appBase : window.location.origin

    const response = await fetch('/api/subscription/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        email,
        priceId,
        mode: 'subscription',
        successUrl: `${baseUrl}/dashboard?checkout=success`,
        cancelUrl: `${baseUrl}/dashboard?checkout=cancelled`
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
