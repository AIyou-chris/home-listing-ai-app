const normalizeType = (rawType = '') => {
    const t = String(rawType || '').trim().toLowerCase();
    if (!t) return 'email';
    if (['ai call', 'ai-call', 'voice'].includes(t)) return 'call';
    if (['text'].includes(t)) return 'sms';
    return t;
};

const parseDelayMinutes = (step = {}) => {
    const explicit = Number(step.delayMinutes);
    if (Number.isFinite(explicit) && explicit >= 0) return explicit;

    const delayText = String(step.delay || '').toLowerCase().trim();
    if (!delayText) return 0;

    const numMatch = delayText.match(/-?\d+/);
    const value = numMatch ? Number(numMatch[0]) : 0;
    if (!Number.isFinite(value) || value <= 0) return 0;

    if (delayText.includes('hour')) return value * 60;
    if (delayText.includes('day')) return value * 1440;
    return value; // default minutes
};

const normalizeFunnelKey = (rawKey = '') => {
    const key = String(rawKey || '').trim().toLowerCase();
    if (!key) return 'realtor_funnel';

    if (['realtor', 'agent', 'realtor_funnel'].includes(key)) return 'realtor_funnel';
    if (['broker', 'recruiter', 'broker_funnel'].includes(key)) return 'broker_funnel';
    if (['welcome', 'universal_sales', 'homebuyer', 'seller', 'postshowing'].includes(key)) return key;
    return key;
};

const buildFunnelCandidates = (normalizedKey) => {
    if (normalizedKey === 'realtor_funnel') return ['realtor_funnel', 'realtor'];
    if (normalizedKey === 'broker_funnel') return ['broker_funnel', 'broker', 'recruiter'];
    return [normalizedKey];
};

const buildFunnelJsonSteps = (steps = []) => {
    return (steps || []).map((step, index) => {
        const type = normalizeType(step.type || step.action_type || 'email');
        const delayMinutes = parseDelayMinutes(step);
        return {
            id: step.step_key || step.id || `step-${index + 1}`,
            step_key: step.step_key || step.id || `step-${index + 1}`,
            type,
            title: step.title || step.step_name || `Step ${index + 1}`,
            description: step.description || '',
            subject: step.subject || step.email_subject || '',
            content: step.content || step.body || step.email_body || '',
            delay_minutes: delayMinutes,
            previewText: step.previewText || step.preview_text || '',
            includeUnsubscribe: step.includeUnsubscribe !== false,
            mediaUrl: step.mediaUrl || '',
            trackOpens: Boolean(step.trackOpens),
            condition_type: step.condition_type || step.conditionRule || '',
            operator: step.operator || 'gte',
            value: step.value ?? step.conditionValue ?? null,
            target_step_key_true: step.target_step_key_true || '',
            target_step_key_false: step.target_step_key_false || ''
        };
    });
};

const resolveFunnelForEnrollment = async ({ supabaseAdmin, agentId, funnelKey, defaultAgentId }) => {
    const normalizedKey = normalizeFunnelKey(funnelKey);
    const candidates = buildFunnelCandidates(normalizedKey);

    const selectCols = 'id,agent_id,funnel_key,type,is_default,steps';

    if (agentId) {
        const { data: byAgentKey } = await supabaseAdmin
            .from('funnels')
            .select(selectCols)
            .eq('agent_id', agentId)
            .in('funnel_key', candidates)
            .limit(1);
        if (byAgentKey && byAgentKey[0]) return { funnel: byAgentKey[0], normalizedKey };

        const { data: byAgentType } = await supabaseAdmin
            .from('funnels')
            .select(selectCols)
            .eq('agent_id', agentId)
            .in('type', candidates)
            .limit(1);
        if (byAgentType && byAgentType[0]) return { funnel: byAgentType[0], normalizedKey };
    }

    if (defaultAgentId) {
        const { data: byDefaultAgent } = await supabaseAdmin
            .from('funnels')
            .select(selectCols)
            .eq('agent_id', defaultAgentId)
            .in('funnel_key', candidates)
            .limit(1);
        if (byDefaultAgent && byDefaultAgent[0]) return { funnel: byDefaultAgent[0], normalizedKey };
    }

    const { data: byGlobalDefault } = await supabaseAdmin
        .from('funnels')
        .select(selectCols)
        .eq('is_default', true)
        .in('funnel_key', candidates)
        .limit(1);
    if (byGlobalDefault && byGlobalDefault[0]) return { funnel: byGlobalDefault[0], normalizedKey };

    const { data: byAnyKey } = await supabaseAdmin
        .from('funnels')
        .select(selectCols)
        .in('funnel_key', candidates)
        .limit(1);
    if (byAnyKey && byAnyKey[0]) return { funnel: byAnyKey[0], normalizedKey };

    const { data: byAnyType } = await supabaseAdmin
        .from('funnels')
        .select(selectCols)
        .in('type', candidates)
        .limit(1);
    if (byAnyType && byAnyType[0]) return { funnel: byAnyType[0], normalizedKey };

    return { funnel: null, normalizedKey };
};

const ensureFunnelStepsPayload = async ({ supabaseAdmin, funnel }) => {
    if (!funnel) return { steps: [] };
    if (Array.isArray(funnel.steps) && funnel.steps.length > 0) return { steps: funnel.steps };

    const { data: stepRows, error } = await supabaseAdmin
        .from('funnel_steps')
        .select('id,step_key,step_name,action_type,subject,email_subject,content,email_body,delay_days,delay_minutes,description,preview_text')
        .eq('funnel_id', funnel.id)
        .order('step_index', { ascending: true });

    if (error || !stepRows || stepRows.length === 0) {
        if (error) console.warn(`[Funnel] Could not hydrate steps for funnel ${funnel.id}:`, error.message);
        return { steps: [] };
    }

    const steps = stepRows.map((row, index) => {
        const delayMinutes = (Number(row.delay_days || 0) * 1440) + Number(row.delay_minutes || 0);
        return {
            id: row.step_key || row.id || `step-${index + 1}`,
            step_key: row.step_key || row.id || `step-${index + 1}`,
            type: normalizeType(row.action_type || 'email'),
            title: row.step_name || `Step ${index + 1}`,
            description: row.description || '',
            subject: row.subject || row.email_subject || '',
            content: row.content || row.email_body || '',
            delay_minutes: Math.max(delayMinutes, 0),
            previewText: row.preview_text || ''
        };
    });

    // Backfill funnels.steps so the scheduler/executor has one consistent source.
    await supabaseAdmin
        .from('funnels')
        .update({
            steps,
            updated_at: new Date().toISOString()
        })
        .eq('id', funnel.id);

    return { steps };
};

const enrollLeadInFunnel = async ({
    supabaseAdmin,
    funnelService,
    agentId,
    leadId,
    funnelKey,
    defaultAgentId
}) => {
    if (!agentId || !leadId || !funnelKey) {
        throw new Error('Missing required enrollment params');
    }

    const { funnel, normalizedKey } = await resolveFunnelForEnrollment({
        supabaseAdmin,
        agentId,
        funnelKey,
        defaultAgentId
    });

    if (!funnel) {
        throw new Error(`Funnel not found for key "${normalizedKey}"`);
    }

    await ensureFunnelStepsPayload({ supabaseAdmin, funnel });

    const { data: existing } = await supabaseAdmin
        .from('funnel_enrollments')
        .select('id,status')
        .eq('lead_id', leadId)
        .eq('funnel_id', funnel.id)
        .in('status', ['active', 'paused'])
        .maybeSingle();

    if (existing) {
        return { enrollment: existing, funnel, reused: true };
    }

    const enrollment = await funnelService.enrollLead(agentId, leadId, funnel.id);
    return { enrollment, funnel, reused: false };
};

module.exports = {
    normalizeFunnelKey,
    buildFunnelJsonSteps,
    resolveFunnelForEnrollment,
    ensureFunnelStepsPayload,
    enrollLeadInFunnel
};
