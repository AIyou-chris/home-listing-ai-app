import { Property, Lead, Appointment, Interaction, AgentProfile, FollowUpSequence, ActiveLeadFollowUp, AnalyticsData } from './types';
import { SAMPLE_AGENT } from './constants';

export const DEMO_FAT_PROPERTIES: Property[] = [];

export const DEMO_FAT_LEADS: Lead[] = [];

export const DEMO_FAT_APPOINTMENTS: Appointment[] = [];

export const DEMO_FAT_INTERACTIONS: Interaction[] = [];

export const DEMO_SEQUENCES: FollowUpSequence[] = [];

export const DEMO_ACTIVE_FOLLOWUPS: ActiveLeadFollowUp[] = [];

export const DEMO_ANALYTICS_DATA: AnalyticsData = {
  performanceOverview: {
    newLeads: 0,
    conversionRate: 0,
    appointmentsSet: 0,
    avgAiResponseTime: "0s",
    leadFunnel: {
      leadsCaptured: 0,
      aiQualified: 0,
      contactedByAgent: 0,
      appointmentsSet: 0,
    },
  },
  leadSourceAnalysis: [],
};
