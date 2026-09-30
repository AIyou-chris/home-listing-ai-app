'use strict';

/**
 * Returns the LO id that is really assigned to a listing, or null.
 * Never trusts a caller-supplied LO id: if one is given it must match an
 * active (branding-enabled) assignment for that listing.
 */
async function resolveAssignedLoId({ supabase, listingId, requestedLoId }) {
  if (!listingId) return null;
  let query = supabase
    .from('listing_lo_assignments')
    .select('lo_agent_id')
    .eq('listing_id', listingId)
    .eq('branding_enabled', true)
    .limit(1);
  if (requestedLoId) query = query.eq('lo_agent_id', requestedLoId);
  const { data } = await query;
  return data?.[0]?.lo_agent_id || null;
}

module.exports = { resolveAssignedLoId };
