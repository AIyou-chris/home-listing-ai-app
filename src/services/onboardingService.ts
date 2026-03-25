import { buildApiUrl } from '../lib/api';
import { getDemoOnboardingState } from '../demo/demoData';
import { isDemoModeActive } from '../demo/useDemoMode';
import { waitForAuthenticatedUserId } from './authSession';
import { emitDashboardInvalidation } from './dashboardInvalidation';

export interface OnboardingChecklistState {
  brand_profile: boolean;
  first_listing_created: boolean;
  first_listing_published: boolean;
  share_kit_copied: boolean;
  test_lead_sent: boolean;
  first_appointment_created: boolean;
  first_listing_id: string | null;
  last_test_lead_id: string | null;
}

export interface OnboardingBrandProfileState {
  full_name: string;
  phone: string | null;
  email: string | null;
  brokerage: string | null;
  headshot_url: string | null;
}

export interface OnboardingState {
  success: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
  onboarding_checklist: OnboardingChecklistState;
  first_listing_id: string | null;
  last_test_lead_id: string | null;
  brand_profile: OnboardingBrandProfileState;
  plan_id: string;
  is_pro: boolean;
  progress: {
    completed_items: number;
    total_items: number;
  };
}

type OnboardingPatchPayload = {
  onboarding_step?: number;
  onboarding_completed?: boolean;
  onboarding_checklist?: Partial<OnboardingChecklistState>;
  brand_profile?: Partial<OnboardingBrandProfileState>;
};

const defaultHeaders = (agentId: string | null): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(agentId ? { 'x-user-id': agentId } : {})
});

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
};

const resolveAgentId = async () => {
  if (isDemoModeActive()) return 'demo-agent-busy';
  return waitForAuthenticatedUserId();
};

export const fetchOnboardingState = async (agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return getDemoOnboardingState();
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl('/api/dashboard/onboarding'), {
    headers: defaultHeaders(agentId)
  });
  return parseResponse<OnboardingState>(response);
};

export const patchOnboardingState = async (
  payload: OnboardingPatchPayload,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return getDemoOnboardingState();
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl('/api/dashboard/onboarding'), {
    method: 'PATCH',
    headers: defaultHeaders(agentId),
    body: JSON.stringify({
      ...payload,
      agentId
    })
  });
  const nextState = await parseResponse<OnboardingState>(response);
  emitDashboardInvalidation({ reason: 'onboarding_updated' });
  return nextState;
};

export const resendWelcomeEmail = async (agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return { success: true, sent: true, email: 'demo@example.com' };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl('/api/dashboard/onboarding/resend-welcome-email'), {
    method: 'POST',
    headers: defaultHeaders(agentId),
    body: JSON.stringify({ agentId })
  });
  return parseResponse<{ success: boolean; sent: boolean; email: string }>(response);
};
