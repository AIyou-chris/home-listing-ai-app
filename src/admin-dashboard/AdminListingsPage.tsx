import React, { useEffect, useMemo, useState } from 'react';

import type { AdminListingModel } from '../services/adminListingsService';
import { adminListingsService } from '../services/adminListingsService';
import LoadingSpinner from '../components/LoadingSpinner';
import { RefreshCcw, Sparkles, Trash2, Search, ArrowLeft } from 'lucide-react';

const AdminListingsPage: React.FC = () => {
  const [listings, setListings] = useState<AdminListingModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{ address: string; price: string; status: string; property_type: string }>({
    address: '',
    price: '',
    status: 'draft',
    property_type: ''
  });
  const [search, setSearch] = useState('');

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
      setCreateForm({ address: '', price: '', status: 'draft', property_type: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    }
  };

  useEffect(() => {
    void refreshListings();
  }, []);

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

  const handleGenerate = async (listingId: string) => {
    setIsGenerating(listingId);
    try {
      const summary = await adminListingsService.generateAiSummary(listingId);
      setListings((prev) =>
        prev.map((l) =>
          l.listing_id === listingId ? { ...l, ai_summary: summary ?? l.ai_summary } : l
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI summary');
    } finally {
      setIsGenerating(null);
    }
  };

  const stats = useMemo(() => {
    const total = listings.length;
    const active = listings.filter((l) => (l.status || '').toLowerCase() === 'active').length;
    const draft = listings.filter((l) => (l.status || '').toLowerCase() === 'draft').length;
    return { total, active, draft };
  }, [listings]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((l) => {
      return (
        (l.address || '').toLowerCase().includes(q) ||
        (l.property_type || '').toLowerCase().includes(q) ||
        (l.status || '').toLowerCase().includes(q)
      );
    });
  }, [listings, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Listings</h1>
            <p className="text-slate-600">Manage admin listings and Listing Sidekick brains (admin-only data).</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Sparkles className="w-4 h-4" />
            Add New Listing
          </button>
          <button
            onClick={() => void refreshListings()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            disabled={isLoading}
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-sm text-slate-500">Total Listings</p>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-sm text-slate-500">Active</p>
          <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-sm text-slate-500">Draft</p>
          <p className="text-3xl font-bold text-slate-900">{stats.draft}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search listings by title, address, or city..."
          className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
          No admin listings yet. Import or create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredListings.map((listing) => (
            <div key={listing.listing_id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {listing.hero_image ? (
                <img src={listing.hero_image} alt={listing.address} className="h-44 w-full object-cover" />
              ) : (
                <div className="h-44 w-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm">No image</div>
              )}
              <div className="p-4 space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 truncate">{listing.address || 'Untitled Listing'}</h3>
                  {listing.status && (
                    <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 capitalize">
                      {listing.status}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {listing.property_type ? `${listing.property_type} • ` : ''}{listing.price ? `$${listing.price.toLocaleString()}` : 'Price TBD'}
                </p>
                <p className="text-xs text-slate-500">
                  {listing.bedrooms ?? '-'} bd • {listing.bathrooms ?? '-'} ba • {listing.square_feet ?? '-'} sqft
                </p>
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">AI Summary</span>
                    <button
                      onClick={() => void handleGenerate(listing.listing_id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                      disabled={isGenerating === listing.listing_id}
                    >
                      <Sparkles className="w-4 h-4" />
                      {isGenerating === listing.listing_id ? 'Generating…' : 'Generate'}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-3">
                    {listing.ai_summary || 'No AI summary yet.'}
                  </p>
                </div>
              </div>
              <div className="bg-slate-900 text-slate-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{listing.price ? `$${listing.price.toLocaleString()}` : 'Price TBD'}</span>
                </div>
              </div>
              <div className="bg-slate-800 px-4 py-3 grid grid-cols-2 gap-2">
                <button className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-white bg-primary-600 rounded-md py-2 hover:bg-primary-700">
                  <span className="material-symbols-outlined text-base">edit</span>
                  Edit
                </button>
                <button className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-white bg-slate-700 rounded-md py-2 hover:bg-slate-600">
                  <span className="material-symbols-outlined text-base">smart_toy</span>
                  Listing Sidekick
                </button>
                <button
                  onClick={() => void handleDelete(listing.listing_id)}
                  className="col-span-2 inline-flex items-center justify-center gap-1 text-xs font-semibold text-red-200 bg-red-700/70 rounded-md py-2 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
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
