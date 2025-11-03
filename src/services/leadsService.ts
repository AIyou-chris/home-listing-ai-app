import { Lead } from '../types';

export interface LeadPayload {
  name: string;
  email: string;
  phone?: string;
  status?: string;
  source?: string;
  notes?: string;
  lastMessage?: string;
}

export interface PhoneLogPayload {
  callStartedAt?: string;
  callOutcome?: 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'other';
  callNotes?: string;
}

export const leadsService = {
  async list(status?: string, search?: string) {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);

    const response = await fetch(`/api/admin/leads?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to load leads: ${response.status}`);
    }
    const data: { leads: Lead[]; total: number; stats: Record<string, number> } = await response.json();
    return data;
  },

  async create(payload: LeadPayload) {
    const response = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to create lead');
    }
    return response.json();
  },

  async update(leadId: string, payload: Partial<LeadPayload>) {
    const response = await fetch(`/api/admin/leads/${leadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to update lead');
    }
    return response.json();
  },

  async remove(leadId: string) {
    const response = await fetch(`/api/admin/leads/${leadId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete lead');
    }
    return response.json();
  },

  async stats() {
    const response = await fetch('/api/admin/leads/stats');
    if (!response.ok) {
      throw new Error(`Failed to load lead stats: ${response.status}`);
    }
    return response.json();
  },

  async listPhoneLogs(leadId: string) {
    const response = await fetch(`/api/admin/leads/${leadId}/phone-logs`);
    if (!response.ok) {
      throw new Error(`Failed to load phone logs: ${response.status}`);
    }
    return response.json();
  },

  async createPhoneLog(leadId: string, payload: PhoneLogPayload) {
    const response = await fetch(`/api/admin/leads/${leadId}/phone-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to create phone log');
    }
    return response.json();
  }
};
