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

  async createCheckoutSession(userId: string, email?: string, plan: 'starter' | 'pro' = 'pro'): Promise<{ url: string }> {
    const env = (import.meta as unknown as { env?: Record<string, unknown> })?.env || {}
    const starterPriceId =
      typeof env.VITE_STRIPE_STARTER_PRICE_ID === 'string' && env.VITE_STRIPE_STARTER_PRICE_ID.trim()
        ? env.VITE_STRIPE_STARTER_PRICE_ID
        : null
    const proPriceId =
      typeof env.VITE_STRIPE_PRO_PRICE_ID === 'string' && env.VITE_STRIPE_PRO_PRICE_ID.trim()
        ? env.VITE_STRIPE_PRO_PRICE_ID
        : null
    const priceId = plan === 'starter' ? (starterPriceId || proPriceId) : (proPriceId || starterPriceId)
    if (!priceId) {
      throw new Error('Missing Stripe price IDs. Set VITE_STRIPE_STARTER_PRICE_ID and VITE_STRIPE_PRO_PRICE_ID.')
    }
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
        successUrl: `${baseUrl}/dashboard/settings/billing?checkout=success`,
        cancelUrl: `${baseUrl}/dashboard/settings/billing?checkout=cancelled`
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
