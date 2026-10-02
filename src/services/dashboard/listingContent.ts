

export interface LightCmaManualComp {
  id: string;
  address: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: 'sold' | 'active' | 'pending';
  note?: string | null;
  is_anchor?: boolean;
}

export type LightCmaStrategy = 'balanced' | 'competitive' | 'premium';

export interface LightCmaPreview {
  headline: string;
  summary: string;
  bullets: string[];
  cta: string;
}

export interface LightCmaConfig {
  pricing_notes: string;
  seller_goal: string;
  cta: string;
  pricing_strategy: LightCmaStrategy;
  ai_enabled: boolean;
  preview: LightCmaPreview;
  manual_comps: LightCmaManualComp[];
}

export type PropertyReportLengthMode = 'tight' | 'standard' | 'premium';
export type PropertyReportContactMethod = 'call' | 'text' | 'email';
export type OpenHouseFlyerContactMethod = 'call' | 'text' | 'email';

export interface PropertyReportPreview {
  headline: string;
  summary: string;
  bullets: string[];
  cta: string;
}

export interface PropertyReportConfig {
  headline: string;
  buyer_notes: string;
  top_features: string[];
  neighborhood_notes: string;
  cta: string;
  contact_method: PropertyReportContactMethod;
  ai_enabled: boolean;
  length_mode: PropertyReportLengthMode;
  preview: PropertyReportPreview;
}

export interface OpenHouseFlyerPreview {
  headline: string;
  schedule_line: string;
  detail: string;
  cta: string;
}

export interface OpenHouseFlyerConfig {
  event_date: string;
  start_time: string;
  end_time: string;
  headline: string;
  event_note: string;
  host_note: string;
  cta: string;
  contact_method: OpenHouseFlyerContactMethod;
  ai_enabled: boolean;
  preview: OpenHouseFlyerPreview;
}
