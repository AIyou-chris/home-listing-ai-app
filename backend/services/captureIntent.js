'use strict';

// Rates a lead the moment a buyer submits a form, from what they just did. Plain rules:
// free, instant, and never wrong in a way that hides a lead. (Jev still rates replies and
// pre-approvals, which carry real text to read.)

const HOT_CONTEXTS = {
  showing_requested: 'Asked to see the home.',
  pre_approval: 'Asked about financing for this home.',
  tour_requested: 'Asked to tour the home.',
  offer: 'Mentioned making an offer.'
};

function rateCaptureIntent({ context, hasPhone = false, hasEmail = false } = {}) {
  const key = String(context || '').toLowerCase().trim();
  if (HOT_CONTEXTS[key]) return { level: 'Hot', reason: HOT_CONTEXTS[key], source: 'rules' };
  if (key === 'report_requested') {
    return { level: 'Warm', reason: 'Asked for the property report.', source: 'rules' };
  }
  if (hasPhone || hasEmail) {
    return { level: 'Warm', reason: `Left ${hasPhone ? 'a phone number' : 'an email'} on the listing.`, source: 'rules' };
  }
  return { level: 'Cold', reason: 'Browsing. No contact details yet.', source: 'rules' };
}

const LEVEL_RANK = { Cold: 0, Warm: 1, Hot: 2 };
// A repeat visit can raise a lead's rating, never lower it.
const higherLevel = (a, b) => ((LEVEL_RANK[b] ?? 0) > (LEVEL_RANK[a] ?? 0) ? b : a);

module.exports = { rateCaptureIntent, higherLevel };
