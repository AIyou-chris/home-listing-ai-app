import React, { useEffect, useState, useMemo } from 'react';
import { Copy, Check, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Property, isAIDescription } from '../types';
import { adminListingsService, AdminListingModel } from '../services/adminListingsService';
import LoadingSpinner from '../components/LoadingSpinner';
import { SAMPLE_AGENT } from '../constants';

// --- PropertyCard Component (Copied from Blueprint) ---
interface PropertyCardProps {
  property: Property;
  onSelect: () => void;
  onDelete: () => void;
  onOpenMarketing?: () => void;
  onOpenBuilder?: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSelect,
  onDelete,
  onOpenMarketing,
  onOpenBuilder
}) => {
  const handleCardClick = () => {
    onSelect();
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  const handleEditClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (onOpenBuilder) {
      onOpenBuilder();
      return;
    }
    onSelect();
  };

  const handleSidekickClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (onOpenMarketing) {
      onOpenMarketing();
      return;
    }
    alert('Listing Sidekick setup coming soon.');
  };

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/demo/listings/${encodeURIComponent(property.id)}`
      : `https://demo.homelistingai.com/listings/${property.id}`;

  const descriptionText = isAIDescription(property.description)
    ? property.description.title
    : (property.description || 'View details to learn more.');

  return (
    <div
      className="bg-slate-800 rounded-2xl shadow-lg overflow-hidden flex flex-col text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="relative">
        <img className="h-56 w-full object-cover" src={property.imageUrl} alt={property.address} />
        <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
          {property.status || 'Active'}
        </div>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex-grow">
          <h3 className="text-xl font-bold text-white">{property.title}</h3>
          <p className="mt-1 flex items-center gap-2 text-sky-300 text-sm">
            <span className="material-symbols-outlined text-base">location_on</span>
            {property.address}
          </p>

          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-2xl font-bold text-white">
              <span className="material-symbols-outlined text-sky-400">payments</span>
              <span>${property.price.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-sky-300">
              <span className="material-symbols-outlined text-sky-400">fullscreen</span>
              <span>{property.squareFeet?.toLocaleString() ?? '-'} sqft</span>
            </div>
          </div>

          <div className="mt-2 flex items-center divide-x divide-slate-600 text-sm text-slate-300">
            <div className="flex items-center gap-2 pr-3">
              <span className="material-symbols-outlined text-base text-slate-400">bed</span>
              <span>{property.bedrooms ?? '-'} bds</span>
            </div>
            <div className="flex items-center gap-2 px-3">
              <span className="material-symbols-outlined text-base text-slate-400">bathtub</span>
              <span>{property.bathrooms ?? '-'} ba</span>
            </div>
            <div className="flex items-center gap-2 pl-3">
              <span className="material-symbols-outlined text-base text-slate-400">straighten</span>
              <span>{property.squareFeet?.toLocaleString() ?? '-'} sqft</span>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-400 leading-relaxed line-clamp-3">{descriptionText}</p>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700">
          {/* Buttons hidden for go-live readiness as they are currently non-functional */}
          {/* <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={handleEditClick}
              className="w-full flex justify-center items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg shadow-sm hover:bg-sky-700 transition"
            >
              <span className="material-symbols-outlined w-4 h-4">edit</span>
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={handleSidekickClick}
              className="w-full flex justify-center items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-slate-600 rounded-lg shadow-sm hover:bg-slate-700 transition"
            >
              <span className="material-symbols-outlined w-4 h-4">smart_toy</span>
              <span>Listing Sidekick</span>
            </button>
          </div> */}
          <div className="mb-3">
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200">
              <span className="text-xs text-slate-400">Link shortening disabled; share the listing URL below:</span>
              <span className="truncate text-slate-100">{shareUrl}</span>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopyState('copied');
                    setTimeout(() => setCopyState('idle'), 2000);
                  } catch (error) {
                    console.error('Copy failed', error);
                    setCopyState('error');
                    setTimeout(() => setCopyState('idle'), 2000);
                  }
                }}
                className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-sky-300 hover:text-sky-200 transition"
              >
                {copyState === 'copied' ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : copyState === 'error' ? (
                  <>
                    <Copy className="w-3 h-3" />
                    Retry
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-full flex justify-center items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-rose-900 rounded-lg shadow-sm hover:bg-rose-800 transition"
          >
            <span className="material-symbols-outlined w-4 h-4">delete</span>
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main AdminListingsPage Component ---

const AdminListingsPage: React.FC = () => {
  const [listings, setListings] = useState<AdminListingModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [createForm, setCreateForm] = useState<{ address: string; price: string; status: string; property_type: string }>({
    address: '',
    price: '',
    status: 'Active',
    property_type: ''
  });

  const refreshListings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminListingsService.list();
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshListings();
  }, []);

  const handleCreate = async () => {
    setError(null);
    try {
      const created = await adminListingsService.create({
        address: createForm.address,
        price: Number(createForm.price) || undefined,
        status: createForm.status,
        property_type: createForm.property_type
      });
      setListings((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      setCreateForm({ address: '', price: '', status: 'Active', property_type: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    }
  };

  const handleDelete = async (listingId: string) => {
    const confirmed = window.confirm('Delete this listing from admin inventory?');
    if (!confirmed) return;
    try {
      await adminListingsService.remove(listingId);
      setListings((prev) => prev.filter((l) => l.listing_id !== listingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete listing');
    }
  };

  // Map AdminListingModel to Property for UI
  const mappedProperties: Property[] = useMemo(() => {
    return listings.map(l => ({
      id: l.listing_id,
      title: l.address || 'Untitled Listing',
      address: l.address || '',
      price: l.price || 0,
      bedrooms: l.bedrooms || 0,
      bathrooms: l.bathrooms || 0,
      squareFeet: l.square_feet || 0,
      status: (l.status as 'Active' | 'Pending' | 'Sold') || 'Active',
      description: l.ai_summary || '',
      heroPhotos: l.hero_image ? [l.hero_image] : [],
      imageUrl: l.hero_image || '',
      propertyType: l.property_type || 'Single Family',
      features: [],
      appFeatures: {},
      agent: SAMPLE_AGENT,
    }));
  }, [listings]);

  const filteredProperties = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mappedProperties;
    return mappedProperties.filter((p) => {
      return (
        (p.address || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q)
      );
    });
  }, [mappedProperties, search]);

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <button onClick={() => window.history.back()} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-6">
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Listings</h1>
          <p className="text-slate-500 mt-1">Manage your listings and their Listing Sidekick brains.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refreshListings()}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-all"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105"
          >
            <span className="material-symbols-outlined h-5 w-5">add</span>
            <span>Add New Listing</span>
          </button>
        </div>
      </header>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-8">
        <button
          type="button"
          onClick={() => setIsHelpPanelOpen(prev => !prev)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
          aria-expanded={isHelpPanelOpen}
        >
          <span className="material-symbols-outlined text-xl">{isHelpPanelOpen ? 'psychiatry' : 'help'}</span>
          {isHelpPanelOpen ? 'Hide AI Listings Tips' : 'Show AI Listings Tips'}
          <span className="material-symbols-outlined text-base ml-auto">{isHelpPanelOpen ? 'expand_less' : 'expand_more'}</span>
        </button>
        {isHelpPanelOpen && (
          <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-lg">home_work</span>
                Listing Playbook
              </h2>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong>Keep data synced:</strong> Update price, status, and hero photos here—your AI site and AI Card stay in lockstep.</li>
                <li><strong>Listing Sidekick:</strong> Launch the Sidekick from each tile to train property-specific talking points and FAQs.</li>
                <li><strong>Media assets:</strong> Use the edit view to upload flyers, 3D tours, and feature sheets for instant sharing.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-lg">qr_code</span>
                QR & Marketing Assets
              </h2>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong>Generate QR codes:</strong> Each listing gets a unique QR link for yard signs, open houses, and print materials.</li>
                <li><strong>Campaign tracking:</strong> Clone the listing and adjust tracking tags to compare performance by channel.</li>
                <li><strong>Pro tip:</strong> Drop the listing QR into the AI Conversations hub so follow-ups automatically reference the right property.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200/60 mb-8">
        <div className="relative flex-grow">
          <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings by title, address, or city..."
            className="w-full bg-white border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
      </div>

      <main>
        {isLoading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner /></div>
        ) : filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredProperties.map(prop => (
              <PropertyCard
                key={prop.id}
                property={prop}
                onSelect={() => { }}
                onDelete={() => handleDelete(prop.id)}
                onOpenMarketing={() => { }}
                onOpenBuilder={() => { }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow-md border border-slate-200/60">
            <h2 className="text-xl font-semibold text-slate-700">No listings yet</h2>
            <p className="text-slate-500 mt-2">Click "Add New Listing" to get started.</p>
          </div>
        )}
      </main>

      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">New Admin Listing</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Address</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={createForm.address}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Price</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={createForm.price}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="e.g. 750000"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Status</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={createForm.status}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Property Type</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={createForm.property_type}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, property_type: e.target.value }))}
                  placeholder="e.g. Single Family"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminListingsPage;
