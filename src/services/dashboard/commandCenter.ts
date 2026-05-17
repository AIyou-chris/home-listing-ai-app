import { buildApiUrl } from '../../lib/api';
import { isDemoModeActive } from '../../demo/useDemoMode';
import { getDemoCommandCenterSnapshot } from '../../demo/demoData';
import { resolveAgentId, defaultJsonHeaders, withAgentQuery, parseResponse } from './utils';
import type { LeadIntentLevel } from './leads';

export interface CommandCenterLeadQueueItem {
  lead_id: string;
  listing_id: string | null;
  listing_address: string | null;
  full_name: string;
  intent_level: LeadIntentLevel;
  status: string;
  timeline: string;
  financing: string;
  source_type: string;
  last_activity_at: string | null;
  lead_summary_preview: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  last_agent_action_at: string | null;
}

export interface CommandCenterAppointmentQueueItem {
  appointment_id: string;
  lead_id: string | null;
  listing_id: string | null;
  listing_address: string | null;
  starts_at: string | null;
  status: string;
  lead_name: string;
  lead_phone: string | null;
  lead_email: string | null;
  last_reminder_outcome: string | null;
}

export interface DashboardCommandCenterSnapshot {
  stats: {
    new_leads_today: number;
    unworked_leads: number;
    appointments_today: number;
    confirmations_7d: number;
  };
  queues: {
    new_leads_to_work: CommandCenterLeadQueueItem[];
    appointments_coming_up: CommandCenterAppointmentQueueItem[];
    needs_attention: CommandCenterAppointmentQueueItem[];
  };
}

export interface AutomationRecipe {
  id?: string;
  key: string;
  name: string;
  trigger: string;
  enabled: boolean;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
}

export const fetchCommandCenterSnapshot = async (agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      ...getDemoCommandCenterSnapshot()
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery('/api/dashboard/command-center', agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<{ success: boolean } & DashboardCommandCenterSnapshot>(response);
};

export const fetchAutomationRecipes = async (agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery('/api/dashboard/automation-recipes', agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<{ success: boolean; recipes: AutomationRecipe[] }>(response);
};

export const updateAutomationRecipe = async (recipeKey: string, enabled: boolean, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/automation-recipes/${encodeURIComponent(recipeKey)}`, agentId)), {
    method: 'PATCH',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify({ enabled, agentId })
  });
  return parseResponse<{ success: boolean; recipe: AutomationRecipe }>(response);
};
