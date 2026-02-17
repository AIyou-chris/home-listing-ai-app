const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Robust .env loading (copying from blueprint_leads.js pattern)
const envPaths = [
    path.resolve(__dirname, '../../.env'),       // backend/.env
    path.resolve(__dirname, '../../../.env'),    // root/.env
    path.resolve(process.cwd(), '.env'),         // cwd/.env
    path.resolve(process.cwd(), 'backend/.env')  // cwd/backend/.env
];

let servicesLoaded = false;
for (const p of envPaths) {
    const result = require('dotenv').config({ path: p });
    if (!result.error) {
        servicesLoaded = true;
        break;
    }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Leads Stats API: Missing Supabase credentials');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = async (req, res) => {
    const { userId, all } = req.query;

    try {
        let query = supabaseAdmin.from('leads').select('*, lead_score_history(score)', { count: 'exact' });

        if (!all || all !== 'true') {
            if (!userId) {
                return res.status(400).json({ error: 'Missing userId' });
            }
            query = query.eq('user_id', userId);
        }

        const { data: leads, error, count } = await query;

        if (error) throw error;

        const total = count || 0;

        // Calculate stats
        const stats = {
            total,
            new: 0,
            qualified: 0,
            contacted: 0,
            showing: 0,
            lost: 0,
            conversionRate: 0,
            scoreStats: {
                averageScore: 0,
                qualified: 0,
                hot: 0,
                warm: 0,
                cold: 0,
                highestScore: 0
            },
            leadSources: []
        };

        if (leads && leads.length > 0) {
            let totalScore = 0;
            let maxScore = 0;

            leads.forEach(lead => {
                // Status counts
                const status = lead.status?.toLowerCase() || 'new';
                if (stats[status] !== undefined) { // basic mapping
                    stats[status]++;
                } else if (status === 'won') {
                    stats.conversionRate++; // temporary placeholder logic
                }

                // Score Logic (Mock/Simple)
                // Assuming we have a score field or join. 
                // For now, let's look for a score column directly if it exists, or random 0.
                const score = lead.score || (lead.lead_score_history?.[0]?.score) || 0;
                totalScore += score;
                if (score > maxScore) maxScore = score;

                if (score >= 90) stats.scoreStats.hot++;
                else if (score >= 70) stats.scoreStats.qualified++;
                else if (score >= 40) stats.scoreStats.warm++;
                else stats.scoreStats.cold++;
            });

            stats.scoreStats.averageScore = Math.round(totalScore / leads.length);
            stats.scoreStats.highestScore = maxScore;
        }

        res.json({
            success: true,
            ...stats
        });

    } catch (err) {
        console.error('❌ Leads Stats Error:', err);
        res.status(500).json({ error: err.message });
    }
};
