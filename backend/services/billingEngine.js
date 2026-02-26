const crypto = require('crypto');

const PLAN_IDS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro'
};

const DEFAULT_LIMITS = {
  [PLAN_IDS.FREE]: {
    active_listings: 1,
    reports_per_month: 1,
    reminder_calls_per_month: 0,
    stored_leads_cap: 25
  },
  [PLAN_IDS.STARTER]: {
    active_listings: 5,
    reports_per_month: 10,
    reminder_calls_per_month: 0,
    stored_leads_cap: 250
  },
  [PLAN_IDS.PRO]: {
    active_listings: 25,
    reports_per_month: 50,
    reminder_calls_per_month: 200,
    stored_leads_cap: 2000
  }
};

const OVERAGE_PRICING = {
  extra_listing: 6,
  extra_report: 1,
  extra_reminder_call: 0.5,
  lead_storage_addon: 10,
  sms_overage: 0.03
};

const ACTIVE_SUB_STATUSES = new Set(['trialing', 'active', 'past_due', 'incomplete']);

const nowIso = () => new Date().toISOString();

const toDate = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
};

const startOfMonthIso = (value) => {
  const d = toDate(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0)).toISOString();
};

const endOfMonthIso = (value) => {
  const d = toDate(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0)).toISOString();
};

const isMissingTableError = (error) =>
  error?.code === '42P01' ||
  error?.code === 'PGRST205' ||
  /does not exist|relation .* does not exist|schema cache/i.test(error?.message || '');

const clone = (value) => JSON.parse(JSON.stringify(value));

const buildDefaultPlanRows = () => {
  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID || process.env.VITE_STRIPE_STARTER_PRICE_ID || null;
  const proPriceId =
    process.env.STRIPE_PRO_PRICE_ID ||
    process.env.VITE_STRIPE_PRO_PRICE_ID ||
    process.env.STRIPE_DEFAULT_PRICE_ID ||
    null;

  return [
    {
      id: PLAN_IDS.FREE,
      name: 'Free',
      price_monthly_usd: 0,
      stripe_price_id: null,
      limits: DEFAULT_LIMITS[PLAN_IDS.FREE],
      created_at: nowIso()
    },
    {
      id: PLAN_IDS.STARTER,
      name: 'Starter',
      price_monthly_usd: 34,
      stripe_price_id: starterPriceId,
      limits: DEFAULT_LIMITS[PLAN_IDS.STARTER],
      created_at: nowIso()
    },
    {
      id: PLAN_IDS.PRO,
      name: 'Pro',
      price_monthly_usd: 79,
      stripe_price_id: proPriceId,
      limits: DEFAULT_LIMITS[PLAN_IDS.PRO],
      created_at: nowIso()
    }
  ];
};

const normalizePlanId = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === PLAN_IDS.STARTER) return PLAN_IDS.STARTER;
  if (normalized === PLAN_IDS.PRO) return PLAN_IDS.PRO;
  return PLAN_IDS.FREE;
};

const normalizeSubscriptionStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'free';
  if (['free', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'].includes(normalized)) {
    return normalized;
  }
  if (normalized === 'cancelled') return 'canceled';
  return normalized;
};

const deriveEffectivePlanId = (subscription) => {
  const status = normalizeSubscriptionStatus(subscription?.status);
  const planId = normalizePlanId(subscription?.plan_id);
  if (!ACTIVE_SUB_STATUSES.has(status)) return PLAN_IDS.FREE;
  if (planId === PLAN_IDS.STARTER || planId === PLAN_IDS.PRO) return planId;
  return PLAN_IDS.FREE;
};

const getPeriodWindow = (subscription) => {
  const start = subscription?.current_period_start || startOfMonthIso();
  const end = subscription?.current_period_end || endOfMonthIso();
  return {
    start,
    end
  };
};

const hashPayload = (payload) =>
  crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');

const createBillingEngine = ({ supabaseAdmin, stripe, enqueueJob, appBaseUrl }) => {
  if (!supabaseAdmin) throw new Error('supabase_admin_required');

  let cachedPlans = null;
  let cachedPlansAt = 0;

  const loadPlanRows = async ({ refresh = false } = {}) => {
    const cacheTtlMs = 60 * 1000;
    if (!refresh && cachedPlans && Date.now() - cachedPlansAt < cacheTtlMs) return cachedPlans;

    const defaults = buildDefaultPlanRows();

    const { data, error } = await supabaseAdmin
      .from('plans')
      .upsert(defaults, { onConflict: 'id' })
      .select('id, name, price_monthly_usd, stripe_price_id, limits');

    if (error) {
      if (isMissingTableError(error)) {
        const fallback = defaults.reduce((acc, row) => {
          acc[row.id] = row;
          return acc;
        }, {});
        cachedPlans = fallback;
        cachedPlansAt = Date.now();
        return fallback;
      }
      throw error;
    }

    const rows = (data || defaults).map((row) => ({
      ...row,
      id: normalizePlanId(row.id),
      limits: typeof row.limits === 'object' && row.limits ? row.limits : DEFAULT_LIMITS[normalizePlanId(row.id)]
    }));

    const mapped = rows.reduce((acc, row) => {
      acc[row.id] = {
        ...row,
        limits: {
          ...DEFAULT_LIMITS[row.id],
          ...(row.limits || {})
        }
      };
      return acc;
    }, {});

    cachedPlans = mapped;
    cachedPlansAt = Date.now();
    return mapped;
  };

  const resolveAgentRecord = async (agentId) => {
    if (!agentId) return null;
    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('id, auth_user_id, email, stripe_customer_id, plan, subscription_status')
      .or(`id.eq.${agentId},auth_user_id.eq.${agentId}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) return null;
      throw error;
    }

    return data || null;
  };

  const upsertSubscription = async ({
    agentId,
    planId,
    status,
    stripeCustomerId,
    stripeSubscriptionId,
    periodStart,
    periodEnd,
    cancelAtPeriodEnd,
    allowOverages
  }) => {
    const now = nowIso();
    const payload = {
      agent_id: agentId,
      plan_id: normalizePlanId(planId),
      stripe_customer_id: stripeCustomerId || null,
      stripe_subscription_id: stripeSubscriptionId || null,
      status: normalizeSubscriptionStatus(status),
      current_period_start: periodStart || null,
      current_period_end: periodEnd || null,
      cancel_at_period_end: Boolean(cancelAtPeriodEnd),
      allow_overages: Boolean(allowOverages),
      updated_at: now
    };

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          id: crypto.randomUUID(),
          ...payload,
          created_at: now
        },
        { onConflict: 'agent_id' }
      )
      .select('*')
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return {
          id: null,
          ...payload
        };
      }
      throw error;
    }

    return data || payload;
  };

  const getOrCreateSubscription = async (agentId) => {
    const plans = await loadPlanRows();

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return {
          id: null,
          agent_id: agentId,
          plan_id: PLAN_IDS.FREE,
          status: 'free',
          current_period_start: startOfMonthIso(),
          current_period_end: endOfMonthIso(),
          cancel_at_period_end: false,
          allow_overages: false,
          plan: plans[PLAN_IDS.FREE]
        };
      }
      throw error;
    }

    if (data) {
      const effectivePlanId = deriveEffectivePlanId(data);
      return {
        ...data,
        plan_id: effectivePlanId,
        status: normalizeSubscriptionStatus(data.status),
        plan: plans[effectivePlanId] || plans[PLAN_IDS.FREE]
      };
    }

    const agent = await resolveAgentRecord(agentId).catch(() => null);
    const legacyPlan = normalizePlanId(agent?.plan);
    const legacyStatus = normalizeSubscriptionStatus(agent?.subscription_status);
    const starterPlan = legacyPlan === PLAN_IDS.STARTER || legacyPlan === PLAN_IDS.PRO ? legacyPlan : PLAN_IDS.FREE;
    const starterStatus = ACTIVE_SUB_STATUSES.has(legacyStatus) ? legacyStatus : 'free';

    const created = await upsertSubscription({
      agentId,
      planId: starterPlan,
      status: starterStatus,
      stripeCustomerId: agent?.stripe_customer_id || null,
      stripeSubscriptionId: null,
      periodStart: startOfMonthIso(),
      periodEnd: endOfMonthIso(),
      cancelAtPeriodEnd: false,
      allowOverages: false
    });

    return {
      ...created,
      plan_id: deriveEffectivePlanId(created),
      plan: plans[deriveEffectivePlanId(created)] || plans[PLAN_IDS.FREE]
    };
  };

  const ensureUsagePeriod = async ({ agentId, subscription }) => {
    const period = getPeriodWindow(subscription);
    const payload = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      subscription_id: subscription?.id || null,
      period_start: period.start,
      period_end: period.end,
      counters: {
        active_listings_peak: 0,
        reports_generated: 0,
        reminder_calls_used: 0,
        sms_messages: 0,
        stored_leads: 0
      },
      created_at: nowIso(),
      updated_at: nowIso()
    };

    const { data, error } = await supabaseAdmin
      .from('usage_periods')
      .upsert(payload, { onConflict: 'agent_id,period_start,period_end' })
      .select('*')
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) return { ...payload, id: null };
      throw error;
    }

    return data || payload;
  };

  const countActiveListings = async (agentId) => {
    const { count, error } = await supabaseAdmin
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .or(`agent_id.eq.${agentId},user_id.eq.${agentId}`)
      .eq('is_published', true);

    if (error) {
      if (isMissingTableError(error)) return 0;
      throw error;
    }
    return Number(count || 0);
  };

  const countStoredLeads = async (agentId) => {
    const { count, error } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId);

    if (error) {
      if (isMissingTableError(error)) return 0;
      throw error;
    }

    return Number(count || 0);
  };

  const aggregateUsageEvents = async ({ agentId, periodStart, periodEnd }) => {
    const { data, error } = await supabaseAdmin
      .from('usage_events')
      .select('type, units')
      .eq('agent_id', agentId)
      .gte('created_at', periodStart)
      .lt('created_at', periodEnd);

    if (error) {
      if (isMissingTableError(error)) {
        return {
          reports_generated: 0,
          reminder_calls_used: 0,
          sms_messages: 0
        };
      }
      throw error;
    }

    return (data || []).reduce(
      (acc, row) => {
        const units = Number(row.units || 0) || 0;
        const type = String(row.type || '');
        if (type === 'report_generated') acc.reports_generated += units;
        if (type === 'reminder_call') acc.reminder_calls_used += units;
        if (type === 'sms_message') acc.sms_messages += units;
        return acc;
      },
      {
        reports_generated: 0,
        reminder_calls_used: 0,
        sms_messages: 0
      }
    );
  };

  const refreshUsageCounters = async ({ agentId, period }) => {
    const [activeListings, storedLeads, usageCounts] = await Promise.all([
      countActiveListings(agentId),
      countStoredLeads(agentId),
      aggregateUsageEvents({
        agentId,
        periodStart: period.period_start,
        periodEnd: period.period_end
      })
    ]);

    const previousPeak = Number(period?.counters?.active_listings_peak || 0);
    const counters = {
      active_listings_peak: Math.max(previousPeak, activeListings),
      reports_generated: usageCounts.reports_generated,
      reminder_calls_used: usageCounts.reminder_calls_used,
      sms_messages: usageCounts.sms_messages,
      stored_leads: storedLeads,
      active_listings_current: activeListings
    };

    if (period?.id) {
      await supabaseAdmin
        .from('usage_periods')
        .update({ counters, updated_at: nowIso() })
        .eq('id', period.id)
        .catch(() => undefined);
    }

    return counters;
  };

  const getUsageState = async (agentId) => {
    const subscription = await getOrCreateSubscription(agentId);
    const period = await ensureUsagePeriod({ agentId, subscription });
    const counters = await refreshUsageCounters({ agentId, period });
    return { subscription, period, counters };
  };

  const maybeWriteOverageLedger = async ({
    agentId,
    subscription,
    period,
    feature,
    units,
    metadata,
    idempotencyKey
  }) => {
    if (!subscription?.allow_overages) return null;

    const typeMap = {
      active_listings: 'extra_listing',
      reports_per_month: 'extra_report',
      reminder_calls_per_month: 'extra_reminder_call',
      stored_leads_cap: 'lead_storage_addon',
      sms_messages: 'sms_overage'
    };

    const ledgerType = typeMap[feature] || 'extra_report';
    const unitPrice = OVERAGE_PRICING[ledgerType] || 0;

    const payload = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      subscription_id: subscription?.id || null,
      period_id: period?.id || null,
      type: ledgerType,
      units: Math.max(1, Number(units || 1)),
      unit_price_usd: unitPrice,
      amount_usd: Number((unitPrice * Math.max(1, Number(units || 1))).toFixed(2)),
      status: 'pending',
      stripe_invoice_id: null,
      metadata: metadata || {},
      idempotency_key: idempotencyKey || `overage:${agentId}:${feature}:${hashPayload(metadata || {})}`,
      created_at: nowIso()
    };

    const { data, error } = await supabaseAdmin
      .from('overage_ledger')
      .upsert(payload, { onConflict: 'idempotency_key', ignoreDuplicates: true })
      .select('*')
      .maybeSingle();

    if (error && !isMissingTableError(error)) throw error;
    return data || payload;
  };

  const checkEntitlement = async ({
    agentId,
    feature,
    requestedUnits = 1,
    context = {},
    allowOverages = null
  }) => {
    const plans = await loadPlanRows();
    const usage = await getUsageState(agentId);
    const planId = deriveEffectivePlanId(usage.subscription);
    const plan = plans[planId] || plans[PLAN_IDS.FREE];
    const limits = plan?.limits || DEFAULT_LIMITS[planId] || {};

    const limit = Number(limits[feature] ?? 0);
    const requested = Math.max(1, Number(requestedUnits || 1));

    const usageValueByFeature = {
      active_listings: Number(usage.counters.active_listings_current || 0),
      reports_per_month: Number(usage.counters.reports_generated || 0),
      reminder_calls_per_month: Number(usage.counters.reminder_calls_used || 0),
      stored_leads_cap: Number(usage.counters.stored_leads || 0)
    };

    const used = Number(usageValueByFeature[feature] || 0);
    const projected = used + requested;

    const overagesAllowed =
      allowOverages === null
        ? Boolean(usage.subscription?.allow_overages)
        : Boolean(allowOverages);

    if (limit <= 0) {
      if (overagesAllowed) {
        await maybeWriteOverageLedger({
          agentId,
          subscription: usage.subscription,
          period: usage.period,
          feature,
          units: requested,
          metadata: context,
          idempotencyKey: `overage:${agentId}:${feature}:${context?.reference_id || context?.referenceId || hashPayload(context)}`
        });

        return {
          allowed: true,
          overage: true,
          reason: 'overage_pending',
          plan_id: planId,
          plan_name: plan.name,
          limit,
          used,
          projected,
          counters: usage.counters,
          subscription: usage.subscription,
          period: usage.period
        };
      }

      return {
        allowed: false,
        reason: 'limit_reached',
        plan_id: planId,
        plan_name: plan.name,
        limit,
        used,
        projected,
        counters: usage.counters,
        subscription: usage.subscription,
        period: usage.period
      };
    }

    if (projected > limit) {
      if (overagesAllowed) {
        await maybeWriteOverageLedger({
          agentId,
          subscription: usage.subscription,
          period: usage.period,
          feature,
          units: projected - limit,
          metadata: context,
          idempotencyKey: `overage:${agentId}:${feature}:${context?.reference_id || context?.referenceId || hashPayload(context)}`
        });

        return {
          allowed: true,
          overage: true,
          reason: 'overage_pending',
          plan_id: planId,
          plan_name: plan.name,
          limit,
          used,
          projected,
          counters: usage.counters,
          subscription: usage.subscription,
          period: usage.period
        };
      }

      return {
        allowed: false,
        reason: 'limit_reached',
        plan_id: planId,
        plan_name: plan.name,
        limit,
        used,
        projected,
        counters: usage.counters,
        subscription: usage.subscription,
        period: usage.period
      };
    }

    return {
      allowed: true,
      overage: false,
      reason: 'ok',
      plan_id: planId,
      plan_name: plan.name,
      limit,
      used,
      projected,
      counters: usage.counters,
      subscription: usage.subscription,
      period: usage.period
    };
  };

  const trackUsageEvent = async ({
    agentId,
    type,
    units = 1,
    referenceId = null,
    metadata = {},
    idempotencyKey
  }) => {
    if (!agentId || !type) {
      return { created: false, counters: null, subscription: null, period: null };
    }

    const usage = await getUsageState(agentId);
    const eventKey = idempotencyKey || `usage:${agentId}:${type}:${referenceId || hashPayload(metadata)}`;
    const payload = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      subscription_id: usage.subscription?.id || null,
      period_id: usage.period?.id || null,
      type,
      units: Math.max(1, Number(units || 1)),
      reference_id: referenceId,
      metadata,
      idempotency_key: eventKey,
      created_at: nowIso()
    };

    const { data, error } = await supabaseAdmin
      .from('usage_events')
      .upsert(payload, { onConflict: 'idempotency_key', ignoreDuplicates: true })
      .select('id')
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return { created: false, counters: usage.counters, subscription: usage.subscription, period: usage.period };
      }
      throw error;
    }

    const counters = await refreshUsageCounters({
      agentId,
      period: usage.period
    });

    return {
      created: Boolean(data?.id),
      counters,
      subscription: usage.subscription,
      period: usage.period
    };
  };

  const getBillingSnapshot = async (agentId) => {
    const plans = await loadPlanRows();
    const usage = await getUsageState(agentId);
    const planId = deriveEffectivePlanId(usage.subscription);
    const plan = plans[planId] || plans[PLAN_IDS.FREE];

    const limits = plan?.limits || DEFAULT_LIMITS[planId] || DEFAULT_LIMITS[PLAN_IDS.FREE];
    const usageMeters = {
      active_listings: {
        used: Number(usage.counters.active_listings_current || 0),
        limit: Number(limits.active_listings || 0)
      },
      reports_per_month: {
        used: Number(usage.counters.reports_generated || 0),
        limit: Number(limits.reports_per_month || 0)
      },
      reminder_calls_per_month: {
        used: Number(usage.counters.reminder_calls_used || 0),
        limit: Number(limits.reminder_calls_per_month || 0)
      },
      stored_leads_cap: {
        used: Number(usage.counters.stored_leads || 0),
        limit: Number(limits.stored_leads_cap || 0)
      }
    };

    const warnings = Object.entries(usageMeters)
      .filter(([, meter]) => Number(meter.limit || 0) > 0)
      .map(([key, meter]) => ({
        key,
        percent: Math.round((Number(meter.used || 0) / Number(meter.limit || 1)) * 100)
      }))
      .filter((item) => item.percent >= 80);

    return {
      plan: {
        id: planId,
        name: plan.name,
        price_monthly_usd: plan.price_monthly_usd,
        status: normalizeSubscriptionStatus(usage.subscription?.status),
        cancel_at_period_end: Boolean(usage.subscription?.cancel_at_period_end),
        current_period_start: usage.subscription?.current_period_start || usage.period?.period_start || null,
        current_period_end: usage.subscription?.current_period_end || usage.period?.period_end || null
      },
      usage: usageMeters,
      counters: usage.counters,
      limits,
      warnings,
      plans: plans,
      sms_coming_soon: true
    };
  };

  const ensureStripeCustomerForAgent = async ({ agentId, email }) => {
    const subscription = await getOrCreateSubscription(agentId);
    let customerId = subscription?.stripe_customer_id || null;

    const agent = await resolveAgentRecord(agentId).catch(() => null);
    if (!customerId) {
      customerId = agent?.stripe_customer_id || null;
    }

    if (!customerId && email && stripe) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          agent_id: agentId
        }
      });
      customerId = customer.id;
    }

    if (customerId) {
      await upsertSubscription({
        agentId,
        planId: subscription?.plan_id || PLAN_IDS.FREE,
        status: subscription?.status || 'free',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription?.stripe_subscription_id || null,
        periodStart: subscription?.current_period_start || startOfMonthIso(),
        periodEnd: subscription?.current_period_end || endOfMonthIso(),
        cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
        allowOverages: Boolean(subscription?.allow_overages)
      });

      await supabaseAdmin
        .from('agents')
        .update({ stripe_customer_id: customerId, updated_at: nowIso() })
        .or(`id.eq.${agentId},auth_user_id.eq.${agentId}`)
        .catch(() => undefined);
    }

    return customerId;
  };

  const createCheckoutSession = async ({ agentId, planId, successUrl, cancelUrl, email }) => {
    const normalizedPlanId = normalizePlanId(planId);
    if (normalizedPlanId === PLAN_IDS.FREE) {
      throw new Error('free_plan_does_not_require_checkout');
    }

    if (!stripe) throw new Error('stripe_not_configured');

    const plans = await loadPlanRows();
    const plan = plans[normalizedPlanId];
    if (!plan) throw new Error('invalid_plan');
    if (!plan.stripe_price_id) throw new Error('missing_stripe_price_id_for_plan');

    const customerId = await ensureStripeCustomerForAgent({ agentId, email });

    const dashboardSuccess = successUrl || `${(appBaseUrl || 'https://homelistingai.com').replace(/\/$/, '')}/dashboard/billing/success`;
    const dashboardCancel = cancelUrl || `${(appBaseUrl || 'https://homelistingai.com').replace(/\/$/, '')}/dashboard/billing`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId || undefined,
      customer_email: !customerId ? email || undefined : undefined,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: dashboardSuccess,
      cancel_url: dashboardCancel,
      metadata: {
        agent_id: agentId,
        plan_id: normalizedPlanId
      },
      subscription_data: {
        metadata: {
          agent_id: agentId,
          plan_id: normalizedPlanId
        }
      }
    });

    return {
      url: session.url,
      id: session.id
    };
  };

  const createPortalSession = async ({ agentId, returnUrl }) => {
    if (!stripe) throw new Error('stripe_not_configured');
    const subscription = await getOrCreateSubscription(agentId);
    const agent = await resolveAgentRecord(agentId).catch(() => null);
    const customerId = subscription?.stripe_customer_id || agent?.stripe_customer_id || null;
    if (!customerId) throw new Error('missing_stripe_customer_id');

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${(appBaseUrl || 'https://homelistingai.com').replace(/\/$/, '')}/dashboard/billing`
    });

    return { url: session.url };
  };

  const mapPlanIdFromPrice = async (priceId, fallbackPlanId = PLAN_IDS.FREE) => {
    if (!priceId) return normalizePlanId(fallbackPlanId);
    const plans = await loadPlanRows();
    const found = Object.values(plans).find((plan) => plan.stripe_price_id === priceId);
    if (found?.id) return normalizePlanId(found.id);
    return normalizePlanId(fallbackPlanId);
  };

  const resolveAgentIdFromStripeIdentifiers = async ({
    metadata,
    customerId,
    subscriptionId,
    fallbackAgentId
  }) => {
    if (metadata?.agent_id) return String(metadata.agent_id);
    if (metadata?.agentId) return String(metadata.agentId);
    if (metadata?.userId) return String(metadata.userId);
    if (fallbackAgentId) return String(fallbackAgentId);

    if (subscriptionId) {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('agent_id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();
      if (!error && data?.agent_id) return data.agent_id;
    }

    if (customerId) {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('agent_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      if (!error && data?.agent_id) return data.agent_id;

      const agentResult = await supabaseAdmin
        .from('agents')
        .select('id, auth_user_id')
        .eq('stripe_customer_id', customerId)
        .limit(1)
        .maybeSingle();
      if (!agentResult.error && (agentResult.data?.auth_user_id || agentResult.data?.id)) {
        return agentResult.data.auth_user_id || agentResult.data.id;
      }
    }

    return null;
  };

  const syncAgentBillingFields = async ({ agentId, planId, status, stripeCustomerId }) => {
    if (!agentId) return;
    await supabaseAdmin
      .from('agents')
      .update({
        plan: planId,
        subscription_status: status,
        stripe_customer_id: stripeCustomerId || null,
        updated_at: nowIso()
      })
      .or(`id.eq.${agentId},auth_user_id.eq.${agentId}`)
      .catch(() => undefined);
  };

  const ensureCurrentUsagePeriodForSubscription = async ({ agentId, subscription }) => {
    try {
      await ensureUsagePeriod({ agentId, subscription });
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
    }
  };

  const processStripeEventPayload = async (eventPayload) => {
    const type = String(eventPayload?.type || '');
    const object = eventPayload?.data?.object || {};

    if (!type) return { processed: false, reason: 'missing_type' };

    if (type === 'checkout.session.completed') {
      const metadata = object?.metadata || {};
      const sessionPlanId = normalizePlanId(metadata.plan_id || metadata.planId || PLAN_IDS.PRO);
      const agentId = await resolveAgentIdFromStripeIdentifiers({
        metadata,
        customerId: object.customer,
        subscriptionId: object.subscription,
        fallbackAgentId: object.client_reference_id || null
      });

      if (!agentId) return { processed: true, reason: 'agent_not_resolved' };

      let periodStart = startOfMonthIso();
      let periodEnd = endOfMonthIso();
      let planId = sessionPlanId;

      if (object.subscription && stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(object.subscription);
          const priceId = subscription?.items?.data?.[0]?.price?.id || null;
          planId = await mapPlanIdFromPrice(priceId, sessionPlanId);
          if (subscription?.current_period_start) {
            periodStart = new Date(subscription.current_period_start * 1000).toISOString();
          }
          if (subscription?.current_period_end) {
            periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          }
        } catch (_) {
          // Keep fallback values if Stripe retrieval fails.
        }
      }

      const updatedSubscription = await upsertSubscription({
        agentId,
        planId,
        status: 'active',
        stripeCustomerId: object.customer || null,
        stripeSubscriptionId: object.subscription || null,
        periodStart,
        periodEnd,
        cancelAtPeriodEnd: false,
        allowOverages: false
      });

      await syncAgentBillingFields({
        agentId,
        planId,
        status: 'active',
        stripeCustomerId: object.customer || null
      });

      await ensureCurrentUsagePeriodForSubscription({
        agentId,
        subscription: updatedSubscription
      });

      return { processed: true, event: type, agent_id: agentId, plan_id: planId };
    }

    if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') {
      const metadata = object?.metadata || {};
      const customerId = object?.customer || null;
      const subscriptionId = object?.id || null;
      const priceId = object?.items?.data?.[0]?.price?.id || null;
      const planId = await mapPlanIdFromPrice(priceId, metadata.plan_id || PLAN_IDS.FREE);
      const agentId = await resolveAgentIdFromStripeIdentifiers({
        metadata,
        customerId,
        subscriptionId,
        fallbackAgentId: null
      });
      if (!agentId) return { processed: true, reason: 'agent_not_resolved' };

      const updatedSubscription = await upsertSubscription({
        agentId,
        planId,
        status: normalizeSubscriptionStatus(object.status || 'active'),
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        periodStart: object.current_period_start ? new Date(object.current_period_start * 1000).toISOString() : startOfMonthIso(),
        periodEnd: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : endOfMonthIso(),
        cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
        allowOverages: false
      });

      await syncAgentBillingFields({
        agentId,
        planId: deriveEffectivePlanId(updatedSubscription),
        status: normalizeSubscriptionStatus(object.status || 'active'),
        stripeCustomerId: customerId
      });

      await ensureCurrentUsagePeriodForSubscription({
        agentId,
        subscription: updatedSubscription
      });

      return { processed: true, event: type, agent_id: agentId, plan_id: planId };
    }

    if (type === 'customer.subscription.deleted') {
      const metadata = object?.metadata || {};
      const customerId = object?.customer || null;
      const subscriptionId = object?.id || null;
      const agentId = await resolveAgentIdFromStripeIdentifiers({ metadata, customerId, subscriptionId });
      if (!agentId) return { processed: true, reason: 'agent_not_resolved' };

      const updatedSubscription = await upsertSubscription({
        agentId,
        planId: PLAN_IDS.FREE,
        status: 'canceled',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        periodStart: object.current_period_start ? new Date(object.current_period_start * 1000).toISOString() : startOfMonthIso(),
        periodEnd: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : endOfMonthIso(),
        cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
        allowOverages: false
      });

      await syncAgentBillingFields({
        agentId,
        planId: PLAN_IDS.FREE,
        status: 'canceled',
        stripeCustomerId: customerId
      });

      await ensureCurrentUsagePeriodForSubscription({
        agentId,
        subscription: updatedSubscription
      });

      return { processed: true, event: type, agent_id: agentId, plan_id: PLAN_IDS.FREE };
    }

    if (type === 'invoice.payment_failed' || type === 'invoice.payment_succeeded') {
      const customerId = object?.customer || null;
      const subscriptionId = object?.subscription || null;
      const agentId = await resolveAgentIdFromStripeIdentifiers({
        metadata: object?.metadata || {},
        customerId,
        subscriptionId
      });

      if (!agentId) return { processed: true, reason: 'agent_not_resolved' };
      const current = await getOrCreateSubscription(agentId);
      const nextStatus = type === 'invoice.payment_failed' ? 'past_due' : 'active';
      const updatedSubscription = await upsertSubscription({
        agentId,
        planId: current.plan_id,
        status: nextStatus,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || current.stripe_subscription_id,
        periodStart: current.current_period_start || startOfMonthIso(),
        periodEnd: current.current_period_end || endOfMonthIso(),
        cancelAtPeriodEnd: Boolean(current.cancel_at_period_end),
        allowOverages: Boolean(current.allow_overages)
      });

      await syncAgentBillingFields({
        agentId,
        planId: deriveEffectivePlanId(updatedSubscription),
        status: nextStatus,
        stripeCustomerId: customerId
      });

      return {
        processed: true,
        event: type,
        agent_id: agentId,
        status: nextStatus
      };
    }

    return { processed: true, skipped: true, event: type };
  };

  const receiveStripeWebhook = async ({ eventId, eventPayload }) => {
    if (!eventId || !eventPayload) throw new Error('invalid_stripe_event');

    const insertPayload = {
      id: crypto.randomUUID(),
      stripe_event_id: String(eventId),
      type: String(eventPayload.type || 'unknown'),
      payload: eventPayload,
      received_at: nowIso(),
      status: 'received'
    };

    const { data, error } = await supabaseAdmin
      .from('billing_events')
      .upsert(insertPayload, {
        onConflict: 'stripe_event_id',
        ignoreDuplicates: true
      })
      .select('*')
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return { billingEvent: { ...insertPayload, id: null }, job: null, created: false };
      }
      throw error;
    }

    const billingEvent =
      data ||
      (
        await supabaseAdmin
          .from('billing_events')
          .select('*')
          .eq('stripe_event_id', String(eventId))
          .maybeSingle()
      ).data;

    const jobResult = await enqueueJob({
      type: 'webhook_stripe_process',
      payload: {
        billing_event_id: billingEvent?.id || null,
        stripe_event_id: String(eventId)
      },
      idempotencyKey: `webhook:stripe:${eventId}`,
      priority: 1,
      runAt: nowIso(),
      maxAttempts: 4
    });

    return {
      billingEvent,
      job: jobResult?.job || null,
      created: Boolean(data?.id)
    };
  };

  const processStripeWebhookJob = async (jobPayload) => {
    const billingEventId = jobPayload?.billing_event_id;
    let billingEvent = null;

    if (billingEventId) {
      const { data, error } = await supabaseAdmin
        .from('billing_events')
        .select('*')
        .eq('id', billingEventId)
        .maybeSingle();
      if (error) throw error;
      billingEvent = data || null;
    }

    if (!billingEvent && jobPayload?.stripe_event_id) {
      const { data, error } = await supabaseAdmin
        .from('billing_events')
        .select('*')
        .eq('stripe_event_id', String(jobPayload.stripe_event_id))
        .maybeSingle();
      if (error) throw error;
      billingEvent = data || null;
    }

    if (!billingEvent) {
      return { processed: false, reason: 'billing_event_not_found' };
    }

    if (billingEvent.status === 'processed') {
      return { processed: true, skipped: true, reason: 'already_processed' };
    }

    try {
      const outcome = await processStripeEventPayload(billingEvent.payload || {});
      await supabaseAdmin
        .from('billing_events')
        .update({ status: 'processed', processed_at: nowIso() })
        .eq('id', billingEvent.id);
      return {
        processed: true,
        billing_event_id: billingEvent.id,
        outcome
      };
    } catch (error) {
      await supabaseAdmin
        .from('billing_events')
        .update({ status: 'failed' })
        .eq('id', billingEvent.id)
        .catch(() => undefined);
      throw error;
    }
  };

  return {
    PLAN_IDS,
    DEFAULT_LIMITS,
    OVERAGE_PRICING,
    loadPlanRows,
    resolveAgentRecord,
    getOrCreateSubscription,
    ensureUsagePeriod,
    getUsageState,
    getBillingSnapshot,
    checkEntitlement,
    trackUsageEvent,
    createCheckoutSession,
    createPortalSession,
    receiveStripeWebhook,
    processStripeWebhookJob,
    isMissingTableError,
    deriveEffectivePlanId
  };
};

module.exports = {
  createBillingEngine,
  PLAN_IDS,
  DEFAULT_LIMITS,
  OVERAGE_PRICING
};
