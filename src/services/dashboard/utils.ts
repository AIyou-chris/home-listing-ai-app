import { buildApiUrl } from '../../lib/api';
import { isDemoModeActive } from '../../demo/useDemoMode';
import { BillingLimitError } from '../dashboardBillingService';
import { waitForAuthenticatedUserId } from '../authSession';

export { buildApiUrl, isDemoModeActive };

export const defaultJsonHeaders = (agentId: string | null): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(agentId ? { 'x-user-id': agentId } : {})
});

export const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (String(payload.error || '') === 'limit_reached') {
      const upgradePlanCandidate = String(payload.upgrade_plan_id || '').toLowerCase();
      const upgradePlanId =
        upgradePlanCandidate === 'starter' || upgradePlanCandidate === 'pro'
          ? (upgradePlanCandidate as 'starter' | 'pro')
          : null;
      throw new BillingLimitError('limit_reached', {
        feature: String(payload.feature || 'unknown'),
        modal: (payload.modal as { title: string; body: string; primary: string; secondary: string }) || {
          title: "You're at your limit.",
          body: 'Upgrade to keep capturing leads and sending reports without interruptions.',
          primary: 'Upgrade now',
          secondary: 'Not now'
        },
        planId: String(payload.plan_id || 'free'),
        upgradePlanId,
        reasonLine: String(payload.reason_line || ''),
        used: Number(payload.used || 0),
        limit: Number(payload.limit || 0)
      });
    }
    const textError = typeof payload.error === 'string' ? payload.error : '';
    throw new Error(textError || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
};

export const parseVideoResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const code = typeof payload.error === 'string' && payload.error.trim()
      ? payload.error.trim()
      : `http_${response.status}`;
    const error = new Error(code) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
};

export const resolveAgentId = async (): Promise<string | null> => {
  if (isDemoModeActive()) return 'demo-agent-busy';
  return waitForAuthenticatedUserId();
};

export const withAgentQuery = (path: string, agentId: string | null): string => {
  if (!agentId) return path;
  const delimiter = path.includes('?') ? '&' : '?';
  return `${path}${delimiter}agentId=${encodeURIComponent(agentId)}`;
};
