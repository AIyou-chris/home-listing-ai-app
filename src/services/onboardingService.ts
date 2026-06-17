import { buildApiUrl } from '../lib/api';
import { getDemoOnboardingState } from '../demo/demoData';
import { isDemoModeActive } from '../demo/useDemoMode';
import { waitForAuthenticatedUserId, waitForAuthenticatedSession } from './authSession';
import { emitDashboardInvalidation } from './dashboardInvalidation';

export interface OnboardingChecklistState {
  brand_profile: boolean;
  first_listing_created: boolean;
  first_listing_published: boolean;
  share_kit_copied: boolean;
  test_lead_sent: boolean;
  first_appointment_created: boolean;
  brain_seeded: boolean;
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
  account_type?: string;
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

const defaultHeaders = async (agentId: string | null): Promise<HeadersInit> => {
  const session = isDemoModeActive() ? { accessToken: null } : await waitForAuthenticatedSession();
  return {
    'Content-Type': 'application/json',
    ...(agentId ? { 'x-user-id': agentId } : {}),
    ...(session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {})
  };
};

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

// Collapse the burst of identical onboarding fetches that fire when the
// dashboard + sidebar (+ guards) all mount at once. A 5s TTL keeps it fresh
// while killing the redundant round-trips; patch clears it immediately.
const ONBOARDING_TTL_MS = 5000;
let onboardingCache: { at: number; key: string; data: OnboardingState } | null = null;
let onboardingInflight: { key: string; promise: Promise<OnboardingState> } | null = null;

export const fetchOnboardingState = async (agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return getDemoOnboardingState();
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const key = String(agentId || 'self');
  const now = Date.now();

  // Serve a very-fresh cached copy.
  if (onboardingCache && onboardingCache.key === key && now - onboardingCache.at < ONBOARDING_TTL_MS) {
    return onboardingCache.data;
  }
  // Share one in-flight request across simultaneous callers.
  if (onboardingInflight && onboardingInflight.key === key) {
    return onboardingInflight.promise;
  }

  const promise = (async () => {
    const response = await fetch(buildApiUrl('/api/dashboard/onboarding'), {
      headers: await defaultHeaders(agentId)
    });
    const data = await parseResponse<OnboardingState>(response);
    onboardingCache = { at: Date.now(), key, data };
    return data;
  })();
  onboardingInflight = { key, promise };
  try {
    return await promise;
  } finally {
    if (onboardingInflight && onboardingInflight.promise === promise) onboardingInflight = null;
  }
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
    headers: await defaultHeaders(agentId),
    body: JSON.stringify({
      ...payload,
      agentId
    })
  });
  const nextState = await parseResponse<OnboardingState>(response);
  onboardingCache = null; // a save just changed state — don't serve stale
  onboardingInflight = null;
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
    headers: await defaultHeaders(agentId),
    body: JSON.stringify({ agentId })
  });
  return parseResponse<{ success: boolean; sent: boolean; email: string }>(response);
};
