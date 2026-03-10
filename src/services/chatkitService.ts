import { buildApiUrl } from '../lib/api';
import { supabase } from './supabase';

interface ChatkitSessionApiResponse {
  client_secret?: string;
  error?: string;
}

export async function createChatkitSession(
  workflowId: string,
  version = 'production'
): Promise<{ client_secret: string }> {
  const normalizedWorkflowId = String(workflowId || '').trim();
  if (!normalizedWorkflowId) {
    throw new Error('workflow_id_required');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token || null;
  const userId = sessionData.session?.user?.id || null;

  const response = await fetch(buildApiUrl('/api/chatkit/session'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({
      workflow_id: normalizedWorkflowId,
      version: String(version || 'production').trim() || 'production'
    })
  });

  const payload = (await response.json().catch(() => ({}))) as ChatkitSessionApiResponse;

  if (response.status === 401) {
    throw new Error('unauthorized');
  }

  if (!response.ok) {
    const code = String(payload.error || '');
    if (code === 'chatkit_session_failed') throw new Error('chatkit_session_failed');
    throw new Error(code || `Request failed (${response.status})`);
  }

  const clientSecret = String(payload.client_secret || '').trim();
  if (!clientSecret) {
    throw new Error('chatkit_session_failed');
  }

  return { client_secret: clientSecret };
}
