import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentProfile, Property, isAIDescription } from '../../types';
import { listingsService, type ListingMarketSnapshot } from '../../services/listingsService';
import {
  DEFAULT_LISTING_REPORT_DISCLAIMER,
  generateListingStudioPdf
} from '../../services/listingStudioReportService';
import { showToast } from '../../utils/toastService';
import UpgradePromptModal from '../billing/UpgradePromptModal';
import { BillingLimitError, trackDashboardReportGeneration } from '../../services/dashboardBillingService';

interface ListingStudioV2PageProps {
  properties: Property[];
  agentProfile: AgentProfile;
  onBackToListings?: () => void;
}

const DEFAULT_PRIMARY = '#233074';
const DEFAULT_ACCENT = '#f77b23';
const DEMO_HERO_PHOTO = 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);

const normalizeSummary = (property: Property) => {
  if (typeof property.description === 'string' && property.description.trim()) {
    return property.description.trim();
  }
  if (isAIDescription(property.description) && property.description.paragraphs.length) {
    return property.description.paragraphs.join(' ');
  }
  return `This ${property.propertyType || 'home'} at ${property.address || 'this address'} is positioned to attract qualified buyers with a strong balance of features, location value, and pricing strategy.`;
};

const deriveMarketSnapshot = (property: Property): ListingMarketSnapshot => {
  const seed = `${property.id}-${property.address}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const avgPricePerSqft = property.squareFeet > 0 ? property.price / property.squareFeet : 0;
  const medianDom = 18 + (seed % 29);
  const activeListings = 72 + (seed % 190);
  const listToCloseRatio = 95.2 + ((seed % 45) / 10);
  return { avgPricePerSqft, medianDom, activeListings, listToCloseRatio };
};

const defaultActionPlan = (property: Property) => {
  const topFeatures = property.features.slice(0, 2).join(' + ') || 'top lifestyle features';
  return [
    `Lead with ${topFeatures} in first-fold listing copy and social hooks.`,
    'Use a value-framing CTA in ad copy ("Best turnkey option in this price bracket").',
    'Promote two showing windows this week and drive traffic from QR flyer scans.',
    'Send market snapshot PDF to warm leads within 24 hours for urgency.'
  ].join('\n');
};

const mockSummary = (property: Property) =>
  `${property.title || 'This listing'} is positioned as a high-intent move-up opportunity with premium finishes and a strong lifestyle narrative. Buyer demand in this ZIP favors turnkey homes, and this asset scores above market on presentation, location pull, and showing potential. Launch strategy should pair visual-first media, clear pricing confidence, and immediate QR lead capture follow-up.`;

const mockActionPlan = [
  'Open with exterior + kitchen in all channels to maximize first-impression quality.',
  'Use 3-hook social campaign: lifestyle, value, and urgency with showing CTA.',
  'Run 72-hour QR flyer sprint and retarget all scanners with the market report.',
  'Offer two curated showing windows and push scarcity in follow-up SMS/email.'
].join('\n');

const getMockMarketSnapshot = (): ListingMarketSnapshot => ({
  avgPricePerSqft: 518,
  medianDom: 19,
  activeListings: 146,
  listToCloseRatio: 97.1
});

const buildMockProperty = (property: Property): Property => ({
  ...property,
  title: property.title || 'Modern Hillside Estate',
  price: property.price > 0 ? property.price : 1250000,
  bedrooms: property.bedrooms || 4,
  bathrooms: property.bathrooms || 3,
  squareFeet: property.squareFeet || 2800,
  heroPhotos: [DEMO_HERO_PHOTO]
});

export const ListingStudioV2Page: React.FC<ListingStudioV2PageProps> = ({ properties, agentProfile, onBackToListings }) => {
  const navigate = useNavigate();
  const firstProperty = properties[0] || null;
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(firstProperty?.id || '');
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) || firstProperty,
    [properties, selectedPropertyId, firstProperty]
  );

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [actionPlanText, setActionPlanText] = useState('');
  const [disclaimer, setDisclaimer] = useState(DEFAULT_LISTING_REPORT_DISCLAIMER);
  const [qrDestinationUrl, setQrDestinationUrl] = useState('');
  const [agentHeadshotUrl, setAgentHeadshotUrl] = useState(agentProfile.headshotUrl || '/demo-headshot.png');
  const [marketSnapshot, setMarketSnapshot] = useState<ListingMarketSnapshot | null>(null);
  const [compsCount, setCompsCount] = useState<number>(0);
  const [marketSources, setMarketSources] = useState<string[]>([]);
  const [publicMarketNote, setPublicMarketNote] = useState<string>('');
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [useMockDataPack, setUseMockDataPack] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; title: string; body: string }>({
    open: false,
    title: "You're at your limit.",
    body: 'Upgrade to keep capturing leads and sending reports without interruptions.'
  });

  useEffect(() => {
    if (!selectedProperty) return;
    setExecutiveSummary(normalizeSummary(selectedProperty));
    setActionPlanText(defaultActionPlan(selectedProperty));
    setQrDestinationUrl(
      selectedProperty.ctaListingUrl?.trim() ||
      `${window.location.origin}/listing/${encodeURIComponent(selectedProperty.id)}`
    );
    setAgentHeadshotUrl(agentProfile.headshotUrl || '/demo-headshot.png');
  }, [selectedProperty, agentProfile.headshotUrl]);

  useEffect(() => {
    if (!selectedProperty || !useMockDataPack) return;
    setExecutiveSummary(mockSummary(selectedProperty));
    setActionPlanText(mockActionPlan);
  }, [selectedProperty, useMockDataPack]);

  useEffect(() => {
    let isMounted = true;
    const loadMarketAnalysis = async () => {
      if (!selectedProperty) return;
      setIsLoadingMarket(true);
      try {
        const analysis = await listingsService.getMarketAnalysis(selectedProperty.id);
        if (!isMounted) return;
        setMarketSnapshot(analysis.marketSnapshot);
        setCompsCount(analysis.compsCount || 0);
        setMarketSources(Array.isArray(analysis.dataSources) ? analysis.dataSources : []);
        if (analysis.publicData?.medianHomeValue) {
          setPublicMarketNote(
            `ZIP ${analysis.publicData.zipCode}: Median home value ${formatMoney(analysis.publicData.medianHomeValue)} • Median household income ${formatMoney(analysis.publicData.medianHouseholdIncome)}`
          );
        } else {
          setPublicMarketNote('');
        }
      } catch (error) {
        console.warn('Falling back to local market math', error);
        if (!isMounted) return;
        setMarketSnapshot(deriveMarketSnapshot(selectedProperty));
        setCompsCount(0);
        setMarketSources(['Fallback: listing-level internal estimate']);
        setPublicMarketNote('');
      } finally {
        if (isMounted) setIsLoadingMarket(false);
      }
    };
    loadMarketAnalysis();
    return () => {
      isMounted = false;
    };
  }, [selectedProperty]);

  const handleAiAssist = async () => {
    if (!selectedProperty) return;
    setIsAiLoading(true);
    try {
      const ai = await listingsService.generateDescription({
        address: selectedProperty.address,
        beds: selectedProperty.bedrooms,
        baths: selectedProperty.bathrooms,
        sqft: selectedProperty.squareFeet,
        features: selectedProperty.features.join(', '),
        title: selectedProperty.title
      });

      const summary = [ai.title, ...ai.paragraphs].filter(Boolean).join(' ').trim();
      if (summary) setExecutiveSummary(summary);
      setActionPlanText([
        'Reorder media to lead with strongest exterior + kitchen contrast.',
        'Use market-position statement in first two lines of MLS and social captions.',
        'Run 48-hour open house push with QR flyer + follow-up sequence.',
        'Message warm leads with this report and ask for preferred showing time.'
      ].join('\n'));
      showToast.success('AI assistant updated your summary and action plan.');
    } catch (error) {
      console.error('Listing studio AI assist failed', error);
      showToast.error('Could not run AI assist right now.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!selectedProperty || !marketSnapshot) return;
    setIsGenerating(true);
    try {
      await trackDashboardReportGeneration(selectedProperty.id, `listing_report_${selectedProperty.id}_${Date.now()}`);
      const reportProperty = useMockDataPack ? buildMockProperty(selectedProperty) : selectedProperty;
      const reportSnapshot = useMockDataPack ? getMockMarketSnapshot() : marketSnapshot;
      await generateListingStudioPdf({
        property: reportProperty,
        agentProfile,
        theme: { primary: primaryColor, accent: accentColor },
        qrDestinationUrl,
        executiveSummary,
        actionPlan: actionPlanText.split('\n').map((line) => line.trim()).filter(Boolean),
        marketSnapshot: reportSnapshot,
        disclaimer,
        agentHeadshotUrl,
        showMockBadge: useMockDataPack
      });
      showToast.success('Report PDF generated.');
    } catch (error) {
      if (error instanceof BillingLimitError) {
        setUpgradeModal({
          open: true,
          title: error.modal.title,
          body: error.modal.body
        });
        return;
      }
      console.error('Failed generating listing report PDF', error);
      showToast.error('Failed to generate PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const effectiveMarket = useMockDataPack ? getMockMarketSnapshot() : marketSnapshot;
  const momentumDemand = Math.min(100, Math.round((effectiveMarket?.activeListings ?? 0) / 2.2));
  const momentumVelocity = Math.max(0, Math.round(100 - (effectiveMarket?.medianDom ?? 0) * 2));
  const momentumConversion = Math.min(100, Math.round(effectiveMarket?.listToCloseRatio ?? 0));

  if (!selectedProperty) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Listing Studio V2</h2>
        <p className="mt-2 text-slate-600">Add at least one listing to start generating market reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section
        className="rounded-3xl p-6 text-white shadow-xl"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Listings Studio V2</h2>
            <p className="mt-1 text-sm text-white/90">
              AI Listing Lead Machine • Property Analysis + PDF + QR Lead Capture
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onBackToListings && (
              <button
                onClick={onBackToListings}
                className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                Back to Classic Listings
              </button>
            )}
            <button
              onClick={handleAiAssist}
              disabled={isAiLoading}
              className="rounded-xl border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
            >
              {isAiLoading ? 'AI Working...' : 'AI Help Me Write'}
            </button>
            <button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isGenerating ? 'Generating PDF...' : 'Generate Report PDF'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">Property Analysis Workspace</h3>
            <select
              value={selectedProperty.id}
              onChange={(event) => setSelectedPropertyId(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title || property.address}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <label className="flex items-center gap-3 text-sm font-semibold text-indigo-900">
              <input
                type="checkbox"
                checked={useMockDataPack}
                onChange={(event) => setUseMockDataPack(event.target.checked)}
                className="h-4 w-4 rounded border-indigo-300"
              />
              Use polished demo numbers + mock photo for presentation mode
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">List Price</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney((useMockDataPack ? buildMockProperty(selectedProperty).price : selectedProperty.price))}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg $/Sq Ft</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(effectiveMarket?.avgPricePerSqft ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Median DOM</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{effectiveMarket?.medianDom ?? 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Listings</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{effectiveMarket?.activeListings ?? 0}</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">
              {isLoadingMarket ? 'Loading market analysis...' : `Data-backed analysis ready${compsCount ? ` • ${compsCount} comps` : ''}`}
            </p>
            {!!marketSources.length && <p className="mt-1">{marketSources.join(' | ')}</p>}
            {!!publicMarketNote && <p className="mt-1">{publicMarketNote}</p>}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Market Momentum Chart</p>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>Demand</span>
                  <span>{momentumDemand}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: `${momentumDemand}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>Velocity</span>
                  <span>{momentumVelocity}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-indigo-700" style={{ width: `${momentumVelocity}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>Conversion</span>
                  <span>{momentumConversion}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${momentumConversion}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Executive Summary (AI Assisted)
              <textarea
                value={executiveSummary}
                onChange={(event) => setExecutiveSummary(event.target.value)}
                rows={5}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Action Plan (one bullet per line)
              <textarea
                value={actionPlanText}
                onChange={(event) => setActionPlanText(event.target.value)}
                rows={5}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-bold text-slate-900">Report Styling + Lead Capture</h3>

          <label className="block text-sm font-semibold text-slate-700">
            Primary Color
            <div className="mt-2 flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
              <input
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Accent Color
            <div className="mt-2 flex items-center gap-2">
              <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
              <input
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            QR Destination URL (per listing)
            <input
              value={qrDestinationUrl}
              onChange={(event) => setQrDestinationUrl(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Agent Headshot URL
            <input
              value={agentHeadshotUrl}
              onChange={(event) => setAgentHeadshotUrl(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Agent Circle Preview</p>
            <img
              src={agentHeadshotUrl || '/demo-headshot.png'}
              alt="Agent headshot preview"
              className="h-20 w-20 rounded-full border-4 border-white object-cover shadow"
            />
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Report Disclaimer
            <textarea
              value={disclaimer}
              onChange={(event) => setDisclaimer(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-700"
            />
          </label>
        </div>
      </section>

      <UpgradePromptModal
        isOpen={upgradeModal.open}
        title={upgradeModal.title}
        body={upgradeModal.body}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, open: false }))}
        onUpgrade={() => navigate('/dashboard/billing')}
      />
    </div>
  );
};

export default ListingStudioV2Page;
