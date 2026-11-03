import { buildApiUrl, authHeaders } from './dashboard/utils';

// Small LO lead actions shared by Today and the Leads page.

// The LO tapped Call or Text: stop the "waiting" timer and move a New lead to Contacted.
// Fire-and-forget by design; a failed ping must never get in the way of the call itself.
export const markLoLeadContacted = async (leadId: string): Promise<boolean> => {
  try {
    const res = await fetch(buildApiUrl(`/api/lo/leads/${leadId}/contacted`), {
      method: 'POST',
      headers: await authHeaders(null)
    });
    return res.ok;
  } catch {
    return false;
  }
};

// Removes the onboarding TEST lead. The server refuses to delete anything else.
export const deleteLoTestLead = async (leadId: string): Promise<boolean> => {
  try {
    const res = await fetch(buildApiUrl(`/api/lo/leads/${leadId}`), {
      method: 'DELETE',
      headers: await authHeaders(null)
    });
    return res.ok;
  } catch {
    return false;
  }
};

// "Check back with this person in N days" (null clears it). Only puts the lead back on Today when due;
// nothing is sent to the buyer.
export const setLoLeadFollowUp = async (leadId: string, days: number | null): Promise<string | null | false> => {
  try {
    const res = await fetch(buildApiUrl(`/api/lo/leads/${leadId}/follow-up`), {
      method: 'POST',
      headers: await authHeaders(null),
      body: JSON.stringify({ days })
    });
    if (!res.ok) return false;
    const d = await res.json().catch(() => ({})) as { follow_up_at?: string | null };
    return d.follow_up_at ?? null;
  } catch {
    return false;
  }
};
