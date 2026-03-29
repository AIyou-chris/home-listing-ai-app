import React from 'react';

export interface AgentBusinessCardProps {
  fullName: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  headshotUrl?: string | null;
  themeColor?: string;
  onChat: () => void;
  onContact: () => void;
  onMoreInfo?: () => void;
  showMoreInfo?: boolean;
  chatLabel?: string;
  contactLabel?: string;
  moreInfoLabel?: string;
}

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AG';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
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

const adjustColor = (value: string, amount: number) => {
  const rgb = hexToRgb(value);
  if (!rgb) return value;
  const clamp = (channel: number) => Math.max(0, Math.min(255, channel));
  const toHex = (channel: number) => clamp(channel).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r + amount)}${toHex(rgb.g + amount)}${toHex(rgb.b + amount)}`;
};

const AgentBusinessCard: React.FC<AgentBusinessCardProps> = ({
  fullName,
  company,
  title,
  phone: _phone,
  email: _email,
  headshotUrl,
  themeColor = '#f97316',
  onChat,
  onContact,
  onMoreInfo,
  showMoreInfo = false,
  chatLabel = 'Chat With Me',
  contactLabel = 'Contact',
  moreInfoLabel = 'Get More Info'
}) => {
  const initials = getInitials(fullName);
  const safeName = fullName.trim() || 'Your Name';
  const safeCompany = company.trim() || 'Your Brokerage';
  const safeTitle = title.trim() || 'Licensed Realtor(R)';
  const chatGradientStart = adjustColor(themeColor, 18);
  const chatGradientEnd = adjustColor(themeColor, -18);
  const contactGradientStart = adjustColor(themeColor, -22);
  const contactGradientEnd = adjustColor(themeColor, -42);
  const glowRgb = hexToRgb(themeColor);
  const glowColor = glowRgb ? `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.24)` : 'rgba(249,115,22,0.24)';

  return (
    <div
      className="relative mx-auto w-full max-w-[660px] overflow-visible rounded-[30px] border border-white/10 bg-[rgba(0,0,0,0.5)] p-4 shadow-[0_24px_64px_rgba(2,6,23,0.42)] backdrop-blur-2xl sm:p-5"
      style={{
        boxShadow: `0 28px 80px rgba(2,6,23,0.42), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.04), 0 0 48px ${glowColor}`
      }}
    >
      <div className="pointer-events-none absolute left-1/2 top-7 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl" style={{ backgroundColor: `${themeColor}18` }} />
      <div className="pointer-events-none absolute bottom-4 right-3 h-44 w-44 rounded-full bg-white/5 blur-3xl" />

      <div className="relative pt-20 sm:pt-24">
        <div
          className="absolute left-1/2 top-0 z-20 h-[104px] w-[104px] -translate-x-1/2 overflow-hidden rounded-[28px] bg-slate-950 shadow-[0_20px_40px_rgba(2,6,23,0.42)] ring-1 ring-white/10 sm:h-[114px] sm:w-[114px]"
          style={{ boxShadow: `0 22px 44px rgba(2,6,23,0.42), 0 0 28px ${glowColor}` }}
        >
          <div className="h-full w-full overflow-hidden rounded-[28px] bg-slate-950">
            {headshotUrl ? (
              <img src={headshotUrl} alt={safeName} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-3xl font-bold text-white sm:text-4xl"
                style={{ backgroundColor: themeColor }}
              >
                {initials}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[rgba(0,0,0,0.5)] p-4 shadow-[0_18px_42px_rgba(2,6,23,0.3)] backdrop-blur-2xl sm:p-5">
          <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))] px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6">
            <p className="text-center text-[13px] font-semibold uppercase tracking-[0.35em] text-slate-400">
              HomeListingAI
            </p>

            <div className="mt-4 text-center">
              <div>
                <h3 className="text-[1.8rem] font-bold tracking-tight text-slate-50 sm:text-[2rem]">{safeName}</h3>
              </div>
              <div className="mt-3">
                <p className="text-[1.5rem] font-bold tracking-tight text-slate-200 sm:text-[1.7rem]">{safeTitle}</p>
                <p className="mt-1.5 text-lg font-semibold text-slate-400 sm:text-[1.15rem]">{safeCompany}</p>
              </div>
            </div>

            <div className="mt-5 border-t border-white/8 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onChat}
                  className="flex items-center justify-center gap-2.5 rounded-[20px] px-4 py-3.5 text-base font-bold text-white shadow-[0_16px_32px_rgba(15,23,42,0.28)] transition hover:brightness-105"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${chatGradientStart}, ${chatGradientEnd})`
                  }}
                >
                  <span className="material-symbols-outlined text-[24px]">chat</span>
                  <span>{chatLabel}</span>
                </button>

                <button
                  type="button"
                  onClick={onContact}
                  className="flex items-center justify-center gap-2.5 rounded-[20px] px-4 py-3.5 text-base font-bold text-white shadow-[0_16px_32px_rgba(15,23,42,0.28)] transition hover:brightness-105"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${contactGradientStart}, ${contactGradientEnd})`
                  }}
                >
                  <span className="material-symbols-outlined text-[24px]">mail</span>
                  <span>{contactLabel}</span>
                </button>
              </div>
              {showMoreInfo ? (
                <button
                  type="button"
                  onClick={onMoreInfo || onContact}
                  className="mx-auto mt-3 flex w-full max-w-[560px] items-center justify-center gap-3 rounded-[20px] border border-white/6 bg-[rgba(6,12,24,0.64)] px-4 py-3.5 text-lg font-bold text-slate-50 shadow-[0_16px_32px_rgba(2,6,23,0.28)] backdrop-blur-xl transition hover:bg-[rgba(10,17,30,0.8)]"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold text-white"
                    style={{ backgroundColor: themeColor }}
                  >
                    i
                  </span>
                  <span>{moreInfoLabel}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentBusinessCard;
