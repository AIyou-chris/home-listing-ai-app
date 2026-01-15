const { addMinutes } = require('date-fns');

module.exports = ({ supabaseAdmin, emailService, smsService }) => {
    if (!supabaseAdmin) throw new Error('Supabase admin client required');
    if (!emailService) throw new Error('Email service required');

    // --- HELPER: Merge Tokens (e.g. {{first_name}}) ---
    const mergeTokens = (text, lead, agent) => {
        if (!text) return '';
        let result = text;

        // Lead Tokens
        const leadName = lead.name || '';
        const firstName = lead.first_name || leadName.split(' ')[0] || '';

        result = result.replace(/{{\s*lead\.first_name\s*}}/gi, firstName);
        result = result.replace(/{{\s*first_name\s*}}/gi, firstName); // alias
        result = result.replace(/{{\s*lead\.name\s*}}/gi, leadName);

        // Agent Tokens
        result = result.replace(/{{\s*agent\.first_name\s*}}/gi, agent.first_name || '');
        result = result.replace(/{{\s*agent\.name\s*}}/gi, `${agent.first_name || ''} ${agent.last_name || ''}`.trim());

        return result;
    };

    // --- ACTION: Execute a single step ---
    const executeStep = async (step, lead, agent) => {
        console.log(`[FunnelExecutor] Running Step: ${step.type} for Lead ${lead.name || lead.email}`);

        const context = {
            action: step.type,
            status: 'success',
            details: {}
        };

        try {
            if (step.type === 'email') {
                const subject = mergeTokens(step.subject, lead, agent);
                const content = mergeTokens(step.content || step.body, lead, agent); // handle content/body naming

                // Check if template_key is used (TODO: Implement template fetching if needed, for now assuming inline)
                // If functionality requires fetching template from DB, add here.

                const result = await emailService.sendEmail({
                    to: lead.email,
                    subject: subject,
                    html: content.replace(/\n/g, '<br>'), // Simple specific formatting
                    tags: { funnel_step: step.step_key }
                });
                context.details = result;
                if (!result.sent && !result.queued) throw new Error('Email failed to send');

            } else if (step.type === 'sms' || step.type === 'Text') {
                // Check if SMS enabled
                if (process.env.VITE_ENABLE_SMS === 'false') {
                    context.status = 'skipped';
                    context.details = { reason: 'SMS Disabled via Feature Flag' };
                    return context;
                }

                const message = mergeTokens(step.content || step.body, lead, agent);
                await smsService.sendSms(lead.phone, message, step.mediaUrl);

            } else if (step.type === 'task') {
                // TODO: Create task in CRM
                context.details = { note: 'Task creation not yet implemented' };
            } else if (step.type === 'wait') {
                // Wait steps shouldn't strictly be "executed" per se, but if they are treated as an action:
                // Do nothing.
            } else {
                console.warn('Unknown step type:', step.type);
            }
        } catch (err) {
            console.error(`[FunnelExecutor] Step Failed:`, err);
            context.status = 'failed';
            context.details = { error: err.message };
        }

        return context;
    };

    // --- CORE: Process Batch ---
    const processBatch = async () => {
        // 1. Find Due Enrollments
        const { data: enrollments, error } = await supabaseAdmin
            .from('funnel_enrollments')
            .select(`
            id, lead_id, agent_id, funnel_id, current_step_index,
            leads ( id, name, email, phone ),
            agents ( id, first_name, last_name, email ),
            funnels ( id, steps )
        `)
            .eq('status', 'active')
            .lte('next_run_at', new Date().toISOString())
            .limit(50);

        if (error) {
            console.error('[FunnelExecutor] Failed to fetch enrollments:', error);
            return;
        }

        if (!enrollments || enrollments.length === 0) return;

        console.log(`[FunnelExecutor] Processing ${enrollments.length} due enrollments...`);

        // 2. Loop & Execute
        for (const enrollment of enrollments) {
            const { leads: lead, agents: agent, funnels: funnelDef } = enrollment;

            if (!funnelDef || !funnelDef.steps) {
                console.warn(`[FunnelExecutor] Missing funnel def for enrollment ${enrollment.id}`);
                // Mark failed?
                await supabaseAdmin.from('funnel_enrollments').update({ status: 'failed' }).eq('id', enrollment.id);
                continue;
            }

            const steps = funnelDef.steps; // Assume JSON Array
            const currentIndex = enrollment.current_step_index;
            const currentStep = steps[currentIndex];

            if (!currentStep) {
                console.warn(`[FunnelExecutor] Index ${currentIndex} out of bounds. Completing.`);
                await supabaseAdmin.from('funnel_enrollments').update({ status: 'completed' }).eq('id', enrollment.id);
                continue;
            }

            // Execute Action
            const result = await executeStep(currentStep, lead, agent);

            // Log it
            await supabaseAdmin.from('funnel_logs').insert({
                enrollment_id: enrollment.id,
                agent_id: agent.id,
                step_index: currentIndex,
                action_type: currentStep.type,
                status: result.status,
                result_details: result.details
            });

            // Determine Next State
            const nextIndex = currentIndex + 1;

            if (nextIndex < steps.length) {
                const nextStep = steps[nextIndex];
                const delay = nextStep.delay_minutes || 0;
                const nextRun = addMinutes(new Date(), delay);

                await supabaseAdmin.from('funnel_enrollments').update({
                    current_step_index: nextIndex,
                    next_run_at: nextRun.toISOString(),
                    updated_at: new Date().toISOString()
                }).eq('id', enrollment.id);

                console.log(`[FunnelExecutor] Advanced ${lead.first_name} to Step ${nextIndex}. Next run: ${nextRun}`);
            } else {
                // Completed
                await supabaseAdmin.from('funnel_enrollments').update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                }).eq('id', enrollment.id);
                console.log(`[FunnelExecutor] Completed funnel for ${lead.first_name}`);
            }
        }
    };

    // --- API: Enroll Lead ---
    const enrollLead = async (agentId, leadId, funnelId) => {
        // 1. Fetch Funnel to get Step 0 delay
        const { data: funnel } = await supabaseAdmin.from('funnels').select('steps').eq('id', funnelId).single();
        if (!funnel) throw new Error('Funnel not found');

        const firstStep = funnel.steps[0];
        const delay = firstStep ? (firstStep.delay_minutes || 0) : 0;
        const nextRun = addMinutes(new Date(), delay);

        const { data, error } = await supabaseAdmin.from('funnel_enrollments').insert({
            agent_id: agentId,
            lead_id: leadId,
            funnel_id: funnelId,
            current_step_index: 0,
            status: 'active',
            next_run_at: nextRun.toISOString()
        }).select().single();

        if (error) throw error;
        return data;
    };

    return {
        processBatch,
        enrollLead
    };
};
