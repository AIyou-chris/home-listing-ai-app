const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_FOLLOWUP_CONFIG_ID =
    process.env.VOICE_PHASE1_FOLLOWUP_CONFIG_ID ||
    process.env.HUME_CONFIG_ID ||
    process.env.VITE_HUME_ADMIN_FOLLOWUP_CONFIG_ID ||
    'd1d4d371-00dd-4ef9-8ab5-36878641b349';

const slugifyBotKey = (value = '') => String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);

const isMissingTableError = (error) =>
    error?.code === '42P01'
    || error?.code === 'PGRST205'
    || /relation .*call_bots.* does not exist/i.test(error?.message || '')
    || /could not find the table ['"]?public\.call_bots['"]?/i.test(error?.message || '');

const toApiBot = (row) => ({
    id: row.id,
    userId: row.user_id,
    key: row.bot_key,
    name: row.name,
    description: row.description || '',
    configId: row.hume_config_id,
    isActive: Boolean(row.is_active),
    isDefault: Boolean(row.is_default),
    isSystem: Boolean(row.is_system),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
});

const buildFallbackBots = (userId = '') => ([
    {
        id: `fallback-${userId || 'global'}-admin_follow_up`,
        userId: userId || null,
        key: 'admin_follow_up',
        name: 'Admin Follow-Up Bot',
        description: 'Fallback bot while call_bots table is missing or empty.',
        configId: DEFAULT_FOLLOWUP_CONFIG_ID,
        isActive: true,
        isDefault: true,
        isSystem: true,
        createdAt: null,
        updatedAt: null
    }
]);

const listCallBots = async ({ userId, includeInactive = false }) => {
    if (!userId) {
        return buildFallbackBots(userId);
    }

    let query = supabase
        .from('call_bots')
        .select('id,user_id,bot_key,name,description,hume_config_id,is_active,is_default,is_system,created_at,updated_at')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

    if (!includeInactive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) {
        if (isMissingTableError(error)) {
            console.warn('⚠️ [CallBots] call_bots table missing; using fallback bot list.');
            return buildFallbackBots(userId);
        }
        throw error;
    }

    if (!data || data.length === 0) {
        return buildFallbackBots(userId);
    }
    return data.map(toApiBot);
};

const createCallBot = async ({ userId, name, key, description, configId, isActive = true, isDefault = false }) => {
    if (!userId) throw new Error('Missing userId');
    if (!name || !String(name).trim()) throw new Error('Missing bot name');
    if (!configId || !String(configId).trim()) throw new Error('Missing Hume config ID');

    const botKey = slugifyBotKey(key || name);
    if (!botKey) throw new Error('Invalid bot key');

    if (isDefault) {
        await supabase
            .from('call_bots')
            .update({ is_default: false })
            .eq('user_id', userId);
    }

    const { data, error } = await supabase
        .from('call_bots')
        .insert({
            user_id: userId,
            bot_key: botKey,
            name: String(name).trim(),
            description: description || '',
            hume_config_id: String(configId).trim(),
            is_active: Boolean(isActive),
            is_default: Boolean(isDefault),
            is_system: false
        })
        .select('id,user_id,bot_key,name,description,hume_config_id,is_active,is_default,is_system,created_at,updated_at')
        .single();

    if (error) {
        if (isMissingTableError(error)) {
            throw new Error('call_bots table is missing. Run the call_bots migration first.');
        }
        if (error.code === '23505') {
            throw new Error(`A call bot with key "${botKey}" already exists.`);
        }
        throw error;
    }

    return toApiBot(data);
};

const updateCallBot = async ({ botId, userId, name, key, description, configId, isActive, isDefault }) => {
    if (!botId) throw new Error('Missing botId');
    if (!userId) throw new Error('Missing userId');

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (key !== undefined) {
        const botKey = slugifyBotKey(key);
        if (!botKey) throw new Error('Invalid bot key');
        updates.bot_key = botKey;
    }
    if (description !== undefined) updates.description = description || '';
    if (configId !== undefined) updates.hume_config_id = String(configId).trim();
    if (isActive !== undefined) updates.is_active = Boolean(isActive);
    if (isDefault !== undefined) updates.is_default = Boolean(isDefault);
    updates.updated_at = new Date().toISOString();

    if (updates.is_default === true) {
        await supabase
            .from('call_bots')
            .update({ is_default: false })
            .eq('user_id', userId);
    }

    const { data, error } = await supabase
        .from('call_bots')
        .update(updates)
        .eq('id', botId)
        .eq('user_id', userId)
        .select('id,user_id,bot_key,name,description,hume_config_id,is_active,is_default,is_system,created_at,updated_at')
        .single();

    if (error) {
        if (isMissingTableError(error)) {
            throw new Error('call_bots table is missing. Run the call_bots migration first.');
        }
        if (error.code === '23505') {
            throw new Error('A call bot with that key already exists.');
        }
        throw error;
    }

    return toApiBot(data);
};

const deleteCallBot = async ({ botId, userId }) => {
    if (!botId) throw new Error('Missing botId');
    if (!userId) throw new Error('Missing userId');

    const { data: existing, error: findError } = await supabase
        .from('call_bots')
        .select('id,is_system')
        .eq('id', botId)
        .eq('user_id', userId)
        .single();

    if (findError) {
        if (isMissingTableError(findError)) {
            throw new Error('call_bots table is missing. Run the call_bots migration first.');
        }
        throw findError;
    }

    if (existing?.is_system) {
        throw new Error('System call bot cannot be deleted.');
    }

    const { error } = await supabase
        .from('call_bots')
        .delete()
        .eq('id', botId)
        .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
};

const resolveCallBotConfigId = async ({ userId, botKey }) => {
    const normalizedKey = slugifyBotKey(botKey || 'admin_follow_up');
    if (!normalizedKey) return DEFAULT_FOLLOWUP_CONFIG_ID;

    if (userId) {
        const { data, error } = await supabase
            .from('call_bots')
            .select('hume_config_id')
            .eq('user_id', userId)
            .eq('bot_key', normalizedKey)
            .eq('is_active', true)
            .maybeSingle();

        if (!error && data?.hume_config_id) {
            return data.hume_config_id;
        }
        if (error && !isMissingTableError(error)) {
            console.warn('⚠️ [CallBots] resolve config failed:', error.message);
        }
    }

    const fallbackBots = buildFallbackBots(userId);
    const fallbackMatch = fallbackBots.find((bot) => bot.key === normalizedKey) || fallbackBots[0];
    return fallbackMatch?.configId || DEFAULT_FOLLOWUP_CONFIG_ID;
};

module.exports = {
    listCallBots,
    createCallBot,
    updateCallBot,
    deleteCallBot,
    resolveCallBotConfigId
};
