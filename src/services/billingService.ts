// Firebase removed — using local storage stubs for billing flows

export interface SubscriptionPlan {
    id: string;
    name: 'Solo Agent' | 'Pro Team' | 'Brokerage';
    price: number;
    description?: string;
    originalPrice?: number;
    discount?: number;
    features: string[];
    limitations: {
        listings: number;
        agents?: number;
    };
    paypalPlanId?: string;
    stripePriceId?: string;
}

export interface Subscription {
    id: string;
    agentId: string;
    planId: string;
    planName: string;
    status: 'active' | 'cancelled' | 'past_due' | 'trial';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    paypalSubscriptionId?: string;
    stripeSubscriptionId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Invoice {
    id: string;
    subscriptionId: string;
    agentId: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed' | 'refunded';
    paypalInvoiceId?: string;
    stripeInvoiceId?: string;
    createdAt: Date;
    paidAt?: Date;
}

export interface BillingSettings {
    planName: 'Solo Agent';
    subscription?: Subscription;
    invoices: Invoice[];
    paymentMethod?: {
        type: 'paypal' | 'stripe';
        last4?: string;
        brand?: string;
        paypalEmail?: string;
    };
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'solo-agent',
        name: 'Solo Agent',
        price: 69,
        features: [
            'Full Dashboard Access',
            'AI Content Studio',
            'Automated Follow-up Sequences',
            'AI Inbox & Lead Management',
            'Standard Support',
            'Up to 5 Active Listings',
            'Email Automation',
            'QR Code Tracking',
            'Basic Analytics'
        ],
        limitations: {
            listings: 5
        },
        paypalPlanId: 'P-5ML4271244454362XMQIZHI' // You'll need to create this in PayPal
    }
];

export class BillingService {
    private static instance: BillingService;

    private constructor() {}

    static getInstance(): BillingService {
        if (!BillingService.instance) {
            BillingService.instance = new BillingService();
        }
        return BillingService.instance;
    }

    // Get current subscription
    async getCurrentSubscription(agentId: string): Promise<Subscription | null> {
        const raw = localStorage.getItem(`hlai_sub_${agentId}`)
        if (!raw) return null
        const data = JSON.parse(raw)
        return {
            ...(data as Subscription),
            currentPeriodStart: new Date(data.currentPeriodStart),
            currentPeriodEnd: new Date(data.currentPeriodEnd),
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt)
        }
    }

    // Create PayPal subscription
    async createPayPalSubscription(agentId: string, planId: string): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
        const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
        if (!plan) return { success: false, error: 'Invalid plan' }
        const subscriptionId = `sub_${Date.now()}`
        const subscription: Subscription = {
            id: agentId,
            agentId,
            planId,
            planName: plan.name,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
            paypalSubscriptionId: subscriptionId,
            createdAt: new Date(),
            updatedAt: new Date()
        }
        localStorage.setItem(`hlai_sub_${agentId}`, JSON.stringify(subscription))
        await this.createInvoice(agentId, subscriptionId, plan.price)
        return { success: true, subscriptionId }
    }

    // Cancel subscription
    async cancelSubscription(agentId: string, cancelImmediately: boolean = false): Promise<{ success: boolean; error?: string }> {
        const sub = await this.getCurrentSubscription(agentId)
        if (!sub) return { success: false, error: 'No active subscription found' }
        const next = {
            ...sub,
            status: cancelImmediately ? 'cancelled' : 'active',
            cancelAtPeriodEnd: !cancelImmediately,
            updatedAt: new Date()
        }
        localStorage.setItem(`hlai_sub_${agentId}`, JSON.stringify(next))
        return { success: true }
    }

    // Upgrade subscription
    async upgradeSubscription(agentId: string, newPlanId: string): Promise<{ success: boolean; error?: string }> {
        const current = await this.getCurrentSubscription(agentId)
        if (!current) return { success: false, error: 'No active subscription found' }
        const newPlan = SUBSCRIPTION_PLANS.find(p => p.id === newPlanId)
        if (!newPlan) return { success: false, error: 'Invalid plan' }
        const next = { ...current, planId: newPlanId, planName: newPlan.name, updatedAt: new Date() }
        localStorage.setItem(`hlai_sub_${agentId}`, JSON.stringify(next))
        return { success: true }
    }

    // Create invoice
    private async createInvoice(agentId: string, subscriptionId: string, amount: number): Promise<void> {
        const key = `hlai_invoices_${agentId}`
        const raw = localStorage.getItem(key)
        const items: Invoice[] = raw ? JSON.parse(raw) : []
        const invoice: Invoice = {
            id: `inv_${Date.now()}`,
            subscriptionId,
            agentId,
            amount,
            currency: 'USD',
            status: 'paid',
            createdAt: new Date(),
            paidAt: new Date()
        }
        localStorage.setItem(key, JSON.stringify([invoice, ...items]))
    }

    // Get billing history
    async getBillingHistory(agentId: string): Promise<Invoice[]> {
        const key = `hlai_invoices_${agentId}`
        const raw = localStorage.getItem(key)
        const invoices: Invoice[] = raw ? JSON.parse(raw) : []
        return invoices.map(i => ({ ...i, createdAt: new Date(i.createdAt), paidAt: i.paidAt ? new Date(i.paidAt) : undefined }))
            .sort((a, b) => a.createdAt < b.createdAt ? 1 : -1)
    }

    // Get plan by ID
    getPlanById(planId: string): SubscriptionPlan | undefined {
        return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
    }

    // Check if user can access feature
    async canAccessFeature(agentId: string, feature: string): Promise<boolean> {
        try {
            const subscription = await this.getCurrentSubscription(agentId);
            if (!subscription || subscription.status !== 'active') {
                return false;
            }

            const plan = this.getPlanById(subscription.planId);
            if (!plan) {
                return false;
            }

            // Check if feature is available in current plan
            return plan.features.includes(feature);
        } catch (error) {
            console.error('Check feature access error:', error);
            return false;
        }
    }

    // Get cancellation instructions
    getCancellationInstructions(): string {
        return `
## How to Cancel Your Subscription

### Option 1: Cancel Through HomeListingAI (Recommended)
1. Go to Settings > Billing
2. Click "Cancel Subscription"
3. Choose to cancel immediately or at the end of your billing period
4. Confirm cancellation

### Option 2: Cancel Through PayPal
1. Log into your PayPal account
2. Go to Settings > Payments
3. Find "Automatic payments"
4. Locate "HomeListingAI" subscription
5. Click "Cancel" or "Cancel automatic payments"

### Option 3: Contact Support
If you're having trouble canceling, contact our support team:
- Email: support@homelistingai.com
- Phone: (555) 123-4567
- Live Chat: Available in your dashboard

### What Happens When You Cancel?
- **Immediate cancellation**: Access ends immediately, no refund
- **End of period cancellation**: Access continues until your next billing date
- **Data retention**: Your data is kept for 30 days after cancellation
- **Reactivation**: You can reactivate anytime by resubscribing

### Need Help?
Our support team is here to help with any billing questions or issues.
        `;
    }

    // Get PayPal setup instructions
    getPayPalSetupInstructions(): string {
        return `
## PayPal Integration Setup

### For Development (Sandbox)
1. Create a PayPal Developer account
2. Set up a sandbox app
3. Configure webhook endpoints
4. Test subscription creation

### For Production
1. Upgrade to PayPal Business account
2. Complete PayPal verification
3. Set up production webhooks
4. Configure billing agreements

### Required PayPal Configuration
- **Webhook URL**: https://yourdomain.com/api/paypal/webhook
- **Return URL**: https://yourdomain.com/billing/success
- **Cancel URL**: https://yourdomain.com/billing/cancel
- **Billing Agreement**: Enable subscription billing

### Security Requirements
- SSL certificate required
- IPN (Instant Payment Notification) enabled
- Webhook signature verification
- PCI DSS compliance for card data

### Testing
- Use PayPal sandbox for development
- Test all subscription scenarios
- Verify webhook handling
- Test cancellation flow
        `;
    }
}

export const billingService = BillingService.getInstance();
