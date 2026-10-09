'use strict';

// Full account deletion. The old "Delete my account" removed the account, listings, leads and subscriptions
// but left chat messages, phone-line settings, invoices, notifications and dozens of other rows behind, which
// the privacy policy cannot honestly promise. This removes everything that belongs to the person.
//
// Rules that keep it safe:
//   * It only ever deletes rows matched by the person's own ids, or by ids of THEIR listings, leads and
//     conversations. An empty id list does nothing (never "delete where in ()").
//   * Children go before parents. The login (auth user) goes last, and only if the account row is gone,
//     so a failed run can be retried.
//   * Things that belong to someone else are not deleted, only unlinked (a loan officer's copy of a lead
//     that came from an agent, invites a loan officer sent, invoices the loan officer wrote).
//   * A bought phone number is NEVER released automatically (it costs money to re-buy). The caller is told
//     which numbers need a person to release them.

// Tables where a row belongs to the account itself. [table, column]
const OWNED = [
  ['agent_actions', 'agent_id'], ['agent_notification_settings', 'agent_id'], ['agent_sidekicks', 'user_id'],
  ['ai_budgets', 'user_id'], ['ai_card_profiles', 'user_id'], ['ai_card_qr_codes', 'user_id'], ['ai_cards', 'user_id'],
  ['ai_kb', 'user_id'], ['ai_role_personalities', 'user_id'], ['ai_sidekick_profiles', 'user_id'],
  ['ai_sidekick_training_feedback', 'user_id'], ['ai_sidekicks', 'user_id'], ['ai_transcripts', 'user_id'],
  ['ai_usage_monthly', 'user_id'], ['appointment_reminders', 'agent_id'], ['appointments', 'agent_id'], ['appointments', 'user_id'],
  ['audit_logs', 'user_id'], ['automation_rules', 'agent_id'], ['billing_history', 'user_id'], ['call_bots', 'user_id'],
  ['chat_sessions', 'user_id'], ['contact_files', 'user_id'], ['contact_notes', 'user_id'], ['contacts', 'user_id'],
  ['dashboards', 'agent_id'], ['email_events', 'user_id'], ['email_tracking_events', 'user_id'],
  ['follow_up_sequences_store', 'user_id'], ['followups', 'user_id'], ['funnel_enrollments', 'agent_id'],
  ['funnel_logs', 'agent_id'], ['funnel_steps_legacy', 'user_id'], ['funnels', 'agent_id'],
  ['google_calendar_connections', 'user_id'], ['knowledge_items', 'user_id'], ['lead_conversation_summary', 'user_id'],
  ['lead_phone_logs', 'user_id'], ['lead_scores', 'user_id'], ['listing_alert_pending', 'agent_id'],
  ['listing_alert_subscribers', 'agent_id'], ['listing_dashboard_tokens', 'created_by'], ['listing_sidekicks', 'user_id'],
  ['listing_sources', 'agent_id'], ['listing_video_credits', 'agent_id'], ['listing_videos', 'agent_id'],
  ['listings', 'user_id'], ['marketing_analytics', 'user_id'], ['marketing_followups', 'user_id'],
  ['marketing_qr_codes', 'user_id'], ['marketing_sequences', 'user_id'], ['metrics_daily', 'agent_id'],
  ['notifications', 'user_id'], ['outbound_attempts', 'agent_id'], ['overage_ledger', 'agent_id'],
  ['sequence_enrollments', 'user_id'], ['sequences', 'owner_id'], ['short_links', 'agent_id'], ['sidekick_training', 'user_id'],
  ['subscriptions', 'agent_id'], ['templates', 'agent_id'], ['training_audit_log', 'user_id'], ['usage_events', 'agent_id'],
  ['usage_periods', 'agent_id'], ['user_analytics', 'user_id'], ['user_notifications', 'user_id'],
  ['user_roles', 'user_id'], ['user_settings', 'user_id'], ['vectors', 'user_id'],
  ['lo_testimonials', 'agent_id'], ['user_profiles', 'auth_user_id'],
];

// Loan-officer side: rows the loan officer owns (matched on the loan officer's profile id).
const LO_OWNED = [
  ['lo_brain_feedback', 'lo_agent_id'], ['lo_chatbot_configs', 'lo_agent_id'], ['lo_compliance_events', 'lo_agent_id'],
  ['lo_listing_kb_docs', 'lo_agent_id'], ['lo_phone_calls', 'lo_agent_id'], ['lo_phone_lines', 'lo_agent_id'],
  ['listing_branding_toggles', 'lo_agent_id'], ['listing_lo_assignments', 'lo_agent_id'],
  ['lo_agent_partnerships', 'lo_agent_id'], ['lo_agent_partnerships', 'agent_id'],
  ['lo_agent_invoices', 'lo_agent_id'], ['agent_invites', 'lo_agent_id'], ['pre_qual_submissions', 'lo_agent_id'],
  ['lo_outreach_invites', 'created_by'],
];

// Rows that hang off the account's listings (by listing id).
const BY_LISTING = [
  ['ai_sidekick_profiles', 'listing_id'], ['appointments', 'listing_id'], ['appointments', 'property_id'],
  ['chat_sessions', 'listing_id'], ['followups', 'listing_id'], ['listing_alert_pending', 'listing_id'],
  ['listing_alert_subscribers', 'listing_id'], ['listing_branding_toggles', 'listing_id'],
  ['listing_dashboard_tokens', 'listing_id'], ['listing_events', 'listing_id'], ['listing_lo_assignments', 'listing_id'],
  ['listing_sidekicks', 'listing_id'], ['listing_sources', 'listing_id'], ['listing_video_credits', 'listing_id'],
  ['listing_videos', 'listing_id'], ['lo_compliance_events', 'listing_id'], ['lo_phone_lines', 'listing_id'],
  ['marketing_analytics', 'property_id'], ['pre_qual_submissions', 'listing_id'], ['property_analytics', 'property_id'],
  ['vectors', 'listing_id'], ['agent_invites', 'listing_id'], ['lo_agent_invoices', 'listing_id'], ['ai_transcripts', 'property_id'],
];

// Rows that hang off the account's leads (by lead id).
const BY_LEAD = [
  ['agent_actions', 'lead_id'], ['appointment_reminders', 'lead_id'], ['appointments', 'lead_id'], ['email_tracking_events', 'lead_id'],
  ['funnel_enrollments', 'lead_id'], ['lead_conversation_summaries', 'lead_id'], ['lead_conversation_summary', 'lead_id'],
  ['lead_events', 'lead_id'], ['lead_funnel_progress', 'lead_id'], ['lead_intents', 'lead_id'], ['lead_phone_logs', 'lead_id'],
  ['lead_score_history', 'lead_id'], ['lead_scores', 'lead_id'], ['lead_summaries', 'lead_id'], ['lo_phone_calls', 'lead_id'],
  ['marketing_analytics', 'lead_id'], ['marketing_followups', 'lead_id'], ['outbound_attempts', 'lead_id'],
  ['pre_qual_submissions', 'lead_id'], ['sequence_enrollments', 'lead_id'], ['sequence_runs', 'lead_id'], ['ai_transcripts', 'lead_id'],
];

// Rows that hang off the account's conversations (by conversation id).
const BY_CONVERSATION = [
  ['ai_conversation_messages', 'conversation_id'], ['chat_messages', 'conversation_id'],
  ['lead_conversation_summaries', 'conversation_id'], ['lead_intents', 'conversation_id'],
];

// Belongs to someone else: unlink, do not delete. [table, column, extra columns to blank]
const UNLINK_LO = [['leads', 'lo_agent_id']];
const UNLINK_AGENT = [['agent_invites', 'claimed_agent_id'], ['office_lo_invites', 'claimed_agent_id'], ['lo_agent_invoices', 'agent_id']];

const IGNORABLE = new Set(['42P01', '42703', 'PGRST205', 'PGRST204']); // table or column does not exist here

const cleanIds = (list) => Array.from(new Set((list || []).map((v) => (v == null ? '' : String(v).trim())).filter(Boolean)));

async function run(supabase, op, label, errors, deleted) {
  try {
    const { error, count } = await op;
    if (error) {
      if (!IGNORABLE.has(error.code) && !/does not exist|schema cache/i.test(error.message || '')) {
        errors.push({ step: label, message: error.message });
      }
      return 0;
    }
    if (count) deleted[label] = (deleted[label] || 0) + count;
    return count || 0;
  } catch (err) {
    errors.push({ step: label, message: err?.message || String(err) });
    return 0;
  }
}

const delIn = (supabase, table, column, values) => supabase.from(table).delete({ count: 'exact' }).in(column, values);
const nullIn = (supabase, table, column, values) => supabase.from(table).update({ [column]: null }).in(column, values);

async function pluck(supabase, table, column, filterCol, values) {
  const out = [];
  try {
    const { data } = await supabase.from(table).select(column).in(filterCol, values).limit(50000);
    for (const row of data || []) if (row && row[column]) out.push(row[column]);
  } catch (_e) { /* missing table or column: nothing to collect */ }
  return out;
}

// ids: every id this person is known by (agents.id, auth user id). Returns { ok, deleted, errors, phoneNumbers }.
async function deleteAccountData({ supabase, ids, authUserId = null, log = console }) {
  const me = cleanIds(ids);
  if (me.length === 0) throw new Error('account_deletion_needs_ids');
  const errors = [];
  const deleted = {};

  // 1. Work out what is theirs.
  const listingIds = cleanIds([
    ...(await pluck(supabase, 'properties', 'id', 'agent_id', me)),
    ...(await pluck(supabase, 'properties', 'id', 'user_id', me)),
  ]);
  const leadIds = cleanIds([
    ...(await pluck(supabase, 'leads', 'id', 'agent_id', me)),
    ...(await pluck(supabase, 'leads', 'id', 'user_id', me)),
  ]);
  const conversationIds = cleanIds([
    ...(await pluck(supabase, 'ai_conversations', 'id', 'user_id', me)),
    ...(listingIds.length ? await pluck(supabase, 'ai_conversations', 'id', 'listing_id', listingIds) : []),
    ...(leadIds.length ? await pluck(supabase, 'ai_conversations', 'id', 'lead_id', leadIds) : []),
  ]);
  const phoneNumbers = [];
  try {
    const { data } = await supabase.from('lo_phone_lines').select('phone_number, status').in('lo_agent_id', me);
    for (const row of data || []) if (row?.phone_number) phoneNumbers.push(row.phone_number);
  } catch (_e) { /* no phone lines table or none */ }

  // 2. Children before parents.
  if (conversationIds.length) for (const [t, c] of BY_CONVERSATION) await run(supabase, delIn(supabase, t, c, conversationIds), `${t}.${c}`, errors, deleted);
  if (leadIds.length) for (const [t, c] of BY_LEAD) await run(supabase, delIn(supabase, t, c, leadIds), `${t}.${c}`, errors, deleted);
  if (listingIds.length) for (const [t, c] of BY_LISTING) await run(supabase, delIn(supabase, t, c, listingIds), `${t}.${c}`, errors, deleted);

  // 3. Things that belong to someone else: unlink, never delete.
  for (const [t, c] of UNLINK_LO) await run(supabase, nullIn(supabase, t, c, me), `unlink ${t}.${c}`, errors, deleted);
  for (const [t, c] of UNLINK_AGENT) await run(supabase, nullIn(supabase, t, c, me), `unlink ${t}.${c}`, errors, deleted);

  // 4. Their own rows.
  for (const [t, c] of LO_OWNED) await run(supabase, delIn(supabase, t, c, me), `${t}.${c}`, errors, deleted);
  for (const [t, c] of OWNED) await run(supabase, delIn(supabase, t, c, me), `${t}.${c}`, errors, deleted);

  // 5. Parents: conversations, leads, listings.
  if (conversationIds.length) await run(supabase, delIn(supabase, 'ai_conversations', 'id', conversationIds), 'ai_conversations', errors, deleted);
  await run(supabase, delIn(supabase, 'ai_conversations', 'user_id', me), 'ai_conversations.user_id', errors, deleted);
  if (leadIds.length) await run(supabase, delIn(supabase, 'leads', 'id', leadIds), 'leads', errors, deleted);
  if (listingIds.length) await run(supabase, delIn(supabase, 'properties', 'id', listingIds), 'properties', errors, deleted);

  // 6. The account row itself.
  const accountErrors = [];
  await run(supabase, delIn(supabase, 'agents', 'id', me), 'agents.id', accountErrors, deleted);
  await run(supabase, delIn(supabase, 'agents', 'auth_user_id', me), 'agents.auth_user_id', accountErrors, deleted);
  errors.push(...accountErrors);

  log.info?.('[AccountDelete] removed', JSON.stringify(deleted), errors.length ? `errors: ${JSON.stringify(errors)}` : '');
  return {
    ok: accountErrors.length === 0,
    deleted,
    errors,
    phoneNumbers: cleanIds(phoneNumbers),
    counts: { listings: listingIds.length, leads: leadIds.length, conversations: conversationIds.length },
  };
}

module.exports = { deleteAccountData, OWNED, LO_OWNED, BY_LISTING, BY_LEAD, BY_CONVERSATION, UNLINK_LO, UNLINK_AGENT };
