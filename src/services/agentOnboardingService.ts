export interface AgentRegistrationPayload {
  firstName: string;
  lastName: string;
  email: string;
}

export interface AgentRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  slug: string;
  status: 'pending' | 'active' | 'admin_test' | 'deleted';
  payment_status?: string | null;
  created_at?: string;
  activated_at?: string | null;
}

export interface AgentRegistrationResponse {
  slug: string;
  checkoutUrl: string;
  agent: AgentRecord;
}

export interface CheckoutSessionResponse {
  provider: 'paypal';
  url: string;
  id: string;
  amount?: number | null;
  currency?: string | null;
}

const REGISTRATION_STORAGE_KEY = 'aiyouagent:agent-registration';

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  // If base seems invalid (too short, truncated) or missing, use production URL
  if (!base || base.length < 10 || !base.startsWith('http')) {
    return 'https://home-listing-ai-backend.onrender.com';
  }
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data && (data.error || data.message)) || 'Request failed';
    throw new Error(message);
  }
  return data as T;
};

const persistRegistrationContext = (payload: AgentRegistrationResponse) => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.setItem(
      REGISTRATION_STORAGE_KEY,
      JSON.stringify({
        slug: payload.slug,
        email: payload.agent.email,
        firstName: payload.agent.first_name,
        lastName: payload.agent.last_name,
        checkoutUrl: payload.checkoutUrl,
        createdAt: payload.agent.created_at
      })
    );
  } catch (error) {
    console.warn('[AgentOnboarding] Failed to persist registration context', error);
  }
};

export const getRegistrationContext = () => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(REGISTRATION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

export const clearRegistrationContext = () => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
  } catch (error) {
    console.warn('[AgentOnboarding] Failed to clear registration context', error);
  }
};

export const agentOnboardingService = {
  async registerAgent(payload: AgentRegistrationPayload): Promise<AgentRegistrationResponse> {
    const response = await fetch(`${getApiBase()}/api/agents/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await handleResponse<AgentRegistrationResponse>(response);
    persistRegistrationContext(data);
    return data;
  },

  async getAgentBySlug(slug: string): Promise<AgentRecord> {
    const response = await fetch(`${getApiBase()}/api/agents/${slug}`);
    const data = await handleResponse<{ agent: AgentRecord }>(response);
    if (data.agent) {
      persistRegistrationContext({
        agent: data.agent,
        slug: data.agent.slug,
        checkoutUrl: `/checkout/${data.agent.slug}`
      });
    }
    return data.agent;
  },

  async createCheckoutSession({
    slug,
    provider,
    amountCents,
    promoCode
  }: {
    slug: string;
    provider?: 'paypal';
    amountCents?: number;
    promoCode?: string;
  }): Promise<CheckoutSessionResponse> {
    const response = await fetch(`${getApiBase()}/api/payments/checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ slug, provider, amountCents, promoCode })
    });
    const data = await handleResponse<{ session: CheckoutSessionResponse }>(response);
    return data.session;
  },

  async listPaymentProviders(): Promise<string[]> {
    try {
      const response = await fetch(`${getApiBase()}/api/payments/providers`);
      if (response.status === 503) {
        return [];
      }

      const data = await handleResponse<{ providers?: string[] }>(response);
      return Array.isArray(data.providers) ? data.providers : [];
    } catch (error) {
      console.warn('[AgentOnboarding] Failed to load payment providers', error);
      return [];
    }
  },

  async pollAgentActivation({
    slug,
    timeoutMs = 120000,
    intervalMs = 5000
  }: {
    slug: string;
    timeoutMs?: number;
    intervalMs?: number;
  }): Promise<AgentRecord> {
    const startedAt = Date.now();
    const poll = async (): Promise<AgentRecord> => {
      const agent = await this.getAgentBySlug(slug);
      if (agent.status === 'active' || agent.status === 'admin_test') {
        return agent;
      }
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error('Activation timed out. Please contact support.');
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      return poll();
    };
    return poll();
  }
};

export type AgentOnboardingService = typeof agentOnboardingService;
