import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import VideoShareActions from './VideoShareActions';
import SocialVideoWidget from '../dashboard-widgets/SocialVideoWidget';
import { showToast } from '../../utils/toastService';
import {
  fetchLightCmaConfig,
  fetchOpenHouseFlyerConfig,
  fetchPropertyReportConfig,
  previewLightCma,
  previewOpenHouseFlyer,
  previewPropertyReport,
  generateListingQrCode,
  saveLightCmaConfig,
  saveOpenHouseFlyerConfig,
  savePropertyReportConfig,
  type LightCmaConfig,
  type LightCmaManualComp,
  type LightCmaStrategy,
  type ListingSourceDefault,
  type OpenHouseFlyerConfig,
  type OpenHouseFlyerContactMethod,
  type PropertyReportConfig,
  type PropertyReportContactMethod,
  type PropertyReportLengthMode
} from '../../services/dashboardCommandService';
import { getAgentProfile, type AgentProfile } from '../../services/agentProfileService';
import { copyToClipboard, listingShareKitService } from '../../services/listingShareAssetsService';

export interface ShareKitPanelProps {
  listing: {
    id: string;
    title: string;
    address: string;
    price: string;
    status: 'DRAFT' | 'PUBLISHED';
    slug: string;
    beds: string | number;
    baths: string | number;
    sqft?: string | number;
    photos?: string[];
  };
  onPublish: () => void;
  onTestLeadSubmit: (data: { name: string; contact: string; context: string; source: TestLeadSource }) => Promise<void>;
  stats?: {
    leadsCaptured: number;
    topSource: string;
    lastLeadAgo: string;
    showingRequestsCount: number;
    showingRequestsBySource: Array<{ label: string; total: number }>;
  };
  latestVideo?: {
    id: string;
    title?: string | null;
    caption?: string | null;
    file_name?: string | null;
  } | null;
  shareUrl?: string | null;
  qrCodeUrl?: string | null;
  qrCodeSvg?: string | null;
  sourceDefaults?: Record<string, ListingSourceDefault>;
  performanceAnchorId?: string;
}

type ShareQrSource = 'sign' | 'open_house' | 'social';
type TestLeadSource = 'sign' | 'social' | 'open_house' | 'public_contact';

type ListingQrAsset = {
  source_key: string;
  source_type: string;
  share_url: string;
  tracked_url: string;
  qr_code_url: string;
  qr_code_svg: string;
};

const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80';

const sourceTypeForKey = (value: ShareQrSource) => {
  if (value === 'open_house') return 'open_house';
  if (value === 'social') return 'social';
  return 'qr';
};

const createEmptyManualComp = (): LightCmaManualComp => ({
  id: `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  address: '',
  price: null,
  beds: null,
  baths: null,
  sqft: null,
  status: 'sold',
  note: '',
  is_anchor: false
});

const createEmptyPropertyReportConfig = (): PropertyReportConfig => ({
  headline: '',
  buyer_notes: '',
  top_features: [],
  neighborhood_notes: '',
  cta: '',
  contact_method: 'call',
  ai_enabled: true,
  length_mode: 'standard',
  preview: {
    headline: '',
    summary: '',
    bullets: [],
    cta: ''
  }
});

const createEmptyLightCmaConfig = (): LightCmaConfig => ({
  pricing_notes: '',
  seller_goal: '',
  cta: '',
  pricing_strategy: 'balanced',
  ai_enabled: true,
  preview: {
    headline: '',
    summary: '',
    bullets: [],
    cta: ''
  },
  manual_comps: []
});

const createEmptyOpenHouseFlyerConfig = (): OpenHouseFlyerConfig => ({
  event_date: '',
  start_time: '',
  end_time: '',
  headline: '',
  event_note: '',
  host_note: '',
  cta: '',
  contact_method: 'call',
  ai_enabled: true,
  preview: {
    headline: '',
    schedule_line: '',
    detail: '',
    cta: ''
  }
});

const parsePropertyFeatureInput = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

const propertyReportLengthLabels: Record<PropertyReportLengthMode, string> = {
  tight: 'Tight',
  standard: 'Standard',
  premium: 'Premium'
};

const propertyReportContactLabels: Record<PropertyReportContactMethod, string> = {
  call: 'Call',
  text: 'Text',
  email: 'Email'
};

const openHouseFlyerContactLabels: Record<OpenHouseFlyerContactMethod, string> = {
  call: 'Call',
  text: 'Text',
  email: 'Email'
};

const lightCmaStrategyLabels: Record<LightCmaStrategy, string> = {
  balanced: 'Balanced',
  competitive: 'Competitive',
  premium: 'Premium'
};

const testLeadSourceLabels: Record<TestLeadSource, string> = {
  sign: 'Sign QR',
  social: 'Social post',
  open_house: 'Open house',
  public_contact: 'Public contact page'
};

export const ShareKitPanel: React.FC<ShareKitPanelProps> = ({
  listing,
  onPublish,
  onTestLeadSubmit,
  stats = { leadsCaptured: 0, topSource: 'None', lastLeadAgo: 'N/A', showingRequestsCount: 0, showingRequestsBySource: [] },
  latestVideo = null,
  shareUrl = null,
  qrCodeUrl = null,
  qrCodeSvg = null,
  sourceDefaults = {},
  performanceAnchorId = 'listing-performance'
}) => {
  const [qrSource, setQrSource] = useState<ShareQrSource>('sign');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedFacebookPost, setCopiedFacebookPost] = useState(false);
  const [copiedFacebookOpenHousePost, setCopiedFacebookOpenHousePost] = useState(false);
  const [testName, setTestName] = useState('');
  const [testContact, setTestContact] = useState('');
  const [testSource, setTestSource] = useState<TestLeadSource>('sign');
  const [testContext, setTestContext] = useState('Report requested');
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [_agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrAssetsBySource, setQrAssetsBySource] = useState<Partial<Record<ShareQrSource, ListingQrAsset>>>({});
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [lightCmaConfig, setLightCmaConfig] = useState<LightCmaConfig>(createEmptyLightCmaConfig());
  const [lightCmaLoading, setLightCmaLoading] = useState(false);
  const [lightCmaPreviewing, setLightCmaPreviewing] = useState(false);
  const [lightCmaSaving, setLightCmaSaving] = useState(false);
  const [isLightCmaModalOpen, setIsLightCmaModalOpen] = useState(false);
  const [isPropertyReportModalOpen, setIsPropertyReportModalOpen] = useState(false);
  const [propertyReportConfig, setPropertyReportConfig] = useState<PropertyReportConfig>(createEmptyPropertyReportConfig());
  const [propertyReportLoading, setPropertyReportLoading] = useState(false);
  const [propertyReportPreviewing, setPropertyReportPreviewing] = useState(false);
  const [propertyReportSaving, setPropertyReportSaving] = useState(false);
  const [isOpenHouseFlyerModalOpen, setIsOpenHouseFlyerModalOpen] = useState(false);
  const [openHouseFlyerConfig, setOpenHouseFlyerConfig] = useState<OpenHouseFlyerConfig>(createEmptyOpenHouseFlyerConfig());
  const [openHouseFlyerLoading, setOpenHouseFlyerLoading] = useState(false);
  const [openHouseFlyerPreviewing, setOpenHouseFlyerPreviewing] = useState(false);
  const [openHouseFlyerSaving, setOpenHouseFlyerSaving] = useState(false);

  const noticeTimeoutRef = useRef<number | null>(null);

  const isDraft = listing.status === 'DRAFT';
  const baseUrl = 'https://homelistingai.com/l/';
  const resolvedShareUrl = isDraft ? '' : (String(shareUrl || '').trim() || `${baseUrl}${listing.slug}`);
  const displayShareUrl = resolvedShareUrl || 'Publish listing to unlock live link';
  const propertyImageUrl = useMemo(() => {
    const photos = Array.isArray(listing.photos) ? listing.photos.filter(Boolean) : [];
    return photos[0] || FALLBACK_PROPERTY_IMAGE;
  }, [listing.photos]);
  const flyerFileBase = useMemo(() => String(listing.slug || listing.id || 'listing').trim() || 'listing', [listing.id, listing.slug]);
  const activeQrAsset = qrAssetsBySource[qrSource];
  const trackedQrLink = activeQrAsset?.tracked_url || (resolvedShareUrl ? `${resolvedShareUrl}?src=${qrSource}` : 'Publish listing to unlock tracked QR links');
  const activeQrImageUrl = activeQrAsset?.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(resolvedShareUrl ? trackedQrLink : 'Publish listing to unlock QR')}`;
  const activeQrSourceKey = activeQrAsset?.source_key || qrSource;
  const _activeQrSourceType = activeQrAsset?.source_type || sourceTypeForKey(qrSource);
  const qrSourceLabel = qrSource === 'open_house' ? 'Open House' : qrSource === 'social' ? 'Social' : 'Sign';
  const trackedQrSourceLabel = useMemo(() => {
    const raw = trackedQrLink.includes('?src=') ? trackedQrLink.split('?src=')[1] : qrSource;
    return String(raw)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, [qrSource, trackedQrLink]);
  const captionTemplate = `Just listed: ${listing.address} 🏡✨\nPrice: ${listing.price} | ${listing.beds} Beds | ${listing.baths} Baths\n\nGet the instant 1-page property report + request a showing right here: ${resolvedShareUrl || 'Live link unlocks after publish.'}`;
  const facebookPostTemplate = `New listing in ${listing.address}.\n\n${listing.price} | ${listing.beds} beds | ${listing.baths} baths${listing.sqft ? ` | ${listing.sqft} sqft` : ''}\n\nTake a look at the full property page, get the report, and request a showing here:\n${resolvedShareUrl || 'Publish listing to unlock the live link.'}\n\nIf you want more details or want to schedule a private showing, message me directly.`;
  const openHouseScheduleLine = [openHouseFlyerConfig.event_date, openHouseFlyerConfig.start_time, openHouseFlyerConfig.end_time]
    .filter(Boolean)
    .join(openHouseFlyerConfig.start_time && openHouseFlyerConfig.end_time ? ' • ' : ' ');
  const facebookOpenHouseTemplate = `Open house at ${listing.address}.\n\n${openHouseScheduleLine || 'Come by and tour the home in person.'}\n\n${listing.price} | ${listing.beds} beds | ${listing.baths} baths${listing.sqft ? ` | ${listing.sqft} sqft` : ''}\n\nSee the full listing details and request a showing here:\n${resolvedShareUrl || 'Publish listing to unlock the live link.'}\n\nMessage me if you want a private showing or more details before the open house.`;
  const effectiveVideoCaption = latestVideo?.caption?.trim() || captionTemplate;
  const shareLinkHostname = useMemo(() => {
    try {
      return new URL(resolvedShareUrl).hostname;
    } catch (_error) {
      return 'homelistingai.com';
    }
  }, [resolvedShareUrl]);
  const sharePreviewPoints = useMemo(
    () => [
      `${listing.beds} bd`,
      `${listing.baths} ba`,
      listing.sqft ? `${listing.sqft} sqft` : 'Property report',
      shareLinkHostname
    ],
    [listing.baths, listing.beds, listing.sqft, shareLinkHostname]
  );
  const quickStats = [
    { label: 'Leads', value: String(stats.leadsCaptured || 0) },
    { label: 'Showings', value: String(stats.showingRequestsCount || 0) },
    { label: 'Top source', value: stats.topSource || 'None' }
  ];
  const propertyReportFeatureInput = useMemo(
    () => propertyReportConfig.top_features.join(', '),
    [propertyReportConfig.top_features]
  );
  const propertyReportPreviewReady =
    Boolean(propertyReportConfig.preview.summary.trim()) || propertyReportConfig.preview.bullets.length > 0;
  const lightCmaPreviewReady =
    Boolean(lightCmaConfig.preview.headline.trim()) ||
    Boolean(lightCmaConfig.preview.summary.trim()) ||
    lightCmaConfig.preview.bullets.length > 0 ||
    Boolean(lightCmaConfig.preview.cta.trim());
  const openHouseFlyerPreviewReady =
    Boolean(openHouseFlyerConfig.preview.headline.trim()) ||
    Boolean(openHouseFlyerConfig.preview.schedule_line.trim()) ||
    Boolean(openHouseFlyerConfig.preview.detail.trim()) ||
    Boolean(openHouseFlyerConfig.preview.cta.trim());

  const setTransientNotice = useCallback((tone: 'info' | 'success' | 'error', text: string) => {
    setActionNotice({ tone, text });
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = window.setTimeout(() => {
      setActionNotice((current) => (current?.text === text ? null : current));
    }, 2600);
  }, []);

  useEffect(() => () => {
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
  }, []);

  const buildQrAsset = useCallback(
    (sourceKey: ShareQrSource, payload?: Partial<ListingQrAsset> | null): ListingQrAsset => {
      const share = String(payload?.share_url || resolvedShareUrl);
      const tracked = String(payload?.tracked_url || `${share}?src=${sourceKey}`);
      return {
        source_key: String(payload?.source_key || sourceKey),
        source_type: String(payload?.source_type || sourceTypeForKey(sourceKey)),
        share_url: share,
        tracked_url: tracked,
        qr_code_url:
          String(payload?.qr_code_url || '').trim() ||
          `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(tracked)}`,
        qr_code_svg: String(payload?.qr_code_svg || '')
      };
    },
    [resolvedShareUrl]
  );

  const ensureQrAsset = useCallback(
    async (sourceKey: ShareQrSource) => {
      const cached = qrAssetsBySource[sourceKey];
      if (cached?.qr_code_url) return cached;

      if (isDraft) {
        return buildQrAsset(sourceKey);
      }

      try {
        setQrLoading(true);
        const generated = await generateListingQrCode(listing.id, {
          source_key: sourceKey,
          source_type: sourceTypeForKey(sourceKey)
        });
        const normalized = buildQrAsset(sourceKey, generated);
        setQrAssetsBySource((current) => ({ ...current, [sourceKey]: normalized }));
        return normalized;
      } catch (error) {
        console.error('Failed to generate listing QR asset', error);
        const fallback = buildQrAsset(sourceKey);
        setQrAssetsBySource((current) => ({ ...current, [sourceKey]: fallback }));
        return fallback;
      } finally {
        setQrLoading(false);
      }
    },
    [buildQrAsset, isDraft, listing.id, qrAssetsBySource]
  );

  useEffect(() => {
    let active = true;
    void getAgentProfile()
      .then((profile) => {
        if (active) setAgentProfile(profile);
      })
      .catch((error) => {
        console.warn('Failed to load agent profile for Share Kit', error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const initialSign = buildQrAsset('sign', {
      source_key: sourceDefaults.sign?.source_key || 'sign',
      source_type: sourceDefaults.sign?.source_type || 'qr',
      share_url: resolvedShareUrl,
      tracked_url: `${resolvedShareUrl}?src=${sourceDefaults.sign?.source_key || 'sign'}`,
      qr_code_url: qrCodeUrl || undefined,
      qr_code_svg: qrCodeSvg || undefined
    });
    setQrAssetsBySource((current) => ({ ...current, sign: current.sign?.qr_code_url ? current.sign : initialSign }));
  }, [buildQrAsset, qrCodeSvg, qrCodeUrl, resolvedShareUrl, sourceDefaults.sign?.source_key, sourceDefaults.sign?.source_type]);

  useEffect(() => {
    if (isDraft) return;
    void ensureQrAsset(qrSource);
  }, [ensureQrAsset, isDraft, qrSource]);

  useEffect(() => {
    let active = true;
    setLightCmaLoading(true);
    void fetchLightCmaConfig(listing.id)
      .then((response) => {
        if (!active) return;
        setLightCmaConfig(response.config || createEmptyLightCmaConfig());
      })
      .catch((error) => {
        console.error('Failed to load Light CMA config', error);
      })
      .finally(() => {
        if (active) setLightCmaLoading(false);
      });
    return () => {
      active = false;
    };
  }, [listing.id]);

  useEffect(() => {
    let active = true;
    setPropertyReportLoading(true);
    void fetchPropertyReportConfig(listing.id)
      .then((response) => {
        if (!active) return;
        setPropertyReportConfig(response.config || createEmptyPropertyReportConfig());
      })
      .catch((error) => {
        console.error('Failed to load Property Report config', error);
      })
      .finally(() => {
        if (active) setPropertyReportLoading(false);
      });
    return () => {
      active = false;
    };
  }, [listing.id]);

  useEffect(() => {
    let active = true;
    setOpenHouseFlyerLoading(true);
    void fetchOpenHouseFlyerConfig(listing.id)
      .then((response) => {
        if (!active) return;
        setOpenHouseFlyerConfig(response.config || createEmptyOpenHouseFlyerConfig());
      })
      .catch((error) => {
        console.error('Failed to load Open House Flyer config', error);
      })
      .finally(() => {
        if (active) setOpenHouseFlyerLoading(false);
      });
    return () => {
      active = false;
    };
  }, [listing.id]);

  const handleCopy = async (text: string, setCopiedState: (v: boolean) => void) => {
    try {
      await copyToClipboard(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
      setTransientNotice('success', 'Copied to clipboard.');
      showToast.success('Copied');
    } catch (err) {
      console.error('Failed to copy', err);
      const errorCode = err instanceof Error ? err.message : 'copy_failed';
      setTransientNotice('error', `Copy failed (${errorCode}).`);
      showToast.error(`Could not copy (${errorCode}).`);
    }
  };

  const handleDownloadQr = async (format: 'png' | 'svg') => {
    try {
      setTransientNotice('info', `Preparing ${qrSourceLabel} QR ${format.toUpperCase()}...`);
      await ensureQrAsset(qrSource);
      const asset = format === 'png'
        ? await listingShareKitService.getQrPng(listing.id, activeQrSourceKey as ShareQrSource)
        : await listingShareKitService.getQrSvg(listing.id, activeQrSourceKey as ShareQrSource);
      listingShareKitService.saveBlobDownload(asset.blob, asset.fileName || `${flyerFileBase}-${qrSource}-qr.${format}`);
      setTransientNotice('success', `${qrSourceLabel} QR download started.`);
      showToast.success('Downloaded');
    } catch (error) {
      console.error('Failed to download QR', error);
      const errorCode = error instanceof Error ? error.message : 'qr_download_failed';
      setTransientNotice('error', `QR download failed (${errorCode}).`);
      showToast.error(`Could not download QR (${errorCode}).`);
    }
  };

  const handleDownloadSocialAsset = async (format: 'ig_post' | 'ig_story') => {
    const fileName = `${flyerFileBase}-${format === 'ig_story' ? 'ig-story' : 'ig-post'}.png`;
    try {
      setExportingKey(fileName);
      setTransientNotice('info', `Building ${fileName}...`);
      await ensureQrAsset('social');
      const { blob, fileName: resolvedFileName } = await listingShareKitService.getSocialAsset(listing.id, format);
      listingShareKitService.saveBlobDownload(blob, resolvedFileName || fileName);
      setTransientNotice('success', `${fileName} download started.`);
      showToast.success('Downloaded');
    } catch (error) {
      console.error('Failed to create social asset', error);
      const errorCode = error instanceof Error ? error.message : 'social_asset_failed';
      if (errorCode === 'demo_export_unavailable_use_real_listing') {
        setTransientNotice('info', 'Demo page is for layout only. Use your real listing page to download files.');
        showToast.error('Use the real listing page for downloads.');
      } else {
        setTransientNotice('error', `Could not create ${fileName} (${errorCode}).`);
        showToast.error(`Could not create image (${errorCode}).`);
      }
    } finally {
      setExportingKey(null);
    }
  };

  const handleOpenOpenHouseFlyerModal = () => {
    setIsOpenHouseFlyerModalOpen(true);
  };

  const handleOpenLightCmaModal = () => {
    setIsLightCmaModalOpen(true);
  };

  const handleDownloadSignRider = async () => {
    const fileName = `${flyerFileBase}-sign-rider.pdf`;
    try {
      setExportingKey(fileName);
      setTransientNotice('info', `Building ${fileName}...`);
      const { blob, fileName: resolvedFileName } = await listingShareKitService.getFlyerPdf(listing.id, 'sign');
      listingShareKitService.saveBlobDownload(blob, resolvedFileName || fileName);
      setTransientNotice('success', `${resolvedFileName || fileName} download started.`);
      showToast.success('Downloaded');
    } catch (error) {
      console.error('Failed to create Sign Rider PDF', error);
      const errorCode = error instanceof Error ? error.message : 'sign_rider_failed';
      if (errorCode === 'demo_export_unavailable_use_real_listing') {
        setTransientNotice('info', 'Demo page is for layout only. Use your real listing page to download files.');
        showToast.error('Use the real listing page for downloads.');
      } else {
        setTransientNotice('error', `Could not create ${fileName} (${errorCode}).`);
        showToast.error(`Could not create PDF (${errorCode}).`);
      }
    } finally {
      setExportingKey(null);
    }
  };

  const handleOpenPropertyReportModal = () => {
    setIsPropertyReportModalOpen(true);
  };

  const handleOpenHouseFlyerFieldChange = <K extends keyof OpenHouseFlyerConfig>(
    field: K,
    value: OpenHouseFlyerConfig[K]
  ) => {
    setOpenHouseFlyerConfig((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handlePropertyReportFieldChange = <K extends keyof PropertyReportConfig>(
    field: K,
    value: PropertyReportConfig[K]
  ) => {
    setPropertyReportConfig((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleLightCmaFieldChange = <K extends keyof LightCmaConfig>(
    field: K,
    value: LightCmaConfig[K]
  ) => {
    setLightCmaConfig((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handlePropertyReportPreview = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      setPropertyReportPreviewing(true);
      const response = await previewPropertyReport(listing.id, propertyReportConfig);
      setPropertyReportConfig(response.config || propertyReportConfig);
      if (!silent) {
        setTransientNotice('success', 'Preview refreshed.');
      }
    } catch (error) {
      console.error('Failed to preview Property Report', error);
      const errorCode = error instanceof Error ? error.message : 'property_report_preview_failed';
      if (!silent) {
        setTransientNotice('error', `Could not refresh preview (${errorCode}).`);
        showToast.error(`Could not preview (${errorCode}).`);
      }
    } finally {
      setPropertyReportPreviewing(false);
    }
  }, [listing.id, propertyReportConfig, setTransientNotice]);

  const handleOpenHouseFlyerPreview = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      setOpenHouseFlyerPreviewing(true);
      const response = await previewOpenHouseFlyer(listing.id, openHouseFlyerConfig);
      setOpenHouseFlyerConfig(response.config || openHouseFlyerConfig);
      if (!silent) {
        setTransientNotice('success', 'Open house preview refreshed.');
      }
    } catch (error) {
      console.error('Failed to preview Open House Flyer', error);
      const errorCode = error instanceof Error ? error.message : 'open_house_flyer_preview_failed';
      if (!silent) {
        setTransientNotice('error', `Could not refresh flyer preview (${errorCode}).`);
        showToast.error(`Could not preview (${errorCode}).`);
      }
    } finally {
      setOpenHouseFlyerPreviewing(false);
    }
  }, [listing.id, openHouseFlyerConfig, setTransientNotice]);

  const handleLightCmaPreview = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      setLightCmaPreviewing(true);
      const response = await previewLightCma(listing.id, lightCmaConfig);
      setLightCmaConfig(response.config || lightCmaConfig);
      if (!silent) {
        setTransientNotice('success', 'Light CMA preview refreshed.');
      }
    } catch (error) {
      console.error('Failed to preview Light CMA', error);
      const errorCode = error instanceof Error ? error.message : 'light_cma_preview_failed';
      if (!silent) {
        setTransientNotice('error', `Could not refresh CMA preview (${errorCode}).`);
        showToast.error(`Could not preview (${errorCode}).`);
      }
    } finally {
      setLightCmaPreviewing(false);
    }
  }, [lightCmaConfig, listing.id, setTransientNotice]);

  useEffect(() => {
    if (!isLightCmaModalOpen) return;
    if (lightCmaLoading || lightCmaPreviewing || lightCmaSaving) return;
    if (lightCmaPreviewReady) return;

    void handleLightCmaPreview({ silent: true });
  }, [
    handleLightCmaPreview,
    isLightCmaModalOpen,
    lightCmaLoading,
    lightCmaPreviewReady,
    lightCmaPreviewing,
    lightCmaSaving
  ]);

  useEffect(() => {
    if (!isPropertyReportModalOpen) return;
    if (propertyReportLoading || propertyReportPreviewing || propertyReportSaving) return;
    if (propertyReportPreviewReady) return;

    void handlePropertyReportPreview({ silent: true });
  }, [
    handlePropertyReportPreview,
    isPropertyReportModalOpen,
    propertyReportLoading,
    propertyReportPreviewReady,
    propertyReportPreviewing,
    propertyReportSaving
  ]);

  useEffect(() => {
    if (!isOpenHouseFlyerModalOpen) return;
    if (openHouseFlyerLoading || openHouseFlyerPreviewing || openHouseFlyerSaving) return;
    if (openHouseFlyerPreviewReady) return;

    void handleOpenHouseFlyerPreview({ silent: true });
  }, [
    handleOpenHouseFlyerPreview,
    isOpenHouseFlyerModalOpen,
    openHouseFlyerLoading,
    openHouseFlyerPreviewReady,
    openHouseFlyerPreviewing,
    openHouseFlyerSaving
  ]);

  const handleSavePropertyReport = async () => {
    try {
      setPropertyReportSaving(true);
      const payload = propertyReportPreviewReady
        ? propertyReportConfig
        : (await previewPropertyReport(listing.id, propertyReportConfig)).config;
      const response = await savePropertyReportConfig(listing.id, payload);
      setPropertyReportConfig(response.config || payload);
      setTransientNotice('success', 'Saved property report settings.');
      showToast.success('Saved');
    } catch (error) {
      console.error('Failed to save Property Report config', error);
      const errorCode = error instanceof Error ? error.message : 'property_report_config_failed';
      setTransientNotice('error', `Could not save property report settings (${errorCode}).`);
      showToast.error(`Could not save (${errorCode}).`);
    } finally {
      setPropertyReportSaving(false);
    }
  };

  const handleSaveLightCma = async () => {
    try {
      setLightCmaSaving(true);
      const payload = lightCmaPreviewReady
        ? lightCmaConfig
        : (await previewLightCma(listing.id, lightCmaConfig)).config;
      const response = await saveLightCmaConfig(listing.id, payload);
      setLightCmaConfig(response.config || payload);
      setTransientNotice('success', 'Saved Light CMA settings.');
      showToast.success('Saved');
    } catch (error) {
      console.error('Failed to save Light CMA config', error);
      const errorCode = error instanceof Error ? error.message : 'light_cma_config_failed';
      setTransientNotice('error', `Could not save Light CMA settings (${errorCode}).`);
      showToast.error(`Could not save (${errorCode}).`);
    } finally {
      setLightCmaSaving(false);
    }
  };

  const handleSaveOpenHouseFlyer = async () => {
    try {
      setOpenHouseFlyerSaving(true);
      const payload = openHouseFlyerPreviewReady
        ? openHouseFlyerConfig
        : (await previewOpenHouseFlyer(listing.id, openHouseFlyerConfig)).config;
      const response = await saveOpenHouseFlyerConfig(listing.id, payload);
      setOpenHouseFlyerConfig(response.config || payload);
      setTransientNotice('success', 'Saved open house flyer settings.');
      showToast.success('Saved');
    } catch (error) {
      console.error('Failed to save Open House Flyer config', error);
      const errorCode = error instanceof Error ? error.message : 'open_house_flyer_config_failed';
      setTransientNotice('error', `Could not save open house flyer settings (${errorCode}).`);
      showToast.error(`Could not save (${errorCode}).`);
    } finally {
      setOpenHouseFlyerSaving(false);
    }
  };

  const handleCreatePropertyReportPdf = async () => {
    const fileName = `${flyerFileBase}-property-report.pdf`;
    try {
      setPropertyReportSaving(true);
      setExportingKey(fileName);
      setTransientNotice('info', `Building ${fileName}...`);
      const preparedConfig = propertyReportPreviewReady
        ? propertyReportConfig
        : (await previewPropertyReport(listing.id, propertyReportConfig)).config;
      const saveResponse = await savePropertyReportConfig(listing.id, preparedConfig);
      const finalConfig = saveResponse.config || preparedConfig;
      setPropertyReportConfig(finalConfig);
      const { blob, fileName: resolvedFileName } = await listingShareKitService.getFlyerPdf(listing.id, 'property_report');
      listingShareKitService.saveBlobDownload(blob, resolvedFileName || fileName);
      setTransientNotice('success', `${resolvedFileName || fileName} download started.`);
      showToast.success('Downloaded');
      setIsPropertyReportModalOpen(false);
    } catch (error) {
      console.error('Failed to create Property Report PDF', error);
      const errorCode = error instanceof Error ? error.message : 'property_report_failed';
      if (errorCode === 'demo_export_unavailable_use_real_listing') {
        setTransientNotice('info', 'Demo page is for layout only. Use your real listing page to download files.');
        showToast.error('Use the real listing page for downloads.');
      } else {
        setTransientNotice('error', `Could not create ${fileName} (${errorCode}).`);
        showToast.error(`Could not create PDF (${errorCode}).`);
      }
    } finally {
      setPropertyReportSaving(false);
      setExportingKey(null);
    }
  };

  const handleCreateOpenHouseFlyerPdf = async () => {
    const fileName = `${flyerFileBase}-open-house-flyer.pdf`;
    try {
      setOpenHouseFlyerSaving(true);
      setExportingKey(fileName);
      setTransientNotice('info', `Building ${fileName}...`);
      const preparedConfig = openHouseFlyerPreviewReady
        ? openHouseFlyerConfig
        : (await previewOpenHouseFlyer(listing.id, openHouseFlyerConfig)).config;
      const saveResponse = await saveOpenHouseFlyerConfig(listing.id, preparedConfig);
      const finalConfig = saveResponse.config || preparedConfig;
      setOpenHouseFlyerConfig(finalConfig);
      const { blob, fileName: resolvedFileName } = await listingShareKitService.getFlyerPdf(listing.id, 'open_house');
      listingShareKitService.saveBlobDownload(blob, resolvedFileName || fileName);
      setTransientNotice('success', `${resolvedFileName || fileName} download started.`);
      showToast.success('Downloaded');
      setIsOpenHouseFlyerModalOpen(false);
    } catch (error) {
      console.error('Failed to create Open House Flyer PDF', error);
      const errorCode = error instanceof Error ? error.message : 'open_house_flyer_failed';
      if (errorCode === 'demo_export_unavailable_use_real_listing') {
        setTransientNotice('info', 'Demo page is for layout only. Use your real listing page to download files.');
        showToast.error('Use the real listing page for downloads.');
      } else {
        setTransientNotice('error', `Could not create ${fileName} (${errorCode}).`);
        showToast.error(`Could not create PDF (${errorCode}).`);
      }
    } finally {
      setOpenHouseFlyerSaving(false);
      setExportingKey(null);
    }
  };

  const handleCreateLightCmaPdf = async () => {
    const fileName = `${flyerFileBase}-light-cma.pdf`;
    try {
      setLightCmaSaving(true);
      setExportingKey(fileName);
      setTransientNotice('info', `Building ${fileName}...`);
      const preparedConfig = lightCmaPreviewReady
        ? lightCmaConfig
        : (await previewLightCma(listing.id, lightCmaConfig)).config;
      const saveResponse = await saveLightCmaConfig(listing.id, preparedConfig);
      const finalConfig = saveResponse.config || preparedConfig;
      setLightCmaConfig(finalConfig);
      const { blob, fileName: resolvedFileName } = await listingShareKitService.getFlyerPdf(listing.id, 'light_cma');
      listingShareKitService.saveBlobDownload(blob, resolvedFileName || fileName);
      setTransientNotice('success', `${resolvedFileName || fileName} download started.`);
      showToast.success('Downloaded');
      setIsLightCmaModalOpen(false);
    } catch (error) {
      console.error('Failed to create Light CMA PDF', error);
      const errorCode = error instanceof Error ? error.message : 'light_cma_failed';
      if (errorCode === 'demo_export_unavailable_use_real_listing') {
        setTransientNotice('info', 'Demo page is for layout only. Use your real listing page to download files.');
        showToast.error('Use the real listing page for downloads.');
      } else {
        setTransientNotice('error', `Could not create ${fileName} (${errorCode}).`);
        showToast.error(`Could not create PDF (${errorCode}).`);
      }
    } finally {
      setLightCmaSaving(false);
      setExportingKey(null);
    }
  };

  const handleDownloadFairHousingReview = async () => {
    const fileName = `${flyerFileBase}-fair-housing-review.pdf`;
    try {
      setExportingKey(fileName);
      setTransientNotice('info', `Building ${fileName}...`);
      const { blob, fileName: resolvedFileName } = await listingShareKitService.getFlyerPdf(listing.id, 'fair_housing_review');
      listingShareKitService.saveBlobDownload(blob, resolvedFileName || fileName);
      setTransientNotice('success', `${resolvedFileName || fileName} download started.`);
      showToast.success('Downloaded');
    } catch (error) {
      console.error('Failed to create Fair Housing Review PDF', error);
      const errorCode = error instanceof Error ? error.message : 'fair_housing_review_failed';
      if (errorCode === 'demo_export_unavailable_use_real_listing') {
        setTransientNotice('info', 'Demo page is for layout only. Use your real listing page to download files.');
        showToast.error('Use the real listing page for downloads.');
      } else {
        setTransientNotice('error', `Could not create ${fileName} (${errorCode}).`);
        showToast.error(`Could not create PDF (${errorCode}).`);
      }
    } finally {
      setExportingKey(null);
    }
  };

  const handleManualCompChange = (
    compId: string,
    field: keyof LightCmaManualComp,
    value: string
  ) => {
    setLightCmaConfig((current) => ({
      ...current,
      manual_comps: current.manual_comps.map((comp) => {
        if (comp.id !== compId) return comp;
        if (field === 'price' || field === 'beds' || field === 'baths' || field === 'sqft') {
          const parsed = value.trim() === '' ? null : Number(value);
          return { ...comp, [field]: Number.isFinite(parsed) ? parsed : null };
        }
        return { ...comp, [field]: value };
      })
    }));
  };

  const handleAddManualComp = () => {
    setLightCmaConfig((current) => ({
      ...current,
      manual_comps: [...current.manual_comps, createEmptyManualComp()].slice(0, 8)
    }));
  };

  const handleRemoveManualComp = (compId: string) => {
    setLightCmaConfig((current) => ({
      ...current,
      manual_comps: current.manual_comps.filter((comp) => comp.id !== compId)
    }));
  };

  const handleSetAnchorComp = (compId: string) => {
    setLightCmaConfig((current) => ({
      ...current,
      manual_comps: current.manual_comps.map((comp) => ({
        ...comp,
        is_anchor: comp.id === compId
      }))
    }));
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSubmitting(true);
    try {
      await onTestLeadSubmit({ name: testName, contact: testContact, context: testContext, source: testSource });
      setIsTestModalOpen(false);
    } catch (error) {
      console.error('Test lead failed', error);
    } finally {
      setTestSubmitting(false);
    }
  };

  const handleViewPerformance = () => {
    const target = document.getElementById(performanceAnchorId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="bg-[#0B1121] border border-slate-800 rounded-2xl p-5 md:p-8 mb-8 shadow-2xl shadow-black/50 overflow-hidden font-sans">
        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Share Kit</h2>
            <p className="text-slate-400 text-lg">One live listing. One tracked QR. Every share path drives buyers back into chat, contact, and showing requests.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 xl:min-w-[420px]">
            {quickStats.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-800 bg-[#040814] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 truncate text-lg font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/50 p-5 md:p-6 rounded-xl border border-slate-800 mb-6 gap-6">
          <div className="flex items-start gap-4">
            <div className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mt-1 ${isDraft ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {listing.status}
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{isDraft ? 'Draft Listing' : 'Live Listing'}</p>
              <p className="text-slate-400 text-sm mt-1">
                {isDraft ? 'Publish to activate the live listing, tracked QR, and lead capture path.' : 'Traffic, leads, and showings now route through this property app.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => void handleDownloadFairHousingReview()}
              disabled={Boolean(exportingKey) || isDraft}
              className="w-full md:w-auto px-5 py-3 border border-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-center disabled:opacity-60"
            >
              {exportingKey === `${flyerFileBase}-fair-housing-review.pdf` ? 'Creating...' : 'Fair Housing Review'}
            </button>
            {isDraft ? (
              <button
                onClick={onPublish}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-600/20"
              >
                Publish Listing
              </button>
            ) : (
              <a
                href={resolvedShareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block w-full md:w-auto px-8 py-3 border border-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-center"
              >
                View Live Listing
              </a>
            )}
          </div>
        </div>

        {actionNotice ? (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
              actionNotice.tone === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : actionNotice.tone === 'error'
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-300'
            }`}
          >
            {actionNotice.text}
          </div>
        ) : null}

        <div className={`grid grid-cols-1 xl:grid-cols-[1.02fr,0.98fr] gap-6 mb-8 ${isDraft ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="block text-slate-300 font-bold">Share Link</label>
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">
                Primary route
              </span>
            </div>
            <div className="flex bg-[#0B1121] rounded-lg border border-slate-700 overflow-hidden">
              <input
                type="text"
                readOnly
                value={displayShareUrl}
                className="flex-1 bg-transparent text-slate-300 px-4 py-3 outline-none font-mono text-sm"
              />
              <button
                onClick={() => void handleCopy(resolvedShareUrl, setCopiedLink)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors border-l border-slate-700"
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
              <a
                href={resolvedShareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors border-l border-slate-700"
              >
                Open
              </a>
            </div>
            <p className="text-slate-500 text-sm mt-3">Use this as the main conversion link for texts, email, DMs, social bios, and sign follow-up.</p>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-800 bg-[#0B1121]">
              <div className="relative h-40 overflow-hidden border-b border-slate-800">
                <img src={propertyImageUrl} alt={listing.address} className="h-full w-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1121] via-[#0B1121]/35 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300/80">Live Preview</p>
                    <p className="mt-1 text-base font-bold text-white">{listing.address}</p>
                  </div>
                  <div className="rounded-full border border-slate-600 bg-slate-950/70 px-3 py-1 text-xs font-bold text-slate-200">
                    {listing.price}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {sharePreviewPoints.map((point) => (
                    <span
                      key={point}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-300"
                    >
                      {point}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                    <p className="font-bold uppercase tracking-wide text-slate-500">Best for</p>
                    <p className="mt-1 text-slate-300">DMs, email, social bios, and texts</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                    <p className="font-bold uppercase tracking-wide text-slate-500">Destination</p>
                    <p className="mt-1 truncate font-mono text-slate-300">{shareLinkHostname}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#040814] p-6 rounded-xl border border-slate-800 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-6">
              <h3 className="text-white font-bold text-lg">QR Codes</h3>
              <select
                value={qrSource}
                onChange={(e) => setQrSource(e.target.value as ShareQrSource)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none font-semibold cursor-pointer"
              >
                <option value="sign">Sign QR</option>
                <option value="open_house">Open House QR</option>
                <option value="social">Social QR</option>
              </select>
            </div>

            <div className="bg-white p-4 rounded-3xl w-72 h-72 max-w-full mb-6 shadow-xl flex items-center justify-center">
              {qrLoading ? (
                <span className="text-sm font-semibold text-slate-500">Refreshing QR...</span>
              ) : (
                <img src={activeQrImageUrl} alt="QR Code" className="w-full h-full object-contain" />
              )}
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <button onClick={() => void handleDownloadQr('png')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                Download PNG
              </button>
              <button onClick={() => void handleDownloadQr('svg')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                Download SVG
              </button>
              <button
                onClick={() => void handleCopy(trackedQrLink, () => {})}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Copy QR Link
              </button>
            </div>
            <div className="w-full rounded-xl border border-slate-800 bg-[#0B1121] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">{qrSourceLabel} Destination</p>
                  <p className="mt-1 text-sm font-semibold text-white">{trackedQrSourceLabel}</p>
                </div>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-bold text-slate-300">
                  Tracks source
                </span>
              </div>
              <p className="mt-3 truncate font-mono text-xs text-slate-400">{trackedQrLink}</p>
            </div>
          </div>
        </div>

        <div className={`mb-8 ${isDraft ? 'opacity-50 pointer-events-none' : ''}`}>
          <SocialVideoWidget
            listingId={listing.id}
            listingAddress={listing.address}
            listingLink={resolvedShareUrl}
          />
        </div>

        <div className={`grid grid-cols-1 xl:grid-cols-[1.08fr,0.92fr] gap-6 ${isDraft ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="space-y-8">
            <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
              <h3 className="text-white font-bold mb-2 text-lg">Reports + Print</h3>
              <p className="text-slate-400 text-sm mb-5">Buyer reports, seller pricing, and print assets that route back to the same live listing and attribution path.</p>

              <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2 xl:grid-cols-2">
                <button
                  onClick={handleOpenPropertyReportModal}
                  disabled={Boolean(exportingKey) || propertyReportLoading}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700 disabled:opacity-60"
                >
                  {propertyReportLoading ? 'Loading...' : exportingKey === `${flyerFileBase}-property-report.pdf` ? 'Creating...' : 'Create Property Report (PDF)'}
                </button>
                <button
                  onClick={handleOpenLightCmaModal}
                  disabled={Boolean(exportingKey) || lightCmaLoading}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700 disabled:opacity-60"
                >
                  {lightCmaLoading ? 'Loading...' : exportingKey === `${flyerFileBase}-light-cma.pdf` ? 'Creating...' : 'Create Light CMA (PDF)'}
                </button>
                <button
                  onClick={handleOpenOpenHouseFlyerModal}
                  disabled={Boolean(exportingKey) || openHouseFlyerLoading}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700 disabled:opacity-60"
                >
                  {openHouseFlyerLoading ? 'Loading...' : exportingKey === `${flyerFileBase}-open-house-flyer.pdf` ? 'Creating...' : 'Create Open House Flyer (PDF)'}
                </button>
                <button
                  onClick={() => void handleDownloadSignRider()}
                  disabled={Boolean(exportingKey)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700 disabled:opacity-60"
                >
                  {exportingKey === `${flyerFileBase}-sign-rider.pdf` ? 'Creating...' : 'Create Sign Rider (PDF)'}
                </button>
              </div>
              <p className="text-slate-500 text-xs">Every report and print file uses the same live listing, tracked QR, and agent card.</p>

              <div className="mt-5 rounded-xl border border-slate-800 bg-[#0B1121] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Light CMA setup</p>
                    <p className="text-xs text-slate-400">Open a guided sheet for pricing strategy, AI summary, and manual comps.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenLightCmaModal}
                    disabled={lightCmaLoading}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                  >
                    {lightCmaLoading ? 'Loading...' : 'Open Light CMA Setup'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
              <h3 className="text-white font-bold mb-4 text-lg">Traffic Drivers</h3>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-800 bg-[#0B1121] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Formats</p>
                  <p className="mt-2 text-sm font-semibold text-white">IG + Facebook</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#0B1121] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Copy</p>
                  <p className="mt-2 text-sm font-semibold text-white">Ready to paste</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#0B1121] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Video</p>
                  <p className="mt-2 text-sm font-semibold text-white">{latestVideo ? 'Ready to share' : 'Generate first'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button
                  onClick={() => void handleDownloadSocialAsset('ig_post')}
                  disabled={Boolean(exportingKey)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700 disabled:opacity-60"
                >
                  {exportingKey === `${flyerFileBase}-ig-post.png` ? 'Creating...' : 'Create IG Post'}
                </button>
                <button
                  onClick={() => void handleDownloadSocialAsset('ig_post')}
                  disabled={Boolean(exportingKey)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700 disabled:opacity-60"
                >
                  {exportingKey === `${flyerFileBase}-ig-post.png` ? 'Creating...' : 'Create Facebook Image'}
                </button>
                <button
                  onClick={() => void handleDownloadSocialAsset('ig_story')}
                  disabled={Boolean(exportingKey)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700 disabled:opacity-60"
                >
                  {exportingKey === `${flyerFileBase}-ig-story.png` ? 'Creating...' : 'Create IG Story'}
                </button>
              </div>

              <div className="bg-[#0B1121] rounded-lg p-4 border border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Caption Template</span>
                  <button
                    onClick={() => void handleCopy(captionTemplate, setCopiedCaption)}
                    className="text-blue-500 text-xs font-bold hover:text-blue-400"
                  >
                    {copiedCaption ? 'Copied!' : 'Copy Caption'}
                  </button>
                </div>
                <p className="text-slate-300 text-sm whitespace-pre-wrap font-mono">{captionTemplate}</p>
              </div>

              <div className="mt-4 bg-[#0B1121] rounded-lg p-4 border border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Facebook Post · Just Listed</span>
                  <button
                    onClick={() => void handleCopy(facebookPostTemplate, setCopiedFacebookPost)}
                    className="text-blue-500 text-xs font-bold hover:text-blue-400"
                  >
                    {copiedFacebookPost ? 'Copied!' : 'Copy Facebook Post'}
                  </button>
                </div>
                <p className="text-slate-300 text-sm whitespace-pre-wrap font-mono">{facebookPostTemplate}</p>
              </div>

              <div className="mt-4 bg-[#0B1121] rounded-lg p-4 border border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Facebook Post · Open House</span>
                  <button
                    onClick={() => void handleCopy(facebookOpenHouseTemplate, setCopiedFacebookOpenHousePost)}
                    className="text-blue-500 text-xs font-bold hover:text-blue-400"
                  >
                    {copiedFacebookOpenHousePost ? 'Copied!' : 'Copy Open House Post'}
                  </button>
                </div>
                <p className="text-slate-300 text-sm whitespace-pre-wrap font-mono">{facebookOpenHouseTemplate}</p>
              </div>

              {latestVideo ? (
                <div className="mt-4 rounded-lg border border-slate-800 bg-[#0B1121] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Video Share</p>
                  <p className="mt-2 text-sm text-slate-300">{latestVideo.title || 'Listing video is ready to share.'}</p>
                  <VideoShareActions
                    videoId={latestVideo.id}
                    fileName={latestVideo.file_name || `${listing.slug}.mp4`}
                    captionText={effectiveVideoCaption}
                    listingLink={resolvedShareUrl}
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-slate-800 bg-[#0B1121] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Video Share</p>
                  <p className="mt-2 text-sm text-slate-400">No video ready yet. Generate a listing video to enable Share + Download.</p>
                </div>
              )}

              {exportingKey ? (
                <p className="mt-4 text-xs font-semibold text-blue-300">Preparing your file now. Your download should start in a second.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-bold text-lg">Lead Capture Check</h3>
                  <p className="text-slate-400 text-sm mt-1">Send one test lead through the same path a real buyer will use so you can confirm attribution and showing flow.</p>
                </div>
              </div>
              <button
                onClick={() => setIsTestModalOpen(true)}
                className="w-full mt-4 px-4 py-3 border-2 border-slate-700 hover:border-slate-600 text-slate-300 font-bold rounded-lg transition-colors bg-transparent"
              >
                Send a Test Lead
              </button>
            </div>

            {stats ? (
              <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-white font-bold text-lg">Conversion Signals <span className="text-slate-500 text-sm font-normal ml-2">(last 30 days)</span></h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 lg:grid-cols-4">
                  <div className="bg-[#0B1121] border border-slate-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-white">{stats.leadsCaptured}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Leads Captured</div>
                  </div>
                  <div className="bg-[#0B1121] border border-slate-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-white">{stats.showingRequestsCount}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Showing Requests</div>
                  </div>
                  <div className="bg-[#0B1121] border border-slate-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-black text-blue-400 truncate">{stats.topSource}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Top Source</div>
                  </div>
                  <div className="bg-[#0B1121] border border-slate-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-black text-white truncate">{stats.lastLeadAgo}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Last Lead</div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#0B1121] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white">Showing Requests by Source</p>
                    <span className="text-xs font-semibold text-slate-500">Last 30 days</span>
                  </div>
                  {stats.showingRequestsBySource.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {stats.showingRequestsBySource.map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                          <span className="text-sm text-slate-300">{item.label}</span>
                          <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{item.total}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">No showing requests captured yet. Once a buyer asks for a showing, the source will show up here.</p>
                  )}
                </div>
                <button type="button" onClick={handleViewPerformance} className="text-blue-500 text-sm font-bold hover:text-blue-400">
                  View full performance →
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {isLightCmaModalOpen && typeof document !== 'undefined' && createPortal((
          <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm">
            <div className="flex h-full w-full items-end justify-center sm:items-center sm:p-4">
              <div className="flex h-[100dvh] w-full flex-col overflow-hidden border border-slate-800 bg-[#0B1121] shadow-2xl sm:h-auto sm:max-h-[min(92vh,960px)] sm:w-[min(1080px,calc(100vw-3rem))] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl">
                <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#0B1121]/95 px-4 py-4 backdrop-blur sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">Light CMA</p>
                      <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">Create Light CMA</h3>
                      <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Keep it simple. Pick the pricing angle, add a seller note, and let AI tighten the pricing story before export.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLightCmaModalOpen(false)}
                      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      <span>Close</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                  <div className="grid gap-6 xl:grid-cols-[0.98fr,1.02fr]">
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Pricing strategy</label>
                          <select
                            value={lightCmaConfig.pricing_strategy}
                            onChange={(e) => handleLightCmaFieldChange('pricing_strategy', e.target.value as LightCmaStrategy)}
                            className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm font-semibold text-slate-200 outline-none focus:border-blue-500"
                          >
                            <option value="balanced">Balanced</option>
                            <option value="competitive">Competitive</option>
                            <option value="premium">Premium</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Call to action</label>
                          <input
                            type="text"
                            value={lightCmaConfig.cta}
                            onChange={(e) => handleLightCmaFieldChange('cta', e.target.value)}
                            maxLength={90}
                            placeholder="Walk the seller through the target range and next step."
                            className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                          />
                          <p className="mt-2 text-xs text-slate-500">{lightCmaConfig.cta.length}/90</p>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Seller goal</label>
                        <textarea
                          value={lightCmaConfig.seller_goal}
                          onChange={(e) => handleLightCmaFieldChange('seller_goal', e.target.value)}
                          rows={3}
                          maxLength={220}
                          placeholder="Example: Seller wants a clean launch, strong first-week traffic, and room to negotiate if needed."
                          className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                        />
                        <p className="mt-2 text-xs text-slate-500">{lightCmaConfig.seller_goal.length}/220</p>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Pricing notes</label>
                        <textarea
                          value={lightCmaConfig.pricing_notes}
                          onChange={(e) => handleLightCmaFieldChange('pricing_notes', e.target.value)}
                          rows={6}
                          maxLength={500}
                          placeholder="Example: Start near the middle of the range. The anchor comp on Maple supports the upside if condition and yard are positioned clearly."
                          className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                        />
                        <p className="mt-2 text-xs text-slate-500">{lightCmaConfig.pricing_notes.length}/500</p>
                      </div>

                      <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#040814] p-4">
                        <input
                          type="checkbox"
                          checked={lightCmaConfig.ai_enabled}
                          onChange={(e) => handleLightCmaFieldChange('ai_enabled', e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500"
                        />
                        <div>
                          <p className="text-sm font-bold text-white">AI polish this CMA</p>
                          <p className="mt-1 text-xs text-slate-400">
                            The app turns your notes into a short seller-facing pricing story that fits cleanly on the PDF.
                          </p>
                        </div>
                      </label>

                      <div className="rounded-2xl border border-slate-800 bg-[#040814] p-4 sm:p-5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Manual comps</p>
                            <p className="mt-2 text-sm text-slate-400">Add 1 to 3 hand-picked comps only when the automatic set needs context.</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddManualComp}
                            disabled={lightCmaConfig.manual_comps.length >= 8}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                          >
                            Add comp
                          </button>
                        </div>
                        <div className="space-y-3">
                          {lightCmaLoading ? (
                            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm text-slate-400">Loading CMA settings...</div>
                          ) : lightCmaConfig.manual_comps.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-5 text-sm text-slate-400">
                              No manual comps yet. Add the strongest comp only if it sharpens the pricing story.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {lightCmaConfig.manual_comps.map((comp) => (
                                <div key={comp.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                                  <div className="grid gap-3 lg:grid-cols-[1.4fr,0.8fr,0.6fr,0.6fr,0.7fr,0.75fr]">
                                    <input
                                      type="text"
                                      value={comp.address}
                                      onChange={(e) => handleManualCompChange(comp.id, 'address', e.target.value)}
                                      placeholder="123 Main St"
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                                    />
                                    <input
                                      type="number"
                                      value={comp.price ?? ''}
                                      onChange={(e) => handleManualCompChange(comp.id, 'price', e.target.value)}
                                      placeholder="550000"
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                                    />
                                    <input
                                      type="number"
                                      value={comp.beds ?? ''}
                                      onChange={(e) => handleManualCompChange(comp.id, 'beds', e.target.value)}
                                      placeholder="Beds"
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                                    />
                                    <input
                                      type="number"
                                      value={comp.baths ?? ''}
                                      onChange={(e) => handleManualCompChange(comp.id, 'baths', e.target.value)}
                                      placeholder="Baths"
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                                    />
                                    <input
                                      type="number"
                                      value={comp.sqft ?? ''}
                                      onChange={(e) => handleManualCompChange(comp.id, 'sqft', e.target.value)}
                                      placeholder="Sq Ft"
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                                    />
                                    <select
                                      value={comp.status}
                                      onChange={(e) => handleManualCompChange(comp.id, 'status', e.target.value)}
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                                    >
                                      <option value="sold">Sold</option>
                                      <option value="active">Active</option>
                                      <option value="pending">Pending</option>
                                    </select>
                                  </div>
                                  <textarea
                                    value={comp.note || ''}
                                    onChange={(e) => handleManualCompChange(comp.id, 'note', e.target.value)}
                                    rows={2}
                                    placeholder="Why this comp matters..."
                                    className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                                  />
                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSetAnchorComp(comp.id)}
                                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                        comp.is_anchor
                                          ? 'border-amber-400/60 bg-amber-400/15 text-amber-200'
                                          : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                      }`}
                                    >
                                      {comp.is_anchor ? 'Anchor comp' : 'Set as anchor'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveManualComp(comp.id)}
                                      className="rounded-lg border border-rose-700/50 bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-900/40"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-800 bg-[#040814] p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Preview summary</p>
                            <p className="mt-2 text-sm text-slate-400">
                              This is the short seller-facing pricing story that goes on the PDF.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleLightCmaPreview()}
                            disabled={lightCmaPreviewing}
                            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200 transition-colors hover:bg-blue-500/20 disabled:opacity-60"
                          >
                            {lightCmaPreviewing ? 'Refreshing...' : 'Refresh AI'}
                          </button>
                        </div>

                        <div className="mt-5 space-y-4">
                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Headline</p>
                            <p className="mt-2 text-lg font-black text-white">
                              {lightCmaConfig.preview.headline || `${lightCmaStrategyLabels[lightCmaConfig.pricing_strategy]} pricing story will show here.`}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Summary</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {lightCmaConfig.preview.summary || 'Your short seller-facing pricing summary will show here.'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Bullets</p>
                            {lightCmaConfig.preview.bullets.length > 0 ? (
                              <ul className="mt-3 space-y-2">
                                {lightCmaConfig.preview.bullets.map((bullet) => (
                                  <li key={bullet} className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-2 text-sm text-slate-400">Your AI pricing bullets will land here.</p>
                            )}
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">CTA</p>
                            <p className="mt-2 text-sm font-semibold text-slate-200">
                              {lightCmaConfig.preview.cta || 'Your pricing CTA will show here.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-[#040814] p-4 sm:p-5">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white">How this works</p>
                        <ol className="mt-3 space-y-2 text-sm text-slate-300">
                          <li>1. Pick the pricing angle.</li>
                          <li>2. Add only the seller note that matters.</li>
                          <li>3. AI turns it into a short pricing story.</li>
                          <li>4. Create the PDF when it looks right.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 z-10 border-t border-slate-800 bg-[#0B1121]/95 px-4 py-4 backdrop-blur sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">Saved to this listing only. You can reopen and edit it any time.</p>
                    <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setIsLightCmaModalOpen(false)}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveLightCma()}
                        disabled={lightCmaSaving || lightCmaPreviewing}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                      >
                        {lightCmaSaving && !exportingKey ? 'Saving...' : 'Save settings'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateLightCmaPdf()}
                        disabled={lightCmaSaving || lightCmaPreviewing || Boolean(exportingKey)}
                        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                      >
                        {exportingKey === `${flyerFileBase}-light-cma.pdf` ? 'Creating PDF...' : 'Create PDF'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ), document.body)}

        {isPropertyReportModalOpen && typeof document !== 'undefined' && createPortal((
          <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm">
            <div className="flex h-full w-full items-end justify-center sm:items-center sm:p-4">
              <div className="flex h-[100dvh] w-full flex-col overflow-hidden border border-slate-800 bg-[#0B1121] shadow-2xl sm:h-auto sm:max-h-[min(92vh,960px)] sm:w-[min(1000px,calc(100vw-3rem))] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl">
                <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#0B1121]/95 px-4 py-4 backdrop-blur sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">Property Report</p>
                      <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">Create Property Report</h3>
                      <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Add only the extra notes you want on this PDF. AI keeps the copy short for print.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPropertyReportModalOpen(false)}
                      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      <span>Close</span>
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1">Phone: fills the screen</span>
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1">Desktop: fits the window</span>
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1">Bottom button creates the PDF</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                  <div className="grid gap-6 lg:grid-cols-[1.02fr,0.98fr]">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Headline</label>
                    <input
                      type="text"
                      value={propertyReportConfig.headline}
                      onChange={(e) => handlePropertyReportFieldChange('headline', e.target.value)}
                      maxLength={80}
                      placeholder="Modern home with bright living spaces and a clean layout"
                      className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <p className="mt-2 text-xs text-slate-500">{propertyReportConfig.headline.length}/80</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Buyer notes</label>
                    <textarea
                      value={propertyReportConfig.buyer_notes}
                      onChange={(e) => handlePropertyReportFieldChange('buyer_notes', e.target.value)}
                      rows={6}
                      maxLength={500}
                      placeholder="Add the human angle here. Talk about flow, updates, lot, views, lifestyle, or anything buyers should feel right away."
                      className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <p className="mt-2 text-xs text-slate-500">{propertyReportConfig.buyer_notes.length}/500</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Top features</label>
                    <input
                      type="text"
                      value={propertyReportFeatureInput}
                      onChange={(e) => handlePropertyReportFieldChange('top_features', parsePropertyFeatureInput(e.target.value))}
                      placeholder="Pool, office, cul-de-sac, new roof, oversized yard"
                      className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <p className="mt-2 text-xs text-slate-500">Use commas. Up to 8 features.</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Neighborhood notes</label>
                    <textarea
                      value={propertyReportConfig.neighborhood_notes}
                      onChange={(e) => handlePropertyReportFieldChange('neighborhood_notes', e.target.value)}
                      rows={3}
                      maxLength={220}
                      placeholder="Near parks, quiet streets, trails, shopping, commuter routes, or the part of town buyers ask about."
                      className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <p className="mt-2 text-xs text-slate-500">{propertyReportConfig.neighborhood_notes.length}/220</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Call to action</label>
                    <input
                      type="text"
                      value={propertyReportConfig.cta}
                      onChange={(e) => handlePropertyReportFieldChange('cta', e.target.value)}
                      maxLength={90}
                      placeholder="Schedule your private showing today"
                      className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <p className="mt-2 text-xs text-slate-500">{propertyReportConfig.cta.length}/90</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Preferred contact</label>
                      <select
                        value={propertyReportConfig.contact_method}
                        onChange={(e) => handlePropertyReportFieldChange('contact_method', e.target.value as PropertyReportContactMethod)}
                        className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm font-semibold text-slate-200 outline-none focus:border-blue-500"
                      >
                        <option value="call">Call first</option>
                        <option value="text">Text first</option>
                        <option value="email">Email first</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Length</label>
                      <select
                        value={propertyReportConfig.length_mode}
                        onChange={(e) => handlePropertyReportFieldChange('length_mode', e.target.value as PropertyReportLengthMode)}
                        className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm font-semibold text-slate-200 outline-none focus:border-blue-500"
                      >
                        <option value="tight">Tight</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#040814] p-4">
                    <input
                      type="checkbox"
                      checked={propertyReportConfig.ai_enabled}
                      onChange={(e) => handlePropertyReportFieldChange('ai_enabled', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">AI polish this report</p>
                      <p className="mt-1 text-xs text-slate-400">
                        The app rewrites your notes into a shorter buyer-facing summary and bullet list that fits the PDF cleanly.
                      </p>
                    </div>
                  </label>
                </div>

                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-800 bg-[#040814] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Preview summary</p>
                        <p className="mt-2 text-sm text-slate-400">
                          This is the short content block that goes onto the PDF. It stays within the {propertyReportLengthLabels[propertyReportConfig.length_mode].toLowerCase()} print limit.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handlePropertyReportPreview()}
                        disabled={propertyReportPreviewing}
                        className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200 transition-colors hover:bg-blue-500/20 disabled:opacity-60"
                      >
                        {propertyReportPreviewing ? 'Refreshing...' : 'Refresh AI'}
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Headline</p>
                        <p className="mt-2 text-lg font-black text-white">
                          {propertyReportConfig.preview.headline || 'Your generated headline will show up here.'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Summary</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {propertyReportConfig.preview.summary || 'Preview the short buyer summary before you export.'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Bullets</p>
                        {propertyReportConfig.preview.bullets.length > 0 ? (
                          <ul className="mt-3 space-y-2">
                            {propertyReportConfig.preview.bullets.map((bullet) => (
                              <li key={bullet} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-400">Your AI bullet highlights will land here.</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">CTA</p>
                        <p className="mt-2 text-sm font-semibold text-slate-200">
                          {propertyReportConfig.preview.cta || `${propertyReportContactLabels[propertyReportConfig.contact_method]} instructions will show here after preview.`}
                        </p>
                      </div>
                    </div>
                  </div>

                      <div className="rounded-2xl border border-slate-800 bg-[#040814] p-4 sm:p-5">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white">How this works</p>
                        <ol className="mt-3 space-y-2 text-sm text-slate-300">
                          <li>1. Edit your notes on the left.</li>
                          <li>2. Tap refresh if you want AI to rewrite it.</li>
                          <li>3. Tap create PDF at the bottom when it looks right.</li>
                          <li>4. Tap close any time to leave this sheet.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 z-10 border-t border-slate-800 bg-[#0B1121]/95 px-4 py-4 backdrop-blur sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Saved to this listing only. You can reopen and edit it any time.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setIsPropertyReportModalOpen(false)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSavePropertyReport()}
                    disabled={propertyReportSaving || propertyReportPreviewing}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                  >
                    {propertyReportSaving && !exportingKey ? 'Saving...' : 'Save settings'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreatePropertyReportPdf()}
                    disabled={propertyReportSaving || propertyReportPreviewing || Boolean(exportingKey)}
                    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                  >
                    {exportingKey === `${flyerFileBase}-property-report.pdf` ? 'Creating PDF...' : 'Create PDF'}
                  </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ), document.body)}

        {isOpenHouseFlyerModalOpen && typeof document !== 'undefined' && createPortal((
          <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm">
            <div className="flex h-full w-full items-end justify-center sm:items-center sm:p-4">
              <div className="flex h-[100dvh] w-full flex-col overflow-hidden border border-slate-800 bg-[#0B1121] shadow-2xl sm:h-auto sm:max-h-[min(92vh,920px)] sm:w-[min(960px,calc(100vw-3rem))] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl">
                <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#0B1121]/95 px-4 py-4 backdrop-blur sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">Open House Flyer</p>
                      <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">Create Open House Flyer</h3>
                      <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Add the event details once. AI turns it into a short flyer headline and call-to-action.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpenHouseFlyerModalOpen(false)}
                      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      <span>Close</span>
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1">Phone: fills the screen</span>
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1">Desktop: fits the window</span>
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1">Bottom button creates the PDF</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                  <div className="grid gap-6 lg:grid-cols-[1.02fr,0.98fr]">
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Event date</label>
                          <input
                            type="text"
                            value={openHouseFlyerConfig.event_date}
                            onChange={(e) => handleOpenHouseFlyerFieldChange('event_date', e.target.value)}
                            maxLength={40}
                            placeholder="Saturday, April 4"
                            className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Start time</label>
                          <input
                            type="text"
                            value={openHouseFlyerConfig.start_time}
                            onChange={(e) => handleOpenHouseFlyerFieldChange('start_time', e.target.value)}
                            maxLength={30}
                            placeholder="1:00 PM"
                            className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">End time</label>
                          <input
                            type="text"
                            value={openHouseFlyerConfig.end_time}
                            onChange={(e) => handleOpenHouseFlyerFieldChange('end_time', e.target.value)}
                            maxLength={30}
                            placeholder="4:00 PM"
                            className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Headline</label>
                        <input
                          type="text"
                          value={openHouseFlyerConfig.headline}
                          onChange={(e) => handleOpenHouseFlyerFieldChange('headline', e.target.value)}
                          maxLength={90}
                          placeholder="Tour this polished home in person this weekend"
                          className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                        />
                        <p className="mt-2 text-xs text-slate-500">{openHouseFlyerConfig.headline.length}/90</p>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Event note</label>
                        <textarea
                          value={openHouseFlyerConfig.event_note}
                          onChange={(e) => handleOpenHouseFlyerFieldChange('event_note', e.target.value)}
                          rows={5}
                          maxLength={320}
                          placeholder="Add the quick pitch here. Mention the feel of the home, what buyers should look for, or why this open house is worth the stop."
                          className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                        />
                        <p className="mt-2 text-xs text-slate-500">{openHouseFlyerConfig.event_note.length}/320</p>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Host note</label>
                        <textarea
                          value={openHouseFlyerConfig.host_note}
                          onChange={(e) => handleOpenHouseFlyerFieldChange('host_note', e.target.value)}
                          rows={3}
                          maxLength={160}
                          placeholder="Example: Hosted by Chris Potter. Ask about recent upgrades and off-market options."
                          className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                        />
                        <p className="mt-2 text-xs text-slate-500">{openHouseFlyerConfig.host_note.length}/160</p>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Call to action</label>
                        <input
                          type="text"
                          value={openHouseFlyerConfig.cta}
                          onChange={(e) => handleOpenHouseFlyerFieldChange('cta', e.target.value)}
                          maxLength={90}
                          placeholder="Scan to view the full listing and book a private showing"
                          className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500"
                        />
                        <p className="mt-2 text-xs text-slate-500">{openHouseFlyerConfig.cta.length}/90</p>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white">Preferred contact</label>
                        <select
                          value={openHouseFlyerConfig.contact_method}
                          onChange={(e) => handleOpenHouseFlyerFieldChange('contact_method', e.target.value as OpenHouseFlyerContactMethod)}
                          className="w-full rounded-xl border border-slate-700 bg-[#040814] px-4 py-3 text-sm font-semibold text-slate-200 outline-none focus:border-blue-500"
                        >
                          <option value="call">Call first</option>
                          <option value="text">Text first</option>
                          <option value="email">Email first</option>
                        </select>
                      </div>

                      <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#040814] p-4">
                        <input
                          type="checkbox"
                          checked={openHouseFlyerConfig.ai_enabled}
                          onChange={(e) => handleOpenHouseFlyerFieldChange('ai_enabled', e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500"
                        />
                        <div>
                          <p className="text-sm font-bold text-white">AI polish this flyer</p>
                          <p className="mt-1 text-xs text-slate-400">
                            The app turns your event details into a short open-house headline, schedule line, and cleaner call-to-action.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-800 bg-[#040814] p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Preview summary</p>
                            <p className="mt-2 text-sm text-slate-400">
                              This is the short content block that goes onto the open house flyer.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleOpenHouseFlyerPreview()}
                            disabled={openHouseFlyerPreviewing}
                            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200 transition-colors hover:bg-blue-500/20 disabled:opacity-60"
                          >
                            {openHouseFlyerPreviewing ? 'Refreshing...' : 'Refresh AI'}
                          </button>
                        </div>

                        <div className="mt-5 space-y-4">
                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Headline</p>
                            <p className="mt-2 text-lg font-black text-white">
                              {openHouseFlyerConfig.preview.headline || 'Your open house headline will show up here.'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Schedule line</p>
                            <p className="mt-2 text-sm font-semibold text-slate-200">
                              {openHouseFlyerConfig.preview.schedule_line || 'Date and time will show here after preview.'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Detail</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {openHouseFlyerConfig.preview.detail || 'Your short event summary will show here.'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">CTA</p>
                            <p className="mt-2 text-sm font-semibold text-slate-200">
                              {openHouseFlyerConfig.preview.cta || `${openHouseFlyerContactLabels[openHouseFlyerConfig.contact_method]} instructions will show here after preview.`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-[#040814] p-4 sm:p-5">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white">How this works</p>
                        <ol className="mt-3 space-y-2 text-sm text-slate-300">
                          <li>1. Add the open house date and time.</li>
                          <li>2. Add one short note if you want.</li>
                          <li>3. Let AI tighten the flyer copy.</li>
                          <li>4. Tap create PDF at the bottom.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 z-10 border-t border-slate-800 bg-[#0B1121]/95 px-4 py-4 backdrop-blur sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Saved to this listing only. You can reopen and edit it any time.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setIsOpenHouseFlyerModalOpen(false)}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveOpenHouseFlyer()}
                        disabled={openHouseFlyerSaving || openHouseFlyerPreviewing}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                      >
                        {openHouseFlyerSaving && !exportingKey ? 'Saving...' : 'Save settings'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateOpenHouseFlyerPdf()}
                        disabled={openHouseFlyerSaving || openHouseFlyerPreviewing || Boolean(exportingKey)}
                        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                      >
                        {exportingKey === `${flyerFileBase}-open-house-flyer.pdf` ? 'Creating PDF...' : 'Create PDF'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ), document.body)}

        {isTestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0B1121] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Send Test Lead</h3>
                <button onClick={() => setIsTestModalOpen(false)} className="text-slate-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleTestSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm font-bold mb-2">Source</label>
                  <select
                    value={testSource}
                    onChange={(e) => setTestSource(e.target.value as TestLeadSource)}
                    className="w-full bg-[#040814] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {Object.entries(testLeadSourceLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    This will tag the lead the same way a real buyer path would.
                  </p>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-bold mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="w-full bg-[#040814] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-bold mb-2">Email or Phone</label>
                  <input
                    type="text"
                    required
                    value={testContact}
                    onChange={(e) => setTestContact(e.target.value)}
                    className="w-full bg-[#040814] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-bold mb-2">Context</label>
                  <select
                    value={testContext}
                    onChange={(e) => setTestContext(e.target.value)}
                    className="w-full bg-[#040814] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option>Report requested</option>
                    <option>Showing requested</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={testSubmitting}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {testSubmitting ? 'Sending...' : 'Submit Test Lead'}
                </button>
              </form>
            </div>
          </div>
        )}

        {isDraft ? (
          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-slate-500">Publish your listing to unlock the link, QR codes, and marketing packs.</p>
          </div>
        ) : null}
      </div>
    </>
  );
};
