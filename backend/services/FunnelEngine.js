const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ FunnelEngine: Missing Supabase credentials');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const leadScoringService = require('./LeadScoringService');
const emailService = require('./emailService')(supabaseAdmin); // Initialize with supabaseAdmin

class FunnelEngine {

    /**
     * Assigns a lead to a specific funnel type (Realtor/Broker).
     * @param {string} leadId - UUID of the lead
     * @param {string} type - 'realtor' or 'broker'
     */
    async assignFunnel(leadId, type) {
        console.log(`🌀 [Funnel] Assigning lead ${leadId} to ${type} funnel`);

        try {
            // 0. Fetch Lead to get Agent ID
            const { data: lead } = await supabaseAdmin.from('leads').select('user_id').eq('id', leadId).single();
            if (!lead) throw new Error(`Lead ${leadId} not found`);

            // 1. Get Funnel ID (Prioritize Agent's Funnel, then Global/Admin?)
            // Actually, if we have duplicate keys, we MUST filter.
            // We search for funnels owned by this agent OR global/default ones.
            // For now, let's prioritize the specific agent's funnel if it exists.

            let query = supabaseAdmin
                .from('funnels')
                .select('id')
                .or(`type.eq.${type},funnel_key.eq.${type}`);

            if (lead.user_id) {
                // If it's a specific agent, try to find THEIR funnel first
                // But since .or() is already used, adding .eq('agent_id') might restrict too much if we want fallback.
                // Instead, let's fetch ALL matches and pick the best one in code.
                // This is safer than complex RPC or dynamic query for now.
            }

            const { data: funnels, error: funnelError } = await query;

            if (funnelError || !funnels || funnels.length === 0) throw new Error(`Funnel type '${type}' not found.`);

            // Filter in memory: Find exact match for agent, else fallback?
            // Since we don't have agent_id in the select, let's add it.
            // Wait, I need to change the select to include agent_id.

            // Let's rewrite the query to be simpler and safer:
            const { data: allFunnels } = await supabaseAdmin
                .from('funnels')
                .select('id, agent_id, is_default')
                .or(`type.eq.${type},funnel_key.eq.${type}`);

            let funnel = null;
            if (allFunnels && allFunnels.length > 0) {
                // 1. Exact Agent Match
                funnel = allFunnels.find(f => f.agent_id === lead.user_id);
                // 2. If not, Global/Default (agent_id is null OR is_default is true?)
                if (!funnel) funnel = allFunnels.find(f => f.is_default); // or fallback to anyone? No, unsafe.
                if (!funnel) funnel = allFunnels[0]; // Desperation fallback (old behavior)
            }

            if (!funnel) throw new Error(`Funnel type '${type}' not found for agent.`);

            // 2. Check existing progress
            const { data: existing } = await supabaseAdmin
                .from('lead_funnel_progress')
                .select('id')
                .eq('lead_id', leadId)
                .eq('funnel_id', funnel.id)
                .single();

            if (existing) {
                console.log(`⚠️ Lead ${leadId} already in funnel ${type}, skipping assignment.`);
                return existing;
            }

            // 3. Create Progress Entry
            const { data: progress, error: progressError } = await supabaseAdmin
                .from('lead_funnel_progress')
                .insert({
                    lead_id: leadId,
                    funnel_id: funnel.id,
                    current_step_index: 1,
                    status: 'active',
                    entered_at: new Date().toISOString()
                })
                .select()
                .single();

            if (progressError) throw progressError;

            // 4. Trigger First Step
            await this.executeStep(progress.id, funnel.id, 1);

            return progress;

        } catch (err) {
            console.error('❌ [Funnel] Assignment failed:', err);
            throw err;
        }
    }

    /**
     * Executes the logic for a specific step (Email/SMS/Task).
     * @param {string} progressId - ID from lead_funnel_progress
     * @param {string} funnelId - ID from funnels
     * @param {number} stepIndex - Step number to execute
     */
    async executeStep(progressId, funnelId, stepIndex) {
        console.log(`⚡ [Funnel] Executing step ${stepIndex} for progress ${progressId}`);

        try {
            // 1. Fetch Step Details
            const { data: step, error: stepError } = await supabaseAdmin
                .from('funnel_steps')
                .select('*')
                .eq('funnel_id', funnelId)
                .eq('step_index', stepIndex)
                .single();

            if (stepError || !step) {
                console.log(`🏁 [Funnel] No step ${stepIndex} found. Funnel complete?`);
                return this.completeFunnel(progressId);
            }

            // 1b. Fetch Progress Details to get lead_id
            const { data: progress } = await supabaseAdmin
                .from('lead_funnel_progress')
                .select('lead_id')
                .eq('id', progressId)
                .single();

            if (!progress) {
                console.error(`❌ [Funnel] Progress record not found: ${progressId}`);
                return;
            }

            // 2. Increment Sent Metric
            await this.incrementMetric(step.id, 'sent_count');

            // 3. Perform Action
            if (step.action_type === 'email') {
                // Fetch Lead Email
                const { data: lead } = await supabaseAdmin.from('leads').select('email, name').eq('id', progress.lead_id).single();
                if (lead) {
                    // Format content with strict styling requests: 12px text, 14-16px headers, single spacing
                    const processContent = (text) => {
                        if (!text) return '';
                        return `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.2; color: #334155; }
                                h1 { font-size: 16px; margin: 10px 0 5px 0; font-weight: bold; }
                                h2 { font-size: 14px; margin: 10px 0 5px 0; font-weight: bold; }
                                p { margin: 0 0 10px 0; }
                                a { color: #4f46e5; text-decoration: none; }
                                .content { width: 100%; max-width: 600px; padding-left: 5px; padding-top: 0; margin-top: 0; }
                            </style>
                        </head>
                        <body>
                            <div class="content" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.2; color: #334155;">
                                ${text.replace(/\n/g, '<br>')}
                            </div>
                        </body>
                        </html>`;
                    };

                    await emailService.sendEmail({
                        to: lead.email,
                        subject: step.subject || 'Follow Up',
                        html: processContent(step.content) || '...',
                        tags: {
                            lead_id: progress.lead_id,
                            funnel_step_id: step.id,
                        }
                    });
                    console.log(`📧 [Action] Sent email to ${lead.email}`);
                }
            } else {
                console.log(`ℹ️ [Action] Simulated ${step.action_type}: ${step.step_name}`);
            }

            // 4. Log Last Step Time
            await supabaseAdmin
                .from('lead_funnel_progress')
                .update({ last_step_at: new Date().toISOString() })
                .eq('id', progressId);

        } catch (err) {
            console.error(`❌ [Funnel] Step execution failed:`, err);
        }
    }

    /**
     * Marks a funnel as completed for a lead.
     */
    async completeFunnel(progressId) {
        console.log(`✅ [Funnel] Marking funnel as completed for ${progressId}`);
        await supabaseAdmin
            .from('lead_funnel_progress')
            .update({ status: 'completed' })
            .eq('id', progressId);
    }

    /**
     * Advances the funnel to the next step.
     * @param {string} leadId 
     * @param {string} funnelId 
     */
    async advanceStep(leadId, funnelId) {
        // Fetch current progress
        const { data: progress } = await supabaseAdmin
            .from('lead_funnel_progress')
            .select('*')
            .eq('lead_id', leadId)
            .eq('funnel_id', funnelId)
            .single();

        if (!progress || progress.status !== 'active') return;

        const nextIndex = progress.current_step_index + 1;

        // Update Index
        await supabaseAdmin
            .from('lead_funnel_progress')
            .update({ current_step_index: nextIndex })
            .eq('id', progress.id);

        // Execute Next
        await this.executeStep(progress.id, funnelId, nextIndex);
    }

    /**
     * Handles events (open, click) to update metrics and lead score.
     * @param {string} leadId 
     * @param {string} eventType - 'open', 'click', 'unsubscribe', 'bounce'
     * @param {string} funnelStepId - Optional, if known
     */
    async processEvent(leadId, eventType, funnelStepId = null) {
        console.log(`Unknown [Event] ${eventType} for lead ${leadId}`);

        // 1. Update Lead Score
        // Mapping generic events to scoring service
        let scoringTrigger = '';
        if (eventType === 'open') scoringTrigger = 'EMAIL_OPEN';
        if (eventType === 'click') scoringTrigger = 'EMAIL_CLICK';
        if (eventType === 'unsubscribe') scoringTrigger = 'UNSUBSCRIBE';
        if (eventType === 'bounce') scoringTrigger = 'BOUNCE'; // Might need adding to scoring rules if not present

        if (scoringTrigger) {
            await leadScoringService.recalculateLeadScore(leadId, scoringTrigger);
        }

        // 2. Update Funnel Metrics (if step known)
        if (funnelStepId) {
            let metricColumn = '';
            if (eventType === 'open') metricColumn = 'opens';
            if (eventType === 'click') metricColumn = 'clicks';
            if (eventType === 'unsubscribe') metricColumn = 'unsubscribes';
            if (eventType === 'bounce') metricColumn = 'bounces';

            if (metricColumn) {
                await this.incrementMetric(funnelStepId, metricColumn);
            }
        }

        // 3. Handle Exits
        if (eventType === 'unsubscribe' || eventType === 'bounce') {
            await this.exitFunnel(leadId);
        }
    }

    /**
     * Exits all active funnels for a lead.
     */
    async exitFunnel(leadId) {
        console.log(`🚫 [Funnel] Exiting lead ${leadId} from all funnels`);
        await supabaseAdmin
            .from('lead_funnel_progress')
            .update({ status: 'exited' })
            .eq('lead_id', leadId)
            .eq('status', 'active');
    }

    /**
     * Safely increments a metric counter.
     */
    async incrementMetric(stepId, column) {
        // Upsert logic to ensure row exists
        const { error } = await supabaseAdmin.rpc('increment_funnel_metric', {
            step_uuid: stepId,
            metric_col: column
        });

        // Fallback if RPC doesn't exist (using standard upsert)
        if (error) {
            const { data: existing } = await supabaseAdmin
                .from('funnel_step_metrics')
                .select('*')
                .eq('funnel_step_id', stepId)
                .single();

            if (!existing) {
                await supabaseAdmin.from('funnel_step_metrics').insert({
                    funnel_step_id: stepId,
                    [column]: 1
                });
            } else {
                await supabaseAdmin
                    .from('funnel_step_metrics')
                    .update({ [column]: existing[column] + 1 })
                    .eq('id', existing.id);
            }
        }
    }
}

module.exports = new FunnelEngine();
