
import { supabase } from './supabase';

export interface CampaignActivity {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    timestamp: Date;
    type: 'scan' | 'click' | 'lead';
}

export interface MarketingStats {
    totalQrScans: number;
    linkClicks: number;
    profileViews: number;
    leadsGenerated: number;
    // Trends usually calculated on backend, but we can do basic client-side check if history is available
    scansTrend: number;
    linkTrend: number;
    viewsTrend: number;
    leadsTrend: number;
}

// Default initial stats
const DEFAULT_STATS: MarketingStats = {
    totalQrScans: 0,
    linkClicks: 0,
    profileViews: 0,
    leadsGenerated: 0,
    scansTrend: 0,
    linkTrend: 0,
    viewsTrend: 0,
    leadsTrend: 0
};

export const getMarketingStats = async (agentId: string): Promise<MarketingStats> => {
    // 1. Fetch QR Scans Count
    // Assuming table 'qr_scan_events' exists or similar log
    // For now, we might not have a dedicated events table, so we count potential placeholders or use a simple analytics table
    // If 'analytics_events' table exists, we use that.

    // Fallback: If no real analytics table, we return 0 to be "Live" and honest.
    // Ideally, create a simple table `analytics_events` (id, agent_id, type, created_at, metadata)

    // MOCK-BUT-REAL IMPLEMENTATION (Since no analytics table exists yet)
    // We will check the existing 'leads' count as a proxy for "Leads Generated"

    let leadsCount = 0;
    try {
        const { count, error } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agentId); // Assuming leads have agent_id, or we filter by user ownership
        if (!error && count !== null) leadsCount = count;
    } catch (e) {
        console.warn("Failed to fetch leads count", e);
    }

    return {
        ...DEFAULT_STATS,
        leadsGenerated: leadsCount,
        // Since we don't track clicks/scans in DB yet, these are 0.
        // This effectively removes the "Demo" numbers.
        totalQrScans: 0,
        linkClicks: 0,
        profileViews: 0
    };
};

export const getMarketingActivity = async (agentId: string): Promise<CampaignActivity[]> => {
    // Similarly, fetch simple recent activity. 
    // For now, the most "real" activity is New Leads.

    try {
        const { data: leads, error } = await supabase
            .from('leads')
            .select('id, name, created_at, source')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        return (leads || []).map(lead => ({
            id: lead.id,
            type: 'lead',
            title: 'New Lead Generated',
            subtitle: lead.name,
            description: `Via ${lead.source || 'Direct Link'}`,
            timestamp: new Date(lead.created_at)
        }));
    } catch (e) {
        return [];
    }
};
