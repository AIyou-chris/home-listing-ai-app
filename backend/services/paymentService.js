const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = ({
  baseAppUrl = 'https://homelistingai.com'
}) => {
  const isConfigured = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('Stripe Secret Key is missing!');
      return false;
    }
    return true;
  };

  const listProviders = () => isConfigured() ? ['stripe'] : [];

  const createCheckoutSession = async ({ priceId, slug, email, successUrl, cancelUrl }) => {
    if (!isConfigured()) throw new Error('Stripe is not configured');

    // Default to the provided Plan Price ID from env if none specified
    const finalPriceId = priceId || process.env.STRIPE_DEFAULT_PRICE_ID;
    if (!finalPriceId) throw new Error('No Price ID provided and STRIPE_DEFAULT_PRICE_ID is missing');

    // Determine Redirect URLs (Handle both explicit URLs and legacy slug-based flow)
    // Legacy flow uses /checkout/:slug
    const sUrl = successUrl || `${baseAppUrl}/checkout/${slug}?status=success`;
    const cUrl = cancelUrl || `${baseAppUrl}/checkout/${slug}?status=cancelled`;

    console.log(`[Stripe] Creating session for ${email} (${slug}) using price ${finalPriceId}`);

    try {
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: finalPriceId, quantity: 1 }],
        mode: 'subscription',
        success_url: sUrl,
        cancel_url: cUrl,
        customer_email: email,
        client_reference_id: slug,
        metadata: {
          slug,
          source: 'homelistingai_app'
        },
        allow_promotion_codes: true, // Allow promo codes in Stripe UI
      });

      return {
        url: session.url,
        sessionId: session.id,
        provider: 'stripe'
      };
    } catch (error) {
      console.error('[Stripe] Session Create Failed:', error);
      throw error;
    }
  };

  const createPortalSession = async ({ customerId, returnUrl }) => {
    if (!isConfigured()) throw new Error('Stripe is not configured');
    if (!customerId) throw new Error('Customer ID is required');

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || baseAppUrl,
      });
      return { url: session.url };
    } catch (error) {
      console.error('[Stripe] Portal Session Create Failed:', error);
      throw error;
    }
  };

  const listInvoices = async (customerId) => {
    if (!isConfigured()) return [];
    if (!customerId) return [];

    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 12,
        status: 'paid'
      });

      return invoices.data.map(inv => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString().split('T')[0],
        amount: inv.amount_paid / 100,
        status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
        description: inv.lines.data[0]?.description || 'Subscription',
        invoiceUrl: inv.hosted_invoice_url
      }));
    } catch (error) {
      console.error('[Stripe] List Invoices Failed:', error);
      return [];
    }
  };

  const getCustomerByEmail = async (email) => {
    if (!isConfigured()) return null;
    try {
      const customers = await stripe.customers.list({ email, limit: 1 });
      return customers.data[0] || null;
    } catch (error) {
      console.error('[Stripe] Get Customer Failed:', error);
      return null;
    }
  };

  const getSubscriptionStatus = async (customerId) => {
    if (!isConfigured() || !customerId) return null;
    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
      const sub = subs.data[0];
      if (!sub) return null;

      return {
        status: sub.status,
        planName: sub.items.data[0]?.price?.nickname || 'Pro Plan',
        amount: (sub.items.data[0]?.price?.unit_amount || 0) / 100,
        currency: sub.currency,
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString()
      };
    } catch (error) {
      console.error('[Stripe] Get Subscription Failed:', error);
      return null;
    }
  };

  return { isConfigured, listProviders, createCheckoutSession, createPortalSession, listInvoices, getCustomerByEmail, getSubscriptionStatus };
};
