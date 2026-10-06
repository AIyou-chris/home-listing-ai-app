'use strict';

// Read-only "what does this loan officer see, and what is wrong?" report for customer service.
// Pure: takes plain rows, returns a checklist plus a plain-English list of problems.

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
const hasList = (v) => Array.isArray(v) && v.length > 0;
const DAY = 86400000;

const planLabel = (agent) => {
  if (agent.payment_status === 'comp') return 'Comped (free LO Pro)';
  const sub = String(agent.subscription_status || '').toLowerCase();
  if (sub === 'active') return 'Paid';
  if (sub === 'past_due' || sub === 'unpaid') return 'Late on payment';
  if (sub === 'canceled') return 'Canceled';
  if (agent.payment_status === 'awaiting_payment') return 'Free trial (no card)';
  return agent.payment_status || 'Unknown';
};

const trialDaysLeft = (agent, now = Date.now()) => {
  if (agent.payment_status !== 'awaiting_payment' || !agent.created_at) return null;
  return Math.ceil((new Date(agent.created_at).getTime() + 7 * DAY - now) / DAY);
};

const buildSupportReport = ({ agent, brain, phoneLine, listingCount = 0, invites = [], leadCount = 0, lastLeadAt = null, now = Date.now() }) => {
  const days = trialDaysLeft(agent, now);
  const claimed = invites.filter((i) => i.claimed_at).length;
  const viewed = invites.filter((i) => Number(i.view_count) > 0).length;
  const lastSeen = agent.last_seen_at ? new Date(agent.last_seen_at).getTime() : null;

  const checklist = [
    { key: 'profile', label: 'Name and NMLS saved', ok: hasText(agent.first_name) && hasText(agent.nmls_number) },
    { key: 'brain', label: 'AI Brain has knowledge', ok: Boolean(brain) && hasText(brain.knowledge_base) },
    { key: 'compliance', label: 'Compliance info (company, NMLS, states)', ok: Boolean(brain) && hasText(brain.company_name) && hasText(brain.company_nmls) && hasList(brain.licensed_states) },
    { key: 'listings', label: 'At least one listing assigned', ok: listingCount > 0 },
    { key: 'invites', label: 'Sent a WOW Link to an agent', ok: invites.length > 0 },
    { key: 'claimed', label: 'An agent claimed their link', ok: claimed > 0 },
    { key: 'phone', label: 'AI phone number active', ok: Boolean(phoneLine) && phoneLine.status === 'active' },
    { key: 'leads', label: 'Has received leads', ok: leadCount > 0 }
  ];

  const problems = [];
  const sub = String(agent.subscription_status || '').toLowerCase();
  if (agent.payment_status === 'awaiting_payment' && days !== null && days <= 0) problems.push('Free trial ended and no card is on file. The dashboard shows a red "trial ended" bar.');
  else if (days !== null && days <= 2) problems.push(`Trial ends in ${days} day${days === 1 ? '' : 's'}.`);
  if (sub === 'past_due' || sub === 'unpaid') problems.push('Payment is late.');
  if (sub === 'canceled') problems.push('Subscription was canceled.');
  if (!checklist[0].ok) problems.push('No NMLS number or name saved. Their profile shows as incomplete.');
  if (!checklist[1].ok) problems.push('AI Brain is empty, so buyer answers are generic.');
  else if (!checklist[2].ok) problems.push('Compliance info is missing (company, NMLS or licensed states), so the AI will not name them.');
  if (!checklist[3].ok) problems.push('No listing is assigned to them, so there is nothing for buyers to chat with.');
  if (!checklist[4].ok) problems.push('They have not sent a single WOW Link.');
  else if (viewed === 0) problems.push('They sent WOW Links but no agent has opened one yet.');
  else if (!checklist[5].ok) problems.push('Agents opened their WOW Links but none claimed an account.');
  if (phoneLine && phoneLine.provisioning_error) problems.push(`The AI phone number has an error: ${String(phoneLine.provisioning_error).slice(0, 160)}`);
  if (lastSeen && now - lastSeen > 14 * DAY) problems.push('They have not logged in for over 2 weeks.');
  if (!lastSeen) problems.push('There is no record of them logging in.');
  if (leadCount === 0 && checklist[3].ok && checklist[4].ok) problems.push('Everything is set up but no leads yet.');

  return {
    plan: planLabel(agent),
    trialDaysLeft: days,
    stats: { listings: listingCount, invitesSent: invites.length, invitesViewed: viewed, invitesClaimed: claimed, leads: leadCount, lastLeadAt },
    checklist,
    problems
  };
};

module.exports = { buildSupportReport, planLabel, trialDaysLeft };
