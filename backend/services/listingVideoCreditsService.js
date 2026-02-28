const PLAN_PRO = 'pro';
const DEFAULT_INCLUDED_CREDITS = 3;

const normalizePlanId = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'pro') return 'pro';
  if (normalized === 'starter') return 'starter';
  return 'free';
};

const toCreditsPayload = (row) => {
  const included = Number(row?.included_credits || 0);
  const extra = Number(row?.extra_credits || 0);
  const used = Number(row?.used_credits || 0);
  return {
    listing_id: row?.listing_id || null,
    agent_id: row?.agent_id || null,
    included,
    extra,
    used,
    remaining: Math.max(0, included + extra - used),
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null
  };
};

const isNotFoundLike = (error) =>
  error?.code === 'PGRST116' ||
  /no rows/i.test(error?.message || '');

const isConflictError = (error) =>
  error?.code === '23505' ||
  /duplicate key|already exists|conflict/i.test(error?.message || '');

const createListingVideoCreditsService = ({ supabaseAdmin }) => {
  if (!supabaseAdmin) throw new Error('supabase_admin_required');

  const readCreditsRow = async ({ agentId, listingId }) => {
    const { data, error } = await supabaseAdmin
      .from('listing_video_credits')
      .select('*')
      .eq('listing_id', listingId)
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error && !isNotFoundLike(error)) throw error;
    return data || null;
  };

  const ensureCreditsRow = async ({ agentId, listingId, planId }) => {
    if (!agentId || !listingId) throw new Error('agent_id_and_listing_id_required');

    const existing = await readCreditsRow({ agentId, listingId });
    if (existing) return toCreditsPayload(existing);

    const normalizedPlan = normalizePlanId(planId);
    const includedCredits = normalizedPlan === PLAN_PRO ? DEFAULT_INCLUDED_CREDITS : 0;

    const insertPayload = {
      listing_id: listingId,
      agent_id: agentId,
      included_credits: includedCredits,
      extra_credits: 0,
      used_credits: 0
    };

    const { data, error } = await supabaseAdmin
      .from('listing_video_credits')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      if (isConflictError(error)) {
        const row = await readCreditsRow({ agentId, listingId });
        if (row) return toCreditsPayload(row);
      }
      if (!isNotFoundLike(error)) throw error;
    }

    return toCreditsPayload(data || insertPayload);
  };

  const getCredits = async ({ agentId, listingId }) => {
    if (!agentId || !listingId) throw new Error('agent_id_and_listing_id_required');
    const row = await readCreditsRow({ agentId, listingId });
    if (!row) {
      return {
        listing_id: listingId,
        agent_id: agentId,
        included: 0,
        extra: 0,
        used: 0,
        remaining: 0,
        created_at: null,
        updated_at: null
      };
    }

    return toCreditsPayload(row);
  };

  const reserveCreditOrFail = async ({ agentId, listingId }) => {
    if (!agentId || !listingId) throw new Error('agent_id_and_listing_id_required');

    const { data, error } = await supabaseAdmin.rpc('reserve_listing_video_credit', {
      p_listing_id: listingId,
      p_agent_id: agentId
    });

    if (error && !isNotFoundLike(error)) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      const noCreditsError = new Error('no_credits_remaining');
      noCreditsError.code = 'NO_CREDITS';
      throw noCreditsError;
    }

    return toCreditsPayload(row);
  };

  const addExtraCredits = async ({ agentId, listingId, amount }) => {
    if (!agentId || !listingId) throw new Error('agent_id_and_listing_id_required');
    const safeAmount = Math.max(0, Number(amount || 0));

    await ensureCreditsRow({
      agentId,
      listingId,
      planId: 'free'
    });

    const { data, error } = await supabaseAdmin.rpc('add_listing_video_extra_credits', {
      p_listing_id: listingId,
      p_agent_id: agentId,
      p_amount: safeAmount
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error('failed_to_add_extra_credits');
    }

    return toCreditsPayload(row);
  };

  return {
    ensureCreditsRow,
    getCredits,
    reserveCreditOrFail,
    addExtraCredits
  };
};

module.exports = {
  createListingVideoCreditsService
};
