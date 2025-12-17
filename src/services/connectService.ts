const getApiConnection = () => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
    return base.endsWith('/') ? base.slice(0, -1) : base; // remove trailing slash
};

const API_BASE = getApiConnection();

export interface ConnectAccountResponse {
    accountId: string;
}

export interface OnboardingLinkResponse {
    url: string;
}

export interface AccountStatusResponse {
    readyToProcessPayments: boolean;
    onboardingComplete: boolean;
    details: Record<string, unknown>;
}

export interface StripeProduct {
    id: string;
    name: string;
    description?: string;
    default_price?: {
        id: string;
        unit_amount: number;
        currency: string;
    };
}

export const connectService = {
    // 1. Create Connected Account
    async createAccount(payload: { userId: string; email: string; firstName: string }): Promise<ConnectAccountResponse> {
        const res = await fetch(`${API_BASE}/api/connect/create-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create account');
        return res.json();
    },

    // 2. Get Onboarding Link
    async getOnboardingLink(accountId: string): Promise<string> {
        const res = await fetch(`${API_BASE}/api/connect/onboarding-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
        });
        if (!res.ok) throw new Error('Failed to get onboarding link');
        const data = await res.json();
        return data.url;
    },

    // 3. Get Account Status
    async getAccountStatus(accountId: string): Promise<AccountStatusResponse> {
        const res = await fetch(`${API_BASE}/api/connect/status/${accountId}`);
        if (!res.ok) throw new Error('Failed to get account status');
        return res.json();
    },

    // 4. Create Product
    async createProduct(accountId: string, product: { name: string; description: string; priceInCents: number }): Promise<StripeProduct> {
        const res = await fetch(`${API_BASE}/api/connect/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, ...product }),
        });
        if (!res.ok) throw new Error('Failed to create product');
        return res.json();
    },

    // 5. List Products
    async listProducts(accountId: string): Promise<StripeProduct[]> {
        const res = await fetch(`${API_BASE}/api/connect/products/${accountId}`);
        if (!res.ok) throw new Error('Failed to list products');
        return res.json();
    },

    // 6. Create Checkout Session (Buying a product)
    async createCheckoutSession(accountId: string, priceId: string): Promise<string> {
        const res = await fetch(`${API_BASE}/api/connect/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, priceId }),
        });
        if (!res.ok) throw new Error('Failed to create checkout session');
        const data = await res.json();
        return data.url;
    },

    // 7. Subscribe to Platform (Agent paying Platform)
    async createPlatformSubscription(accountId: string, priceId: string): Promise<string> {
        const res = await fetch(`${API_BASE}/api/connect/subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, priceId }),
        });
        if (!res.ok) throw new Error('Failed to create subscription session');
        const data = await res.json();
        return data.url;
    },

    // 8. Billing Portal
    async createPortalSession(accountId: string): Promise<string> {
        const res = await fetch(`${API_BASE}/api/connect/portal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
        });
        if (!res.ok) throw new Error('Failed to create portal session');
        const data = await res.json();
        return data.url;
    }
};
