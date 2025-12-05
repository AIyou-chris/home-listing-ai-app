const centsToCurrency = (value) => (Number(value || 0) / 100).toFixed(2);

const safeRequire = (moduleId) => {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(moduleId);
  } catch (error) {
    console.warn(`[PaymentService] Optional dependency "${moduleId}" not available: ${error.message}`);
    return null;
  }
};

module.exports = ({
  stripeSecretKey,
  stripePriceId,
  stripeProductName = 'AI You Agent Subscription',
  stripeCurrency = 'usd',
  stripeDefaultAmountCents = 4900,
  paypalClientId,
  paypalClientSecret,
  paypalEnv = 'sandbox',
  paypalCurrency = 'USD',
  baseAppUrl = 'https://aiyouagent.com'
}) => {
  const Stripe = safeRequire('stripe');
  const paypalSdk = safeRequire('@paypal/checkout-server-sdk');

  const stripeClient = stripeSecretKey && Stripe ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' }) : null;

  let paypalClient = null;
  if (paypalClientId && paypalClientSecret && paypalSdk) {
    const Environment =
      paypalEnv === 'live'
        ? paypalSdk.core.LiveEnvironment
        : paypalSdk.core.SandboxEnvironment;
    const paypalEnvironment = new Environment(paypalClientId, paypalClientSecret);
    paypalClient = new paypalSdk.core.PayPalHttpClient(paypalEnvironment);
  }

  const isConfigured = () => Boolean(stripeClient || paypalClient);

  const listProviders = () => {
    const providers = [];
    if (stripeClient) providers.push('stripe');
    if (paypalClient) providers.push('paypal');
    return providers;
  };

  const buildReturnUrls = (slug) => {
    const normalizedBase = baseAppUrl.replace(/\/$/, '');
    return {
      success: `${normalizedBase}/#/checkout/${slug}?status=success`,
      cancel: `${normalizedBase}/#/checkout/${slug}?status=cancelled`
    };
  };

  const createStripeSession = async ({ slug, email, amountCents }) => {
    if (!stripeClient) {
      throw new Error('Stripe is not configured');
    }

    const urls = buildReturnUrls(slug);
    const lineItems = stripePriceId
      ? [
        {
          price: stripePriceId,
          quantity: 1
        }
      ]
      : [
        {
          price_data: {
            currency: stripeCurrency,
            product_data: {
              name: stripeProductName
            },
            unit_amount: amountCents || stripeDefaultAmountCents
          },
          quantity: 1
        }
      ];

    const session = await stripeClient.checkout.sessions.create({
      mode: stripePriceId ? 'subscription' : 'payment',
      success_url: urls.success,
      cancel_url: urls.cancel,
      customer_email: email,
      line_items: lineItems,
      metadata: {
        slug
      }
    });

    return {
      provider: 'stripe',
      url: session.url,
      id: session.id,
      amount: stripePriceId ? null : amountCents || stripeDefaultAmountCents,
      currency: stripeCurrency
    };
  };

  const createPaypalOrder = async ({ slug, amountCents }) => {
    if (!paypalClient || !paypalSdk) {
      throw new Error('PayPal is not configured');
    }

    const urls = buildReturnUrls(slug);
    const request = new paypalSdk.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: slug,
          custom_id: slug,
          amount: {
            currency_code: paypalCurrency,
            value: centsToCurrency(amountCents || stripeDefaultAmountCents)
          }
        }
      ],
      application_context: {
        brand_name: 'AI You Agent',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: urls.success,
        cancel_url: urls.cancel
      }
    });

    const order = await paypalClient.execute(request);
    const approvalLink = order?.result?.links?.find((link) => link.rel === 'approve');

    return {
      provider: 'paypal',
      url: approvalLink?.href,
      id: order?.result?.id,
      amount: amountCents || stripeDefaultAmountCents,
      currency: paypalCurrency
    };
  };

  const createCheckoutSession = async ({ slug, email, provider, amountCents }) => {
    const preferred = provider || listProviders()[0];
    if (!preferred) {
      throw new Error('No payment provider configured');
    }

    if (preferred === 'stripe') {
      return createStripeSession({ slug, email, amountCents });
    }

    if (preferred === 'paypal') {
      return createPaypalOrder({ slug, amountCents });
    }

    throw new Error(`Unsupported payment provider: ${preferred}`);
  };

  return {
    isConfigured,
    listProviders,
    createCheckoutSession
  };
};
