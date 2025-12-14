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

    // Default to the provided $20 Plan Price ID if none specified
    const finalPriceId = priceId || 'price_1SeMLsGtlY59RT0yAVUe2vTJ';

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

  return { isConfigured, listProviders, createCheckoutSession };
};
