const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ LeadScoringService: Missing Supabase credentials');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Scoring Configuration
const SCORING_RULES = {
    // Engagement
    EMAIL_OPEN: { points: 5, cap: 20, name: 'Email Open' },
    EMAIL_CLICK: { points: 10, cap: 30, name: 'Email Click' },
    PAGE_VIEW: { points: 2, cap: 20, name: 'Page View' },
    CHAT_REPLY: { points: 15, cap: 45, name: 'Chat Reply' },
    BOOKING: { points: 50, cap: 50, name: 'Meeting Booked' },

    // Demographics / Static (base points)
    PHONE_PROVIDED: { points: 15, name: 'Phone Provided' },
    EMAIL_PROVIDED: { points: 10, name: 'Email Provided' },

    // Negative
    UNSUBSCRIBE: { points: -25, name: 'Unsubscribed' },
    INACTIVITY_14D: { points: -10, name: 'Inactive (14d)' }
};

const TIER_THRESHOLDS = {
    SALES_READY: 120,
    HOT: 80,
    WARM: 40,
    COLD: 0
};

class LeadScoringService {

    /**
     * Main entry point to update a lead's score based on a new event.
     * @param {string} leadId - UUID of the lead
     * @param {string} triggerEvent - Event name (e.g., 'email_open')
     * @param {object} metadata - Optional context (e.g., { url: '/pricing' })
     */
    async recalculateLeadScore(leadId, triggerEvent, metadata = {}) {
        console.log(`🧠 [Scoring] Recalculating for lead ${leadId} (Trigger: ${triggerEvent})`);

        try {
            // 1. Fetch Lead & History
            const { data: lead, error: leadError } = await supabaseAdmin
                .from('leads')
                .select('*')
                .eq('id', leadId)
                .single();

            if (leadError || !lead) throw new Error(`Lead not found: ${leadError?.message}`);

            // 2. Fetch Score History to calculate caps
            // We need history to enforce "Max 20 points from opens"
            const { data: history, error: historyError } = await supabaseAdmin
                .from('lead_score_history')
                .select('event_trigger, new_score, previous_score')
                .eq('lead_id', leadId);

            if (historyError) console.warn('⚠️ Could not fetch score history, caps may be inaccurate.');

            // 3. Calculate New Score
            const calculation = this.calculateScore(lead, history || [], triggerEvent);

            // 4. Update Lead if score changed
            if (calculation.totalScore !== lead.score || calculation.tier !== lead.score_tier) {
                await this.updateLead(lead, calculation, triggerEvent);
            } else {
                console.log(`Start/End score matched (${lead.score}), skipping update.`);
            }

            return calculation;

        } catch (err) {
            console.error('❌ [Scoring] Failed to recalculate:', err);
            throw err;
        }
    }

    /**
     * Pure logic to determine score based on rules and history.
     */
    calculateScore(lead, history, currentTrigger) {
        let totalScore = 0;
        const breakdown = [];

        // --- Helper to add points ---
        const addPoints = (ruleKey, count = 1) => {
            const rule = SCORING_RULES[ruleKey];
            if (!rule) return;

            // Calculate capped points from history
            const pastEvents = history.filter(h => h.event_trigger === ruleKey);
            const pointsFromPast = pastEvents.length * rule.points;

            // If we already hit cap, ignore
            if (rule.cap && pointsFromPast >= rule.cap) return;

            // Add points (respecting remaining cap)
            const potentialPoints = rule.points;
            const spaceRemaining = rule.cap ? rule.cap - pointsFromPast : 9999;
            const actualPoints = Math.min(potentialPoints, spaceRemaining);

            if (actualPoints > 0) {
                totalScore += actualPoints;
                breakdown.push({ rule: rule.name, points: actualPoints, count: 1 }); // Simplification for breakdown visualization
            }
        };

        // --- Apply Static Rules ---
        if (lead.phone && lead.phone.length > 6) addPoints('PHONE_PROVIDED');
        if (lead.email && lead.email.includes('@')) addPoints('EMAIL_PROVIDED');

        // --- Apply Event Logic (Behavioral) ---
        // Note: In a real "event sourcing" model we'd replay all events. 
        // Here we are incrementally updating, but for V2 we want to ensure robustness.
        // Ideally, we sum up "base" + "history events" + "current event".

        // 1. Re-tally history points
        // We treat the 'score' as the source of truth, but we really should rebuild it from history if possible.
        // For V2 transition, we will take current score, assume it's valid, and add the *incremental* event.
        // waiting... actually, user asked for "Recalculate score on every event". 
        // To do that purely, we need a "lead_events" table. 
        // We only have `lead_score_history` which logs *changes*.

        // HYBRID APPROACH: 
        // 1. Start with 0.
        // 2. Add static points.
        // 3. Replay history triggers to build up behavioral score.
        // 4. Add CURRENT trigger event.

        // A. Static
        let staticScore = 0;
        if (lead.phone && lead.phone.length > 5) staticScore += SCORING_RULES.PHONE_PROVIDED.points;
        if (lead.email && lead.email.includes('@')) staticScore += SCORING_RULES.EMAIL_PROVIDED.points;

        // B. Replay History
        let behaviorScore = 0;
        const ruleCounts = {};

        // Combine past history + current trigger
        const allEvents = [...history.map(h => h.event_trigger), currentTrigger].filter(Boolean);

        allEvents.forEach(evt => {
            // Find matching rule key (e.g. 'email_open' maps to EMAIL_OPEN)
            const ruleKey = Object.keys(SCORING_RULES).find(k => k.toLowerCase() === evt.toLowerCase() || SCORING_RULES[k].name === evt);
            if (!ruleKey) return;

            const rule = SCORING_RULES[ruleKey];

            // Initialize count
            if (!ruleCounts[ruleKey]) ruleCounts[ruleKey] = 0;

            // Check Cap
            const currentPointsFromRule = ruleCounts[ruleKey] * rule.points;
            if (rule.cap && currentPointsFromRule >= rule.cap) return;

            // Add
            behaviorScore += rule.points;
            ruleCounts[ruleKey]++;
        });

        totalScore = staticScore + behaviorScore;

        // Decay Logic (Simple check of last_behavior_at)
        if (lead.last_behavior_at) {
            const daysInactive = (new Date() - new Date(lead.last_behavior_at)) / (1000 * 60 * 60 * 24);
            if (daysInactive > 14) totalScore += SCORING_RULES.INACTIVITY_14D.points;
        }

        // Determine Tier
        let tier = 'Cold';
        if (totalScore >= TIER_THRESHOLDS.SALES_READY || currentTrigger === 'booking') tier = 'Sales Ready'; // Auto-promote on booking
        else if (totalScore >= TIER_THRESHOLDS.HOT) tier = 'Hot';
        else if (totalScore >= TIER_THRESHOLDS.WARM) tier = 'Warm';

        // Generate Breakdown JSON
        const breakdownData = [
            { rule: 'Demographics', points: staticScore },
            ...Object.keys(ruleCounts).map(k => ({
                rule: SCORING_RULES[k].name,
                count: ruleCounts[k],
                points: Math.min(ruleCounts[k] * SCORING_RULES[k].points, SCORING_RULES[k].cap || 9999)
            }))
        ].filter(b => b.points !== 0);

        return { totalScore, tier, breakdown: breakdownData };
    }

    async updateLead(lead, calculation, triggerEvent) {
        const NOW = new Date().toISOString();

        // 1. Update Lead Table
        const { error: updateError } = await supabaseAdmin
            .from('leads')
            .update({
                score: calculation.totalScore,
                score_tier: calculation.tier,
                score_breakdown: calculation.breakdown,
                last_behavior_at: NOW, // Always update activity
                updated_at: NOW
            })
            .eq('id', lead.id);

        if (updateError) throw updateError;

        // 2. Log History
        await supabaseAdmin
            .from('lead_score_history')
            .insert({
                lead_id: lead.id,
                previous_score: lead.score || 0,
                new_score: calculation.totalScore,
                event_trigger: triggerEvent, // e.g., 'EMAIL_OPEN'
                scoring_version: 'v2.0'
            });

        console.log(`✅ [Scoring] Updated Lead ${lead.id}: ${lead.score} -> ${calculation.totalScore} (${calculation.tier})`);
    }
}

module.exports = new LeadScoringService();
