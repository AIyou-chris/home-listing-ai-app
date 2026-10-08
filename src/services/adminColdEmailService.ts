import { buildApiUrl } from '../lib/api';
import { authedFetch } from './authedFetch';

export interface ColdOverview {
  tablesReady: boolean;
  blockers: string[];
  config: { domain: string | null; mailboxes: number; enabled: boolean; postalAddress: string; replyWebhook: boolean };
  counts: Record<string, number>;
  batches?: ColdBatch[];
}
export interface SendSwitch { enabled: boolean; setupBlockers: string[]; waiting: number }
export interface ColdBatch { id: string; name: string; angle: string; opener: string; variant_id: string; status: string; paused_reason?: string | null; created_at: string }
export interface ColdProspect { id: string; email: string; first_name: string | null; company: string | null; status: string; city: string | null }
export interface ColdSend {
  id: string; touch: number; subject: string | null; body_text: string | null; check_failures: string[]; status: string;
  scheduled_for: string | null; sent_at: string | null; reply_class: string | null; lo_prospects?: { email: string; first_name: string | null; company: string | null } | null;
}
export interface ColdDraft { subject: string; body_text: string; word_count: number; flags: string[]; ok: boolean; attempts: number }
export interface ColdGroup { sent: number; replies: number; positive: number; bounceRate: number; complaintRate: number; replyRate: number; positivePer100: number; clicked: number }
export interface ColdResults {
  total: ColdGroup & { trialsStarted: number; demosBooked: number };
  byAngle: Record<string, ColdGroup>; byOpener: Record<string, ColdGroup>; byTouch: Record<string, ColdGroup>; byVariant: Record<string, ColdGroup>;
  summary: string;
}
export interface ColdReply { id: string; from_email: string; subject: string | null; body_text: string; class: string; drafted_reply: string | null; created_at: string }
export interface ColdExamples {
  firstTouches: Array<{ angle: string; opener: string; subject: string; body: string }>;
  sequences: Array<{ name: string; touches: Record<string, { subject: string; body: string }> }>;
  breakups: Array<{ subject: string; body: string }>;
  angles: Record<string, string>;
}

const BASE = '/api/admin/cold-email';
const json = { 'Content-Type': 'application/json' };

// Throws an Error carrying the server's plain message so the screen can show it.
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authedFetch(buildApiUrl(`${BASE}${path}`), init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data as T;
}
const post = <T,>(path: string, body: unknown = {}) => call<T>(path, { method: 'POST', headers: json, body: JSON.stringify(body) });

export const adminColdEmailService = {
  overview: () => call<ColdOverview>('/overview'),
  examples: () => call<ColdExamples>('/examples'),
  sendSwitch: () => call<SendSwitch>('/switch'),
  setSendSwitch: (enabled: boolean) => post<{ enabled: boolean }>('/switch', { enabled }),
  importProspects: (rows: Array<Record<string, string>>) => post<{ added: number; duplicates: number; rejected: Array<{ email: string; reason: string }> }>('/prospects/import', { rows }),
  fromFinder: () => post<{ added: number; duplicates: number; rejected: unknown[] }>('/prospects/from-finder', {}),
  verify: () => post<{ verified: number; bad: number }>('/prospects/verify', {}),
  prospects: (status?: string) => call<{ prospects: ColdProspect[] }>(`/prospects${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  markDemo: (id: string) => post<{ success: boolean }>(`/prospects/${id}/mark`, { status: 'demo_booked' }),
  draft: (body: Record<string, unknown>) => post<ColdDraft>('/draft', body),
  check: (body: Record<string, unknown>) => post<{ ok: boolean; wordCount: number; failures: Array<{ rule: string; message: string }> }>('/check', body),
  createBatch: (body: Record<string, unknown>) => post<{ batch: ColdBatch; queued: number; skipped: number }>('/batches', body),
  generate: (id: string) => post<{ generated: number; flagged: number; remaining: number }>(`/batches/${id}/generate`, {}),
  batch: (id: string) => call<{ batch: ColdBatch; sends: ColdSend[] }>(`/batches/${id}`),
  editSend: (id: string, subject: string, body_text: string) => call<{ ok: boolean; failures: Array<{ message: string }> }>(`/sends/${id}`, { method: 'PATCH', headers: json, body: JSON.stringify({ subject, body_text }) }),
  approve: (id: string) => post<{ approved: number; blocked: number; heldBack: number; firstSendCap: number | null }>(`/batches/${id}/approve`, { confirm: true }),
  pause: (id: string) => post<{ success: boolean }>(`/batches/${id}/pause`, {}),
  resume: (id: string) => post<{ success: boolean }>(`/batches/${id}/resume`, {}),
  testSend: (subject: string, body: string) => post<{ success: boolean; sentTo: string }>('/test-send', { subject, body }),
  results: () => call<ColdResults>('/results'),
  replies: () => call<{ replies: ColdReply[] }>('/replies'),
  logReply: (fromEmail: string, subject: string, body: string) => post<{ matched: boolean; label: string }>('/replies', { fromEmail, subject, body })
};

// Turns pasted CSV (header row required) into row objects. Handles quotes and commas inside quotes.
export const parseProspectCsv = (text: string): Array<Record<string, string>> => {
  const rows: string[][] = [];
  let cell = ''; let row: string[] = []; let quoted = false;
  const flushCell = () => { row.push(cell.trim()); cell = ''; };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') flushCell();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i += 1; flushCell(); if (row.some(Boolean)) rows.push(row); row = []; }
    else cell += ch;
  }
  flushCell(); if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] || ''])));
};
