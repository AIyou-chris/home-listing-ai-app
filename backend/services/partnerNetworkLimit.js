'use strict';

// A partner agent (invited by a loan officer, free account) should be able to publish listings as long as
// their loan officer's plan has room: the plans are sold as "N active listings across your partner network".
// Before this, the agent's own Free plan (1 listing) decided, so a second listing was blocked.
// partners: [{ limit, used }] one per active partner LO. `used` = that LO's live (published) listings
// not counting the one being published.

function canPublishUnderPartners(partners) {
  const list = Array.isArray(partners) ? partners.filter(Boolean) : [];
  if (list.length === 0) return null; // not a partner agent: the normal plan check applies
  const withRoom = list.filter((p) => Number(p.limit) > Number(p.used || 0));
  if (withRoom.length > 0) return { allowed: true };
  const best = list.reduce((a, b) => (Number(b.limit) > Number(a.limit) ? b : a), list[0]);
  return {
    allowed: false,
    limit: Number(best.limit),
    used: Number(best.used || 0),
    message: `Your loan officer's plan includes ${Number(best.limit)} live listings and all of them are in use. Ask your loan officer to upgrade, or take one down first.`
  };
}

module.exports = { canPublishUnderPartners };
