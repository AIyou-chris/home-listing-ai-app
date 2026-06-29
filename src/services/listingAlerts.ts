// src/services/listingAlerts.ts
import { buildApiUrl } from '../lib/api';
import { authHeaders } from './dashboard/utils';

// Public: buyer opts in from the listing page (no auth).
export async function subscribeToListingAlerts(listingId: string, phone: string, visitorId?: string) {
  const res = await fetch(buildApiUrl('/api/public/listing-alerts/subscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listing_id: listingId,
      phone,
      visitor_id: visitorId || null,
      consent_text: 'I agree to receive text alerts about this property. Msg & data rates may apply. Reply STOP to opt out.',
    }),
  });
  if (!res.ok) throw new Error('subscribe_failed');
  return res.json() as Promise<{ ok: boolean }>;
}

export interface PendingAlert {
  id: string;
  listing_id: string;
  type: 'price' | 'manual';
  payload: { address?: string; oldPrice?: number; newPrice?: number; message?: string };
  recipient_count: number;
  created_at: string;
}

export async function getPendingAlerts(agentId: string | null): Promise<PendingAlert[]> {
  const res = await fetch(buildApiUrl('/api/listing-alerts/pending'), { headers: await authHeaders(agentId) });
  if (!res.ok) return [];
  const data = await res.json();
  return data.pending || [];
}

export async function getSubscriberCount(agentId: string | null, listingId: string): Promise<number> {
  const res = await fetch(buildApiUrl(`/api/listing-alerts/subscribers?listing_id=${encodeURIComponent(listingId)}`), {
    headers: await authHeaders(agentId),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count || 0;
}

export async function sendAlert(agentId: string | null, id: string) {
  const res = await fetch(buildApiUrl(`/api/listing-alerts/${encodeURIComponent(id)}/send`), {
    method: 'POST', headers: await authHeaders(agentId),
  });
  if (!res.ok) throw new Error('send_failed');
  return res.json();
}

export async function dismissAlert(agentId: string | null, id: string) {
  const res = await fetch(buildApiUrl(`/api/listing-alerts/${encodeURIComponent(id)}/dismiss`), {
    method: 'POST', headers: await authHeaders(agentId),
  });
  if (!res.ok) throw new Error('dismiss_failed');
  return res.json();
}

export async function sendManualBlast(agentId: string | null, listingId: string, message: string) {
  const headers = { ...(await authHeaders(agentId)), 'Content-Type': 'application/json' };
  const res = await fetch(buildApiUrl('/api/listing-alerts/manual'), {
    method: 'POST', headers, body: JSON.stringify({ listing_id: listingId, message }),
  });
  if (!res.ok) throw new Error('manual_failed');
  return res.json() as Promise<{ ok: boolean; queued: number }>;
}
