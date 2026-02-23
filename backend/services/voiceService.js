const { initiateOutboundCall } = require('./vapiVoiceService');

const normalizeBotKey = (value) => String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const initiateCall = async ({ leadId, agentId, propertyId, script, leadName, leadPhone, callType }) => {
    if (!leadPhone) {
        throw new Error('Missing lead phone number');
    }

    const selectedBotKey = normalizeBotKey(callType) || 'admin_follow_up';
    let resolvedConfigId =
        process.env.VAPI_DEFAULT_ASSISTANT_ID ||
        process.env.RETELL_DEFAULT_AGENT_ID ||
        process.env.RETELL_AGENT_ID ||
        process.env.VOICE_PHASE1_FOLLOWUP_CONFIG_ID ||
        process.env.HUME_CONFIG_ID ||
        '';

    try {
        const { resolveCallBotConfigId } = require('./callBotsService');
        const configFromBot = await resolveCallBotConfigId({
            userId: agentId,
            botKey: selectedBotKey
        });
        if (configFromBot) resolvedConfigId = configFromBot;
    } catch (error) {
        console.warn('[Voice Service] Falling back to default call bot config:', error.message);
    }

    return initiateOutboundCall(leadPhone, script || '', {
        leadId,
        leadName,
        propertyId,
        userId: agentId,
        assistantKey: selectedBotKey,
        botType: selectedBotKey,
        configId: resolvedConfigId,
        source: 'funnel_execution'
    });
};

module.exports = {
    initiateCall
};
