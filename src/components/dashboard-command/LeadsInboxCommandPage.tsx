import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AutomationRecipe,
  DashboardLeadItem,
  RoiMetrics,
  fetchAutomationRecipes,
  fetchDashboardLeads,
  fetchRoiMetrics,
  updateAutomationRecipe
} from '../../services/dashboardCommandService';

const chipClass = (value: string) => {
  if (value === 'Hot') return 'bg-rose-100 text-rose-700';
  if (value === 'Warm') return 'bg-amber-100 text-amber-700';
  if (value === 'Cold') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-700';
};

const LeadsInboxCommandPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'New' | 'All'>('New');
  const [status, setStatus] = useState('all');
  const [intent, setIntent] = useState('all');
  const [listingId, setListingId] = useState('all');
  const [timeframe, setTimeframe] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [sort, setSort] = useState<'hot_first' | 'newest'>('hot_first');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<DashboardLeadItem[]>([]);
  const [roi, setRoi] = useState<RoiMetrics | null>(null);
  const [recipes, setRecipes] = useState<AutomationRecipe[]>([]);
  const [recipeBusy, setRecipeBusy] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [leadRes, roiRes, recipeRes] = await Promise.all([
        fetchDashboardLeads({ tab, status, intent, listingId, timeframe, sort }),
        fetchRoiMetrics('7d'),
        fetchAutomationRecipes()
      ]);
      setLeads(leadRes.leads || []);
      setRoi(roiRes.metrics || null);
      setRecipes(recipeRes.recipes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status, intent, listingId, timeframe, sort]);

  const listingOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const lead of leads) {
      if (!lead.listing_id) continue;
      const listing = lead.listing;
      const label = listing
        ? [listing.address, [listing.city, listing.state].filter(Boolean).join(', ')].filter(Boolean).join(' • ')
        : lead.listing_id;
      map.set(lead.listing_id, label || lead.listing_id);
    }
    return Array.from(map.entries());
  }, [leads]);

  const toggleRecipe = async (recipe: AutomationRecipe) => {
    setRecipeBusy(recipe.key);
    try {
      const res = await updateAutomationRecipe(recipe.key, !recipe.enabled);
      setRecipes((prev) => prev.map((row) => (row.key === recipe.key ? res.recipe : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update automation.');
    } finally {
      setRecipeBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads Command Center</h1>
          <p className="text-sm text-slate-600">Hot-first inbox with one-click next actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/appointments')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Appointments
          </button>
          <button
            type="button"
            onClick={() => navigate('/leads')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Legacy Leads
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Leads (7d)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{roi?.leads_captured ?? '--'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unworked</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{roi?.unworked_leads ?? '--'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Appointments Set</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{roi?.appointments_set ?? '--'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirmed</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{roi?.appointments_confirmed ?? '--'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reminder Success</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{roi?.reminder_success_rate ?? '--'}%</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Automation Recipes</h2>
          <span className="text-xs text-slate-500">Simple toggles, no custom builder</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {recipes.map((recipe) => (
            <label key={recipe.key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-700">{recipe.name}</span>
              <button
                type="button"
                onClick={() => void toggleRecipe(recipe)}
                disabled={recipeBusy === recipe.key}
                className={`rounded-full px-3 py-1 text-xs font-bold ${recipe.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'} disabled:opacity-60`}
              >
                {recipeBusy === recipe.key ? 'Saving...' : recipe.enabled ? 'On' : 'Off'}
              </button>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-2 md:grid-cols-6">
          <button
            type="button"
            onClick={() => setTab('New')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tab === 'New' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
          >
            New
          </button>
          <button
            type="button"
            onClick={() => setTab('All')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tab === 'All' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
          >
            All
          </button>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">Status: All</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Nurture">Nurture</option>
            <option value="Closed-Lost">Closed-Lost</option>
          </select>
          <select value={intent} onChange={(event) => setIntent(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">Intent: All</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
          <select value={listingId} onChange={(event) => setListingId(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">Listing: All</option>
            {listingOptions.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select value={timeframe} onChange={(event) => setTimeframe(event.target.value as 'all' | '24h' | '7d' | '30d')} className="w-1/2 rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="all">Any time</option>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value as 'hot_first' | 'newest')} className="w-1/2 rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="hot_first">Hot first</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading leads...</div>}
        {!loading && error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
        {!loading && !error && leads.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No leads match these filters yet.</div>
        )}

        {!loading && !error && leads.map((lead) => (
          <button
            type="button"
            key={lead.id}
            onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-slate-900">{lead.name}</p>
                <p className="text-xs text-slate-500">{lead.listing?.address || 'Listing not attached'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${chipClass(lead.intent_level)}`}>{lead.intent_level}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{lead.timeline || 'unknown'}</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{lead.financing || 'unknown'}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{lead.status}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-700 line-clamp-1">{lead.lead_summary || lead.last_message_preview || 'No summary yet.'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {lead.phone && <span>{lead.phone}</span>}
              {lead.email && <span>{lead.email}</span>}
              <span>{lead.source_type}</span>
              <span>{lead.last_activity_relative}</span>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
};

export default LeadsInboxCommandPage;
