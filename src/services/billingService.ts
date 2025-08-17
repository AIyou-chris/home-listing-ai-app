import { auth, db, functions } from './firebase';
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

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
        try {
            const subscriptionDoc = await getDoc(doc(db, 'subscriptions', agentId));
            if (subscriptionDoc.exists()) {
                const data = subscriptionDoc.data();
                return {
                    id: subscriptionDoc.id,
                    ...data,
                    currentPeriodStart: data.currentPeriodStart?.toDate(),
                    currentPeriodEnd: data.currentPeriodEnd?.toDate(),
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate()
                } as Subscription;
            }
            return null;
        } catch (error) {
            console.error('Get subscription error:', error);
            return null;
        }
    }

    // Create PayPal subscription
    async createPayPalSubscription(agentId: string, planId: string): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
        try {
            const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
            if (!plan) {
                throw new Error('Invalid plan');
            }

            // Call Firebase function to create PayPal subscription
            const createSubscription = httpsCallable(functions, 'createPayPalSubscription');
            const result = await createSubscription({
                agentId,
                planId,
                planName: plan.name,
                price: plan.price
            });

            const data = result.data as any;
            
            if (data.success) {
                // Store subscription in Firestore
                const subscription: Subscription = {
                    id: agentId,
                    agentId,
                    planId,
                    planName: plan.name,
                    status: 'active',
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    cancelAtPeriodEnd: false,
                    paypalSubscriptionId: data.subscriptionId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await setDoc(doc(db, 'subscriptions', agentId), subscription);

                // Create invoice
                await this.createInvoice(agentId, data.subscriptionId, plan.price);

                return { success: true, subscriptionId: data.subscriptionId };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Create PayPal subscription error:', error);
            return { success: false, error: error.message };
        }
    }

    // Cancel subscription
    async cancelSubscription(agentId: string, cancelImmediately: boolean = false): Promise<{ success: boolean; error?: string }> {
        try {
            const subscription = await this.getCurrentSubscription(agentId);
            if (!subscription) {
                throw new Error('No active subscription found');
            }

            // Call Firebase function to cancel PayPal subscription
            const cancelSubscription = httpsCallable(functions, 'cancelPayPalSubscription');
            const result = await cancelSubscription({
                subscriptionId: subscription.paypalSubscriptionId,
                cancelImmediately
            });

            const data = result.data as any;
            
            if (data.success) {
                // Update subscription in Firestore
                await updateDoc(doc(db, 'subscriptions', agentId), {
                    status: cancelImmediately ? 'cancelled' : 'active',
                    cancelAtPeriodEnd: !cancelImmediately,
                    updatedAt: new Date()
                });

                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Cancel subscription error:', error);
            return { success: false, error: error.message };
        }
    }

    // Upgrade subscription
    async upgradeSubscription(agentId: string, newPlanId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const currentSubscription = await this.getCurrentSubscription(agentId);
            if (!currentSubscription) {
                throw new Error('No active subscription found');
            }

            const newPlan = SUBSCRIPTION_PLANS.find(p => p.id === newPlanId);
            if (!newPlan) {
                throw new Error('Invalid plan');
            }

            // Call Firebase function to upgrade PayPal subscription
            const upgradeSubscription = httpsCallable(functions, 'upgradePayPalSubscription');
            const result = await upgradeSubscription({
                subscriptionId: currentSubscription.paypalSubscriptionId,
                newPlanId,
                newPlanName: newPlan.name,
                newPrice: newPlan.price
            });

            const data = result.data as any;
            
            if (data.success) {
                // Update subscription in Firestore
                await updateDoc(doc(db, 'subscriptions', agentId), {
                    planId: newPlanId,
                    planName: newPlan.name,
                    updatedAt: new Date()
                });

                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Upgrade subscription error:', error);
            return { success: false, error: error.message };
        }
    }

    // Create invoice
    private async createInvoice(agentId: string, subscriptionId: string, amount: number): Promise<void> {
        try {
            const invoice: Invoice = {
                id: `inv_${Date.now()}`,
                subscriptionId,
                agentId,
                amount,
                currency: 'USD',
                status: 'paid',
                createdAt: new Date(),
                paidAt: new Date()
            };

            await addDoc(collection(db, 'invoices'), invoice);
        } catch (error) {
            console.error('Create invoice error:', error);
        }
    }

    // Get billing history
    async getBillingHistory(agentId: string): Promise<Invoice[]> {
        try {
            const invoicesQuery = query(
                collection(db, 'invoices'),
                where('agentId', '==', agentId)
            );
            
            const snapshot = await getDocs(invoicesQuery);
            const invoices: Invoice[] = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                invoices.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    paidAt: data.paidAt?.toDate()
                } as Invoice);
            });

            return invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch (error) {
            console.error('Get billing history error:', error);
            return [];
        }
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
