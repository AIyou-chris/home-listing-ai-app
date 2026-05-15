import React, { useEffect, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';

interface ROIData {
  views: number;
  leads: number;
  preQuals: number;
  soldAt: string | null;
  soldPrice: number | null;
  address: string;
  status: string;
}

interface Props {
  listingId: string;
  /** Pass true when rendering inside the demo dashboard */
  demo?: boolean;
}

const DEMO_ROI: ROIData = {
  views: 347,
  leads: 12,
  preQuals: 3,
  soldAt: null,
  soldPrice: null,
  address: '1280 Sunset Blvd, Santa Monica, CA',
  status: 'published',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const LOROIWidget: React.FC<Props> = ({ listingId, demo = false }) => {
  const [data, setData] = useState<ROIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demo) {
      setData(DEMO_ROI);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const headers: HeadersInit = userData.user?.id
          ? { 'x-user-id': userData.user.id }
          : {};
        const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/roi`), { headers });
        const json = await res.json();
        if (json.success) setData(json.roi);
      } catch {
        // non-fatal — widget just won't show
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId, demo]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-2">
      {/* Core metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
          <p className="text-base font-bold text-slate-900">{data.views.toLocaleString()}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Views</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
          <p className="text-base font-bold text-slate-900">{data.leads}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Leads</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-center">
          <p className="text-base font-bold text-emerald-700">{data.preQuals}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">Pre-Quals</p>
        </div>
      </div>

      {/* Sold banner */}
      {data.soldAt && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-base">🎉</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">Sold</p>
            {data.soldPrice && (
              <p className="text-xs text-amber-700">{fmt(data.soldPrice)}</p>
            )}
          </div>
          <span className="text-[10px] text-amber-500">
            {new Date(data.soldAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      )}

      {/* Lead conversion rate */}
      {data.views > 0 && data.leads > 0 && (
        <p className="text-[10px] text-slate-400 text-right">
          {((data.leads / data.views) * 100).toFixed(1)}% lead conversion
        </p>
      )}
    </div>
  );
};

export default LOROIWidget;
