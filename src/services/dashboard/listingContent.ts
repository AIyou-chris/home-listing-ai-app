import { buildApiUrl } from '../../lib/api';
import { isDemoModeActive } from '../../demo/useDemoMode';
import { resolveAgentId, defaultJsonHeaders, withAgentQuery, parseResponse } from './utils';

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

const normalizeLightCmaStrategy = (value: unknown): LightCmaStrategy => {
  if (value === 'competitive' || value === 'premium') return value;
  return 'balanced';
};

const normalizeLightCmaConfig = (input?: Partial<LightCmaConfig> | null): LightCmaConfig => {
  const raw = input && typeof input === 'object' ? input : {};
  return {
    pricing_notes: typeof raw.pricing_notes === 'string' ? raw.pricing_notes : '',
    seller_goal: typeof raw.seller_goal === 'string' ? raw.seller_goal : '',
    cta: typeof raw.cta === 'string' ? raw.cta : '',
    pricing_strategy: normalizeLightCmaStrategy(raw.pricing_strategy),
    ai_enabled: raw.ai_enabled !== false,
    preview: {
      headline: typeof raw.preview?.headline === 'string' ? raw.preview.headline : '',
      summary: typeof raw.preview?.summary === 'string' ? raw.preview.summary : '',
      bullets: Array.isArray(raw.preview?.bullets)
        ? raw.preview.bullets.filter((item): item is string => typeof item === 'string')
        : [],
      cta: typeof raw.preview?.cta === 'string' ? raw.preview.cta : ''
    },
    manual_comps: Array.isArray(raw.manual_comps)
      ? raw.manual_comps.map((comp) => ({
          ...comp,
          address: typeof comp.address === 'string' ? comp.address : '',
          price: typeof comp.price === 'number' ? comp.price : null,
          beds: typeof comp.beds === 'number' ? comp.beds : null,
          baths: typeof comp.baths === 'number' ? comp.baths : null,
          sqft: typeof comp.sqft === 'number' ? comp.sqft : null,
          status: comp.status === 'active' || comp.status === 'pending' ? comp.status : 'sold',
          note: typeof comp.note === 'string' ? comp.note : '',
          is_anchor: comp.is_anchor === true
        }))
      : []
  };
};

const normalizePropertyReportLengthMode = (value: unknown): PropertyReportLengthMode => {
  if (value === 'tight' || value === 'premium') return value;
  return 'standard';
};

const normalizePropertyReportContactMethod = (value: unknown): PropertyReportContactMethod => {
  if (value === 'text' || value === 'email') return value;
  return 'call';
};

const normalizeOpenHouseFlyerContactMethod = (value: unknown): OpenHouseFlyerContactMethod => {
  if (value === 'text' || value === 'email') return value;
  return 'call';
};

const normalizePropertyReportConfig = (input?: Partial<PropertyReportConfig> | null): PropertyReportConfig => {
  const raw = input && typeof input === 'object' ? input : {};
  return {
    headline: typeof raw.headline === 'string' ? raw.headline : '',
    buyer_notes: typeof raw.buyer_notes === 'string' ? raw.buyer_notes : '',
    top_features: Array.isArray(raw.top_features)
      ? raw.top_features.filter((item): item is string => typeof item === 'string')
      : [],
    neighborhood_notes: typeof raw.neighborhood_notes === 'string' ? raw.neighborhood_notes : '',
    cta: typeof raw.cta === 'string' ? raw.cta : '',
    contact_method: normalizePropertyReportContactMethod(raw.contact_method),
    ai_enabled: raw.ai_enabled !== false,
    length_mode: normalizePropertyReportLengthMode(raw.length_mode),
    preview: {
      headline: typeof raw.preview?.headline === 'string' ? raw.preview.headline : '',
      summary: typeof raw.preview?.summary === 'string' ? raw.preview.summary : '',
      bullets: Array.isArray(raw.preview?.bullets)
        ? raw.preview.bullets.filter((item): item is string => typeof item === 'string')
        : [],
      cta: typeof raw.preview?.cta === 'string' ? raw.preview.cta : ''
    }
  };
};

const normalizeOpenHouseFlyerConfig = (input?: Partial<OpenHouseFlyerConfig> | null): OpenHouseFlyerConfig => {
  const raw = input && typeof input === 'object' ? input : {};
  return {
    event_date: typeof raw.event_date === 'string' ? raw.event_date : '',
    start_time: typeof raw.start_time === 'string' ? raw.start_time : '',
    end_time: typeof raw.end_time === 'string' ? raw.end_time : '',
    headline: typeof raw.headline === 'string' ? raw.headline : '',
    event_note: typeof raw.event_note === 'string' ? raw.event_note : '',
    host_note: typeof raw.host_note === 'string' ? raw.host_note : '',
    cta: typeof raw.cta === 'string' ? raw.cta : '',
    contact_method: normalizeOpenHouseFlyerContactMethod(raw.contact_method),
    ai_enabled: raw.ai_enabled !== false,
    preview: {
      headline: typeof raw.preview?.headline === 'string' ? raw.preview.headline : '',
      schedule_line: typeof raw.preview?.schedule_line === 'string' ? raw.preview.schedule_line : '',
      detail: typeof raw.preview?.detail === 'string' ? raw.preview.detail : '',
      cta: typeof raw.preview?.cta === 'string' ? raw.preview.cta : ''
    }
  };
};

export const fetchLightCmaConfig = async (listingId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      listing_id: listingId,
      config: normalizeLightCmaConfig({})
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/light-cma/config`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );
  const payload = await parseResponse<{ success: boolean; listing_id: string; config: LightCmaConfig }>(response);
  return {
    ...payload,
    config: normalizeLightCmaConfig(payload.config)
  };
};

export const saveLightCmaConfig = async (
  listingId: string,
  config: LightCmaConfig,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      listing_id: listingId,
      config: normalizeLightCmaConfig(config)
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/light-cma/config`, agentId)),
    {
      method: 'PUT',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify(config)
    }
  );
  const payload = await parseResponse<{ success: boolean; listing_id: string; config: LightCmaConfig }>(response);
  return {
    ...payload,
    config: normalizeLightCmaConfig(payload.config)
  };
};

export const previewLightCma = async (
  listingId: string,
  config: LightCmaConfig,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    const normalized = normalizeLightCmaConfig(config);
    return {
      success: true,
      listing_id: listingId,
      config: normalized,
      preview: normalized.preview
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/light-cma/preview`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify(config)
    }
  );
  const payload = await parseResponse<{
    success: boolean;
    listing_id: string;
    config: LightCmaConfig;
    preview: LightCmaPreview;
  }>(response);
  return {
    ...payload,
    config: normalizeLightCmaConfig(payload.config),
    preview: normalizeLightCmaConfig({ preview: payload.preview }).preview
  };
};

export const fetchPropertyReportConfig = async (listingId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      listing_id: listingId,
      config: normalizePropertyReportConfig({})
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/property-report/config`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );
  const payload = await parseResponse<{ success: boolean; listing_id: string; config: PropertyReportConfig }>(response);
  return {
    ...payload,
    config: normalizePropertyReportConfig(payload.config)
  };
};

export const savePropertyReportConfig = async (
  listingId: string,
  config: PropertyReportConfig,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      listing_id: listingId,
      config: normalizePropertyReportConfig(config)
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/property-report/config`, agentId)),
    {
      method: 'PUT',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify(config)
    }
  );
  const payload = await parseResponse<{ success: boolean; listing_id: string; config: PropertyReportConfig }>(response);
  return {
    ...payload,
    config: normalizePropertyReportConfig(payload.config)
  };
};

export const previewPropertyReport = async (
  listingId: string,
  config: PropertyReportConfig,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    const normalized = normalizePropertyReportConfig(config);
    return {
      success: true,
      listing_id: listingId,
      config: normalized,
      preview: normalized.preview
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/property-report/preview`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify(config)
    }
  );
  const payload = await parseResponse<{
    success: boolean;
    listing_id: string;
    config: PropertyReportConfig;
    preview: PropertyReportPreview;
  }>(response);
  return {
    ...payload,
    config: normalizePropertyReportConfig(payload.config),
    preview: normalizePropertyReportConfig({ preview: payload.preview }).preview
  };
};

export const fetchOpenHouseFlyerConfig = async (listingId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      listing_id: listingId,
      config: normalizeOpenHouseFlyerConfig({})
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/open-house-flyer/config`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );
  const payload = await parseResponse<{ success: boolean; listing_id: string; config: OpenHouseFlyerConfig }>(response);
  return {
    ...payload,
    config: normalizeOpenHouseFlyerConfig(payload.config)
  };
};

export const saveOpenHouseFlyerConfig = async (
  listingId: string,
  config: OpenHouseFlyerConfig,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return {
      success: true,
      listing_id: listingId,
      config: normalizeOpenHouseFlyerConfig(config)
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/open-house-flyer/config`, agentId)),
    {
      method: 'PUT',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify(config)
    }
  );
  const payload = await parseResponse<{ success: boolean; listing_id: string; config: OpenHouseFlyerConfig }>(response);
  return {
    ...payload,
    config: normalizeOpenHouseFlyerConfig(payload.config)
  };
};

export const previewOpenHouseFlyer = async (
  listingId: string,
  config: OpenHouseFlyerConfig,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    const normalized = normalizeOpenHouseFlyerConfig(config);
    return {
      success: true,
      listing_id: listingId,
      config: normalized,
      preview: normalized.preview
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/open-house-flyer/preview`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify(config)
    }
  );
  const payload = await parseResponse<{
    success: boolean;
    listing_id: string;
    config: OpenHouseFlyerConfig;
    preview: OpenHouseFlyerPreview;
  }>(response);
  return {
    ...payload,
    config: normalizeOpenHouseFlyerConfig(payload.config),
    preview: normalizeOpenHouseFlyerConfig({ preview: payload.preview }).preview
  };
};
