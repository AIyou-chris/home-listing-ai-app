import React, { useState, useEffect, useCallback } from 'react';
import { Property, isAIDescription } from '../types';
import { generatePropertyDescription } from '../services/openaiService';

interface PropertyPageProps {
  property: Property;
  setProperty: (updatedProperty: Property) => void;
  onBack: () => void;
  leadCount?: number;
}

const PropertyMarketingManager: React.FC<{ property: Property, leadCount?: number }> = ({ property, leadCount = 0 }) => {
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ views: 0, clicks: 0, lastActivity: null });

  // Auto-generate short link on mount
  useEffect(() => {
    const generateAssetsAndStats = async () => {
      setIsLoading(true);
      const baseUrl = window.location.origin;
      const longUrl = `${baseUrl}/listings/${property.id}`;

      try {
        // 1. Get Short Link & Analytics
        const res = await fetch(`${baseUrl}/api/shorten`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: longUrl })
        });
        const data = await res.json();
        const link = (data.success && data.shortUrl) ? data.shortUrl : longUrl;
        setShortUrl(link);
        const slug = data.slug;

        // 2. Fetch Clicks (if slug exists)
        let clicks = 0;
        let lastClicked = null;
        if (slug) {
          try {
            const clickRes = await fetch(`${baseUrl}/api/analytics/link-stats/${slug}`);
            const clickData = await clickRes.json();
            if (clickData.success) {
              clicks = clickData.clicks;
              lastClicked = clickData.lastClicked;
            }
          } catch (e) {
            console.warn('Failed to load click stats', e);
          }
        }

        // 3. Fetch Views
        let views = 0;
        try {
          const viewRes = await fetch(`${baseUrl}/api/analytics/view-stats/${property.id}`);
          const viewData = await viewRes.json();
          if (viewData.success) {
            views = viewData.views;
          }
        } catch (e) {
          console.warn('Failed to load view stats', e);
        }

        setStats({ views, clicks, lastActivity: lastClicked });

        // 4. Generate QR Code
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(link)}`;
        setQrCodeUrl(qrApiUrl);

      } catch (err) {
        console.error('Marketing asset generation failed', err);
        setShortUrl(longUrl);
      } finally {
        setIsLoading(false);
      }
    };

    generateAssetsAndStats();
  }, [property.id]);

  const handleCopyLink = () => {
    if (shortUrl) {
      navigator.clipboard.writeText(shortUrl);
      alert('Marketing link copied to clipboard!');
    }
  };

  const handleDownloadQr = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `property-qr-${property.address.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <span className="material-symbols-outlined">campaign</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900">Marketing Assets</h3>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <span className="material-symbols-outlined animate-spin text-3xl text-indigo-500">sync</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Short Link Section */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Public Short Link</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-700 font-mono text-sm truncate select-all">
                {shortUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center gap-2"
              >
                <span className="material-symbols-outlined">content_copy</span>
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Share this link on social media, text messages, or email blasts.
            </p>
          </div>

          {/* Mini Analytics Panel */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <span className="block text-2xl font-bold text-slate-900">{stats.views}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Views</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <span className="block text-2xl font-bold text-slate-900">{stats.clicks}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clicks</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <span className="block text-2xl font-bold text-slate-900">{leadCount}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Leads</span>
            </div>
          </div>

          {/* QR Code Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Smart QR Code</label>
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-full">Print Ready (High Res)</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="w-48 h-48 bg-white p-2 rounded-xl border-2 border-slate-100 shadow-sm flex-shrink-0">
                {qrCodeUrl && <img src={qrCodeUrl} alt="Property QR" className="w-full h-full object-contain" />}
              </div>

              <div className="flex-1 space-y-3 w-full">
                <p className="text-sm text-slate-600 leading-relaxed">
                  This QR code instantly directs buyers to your property's dedicated mobile-optimized page. Perfect for:
                </p>
                <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc">
                  <li>Open House Signage</li>
                  <li>Property Flyers</li>
                  <li>Window Displays</li>
                </ul>
                <button
                  onClick={handleDownloadQr}
                  className="w-full sm:w-auto mt-4 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                >
                  <span className="material-symbols-outlined">download</span>
                  Download PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PropertyMapWidget: React.FC<{ property: Property }> = ({ property }) => {
  const openInGoogleMaps = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`;
    window.open(mapsUrl, '_blank');
  };

  const openInAppleMaps = () => {
    const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(property.address)}`;
    window.open(appleMapsUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400">location_on</span>
        Location
      </h3>

      <div className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Property Address</p>
          <p className="text-base font-semibold text-slate-900">{property.address}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={openInGoogleMaps}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition shadow-sm"
          >
            Google Maps
          </button>
          <button
            onClick={openInAppleMaps}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition shadow-sm"
          >
            Apple Maps
          </button>
        </div>
      </div>
    </div>
  );
};

const PropertyImage: React.FC<{ imageUrl: string, address: string }> = ({ imageUrl, address }) => (
  <div className="rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden aspect-video relative group">
    <img src={imageUrl} alt={`View of ${address}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
    <div className="absolute bottom-6 left-6 text-white">
      <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider border border-white/30">
        Marketing View
      </span>
    </div>
  </div>
);

const PropertyHeaderDetails: React.FC<{ address: string, price: number }> = ({ address, price }) => (
  <div>
    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">{address}</h2>
    <p className="text-indigo-600 font-bold text-3xl mt-2">${price.toLocaleString()}</p>
  </div>
);

const PropertyStats: React.FC<{ bedrooms: number, bathrooms: number, squareFeet: number }> = ({ bedrooms, bathrooms, squareFeet }) => (
  <div className="flex items-center gap-8 py-6 border-y border-slate-100 mt-6">
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-2xl text-slate-400">bed</span>
      <div>
        <span className="block font-bold text-xl text-slate-900 leading-none">{bedrooms}</span>
        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Beds</span>
      </div>
    </div>
    <div className="w-px h-10 bg-slate-200"></div>
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-2xl text-slate-400">bathtub</span>
      <div>
        <span className="block font-bold text-xl text-slate-900 leading-none">{bathrooms}</span>
        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Baths</span>
      </div>
    </div>
    <div className="w-px h-10 bg-slate-200"></div>
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-2xl text-slate-400">square_foot</span>
      <div>
        <span className="block font-bold text-xl text-slate-900 leading-none">{squareFeet.toLocaleString()}</span>
        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Sq Ft</span>
      </div>
    </div>
  </div>
);

const AIDescriptionSection: React.FC<{ description: Property['description'], onGenerate: () => void, isGenerating: boolean }> = ({ description, onGenerate, isGenerating }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 mt-8 border border-slate-100">
      <div className="flex justify-between items-center mb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">AI Listing Description</h3>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-all duration-300 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          <span className="whitespace-nowrap font-medium text-sm">{isGenerating ? 'Writing...' : 'Regenerate'}</span>
        </button>
      </div>

      <div className="prose prose-slate max-w-none">
        {isGenerating && !isAIDescription(description) ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-full"></div>
            <div className="h-4 bg-slate-100 rounded w-full"></div>
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
          </div>
        ) : isAIDescription(description) ? (
          <div>
            <h4 className="text-lg font-bold text-slate-900 mb-3">{description.title}</h4>
            <div className="space-y-4">
              {description.paragraphs.map((p, i) =>
                (typeof p === 'string') && <p key={i} className="text-slate-600 leading-relaxed text-base">{p}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-slate-500 leading-relaxed">
            {typeof description === 'string'
              ? (description || 'Click "Regenerate" to create a stunning property description with AI.')
              : 'Description unavailable.'
            }
          </p>
        )}
      </div>
    </div>
  );
};

const KeyFeaturesSection: React.FC<{ features: string[] }> = ({ features }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 mt-8 border border-slate-100">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Property Highlights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map(feature => (
          <div key={feature} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="material-symbols-outlined text-green-500 mt-0.5">check_circle</span>
            <span className="text-slate-700 font-medium">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PropertyPage: React.FC<PropertyPageProps> = ({ property, setProperty, onBack, leadCount }) => {
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  const handleGenerateDescription = useCallback(async () => {
    setIsGeneratingDesc(true);
    const generatedDesc = await generatePropertyDescription(property);
    setProperty({ ...property, description: generatedDesc });
    setIsGeneratingDesc(false);
  }, [property, setProperty]);

  useEffect(() => {
    if (!property.description || (typeof property.description === 'string' && property.description.trim() === '')) {
      handleGenerateDescription();
    }
  }, [property.id, property.description, handleGenerateDescription]);

  return (
    <div className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-slate-50/50 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span>Back to Listings</span>
        </button>
        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
          Marketing Mode
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visuals & Content */}
        <div className="lg:col-span-7 space-y-8">
          <PropertyImage imageUrl={property.imageUrl} address={property.address} />

          <div>
            <PropertyHeaderDetails address={property.address} price={property.price} />
            <PropertyStats bedrooms={property.bedrooms} bathrooms={property.bathrooms} squareFeet={property.squareFeet} />
          </div>

          <AIDescriptionSection
            description={property.description}
            onGenerate={handleGenerateDescription}
            isGenerating={isGeneratingDesc}
          />
          <KeyFeaturesSection features={property.features} />
        </div>

        {/* Right Column: Marketing Tools */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Marketing Widget */}
          <PropertyMarketingManager property={property} leadCount={leadCount} />
          <PropertyMapWidget property={property} />

          {/* Pro Tip Box */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-yellow-300 text-2xl">lightbulb</span>
              <div>
                <h4 className="font-bold text-lg mb-1">Marketing Tip</h4>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  Print the High-Res QR code and place it on your "For Sale" sign. Passersby can scan it to instantly view the full AI-generated listing details on their phone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyPage;
