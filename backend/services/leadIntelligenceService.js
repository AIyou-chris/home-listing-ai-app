const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const HOT_THRESHOLD = 70;
const WARM_THRESHOLD = 40;

const isMissingTableError = (error) =>
  error?.code === '42P01' ||
  error?.code === 'PGRST205' ||
  /does not exist/i.test(error?.message || '');

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const dedupeTags = (tags) => Array.from(new Set((tags || []).filter(Boolean))).slice(0, 12);

const computeRelativeActivity = (isoDate) => {
  if (!isoDate) return 'unknown';
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return 'unknown';

  const seconds = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const parseLeadFromRows = ({ lead, appointments, events }) => {
  const lowerTextChunks = [
    lead?.last_message_preview,
    events?.map((event) => event?.payload?.message || event?.payload?.context || '').join(' ')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const tags = [];
  let score = 0;

  if ((appointments || []).length > 0) {
    score += 35;
    tags.push('showing');
  }

  const hasConfirmed = (appointments || []).some((appointment) => normalizeStatus(appointment.status) === 'confirmed');
  const hasRescheduleRequest = (events || []).some(
    (event) => event.type === 'APPOINTMENT_RESCHEDULE_REQUESTED' || normalizeStatus(event.payload?.outcome) === 'reschedule_requested'
  );

  if (hasConfirmed) {
    score += 20;
    tags.push('timeline');
  }

  if (hasRescheduleRequest) {
    score += 12;
    tags.push('timeline');
  }

  if (lead?.timeline === '0-30') {
    score += 25;
    tags.push('timeline');
  } else if (lead?.timeline === '1-3mo') {
    score += 15;
    tags.push('timeline');
  } else if (lead?.timeline === '3+') {
    score += 5;
  }

  if (lead?.financing === 'preapproved' || lead?.financing === 'cash') {
    score += 20;
    tags.push('financing');
  } else if (lead?.financing === 'exploring') {
    score += 10;
    tags.push('financing');
  }

  if (normalizeStatus(lead?.status) === 'contacted') {
    score += 8;
  }

  if (events?.some((event) => event.type === 'APPOINTMENT_CREATED')) {
    score += 10;
  }

  if (events?.some((event) => event.type === 'APPOINTMENT_CONFIRMED')) {
    score += 15;
  }

  if (/(offer|preapproval|pre-approval|cash|close|escrow)/.test(lowerTextChunks)) {
    score += 20;
    tags.push('offer');
  }

  if (/(hoa|disclosure|inspection|tax|schools|district)/.test(lowerTextChunks)) {
    score += 10;
    if (/(hoa|disclosure|inspection|tax)/.test(lowerTextChunks)) tags.push('disclosures');
    if (/(schools|district)/.test(lowerTextChunks)) tags.push('schools');
  }

  if (/(price|comp|valuation|market report|cma)/.test(lowerTextChunks)) {
    score += 8;
    tags.push('price');
  }

  if (/(showing|tour|visit)/.test(lowerTextChunks)) {
    score += 12;
    tags.push('showing');
  }

  score = Math.max(0, Math.min(100, score));
  const intentLevel = score >= HOT_THRESHOLD ? 'Hot' : score >= WARM_THRESHOLD ? 'Warm' : 'Cold';

  const dedupedTags = dedupeTags(tags);

  const latestAppointment = (appointments || [])
    .slice()
    .sort((a, b) => new Date(b.starts_at || b.start_iso || b.created_at || 0).getTime() - new Date(a.starts_at || a.start_iso || a.created_at || 0).getTime())[0];

  const summaryLines = [];
  summaryLines.push(`Intent ${intentLevel} (${score}/100)`);

  if (lead?.timeline && lead.timeline !== 'unknown') {
    summaryLines.push(`Buying timeline: ${lead.timeline}`);
  } else {
    summaryLines.push('Timeline not provided yet');
  }

  if (lead?.financing && lead.financing !== 'unknown') {
    summaryLines.push(`Financing: ${lead.financing}`);
  } else {
    summaryLines.push('Financing status unknown');
  }

  if (latestAppointment) {
    const status = normalizeStatus(latestAppointment.status || 'scheduled');
    const start = latestAppointment.starts_at || latestAppointment.start_iso;
    summaryLines.push(`Latest appointment: ${status}${start ? ` (${new Date(start).toLocaleString()})` : ''}`);
  } else {
    summaryLines.push('No appointment on file yet');
  }

  const lastActivity = lead?.last_message_at || lead?.last_intent_at || lead?.updated_at || lead?.created_at;
  summaryLines.push(`Last activity: ${computeRelativeActivity(lastActivity)}`);

  const summary = summaryLines.slice(0, 5).join('\n');

  let nextBestAction = 'Review lead profile and send a value-focused follow-up email.';
  if (hasRescheduleRequest) {
    nextBestAction = 'Call this lead now and lock in a new appointment time.';
  } else if (hasConfirmed) {
    nextBestAction = 'Send a quick prep note before the confirmed appointment.';
  } else if (intentLevel === 'Hot') {
    nextBestAction = 'Call now and set a showing within 24 hours.';
  } else if (intentLevel === 'Warm') {
    nextBestAction = 'Offer two showing slots and follow up today.';
  } else if (intentLevel === 'Cold') {
    nextBestAction = 'Send market report + nurture follow-up in 7 days.';
  }

  return {
    intentScore: score,
    intentLevel,
    intentTags: dedupedTags,
    leadSummary: summary,
    nextBestAction
  };
};

const upsertIntentRows = async ({ leadId, conversationId, tags, trigger }) => {
  if (!leadId || !Array.isArray(tags) || tags.length === 0) return;

  const rows = tags.map((tag) => ({
    lead_id: leadId,
    conversation_id: conversationId || null,
    intent_type: tag,
    confidence: 0.7,
    source: 'rule',
    payload: { trigger },
    created_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('lead_intents')
    .insert(rows);

  if (error && !isMissingTableError(error)) {
    console.warn('[LeadIntelligence] lead_intents insert failed:', error.message);
  }
};

const upsertSummaryRow = async ({ leadId, summary, nextBestAction }) => {
  if (!leadId) return;
  const { error } = await supabase
    .from('lead_summaries')
    .insert({
      lead_id: leadId,
      summary,
      next_best_action: nextBestAction,
      generated_by: 'rule',
      created_at: new Date().toISOString()
    });

  if (error && !isMissingTableError(error)) {
    console.warn('[LeadIntelligence] lead_summaries insert failed:', error.message);
  }
};

const updateLeadIntelligence = async ({ leadId, trigger = 'manual', conversationId = null }) => {
  if (!leadId) return null;

  const [{ data: lead, error: leadError }, { data: appointments, error: appointmentError }, { data: events, error: eventError }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, agent_id, user_id, listing_id, status, timeline, financing, working_with_agent, last_message_at, last_message_preview, full_name, name, email, email_lower, phone, phone_e164, created_at, updated_at, last_intent_at')
      .eq('id', leadId)
      .maybeSingle(),
    supabase
      .from('appointments')
      .select('id, lead_id, status, starts_at, start_iso, timezone, location, listing_id, property_id, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('lead_events')
      .select('id, type, payload, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  if (leadError || !lead) {
    if (leadError) console.warn('[LeadIntelligence] failed lead lookup:', leadError.message);
    return null;
  }

  if (appointmentError && !isMissingTableError(appointmentError)) {
    console.warn('[LeadIntelligence] appointments lookup failed:', appointmentError.message);
  }

  if (eventError && !isMissingTableError(eventError)) {
    console.warn('[LeadIntelligence] lead_events lookup failed:', eventError.message);
  }

  const computed = parseLeadFromRows({
    lead,
    appointments: appointments || [],
    events: events || []
  });

  const updatePayload = {
    intent_score: computed.intentScore,
    intent_level: computed.intentLevel,
    intent_tags: computed.intentTags,
    lead_summary: computed.leadSummary,
    next_best_action: computed.nextBestAction,
    last_intent_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('leads')
    .update(updatePayload)
    .eq('id', leadId);

  if (updateError && !isMissingTableError(updateError)) {
    throw updateError;
  }

  await Promise.all([
    upsertIntentRows({
      leadId,
      conversationId,
      tags: computed.intentTags,
      trigger
    }),
    upsertSummaryRow({
      leadId,
      summary: computed.leadSummary,
      nextBestAction: computed.nextBestAction
    })
  ]);

  return {
    leadId,
    ...computed
  };
};

const calculateRoiMetrics = async ({ agentId, from, to }) => {
  const fromIso = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const toIso = to || new Date().toISOString();

  const leadsPromise = supabase
    .from('leads')
    .select('id, status, created_at, updated_at, agent_id, user_id, intent_level')
    .or(`agent_id.eq.${agentId},user_id.eq.${agentId}`)
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  const eventsPromise = supabase
    .from('lead_events')
    .select('id, lead_id, type, created_at, payload')
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  const appointmentsPromise = supabase
    .from('appointments')
    .select('id, lead_id, agent_id, user_id, status, starts_at, start_iso, created_at, listing_id, property_id')
    .or(`agent_id.eq.${agentId},user_id.eq.${agentId}`)
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  const remindersPromise = supabase
    .from('appointment_reminders')
    .select('id, status, reminder_type, scheduled_for, appointment_id')
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  const [leadRes, eventRes, appointmentRes, reminderRes] = await Promise.all([
    leadsPromise,
    eventsPromise,
    appointmentsPromise,
    remindersPromise
  ]);

  if (leadRes.error && !isMissingTableError(leadRes.error)) throw leadRes.error;
  if (eventRes.error && !isMissingTableError(eventRes.error)) throw eventRes.error;
  if (appointmentRes.error && !isMissingTableError(appointmentRes.error)) throw appointmentRes.error;
  if (reminderRes.error && !isMissingTableError(reminderRes.error)) throw reminderRes.error;

  const leads = leadRes.data || [];
  const appointments = appointmentRes.data || [];
  const events = (eventRes.data || []).filter((event) => {
    const payloadAgentId = event?.payload?.agent_id || event?.payload?.user_id;
    return !payloadAgentId || String(payloadAgentId) === String(agentId);
  });
  const reminders = reminderRes.data || [];

  const leadIds = new Set(leads.map((lead) => lead.id));
  const appointmentsForLeads = appointments.filter((appointment) => !appointment.lead_id || leadIds.has(appointment.lead_id));

  const contacted = events.filter((event) => event.type === 'STATUS_UPDATED' && String(event.payload?.status || '').toLowerCase() === 'contacted').length;
  const confirmed = events.filter((event) => event.type === 'APPOINTMENT_CONFIRMED').length;
  const reschedules = events.filter((event) => event.type === 'APPOINTMENT_RESCHEDULE_REQUESTED').length;

  const reminderSent = reminders.filter((reminder) => reminder.status === 'sent').length;
  const reminderFailed = reminders.filter((reminder) => reminder.status === 'failed').length;
  const reminderRate = reminderSent + reminderFailed > 0
    ? Math.round((reminderSent / (reminderSent + reminderFailed)) * 100)
    : 0;

  const firstActionBuckets = leads.map((lead) => {
    const leadCreated = new Date(lead.created_at).getTime();
    if (Number.isNaN(leadCreated)) return null;

    const firstAction = events
      .filter((event) => event.lead_id === lead.id && ['STATUS_UPDATED', 'APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED'].includes(event.type))
      .map((event) => new Date(event.created_at).getTime())
      .filter((ts) => Number.isFinite(ts))
      .sort((a, b) => a - b)[0];

    if (!firstAction) return null;
    const diffMinutes = Math.max(0, Math.round((firstAction - leadCreated) / (60 * 1000)));
    return diffMinutes;
  }).filter((value) => value !== null);

  const avgFirstAction = firstActionBuckets.length > 0
    ? Math.round(firstActionBuckets.reduce((sum, value) => sum + value, 0) / firstActionBuckets.length)
    : null;

  const unworkedLeads = leads.filter((lead) => {
    if (String(lead.status || '').toLowerCase() !== 'new') return false;
    const acted = events.some((event) => event.lead_id === lead.id && ['STATUS_UPDATED', 'APPOINTMENT_CREATED'].includes(event.type));
    return !acted;
  }).length;

  const topListingMap = {};
  for (const appointment of appointmentsForLeads) {
    const listingKey = appointment.listing_id || appointment.property_id || 'unknown';
    topListingMap[listingKey] = (topListingMap[listingKey] || 0) + 1;
  }
  const topListing = Object.entries(topListingMap)
    .sort((a, b) => b[1] - a[1])[0] || null;

  return {
    from: fromIso,
    to: toIso,
    leads_captured: leads.length,
    leads_contacted: contacted,
    appointments_set: appointmentsForLeads.length,
    appointments_confirmed: confirmed,
    reschedule_requests: reschedules,
    reminder_success_rate: reminderRate,
    time_to_first_action_minutes: avgFirstAction,
    unworked_leads: unworkedLeads,
    top_listing_id: topListing ? topListing[0] : null,
    top_listing_leads: topListing ? topListing[1] : 0
  };
};

module.exports = {
  updateLeadIntelligence,
  calculateRoiMetrics
};
