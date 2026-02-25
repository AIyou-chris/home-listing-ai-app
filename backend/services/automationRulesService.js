const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const RECIPES = [
  {
    key: 'new_lead_email',
    name: 'New Lead Captured',
    trigger: 'lead_captured',
    conditions: { channels: ['email'] },
    actions: { notify_agent: true, channels: ['email'] },
    defaultEnabled: true
  },
  {
    key: 'appointment_queue_reminders',
    name: 'Appointment Created',
    trigger: 'appointment_created',
    conditions: { offsets_minutes: [1440, 120] },
    actions: { queue_reminders: true, reminder_types: ['voice', 'sms'] },
    defaultEnabled: true
  },
  {
    key: 'reschedule_requested_notify_agent',
    name: 'Reschedule Requested',
    trigger: 'reschedule_requested',
    conditions: {},
    actions: { notify_agent: true, channel: 'email', mark_needs_attention: true },
    defaultEnabled: true
  },
  {
    key: 'no_action_escalation',
    name: 'No Agent Action in 10 minutes',
    trigger: 'lead_unworked_10m',
    conditions: { minutes_without_action: 10 },
    actions: { escalation_email: true },
    defaultEnabled: false
  }
];

const isMissingTableError = (error) =>
  error?.code === '42P01' ||
  error?.code === 'PGRST205' ||
  /relation .*automation_rules.* does not exist/i.test(error?.message || '');

const recipeByName = new Map(RECIPES.map((recipe) => [recipe.name, recipe]));
const recipeByKey = new Map(RECIPES.map((recipe) => [recipe.key, recipe]));

const mapRule = (row) => {
  const known = recipeByName.get(row.name) || null;
  return {
    id: row.id,
    agent_id: row.agent_id,
    key: known?.key || row.name,
    name: row.name,
    trigger: row.trigger,
    enabled: Boolean(row.enabled),
    conditions: row.conditions || {},
    actions: row.actions || {},
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

const ensureRecipesForAgent = async (agentId) => {
  if (!agentId) return [];

  const { data: existingRows, error: existingError } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('agent_id', agentId);

  if (existingError) {
    if (isMissingTableError(existingError)) return [];
    throw existingError;
  }

  const existingByName = new Map((existingRows || []).map((row) => [row.name, row]));
  const toInsert = RECIPES.filter((recipe) => !existingByName.has(recipe.name)).map((recipe) => ({
    agent_id: agentId,
    name: recipe.name,
    trigger: recipe.trigger,
    conditions: recipe.conditions,
    actions: recipe.actions,
    enabled: recipe.defaultEnabled
  }));

  let inserted = [];
  if (toInsert.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from('automation_rules')
      .insert(toInsert)
      .select('*');

    if (insertError && !isMissingTableError(insertError)) {
      throw insertError;
    }

    inserted = insertedRows || [];
  }

  return [...(existingRows || []), ...inserted].map(mapRule);
};

const listRecipes = async (agentId) => {
  if (!agentId) return RECIPES.map((recipe) => ({ ...recipe, enabled: recipe.defaultEnabled }));
  const ensured = await ensureRecipesForAgent(agentId);
  if (ensured.length > 0) return ensured;

  return RECIPES.map((recipe) => ({
    id: `fallback-${agentId}-${recipe.key}`,
    agent_id: agentId,
    key: recipe.key,
    name: recipe.name,
    trigger: recipe.trigger,
    enabled: recipe.defaultEnabled,
    conditions: recipe.conditions,
    actions: recipe.actions,
    created_at: null,
    updated_at: null
  }));
};

const setRecipeEnabled = async ({ agentId, recipeKey, enabled }) => {
  if (!agentId) throw new Error('agentId is required');
  const recipe = recipeByKey.get(recipeKey);
  if (!recipe) throw new Error('invalid recipe key');

  const rules = await ensureRecipesForAgent(agentId);
  const target = rules.find((row) => row.name === recipe.name);
  if (!target?.id) {
    throw new Error('recipe row missing');
  }

  const { data, error } = await supabase
    .from('automation_rules')
    .update({ enabled: Boolean(enabled), updated_at: new Date().toISOString() })
    .eq('id', target.id)
    .eq('agent_id', agentId)
    .select('*')
    .single();

  if (error) throw error;
  return mapRule(data);
};

const isRecipeEnabled = async ({ agentId, recipeKey, defaultValue = true }) => {
  if (!agentId) return defaultValue;
  const recipe = recipeByKey.get(recipeKey);
  if (!recipe) return defaultValue;

  const { data, error } = await supabase
    .from('automation_rules')
    .select('enabled')
    .eq('agent_id', agentId)
    .eq('name', recipe.name)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return defaultValue;
    throw error;
  }

  if (!data) return defaultValue;
  return Boolean(data.enabled);
};

module.exports = {
  RECIPES,
  listRecipes,
  setRecipeEnabled,
  isRecipeEnabled
};
