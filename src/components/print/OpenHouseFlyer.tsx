import React from 'react';

export interface OpenHouseFlyerProps {
  propertyImageUrl?: string;
  address?: string;
  price?: string;
  beds?: string | number;
  baths?: string | number;
  sqft?: string | number;
  agentName?: string;
  agentTitle?: string;
  agentCompany?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentHeadshotUrl?: string;
  agentBrandColor?: string;
  slug?: string;
  qrImageUrl?: string;
  variant?: 'standard' | 'minimal';
}

const getInitials = (name: string) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'AG';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
};

const cleanPrice = (price?: string) => {
  const value = String(price || '').trim();
  return value || '$550,000';
};

const safeMetric = (value?: string | number, suffix?: string) => {
  const raw = String(value ?? '').trim();
  if (!raw) return suffix ? `0 ${suffix}` : '0';
  return suffix ? `${raw} ${suffix}` : raw;
};

const hexToRgb = (value: string) => {
  const normalized = value.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
};

export const OpenHouseFlyer: React.FC<OpenHouseFlyerProps> = ({
  propertyImageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80',
  address = '555 1st Ave',
  price = '$550,000',
  beds = '3',
  baths = '2',
  sqft = '2500',
  agentName = 'Fred Potter',
  agentTitle = 'Listing Specialist',
  agentCompany = 'HomeListingAI',
  agentPhone = 'Contact for details',
  agentEmail = 'support@homelistingai.com',
  agentHeadshotUrl,
  agentBrandColor = '#f97316',
  slug = 'draft-listing-7',
  qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://homelistingai.com/l/draft-listing-7',
  variant = 'standard'
}) => {
  const initials = getInitials(agentName);
  const accentStyle = { color: agentBrandColor };
  const accentBgStyle = { backgroundColor: agentBrandColor };
  const glowRgb = hexToRgb(agentBrandColor);
  const glowColor = glowRgb ? `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.22)` : 'rgba(249,115,22,0.22)';
  const brandGlowStyle = {
    boxShadow: `0 16px 40px ${glowColor}`
  };
  const flyerUrl = `homelistingai.com/l/${slug}`;

  if (variant === 'minimal') {
    return (
      <div
        className="mx-auto flex h-[11in] w-[8.5in] flex-col bg-white p-8 text-slate-900 shadow-2xl print:m-0 print:shadow-none"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/newlogo.png" alt="HomeListingAI" className="h-10 w-10 object-contain" />
            <span className="text-xl font-extrabold tracking-tight">HomeListingAI</span>
          </div>
          <div className="rounded-full border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-slate-700">
            Open House
          </div>
        </div>
        <h1 className="text-5xl font-black uppercase leading-none tracking-tight">
          Scan for the
          <br />
          <span style={accentStyle}>Property Report</span>
        </h1>
        <div className="mt-10 grid flex-1 grid-cols-[1fr_220px] gap-8">
          <div className="rounded-[28px] border border-slate-200 p-6">
            <p className="text-3xl font-black leading-tight">{address}</p>
            <p className="mt-3 text-4xl font-black" style={accentStyle}>
              {cleanPrice(price)}
            </p>
            <div className="mt-6 space-y-3 text-lg font-semibold text-slate-600">
              <p>{safeMetric(beds, 'Beds')}</p>
              <p>{safeMetric(baths, 'Baths')}</p>
              <p>{safeMetric(sqft, 'Sq Ft')}</p>
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200 p-4">
            <img src={qrImageUrl} alt="Property report QR" className="h-full w-full object-contain" />
          </div>
        </div>
        <p className="mt-8 text-center text-sm font-semibold text-slate-500">{flyerUrl}</p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex h-[11in] w-[8.5in] flex-col overflow-hidden bg-[#f7f4ee] p-6 text-slate-950 shadow-2xl print:m-0 print:shadow-none"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/newlogo.png" alt="HomeListingAI" className="h-9 w-9 object-contain" />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">HomeListingAI</span>
        </div>
        <div
          className="rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.28em] text-white"
          style={accentBgStyle}
        >
          Open House
        </div>
      </div>

      <div className="mt-5 rounded-[32px] border border-white/70 bg-gradient-to-br from-white via-[#fff8ef] to-[#f4ede4] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-[1.08fr_0.92fr] gap-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.36em] text-slate-500">HomeListingAI Report</p>
            <h1 className="mt-3 text-[3.05rem] font-black uppercase leading-[0.92] tracking-[-0.05em] text-slate-950">
              Scan for
              <br />
              the
              <br />
              <span style={accentStyle}>Property</span>
              <br />
              <span style={accentStyle}>Report</span>
            </h1>
            <p className="mt-3 max-w-sm text-[13px] font-medium leading-5 text-slate-600">
              Instant pricing insight, local trends, and showing options in one simple scan.
            </p>
          </div>

          <div className="flex items-start justify-end">
            <div className="rounded-[28px] bg-[#0b1121] px-5 py-4 text-right text-white shadow-[0_18px_45px_rgba(11,17,33,0.32)]">
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">Live Listing</p>
              <p className="mt-2 max-w-[150px] text-lg font-black leading-tight">{address}</p>
              <p className="mt-3 text-3xl font-black" style={accentStyle}>
                {cleanPrice(price)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[0.98fr_1.02fr] gap-5">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="relative h-[205px]">
                <img
                  src={propertyImageUrl}
                  alt={address}
                  className="h-full w-full object-cover"
                  crossOrigin="anonymous"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1121]/82 via-[#0b1121]/18 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">Featured Home</p>
                    <p className="mt-1 text-[1.55rem] font-black leading-tight text-white">{address}</p>
                  </div>
                  <div
                    className="rounded-full px-4 py-2 text-sm font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.25)]"
                    style={accentBgStyle}
                  >
                    {cleanPrice(price)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Property Snapshot</p>
                  <p className="mt-2 text-[1.35rem] font-black leading-tight text-slate-950">{address}</p>
                </div>
                <div className="rounded-2xl bg-[#fff3ea] px-4 py-3 text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Price</p>
                  <p className="mt-1 text-[1.35rem] font-black tracking-tight" style={accentStyle}>
                    {cleanPrice(price)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { icon: 'bed', label: 'Beds', value: beds },
                  { icon: 'shower', label: 'Baths', value: baths },
                  { icon: 'square_foot', label: 'Sq Ft', value: sqft }
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                    </div>
                    <p className="mt-2 text-[15px] font-black text-slate-900">{safeMetric(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[26px] border border-white/10 bg-[rgba(0,0,0,0.5)] p-3.5 text-white backdrop-blur-2xl"
              style={{
                ...brandGlowStyle,
                boxShadow: `0 18px 42px rgba(2,6,23,0.32), 0 0 34px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.04)`
              }}
            >
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full blur-sm" style={{ backgroundColor: `${agentBrandColor}20` }} />
                  <div className="relative h-full w-full overflow-hidden rounded-full border border-white/16 bg-black/80">
                    {agentHeadshotUrl ? (
                      <img
                        src={agentHeadshotUrl}
                        alt={agentName}
                        className="h-full w-full object-cover"
                        crossOrigin="anonymous"
                        loading="eager"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-base font-black text-white" style={accentBgStyle}>
                        {initials}
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white">{agentName}</p>
                  <p className="truncate text-[13px] font-semibold text-slate-200">{agentTitle}</p>
                  <p className="truncate text-xs font-medium text-slate-300">{agentCompany}</p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Contact for details</p>
                <p className="mt-1.5 text-sm font-semibold text-white">{agentPhone}</p>
                <p className="mt-1 break-all text-xs text-slate-300">{agentEmail}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Scan Destination</p>
                <p className="mt-2 text-[1.8rem] font-black leading-[1.02] text-slate-950">
                  Property report + showing request
                </p>
              </div>
              <div
                className="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white"
                style={accentBgStyle}
              >
                Scan now
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-[#f8fafc] p-4">
              <img
                src={qrImageUrl}
                alt="Scan for property report"
                className="h-[286px] w-full object-contain"
                crossOrigin="anonymous"
                loading="eager"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="mt-4 text-center">
              <p className="text-lg font-black leading-tight text-slate-950">Scan to get the report</p>
              <p className="text-lg font-black leading-tight" style={accentStyle}>
                + request a showing
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">{flyerUrl}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
