import { AuthService } from './authService';
import type { Lead, LeadStatus } from '../types';

const auth = AuthService.getInstance();

export type LeadNote = {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
  createdBy?: string;
};

export type CreateLeadPayload = {
  name: string;
  email: string;
  phone?: string;
  status?: LeadStatus;
  source?: string;
  notes?: string;
  funnelId?: string;
  funnelType?: string;
};

export type UpdateLeadPayload = Partial<Omit<CreateLeadPayload, 'status'>> & { id: string; status?: LeadStatus };

const ensureOk = async (response: Response, context: string) => {
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`${context} failed (${response.status}): ${message}`);
  }
};

export const adminLeadsService = {
  async list(params?: { page?: number; status?: string; agentId?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.status) query.set('status', params.status);
    if (params?.agentId) query.set('agentId', params.agentId);
    const path = query.toString() ? `/api/admin/leads?${query.toString()}` : '/api/admin/leads';
    const response = await auth.makeAuthenticatedRequest(path);
    await ensureOk(response, 'List leads');
    const data = await response.json();
    return Array.isArray(data?.leads) ? (data.leads as Lead[]) : [];
  },

  async create(payload: CreateLeadPayload) {
    const response = await auth.makeAuthenticatedRequest('/api/admin/leads', {
      method: 'POST',
      body: JSON.stringify({
        funnelId: payload.funnelId ?? 'universal_sales',
        funnelType: payload.funnelType ?? 'universal_sales',
        ...payload
      })
    });
    await ensureOk(response, 'Create lead');
    const data = await response.json();
    return (data?.lead ?? data) as Lead;
  },

  async update(payload: UpdateLeadPayload) {
    const response = await auth.makeAuthenticatedRequest(`/api/admin/leads/${payload.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    await ensureOk(response, 'Update lead');
    const data = await response.json().catch(() => null);
    return (data?.lead ?? data) as Lead | null;
  },

  async remove(leadId: string) {
    const response = await auth.makeAuthenticatedRequest(`/api/admin/leads/${leadId}`, {
      method: 'DELETE'
    });
    await ensureOk(response, 'Delete lead');
    return true;
  },

  async listNotes(leadId: string) {
    const response = await auth.makeAuthenticatedRequest(`/api/admin/leads/${leadId}/notes`);
    await ensureOk(response, 'List lead notes');
    const data = await response.json();
    return Array.isArray(data?.notes) ? (data.notes as LeadNote[]) : [];
  },

  async addNote(leadId: string, content: string) {
    const response = await auth.makeAuthenticatedRequest(`/api/admin/leads/${leadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    await ensureOk(response, 'Add lead note');
    const data = await response.json();
    return (data?.note ?? data) as LeadNote;
  }
};

export type { Lead };
