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
  defaultAmountCents = 4900,
  paypalClientId,
  paypalClientSecret,
  paypalEnv = 'sandbox',
  paypalCurrency = 'USD',
  baseAppUrl = 'https://aiyouagent.com'
}) => {
  const paypalSdk = safeRequire('@paypal/checkout-server-sdk');

  let paypalClient = null;
  if (paypalClientId && paypalClientSecret && paypalSdk) {
    const Environment =
      paypalEnv === 'live'
        ? paypalSdk.core.LiveEnvironment
        : paypalSdk.core.SandboxEnvironment;
    const paypalEnvironment = new Environment(paypalClientId, paypalClientSecret);
    paypalClient = new paypalSdk.core.PayPalHttpClient(paypalEnvironment);
  }

  const isConfigured = () => Boolean(paypalClient);

  const listProviders = () => {
    const providers = [];
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
            value: centsToCurrency(amountCents || defaultAmountCents)
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
      amount: amountCents || defaultAmountCents,
      currency: paypalCurrency
    };
  };

  const createCheckoutSession = async ({ slug, provider, amountCents }) => {
    // Force PayPal or auto-select
    const preferred = provider || 'paypal';

    if (preferred === 'stripe') {
      throw new Error('Stripe is no longer supported. Please use PayPal.');
    }

    if (preferred === 'paypal') {
      return createPaypalOrder({ slug, amountCents });
    }

    // Default fallback
    if (listProviders().includes('paypal')) {
      return createPaypalOrder({ slug, amountCents });
    }

    throw new Error(`Unsupported or unconfigured payment provider: ${preferred}`);
  };

  return {
    isConfigured,
    listProviders,
    createCheckoutSession
  };
};
