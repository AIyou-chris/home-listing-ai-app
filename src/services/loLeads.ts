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
